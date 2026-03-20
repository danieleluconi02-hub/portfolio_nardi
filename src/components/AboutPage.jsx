import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import BackButton from './BackButton'

// --- CONSTANTS ---
const PINK_COLOR = '#FFC0CB'
const TEXT_COLOR = '#FFFFFF'

// Smooth Easing
const transitionEase = [0.25, 0.1, 0.25, 1]

// --- DATA: SPECIAL CASE FOR 'solida_competenza_progettuale' ---
const COMPETENCE_DATA = {
    nid_triennale: {
        title: "DIPLOMA ACCADEMICO DI PRIMO LIVELLO",
        course: "Stilista di Moda (Triennale)",
        hours: 1366,
        grade: "101/110",
        subjects: [
            {
                year: "Primo Anno", subjects: [
                    { name: "Comunicazione e storia della moda", hours: 10 },
                    { name: "Costume storico", hours: 46 },
                    { name: "Analisi degli stili extra-europei", hours: 10 },
                    { name: "Disegno tecnico e del tessuto", hours: 70 },
                    { name: "Modello e cucito", hours: 150 },
                    { name: "Tecniche grafiche accessori", hours: 20 },
                    { name: "Design borse", hours: 24 },
                    { name: "Disegno di moda e figurino", hours: 20 },
                    { name: "Software", hours: 36 },
                    { name: "Fashion Trend Forecasting", hours: 36 },
                    { name: "Progettazione collezioni", hours: 20 },
                    { name: "Tessuti e merceologia", hours: 24 }
                ]
            },
            {
                year: "Secondo Anno", subjects: [
                    { name: "Progettazione collezioni", hours: 20 },
                    { name: "Comunicazione e sistema moda", hours: 10 },
                    { name: "Costume storico", hours: 20 },
                    { name: "Design Borse", hours: 34 },
                    { name: "Fashion Trend Forecasting", hours: 22 },
                    { name: "Software e tecniche grafiche", hours: 130 },
                    { name: "Disegno tecnico e del tessuto", hours: 30 },
                    { name: "Modello e cucito", hours: 174 },
                    { name: "Filosofia della Moda", hours: 10 }
                ]
            },
            {
                year: "Terzo Anno", subjects: [
                    { name: "Fashion trend forecasting", hours: 30 },
                    { name: "Alta sartoria", hours: 124 },
                    { name: "Maglieria", hours: 100 },
                    { name: "Collezione digitale", hours: 60 },
                    { name: "Modellistica Cad Cam e Cad 3D", hours: 76 },
                    { name: "Modellazione 3D accessori", hours: 60 }
                ]
            }
        ]
    },
    nid_master: {
        title: "MASTER DI SPECIALIZZAZIONE",
        course: "Styling & Fashion Photography",
        hours: 200,
        grade: "110/110",
        subjects: [
            {
                year: "Corso Unico", subjects: [
                    { name: "Introduzione allo styling di moda", hours: 10 },
                    { name: "Consulenza d'immagine e armocromia", hours: 15 },
                    { name: "Storia della moda e analisi dei trend", hours: 25 },
                    { name: "Tecniche di styling e creazione di look", hours: 20 },
                    { name: "Personal Branding", hours: 20 },
                    { name: "Fotografia di moda", hours: 14 },
                    { name: "Comunicazione Visiva e Digital Media", hours: 20 },
                    { name: "AI Tools for Fashion", hours: 15 },
                    { name: "Progetti pratici di styling", hours: 25 }
                ]
            }
        ]
    }
}

// --- ASSETS LOADER ---
// Updated to use relative path which is safer in Vite
const aboutImages = import.meta.glob('../assets/about/**/*.{png,jpg,jpeg,webp,svg}', { eager: true })

const getImagesForKeyword = (folderName) => {
    const images = []
    if (!folderName) return images

    // Normalize folder name to avoid issues with slashes
    const normalize = (path) => path.replace(/\\/g, '/')

    for (const path in aboutImages) {
        if (normalize(path).includes(folderName)) {
            images.push(aboutImages[path].default)
        }
    }
    return images
}

// --- COMPONENTS ---

