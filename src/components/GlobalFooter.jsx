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
            {/* Portfolio label removed as per request */}

            {/* Francesco Nardi - Bottom Right */}
            <motion.div
                className="fixed bottom-[5%] right-[4%] z-[100] text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <p className="fn-signature">FN</p>
            </motion.div>
        </>
    )
}
