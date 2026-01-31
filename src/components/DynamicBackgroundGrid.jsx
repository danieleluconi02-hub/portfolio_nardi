import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DynamicBackgroundGrid({ manifest }) {
    const [displayedImages, setDisplayedImages] = useState([])

    // 1. Flatten all available images from manifest
    const allImages = useMemo(() => {
        const images = []
        Object.keys(manifest).forEach(category => {
            const collections = manifest[category]?.collections || []
            collections.forEach(col => {
                if (col.images) {
                    col.images.forEach(img => {
                        // Use thumbnails for performance if available, else full
                        // Assuming standard path structure, but can fall back to raw string
                        images.push(img)
                    })
                }
            })
        })
        return images
    }, [manifest])

    // 2. Helper to get random images
    const getRandomImages = (count) => {
        if (allImages.length === 0) return []
        const shuffled = [...allImages].sort(() => 0.5 - Math.random())
        return shuffled.slice(0, count)
    }

    // 3. Initial Load & Interval
    useEffect(() => {
        // Initial set
        setDisplayedImages(getRandomImages(9))

        // Interval to update (15-20 seconds specified, using 18s)
        const intervalId = setInterval(() => {
            setDisplayedImages(getRandomImages(9))
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
