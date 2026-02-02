import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

async def explore_paniers():
    """Explore the website structure to understand paniers and masterFormations."""
    
    base_url = "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # First, visit the main classification page to see all panier options
        main_url = "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique.html"
        print(f"\n=== Visiting main page: {main_url} ===")
        await page.goto(main_url, timeout=60000)
        await page.wait_for_timeout(3000)
        
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find links to different paniers
        print("\n=== Looking for panier links ===")
        links = soup.find_all('a', href=True)
        panier_links = []
        for link in links:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            if 'vous-visez' in href or 'visez' in text.lower():
                print(f"  Found: {text[:60]} -> {href[:80]}")
                panier_links.append((text, href))
        
        # Now visit a specific panier page and look at #main-article
        panier_url = "https://www.letudiant.fr/classements/classement-des-prepas-scientifiques-mp-maths-physique/vous-visez-polytechnique-ens.html"
        print(f"\n=== Visiting panier page: {panier_url} ===")
        await page.goto(panier_url, timeout=60000)
        await page.wait_for_timeout(3000)
        
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find #main-article
        main_article = soup.find(id="main-article")
        if main_article:
            print("\n=== Content of #main-article (first 3000 chars) ===")
            text = main_article.get_text(separator="\n", strip=True)
            print(text[:3000])
            
            # Look for h1, h2, h3 tags that might define paniers
            print("\n=== Headers in #main-article ===")
            for tag in ['h1', 'h2', 'h3', 'h4']:
                headers = main_article.find_all(tag)
                for h in headers:
                    print(f"  {tag}: {h.get_text(strip=True)[:80]}")
        
        # Look for the page title that indicates panier name
        title = soup.find('title')
        if title:
            print(f"\n=== Page title ===\n{title.get_text(strip=True)}")
        
        # Look for breadcrumbs or navigation that shows panier structure
        print("\n=== Looking for breadcrumbs/navigation ===")
        nav_elements = soup.find_all(['nav', 'ol', 'ul'], class_=re.compile(r'breadcrumb|nav', re.I))
        for nav in nav_elements[:3]:
            text = nav.get_text(" > ", strip=True)[:200]
            if text:
                print(f"  {text}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(explore_paniers())
