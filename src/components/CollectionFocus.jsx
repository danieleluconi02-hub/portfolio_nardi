import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import content from '../data/content.json'

// Apple-like easing
const appleEasing = [0.25, 0.1, 0.25, 1]
const cinematicEasing = [0.16, 1, 0.3, 1]

export default function CollectionFocus({
    collection,
    onView,
    onClose
}) {
    const { t } = useLanguage()
    const [imageLoaded, setImageLoaded] = useState(false)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)

    const images = collection.images || []
    const currentImage = images[selectedImageIndex]

    // Default description if none exists
    const description = content.collections?.[collection.id]?.description
        || collection.description
        || t.ui.descriptionDefault

    // Handle keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'Enter') {
                onView()
            } else if (e.key === 'ArrowRight' && selectedImageIndex < images.length - 1) {
                setSelectedImageIndex(prev => prev + 1)
                setImageLoaded(false)
            } else if (e.key === 'ArrowLeft' && selectedImageIndex > 0) {
                setSelectedImageIndex(prev => prev - 1)
                setImageLoaded(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose, onView, selectedImageIndex, images.length])

    // Touch/click navigation on the image itself
    const handleImageAreaClick = useCallback((e) => {
        // Get click position relative to the image container
        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const containerWidth = rect.width

        // Left half = go back, Right half = go forward
        if (clickX < containerWidth / 2) {
            // Left side - previous image
            if (selectedImageIndex > 0) {
                setSelectedImageIndex(prev => prev - 1)
                setImageLoaded(false)
            }
        } else {
            // Right side - next image
            if (selectedImageIndex < images.length - 1) {
                setSelectedImageIndex(prev => prev + 1)
                setImageLoaded(false)
            }
        }
    }, [selectedImageIndex, images.length])

    const handleThumbnailClick = useCallback((index) => {
        setSelectedImageIndex(index)
        setImageLoaded(false)
    }, [])

    return (
        <motion.div
            className="focus-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: appleEasing }}
            onClick={onClose}
        >
            <motion.div
                className="focus-layout"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: cinematicEasing }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* LEFT PANEL - Title and Description */}
                <motion.div
                    className="focus-left-panel"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.5, ease: cinematicEasing }}
                >
                    <h2 className="focus-title">{collection.title}</h2>
                    <p className="focus-meta">
                        {collection.year}
                        {collection.brand && ` · ${collection.brand}`}
                    </p>
                    <p className="focus-description">{description}</p>
                </motion.div>

                {/* CENTER - Main Image and Buttons */}
                <motion.div
                    className="focus-center"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: cinematicEasing }}
                >
                    {/* Main Image - Tap left/right to navigate */}
                    <div
                        className="focus-image-container"
                        onClick={handleImageAreaClick}
                        style={{ cursor: 'pointer' }}
                    >
                        {currentImage && (
                            <motion.img
                                key={selectedImageIndex}
                                src={currentImage}
                                alt={`${collection.title} - ${selectedImageIndex + 1}`}
                                className="focus-image"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: imageLoaded ? 1 : 0.2 }}
                                transition={{ duration: 0.2 }}
                                onLoad={() => setImageLoaded(true)}
                                draggable={false}
                            />
                        )}

                        {/* Image counter - subtle, bottom right */}
                        <motion.div
                            className="focus-image-counter"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            transition={{ delay: 0.5, duration: 0.3 }}
                        >
                            {selectedImageIndex + 1}/{images.length}
                        </motion.div>
                    </div>

                    {/* Action Buttons - Below Image */}
                    <motion.div
                        className="focus-actions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                    >
                        <motion.button
                            className="focus-button"
                            onClick={onClose}
                            whileHover={{ opacity: 0.7 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {t.ui.close}
                        </motion.button>

                        <motion.button
                            className="focus-button focus-button--primary"
                            onClick={onView}
                            whileHover={{ opacity: 0.85 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {t.ui.viewCollection}
                        </motion.button>
                    </motion.div>
                </motion.div>

                {/* RIGHT PANEL - Thumbnails Grid */}
                <motion.div
                    className="focus-right-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: cinematicEasing }}
                >
                    <div className="focus-thumbnails-grid">
                        {images.map((img, index) => (
                            <motion.button
                                key={index}
                                className={`focus-thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                                onClick={() => handleThumbnailClick(index)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <img
                                    src={img.replace('/full/', '/thumb/')}
                                    alt={`Thumbnail ${index + 1}`}
                                    draggable={false}
                                />
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    )
}
