import { motion } from 'framer-motion'
import arrowIcon from '../assets/arrow-back.png'

export default function BackButton({ onClick, className = '' }) {
    return (
        <motion.button
            className={`back-button-custom fixed top-8 left-8 z-[201] w-16 h-16 flex items-center justify-center ${className}`}
            onClick={onClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer'
            }}
        >
            <img
                src={arrowIcon}
                alt=""
                style={{
                    width: '3rem', // Adjust size as needed
                    height: 'auto',
                    filter: 'none', // Original is Black on White
                    mixBlendMode: 'multiply', // Hide white background, show black strokes
                    // Actually, the uploaded image is Black Arrow on White BG.
                    // Dark Theme: Invert(1) -> White Arrow on Black BG. Screen -> White Arrow, Black BG transparent.
                }}
            />
        </motion.button>
    )
}
