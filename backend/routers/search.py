from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/formations",
    tags=["formations"]
)

def get_parcoursup_types(cpge_type: str, db: Session, school_uai: Optional[str] = None) -> List[str]:
    """
    Map scraper CPGE types to Parcoursup formation names using CpgeMapping table.
    """
    # 1. Check for school-specific overrides
    if school_uai:
        overrides = db.query(models.CpgeMapping.parcoursupFiliere)\
            .filter(models.CpgeMapping.etudiantType == cpge_type)\
            .filter(models.CpgeMapping.schoolUai == school_uai)\
            .all()
        if overrides:
            return [o[0] for o in overrides]

    # 2. Check for global mappings
    global_mappings = db.query(models.CpgeMapping.parcoursupFiliere)\
        .filter(models.CpgeMapping.etudiantType == cpge_type)\
        .filter(models.CpgeMapping.schoolUai == None)\
        .all()
    if global_mappings:
        return [g[0] for g in global_mappings]
    
    # 3. Fallback to hardcoded logic if no mapping exists
    t = cpge_type.upper()
    if "LETTRES" in t or "B/L" in t or "A/L" in t or "LSH" in t:
        return ["Lettres", "B/L", "A/L"]
    
    if "ECG" in t:
        return ["ECG"]
    
    if "BCPST" in t:
        return ["BCPST"]
        
    return [cpge_type]

@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    # Efficiently get distinct categories
    categories = db.query(models.Formation.category).distinct().all()
    # Flatten the list of tuples
    return sorted([c[0] for c in categories if c[0]])

@router.get("/filters/cpge-filieres", response_model=List[str])
def get_cpge_filieres(db: Session = Depends(get_db)):
    """Return distinct 'filiereFormationDetailleeBis' for CPGE category"""
    results = db.query(models.Formation.filiereFormationDetailleeBis)\
        .filter(models.Formation.category.ilike("%CPGE%"))\
        .filter(models.Formation.filiereFormationDetailleeBis != None)\
        .distinct().all()
    
    return sorted([r[0] for r in results if r[0]])

@router.get("/paniers/types", response_model=List[str])
def get_panier_types(db: Session = Depends(get_db)):
    """Return distinct 'cpgeType' from Panier table"""
    results = db.query(models.Panier.cpgeType).distinct().all()
    return sorted([r[0] for r in results if r[0]])

