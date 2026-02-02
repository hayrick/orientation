import sqlite3
import os
import sys

def main():
    db_path = os.path.join("ingestion", "prisma", "dev.db")
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}", flush=True)
        sys.exit(1)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        def print_query(title, query):
            print(f"\n--- {title} ---", flush=True)
            try:
                cursor.execute(query)
                rows = cursor.fetchall()
                if not rows:
                    print("No results.", flush=True)
                for row in rows:
                    print(row, flush=True)
            except sqlite3.OperationalError as oe:
                 print(f"Operational Error ({title}): {oe}", flush=True)
            except Exception as e:
                print(f"Query Error ({title}): {e}", flush=True)

        print_query("Panier cpgeType", "SELECT DISTINCT cpgeType FROM Panier")
        
        print_query("All filieres containing 'Lettre' or 'A/L' or 'LSH'", """
            SELECT DISTINCT category, filiereFormationDetailleeBis 
            FROM Formation 
            WHERE filiereFormationDetailleeBis LIKE '%Lettre%' 
               OR filiereFormationDetailleeBis LIKE '%A/L%' 
               OR filiereFormationDetailleeBis LIKE '%LSH%'
        """)

        print_query("Henri IV CPGE formations", """
            SELECT s.name as school, f.name as formation, f.filiereFormationDetailleeBis as filiere
            FROM Formation f
            JOIN School s ON f.schoolUai = s.uai
            WHERE s.name LIKE '%Henri%IV%' 
              AND f.category = 'CPGE'
        """)

        print_query("Master Formations", "SELECT * FROM MasterFormation")
        
        print_query("Panier-MasterFormation Links", """
            SELECT p.name as panier, p.cpgeType, mf.name as master
            FROM Panier p
            JOIN PanierMasterFormation pmf ON p.id = pmf.panierId
            JOIN MasterFormation mf ON pmf.masterFormationId = mf.id
        """)

        conn.close()
    except Exception as e:
        print(f"Fatal Error: {e}", flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
