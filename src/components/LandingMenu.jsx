import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import { useState, useEffect, useMemo, useCallback } from 'react'
import translations from '../data/translations'

// Component for individual scatter items to handle loading state
const ScatterItem = ({ item }) => {
    const [isLoaded, setIsLoaded] = useState(false)

    // Helper for random light skew to simulate paper imperfection (static per item)
    const skewX = useMemo(() => Math.random() * 2 - 1, [])
    const skewY = useMemo(() => Math.random() * 2 - 1, [])

    return (
        <motion.div
            className="absolute"
            style={{
                left: item.left,
                top: item.top,
                width: item.type === 'drawing' ? '14rem' : '14rem',
                zIndex: item.zIndex,
                opacity: isLoaded ? 1 : 0,
                // Removed heavy SVG filters for performance
                // Using standard CSS filters for style
                filter: item.type === 'photo'
                    ? 'brightness(0.9) contrast(1.1) sepia(0.2) drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                    : 'brightness(1.02) sepia(0.1) contrast(1.1) drop-shadow(0 2px 3px rgba(0,0,0,0.1))',
                transform: `skew(${skewX}deg, ${skewY}deg)` // Subtle distortion
            }}
            initial={{ scale: item.scale * 1.5, rotate: item.rotate + 10, opacity: 0 }}
            animate={{
                scale: item.scale,
                rotate: item.rotate,
                opacity: isLoaded ? 1 : 0
            }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.8 } }}
            transition={{ duration: 1.5, delay: Math.random() * 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* CONDITIONAL RENDERING BASED ON TYPE */}
            {item.type === 'photo' ? (
                // PHOTO: Polaroid Style (White bg + padding)
                <div className="bg-white p-2 pb-8 shadow-2xl transform rotate-1">
                    <img
                        src={item.src}
                        alt=""
                        className="w-full h-auto grayscale-[0.2]"
                        draggable={false}
                        // onLoad handled by image
                        onLoad={() => setIsLoaded(true)}
                    />
                </div>
            ) : (
                // DRAWING: Raw Style (No bg, just the image)
                <div className="transform rotate-0">
                    <img
                        src={item.src}
                        alt=""
                        className="w-full h-auto mix-blend-multiply"
                        draggable={false}
                        style={{ filter: 'grayscale(0.1) contrast(1.2)' }}
                        onLoad={() => setIsLoaded(true)}
                    />
                </div>
            )}
        </motion.div>
    )
}

