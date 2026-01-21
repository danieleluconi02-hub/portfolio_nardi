import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

// Apple-like easing
const appleEasing = [0.25, 0.1, 0.25, 1]
const cinematicEasing = [0.16, 1, 0.3, 1]

export default function AboutPage({ onBack }) {
    const { t } = useLanguage()
    const about = t.about

    return (
        <motion.div
            className="page-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: appleEasing }}
        >
            {/* Back Button */}
            <motion.button
                className="back-button"
                onClick={onBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
            >
                {t.ui.back}
            </motion.button>

            {/* Content */}
            <motion.div
                className="page-content"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: cinematicEasing }}
            >
                {/* Title Removed */}

                <motion.div
                    className="max-w-5xl mx-auto h-[80vh] overflow-y-auto pr-4 scrollbar-hide" // Removed bg, added scroll
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                >
                    {about.paragraphs.map((paragraph, index) => (
                        <p
                            key={index}
                            className="page-text mb-12 text-left text-xl md:text-3xl leading-relaxed text-white drop-shadow-md" // Huge font, readable on bg
                            style={{ opacity: 1 }}
                        >
                            {paragraph}
                        </p>
                    ))}
                </motion.div>

                {/* CV Section */}
                <motion.div
                    className="mt-12 pt-6"
                    style={{ borderTop: '1px solid var(--text-muted)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                >
                    <p className="hint-text">
                        {about.cvNote}
                    </p>
                </motion.div>
            </motion.div>
        </motion.div>
    )
}
