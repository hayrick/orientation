import sqlite3
import os

db_path = 'ingestion/prisma/dev.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
tables = ['School', 'Formation', 'MasterFormation', 'Panier', 'PanierMasterFormation', 'PanierSchoolStats']

for t in tables:
    try:
        count = cursor.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"{t}: {count}")
    except sqlite3.OperationalError as e:
        print(f"{t}: Error ({e})")

conn.close()
