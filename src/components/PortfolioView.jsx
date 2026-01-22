import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

// Premium cinematic easing
const cinematicEasing = [0.16, 1, 0.3, 1]
const premiumEasing = [0.4, 0, 0.2, 1]

// Preload an image and return a promise
const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(src)
        img.onerror = reject
        img.src = src
    })
}

export default function PortfolioView({ category, data, onBack }) {
    const { t } = useLanguage()
    const [activeCollectionIndex, setActiveCollectionIndex] = useState(0)
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const preloadedImages = useRef(new Set()) // Track which images are preloaded

    const collections = data?.collections || []

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isTransitioning) return

            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault()
                nextImage()
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                prevImage()
            } else if (e.key === 'Escape') {
                onBack()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeImageIndex, activeCollectionIndex, isTransitioning])

    // Preload adjacent images for smoother navigation
    useEffect(() => {
        if (collections.length === 0) return

        const activeCollection = collections[activeCollectionIndex]
        const images = activeCollection?.images || []

        // Images to preload: current, next 2, and previous 1
        const indicesToPreload = [
            activeImageIndex,
            activeImageIndex + 1,
            activeImageIndex + 2,
            activeImageIndex - 1
        ].filter(i => i >= 0 && i < images.length)

        indicesToPreload.forEach(index => {
            const src = images[index]
            if (src && !preloadedImages.current.has(src)) {
                preloadedImages.current.add(src)
                preloadImage(src).catch(() => {
                    // Silent fail - just means image won't be preloaded
                })
            }
        })
    }, [activeImageIndex, activeCollectionIndex, collections])

    if (collections.length === 0) {
        return (
            <motion.div
                className="portfolio-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: cinematicEasing }}
            >
                <button className="back-button" onClick={onBack}>{t.ui.back}</button>
                <p className="text-[var(--text-tertiary)]">No images available</p>
            </motion.div>
        )
    }

    const activeCollection = collections[activeCollectionIndex]
    const images = activeCollection?.images || []
    const currentImage = images[activeImageIndex]

    const nextImage = useCallback(() => {
        if (isTransitioning) return
        setIsTransitioning(true)
        setImageLoaded(false)

        setTimeout(() => {
            if (activeImageIndex < images.length - 1) {
                setActiveImageIndex(activeImageIndex + 1)
            } else if (activeCollectionIndex < collections.length - 1) {
                setActiveCollectionIndex(activeCollectionIndex + 1)
                setActiveImageIndex(0)
            }
            setIsTransitioning(false)
        }, 100)
    }, [activeImageIndex, activeCollectionIndex, images.length, collections.length, isTransitioning])

    const prevImage = useCallback(() => {
        if (isTransitioning) return
        setIsTransitioning(true)
        setImageLoaded(false)

        setTimeout(() => {
            if (activeImageIndex > 0) {
                setActiveImageIndex(activeImageIndex - 1)
            } else if (activeCollectionIndex > 0) {
                const prevCollection = collections[activeCollectionIndex - 1]
                setActiveCollectionIndex(activeCollectionIndex - 1)
                setActiveImageIndex((prevCollection?.images?.length || 1) - 1)
            }
            setIsTransitioning(false)
        }, 100)
    }, [activeImageIndex, activeCollectionIndex, collections, isTransitioning])

    const goToSection = useCallback((index) => {
        if (index !== activeCollectionIndex && !isTransitioning) {
            setIsTransitioning(true)
            setImageLoaded(false)

            setTimeout(() => {
                setActiveCollectionIndex(index)
                setActiveImageIndex(0)
                setIsTransitioning(false)
            }, 100)
        }
    }, [activeCollectionIndex, isTransitioning])

    return (
        <motion.div
            className="portfolio-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: cinematicEasing }}
        >
            {/* Back Button */}
            <motion.button
                className="back-button"
                onClick={onBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
            >
                {t.ui.back}
            </motion.button>

            {/* Main Image Area - Tap left half = prev, right half = next, or Swipe */}
            <div
                className="relative w-full h-full flex items-center justify-center cursor-pointer px-16"
                onClick={(e) => {
                    // Only trigger click if we didn't drag
                    // (Framer motion handles this distinction well usually, but we keep this as fallback for taps)
                    const rect = e.currentTarget.getBoundingClientRect()
                    const clickX = e.clientX - rect.left
                    const containerWidth = rect.width
                    if (clickX < containerWidth / 2) prevImage()
                    else nextImage()
                }}
            >
                <AnimatePresence mode="wait">
                    {currentImage && (
                        <motion.img
                            key={`${activeCollectionIndex}-${activeImageIndex}`}
                            src={currentImage}
                            alt={`${activeCollection.title} - ${activeImageIndex + 1}`}
                            className="image-display"
                            initial={{ opacity: 0, x: 0 }}
                            animate={{
                                opacity: imageLoaded ? 1 : 0.3,
                                x: 0
                            }}
                            exit={{ opacity: 0, x: 0 }} // Simple fade out to avoid conflict with drag
                            transition={{
                                opacity: { duration: 0.2 },
                                x: { type: "spring", stiffness: 300, damping: 30 }
                            }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipeThreshold = 50;
                                if (offset.x > swipeThreshold) {
                                    prevImage();
                                } else if (offset.x < -swipeThreshold) {
                                    nextImage();
                                }
                            }}
                            onLoad={() => setImageLoaded(true)}
                            draggable={false}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Project Info - Editorial Style */}
            <motion.div
                className="project-info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: cinematicEasing }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeCollectionIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5, ease: premiumEasing }}
                    >
                        <h2 className="project-title">{activeCollection.title}</h2>
                        <p className="project-meta">
                            {activeCollection.year}
                            {activeCollection.brand && ` · ${activeCollection.brand}`}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            {/* Image Counter */}
            <motion.div
                className="image-counter"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.6 }}
            >
                {String(activeImageIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
            </motion.div>

            {/* Section Navigation Dots */}
            {collections.length > 1 && (
                <motion.div
                    className="nav-dots"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {collections.map((col, index) => (
                        <button
                            key={col.id || index}
                            className={`nav-dot ${index === activeCollectionIndex ? 'active' : ''}`}
                            onClick={() => goToSection(index)}
                            title={col.title}
                        />
                    ))}
                </motion.div>
            )}

            {/* Navigation Hint - centered below image */}
            <motion.p
                className="fixed bottom-[8%] left-1/2 -translate-x-1/2 hint-text text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.25 }}
                transition={{ delay: 1.2 }}
            >
                {t.ui.tapNavigation}
            </motion.p>
        </motion.div>
    )
}
