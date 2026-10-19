import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import BackButton from './BackButton'

import { useLanguage } from '../contexts/LanguageContext'

// Thumbnails are what the sphere just showed, so they're already cached.
// The thumbnail is shown at once and holds the layout, sized by CSS exactly as
// the full image will be (from its aspect ratio, see .pv-sized in index.css).
// The full-size file is laid over it and fades in once downloaded:
// instant image, no size jump, no empty box while the big file loads.
const toThumb = (path) => path ? path.replace('/full/', '/thumb/') : ''

function ProgressiveImage({ src, alt, className, style, wrapperStyle }) {
    const thumbSrc = toThumb(src)
    const [ratio, setRatio] = useState(null)
    const [thumbFailed, setThumbFailed] = useState(false)
    const [fullLoaded, setFullLoaded] = useState(false)

    if (!src) return null

    // No separate thumbnail (or it failed): plain image, as before
    if (thumbSrc === src || thumbFailed) {
        return <img src={src} alt={alt} className={className} style={style} draggable={false} />
    }

    return (
        <span style={{ position: 'relative', display: 'block', lineHeight: 0, ...wrapperStyle }}>
            <img
                src={thumbSrc}
                crossOrigin="anonymous" // same request mode as the sphere textures, so it's a cache hit
                alt={alt}
                className={`${className}${ratio ? ' pv-sized' : ''}`}
                style={{ ...style, ...(ratio ? { '--pv-ratio': ratio } : null) }}
                onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                onError={() => setThumbFailed(true)}
                draggable={false}
            />
            <img
                src={src}
                alt=""
                aria-hidden="true"
                onLoad={() => setFullLoaded(true)}
                draggable={false}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    opacity: fullLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            />
        </span>
    )
}

// Desktop info panel body: description and credits are clipped to a few lines
// with a soft fade; "Read more" only appears when something is actually hidden.
// Expanded, the panel may scroll (thin scrollbar, see .preview-info-panel).
function InfoPanelBody({ description, credits, t }) {
    const [expanded, setExpanded] = useState(false)
    const [clipped, setClipped] = useState({ desc: false, credits: false })
    const overflowing = clipped.desc || clipped.credits
    const descRef = useRef(null)
    const creditsRef = useRef(null)

    useLayoutEffect(() => {
        if (expanded) return
        const isClipped = (el) => !!el && el.scrollHeight > el.clientHeight + 1
        const measure = () => setClipped({
            desc: isClipped(descRef.current),
            credits: isClipped(creditsRef.current),
        })
        measure()
        // Fonts can change line breaks after the first measurement
        document.fonts?.ready?.then(measure)
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [description, credits, expanded])

    // has-more (the fade) only on the block that actually hides text
    const state = (isClipped) => expanded ? 'is-expanded' : `is-collapsed${isClipped ? ' has-more' : ''}`

    return (
        <>
            {description && (
                <div ref={descRef} className={`preview-description ${state(clipped.desc)}`}>
                    <ReactMarkdown>{description}</ReactMarkdown>
                </div>
            )}

            {credits && (
                <p ref={creditsRef} className={`preview-panel-credits ${state(clipped.credits)}`}>{credits}</p>
            )}

            {(overflowing || expanded) && (
                <button
                    type="button"
                    className="preview-read-more"
                    onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
                >
                    {expanded ? (t.ui.readLess || 'Show less') : (t.ui.readMore || 'Read more')}
                    <span className={`preview-read-more-arrow${expanded ? ' is-up' : ''}`} aria-hidden="true">↓</span>
                </button>
            )}
        </>
    )
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

                    {/* Credits live in the panel (they used to float over the photos) */}
                    <InfoPanelBody description={description} credits={collection?.credits} t={t} />
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
                                <ProgressiveImage
                                    src={getFullPath(deckImages[1])}
                                    alt="Collection preview background 2"
                                    className="deck-image"
                                    style={{ background: 'none' }}
                                    wrapperStyle={{ opacity: 0.7, filter: 'brightness(0.65)' }}
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
                                <ProgressiveImage
                                    src={getFullPath(deckImages[0])}
                                    alt="Collection preview background 1"
                                    className="deck-image"
                                    style={{ background: 'none' }}
                                    wrapperStyle={{ opacity: 0.8, filter: 'brightness(0.75)' }}
                                />
                            </motion.div>
                        )}

                        {/* MAIN IMAGE - Grid Centered, no offset */}
                        <motion.div
                            className="deck-card deck-card-front"
                            // fade only: the old 0.95 -> 1 zoom read as "small, then big"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, ease: cinematicEasing }}
                            style={{ zIndex: 10 }}
                        >
                            {currentImage && (
                                <div className="sketchy-image-wrapper">
                                    <ProgressiveImage
                                        key={selectedImageIndex}
                                        src={currentImage}
                                        alt={`${collection?.title} - ${selectedImageIndex + 1}`}
                                        className="preview-main-image"
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
