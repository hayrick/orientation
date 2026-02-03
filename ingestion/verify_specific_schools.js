const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSchool(uai) {
    const school = await prisma.school.findUnique({
        where: { uai },
        include: {
            panierStats: { include: { panier: true } },
            formations: { where: { category: { contains: 'CPGE' } } }
        }
    })

    if (!school) {
        console.log(`School ${uai} not found`)
        return
    }

    console.log(`--- Checking ${school.name} (${school.uai}) ---`)
    const psupFilieres = school.formations.map(f => f.filiereFormationDetailleeBis)
    console.log(`Parcoursup Filieres: [${psupFilieres.join(', ')}]`)

    const allMappings = await prisma.cpgeMapping.findMany()

    for (const stat of school.panierStats) {
        const type = stat.panier.cpgeType
        if (psupFilieres.includes(type)) {
            console.log(`  [OK] Exact match: ${type}`)
            continue
        }

        const schoolMappings = allMappings.filter(m => m.etudiantType === type && m.schoolUai === school.uai)
        const globalMappings = allMappings.filter(m => m.etudiantType === type && m.schoolUai === null)
        const relevantMappings = schoolMappings.length > 0 ? schoolMappings : globalMappings

        if (relevantMappings.length > 0) {
            const targets = relevantMappings.map(m => m.parcoursupFiliere)
            const hasMatch = targets.some(t => psupFilieres.includes(t))
            if (hasMatch) {
                console.log(`  [OK] Mapped "${type}" to [${targets.join(', ')}] -> Resolved.`)
            } else {
                console.log(`  [FAIL] Mapped "${type}" to [${targets.join(', ')}] but no match in Parcoursup.`)
            }
        } else {
            console.log(`  [FAIL] No match and no mapping for "${type}".`)
        }
    }
}

async function main() {
    await checkSchool('0750699C') // Janson
    await checkSchool('0750662N') // Henri IV
    await checkSchool('0750700D') // Louis-le-Grand (assumed UAI)
}

main().finally(() => prisma.$disconnect())
