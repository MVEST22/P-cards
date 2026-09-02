const express =
    require('express');

const sqlite3 =
    require('sqlite3').verbose();

const path =
    require('path');


const app =
    express();


const PORT =
    process.env.PORT || 3000;


// ========================================
// MIDDLEWARE
// ========================================

app.use(
    express.json()
);


app.use(
    express.static(
        path.join(
            __dirname,
            'public'
        )
    )
);


// ========================================
// DATABASE
// ========================================

const db =
    new sqlite3.Database(

        path.join(
            __dirname,
            'pcards.db'
        ),

        sqlite3.OPEN_READONLY,

        err => {

            if (err) {

                console.error(
                    'Database connection error:',
                    err.message
                );

            }

            else {

                console.log(
                    'Connected to pcards.db'
                );

            }

        }

    );


// ========================================
// DATABASE HEALTH
// ========================================

app.get(
    '/api/health',
    (req, res) => {

        db.get(
            `
                SELECT
                    1 AS connected
                FROM pcards
                LIMIT 1
            `,
            [],
            (err, row) => {

                if (err) {

                    return res
                        .status(500)
                        .json({
                            connected:
                                false
                        });

                }


                res.json({
                    connected:
                        Boolean(row)
                });

            }
        );

    }
);


// ========================================
// DATE SORT EXPRESSION
// ========================================

const transactionDateSort = `

    printf(

        '%04d-%02d-%02d',

        Year,

        CAST(
            substr(
                TransactionDate,
                1,
                instr(TransactionDate, '/') - 1
            )
            AS INTEGER
        ),

        CAST(

            substr(

                substr(
                    TransactionDate,
                    instr(TransactionDate, '/') + 1
                ),

                1,

                instr(
                    substr(
                        TransactionDate,
                        instr(TransactionDate, '/') + 1
                    ),
                    '/'
                ) - 1

            )

            AS INTEGER

        )

    )

`;


// ========================================
// SAFE SORT FIELDS
// ========================================

const sortColumns = {

    TransactionDate:
        transactionDateSort,

    Amount:
        'Amount',

    Vendor:
        "LOWER(COALESCE(Vendor, ''))",

    FullName:
        "LOWER(COALESCE(FullName, ''))",

    ID:
        'ID'

};


function getSafeSort(
    field,
    direction
) {

    return {

        column:
            sortColumns[field]
            ||
            transactionDateSort,

        direction:
            String(direction)
                .toLowerCase()
                === 'desc'
                    ? 'DESC'
                    : 'ASC'

    };

}


// ========================================
// YEARS
// ========================================

app.get(
    '/api/years',
    (req, res) => {

        db.all(

            `
                SELECT DISTINCT
                    Year

                FROM pcards

                WHERE Year IS NOT NULL

                ORDER BY Year DESC
            `,

            [],

            (err, rows) => {

                if (err) {

                    return res
                        .status(500)
                        .json({
                            error:
                                err.message
                        });

                }


                res.json(
                    rows.map(
                        row => row.Year
                    )
                );

            }

        );

    }
);


// ========================================
// BUILD SEARCH
// ========================================

function buildSearch(
    type,
    year,
    keyword
) {

    const pattern =
        `%${keyword}%`;


    if (
        type === 'description'
    ) {

        return {

            where: `

                Year = ?

                AND

                LOWER(
                    COALESCE(
                        Description,
                        ''
                    )
                )

                LIKE LOWER(?)

            `,

            params: [
                year,
                pattern
            ]

        };

    }


    if (
        type === 'vendor'
    ) {

        return {

            where: `

                Year = ?

                AND

                LOWER(
                    COALESCE(
                        Vendor,
                        ''
                    )
                )

                LIKE LOWER(?)

            `,

            params: [
                year,
                pattern
            ]

        };

    }


    return {

        where: `

            Year = ?

            AND

            (

                LOWER(
                    COALESCE(
                        Description,
                        ''
                    )
                )

                LIKE LOWER(?)

                OR

                LOWER(
                    COALESCE(
                        Vendor,
                        ''
                    )
                )

                LIKE LOWER(?)

                OR

                LOWER(
                    COALESCE(
                        MCC,
                        ''
                    )
                )

                LIKE LOWER(?)

            )

        `,

        params: [
            year,
            pattern,
            pattern,
            pattern
        ]

    };

}


// ========================================
// SEARCH HANDLER
// ========================================

