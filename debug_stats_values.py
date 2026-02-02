import requests
import json

CPGE_TYPE = "MP" 
# Use the correct URL format as per search.py (@router.get("/paniers/by-type"))
# It uses a query parameter: cpge_type
url = f"http://localhost:8000/formations/paniers/by-type?cpge_type={CPGE_TYPE}"

try:
    print(f"Fetching: {url}")
    response = requests.get(url)
    data = response.json()
    
    if isinstance(data, list) and len(data) > 0:
        panier = data[0]
        print(f"Panier: {panier['name']}")
        if 'school_stats' in panier and len(panier['school_stats']) > 0:
            stat = panier['school_stats'][0]
            print(f"Sample School: {stat.get('school', {}).get('name')}")
            print(f"tauxIntegrationPct: {stat.get('tauxIntegrationPct')}")
            print(f"moyenneMultiAnsPct: {stat.get('moyenneMultiAnsPct')}")
            print(f"admissionRate: {stat.get('admissionRate')}")
        else:
            print("No school_stats found in the first panier.")
    else:
        print(f"Unexpected data format: {data}")
except Exception as e:
    print(f"Fatal Error: {e}")
    # Try with raw session if server is not running
    print("\nAttempting direct DB check for model consistency...")
    import sys
    import os
    sys.path.append(os.getcwd())
    from backend import models, database
    db = database.SessionLocal()
    panier = db.query(models.Panier).first()
    if panier:
        stat = db.query(models.PanierSchoolStats).filter(models.PanierSchoolStats.panierId == panier.id).first()
        if stat:
            print(f"DB Stat - tauxIntegrationPct: {stat.tauxIntegrationPct}")
            print(f"DB Stat - moyenneMultiAnsPct: {stat.moyenneMultiAnsPct}")
    db.close()
