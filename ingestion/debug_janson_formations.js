const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const uai = '0750699C'
    const formations = await prisma.formation.findMany({
        where: { schoolUai: uai, category: { contains: 'CPGE' } }
    })

    console.log(`Formations for ${uai}:`)
    formations.forEach(f => {
        console.log(`- ID: ${f.id} | Name: ${f.name} | FiliereBis: ${f.filiereFormationDetailleeBis}`)
    })
}

main().finally(() => prisma.$disconnect())
