import requests
import json

def test_api():
    url = "http://127.0.0.1:8000/formations"
    print(f"Querying {url}...")
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Result count: {len(data)}")
            if len(data) > 0:
                print("First result sample:", json.dumps(data[0], indent=2)[:200])
        else:
            print("Error response:", response.text)
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    test_api()
