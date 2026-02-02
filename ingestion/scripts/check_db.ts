
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const schoolCount = await prisma.school.count();
        const locationCount = await prisma.schoolLocation.count();
        const formationCount = await prisma.formation.count();

        console.log('--- Database Statistics ---');
        console.log(`Schools: ${schoolCount}`);
        console.log(`Locations: ${locationCount}`);
        console.log(`Formations: ${formationCount}`);



        if (formationCount > 0) {
            const sample = await prisma.formation.findFirst({
                include: { location: true, school: true }
            });
            console.log('\n--- Sample Formation ---');
            console.log(JSON.stringify(sample, null, 2));

            if (sample?.school) {
                console.log(`\nVerified Relation: Formation ${sample.id} is linked to School ${sample.school.name}`);
            } else {
                console.log(`\nFAILED: Formation ${sample?.id} has no linked School.`);
            }

            console.log('\n--- Verification of Filter ---');
            const badFormations = await prisma.formation.count({
                where: {
                    OR: [
                        { category: { startsWith: 'BTS' } },
                        { category: { startsWith: 'Autre formation' } },
                        { category: { startsWith: 'IBUT' } }
                    ]
                }
            });
            console.log(`Bad Formations Remaining: ${badFormations} (Should be 0)`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
