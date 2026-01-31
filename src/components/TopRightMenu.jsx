import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

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
                className="fixed top-8 right-8 z-[201] w-16 h-16 flex items-center justify-center transition-transform duration-300 hover:scale-105"
                onClick={toggleMenu}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                style={{
                    background: 'none',
                    border: 'none',
                    boxShadow: 'none',
                    // Removing default CSS border/shadows in favor of SVG
                }}
            >
                {/* Hand-Drawn Circle SVG Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <svg viewBox="0 0 100 100" className="w-full h-full" overflow="visible">
                        {/* Pink gradient fill (optional) or just stroke */}
                        <defs>
                            <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255, 182, 193, 0.4)" />
                                <stop offset="100%" stopColor="rgba(219, 112, 147, 0.3)" />
                            </linearGradient>
                        </defs>

                        {/* Rough scribbled circle path */}
                        <path
                            d="M50 5 C 75 5, 95 25, 93 50 C 91 80, 70 95, 50 93 C 25 91, 5 70, 7 50 C 9 25, 30 5, 50 8 C 70 10, 90 30, 88 55"
                            fill="url(#pinkGradient)"
                            stroke="rgba(255, 192, 203, 0.6)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(255, 105, 180, 0.2))' }}
                        />
                        <path
                            d="M45 8 C 70 10, 92 35, 90 55 C 88 78, 65 92, 48 90 C 28 88, 8 65, 10 45 C 12 25, 35 8, 45 8"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.4)"
                            strokeWidth="1.5"
                            strokeDasharray="3 2"
                        />
                    </svg>
                </div>

                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.4, ease: appleEasing }}
                    className="flex items-center justify-center relative z-10"
                    style={{ width: '100%', height: '100%' }}
                >
                    <span style={{
                        fontFamily: 'GhostFont',
                        fontSize: '4.5rem', // Increased size as requested
                        lineHeight: 1,
                        color: 'white',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -42%)', // Adjusted: -60% was too high. -42% moves it down.
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                        pointerEvents: 'none',
                        userSelect: 'none'
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

                        {/* Language Switcher - Centered below menu */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ delay: 0.5, duration: 0.5, ease: appleEasing }}
                            className="mt-12"
                        >
                            <LanguageSwitcher />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
