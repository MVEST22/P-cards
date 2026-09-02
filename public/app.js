// ========================================
// GLOBAL STATE
// ========================================

const PAGE_SIZE = 50;

let currentSearch = null;

let displayedRows = [];

let totalMatchingRows = 0;

let totalMatchingAmount = 0;

let largestMatchingAmount = 0;

let uniqueEmployeeCount = 0;


// ========================================
// ELEMENT REFERENCES
// ========================================

const dashboardResults =
    document.getElementById('dashboard-results');

const searchStatus =
    document.getElementById('search-status');

const exportButton =
    document.getElementById('export-csv-button');

const resultsDescription =
    document.getElementById('results-description');


// ========================================
// TAB NAVIGATION
// ========================================

const tabButtons =
    document.querySelectorAll('.tab-button');

const tabContents =
    document.querySelectorAll('.tab-content');


tabButtons.forEach(button => {

    button.addEventListener('click', () => {

        const targetTab =
            button.dataset.tab;

        tabButtons.forEach(btn =>
            btn.classList.remove('active')
        );

        tabContents.forEach(content =>
            content.classList.remove('active')
        );

        button.classList.add('active');

        document
            .getElementById(targetTab)
            .classList.add('active');

    });

});


// ========================================
// DATABASE STATUS
// ========================================

async function checkDatabaseHealth() {

    const status =
        document.getElementById('database-status');

    const text =
        document.getElementById('database-status-text');

    status.className =
        'header-status checking';

    text.textContent =
        'Checking database...';


    try {

        const response =
            await fetch('/api/health');

        if (!response.ok) {
            throw new Error();
        }

        const data =
            await response.json();

        if (!data.connected) {
            throw new Error();
        }

        status.className =
            'header-status connected';

        text.textContent =
            'Database connected';

    }

    catch (error) {

        status.className =
            'header-status disconnected';

        text.textContent =
            'Database unavailable';

    }

}


// ========================================
// LOAD YEARS
// ========================================

async function loadYears() {

    const yearSelect =
        document.getElementById('year-select');


    try {

        const response =
            await fetch('/api/years');

        if (!response.ok) {
            throw new Error('Could not load years.');
        }

        const years =
            await response.json();

        yearSelect.innerHTML = '';

        years.forEach(year => {

            const option =
                document.createElement('option');

            option.value = year;

            option.textContent = year;

            yearSelect.appendChild(option);

        });


        if (years.includes(2014)) {
            yearSelect.value = '2014';
        }

    }

    catch (error) {

        yearSelect.innerHTML =
            '<option value="">Unable to load years</option>';

    }

}


// ========================================
// CURRENT SETTINGS
// ========================================

function getSearchSettings() {

    return {

        year:
            document
                .getElementById('year-select')
                .value,

        sortField:
            document
                .getElementById('sort-field')
                .value,

        sortDirection:
            document
                .getElementById('sort-direction')
                .value

    };

}


// ========================================
// CLEAR QUICK FILTER SELECTION
// ========================================

function clearQuickFilterSelection() {

    document
        .querySelectorAll('.quick-filter')
        .forEach(button =>
            button.classList.remove('active')
        );

}


// ========================================
// QUICK FILTERS
// ========================================

document
    .querySelectorAll('.quick-filter')
    .forEach(button => {

        button.addEventListener('click', () => {

            clearQuickFilterSelection();

            button.classList.add('active');

            document
                .getElementById('description-keyword')
                .value = '';

            document
                .getElementById('vendor-keyword')
                .value = '';

            currentSearch = {

                endpoint:
                    '/api/search/prohibited',

                keyword:
                    button.dataset.keyword,

                label:
                    button.textContent.trim(),

                type:
                    'quick-filter'

            };

            resetSearchData();

            performSearch();

        });

    });


// ========================================
// DESCRIPTION SEARCH
// ========================================

