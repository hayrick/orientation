const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Starting Global Data Discrepancy Audit ---\n')

    const schools = await prisma.school.findMany({
        include: {
            panierStats: {
                include: { panier: true }
            },
            formations: {
                where: { category: { contains: 'CPGE' } }
            }
        }
    })

    let totalSchools = 0
    let schoolsWithIssues = 0
    let totalIssues = 0

    const allMappings = await prisma.cpgeMapping.findMany()

    for (const school of schools) {
        if (school.panierStats.length === 0) continue
        totalSchools++

        const statsTypes = [...new Set(school.panierStats.map(s => s.panier.cpgeType))]
        const psupFilieres = [...new Set(school.formations.map(f => f.filiereFormationDetailleeBis))]

        const issues = []

        for (const type of statsTypes) {
            // Check for exact match first
            if (psupFilieres.includes(type)) continue

            // Check if there is a mapping (either global or school-specific)
            const schoolMappings = allMappings.filter(m => m.etudiantType === type && m.schoolUai === school.uai)
            const globalMappings = allMappings.filter(m => m.etudiantType === type && m.schoolUai === null)

            const relevantMappings = schoolMappings.length > 0 ? schoolMappings : globalMappings

            if (relevantMappings.length > 0) {
                // If we have mappings, check if any of the target filieres exist for this school
                const targetFilieres = relevantMappings.map(m => m.parcoursupFiliere)
                const hasMatch = targetFilieres.some(target => psupFilieres.includes(target))

                if (hasMatch) continue

                // If we have mappings but none match, it's an issue
                issues.push(`Mapped "${type}" to [${targetFilieres.join(', ')}] but school is missing all of them. (Found: [${psupFilieres.join(', ')}])`)
            } else {
                // No mapping and no exact match
                const genericMatch = psupFilieres.find(f => f && (f.includes(type) || type.includes(f)))
                if (!genericMatch) {
                    issues.push(`l'Etudiant has "${type}" but Parcoursup has NO similar filiere and NO mapping. (Found: [${psupFilieres.join(', ')}])`)
                } else {
                    issues.push(`Potential specialty mismatch: "${type}" vs "${genericMatch}" (No mapping found)`)
                }
            }
        }

        if (issues.length > 0) {
            schoolsWithIssues++
            totalIssues += issues.length
            console.log(`School: ${school.name} (${school.uai})`)
            issues.forEach(iss => console.log(`  - ISSUE: ${iss}`))
            console.log('')
        }
    }

    console.log('--- Audit Summary ---')
    console.log(`Total schools audited: ${totalSchools}`)
    console.log(`Schools with potential issues: ${schoolsWithIssues}`)
    console.log(`Total discrepancies found: ${totalIssues}`)
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect())
