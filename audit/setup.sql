-- Prepare a temporary view of 2014 OSU P-card records before running all_queries.sql.
-- This is read-only with respect to the original pcards table.
DROP TABLE IF EXISTS temp.osu;
CREATE TEMP TABLE osu AS
SELECT *,
       substr(TransactionDate,1,instr(TransactionDate,' ')-1) AS TxDate,
       substr(PostedDate,1,instr(PostedDate,' ')-1) AS PostDay,
       CAST(substr(TransactionDate,1,instr(TransactionDate,'/')-1) AS INTEGER) AS Month,
       lower(COALESCE(MCC,'')) AS mcc_lower,
       lower(COALESCE(Description,'')) AS desc_lower,
       lower(COALESCE(Vendor,'')) AS vendor_lower
FROM pcards
WHERE Year=2014 AND AgencyNumber=1000;