document
    .getElementById('description-search-button')
    .addEventListener('click', () => {

        const keyword =
            document
                .getElementById('description-keyword')
                .value
                .trim();

        if (!keyword) {

            showSearchError(
                'Please enter a description keyword.'
            );

            return;
        }

        clearQuickFilterSelection();

        currentSearch = {

            endpoint:
                '/api/search/description',

            keyword:
                keyword,

            label:
                `Description: ${keyword}`,

            type:
                'description'

        };

        resetSearchData();

        performSearch();

    });


// ========================================
// VENDOR SEARCH
// ========================================

document
    .getElementById('vendor-search-button')
    .addEventListener('click', () => {

        const keyword =
            document
                .getElementById('vendor-keyword')
                .value
                .trim();

        if (!keyword) {

            showSearchError(
                'Please enter a vendor keyword.'
            );

            return;
        }

        clearQuickFilterSelection();

        currentSearch = {

            endpoint:
                '/api/search/vendor',

            keyword:
                keyword,

            label:
                `Vendor: ${keyword}`,

            type:
                'vendor'

        };

        resetSearchData();

        performSearch();

    });


// ========================================
// ENTER KEY SEARCH
// ========================================

document
    .getElementById('description-keyword')
    .addEventListener('keydown', event => {

        if (event.key === 'Enter') {

            document
                .getElementById('description-search-button')
                .click();

        }

    });


document
    .getElementById('vendor-keyword')
    .addEventListener('keydown', event => {

        if (event.key === 'Enter') {

            document
                .getElementById('vendor-search-button')
                .click();

        }

    });


// ========================================
// SORTING / YEAR CHANGE
// ========================================

document
    .getElementById('sort-field')
    .addEventListener(
        'change',
        rerunCurrentSearch
    );


document
    .getElementById('sort-direction')
    .addEventListener(
        'change',
        rerunCurrentSearch
    );


document
    .getElementById('year-select')
    .addEventListener(
        'change',
        rerunCurrentSearch
    );


function rerunCurrentSearch() {

    if (!currentSearch) {
        return;
    }

    resetSearchData();

    performSearch();

}


// ========================================
// RESET SEARCH DATA
// ========================================

function resetSearchData() {

    displayedRows = [];

    totalMatchingRows = 0;

    totalMatchingAmount = 0;

    largestMatchingAmount = 0;

    uniqueEmployeeCount = 0;

}


// ========================================
// PERFORM SEARCH
// ========================================

