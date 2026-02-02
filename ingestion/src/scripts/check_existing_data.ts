
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const paniers = await prisma.panier.findMany({ take: 10 });
        const masterFormations = await prisma.masterFormation.findMany({ take: 10 });

        console.log("Existing Paniers (sample):");
        paniers.forEach(p => console.log(`- ID: ${p.id}, Name: ${p.name}`));

        console.log("\nExisting Master Formations (sample):");
        masterFormations.forEach(m => console.log(`- ID: ${m.id}, Name: ${m.name}`));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