function searchTransactions(type) {

    return (
        req,
        res
    ) => {


        const {

            year,

            keyword,

            sortField =
                'TransactionDate',

            sortDirection =
                'asc',

            offset =
                '0',

            limit =
                '50',

            showAll =
                'false'

        } = req.query;


        if (
            !year ||
            !keyword
        ) {

            return res
                .status(400)
                .json({

                    error:
                        'Year and keyword are required.'

                });

        }


        const numericYear =
            Number(year);


        if (
            !Number.isInteger(
                numericYear
            )
        ) {

            return res
                .status(400)
                .json({

                    error:
                        'Invalid year.'

                });

        }


        const safeOffset =
            Math.max(
                0,
                parseInt(
                    offset,
                    10
                ) || 0
            );


        const safeLimit =
            Math.min(
                200,
                Math.max(
                    1,
                    parseInt(
                        limit,
                        10
                    ) || 50
                )
            );


        const search =
            buildSearch(
                type,
                numericYear,
                keyword
            );


        const sort =
            getSafeSort(
                sortField,
                sortDirection
            );


        // ====================================
        // KPI / SUMMARY QUERY
        // ====================================

        const summarySQL = `

            SELECT

                COUNT(*)
                    AS totalCount,

                ROUND(
                    COALESCE(
                        SUM(Amount),
                        0
                    ),
                    2
                )
                    AS totalAmount,

                ROUND(
                    COALESCE(
                        MAX(Amount),
                        0
                    ),
                    2
                )
                    AS largestAmount,

                COUNT(
                    DISTINCT FullName
                )
                    AS uniqueEmployees

            FROM pcards

            WHERE
                ${search.where}

        `;


        db.get(

            summarySQL,

            search.params,

            (
                summaryError,
                summary
            ) => {


                if (summaryError) {

                    return res
                        .status(500)
                        .json({

                            error:
                                summaryError.message

                        });

                }


                // ============================
                // TRANSACTION QUERY
                // ============================

                let dataSQL = `

                    SELECT

                        ID,

                        TransactionDate,

                        PostedDate,

                        FullName,

                        Vendor,

                        Description,

                        MCC,

                        Amount

                    FROM pcards

                    WHERE
                        ${search.where}

                    ORDER BY

                        ${sort.column}
                        ${sort.direction},

                        ID ASC

                `;


                const dataParams = [
                    ...search.params
                ];


                if (
                    String(showAll)
                        .toLowerCase()
                    !== 'true'
                ) {

                    dataSQL += `

                        LIMIT ?

                        OFFSET ?

                    `;


                    dataParams.push(
                        safeLimit,
                        safeOffset
                    );

                }


                db.all(

                    dataSQL,

                    dataParams,

                    (
                        dataError,
                        rows
                    ) => {


                        if (dataError) {

                            return res
                                .status(500)
                                .json({

                                    error:
                                        dataError.message

                                });

                        }


                        res.json({

                            rows,

                            totalCount:
                                Number(
                                    summary.totalCount
                                    || 0
                                ),

                            totalAmount:
                                Number(
                                    summary.totalAmount
                                    || 0
                                ),

                            largestAmount:
                                Number(
                                    summary.largestAmount
                                    || 0
                                ),

                            uniqueEmployees:
                                Number(
                                    summary.uniqueEmployees
                                    || 0
                                )

                        });

                    }

                );

            }

        );

    };

}


// ========================================
// SEARCH ROUTES
// ========================================

app.get(
    '/api/search/description',
    searchTransactions(
        'description'
    )
);


app.get(
    '/api/search/vendor',
    searchTransactions(
        'vendor'
    )
);


app.get(
    '/api/search/prohibited',
    searchTransactions(
        'prohibited'
    )
);


// ========================================
// DATABASE SUMMARY
// ========================================

app.get(
    '/api/summary',
    (req, res) => {

        db.get(

            `
                SELECT

                    COUNT(*)
                        AS TransactionCount,

                    ROUND(
                        SUM(Amount),
                        2
                    )
                        AS TotalAmount,

                    MIN(Year)
                        AS FirstYear,

                    MAX(Year)
                        AS LastYear

                FROM pcards
            `,

            [],

            (
                err,
                row
            ) => {

                if (err) {

                    return res
                        .status(500)
                        .json({
                            error:
                                err.message
                        });

                }


                res.json(row);

            }

        );

    }
);


// ========================================
// ASK DATABASE
// ========================================

