import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const uai = '0750699C'
    console.log(`--- Investigating School: ${uai} ---`)

    // 1. Get PanierSchoolStats and linked Paniers
    const stats = await prisma.panierSchoolStats.findMany({
        where: { schoolUai: uai },
        include: { panier: true }
    })

    console.log('\n--- PanierSchoolStats and Panier Type ---')
    if (stats.length === 0) {
        console.log('No stats found.')
    }
    stats.forEach(s => {
        console.log(`Panier: "${s.panier.name}" | CPGE Type: "${s.panier.cpgeType}"`)
    })

    // 2. Get Formations from Parcoursup
    const formations = await prisma.formation.findMany({
        where: { schoolUai: uai, category: { contains: 'CPGE' } }
    })

    console.log('\n--- Parcoursup Formations and Filiere Detaillee Bis ---')
    if (formations.length === 0) {
        console.log('No formations found.')
    }
    formations.forEach(f => {
        console.log(`Formation: "${f.name}" | Filiere Bis: "${f.filiereFormationDetailleeBis}"`)
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
