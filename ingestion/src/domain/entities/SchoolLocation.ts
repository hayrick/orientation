
export interface SchoolLocation {
    id: string; // Likely generated or composite
    schoolUai: string;
    city: string;
    departmentCode: string; // e.g., "75"
    departmentName: string; // e.g., "Paris"
    region: string; // e.g., "Ile-de-France"
    academy: string; // e.g., "Paris"
    gpsCoordinates?: {
        lat: number;
        long: number;
    };
}
