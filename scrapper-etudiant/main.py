import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import os
import argparse
import json
from extractors import extract_paniers, extract_stats, extract_detailed_stats

# URLs for different categories
#"BCPST": "https://www.letudiant.fr/classements/classement-des-prepas-bcpst-biologie-chimie-physique-et-sciences-de-la-terre/vous-visez-agroparistech-x-ens.html",
  #  "MP": "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html",
  #  "MPI": "https://www.letudiant.fr/classements/classement-des-prepas-mpi-maths-physique-et-informatique/vous-visez-polytechnique-ens.html",
  #  "ECG": "https://www.letudiant.fr/classements/classement-des-prepas-economiques-et-commerciales-ecg-voie-generale/vous-visez-hec-essec-escp.html",
 #   "ECG - Mathématiques appliquées + ESH": "https://www.letudiant.fr/classements/classement-des-prepas-economiques-et-commerciales-ecg-maths-appliquees-esh/vous-visez-hec-essec-escp.html",
#    "ECG - Mathématiques appliquées + HGG": "https://www.letudiant.fr/classements/classement-des-prepas-economiques-et-commerciales-ecg-maths-appliquees-hgg/vous-visez-hec-essec-escp.html",
   
URLS = {
    "BCPST": "https://www.letudiant.fr/classements/classement-des-prepas-bcpst-biologie-chimie-physique-et-sciences-de-la-terre/vous-visez-agroparistech-x-ens.html",
    "MP": "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html",
    "MPI": "https://www.letudiant.fr/classements/classement-des-prepas-mpi-maths-physique-et-informatique/vous-visez-polytechnique-ens.html",
    "ECG - Mathématiques approfondies + ESH": "https://www.letudiant.fr/classements/classement-des-prepas-economiques-et-commerciales-ecg-maths-approfondies-esh/vous-visez-hec-essec-escp.html",
    "ECG - Mathématiques approfondies + HGG": "https://www.letudiant.fr/classements/classement-des-prepas-economiques-et-commerciales-ecg-maths-approfondies-hgg/vous-visez-hec-essec-escp.html",
    "B/L - Lettres et sciences sociales": "https://www.letudiant.fr/classements/classement-des-prepas-b-l-lettres-et-sciences-sociales/vous-visez-ens-ensae-hec-essec-escp.html",
    "A/L - Lettres classiques": "https://www.letudiant.fr/classements/classement-des-prepas-litteraires-a-l-lettres-classiques/vous-visez-ens-chartes-hec-essec-escp.html",
    "LSH - Lettres modernes": "https://www.letudiant.fr/classements/classement-des-prepas-lsh-lettres-et-sciences-humaines/vous-visez-ens-chartes-hec-essec-esc.html",
    "PC": "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-pc-physique-chimie/vous-visez-polytechnique-ens.html",
    "PSI": "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-psi-physique-et-sciences-de-lingenieur/vous-visez-polytechnique-ens.html"
    }


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output_csv")
SCRAPED_URLS_FILE = os.path.join(OUTPUT_DIR, "scraped_urls.json")

def load_scraped_urls():
    if os.path.exists(SCRAPED_URLS_FILE):
        try:
            with open(SCRAPED_URLS_FILE, 'r') as f:
                return set(json.load(f))
        except:
            return set()
    return set()

def save_scraped_urls(scraped_urls):
    with open(SCRAPED_URLS_FILE, 'w') as f:
        json.dump(list(scraped_urls), f, indent=4)

