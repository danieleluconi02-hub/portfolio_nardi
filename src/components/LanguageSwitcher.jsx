import { motion } from 'framer-motion'
import { useLanguage, LANGUAGES } from '../contexts/LanguageContext'

// Pixel art flag images
const FLAG_IMAGES = {
    en: '/assets/flags/flag-en.svg',
    it: '/assets/flags/flag-it.svg',
    es: '/assets/flags/flag-es.svg',
    fr: '/assets/flags/flag-fr.svg',
    ja: '/assets/flags/flag-jp.svg'
}

// Order of languages to display
const LANGUAGE_ORDER = ['it', 'en', 'fr', 'es', 'ja']

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    return (
        <motion.div
            className="language-switcher"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
        >
            {LANGUAGE_ORDER.map((langCode) => (
                <motion.button
                    key={langCode}
                    className={`language-flag ${language === langCode ? 'active' : ''}`}
                    onClick={() => setLanguage(langCode)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    title={LANGUAGES[langCode]?.name}
                >
                    <img
                        src={FLAG_IMAGES[langCode]}
                        alt={LANGUAGES[langCode]?.name}
                        className="flag-image"
                    />
                </motion.button>
            ))}
        </motion.div>
    )
}
