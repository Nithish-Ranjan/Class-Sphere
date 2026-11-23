"""
ClassSphere Database Roles & Extensions Setup Script.
Connects via postgres administrative account, installs extensions, and configures roles.
"""
import os
import sys
import psycopg

def main():
    db_name = os.getenv("POSTGRES_DB", "classsphere")
    port = int(os.getenv("POSTGRES_PORT", "5433"))
    host = os.getenv("POSTGRES_SERVER", "127.0.0.1")
    user = os.getenv("POSTGRES_USER", "postgres")

    conn_str = f"host={host} port={port} dbname={db_name} user={user}"
    print(f"Connecting to {conn_str}...")

    sql_path = os.path.join(os.path.dirname(__file__), "init_db_roles.sql")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    with psycopg.connect(conn_str, autocommit=True) as conn:
        with conn.cursor() as cur:
            print("Executing init_db_roles.sql...")
            cur.execute(sql_content)
            print("Verifying installed extensions...")
            cur.execute("SELECT extname, extversion FROM pg_extension;")
            for row in cur.fetchall():
                print(f"  Extension: {row[0]} (version: {row[1]})")

            print("Verifying roles...")
            cur.execute("SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('classsphere_migrator', 'classsphere_app');")
            for row in cur.fetchall():
                print(f"  Role: {row[0]} (Superuser: {row[1]}, BypassRLS: {row[2]})")

    print("Database roles and extensions initialized successfully!")

if __name__ == "__main__":
    main()
