from bs4 import BeautifulSoup
import re
import pandas as pd
from typing import List, Dict, Tuple

def parse_schools_list(schools_str: str) -> List[str]:
    """
    Parse a schools string that may contain nested parentheses.
    Split by comma/semicolon but respect parentheses groupings.
    
    Example: "ENS, 4 ENV (ENV Alfort, VetAgroSup Lyon), Polytechnique"
    Returns: ["ENS", "4 ENV (ENV Alfort, VetAgroSup Lyon)", "Polytechnique"]
    """
    schools = []
    current = ""
    paren_depth = 0
    
    for char in schools_str:
        if char == '(':
            paren_depth += 1
            current += char
        elif char == ')':
            paren_depth -= 1
            current += char
        elif char in ',;' and paren_depth == 0:
            # Delimiter outside parentheses - finish current school
            if current.strip():
                schools.append(current.strip())
            current = ""
        else:
            current += char
    
    # Don't forget the last item
    if current.strip():
        schools.append(current.strip())
    
    return schools


def extract_panier_definitions(page_content: str) -> Dict[str, str]:
    """
    Extracts panier definitions from page text.
    Looks for patterns like:
    - "AgroParisTech" (simple panier)
    - "4 écoles vétérinaires : ENV Alfort, VetAgroSup Lyon, ..."
    - "Panier large : AgroParisTech, ENS, ..."
    
    Returns a dict mapping panier_name -> schools_string
    """
    soup = BeautifulSoup(page_content, 'html.parser')
    
    # Get all text from the page
    text = soup.get_text(separator="\n")
    
    definitions = {}
    
    # Pattern 1: "Panier large : school1, school2, ..." - ends with period
    panier_large_match = re.search(
        r'Panier large\s*:\s*([^.]+\.)',
        text,
        re.IGNORECASE | re.DOTALL
    )
    if panier_large_match:
        schools_str = panier_large_match.group(1).strip().rstrip('.')
        definitions['Panier large'] = schools_str
    
    # Pattern 2: "N écoles X : school1, school2, ..." 
    # Stop at newline or period to avoid capturing too much
    ecoles_matches = re.findall(
        r'(\d+\s+écoles?\s+[^:\n]+)\s*:\s*([^\n.]+)',
        text,
        re.IGNORECASE
    )
    for match in ecoles_matches:
        panier_name = match[0].strip()
        schools_str = match[1].strip()
        definitions[panier_name] = schools_str
    
    return definitions


