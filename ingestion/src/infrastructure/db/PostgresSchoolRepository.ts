
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
        await this.prisma.$transaction(async (tx) => {
            // Upsert Schools
            for (const school of schools) {
                await tx.school.upsert({
                    where: { uai: school.uai },
                    update: { name: school.name, status: school.status },
                    create: { uai: school.uai, name: school.name, status: school.status }
                });
            }

            // Upsert Locations
            for (const loc of locations) {
                await tx.schoolLocation.upsert({
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

            // Upsert Formations
            for (const form of formations) {
                const mentionDist = JSON.stringify(form.stats.mentionDistribution || {});

                await tx.formation.upsert({
                    where: { id: form.id },
                    update: {
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
                        mentionDistribution: mentionDist,
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
                        mentionDistribution: mentionDist,
                    }
                });
            }
        }, { timeout: 120000 });
    }

    async findByUai(uai: string): Promise<School | null> {
        const raw = await this.prisma.school.findUnique({ where: { uai } });
        if (!raw) return null;
        return {
            uai: raw.uai,
            name: raw.name,
            status: raw.status as 'Public' | 'Privé' | 'Autre'
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

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }
}
