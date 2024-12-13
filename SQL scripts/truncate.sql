-- Truncate all tables in the correct order (children first, then parents)
TRUNCATE TABLE subelements CASCADE;
TRUNCATE TABLE elements CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE projects CASCADE;