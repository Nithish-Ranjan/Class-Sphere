-- ==============================================================================
-- CLASSSPHERE DATABASE ROLES & EXTENSIONS INITIALIZATION
-- ==============================================================================

-- 1. Install Extensions in classsphere database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Create Migration Role (DDL Owner & Schema Migrator)
-- Holds BYPASSRLS so that migrations can establish tables, constraints, and initial triggers.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'classsphere_migrator') THEN
        CREATE ROLE classsphere_migrator WITH LOGIN PASSWORD 'migrator_secure_pass_2026' SUPERUSER BYPASSRLS;
    ELSE
        ALTER ROLE classsphere_migrator WITH LOGIN PASSWORD 'migrator_secure_pass_2026' SUPERUSER BYPASSRLS;
    END IF;
END $$;

-- 3. Create Application Runtime Role (DML Only)
-- Strictly DENIED BYPASSRLS so that Row-Level Security policies ALWAYS apply.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'classsphere_app') THEN
        CREATE ROLE classsphere_app WITH LOGIN PASSWORD 'app_secure_pass_2026' NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    ELSE
        ALTER ROLE classsphere_app WITH LOGIN PASSWORD 'app_secure_pass_2026' NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    END IF;
END $$;

-- 4. Grant Database Privileges
GRANT CONNECT ON DATABASE classsphere TO classsphere_migrator;
GRANT CONNECT ON DATABASE classsphere TO classsphere_app;

GRANT USAGE ON SCHEMA public TO classsphere_migrator;
GRANT USAGE ON SCHEMA public TO classsphere_app;

-- Default privileges for future tables created by migrator
ALTER DEFAULT PRIVILEGES FOR ROLE classsphere_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO classsphere_app;

ALTER DEFAULT PRIVILEGES FOR ROLE classsphere_migrator IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO classsphere_app;
