import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import BackButton from './BackButton'

import { useLanguage } from '../contexts/LanguageContext'

// Thumbnails are what the sphere just showed, so they're already cached:
// show them instantly and swap in the full-size file once it has downloaded.
const toThumb = (path) => path ? path.replace('/full/', '/thumb/') : ''

function useProgressiveSrc(fullSrc) {
    const thumbSrc = toThumb(fullSrc)
    const [loadedFull, setLoadedFull] = useState(null)

    useEffect(() => {
        if (!fullSrc || thumbSrc === fullSrc) return
        let cancelled = false
        const img = new Image()
        img.crossOrigin = 'anonymous' // same request mode as the <img> below, so it's reused
        img.onload = () => {
            const done = () => { if (!cancelled) setLoadedFull(fullSrc) }
            img.decode ? img.decode().catch(() => { }).then(done) : done()
        }
        img.src = fullSrc
        return () => { cancelled = true }
    }, [fullSrc, thumbSrc])

    return loadedFull === fullSrc ? fullSrc : thumbSrc
}

// Apple-like easing
const appleEasing = [0.25, 0.1, 0.25, 1]
const cinematicEasing = [0.16, 1, 0.3, 1]

const ImagePreviewModal = memo(function ImagePreviewModal({
    imageData,
    collection,
    onViewCollection,
    onClose
}) {
    const { t } = useLanguage()
    const [imageLoaded, setImageLoaded] = useState(false)
    // Start on the clicked image right away (starting at 0 and correcting it in an
    // effect flashed the wrong photo and reshuffled the deck twice)
    const [selectedImageIndex, setSelectedImageIndex] = useState(() => {
        if (!imageData?.imagePath || !collection?.images) return 0
        const fullPath = imageData.imagePath.replace('/thumb/', '/full/')
        return Math.max(0, collection.images.indexOf(fullPath))
    })
    const [isMobile, setIsMobile] = useState(false)
    const [showDetails, setShowDetails] = useState(false)

    // Detect mobile for responsive deck offsets
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Find the initially clicked image index
    useEffect(() => {
        if (imageData?.imagePath && collection?.images) {
            const fullPath = imageData.imagePath.replace('/thumb/', '/full/')
            const index = collection.images.findIndex(img => img === fullPath)
            if (index !== -1) {
                setSelectedImageIndex(index)
            }
        }
    }, [imageData, collection])

    // Close details drawer when image changes
    useEffect(() => {
        setShowDetails(false)
    }, [selectedImageIndex])

    // Get 2 random images for the deck background (excluding current image)
    const deckImages = useMemo(() => {
        if (!collection?.images || collection.images.length < 2) return []

        const seen = new Set()
        seen.add(collection.images[selectedImageIndex])
        const otherImages = collection.images.filter((img, idx) => {
            if (idx === selectedImageIndex || seen.has(img)) return false
            seen.add(img)
            return true
        })
        const shuffled = [...otherImages]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled.slice(0, Math.min(2, shuffled.length))
    }, [collection, selectedImageIndex])

    // Helper to get full path
    const getFullPath = (path) => path ? path.replace('/thumb/', '/full/') : ''

    // Get current full-size image
    const currentImage = useMemo(() => {
        if (!collection?.images || collection.images.length === 0) return null
        return getFullPath(collection.images[selectedImageIndex])
    }, [collection, selectedImageIndex])

    const currentSrc = useProgressiveSrc(currentImage)
    const deckSrc0 = useProgressiveSrc(getFullPath(deckImages[0]))
    const deckSrc1 = useProgressiveSrc(getFullPath(deckImages[1]))

    const description = collection?.description || ''
    const hasInfo = !!(description || collection?.credits)

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showDetails) setShowDetails(false)
                else onClose()
            } else if (e.key === 'Enter') {
                onViewCollection()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose, onViewCollection, showDetails])

    // Prevent scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    if (!imageData) return null

    return (
        <motion.div
            className="preview-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: appleEasing }}
            onClick={showDetails ? () => setShowDetails(false) : onClose}
        >
            {/* Close Button - Top Left */}
            <BackButton onClick={onClose} className="preview-close-btn-override" />

            {/* Main Content Area */}
            <motion.div
                className="preview-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: cinematicEasing }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Panel - Title and Description (desktop only, hidden on mobile via CSS) */}
                <motion.div
                    className="preview-info-panel"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.5, ease: cinematicEasing }}
                >
                    <h2 className="preview-title">{collection?.title || 'Collection'}</h2>

                    {description && (
                        <div className="preview-description">
                            <ReactMarkdown>{description}</ReactMarkdown>
                        </div>
                    )}
                </motion.div>

                {/* Center - DECK STACK EFFECT (like a hand of cards) */}
                <div className="preview-main-area">
                    <div className="deck-container">
                        {/* CARD 3 (Terzo Livello) - Sbuca a DESTRA, ruotata in senso ORARIO */}
                        {deckImages[1] && (
                            <motion.div
                                className="deck-card deck-card-back"
                                initial={{ opacity: 0, rotate: 0, scale: 0.7, x: 0 }}
                                animate={{
                                    opacity: 1,
                                    rotate: isMobile ? 10 : 10,
                                    scale: isMobile ? 0.85 : 0.88,
                                    x: isMobile ? 85 : 120
                                }}
                                transition={{ delay: 0.15, duration: 0.7, ease: cinematicEasing }}
                                style={{
                                    zIndex: 1,
                                    transformOrigin: 'bottom center',
                                    background: 'none',
                                    padding: 0,
                                    margin: 0,
                                    border: 'none',
                                    backdropFilter: 'none'
                                }}
                            >
                                <img
                                    src={deckSrc1}
                                    crossOrigin="anonymous"
                                    alt="Collection preview background 2"
                                    className="deck-image"
                                    draggable={false}
                                    style={{ opacity: 0.7, filter: 'brightness(0.65)', background: 'none' }}
                                />
                            </motion.div>
                        )}

                        {/* CARD 2 (Secondo Livello) - Sbuca a SINISTRA, ruotata in senso ANTIORARIO */}
                        {deckImages[0] && (
                            <motion.div
                                className="deck-card deck-card-middle"
                                initial={{ opacity: 0, rotate: 0, scale: 0.8, x: 0 }}
                                animate={{
                                    opacity: 1,
                                    rotate: isMobile ? -8 : -8,
                                    scale: isMobile ? 0.9 : 0.92,
                                    x: isMobile ? -75 : -110
                                }}
                                transition={{ delay: 0.25, duration: 0.65, ease: cinematicEasing }}
                                style={{
                                    zIndex: 5,
                                    transformOrigin: 'bottom center',
                                    background: 'none',
                                    padding: 0,
                                    margin: 0,
                                    border: 'none',
                                    backdropFilter: 'none'
                                }}
                            >
                                <img
                                    src={deckSrc0}
                                    crossOrigin="anonymous"
                                    alt="Collection preview background 1"
                                    className="deck-image"
                                    draggable={false}
                                    style={{ opacity: 0.8, filter: 'brightness(0.75)', background: 'none' }}
                                />
                            </motion.div>
                        )}

                        {/* MAIN IMAGE - Grid Centered, no offset */}
                        <motion.div
                            className="deck-card deck-card-front"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: cinematicEasing }}
                            style={{ zIndex: 10 }}
                        >
                            {currentImage && (
                                <div className="sketchy-image-wrapper">
                                    <motion.img
                                        key={selectedImageIndex}
                                        src={currentSrc}
                                        crossOrigin="anonymous"
                                        alt={`${collection?.title} - ${selectedImageIndex + 1}`}
                                        className="preview-main-image"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: imageLoaded ? 1 : 0.3 }}
                                        transition={{ duration: 0.3 }}
                                        onLoad={() => setImageLoaded(true)}
                                        draggable={false}
                                        style={{
                                            boxShadow: 'none',
                                            filter: 'none',
                                            background: 'transparent',
                                            borderRadius: 0
                                        }}
                                    />
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Credits - desktop only (hidden on mobile via CSS) */}
                {collection?.credits && (
                    <motion.div
                        className="preview-credits"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.4 }}
                    >
                        {collection.credits}
                    </motion.div>
                )}

                {/* Right Panel - View Collection Button */}
                <motion.div
                    className="preview-actions-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: cinematicEasing }}
                >
                    <motion.button
                        className="btn-sketchy"
                        onClick={(e) => { e.stopPropagation(); onViewCollection(); }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ fontSize: '1.2rem', padding: '0.6rem 2rem' }}
                    >
                        {t.ui.viewCollection} <span className="arrow">→</span>
                    </motion.button>
                </motion.div>
            </motion.div>

            {/* ── Mobile only ──────────────────────────────────────── */}

            {/* Task B: Collection title — header bar aligned with back/menu center-line */}
            {isMobile && (
                <div className="mobile-preview-title">
                    <span>{collection?.title}</span>
                </div>
            )}

            {/* Info trigger — bottom-right pill, above View Collection */}
            {isMobile && hasInfo && (
                <button
                    className={`mobile-info-trigger${showDetails ? ' mobile-info-trigger--open' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setShowDetails(v => !v) }}
                >
                    {showDetails ? '✕' : 'Info'}
                </button>
            )}

            {/* Slide-up info drawer */}
            <AnimatePresence>
                {isMobile && showDetails && (
                    <motion.div
                        className="mobile-info-drawer"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.38, ease: appleEasing }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {description && (
                            <div className="mobile-info-description">
                                <ReactMarkdown>{description}</ReactMarkdown>
                            </div>
                        )}
                        {collection?.credits && (
                            <p className="mobile-info-credits">{collection.credits}</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
})

export default ImagePreviewModal