@router.get("/paniers/by-type")
def get_paniers_by_type(cpge_type: str = Query(..., description="The CPGE type filter (e.g. 'B/L - Lettres et sciences sociales', 'ECG')"), db: Session = Depends(get_db)):
    """Return paniers for a specific CPGE type with related data"""
    paniers = db.query(models.Panier)\
        .options(
            joinedload(models.Panier.master_formations),
            joinedload(models.Panier.school_stats).joinedload(models.PanierSchoolStats.school).joinedload(models.School.locations)
        )\
        .filter(models.Panier.cpgeType == cpge_type)\
        .all()
    
    # Get all unique school UAIs to fetch admission rates in one batch
    uai_list = list(set(s.schoolUai for p in paniers for s in p.school_stats))
    
    # Build admission rates map
    rates_map = {}
    # Track schools that should be excluded due to override mappings
    schools_to_exclude = set()
    if uai_list:
        from sqlalchemy import or_
        
        # We need to consider both global mappings and school-specific overrides
        global_filieres = get_parcoursup_types(cpge_type, db)
        
        # Get all relevant formations for these schools
        # We'll filter them properly in Python to handle school-specific overrides accurately
        psup_search_terms = set(global_filieres)
        # Add potential overrides for these schools
        overrides = db.query(models.CpgeMapping)\
            .filter(models.CpgeMapping.etudiantType == cpge_type)\
            .filter(models.CpgeMapping.schoolUai.in_(uai_list))\
            .all()
        
        school_overrides = {}
        for o in overrides:
            psup_search_terms.add(o.parcoursupFiliere)
            if o.schoolUai not in school_overrides:
                school_overrides[o.schoolUai] = []
            school_overrides[o.schoolUai].append(o.parcoursupFiliere)
            # If the override maps to a different filiere, exclude this school
            # because l'Etudiant has incorrectly categorized it
            if o.parcoursupFiliere not in global_filieres:
                schools_to_exclude.add(o.schoolUai)

        type_filters = []
        for t in psup_search_terms:
            type_filters.append(models.Formation.filiereFormationDetailleeBis.ilike(f"%{t}%"))
            type_filters.append(models.Formation.filiereFormationDetaillee.ilike(f"%{t}%"))
            type_filters.append(models.Formation.name.ilike(f"%{t}%"))

        formations = db.query(models.Formation)\
            .filter(models.Formation.schoolUai.in_(uai_list))\
            .filter(models.Formation.category.ilike("%CPGE%"))\
            .filter(or_(*type_filters))\
            .all()
        
        for f in formations:
            # Determine target filieres for this specific school
            targets = school_overrides.get(f.schoolUai, global_filieres)
            
            # Check if this formation matches any of the targets
            is_match = False
            for target in targets:
                if (f.filiereFormationDetailleeBis and target.lower() in f.filiereFormationDetailleeBis.lower()) or \
                   (f.filiereFormationDetaillee and target.lower() in f.filiereFormationDetaillee.lower()) or \
                   (target.lower() in f.name.lower()):
                    is_match = True
                    break
            
            if is_match:
                if f.schoolUai not in rates_map and f.admissionRate is not None:
                    rates_map[f.schoolUai] = {
                        "admissionRate": f.admissionRate,
                        "parcoursupLink": f.parcoursupLink,
                        "parcoursupName": f.filiereFormationDetailleeBis or f.name
                    }
    
    # Manually construct response to include admission rates
    result = []
    for p in paniers:
        panier_dict = {
            "id": p.id,
            "name": p.name,
            "cpgeType": p.cpgeType,
            "url": p.url,
            "master_formations": [{"id": mf.id, "name": mf.name} for mf in p.master_formations],
            "school_stats": []
        }
        for s in p.school_stats:
            school_data = None
            if s.school:
                school_data = {
                    "uai": s.school.uai,
                    "name": s.school.name,
                    "status": s.school.status,
                    "locations": [
                        {
                            "id": loc.id,
                            "city": loc.city,
                            "departmentCode": loc.departmentCode,
                            "departmentName": loc.departmentName,
                            "region": loc.region,
                            "academy": loc.academy,
                            "latitude": loc.latitude,
                            "longitude": loc.longitude
                        } for loc in s.school.locations
                    ]
                }
            
            admission_info = rates_map.get(s.schoolUai, {})
            admission_rate = admission_info.get("admissionRate")
            
            # ONLY include schools that were successfully mapped (have an admission rate)
            if admission_rate is None:
                continue
            
            # Exclude schools that have a school-specific override to a different type
            # This means l'Etudiant incorrectly categorized this school under this type
            if s.schoolUai in schools_to_exclude:
                continue

            stat_dict = {
                "id": s.id,
                "panierId": s.panierId,
                "schoolUai": s.schoolUai,
                "tauxIntegrationPct": s.tauxIntegrationPct,
                "moyenneBac": s.moyenneBac,
                "moyenneMultiAnsPct": s.moyenneMultiAnsPct,
                "rangMultiAns": s.rangMultiAns,
                "parcoursup": s.parcoursup,
                "admissionRate": admission_rate,
                "parcoursupLink": admission_info.get("parcoursupLink"),
                "parcoursupName": admission_info.get("parcoursupName"),
                "school": school_data
            }
            panier_dict["school_stats"].append(stat_dict)
        
        # Only add the panier if it has at least one relevant school
        if panier_dict["school_stats"]:
            result.append(panier_dict)
    
    return result

