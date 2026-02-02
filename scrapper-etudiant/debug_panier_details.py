import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re
import pandas as pd
import os

async def debug_extract():
    url = "https://www.letudiant.fr/classements/classement-des-prepas-bcpst-biologie-chimie-physique-et-sciences-de-la-terre/vous-visez-4-veto.html"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print(f"Navigating to {url}...")
        await page.goto(url)
        await page.wait_for_timeout(2000)
        
        # Expand some rows to see the content
        buttons = await page.query_selector_all("#qiota_content button")
        for i in range(min(3, len(buttons))):
            try:
                await buttons[i].click()
            except:
                pass
        
        await page.wait_for_timeout(1000)
        content = await page.content()
        await browser.close()
        
        soup = BeautifulSoup(content, 'html.parser')
        container = soup.find(id="qiota_content")
        school_headers = container.find_all("h3")
        
        results = []
        for header in school_headers[:3]:  # Just first 3 schools for debug
            link_elem = header.find("a")
            full_name = link_elem.get_text(strip=True)
            
            # Parse Name, City, Dept
            match = re.match(r"^(.*?)\s*\(([^,()]+),\s*(\d{2,3})\)\s*$", full_name)
            if match:
                name, city, dept = match.group(1), match.group(2), match.group(3)
            else:
                name, city, dept = full_name, "", ""
            
            # Find detail row
            tr = header.find_parent('tr')
            detail_row = tr.find_next_sibling('tr')
            
            taux_int = ""
            moy_bac = ""
            moy_35ans = ""
            rang_35ans = ""
            
            if detail_row:
                li_elements = detail_row.find_all('li')
                for li in li_elements:
                    text = li.get_text(strip=True)
                    if "Taux d'intégration dans le panier visé" in text:
                        m = re.search(r"([\d,]+)%", text)
                        if m: taux_int = m.group(1)
                    elif "Moyenne au bac" in text:
                        m = re.search(r"([\d,]+)/20", text)
                        if m: moy_bac = m.group(1)
                    elif "Moyenne et rang sur" in text:
                        # Handles "sur 3 ans" or "sur 5 ans"
                        m_pct = re.search(r"([\d,]+)%\s*d'intégré", text)
                        m_rang = re.search(r"\((\d+e?/\d+)\)", text)
                        if m_pct: moy_35ans = m_pct.group(1)
                        if m_rang: rang_35ans = m_rang.group(1)

            results.append({
                "School": name,
                "City": city,
                "Dept": dept,
                "Taux Intégration (%)": taux_int,
                "Moyenne Bac": moy_bac,
                "Moyenne 3/5 ans (%)": moy_35ans,
                "Rang 3/5 ans": rang_35ans
            })
            
        for res in results:
            print(res)

if __name__ == "__main__":
    asyncio.run(debug_extract())
