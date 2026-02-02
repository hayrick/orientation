import asyncio
from playwright.async_api import async_playwright
from extractors import extract_paniers
import os
import datetime

URL = "https://www.letudiant.fr/classements/classement-des-prepas-mpi-maths-physique-et-informatique/vous-visez-polytechnique-ens.html"

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}")

async def debug():
    log("Starting Playwright...")
    async with async_playwright() as p:
        log("Launching browser...")
        browser = await p.chromium.launch(headless=True)
        log("Creating new page...")
        page = await browser.new_page()
        log(f"Fetching {URL}...")
        try:
            await page.goto(URL, timeout=60000, wait_until="domcontentloaded")
            log("Page loaded (domcontentloaded).")
            log("Waiting 3 seconds...")
            await page.wait_for_timeout(3000)
            log("Getting page content...")
            content = await page.content()
            log(f"Content retrieved, length: {len(content)}")
            
            # Dump soup text to file
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            text = soup.get_text(separator="\n")
            with open("mpi_text_dump.txt", "w", encoding="utf-8") as f:
                f.write(text)
            log("Text dump saved to mpi_text_dump.txt")
            
            # Test extraction
            log("Starting panier extraction...")
            paniers, master_formations = extract_paniers(content, "MPI")
            log("Extraction finished.")
            
            print("\n--- PANIERS EXTRACTED ---")
            for p in paniers:
                print(f"Name: {p['panier_name']}")
                print(f"URL: {p['panier_url']}")
                print(f"Schools: {p['schools']}")
                print("-" * 20)
                
            print(f"\nTotal master formations: {len(master_formations)}")
        except Exception as e:
            log(f"An error occurred: {e}")
        finally:
            log("Closing browser...")
            await browser.close()
            log("Browser closed.")

if __name__ == "__main__":
    asyncio.run(debug())
