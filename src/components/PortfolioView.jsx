import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import BackButton from './BackButton'

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

export default function PortfolioView({ category, data, onBack, onGoHome }) {
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

    const [interactionCount, setInteractionCount] = useState(0)
    const activeCollection = collections[activeCollectionIndex]
    const images = activeCollection?.images || []
    const currentImage = images[activeImageIndex]

    const incrementInteraction = useCallback(() => {
        setInteractionCount(prev => prev + 1)
    }, [])

    const nextImage = useCallback(() => {
        if (isTransitioning) return
        setIsTransitioning(true)
        setImageLoaded(false)
        incrementInteraction()

        setTimeout(() => {
            if (activeImageIndex < images.length - 1) {
                setActiveImageIndex(activeImageIndex + 1)
            } else if (activeCollectionIndex < collections.length - 1) {
                setActiveCollectionIndex(activeCollectionIndex + 1)
                setActiveImageIndex(0)
            }
            setIsTransitioning(false)
        }, 100)
    }, [activeImageIndex, activeCollectionIndex, images.length, collections.length, isTransitioning, incrementInteraction])

    const prevImage = useCallback(() => {
        if (isTransitioning) return
        setIsTransitioning(true)
        setImageLoaded(false)
        incrementInteraction()

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
    }, [activeImageIndex, activeCollectionIndex, collections, isTransitioning, incrementInteraction])

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

    // Early return only after every hook has run (Rules of Hooks)
    if (collections.length === 0) {
        return (
            <motion.div
                className="portfolio-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: cinematicEasing }}
            >
                <BackButton onClick={onBack} />
                <p className="text-[var(--text-tertiary)]">No images available</p>
            </motion.div>
        )
    }

    return (
        <motion.div
            className="portfolio-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: cinematicEasing }}
        >
            {/* Back Button */}
            {/* Back Button */}
            <BackButton onClick={onBack} />

            {/* Main Image Area */}
            <div
                className="relative w-full h-full flex items-center justify-center px-4 md:px-16"
                onClick={(e) => {
                    // Mobile tap navigation - left half = prev, right half = next
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const containerWidth = rect.width;

                    // Calculate global position limits
                    const totalImagesGlobal = collections.reduce((acc, col) => acc + (col.images?.length || 0), 0);
                    const currentGlobalIndex = collections.slice(0, activeCollectionIndex).reduce((acc, col) => acc + (col.images?.length || 0), 0) + activeImageIndex;
                    const isFirstImage = currentGlobalIndex === 0;
                    const isLastImage = currentGlobalIndex === totalImagesGlobal - 1;

                    if (clickX < containerWidth / 2 && !isFirstImage) {
                        prevImage();
                    } else if (clickX >= containerWidth / 2 && !isLastImage) {
                        nextImage();
                    }
                }}
            >
                <AnimatePresence mode="wait">
                    {currentImage && (
                        <motion.div
                            key={`${activeCollectionIndex}-${activeImageIndex}`}
                            className="relative inline-block"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ opacity: { duration: 0.3 } }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.1}
                            onDragEnd={(e, { offset }) => {
                                const swipeThreshold = 50;
                                // Only allow navigation within limits
                                const isFirstImage = activeImageIndex === 0 && activeCollectionIndex === 0;
                                const isLastImage = activeImageIndex === images.length - 1 && activeCollectionIndex === collections.length - 1;

                                if (offset.x > swipeThreshold && !isFirstImage) {
                                    prevImage();
                                } else if (offset.x < -swipeThreshold && !isLastImage) {
                                    nextImage();
                                }
                            }}
                        >
                            <img
                                src={currentImage}
                                alt={`${activeCollection.title} - ${activeImageIndex + 1}`}
                                className="image-display block"
                                style={{ opacity: imageLoaded ? 1 : 0.5 }}
                                onLoad={() => setImageLoaded(true)}
                                draggable={false}
                            />

                            {/* Image Counter - Adapted to image corner */}
                            <div className="image-counter">
                                {String(activeImageIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* NAVIGATION ARROWS - Handwritten style */}
                {(() => {
                    const totalImagesGlobal = collections.reduce((acc, col) => acc + (col.images?.length || 0), 0);
                    const currentGlobalIndex = collections.slice(0, activeCollectionIndex).reduce((acc, col) => acc + (col.images?.length || 0), 0) + activeImageIndex;
                    const isFirstImage = currentGlobalIndex === 0;
                    const isLastImage = currentGlobalIndex === totalImagesGlobal - 1;

                    // Arrow visibility logic:
                    // First image: only RIGHT arrow
                    // 2nd and 3rd image: BOTH arrows
                    // 4th image onwards: NO arrows
                    // Last image: LEFT arrow + HOME icon
                    const showLeftArrow = (currentGlobalIndex >= 1 && currentGlobalIndex <= 2) || isLastImage;
                    const showRightArrow = currentGlobalIndex <= 2 && !isLastImage;
                    const showHomeIcon = isLastImage;

                    return (
                        <>
                            {/* LEFT ARROW - Hand-drawn sketchy style */}
                            <AnimatePresence>
                                {showLeftArrow && (
                                    <motion.button
                                        className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 cursor-pointer group z-20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isFirstImage) prevImage();
                                        }}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.4 }}
                                        whileHover={{ scale: 1.1, x: -3 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <svg
                                            width="32"
                                            height="32"
                                            viewBox="0 0 32 32"
                                            fill="none"
                                            className="opacity-50 group-hover:opacity-90 transition-opacity"
                                        >
                                            {/* Sketchy hand-drawn left arrow - irregular strokes */}
                                            <path
                                                d="M23 5 Q21 7, 18 10 Q14 13, 11 16 Q14 19, 18 22 Q21 25, 23 27"
                                                stroke="white"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                            {/* Second slightly offset stroke for hand-drawn effect */}
                                            <path
                                                d="M22.5 6 Q20 8, 17 11 Q13 14, 10.5 16.5 Q13 19, 17 22 Q20 24.5, 22.5 26.5"
                                                stroke="white"
                                                strokeWidth="0.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                                opacity="0.4"
                                            />
                                        </svg>
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* RIGHT ARROW - Hand-drawn sketchy style */}
                            <AnimatePresence>
                                {showRightArrow && (
                                    <motion.button
                                        className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 cursor-pointer group z-20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isLastImage) nextImage();
                                        }}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.4 }}
                                        whileHover={{ scale: 1.1, x: 3 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <svg
                                            width="32"
                                            height="32"
                                            viewBox="0 0 32 32"
                                            fill="none"
                                            className="opacity-50 group-hover:opacity-90 transition-opacity"
                                        >
                                            {/* Sketchy hand-drawn right arrow - irregular strokes */}
                                            <path
                                                d="M9 5 Q11 7, 14 10 Q18 13, 21 16 Q18 19, 14 22 Q11 25, 9 27"
                                                stroke="white"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                            {/* Second slightly offset stroke for hand-drawn effect */}
                                            <path
                                                d="M9.5 6 Q12 8, 15 11 Q19 14, 21.5 16.5 Q19 19, 15 22 Q12 24.5, 9.5 26.5"
                                                stroke="white"
                                                strokeWidth="0.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                                opacity="0.4"
                                            />
                                        </svg>
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            {/* HOME ICON - Only on last image, hand-drawn style, goes to homepage */}
                            <AnimatePresence>
                                {showHomeIcon && (
                                    <motion.button
                                        className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 cursor-pointer group z-20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // On mobile go directly to homepage, on desktop use onBack
                                            if (onGoHome) {
                                                onGoHome();
                                            } else {
                                                onBack();
                                            }
                                        }}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.4 }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        title="Return Home"
                                    >
                                        <svg
                                            width="44"
                                            height="44"
                                            viewBox="0 0 44 44"
                                            fill="none"
                                            className="opacity-50 group-hover:opacity-100 transition-opacity"
                                        >
                                            {/* Hand-drawn sketchy house - multiple strokes for organic feel */}
                                            {/* Roof */}
                                            <path
                                                d="M22 6 Q18 10, 12 15 Q8 18, 6 20"
                                                stroke="white"
                                                strokeWidth="1.4"
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                            <path
                                                d="M22 6 Q26 10, 32 15 Q36 18, 38 20"
                                                stroke="white"
                                                strokeWidth="1.4"
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                            {/* Left wall */}
                                            <path
                                                d="M10 19 Q10 25, 10 32 Q10 36, 10 38"
                                                stroke="white"
                                                strokeWidth="1.3"
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                            {/* Right wall */}
                                            <path
                                                d="M34 19 Q34 25, 34 32 Q34 36, 34 38"
                                                stroke="white"
                                                strokeWidth="1.3"
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                            {/* Bottom */}
                                            <path
                                                d="M10 38 Q18 38, 22 38 Q30 38, 34 38"
                                                stroke="white"
                                                strokeWidth="1.3"
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                            {/* Door */}
                                            <path
                                                d="M18 38 Q18 33, 18 28 Q20 26, 22 26 Q24 26, 26 28 Q26 33, 26 38"
                                                stroke="white"
                                                strokeWidth="1.2"
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                        </svg>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </>
                    );
                })()}
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

            {/* Navigation Hint - Only on desktop, centered below image */}
            <AnimatePresence>
                {interactionCount < 3 && (
                    <motion.p
                        className="fixed bottom-[2%] left-1/2 -translate-x-1/2 hint-text text-center hidden md:block"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.0 }}
                    >
                        {t.ui.tapNavigation}
                    </motion.p>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
