import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Apple-like easing curves
const appleEasing = [0.25, 0.1, 0.25, 1]
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
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const mainVideoRef = useRef(null)
    const previewRefs = useRef([])
    const fullscreenContainerRef = useRef(null)

    // Get adjacent indices for the carousel
    const getPrevIndex = (idx) => (idx - 1 + videos.length) % videos.length
    const getNextIndex = (idx) => (idx + 1) % videos.length

    const prevIndex = getPrevIndex(currentIndex)
    const nextIndex = getNextIndex(currentIndex)

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

    // Navigate to video
    const navigateTo = useCallback((index) => {
        // Pause current video
        if (mainVideoRef.current) {
            mainVideoRef.current.pause()
            mainVideoRef.current.currentTime = 0
        }
        setIsPlaying(false)
        setCurrentIndex(index)
    }, [])

    // Navigate to previous/next
    const goToPrev = useCallback(() => navigateTo(prevIndex), [navigateTo, prevIndex])
    const goToNext = useCallback(() => navigateTo(nextIndex), [navigateTo, nextIndex])

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') goToPrev()
            if (e.key === 'ArrowRight') goToNext()
            if (e.key === 'Escape' && isPlaying) handlePause()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [goToPrev, goToNext, isPlaying, handlePause])

    // Preview video loop effect - play short highlights
    useEffect(() => {
        if (isPlaying) return // Don't run previews when main video is playing

        const playPreviews = () => {
            previewRefs.current.forEach((ref, idx) => {
                if (ref && idx !== currentIndex) {
                    ref.currentTime = 0
                    ref.play().catch(() => { }) // Ignore autoplay errors
                }
            })
        }

        // Start previews with a small delay
        const timeout = setTimeout(playPreviews, 500)
        return () => clearTimeout(timeout)
    }, [currentIndex, isPlaying])

    // Toggle fullscreen
    const toggleFullscreen = useCallback(async () => {
        if (!fullscreenContainerRef.current) return
        try {
            if (!document.fullscreenElement) {
                await fullscreenContainerRef.current.requestFullscreen()
                setIsFullscreen(true)
            } else {
                await document.exitFullscreen()
                setIsFullscreen(false)
            }
        } catch (err) {
            console.error('Fullscreen error:', err)
        }
    }, [])

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handleFsChange)
        return () => document.removeEventListener('fullscreenchange', handleFsChange)
    }, [])

    const currentVideo = videos[currentIndex]

    return (
        <motion.div
            className="fashion-film-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: cinematicEasing }}
            style={{ overflowX: 'auto', overflowY: 'hidden' }}
        >
            {/* Back Button */}
            <motion.button
                className="back-button"
                onClick={onBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
            >
                Back
            </motion.button>

            {/* Carousel Container */}
            <motion.div
                className="video-carousel"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8, ease: cinematicEasing }}
            >
                {/* Previous Video Preview */}
                <motion.div
                    className="video-preview video-preview--left"
                    onClick={goToPrev}
                    whileHover={{ scale: 1.03, x: -5 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="preview-video-container">
                        <video
                            ref={el => previewRefs.current[prevIndex] = el}
                            src={videos[prevIndex].src}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                        />
                        <div className="preview-overlay">
                            <span className="preview-nav-icon">‹</span>
                        </div>
                    </div>
                    <p className="preview-title">{videos[prevIndex].title}</p>
                </motion.div>

                {/* Main Video */}
                <motion.div
                    ref={fullscreenContainerRef}
                    className={`video-main ${isPlaying ? 'video-main--playing' : ''}`}
                    layout
                >
                    <div className="main-video-container" onClick={isPlaying ? handlePause : handlePlay}>
                        <video
                            ref={mainVideoRef}
                            src={currentVideo.src}
                            playsInline
                            preload="metadata"
                            onEnded={() => setIsPlaying(false)}
                            controls={isPlaying}
                        />

                        {/* Play Button Overlay */}
                        <AnimatePresence>
                            {!isPlaying && (
                                <motion.div
                                    className="play-overlay"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
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
                    </div>

                    {/* Video Info */}
                    <motion.div
                        className="video-main-info"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isPlaying ? 0 : 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="main-video-title">{currentVideo.title}</h2>
                        <p className="main-video-description">{currentVideo.description}</p>
                    </motion.div>

                    {/* Fullscreen Button */}
                    {isPlaying && (
                        <motion.button
                            className="fullscreen-btn"
                            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileHover={{ scale: 1.1 }}
                        >
                            {isFullscreen ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                </svg>
                            )}
                        </motion.button>
                    )}
                </motion.div>

                {/* Next Video Preview */}
                <motion.div
                    className="video-preview video-preview--right"
                    onClick={goToNext}
                    whileHover={{ scale: 1.03, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="preview-video-container">
                        <video
                            ref={el => previewRefs.current[nextIndex] = el}
                            src={videos[nextIndex].src}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                        />
                        <div className="preview-overlay">
                            <span className="preview-nav-icon">›</span>
                        </div>
                    </div>
                    <p className="preview-title">{videos[nextIndex].title}</p>
                </motion.div>
            </motion.div>

            {/* Video Indicators */}
            <motion.div
                className="video-indicators"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.8, duration: 0.5 }}
            >
                {videos.map((video, idx) => (
                    <button
                        key={video.id}
                        className={`video-indicator ${idx === currentIndex ? 'active' : ''}`}
                        onClick={() => navigateTo(idx)}
                        aria-label={`Go to ${video.title}`}
                    />
                ))}
            </motion.div>

            {/* Hint */}
            <motion.p
                className="fashion-film-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: isPlaying ? 0 : 0.35 }}
                transition={{ delay: 1, duration: 0.5 }}
            >
                Click to play · Use arrows to navigate
            </motion.p>
        </motion.div>
    )
}
