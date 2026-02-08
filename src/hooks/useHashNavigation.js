import { useEffect, useCallback, useRef } from 'react';

// Helpers to parse hash
const parseHash = () => {
    const hash = window.location.hash.replace('#/', '');
    const parts = hash.split('/');
    return {
        view: parts[0] || 'menu',
        category: parts[1] || null,
        id: parts[2] || null
    };
};

export const useHashNavigation = ({
    appState,
    setAppState,
    selectedCategory,
    setSelectedCategory,
    viewingCollection,
    setViewingCollection,
    manifest
}) => {
    // Flag to prevent infinite loops when updating state from hash vs hash from state
    const isUpdatingFromHash = useRef(false);

    // 1. Listen for hash changes (Browser Back/Forward)
    useEffect(() => {
        const handleHashChange = () => {
            isUpdatingFromHash.current = true;
            const { view, category, id } = parseHash();

            // Reset generic states first to avoid conflicts
            // But we do it carefully based on the target view

            console.log('Hash changed:', view, category, id);

            switch (view) {
                case 'menu':
                    setAppState('menu');
                    setSelectedCategory(null);
                    setViewingCollection(null);
                    break;
                case 'about':
                    setAppState('about');
                    break;
                case 'contact':
                    setAppState('contact');
                    break;
                case 'fashionfilm':
                    setAppState('fashionfilm');
                    break;
                case 'sphere':
                    if (category && manifest[category]) {
                        setSelectedCategory(category);
                        setAppState('sphere');
                    } else {
                        // Invalid category, fallback to menu
                        window.location.hash = '/';
                    }
                    break;
                case 'immersive': // Maps to 'scroll' state
                    if (category && manifest[category]) {
                        setSelectedCategory(category);
                        setAppState('scroll');
                    } else {
                        window.location.hash = '/';
                    }
                    break;
                case 'collection':
                    if (category && id && manifest[category]) {
                        const collections = manifest[category]?.collections || [];
                        const collection = collections.find(c => c.id === id);
                        if (collection) {
                            setSelectedCategory(category);
                            setViewingCollection(collection);
                            setAppState('collection');
                        } else {
                            // Invalid collection, fallback to sticky immersive or menu
                            // Try to go to immersive for this category
                            window.location.hash = `/immersive/${category}`;
                        }
                    } else {
                        window.location.hash = '/';
                    }
                    break;
                default:
                    // Unknown route
                    setAppState('menu');
            }

            // Reset flag after a short delay to allow state updates to settle without triggering hash update
            setTimeout(() => {
                isUpdatingFromHash.current = false;
            }, 100);
        };

        // Handle initial load
        handleHashChange();

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [manifest, setAppState, setSelectedCategory, setViewingCollection]);

    // 2. Update hash when State Changes
    useEffect(() => {
        if (isUpdatingFromHash.current) return;

        let newHash = '/';

        switch (appState) {
            case 'menu':
                newHash = '/';
                break;
            case 'about':
                newHash = '/about';
                break;
            case 'contact':
                newHash = '/contact';
                break;
            case 'fashionfilm':
                newHash = '/fashionfilm';
                break;
            case 'sphere':
            case 'entering': // Keep same hash for entering animation
                if (selectedCategory) {
                    newHash = `/sphere/${selectedCategory}`;
                }
                break;
            case 'scroll': // Immersive view
            case 'preview': // Keep immersive hash for preview modal too, or we could add '/preview'
            case 'focus':
                if (selectedCategory) {
                    newHash = `/immersive/${selectedCategory}`;
                }
                break;
            case 'collection':
                if (selectedCategory && viewingCollection) {
                    newHash = `/collection/${selectedCategory}/${viewingCollection.id}`;
                }
                break;
            default:
                newHash = '/';
        }

        // Only update if changed prevents unnecessary history entries (replaceState vs pushState could be considered)
        const currentHash = window.location.hash.replace('#', '');
        if (currentHash !== newHash) {
            window.history.replaceState(null, '', '#' + newHash);
        }

    }, [appState, selectedCategory, viewingCollection]);
};
