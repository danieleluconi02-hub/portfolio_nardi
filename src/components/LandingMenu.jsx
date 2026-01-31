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

    // Unified Font Sizing
    const getUnifiedFontSize = (items) => {
        const longestLength = Math.max(...items.filter(i => i.primary).map(i => i.label.length))

        // Japanese text logic
        if (language === 'jp') {
            if (isMobile) return 'clamp(1rem, 4vw, 1.5rem)'
            // Desktop JP: Tiny to fit in narrow column
            return 'clamp(0.6rem, 0.9vw, 1.1rem)'
        }

        const effectiveLength = longestLength

        // MOBILE LOGIC
        if (isMobile) {
            if (effectiveLength > 16) return 'clamp(1rem, 5vw, 1.5rem)'
            if (effectiveLength > 10) return 'clamp(1.2rem, 7vw, 2rem)'
            return 'clamp(1.8rem, 10vw, 3rem)'
        }

        // DESKTOP LOGIC
        if (effectiveLength > 16) return 'clamp(0.8rem, 1.5vw, 1.5rem)'
        if (effectiveLength > 10) return 'clamp(1.2rem, 2vw, 2.2rem)'
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
            transition: {
                duration: 0.25,
                staggerChildren: 0.04,
                delayChildren: 0.1
            }
        },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.3,
                ease: appleEasing
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -8, filter: 'blur(2px)' },
        visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.35, ease: cinematicEasing } }
    }

    const menuItems = [
        { id: 'design', label: t.menu.fashionDesign, primary: true },
        { id: 'styling', label: t.menu.styling, primary: true }
    ]

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
            {/* Menu content - CENTERED via Flexbox, no manual negative margins */}
            <motion.nav
                // Use GAP for even spacing. 
                // JP: tighter gap (gap-3). EN: wider gap (gap-8/12).
                className={`flex flex-col items-start relative z-10 pr-8 ${language === 'jp' ? 'gap-3' : 'gap-8 md:gap-12'}`}
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
                            // FORCE NOWRAP strictly via style to prevent any CSS overrides
                            whiteSpace: language === 'jp' ? 'nowrap' : 'normal',
                            // Remove all manual Margins - use Flex Gap!
                            marginTop: 0
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
