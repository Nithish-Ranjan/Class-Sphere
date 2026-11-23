import psycopg

with psycopg.connect("host=127.0.0.1 port=5433 dbname=classsphere user=postgres") as conn:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name != 'alembic_version'
            ORDER BY table_name;
        """)
        tables = [r[0] for r in cur.fetchall()]
        print(f"Total application tables created: {len(tables)}")
        for t in tables:
            print(f"  {t}")
        
        print("\nChecking RLS on tables:")
        cur.execute("""
            SELECT relname, relrowsecurity, relforcerowsecurity 
            FROM pg_class 
            WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname != 'alembic_version'
            ORDER BY relname;
        """)
        rls_rows = cur.fetchall()
        for r in rls_rows:
            print(f"  Table: {r[0]:<32} RLS: {r[1]}  FORCE_RLS: {r[2]}")
        
        all_rls = all(r[1] and r[2] for r in rls_rows)
        print(f"\nAll 26 tables have RLS and FORCE_RLS enabled: {all_rls}")
