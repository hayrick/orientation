import requests
import json

try:
    response = requests.get("http://localhost:8000/formations/paniers/by-type/MP")
    data = response.json()
    
    if len(data) > 0 and 'school_stats' in data[0]:
        first_stat = data[0]['school_stats'][0]
        print(f"School Name: {first_stat.get('school', {}).get('name')}")
        print(f"Locations: {json.dumps(first_stat.get('school', {}).get('locations'), indent=2)}")
    else:
        print("Data structure not as expected or empty.")
except Exception as e:
    print(f"Error: {e}")
