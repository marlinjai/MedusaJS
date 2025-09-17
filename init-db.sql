-- Database initialization script for Medusa
-- This script sets up the PostgreSQL database with proper permissions

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE medusa'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medusa')\gexec

-- Grant privileges to medusa user
GRANT ALL PRIVILEGES ON DATABASE medusa TO medusa;

-- Connect to the medusa database
\c medusa;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO medusa;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO medusa;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO medusa;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO medusa;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO medusa;

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Log successful initialization
SELECT 'Database initialization completed successfully' as status;