export interface School {
    uai: string;
    name: string;
    status: string;
    locations: Location[];
}

export interface Location {
    id: string;
    city: string;
    departmentCode: string;
    departmentName: string;
    region: string;
    academy: string;
    latitude?: number;
    longitude?: number;
}

export interface Formation {
    id: string;
    name: string;
    category: string;
    admissionRate: number;
    capacity: number;
    selectivity: string;
    school?: School;
    location?: Location;
    filiereFormationDetaillee?: string;
    filiereFormationDetailleeBis?: string;
    filiereTresDetaillee?: string;
    parcoursupLink?: string;
    totalCandidates?: number;
    totalCandidatesWithAdmissionProposal?: number;
    lastCalledRank?: number;
    genderParity?: number;
    mentionDistribution?: Record<string, number>;
    panier_stats?: PanierSchoolStats[];
}

export interface Panier {
    id: string;
    name: string;
    cpgeType: string;
    url?: string;
}

export interface PanierSchoolStats {
    id: string;
    panierId: string;
    schoolUai: string;
    tauxIntegrationPct?: number;
    moyenneBac?: number;
    moyenneMultiAnsPct?: number;
    rangMultiAns?: string;
    parcoursup?: boolean;
    admissionRate?: number;
    parcoursupLink?: string;
    parcoursupName?: string;
    panier?: Panier;
    school?: School;
}

export interface MasterFormation {
    id: string;
    name: string;
}

export interface PanierDetail extends Panier {
    master_formations: MasterFormation[];
    school_stats: PanierSchoolStats[];
}

export interface Specialty {
    id: string;
    name: string;
    shortName: string;
}

export interface SpecialtyAdmissionRate {
    admissionRatePct: number | null;
    candidats: number;
    cpgeCategory: string;
}

export interface UserProfile {
    id: string;
    name: string | null;
    specialty1Id: string | null;
    specialty2Id: string | null;
    department: string | null;
    grade: number | null;
    favoriteIds: string[];
}

export interface RankedMonMasterFormation {
    rank: number;
    id: string;
    mention: string;
    parcours: string | null;
    etablissement: string;
    etablissementId: string;
    ville: string | null;
    academie: string | null;
    region: string | null;
    admissionRate: number;
    capacite: number;
    candidats: number;
    acceptes: number;
    alternance: boolean;
    secteurDisciplinaire: string;
}
