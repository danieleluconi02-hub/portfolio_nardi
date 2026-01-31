import { useState, Suspense, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import TopRightMenu from './components/TopRightMenu'
import LandingMenu from './components/LandingMenu'
import AboutPage from './components/AboutPage'
import ContactPage from './components/ContactPage'
import FashionFilmPage from './components/FashionFilmPage'
import ImmersiveSphere from './components/ImmersiveSphere'
import ImagePreviewModal from './components/ImagePreviewModal'
import CollectionFocus from './components/CollectionFocus'
import PortfolioView from './components/PortfolioView'
import GlobalFooter from './components/GlobalFooter'
import CategorySphere from './components/CategorySphere'
import DynamicBackgroundGrid from './components/DynamicBackgroundGrid'
import manifest from './data/manifest.json'
import './index.css'

// Apple-like easing curves
const appleEasing = [0.25, 0.1, 0.25, 1]
const cinematicEasing = [0.16, 1, 0.3, 1]

function App() {
    const { t } = useLanguage()

    // States: 'menu' | 'sphere' | 'entering' | 'about' | 'contact' | 'scroll' | 'preview' | 'focus' | 'collection'
    // 'sphere' = Visualization Phase (Single Sphere)
    // 'entering' = Camera flying into sphere
    const [appState, setAppState] = useState('menu')
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [focusedCollection, setFocusedCollection] = useState(null)
    const [viewingCollection, setViewingCollection] = useState(null)
    const [showMenu, setShowMenu] = useState(true)
    const [previewImageData, setPreviewImageData] = useState(null)

    // Handle menu navigation
    const handleMenuNavigate = useCallback((destination) => {
        if (destination === 'design' || destination === 'styling') {
            setSelectedCategory(destination)
            // Go to sphere interaction view
            setAppState('sphere')
        } else if (destination === 'about') {
            setAppState('about')
        } else if (destination === 'contact') {
            setAppState('contact')
        } else if (destination === 'fashionfilm') {
            setAppState('fashionfilm')
        }
    }, [])

    // Handle image click in immersive sphere - show preview modal
    const handleImageClick = useCallback((imageData) => {
        setPreviewImageData(imageData)
        setAppState('preview')
    }, [])

    // Handle closing preview modal - return to immersive sphere
    const handleClosePreview = useCallback(() => {
        setPreviewImageData(null)
        setAppState('scroll')
    }, [])

    // Handle viewing collection from preview modal
    const handleViewCollectionFromPreview = useCallback(() => {
        if (previewImageData) {
            // Find the collection that matches the clicked image
            const collections = manifest[selectedCategory]?.collections || []
            const collection = collections.find(c => c.id === previewImageData.collectionId)
            if (collection) {
                setViewingCollection(collection)
                setPreviewImageData(null)
                setAppState('collection')
            }
        }
    }, [previewImageData, selectedCategory])

    // Handle collection selection (direct) - go to collection
    const handleCollectionSelect = useCallback((collection) => {
        setViewingCollection(collection)
        setAppState('collection')
    }, [])

    // Handle viewing a collection from focus state
    const handleViewCollection = useCallback(() => {
        setViewingCollection(focusedCollection)
        setAppState('collection')
    }, [focusedCollection])

    // Handle closing focus state - return to scroll
    const handleCloseFocus = useCallback(() => {
        setFocusedCollection(null)
        setAppState('scroll')
    }, [])

    // Handle back navigation
    const handleBack = useCallback(() => {
        switch (appState) {
            case 'about':
            case 'contact':
            case 'fashionfilm':
                setAppState('menu')
                break
            case 'scroll':
                setSelectedCategory(null)
                // Return to menu from immersive view (simplified flow)
                setAppState('menu')
                break
            case 'sphere':
                setSelectedCategory(null)
                setAppState('menu')
                break
            case 'preview':
                setPreviewImageData(null)
                setAppState('scroll')
                break
            case 'focus':
                setFocusedCollection(null)
                setAppState('scroll')
                break
            case 'collection':
                setViewingCollection(null)
                setAppState('scroll')
                break
            default:
                setAppState('menu')
        }
    }, [appState])

    // Get collections for current category
    const currentCollections = selectedCategory
        ? manifest[selectedCategory]?.collections || []
        : []

    // Get current preview collection for modal
    const previewCollection = useMemo(() => {
        if (!previewImageData || !selectedCategory) return null
        const collections = manifest[selectedCategory]?.collections || []
        return collections.find(c => c.id === previewImageData.collectionId) || null
    }, [previewImageData, selectedCategory])

    // Callback when sphere is clicked (start entry animation)
    const handleSphereClick = useCallback(() => {
        setAppState('entering')
    }, [])

    // Callback when sphere entry animation is complete
    const handleEnterComplete = useCallback(() => {
        setAppState('scroll')
    }, [])

    return (
        <div className="w-screen h-screen overflow-hidden spatial-bg">
            {/* Dedicated Background Layer */}
            <AnimatePresence>
                {/* Menu State: Dynamic Grid */}
                {appState === 'menu' && (
                    <motion.div
                        key="grid-bg"
                        className="fixed inset-0 z-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.0 }}
                    >
                        <DynamicBackgroundGrid manifest={manifest} />
                    </motion.div>
                )}

                {/* Sphere/Entering State: Spatial Static Background */}
                {(appState === 'sphere' || appState === 'entering') && (
                    <motion.div
                        key="static-bg"
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
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.9 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                    />
                )}
            </AnimatePresence>

            {/* Top Right Navigation Menu */}
            <TopRightMenu onNavigate={handleMenuNavigate} />

            {/* Main Menu - Direct Entry */}
            <AnimatePresence>
                {appState === 'menu' && showMenu && (
                    <motion.div
                        className="fixed inset-0 z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: cinematicEasing }}
                    >
                        <LandingMenu onNavigate={handleMenuNavigate} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* About Page */}
            <AnimatePresence>
                {appState === 'about' && (
                    <AboutPage onBack={handleBack} />
                )}
            </AnimatePresence>

            {/* Contact Page */}
            <AnimatePresence>
                {appState === 'contact' && (
                    <ContactPage onBack={handleBack} />
                )}
            </AnimatePresence>

            {/* Fashion Film Page */}
            <AnimatePresence>
                {appState === 'fashionfilm' && (
                    <FashionFilmPage onBack={handleBack} />
                )}
            </AnimatePresence>

            {/* Interactive Sphere - Visualization Phase */}
            <AnimatePresence>
                {(appState === 'sphere' || appState === 'entering') && selectedCategory && (
                    <motion.div
                        className="fixed inset-0 z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: cinematicEasing }}
                    >
                        <Canvas
                            camera={{ position: [0, 0, 20], fov: 40 }}
                            dpr={[1, 2]}
                        >
                            <Suspense fallback={null}>
                                <CategorySphere
                                    category={selectedCategory}
                                    collections={currentCollections}
                                    appState={appState}
                                    onSphereClick={handleSphereClick}
                                    onEnterComplete={handleEnterComplete}
                                />
                            </Suspense>
                        </Canvas>

                        {/* Back Button for Spheres View */}
                        <motion.button
                            className="back-button"
                            onClick={handleBack}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                        >
                            <img src="/assets/arrow-back.png" alt="Back" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Immersive Sphere - Inside the sphere view */}
            <AnimatePresence>
                {appState === 'scroll' && selectedCategory && (
                    <motion.div
                        className="immersive-container"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: appleEasing }}
                    >
                        {/* Back Button */}
                        <motion.button
                            className="back-button"
                            onClick={handleBack}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                        >
                            <img src="/assets/arrow-back.png" alt="Back" />
                        </motion.button>

                        {/* Hint - translated */}
                        <motion.p
                            className="immersive-hint"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.35 }}
                            transition={{ delay: 1.2, duration: 0.5 }}
                        >
                            {t.ui.dragToExplore}
                        </motion.p>

                        <Canvas
                            camera={{ position: [0, 0, 0], fov: 75 }}
                            dpr={[1, 2]}
                        >
                            <Suspense fallback={null}>
                                <ImmersiveSphere
                                    collections={currentCollections}
                                    onImageClick={handleImageClick}
                                    onBack={handleBack}
                                />
                            </Suspense>
                        </Canvas>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Image Preview Modal */}
            <AnimatePresence>
                {appState === 'preview' && previewImageData && previewCollection && (
                    <ImagePreviewModal
                        imageData={previewImageData}
                        collection={previewCollection}
                        onViewCollection={handleViewCollectionFromPreview}
                        onClose={handleClosePreview}
                    />
                )}
            </AnimatePresence>

            {/* Collection Focus State (legacy - keeping for compatibility) */}
            <AnimatePresence>
                {appState === 'focus' && focusedCollection && (
                    <CollectionFocus
                        collection={focusedCollection}
                        onView={handleViewCollection}
                        onClose={handleCloseFocus}
                    />
                )}
            </AnimatePresence>

            {/* Portfolio View - Full Collection */}
            <AnimatePresence>
                {appState === 'collection' && viewingCollection && (
                    <PortfolioView
                        category={selectedCategory}
                        data={{
                            title: viewingCollection.title,
                            collections: [viewingCollection]
                        }}
                        onBack={handleBack}
                    />
                )}
            </AnimatePresence>

            {/* Global Footer - Shows on all pages except landing menu */}
            {appState !== 'menu' && (
                <GlobalFooter showLanguageSwitcher={true} />
            )}
        </div>
    )
}

// Wrap App with LanguageProvider
function AppWithLanguage() {
    return (
        <LanguageProvider>
            <App />
        </LanguageProvider>
    )
}

export default AppWithLanguage
