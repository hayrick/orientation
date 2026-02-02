
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const record = await prisma.panierMasterFormation.findUnique({
            where: {
                panierId_masterFormationId: {
                    panierId: 'ecg-top-8',
                    masterFormationId: 'st-cyr'
                }
            },
            include: {
                panier: true,
                masterFormation: true
            }
        });

        if (record) {
            console.log(`Found record: ${record.panier.name} -> ${record.masterFormation.name}`);
        } else {
            console.log("Record NOT found: ecg-top-8 -> st-cyr");
        }

        const blRecord = await prisma.panierMasterFormation.findUnique({
            where: {
                panierId_masterFormationId: {
                    panierId: 'bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires',
                    masterFormationId: 'ehess'
                }
            },
            include: {
                panier: true,
                masterFormation: true
            }
        });

        if (blRecord) {
            console.log(`Found record: ${blRecord.panier.name} -> ${blRecord.masterFormation.name}`);
        } else {
            console.log("Record NOT found: bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires -> ehess");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
