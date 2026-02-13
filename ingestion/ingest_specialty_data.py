"""
Ingest specialty admission data from Parcoursup CSV into database.

This script:
1. Populates the Specialty table with normalized specialty names
2. Populates the CpgeCategoryMapping table linking CSV categories to our cpgeTypes
3. Ingests admission stats per specialty combination
"""

import os
import csv
import sqlite3
import unicodedata
import re

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "parcoursup", "2025", 
                        "fr-esr-parcoursup-enseignements-de-specialite-bacheliers-generaux-2.csv")
DB_PATH = os.path.join(BASE_DIR, "prisma", "dev.db")

def slugify(text):
    """Convert text to a URL-friendly slug"""
    if not text: return ""
    text = unicodedata.normalize('NFKD', str(text)).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

# Mapping from raw specialty names to normalized IDs and short names
SPECIALTY_MAPPING = {
    'Mathématiques Spécialité': ('maths', 'Maths'),
    'Physique-Chimie Spécialité': ('physique-chimie', 'Physique-Chimie'),
    'Sciences de la vie et de la Terre Spécialité': ('svt', 'SVT'),
    'Sciences Economiques et Sociales Spécialité': ('ses', 'SES'),
    'Histoire-Géographie, Géopolitique et Sciences politiques': ('hggsp', 'HGGSP'),
    'Humanités, Littérature et Philosophie': ('hlp', 'HLP'),
    'Langues, littératures et cultures étrangères et régionales': ('llcer', 'LLCER'),
    'Numérique et Sciences Informatiques': ('nsi', 'NSI'),
    'Sciences de l\'ingénieur et sciences physiques': ('si', 'SI'),
    'Art': ('art', 'Art'),
    'Biologie/Ecologie': ('bio-eco', 'Bio/Éco'),
    'Littérature et langues et cultures de l\'Antiquité': ('llca', 'LLCA'),
    'Éducation physique, pratiques et culture sportives': ('eps', 'EPS'),
}

# Handle split specialties (CSV parsing issue)
SPECIALTY_FIXES = {
    'Histoire-Géographie': 'Histoire-Géographie, Géopolitique et Sciences politiques',
    'Géopolitique et Sciences politiques': None,  # Skip, part of above
    'Humanités': 'Humanités, Littérature et Philosophie',
    'Littérature et Philosophie': None,  # Skip, part of above
    'Langues': 'Langues, littératures et cultures étrangères et régionales',
    'littératures et cultures étrangères et régionales': None,  # Skip
    'pratiques et culture sportives': None,  # Skip, part of EPS
    'Éducation physique': 'Éducation physique, pratiques et culture sportives',
}

# CPGE category to our cpgeTypes mapping
CPGE_CATEGORY_MAPPINGS = {
    'CPGE ECG': [
        'ECG',
        'ECG - Mathématiques appliquées + ESH',
        'ECG - Mathématiques appliquées + HGG',
        'ECG - Mathématiques approfondies + ESH',
        'ECG - Mathématiques approfondies + HGG',
    ],
    'CPGE L': [
        'B/L - Lettres et sciences sociales',
        # Future: A/L, LSH
    ],
    'CPGE S': [
        'MP',
        'MPI',
        'PC',
        'PSI',
        'BCPST',
    ],
}

def normalize_specialty(raw_name):
    """Normalize a specialty name, handling split parsing issues"""
    raw_name = raw_name.strip()
    
    # Check if this is a fragment that should be skipped
    if raw_name in SPECIALTY_FIXES:
        fixed = SPECIALTY_FIXES[raw_name]
        if fixed is None:
            return None  # Skip this fragment
        raw_name = fixed
    
    # Check direct mapping
    if raw_name in SPECIALTY_MAPPING:
        return SPECIALTY_MAPPING[raw_name]
    
    # Try partial match
    for full_name, (slug, short) in SPECIALTY_MAPPING.items():
        if raw_name in full_name or full_name.startswith(raw_name):
            return (slug, short)
    
    # Fallback: create from raw
    print(f"  WARNING: Unknown specialty: '{raw_name}'")
    return (slugify(raw_name), raw_name[:20])