def extract_paniers(page_content: str, cpge_type: str) -> Tuple[List[Dict], List[str]]:
    """
    Parses the HTML content to extract 'Paniers' definitions from #main-article.
    
    Returns:
    - List of panier dicts: {cpge_type, panier_name, panier_url, schools}
    - List of all unique master formations extracted from "Panier large"
    
    Schools are extracted from:
    - Panier names split by " + " (e.g., "AgroParisTech + X + ENS")
    - Text definitions when available (e.g., "4 écoles vétérinaires : ENV Alfort, ...")
    """
    soup = BeautifulSoup(page_content, 'html.parser')
    
    main_article = soup.find(id="main-article")
    if not main_article:
        print("Warning: #main-article not found")
        return [], []

    # Get panier definitions from text
    panier_defs = extract_panier_definitions(page_content)
    
    paniers = []
    master_formations = []
    
    # Find all links in the main article that point to panier pages
    all_links = main_article.find_all('a', href=True)
    
    for link in all_links:
        href = link.get('href', '')
        # Check if this is a panier link (contains 'vous-visez')
        # Exclude pagination links (containing ?page=) and navigation links
        if 'vous-visez' in href and '?page=' not in href:
            panier_name = link.get_text(strip=True)
            if not panier_name:
                continue
            
            # Skip navigation links (page numbers or navigation text)
            if panier_name.isdigit() or panier_name.lower() in ['suivant', 'précédent', 'previous', 'next']:
                continue
            
            # Make URL absolute if needed
            panier_url = href
            if not panier_url.startswith('http'):
                panier_url = 'https://www.letudiant.fr' + panier_url
            
            # Determine schools for this panier
            schools = []
            
            # Check if we have a text definition for this panier
            matching_def = None
            for def_name, def_schools in panier_defs.items():
                # Match by name similarity (case-insensitive, handle variations)
                if panier_name.lower() in def_name.lower() or def_name.lower() in panier_name.lower():
                    matching_def = def_schools
                    break
                # Also check for numeric patterns like "4 Véto" matching "4 écoles vétérinaires"
                panier_num_match = re.match(r'^(\d+)\s+', panier_name)
                def_num_match = re.match(r'^(\d+)\s+', def_name)
                if panier_num_match and def_num_match and panier_num_match.group(1) == def_num_match.group(1):
                    matching_def = def_schools
                    break
            
            if matching_def:
                # Parse schools from definition (comma or semicolon separated)
                schools = [s.strip() for s in re.split(r'[,;]', matching_def) if s.strip()]
            elif ' + ' in panier_name:
                # Split by " + " for combined paniers
                schools = [s.strip() for s in panier_name.split(' + ')]
            else:
                # Single school/panier name
                schools = [panier_name]
            
            paniers.append({
                'cpge_type': cpge_type,
                'panier_name': panier_name,
                'panier_url': panier_url,
                'schools': schools
            })
            
            # If this is "Panier large", extract all schools for the global master formations list
            if 'panier large' in panier_name.lower() and matching_def:
                master_formations = [s.strip() for s in re.split(r'[,;]', matching_def) if s.strip()]
    
    # Remove duplicates (same panier might appear multiple times)
    seen = set()
    unique_paniers = []
    for p in paniers:
        key = (p['cpge_type'], p['panier_name'])
        if key not in seen:
            seen.add(key)
            unique_paniers.append(p)
    
    return unique_paniers, master_formations

def extract_stats(page_content: str, panier_name: str) -> List[Dict]:
    """
    Extracts statistics from school sections in #qiota_content.
    The page uses a card-based layout where each school is in an h3 tag.
    """
    soup = BeautifulSoup(page_content, 'html.parser')
    container = soup.find(id="qiota_content")
    if not container:
        print("Warning: #qiota_content not found")
        return []
    
    # Find all h3 tags that contain school information
    # Each h3 contains a link with the school name formatted as "Name (City, Dept/Country)"
    school_headers = container.find_all("h3")
    
    if not school_headers:
        print("Warning: No school headers (h3 tags) found in #qiota_content")
        return []
        
    results = []
    
    for header in school_headers:
        # Get the link in the h3 tag
        link_elem = header.find("a")
        if not link_elem:
            continue
            
        # Extract full school name from link text
        full_name = link_elem.get_text(strip=True)
        details_link = link_elem.get('href', '')
        
        # Parse Name (City, Dept/Country)
        # Handle potential nested parentheses in school names like "Lymed (Lycée Méditerranéen) (Tétouan, Maroc)"
        # Strategy: Match the last occurrence of (City, Dept/Country) pattern
        
        # Try primary pattern for French schools: "Name (City, Dept)" where Dept is 2-3 digits
        # Use greedy .* to capture everything including nested parens, then match final location parens
        match = re.match(r"^(.*?)\s*\(([^,()]+),\s*(\d{2,3})\)\s*$", full_name)
        if match:
            name = match.group(1).strip()
            city = match.group(2).strip()
            dept = match.group(3).strip()
        else:
            # Fallback for international schools: "Name (City, Country)" 
            # Match everything up to the last parentheses pair
            match_intl = re.match(r"^(.*?)\s*\(([^,()]+),\s*([^)]+)\)\s*$", full_name)
            if match_intl:
                name = match_intl.group(1).strip()
                city = match_intl.group(2).strip()
                dept = ""  # No department for international schools
            else:
                # No parentheses found, use full name
                name = full_name
                city = ""
                dept = ""
        
        # Get the table row containing this school's data
        # The h3 is inside a td, which is inside a tr with all school details
        tr = header.find_parent('tr')
        
        # Extract Parcoursup status from the hidden detail row
        # The page structure has a visible row with school name, followed by
        # a hidden row with id="laureate-row-N" containing detailed info including Parcoursup
        parcoursup_status = "unknown"
        if tr:
            # Find the next sibling tr which should be the hidden detail row
            detail_row = tr.find_next_sibling('tr')
            if detail_row and detail_row.get('id', '').startswith('laureate-row'):
                # Look for Parcoursup in li elements within this hidden row
                li_elements = detail_row.find_all('li')
                for li in li_elements:
                    li_text = li.get_text(strip=True)
                    if re.search(r"Parcoursup\s*:\s*Oui", li_text, re.IGNORECASE):
                        parcoursup_status = "oui"
                        break
                    elif re.search(r"Parcoursup\s*:\s*Non", li_text, re.IGNORECASE):
                        parcoursup_status = "non"
                        break
        
        results.append({
            "school_name": name,
            "city": city,
            "department": dept,
            "parcoursup": parcoursup_status
        })
    
    return results

