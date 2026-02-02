
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse';

const csvPath = 'data/parcoursup/2025/fr-esr-parcoursup.csv';

async function findRecord() {
    console.log(`Searching for ID 130 in ${csvPath}...`);
    const parser = fs
        .createReadStream(csvPath)
        .pipe(parse({
            columns: true,
            delimiter: ';', // Assuming semi-colon delimiter as is common for French CSVs, checked in ingestion code? No, mapper didn't show delimiter. Let's check parser.ts if unsure, but standard for this file is usually ';'.
            relax_quotes: true
        }));

    for await (const record of parser) {
        // ID in mapper is: record["Session"] || record["cod_aff_form"]
        const id = record["Session"] || record["cod_aff_form"];
        if (id === '130') {
            console.log("Found Record 130:");
            console.log(JSON.stringify(record, null, 2));

            // Specifically logging the fields in question
            console.log("\n--- Specific Fields ---");
            console.log("Taux d’accès:", record["Taux d’accès"]);
            console.log("% d’admis néo bacheliers avec mention Très Bien avec félicitations au bac:", record["% d’admis néo bacheliers avec mention Très Bien avec félicitations au bac"]);
            console.log("% d’admis néo bacheliers avec mention Très Bien au bac:", record["% d’admis néo bacheliers avec mention Très Bien au bac"]);
            console.log("% d’admis néo bacheliers avec mention Bien au bac:", record["% d’admis néo bacheliers avec mention Bien au bac"]);
            console.log("% d’admis néo bacheliers avec mention Assez Bien au bac:", record["% d’admis néo bacheliers avec mention Assez Bien au bac"]);
            console.log("% d’admis néo bacheliers sans mention au bac;", record["% d’admis néo bacheliers sans mention au bac;"]); // Note the semicolon in the key if it was in the mapper... wait, let me check mapper again for exact key string.
            return;
        }
    }
    console.log("Record 130 not found.");
}

findRecord().catch(console.error);
