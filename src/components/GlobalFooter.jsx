import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * Global footer component that shows Portfolio and Francesco Nardi
 * This component is displayed on all screens except the landing menu
 * NOTE: Language flags are ONLY on the landing page
 */
export default function GlobalFooter() {
    const { t } = useLanguage()

    return (
        <>
            {/* Portfolio - Bottom Left */}
            <motion.div
                className="fixed bottom-[5%] left-[4%] z-[100]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <p className="hint-text">{t.ui.portfolio}</p>
            </motion.div>

            {/* Francesco Nardi - Bottom Right */}
            <motion.div
                className="fixed bottom-[5%] right-[4%] z-[100] text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <p className="hint-text">Francesco</p>
                <p className="hint-text">Nardi</p>
            </motion.div>
        </>
    )
}
