
import fs from 'fs';
import { parse } from 'csv-parse';
import { z } from 'zod';

// Minimal Zod Schema for validation
const ParcoursupRowSchema = z.object({
    Session_cod: z.string(), // ID Formation
    g_ea_lib_vx: z.string(), // School Name
    ville_etab: z.string(), // City
    dep: z.string(), // Dept Code
    dep_lib: z.string(), // Dept Name
    region_etab_aff: z.string(), // Region
    acad_mies: z.string(), // Academy
    uai_ges: z.string(), // UAI
    statut_etab: z.string(), // Public/Private
    fili: z.string(), // Formation Category
    fil_lib_voe_acc: z.string(), // Formation Name
    taux_acces_ens: z.string().optional(), // Selectivity
    capa_fin: z.string().optional(), // Capacity
    // ... other fields as needed
});

export async function parseParcoursupData(filePath: string) {
    const records: any[] = [];
    const parser = fs
        .createReadStream(filePath)
        .pipe(parse({
            columns: true,
            delimiter: ';', // Standard for French CSVs
            skip_empty_lines: true,
            trim: true
        }));

    for await (const record of parser) {
        try {
            // Basic normalization before validation if needed
            records.push(record);
        } catch (err) {
            console.error("Skipping invalid row", err);
        }
    }
    return records;
}
