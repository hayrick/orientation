from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/formations",
    tags=["formations"]
)

def get_parcoursup_types(cpge_type: str) -> List[str]:
    """
    Map scraper CPGE types to Parcoursup formation names.
    Many scraper types are specific subtypes, while Parcoursup uses generic names.
    Returns a list of potential matches for ilike queries.
    """
    # Normalize
    t = cpge_type.upper()
    
    # Mapping logic
    if "LETTRES" in t or "B/L" in t or "A/L" in t or "LSH" in t:
        return ["Lettres", "B/L", "A/L"]
    
    if "ECG" in t:
        return ["ECG"]
    
    if "BCPST" in t:
        return ["BCPST"]
        
    # Default: return the type itself and some basic variants
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
    if uai_list:
        psup_types = get_parcoursup_types(cpge_type)
        
        # Build OR filter for types
        type_filters = []
        for t in psup_types:
            type_filters.append(models.Formation.filiereFormationDetailleeBis.ilike(f"%{t}%"))
            type_filters.append(models.Formation.filiereFormationDetaillee.ilike(f"%{t}%"))
            type_filters.append(models.Formation.name.ilike(f"%{t}%"))

        from sqlalchemy import or_
        formations = db.query(models.Formation)\
            .filter(models.Formation.schoolUai.in_(uai_list))\
            .filter(models.Formation.category.ilike("%CPGE%"))\
            .filter(or_(*type_filters))\
            .all()
        
        for f in formations:
            if f.schoolUai not in rates_map and f.admissionRate is not None:
                rates_map[f.schoolUai] = {
                    "admissionRate": f.admissionRate,
                    "parcoursupLink": f.parcoursupLink
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
            
            stat_dict = {
                "id": s.id,
                "panierId": s.panierId,
                "schoolUai": s.schoolUai,
                "tauxIntegrationPct": s.tauxIntegrationPct,
                "moyenneBac": s.moyenneBac,
                "moyenneMultiAnsPct": s.moyenneMultiAnsPct,
                "rangMultiAns": s.rangMultiAns,
                "parcoursup": s.parcoursup,
                "admissionRate": rates_map.get(s.schoolUai, {}).get("admissionRate"),  # Inject admission rate
                "parcoursupLink": rates_map.get(s.schoolUai, {}).get("parcoursupLink"),  # Inject parcoursup link
                "school": school_data
            }
            panier_dict["school_stats"].append(stat_dict)
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
        # Filter by list of filieres (OR logic within the list usually, or strict match? 
        # Usually multiple selection implies IN clause)
        query = query.filter(models.Formation.filiereFormationDetailleeBis.in_(filiere_bis))

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
