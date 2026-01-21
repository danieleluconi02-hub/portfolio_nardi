import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

// Apple-like easing
const cinematicEasing = [0.16, 1, 0.3, 1]

export default function NavMenu({ onNavigate }) {
    const { t } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)

    const toggleMenu = () => setIsOpen(!isOpen)

    const handleNavigate = (dest) => {
        setIsOpen(false)
        onNavigate(dest)
    }

    return (
        <>
            {/* Toggle Button (+) */}
            <motion.button
                className="nav-toggle-btn"
                onClick={toggleMenu}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.5, ease: cinematicEasing }}
                style={{
                    position: 'fixed',
                    top: '4%',
                    right: '4%',
                    zIndex: 100,
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
            >
                <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: cinematicEasing }}
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 300,
                        color: 'var(--text-primary)',
                        lineHeight: 1
                    }}
                >
                    +
                </motion.span>
            </motion.button>

            {/* Overlay Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="nav-overlay"
                        initial={{ opacity: 0, clipPath: 'circle(0% at 100% 0%)' }}
                        animate={{ opacity: 1, clipPath: 'circle(150% at 100% 0%)' }}
                        exit={{ opacity: 0, clipPath: 'circle(0% at 100% 0%)' }}
                        transition={{ duration: 0.6, ease: cinematicEasing }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            zIndex: 90,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <nav className="flex flex-col items-center gap-8">
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ delay: 0.1, duration: 0.5 }}
                                className="menu-item"
                                onClick={() => handleNavigate('about')}
                                style={{ fontSize: '2rem' }}
                            >
                                {t.menu.about}
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="menu-item"
                                onClick={() => handleNavigate('contact')}
                                style={{ fontSize: '2rem' }}
                            >
                                {t.menu.contact}
                            </motion.button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
