import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import { useState, useEffect, useMemo, useCallback } from 'react'
import translations from '../data/translations'

// Component for individual scatter items (background images)
const ScatterItem = ({ item }) => {
    const [isLoaded, setIsLoaded] = useState(false)
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
                filter: item.type === 'photo'
                    ? 'brightness(0.9) contrast(1.1) sepia(0.2) drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                    : 'brightness(1.02) sepia(0.1) contrast(1.1) drop-shadow(0 2px 3px rgba(0,0,0,0.1))',
                transform: `skew(${skewX}deg, ${skewY}deg)`,
                willChange: 'transform, opacity',
                contain: 'content'
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
            {item.type === 'photo' ? (
                <div className="bg-white p-2 pb-8 shadow-2xl transform rotate-1">
                    <img
                        src={item.src}
                        alt=""
                        className="w-full h-auto grayscale-[0.2]"
                        draggable={false}
                        decoding="async"
                        onLoad={() => setIsLoaded(true)}
                    />
                </div>
            ) : (
                <div className="transform rotate-0">
                    <img
                        src={item.src}
                        alt=""
                        className="w-full h-auto mix-blend-multiply"
                        draggable={false}
                        decoding="async"
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

    // Process manifest for background images
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

    // Generation Logic for background scatter
    const generateScatter = useCallback(() => {
        if (availableItems.length === 0) return

        const generatedItems = []
        const maxAttempts = 200

        // Safe zone in center for hero content
        const safeZone = {
            xMin: 25, xMax: 75,
            yMin: 20, yMax: 80
        }

        const shuffledCollections = [...availableItems].sort(() => 0.5 - Math.random())
        let candidateImages = []

        const usedFilenames = new Set()

        shuffledCollections.forEach(col => {
            // Helper to add unique image
            const addUniqueImage = (sourceArray, type) => {
                // Try up to 5 times to find an unused image
                for (let i = 0; i < 5; i++) {
                    if (sourceArray.length === 0) return
                    const randomImg = sourceArray[Math.floor(Math.random() * sourceArray.length)]
                    const filename = randomImg.split('/').pop() // Get filename only

                    if (!usedFilenames.has(filename)) {
                        candidateImages.push({ src: randomImg, type })
                        usedFilenames.add(filename)
                        return // Found one, stop
                    }
                }
            }

            if (col.drawings.length > 0) {
                addUniqueImage(col.drawings, 'drawing')
            }
            if (col.photos.length > 0) {
                addUniqueImage(col.photos, 'photo')
            }
        })

        const photosOnly = candidateImages.filter(item => item.type === 'photo')
        const densityPool = [...candidateImages, ...photosOnly].sort(() => 0.5 - Math.random())

        densityPool.forEach((item, i) => {
            let placed = false
            let attempt = 0

            // ... (rest of placement logic)

            const collisionRadius = item.type === 'drawing' ? 9 : 11

            while (!placed && attempt < maxAttempts) {
                const left = Math.random() * 88 + 1
                const top = Math.random() * 88 + 1

                // Avoid center hero area
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

    // Initial Load + Auto Refresh (15s as per spec)
    useEffect(() => {
        generateScatter()
        const interval = setInterval(() => {
            generateScatter()
        }, 15000)
        return () => clearInterval(interval)
    }, [generateScatter])

    const handleMenuClick = (id) => {
        setNavigatingTo(id)
        setTimeout(() => {
            onNavigate(id)
        }, 600)
    }

    // --- Labels ---
    const getDesignLabel = () => {
        if (language === 'it') return 'PROGETTAZIONE'
        if (language === 'es') return 'DISEÑO DE MODA'
        if (language === 'fr') return 'CRÉATION MODE'
        if (language === 'ko') return '패션 디자인'
        return 'FASHION DESIGN'
    }

    const getStylingLabel = () => {
        if (language === 'it') return 'CURA IMMAGINE'
        if (language === 'es') return 'ESTILISMO'
        if (language === 'fr') return 'STYLISME'
        if (language === 'ko') return '스타일링'
        return 'STYLING'
    }

    const getRoleLabel = () => {
        if (language === 'it') return 'FASHION DESIGNER & STYLIST'
        if (language === 'es') return 'DISEÑADOR DE MODA & ESTILISTA'
        if (language === 'fr') return 'CRÉATEUR DE MODE & STYLISTE'
        if (language === 'ko') return '패션 디자이너 & 스타일리스트'
        return 'FASHION DESIGNER & STYLIST'
    }

    return (
        <motion.div
            className="fixed inset-0 overflow-hidden bg-[#7D7E80] z-[50]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
        >
            {/* 1. SCATTER BACKGROUND (z-index 0) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <AnimatePresence mode='popLayout'>
                    {scatterItems.map((item) => (
                        <ScatterItem key={item.id} item={item} />
                    ))}
                </AnimatePresence>
            </div>

            {/* 2. DARK OVERLAY - 40% black (z-index 1) */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            />

            {/* 3. HERO CONTENT (z-index 10+) */}
            <div className="absolute inset-0 z-[10] flex flex-col items-center justify-start md:justify-center px-4 pt-[12vh] md:pt-0">

                {/* BRAND IDENTITY BLOCK - Signature + Role tightly coupled */}
                <motion.div
                    className="flex flex-col items-center mt-0 md:-mt-[5vh]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    {/* SIGNATURE - Handwriting reveal animation */}
                    <motion.div
                        className="relative overflow-visible"
                        initial={{ rotate: -2 }}
                        animate={{ rotate: -2 }}
                        style={{ transformOrigin: 'center center' }}
                    >
                        {/* Animated mask for handwriting effect */}
                        <motion.div
                            initial={{ clipPath: 'inset(0 100% 0 0)' }}
                            animate={{ clipPath: 'inset(0 0% 0 0)' }}
                            transition={{
                                delay: 0.5,
                                duration: 2.0,
                                ease: [0.25, 0.1, 0.25, 1]
                            }}
                        >
                            <img
                                src="/assets/ui/signature.svg"
                                alt="Francesco Nardi"
                                className="w-[85vw] md:w-[65vw] lg:w-[50vw] xl:w-[45vw] h-auto"
                                style={{
                                    filter: 'invert(1) drop-shadow(0 8px 32px rgba(0,0,0,0.5)) brightness(1.4) contrast(1.1)',
                                }}
                                draggable={false}
                            />
                        </motion.div>
                    </motion.div>

                </motion.div>

                {/* ROLE - Positioned between signature and navigation */}
                <motion.p
                    className="absolute top-[38%] md:top-[58%] text-white text-xs md:text-sm lg:text-base uppercase tracking-[3px] md:tracking-[4px] text-center font-light px-4"
                    style={{ fontFamily: "'GhostFont', sans-serif" }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.5, duration: 0.8 }}
                >
                    {getRoleLabel()}
                </motion.p>

                {/* NAVIGATION - Positioned lower, asymmetric layout */}
                <motion.div
                    className="absolute bottom-[26vh] md:bottom-[16vh] left-0 right-0 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-12 px-4"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.8, duration: 0.8 }}
                >
                    {/* Button 1: Fashion Design / Progettazione */}
                    <motion.div
                        onClick={() => handleMenuClick('design')}
                        className="relative cursor-pointer group"
                        style={{ rotate: '-3deg' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.8, duration: 1.2, ease: 'easeOut' }}
                        whileHover={{ scale: 1.03, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div
                            className="relative overflow-hidden drop-shadow-2xl"
                            style={{
                                width: 'clamp(220px, 30vw, 350px)',
                                height: 'clamp(55px, 9vw, 85px)'
                            }}
                        >
                            <img
                                src="/assets/ui/paper-fashion.png"
                                alt="Fashion Design"
                                className="w-full h-full object-cover"
                                draggable={false}
                            />
                            <div className="absolute inset-0 flex items-center justify-center px-3">
                                <span
                                    className="text-black text-center select-none leading-tight"
                                    style={{
                                        fontFamily: "'GhostFont', sans-serif",
                                        fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    {getDesignLabel()}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Button 2: Styling / Cura Immagine */}
                    <motion.div
                        onClick={() => handleMenuClick('styling')}
                        className="relative cursor-pointer group md:mt-4"
                        style={{ rotate: '3deg' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 3.1, duration: 1.2, ease: 'easeOut' }}
                        whileHover={{ scale: 1.03, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div
                            className="relative overflow-hidden drop-shadow-2xl"
                            style={{
                                width: 'clamp(250px, 33vw, 400px)',
                                height: 'clamp(80px, 12vw, 120px)'
                            }}
                        >
                            <img
                                src="/assets/ui/paper-styling.png"
                                alt="Styling"
                                className="w-full h-full object-cover"
                                draggable={false}
                            />
                            <div className="absolute inset-0 flex items-center justify-center px-3">
                                <span
                                    className="text-black text-center select-none"
                                    style={{
                                        fontFamily: "'GhostFont', sans-serif",
                                        fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    {getStylingLabel()}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* 4. CORNER BRANDING - More subtle */}
            <motion.div
                className="absolute bottom-4 md:bottom-6 left-4 md:left-6 z-40 text-white/25 font-light tracking-[3px] text-[9px] md:text-xs uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
            >
                {t.ui?.portfolio || 'PORTFOLIO'}
            </motion.div>

            <motion.div
                className="absolute bottom-4 md:bottom-6 right-4 md:right-6 z-40 text-white/25 font-light tracking-[3px] text-[9px] md:text-xs uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
            >
                © 2025
            </motion.div>
        </motion.div>
    )
}
