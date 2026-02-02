"""Test the API logic directly to verify admission rate attachment"""
import sys
sys.path.append("backend")

from backend.database import SessionLocal
from backend import models
from sqlalchemy.orm import joinedload

db = SessionLocal()

cpge_type = "MP"
print(f"\n=== Testing API logic for cpge_type: {cpge_type} ===\n")

# Replicate the exact API logic from get_paniers_by_type
paniers = db.query(models.Panier)\
    .options(
        joinedload(models.Panier.master_formations),
        joinedload(models.Panier.school_stats).joinedload(models.PanierSchoolStats.school).joinedload(models.School.locations)
    )\
    .filter(models.Panier.cpgeType == cpge_type)\
    .all()

print(f"Found {len(paniers)} paniers")

# Get all unique school UAIs to fetch admission rates in one batch
uai_list = list(set(s.schoolUai for p in paniers for s in p.school_stats))
print(f"Found {len(uai_list)} unique UAIs")

if uai_list:
    # Fetch admission rates for all schools in one go
    formations = db.query(models.Formation)\
        .filter(models.Formation.schoolUai.in_(uai_list))\
        .filter(models.Formation.category.ilike("%CPGE%"))\
        .filter(
            (models.Formation.filiereFormationDetailleeBis.ilike(f"%{cpge_type}%")) |
            (models.Formation.filiereFormationDetaillee.ilike(f"%{cpge_type}%"))
        )\
        .all()
    
    print(f"Found {len(formations)} matching formations")
    
    # Map uai -> admissionRate (pick the first match per school)
    rates_map = {}
    for f in formations:
        if f.schoolUai not in rates_map and f.admissionRate is not None:
            rates_map[f.schoolUai] = f.admissionRate
    
    print(f"Built rates_map with {len(rates_map)} entries")
    print(f"Sample entries: {list(rates_map.items())[:5]}")
    
    # Attach the rates to the stat objects
    attached_count = 0
    for p in paniers:
        for s in p.school_stats:
            rate = rates_map.get(s.schoolUai)
            if rate is not None:
                setattr(s, 'admissionRate', rate)
                attached_count += 1
    
    print(f"Attached rates to {attached_count} school_stats objects")
    
    # Now check the results
    print(f"\n=== Verifying attached rates ===")
    for p in paniers[:1]:  # First panier only
        print(f"Panier: {p.name}")
        for s in p.school_stats[:5]:
            print(f"  {s.schoolUai}: admissionRate = {getattr(s, 'admissionRate', 'NOT SET')}")

db.close()
