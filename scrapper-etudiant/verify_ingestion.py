import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "ingestion", "prisma", "dev.db")

def verify():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("--- Ingestion Verification ---")

    # 1. MasterFormations
    cursor.execute("SELECT COUNT(*) FROM MasterFormation")
    mf_count = cursor.fetchone()[0]
    print(f"Total MasterFormations: {mf_count}")

    # 2. Paniers
    cursor.execute("SELECT COUNT(*) FROM Panier")
    panier_count = cursor.fetchone()[0]
    print(f"Total Paniers: {panier_count}")

    # 3. Associations
    cursor.execute("SELECT COUNT(*) FROM PanierMasterFormation")
    assoc_count = cursor.fetchone()[0]
    print(f"Total Panier-Master associations: {assoc_count}")

    # 4. PanierSchoolStats
    cursor.execute("SELECT COUNT(*) FROM PanierSchoolStats")
    stats_count = cursor.fetchone()[0]
    print(f"Total PanierSchoolStats: {stats_count}")

    # 5. Sample Check
    print("\n--- Sample Check (Top 5 Schools in '4 Véto' Panier) ---")
    query = """
    SELECT s.name, ps.tauxIntegrationPct, ps.moyenneBac
    FROM PanierSchoolStats ps
    JOIN School s ON ps.schoolUai = s.uai
    JOIN Panier p ON ps.panierId = p.id
    WHERE p.name = '4 Véto'
    ORDER BY ps.tauxIntegrationPct DESC
    LIMIT 5
    """
    cursor.execute(query)
    samples = cursor.fetchall()
    for s in samples:
        print(f" - {s[0]}: Taux={s[1]}%, Bac={s[2]}")

    conn.close()

if __name__ == "__main__":
    verify()
