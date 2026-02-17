
import fs from 'fs';
import { parse } from 'csv-parse';

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
