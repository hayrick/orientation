import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

async def debug_table_structure():
    url = "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, timeout=60000)
        
        # Wait for content
        await page.wait_for_selector("#qiota_content h3", timeout=10000)
        await page.wait_for_timeout(5000)  # Longer wait for dynamic content
        
        content = await page.content()
        
        # Parse HTML
        soup = BeautifulSoup(content, 'html.parser')
        container = soup.find(id="qiota_content")
        
        # Find first school header
        first_header = container.find("h3")
        school_name = first_header.find("a").get_text(strip=True)
        
        print(f"\nFirst school: {school_name}")
        print("="*80)
        
        # h3 is in a td, let's find the tr (table row)
        td = first_header.parent
        tr = td.parent if td.parent.name == 'tr' else td.find_parent('tr')
        
        if tr:
            print(f"Found table row")
            # Get all text from the entire row
            row_text = tr.get_text(" ", strip=True)
            print(f"\nFull row text (first 2000 chars):\n{row_text[:2000]}")
            
            print("\n" + "="*80)
            
            # Check for Parcoursup in row
            if re.search(r"Parcoursup\s*:\s*Oui", row_text, re.IGNORECASE):
                print("FOUND: Parcoursup : Oui in row")
            elif re.search(r"Parcoursup\s*:\s*Non", row_text, re.IGNORECASE):
                print("FOUND: Parcoursup : Non in row")
            else:
                print("NOT FOUND in row")
        else:
            print("Could not find table row")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_table_structure())
