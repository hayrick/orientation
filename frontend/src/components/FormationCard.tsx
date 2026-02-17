import { Formation } from '../types';
import { MapPin, Users, TrendingUp, Star } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

interface FormationCardProps {
    formation: Formation;
    onClick: (id: string) => void;
}

export function FormationCard({ formation, onClick }: FormationCardProps) {
    const { profile, toggleFavorite, isFavorite } = useUserProfile();
    const favorited = isFavorite(formation.id);

    const handleStar = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFavorite(formation.id);
    };

    return (
        <div
            onClick={() => onClick(formation.id)}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all cursor-pointer shadow-lg hover:shadow-blue-500/10 group relative"
        >
            {/* Star button */}
            {profile && (
                <button
                    onClick={handleStar}
                    className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-all z-10"
                    title={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                    <Star
                        className={`w-4 h-4 transition-all ${favorited
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-500 hover:text-yellow-400'
                            }`}
                    />
                </button>
            )}

            <div className="flex justify-between items-start mb-4">
                <div className="pr-8">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 leading-tight">
                        {formation.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{formation.school?.name}</p>
                    {formation.filiereTresDetaillee && (
                        <p className="text-xs text-blue-300 mt-1 font-medium">{formation.filiereTresDetaillee}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${formation.selectivity === 'sélective' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                        {formation.selectivity}
                    </span>
                    {formation.panier_stats && formation.panier_stats.length > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                            L'Etudiant
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-300">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    {formation.location?.city} ({formation.location?.departmentCode})
                </div>
                <div className="flex items-center text-gray-300">
                    <Users className="w-4 h-4 mr-2 text-gray-500" />
                    {formation.capacity} places
                </div>
                <div className="flex items-center text-gray-300 col-span-2">
                    <TrendingUp className="w-4 h-4 mr-2 text-gray-500" />
                    Admission Rate: <span className="font-bold text-white ml-1">{Math.round(formation.admissionRate)}%</span>
                </div>
            </div>
        </div>
    );
}
