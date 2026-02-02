
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const count = await prisma.panierMasterFormation.count();
        console.log(`Total records in PanierMasterFormation: ${count}`);

        const sample = await prisma.panierMasterFormation.findMany({
            take: 10,
            include: {
                panier: true,
                masterFormation: true
            }
        });

        console.log("\nSample records:");
        sample.forEach(s => {
            console.log(`- ${s.panier.name} (${s.panierId}) -> ${s.masterFormation.name} (${s.masterFormationId})`);
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
