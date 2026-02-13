import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Home, Loader2, ExternalLink, GraduationCap } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { Specialty, SpecialtyAdmissionRate } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const API_URL = 'http://localhost:8000';

// Abbreviate licence labels using common French education shortcuts
const ABBREVIATIONS: Record<string, string> = {
    'Mathématiques': 'Maths',
    'Informatique': 'Info',
    'Economie': 'Éco',
    'Économie': 'Éco',
    'Sciences économiques': 'Sc. Éco',
    'Economie et gestion': 'Éco-Gestion',
    'Économie et gestion': 'Éco-Gestion',
    'Administration': 'Admin',
    'Administration économique et sociale': 'AES',
    'Sciences de gestion': 'Gestion',
    'Psychologie': 'Psycho',
    'Sociologie': 'Socio',
    'Géographie': 'Géo',
    'Philosophie': 'Philo',
    'Sciences politiques': 'Sc. Po',
    'Science politique': 'Sc. Po',
    'Sciences de la vie': 'Sc. Vie',
    'Sciences de la terre': 'Sc. Terre',
    'Physique': 'Physique',
    'Chimie': 'Chimie',
    'Biologie': 'Bio',
    'Langues étrangères appliquées': 'LEA',
    'Sciences du langage': 'Sc. Langage',
    'Sciences de l\'éducation': 'Sc. Édu',
    'Information et communication': 'Info-Com',
    'Histoire de l\'art': 'Hist. Art',
    'Droit': 'Droit',
    'Histoire': 'Histoire',
    'Lettres': 'Lettres',
    'Musicologie': 'Musico',
    'Arts du spectacle': 'Arts Spect.',
    'Langues, littératures et civilisations étrangères': 'LLCE',
    'Sciences et technologies': 'Sc. & Tech',
    'Mathématiques et informatique': 'Maths-Info',
    'Electronique': 'Électro',
    'Génie civil': 'Génie Civil',
    'Mécanique': 'Méca',
    'Sciences de l\'univers': 'Sc. Univers',
    'STAPS': 'STAPS',
};

function abbreviateLicence(filiereDetaillee: string | null): string {
    if (!filiereDetaillee) return 'Licence';

    // Extract the subject part by trying multiple separator patterns
    // Patterns found in data:
    //   "Université X - Licence - Mathématiques"
    //   "Université X - Double Licence - Mathématiques - Physique"
    //   "Université X - Double diplôme - ..."
    //   "Licence - Portail Mathématiques"
    let subject = filiereDetaillee;

    // Try separators in order of specificity
    const separators = [
        ' - Double Licence - ',
        ' - Double diplôme - ',
        ' - Licence - ',
        ' - Licence-  ',
    ];
    for (const sep of separators) {
        const idx = subject.lastIndexOf(sep);
        if (idx !== -1) {
            subject = subject.substring(idx + sep.length);
            break;
        }
    }

    // If subject still starts with a university name, it means no separator matched
    // Try splitting on " - " and taking the last meaningful part
    if (subject.startsWith('Universit') || subject.startsWith('Institut') || subject.startsWith('Facult')) {
        const parts = subject.split(' - ');
        // Take the last part that's not a location/school
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i].trim();
            if (p && !p.startsWith('Universit') && !p.startsWith('Institut') && !p.startsWith('Facult') && !p.startsWith('Site ')) {
                subject = p;
                break;
            }
        }
    }

    // Remove "Portail " prefix if present
    if (subject.startsWith('Portail ')) {
        subject = subject.substring(8);
    }
    // Clean up leading "Double diplôme" / "Double Licence" if still there
    subject = subject.replace(/^Double (diplôme|Licence)\s*-?\s*/i, '');

    // Try abbreviation match
    for (const [full, abbr] of Object.entries(ABBREVIATIONS)) {
        if (subject.toLowerCase().startsWith(full.toLowerCase())) {
            return abbr;
        }
    }

    // Fallback: take first 2-3 words, max ~14 chars
    const words = subject.split(/[\s-]+/).slice(0, 3);
    const result = words.join(' ');
    return result.length > 14 ? result.slice(0, 12) + '…' : result;
}

interface LicenceFormation {
    id: string;
    name: string;
    filiereDetaillee: string;
    admissionRate: number | null;
    capacity: number | null;
    selectivity: string | null;
    parcoursupLink: string | null;
    mentionDistribution: string | null; // JSON: {Felicitations, TB, B, AB, SansMention}
    school: {
        uai: string;
        name: string;
        city: string | null;
        departmentCode: string | null;
    } | null;
}

