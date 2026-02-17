import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

async def final_debug():
    url = "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Visible to debug
        page = await browser.new_page()
        await page.goto(url, timeout=60000)
        
        # Wait for content
        await page.wait_for_selector("#qiota_content h3", timeout=10000)
        await page.wait_for_timeout(2000)
        
        # Check buttons BEFORE clicking
        content_before = await page.content()
        has_parcoursup_before = "Parcoursup : Oui" in content_before or "Parcoursup : Non" in content_before
        print(f"Before clicking: Parcoursup in HTML? {has_parcoursup_before}")
        
        # Find buttons  
        buttons = await page.query_selector_all("#qiota_content button")
        print(f"\\nFound {len(buttons)} buttons in #qiota_content")
        
        # Click first button and check
        if len(buttons) > 0:
            print(f"\\nClicking first button...")
            button_text = await buttons[0].text_content()
            print(f"Button text: '{button_text}'")
            await buttons[0].click()
            await page.wait_for_timeout(1000)
            
            content_after = await page.content()
            has_parcoursup_after = "Parcoursup : Oui" in content_after or "Parcoursup : Non" in content_after
            print(f"After clicking: Parcoursup in HTML? {has_parcoursup_after}")
            
            # Show what changed
            if has_parcoursup_after and not has_parcoursup_before:
                print("SUCCESS! Clicking revealed Parcoursup data")
            elif has_parcoursup_before:
                print("Parcoursup was already in HTML before clicking!")
            else:
                print("Clicking didnot reveal Parcoursup data - might need different approach")
        
        print("\\nKeeping browser open for 20 seconds for inspection...")
        await page.wait_for_timeout(20000)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(final_debug())
