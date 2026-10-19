import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import LoginPage from './LoginPage'
import AdminDashboard from './AdminDashboard'

export default function AdminApp() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    // Admin-only web fonts (kept off the public site's critical path)
    useEffect(() => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Inter:wght@200;300;400&display=swap'
        document.head.appendChild(link)
        return () => link.remove()
    }, [])

    // Allow the page to scroll — the main site locks overflow globally
    useEffect(() => {
        document.documentElement.style.overflow = 'auto'
        document.documentElement.style.height = 'auto'
        document.body.style.overflow = 'auto'
        document.body.style.height = 'auto'
        const root = document.getElementById('root')
        if (root) { root.style.overflow = 'auto'; root.style.height = 'auto' }
        return () => {
            document.documentElement.style.overflow = ''
            document.documentElement.style.height = ''
            document.body.style.overflow = ''
            document.body.style.height = ''
            if (root) { root.style.overflow = ''; root.style.height = '' }
        }
    }, [])

    useEffect(() => {
        // Check existing session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        // Listen for auth state changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1114] flex items-center justify-center">
                <div className="text-white/20 text-xs tracking-widest uppercase">Loading…</div>
            </div>
        )
    }

    if (!session) {
        return <LoginPage onLogin={setSession} />
    }

    return <AdminDashboard />
}
