import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DynamicBackgroundGrid({ manifest }) {
    const [displayedImages, setDisplayedImages] = useState([])

    // 1. Flatten all available COLLECTIONS from manifest
    // And pre-sort images into "photos" and "drawings" for each collection.
    const processedCollections = useMemo(() => {
        const results = []
        Object.keys(manifest).forEach(category => {
            if (category === 'sphereImages') return
            const categoryCollections = manifest[category]?.collections || []

            categoryCollections.forEach(col => {
                if (!col.images || col.images.length === 0) return

                // Split images based on path
                const drawings = col.images.filter(img => img.includes('/Disegni/'))
                const photos = col.images.filter(img => !img.includes('/Disegni/')) // Assume non-Disegni are photos

                if (drawings.length > 0 || photos.length > 0) {
                    results.push({
                        ...col,
                        drawings,
                        photos
                    })
                }
            })
        })
        return results
    }, [manifest])

    // 2. Helper to get stratified images
    const getStratifiedImages = () => {
        if (processedCollections.length === 0) return Array(9).fill(null)

        // Shuffle collections for randomness
        const shuffled = [...processedCollections]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        // We need 4 distinct collections for Corners (Drawings)
        // And 4 distinct collections for Sides (Photos)

        // Filter collections that HAVE drawings/photos
        const drawingCandidates = shuffled.filter(c => c.drawings.length > 0)
        const photoCandidates = shuffled.filter(c => c.photos.length > 0)

        // Select collections for corners (0, 2, 6, 8)
        // Prefer uniqueness. If not enough distinct collections, cycle.
        const cornerCollections = []
        for (let i = 0; i < 4; i++) {
            if (drawingCandidates.length > 0) {
                cornerCollections.push(drawingCandidates[i % drawingCandidates.length])
            } else {
                cornerCollections.push(null)
            }
        }

        // Select collections for sides (1, 3, 5, 7)
        // Try to pick ones NOT used in corners first for max diversity, but hard with limited collections.
        // Just pick distinct photo candidates.
        const sideCollections = []
        for (let i = 0; i < 4; i++) {
            if (photoCandidates.length > 0) {
                sideCollections.push(photoCandidates[i % photoCandidates.length])
            } else {
                sideCollections.push(null)
            }
        }

        // Fill the grid
        const result = new Array(9).fill(null)

        // Corners: 0, 2, 6, 8
        const cornerIndices = [0, 2, 6, 8]
        cornerIndices.forEach((gridIdx, i) => {
            const col = cornerCollections[i]
            if (col) {
                const randomImg = col.drawings[Math.floor(Math.random() * col.drawings.length)]
                result[gridIdx] = randomImg
            }
        })

        // Sides: 1, 3, 5, 7
        const sideIndices = [1, 3, 5, 7]
        sideIndices.forEach((gridIdx, i) => {
            const col = sideCollections[i]
            if (col) {
                const randomImg = col.photos[Math.floor(Math.random() * col.photos.length)]
                result[gridIdx] = randomImg
            }
        })

        return result
    }

    // 3. Initial Load & Interval
    useEffect(() => {
        setDisplayedImages(getStratifiedImages())

        const intervalId = setInterval(() => {
            setDisplayedImages(getStratifiedImages())
        }, 18000)

        return () => clearInterval(intervalId)
    }, [processedCollections])

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
