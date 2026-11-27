import psycopg

def check():
    conn = psycopg.connect("postgresql://classsphere_migrator:migrator_secret_pw@127.0.0.1:5434/classsphere")
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM users WHERE is_demo_fixture = true")
    demo_count = cur.fetchone()[0]
    print(f"Total demo fixture users: {demo_count}")

    cur.execute("SELECT id, code, name, is_active FROM institutions WHERE code = 'INST-DEMO'")
    inst = cur.fetchone()
    print(f"INST-DEMO record: {inst}")

    cur.execute("SELECT count(*) FROM users u JOIN institutions i ON i.id = u.institution_id WHERE i.code = 'INST-DEMO'")
    demo_inst_users = cur.fetchone()[0]
    print(f"Users belonging to INST-DEMO: {demo_inst_users}")

if __name__ == "__main__":
    check()
