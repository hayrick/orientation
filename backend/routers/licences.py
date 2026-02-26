from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/licences",
    tags=["licences"]
)

@router.get("/types", response_model=List[str])
def get_licence_types(db: Session = Depends(get_db)):
    """Return distinct Licence formation types from SpecialtyAdmissionStats."""
    results = db.query(models.SpecialtyAdmissionStats.cpgeCategory)\
        .filter(models.SpecialtyAdmissionStats.cpgeCategory.like("Licence%"))\
        .distinct().all()
    return sorted([r[0] for r in results if r[0]])

@router.get("/formations")
def get_licence_formations(
    licence_type: Optional[str] = Query(None, description="The Licence type to filter by"),
    department: Optional[str] = Query(None, description="Optional department code filter"),
    db: Session = Depends(get_db)
):
    """Return Licence formations filtered by type using keyword matching.
    
    The licence_type (e.g. 'Licence Mathématiques') is broken into keywords
    and matched against Formation.filiereFormationDetaillee using ILIKE.
    """
    # Build query for Licence formations
    query = db.query(models.Formation)\
        .options(
            joinedload(models.Formation.school).joinedload(models.School.locations)
        )\
        .filter(models.Formation.category == "Licence")
    
    # Keyword-based filtering on licence type
    if licence_type:
        # Some licence types need explicit keyword overrides because their names
        # don't match the filiereFormationDetaillee naming convention
        KEYWORD_OVERRIDES = {
            "Licence Langues et littératures françaises": ["Lettres"],
            "Licence Sciences économiques": ["Economie", "économique"],
            "Licence Pluri Lettres - Langues - Sciences humaines": ["Lettres"],
            "Licence Pluri Sciences": ["Sciences"],
            "Licence Pluri Sciences humaines et sociales": ["Sciences", "sociales"],
            "Licence Pluri Sciences de la vie, de la santé, de la terre et de l univers": ["Sciences", "vie"],
            "Licence Sciences de l éducation": ["éducation"],
            "Licence Archéologie, Ethno, Préhistoire, Anthropologie": ["Archéologie"],
            "Licence Electronique, Génie électrique, EEA": ["Electronique"],
            "Licence Mécanique, Génie mécanique, Ingénierie mécanique": ["Mécanique"],
            "Licence Sciences de l univers, de la terre, de l espace": ["Terre"],
        }
        
        if licence_type in KEYWORD_OVERRIDES:
            # Use override keywords with OR logic (any keyword matches)
            conditions = [
                models.Formation.filiereFormationDetaillee.ilike(f"%{kw}%")
                for kw in KEYWORD_OVERRIDES[licence_type]
            ]
            query = query.filter(or_(*conditions))
        else:
            # Extract subject: "Licence Mathématiques" -> "Mathématiques"
            subject = licence_type.replace("Licence ", "", 1).strip()
            # Split into words, remove French stop words
            stop_words = {"et", "de", "la", "le", "les", "du", "des", "l", "d", "en"}
            keywords = [w for w in subject.split() if w.lower() not in stop_words and len(w) > 1]
            if keywords:
                # Use first keyword for broader matching
                query = query.filter(
                    models.Formation.filiereFormationDetaillee.ilike(f"%{keywords[0]}%")
                )
    
    # Filter by department if specified
    if department:
        query = query.join(models.Formation.school).join(models.School.locations)\
            .filter(models.SchoolLocation.departmentCode == department)
    
    formations = query.limit(50).all()
    
    result = []
    for f in formations:
        school = f.school
        location = school.locations[0] if school and school.locations else None
        
        result.append({
            "id": f.id,
            "name": f.name,
            "filiereDetaillee": f.filiereFormationDetaillee,
            "admissionRate": f.admissionRate,
            "capacity": f.capacity,
            "selectivity": f.selectivity,
            "parcoursupLink": f.parcoursupLink,
            "mentionDistribution": f.mentionDistribution,  # JSON string with mention percentages
            "school": {
                "uai": school.uai if school else None,
                "name": school.name if school else None,
                "city": location.city if location else None,
                "departmentCode": location.departmentCode if location else None,
            } if school else None
        })
    
    return result

@router.get("/admission-rates")
def get_licence_admission_rates(
    specialty1: str = Query(..., description="First specialty ID"),
    specialty2: str = Query(..., description="Second specialty ID"),
    db: Session = Depends(get_db)
):
    """
    Get admission rates for all Licence types given a specialty pair.
    Returns a dict mapping licence type to admission rate percentage.
    """
    # Ensure consistent ordering (spec1 < spec2)
    if specialty1 > specialty2:
        specialty1, specialty2 = specialty2, specialty1
    
    stats = db.query(models.SpecialtyAdmissionStats)\
        .filter(models.SpecialtyAdmissionStats.specialty1Id == specialty1)\
        .filter(models.SpecialtyAdmissionStats.specialty2Id == specialty2)\
        .filter(models.SpecialtyAdmissionStats.cpgeCategory.like("Licence%"))\
        .all()
    
    result = {}
    for stat in stats:
        result[stat.cpgeCategory] = {
            "admissionRatePct": round(stat.admissionRatePct, 1) if stat.admissionRatePct else None,
            "candidats": stat.candidats,
        }
    
    return result

