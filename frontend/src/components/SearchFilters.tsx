import { Search } from 'lucide-react';

interface SearchFiltersProps {
    filters: {
        city: string;
        department: string;
        category: string;
        schoolName: string;
        minAdmissionRate: number;
        filiereBis?: string[];
    };
    categories: string[];
    cpgeFilieres?: string[];
    onFilterChange: (key: string, value: any) => void;
}

export function SearchFilters({ filters, categories, cpgeFilieres, onFilterChange }: SearchFiltersProps) {
    const handleFiliereChange = (filiere: string) => {
        const current = filters.filiereBis || [];
        const newSelection = current.includes(filiere)
            ? current.filter(f => f !== filiere)
            : [...current, filiere];
        onFilterChange('filiereBis', newSelection);
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2 text-blue-500" />
                Filtrer les Formations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Etablissement</label>
                    <input
                        type="text"
                        value={filters.schoolName}
                        onChange={(e) => onFilterChange('schoolName', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. Lycée..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Ville (City)</label>
                    <input
                        type="text"
                        value={filters.city}
                        onChange={(e) => onFilterChange('city', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. Paris"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Département</label>
                    <input
                        type="text"
                        value={filters.department}
                        onChange={(e) => onFilterChange('department', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. 75"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Catégorie</label>
                    <select
                        value={filters.category}
                        onChange={(e) => onFilterChange('category', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
                    >
                        <option value="">Toutes les catégories</option>
                        {Array.isArray(categories) && categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Taux d'accès Min: <span className="text-white">{filters.minAdmissionRate}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={filters.minAdmissionRate}
                        onChange={(e) => onFilterChange('minAdmissionRate', Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3"
                    />
                </div>
            </div>

            {/* CPGE Advanced Filters */}
            {filters.category === 'CPGE' && cpgeFilieres && cpgeFilieres.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-sm font-bold text-gray-300 mb-3 block">Filières CPGE (Choix Multiple)</h3>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                        {cpgeFilieres.map((fil) => {
                            const isSelected = filters.filiereBis?.includes(fil);
                            return (
                                <button
                                    key={fil}
                                    onClick={() => handleFiliereChange(fil)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${isSelected
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                        }`}
                                >
                                    {fil}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