async def scrape_category(browser, category, url, force_scrap=False, scraped_urls=None):
    if scraped_urls is None: scraped_urls = set()
    
    track_url = f"cat:{url}"
    if track_url in scraped_urls and not force_scrap:
        print(f"[SKIP] Category {category} already scraped: {url}")
        return [], [], []

    print(f"\n[CONFIG] Scraping {category} from {url}...")
    page = await browser.new_page()
    await page.goto(url, timeout=60000) # 60s timeout
    
    # Handle cookie consent if visible (common on French sites)
    try:
        await page.wait_for_timeout(3000)
    except Exception as e:
        print(f"[WARN] Cookie banner handling error: {e}")

    # Get HTML for paniers - first pass to find all panier links
    content = await page.content()
    paniers, _ = extract_paniers(content, category)
    print(f"[INFO] Found {len(paniers)} paniers for {category}.")
    
    # Find and navigate to "Panier large" page to get full master formation definitions
    master_formations = []
    panier_large_url = None
    for p in paniers:
        if 'panier large' in p['panier_name'].lower():
            panier_large_url = p['panier_url']
            break
    
    if panier_large_url:
        print(f"[INFO] Navigating to Panier large page: {panier_large_url}")
        await page.goto(panier_large_url, timeout=60000)
        await page.wait_for_timeout(3000)
        panier_large_content = await page.content()
        
        # Re-extract paniers from Panier large page (has the full definitions in text)
        paniers, master_formations = extract_paniers(panier_large_content, category)
        print(f"[INFO] Found {len(master_formations)} master formations in definitions.")

    # Get stats with pagination (go back to original URL)
    await page.goto(url, timeout=60000)
    await page.wait_for_timeout(2000)
    
    stats = []
    page_num = 1
    
    while page_num <= 5: # Limit to 5 pages
        page_url = f"{url}?page={page_num}" if page_num > 1 else url
        print(f"[PAGE] Scraping {category} main page {page_num}: {page_url}")
        
        if page_num > 1:
            await page.goto(page_url, timeout=60000)
            await page.wait_for_timeout(2000)
        
        try:
            await page.wait_for_selector("#qiota_content h3", timeout=10000)
        except Exception:
            print(f"[DONE] No more school headers found on {category} page {page_num}.")
            break
        
        school_headers = await page.query_selector_all("#qiota_content h3")
        if not school_headers:
            break
        
        # Click all expand buttons
        expandable_elements = await page.query_selector_all("#qiota_content button")
        for btn in expandable_elements:
            try:
                await btn.click()
                await page.wait_for_timeout(50)
            except:
                pass
        
        await page.wait_for_timeout(1000)
        content = await page.content()
        page_stats = extract_stats(content, "Panier 1")
        stats.extend(page_stats)
        print(f"[DATA] Extracted {len(page_stats)} rows from page {page_num}")
        
        page_num += 1

    scraped_urls.add(f"cat:{url}")
    await page.close()
    return paniers, stats, master_formations

async def scrape_panier_details(browser, category, panier_name, url, force_scrap=False, scraped_urls=None):
    if scraped_urls is None: scraped_urls = set()
    
    track_url = f"pan:{url}"
    if track_url in scraped_urls and not force_scrap:
        print(f"[SKIP] Panier '{panier_name}' already scraped: {url}")
        return []

    print(f"\n[PANIER] Starting: '{panier_name}' ({category}) URL: {url}")
    page = await browser.new_page()
    try:
        await page.goto(url, timeout=60000)
        await page.wait_for_timeout(3000)
    except Exception as e:
        print(f"[ERROR] Failed to load panier {panier_name}: {e}")
        await page.close()
        return []
    
    detailed_stats = []
    page_num = 1
    
    while page_num <= 5: # Limit to 5 pages
        page_url = f"{url}?page={page_num}" if page_num > 1 else url
        print(f"[PAGE] Panier '{panier_name}' page {page_num}: {page_url}")
        
        if page_num > 1:
            try:
                await page.goto(page_url, timeout=60000)
                await page.wait_for_timeout(2000)
            except Exception as e:
                print(f"[ERROR] Failed to load page {page_num}: {e}")
                break
        
        try:
            await page.wait_for_selector("#qiota_content h3", timeout=10000)
        except Exception:
            print(f"[DONE] Finished panier '{panier_name}' at page {page_num-1}.")
            break
            
        # Expand buttons
        expand_btns = await page.query_selector_all("#qiota_content button")
        for btn in expand_btns:
            try: await btn.click(); await page.wait_for_timeout(50)
            except: pass
        
        await page.wait_for_timeout(1000)
        content = await page.content()
        page_detailed_stats = extract_detailed_stats(content, panier_name, category)
        detailed_stats.extend(page_detailed_stats)
        print(f"[DATA] Extracted {len(page_detailed_stats)} detailed rows from page {page_num}")
        
        page_num += 1

    scraped_urls.add(f"pan:{url}")
    await page.close()
    return detailed_stats

