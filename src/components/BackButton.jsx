import { motion } from 'framer-motion'

export default function BackButton({ onClick, className = '' }) {
    return (
        <motion.button
            className={`back-button-custom fixed top-8 left-8 z-[201] w-16 h-16 flex items-center justify-center ${className}`}
            onClick={onClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer'
            }}
        >
            <img
                src="/assets/arrow_back.png"
                alt="Back"
                style={{
                    width: '4rem',
                    height: 'auto',
                    display: 'block'
                }}
            />
        </motion.button>
    )
}
