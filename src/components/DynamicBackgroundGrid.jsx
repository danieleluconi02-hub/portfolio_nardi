import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DynamicBackgroundGrid({ manifest }) {
    const [displayedImages, setDisplayedImages] = useState([])

    // 1. Flatten all available COLLECTIONS from manifest (not just images)
    const allCollections = useMemo(() => {
        const collections = []
        Object.keys(manifest).forEach(category => {
            if (category === 'sphereImages') return // Skip non-collection keys
            const categoryCollections = manifest[category]?.collections || []
            categoryCollections.forEach(col => {
                if (col.images && col.images.length > 0) {
                    collections.push(col)
                }
            })
        })
        return collections
    }, [manifest])

    // 2. Helper to get random images (One per collection)
    const getDiverseImages = () => {
        if (allCollections.length === 0) return []

        // Shuffle collections to get a random set of styles
        const shuffledCollections = [...allCollections].sort(() => 0.5 - Math.random())

        // Map to grid slots (9 slots total)
        // We need to fill slots 0,1,2,3, 5,6,7,8 (Slot 4 is empty)
        // If we have fewer collections than slots, we cycle through them
        const result = new Array(9).fill(null)
        let colIndex = 0

        for (let i = 0; i < 9; i++) {
            if (i === 4) continue // Skip center slot

            // Select collection (loop if needed)
            const collection = shuffledCollections[colIndex % shuffledCollections.length]

            // Pick random image from this collection
            if (collection && collection.images) {
                const randomImg = collection.images[Math.floor(Math.random() * collection.images.length)]
                result[i] = randomImg
            }

            colIndex++
        }
        return result
    }

    // 3. Initial Load & Interval
    useEffect(() => {
        // Initial set
        setDisplayedImages(getDiverseImages())

        // Interval to update (18s)
        const intervalId = setInterval(() => {
            setDisplayedImages(getDiverseImages())
        }, 18000)

        return () => clearInterval(intervalId)
    }, [allCollections])

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