def parse_specialty_pair(raw_specs):
    """Parse the comma-separated specialty string into a pair of normalized IDs"""
    parts = [p.strip() for p in raw_specs.split(',')]
    
    normalized = []
    for part in parts:
        result = normalize_specialty(part)
        if result:
            normalized.append(result)
    
    # Should have exactly 2 unique specialties
    # De-duplicate
    seen = set()
    unique = []
    for id, short in normalized:
        if id not in seen:
            seen.add(id)
            unique.append((id, short))
    
    if len(unique) < 2:
        return None
    
    # Sort for consistency (spec1 < spec2)
    unique.sort(key=lambda x: x[0])
    return (unique[0], unique[1])

def ingest():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("="*60)
    print("INGESTING SPECIALTY ADMISSION DATA")
    print("="*60)
    
    # Step 1: Insert Specialties
    print("\n1. Inserting Specialties...")
    specialties_to_insert = []
    for full_name, (slug, short) in SPECIALTY_MAPPING.items():
        specialties_to_insert.append((slug, full_name, short))
    
    cursor.executemany('''
        INSERT OR REPLACE INTO Specialty (id, name, shortName)
        VALUES (?, ?, ?)
    ''', specialties_to_insert)
    print(f"   Inserted {len(specialties_to_insert)} specialties")
    
    # Step 2: Insert CPGE Category Mappings
    print("\n2. Inserting CPGE Category Mappings...")
    mappings_to_insert = []
    for csv_category, cpge_types in CPGE_CATEGORY_MAPPINGS.items():
        for cpge_type in cpge_types:
            mappings_to_insert.append((csv_category, cpge_type))
    
    cursor.executemany('''
        INSERT OR IGNORE INTO CpgeCategoryMapping (csvCategory, cpgeType)
        VALUES (?, ?)
    ''', mappings_to_insert)
    print(f"   Inserted {len(mappings_to_insert)} category mappings")
    
    # Step 3: Parse and Insert Admission Stats
    print("\n3. Parsing CSV and inserting admission stats...")
    stats_to_insert = []
    skipped = 0
    
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            formation = row['Formation']
            # Skip the "Ensemble des bacheliers" aggregate row
            if formation == 'Ensemble des bacheliers':
                continue
            
            # Parse specialty pair
            raw_specs = row['Enseignements de spécialité']
            pair = parse_specialty_pair(raw_specs)
            
            if not pair:
                skipped += 1
                continue
            
            (spec1_id, _), (spec2_id, _) = pair
            
            # Parse numbers
            candidats = int(row.get('Nombre de candidats bacheliers ayant confirmé au moins un vœu', 0) or 0)
            propositions = float(row.get("Nombre de candidats bacheliers ayant reçu au moins une proposition d'admission", 0) or 0)
            acceptes = int(row.get("Nombre de candidats bacheliers ayant accepté une proposition d'admission", 0) or 0)
            
            # Calculate admission rate
            admission_rate = (propositions / candidats * 100) if candidats > 0 else None
            
            # Create unique ID
            stat_id = f"{spec1_id}-{spec2_id}-{slugify(formation)}"
            
            stats_to_insert.append((
                stat_id, spec1_id, spec2_id, formation,
                candidats, propositions, acceptes, admission_rate
            ))
    
    cursor.executemany('''
        INSERT OR REPLACE INTO SpecialtyAdmissionStats 
        (id, specialty1Id, specialty2Id, cpgeCategory, candidats, propositions, acceptes, admissionRatePct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', stats_to_insert)
    
    print(f"   Inserted {len(stats_to_insert)} admission stats (skipped {skipped})")
    
    conn.commit()
    conn.close()
    
    print("\n" + "="*60)
    print("INGESTION COMPLETE")
    print("="*60)

if __name__ == "__main__":
    ingest()
