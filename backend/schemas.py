from pydantic import BaseModel, field_validator
from typing import Optional, Dict, Any


class LocationBase(BaseModel):
    id: str
    city: str
    departmentCode: Optional[str] = None
    departmentName: Optional[str] = None
    region: Optional[str] = None
    academy: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class SchoolBase(BaseModel):
    uai: str
    name: str
    status: str

    class Config:
        from_attributes = True


class SchoolDetail(SchoolBase):
    locations: list[LocationBase] = []

    class Config:
        from_attributes = True


class FormationBase(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    admissionRate: Optional[float] = None
    capacity: Optional[int] = None
    selectivity: Optional[str] = None

    class Config:
        from_attributes = True


class MasterFormationBase(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class PanierBase(BaseModel):
    id: str
    name: str
    cpgeType: str
    url: Optional[str] = None

    class Config:
        from_attributes = True


class PanierSchoolStatsBase(BaseModel):
    id: str
    panierId: str
    schoolUai: str
    tauxIntegrationPct: Optional[float] = None
    moyenneBac: Optional[float] = None
    moyenneMultiAnsPct: Optional[float] = None
    rangMultiAns: Optional[str] = None
    parcoursup: Optional[bool] = None
    admissionRate: Optional[float] = None
    parcoursupLink: Optional[str] = None
    parcoursupName: Optional[str] = None
    panier: Optional[PanierBase] = None

    class Config:
        from_attributes = True


class PanierSchoolStatsDetail(PanierSchoolStatsBase):
    school: Optional[SchoolDetail] = None

    class Config:
        from_attributes = True


class PanierDetail(PanierBase):
    master_formations: list[MasterFormationBase] = []
    school_stats: list[PanierSchoolStatsDetail] = []

    class Config:
        from_attributes = True


class FormationDetail(FormationBase):
    school: Optional[SchoolBase] = None
    location: Optional[LocationBase] = None
    filiereFormationDetaillee: Optional[str] = None
    filiereFormationDetailleeBis: Optional[str] = None
    filiereTresDetaillee: Optional[str] = None
    parcoursupLink: Optional[str] = None
    totalCandidates: Optional[int] = None
    totalCandidatesWithAdmissionProposal: Optional[int] = None
    lastCalledRank: Optional[int] = None
    genderParity: Optional[float] = None
    mentionDistribution: Optional[Dict[str, float]] = None
    panier_stats: Optional[list[PanierSchoolStatsBase]] = None

    @field_validator('mentionDistribution', mode='before')
    @classmethod
    def parse_mention_distribution(cls, v: Any) -> Optional[Dict[str, float]]:
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return None

    class Config:
        from_attributes = True


class PaginatedFormations(BaseModel):
    items: list[FormationDetail]
    total: int
    page: int
    size: int
