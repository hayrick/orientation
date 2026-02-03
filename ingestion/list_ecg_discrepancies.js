const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- ECG Specialty Discrepancy Report (Type 2) ---\n')
    console.log('Format: School (UAI) | l\'Etudiant Stat | Parcoursup Formation\n')

    const schools = await prisma.school.findMany({
        include: {
            panierStats: {
                include: { panier: true },
                where: { panier: { cpgeType: { contains: 'ECG' } } }
            },
            formations: {
                where: { category: { contains: 'CPGE' }, filiereFormationDetailleeBis: { contains: 'ECG' } }
            }
        }
    })

    let count = 0
    for (const school of schools) {
        if (school.panierStats.length === 0 || school.formations.length === 0) continue

        const statsTypes = [...new Set(school.panierStats.map(s => s.panier.cpgeType))].sort()
        const psupFilieres = [...new Set(school.formations.map(f => f.filiereFormationDetailleeBis))].sort()

        // Find if any stats type is missing from formations
        const discrepancies = statsTypes.filter(t => !psupFilieres.includes(t))

        if (discrepancies.length > 0) {
            count++
            console.log(`${school.name} (${school.uai})`)
            console.log(`  l'Etudiant: [${statsTypes.join(', ')}]`)
            console.log(`  Parcoursup: [${psupFilieres.join(', ')}]`)
            console.log('')
        }
    }

    console.log(`Total ECG schools with discrepancies: ${count}`)
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect())