async def main():
    parser = argparse.ArgumentParser(description="Scraper for L'Etudiant prepa rankings")
    parser.add_argument("--paniers-only", action="store_true", help="Only run the second part based on paniers.csv")
    parser.add_argument("--force-scrap", action="store_true", help="Scrap even if already in scraped_urls.json")
    args = parser.parse_args()

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    scraped_urls = load_scraped_urls()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        all_stats = []
        all_paniers = []
        all_detailed_stats = []
        all_master_formations_global = set()

        if args.paniers_only:
            print("[MODE] Running in PANIERS-ONLY mode.")
            paniers_file = os.path.join(OUTPUT_DIR, "paniers.csv")
            if not os.path.exists(paniers_file):
                print(f"[ERROR] {paniers_file} not found. Run without --paniers-only first.")
                await browser.close()
                return
            
            df_p = pd.read_csv(paniers_file)
            for _, row in df_p.iterrows():
                p_detailed = await scrape_panier_details(
                    browser, row['cpge_type'], row['panier_name'], row['panier_url'], 
                    force_scrap=args.force_scrap, scraped_urls=scraped_urls
                )
                all_detailed_stats.extend(p_detailed)
        else:
            print("[MODE] Running full scrap.")
            for category, url in URLS.items():
                try:
                    paniers, stats, master_formations = await scrape_category(
                        browser, category, url, force_scrap=args.force_scrap, scraped_urls=scraped_urls
                    )
                    all_paniers.extend(paniers)
                    all_stats.extend(stats)
                    
                    if master_formations:
                        all_master_formations_global.update(master_formations)
                    
                    for p in paniers:
                        p_detailed = await scrape_panier_details(
                            browser, category, p['panier_name'], p['panier_url'],
                            force_scrap=args.force_scrap, scraped_urls=scraped_urls
                        )
                        all_detailed_stats.extend(p_detailed)
                        
                except Exception as e:
                    print(f"[ERROR] Failed to scrape {category}: {e}")

        await browser.close()
        save_scraped_urls(scraped_urls)

        # Save outputs
        if not args.paniers_only:
            if all_stats:
                df_stats = pd.DataFrame(all_stats)
                df_stats = df_stats.drop_duplicates()
                df_stats.to_csv(f"{OUTPUT_DIR}/school_stats.csv", index=False)
                print(f"[SAVE] Saved {len(df_stats)} rows to {OUTPUT_DIR}/school_stats.csv")
            
            if all_paniers:
                paniers_for_csv = []
                for p in all_paniers:
                    paniers_for_csv.append({
                        'cpge_type': p['cpge_type'],
                        'panier_name': p['panier_name'],
                        'panier_url': p['panier_url'],
                        'schools': '; '.join(p['schools'])
                    })
                df_paniers = pd.DataFrame(paniers_for_csv)
                df_paniers = df_paniers.drop_duplicates(subset=['cpge_type', 'panier_name'])
                df_paniers.to_csv(f"{OUTPUT_DIR}/paniers.csv", index=False)
                print(f"[SAVE] Saved {len(df_paniers)} rows to {OUTPUT_DIR}/paniers.csv")
            
            if all_master_formations_global:
                df_master_formations = pd.DataFrame({'master_formation_name': sorted(all_master_formations_global)})
                df_master_formations.to_csv(f"{OUTPUT_DIR}/master_formations.csv", index=False)
                print(f"[SAVE] Saved {len(df_master_formations)} rows to {OUTPUT_DIR}/master_formations.csv")

        if all_detailed_stats:
            df_detailed = pd.DataFrame(all_detailed_stats)
            df_detailed = df_detailed.drop_duplicates()
            # If paniers-only, we might want to append or overwrite. Overwriting for now as per "update the data"
            df_detailed.to_csv(f"{OUTPUT_DIR}/panier_school_stats.csv", index=False)
            print(f"[SAVE] Saved {len(df_detailed)} rows to {OUTPUT_DIR}/panier_school_stats.csv")

if __name__ == "__main__":
    asyncio.run(main())