@router.get("/departments")
def get_licence_departments(db: Session = Depends(get_db)):
    """Get all departments that have Licence formations."""
    # Simple query: get all distinct departments from schools that have Licence formations
    results = db.query(
        models.SchoolLocation.departmentCode,
        models.SchoolLocation.departmentName
    ).distinct()\
        .join(models.School, models.SchoolLocation.schoolUai == models.School.uai)\
        .join(models.Formation, models.Formation.schoolUai == models.School.uai)\
        .filter(models.Formation.category == "Licence")\
        .filter(models.SchoolLocation.departmentCode != None)\
        .all()
    
    return [{"code": r[0], "name": r[1]} for r in sorted(results, key=lambda x: x[0] or "")]


@router.get("/{licence_type}/top-masters")
def get_top_masters_for_licence(
    licence_type: str,
    db: Session = Depends(get_db)
):
    """
    Given a Licence type (e.g., 'Licence Mathématiques'), find the matching
    Master Secteur(s) and return the Top highly-selective Master formations.
    """
    # 1. Broad keyword mapping from Licence to Master Secteur
    # Explicit overrides for tricky names
    MAPPING_OVERRIDES = {
        "Licence Sciences économiques": ["économie", "économétrie"],
        "Licence Droit": ["juridiques", "droit européen"],
        "Licence Histoire de l'art et archéologie": ["histoire de l'art", "archéologie"],
        "Licence Langues, littératures et civilisations étrangères et régionales": ["langues, littératures et civilisations"],
        "Licence STAPS": ["activités physiques et sportives"],
        "Licence Sciences de la vie, de la santé, de la terre et de l univers": ["sciences de la vie", "sciences de la terre"],
        "Licence Administration économique et sociale": ["administration économique et sociale", "management", "gestion"],
        "Licence Mathématiques et informatique appliquées aux sciences humaines et sociales": ["mathématiques", "informatique", "sciences humaines"],
        "Licence Physique, chimie": ["physique", "chimie"],
        "Licence Sciences pour l'ingénieur": ["ingénieur", "mécanique", "électronique"],
        "Licence Sciences sanitaires et sociales": ["santé", "sciences sociales"],
        "Licence Sciences sociales": ["sociologie", "sciences sociales"],
        "Licence Sciences de la vie": ["sciences de la vie", "biologie"],
        "Licence Sciences de la Terre": ["sciences de la terre", "géosciences"],
    }

    keywords = []
    if licence_type in MAPPING_OVERRIDES:
        keywords = MAPPING_OVERRIDES[licence_type]
    else:
        # Extract keywords dynamically
        subject = licence_type.replace("Licence ", "", 1).replace("Double ", "", 1).strip()
        stop_words = {"et", "de", "la", "le", "les", "du", "des", "l", "d", "en", "aux", "pour", "ou"}
        keywords = [w for w in subject.split() if w.lower() not in stop_words and len(w) > 3]

    if not keywords:
        return []

    # 2. Find matching formations by checking if any of the keywords are in the secteurDisciplinaire
    conditions = [
        models.MonMasterFormation.secteurDisciplinaire.ilike(f"%{kw}%")
        for kw in keywords
    ]
    
    # 3. Query the absolute top 15 formations across matching disciplines
    # Applying the same criteria used for rankings: capacite >= 20, candidats > 50
    formations = db.query(models.MonMasterFormation)\
        .filter(or_(*conditions))\
        .filter(models.MonMasterFormation.capacite >= 20)\
        .filter(models.MonMasterFormation.candidats > 50)\
        .filter(models.MonMasterFormation.admissionRate != None)\
        .order_by(models.MonMasterFormation.admissionRate.asc())\
        .limit(15)\
        .all()

    result = {"top3": [], "top9": [], "top15": []}
    
    for i, formation in enumerate(formations):
        data = {
            "rank": i + 1,  # Sequential rank
            "id": formation.id,
            "mention": formation.mention,
            "parcours": formation.parcours,
            "etablissement": formation.etablissementNom,
            "etablissementId": formation.etablissementId,
            "ville": formation.ville,
            "academie": formation.academie,
            "region": formation.region,
            "admissionRate": formation.admissionRate,
            "capacite": formation.capacite,
            "candidats": formation.candidats,
            "acceptes": formation.acceptes,
            "alternance": formation.alternance,
            "secteurDisciplinaire": formation.secteurDisciplinaire,
        }
        
        # Bucket by rank (1-3, 4-9, 10-15)
        if i < 3:
            result["top3"].append(data)
        elif i < 9:
            result["top9"].append(data)
        else:
            result["top15"].append(data)

    return result