app.post(
    '/api/ask',
    (
        req,
        res
    ) => {


        const question =
            String(
                req.body.question || ''
            ).trim();


        if (!question) {

            return res
                .status(400)
                .json({

                    error:
                        'Please enter a question.'

                });

        }


        const q =
            question.toLowerCase();


        const yearMatch =
            q.match(
                /\b(20\d{2})\b/
            );


        const year =
            yearMatch
                ? Number(
                    yearMatch[1]
                )
                : 2014;


        function runQuery(
            sql,
            params,
            explanation
        ) {

            db.all(
                sql,
                params,
                (
                    err,
                    rows
                ) => {

                    if (err) {

                        return res
                            .status(500)
                            .json({
                                error:
                                    err.message
                            });

                    }


                    res.json({

                        question,

                        explanation,

                        rows

                    });

                }
            );

        }


        // ====================================
        // TOTAL SPENDING
        // ====================================

        if (

            (
                q.includes(
                    'how much'
                )

                ||

                q.includes(
                    'total spending'
                )

                ||

                q.includes(
                    'total spent'
                )
            )

            &&

            (
                q.includes(
                    'spent'
                )

                ||

                q.includes(
                    'spending'
                )
            )

        ) {

            return runQuery(

                `
                    SELECT

                        Year,

                        ROUND(
                            SUM(Amount),
                            2
                        )
                            AS TotalSpending

                    FROM pcards

                    WHERE Year = ?

                    GROUP BY Year
                `,

                [year],

                `Total P-Card spending for ${year}.`

            );

        }


        // ====================================
        // EMPLOYEES OVER AN AMOUNT
        // ====================================

        if (

            (
                q.includes(
                    'employee'
                )

                ||

                q.includes(
                    'employees'
                )

                ||

                q.includes(
                    'cardholder'
                )

                ||

                q.includes(
                    'cardholders'
                )
            )

            &&

            (
                q.includes(
                    'more than'
                )

                ||

                q.includes(
                    'over'
                )

                ||

                q.includes(
                    'above'
                )

                ||

                q.includes(
                    'exceeded'
                )
            )

        ) {


            const amountMatch =
                q.match(

                    /(?:more than|over|above|exceeded)\s*\$?\s*([\d,]+(?:\.\d+)?)/i

                );


            if (amountMatch) {


                const amount =
                    Number(

                        amountMatch[1]
                            .replace(
                                /,/g,
                                ''
                            )

                    );


                return runQuery(

                    `
                        SELECT

                            FullName,

                            ROUND(
                                SUM(Amount),
                                2
                            )
                                AS TotalSpending

                        FROM pcards

                        WHERE Year = ?

                        GROUP BY FullName

                        HAVING
                            SUM(Amount) > ?

                        ORDER BY
                            TotalSpending DESC
                    `,

                    [
                        year,
                        amount
                    ],

                    `Employees whose total P-Card spending exceeded $${amount.toLocaleString()} in ${year}.`

                );

            }

        }


        // ====================================
        // TOP EMPLOYEES
        // ====================================

        if (

            (
                q.includes(
                    'employee'
                )

                ||

                q.includes(
                    'employees'
                )

                ||

                q.includes(
                    'cardholder'
                )

                ||

                q.includes(
                    'cardholders'
                )
            )

            &&

            (
                q.includes(
                    'most'
                )

                ||

                q.includes(
                    'highest'
                )

                ||

                q.includes(
                    'top'
                )
            )

        ) {


            let resultLimit =
                10;


            const match =
                q.match(

                    /(?:top\s*)?(\d+)\s+(?:employee|employees|cardholder|cardholders)/

                );


            if (match) {

                resultLimit =
                    Math.min(
                        Number(
                            match[1]
                        ),
                        100
                    );

            }


            return runQuery(

                `
                    SELECT

                        FullName,

                        ROUND(
                            SUM(Amount),
                            2
                        )
                            AS TotalSpending

                    FROM pcards

                    WHERE Year = ?

                    GROUP BY FullName

                    ORDER BY
                        TotalSpending DESC

                    LIMIT ?
                `,

                [
                    year,
                    resultLimit
                ],

                `The ${resultLimit} employees with the highest total P-Card spending in ${year}.`

            );

        }


        // ====================================
        // TOP VENDORS
        // ====================================

        if (

            q.includes(
                'vendor'
            )

            &&

            (
                q.includes(
                    'most'
                )

                ||

                q.includes(
                    'highest'
                )

                ||

                q.includes(
                    'top'
                )
            )

        ) {


            let resultLimit =
                10;


            const match =
                q.match(

                    /(?:top\s*)?(\d+)\s+(?:vendor|vendors)/

                );


            if (match) {

                resultLimit =
                    Math.min(
                        Number(
                            match[1]
                        ),
                        100
                    );

            }


            return runQuery(

                `
                    SELECT

                        Vendor,

                        ROUND(
                            SUM(Amount),
                            2
                        )
                            AS TotalPayments

                    FROM pcards

                    WHERE Year = ?

                    GROUP BY Vendor

                    ORDER BY
                        TotalPayments DESC

                    LIMIT ?
                `,

                [
                    year,
                    resultLimit
                ],

                `The ${resultLimit} vendors receiving the highest total P-Card payments in ${year}.`

            );

        }


        // ====================================
        // TRANSACTIONS OVER AMOUNT
        // ====================================

        if (

            q.includes(
                'transaction'
            )

            &&

            (
                q.includes(
                    'over'
                )

                ||

                q.includes(
                    'above'
                )

                ||

                q.includes(
                    'more than'
                )

                ||

                q.includes(
                    'greater than'
                )
            )

        ) {


            const amountMatch =
                q.match(

                    /(?:over|above|more than|greater than)\s*\$?\s*([\d,]+(?:\.\d+)?)/i

                );


            if (amountMatch) {


                const amount =
                    Number(

                        amountMatch[1]
                            .replace(
                                /,/g,
                                ''
                            )

                    );


                return runQuery(

                    `
                        SELECT

                            ID,

                            TransactionDate,

                            PostedDate,

                            FullName,

                            Vendor,

                            Description,

                            Amount,

                            MCC

                        FROM pcards

                        WHERE
                            Year = ?

                            AND

                            Amount > ?

                        ORDER BY
                            Amount DESC

                        LIMIT 200
                    `,

                    [
                        year,
                        amount
                    ],

                    `Transactions greater than $${amount.toLocaleString()} in ${year}.`

                );

            }

        }


        // ====================================
        // LARGEST TRANSACTIONS
        // ====================================

        if (

            q.includes(
                'largest transaction'
            )

            ||

            q.includes(
                'highest transaction'
            )

            ||

            q.includes(
                'biggest transaction'
            )

        ) {

            return runQuery(

                `
                    SELECT

                        ID,

                        TransactionDate,

                        PostedDate,

                        FullName,

                        Vendor,

                        Description,

                        Amount,

                        MCC

                    FROM pcards

                    WHERE Year = ?

                    ORDER BY
                        Amount DESC

                    LIMIT 20
                `,

                [year],

                `The 20 largest P-Card transactions in ${year}.`

            );

        }


        // ====================================
        // TRANSACTION COUNT
        // ====================================

        if (

            q.includes(
                'how many'
            )

            &&

            q.includes(
                'transaction'
            )

        ) {

            return runQuery(

                `
                    SELECT

                        Year,

                        COUNT(*)
                            AS TransactionCount

                    FROM pcards

                    WHERE Year = ?

                    GROUP BY Year
                `,

                [year],

                `The number of P-Card transactions recorded in ${year}.`

            );

        }


        // ====================================
        // PROHIBITED KEYWORDS
        // ====================================

        const prohibitedKeywords = [

            'alcohol',
            'liquor',
            'cash',
            'atm',
            'decoration',
            'donation',
            'sponsorship',
            'gasoline',
            'gift',
            'insurance',
            'late fee',
            'postage',
            'post office',
            'mail',
            'moving',
            'personal',
            'membership',
            'dues',
            'salary',
            'wage',
            'award'

        ];


        const keyword =
            prohibitedKeywords.find(
                word =>
                    q.includes(word)
            );


        if (keyword) {

            return runQuery(

                `
                    SELECT

                        ID,

                        TransactionDate,

                        PostedDate,

                        FullName,

                        Vendor,

                        Description,

                        Amount,

                        MCC

                    FROM pcards

                    WHERE

                        Year = ?

                        AND

                        (

                            LOWER(
                                COALESCE(
                                    Description,
                                    ''
                                )
                            )
                            LIKE LOWER(?)

                            OR

                            LOWER(
                                COALESCE(
                                    Vendor,
                                    ''
                                )
                            )
                            LIKE LOWER(?)

                            OR

                            LOWER(
                                COALESCE(
                                    MCC,
                                    ''
                                )
                            )
                            LIKE LOWER(?)

                        )

                    ORDER BY
                        Amount DESC

                    LIMIT 200
                `,

                [
                    year,
                    `%${keyword}%`,
                    `%${keyword}%`,
                    `%${keyword}%`
                ],

                `Potential transactions related to "${keyword}" in ${year}. These are audit flags only and do not establish that a policy violation occurred.`

            );

        }


        // ====================================
        // FALLBACK
        // ====================================

        return res
            .status(400)
            .json({

                error:

`I could not understand that question yet.

Try questions such as:

• How much was spent in 2014?
• Which 10 employees spent the most in 2014?
• Which employees spent more than $50,000 in 2014?
• Which vendors received the highest payments in 2014?
• Show transactions over $5,000 in 2014
• How many transactions were made in 2014?
• Show the largest transactions in 2014
• Show alcohol purchases in 2014`

            });

    }
);


// ========================================
// START SERVER
// ========================================

app.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);