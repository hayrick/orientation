import pandas as pd
import sqlite3
from thefuzz import process, fuzz
import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "ingestion", "prisma", "dev.db")
STATS_CSV = os.path.join(BASE_DIR, "output_csv", "panier_school_stats.csv")
OUTPUT_MAPPING = os.path.join(BASE_DIR, "output_csv", "mapping.csv")

def get_db_schools():
    """Load existing schools from SQLite database."""
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return pd.DataFrame()
    
    conn = sqlite3.connect(DB_PATH)
    query = "SELECT uai, name, city, departmentCode FROM SchoolLocation JOIN School ON School.uai = SchoolLocation.schoolUai"
    # Actually SchoolLocation has the address info, School has the name.
    # Let's join them.
    # Adjusting query based on typical schema:
    # School table: uai, name
    # SchoolLocation: schoolUai, city, departmentCode
    
    query = """
    SELECT s.uai, s.name as db_name, l.city as db_city, l.departmentCode as db_dept
    FROM School s
    JOIN SchoolLocation l ON s.uai = l.schoolUai
    """
    
    try:
        df = pd.read_sql_query(query, conn)
    except Exception as e:
        print(f"Error reading DB: {e}")
        df = pd.DataFrame()
    finally:
        conn.close()
        
    return df

def find_best_match(row, choices, cutoff=80):
    """
    Find best match for a scraped school.
    """
    # Validating inputs
    scraped_name = row['school_name']
    if pd.isna(scraped_name):
        return None, None, 0
    scraped_name = str(scraped_name)
    
    # 1. Try to match name
    # Normalize: remove dashes for better match (Henri-IV -> Henri IV)
    scraped_name_norm = scraped_name.replace('-', ' ')
    
    # Ensure choices are strings
    choices_str = choices['db_name'].fillna("").astype(str)
    
    best_match = process.extractOne(scraped_name_norm, choices_str, scorer=fuzz.WRatio)
    
    if best_match and best_match[1] >= cutoff:
        idx = best_match[2]
        try:
            match_record = choices.loc[idx]
        except KeyError:
             # Fallback if for some reason index is positional (unlikely with Series but safe to handle)
             # But usually with Series it returns the index label.
             match_record = choices.iloc[idx]
             
        return match_record['uai'], match_record['db_name'], best_match[1]
    
    return None, None, 0

def main():
    if not os.path.exists(STATS_CSV):
        print(f"Stats file not found: {STATS_CSV}. Run main.py first.")
        return

    print("Loading data...")
    all_rows_df = pd.read_csv(STATS_CSV)
    
    # Get unique schools
    scraped_df = all_rows_df[['school_name', 'city', 'department', 'parcoursup']].drop_duplicates().reset_index(drop=True)
    
    db_schools = get_db_schools()
    
    if db_schools.empty:
        print("No schools found in DB.")
        return

    print(f"Loaded {len(scraped_df)} unique schools from {len(all_rows_df)} rows and {len(db_schools)} DB schools.")
    
    results = []
    
    print("Starting fuzzy matching...")
    for idx, row in scraped_df.iterrows():
        # 0. Check Parcoursup status
        if 'parcoursup' in row and str(row['parcoursup']).lower() == 'non':
             results.append({
                "scraped_name": row['school_name'],
                "scraped_city": row.get('city', ''),
                "scraped_dept": row.get('department', ''),
                "matched_uai": None,
                "matched_name": "SKIPPED (Parcoursup=non)",
                "match_score": 0
            })
             continue
             
        # Optimization: Filter DB schools by City first
        scraped_city = row.get('city', '')
        scraped_dept = row.get('department', '')
        
        # Normalize department to string (remove .0 if present)
        scraped_dept_str = ""
        if pd.notna(scraped_dept):
            try:
                scraped_dept_str = str(int(float(scraped_dept))).zfill(2) if str(scraped_dept).replace('.', '').isdigit() else str(scraped_dept)
            except:
                scraped_dept_str = str(scraped_dept)

        candidates = db_schools
        
        if pd.notna(scraped_city) and str(scraped_city).strip():
             city_clean = str(scraped_city).strip().lower()
             # Use partial match for city
             candidates = db_schools[db_schools['db_city'].fillna("").str.lower().str.contains(city_clean, regex=False)]
             
             if candidates.empty:
                  if scraped_dept_str:
                      candidates = db_schools[db_schools['db_dept'].fillna("").astype(str).str.zfill(2) == scraped_dept_str]
                  else:
                      candidates = db_schools
        elif scraped_dept_str:
             candidates = db_schools[db_schools['db_dept'].fillna("").astype(str).str.zfill(2) == scraped_dept_str]
        
        uai, db_name, score = find_best_match(row, candidates)
        
        results.append({
            "scraped_name": row['school_name'],
            "scraped_city": row.get('city', ''),
            "scraped_dept": row.get('department', ''),
            "matched_uai": uai,
            "matched_name": db_name,
            "match_score": score
        })
        
        if idx % 50 == 0:
            print(f"Processed {idx} schools...")

    mapping_df = pd.DataFrame(results)
    mapping_df.to_csv(OUTPUT_MAPPING, index=False)
    print(f"Mapping saved to {OUTPUT_MAPPING}")
    
    # Summary
    matched_count = mapping_df[mapping_df['matched_uai'].notna()].shape[0]
    print(f"Matched {matched_count}/{len(mapping_df)} unique schools.")

if __name__ == "__main__":
    main()
