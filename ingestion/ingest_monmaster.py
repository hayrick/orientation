"""
Ingest MonMaster open data CSV into database.

This script:
1. Creates the MonMasterFormation, MasterSecteur, MasterSecteurFormation tables
2. Parses the CSV and inserts all master formation rows
3. Computes admission rate per formation
4. Groups by secteur disciplinaire and ranks by selectivity
5. Creates Top 3, Top 5, Top 10 tiers per secteur
"""

import os
import csv
import sqlite3
from collections import defaultdict

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "monmaster", "fr-esr-mon_master.csv")
DB_PATH = os.path.join(BASE_DIR, "prisma", "dev.db")


def parse_int(val):
    """Safely parse an integer from a CSV value."""
    if not val or val.strip() == "":
        return None
    try:
        return int(val.strip())
    except ValueError:
        return None


def parse_float(val):
    """Safely parse a float from a CSV value."""
    if not val or val.strip() == "":
        return None
    try:
        # Handle French decimal format (comma as decimal separator)
        return float(val.strip().replace(",", "."))
    except ValueError:
        return None


def create_tables(cursor):
    """Create MonMaster tables if they don't exist."""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS MonMasterFormation (
            id TEXT PRIMARY KEY,
            etablissementId TEXT NOT NULL,
            etablissementNom TEXT NOT NULL,
            mention TEXT NOT NULL,
            parcours TEXT,
            secteurDisciplinaire TEXT NOT NULL,
            secteurId TEXT NOT NULL,
            discipline TEXT NOT NULL,
            alternance BOOLEAN NOT NULL,
            modalite TEXT,
            ville TEXT,
            academie TEXT,
            region TEXT,
            capacite INTEGER,
            candidats INTEGER,
            classes INTEGER,
            propositions INTEGER,
            acceptes INTEGER,
            admissionRate REAL,
            rangDernierAppelePP INTEGER,
            pctFemmes REAL,
            pctMemeEtablissement REAL,
            pctMemeAcademie REAL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS MasterSecteur (
            id TEXT PRIMARY KEY,
            secteurDisciplinaire TEXT NOT NULL,
            secteurId TEXT NOT NULL,
            tier TEXT NOT NULL,
            UNIQUE(secteurId, tier)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS MasterSecteurFormation (
            masterSecteurId TEXT NOT NULL,
            monMasterFormationId TEXT NOT NULL,
            rank INTEGER NOT NULL,
            PRIMARY KEY (masterSecteurId, monMasterFormationId),
            FOREIGN KEY (masterSecteurId) REFERENCES MasterSecteur(id),
            FOREIGN KEY (monMasterFormationId) REFERENCES MonMasterFormation(id)
        )
    """)
    print("   Tables created/verified.")


def extract_city(lieu_formation):
    """Extract the first city from the 'Lieu(x) de formation' field.
    
    Format: 'Université Paris Cité - PARIS (75)|UFR SDV - Campus...'
    We extract the city before the parenthesized department code.
    """
    if not lieu_formation:
        return None
    # Take the first location entry
    first = lieu_formation.split("|")[0].strip()
    # Look for ' - CITY (XX)' pattern at the end
    parts = first.rsplit(" - ", 1)
    if len(parts) == 2:
        city_part = parts[1].strip()
        # Remove department code in parentheses
        if "(" in city_part:
            city_part = city_part[:city_part.rfind("(")].strip()
        return city_part
    return None


def ingest():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print("INGESTING MONMASTER DATA")
    print("=" * 60)

    # Step 0: Create tables
    print("\n0. Creating tables...")
    create_tables(cursor)

    # Step 1: Clear existing data
    print("\n1. Clearing existing MonMaster data...")
    cursor.execute("DELETE FROM MasterSecteurFormation")
    cursor.execute("DELETE FROM MasterSecteur")
    cursor.execute("DELETE FROM MonMasterFormation")
    conn.commit()

    # Step 2: Parse CSV and insert formations
    print("\n2. Parsing CSV and inserting formations...")
    formations_to_insert = []
    skipped = 0
    seen_ids = set()

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter=";")
        header = next(reader)

        # Build column index map from header
        col_idx = {name: i for i, name in enumerate(header)}

        for row_num, row in enumerate(reader, start=2):
            if len(row) < 30:
                skipped += 1
                continue

            formation_id = row[col_idx["Identifiant de la formation"]].strip()
            if not formation_id:
                skipped += 1
                continue

            # Skip duplicates (same formation ID can appear if data issues)
            if formation_id in seen_ids:
                skipped += 1
                continue
            seen_ids.add(formation_id)

            etablissement_id = row[col_idx["Identifiant de l'établissement"]].strip()
            etablissement_nom = row[col_idx["Libellé de l'établissement"]].strip()
            mention = row[col_idx["Intitulé de la mention"]].strip()
            parcours = row[col_idx["Intitulé du parcours"]].strip() or None
            secteur_disc = row[col_idx["Secteur disciplinaire"]].strip()
            secteur_id = row[col_idx["Identifiant du secteur disciplinaire"]].strip()
            discipline = row[col_idx["Discipline"]].strip()
            alternance = row[col_idx["Alternance"]].strip() == "1"
            modalite = row[col_idx["Modalités d'enseignement"]].strip() or None
            academie = row[col_idx["Académie du lieu de formation"]].strip() or None
            region = row[col_idx["Région académique du lieu de formation"]].strip() or None
            lieu = row[col_idx["Lieu(x) de formation"]].strip() if "Lieu(x) de formation" in col_idx else ""
            ville = extract_city(lieu)

            capacite = parse_int(row[col_idx["Capacité offerte limitée par la formation"]])

            # Candidates (phase principale)
            candidats = parse_int(row[col_idx[
                "Effectif de candidats ayant confirmé une candidature en phase principale"]])

            # Classified candidates (PP + PC)
            classes = parse_int(row[col_idx[
                "Effectif de candidats classés sur une candidature formulée en phase principale ou en phase complémentaire"]])

            # Proposals received (PP + PC)
            propositions = parse_int(row[col_idx[
                "Effectif de candidats ayant reçu une proposition pour une candidature formulée en phase principale ou en phase complémentaire"]])

            # Accepted (PP + PC)
            acceptes = parse_int(row[col_idx[
                "Effectif de candidats ayant accepté une proposition d'admission pour une candidature formulée en phase principale ou en phase complémentaire"]])

            # Last called rank (main phase)
            rang_col = "Rang du dernier appelé en phase principale"
            rang_dernier = parse_int(row[col_idx[rang_col]]) if rang_col in col_idx else None

            # Percentages
            pct_femmes_col = "Part des femmes parmi les candidats ayant accepté une proposition d'admission pour une candidature formulée en phase principale ou en phase complémentaire"
            pct_femmes = parse_float(row[col_idx[pct_femmes_col]]) if pct_femmes_col in col_idx else None

            pct_etab_col = "Part des candidats parmi ceux ayant accepté une proposition d'admission pour une candidature formulée en phase principale ou en phase complémentaire qui étaient inscrits dans le même établissement  à la rentrée N-1"
            pct_etab = parse_float(row[col_idx[pct_etab_col]]) if pct_etab_col in col_idx else None

            pct_acad_col = "Part des candidats parmi ceux ayant accepté une proposition d'admission pour une candidature formulée en phase principale ou en phase complémentaire issus de la même académie (à partir du lieu de formation)"
            pct_acad = parse_float(row[col_idx[pct_acad_col]]) if pct_acad_col in col_idx else None

            # Compute admission rate: rang dernier appelé / capacité
            # Lower ratio = more selective (only top-ranked candidates get in)
            admission_rate = None
            if rang_dernier and rang_dernier > 0 and capacite and capacite > 0:
                admission_rate = round(rang_dernier / capacite, 2)

            formations_to_insert.append((
                formation_id, etablissement_id, etablissement_nom,
                mention, parcours, secteur_disc, secteur_id, discipline,
                alternance, modalite, ville, academie, region,
                capacite, candidats, classes, propositions, acceptes,
                admission_rate, rang_dernier, pct_femmes, pct_etab, pct_acad
            ))

    # Batch insert
    cursor.executemany("""
        INSERT OR REPLACE INTO MonMasterFormation 
        (id, etablissementId, etablissementNom, mention, parcours,
         secteurDisciplinaire, secteurId, discipline, alternance, modalite,
         ville, academie, region, capacite, candidats, classes, propositions,
         acceptes, admissionRate, rangDernierAppelePP, pctFemmes,
         pctMemeEtablissement, pctMemeAcademie)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, formations_to_insert)
    print(f"   Inserted {len(formations_to_insert)} formations (skipped {skipped})")

    # Step 3: Group by secteur and rank by selectivity
    print("\n3. Building secteur rankings...")

    # Fetch formations eligible for ranking:
    # - Must have a valid admission rate (rangDernierAppelePP / capacite)
    # - At least 20 seats offered
    # - More than 50 candidates
    cursor.execute("""
        SELECT id, secteurId, secteurDisciplinaire, admissionRate, candidats
        FROM MonMasterFormation
        WHERE admissionRate IS NOT NULL AND admissionRate > 0
          AND capacite IS NOT NULL AND capacite >= 20
          AND candidats IS NOT NULL AND candidats > 50
        ORDER BY secteurId, admissionRate ASC
    """)

    # Group by secteur
    secteur_groups = defaultdict(list)
    secteur_labels = {}
    for row in cursor.fetchall():
        fid, sid, sname, rate, cands = row
        secteur_groups[sid].append((fid, rate))
        secteur_labels[sid] = sname

    print(f"   Found {len(secteur_groups)} distinct secteurs with valid data")

    # Step 4: Create MasterSecteur and MasterSecteurFormation entries
    print("\n4. Creating tier rankings (Top 3, Top 5, Top 10)...")

    tiers = [("top3", 3), ("top5", 5), ("top10", 10)]
    secteur_count = 0
    formation_count = 0

    for sid, formations in sorted(secteur_groups.items()):
        sname = secteur_labels[sid]
        # formations are already sorted by admissionRate ASC (most selective first)

        for tier_name, tier_size in tiers:
            secteur_id = f"{sid}-{tier_name}"
            cursor.execute(
                "INSERT OR REPLACE INTO MasterSecteur (id, secteurDisciplinaire, secteurId, tier) VALUES (?, ?, ?, ?)",
                (secteur_id, sname, sid, tier_name)
            )
            secteur_count += 1

            # Take top N formations for this tier
            top_n = formations[:tier_size]
            for rank, (fid, _rate) in enumerate(top_n, start=1):
                cursor.execute(
                    "INSERT OR REPLACE INTO MasterSecteurFormation (masterSecteurId, monMasterFormationId, rank) VALUES (?, ?, ?)",
                    (secteur_id, fid, rank)
                )
                formation_count += 1

    print(f"   Created {secteur_count} MasterSecteur entries")
    print(f"   Created {formation_count} MasterSecteurFormation entries")

    # Step 5: Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    cursor.execute("SELECT COUNT(*) FROM MonMasterFormation")
    total_formations = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM MasterSecteur")
    total_secteurs = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM MasterSecteurFormation")
    total_rankings = cursor.fetchone()[0]

    print(f"   MonMasterFormation rows:      {total_formations}")
    print(f"   MasterSecteur entries:         {total_secteurs}")
    print(f"   MasterSecteurFormation entries: {total_rankings}")

    # Show top 3 most selective per a sample secteur
    print("\n--- Sample: Top 3 most selective in first secteur ---")
    cursor.execute("""
        SELECT ms.secteurDisciplinaire, ms.tier, msf.rank, 
               m.mention, m.parcours, m.etablissementNom, 
               m.admissionRate, m.candidats
        FROM MasterSecteurFormation msf
        JOIN MonMasterFormation m ON msf.monMasterFormationId = m.id
        JOIN MasterSecteur ms ON msf.masterSecteurId = ms.id
        WHERE ms.tier = 'top3'
        ORDER BY ms.secteurDisciplinaire, msf.rank
        LIMIT 15
    """)
    current_secteur = None
    for row in cursor.fetchall():
        sname, tier, rank, mention, parcours, etab, rate, cands = row
        if sname != current_secteur:
            current_secteur = sname
            print(f"\n  [{sname}]")
        parcours_str = f" — {parcours}" if parcours else ""
        print(f"    #{rank}: {mention}{parcours_str} @ {etab} "
              f"(admission: {rate:.1f}%, {cands} candidats)")

    conn.commit()
    conn.close()

    print("\n" + "=" * 60)
    print("INGESTION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    ingest()