def extract_detailed_stats(page_content: str, panier_name: str, cpge_type: str) -> List[Dict]:
    """
    Extracts detailed statistics from school sections in #qiota_content.
    Includes success rates, bac average, and 3/5 year rankings.
    """
    soup = BeautifulSoup(page_content, 'html.parser')
    container = soup.find(id="qiota_content")
    if not container:
        return []
    
    school_headers = container.find_all("h3")
    results = []
    
    for header in school_headers:
        link_elem = header.find("a")
        if not link_elem:
            continue
            
        full_name = link_elem.get_text(strip=True)
        
        # Parse Name (City, Dept/Country)
        match = re.match(r"^(.*?)\s*\(([^,()]+),\s*(\d{2,3})\)\s*$", full_name)
        if match:
            name, city, dept = match.group(1).strip(), match.group(2).strip(), match.group(3).strip()
        else:
            match_intl = re.match(r"^(.*?)\s*\(([^,()]+),\s*([^)]+)\)\s*$", full_name)
            if match_intl:
                name, city, dept = match_intl.group(1).strip(), match_intl.group(2).strip(), ""
            else:
                name, city, dept = full_name, "", ""
        
        tr = header.find_parent('tr')
        taux_int = ""
        moy_bac = ""
        moy_multi_ans = ""
        rang_multi_ans = ""
        parcoursup = "unknown"
        
        if tr:
            detail_row = tr.find_next_sibling('tr')
            if detail_row and detail_row.get('id', '').startswith('laureate-row'):
                li_elements = detail_row.find_all('li')
                for li in li_elements:
                    text = li.get_text(strip=True)
                    
                    # Taux d'intégration dans le panier visé
                    if "Taux d'intégration dans le panier visé" in text:
                        m = re.search(r"([\d,]+)%", text)
                        if m: taux_int = m.group(1).replace(',', '.')
                    
                    # Moyenne au bac
                    elif "Moyenne au bac" in text:
                        m = re.search(r"([\d,]+)/20", text)
                        if m: moy_bac = m.group(1).replace(',', '.')
                    
                    # Moyenne et rang sur 3/5 ans
                    elif "Moyenne et rang sur" in text:
                        m_pct = re.search(r"([\d,]+)%\s*d'intégré", text)
                        m_rang = re.search(r"\((\d+e?/\d+)\)", text)
                        if m_pct: moy_multi_ans = m_pct.group(1).replace(',', '.')
                        if m_rang: rang_multi_ans = m_rang.group(1)
                    
                    # Parcoursup
                    elif "Parcoursup" in text:
                        if "Oui" in text: parcoursup = "oui"
                        elif "Non" in text: parcoursup = "non"

        results.append({
            "cpge_type": cpge_type,
            "panier_name": panier_name,
            "school_name": name,
            "city": city,
            "department": dept,
            "taux_integration_pct": taux_int,
            "moyenne_bac": moy_bac,
            "moyenne_multi_ans_pct": moy_multi_ans,
            "rang_multi_ans": rang_multi_ans,
            "parcoursup": parcoursup
        })
    
    return results
