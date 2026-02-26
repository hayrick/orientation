from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/masters",
    tags=["masters"]
)


@router.get("/secteurs")
def get_secteurs(db: Session = Depends(get_db)):
    """Return all distinct secteurs disciplinaires that have ranked formations."""
    results = db.query(
        models.MasterSecteur.secteurId,
        models.MasterSecteur.secteurDisciplinaire,
    ).filter(
        models.MasterSecteur.tier == "top3"
    ).distinct().all()

    return sorted([
        {"id": r[0], "name": r[1]}
        for r in results
    ], key=lambda x: x["name"])


@router.get("/secteur/{secteur_id}")
def get_secteur_formations(
    secteur_id: str,
    tier: str = Query("top10", description="Tier filter: top3, top5, top10"),
    db: Session = Depends(get_db)
):
    """Return ranked master formations for a secteur disciplinaire and tier.
    
    Returns formations sorted by rank (most selective first) with
    establishment details and admission stats.
    """
    master_secteur_id = f"{secteur_id}-{tier}"

    # Fetch the secteur
    secteur = db.query(models.MasterSecteur).filter(
        models.MasterSecteur.id == master_secteur_id
    ).first()

    if not secteur:
        return {"secteur": None, "formations": []}

    # Fetch ranked formations
    rankings = db.query(
        models.MasterSecteurFormation,
        models.MonMasterFormation,
    ).join(
        models.MonMasterFormation,
        models.MasterSecteurFormation.monMasterFormationId == models.MonMasterFormation.id
    ).filter(
        models.MasterSecteurFormation.masterSecteurId == master_secteur_id
    ).order_by(
        models.MasterSecteurFormation.rank
    ).all()

    formations = []
    for ranking, formation in rankings:
        formations.append({
            "rank": ranking.rank,
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
            "rangDernierAppelePP": formation.rangDernierAppelePP,
            "pctFemmes": formation.pctFemmes,
            "alternance": formation.alternance,
        })

    return {
        "secteur": {
            "id": secteur.secteurId,
            "name": secteur.secteurDisciplinaire,
            "tier": secteur.tier,
        },
        "formations": formations,
    }


@router.get("/formation/{formation_id}")
def get_master_formation(
    formation_id: str,
    db: Session = Depends(get_db)
):
    """Return detailed information for a specific master formation."""
    formation = db.query(models.MonMasterFormation).filter(
        models.MonMasterFormation.id == formation_id
    ).first()

    if not formation:
        return None

    return {
        "id": formation.id,
        "mention": formation.mention,
        "parcours": formation.parcours,
        "etablissement": formation.etablissementNom,
        "etablissementId": formation.etablissementId,
        "secteurDisciplinaire": formation.secteurDisciplinaire,
        "secteurId": formation.secteurId,
        "discipline": formation.discipline,
        "ville": formation.ville,
        "academie": formation.academie,
        "region": formation.region,
        "alternance": formation.alternance,
        "modalite": formation.modalite,
        "admissionRate": formation.admissionRate,
        "capacite": formation.capacite,
        "candidats": formation.candidats,
        "classes": formation.classes,
        "propositions": formation.propositions,
        "acceptes": formation.acceptes,
        "rangDernierAppelePP": formation.rangDernierAppelePP,
        "pctFemmes": formation.pctFemmes,
        "pctMemeEtablissement": formation.pctMemeEtablissement,
        "pctMemeAcademie": formation.pctMemeAcademie,
    }


@router.get("/search")
def search_master_formations(
    mention: Optional[str] = Query(None, description="Search by mention name"),
    secteur_id: Optional[str] = Query(None, description="Filter by secteur disciplinaire ID"),
    region: Optional[str] = Query(None, description="Filter by region"),
    alternance: Optional[bool] = Query(None, description="Filter by alternance"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Search master formations with filters."""
    query = db.query(models.MonMasterFormation)

    if mention:
        query = query.filter(
            models.MonMasterFormation.mention.ilike(f"%{mention}%")
        )

    if secteur_id:
        query = query.filter(
            models.MonMasterFormation.secteurId == secteur_id
        )

    if region:
        query = query.filter(
            models.MonMasterFormation.region.ilike(f"%{region}%")
        )

    if alternance is not None:
        query = query.filter(
            models.MonMasterFormation.alternance == alternance
        )

    # Sort by admission rate (most selective first), nulls last
    query = query.order_by(
        models.MonMasterFormation.admissionRate.asc().nullslast()
    )

    formations = query.limit(limit).all()

    return [{
        "id": f.id,
        "mention": f.mention,
        "parcours": f.parcours,
        "etablissement": f.etablissementNom,
        "etablissementId": f.etablissementId,
        "ville": f.ville,
        "region": f.region,
        "admissionRate": f.admissionRate,
        "capacite": f.capacite,
        "candidats": f.candidats,
        "alternance": f.alternance,
        "secteurDisciplinaire": f.secteurDisciplinaire,
    } for f in formations]
