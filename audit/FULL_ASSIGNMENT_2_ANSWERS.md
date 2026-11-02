# Assignment 2 — P-card: Complete Answers (Parts II and III)

**Dataset:** 116,031 Oklahoma State University P-card transactions from 2014. The 14 controls in Part II and eight fraud-risk checks in Part III were run as screening analyses against the assignment database. Results below are **numbers of returned rows or grouped results**, not established policy violations. The employee labels are anonymized. Transaction evidence and approved card limits would be needed for final audit findings.

**Part IV (website):** https://name-pcard-auditor.onrender.com

**Reproducibility:** [SQL preparation](setup.sql) · [22 SQL queries](all_queries.sql)

## Part II — Internal controls

### 1. Annual spending above $50,000

**Result:** 127 returned rows/groups. **Conclusion:** Annual employee totals above the stated threshold need a check against approved limits; this alone is not a breach.

### 2. Monthly spending above $10,000

**Result:** 457 returned rows/groups. **Conclusion:** Check monthly card limits and approvals for the flagged employee-month totals.

### 3. Single purchases exceeding $5,000

**Result:** 33 returned rows/groups. **Conclusion:** Check receipts and exemptions before concluding any purchase exceeded its authorized limit.

### 4. Same employee/vendor/day above $5,000

**Result:** 269 returned rows/groups. **Conclusion:** Several legitimate purchases can occur on one day; investigate possible transaction splitting.

### 5. Two cardholders at one vendor/day above $5,000

**Result:** 147 returned rows/groups. **Conclusion:** Shared suppliers are common; confirm whether payments were related and authorized.

### 6. One cardholder, two vendors/day above $5,000

**Result:** 160 returned rows/groups. **Conclusion:** These may be unrelated purchases; treat this as a weak screening signal.

### 7. Food spending on hotel-stay dates

**Result:** 99 returned rows/groups. **Conclusion:** Verify travel claims and meal policy rather than assuming expenses were personal.

### 8. Alcohol-related spending

**Result:** 46 returned rows/groups. **Conclusion:** Merchant category and description matches can be false positives; check itemized receipts.

### 9. Cash/ATM transactions

**Result:** 0 returned rows/groups. **Conclusion:** No rows matched this screen, but it does not prove the absence of all restricted activity.

### 10. Gift cards/certificates

**Result:** 206 returned rows/groups. **Conclusion:** Check recipients, business purposes and purchase approvals.

### 11. Fuel purchases

**Result:** 723 returned rows/groups. **Conclusion:** Review business purpose and vehicle-related policy; legitimate fleet purchases may be expected.

### 12. Donations/sponsorship

**Result:** 1,054 returned rows/groups. **Conclusion:** Confirm the actual transaction purpose and any authorization requirements.

### 13. Postage/mail expenses

**Result:** 1 returned rows/groups. **Conclusion:** Review the recorded description and whether the transaction was permitted.

### 14. Insurance/late fees

**Result:** 17 returned rows/groups. **Conclusion:** Confirm nature of charge and whether alternative payment procedures should apply.

## Part III — Fraud-risk screens

### 1. Benford first-digit analysis

**Result:** 9 returned rows/groups. **Conclusion:** Nine digit categories were compared with Benford expectations; this count is not nine suspicious transactions.

### 2. Possible duplicate positive-charge rows

**Result:** 4,924 returned rows/groups. **Conclusion:** Repeated vendor/date/person/amount combinations need receipts and payment records before calling them duplicates.

### 3. Employees with repeated duplicate occasions

**Result:** 577 returned rows/groups. **Conclusion:** Repeated identical-looking charges are a follow-up indicator, not a fraud finding.

### 4. Round-thousand charges

**Result:** 160 returned rows/groups. **Conclusion:** Fixed-price purchases often have round amounts; review the justification.

### 5. Charges near the $5,000 limit

**Result:** 113 returned rows/groups. **Conclusion:** Charges just below a threshold merit review but are not proof of avoidance.

### 6. High-value weekend purchases

**Result:** 0 returned rows/groups. **Conclusion:** No rows met this screen; weekend transactions can also be legitimate.

### 7. Repeated large purchases from one vendor

**Result:** 160 returned rows/groups. **Conclusion:** Check supplier selection, approval and whether transactions relate to a common project.

### 8. Potential personal/entertainment purchases

**Result:** 303 returned rows/groups. **Conclusion:** Merchant categories do not establish the actual purpose; check receipts and permitted exceptions.

## Overall conclusion

The review flagged several patterns for follow-up, including 33 charges above $5,000, 113 near the limit and 4,924 rows that matched the duplicate-charge screen. A screening match is **not proof of fraud or an actual policy violation**. The correct next step is to inspect source receipts, account entries and the institution's applicable purchasing-card policy. The web application supports exploring transaction data; the SQL file documents the checks. No personally identifiable findings or raw transaction exports are published as part of this answer.
