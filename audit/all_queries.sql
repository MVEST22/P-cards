-- P-card audit supporting SQL (OSU, 2014). Run setup.sql first.
-- Audit screens identify possible exceptions and do not prove fraud.
-- II.1 Annual spending > $50,000
SELECT FullName, ROUND(SUM(Amount),2) AS AnnualTotal FROM osu GROUP BY FullName HAVING SUM(Amount)>50000 ORDER BY AnnualTotal DESC;
-- II.2 Monthly spending > $10,000
SELECT Month,FullName,ROUND(SUM(Amount),2) AS MonthlyTotal FROM osu GROUP BY Month,FullName HAVING SUM(Amount)>10000 ORDER BY Month,MonthlyTotal DESC;
-- II.3 Individual transactions > $5,000
SELECT Amount,FullName,Description,Vendor,TransactionDate,PostedDate,MCC FROM osu WHERE Amount>5000 ORDER BY Amount;
-- II.4 Same cardholder/vendor/date and total > $5,000
WITH groups AS (SELECT TxDate,FullName,Vendor FROM osu WHERE Amount>0 GROUP BY TxDate,FullName,Vendor HAVING COUNT(*)>1 AND SUM(Amount)>5000) SELECT o.Amount,o.FullName,o.Description,o.Vendor,o.TransactionDate,o.PostedDate,o.MCC FROM osu o JOIN groups g ON o.TxDate=g.TxDate AND o.FullName=g.FullName AND o.Vendor=g.Vendor WHERE o.Amount>0 ORDER BY o.TxDate,o.FullName,o.Vendor,o.Amount;
-- II.5 Exactly two cardholders at a vendor on one date, > $5,000 total
WITH groups AS (SELECT TxDate,Vendor FROM osu WHERE Amount>0 GROUP BY TxDate,Vendor HAVING COUNT(DISTINCT FullName)=2 AND SUM(Amount)>5000), distinctpeople AS (SELECT DISTINCT o.TxDate,o.Vendor,o.FullName FROM osu o JOIN groups g ON g.TxDate=o.TxDate AND g.Vendor=o.Vendor WHERE o.Amount>0) SELECT o.Amount,o.FullName,o.Description,o.Vendor,o.TransactionDate,o.PostedDate,o.MCC FROM osu o JOIN distinctpeople p ON o.TxDate=p.TxDate AND o.Vendor=p.Vendor AND o.FullName=p.FullName WHERE o.Amount>0 AND NOT EXISTS (SELECT 1 FROM osu b WHERE b.TxDate=o.TxDate AND b.Vendor=o.Vendor AND b.FullName=o.FullName AND b.Amount=o.Amount AND b.ID<>o.ID) ORDER BY o.TxDate,o.Vendor,o.FullName;
-- II.6 Exactly two vendors, one employee/day, > $5,000 total
WITH groups AS (SELECT TxDate,FullName FROM osu WHERE Amount>0 GROUP BY TxDate,FullName HAVING COUNT(DISTINCT Vendor)=2 AND SUM(Amount)>5000) SELECT o.Amount,o.FullName,o.Description,o.Vendor,o.TransactionDate,o.PostedDate,o.MCC FROM osu o JOIN groups g ON o.TxDate=g.TxDate AND o.FullName=g.FullName WHERE o.Amount>0 AND NOT EXISTS (SELECT 1 FROM osu b WHERE b.TxDate=o.TxDate AND b.FullName=o.FullName AND b.Vendor=o.Vendor AND b.Amount=o.Amount AND b.ID<>o.ID) ORDER BY o.TxDate,o.FullName,o.Vendor;
-- II.7 Food charges coincident with hotel spending
WITH travel AS (SELECT DISTINCT FullName,TxDate FROM osu WHERE mcc_lower LIKE '%hotel%' OR mcc_lower LIKE '%motel%' OR mcc_lower LIKE '%resort%' OR mcc_lower LIKE '%inn%') SELECT o.* FROM osu o JOIN travel t ON o.FullName=t.FullName AND o.TxDate=t.TxDate WHERE o.mcc_lower LIKE '%food%' OR o.mcc_lower LIKE '%restaurant%' ORDER BY o.FullName,o.Amount;
-- II.8 Alcohol-related
SELECT ID,TransactionDate,FullName,Vendor,Description,Amount,MCC FROM osu WHERE Amount>0 AND (mcc_lower LIKE '%alcohol%' OR mcc_lower LIKE '%liquor%' OR desc_lower LIKE '%beer%' OR desc_lower LIKE '%wine%' OR desc_lower LIKE '%alcohol%') ORDER BY Amount DESC,TransactionDate;
-- II.9 Cash / ATM
SELECT ID,TransactionDate,FullName,Vendor,Description,Amount,MCC FROM osu WHERE Amount>0 AND (mcc_lower LIKE '%atm%' OR mcc_lower LIKE '%cash%' OR desc_lower LIKE '%cash advance%') ORDER BY Amount DESC,TransactionDate;
-- II.10 Gift cards/certificates
SELECT ID,TransactionDate,FullName,Vendor,Description,Amount,MCC FROM osu WHERE Amount>0 AND (desc_lower LIKE '%gift card%' OR desc_lower LIKE '%gift cert%' OR mcc_lower LIKE '%gift%') ORDER BY Amount DESC,TransactionDate;
-- II.11 Gasoline/fuel
SELECT ID,TransactionDate,FullName,Vendor,Description,Amount,MCC FROM osu WHERE Amount>0 AND (mcc_lower LIKE '%fuel%' OR mcc_lower LIKE '%gas station%' OR mcc_lower LIKE '%service station%' OR desc_lower LIKE '%gasoline%') ORDER BY Amount DESC,TransactionDate;
-- II.12 Donations/sponsorships
SELECT ID,TransactionDate,FullName,Vendor,Description,Amount,MCC FROM osu WHERE Amount>0 AND (desc_lower LIKE '%donation%' OR desc_lower LIKE '%sponsor%' OR mcc_lower LIKE '%charit%') ORDER BY Amount DESC,TransactionDate;
-- II.13 Postage/mail
SELECT ID,TransactionDate,FullName,Vendor,Description,Amount,MCC FROM osu WHERE Amount>0 AND (mcc_lower LIKE '%postal%' OR desc_lower LIKE '%postage%' OR vendor_lower LIKE '%post office%') ORDER BY Amount DESC,TransactionDate;
-- II.14 Insurance/late fees
SELECT ID,TransactionDate,FullName,Vendor,Description,Amount,MCC FROM osu WHERE Amount>0 AND (desc_lower LIKE '%insurance%' OR desc_lower LIKE '%late fee%' OR mcc_lower LIKE '%insurance%') ORDER BY Amount DESC,TransactionDate;
-- III.1 Benford expected vs actual first-digit percentages
WITH amt AS (SELECT CAST(REPLACE(printf('%.2f',ABS(Amount)),'.','') AS TEXT) AS cents FROM osu WHERE Amount>=1), digits AS (SELECT CAST(SUBSTR(LTRIM(cents,'0'),1,1) AS INTEGER) AS digit FROM amt), digit_list AS (SELECT 1 AS d UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) SELECT d AS FirstDigit,ROUND(100.0*SUM(CASE WHEN digit=d THEN 1 ELSE 0 END)/COUNT(*),3) AS ActualPct,ROUND(100.0*LOG10(1.0+1.0/d),3) AS ExpectedBenfordPct FROM digit_list CROSS JOIN digits GROUP BY d ORDER BY d;
-- III.2 Potential duplicate positive charges
WITH g AS (SELECT TxDate,Vendor,CardholderFirstInitial,CardholderLastName,Amount FROM osu WHERE Amount>0 GROUP BY TxDate,Vendor,CardholderFirstInitial,CardholderLastName,Amount HAVING COUNT(*)>=2) SELECT o.TransactionDate,o.Vendor,o.FullName,o.Amount FROM osu o JOIN g ON o.TxDate=g.TxDate AND o.Vendor=g.Vendor AND o.CardholderFirstInitial=g.CardholderFirstInitial AND o.CardholderLastName=g.CardholderLastName AND o.Amount=g.Amount WHERE o.Amount>0 ORDER BY o.TxDate,o.Vendor;
-- III.3 People with repeated duplicate occasions
WITH g AS (SELECT TxDate,Vendor,CardholderFirstInitial,CardholderLastName,Amount FROM osu WHERE Amount>0 GROUP BY TxDate,Vendor,CardholderFirstInitial,CardholderLastName,Amount HAVING COUNT(*)>=2) SELECT o.FullName,COUNT(*) AS DuplicateOccasions FROM (SELECT DISTINCT FullName,TxDate,Vendor,Amount,CardholderFirstInitial,CardholderLastName FROM osu) o JOIN g ON o.TxDate=g.TxDate AND o.Vendor=g.Vendor AND o.CardholderFirstInitial=g.CardholderFirstInitial AND o.CardholderLastName=g.CardholderLastName AND o.Amount=g.Amount GROUP BY o.FullName ORDER BY DuplicateOccasions DESC,o.FullName;
-- III.4 Four-digit round-thousand charges
SELECT Amount,Vendor,Description,FullName FROM osu WHERE Amount>=1000 AND Amount<10000 AND CAST(Amount AS INTEGER)%1000=0 AND Amount>0 ORDER BY Vendor,FullName;
-- III.5 Near-$5,000 charges
SELECT ID,FullName,TransactionDate,Vendor,Description,Amount FROM osu WHERE Amount BETWEEN 4900 AND 5000 ORDER BY Amount DESC;
-- III.6 Weekend charges above $500
SELECT ID,TransactionDate,FullName,Vendor,Description,Amount FROM osu WHERE Amount>=500 AND CAST(strftime('%w',printf('%04d-%02d-%02d',CAST(substr(TxDate,length(TxDate)-3,4) AS INTEGER),CAST(substr(TxDate,1,instr(TxDate,'/')-1) AS INTEGER),CAST(substr(TxDate,instr(TxDate,'/')+1,instr(substr(TxDate,instr(TxDate,'/')+1),'/')-1) AS INTEGER))) AS INTEGER) IN (0,6) ORDER BY Amount DESC;
-- III.7 Repeated high-value charges at same vendor
SELECT FullName,Vendor,COUNT(*) AS NumberOfCharges,ROUND(SUM(Amount),2) AS TotalAmount FROM osu WHERE Amount>=1000 GROUP BY FullName,Vendor HAVING COUNT(*)>=5 ORDER BY TotalAmount DESC;
-- III.8 Entertainment/personal-risk category screening
SELECT ID,TransactionDate,FullName,Vendor,MCC,Description,Amount FROM osu WHERE Amount>0 AND (mcc_lower LIKE '%amusement%' OR mcc_lower LIKE '%cinema%' OR mcc_lower LIKE '%movie%' OR mcc_lower LIKE '%theater%' OR mcc_lower LIKE '%recreation%' OR mcc_lower LIKE '%jewelry%') ORDER BY Amount DESC;
