import { supabase } from './supabase'

/** Fetch all keyword records (admin) */
export async function fetchAllKeywords() {
    const { data, error } = await supabase
        .from('about_keywords')
        .select('*')
        .order('folder_name', { ascending: true })
    if (error) throw error
    return data || []
}

/**
 * Fetch keywords for the frontend.
 * Returns a map of { folderName: imageUrls[] } — only entries that have images.
 */
export async function fetchKeywordsMap() {
    const { data, error } = await supabase
        .from('about_keywords')
        .select('folder_name, image_urls')
    if (error) return {}
    const map = {}
    for (const row of data || []) {
        if (row.image_urls?.length) {
            map[row.folder_name] = row.image_urls
        }
    }
    return map
}

export async function createKeyword(payload) {
    const { data, error } = await supabase
        .from('about_keywords')
        .insert([payload])
        .select()
        .single()
    if (error) throw error
    return data
}

export async function updateKeyword(id, updates) {
    const { data, error } = await supabase
        .from('about_keywords')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function deleteKeyword(id) {
    const { error } = await supabase
        .from('about_keywords')
        .delete()
        .eq('id', id)
    if (error) throw error
}
