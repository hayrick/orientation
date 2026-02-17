from sqlalchemy import Column, String, Float, Integer, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from .database import Base

# Association table for Panier and MasterFormation
panier_master_formation = Table(
    "PanierMasterFormation",
    Base.metadata,
    Column("panierId", String, ForeignKey("Panier.id"), primary_key=True),
    Column("masterFormationId", String, ForeignKey("MasterFormation.id"), primary_key=True),
)

class School(Base):
    __tablename__ = "School"

    uai = Column(String, primary_key=True, index=True)
    name = Column(String)
    status = Column(String)

    locations = relationship("SchoolLocation", back_populates="school")
    formations = relationship("Formation", back_populates="school")
    panier_stats = relationship("PanierSchoolStats", back_populates="school")


class SchoolLocation(Base):
    __tablename__ = "SchoolLocation"

    id = Column(String, primary_key=True)
    schoolUai = Column(String, ForeignKey("School.uai"))
    city = Column(String)
    departmentCode = Column(String)
    departmentName = Column(String)
    region = Column(String)
    academy = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    school = relationship("School", back_populates="locations")
    formations = relationship("Formation", back_populates="location")


class Formation(Base):
    __tablename__ = "Formation"

    id = Column(String, primary_key=True)
    locationId = Column(String, ForeignKey("SchoolLocation.id"))
    schoolUai = Column(String, ForeignKey("School.uai"))
    name = Column(String)
    filiereFormationDetaillee = Column(String, nullable=True)
    filiereFormationDetailleeBis = Column(String, nullable=True)
    filiereTresDetaillee = Column(String, nullable=True)
    parcoursupLink = Column(String, nullable=True)
    category = Column(String)
    selectivity = Column(String)
    capacity = Column(Integer)
    totalCandidates = Column(Integer, nullable=True)
    totalCandidatesWithAdmissionProposal = Column(Integer, nullable=True)
    
    admissionRate = Column(Float)
    lastCalledRank = Column(Integer, nullable=True)
    genderParity = Column(Float, nullable=True)
    
    # Stored as JSON string in DB, handled as needed
    mentionDistribution = Column(String, nullable=True)

    location = relationship("SchoolLocation", back_populates="formations")
    school = relationship("School", back_populates="formations")

class MasterFormation(Base):
    __tablename__ = "MasterFormation"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True)

    paniers = relationship("Panier", secondary=panier_master_formation, back_populates="master_formations")

class Panier(Base):
    __tablename__ = "Panier"

    id = Column(String, primary_key=True)
    name = Column(String)
    cpgeType = Column(String)
    url = Column(String, nullable=True)

    master_formations = relationship("MasterFormation", secondary=panier_master_formation, back_populates="paniers")
    school_stats = relationship("PanierSchoolStats", back_populates="panier")

class PanierSchoolStats(Base):
    __tablename__ = "PanierSchoolStats"

    id = Column(String, primary_key=True)
    panierId = Column(String, ForeignKey("Panier.id"))
    schoolUai = Column(String, ForeignKey("School.uai"))
    
    tauxIntegrationPct = Column(Float, nullable=True)
    moyenneBac = Column(Float, nullable=True)
    moyenneMultiAnsPct = Column(Float, nullable=True)
    rangMultiAns = Column(String, nullable=True)
    parcoursup = Column(Boolean, nullable=True)

    panier = relationship("Panier", back_populates="school_stats")
    school = relationship("School", back_populates="panier_stats")

class CpgeMapping(Base):
    __tablename__ = "CpgeMapping"

    id = Column(Integer, primary_key=True, autoincrement=True)
    etudiantType = Column(String)
    parcoursupFiliere = Column(String)
    schoolUai = Column(String, nullable=True)

# ============================================
# Specialty Admission Data Models
# ============================================

class Specialty(Base):
    __tablename__ = "Specialty"

    id = Column(String, primary_key=True)
    name = Column(String)
    shortName = Column(String, nullable=True)

class CpgeCategoryMapping(Base):
    __tablename__ = "CpgeCategoryMapping"

    id = Column(Integer, primary_key=True, autoincrement=True)
    csvCategory = Column(String)  # 'CPGE ECG', 'CPGE L', 'CPGE S'
    cpgeType = Column(String)     # Our detailed cpgeType

class SpecialtyAdmissionStats(Base):
    __tablename__ = "SpecialtyAdmissionStats"

    id = Column(String, primary_key=True)
    specialty1Id = Column(String, ForeignKey("Specialty.id"))
    specialty2Id = Column(String, ForeignKey("Specialty.id"))
    cpgeCategory = Column(String)
    candidats = Column(Integer)
    propositions = Column(Float)
    acceptes = Column(Integer)
    admissionRatePct = Column(Float, nullable=True)

    specialty1 = relationship("Specialty", foreign_keys=[specialty1Id])
    specialty2 = relationship("Specialty", foreign_keys=[specialty2Id])


# ============================================
# User Profile
# ============================================

class UserProfile(Base):
    __tablename__ = "UserProfile"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=True)
    specialty1Id = Column(String, ForeignKey("Specialty.id"), nullable=True)
    specialty2Id = Column(String, ForeignKey("Specialty.id"), nullable=True)
    department = Column(String, nullable=True)
    grade = Column(Float, nullable=True)

    favorites = relationship("UserFavorite", back_populates="user", cascade="all, delete-orphan")


class UserFavorite(Base):
    __tablename__ = "UserFavorite"

    userId = Column(String, ForeignKey("UserProfile.id"), primary_key=True)
    formationId = Column(String, primary_key=True)  # Can be Formation.id or PanierSchoolStats.id

    user = relationship("UserProfile", back_populates="favorites")