interface MentionData {
    Felicitations: number;
    TB: number;
    B: number;
    AB: number;
    SansMention: number;
}

interface Department {
    code: string;
    name: string;
}

export function LicencesPage() {
    const [licenceTypes, setLicenceTypes] = useState<string[]>([]);
    const [selectedType, setSelectedType] = useState<string>('');
    const [formations, setFormations] = useState<LicenceFormation[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [specialty1, setSpecialty1] = useState<string>('maths');
    const [specialty2, setSpecialty2] = useState<string>('physique-chimie');
    const [admissionRates, setAdmissionRates] = useState<Record<string, SpecialtyAdmissionRate>>({});
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [studentGrade, setStudentGrade] = useState(15.0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoveredFormation, setHoveredFormation] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [renderKey, setRenderKey] = useState(0);

    const sliderRef = useRef<HTMLDivElement>(null);
    const zone2Ref = useRef<HTMLDivElement>(null);
    const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Grade slider helpers (same as CPGE)
    const getGradeY = (grade: number) => ((20 - grade) / 12) * 100;
    const getGradeFromY = (yPercent: number) => Math.max(8, Math.min(20, 20 - (yPercent / 100) * 12));

    const handleSliderClick = useCallback((e: React.MouseEvent) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const y = (e.clientY - rect.top) / rect.height * 100;
        setStudentGrade(Math.round(getGradeFromY(y) * 2) / 2);
        setIsDragging(true);
    }, []);

    const handleSliderDrag = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const y = (e.clientY - rect.top) / rect.height * 100;
        setStudentGrade(Math.round(getGradeFromY(y) * 2) / 2);
    }, [isDragging]);

    useEffect(() => {
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    // Fetch licence types on mount
    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/licences/types`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setLicenceTypes(data);
                    if (data.length > 0) setSelectedType(data[0]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch licence types", err);
                setError("Erreur lors du chargement des types de Licence");
            })
            .finally(() => setLoading(false));
    }, []);

    // Fetch specialties on mount
    useEffect(() => {
        fetch(`${API_URL}/specialties/`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSpecialties(data);
                }
            })
            .catch(err => console.error("Failed to fetch specialties", err));
    }, []);

    // Fetch admission rates when specialties change
    useEffect(() => {
        if (specialty1 && specialty2 && specialty1 !== specialty2) {
            fetch(`${API_URL}/licences/admission-rates?specialty1=${specialty1}&specialty2=${specialty2}`)
                .then(res => res.json())
                .then(data => setAdmissionRates(data))
                .catch(err => console.error("Failed to fetch admission rates", err));
        }
    }, [specialty1, specialty2]);

    // Fetch formations when type or department changes
    useEffect(() => {
        if (selectedType) {
            const params = new URLSearchParams({ licence_type: selectedType });
            if (selectedDept) params.append('department', selectedDept);

            fetch(`${API_URL}/licences/formations?${params}`)
                .then(res => res.json())
                .then(data => setFormations(data))
                .catch(err => console.error("Failed to fetch formations", err));
        }
    }, [selectedType, selectedDept]);

    // Re-render SVG connections after formations load
    useEffect(() => {
        const timer = setTimeout(() => setRenderKey(k => k + 1), 100);
        return () => clearTimeout(timer);
    }, [formations, studentGrade]);

    // Fetch departments on mount (no dependency on type)
    useEffect(() => {
        fetch(`${API_URL}/licences/departments`)
            .then(res => res.json())
            .then(data => setDepartments(data))
            .catch(err => console.error("Failed to fetch departments", err));
    }, []);

    // Calculate estimated average grade from mention distribution
    // Midpoints: SansMention=11, AB=13, B=15, TB=17, Felicitations=19
    const getEstimatedGrade = (mentionJson: string | null): number | null => {
        if (!mentionJson) return null;
        try {
            const m: MentionData = JSON.parse(mentionJson);
            const total = m.SansMention + m.AB + m.B + m.TB + m.Felicitations;
            if (total === 0) return null;
            // Weighted average using midpoints of each range
            return (m.SansMention * 11 + m.AB * 13 + m.B * 15 + m.TB * 17 + m.Felicitations * 19) / total;
        } catch {
            return null;
        }
    };

    // Calculate combined score
    const calculateScore = (formation: LicenceFormation): { score: number; estimatedGrade: number | null } => {
        const specialtyRate = admissionRates[selectedType]?.admissionRatePct ?? 50;

        // Get estimated grade from mention distribution
        const estimatedGrade = getEstimatedGrade(formation.mentionDistribution);

        // If we have estimated grade, use it; otherwise fallback to 14 (average)
        const targetGrade = estimatedGrade ?? 14;
        const gradeDiff = studentGrade - targetGrade;

        // Same interpolation as CPGE
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

        return { score: gradeScore * 0.5 + specialtyRate * 0.5, estimatedGrade };
    };

    const getScoreColors = (score: number) => {
        if (score > 80) return { statusClass: "border-green-400/50 from-green-400/20 to-green-500/10", textClass: "text-green-300" };
        if (score > 60) return { statusClass: "border-emerald-500/30 from-emerald-500/10 to-emerald-600/5", textClass: "text-emerald-400" };
        if (score > 50) return { statusClass: "border-amber-500/30 from-amber-500/10 to-amber-600/5", textClass: "text-amber-400" };
        if (score > 40) return { statusClass: "border-orange-500/30 from-orange-500/10 to-orange-600/5", textClass: "text-orange-400" };
        return { statusClass: "border-red-500/30 from-red-500/10 to-red-600/5", textClass: "text-red-400" };
    };

    // Abbreviate school names: Université -> Univ., Institut -> Inst., Faculté -> Fac.
    const abbreviateSchoolName = (name: string | undefined): string => {
        if (!name) return '';
        return name
            .replace(/Universit[ée]/g, 'Univ.')
            .replace(/Institut/g, 'Inst.')
            .replace(/Facult[ée]s?/g, 'Fac.')
            .split(' ').slice(0, 4).join(' ');
    };

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-blue-500/30 overflow-hidden font-sans">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 py-2 px-4 flex items-center justify-between glass-strong border-b border-white/10">
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

                {/* Center: Licence Type Dropdown */}
                <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-cyan-400" />
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg px-3 py-1.5 text-sm font-medium text-cyan-200 focus:ring-2 focus:ring-cyan-500 outline-none hover:bg-cyan-500/20 transition-all cursor-pointer min-w-[200px]"
                    >
                        {licenceTypes.map(type => (
                            <option key={type} value={type} className="bg-slate-900">
                                {type}
                            </option>
                        ))}
                    </select>
                    {admissionRates[selectedType]?.admissionRatePct && (
                        <div
                            title="Taux d'admission pour vos 2 spécialités"
                            className={cn(
                                "px-2 py-1 rounded-full text-xs font-bold cursor-help",
                                admissionRates[selectedType].admissionRatePct >= 70
                                    ? "bg-green-500/20 text-green-300"
                                    : admissionRates[selectedType].admissionRatePct >= 50
                                        ? "bg-yellow-500/20 text-yellow-300"
                                        : "bg-orange-500/20 text-orange-300"
                            )}>
                            {admissionRates[selectedType].admissionRatePct.toFixed(0)}%
                        </div>
                    )}
                </div>

                {/* Right: Department Filter */}
                <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-medium text-white focus:ring-2 focus:ring-cyan-500 outline-none hover:bg-white/15 transition-all cursor-pointer"
                >
                    <option value="" className="bg-slate-900">Département</option>
                    {departments.map(dept => (
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
            <main className="pt-16 pb-20 h-screen grid grid-cols-[120px_1fr] relative overflow-hidden">
                {/* ZONE 1: GRADE SLIDER (same as CPGE) */}
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

                {/* ZONE 2: Formation Bubbles with SVG Connections */}
                <div ref={zone2Ref} className="relative overflow-visible flex flex-col items-center justify-start p-8 border-l border-white/5">
                    {/* SVG Connections Layer */}
                    <svg key={renderKey} className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                        <defs>
                            <filter id="glow-licence" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Connections from slider to formations */}
                        {formations.slice(0, 30).map((formation, idx) => {
                            const { estimatedGrade } = calculateScore(formation);
                            const diff = estimatedGrade ? studentGrade - estimatedGrade : null;

                            let statusColor = "#6b7280"; // Gray default
                            if (diff !== null) {
                                if (diff >= -0.5) statusColor = "#10b981";      // Green
                                else if (diff >= -1.5) statusColor = "#f59e0b"; // Yellow
                                else statusColor = "#ef4444";                    // Red
                            }

                            const bubbleRef = bubbleRefs.current[formation.id];
                            if (!bubbleRef || !sliderRef.current || !zone2Ref.current) return null;

                            const bubbleRect = bubbleRef.getBoundingClientRect();
                            const zone2Rect = zone2Ref.current.getBoundingClientRect();
                            const sliderRect = sliderRef.current.getBoundingClientRect();

                            const x1 = sliderRect.right - zone2Rect.left + 10;
                            const y1 = sliderRect.top - zone2Rect.top + (sliderRect.height * getGradeY(studentGrade) / 100);
                            const x2 = bubbleRect.left - zone2Rect.left + bubbleRect.width / 2;
                            const y2 = bubbleRect.top - zone2Rect.top + bubbleRect.height / 2;

                            const isHovered = hoveredFormation === formation.id;
                            const opacity = hoveredFormation ? (isHovered ? 1 : 0.1) : 0.25;

                            return (
                                <motion.path
                                    key={`conn-${formation.id}`}
                                    d={`M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`}
                                    stroke={isHovered ? statusColor : (statusColor === "#6b7280" ? "#374151" : statusColor)}
                                    strokeWidth={isHovered ? 2.5 : 1}
                                    fill="none"
                                    filter={isHovered ? "url(#glow-licence)" : undefined}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity }}
                                    transition={{ duration: 0.6, delay: idx * 0.02 }}
                                />
                            );
                        })}
                    </svg>

                    {/* Formation Bubbles Grid - Centered, sorted hardest to easiest */}
                    <LayoutGroup>
                        <div className="flex flex-wrap justify-center content-start gap-5 z-10">
                            {[...formations]
                                .map(f => ({ ...f, _calc: calculateScore(f) }))
                                .sort((a, b) => {
                                    // Sort by estimated grade descending (hardest first)
                                    const gradeA = a._calc.estimatedGrade ?? 0;
                                    const gradeB = b._calc.estimatedGrade ?? 0;
                                    return gradeB - gradeA;
                                })
                                .map((formation) => {
                                    const { score, estimatedGrade } = formation._calc;
                                    const { statusClass, textClass } = getScoreColors(score);
                                    const isHovered = hoveredFormation === formation.id;

                                    return (
                                        <motion.div
                                            layout
                                            layoutId={formation.id}
                                            key={formation.id}
                                            ref={(el) => { bubbleRefs.current[formation.id] = el; }}
                                            onMouseEnter={() => setHoveredFormation(formation.id)}
                                            onMouseLeave={() => setHoveredFormation(null)}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{
                                                opacity: hoveredFormation && !isHovered ? 0.4 : 1,
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
                                            {formation.parcoursupLink && (
                                                <div className="absolute top-1.5 left-0 right-0 flex justify-center z-20">
                                                    <a
                                                        href={formation.parcoursupLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1 rounded-full bg-white/5 hover:bg-cyan-500/20 text-white/30 hover:text-cyan-400 transition-all"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            )}

                                            {/* Licence Label (abbreviated) - Main text */}
                                            <div className="text-[9px] font-bold text-center leading-tight text-white/90 line-clamp-2 px-1 h-6 flex items-center justify-center">
                                                {abbreviateLicence(formation.filiereDetaillee)}
                                            </div>

                                            {/* School Name (abbreviated) */}
                                            <div className="text-[7px] text-white/50 text-center leading-tight line-clamp-1 px-1">
                                                {abbreviateSchoolName(formation.school?.name)}
                                            </div>

                                            {/* Stats row */}
                                            <div className="flex gap-2 mt-1">
                                                {estimatedGrade && (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[6px] text-white/40 uppercase">Moy</span>
                                                        <span className={cn("text-[9px] font-bold", textClass)}>
                                                            {estimatedGrade.toFixed(1)}
                                                        </span>
                                                    </div>
                                                )}
                                                {formation.admissionRate && (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[6px] text-white/40 uppercase">Accès</span>
                                                        <span className="text-[9px] font-bold text-white/70">
                                                            {Math.round(formation.admissionRate)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </div>
                    </LayoutGroup>

                    {formations.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center w-full h-full text-white/40">
                            <GraduationCap className="w-16 h-16 mb-4 opacity-50" />
                            <p>Aucune formation trouvée</p>
                            <p className="text-sm">Essayez un autre type de Licence ou département</p>
                        </div>
                    )}
                </div>
            </main >

            {/* Bottom Navigation */}
            < nav className="fixed bottom-0 left-0 right-0 h-14 glass-strong border-t border-white/10 flex items-center justify-center gap-4 z-50" >
                <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Home className="w-4 h-4" />
                    <span className="text-sm font-medium">Accueil</span>
                </Link>
                <Link
                    to="/cpge-explorer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/20 transition-all"
                >
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-sm font-medium">CPGE Explorer</span>
                </Link>
            </nav >
        </div >
    );
}
