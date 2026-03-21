import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadImage } from '../lib/collectionsApi'

/**
 * Drag-and-drop image uploader.
 * Uploads each file to Supabase Storage and calls onUploaded({ fullUrl, thumbUrl }) for each.
 */
export default function ImageUploader({ category, slug, onUploaded, disabled }) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState({ done: 0, total: 0 })
    const [errors, setErrors] = useState([])

    const onDrop = useCallback(
        async (acceptedFiles, fileRejections) => {
            // Show why files were rejected (wrong type, etc.)
            if (fileRejections?.length) {
                setErrors(fileRejections.map(r =>
                    `${r.file.name}: rejected (type: ${r.file.type || 'unknown'}) — ${r.errors.map(e => e.message).join(', ')}`
                ))
            }
            if (!acceptedFiles.length) return
            if (!category || !slug) {
                setErrors(['Set the category and title before uploading.'])
                return
            }

            setUploading(true)
            setErrors([])
            setProgress({ done: 0, total: acceptedFiles.length })

            const errs = []
            for (let i = 0; i < acceptedFiles.length; i++) {
                const file = acceptedFiles[i]
                try {
                    const result = await uploadImage(file, category, slug)
                    onUploaded(result)
                } catch (err) {
                    errs.push(`${file.name}: ${err.message}`)
                }
                setProgress({ done: i + 1, total: acceptedFiles.length })
            }

            setErrors(errs)
            setUploading(false)
        },
        [category, slug, onUploaded]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        disabled: disabled || uploading,
        multiple: true,
    })

    return (
        <div className="space-y-3">
            <div
                {...getRootProps()}
                className={`
                    border-2 border-dashed rounded-none p-10 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-white/60 bg-white/5' : 'border-white/15 hover:border-white/30'}
                    ${(disabled || uploading) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <input {...getInputProps()} />

                {disabled && !uploading ? (
                    <p className="text-white/40 text-sm">Enter a title above to enable uploads</p>
                ) : uploading ? (
                    <div className="space-y-2">
                        <p className="text-white/60 text-sm">
                            Processing {progress.done} / {progress.total}…
                        </p>
                        <div className="w-full bg-white/10 h-1">
                            <div
                                className="bg-white h-1 transition-all duration-300"
                                style={{ width: `${(progress.done / progress.total) * 100}%` }}
                            />
                        </div>
                        <p className="text-white/30 text-xs">Resizing and optimizing…</p>
                    </div>
                ) : isDragActive ? (
                    <p className="text-white/70 text-sm tracking-widest uppercase">Drop images here</p>
                ) : (
                    <div className="space-y-2">
                        <div className="text-white/20 text-4xl">↑</div>
                        <p className="text-white/50 text-sm tracking-wide">
                            Drag & drop images, or click to select
                        </p>
                        <p className="text-white/20 text-xs">
                            JPG, PNG, WEBP, HEIC — any size, automatically optimized
                        </p>
                    </div>
                )}
            </div>

            {errors.length > 0 && (
                <div className="bg-red-900/30 border border-red-500/30 p-3 space-y-1">
                    {errors.map((e, i) => (
                        <p key={i} className="text-red-400 text-sm">{e}</p>
                    ))}
                </div>
            )}
        </div>
    )
}
