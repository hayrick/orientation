import { Formation } from '../types';
import { X, BarChart3, Star, School as SchoolIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FormationDetailModalProps {
    formation: Formation | null;
    onClose: () => void;
}

export function FormationDetailModal({ formation, onClose }: FormationDetailModalProps) {
    if (!formation) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
                >
                    <div className="sticky top-0 bg-gray-800/95 backdrop-blur border-b border-gray-700 p-6 flex justify-between items-start z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">{formation.name}</h2>
                            <div className="flex items-center text-blue-400">
                                <SchoolIcon className="w-5 h-5 mr-2" />
                                <span className="text-lg font-medium">{formation.school?.name}</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Key Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-700/50 p-4 rounded-xl">
                                <div className="text-sm text-gray-400 mb-1">Taux d'Accès</div>
                                <div className="text-3xl font-bold text-white">{Math.round(formation.admissionRate)}%</div>
                                <div className="text-xs text-gray-500 mt-2">Chance d'être accepté</div>
                            </div>

                            <div className="bg-gray-700/50 p-4 rounded-xl">
                                <div className="text-sm text-gray-400 mb-1">Capacité</div>
                                <div className="text-3xl font-bold text-white">{formation.capacity}</div>
                                <div className="text-xs text-gray-500 mt-2">Places disponibles</div>
                            </div>

                            <div className="bg-gray-700/50 p-4 rounded-xl">
                                <div className="text-sm text-gray-400 mb-1">Localisation</div>
                                <div className="text-lg font-bold text-white leading-tight">
                                    {formation.location?.city}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {formation.location?.departmentName} ({formation.location?.departmentCode})
                                </div>
                            </div>
                        </div>



                        {/* Detailed Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700/50">
                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Candidatures</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Total:</span>
                                        <span className="text-white font-mono">{formation.totalCandidates || "-"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Avec Proposition:</span>
                                        <span className="text-white font-mono">{formation.totalCandidatesWithAdmissionProposal || "-"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Dernier Appelé (Rang):</span>
                                        <span className="text-white font-mono">{formation.lastCalledRank || "-"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700/50">
                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Informations Complémentaires</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Académie:</span>
                                        <span className="text-white">{formation.location?.academy || "-"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Département:</span>
                                        <span className="text-white">{formation.location?.departmentName} ({formation.location?.departmentCode})</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                                Détails du Cursus
                            </h3>
                            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 space-y-2">
                                <p><span className="text-gray-500">Filière:</span> {formation.filiereFormationDetaillee || "N/A"}</p>
                                {formation.filiereFormationDetailleeBis && (
                                    <p><span className="text-gray-500">Filière (Bis):</span> {formation.filiereFormationDetailleeBis}</p>
                                )}
                                {formation.filiereTresDetaillee && (
                                    <p><span className="text-gray-500">Spécialité:</span> {formation.filiereTresDetaillee}</p>
                                )}
                                <p><span className="text-gray-500">Fiche Parcoursup:</span> <a href={formation.parcoursupLink} target="_blank" className="text-blue-400 hover:underline">Voir le lien</a></p>
                                <p><span className="text-gray-500">Parité:</span> {formation.genderParity ? `${Math.round(formation.genderParity)}% Femmes` : "N/A"}</p>
                            </div>
                        </div>

                        {/* Mention Distribution (if parsed) */}
                        {/* Mention Distribution (if parsed) */}
                        {formation.mentionDistribution && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center">
                                    <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
                                    Répartition des Mentions (Admis)
                                </h3>

                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 space-y-3">
                                    {/* Stacked Bar Chart */}
                                    <div className="h-6 w-full rounded-full overflow-hidden flex">
                                        {[
                                            { key: "Felicitations", color: "bg-purple-500", label: "Félicitations" },
                                            { key: "TB", color: "bg-blue-500", label: "Très Bien" },
                                            { key: "B", color: "bg-teal-400", label: "Bien" },
                                            { key: "AB", color: "bg-yellow-400", label: "Assez Bien" },
                                            { key: "SansMention", color: "bg-gray-500", label: "Sans Mention" }
                                        ].map((item) => {
                                            const value = formation.mentionDistribution?.[item.key] || 0;
                                            if (value === 0) return null;
                                            return (
                                                <div
                                                    key={item.key}
                                                    className={`${item.color} h-full transition-all duration-500`}
                                                    style={{ width: `${value}%` }}
                                                    title={`${item.label}: ${value}%`}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Legend */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                        {[
                                            { key: "Felicitations", color: "bg-purple-500", label: "Félicitations" },
                                            { key: "TB", color: "bg-blue-500", label: "Très Bien" },
                                            { key: "B", color: "bg-teal-400", label: "Bien" },
                                            { key: "AB", color: "bg-yellow-400", label: "Assez Bien" },
                                            { key: "SansMention", color: "bg-gray-500", label: "Sans Mention" }
                                        ].map((item) => {
                                            const value = formation.mentionDistribution?.[item.key] || 0;
                                            if (Math.round(value) === 0) return null;
                                            return (
                                                <div key={item.key} className="flex items-center space-x-2">
                                                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                                                    <span className="text-gray-300">{item.label} <span className="text-white font-bold">{Math.round(value)}%</span></span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* L'Etudiant Statistics */}
                        {formation.panier_stats && formation.panier_stats.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center">
                                    <BarChart3 className="w-5 h-5 mr-2 text-green-500" />
                                    Statistiques de L'Etudiant (CPGE)
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {formation.panier_stats.map((stat) => (
                                        <div key={stat.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700 space-y-4">
                                            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                                <h4 className="font-semibold text-blue-400">{stat.panier?.name || "Panier inconnu"}</h4>
                                                <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full border border-blue-800/50">
                                                    {stat.panier?.cpgeType}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="space-y-1">
                                                    <div className="text-xs text-blue-400 font-semibold">Taux Réussite (5 ans)</div>
                                                    <div className="text-xl font-bold text-white">
                                                        {stat.moyenneMultiAnsPct ? `${stat.moyenneMultiAnsPct}%` : "N/A"}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs text-gray-500">Taux Intégration (an)</div>
                                                    <div className="text-xl font-bold text-white">
                                                        {stat.tauxIntegrationPct ? `${stat.tauxIntegrationPct}%` : "N/A"}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs text-gray-500">Moyenne Bac</div>
                                                    <div className="text-xl font-bold text-white">
                                                        {stat.moyenneBac ? stat.moyenneBac.toFixed(1) : "N/A"}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs text-gray-500">Rang 5 ans</div>
                                                    <div className="text-xl font-bold text-white">
                                                        {stat.rangMultiAns || "N/A"}
                                                    </div>
                                                </div>
                                            </div>

                                            {stat.panier?.url && (
                                                <div className="pt-2">
                                                    <a
                                                        href={stat.panier.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-gray-400 hover:text-blue-400 hover:underline inline-flex items-center"
                                                    >
                                                        Source L'Etudiant
                                                        <X className="w-3 h-3 ml-1 rotate-45" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
