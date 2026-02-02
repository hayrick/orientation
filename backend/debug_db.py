from backend.database import SessionLocal, engine
from backend import models
from sqlalchemy import text, inspect
from sqlalchemy.orm import joinedload

def debug():
    db = SessionLocal()
    try:
        print("--- Database Inspection ---")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"Tables found: {tables}")

        print("\n--- Row Counts ---")
        for table in tables:
            try:
                count = db.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
                print(f"{table}: {count} rows")
            except Exception as e:
                print(f"Error counting {table}: {e}")

        print("\n--- ORM Check ---")
        try:
            formations = db.query(models.Formation).options(
                joinedload(models.Formation.school),
                joinedload(models.Formation.location)
            ).limit(5).all()
            
            print(f"Formations found via ORM: {len(formations)}")
            if formations:
                f = formations[0]
                print(f"Sample: {f.name} (ID: {f.id})")
                print(f"  - School: {f.school.name if f.school else 'None'} (UAI: {f.schoolUai})")
                print(f"  - Location: {f.location.city if f.location else 'None'} (ID: {f.locationId})")
                print(f"  - Mentions: {f.mentionDistribution}")
        except Exception as e:
            print(f"ORM Error: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    debug()
