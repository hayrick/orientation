import os
import json
import sqlite3

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "prisma", "dev.db")
MAPPING_FILE = os.path.join(BASE_DIR, "cpge_mapping.json")

def ingest_mappings():
    if not os.path.exists(MAPPING_FILE):
        print(f"Mapping file not found at {MAPPING_FILE}")
        return

    with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
        mappings = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(f"--- Ingesting {len(mappings)} CPGE Mappings ---")

    # Clear existing mappings to avoid duplicates with NULL schoolUai
    cursor.execute("DELETE FROM CpgeMapping")
    
    query = """
    INSERT INTO CpgeMapping (etudiantType, parcoursupFiliere, schoolUai)
    VALUES (?, ?, ?)
    """
    
    data_to_insert = [
        (m['etudiantType'], m['parcoursupFiliere'], m.get('schoolUai'))
        for m in mappings
    ]
    
    cursor.executemany(query, data_to_insert)
    conn.commit()
    conn.close()
    
    print("--- Ingestion Completed ---")

if __name__ == "__main__":
    ingest_mappings()
