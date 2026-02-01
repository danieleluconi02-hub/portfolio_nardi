import { motion } from 'framer-motion'
import { useLanguage, LANGUAGES } from '../contexts/LanguageContext'
import SketchyFlag from './SketchyFlag'

// Order of languages to display
const LANGUAGE_ORDER = ['it', 'en', 'fr', 'es', 'ko']

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    return (
        <motion.div
            className="language-switcher flex gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
        >
            {LANGUAGE_ORDER.map((langCode) => (
                <motion.button
                    key={langCode}
                    className={`language-flag w-12 h-8 relative ${language === langCode ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'}`}
                    onClick={() => setLanguage(langCode)}
                    whileHover={{ scale: 1.15, rotate: [-1, 1, -1] }}
                    whileTap={{ scale: 0.95 }}
                    title={LANGUAGES[langCode]?.name}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                    <SketchyFlag code={langCode} />
                </motion.button>
            ))}
        </motion.div>
    )
}
