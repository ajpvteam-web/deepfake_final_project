import sqlite3

conn = sqlite3.connect('instance/deepfake_users.db')
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("Tables:", tables)

for t in tables:
    tname = t[0]
    print(f"\n--- Table: {tname} ---")
    c.execute(f"PRAGMA table_info({tname})")
    cols = c.fetchall()
    col_names = [col[1] for col in cols]
    print("Columns:", col_names)
    c.execute(f"SELECT * FROM {tname}")
    rows = c.fetchall()
    print(f"Total rows: {len(rows)}")
    for row in rows:
        print(row)

conn.close()