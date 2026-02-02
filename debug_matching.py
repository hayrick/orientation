import sqlite3
import os

db_path = 'ingestion/prisma/dev.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get UAIs from PanierSchoolStats
stats_uais = set(r[0] for r in cursor.execute("SELECT DISTINCT schoolUai FROM PanierSchoolStats").fetchall())
print(f"Distinct UAIs in PanierSchoolStats: {len(stats_uais)}")

# Get UAIs from Formation
formation_uais = set(r[0] for r in cursor.execute("SELECT DISTINCT schoolUai FROM Formation").fetchall())
print(f"Distinct UAIs in Formation: {len(formation_uais)}")

# Overlap
overlap = stats_uais.intersection(formation_uais)
print(f"Overlap: {len(overlap)}")

if len(overlap) > 0:
    # Check if any formations with overlap are actually returned by the search
    f_with_stats = cursor.execute("""
        SELECT f.id, f.name, f.schoolUai 
        FROM Formation f
        JOIN PanierSchoolStats pss ON f.schoolUai = pss.schoolUai
        LIMIT 5
    """).fetchall()
    print("\nSample Formations with available stats:")
    for f in f_with_stats:
        print(f"ID: {f[0]}, Name: {f[1]}, UAI: {f[2]}")
else:
    print("\nWARNING: No overlap found between PanierSchoolStats and Formations!")

conn.close()
