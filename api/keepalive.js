// Vercel Serverless Function — runs daily via cron to keep Supabase awake.
// Supabase Free Tier pauses after 7 days of inactivity; this prevents that.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    // Only allow GET requests (triggered by Vercel cron)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('[keepalive] Supabase env vars are missing in Vercel settings!')
        return res.status(500).json({ error: 'Supabase env vars missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Lightweight query — fetches 1 row to signal activity to Supabase
    const { error } = await supabase
        .from('collections')
        .select('id')
        .limit(1)

    if (error) {
        console.error('[keepalive] Supabase ping failed:', error.message)
        return res.status(500).json({ error: error.message, timestamp: new Date().toISOString() })
    }

    console.log('[keepalive] Supabase pinged successfully at', new Date().toISOString())
    return res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
}
