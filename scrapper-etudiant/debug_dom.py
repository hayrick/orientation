import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

async def find_parcoursup_structure():
    url = "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, timeout=60000)
        
        # Wait for content and click to expand
        await page.wait_for_selector("#qiota_content h3", timeout=10000)
        await page.wait_for_timeout(2000)
        
        # Click first button to expand
        buttons = await page.query_selector_all("#qiota_content button")
        if buttons:
            await buttons[0].click()
            await page.wait_for_timeout(2000)
        
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find the specific "Parcoursup : Oui" pattern
        # Search in the text content
        container = soup.find(id="qiota_content")
        
        if container:
            # Find all li elements (bullet points) that contain Parcoursup
            li_elements = container.find_all('li')
            print(f"Found {len(li_elements)} li elements in #qiota_content")
            
            for i, li in enumerate(li_elements[:50]):
                text = li.get_text(strip=True)
                if "Parcoursup" in text:
                    print(f"\nLI #{i}: {text[:100]}")
                    print(f"  Parent: {li.parent.name if li.parent else 'None'}")
                    print(f"  Parent class: {li.parent.get('class', 'none') if li.parent else 'None'}")
            
            # Now let's look at the structure around h3 tags (school names)
            h3_tags = container.find_all('h3')[:3]  # First 3 schools
            print(f"\n\n=== Analyzing first 3 h3 school tags ===")
            
            for h3 in h3_tags:
                school_name = h3.get_text(strip=True)[:50]
                print(f"\nSchool: {school_name}")
                
                # Try different parent traversal to find Parcoursup
                # Check if h3 is in a td (table cell)
                td = h3.find_parent('td')
                if td:
                    td_text = td.get_text(" ", strip=True)[:300]
                    print(f"  TD text: {td_text}")
                    if "Parcoursup" in td_text:
                        print("  --> FOUND Parcoursup in TD!")
                
                # Check sibling td cells in the same row
                tr = h3.find_parent('tr')
                if tr:
                    all_tds = tr.find_all('td')
                    for j, sibling_td in enumerate(all_tds):
                        sibling_text = sibling_td.get_text(" ", strip=True)[:200]
                        if "Parcoursup" in sibling_text:
                            print(f"  --> FOUND Parcoursup in TD #{j}!")
                            print(f"      Text: {sibling_text}")
                
                # Check following siblings (maybe in a collapsed div?)
                next_siblings = h3.find_next_siblings()[:5]
                for sib in next_siblings:
                    sib_text = sib.get_text(" ", strip=True)[:200]
                    if "Parcoursup" in sib_text:
                        print(f"  --> FOUND in sibling {sib.name}: {sib_text[:100]}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(find_parcoursup_structure())
