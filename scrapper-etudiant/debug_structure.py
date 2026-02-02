import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

async def debug_structure():
    url = "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, timeout=60000)
        
        # Wait for content
        await page.wait_for_selector("#qiota_content h3", timeout=10000)
        await page.wait_for_timeout(3000)
        
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        container = soup.find(id="qiota_content")
        
        # Get first h3 and trace the path to find associated Parcoursup li
        h3_tags = container.find_all('h3')[:3]  # First 3 schools
        
        for h3 in h3_tags:
            school_name = h3.get_text(strip=True)[:40]
            print(f"\n{'='*60}")
            print(f"School: {school_name}")
            
            # Trace parent hierarchy
            parent = h3.parent
            depth = 0
            while parent and depth < 10:
                print(f"  Parent {depth}: <{parent.name}> class={parent.get('class', [])}")
                depth += 1
                parent = parent.parent
            
            # Find the tr containing h3, then look for sibling tr or following elements
            tr = h3.find_parent('tr')
            if tr:
                # Look at the next tr or table structure
                next_sibling = tr.find_next_sibling()
                if next_sibling:
                    sibling_text = next_sibling.get_text(" ", strip=True)[:200]
                    print(f"\n  Next sibling of TR ({next_sibling.name}): {sibling_text}")
                    
                    # Is Parcoursup in this next sibling?
                    if "Parcoursup" in sibling_text:
                        print("  --> FOUND Parcoursup in next sibling!")
                
                # Also check if there's a nested table/div structure
                # Look at ALL descendants of the container between this h3 and next h3
                
        # Let's try a different approach: find all ul with the Parcoursup class
        parcoursup_uls = container.find_all('ul', class_='tw-list-disc')
        print(f"\n\n{'='*60}")
        print(f"Found {len(parcoursup_uls)} UL elements with 'tw-list-disc' class")
        
        if parcoursup_uls:
            ul = parcoursup_uls[0]  # First one
            print(f"\nFirst UL parent hierarchy:")
            parent = ul.parent
            depth = 0
            while parent and depth < 10:
                class_str = ' '.join(parent.get('class', [])) if parent.get('class') else ''
                id_str = parent.get('id', '')
                print(f"  Parent {depth}: <{parent.name}> id='{id_str}' class='{class_str[:50]}'")
                depth += 1
                parent = parent.parent
            
            # Find the closest h3 before this ul
            prev_sibs = []
            sibling = ul.find_previous_sibling()
            while sibling and len(prev_sibs) < 5:
                prev_sibs.append(sibling)
                sibling = sibling.find_previous_sibling()
            
            print(f"\n  Previous siblings of first UL:")
            for sib in prev_sibs:
                sib_text = sib.get_text(strip=True)[:50] if sib.name else ''
                print(f"    {sib.name}: {sib_text}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_structure())
