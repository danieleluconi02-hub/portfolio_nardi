// Shared static asset loader for About page keyword images.
// Used by both AboutPage and the admin KeywordsManager.

const aboutImages = import.meta.glob('../assets/about/**/*.{png,jpg,jpeg,webp,svg}', { eager: true })

export function getStaticImagesForKeyword(folderName) {
    if (!folderName) return []
    const images = []
    for (const path in aboutImages) {
        if (path.replace(/\\/g, '/').includes(folderName)) {
            images.push(aboutImages[path].default)
        }
    }
    return images
}
