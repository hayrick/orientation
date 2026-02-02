
import sqlite3
import os

db_path = "backend/data.db"
# If running from root, path is correct. If from scraper, need to adjust.
# Let's use absolute path for the db too if possible, but let's assume we run from c:\Users\erics\src\finances\orientation

conn = sqlite3.connect("c:/Users/erics/src/finances/orientation/ingestion/prisma/dev.db")
cursor = conn.cursor()

query = """
SELECT s.name, f.name, f.filiereFormationDetaillee, f.filiereFormationDetailleeBis, f.category 
FROM Formation f
JOIN School s ON f.schoolUai = s.uai
WHERE s.name LIKE '%Mistral%' OR f.name LIKE '%Mistral%'
"""

cursor.execute(query)
rows = cursor.fetchall()

print(f"Found {len(rows)} matching formations:")
for row in rows:
    print(f"School: {row[0]} | Name: {row[1]} | Detail: {row[2]} | DetailBis: {row[3]} | Category: {row[4]}")

conn.close()
