import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

export default function CollectionPicker({
    category,
    collections,
    onCollectionSelect,
    onBack
}) {
    const { t } = useLanguage()
    const categoryTitle = category === 'design' ? t.menu.fashionDesign : t.menu.styling

    // Apple-style stagger animation
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.2
            }
        },
        exit: { opacity: 0 }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.25, 0.1, 0.25, 1]
            }
        }
    }

    return (
        <motion.div
            className="fixed inset-0 flex flex-col items-center justify-center apple-bg z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
            {/* Back button */}
            <motion.button
                className="back-button"
                onClick={onBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                {t.ui.back}
            </motion.button>

            {/* Category title */}
            <motion.p
                className="text-[var(--text-tertiary)] text-xs tracking-[0.2em] uppercase mb-12"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
                {categoryTitle}
            </motion.p>

            {/* Collections list */}
            <motion.div
                className="flex flex-col items-center gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {collections.map((collection) => (
                    <motion.button
                        key={collection.id}
                        className="collection-item"
                        onClick={() => onCollectionSelect(collection)}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span className="collection-title">{collection.title}</span>
                        <span className="collection-count">{collection.images.length}</span>
                    </motion.button>
                ))}
            </motion.div>

            {/* Hint */}
            <motion.p
                className="fixed bottom-[5%] text-[0.7rem] text-[var(--text-tertiary)] tracking-wide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.6 }}
            >
                Select a collection
            </motion.p>
        </motion.div>
    )
}
