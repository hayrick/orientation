import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, School as SchoolIcon, Trophy, Info, Home, Loader2, ExternalLink, Star, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { PanierDetail, PanierSchoolStats, Specialty, SpecialtyAdmissionRate } from '../types';
import { useUserProfile } from '../context/UserProfileContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// School icon mapping for visual variety
const schoolIcons = [GraduationCap, SchoolIcon, Trophy];

export function CPGEPage() {
    const { profile, toggleFavorite, isFavorite } = useUserProfile();
    const [types, setTypes] = useState<string[]>([]);
    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [studentGrade, setStudentGrade] = useState<number>(profile?.grade ?? 16.5);
    const [paniers, setPaniers] = useState<PanierDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null);

    // Specialty selection state
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [specialty1, setSpecialty1] = useState<string>('');
    const [specialty2, setSpecialty2] = useState<string>('');
    const [admissionRates, setAdmissionRates] = useState<Record<string, SpecialtyAdmissionRate>>({});

    const sliderRef = useRef<HTMLDivElement>(null);
    const zoneRefs = useRef<Record<string, HTMLElement | null>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const zone2Ref = useRef<HTMLDivElement>(null);
    const [renderKey, setRenderKey] = useState(0);

    // Fetch available CPGE types
    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/formations/paniers/types`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setTypes(data);
                    if (data.length > 0 && !selectedType) setSelectedType(data[0]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch CPGE types", err);
                setError("Erreur lors du chargement des types de CPGE");
            })
            .finally(() => setLoading(false));
    }, []);

    // Fetch available specialties
    useEffect(() => {
        fetch(`${API_URL}/specialties/`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSpecialties(data);
                    // Set default selections (most common: Maths + Physics-Chem)
                    if (data.length >= 2) {
                        const s1Id = profile?.specialty1Id || 'maths';
                        const s2Id = profile?.specialty2Id || 'physique-chimie';
                        const s1 = data.find((s: Specialty) => s.id === s1Id);
                        const s2 = data.find((s: Specialty) => s.id === s2Id);
                        if (s1) setSpecialty1(s1.id);
                        if (s2) setSpecialty2(s2.id);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch specialties", err));
    }, []);

    // Fetch admission rates when specialties change
    useEffect(() => {
        if (specialty1 && specialty2 && specialty1 !== specialty2) {
            fetch(`${API_URL}/specialties/admission-rates-by-specialties?specialty1=${specialty1}&specialty2=${specialty2}`)
                .then(res => res.json())
                .then(data => {
                    if (data && typeof data === 'object') {
                        setAdmissionRates(data);
                    }
                })
                .catch(err => console.error("Failed to fetch admission rates", err));
        } else {
            setAdmissionRates({});
        }
    }, [specialty1, specialty2]);

    // Fetch data for selected type
    useEffect(() => {
        if (selectedType) {
            setLoading(true);
            setHoveredSchoolId(null); // Reset hovering when switching type
            fetch(`${API_URL}/formations/paniers/by-type?cpge_type=${encodeURIComponent(selectedType)}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setPaniers(data);
                })
                .catch(err => {
                    console.error("Failed to fetch data", err);
                    setError("Erreur lors du chargement des données");
                })
                .finally(() => setLoading(false));
        }
    }, [selectedType]);

    const rawSchools = useMemo(() => {
        const seen = new Set();
        const schools: PanierSchoolStats[] = [];
        paniers.forEach(p => {
            p.school_stats.forEach(s => {
                if (!seen.has(s.schoolUai)) {
                    seen.add(s.schoolUai);
                    schools.push(s);
                }
            });
        });
        return schools.sort((a, b) => (b.moyenneBac || 0) - (a.moyenneBac || 0));
    }, [paniers]);

    const allSchools = useMemo(() => {
        const schools = selectedDept
            ? rawSchools.filter(s => s.school?.locations?.some(l => l.departmentCode === selectedDept))
            : rawSchools;
        return schools;
    }, [rawSchools, selectedDept]);

    const availableDepts = useMemo(() => {
        const deptsMap = new Map<string, string>();
        rawSchools.forEach(s => {
            s.school?.locations?.forEach(loc => {
                if (loc.departmentCode) {
                    deptsMap.set(loc.departmentCode, loc.departmentName || loc.departmentCode);
                }
            });
        });
        return Array.from(deptsMap.entries())
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.code.localeCompare(b.code));
    }, [rawSchools]);

    // Force re-render of SVG connections when layout changes
    useLayoutEffect(() => {
        const timer = setTimeout(() => setRenderKey(k => k + 1), 100);
        return () => clearTimeout(timer);
    }, [allSchools.length, paniers.length, studentGrade, hoveredSchoolId]);

    // Slider constants
    const MIN_GRADE = 8;
    const MAX_GRADE = 20;
    const getGradeY = (grade: number) => {
        const percentage = ((grade - MIN_GRADE) / (MAX_GRADE - MIN_GRADE)) * 100;
        return 100 - percentage;
    };

    const handleSliderClick = (e: React.MouseEvent | React.TouchEvent) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
        const percentage = 1 - y / rect.height;
        const grade = MIN_GRADE + percentage * (MAX_GRADE - MIN_GRADE);
        setStudentGrade(Math.round(grade * 10) / 10);
    };

    const handleSliderDrag = (e: React.MouseEvent) => {
        if (e.buttons !== 1) return;
        handleSliderClick(e);
    };

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-blue-500/30 overflow-hidden font-sans">
            {/* Top Bar: Specialty Filters (left) + CPGE Type Buttons (center) + Dept Filter (right) */}
            <div className="fixed top-0 left-0 right-0 z-50 py-2 px-4 flex items-center justify-between">
                {/* Left: Specialty Dropdowns */}
                <div className="flex items-center gap-2">
                    <select
                        value={specialty1}
                        onChange={(e) => setSpecialty1(e.target.value)}
                        className="bg-purple-500/10 border border-purple-400/30 rounded-lg px-2 py-1 text-xs font-medium text-purple-200 focus:ring-2 focus:ring-purple-500 outline-none hover:bg-purple-500/20 transition-all cursor-pointer"
                    >
                        <option value="" className="bg-slate-900">Spé 1</option>
                        {specialties.filter(s => s.id !== specialty2).map(spec => (
                            <option key={spec.id} value={spec.id} className="bg-slate-900">
                                {spec.shortName}
                            </option>
                        ))}
                    </select>
                    <span className="text-white/30">+</span>
                    <select
                        value={specialty2}
                        onChange={(e) => setSpecialty2(e.target.value)}
                        className="bg-purple-500/10 border border-purple-400/30 rounded-lg px-2 py-1 text-xs font-medium text-purple-200 focus:ring-2 focus:ring-purple-500 outline-none hover:bg-purple-500/20 transition-all cursor-pointer"
                    >
                        <option value="" className="bg-slate-900">Spé 2</option>
                        {specialties.filter(s => s.id !== specialty1).map(spec => (
                            <option key={spec.id} value={spec.id} className="bg-slate-900">
                                {spec.shortName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Center: CPGE Type Buttons */}
                <div className="flex gap-2 flex-wrap justify-center">
                    {types.map(type => {
                        const rate = admissionRates[type];
                        // Shorten the labels
                        const shortLabel = type
                            .replace('Mathématiques', 'Maths')
                            .replace('Lettres et sciences sociales', 'B/L')
                            .replace('Économique et commerciale', 'ECG')
                            .replace('Lettres', 'Lettres');
                        return (
                            <div key={type} className="relative">
                                <button
                                    onClick={() => setSelectedType(type)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border",
                                        selectedType === type
                                            ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 glow-cyan"
                                            : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30"
                                    )}
                                >
                                    {shortLabel}
                                </button>
                                {rate?.admissionRatePct && (
                                    <div className={cn(
                                        "absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black border shadow-lg",
                                        rate.admissionRatePct >= 70
                                            ? "bg-green-500/30 border-green-400/50 text-green-300"
                                            : rate.admissionRatePct >= 50
                                                ? "bg-yellow-500/30 border-yellow-400/50 text-yellow-300"
                                                : "bg-orange-500/30 border-orange-400/50 text-orange-300"
                                    )}>
                                        {rate.admissionRatePct.toFixed(0)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right: Department Filter */}
                <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-medium text-white focus:ring-2 focus:ring-cyan-500 outline-none hover:bg-white/15 transition-all cursor-pointer"
                >
                    <option value="" className="bg-slate-900">Département</option>
                    {availableDepts.map(dept => (
                        <option key={dept.code} value={dept.code} className="bg-slate-900">
                            {dept.code} - {dept.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] bg-red-500/20 border border-red-500/50 rounded-xl px-6 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            {/* Main Content */}
            <main ref={containerRef} className="pt-14 pb-24 h-screen grid grid-cols-[140px_1fr_400px] relative overflow-hidden">

                {/* ZONE 1: GRADE SLIDER */}
                <div className="h-[calc(100%-120px)] flex flex-col items-center justify-center px-6">
                    <div className="text-center mb-6">
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Votre Moyenne</div>
                        <div className="text-5xl font-black text-white tabular-nums">
                            {studentGrade.toFixed(1)}
                            <span className="text-xl text-white/40 font-normal">/20</span>
                        </div>
                        <div className="text-xs text-cyan-400 font-medium mt-1">+0.5</div>
                    </div>

                    <div
                        ref={sliderRef}
                        onMouseDown={handleSliderClick}
                        onMouseMove={handleSliderDrag}
                        className="relative w-3 h-[400px] rounded-full cursor-pointer group overflow-hidden"
                        style={{
                            background: 'linear-gradient(to top, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {/* Fill gradient from bottom to current grade */}
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 rounded-full"
                            animate={{ height: `${100 - getGradeY(studentGrade)}%` }}
                            style={{
                                background: 'linear-gradient(to top, #3b82f6, #06b6d4)',
                                boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
                            }}
                        />

                        {/* Scale Ticks */}
                        {[20, 18, 16, 14, 12, 10, 8].map(grade => (
                            <div
                                key={grade}
                                className="absolute right-full mr-3 flex items-center gap-1.5 -translate-y-1/2"
                                style={{ top: `${getGradeY(grade)}%` }}
                            >
                                <span className="text-[9px] font-bold text-white/30 tabular-nums">{grade}</span>
                            </div>
                        ))}

                        {/* Student Handle */}
                        <motion.div
                            animate={{ top: `${getGradeY(studentGrade)}%` }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-4 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.8)] z-50 cursor-grab active:cursor-grabbing"
                        />
                    </div>
                </div>

                {/* ZONE 2: FORMATIONS (Circular Bubbles) */}
                <div ref={zone2Ref} className="relative overflow-visible flex flex-col items-center justify-start p-8 border-l border-white/5">
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-bold text-white/80">Formations</h2>
                    </div>

                    {/* SVG Connections Layer */}
                    <svg key={renderKey} className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                        <defs>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                            </linearGradient>
                        </defs>

                        {/* Connections from slider to schools */}
                        {allSchools.slice(0, 20).map((school, idx) => {
                            const expected = school.moyenneBac;
                            const diff = expected ? studentGrade - expected : null;

                            let statusColor = "#6b7280"; // Gray default
                            if (diff !== null) {
                                if (diff >= -0.5) statusColor = "#10b981";      // Green
                                else if (diff >= -1.0) statusColor = "#f59e0b"; // Yellow
                                else statusColor = "#ef4444";                    // Red
                            }

                            const bubbleRef = zoneRefs.current[`bubble-${school.schoolUai}`];

                            if (!bubbleRef || !sliderRef.current || !zone2Ref.current) return null;

                            const bubbleRect = bubbleRef.getBoundingClientRect();
                            const zone2Rect = zone2Ref.current.getBoundingClientRect();
                            const sliderRect = sliderRef.current.getBoundingClientRect();

                            // Calculate start point (from slider)
                            const x1 = sliderRect.right - zone2Rect.left + 10;
                            const y1 = sliderRect.top - zone2Rect.top + (sliderRect.height * getGradeY(studentGrade) / 100);
                            // Calculate end point (bubble center)
                            const x2 = bubbleRect.left - zone2Rect.left + bubbleRect.width / 2;
                            const y2 = bubbleRect.top - zone2Rect.top + bubbleRect.height / 2;

                            const isHovered = hoveredSchoolId === school.schoolUai;
                            const opacity = hoveredSchoolId ? (isHovered ? 1 : 0.1) : 0.3;

                            return (
                                <motion.path
                                    key={`conn-${school.schoolUai}`}
                                    d={`M ${x1} ${y1} C ${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`}
                                    stroke={isHovered ? statusColor : (statusColor === "#6b7280" ? "#374151" : statusColor)}
                                    strokeWidth={isHovered ? 2.5 : 1}
                                    fill="none"
                                    filter={isHovered ? "url(#glow)" : undefined}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity }}
                                    transition={{ duration: 0.8, delay: idx * 0.02 }}
                                />
                            );
                        })}

                        {/* Connections from schools to paniers */}
                        {hoveredSchoolId && paniers.map(panier => {
                            const schoolInPanier = panier.school_stats.find(s => s.schoolUai === hoveredSchoolId);
                            if (!schoolInPanier) return null;

                            const bubbleRef = zoneRefs.current[`bubble-${hoveredSchoolId}`];
                            const panierRef = zoneRefs.current[`panier-${panier.id}`];

                            if (!bubbleRef || !panierRef || !zone2Ref.current) return null;

                            const bubbleRect = bubbleRef.getBoundingClientRect();
                            const panierRect = panierRef.getBoundingClientRect();
                            const zone2Rect = zone2Ref.current.getBoundingClientRect();

                            // Calculate from bubble right edge to panier left edge
                            const x1 = bubbleRect.right - zone2Rect.left;
                            const y1 = bubbleRect.top - zone2Rect.top + bubbleRect.height / 2;
                            const x2 = panierRect.left - zone2Rect.left;
                            const y2 = panierRect.top - zone2Rect.top + panierRect.height / 2;

                            return (
                                <g key={`panier-conn-${panier.id}`}>
                                    <motion.path
                                        d={`M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`}
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        strokeDasharray="6 4"
                                        fill="none"
                                        filter="url(#glow)"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.5 }}
                                    />
                                    <motion.g
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="16" fill="#1e293b" stroke="#3b82f6" strokeWidth="1" />
                                        <text
                                            x={(x1 + x2) / 2}
                                            y={(y1 + y2) / 2}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="text-[9px] font-bold fill-cyan-400"
                                        >
                                            {schoolInPanier.tauxIntegrationPct ?? schoolInPanier.moyenneMultiAnsPct ?? 0}%
                                        </text>
                                    </motion.g>
                                </g>
                            );
                        })}
                    </svg>

                    {/* School Bubbles Grid */}
                    <div className="relative z-10 flex flex-wrap justify-center gap-5 max-w-[900px] overflow-y-auto overflow-x-visible max-h-[calc(100vh-280px)] px-8 pt-6 pb-8 m-2">
                        {allSchools.slice(0, 20).map((school, idx) => {
                            // Get the expected grade - fallback logic:
                            // 1. Use moyenneBac from this school/type
                            // 2. Try to find moyenneBac from same school, different CPGE type
                            // 3. Default to 15
                            let expected = school.moyenneBac;
                            if (!expected) {
                                // Try to find another stat from the same school
                                const otherStat = allSchools.find(
                                    s => s.schoolUai === school.schoolUai && s.moyenneBac && s !== school
                                );
                                expected = otherStat?.moyenneBac ?? 15;
                            }

                            const gradeDiff = studentGrade - expected;
                            const isHovered = hoveredSchoolId === school.schoolUai;
                            const IconComponent = schoolIcons[idx % schoolIcons.length];

                            // Get the specialty admission rate for the selected CPGE type
                            const specialtyRate = admissionRates[selectedType]?.admissionRatePct ?? null;

                            // Custom grade score mapping with linear interpolation:
                            // diff = -3 → 10, -2 → 35, -1 → 50, 0 → 70, +1 → 90, +2 → 100
                            const gradePoints = [
                                { diff: -3, score: 10 },
                                { diff: -2, score: 35 },
                                { diff: -1, score: 50 },
                                { diff: 0, score: 70 },
                                { diff: 1, score: 90 },
                                { diff: 2, score: 100 },
                            ];
                            let gradeScore = gradeDiff <= -3 ? 10 : gradeDiff >= 2 ? 100 : 50;
                            for (let i = 0; i < gradePoints.length - 1; i++) {
                                const p1 = gradePoints[i];
                                const p2 = gradePoints[i + 1];
                                if (gradeDiff >= p1.diff && gradeDiff <= p2.diff) {
                                    const t = (gradeDiff - p1.diff) / (p2.diff - p1.diff);
                                    gradeScore = p1.score + t * (p2.score - p1.score);
                                    break;
                                }
                            }

                            // Specialty score: already 0-100
                            const specialtyScore = specialtyRate ?? 50; // Default to 50% if no data

                            // Weighted combined score (0-100): 50% grade + 50% specialty
                            const combinedScore = gradeScore * 0.5 + specialtyScore * 0.5;

                            let statusClass = "border-gray-500/30 from-gray-500/10 to-gray-600/5";
                            let textClass = "text-gray-400";
                            let iconClass = "text-gray-500";

                            // Color based on combined score
                            if (combinedScore > 80) {
                                // Bright green
                                statusClass = "border-green-400/50 from-green-400/20 to-green-500/10";
                                textClass = "text-green-300";
                                iconClass = "text-green-300";
                            } else if (combinedScore > 60) {
                                // Green
                                statusClass = "border-emerald-500/30 from-emerald-500/10 to-emerald-600/5";
                                textClass = "text-emerald-400";
                                iconClass = "text-emerald-400";
                            } else if (combinedScore > 50) {
                                // Amber
                                statusClass = "border-amber-500/30 from-amber-500/10 to-amber-600/5";
                                textClass = "text-amber-400";
                                iconClass = "text-amber-400";
                            } else if (combinedScore > 40) {
                                // Dark amber
                                statusClass = "border-orange-500/30 from-orange-500/10 to-orange-600/5";
                                textClass = "text-orange-400";
                                iconClass = "text-orange-400";
                            } else {
                                // Red (< 35, with buffer zone 35-40 as dark amber)
                                statusClass = "border-red-500/30 from-red-500/10 to-red-600/5";
                                textClass = "text-red-400";
                                iconClass = "text-red-400";
                            }

                            return (
                                <motion.div
                                    key={school.schoolUai}
                                    ref={el => zoneRefs.current[`bubble-${school.schoolUai}`] = el}
                                    onMouseEnter={() => setHoveredSchoolId(school.schoolUai)}
                                    onMouseLeave={() => setHoveredSchoolId(null)}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{
                                        opacity: hoveredSchoolId ? (isHovered ? 1 : 0.4) : 1,
                                        scale: isHovered ? 1.1 : 1,
                                    }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    className={cn(
                                        "relative w-[110px] h-[110px] rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                                        "border backdrop-blur-sm group p-2 bg-gradient-to-br",
                                        statusClass,
                                        isHovered && "glow-blue border-white/40"
                                    )}
                                >
                                    {/* Parcoursup Link - Top Center */}
                                    {school.parcoursupLink && (
                                        <div className="absolute top-1.5 left-0 right-0 flex justify-center z-20">
                                            <a
                                                href={school.parcoursupLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 rounded-full bg-white/5 hover:bg-cyan-500/20 text-white/30 hover:text-cyan-400 transition-all"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}

                                    {/* School name - Centered */}
                                    <div className="text-[9px] font-bold text-center leading-tight text-white/90 line-clamp-3 px-1 h-8 flex items-center justify-center">
                                        {school.school?.name?.split(' ').slice(0, 4).join(' ')}
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex gap-2 mt-1">
                                        {/* Average Bac Grade */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-[6px] text-white/40 uppercase">Moy</span>
                                            <span className={cn(
                                                "text-[9px] font-bold",
                                                textClass
                                            )}>
                                                {school.moyenneBac ? school.moyenneBac.toFixed(1) : '--'}
                                            </span>
                                        </div>
                                        {/* Admission Rate */}
                                        <div className="flex flex-col items-center">
                                            <span className="text-[6px] text-white/40 uppercase">Accès</span>
                                            <span className="text-[9px] font-bold text-white/70">
                                                {school.admissionRate ? `${Math.round(school.admissionRate)}%` : '--'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Favorite Star */}
                                    {profile && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(school.id); }}
                                            className="absolute bottom-1.5 right-1.5 p-0.5 rounded-full hover:bg-white/10 transition-all z-20"
                                        >
                                            <Star className={`w-3 h-3 transition-all ${isFavorite(school.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white/20 hover:text-yellow-400'}`} />
                                        </button>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* ZONE 3: PANIERS DE FORMATIONS */}
                <div className="h-full border-l border-white/5 p-6 overflow-y-auto">
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-bold text-white/80">Paniers de Formations</h2>
                        <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                            {allSchools.length} prépas disponibles
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Sort paniers: non-large first, large last */}
                        {[...paniers]
                            .sort((a, b) => {
                                const aLarge = a.name.toLowerCase().includes('large');
                                const bLarge = b.name.toLowerCase().includes('large');
                                if (aLarge && !bLarge) return 1;
                                if (!aLarge && bLarge) return -1;
                                return 0;
                            })
                            .map((panier, panierIdx) => {
                                const filteredPanierSchools = selectedDept
                                    ? panier.school_stats.filter(s => s.school?.locations?.some(l => l.departmentCode === selectedDept))
                                    : panier.school_stats;

                                if (filteredPanierSchools.length === 0 && selectedDept) return null;

                                const schoolHoveredStats = hoveredSchoolId ? panier.school_stats.find(s => s.schoolUai === hoveredSchoolId) : null;
                                const isCibled = !!schoolHoveredStats;
                                const isLarge = panier.name.toLowerCase().includes('large');
                                const isTop8 = panier.name.toLowerCase().includes('top 8');

                                return (
                                    <motion.div
                                        key={panier.id}
                                        ref={el => zoneRefs.current[`panier-${panier.id}`] = el}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                            scale: isCibled ? 1.02 : 1,
                                        }}
                                        className={cn(
                                            "relative rounded-2xl glass-strong transition-all duration-300",
                                            isLarge ? "p-4" : "p-2",
                                            isCibled && "border-cyan-500/50 glow-cyan"
                                        )}
                                    >
                                        {/* Percentage Badge - Only show when school is hovered */}
                                        <div className={cn(
                                            "absolute -top-1.5 -right-1.5 rounded-full bg-slate-900 border flex items-center justify-center transition-all",
                                            isLarge ? "w-10 h-10" : "w-8 h-8",
                                            isCibled ? "border-cyan-400/50" : "border-white/10"
                                        )}>
                                            {isCibled ? (
                                                <span className={cn(
                                                    "font-black text-cyan-400",
                                                    isLarge ? "text-xs" : "text-[10px]"
                                                )}>
                                                    {schoolHoveredStats.moyenneMultiAnsPct ?? schoolHoveredStats.tauxIntegrationPct ?? 0}%
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-medium text-white/30">--</span>
                                            )}
                                        </div>

                                        {/* Header */}
                                        <div className="flex items-start gap-2 mb-1 pr-8">
                                            <div className={cn(
                                                "font-bold text-white/40 uppercase tracking-wider",
                                                isLarge ? "text-[10px]" : "text-[8px]"
                                            )}>
                                                PANIER {panierIdx + 1}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "font-bold text-white",
                                            isLarge ? "text-sm mb-2" : "text-xs mb-1"
                                        )}>
                                            {panier.name}
                                            {panier.url && (
                                                <a
                                                    href={panier.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center ml-1.5 align-middle p-0.5 rounded-md hover:bg-cyan-500/20 text-white/30 hover:text-cyan-400 transition-all"
                                                >
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            )}
                                        </div>

                                        {/* MasterFormations - show for "panier large" and "Top 8" */}
                                        {(isLarge || isTop8) && panier.master_formations.length > 0 && (
                                            <div className="mb-3">
                                                <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Grandes Écoles</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {panier.master_formations.slice(0, 6).map((mf) => (
                                                        <span
                                                            key={mf.id}
                                                            className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70"
                                                        >
                                                            {mf.name}
                                                        </span>
                                                    ))}
                                                    {panier.master_formations.length > 6 && (
                                                        <span className="text-[8px] px-1.5 py-0.5 text-white/40">
                                                            +{panier.master_formations.length - 6}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    </motion.div>
                                );
                            })}
                    </div>

                    {/* Info Card */}
                    <div className="mt-8 p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
                        <div className="flex items-start gap-3">
                            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-bold text-white/80 mb-1">Conseil</div>
                                <p className="text-[10px] text-white/40 leading-relaxed">
                                    Survolez une école pour voir son taux d'intégration spécifique dans chaque panier.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 h-14 glass-strong border-t border-white/10 flex items-center justify-center gap-4 z-50">
                <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Home className="w-4 h-4" />
                    <span className="text-sm font-medium">Accueil</span>
                </Link>
                <Link
                    to="/licences"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-400/30 text-purple-300 hover:bg-purple-500/20 transition-all"
                >
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-sm font-medium">Licences</span>
                </Link>
                <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Profil</span>
                </Link>
            </nav>
        </div>
    );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <button className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
            active
                ? "text-cyan-400"
                : "text-white/40 hover:text-white/70"
        )}>
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
            {active && <div className="w-1 h-1 rounded-full bg-cyan-400" />}
        </button>
    );
}