@router.get("/", response_model=schemas.PaginatedFormations)
def search_formations(
    city: Optional[str] = Query(None, min_length=2),
    department: Optional[str] = None,
    category: Optional[str] = None,
    school_name: Optional[str] = Query(None, min_length=2),
    min_admission_rate: Optional[float] = None,
    filiere_bis: Optional[List[str]] = Query(None),
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    print(f"DEBUG: Search request params - city='{city}', department='{department}', category='{category}', school='{school_name}', rate={min_admission_rate}, filiere_bis={filiere_bis}")
    
    query = db.query(models.Formation).options(
        joinedload(models.Formation.school).joinedload(models.School.panier_stats).joinedload(models.PanierSchoolStats.panier),
        joinedload(models.Formation.location)
    )

    if city or department:
        query = query.join(models.SchoolLocation)
        if city:
            query = query.filter(models.SchoolLocation.city.ilike(f"%{city}%"))
        if department:
            query = query.filter(models.SchoolLocation.departmentCode == department)

    if school_name:
         query = query.join(models.School).filter(models.School.name.ilike(f"%{school_name}%"))

    if category:
        query = query.filter(models.Formation.category == category)
    if min_admission_rate is not None:
        query = query.filter(models.Formation.admissionRate >= min_admission_rate)
    
    if filiere_bis:
        from sqlalchemy import or_
        expanded_types = []
        for f in filiere_bis:
            expanded_types.extend(get_parcoursup_types(f, db))
        
        type_filters = []
        for t in set(expanded_types):
            type_filters.append(models.Formation.filiereFormationDetailleeBis.ilike(f"%{t}%"))
        
        query = query.filter(or_(*type_filters))

    # Calculate total before pagination
    total = query.count()

    # Apply pagination
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()
    
    print(f"DEBUG: Found {len(results)} results (Total: {total})")
    
    return {
        "items": results,
        "total": total,
        "page": page,
        "size": limit
    }

@router.get("/{formation_id}", response_model=schemas.FormationDetail)
def get_formation(formation_id: str, db: Session = Depends(get_db)):
    formation = db.query(models.Formation).options(
        joinedload(models.Formation.school).joinedload(models.School.panier_stats).joinedload(models.PanierSchoolStats.panier),
        joinedload(models.Formation.location)
    ).filter(models.Formation.id == formation_id).first()
    
    if not formation:
        raise HTTPException(status_code=404, detail="Formation not found")
    
    return formation

# Separate router for schools if needed, but putting here for now or creating a new file
school_router = APIRouter(
    prefix="/schools",
    tags=["schools"]
)

@school_router.get("/{uai}", response_model=schemas.SchoolBase)
def get_school(uai: str, db: Session = Depends(get_db)):
    school = db.query(models.School).filter(models.School.uai == uai).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school

# ============================================
# Specialty Admission Data Endpoints
# ============================================

specialty_router = APIRouter(
    prefix="/specialties",
    tags=["specialties"]
)

@specialty_router.get("/", response_model=List[dict])
def get_specialties(db: Session = Depends(get_db)):
    """Return all available high school specialties"""
    specialties = db.query(models.Specialty).all()
    return [{"id": s.id, "name": s.name, "shortName": s.shortName} for s in specialties]

@specialty_router.get("/admission-rate")
def get_specialty_admission_rate(
    specialty1: str = Query(..., description="First specialty ID (e.g., 'maths')"),
    specialty2: str = Query(..., description="Second specialty ID (e.g., 'ses')"),
    cpge_type: str = Query(..., description="CPGE type (e.g., 'ECG', 'MP')"),
    db: Session = Depends(get_db)
):
    """
    Get admission rate for a specific specialty combination and CPGE type.
    Returns the percentage of candidates with this specialty combo who received an admission offer.
    """
    # Map our cpgeType to CSV category using CpgeCategoryMapping
    mapping = db.query(models.CpgeCategoryMapping)\
        .filter(models.CpgeCategoryMapping.cpgeType == cpge_type)\
        .first()
    
    if not mapping:
        # Try to infer category from type name
        if 'ECG' in cpge_type.upper():
            csv_category = 'CPGE ECG'
        elif any(x in cpge_type.upper() for x in ['MP', 'MPI', 'PC', 'PSI', 'BCPST', 'PT']):
            csv_category = 'CPGE S'
        elif any(x in cpge_type.upper() for x in ['LETTRES', 'B/L', 'A/L', 'LSH']):
            csv_category = 'CPGE L'
        else:
            return {"admissionRatePct": None, "candidats": 0, "message": "Unknown CPGE type"}
    else:
        csv_category = mapping.csvCategory
    
    # Sort specialty IDs for consistent lookup
    spec1, spec2 = sorted([specialty1.lower(), specialty2.lower()])
    
    # Query the stats
    stats = db.query(models.SpecialtyAdmissionStats)\
        .filter(models.SpecialtyAdmissionStats.specialty1Id == spec1)\
        .filter(models.SpecialtyAdmissionStats.specialty2Id == spec2)\
        .filter(models.SpecialtyAdmissionStats.cpgeCategory == csv_category)\
        .first()
    
    if not stats:
        return {"admissionRatePct": None, "candidats": 0, "message": "No data for this combination"}
    
    return {
        "admissionRatePct": round(stats.admissionRatePct, 1) if stats.admissionRatePct else None,
        "candidats": stats.candidats,
        "propositions": int(stats.propositions),
        "cpgeCategory": csv_category
    }

@specialty_router.get("/admission-rates-by-specialties")
def get_admission_rates_by_specialties(
    specialty1: str = Query(..., description="First specialty ID"),
    specialty2: str = Query(..., description="Second specialty ID"),
    db: Session = Depends(get_db)
):
    """
    Get admission rates for ALL CPGE types given a specialty combination.
    Returns a map of cpgeType -> admissionRatePct for display on type buttons.
    """
    spec1, spec2 = sorted([specialty1.lower(), specialty2.lower()])
    
    # Get all stats for this specialty pair
    stats_list = db.query(models.SpecialtyAdmissionStats)\
        .filter(models.SpecialtyAdmissionStats.specialty1Id == spec1)\
        .filter(models.SpecialtyAdmissionStats.specialty2Id == spec2)\
        .all()
    
    # Get all category mappings
    mappings = db.query(models.CpgeCategoryMapping).all()
    category_to_types = {}
    for m in mappings:
        if m.csvCategory not in category_to_types:
            category_to_types[m.csvCategory] = []
        category_to_types[m.csvCategory].append(m.cpgeType)
    
    # Build response: cpgeType -> rate
    result = {}
    for stats in stats_list:
        cpge_types = category_to_types.get(stats.cpgeCategory, [])
        for cpge_type in cpge_types:
            result[cpge_type] = {
                "admissionRatePct": round(stats.admissionRatePct, 1) if stats.admissionRatePct else None,
                "candidats": stats.candidats,
                "cpgeCategory": stats.cpgeCategory
            }
    
    return result

