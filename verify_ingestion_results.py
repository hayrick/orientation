import sqlite3
import os

DB_PATH = os.path.join("ingestion", "prisma", "dev.db")

def verify():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    tables = ["MasterFormation", "Panier", "PanierMasterFormation", "PanierSchoolStats"]
    
    print("--- Database Counts ---")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"{table}: {count}")

    print("\n--- Sample PanierSchoolStats ---")
    cursor.execute("""
        SELECT s.id, p.name, sch.name, s.tauxIntegrationPct 
        FROM PanierSchoolStats s
        JOIN Panier p ON s.panierId = p.id
        JOIN School sch ON s.schoolUai = sch.uai
        LIMIT 5
    """)
    samples = cursor.fetchall()
    for row in samples:
        print(f"ID: {row[0]}, Panier: {row[1]}, School: {row[2]}, Taux: {row[3]}%")

    conn.close()

if __name__ == "__main__":
    verify()
