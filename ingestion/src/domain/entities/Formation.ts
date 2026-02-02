
export interface FormationStats {
    admissionRate: number; // %
    lastCalledRank?: number; // Rang du dernier appelé
    mentionDistribution?: {
        "Felicitations"?: number;
        "TB"?: number;
        "B"?: number;
        "AB"?: number;
        "SansMention"?: number;
        [key: string]: number | undefined;
    };
    genderParity?: number; // % women
}

export interface Formation {
    id: string; // "Session_cod" from CSV
    schoolUai: string;
    locationId: string; // Keep for existing logic
    name: string; // e.g., "MPSI"
    filiereFormationDetaillee: string;
    filiereFormationDetailleeBis: string;
    filiereTresDetaillee?: string; // "Filière de formation très détaillée"
    parcoursupLink?: string; // "Lien de la formation sur la plateforme Parcoursup"
    category: string; // "CPGE", "Licence"
    selectivity: string; // "Globale" (Taux d'accès from CSV)
    capacity: number;
    totalCandidates?: number;
    totalCandidatesWithAdmissionProposal?: number;
    stats: FormationStats;
}
