import { motion } from 'framer-motion'
import { useLanguage, LANGUAGES } from '../contexts/LanguageContext'

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    const languages = Object.values(LANGUAGES)

    return (
        <motion.div
            className="language-switcher"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
        >
            {languages.map((lang) => (
                <motion.button
                    key={lang.code}
                    className={`language-flag ${language === lang.code ? 'active' : ''}`}
                    onClick={() => setLanguage(lang.code)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    title={lang.name}
                >
                    {lang.flag}
                </motion.button>
            ))}
        </motion.div>
    )
}
