import os
import sys

# Add the current directory to sys.path to allow importing from backend
sys.path.append(os.getcwd())

from backend.database import SessionLocal
from backend.models import Formation, Panier, PanierSchoolStats, MasterFormation, School, panier_master_formation

def run_checks():
    db = SessionLocal()
    try:
        print("--- Starting Database Integrity Checks ---\n")

        # 1. Panier must be linked to at least one School
        # A Panier is linked to schools via PanierSchoolStats
        print("Checking: Paniers linked to at least one School...")
        paniers_without_schools = (
            db.query(Panier)
            .outerjoin(PanierSchoolStats)
            .filter(PanierSchoolStats.id == None)
            .all()
        )
        if paniers_without_schools:
            print(f"  [!] Found {len(paniers_without_schools)} Paniers with no schools:")
            for p in paniers_without_schools:
                print(f"      - ID: {p.id}, Name: {p.name}")
        else:
            print("  [OK] All Paniers are linked to at least one school.")

        # 2. Formation is linked to 1 and only one School
        # In SQL, the foreign key schoolUai ensures it's linked to at most one.
        # We need to check if any are NOT linked to one (null).
        print("\nChecking: Formations linked to exactly one School...")
        formations_without_school = (
            db.query(Formation)
            .filter((Formation.schoolUai == None) | (Formation.schoolUai == ""))
            .all()
        )
        if formations_without_school:
            print(f"  [!] Found {len(formations_without_school)} Formations with no schoolUai:")
            for f in formations_without_school:
                print(f"      - ID: {f.id}, Name: {f.name}")
        else:
            print("  [OK] All Formations have a linked school.")

        # 3. Panier has at least one MasterFormation
        # Check via the association table
        print("\nChecking: Paniers linked to at least one MasterFormation...")
        paniers_without_master = (
            db.query(Panier)
            .outerjoin(panier_master_formation)
            .filter(panier_master_formation.c.masterFormationId == None)
            .all()
        )
        if paniers_without_master:
            print(f"  [!] Found {len(paniers_without_master)} Paniers with no MasterFormations:")
            for p in paniers_without_master:
                print(f"      - ID: {p.id}, Name: {p.name}")
        else:
            print("  [OK] All Paniers are linked to at least one MasterFormation.")

        # 4. Check if PanierSchoolStats schoolUai corresponds to a valid School
        print("\nChecking: PanierSchoolStats linking to valid Schools...")
        orphan_stats = (
            db.query(PanierSchoolStats)
            .outerjoin(School, PanierSchoolStats.schoolUai == School.uai)
            .filter(School.uai == None)
            .all()
        )
        if orphan_stats:
            print(f"  [!] Found {len(orphan_stats)} PanierSchoolStats entries pointing to non-existent Schools.")
        else:
            print("  [OK] All PanierSchoolStats point to valid Schools.")

        print("\n--- Checks Completed ---")

    finally:
        db.close()

if __name__ == "__main__":
    run_checks()
