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
            <div className="max-w-2xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold">Mon Profil</h1>
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
                    /* ===== Not logged in ===== */
                    <div className="space-y-8">
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
                                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                />
                                <button
                                    onClick={handleLogin}
                                    disabled={loading}
                                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
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
                    /* ===== Logged in ===== */
                    <div className="space-y-6">
                        {/* ID Badge */}
                        <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-cyan-400/20 p-4 flex items-center justify-between">
                            <div>
                                <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Votre identifiant</div>
                                <div className="text-lg font-mono font-bold text-cyan-300">{profile.id}</div>
                                <div className="text-xs text-white/40 mt-1">Notez-le pour vous reconnecter</div>
                            </div>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm"
                            >
                                <LogOut className="w-4 h-4" />
                                Déconnexion
                            </button>
                        </div>

                        {/* Profile form */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6">
                            <h2 className="text-lg font-semibold">Mes préférences</h2>

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
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {saved ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Enregistré !
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Enregistrer
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Favorites Section */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400" />
                                Mes Favoris
                                {favorites.length > 0 && (
                                    <span className="text-xs text-white/40 ml-1">({favorites.length})</span>
                                )}
                            </h2>

                            {favorites.length === 0 ? (
                                <p className="text-sm text-white/40 italic">
                                    Aucun favori. Cliquez sur l'étoile ⭐ sur les formations pour les sauvegarder ici.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {favorites.map(fav => (
                                        <div
                                            key={fav.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                                                    {fav.name}
                                                    {fav.parcoursupLink && (
                                                        <a
                                                            href={fav.parcoursupLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-0.5 rounded bg-white/5 hover:bg-cyan-500/20 text-white/30 hover:text-cyan-400 transition-all flex-shrink-0"
                                                            title="Voir sur Parcoursup"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                                                    {fav.schoolName && <span>{fav.schoolName}</span>}
                                                    {fav.city && <span>• {fav.city}</span>}
                                                    <span>• {Math.round(fav.admissionRate)}% admission</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await toggleFavorite(fav.id);
                                                    setFavorites(prev => prev.filter(f => f.id !== fav.id));
                                                }}
                                                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
                )}
            </div>
        </div>
    );
}

/* ===== Reusable Profile Form ===== */
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
        <div className="space-y-5">
            {/* Name */}
            <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Prénom</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre prénom"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>

            {/* Specialties */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Spécialité 1</label>
                    <select
                        value={specialty1}
                        onChange={(e) => setSpecialty1(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                    >
                        <option value="" className="bg-slate-900">Choisir...</option>
                        {specialties.filter(s => s.id !== specialty2).map(s => (
                            <option key={s.id} value={s.id} className="bg-slate-900">{s.shortName}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Spécialité 2</label>
                    <select
                        value={specialty2}
                        onChange={(e) => setSpecialty2(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                    >
                        <option value="" className="bg-slate-900">Choisir...</option>
                        {specialties.filter(s => s.id !== specialty1).map(s => (
                            <option key={s.id} value={s.id} className="bg-slate-900">{s.shortName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Department */}
            <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Département</label>
                <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                >
                    <option value="" className="bg-slate-900">Tous les départements</option>
                    {departments.map(d => (
                        <option key={d.code} value={d.code} className="bg-slate-900">{d.code} - {d.name}</option>
                    ))}
                </select>
            </div>

            {/* Grade */}
            <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                    Moyenne générale
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="8"
                        max="20"
                        step="0.5"
                        value={grade}
                        onChange={(e) => setGrade(parseFloat(e.target.value))}
                        className="flex-1 accent-blue-500"
                    />
                    <span className="text-xl font-bold tabular-nums w-16 text-right">
                        {grade.toFixed(1)}<span className="text-sm text-white/40">/20</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
