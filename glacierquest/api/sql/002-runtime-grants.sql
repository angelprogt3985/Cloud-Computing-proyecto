-- Run AFTER creating the login glacierquest and applying 001-schema.sql as admin.
-- In Cloud SQL, remove the automatically assigned administrative membership first:
-- REVOKE cloudsqlsuperuser FROM glacierquest;
GRANT CONNECT ON DATABASE glacierquest TO glacierquest;
GRANT USAGE ON SCHEMA public TO glacierquest;
GRANT SELECT, INSERT, UPDATE, DELETE ON gq_players, gq_presence, gq_chat TO glacierquest;
-- Runtime does not need CREATE or ownership of the tables.
