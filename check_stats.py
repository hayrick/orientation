import sqlite3
import os

db_path = 'ingestion/prisma/dev.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- PanierSchoolStats Samples ---")
cursor.execute("SELECT schoolUai, tauxIntegrationPct, moyenneMultiAnsPct FROM PanierSchoolStats LIMIT 10")
rows = cursor.fetchall()

print(f"{'UAI':<10} | {'Taux (1yr)':<10} | {'Moyenne (Multi)':<15}")
print("-" * 40)
for row in rows:
    print(f"{row[0]:<10} | {row[1]:<10} | {row[2]:<15}")

conn.close()