async function performSearch({

    append = false,
    showAll = false

} = {}) {


    if (!currentSearch) {
        return;
    }


    const settings =
        getSearchSettings();


    if (!settings.year) {

        showSearchError(
            'Please select an audit year.'
        );

        return;
    }


    const offset =
        append
            ? displayedRows.length
            : 0;


    searchStatus.className =
        'status-message loading';


    searchStatus.textContent =
        showAll
            ? 'Loading all matching transactions...'
            : 'Searching transactions...';


    try {

        const params =
            new URLSearchParams({

                year:
                    settings.year,

                keyword:
                    currentSearch.keyword,

                sortField:
                    settings.sortField,

                sortDirection:
                    settings.sortDirection,

                offset:
                    String(offset),

                limit:
                    String(PAGE_SIZE),

                showAll:
                    String(showAll)

            });


        const response =
            await fetch(
                `${currentSearch.endpoint}?${params}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                'Search failed.'
            );

        }


        if (append) {

            displayedRows =
                displayedRows.concat(
                    data.rows
                );

        }

        else {

            displayedRows =
                data.rows;

        }


        totalMatchingRows =
            Number(data.totalCount || 0);

        totalMatchingAmount =
            Number(data.totalAmount || 0);

        largestMatchingAmount =
            Number(data.largestAmount || 0);

        uniqueEmployeeCount =
            Number(data.uniqueEmployees || 0);


        updateKPIs();


        exportButton.disabled =
            totalMatchingRows === 0;


        resultsDescription.textContent =
            `${currentSearch.label} · ${settings.year}`;


        searchStatus.className =
            'status-message success';


        searchStatus.textContent =
            `${totalMatchingRows.toLocaleString()} matching transaction(s) found.`;


        displayDashboardResults();

    }

    catch (error) {

        searchStatus.className =
            'status-message error';

        searchStatus.textContent =
            error.message;

        dashboardResults.innerHTML = `

            <div class="empty-state">

                <h3>
                    Search failed
                </h3>

                <p>
                    Please review the search criteria
                    and try again.
                </p>

            </div>

        `;

    }

}


// ========================================
// UPDATE KPI CARDS
// ========================================

function updateKPIs() {

    document
        .getElementById('kpi-transactions')
        .textContent =
            totalMatchingRows.toLocaleString();


    document
        .getElementById('kpi-total-value')
        .textContent =
            formatCurrency(
                totalMatchingAmount
            );


    document
        .getElementById('kpi-largest')
        .textContent =
            formatCurrency(
                largestMatchingAmount
            );


    document
        .getElementById('kpi-employees')
        .textContent =
            uniqueEmployeeCount.toLocaleString();

}


// ========================================
// RESET KPI CARDS
// ========================================

function resetKPIs() {

    document
        .getElementById('kpi-transactions')
        .textContent = '—';

    document
        .getElementById('kpi-total-value')
        .textContent = '—';

    document
        .getElementById('kpi-largest')
        .textContent = '—';

    document
        .getElementById('kpi-employees')
        .textContent = '—';

}


// ========================================
// DISPLAY RESULTS
// ========================================

function displayDashboardResults() {

    if (totalMatchingRows === 0) {

        dashboardResults.innerHTML = `

            <div class="empty-state">

                <h3>
                    No transactions found
                </h3>

                <p>
                    No matching transactions were found
                    for this search.
                </p>

            </div>

        `;

        return;
    }


    const rows =
        displayedRows.map(transaction => `

            <tr>

                <td>
                    ${escapeHtml(
                        transaction.ID ?? ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatDate(
                            transaction.TransactionDate
                        )
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatDate(
                            transaction.PostedDate
                        )
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        transaction.FullName || ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        transaction.Vendor || ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        transaction.Description || ''
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        transaction.MCC || ''
                    )}
                </td>

                <td class="amount">
                    ${formatCurrency(
                        transaction.Amount
                    )}
                </td>

            </tr>

        `).join('');


    const hasMore =
        displayedRows.length <
        totalMatchingRows;


    dashboardResults.innerHTML = `

        <div class="results-summary-row">

            <div class="results-summary">

                ${totalMatchingRows.toLocaleString()}
                matching transaction(s)

                ·

                Total value:
                ${formatCurrency(
                    totalMatchingAmount
                )}

            </div>

        </div>


        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>
                            Transaction ID
                        </th>

                        <th>
                            Transaction Date
                        </th>

                        <th>
                            Posted Date
                        </th>

                        <th>
                            Employee
                        </th>

                        <th>
                            Vendor
                        </th>

                        <th>
                            Description
                        </th>

                        <th>
                            MCC
                        </th>

                        <th>
                            Amount
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${rows}

                </tbody>

            </table>

        </div>


        <div class="pagination-bar">

            <div class="pagination-info">

                Showing

                ${displayedRows.length.toLocaleString()}

                of

                ${totalMatchingRows.toLocaleString()}

                transactions

            </div>


            <div class="pagination-buttons">

                ${hasMore ? `

                    <button
                        id="show-more-button"
                        class="secondary-button"
                    >
                        Show 50 more
                    </button>


                    <button
                        id="show-all-button"
                        class="secondary-button"
                    >
                        Show all
                    </button>

                ` : ''}

            </div>

        </div>

    `;


    const showMoreButton =
        document.getElementById(
            'show-more-button'
        );


    const showAllButton =
        document.getElementById(
            'show-all-button'
        );


    if (showMoreButton) {

        showMoreButton
            .addEventListener(
                'click',
                () => {

                    performSearch({
                        append: true
                    });

                }
            );

    }


    if (showAllButton) {

        showAllButton
            .addEventListener(
                'click',
                () => {

                    if (
                        totalMatchingRows > 5000 &&
                        !window.confirm(
                            `This search contains ${totalMatchingRows.toLocaleString()} transactions. Loading all results may take a moment. Continue?`
                        )
                    ) {
                        return;
                    }

                    displayedRows = [];

                    performSearch({
                        showAll: true
                    });

                }
            );

    }

}


// ========================================
// RESET FILTERS
// ========================================

document
    .getElementById('reset-filters-button')
    .addEventListener('click', () => {

        const yearSelect =
            document.getElementById(
                'year-select'
            );


        if (
            Array.from(yearSelect.options)
                .some(
                    option =>
                        option.value === '2014'
                )
        ) {

            yearSelect.value =
                '2014';

        }


        document
            .getElementById('sort-field')
            .value =
                'TransactionDate';


        document
            .getElementById('sort-direction')
            .value =
                'asc';


        document
            .getElementById('description-keyword')
            .value =
                '';


        document
            .getElementById('vendor-keyword')
            .value =
                '';


        clearQuickFilterSelection();


        currentSearch = null;

        resetSearchData();

        resetKPIs();


        exportButton.disabled =
            true;


        resultsDescription.textContent =
            '';


        searchStatus.textContent =
            '';

        searchStatus.className =
            'status-message';


        dashboardResults.innerHTML = `

            <div class="empty-state">

                <h3>
                    No search performed
                </h3>

                <p>
                    Use a quick filter or enter a search keyword
                    to begin reviewing transactions.
                </p>

            </div>

        `;

    });


// ========================================
// EXPORT CSV
// ========================================

exportButton
    .addEventListener(
        'click',
        exportCurrentSearch
    );


async function exportCurrentSearch() {

    if (!currentSearch) {
        return;
    }


    const settings =
        getSearchSettings();


    exportButton.disabled =
        true;


    exportButton.textContent =
        'Preparing CSV...';


    try {

        const params =
            new URLSearchParams({

                year:
                    settings.year,

                keyword:
                    currentSearch.keyword,

                sortField:
                    settings.sortField,

                sortDirection:
                    settings.sortDirection,

                showAll:
                    'true'

            });


        const response =
            await fetch(
                `${currentSearch.endpoint}?${params}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                'Unable to export results.'
            );

        }


        createCSVDownload(
            data.rows,
            settings.year
        );

    }

    catch (error) {

        alert(
            `Export failed: ${error.message}`
        );

    }

    finally {

        exportButton.disabled =
            totalMatchingRows === 0;


        exportButton.textContent =
            'Export CSV';

    }

}


