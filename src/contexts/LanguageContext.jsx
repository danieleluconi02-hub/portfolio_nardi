import { createContext, useContext, useState, useEffect } from 'react'
import translations from '../data/translations'

// Create the context
const LanguageContext = createContext()

// Available languages
export const LANGUAGES = {
    en: { code: 'en', name: 'English', flag: '🇬🇧' },
    it: { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    es: { code: 'es', name: 'Español', flag: '🇪🇸' },
    fr: { code: 'fr', name: 'Français', flag: '🇫🇷' }
}

// Provider component
export function LanguageProvider({ children }) {
    // Initialize from localStorage or default to 'en'
    const [language, setLanguageState] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('portfolio-language')
            return saved && translations[saved] ? saved : 'en'
        }
        return 'en'
    })

    // Save to localStorage when language changes
    useEffect(() => {
        localStorage.setItem('portfolio-language', language)
    }, [language])

    // Set language with validation
    const setLanguage = (lang) => {
        if (translations[lang]) {
            setLanguageState(lang)
        }
    }

    // Get current translations
    const t = translations[language] || translations.en

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, LANGUAGES }}>
            {children}
        </LanguageContext.Provider>
    )
}

// Custom hook to use the language context
export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}

export default LanguageContext
