import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DynamicBackgroundGrid({ manifest }) {
    const [displayedImages, setDisplayedImages] = useState([])

    // 1. Flatten all images from all Supabase collections into a single pool
    const allImages = useMemo(() => {
        const images = []
        const seen = new Set()
        Object.keys(manifest).forEach(category => {
            const categoryCollections = manifest[category]?.collections || []
            categoryCollections.forEach(col => {
                (col.images || []).forEach(img => {
                    if (!seen.has(img)) {
                        seen.add(img)
                        images.push(img)
                    }
                })
            })
        })
        return images
    }, [manifest])

    // 2. Helper: pick 8 unique random images from the pool for the grid
    const getGridImages = () => {
        if (allImages.length === 0) return Array(9).fill(null)

        // Fisher-Yates shuffle a copy
        const shuffled = [...allImages]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        // Fill 8 positions (index 4 = center safe zone = null)
        const result = new Array(9).fill(null)
        const fillOrder = [0, 1, 2, 3, 5, 6, 7, 8] // skip center (4)
        fillOrder.forEach((gridIdx, i) => {
            result[gridIdx] = shuffled[i % shuffled.length] || null
        })
        return result
    }

    // 3. Initial Load & Interval
    useEffect(() => {
        setDisplayedImages(getGridImages())

        const intervalId = setInterval(() => {
            setDisplayedImages(getGridImages())
        }, 18000)

        return () => clearInterval(intervalId)
    }, [allImages])

    return (
        <div
            className="absolute inset-0 z-0 overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}
        >
            {/* UNIFIED LAYOUT: Responsive Grid Columns */}
            {/* Mobile: 1fr 4fr 1fr (Maximize center space for text) */}
            {/* Desktop: 1.5fr 1fr 1.5fr (Reduce center space relative to sides, approx 25% width) */}
            <div className="grid grid-cols-[1fr_4fr_1fr] md:grid-cols-[1.5fr_1fr_1.5fr] grid-rows-3 w-full h-full">
                <AnimatePresence mode='popLayout'>
                    {Array.from({ length: 9 }).map((_, index) => {
                        // CENTER CELL (Index 4): Empty for text
                        // This serves as the "safe zone" for the menu on all devices
                        if (index === 4) {
                            return <div key={`empty-cell-${index}`} className="w-full h-full bg-transparent" />
                        }

                        const src = displayedImages[index]
                        return (
                            <motion.div
                                key={`grid-img-${src}-${index}-${Date.now()}`}
                                className="relative w-full h-full overflow-hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, ease: 'easeInOut' }}
                            >
                                {src && (
                                    <img
                                        src={src}
                                        alt="Collection Preview"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* No separate mobile layout needed as 3x3 provides the requested density */}
            {/* No Overlays - Original Colors */}
        </div>
    )
}
