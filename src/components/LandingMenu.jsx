import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import { useState, useCallback, useEffect } from 'react'

export default function LandingMenu({ onNavigate }) {
    const { t, language } = useLanguage()
    const [navigatingTo, setNavigatingTo] = useState(null)
    const [isMobile, setIsMobile] = useState(false)

    // Check for mobile on mount and resize
    // We need this because the grid structure changes radically (25% center on desktop vs 75% on mobile)
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Unified Font Sizing based on the LONGEST primary item
    const getUnifiedFontSize = (items) => {
        // Find longest string among primary items
        const longestLength = Math.max(...items.filter(i => i.primary).map(i => i.label.length))

        // Japanese text is wider per character and denser. 
        // We treat it as 2.5x length to force it into smaller buckets and avoid overlap.
        const effectiveLength = language === 'jp' ? longestLength * 2.5 : longestLength

        // MOBILE LOGIC (Wide center column ~75% width)
        if (isMobile) {
            // We can afford larger VW values because the container is wider relative to screen
            // But we must still be careful with long words
            if (effectiveLength > 16) return 'clamp(1rem, 5vw, 1.5rem)'
            if (effectiveLength > 10) return 'clamp(1.2rem, 7vw, 2rem)'
            return 'clamp(1.8rem, 10vw, 3rem)'
        }

        // DESKTOP LOGIC (Narrow center column ~25% width)
        // Requires very conservative sizing
        if (effectiveLength > 16) return 'clamp(0.8rem, 1.5vw, 1.5rem)' // Very Long (IT/JP)
        if (effectiveLength > 10) return 'clamp(1.2rem, 2vw, 2.2rem)' // Medium
        return 'clamp(2rem, 3.5vw, 3.5rem)' // Short
    }

    const handleMenuClick = useCallback((id) => {
        setNavigatingTo(id)
        // Short delay for exit animation then navigate
        setTimeout(() => {
            onNavigate(id)
        }, 500)
    }, [onNavigate])

    // Apple-like easing curves
    const appleEasing = [0.25, 0.1, 0.25, 1]
    const cinematicEasing = [0.16, 1, 0.3, 1]

    // Container variants - quick but visible fade-in
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
        hidden: {
            opacity: 0,
            x: -8,
            filter: 'blur(2px)'
        },
        visible: {
            opacity: 1,
            x: 0,
            filter: 'blur(0px)',
            transition: {
                duration: 0.35,
                ease: cinematicEasing
            }
        }
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
            {/* Background handled in App.jsx for continuity */}

            {/* Menu content - centered, above background */}
            {/* Added pr-8 to shift content slightly left as requested to avoid right-edge collision */}
            <motion.nav
                className="flex flex-col items-start relative z-10 pr-8"
                variants={containerVariants}
                initial="hidden"
                animate={navigatingTo ? "exit" : "visible"}
                exit="exit"
            >
                {menuItems.map((item, index) => (
                    <motion.button
                        key={item.id}
                        className={`menu-item ${item.primary ? 'menu-item--primary' : ''} ${item.isFilm ? 'menu-item--film' : ''}`}
                        variants={itemVariants}
                        onClick={() => handleMenuClick(item.id)}
                        whileHover={{
                            x: item.primary ? 12 : 6,
                            transition: {
                                duration: 0.4,
                                ease: cinematicEasing
                            }
                        }}
                        whileTap={{
                            scale: 0.98,
                            transition: { duration: 0.1 }
                        }}
                        style={{
                            // Apply dynamic font size ONLY for primary items
                            fontSize: item.primary ? unifiedFontSize : undefined,
                            // Margin logic for separartion
                            marginTop: index === 3 ? '2.5rem' : (index === 2 ? '1.5rem' : undefined)
                        }}
                    >
                        {item.label}
                    </motion.button>
                ))}
            </motion.nav>

            {/* Subtle branding hint */}
            <motion.div
                className="fixed bottom-[5%] left-[4%] z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: 0.5, duration: 0.8 }}
            >
                <p className="hint-text">{t.ui.portfolio}</p>
            </motion.div>

            {/* Language Switcher - Center bottom */}
            <LanguageSwitcher />

            {/* Author name */}
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
