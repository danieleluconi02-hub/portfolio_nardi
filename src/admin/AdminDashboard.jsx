import { useState, useEffect, useCallback } from 'react'
import { fetchAllCollections, deleteCollection, updateCollection } from '../lib/collectionsApi'
import { supabase } from '../lib/supabase'
import CollectionForm from './CollectionForm'

const CATEGORY_LABELS = { design: 'Fashion Design', styling: 'Styling' }

export default function AdminDashboard() {
    const [collections, setCollections] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // 'list' | 'create' | 'edit'
    const [editingCollection, setEditingCollection] = useState(null)
    const [filterCategory, setFilterCategory] = useState('all')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchAllCollections()
            setCollections(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    const handleEdit = (collection) => {
        setEditingCollection(collection)
        setView('edit')
    }

    const handleDelete = async (collection) => {
        if (!confirm(`Delete "${collection.title}"? This cannot be undone.`)) return
        await deleteCollection(collection.id)
        await load()
    }

    const handleTogglePublished = async (collection) => {
        await updateCollection(collection.id, { published: !collection.published })
        await load()
    }

    const handleSaved = () => {
        setView('list')
        setEditingCollection(null)
        load()
    }

    const handleCancel = () => {
        setView('list')
        setEditingCollection(null)
    }

    const filtered = filterCategory === 'all'
        ? collections
        : collections.filter((c) => c.category === filterCategory)

    // ── Form views ──────────────────────────────────────────────────────────
    if (view === 'create' || view === 'edit') {
        return (
            <div className="min-h-screen bg-[#0F1114] p-6 sm:p-10">
                <div className="max-w-3xl mx-auto">
                    <CollectionForm
                        collection={view === 'edit' ? editingCollection : null}
                        onSaved={handleSaved}
                        onCancel={handleCancel}
                    />
                </div>
            </div>
        )
    }

    // ── List view ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0F1114]">
            {/* Top bar */}
            <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div>
                    <p className="text-white/30 text-xs tracking-[0.3em] uppercase">Portfolio</p>
                    <h1 className="text-white text-xl tracking-[0.1em] uppercase font-light"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Admin Dashboard
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <a
                        href="/"
                        className="text-white/30 hover:text-white/60 text-xs tracking-widest uppercase transition-colors"
                    >
                        ← Site
                    </a>
                    <button
                        onClick={handleSignOut}
                        className="text-white/30 hover:text-white/60 text-xs tracking-widest uppercase transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {/* Actions row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Category filter */}
                    <div className="flex items-center gap-2">
                        {['all', 'design', 'styling'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`text-xs tracking-widest uppercase px-3 py-1.5 border transition-colors ${filterCategory === cat
                                    ? 'border-white text-white'
                                    : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white/60'
                                    }`}
                            >
                                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setView('create')}
                        className="bg-white text-black text-xs tracking-[0.2em] uppercase px-5 py-2.5 font-medium hover:bg-white/90 transition-colors"
                    >
                        + New Collection
                    </button>
                </div>

                {/* Collection list */}
                {loading ? (
                    <div className="text-white/30 text-sm tracking-widest py-16 text-center">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-white/10">
                        <p className="text-white/30 text-sm tracking-wide">No collections yet.</p>
                        <button
                            onClick={() => setView('create')}
                            className="mt-4 text-white/50 hover:text-white text-xs tracking-widest uppercase underline underline-offset-4 transition-colors"
                        >
                            Create the first one
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filtered.map((col) => (
                            <CollectionRow
                                key={col.id}
                                collection={col}
                                onEdit={() => handleEdit(col)}
                                onDelete={() => handleDelete(col)}
                                onTogglePublished={() => handleTogglePublished(col)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}

function CollectionRow({ collection, onEdit, onDelete, onTogglePublished }) {
    const cover = collection.thumb_urls?.[0] || collection.image_urls?.[0]

    return (
        <div className="flex items-center gap-4 py-4">
            {/* Cover thumbnail */}
            <div className="w-14 h-14 bg-white/5 flex-shrink-0 overflow-hidden">
                {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/15 text-xs">No img</div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <p className="text-white text-sm font-light truncate">{collection.title}</p>
                    <span className="text-white/20 text-xs">{collection.year}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/30 text-xs tracking-wider uppercase">
                        {CATEGORY_LABELS[collection.category] || collection.category}
                    </span>
                    <span className="text-white/15">·</span>
                    <span className="text-white/30 text-xs">
                        {collection.image_urls?.length || 0} images
                    </span>
                    <span className="text-white/15">·</span>
                    <span className="text-white/30 text-xs font-mono">{collection.slug}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
                <button
                    onClick={onTogglePublished}
                    className={`text-xs tracking-wider uppercase px-2 py-1 border transition-colors ${collection.published
                        ? 'border-emerald-500/50 text-emerald-400'
                        : 'border-white/10 text-white/25 hover:border-white/30'
                        }`}
                    title={collection.published ? 'Click to unpublish' : 'Click to publish'}
                >
                    {collection.published ? 'Live' : 'Draft'}
                </button>
                <button
                    onClick={onEdit}
                    className="text-white/30 hover:text-white text-xs tracking-wider uppercase transition-colors"
                >
                    Edit
                </button>
                <button
                    onClick={onDelete}
                    className="text-white/20 hover:text-red-400 text-xs tracking-wider uppercase transition-colors"
                >
                    Delete
                </button>
            </div>
        </div>
    )
}
