const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Verifying CPGE Mapping Logic ---')

    async function mockGetParcoursupTypes(cpgeType, schoolUai = null) {
        if (schoolUai) {
            const overrides = await prisma.cpgeMapping.findMany({
                where: { etudiantType: cpgeType, schoolUai: schoolUai },
                select: { parcoursupFiliere: true }
            })
            if (overrides.length > 0) return overrides.map(o => o.parcoursupFiliere)
        }

        const globals = await prisma.cpgeMapping.findMany({
            where: { etudiantType: cpgeType, schoolUai: null },
            select: { parcoursupFiliere: true }
        })
        if (globals.length > 0) return globals.map(g => g.parcoursupFiliere)

        // Hardcoded fallback
        if (cpgeType.includes('ECG')) return ['ECG']
        return [cpgeType]
    }

    // Test 1: Janson-de-Sailly Override
    const jansonUai = '0750699C'
    const jansonTypes = await mockGetParcoursupTypes('ECG - Mathématiques appliquées + HGG', jansonUai)
    console.log(`\n1. Janson-de-Sailly (0750699C) override for "Appliquées + HGG":`)
    console.log(`   Result: [${jansonTypes.join(', ')}]`)
    console.log(`   Expected: ["ECG - Mathématiques appliquées + ESH"]`)

    // Test 2: Global PSI Mapping
    const psiTypes = await mockGetParcoursupTypes('PSI')
    console.log(`\n2. Global mapping for "PSI":`)
    console.log(`   Result: [${psiTypes.join(', ')}]`)
    console.log(`   Expected: ["MPSI", "PCSI", "PTSI"]`)

    // Test 3: Normal School with ECG (No Override)
    const otherUai = '0010001A'
    const otherTypes = await mockGetParcoursupTypes('ECG - Mathématiques approfondies + ESH', otherUai)
    console.log(`\n3. Normal school override check (should use default):`)
    console.log(`   Result: [${otherTypes.join(', ')}]`)
    console.log(`   Expected: ["ECG"]`)

}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
