import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import BackButton from './BackButton'

// Apple-like easing curves
const cinematicEasing = [0.16, 1, 0.3, 1]

// Video data - your fashion films
const videos = [
    {
        id: 'shinrai-1',
        title: 'Shinrai - Part 1',
        description: 'A cinematic journey through fashion and trust.',
        src: '/assets/videos/Shinrai parte 1.mp4',
    },
    {
        id: 'shinrai-2',
        title: 'Shinrai - Part 2',
        description: 'The continuation of the Shinrai story.',
        src: '/assets/videos/Shinrai Parte2 .mov',
    },
    {
        id: 'tetsu-no-hana',
        title: 'Tetsu no Hana',
        description: 'Iron Flower - A visual poem.',
        src: '/assets/videos/Tetsu no hana.mp4',
    }
]

export default function FashionFilmPage({ onBack }) {
    const { t } = useLanguage()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    const mainVideoRef = useRef(null)
    const previewRefs = useRef([])
    const fullscreenContainerRef = useRef(null)
    const containerRef = useRef(null)

    // Touch/swipe state
    const touchStartX = useRef(0)
    const touchStartY = useRef(0)
    const dragX = useMotionValue(0)

    // Fullscreen dismiss state
    const dismissY = useMotionValue(0)
    const dismissOpacity = useTransform(dismissY, [0, 150], [1, 0.3])
    const dismissScale = useTransform(dismissY, [0, 150], [1, 0.85])

    const currentVideo = videos[currentIndex]

    // Interaction tracking for hint visibility using the same logic as PortfolioView
    const [interactionCount, setInteractionCount] = useState(0)
    const incrementInteraction = useCallback(() => {
        setInteractionCount(prev => prev + 1)
    }, [])

    // Navigate to video
    const navigateTo = useCallback((index) => {
        if (mainVideoRef.current) {
            mainVideoRef.current.pause()
            mainVideoRef.current.currentTime = 0
        }
        setIsPlaying(false)
        setCurrentIndex(index)
        incrementInteraction()
    }, [incrementInteraction])

    // Navigate prev/next with wrap-around
    const goToPrev = useCallback(() => {
        const newIndex = (currentIndex - 1 + videos.length) % videos.length
        navigateTo(newIndex)
    }, [currentIndex, navigateTo])

    const goToNext = useCallback(() => {
        const newIndex = (currentIndex + 1) % videos.length
        navigateTo(newIndex)
    }, [currentIndex, navigateTo])

    // Handle video play
    const handlePlay = useCallback(() => {
        if (mainVideoRef.current) {
            mainVideoRef.current.play()
            setIsPlaying(true)
            // Pause all previews
            previewRefs.current.forEach(ref => {
                if (ref) ref.pause()
            })
        }
    }, [])

    // Handle video pause
    const handlePause = useCallback(() => {
        if (mainVideoRef.current) {
            mainVideoRef.current.pause()
            setIsPlaying(false)
        }
    }, [])

    // Touch handlers for swipe navigation
    const handleTouchStart = useCallback((e) => {
        if (isPlaying) return
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
        setIsDragging(true)
    }, [isPlaying])

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || isPlaying) return
        const currentX = e.touches[0].clientX
        const diff = currentX - touchStartX.current
        dragX.set(diff)
    }, [isDragging, isPlaying, dragX])

    const handleTouchEnd = useCallback(() => {
        if (!isDragging) return
        const swipeThreshold = 80
        const currentDrag = dragX.get()

        if (currentDrag > swipeThreshold) {
            goToPrev()
        } else if (currentDrag < -swipeThreshold) {
            goToNext()
        }

        incrementInteraction()
        animate(dragX, 0, { duration: 0.3 })
        setIsDragging(false)
    }, [isDragging, dragX, goToPrev, goToNext, incrementInteraction])

    // Fullscreen dismiss handlers
    const handleFullscreenTouchStart = useCallback((e) => {
        touchStartY.current = e.touches[0].clientY
    }, [])

    const handleFullscreenTouchMove = useCallback((e) => {
        if (!isFullscreen) return
        const currentY = e.touches[0].clientY
        const diff = Math.max(0, currentY - touchStartY.current) // Only allow downward drag
        dismissY.set(diff)
    }, [isFullscreen, dismissY])

    const handleFullscreenTouchEnd = useCallback(() => {
        const dismissThreshold = 100
        if (dismissY.get() > dismissThreshold) {
            // Exit fullscreen
            if (document.fullscreenElement) {
                document.exitFullscreen()
            }
            setIsFullscreen(false)
            handlePause()
        }
        animate(dismissY, 0, { duration: 0.3 })
    }, [dismissY, handlePause])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') goToPrev()
            if (e.key === 'ArrowRight') goToNext()
            if (e.key === 'Escape') {
                if (isFullscreen) {
                    document.exitFullscreen()
                    setIsFullscreen(false)
                }
                if (isPlaying) handlePause()
            }
            if (e.key === ' ') {
                e.preventDefault()
                isPlaying ? handlePause() : handlePlay()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [goToPrev, goToNext, isPlaying, isFullscreen, handlePause, handlePlay])

    // Preview video autoplay on hover/visible
    useEffect(() => {
        if (isPlaying) return

        const playPreviews = () => {
            previewRefs.current.forEach((ref, idx) => {
                if (ref && idx !== currentIndex) {
                    ref.currentTime = 0
                    ref.play().catch(() => { })
                }
            })
        }

        const timeout = setTimeout(playPreviews, 300)
        return () => clearTimeout(timeout)
    }, [currentIndex, isPlaying])

    // Toggle fullscreen
    const enterFullscreen = useCallback(async () => {
        if (!fullscreenContainerRef.current) return
        try {
            await fullscreenContainerRef.current.requestFullscreen()
            setIsFullscreen(true)
        } catch (err) {
            console.error('Fullscreen error:', err)
        }
    }, [])

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFsChange = () => {
            const isFull = !!document.fullscreenElement
            setIsFullscreen(isFull)
            if (!isFull && mainVideoRef.current) {
                mainVideoRef.current.pause()
                setIsPlaying(false)
            }
        }
        document.addEventListener('fullscreenchange', handleFsChange)
        return () => document.removeEventListener('fullscreenchange', handleFsChange)
    }, [])

    return (
        <motion.div
            ref={containerRef}
            className="fashion-film-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: cinematicEasing }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Back Button */}
            {/* Back Button */}
            <BackButton onClick={onBack} />

            {/* Section Title */}
            <motion.h1
                className="fashion-film-title"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
            >
                FASHION FILM
            </motion.h1>

            {/* Swipeable Video Cards Container */}
            <motion.div
                className="video-cards-container"
                style={{ x: dragX, touchAction: 'pan-y' }}
            >
                {videos.map((video, idx) => {
                    const isActive = idx === currentIndex
                    const offset = idx - currentIndex

                    return (
                        <motion.div
                            key={video.id}
                            className={`video-card ${isActive ? 'video-card--active' : ''}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{
                                opacity: Math.abs(offset) <= 1 ? 1 : 0.3,
                                scale: isActive ? 1 : 0.85,
                                x: offset * 320,
                                zIndex: isActive ? 10 : 5 - Math.abs(offset)
                            }}
                            transition={{ duration: 0.5, ease: cinematicEasing }}
                            onClick={() => !isActive && navigateTo(idx)}
                        >
                            {/* Video Preview Container */}
                            <div
                                ref={isActive ? fullscreenContainerRef : null}
                                className={`video-card-inner ${isActive && isPlaying ? 'playing' : ''}`}
                                onTouchStart={isFullscreen ? handleFullscreenTouchStart : undefined}
                                onTouchMove={isFullscreen ? handleFullscreenTouchMove : undefined}
                                onTouchEnd={isFullscreen ? handleFullscreenTouchEnd : undefined}
                            >
                                <motion.div
                                    style={isFullscreen ? {
                                        opacity: dismissOpacity,
                                        scale: dismissScale
                                    } : {}}
                                >
                                    <video
                                        ref={isActive ? mainVideoRef : (el => previewRefs.current[idx] = el)}
                                        src={video.src}
                                        muted={!isActive || !isPlaying}
                                        loop={!isActive}
                                        playsInline
                                        preload="metadata"
                                        poster={video.poster}
                                        onEnded={() => setIsPlaying(false)}
                                        controls={isActive && isPlaying}
                                        onClick={(e) => {
                                            if (isActive) {
                                                e.stopPropagation()
                                                isPlaying ? handlePause() : handlePlay()
                                            }
                                        }}
                                    />
                                </motion.div>

                                {/* Play Button Overlay */}
                                <AnimatePresence>
                                    {isActive && !isPlaying && (
                                        <motion.div
                                            className="play-overlay"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            onClick={handlePlay}
                                        >
                                            <motion.div
                                                className="play-button-large"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Fullscreen Button */}
                                {isActive && isPlaying && (
                                    <motion.button
                                        className="fullscreen-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            enterFullscreen()
                                        }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                        </svg>
                                    </motion.button>
                                )}

                                {/* Preview indicator for non-active cards */}
                                {!isActive && (
                                    <div className="preview-indicator">
                                        <span className="preview-play-icon">▶</span>
                                    </div>
                                )}
                            </div>

                            {/* Video Info */}
                            <motion.div
                                className="video-card-info"
                                animate={{ opacity: isPlaying && isActive ? 0 : 1 }}
                            >
                                <h3 className="video-card-title">{video.title}</h3>
                                <p className="video-card-description">{video.description}</p>
                            </motion.div>

                            {/* Image Counter - Adapted to card Top-Center */}
                            {isActive && (
                                <div className="image-counter">
                                    {String(idx + 1).padStart(2, '0')} / {String(videos.length).padStart(2, '0')}
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </motion.div>

            {/* Navigation Hint - Vanishes after 3 interactions */}
            <AnimatePresence>
                {interactionCount < 3 && !isPlaying && (
                    <motion.p
                        className="fixed bottom-[2%] left-1/2 -translate-x-1/2 hint-text text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.0 }}
                    >
                        {t.ui.tapNavigation || "TAP LEFT / RIGHT"}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* Fullscreen Dismiss Hint */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        className="fullscreen-dismiss-hint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 2, duration: 0.5 }}
                    >
                        ↓ Swipe down to close
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
