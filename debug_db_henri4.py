import sqlite3
import pandas as pd

db_path = "ingestion/prisma/dev.db"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- Searching for School 'Henri-IV' ---")
    cursor.execute("SELECT uai, name FROM School WHERE name LIKE '%Henri%IV%'")
    schools = cursor.fetchall()
    for s in schools:
        print(f"Found School: {s}")
        
    if not schools:
        print("No school found matching 'Henri%IV%'")
        # Try broader search
        cursor.execute("SELECT uai, name FROM School WHERE name LIKE '%Henri%'")
        schools = cursor.fetchall()
        print(f"Broader search 'Henri': {schools}")

    print("\n--- Searching for Panier 'ECG - Mathématiques approfondies + ESH' ---")
    # Check Panier table
    cursor.execute("SELECT id, name, cpgeType FROM Panier WHERE cpgeType LIKE '%Mathématiques approfondies + ESH%'")
    paniers = cursor.fetchall()
    for p in paniers:
        print(f"Found Panier: {p}")

    if schools and paniers:
        school_uai = schools[0][0] # Assuming first one is correct
        print(f"\n--- Checking PanierSchoolStats for School {school_uai} ---")
        cursor.execute(f"SELECT * FROM PanierSchoolStats WHERE schoolUai = '{school_uai}'")
        stats = cursor.fetchall()
        for stat in stats:
             # Find which panier this stat belongs to
             panier_id = stat[1] # definition: id, panierId, schoolUai...
             cursor.execute(f"SELECT name, cpgeType FROM Panier WHERE id = '{panier_id}'")
             p_info = cursor.fetchone()
             print(f"Stat found for Panier: {p_info} -> {stat}")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
