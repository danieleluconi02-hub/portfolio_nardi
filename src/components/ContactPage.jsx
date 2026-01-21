import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import content from '../data/content.json'

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
            <motion.button
                className="back-button"
                onClick={onBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
            >
                {t.ui.back}
            </motion.button>

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
                            className="contact-link flex items-center gap-4"
                            target={link.href.startsWith('http') ? '_blank' : undefined}
                            rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.6 + index * 0.1,
                                duration: 0.5,
                                ease: cinematicEasing
                            }}
                            whileHover={{ x: 4 }}
                        >
                            <span
                                className="text-sm w-20 text-right"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                {link.label}
                            </span>
                            <span>{link.display}</span>
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
