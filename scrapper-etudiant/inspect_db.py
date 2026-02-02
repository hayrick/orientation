import sqlite3
import os

DB_PATH = os.path.join("..", "ingestion", "prisma", "dev.db")

def inspect():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("--- PANIERS ---")
    cursor.execute("SELECT id, name, cpgeType FROM Panier")
    for row in cursor.fetchall():
        print(f"ID: {row[0]} | Name: {row[1]} | Type: {row[2]}")

    print("\n--- MASTER FORMATIONS ---")
    cursor.execute("SELECT id, name FROM MasterFormation")
    for row in cursor.fetchall():
        print(f"ID: {row[0]} | Name: {row[1]}")

    conn.close()

if __name__ == "__main__":
    inspect()
