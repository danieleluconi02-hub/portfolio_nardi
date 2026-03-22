import { useState, useEffect, useCallback } from 'react'
import { fetchAllKeywords, createKeyword, updateKeyword, deleteKeyword } from '../lib/keywordsApi'
import { deleteImages } from '../lib/collectionsApi'
import { getStaticImagesForKeyword } from '../lib/aboutAssets'
import ImageUploader from './ImageUploader'

export default function KeywordsManager() {
    const [keywords, setKeywords] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newFolder, setNewFolder] = useState('')
    const [newLabel, setNewLabel] = useState('')
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchAllKeywords()
            setKeywords(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const handleAdd = async (e) => {
        e.preventDefault()
        if (!newFolder.trim() || !newLabel.trim()) return
        setAdding(true)
        setAddError(null)
        try {
            await createKeyword({
                folder_name: newFolder.trim(),
                keyword_text: newLabel.trim(),
                image_urls: [],
                thumb_urls: [],
            })
            setNewFolder('')
            setNewLabel('')
            setShowAddForm(false)
            await load()
        } catch (err) {
            setAddError(err.message)
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async (kw) => {
        if (!confirm(`Delete keyword "${kw.keyword_text}"?`)) return
        await deleteKeyword(kw.id)
        if (expandedId === kw.id) setExpandedId(null)
        await load()
    }

    const handleImageUploaded = useCallback(async (kw, { fullUrl, thumbUrl }) => {
        try {
            const updated = await updateKeyword(kw.id, {
                image_urls: [...(kw.image_urls || []), fullUrl],
                thumb_urls: [...(kw.thumb_urls || []), thumbUrl],
            })
            setKeywords(prev => prev.map(k => k.id === kw.id ? updated : k))
        } catch (err) {
            console.error('Failed to update keyword images:', err)
        }
    }, [])

    const handleRemoveImage = useCallback(async (kw, index) => {
        const fullUrl = kw.image_urls?.[index]
        const thumbUrl = kw.thumb_urls?.[index]
        await deleteImages([fullUrl, thumbUrl].filter(Boolean))
        try {
            const updated = await updateKeyword(kw.id, {
                image_urls: (kw.image_urls || []).filter((_, i) => i !== index),
                thumb_urls: (kw.thumb_urls || []).filter((_, i) => i !== index),
            })
            setKeywords(prev => prev.map(k => k.id === kw.id ? updated : k))
        } catch (err) {
            console.error('Failed to remove keyword image:', err)
        }
    }, [])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white/30 text-xs tracking-[0.3em] uppercase mb-1">About Page</p>
                    <h2 className="text-white text-sm tracking-[0.1em] uppercase font-light"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Keywords Manager
                    </h2>
                </div>
                <button
                    onClick={() => setShowAddForm(v => !v)}
                    className="bg-white text-black text-xs tracking-[0.2em] uppercase px-5 py-2.5 font-medium hover:bg-white/90 transition-colors"
                >
                    + Add Keyword
                </button>
            </div>

            <p className="text-white/25 text-xs leading-relaxed">
                Each keyword matches a <span className="font-mono text-white/40">folder_name</span> used in the About page translations.
                When images are uploaded here, they replace the static fallback assets.
            </p>

            {/* Add form */}
            {showAddForm && (
                <form onSubmit={handleAdd} className="border border-white/10 p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="admin-label">
                                Folder Name
                                <span className="text-white/20 ml-2 normal-case text-[10px]">(must match translation link)</span>
                            </label>
                            <input
                                type="text"
                                value={newFolder}
                                onChange={e => setNewFolder(e.target.value)}
                                placeholder="e.g. 01_roots/concretezza_della_materia"
                                className="admin-input font-mono text-xs"
                                required
                            />
                        </div>
                        <div>
                            <label className="admin-label">Display Label</label>
                            <input
                                type="text"
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                placeholder="e.g. Concretezza della Materia"
                                className="admin-input"
                                required
                            />
                        </div>
                    </div>
                    {addError && <p className="text-red-400 text-xs">{addError}</p>}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={adding}
                            className="bg-white text-black text-xs tracking-[0.2em] uppercase px-5 py-2 font-medium disabled:opacity-50 hover:bg-white/90 transition-colors"
                        >
                            {adding ? 'Adding…' : 'Add'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setShowAddForm(false); setAddError(null) }}
                            className="text-white/30 hover:text-white/60 text-xs tracking-widest uppercase transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* List */}
            {loading ? (
                <p className="text-white/30 text-sm tracking-widest py-8 text-center">Loading…</p>
            ) : keywords.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10">
                    <p className="text-white/30 text-sm tracking-wide">No keywords yet.</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="mt-4 text-white/50 hover:text-white text-xs tracking-widest uppercase underline underline-offset-4 transition-colors"
                    >
                        Add the first one
                    </button>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {keywords.map(kw => (
                        <KeywordRow
                            key={kw.id}
                            keyword={kw}
                            staticImages={getStaticImagesForKeyword(kw.folder_name)}
                            expanded={expandedId === kw.id}
                            onToggle={() => setExpandedId(id => id === kw.id ? null : kw.id)}
                            onDelete={() => handleDelete(kw)}
                            onImageUploaded={(result) => handleImageUploaded(kw, result)}
                            onRemoveImage={(index) => handleRemoveImage(kw, index)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function KeywordRow({ keyword, staticImages, expanded, onToggle, onDelete, onImageUploaded, onRemoveImage }) {
    const supabaseImgs = keyword.image_urls || []
    const supabaseThumbs = keyword.thumb_urls || []
    // Preview strip: prefer supabase thumbs, fall back to static
    const previewImgs = supabaseThumbs.length ? supabaseThumbs : supabaseImgs.length ? supabaseImgs : staticImages

    return (
        <div className="py-4">
            <div className="flex items-center gap-4">
                {/* Thumbnail strip */}
                <div className="flex gap-1 flex-shrink-0">
                    {previewImgs.slice(0, 3).map((url, i) => (
                        <div key={i} className="w-10 h-10 bg-white/5 overflow-hidden flex-shrink-0">
                            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                    ))}
                    {!previewImgs.length && (
                        <div className="w-10 h-10 bg-white/5 flex items-center justify-center text-white/15 text-[9px] flex-shrink-0">—</div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-light">{keyword.keyword_text}</p>
                    <p className="text-white/25 text-xs font-mono mt-0.5 truncate">{keyword.folder_name}</p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-white/25 text-xs">
                        {supabaseImgs.length ? `${supabaseImgs.length} custom` : `${staticImages.length} static`}
                    </span>
                    <button
                        onClick={onToggle}
                        className="text-white/40 hover:text-white text-xs tracking-wider uppercase transition-colors"
                    >
                        {expanded ? 'Close' : 'Edit'}
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-white/20 hover:text-red-400 text-xs tracking-wider uppercase transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="mt-4 space-y-5 border-t border-white/5 pt-4">
                    {/* Upload zone */}
                    <ImageUploader
                        category="about"
                        slug={keyword.folder_name}
                        onUploaded={onImageUploaded}
                        disabled={false}
                    />

                    {/* Supabase images (editable) */}
                    {supabaseImgs.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase">
                                Custom images — active on site
                            </p>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {supabaseImgs.map((url, i) => (
                                    <div key={i} className="relative group aspect-square bg-white/5">
                                        <img
                                            src={supabaseThumbs[i] || url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => onRemoveImage(i)}
                                            className="absolute inset-0 bg-black/70 text-white/80 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Static fallback images (read-only) */}
                    {staticImages.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-white/25 text-[10px] tracking-[0.2em] uppercase">
                                {supabaseImgs.length ? 'Static fallback (inactive — overridden)' : 'Static assets — currently active'}
                            </p>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {staticImages.map((url, i) => (
                                    <div key={i} className={`aspect-square bg-white/5 overflow-hidden ${supabaseImgs.length ? 'opacity-30' : ''}`}>
                                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
