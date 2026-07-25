-- Enable pg_trgm extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create concurrent indexes on appointments for search (patient_name, service)
CREATE INDEX CONCURRENTLY IF NOT EXISTS appointments_patient_name_trgm_idx ON appointments USING gin (patient_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS appointments_service_trgm_idx ON appointments USING gin (service gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS appointments_status_idx ON appointments (status);

-- Create concurrent index on audit_logs for pagination (created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
