import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DynamicBackgroundGrid({ manifest }) {
    const [displayedItems, setDisplayedItems] = useState([])

    // 1. Flatten all media from all Supabase collections, tagging each as photo or drawing
    const allMedia = useMemo(() => {
        const items = []
        const seen = new Set()
        Object.keys(manifest).forEach(category => {
            const categoryCollections = manifest[category]?.collections || []
            categoryCollections.forEach(col => {
                ;(col.photos || col.images || []).forEach(img => {
                    if (!seen.has(img)) {
                        seen.add(img)
                        items.push({ src: img, type: 'photo' })
                    }
                })
                ;(col.drawings || []).forEach(img => {
                    if (!seen.has(img)) {
                        seen.add(img)
                        items.push({ src: img, type: 'drawing' })
                    }
                })
            })
        })
        return items
    }, [manifest])

    // 2. Helper: pick 8 unique random items from the pool for the grid
    const getGridItems = () => {
        if (allMedia.length === 0) return Array(9).fill(null)

        // Fisher-Yates shuffle a copy
        const shuffled = [...allMedia]
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
        setDisplayedItems(getGridItems())

        const intervalId = setInterval(() => {
            setDisplayedItems(getGridItems())
        }, 18000)

        return () => clearInterval(intervalId)
    }, [allMedia])

    return (
        <div
            className="absolute inset-0 z-0 overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}
        >
            <div className="grid grid-cols-[1fr_4fr_1fr] md:grid-cols-[1.5fr_1fr_1.5fr] grid-rows-3 w-full h-full">
                <AnimatePresence mode='popLayout'>
                    {Array.from({ length: 9 }).map((_, index) => {
                        if (index === 4) {
                            return <div key={`empty-cell-${index}`} className="w-full h-full bg-transparent" />
                        }

                        const item = displayedItems[index]
                        const isDrawing = item?.type === 'drawing'

                        return (
                            <motion.div
                                key={`grid-img-${item?.src}-${index}-${Date.now()}`}
                                className="relative w-full h-full overflow-hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, ease: 'easeInOut' }}
                            >
                                {item && (
                                    <img
                                        src={item.src}
                                        alt=""
                                        className={`w-full h-full object-cover ${isDrawing ? 'mix-blend-multiply' : ''}`}
                                        style={isDrawing ? {
                                            filter: 'grayscale(0.1) contrast(1.2)',
                                        } : undefined}
                                    />
                                )}
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </div>
    )
}
