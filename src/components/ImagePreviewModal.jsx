import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'

// Apple-like easing
const appleEasing = [0.25, 0.1, 0.25, 1]
const cinematicEasing = [0.16, 1, 0.3, 1]

export default function ImagePreviewModal({
    imageData,
    collection,
    onViewCollection,
    onClose
}) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [randomImages, setRandomImages] = useState([])

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

    // Get 3 random images (different from the current one)
    useEffect(() => {
        if (!collection?.images || collection.images.length < 2) return

        const otherImages = collection.images.filter((_, idx) => idx !== selectedImageIndex)
        const shuffled = [...otherImages].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, Math.min(3, shuffled.length))

        // Convert to thumbnails for display
        setRandomImages(selected.map(img => img.replace('/full/', '/thumb/')))
    }, [collection, selectedImageIndex])

    // Get current full-size image
    const currentImage = useMemo(() => {
        if (!collection?.images || collection.images.length === 0) return null
        return collection.images[selectedImageIndex]
    }, [collection, selectedImageIndex])

    // Default description
    const description = collection?.description ||
        "A curated collection showcasing distinctive visual narratives and artistic vision. Each piece represents a unique exploration of form, texture, and composition."

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'Enter') {
                onViewCollection()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose, onViewCollection])

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
            onClick={onClose}
        >
            {/* Close Button - Top Left */}
            <motion.button
                className="preview-close-btn"
                onClick={onClose}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4, ease: cinematicEasing }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <span className="close-icon">←</span>
                <span className="close-text">Close</span>
            </motion.button>

            {/* View Collection Button - Right Side */}


            {/* Main Content Area */}
            <motion.div
                className="preview-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: cinematicEasing }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Panel - Title and Description */}
                <motion.div
                    className="preview-info-panel"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.5, ease: cinematicEasing }}
                >
                    <h2 className="preview-title">{collection?.title || 'Collection'}</h2>

                    <p className="preview-description">{description}</p>
                </motion.div>

                {/* Center - Main Image and Random Thumbnails */}
                <div className="preview-main-area">
                    {/* Main Image */}
                    <motion.div
                        className="preview-image-wrapper"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: cinematicEasing }}
                    >
                        {currentImage && (
                            <motion.img
                                key={selectedImageIndex}
                                src={currentImage}
                                alt={`${collection?.title} - ${selectedImageIndex + 1}`}
                                className="preview-main-image"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: imageLoaded ? 1 : 0.3 }}
                                transition={{ duration: 0.3 }}
                                onLoad={() => setImageLoaded(true)}
                                draggable={false}
                            />
                        )}
                    </motion.div>

                    {/* 3 Random Images Below - "Alive" Effect */}
                    <motion.div
                        className="preview-bottom-row"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5, ease: cinematicEasing }}
                    >
                        <div className="preview-random-images">
                            {randomImages.map((img, index) => (
                                <div
                                    key={`${img}-${index}`}
                                    className="random-image-wrapper"
                                >
                                    <img
                                        src={img}
                                        alt={`Collection preview ${index + 1}`}
                                        className="random-image"
                                        draggable={false}
                                    />
                                </div>
                            ))}
                        </div>

                        <motion.button
                            className="preview-view-collection-inline"
                            onClick={(e) => { e.stopPropagation(); onViewCollection(); }}
                            whileHover={{ scale: 1.05, x: 5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="view-text">View Collection</span>
                            <span className="view-icon">→</span>
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    )
}
