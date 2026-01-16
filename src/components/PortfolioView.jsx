import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Premium cinematic easing
const cinematicEasing = [0.16, 1, 0.3, 1]
const premiumEasing = [0.4, 0, 0.2, 1]

export default function PortfolioView({ category, data, onBack }) {
    const [activeCollectionIndex, setActiveCollectionIndex] = useState(0)
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [isTransitioning, setIsTransitioning] = useState(false)

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

    if (collections.length === 0) {
        return (
            <motion.div
                className="portfolio-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: cinematicEasing }}
            >
                <button className="back-button" onClick={onBack}>Back</button>
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
                Back
            </motion.button>

            {/* Main Image Area - Tap left half = prev, right half = next */}
            <div
                className="relative w-full h-full flex items-center justify-center cursor-pointer px-16"
                onClick={(e) => {
                    // Get click position relative to the container
                    const rect = e.currentTarget.getBoundingClientRect()
                    const clickX = e.clientX - rect.left
                    const containerWidth = rect.width

                    // Left half = go back, Right half = go forward
                    if (clickX < containerWidth / 2) {
                        prevImage()
                    } else {
                        nextImage()
                    }
                }}
            >
                <AnimatePresence mode="wait">
                    {currentImage && (
                        <motion.img
                            key={`${activeCollectionIndex}-${activeImageIndex}`}
                            src={currentImage}
                            alt={`${activeCollection.title} - ${activeImageIndex + 1}`}
                            className="image-display"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: imageLoaded ? 1 : 0.3
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 0.15,
                                ease: premiumEasing
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

            {/* Navigation Hint - positioned at bottom right */}
            <motion.p
                className="fixed bottom-[2%] right-[3%] hint-text text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.25 }}
                transition={{ delay: 1.2 }}
            >
                ← Tap left | Tap right →
            </motion.p>
        </motion.div>
    )
}
