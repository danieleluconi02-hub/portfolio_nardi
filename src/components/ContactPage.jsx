import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import content from '../data/content.json'
import BackButton from './BackButton'

// Apple-like easing
const appleEasing = [0.25, 0.1, 0.25, 1]
const cinematicEasing = [0.16, 1, 0.3, 1]

export default function ContactPage({ onBack }) {
    const { t } = useLanguage()
    const { contact } = content // Keep contact info (email, urls) from content.json

    const contactLinks = [
        {
            label: t.contact.email,
            href: `mailto:${contact.email.address}`,
            display: contact.email.display
        },
        {
            label: t.contact.instagram,
            href: contact.instagram.url,
            display: contact.instagram.display
        },
        {
            label: t.contact.linkedin,
            href: contact.linkedin.url,
            display: contact.linkedin.display
        }
    ]

    return (
        <motion.div
            className="page-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: appleEasing }}
        >
            {/* Back Button */}
            {/* Back Button */}
            <BackButton onClick={onBack} />

            {/* Content */}
            <motion.div
                className="page-content"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: cinematicEasing }}
            >
                {/* Title Removed */}

                <motion.div
                    className="flex flex-col items-center gap-3 mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                >
                    {contactLinks.map((link, index) => (
                        <motion.a
                            key={link.label}
                            href={link.href}
                            className="contact-link flex flex-col md:flex-row items-baseline md:items-center gap-2 md:gap-6" // Stack on mobile, row on desktop, larger gap
                            target={link.href.startsWith('http') ? '_blank' : undefined}
                            rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.6 + index * 0.1,
                                duration: 0.5,
                                ease: cinematicEasing
                            }}
                            whileHover={{ x: 10 }} // Increased hover movement
                        >
                            <span
                                className="text-xl md:text-2xl font-medium text-left md:text-right w-full md:w-32" // Larger label, adjusted width/align
                                style={{
                                    color: '#DB7093', // PaleVioletRed (Pink from menu gradient)
                                    fontFamily: 'GhostFont' // Match menu style potentially? Or keep standard? User didn't specify font, just size/color. Keeping standard for labels usually better, but let's stick to current font family, just bigger.
                                }}
                            >
                                {link.label}
                            </span>
                            <span
                                className="text-3xl md:text-5xl" // Much larger link text
                                style={{ fontFamily: 'GhostFont' }} // Using GhostFont for the main link text to match aesthetic
                            >
                                {link.display}
                            </span>
                        </motion.a>
                    ))}
                </motion.div>

                {/* Availability Note */}
                <motion.p
                    className="hint-text mt-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.35 }}
                    transition={{ delay: 1, duration: 0.6 }}
                >
                    {t.contact.availability}
                </motion.p>
            </motion.div>
        </motion.div>
    )
}
