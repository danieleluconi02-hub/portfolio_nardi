import { useState, useEffect } from 'react'
import { createCollection, updateCollection, deleteImages } from '../lib/collectionsApi'
import ImageUploader from './ImageUploader'

const CATEGORIES = [
    { value: 'design', label: 'Fashion Design' },
    { value: 'styling', label: 'Styling' },
]

/** Generate a URL-safe slug from a title */
function toSlug(title, category) {
    const base = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
    return `${category}-${base}`
}

export default function CollectionForm({ collection, onSaved, onCancel }) {
    const isEditing = !!collection

    const [form, setForm] = useState({
        category: collection?.category || 'design',
        title: collection?.title || '',
        year: collection?.year || '',
        description: collection?.description || '',
        credits: collection?.credits || '',
        published: collection?.published ?? false,
        sort_order: collection?.sort_order ?? 0,
    })

    const [slug, setSlug] = useState(collection?.slug || '')
    const [imageUrls, setImageUrls] = useState(collection?.image_urls || [])
    const [thumbUrls, setThumbUrls] = useState(collection?.thumb_urls || [])

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [showMarkdown, setShowMarkdown] = useState(false)

    // Auto-generate slug when title or category changes (only when creating)
    useEffect(() => {
        if (!isEditing && form.title) {
            setSlug(toSlug(form.title, form.category))
        }
    }, [form.title, form.category, isEditing])

    const set = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

    const handleImageUploaded = ({ fullUrl, thumbUrl }) => {
        setImageUrls((prev) => [...prev, fullUrl])
        setThumbUrls((prev) => [...prev, thumbUrl])
    }

    const handleRemoveImage = async (index) => {
        const fullUrl = imageUrls[index]
        const thumbUrl = thumbUrls[index]
        // Remove from storage (best-effort)
        await deleteImages([fullUrl, thumbUrl].filter(Boolean))
        setImageUrls((prev) => prev.filter((_, i) => i !== index))
        setThumbUrls((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title.trim()) return setError('Title is required.')
        if (!slug.trim()) return setError('Slug is required.')
        if (!imageUrls.length) return setError('Upload at least one image.')

        setSaving(true)
        setError(null)

        const payload = {
            ...form,
            slug: slug.trim(),
            image_urls: imageUrls,
            thumb_urls: thumbUrls,
        }

        try {
            if (isEditing) {
                await updateCollection(collection.id, payload)
            } else {
                await createCollection(payload)
            }
            onSaved()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-7">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-white text-lg tracking-[0.1em] uppercase font-light"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {isEditing ? 'Edit Collection' : 'New Collection'}
                </h2>
                <button type="button" onClick={onCancel}
                    className="text-white/30 hover:text-white/70 text-sm transition-colors">
                    ✕ Cancel
                </button>
            </div>

            {/* Category + Title + Year row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="admin-label">Category</label>
                    <select
                        value={form.category}
                        onChange={set('category')}
                        className="admin-input"
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="admin-label">Collection Title</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={set('title')}
                        required
                        placeholder="e.g. FW 2026"
                        className="admin-input"
                    />
                </div>

                <div>
                    <label className="admin-label">Year</label>
                    <input
                        type="text"
                        value={form.year}
                        onChange={set('year')}
                        placeholder="e.g. 2026"
                        className="admin-input"
                    />
                </div>
            </div>

            {/* Slug */}
            <div>
                <label className="admin-label">
                    Slug
                    <span className="text-white/20 ml-2 normal-case text-[10px]">(auto-generated, used in URLs)</span>
                </label>
                <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="admin-input font-mono text-xs"
                />
            </div>

            {/* Description */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="admin-label" style={{ marginBottom: 0 }}>Description</label>
                    <button
                        type="button"
                        onClick={() => setShowMarkdown((v) => !v)}
                        className="text-white/30 hover:text-white/60 text-xs tracking-wider transition-colors"
                    >
                        {showMarkdown ? '← Edit' : 'Preview →'}
                    </button>
                </div>

                {showMarkdown ? (
                    <div className="admin-input min-h-[120px] prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-white/70 text-sm leading-relaxed">
                        {form.description || <span className="text-white/20 italic">No description yet.</span>}
                    </div>
                ) : (
                    <textarea
                        value={form.description}
                        onChange={set('description')}
                        rows={5}
                        placeholder="Write a collection description… (supports Markdown)"
                        className="admin-input resize-y min-h-[120px] text-sm leading-relaxed"
                    />
                )}
            </div>

            {/* Credits */}
            <div>
                <label className="admin-label">Credits</label>
                <input
                    type="text"
                    value={form.credits}
                    onChange={set('credits')}
                    placeholder="e.g. Photo: Mario Rossi — MUA: Anna Bianchi"
                    className="admin-input text-sm"
                />
            </div>

            {/* Image Uploader */}
            <div>
                <label className="admin-label">Images</label>
                <ImageUploader
                    category={form.category}
                    slug={slug}
                    onUploaded={handleImageUploaded}
                    disabled={!slug}
                />
            </div>

            {/* Image Grid Preview */}
            {imageUrls.length > 0 && (
                <div>
                    <label className="admin-label">
                        Uploaded Images
                        <span className="text-white/30 ml-2 font-normal normal-case text-[10px]">{imageUrls.length} total</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {imageUrls.map((url, i) => (
                            <div key={i} className="relative group aspect-square bg-white/5">
                                <img
                                    src={thumbUrls[i] || url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(i)}
                                    className="absolute inset-0 bg-black/70 text-white/80 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer controls */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.published}
                        onChange={set('published')}
                        className="w-4 h-4 accent-white"
                    />
                    <span className="text-white/60 text-xs tracking-widest uppercase">
                        Published
                    </span>
                </label>

                <div className="flex items-center gap-4">
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-white text-black text-xs tracking-[0.2em] uppercase px-6 py-2.5 font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Collection'}
                    </button>
                </div>
            </div>
        </form>
    )
}
