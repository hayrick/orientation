import sqlite3
import os

db_path = 'ingestion/prisma/dev.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Tables ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
for table in tables:
    print(f"- {table[0]}")
    cursor.execute(f"PRAGMA table_info({table[0]})")
    cols = cursor.fetchall()
    for col in cols:
        print(f"  {col[1]} ({col[2]})")

conn.close()
