import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

// Apple-like easing
const appleEasing = [0.25, 0.1, 0.25, 1]

export default function TopRightMenu({ onNavigate }) {
    const { t } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)

    const toggleMenu = () => setIsOpen(!isOpen)

    const handleNavigate = (destination) => {
        onNavigate(destination)
        setIsOpen(false)
    }

    const menuItems = [
        { id: 'fashionfilm', label: t.menu.fashionFilm },
        { id: 'about', label: t.menu.about },
        { id: 'contact', label: t.menu.contact }
    ]

    return (
        <>
            {/* Toggle Button (Plus Icon) */}
            <motion.button
                className="fixed top-8 right-8 z-[201] w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-xl border border-pink-300/30 hover:border-pink-400/50 transition-all duration-300"
                onClick={toggleMenu}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 182, 193, 0.4) 0%, rgba(255, 105, 180, 0.35) 50%, rgba(219, 112, 147, 0.3) 100%)',
                    boxShadow: '0 8px 32px rgba(255, 105, 180, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.3)'
                }}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.4, ease: appleEasing }}
                    className="flex items-center justify-center"
                >
                    <span style={{
                        fontFamily: 'GhostFont',
                        fontSize: '3.5rem',
                        lineHeight: 1,
                        color: 'white',
                        marginTop: '-0.2rem', // Visual centering adjustment for font
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                    }}>
                        +
                    </span>
                </motion.div>
            </motion.button>

            {/* Overlay Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: appleEasing }}
                    >
                        <nav className="flex flex-col items-center gap-8">
                            {menuItems.map((item, index) => (
                                <motion.button
                                    key={item.id}
                                    className="menu-overlay-item hover:text-gray-300 transition-colors capitalize"
                                    onClick={() => handleNavigate(item.id)}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{
                                        delay: 0.1 + index * 0.1,
                                        duration: 0.5,
                                        ease: appleEasing
                                    }}
                                >
                                    {item.label}
                                </motion.button>
                            ))}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
