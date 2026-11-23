"""
PostgreSQL 16 Setup Script for ClassSphere.
Connects to PostgreSQL 16 on port 5434, creates classsphere database,
and provisions classsphere_migrator and classsphere_app roles.
"""
import psycopg
from psycopg.rows import dict_row

conn_str_root = "postgresql://postgres@127.0.0.1:5434/postgres"

print("Connecting to PostgreSQL 16 on port 5434...")
with psycopg.connect(conn_str_root, autocommit=True) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT version();")
        ver = cur.fetchone()[0]
        cur.execute("SHOW server_version;")
        s_ver = cur.fetchone()[0]
        print(f"CONNECTED TO: {ver}")
        print(f"SERVER VERSION: {s_ver}")

        cur.execute("ALTER ROLE postgres WITH PASSWORD 'postgres_dev_password';")
        print("Configured password for postgres user.")

        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'classsphere';")
        if not cur.fetchone():
            cur.execute("CREATE DATABASE classsphere;")
            print("Created database 'classsphere'.")
        else:
            print("Database 'classsphere' already exists.")

# Now connect to classsphere database and initialize roles and permissions
conn_str_cs = "postgresql://postgres@127.0.0.1:5434/classsphere"
with psycopg.connect(conn_str_cs, autocommit=True) as conn:
    with conn.cursor() as cur:
        # Check/create roles
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = 'classsphere_migrator';")
        if not cur.fetchone():
            cur.execute("CREATE ROLE classsphere_migrator WITH LOGIN SUPERUSER PASSWORD 'migrator_secure_pass_2026' BYPASSRLS;")
            print("Created role classsphere_migrator.")
        else:
            cur.execute("ALTER ROLE classsphere_migrator WITH LOGIN SUPERUSER PASSWORD 'migrator_secure_pass_2026' BYPASSRLS;")
            print("Configured role classsphere_migrator.")

        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = 'classsphere_app';")
        if not cur.fetchone():
            cur.execute("CREATE ROLE classsphere_app WITH LOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD 'app_secure_pass_2026';")
            print("Created role classsphere_app.")
        else:
            cur.execute("ALTER ROLE classsphere_app WITH LOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD 'app_secure_pass_2026';")
            print("Configured role classsphere_app.")

        # Grants
        cur.execute("GRANT ALL ON DATABASE classsphere TO classsphere_migrator;")
        cur.execute("GRANT CONNECT ON DATABASE classsphere TO classsphere_app;")
        cur.execute("GRANT USAGE ON SCHEMA public TO classsphere_app;")
        cur.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO classsphere_app;")
        cur.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO classsphere_app;")
        print("Granted baseline privileges to classsphere_app and classsphere_migrator.")

print("PostgreSQL 16 Initialization Complete!")
