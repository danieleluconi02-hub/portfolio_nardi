import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

export default function CollectionsCarousel({
    category,
    collections,
    onCollectionSelect,
    onBack
}) {
    const { t } = useLanguage()
    const cinematicEasing = [0.16, 1, 0.3, 1]
    const [activeIndex, setActiveIndex] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const trackRef = useRef(null)
    const [dragOffset, setDragOffset] = useState(0)

    const categoryTitle = category === 'design' ? t.menu.fashionDesign : t.menu.styling

    // Calculate item width for positioning
    const itemWidth = typeof window !== 'undefined'
        ? Math.min(window.innerWidth * 0.3, 450) + window.innerWidth * 0.06
        : 500

    // Handle drag
    const handleDragStart = () => setIsDragging(true)
    const handleDragEnd = (_, info) => {
        setIsDragging(false)
        const threshold = itemWidth / 3

        if (info.offset.x < -threshold && activeIndex < collections.length - 1) {
            setActiveIndex(activeIndex + 1)
        } else if (info.offset.x > threshold && activeIndex > 0) {
            setActiveIndex(activeIndex - 1)
        }
        setDragOffset(0)
    }

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' && activeIndex < collections.length - 1) {
                setActiveIndex(activeIndex + 1)
            } else if (e.key === 'ArrowLeft' && activeIndex > 0) {
                setActiveIndex(activeIndex - 1)
            } else if (e.key === 'Enter' && collections[activeIndex]) {
                onCollectionSelect(collections[activeIndex])
            } else if (e.key === 'Escape') {
                onBack()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeIndex, collections, onCollectionSelect, onBack])

    // Container animation
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 1,
                ease: cinematicEasing,
                staggerChildren: 0.1,
                delayChildren: 0.4
            }
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.8, ease: cinematicEasing }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 60 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: cinematicEasing }
        }
    }

    return (
        <motion.div
            className="carousel-container"
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
                transition={{ delay: 0.5, duration: 0.6 }}
            >
                {t.ui.back}
            </motion.button>

            {/* Category Title */}
            <motion.p
                className="fixed top-[5%] left-1/2 -translate-x-1/2 hint-text"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: cinematicEasing }}
            >
                {categoryTitle}
            </motion.p>

            {/* Carousel Track */}
            <motion.div
                ref={trackRef}
                className="carousel-track"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                drag="x"
                dragConstraints={{
                    left: -(collections.length - 1) * itemWidth,
                    right: 0
                }}
                dragElastic={0.1}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                style={{
                    x: -activeIndex * itemWidth + dragOffset
                }}
                transition={{
                    x: {
                        type: "spring",
                        stiffness: 100,
                        damping: 30,
                        mass: 1
                    }
                }}
            >
                {collections.map((collection, index) => {
                    const isActive = index === activeIndex
                    const distance = Math.abs(index - activeIndex)

                    return (
                        <motion.div
                            key={collection.id}
                            className="carousel-item"
                            variants={itemVariants}
                            onClick={() => {
                                if (!isDragging) {
                                    if (isActive) {
                                        onCollectionSelect(collection)
                                    } else {
                                        setActiveIndex(index)
                                    }
                                }
                            }}
                            animate={{
                                scale: isActive ? 1 : 0.85,
                                opacity: distance > 2 ? 0.3 : isActive ? 1 : 0.6
                            }}
                            transition={{ duration: 0.6, ease: cinematicEasing }}
                        >
                            {/* Collection Image */}
                            <motion.img
                                src={collection.images?.[0] || '/placeholder.jpg'}
                                alt={collection.title}
                                className="carousel-image"
                                loading="lazy"
                            />

                            {/* Collection Info */}
                            <motion.div
                                className="text-center"
                                animate={{ opacity: isActive ? 1 : 0.5 }}
                            >
                                <h3 className="carousel-title">{collection.title}</h3>
                                <p className="carousel-meta">
                                    {collection.year}
                                    {collection.brand && ` · ${collection.brand}`}
                                </p>
                            </motion.div>
                        </motion.div>
                    )
                })}
            </motion.div>

            {/* Navigation Indicators */}
            <motion.div
                className="fixed bottom-[5%] left-1/2 -translate-x-1/2 flex gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.8, duration: 0.6 }}
            >
                {collections.map((_, index) => (
                    <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeIndex
                                ? 'bg-[var(--text-primary)] scale-125'
                                : 'bg-[var(--text-muted)]'
                            }`}
                        onClick={() => setActiveIndex(index)}
                    />
                ))}
            </motion.div>

            {/* Hint */}
            <motion.p
                className="fixed bottom-[2%] left-1/2 -translate-x-1/2 hint-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 1.2, duration: 0.6 }}
            >
                {t.ui.dragOrArrows}
            </motion.p>
        </motion.div>
    )
}
