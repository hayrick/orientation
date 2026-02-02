
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const data = [
    ["ecg-hec-essec-escp", "hec"],
    ["ecg-hec-essec-escp", "essec"],
    ["ecg-hec-essec-escp", "escp"],
    ["ecg-top-8", "emlyon"],
    ["ecg-top-8", "Edhec"],
    ["ecg-top-8", "ENS Paris-Saclay (ex-Cachan)"],
    ["ecg-top-8", "Ensae"],
    ["ecg-top-8", "St-Cyr"],
    ["ecg-mathematiques-appliquees-esh-top-8", "emlyon"],
    ["ecg-mathematiques-appliquees-esh-top-8", "Edhec"],
    ["ecg-mathematiques-appliquees-esh-top-8", "ENS Paris-Saclay (ex-Cachan)"],
    ["ecg-mathematiques-appliquees-esh-top-8", "Ensae"],
    ["ecg-mathematiques-appliquees-esh-top-8", "St-Cyr"],
    ["ecg-mathematiques-appliquees-hgg-hec-essec-escp", "hec"],
    ["ecg-mathematiques-appliquees-hgg-hec-essec-escp", "essec"],
    ["ecg-mathematiques-appliquees-hgg-hec-essec-escp", "escp"],
    ["ecg-mathematiques-appliquees-hgg-top-8", "emlyon"],
    ["ecg-mathematiques-appliquees-hgg-top-8", "Edhec"],
    ["ecg-mathematiques-appliquees-hgg-top-8", "ENS Paris-Saclay (ex-Cachan)"],
    ["ecg-mathematiques-appliquees-hgg-top-8", "Ensae"],
    ["ecg-mathematiques-appliquees-hgg-top-8", "St-Cyr"],
    ["ecg-mathematiques-approfondies-esh-hec-essec-escp", "hec"],
    ["ecg-mathematiques-approfondies-esh-hec-essec-escp", "essec"],
    ["ecg-mathematiques-approfondies-esh-hec-essec-escp", "escp"],
    ["ecg-mathematiques-approfondies-esh-top-8", "emlyon"],
    ["ecg-mathematiques-approfondies-esh-top-8", "Edhec"],
    ["ecg-mathematiques-approfondies-esh-top-8", "ENS Paris-Saclay (ex-Cachan)"],
    ["ecg-mathematiques-approfondies-esh-top-8", "Ensae"],
    ["ecg-mathematiques-approfondies-esh-top-8", "St-Cyr"],
    ["ecg-mathematiques-approfondies-hgg-top-8", "emlyon"],
    ["ecg-mathematiques-approfondies-hgg-top-8", "Edhec"],
    ["ecg-mathematiques-approfondies-hgg-top-8", "ENS Paris-Saclay (ex-Cachan)"],
    ["ecg-mathematiques-approfondies-hgg-top-8", "Ensae"],
    ["ecg-mathematiques-approfondies-hgg-top-8", "St-Cyr"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-de-commerce", "toutes écoles de commerce (banques BCE & Ecricome)"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "ENS"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "Ensae"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "Ensai"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "Géodata Paris (ex ENSG-Géomatique)"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "Celsa"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "Esit"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "ISMaPP"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "11 IEP"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "LISS Dauphine"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "UTT"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "ENSC"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "TSE"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "Ensim"],
    ["bl-lettres-et-sciences-sociales-panier-large-ecoles-litteraires", "EHESS"],
    ["ecg-mathematiques-approfondies-egg-hec-essec-escp", "hec"],
    ["ecg-mathematiques-approfondies-egg-hec-essec-escp", "essec"],
    ["ecg-mathematiques-approfondies-egg-hec-essec-escp", "escp"]
];

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Normalize to decomposite accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-'); // Replace multiple - with single -
}

async function main() {
    console.log("Starting data insertion...");

    for (const [panierId, masterFormationName] of data) {
        const masterFormationId = slugify(masterFormationName);

        // Ensure Panier exists
        await prisma.panier.upsert({
            where: { id: panierId },
            update: {}, // Don't change name if it exists, assume ID is stable
            create: {
                id: panierId,
                name: panierId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                cpgeType: panierId.startsWith('ecg') ? 'ECG' : 'BL',
            }
        });

        // Ensure MasterFormation exists
        await prisma.masterFormation.upsert({
            where: { id: masterFormationId },
            update: {},
            create: {
                id: masterFormationId,
                name: masterFormationName
            }
        });

        // Create relationship
        try {
            await prisma.panierMasterFormation.upsert({
                where: {
                    panierId_masterFormationId: {
                        panierId: panierId,
                        masterFormationId: masterFormationId
                    }
                },
                update: {},
                create: {
                    panierId: panierId,
                    masterFormationId: masterFormationId
                }
            });
            console.log(`Linked ${panierId} -> ${masterFormationName} (${masterFormationId})`);
        } catch (error) {
            console.error(`Error linking ${panierId} -> ${masterFormationName}:`, error);
        }
    }

    console.log("Data insertion finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
