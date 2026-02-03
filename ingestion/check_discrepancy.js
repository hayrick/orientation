const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const uai = '0750699C'
    console.log(`--- Janson-de-Sailly (UAI: ${uai}) ---`)

    // 1. Get unique CPGE Types from Paniers where Janson has stats
    const stats = await prisma.panierSchoolStats.findMany({
        where: { schoolUai: uai },
        include: { panier: true }
    })

    const panierTypes = [...new Set(stats.map(s => s.panier.cpgeType))].sort()
    console.log('\n--- CPGE Types in l\'Etudiant (Paniers) ---')
    panierTypes.forEach(t => console.log(`- ${t}`))

    // 2. Get unique Filiere Bis from Formations in Parcoursup
    const formations = await prisma.formation.findMany({
        where: { schoolUai: uai, category: { contains: 'CPGE' } }
    })

    const psupFilieres = [...new Set(formations.map(f => f.filiereFormationDetailleeBis))].sort()
    console.log('\n--- Filieres in Parcoursup (Formations) ---')
    psupFilieres.forEach(f => console.log(`- ${f}`))

    console.log('\n--- Analysis ---')
    console.log('Comparison of l\'Etudiant types vs Parcoursup filieres:')

    // Find types in l'Etudiant that are NOT in Parcoursup
    const missingInPsup = panierTypes.filter(t => !psupFilieres.includes(t))
    console.log(`Types in l'Etudiant but NOT in Parcoursup: ${missingInPsup.join(', ') || 'None'}`)

    // Find filieres in Parcoursup that are NOT in l'Etudiant
    const missingInEtudiant = psupFilieres.filter(f => !panierTypes.includes(f))
    console.log(`Filieres in Parcoursup but NOT in l'Etudiant: ${missingInEtudiant.join(', ') || 'None'}`)
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect())
