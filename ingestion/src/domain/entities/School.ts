
export interface School {
    uai: string; // Unique Administrative Identifier (primary key)
    name: string;
    status: 'Public' | 'Privé' | 'Autre';
}
