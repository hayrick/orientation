
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const formation = await prisma.formation.findUnique({
        where: { id: '130' }
    });

    if (formation) {
        console.log("Formation 130 Stats:");
        // const stats = formation.stats as any; // Removed incorrect access
        // Actually stats is embedded? No, in schema it's flat fields for admissionRate etc, but mentionDistribution is a String field in schema!
        // Wait, let me check schema again. Yes: mentionDistribution String?
        // And repository maps it to JSON string.

        let mentions = {};
        if (formation.mentionDistribution) {
            mentions = JSON.parse(formation.mentionDistribution);
        }

        console.log("Admission Rate:", formation.admissionRate);
        console.log("Mention Distribution:", mentions);

        const sum = Object.values(mentions).reduce((a: any, b: any) => a + b, 0);
        console.log("Sum of mentions:", sum);
    } else {
        console.log("Formation 130 not found in DB.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
