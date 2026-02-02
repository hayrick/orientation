import sqlite3
import os

db_path = os.path.join("ingestion", "prisma", "dev.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Henri IV CPGE Formations ---")
query = """
    SELECT f.name, f.filiereFormationDetailleeBis 
    FROM Formation f 
    JOIN School s ON f.schoolUai = s.uai 
    WHERE s.name LIKE '%Henri%IV%' AND f.category = 'CPGE'
"""
cursor.execute(query)
for row in cursor.fetchall():
    print(row)

print("\n--- Schools with filiere 'Lettres' ---")
query = "SELECT DISTINCT s.name FROM Formation f JOIN School s ON f.schoolUai = s.uai WHERE f.filiereFormationDetailleeBis = 'Lettres' LIMIT 10"
cursor.execute(query)
for row in cursor.fetchall():
    print(row)

conn.close()