export default function LandingMenu({ onNavigate, manifest }) {
    const { t, language } = useLanguage()
    const [navigatingTo, setNavigatingTo] = useState(null)
    const [scatterItems, setScatterItems] = useState([])

    // Process manifest
    const availableItems = useMemo(() => {
        if (!manifest) return []
        const items = []
        Object.keys(manifest).forEach(category => {
            if (category === 'sphereImages') return
            const collections = manifest[category]?.collections || []
            collections.forEach(col => {
                if (!col.images || col.images.length === 0) return
                const drawings = col.images.filter(img => img.includes('/Disegni/'))
                const photos = col.images.filter(img => !img.includes('/Disegni/'))
                if (drawings.length > 0 || photos.length > 0) {
                    items.push({ collectionId: col.id, drawings, photos })
                }
            })
        })
        return items
    }, [manifest])

    // Generation Logic 
    const generateScatter = useCallback(() => {
        if (availableItems.length === 0) return

        const generatedItems = []
        const maxAttempts = 200

        const safeZone = {
            xMin: 35, xMax: 65,
            yMin: 35, yMax: 65
        }

        const shuffledCollections = [...availableItems].sort(() => 0.5 - Math.random())

        let candidateImages = []

        // Pass 1: One of each (Diversity First)
        shuffledCollections.forEach(col => {
            if (col.drawings.length > 0) {
                const randomDrawing = col.drawings[Math.floor(Math.random() * col.drawings.length)]
                candidateImages.push({ src: randomDrawing, type: 'drawing' })
            }
            if (col.photos.length > 0) {
                const randomPhoto = col.photos[Math.floor(Math.random() * col.photos.length)]
                candidateImages.push({ src: randomPhoto, type: 'photo' })
            }
        })

        // Pass 2: Moderate Fill (Single duplication for balanced density)
        const densityPool = [...candidateImages, ...candidateImages].sort(() => 0.5 - Math.random())

        densityPool.forEach((item, i) => {
            let placed = false
            let attempt = 0

            const collisionRadius = item.type === 'drawing' ? 9 : 11

            while (!placed && attempt < maxAttempts) {
                const left = Math.random() * 88 + 1
                const top = Math.random() * 88 + 1

                if (left > safeZone.xMin && left < safeZone.xMax &&
                    top > safeZone.yMin && top < safeZone.yMax) {
                    attempt++
                    continue
                }

                let overlap = false
                for (const existing of generatedItems) {
                    const dx = left - existing.rawLeft
                    const dy = top - existing.rawTop
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < collisionRadius) {
                        overlap = true
                        break
                    }
                }

                if (!overlap) {
                    const rotationRange = item.type === 'drawing' ? 90 : 25
                    const rotate = Math.random() * rotationRange - (rotationRange / 2)

                    const scale = item.type === 'drawing'
                        ? 0.8 + Math.random() * 0.4
                        : 0.6 + Math.random() * 0.3

                    generatedItems.push({
                        id: `${i}-${Date.now()}-${Math.random()}`,
                        src: item.src,
                        type: item.type,
                        left: `${left}%`,
                        top: `${top}%`,
                        rawLeft: left,
                        rawTop: top,
                        rotate,
                        scale,
                        zIndex: Math.floor(Math.random() * 10)
                    })
                    placed = true
                }
                attempt++
            }
        })
        setScatterItems(generatedItems)
    }, [availableItems])


    // Initial Load & Interval
    useEffect(() => {
        generateScatter() // Initial

        // INCREASED TO 25 SECONDS AS REQUESTED
        const intervalId = setInterval(() => {
            generateScatter()
        }, 25000)

        return () => clearInterval(intervalId)
    }, [generateScatter])


    const handleMenuClick = (id) => {
        setNavigatingTo(id)
        setTimeout(() => {
            onNavigate(id)
        }, 600)
    }

    // --- Dynamic Content & Styling Logic ---

    const getDesignLabel = () => {
        const label = t.menu.fashionDesign || translations[language]?.menu.fashionDesign || 'FASHION DESIGN'
        if (language === 'it' && label.includes('PROGETTAZIONE')) return 'PROGETTAZIONE\nMODA'
        if (language === 'es') return 'DISEÑO DE MODA'
        if (language === 'en' || label === 'FASHION DESIGN') return 'FASHION\nDESIGN'
        return label
    }

    const getStylingLabel = () => {
        return t.menu.styling || translations[language]?.menu.styling || 'STYLING'
    }

    const getDesignFontSize = () => {
        if (language === 'it') return 'clamp(1.8rem, 3.2vw, 2.8rem)'
        if (language === 'es') return 'clamp(1.6rem, 2.8vw, 2.5rem)'
        if (language === 'fr') return 'clamp(1.9rem, 3.2vw, 2.8rem)'
        if (language === 'ko') return 'clamp(2.2rem, 4.2vw, 3.8rem)'
        return 'clamp(2.2rem, 4.5vw, 4rem)'
    }

    const getStylingFontSize = () => {
        if (language === 'es') return 'clamp(2rem, 3.5vw, 3rem)'
        if (language === 'it') return 'clamp(1.6rem, 2.8vw, 2.5rem)'
        if (language === 'fr') return 'clamp(2.1rem, 3.8vw, 3rem)'
        if (language === 'ko') return 'clamp(2.1rem, 3.8vw, 3.2rem)'
        return 'clamp(2.4rem, 4.2vw, 4rem)'
    }

    const getDesignPaperWidth = () => {
        if (language === 'fr') return 'w-72 md:w-[27rem]'
        if (language === 'ko') return 'w-48 md:w-[12rem]'
        if (language === 'es') return 'w-72 md:w-[22rem]'
        if (language === 'it') return 'w-[16rem]'
        return 'w-[16rem]'
    }

    const getStylingPaperWidth = () => {
        if (language === 'it') return 'w-[28rem] md:w-[52rem]'
        if (language === 'es') return 'w-72 md:w-[26rem]'
        if (language === 'fr') return 'w-64 md:w-[25rem]'
        if (language === 'ko') return 'w-64 md:w-[23rem]'
        return 'w-64 md:w-[24rem]'
    }

    const getPaperRotation = (type) => {
        if (type === 'design') {
            if (language === 'it') return -1
            if (language === 'es') return -3
            if (language === 'fr') return -2.5
            if (language === 'ko') return 1
            return -2
        }
        if (type === 'styling') {
            if (language === 'it') return 1.5
            if (language === 'es') return 4
            if (language === 'fr') return 2
            if (language === 'ko') return -1
            return 3
        }
        return 0
    }

    return (
        <motion.div
            className="fixed inset-0 overflow-hidden bg-[#2a2a2a] z-[50]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
        >
            {/* REMOVED SVG DEFINITIONS FOR PERFORMANCE */}

            {/* 1. SCATTER BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <AnimatePresence mode='popLayout'>
                    {scatterItems.map((item) => (
                        <ScatterItem key={item.id} item={item} />
                    ))}
                </AnimatePresence>
            </div>

            {/* 2. ATMOSPHERE */}
            <div className="absolute inset-0 z-[20] pointer-events-none mix-blend-overlay" style={{ background: 'linear-gradient(120deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 30%, rgba(255,220,200,0.15) 45%, rgba(255,240,220,0.2) 55%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)' }} />
            <div className="absolute inset-0 z-[20] pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

            {/* 3. NAVIGATION */}
            <div className="absolute inset-0 z-[30] flex flex-col items-center justify-center gap-8 drop-shadow-2xl">

                {/* BUTTON 1: FASHION DESIGN */}
                <motion.div
                    onClick={() => handleMenuClick('design')}
                    className="relative cursor-pointer group z-30"
                    initial={{ scale: 0.9, opacity: 0, y: 50, rotate: getPaperRotation('design') }}
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: getPaperRotation('design') }}
                    exit={{ scale: 1.1, opacity: 0, filter: 'blur(10px)' }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "backOut" }}
                    whileHover="hover"
                    whileTap="tap"
                >
                    <motion.div
                        className={`relative flex items-center justify-center ${getDesignPaperWidth()}`}
                        variants={{ hover: { scale: 1.05, rotate: getPaperRotation('design') + 1, y: -5 }, tap: { scale: 0.98, rotate: getPaperRotation('design') - 1, y: 0 } }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <div className="relative w-full">
                            <img
                                src="/assets/ui/paper-fashion.png"
                                alt="Fashion Design Paper"
                                className={`w-full drop-shadow-xl ${(language === 'es' || language === 'fr') ? 'h-[5.5rem] object-fill' :
                                    (language === 'it') ? 'h-[9rem] object-fill' :
                                        'h-auto'
                                    }`}
                                draggable={false}
                            />

                            <div className="absolute inset-0 flex items-center justify-center pt-3 pr-3 pb-3 pl-3">
                                <h2
                                    className="text-black font-normal text-center whitespace-pre-wrap select-none leading-relaxed tracking-wide"
                                    style={{
                                        fontFamily: "'GhostFont', sans-serif",
                                        fontSize: getDesignFontSize(),
                                        textShadow: '0px 0px 1px rgba(0,0,0,0.2)',
                                        transform: 'rotate(-1deg)',
                                        width: '90%',
                                        whiteSpace: language === 'es' ? 'nowrap' : 'pre-wrap'
                                    }}
                                >
                                    {getDesignLabel()}
                                </h2>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>


                {/* BUTTON 2: STYLING */}
                <motion.div
                    onClick={() => handleMenuClick('styling')}
                    className="relative cursor-pointer group z-30"
                    initial={{ scale: 0.9, opacity: 0, y: 50, rotate: getPaperRotation('styling') }}
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: getPaperRotation('styling') }}
                    exit={{ scale: 1.1, opacity: 0, filter: 'blur(10px)' }}
                    transition={{ delay: 0.6, duration: 0.8, ease: "backOut" }}
                    whileHover="hover"
                    whileTap="tap"
                >
                    <motion.div
                        className={`relative flex items-center justify-center ${getStylingPaperWidth()}`}
                        variants={{ hover: { scale: 1.05, rotate: getPaperRotation('styling') - 1, y: -5 }, tap: { scale: 0.98, rotate: getPaperRotation('styling') + 2, y: 0 } }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <div className="relative w-full">
                            <img
                                src="/assets/ui/paper-styling.png"
                                alt="Styling Paper"
                                className={`w-full drop-shadow-xl ${language === 'it' ? 'h-[12rem] object-fill' : 'h-auto'}`}
                                draggable={false}
                            />

                            <div className="absolute inset-0 flex items-center justify-center pt-1 px-2">
                                <h2
                                    className="text-black font-normal text-center select-none tracking-wide"
                                    style={{
                                        fontFamily: "'GhostFont', sans-serif",
                                        fontSize: getStylingFontSize(),
                                        textShadow: '0px 0px 1px rgba(0,0,0,0.2)',
                                        transform: 'rotate(1deg)',
                                        width: '90%'
                                    }}
                                >
                                    {getStylingLabel()}
                                </h2>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

            </div>

            <motion.div
                className="absolute bottom-8 left-8 z-40 text-white/50 font-medium tracking-widest text-sm uppercase mix-blend-difference"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            >
                {t.ui.portfolio}
            </motion.div>
            <motion.div
                className="absolute bottom-8 right-8 z-40 text-white/50 font-medium tracking-widest text-sm uppercase mix-blend-difference"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            >
                FN
            </motion.div>

        </motion.div>
    )
}
