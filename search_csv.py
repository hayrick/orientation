import csv
import sys

files = [
    'scrapper-etudiant/output_csv/paniers.csv',
    'scrapper-etudiant/output_csv/panier_school_stats.csv'
]

terms = ["A/L", "LSH", "Lettres"]

for file_path in files:
    print(f"--- Searching in {file_path} ---")
    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            for row in reader:
                line = ",".join(row)
                if any(term in line for term in terms):
                    print(line)
                    sys.stdout.flush()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