// ========================================
// CREATE CSV FILE
// ========================================

function createCSVDownload(
    rows,
    year
) {

    if (!rows.length) {
        return;
    }


    const columns = [

        'ID',
        'TransactionDate',
        'PostedDate',
        'FullName',
        'Vendor',
        'Description',
        'MCC',
        'Amount'

    ];


    const csvRows = [

        columns.join(','),

        ...rows.map(row =>

            columns
                .map(column =>
                    csvCell(
                        row[column]
                    )
                )
                .join(',')

        )

    ];


    const blob =
        new Blob(
            [csvRows.join('\n')],
            {
                type:
                    'text/csv;charset=utf-8;'
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement('a');


    const searchName =
        String(currentSearch.keyword)
            .replace(
                /[^a-z0-9]+/gi,
                '-'
            )
            .replace(
                /^-|-$/g,
                ''
            )
            .toLowerCase();


    link.href = url;


    link.download =
        `pcard-${searchName}-${year}.csv`;


    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}


// ========================================
// SAFE CSV CELL
// ========================================

function csvCell(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return '""';

    }


    if (
        typeof value === 'number'
    ) {

        return String(value);

    }


    let text =
        String(value);


    // Avoid spreadsheet formula execution

    if (
        /^[=+@]/.test(text)
    ) {

        text =
            `'${text}`;

    }


    return `"${text.replace(
        /"/g,
        '""'
    )}"`;

}


// ========================================
// SEARCH ERROR
// ========================================

function showSearchError(message) {

    searchStatus.className =
        'status-message error';

    searchStatus.textContent =
        message;

}


// ========================================
// ASK THE DATABASE
// ========================================

document
    .getElementById('ask-button')
    .addEventListener(
        'click',
        askDatabase
    );


async function askDatabase() {

    const question =
        document
            .getElementById('question')
            .value
            .trim();


    const status =
        document.getElementById(
            'ask-status'
        );


    const results =
        document.getElementById(
            'ask-results'
        );


    if (!question) {

        status.className =
            'status-message error';

        status.textContent =
            'Please enter a question.';

        return;
    }


    status.className =
        'status-message loading';


    status.textContent =
        'Analyzing the database...';


    results.innerHTML =
        '';


    try {

        const response =
            await fetch(
                '/api/ask',
                {
                    method:
                        'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({
                            question
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                'Unable to answer the question.'
            );

        }


        status.className =
            'status-message success';


        status.textContent =
            'Analysis completed.';


        displayQuestionResults(data);

    }

    catch (error) {

        status.className =
            'status-message error';


        status.textContent =
            error.message;

    }

}


// ========================================
// DISPLAY ASK RESULTS
// ========================================

function displayQuestionResults(data) {

    const container =
        document.getElementById(
            'ask-results'
        );


    let html = '';


    if (data.explanation) {

        html += `

            <div class="card">

                <h3>
                    Answer
                </h3>

                <p>
                    ${escapeHtml(
                        data.explanation
                    )}
                </p>

            </div>

        `;

    }


    if (
        data.rows &&
        data.rows.length > 0
    ) {

        const columns =
            Object.keys(
                data.rows[0]
            );


        const headers =
            columns
                .map(column => `

                    <th>
                        ${escapeHtml(
                            formatColumnName(
                                column
                            )
                        )}
                    </th>

                `)
                .join('');


        const rows =
            data.rows
                .map(row => `

                    <tr>

                        ${columns
                            .map(column => `

                                <td
                                    class="${
                                        isMoneyColumn(
                                            column
                                        )
                                            ? 'amount'
                                            : ''
                                    }"
                                >

                                    ${formatGenericCell(
                                        column,
                                        row[column]
                                    )}

                                </td>

                            `)
                            .join('')}

                    </tr>

                `)
                .join('');


        html += `

            <div class="results-summary-row">

                <div class="results-summary">

                    ${data.rows.length.toLocaleString()}
                    result(s)

                </div>

            </div>


            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>
                            ${headers}
                        </tr>

                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>

        `;

    }


    container.innerHTML =
        html;

}


