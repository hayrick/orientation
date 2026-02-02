
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const types = await prisma.panier.findMany({
            select: { cpgeType: true },
            distinct: ['cpgeType']
        });

        console.log("CPGE Types available:", types.map(t => t.cpgeType));

        for (const t of types) {
            const count = await prisma.panier.count({ where: { cpgeType: t.cpgeType } });
            console.log(`Type ${t.cpgeType}: ${count} paniers`);

            const sample = await prisma.panier.findMany({
                where: { cpgeType: t.cpgeType },
                take: 2
            });
            console.log(`Sample:`, sample.map(p => p.id));
        }

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
