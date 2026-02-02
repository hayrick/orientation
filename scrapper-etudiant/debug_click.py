import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

async def test_click_expand():
    url = "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Run with UI to see what happens
        page = await browser.new_page()
        await page.goto(url, timeout=60000)
        
        # Wait for content
        await page.wait_for_selector("#qiota_content h3", timeout=10000)
        await page.wait_for_timeout(2000)
        
        # Try to find and click on the first school row to expand details
        print("Looking for clickable elements...")
        
        # Check if there are any buttons or expandable elements
        expand_buttons = await page.query_selector_all("button, .expand, [data-expand], [aria-expanded]")
        print(f"Found {len(expand_buttons)} potentially expandable elements")
        
        # Try clicking the first one if exists
        if len(expand_buttons) > 0:
            print("Clicking first expandable element...")
            await expand_buttons[0].click()
            await page.wait_for_timeout(2000)
        
        # Get content after potential expansion
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        # Search entire page for Parcoursup
        if re.search(r"Parcoursup\s*:\s*Oui", content, re.IGNORECASE):
            print("FOUND: Parcoursup : Oui in page")
        else:
            print("NOT FOUND in entire page HTML")
            
        # Keep browser open to inspect
        print("\nBrowser staying open for 10 seconds for manual inspection...")
        await page.wait_for_timeout(10000)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_click_expand())
