from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import os

# Point to correct DB
DB_PATH = os.path.join(os.getcwd(), "ingestion", "prisma", "dev.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

print(f"Connecting to: {DATABASE_URL}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    print("Fetching distinct 'filiereFormationDetailleeBis' for category LIKE '%CPGE%'...")
    # Note: Category might be exactly "CPGE" or contain it. Let's check.
    
    # First check exact category names
    categories = db.execute(text("SELECT DISTINCT category FROM Formation WHERE category LIKE '%CPGE%'")).fetchall()
    print("Found categories matching CPGE:", categories)
    
    # Now fetch filieres
    query = text("""
        SELECT DISTINCT filiereFormationDetailleeBis 
        FROM Formation 
        WHERE category LIKE '%CPGE%' 
        AND filiereFormationDetailleeBis IS NOT NULL 
        ORDER BY filiereFormationDetailleeBis
    """)
    results = db.execute(query).fetchall()
    
    values = [r[0] for r in results]
    print(f"\nFound {len(values)} distinct valus:")
    for v in values:
        print(f"- {v}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
