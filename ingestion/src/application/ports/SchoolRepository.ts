
import { School } from '../../domain/entities/School';
import { SchoolLocation } from '../../domain/entities/SchoolLocation';
import { Formation } from '../../domain/entities/Formation';

export interface SchoolRepository {
    saveAll(schools: School[], locations: SchoolLocation[], formations: Formation[]): Promise<void>;
    findByUai(uai: string): Promise<School | null>;
    searchFormations(criteria: {
        city?: string;
        department?: string;
        admissionRateMin?: number;
    }): Promise<Formation[]>;
}
