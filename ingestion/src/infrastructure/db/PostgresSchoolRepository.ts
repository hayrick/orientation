
import { PrismaClient } from '@prisma/client';
import { SchoolRepository } from '../../application/ports/SchoolRepository';
import { School } from '../../domain/entities/School';
import { SchoolLocation } from '../../domain/entities/SchoolLocation';
import { Formation } from '../../domain/entities/Formation';

export class PostgresSchoolRepository implements SchoolRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async saveAll(schools: School[], locations: SchoolLocation[], formations: Formation[]): Promise<void> {
        // Ideally use a transaction
        // This is a naive implementation for batch ingestion

        // Upsert Schools
        for (const school of schools) {
            await this.prisma.school.upsert({
                where: { uai: school.uai },
                update: { name: school.name, status: school.status },
                create: { uai: school.uai, name: school.name, status: school.status }
            });
        }

        for (const loc of locations) {
            await this.prisma.schoolLocation.upsert({
                where: { id: loc.id },
                update: {
                    schoolUai: loc.schoolUai,
                    city: loc.city,
                    departmentCode: loc.departmentCode,
                    departmentName: loc.departmentName,
                    region: loc.region,
                    academy: loc.academy,
                    latitude: loc.gpsCoordinates?.lat,
                    longitude: loc.gpsCoordinates?.long,
                },
                create: {
                    id: loc.id,
                    schoolUai: loc.schoolUai,
                    city: loc.city,
                    departmentCode: loc.departmentCode,
                    departmentName: loc.departmentName,
                    region: loc.region,
                    academy: loc.academy,
                    latitude: loc.gpsCoordinates?.lat,
                    longitude: loc.gpsCoordinates?.long,
                }
            });
        }

        // Upsert Locations (derived from formations locationId usually, but here passed how? 
        // The ingestion script needs to pass locations too. 
        // Let's assume the Entity model handles this separation.)

        // Upsert Formations
        for (const form of formations) {
            // Ensure location exists first (or handle via nested writes if we restructured)
            // For now, assuming locations are pre-saved or we duplicate logic here using form.locationId props
            // This part needs the Location objects to be passed or extracted.

            const mentionDist = JSON.stringify(form.stats.mentionDistribution || {}); // Cast for Prisma JSON

            await this.prisma.formation.upsert({
                where: { id: form.id },
                update: {
                    schoolUai: form.schoolUai,
                    name: form.name,
                    filiereFormationDetaillee: form.filiereFormationDetaillee,
                    filiereFormationDetailleeBis: form.filiereFormationDetailleeBis,
                    filiereTresDetaillee: form.filiereTresDetaillee,
                    parcoursupLink: form.parcoursupLink,
                    selectivity: form.selectivity,
                    capacity: form.capacity,
                    totalCandidates: form.totalCandidates,
                    totalCandidatesWithAdmissionProposal: form.totalCandidatesWithAdmissionProposal,
                    admissionRate: form.stats.admissionRate,
                    lastCalledRank: form.stats.lastCalledRank,
                    genderParity: form.stats.genderParity,
                    mentionDistribution: mentionDist || {},
                },
                create: {
                    id: form.id,
                    schoolUai: form.schoolUai,
                    locationId: form.locationId,
                    name: form.name,
                    filiereFormationDetaillee: form.filiereFormationDetaillee,
                    filiereFormationDetailleeBis: form.filiereFormationDetailleeBis,
                    filiereTresDetaillee: form.filiereTresDetaillee,
                    parcoursupLink: form.parcoursupLink,
                    category: form.category,
                    selectivity: form.selectivity,
                    capacity: form.capacity,
                    totalCandidates: form.totalCandidates,
                    totalCandidatesWithAdmissionProposal: form.totalCandidatesWithAdmissionProposal,
                    admissionRate: form.stats.admissionRate,
                    lastCalledRank: form.stats.lastCalledRank,
                    genderParity: form.stats.genderParity,
                    mentionDistribution: mentionDist || {},
                }
            });
        }
    }

    async findByUai(uai: string): Promise<School | null> {
        const raw = await this.prisma.school.findUnique({ where: { uai } });
        if (!raw) return null;
        return {
            uai: raw.uai,
            name: raw.name,
            status: raw.status as 'Public' | 'Privé' // Cast needs validation
        };
    }

    async searchFormations(criteria: { city?: string; department?: string; admissionRateMin?: number; }): Promise<Formation[]> {
        const raw = await this.prisma.formation.findMany({
            where: {
                admissionRate: { gte: criteria.admissionRateMin },
                location: {
                    city: criteria.city ? { contains: criteria.city } : undefined,
                    departmentCode: criteria.department
                }
            },
            include: { location: true }
        });

        return raw.map(f => ({
            id: f.id,
            schoolUai: f.schoolUai,
            locationId: f.locationId,
            name: f.name,
            filiereFormationDetaillee: f.filiereFormationDetaillee || "",
            filiereFormationDetailleeBis: f.filiereFormationDetailleeBis || "",
            filiereTresDetaillee: f.filiereTresDetaillee || undefined,
            parcoursupLink: f.parcoursupLink || undefined,
            category: f.category,
            selectivity: f.selectivity,
            capacity: f.capacity,
            totalCandidates: f.totalCandidates || undefined,
            totalCandidatesWithAdmissionProposal: f.totalCandidatesWithAdmissionProposal || undefined,
            stats: {
                admissionRate: f.admissionRate,
                lastCalledRank: f.lastCalledRank || undefined,
                genderParity: f.genderParity || undefined,
                mentionDistribution: f.mentionDistribution ? JSON.parse(f.mentionDistribution) : {}
            }
        }));
    }
}
