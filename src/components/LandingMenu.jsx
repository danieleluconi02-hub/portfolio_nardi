import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

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

    // Helper: Detect if string contains Korean characters
    const isKoreanText = (text) => {
        return /[\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/.test(text)
    }

    const menuItems = [
        { id: 'design', label: t.menu.fashionDesign, primary: true },
        { id: 'styling', label: t.menu.styling, primary: true }
    ]

    // Determine if we are effectively in "Korean Mode" based on content
    // This protects against state desync where language='en' but content is KR
    const hasKoreanContent = menuItems.some(i => isKoreanText(i.label))
    const effectiveLanguage = hasKoreanContent ? 'ko' : language

    // Unified Font Sizing
    const getUnifiedFontSize = (items) => {
        if (effectiveLanguage === 'ko') {
            // KR: Tuned larger for readability (Local).
            // With nowrap active, we can go much larger safely.
            return isMobile ? 'clamp(1.5rem, 5vw, 2.5rem)' : 'clamp(1.2rem, 1.8vw, 2rem)'
        }

        const longestLength = Math.max(...items.filter(i => i.primary).map(i => i.label.length))

        // MOBILE LOGIC
        if (isMobile) {
            if (longestLength > 16) return 'clamp(1.4rem, 6.5vw, 2.0rem)'
            if (longestLength > 10) return 'clamp(1.5rem, 8vw, 2.5rem)'
            return 'clamp(2.2rem, 12vw, 3.5rem)'
        }

        // DESKTOP LOGIC
        if (longestLength > 16) return 'clamp(1.1rem, 2.2vw, 2.2rem)'
        if (longestLength > 10) return 'clamp(1.5rem, 2.5vw, 2.8rem)'
        return 'clamp(2.5rem, 4vw, 4rem)'
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
                // KR: Massive gap (single lines).
                // IT: Tighter gap (compensate for wrapping/length).
                // EN: Standard gap.
                className={`flex flex-col items-start relative z-10 pr-8 ${effectiveLanguage === 'ko' ? 'gap-12 md:gap-24' : (language === 'it' ? 'gap-4 md:gap-8' : 'gap-8 md:gap-12')}`}
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

                            // FORCE OVERRIDES FOR KOREAN
                            // We use !important behavior by passing these styles which override class names
                            whiteSpace: effectiveLanguage === 'ko' ? 'nowrap' : 'normal',
                            lineHeight: effectiveLanguage === 'ko' ? '1.2' : undefined,
                            paddingTop: effectiveLanguage === 'ko' ? '0.2rem' : undefined,
                            paddingBottom: effectiveLanguage === 'ko' ? '0.2rem' : undefined,
                            fontFamily: effectiveLanguage === 'ko' ? '"Noto Sans KR", sans-serif' : undefined,
                            fontWeight: effectiveLanguage === 'ko' ? '700' : undefined,

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
