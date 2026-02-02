import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { SearchFilters } from './components/SearchFilters';
import { FormationCard } from './components/FormationCard';
import { FormationDetailModal } from './components/FormationDetailModal';
import { CPGEPage } from './components/CPGEPage';
import { Formation } from './types';
import { Loader2, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function HomePage() {
    const [formations, setFormations] = useState<Formation[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [cpgeFilieres, setCpgeFilieres] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const [filters, setFilters] = useState({
        city: '',
        department: '',
        category: '',
        schoolName: '',
        minAdmissionRate: 0,
        filiereBis: [] as string[],
    });

    useEffect(() => {
        if (filters.category === 'CPGE') {
            fetch(`${API_URL}/formations/filters/cpge-filieres`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setCpgeFilieres(data);
                })
                .catch(err => console.error("Failed to fetch cpge filieres", err));
        } else {
            setCpgeFilieres([]);
        }
    }, [filters.category]);

    useEffect(() => {
        fetch(`${API_URL}/formations/categories`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCategories(data);
            })
            .catch(err => console.error("Failed to fetch categories", err));
    }, []);

    const fetchFormations = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.city) params.append('city', filters.city);
            if (filters.department) params.append('department', filters.department);
            if (filters.category) params.append('category', filters.category);
            if (filters.schoolName) params.append('school_name', filters.schoolName);
            if (filters.minAdmissionRate > 0) params.append('min_admission_rate', filters.minAdmissionRate.toString());
            if (filters.filiereBis && filters.filiereBis.length > 0) {
                filters.filiereBis.forEach(f => params.append('filiere_bis', f));
            }
            params.append('page', page.toString());
            params.append('limit', limit.toString());

            const res = await fetch(`${API_URL}/formations?${params.toString()}`);
            const data = await res.json();

            if (data && Array.isArray(data.items)) {
                setFormations(data.items);
                setTotal(data.total);
            } else if (Array.isArray(data)) {
                setFormations(data);
                setTotal(data.length);
            }
        } catch (error) {
            console.error(error);
            setFormations([]);
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFormations();
        }, 500);
        return () => clearTimeout(timer);
    }, [filters, fetchFormations]);

    const handleFormationClick = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/formations/${id}`);
            const data = await res.json();
            setSelectedFormation(data);
        } catch (e) {
            console.error("Error fetching details", e);
        }
    };

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => {
            if (key === 'category' && value !== 'CPGE') {
                return { ...prev, [key]: value, filiereBis: [] };
            }
            return { ...prev, [key]: value };
        });
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col gap-8">
                <div className='text-center space-y-2 mb-4'>
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                        Trouvez votre voie <span className="text-blue-500">Parcoursup</span>
                    </h1>
                    <p className='text-gray-400 max-w-2xl mx-auto'>
                        Analysez les données réelles pour maximiser vos chances d'admission.
                    </p>
                </div>

                <SearchFilters
                    filters={filters}
                    categories={categories}
                    cpgeFilieres={cpgeFilieres}
                    onFilterChange={handleFilterChange}
                />

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {formations.map(f => (
                            <FormationCard key={f.id} formation={f} onClick={handleFormationClick} />
                        ))}
                        {formations.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-500">
                                Aucune formation trouvée. Essayez d'ajuster vos filtres.
                            </div>
                        )}
                    </div>
                )}

                {!loading && total > 0 && (
                    <div className="flex justify-center items-center space-x-4 pt-8 border-t border-gray-800">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-gray-400">
                            Page <span className="text-white font-mono">{page}</span> sur <span className="text-white font-mono">{Math.ceil(total / limit)}</span>
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= Math.ceil(total / limit)}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            <FormationDetailModal
                formation={selectedFormation}
                onClose={() => setSelectedFormation(null)}
            />
        </main>
    );
}

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-[#111827] text-white">
                <header className="border-b border-gray-800 bg-[#1F2937]/50 backdrop-blur-md sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">O</div>
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Orientation App</span>
                        </Link>

                        <nav className="flex items-center space-x-1 sm:space-x-4">
                            <Link
                                to="/"
                                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                            >
                                Recherche
                            </Link>
                            <Link
                                to="/cpge-explorer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95"
                            >
                                <BarChart3 className="w-4 h-4" />
                                <span className="hidden sm:inline">CPGE Explorer</span>
                                <span className="sm:hidden">CPGE</span>
                            </Link>
                        </nav>
                    </div>
                </header>

                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/cpge-explorer" element={<CPGEPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
