const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const uai = '0750699C'
    console.log(`--- Janson-de-Sailly (UAI: ${uai}) ---`)

    // 1. Check Formations
    const formations = await prisma.formation.findMany({
        where: { schoolUai: uai, category: { contains: 'CPGE' } }
    })
    console.log('\n--- Parcoursup Formations ---')
    formations.forEach(f => {
        console.log(`ID: ${f.id} | Name: ${f.name} | FiliereBis: ${f.filiereFormationDetailleeBis}`)
    })

    // 2. Check PanierSchoolStats
    const stats = await prisma.panierSchoolStats.findMany({
        where: { schoolUai: uai },
        include: { panier: true }
    })
    console.log('\n--- l\'Etudiant Stats (linked via PanierSchoolStats) ---')
    stats.forEach(s => {
        console.log(`Panier: "${s.panier.name}" | CPGE Type: "${s.panier.cpgeType}"`)
    })
}

main().finally(() => prisma.$disconnect())
