import sqlite3
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "ingestion", "prisma", "dev.db")

def check_db():
    conn = sqlite3.connect(DB_PATH)
    
    # Check for schools in Paris
    print("--- Schools in Paris ---")
    query = """
    SELECT s.name, l.city 
    FROM School s 
    JOIN SchoolLocation l ON s.uai = l.schoolUai 
    WHERE l.city LIKE '%Paris%' 
    LIMIT 10
    """
    df = pd.read_sql_query(query, conn)
    print(df)
    
    # Check specifically for Henri IV
    print("\n--- Searching for 'Henri' ---")
    query = "SELECT uai, name FROM School WHERE name LIKE '%Henri%'"
    df = pd.read_sql_query(query, conn)
    print(df)

    conn.close()

if __name__ == "__main__":
    check_db()
