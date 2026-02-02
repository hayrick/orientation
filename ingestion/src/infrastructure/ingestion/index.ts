
import { parseParcoursupData } from './parser';
import { mapToSchool, mapToLocation, mapToFormation } from './mapper';
import { PostgresSchoolRepository } from '../db/PostgresSchoolRepository';
import path from 'path';

import { School } from '../../domain/entities/School';
import { Formation } from '../../domain/entities/Formation';
import { SchoolLocation } from '../../domain/entities/SchoolLocation';

async function main() {
    const filePath = path.join(process.cwd(), 'data/parcoursup/2025/fr-esr-parcoursup.csv');
    console.log(`Reading from ${filePath}...`);

    try {
        const allRecords = await parseParcoursupData(filePath);

        // Filter out unwanted formations: BTS, Autre formation, IBUT
        const records = allRecords.filter((r: any) => {
            const category = r["Filière de formation très agrégée"] || "";
            return !category.startsWith("BTS") &&
                !category.startsWith("Autre formation") &&
                !category.startsWith("BUT");
        });

        console.log(`Parsed ${allRecords.length} records. Kept ${records.length} after filtering.`);

        const schools = records.map(mapToSchool);
        const uniqueSchools: School[] = Array.from(new Map(schools.map((s: School) => [s.uai, s])).values());

        const locations = records.map(mapToLocation);
        const uniqueLocations: SchoolLocation[] = Array.from(new Map(locations.map((l: SchoolLocation) => [l.id, l])).values());

        const formations: Formation[] = records.map(mapToFormation);

        console.log(`Ingesting ${uniqueSchools.length} schools, ${uniqueLocations.length} locations, and ${formations.length} formations...`);

        const repo = new PostgresSchoolRepository();
        await repo.saveAll(uniqueSchools, uniqueLocations, formations);

        console.log("Ingestion completed.");
    } catch (error) {
        console.error("Error during ingestion:", error);
    }
}

if (require.main === module) {
    main();
}
