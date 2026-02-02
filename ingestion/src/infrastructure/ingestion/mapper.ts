
import { Student } from '../../domain/entities/Student';
import { School } from '../../domain/entities/School';
import { SchoolLocation } from '../../domain/entities/SchoolLocation';
import { Formation } from '../../domain/entities/Formation';

export function mapToSchool(record: any): School {
    return {
        uai: record["Code UAI de l'établissement"],
        name: record["Établissement"],
        status: record["Statut de l’établissement de la filière de formation (public, privé…)"]?.includes('Privé') ? 'Privé' : 'Public',
    };
}

export function mapToLocation(record: any): SchoolLocation {
    const gps = record["Coordonnées GPS de la formation"];

    return {
        id: `${record["Code UAI de l'établissement"]}-${record["Commune de l’établissement"]}`,
        schoolUai: record["Code UAI de l'établissement"],
        city: record["Commune de l’établissement"],
        departmentCode: record["Code départemental de l’établissement"],
        departmentName: record["Département de l’établissement"],
        region: record["Région de l’établissement"],
        academy: record["Académie de l’établissement"],
        gpsCoordinates: gps ? {
            lat: parseFloat(gps.split(',')[0]),
            long: parseFloat(gps.split(',')[1])
        } : undefined
    };
}

export function mapToFormation(record: any): Formation {
    const totalCandidates = parseInt(record["Effectif total des candidats en phase principale"], 10) || 0;
    const totalCandidatesWithAdmissionProposal = parseInt(record["Effectif total des candidats ayant reçu une proposition d’admission de la part de l’établissement"], 10) || 0;

    let admissionRate = parseFloat(record["Taux d’accès"]);
    if (isNaN(admissionRate) || admissionRate === 0) {
        if (totalCandidates > 0) {
            admissionRate = (totalCandidatesWithAdmissionProposal / totalCandidates) * 100;
        } else {
            admissionRate = 0;
        }
    }

    return {
        id: record["Session"] || record["cod_aff_form"],
        schoolUai: record["Code UAI de l'établissement"],
        locationId: `${record["Code UAI de l'établissement"]}-${record["Commune de l’établissement"]}`,
        name: record["Filière de formation"],
        filiereFormationDetaillee: Array.isArray(record["Filière de formation détaillée"]) ? record["Filière de formation détaillée"][0] : (record["Filière de formation détaillée"] || ""),
        filiereFormationDetailleeBis: Array.isArray(record["Filière de formation détaillée bis"]) ? record["Filière de formation détaillée bis"][0] : (record["Filière de formation détaillée bis"] || ""),
        filiereTresDetaillee: Array.isArray(record["Filière de formation très détaillée"]) ? record["Filière de formation très détaillée"][0] : (record["Filière de formation très détaillée"] || undefined),
        parcoursupLink: record["Lien de la formation sur la plateforme Parcoursup"] || undefined,
        category: Array.isArray(record["Filière de formation très agrégée"]) ? record["Filière de formation très agrégée"][0] : record["Filière de formation très agrégée"],
        selectivity: record["Sélectivité"],
        capacity: parseInt(record["Capacité de l’établissement par formation"], 10) || 0,
        totalCandidates,
        totalCandidatesWithAdmissionProposal,
        stats: {
            admissionRate: admissionRate,
            lastCalledRank: parseInt(record["Rang du dernier appelé du groupe 1"], 10) || 0,
            genderParity: parseFloat(record["% d’admis dont filles"]) || 0,
            mentionDistribution: {
                "Felicitations": parseFloat(record["% d’admis néo bacheliers avec mention Très Bien avec félicitations au bac"]) || 0,
                "TB": parseFloat(record["% d’admis néo bacheliers avec mention Très Bien au bac"]) || 0,
                "B": parseFloat(record["% d’admis néo bacheliers avec mention Bien au bac"]) || 0,
                "AB": parseFloat(record["% d’admis néo bacheliers avec mention Assez Bien au bac"]) || 0,
                "SansMention": parseFloat(record["% d’admis néo bacheliers sans mention au bac"]) || 0
            }
        }
    };
}
