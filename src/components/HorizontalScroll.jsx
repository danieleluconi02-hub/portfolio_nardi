import { useRef, useState, useEffect, useMemo } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

// Apple-like easing
const appleEasing = [0.25, 0.1, 0.25, 1]
const cinematicEasing = [0.16, 1, 0.3, 1]

// Get random cover from collection
function getRandomCover(collection) {
    const images = collection.images || []
    if (images.length === 0) return null
    return images[Math.floor(Math.random() * images.length)]
}

// Single Collection Tile
function CollectionTile({ collection, index, onClick, scrollX }) {
    const [coverImage] = useState(() => getRandomCover(collection))
    const [imageLoaded, setImageLoaded] = useState(false)

    // Parallax offset for this tile
    const tileWidth = 450
    const tileSpacing = 80
    const tilePosition = index * (tileWidth + tileSpacing)

    // Transform scroll position to parallax effect
    const x = useTransform(
        scrollX,
        [tilePosition - 800, tilePosition, tilePosition + 800],
        [40, 0, -40]
    )

    return (
        <motion.div
            className="collection-tile"
            style={{
                minWidth: `${tileWidth}px`,
                marginRight: `${tileSpacing}px`,
                x // Parallax offset
            }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: 0.3 + index * 0.1,
                duration: 0.7,
                ease: cinematicEasing
            }}
            onClick={() => onClick(collection)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Cover Image */}
            <div className="tile-image-container">
                {coverImage && (
                    <motion.img
                        src={coverImage}
                        alt={collection.title}
                        className="tile-image"
                        onLoad={() => setImageLoaded(true)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: imageLoaded ? 1 : 0 }}
                        transition={{ duration: 0.5 }}
                        draggable={false}
                    />
                )}
            </div>

            {/* Metadata */}
            <div className="tile-info">
                <h3 className="tile-title">{collection.title}</h3>
                <p className="tile-meta">
                    {collection.year}
                    {collection.brand && ` · ${collection.brand}`}
                </p>
            </div>
        </motion.div>
    )
}

// Background parallax layer
function ParallaxBackground({ scrollX }) {
    // Background layer moves slower than foreground
    const bgX = useTransform(scrollX, (value) => value * 0.3)

    return (
        <motion.div
            className="parallax-background"
            style={{ x: bgX }}
        >
            {/* Subtle shapes or gradient for depth */}
            <div className="parallax-shape shape-1" />
            <div className="parallax-shape shape-2" />
            <div className="parallax-shape shape-3" />
        </motion.div>
    )
}

// Main Horizontal Scroll Component
export default function HorizontalScroll({
    category,
    collections,
    onSelectCollection,
    onBack
}) {
    const { t } = useLanguage()
    const containerRef = useRef(null)
    const scrollRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)

    // Scroll position as motion value
    const scrollX = useMotionValue(0)
    const smoothScrollX = useSpring(scrollX, { stiffness: 100, damping: 30 })

    // Calculate total scroll width
    const tileWidth = 450
    const tileSpacing = 80
    const totalWidth = collections.length * (tileWidth + tileSpacing)
    const maxScroll = Math.max(0, totalWidth - window.innerWidth + 200)

    // Mouse wheel horizontal scroll
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleWheel = (e) => {
            e.preventDefault()
            const delta = e.deltaY || e.deltaX
            const currentScroll = scrollX.get()
            const newScroll = Math.max(0, Math.min(maxScroll, currentScroll + delta))
            scrollX.set(newScroll)
        }

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [maxScroll, scrollX])

    // Drag handling
    const handleDragStart = () => setIsDragging(true)
    const handleDragEnd = () => setIsDragging(false)

    const handleDrag = (e, info) => {
        const currentScroll = scrollX.get()
        const newScroll = Math.max(0, Math.min(maxScroll, currentScroll - info.delta.x))
        scrollX.set(newScroll)
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            const step = 400
            const currentScroll = scrollX.get()

            if (e.key === 'ArrowRight') {
                scrollX.set(Math.min(maxScroll, currentScroll + step))
            } else if (e.key === 'ArrowLeft') {
                scrollX.set(Math.max(0, currentScroll - step))
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [maxScroll, scrollX])

    const categoryTitle = category === 'design' ? t.menu.fashionDesign : t.menu.styling

    return (
        <motion.div
            ref={containerRef}
            className="horizontal-scroll-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: appleEasing }}
        >
            {/* Background with parallax */}
            <ParallaxBackground scrollX={smoothScrollX} />

            {/* Back Button */}
            <motion.button
                className="back-button"
                onClick={onBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
            >
                {t.ui.back}
            </motion.button>

            {/* Category Title */}
            <motion.h2
                className="scroll-category-title"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: cinematicEasing }}
            >
                {categoryTitle}
            </motion.h2>

            {/* Scrollable tiles container */}
            <motion.div
                ref={scrollRef}
                className="tiles-track"
                style={{ x: useTransform(smoothScrollX, (v) => -v) }}
                drag="x"
                dragConstraints={{ left: -maxScroll, right: 0 }}
                dragElastic={0.1}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrag={handleDrag}
            >
                {collections.map((collection, index) => (
                    <CollectionTile
                        key={collection.id}
                        collection={collection}
                        index={index}
                        onClick={onSelectCollection}
                        scrollX={smoothScrollX}
                    />
                ))}
            </motion.div>

            {/* Scroll hint */}
            <motion.p
                className="scroll-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                transition={{ delay: 1.2, duration: 0.5 }}
            >
                {t.ui.dragToExplore}
            </motion.p>

            {/* Progress indicator */}
            <motion.div
                className="scroll-progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.8, duration: 0.5 }}
            >
                <motion.div
                    className="scroll-progress-bar"
                    style={{
                        scaleX: useTransform(smoothScrollX, [0, maxScroll], [0.1, 1])
                    }}
                />
            </motion.div>
        </motion.div>
    )
}
