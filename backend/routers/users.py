import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from .. import models
from ..database import get_db

router = APIRouter(prefix="/users", tags=["users"])


class UserProfileCreate(BaseModel):
    name: str | None = None
    specialty1Id: str | None = None
    specialty2Id: str | None = None
    department: str | None = None
    grade: float | None = None


class UserProfileResponse(BaseModel):
    id: str
    name: str | None = None
    specialty1Id: str | None = None
    specialty2Id: str | None = None
    department: str | None = None
    grade: float | None = None
    favoriteIds: list[str] = []

    class Config:
        from_attributes = True


class FavoriteFormationResponse(BaseModel):
    id: str
    name: str
    category: str
    admissionRate: float
    schoolName: str | None = None
    city: str | None = None
    parcoursupLink: str | None = None


def _profile_to_response(profile: models.UserProfile) -> dict:
    """Convert a UserProfile ORM object to response dict including favoriteIds."""
    return {
        "id": profile.id,
        "name": profile.name,
        "specialty1Id": profile.specialty1Id,
        "specialty2Id": profile.specialty2Id,
        "department": profile.department,
        "grade": profile.grade,
        "favoriteIds": [f.formationId for f in profile.favorites],
    }


@router.post("/", response_model=UserProfileResponse)
def create_user(data: UserProfileCreate, db: Session = Depends(get_db)):
    """Create a new user profile with an auto-generated ID."""
    profile = models.UserProfile(
        id=str(uuid.uuid4())[:8],
        name=data.name,
        specialty1Id=data.specialty1Id,
        specialty2Id=data.specialty2Id,
        department=data.department,
        grade=data.grade,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _profile_to_response(profile)


# IMPORTANT: /by-name must be defined BEFORE /{user_id} to avoid route shadowing
@router.get("/by-name/{name}", response_model=UserProfileResponse)
def get_user_by_name(name: str, db: Session = Depends(get_db)):
    """Retrieve a user profile by name (case-insensitive)."""
    profile = db.query(models.UserProfile).filter(
        func.lower(models.UserProfile.name) == name.lower()
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    return _profile_to_response(profile)


@router.get("/{user_id}", response_model=UserProfileResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    """Retrieve a user profile by ID."""
    profile = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    return _profile_to_response(profile)


@router.put("/{user_id}", response_model=UserProfileResponse)
def update_user(user_id: str, data: UserProfileCreate, db: Session = Depends(get_db)):
    """Update an existing user profile."""
    profile = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    if data.name is not None:
        profile.name = data.name
    if data.specialty1Id is not None:
        profile.specialty1Id = data.specialty1Id
    if data.specialty2Id is not None:
        profile.specialty2Id = data.specialty2Id
    if data.department is not None:
        profile.department = data.department
    if data.grade is not None:
        profile.grade = data.grade

    db.commit()
    db.refresh(profile)
    return _profile_to_response(profile)


# ============================================
# Favorites
# ============================================

@router.post("/{user_id}/favorites/{formation_id}")
def add_favorite(user_id: str, formation_id: str, db: Session = Depends(get_db)):
    """Add a formation to user's favorites."""
    profile = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    existing = db.query(models.UserFavorite).filter(
        models.UserFavorite.userId == user_id,
        models.UserFavorite.formationId == formation_id,
    ).first()
    if existing:
        return {"status": "already_favorite"}

    fav = models.UserFavorite(userId=user_id, formationId=formation_id)
    db.add(fav)
    db.commit()
    return {"status": "added"}


@router.delete("/{user_id}/favorites/{formation_id}")
def remove_favorite(user_id: str, formation_id: str, db: Session = Depends(get_db)):
    """Remove a formation from user's favorites."""
    fav = db.query(models.UserFavorite).filter(
        models.UserFavorite.userId == user_id,
        models.UserFavorite.formationId == formation_id,
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favori introuvable")

    db.delete(fav)
    db.commit()
    return {"status": "removed"}


@router.get("/{user_id}/favorites", response_model=list[FavoriteFormationResponse])
def get_favorites(user_id: str, db: Session = Depends(get_db)):
    """List all favorited formations for a user (supports both Formation and CPGE PanierSchoolStats)."""
    profile = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    fav_ids = [fav.formationId for fav in profile.favorites]
    if not fav_ids:
        return []

    # Batch-load all matching Formations in one query
    formations = db.query(models.Formation)\
        .options(joinedload(models.Formation.school), joinedload(models.Formation.location))\
        .filter(models.Formation.id.in_(fav_ids))\
        .all()
    formation_map = {f.id: f for f in formations}

    # Batch-load all matching PanierSchoolStats in one query
    remaining_ids = [fid for fid in fav_ids if fid not in formation_map]
    pss_map = {}
    if remaining_ids:
        pss_list = db.query(models.PanierSchoolStats)\
            .options(
                joinedload(models.PanierSchoolStats.school).joinedload(models.School.locations),
                joinedload(models.PanierSchoolStats.panier),
            )\
            .filter(models.PanierSchoolStats.id.in_(remaining_ids))\
            .all()
        pss_map = {pss.id: pss for pss in pss_list}

    results = []
    for fid in fav_ids:
        f = formation_map.get(fid)
        if f:
            results.append({
                "id": f.id,
                "name": f.name,
                "category": f.category,
                "admissionRate": f.admissionRate,
                "schoolName": f.school.name if f.school else None,
                "city": f.location.city if f.location else None,
                "parcoursupLink": f.parcoursupLink,
            })
            continue

        pss = pss_map.get(fid)
        if pss:
            school = pss.school
            panier = pss.panier
            city = school.locations[0].city if school and school.locations else None

            results.append({
                "id": pss.id,
                "name": f"{panier.cpgeType} - {school.name}" if school and panier else fid,
                "category": f"CPGE {panier.cpgeType}" if panier else "CPGE",
                "admissionRate": pss.moyenneMultiAnsPct or pss.tauxIntegrationPct or 0,
                "schoolName": school.name if school else None,
                "city": city,
                "parcoursupLink": None,
            })

    return results
