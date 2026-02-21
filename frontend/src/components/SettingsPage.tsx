import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Save, LogIn, LogOut, Plus, Home, Check, AlertCircle, Star, Trash2, ExternalLink } from 'lucide-react';
import { Specialty } from '../types';
import { useUserProfile } from '../context/UserProfileContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Department {
    code: string;
    name: string;
}

export function SettingsPage() {
    const { profile, loading, loginByName, createProfile, updateProfile, logout, toggleFavorite } = useUserProfile();

    // Form state
    const [name, setName] = useState('');
    const [specialty1, setSpecialty1] = useState('');
    const [specialty2, setSpecialty2] = useState('');
    const [department, setDepartment] = useState('');
    const [grade, setGrade] = useState(15.0);

    // Login form
    const [loginName, setLoginName] = useState('');
    const [loginError, setLoginError] = useState('');

    // Data
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    // UI
    const [saved, setSaved] = useState(false);

    // Favorites
    interface FavoriteFormation {
        id: string;
        name: string;
        category: string;
        admissionRate: number;
        schoolName: string | null;
        city: string | null;
        parcoursupLink: string | null;
    }
    const [favorites, setFavorites] = useState<FavoriteFormation[]>([]);

    // Fetch specialties and departments
    useEffect(() => {
        fetch(`${API_URL}/specialties/`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setSpecialties(data); })
            .catch(console.error);

        fetch(`${API_URL}/licences/departments`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setDepartments(data); })
            .catch(console.error);
    }, []);

    // Fetch favorites when profile loads/changes
    useEffect(() => {
        if (profile) {
            fetch(`${API_URL}/users/${profile.id}/favorites`)
                .then(res => res.json())
                .then(data => { if (Array.isArray(data)) setFavorites(data); })
                .catch(console.error);
        } else {
            setFavorites([]);
        }
    }, [profile]);

    // Sync form when profile loads
    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setSpecialty1(profile.specialty1Id || '');
            setSpecialty2(profile.specialty2Id || '');
            setDepartment(profile.department || '');
            setGrade(profile.grade ?? 15.0);
        }
    }, [profile]);

    const handleLogin = async () => {
        setLoginError('');
        if (!loginName.trim()) {
            setLoginError('Entrez votre prénom');
            return;
        }
        const ok = await loginByName(loginName.trim());
        if (!ok) {
            setLoginError('Aucun profil trouvé avec ce prénom');
        }
    };

    const handleCreate = async () => {
        const result = await createProfile({
            name: name || null,
            specialty1Id: specialty1 || null,
            specialty2Id: specialty2 || null,
            department: department || null,
            grade,
        });
        if (result) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleSave = async () => {
        const ok = await updateProfile({
            name: name || null,
            specialty1Id: specialty1 || null,
            specialty2Id: specialty2 || null,
            department: department || null,
            grade,
        });
        if (ok) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-[#111827] text-white">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Mon Profil</h1>
                            {profile && <p className="text-xs text-white/40">Gérez vos préférences et favoris</p>}
                        </div>
                    </div>
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
                    >
                        <Home className="w-4 h-4" />
                        Accueil
                    </Link>
                </div>

                {!profile ? (
                    /* ===== Not logged in - Centered View ===== */
                    <div className="max-w-md mx-auto space-y-8">
                        {/* Login with existing ID */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <LogIn className="w-5 h-5 text-cyan-400" />
                                Se connecter
                            </h2>
                            <p className="text-sm text-white/50">
                                Entrez votre prénom pour retrouver votre profil.
                            </p>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={loginName}
                                    onChange={(e) => setLoginName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    placeholder="Votre prénom"
                                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                />
                                <button
                                    onClick={handleLogin}
                                    disabled={loading}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                                >
                                    Connexion
                                </button>
                            </div>
                            {loginError && (
                                <div className="flex items-center gap-2 text-sm text-red-400">
                                    <AlertCircle className="w-4 h-4" />
                                    {loginError}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1 border-t border-white/10" />
                            <span className="text-sm text-white/30 font-medium">ou</span>
                            <div className="flex-1 border-t border-white/10" />
                        </div>

                        {/* Create new profile */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-400" />
                                Créer un profil
                            </h2>

                            <ProfileForm
                                name={name} setName={setName}
                                specialty1={specialty1} setSpecialty1={setSpecialty1}
                                specialty2={specialty2} setSpecialty2={setSpecialty2}
                                department={department} setDepartment={setDepartment}
                                grade={grade} setGrade={setGrade}
                                specialties={specialties}
                                departments={departments}
                            />

                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                                Créer mon profil
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ===== Logged in - Dashboard View ===== */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN: Profile Settings (Compact) */}
                        <div className="lg:col-span-4 space-y-4 sticky top-4">
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-5">
                                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                    <div>
                                        <h2 className="text-lg font-semibold">Préférences</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-white/40">ID:</span>
                                            <code className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono text-cyan-300 select-all">
                                                {profile.id}
                                            </code>
                                        </div>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                                        title="Déconnexion"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                </div>

                                <ProfileForm
                                    name={name} setName={setName}
                                    specialty1={specialty1} setSpecialty1={setSpecialty1}
                                    specialty2={specialty2} setSpecialty2={setSpecialty2}
                                    department={department} setDepartment={setDepartment}
                                    grade={grade} setGrade={setGrade}
                                    specialties={specialties}
                                    departments={departments}
                                />

                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 mt-2"
                                >
                                    {saved ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Enregistré
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Enregistrer
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Favorites List */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 min-h-[500px]">
                                <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                                    <Star className="w-5 h-5 text-yellow-400" />
                                    Mes Favoris
                                    {favorites.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60">
                                            {favorites.length}
                                        </span>
                                    )}
                                </h2>

                                {favorites.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center p-8 border-2 border-dashed border-white/5 rounded-xl">
                                        <Star className="w-12 h-12 text-white/10 mb-3" />
                                        <p className="text-white/40 mb-1">Aucun favori pour le moment</p>
                                        <p className="text-xs text-white/30">
                                            Explorez les formations et cliquez sur l'étoile ⭐ pour les retrouver ici.
                                        </p>
                                        <div className="flex gap-3 mt-6">
                                            <Link to="/licences" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-all">
                                                Explorer Licences
                                            </Link>
                                            <Link to="/cpge-explorer" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-all">
                                                Explorer CPGE
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {favorites.map(fav => (
                                            <div
                                                key={fav.id}
                                                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group"
                                            >
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${fav.category.includes('CPGE') ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                                                            }`}>
                                                            {fav.category}
                                                        </span>
                                                        {fav.parcoursupLink && (
                                                            <a
                                                                href={fav.parcoursupLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-white/30 hover:text-cyan-400 transition-colors"
                                                                title="Voir sur Parcoursup"
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-white truncate text-base">
                                                        {fav.name}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                                                        {fav.schoolName && <span className="flex items-center gap-1"><Home className="w-3 h-3" /> {fav.schoolName}</span>}
                                                        {fav.city && <span>• {fav.city}</span>}
                                                        <span className={fav.admissionRate < 20 ? "text-orange-400" : "text-emerald-400"}>
                                                            • {Math.round(fav.admissionRate)}% d'admission
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        await toggleFavorite(fav.id);
                                                        setFavorites(prev => prev.filter(f => f.id !== fav.id));
                                                    }}
                                                    className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Retirer des favoris"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ===== Compact Profile Form ===== */
function ProfileForm({
    name, setName,
    specialty1, setSpecialty1,
    specialty2, setSpecialty2,
    department, setDepartment,
    grade, setGrade,
    specialties,
    departments,
}: {
    name: string; setName: (v: string) => void;
    specialty1: string; setSpecialty1: (v: string) => void;
    specialty2: string; setSpecialty2: (v: string) => void;
    department: string; setDepartment: (v: string) => void;
    grade: number; setGrade: (v: number) => void;
    specialties: Specialty[];
    departments: Department[];
}) {
    return (
        <div className="space-y-3">
            {/* Row 1: Name & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">Prénom</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Prénom"
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">
                        Moyenne: <span className="text-white ml-1">{grade.toFixed(1)}</span>
                    </label>
                    <input
                        type="range"
                        min="8"
                        max="20"
                        step="0.5"
                        value={grade}
                        onChange={(e) => setGrade(parseFloat(e.target.value))}
                        className="w-full h-8 accent-cyan-500 bg-transparent cursor-pointer"
                    />
                </div>
            </div>

            {/* Row 2: Specialties */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">Spécialité 1</label>
                    <div className="relative">
                        <select
                            value={specialty1}
                            onChange={(e) => setSpecialty1(e.target.value)}
                            className="w-full appearance-none bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none transition-all cursor-pointer truncate pr-6"
                        >
                            <option value="" className="bg-slate-900">Choix 1...</option>
                            {specialties.filter(s => s.id !== specialty2).map(s => (
                                <option key={s.id} value={s.id} className="bg-slate-900">{s.shortName}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                            <Plus className="w-3 h-3 rotate-45" />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">Spécialité 2</label>
                    <div className="relative">
                        <select
                            value={specialty2}
                            onChange={(e) => setSpecialty2(e.target.value)}
                            className="w-full appearance-none bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none transition-all cursor-pointer truncate pr-6"
                        >
                            <option value="" className="bg-slate-900">Choix 2...</option>
                            {specialties.filter(s => s.id !== specialty1).map(s => (
                                <option key={s.id} value={s.id} className="bg-slate-900">{s.shortName}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                            <Plus className="w-3 h-3 rotate-45" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Department */}
            <div>
                <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">Département</label>
                <div className="relative">
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full appearance-none bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 outline-none transition-all cursor-pointer pr-8"
                    >
                        <option value="" className="bg-slate-900">Tous les départements</option>
                        {departments.map(d => (
                            <option key={d.code} value={d.code} className="bg-slate-900">{d.code} - {d.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                        <Plus className="w-3 h-3 rotate-45" />
                    </div>
                </div>
            </div>
        </div>
    );
}
