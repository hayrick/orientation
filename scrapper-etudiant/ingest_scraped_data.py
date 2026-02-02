import os
import pandas as pd
import sqlite3
import re
import unicodedata

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output_csv")
DB_PATH = os.path.join(BASE_DIR, "..", "ingestion", "prisma", "dev.db")

def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def upsert_school_stats(cursor, stats):
    query = """
    INSERT INTO PanierSchoolStats (
        id, panierId, schoolUai, tauxIntegrationPct, moyenneBac, moyenneMultiAnsPct, rangMultiAns, parcoursup
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        tauxIntegrationPct=excluded.tauxIntegrationPct,
        moyenneBac=excluded.moyenneBac,
        moyenneMultiAnsPct=excluded.moyenneMultiAnsPct,
        rangMultiAns=excluded.rangMultiAns,
        parcoursup=excluded.parcoursup
    """
    cursor.executemany(query, stats)

def ingest():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("--- Starting Ingestion ---")

    # 1. Load Mapping
    mapping_path = os.path.join(OUTPUT_DIR, "mapping.csv")
    df_mapping = pd.read_csv(mapping_path)
    # Filter only matched schools
    df_mapping = df_mapping[df_mapping['matched_uai'].notna() & (df_mapping['matched_uai'] != "")]
    name_to_uai = dict(zip(df_mapping['scraped_name'], df_mapping['matched_uai']))
    print(f"Loaded {len(name_to_uai)} school mappings.")

    # 2. Ingest MasterFormations
    mf_path = os.path.join(OUTPUT_DIR, "master_formations.csv")
    df_mf = pd.read_csv(mf_path)
    # Clean up names (some might be empty or junk)
    df_mf = df_mf[df_mf['master_formation_name'].notna() & (df_mf['master_formation_name'].str.len() > 1)]
    
    mfs_to_insert = []
    for idx, row in df_mf.iterrows():
        name = row['master_formation_name'].strip()
        mf_id = slugify(name)
        mfs_to_insert.append((mf_id, name))
    
    query = """
    INSERT INTO MasterFormation (id, name) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name
    """
    cursor.executemany(query, mfs_to_insert)
    print(f"Upserted {len(mfs_to_insert)} MasterFormations.")

    # 3. Ingest Paniers
    paniers_path = os.path.join(OUTPUT_DIR, "paniers.csv")
    df_paniers = pd.read_csv(paniers_path)
    
    panier_count = 0
    association_count = 0
    for idx, row in df_paniers.iterrows():
        cpge_type = row['cpge_type']
        name = row['panier_name']
        url = row['panier_url']
        schools_str = str(row['schools'])
        
        panier_id = slugify(f"{cpge_type}-{name}")
        
        query = """
        INSERT INTO Panier (id, name, cpgeType, url) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, 
            cpgeType=excluded.cpgeType, 
            url=excluded.url
        """
        cursor.execute(query, (panier_id, name, cpge_type, url))
        panier_count += 1
            
        # Associations
        schools = [s.strip() for s in schools_str.split(';') if s.strip()]
        for school_name in schools:
            mf_id = slugify(school_name)
            # Check if mf exists
            cursor.execute("SELECT id FROM MasterFormation WHERE id = ?", (mf_id,))
            if cursor.fetchone():
                cursor.execute("INSERT OR IGNORE INTO PanierMasterFormation (panierId, masterFormationId) VALUES (?, ?)",
                               (panier_id, mf_id))
                if cursor.rowcount > 0:
                    association_count += 1
    
    print(f"Inserted {panier_count} Paniers and {association_count} Panier-Master associations.")

    # 4. Ingest School Stats (Panier-specific)
    stats_path = os.path.join(OUTPUT_DIR, "panier_school_stats.csv")
    df_stats = pd.read_csv(stats_path)
    
    stats_to_insert = []
    skipped_unmatched = 0
    
    for idx, row in df_stats.iterrows():
        scraped_name = row['school_name']
        uai = name_to_uai.get(scraped_name)
        
        if not uai:
            skipped_unmatched += 1
            continue
            
        cpge_type = row['cpge_type']
        panier_name = row['panier_name']
        panier_id = slugify(f"{cpge_type}-{panier_name}")
        
        stat_id = f"{panier_id}-{uai}"
        
        # Parse values
        taux = row.get('taux_integration_pct')
        moy_bac = row.get('moyenne_bac')
        moy_multi = row.get('moyenne_multi_ans_pct')
        rang = row.get('rang_multi_ans')
        parcoursup = 1 if row.get('parcoursup') == 'oui' else 0
        
        # Conversion helps handle NaNs
        try: taux = float(taux) if pd.notna(taux) else None
        except: taux = None
        try: moy_bac = float(moy_bac) if pd.notna(moy_bac) else None
        except: moy_bac = None
        try: moy_multi = float(moy_multi) if pd.notna(moy_multi) else None
        except: moy_multi = None
        
        stats_to_insert.append((
            stat_id, panier_id, uai, taux, moy_bac, moy_multi, rang, parcoursup
        ))

    upsert_school_stats(cursor, stats_to_insert)
    
    print(f"Inserted {cursor.rowcount} PanierSchoolStats. Skipped {skipped_unmatched} unmatched schools.")

    conn.commit()
    conn.close()
    print("--- Ingestion Completed ---")

if __name__ == "__main__":
    ingest()