// ========================================
// FORMATTING
// ========================================

function formatCurrency(value) {

    return new Intl.NumberFormat(
        'en-US',
        {
            style:
                'currency',

            currency:
                'USD'
        }
    ).format(
        Number(value || 0)
    );

}


function formatDate(value) {

    if (!value) {
        return '';
    }


    return String(value)
        .replace(
            /\s+0:00:00$/,
            ''
        );

}


function formatGenericCell(
    column,
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }


    if (
        isMoneyColumn(column)
    ) {

        return escapeHtml(
            formatCurrency(value)
        );

    }


    if (
        column
            .toLowerCase()
            .includes('date')
    ) {

        return escapeHtml(
            formatDate(value)
        );

    }


    return escapeHtml(value);

}


function isMoneyColumn(column) {

    const lower =
        column.toLowerCase();


    return (
        lower.includes('amount') ||
        lower.includes('spending') ||
        lower.includes('payment') ||
        lower.includes('total')
    );

}


function formatColumnName(column) {

    return String(column)

        .replace(
            /([a-z])([A-Z])/g,
            '$1 $2'
        )

        .replace(
            /_/g,
            ' '
        );

}


function escapeHtml(value) {

    const div =
        document.createElement('div');


    div.textContent =
        String(value);


    return div.innerHTML;

}
// ========================================
// SUGGESTED DATABASE QUESTIONS
// ========================================

document
    .querySelectorAll('.suggestion-button')
    .forEach(button => {

        button.addEventListener('click', () => {

            const question =
                button.dataset.question;

            const questionInput =
                document.getElementById('question');

            questionInput.value =
                question;

            questionInput.focus();

        });

    });

// ========================================
// INITIALIZE
// ========================================

loadYears();

checkDatabaseHealth();

setInterval(
    checkDatabaseHealth,
    30000
);