const HandDrawnTable = ({ data, customTitle }) => {
    if (!data) return null
    // Support both single subject group (direct year) or legacy full objects
    const subjectsToRender = data.subjects || (data.name ? [{ ...data }] : [])

    return (
        <div className="flex-shrink-0 w-[85vw] md:w-[400px] lg:w-[450px] snap-center flex flex-col h-full">
            <div className="mb-6 flex-shrink-0">
                <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: PINK_COLOR, fontFamily: 'var(--font-primary)' }}>
                    {customTitle || data.title || data.year}
                </h3>
                {data.course && (
                    <span className="block text-sm md:text-md font-normal text-white/80">{data.course}</span>
                )}
                {/* Show hours/grade only if they exist at top level (Master/Diplomas) */}
                {(data.hours || data.grade) && (
                    <div className="flex flex-wrap gap-3 text-xs mt-3 opacity-80" style={{ color: TEXT_COLOR }}>
                        {data.hours && <span className="px-2 py-1 border border-white/30 rounded-full">Ore: <b className="text-white font-normal" style={{ fontFamily: 'inherit' }}>{data.hours}</b></span>}
                        {data.grade && <span className="px-2 py-1 border border-white/30 rounded-full">Voto: <b className="text-white font-normal" style={{ fontFamily: 'inherit' }}>{data.grade}</b></span>}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex flex-col gap-4">
                    {subjectsToRender.map((group, idx) => (
                        <div key={idx} className="relative p-5"
                            style={{
                                border: `1px solid ${PINK_COLOR}`,
                                borderRadius: '12px',
                                background: 'rgba(255, 192, 203, 0.02)'
                            }}
                        >
                            {/* If it's a "Year" object passed directly, we might not need this inner header if the outer header covered it, 
                                but for Triennale years passed individually, the inner group is the year itself. */}
                            {group.year && group.year !== data.year && (
                                <h4 className="text-md font-bold mb-4 border-b border-white/10 pb-2" style={{ color: PINK_COLOR }}>
                                    {group.year}
                                </h4>
                            )}

                            <ul className="space-y-3">
                                {(group.subjects || []).map((sub, sIdx) => (
                                    <li key={sIdx} className="flex justify-between items-start text-sm group">
                                        <span className="font-medium transition-colors w-[80%] opacity-90" style={{ color: PINK_COLOR }}>
                                            {sub.name}
                                        </span>
                                        <span className="text-white/80 font-bold text-xs pt-1" style={{ fontFamily: 'inherit' }}>
                                            {sub.hours}h
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

const CompetencePopup = ({ isOpen, onClose }) => {
    if (!isOpen) return null

    // Prepare Triennale Data: Reverse order (3, 2, 1)
    const triennnaleYears = [...COMPETENCE_DATA.nid_triennale.subjects].reverse()

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: transitionEase }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-8" // Remove padding on mobile to max width
                onClick={onClose}
            >
                <div
                    className="relative w-full h-full md:h-[85vh] md:max-w-[95vw] bg-[#0F1114] border-0 md:border border-white/10 md:rounded-xl shadow-2xl flex flex-col overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 md:top-8 md:right-8 text-white/50 hover:text-white transition-colors text-xl z-20"
                    >
                        ✕ CLOSE
                    </button>

                    <div className="p-6 md:p-12 pb-4 flex-shrink-0">
                        <h2 className="text-3xl md:text-5xl text-left md:text-center tracking-tighter" style={{ fontFamily: 'var(--font-primary)' }}>
                            Percorso Formativo
                        </h2>
                    </div>

                    {/* Horizontal Scroll Container */}
                    <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-stretch gap-6 px-6 md:px-12 pb-12 snap-x snap-mandatory">

                        {/* 1. MASTER (Fixed) */}
                        <HandDrawnTable data={COMPETENCE_DATA.nid_master} />

                        {/* Separator */}
                        <div className="w-px h-full bg-white/10 flex-shrink-0 mx-2"></div>

                        {/* 2. TRIENNALE YEARS (Reversed: 3, 2, 1) */}
                        {triennnaleYears.map((yearGroup, idx) => (
                            <HandDrawnTable
                                key={idx}
                                data={{
                                    // Construct a "Year Data" object mimicking the structure HandDrawnTable expects
                                    title: yearGroup.year, // "Terzo Anno"
                                    course: idx === 0 ? "Stilista di Moda (Triennale)" : "", // Only show course on the first of the 3
                                    subjects: [yearGroup] // Wrap in array so map works
                                }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

const ImageGalleryPopup = ({ isOpen, onClose, images, keyword }) => {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: transitionEase }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-hidden"
                onClick={onClose}
            >
                {/* Horizontal "Organized Chaos" Container */}
                <div
                    className="relative w-full max-w-[1400px] h-[60vh] flex items-center justify-center gap-4 md:gap-12 pointer-events-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* VISUAL SCAFFOLDING / WIRE STRUCTURE */}
                    <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
                        <svg width="100%" height="100%" viewBox="0 0 1000 600" preserveAspectRatio="none">
                            {/* Main "Wire" Line connecting the images */}
                            <path
                                d="M0,300 C200,320 350,280 500,310 S800,290 1000,320"
                                stroke={PINK_COLOR}
                                strokeWidth="1.5"
                                fill="none"
                                vectorEffect="non-scaling-stroke"
                            />
                            {/* "Hanging" vertical threads for each potential image spot */}
                            <line x1="200" y1="0" x2="200" y2="320" stroke={PINK_COLOR} strokeWidth="0.5" strokeDasharray="5,5" opacity="0.5" />
                            <line x1="500" y1="0" x2="500" y2="310" stroke={PINK_COLOR} strokeWidth="0.5" strokeDasharray="5,5" opacity="0.5" />
                            <line x1="800" y1="0" x2="800" y2="300" stroke={PINK_COLOR} strokeWidth="0.5" strokeDasharray="5,5" opacity="0.5" />
                        </svg>
                    </div>

                    {(images || []).map((img, index) => {
                        // "Organized Chaos" Transforms
                        // We strictly show 3 side-by-side. 
                        const chaosStyles = [
                            { rotate: -3, y: -20, scale: 0.95 },   // Left: tilted left, slightly up
                            { rotate: 2, y: 30, scale: 1.05 },     // Center: tilted right, lower (heavy)
                            { rotate: -1, y: -10, scale: 0.98 },   // Right: slightly left, slightly up
                        ]

                        const style = chaosStyles[index] || { rotate: 0, y: 0, scale: 1 }

                        return (
                            <motion.div
                                key={index}
                                className="relative z-10 w-[28vw] md:w-[22vw] max-w-[350px] aspect-[3/4] flex-shrink-0"
                                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                animate={{
                                    opacity: 1,
                                    scale: style.scale,
                                    y: style.y,
                                    rotate: style.rotate,
                                }}
                                transition={{
                                    duration: 0.8,
                                    delay: index * 0.15,
                                    ease: [0.2, 0, 0.2, 1]
                                }}
                                style={{
                                    transformOrigin: 'top center' // Feels like it's hanging
                                }}
                            >
                                <img
                                    src={img}
                                    alt={`${keyword} ${index + 1}`}
                                    className="w-full h-full object-cover shadow-2xl pointer-events-auto hover:scale-105 hover:rotate-0 hover:z-50 transition-all duration-500"
                                    style={{
                                        boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8)',
                                        border: `1px solid ${PINK_COLOR}40`, // Low opacity pink border
                                        outline: '1px solid rgba(255,255,255,0.05)',
                                        outlineOffset: '-5px'
                                    }}
                                />
                                {/* Label tag visual */}
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-white/50 uppercase whitespace-nowrap">
                                    IMG_0{index + 1}
                                </div>
                            </motion.div>
                        )
                    })}

                    <button
                        onClick={onClose}
                        className="fixed bottom-8 md:bottom-auto md:top-8 right-8 pointer-events-auto text-white/70 hover:text-white mix-blend-difference z-50 text-lg uppercase tracking-widest"
                    >
                        Close
                    </button>

                    <div className="absolute bottom-12 md:bottom-8 left-0 w-full text-center text-white/30 text-xs tracking-[0.3em] uppercase pointer-events-none">
                        {images.length > 0 ? `${keyword} / Gallery` : ''}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

const InteractiveText = ({ text, onKeywordClick }) => {
    if (!text) return null
    const parts = text.split(/(\[[^\]]+\]\([^\)]+\))/g)

    return (
        <span>
            {parts.map((part, i) => {
                const match = part.match(/\[([^\]]+)\]\(([^\)]+)\)/)
                if (match) {
                    const [_, displayText, folderName] = match
                    const isGrowstyled = displayText === 'Growstyled'

                    if (isGrowstyled) {
                        return (
                            <a
                                key={i}
                                href="https://growstyled.store"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer inline-block transition-all duration-300 hover:text-white px-1 rounded"
                                style={{
                                    color: TEXT_COLOR,
                                    fontWeight: 'bold',
                                    fontSize: '1.05em',
                                    textShadow: '0 0 15px rgba(255,192,203, 0.6)', // Pink glow
                                }}
                            >
                                {displayText}
                            </a>
                        )
                    }

                    return (
                        <span
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation()
                                onKeywordClick(displayText, folderName)
                            }}
                            className="cursor-pointer inline-block transition-transform duration-300 hover:scale-105 hover:bg-white/5 px-1 rounded"
                            style={{
                                color: TEXT_COLOR,
                                fontWeight: 'bold',
                                fontSize: '1.05em',
                                // borderBottom: `1px dashed ${PINK_COLOR}` // Removed underline
                            }}
                        >
                            {displayText}
                        </span>
                    )
                }
                return <span key={i}>{part}</span>
            })}
        </span>
    )
}

const SectionItem = ({ section, align, onKeywordClick }) => {
    const ref = useRef(null)
    const controls = useAnimation()
    const inView = useInView(ref, { once: true, amount: 0.01 })

    useEffect(() => {
        if (inView) {
            controls.start({ opacity: 1, x: 0 })
        }
    }, [inView, controls])

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: align === 'left' ? -30 : 30 }}
            animate={controls}
            transition={{ duration: 0.8, delay: 0.1, ease: transitionEase }}
            className={`flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'} w-full`}
        >
            <h2
                className="text-4xl md:text-6xl font-bold mb-8 tracking-tight"
                style={{
                    color: PINK_COLOR,
                    fontFamily: 'var(--font-primary)'
                }}
            >
                {/* Removed numerical prefix */}
                {section.title}
            </h2>

            <p
                className="text-lg md:text-2xl leading-relaxed max-w-[850px] font-light text-white/90"
            >
                <InteractiveText
                    text={section.content}
                    onKeywordClick={onKeywordClick}
                />
            </p>
        </motion.div>
    )
}

export default function AboutPage({ onBack }) {
    const { t } = useLanguage()

    const [popupMode, setPopupMode] = useState(null)
    const [activeImages, setActiveImages] = useState([])
    const [activeKeyword, setActiveKeyword] = useState('')

    const handleKeywordClick = (keyword, folderName) => {
        if (folderName.includes('solida_competenza_progettuale')) {
            setPopupMode('competence')
            return
        }

        const allImages = getImagesForKeyword(folderName)
        // Shuffle and take top 3
        const shuffled = [...allImages]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        const selectedImages = shuffled.slice(0, 3)


        setActiveKeyword(keyword)
        setActiveImages(selectedImages)
        setPopupMode('image')
    }

    const closePopup = () => {
        setPopupMode(null)
        setActiveImages([])
    }

    const sections = useMemo(() => {
        if (!t?.about?.sections) return []
        return t.about.sections.map(section => ({
            ...section,
            align: parseInt(section.id) % 2 !== 0 ? 'left' : 'right'
        }))
    }, [t])

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-[#0F1114] overflow-y-auto overflow-x-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: transitionEase }}
            style={{
                fontFamily: 'var(--font-primary)'
            }}
        >
            <div className="fixed top-8 left-8 z-[60]">
                <BackButton onClick={onBack} />
            </div>

            <div className="max-w-[1400px] mx-auto px-6 md:px-16 py-32 flex flex-col gap-32 pb-48">
                {sections.map((section) => (
                    <SectionItem
                        key={section.id}
                        section={section}
                        align={section.align}
                        onKeywordClick={handleKeywordClick}
                    />
                ))}
            </div>

            <ImageGalleryPopup
                isOpen={popupMode === 'image'}
                onClose={closePopup}
                images={activeImages}
                keyword={activeKeyword}
            />

            <CompetencePopup
                isOpen={popupMode === 'competence'}
                onClose={closePopup}
            />

        </motion.div>
    )
}
