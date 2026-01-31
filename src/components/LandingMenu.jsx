import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import { useState, useCallback, useEffect } from 'react'

export default function LandingMenu({ onNavigate }) {
    const { t, language } = useLanguage()
    const [navigatingTo, setNavigatingTo] = useState(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Helper: Detect if string contains Japanese characters
    const isJapaneseText = (text) => {
        return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)
    }

    const menuItems = [
        { id: 'design', label: t.menu.fashionDesign, primary: true },
        { id: 'styling', label: t.menu.styling, primary: true }
    ]

    // Determine if we are effectively in "Japanese Mode" based on content
    // This protects against state desync where language='en' but content is JP
    const hasJapaneseContent = menuItems.some(i => isJapaneseText(i.label))
    const effectiveLanguage = hasJapaneseContent ? 'jp' : language

    // Unified Font Sizing
    const getUnifiedFontSize = (items) => {
        if (effectiveLanguage === 'jp') {
            // JP: Hardcoded safe small size. No clamps, no risks. 
            // 13px on desktop, slightly larger on mobile.
            return isMobile ? '16px' : '13px'
        }

        const longestLength = Math.max(...items.filter(i => i.primary).map(i => i.label.length))

        // MOBILE LOGIC
        if (isMobile) {
            if (longestLength > 16) return 'clamp(1rem, 5vw, 1.5rem)'
            if (longestLength > 10) return 'clamp(1.2rem, 7vw, 2rem)'
            return 'clamp(1.8rem, 10vw, 3rem)'
        }

        // DESKTOP LOGIC
        if (longestLength > 16) return 'clamp(0.8rem, 1.5vw, 1.5rem)'
        if (longestLength > 10) return 'clamp(1.2rem, 2vw, 2.2rem)'
        return 'clamp(2rem, 3.5vw, 3.5rem)'
    }

    const handleMenuClick = useCallback((id) => {
        setNavigatingTo(id)
        setTimeout(() => {
            onNavigate(id)
        }, 500)
    }, [onNavigate])

    const appleEasing = [0.25, 0.1, 0.25, 1]
    const cinematicEasing = [0.16, 1, 0.3, 1]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.25, staggerChildren: 0.04, delayChildren: 0.1 }
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.3, ease: appleEasing }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -8, filter: 'blur(2px)' },
        visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.35, ease: cinematicEasing } }
    }

    const unifiedFontSize = getUnifiedFontSize(menuItems)

    return (
        <motion.div
            className="menu-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: appleEasing }}
            style={{ position: 'relative', overflow: 'hidden' }}
        >
            {/* Menu content - CENTERED via Flexbox */}
            <motion.nav
                // Use GAP for even spacing. 
                // JP: Tiny gap. EN: Standard gap.
                className={`flex flex-col items-start relative z-10 pr-8 ${effectiveLanguage === 'jp' ? 'gap-2' : 'gap-8 md:gap-12'}`}
                variants={containerVariants}
                initial="hidden"
                animate={navigatingTo ? "exit" : "visible"}
                exit="exit"
            >
                {menuItems.map((item) => (
                    <motion.button
                        key={item.id}
                        className={`menu-item ${item.primary ? 'menu-item--primary' : ''} ${item.isFilm ? 'menu-item--film' : ''}`}
                        variants={itemVariants}
                        onClick={() => handleMenuClick(item.id)}
                        whileHover={{
                            x: item.primary ? 12 : 6,
                            transition: { duration: 0.4, ease: cinematicEasing }
                        }}
                        whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                        style={{
                            // Apply unified font size
                            fontSize: item.primary ? unifiedFontSize : undefined,

                            // FORCE OVERRIDES FOR JAPANESE
                            // We use !important behavior by passing these styles which override class names
                            whiteSpace: effectiveLanguage === 'jp' ? 'nowrap' : 'normal',
                            lineHeight: effectiveLanguage === 'jp' ? '1' : undefined,
                            paddingTop: effectiveLanguage === 'jp' ? '0.2rem' : undefined,
                            paddingBottom: effectiveLanguage === 'jp' ? '0.2rem' : undefined,

                            marginTop: 0 // Ensure no manual margins
                        }}
                    >
                        {item.label}
                    </motion.button>
                ))}
            </motion.nav>

            <motion.div
                className="fixed bottom-[5%] left-[4%] z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: 0.5, duration: 0.8 }}
            >
                <p className="hint-text">{t.ui.portfolio}</p>
            </motion.div>

            <LanguageSwitcher />

            <motion.div
                className="fixed bottom-[5%] right-[4%] z-10 text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: 0.5, duration: 0.8 }}
            >
                <p className="fn-signature">FN</p>
            </motion.div>
        </motion.div>
    )
}
