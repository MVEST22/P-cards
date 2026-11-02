# P-card audit — Assignment 2

The 2014 Oklahoma State University P-card data contains **116,031 transactions**. These are **screening exceptions, not proven fraud or confirmed policy breaches**; approval records, receipts and the actual policies are needed for final conclusions. The anonymized identity labels should not be treated as verified individuals.

Parts II and III cover 14 internal-control checks and eight fraud-risk checks. Part IV is the working website at https://name-pcard-auditor.onrender.com.

| Part | Question | Screening test | Result rows |
|---|---:|---|---:|
| II | 1 | Annual spending above $50,000 | 127 |
| II | 2 | Monthly spending above $10,000 | 457 |
| II | 3 | Single purchases exceeding $5,000 | 33 |
| II | 4 | Same cardholder and vendor on one day, combined above $5,000 | 269 |
| II | 5 | Two cardholders and same vendor/day, combined above $5,000 | 147 |
| II | 6 | One cardholder, two vendors same day, combined above $5,000 | 160 |
| II | 7 | Meals overlapping with hotel transaction dates | 99 |
| II | 8 | Alcohol-related spending | 46 |
| II | 9 | Cash and ATM transactions | 0 |
| II | 10 | Gift cards or certificates | 206 |
| II | 11 | Gasoline/fuel spending | 723 |
| II | 12 | Donations or sponsorship | 1,054 |
| II | 13 | Postage and mail | 1 |
| II | 14 | Insurance or late fees | 17 |
| III | 1 | Benford first-digit distribution | 9 |
| III | 2 | Potential duplicate charge rows | 4,924 |
| III | 3 | Employees with repeated duplicate occasions | 577 |
| III | 4 | Round thousand-dollar amounts | 160 |
| III | 5 | Charges near $5,000 cap | 113 |
| III | 6 | Weekend high-amount transactions | 0 |
| III | 7 | Repeated high-value charges at one vendor | 160 |
| III | 8 | Entertainment/personal-spending categories | 303 |

## Interpretation

Noteworthy exceptions include 33 single transactions above $5,000, 113 charges near $5,000, and 4,924 rows flagged by duplicate-screening logic. These counts are not counts of fraudulent transactions. Investigators should compare original receipts, merchant classifications, payment reversals, card limits, and approvals before reaching conclusions. The Benford analysis reports nine first-digit categories rather than nine suspicious transactions.

## Supporting materials

The full SQL queries, per-test CSV output, and detailed questions/answers are supplied in the separate Assignment 2 audit package. Raw transaction extracts should not be published to this public repository. The live tool uses a Node.js/Express server and SQLite database; see existing `server.js`.
