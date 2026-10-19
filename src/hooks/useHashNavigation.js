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
    manifest,
    ready = true // false until Supabase has answered: deep links must wait for the data
}) => {
    // Flag to prevent infinite loops when updating state from hash vs hash from state
    const isUpdatingFromHash = useRef(false);
    const hasSynced = useRef(false);

    // 1. Listen for hash changes (Browser Back/Forward)
    useEffect(() => {
        // Without data every collection/category link would look invalid and get
        // redirected away, breaking shared links and page reloads.
        if (!ready) return

        const handleHashChange = () => {
            isUpdatingFromHash.current = true;
            const { view, category, id } = parseHash();

            // Reset generic states first to avoid conflicts
            // But we do it carefully based on the target view

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
    }, [manifest, ready, setAppState, setSelectedCategory, setViewingCollection]);

    // 2. Update hash when State Changes
    useEffect(() => {
        if (!ready) return;
        // State came from the URL, so the URL is already right
        if (isUpdatingFromHash.current) {
            hasSynced.current = true;
            return;
        }

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
                if (selectedCategory) {
                    newHash = `/sphere/${selectedCategory}`;
                }
                break;
            // 'entering' already counts as the immersive view: the history entry is
            // created on the click itself, not ~1s later when the fly-in ends.
            // Browsers may skip entries added without a recent user gesture.
            case 'entering':
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

        // pushState so the browser/phone Back button walks back through the site
        // (hashchange above restores the state) instead of leaving it.
        // The first sync after load only normalises the URL, so it replaces.
        const currentHash = window.location.hash.replace('#', '') || '/';
        if (currentHash !== newHash) {
            if (hasSynced.current) {
                window.history.pushState(null, '', '#' + newHash);
            } else {
                window.history.replaceState(null, '', '#' + newHash);
            }
        }
        hasSynced.current = true;

    }, [appState, selectedCategory, viewingCollection, ready]);
};
