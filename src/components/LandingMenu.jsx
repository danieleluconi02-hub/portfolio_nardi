import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

export default function LandingMenu({ onNavigate }) {
    const { t } = useLanguage()

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
        { id: 'styling', label: t.menu.styling, primary: true },
        { id: 'fashionfilm', label: t.menu.fashionFilm, primary: false, isFilm: true }
    ]

    return (
        <motion.div
            className="menu-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: appleEasing }}
            style={{ position: 'relative', overflow: 'hidden' }}
        >
            {/* Background Image - F N letters on sides */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url(/assets/landing-bg.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    zIndex: 0,
                    opacity: 0.9
                }}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 0.9, scale: 1 }}
                transition={{ duration: 0.4, ease: cinematicEasing }}
            />

            {/* Menu content - centered, above background */}
            <motion.nav
                className="flex flex-col items-start relative z-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {menuItems.map((item, index) => (
                    <motion.button
                        key={item.id}
                        className={`menu-item ${item.primary ? 'menu-item--primary' : ''} ${item.isFilm ? 'menu-item--film' : ''}`}
                        variants={itemVariants}
                        onClick={() => onNavigate(item.id)}
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
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 0.9 }}
                transition={{ duration: 0 }}
            >
                <p className="hint-text">{t.ui.portfolio}</p>
            </motion.div>

            {/* Language Switcher - Center bottom */}
            <LanguageSwitcher />

            {/* Author name */}
            <motion.div
                className="fixed bottom-[5%] right-[4%] z-10 text-right"
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 0.9 }}
                transition={{ duration: 0 }}
            >
                <p className="hint-text">Francesco</p>
                <p className="hint-text">Nardi</p>
            </motion.div>
        </motion.div>
    )
}

