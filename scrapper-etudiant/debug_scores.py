from thefuzz import fuzz, process

scraped_name = "Henri-IV"
scraped_name_norm = scraped_name.replace('-', ' ')

db_names = ["Lycée Henri IV", "Lycée HENRI IV", "Lycée Henri-IV"]

print(f"Scraped: {scraped_name} -> {scraped_name_norm}")

for db_name in db_names:
    score1 = fuzz.token_sort_ratio(scraped_name_norm, db_name)
    score2 = fuzz.WRatio(scraped_name_norm, db_name)
    score3 = fuzz.token_set_ratio(scraped_name_norm, db_name)
    print(f"\nDB Name: {db_name}")
    print(f"  token_sort_ratio: {score1}")
    print(f"  WRatio:           {score2}")
    print(f"  token_set_ratio:  {score3}")
