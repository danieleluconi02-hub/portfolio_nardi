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
                style={{
                    marginTop: '12vh',
                    maxWidth: '900px',
                    width: '100%',
                    padding: '0 2rem'
                }}
            >
                {/* Scrollable Text Container */}
                <motion.div
                    className="overflow-y-auto pr-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    style={{
                        maxHeight: '65vh',
                        scrollBehavior: 'smooth'
                    }}
                >
                    {about.paragraphs.map((paragraph, index) => (
                        <p
                            key={index}
                            className="text-left leading-loose"
                            style={{
                                fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
                                color: 'var(--text-secondary)',
                                marginBottom: '2rem',
                                lineHeight: '1.9',
                                letterSpacing: '0.01em',
                                textAlign: 'justify',
                                textJustify: 'inter-word'
                            }}
                        >
                            {paragraph}
                        </p>
                    ))}
                </motion.div>

                {/* CV Section */}
                <motion.div
                    className="mt-8 pt-4"
                    style={{ borderTop: '1px solid var(--text-muted)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                >
                    <p className="hint-text" style={{ textAlign: 'center' }}>
                        {about.cvNote}
                    </p>
                </motion.div>
            </motion.div>
        </motion.div>
    )
}
