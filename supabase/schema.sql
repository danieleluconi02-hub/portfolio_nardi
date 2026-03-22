-- ─────────────────────────────────────────────────────────────────────────────
-- Portfolio CMS — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Collections table
CREATE TABLE IF NOT EXISTS public.collections (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    title       TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    category    TEXT NOT NULL CHECK (category IN ('design', 'styling')),
    description TEXT,
    year        TEXT,
    image_urls  TEXT[] DEFAULT '{}' NOT NULL,
    thumb_urls  TEXT[] DEFAULT '{}' NOT NULL,
    credits     TEXT,
    published   BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order  INTEGER DEFAULT 0 NOT NULL
);

-- Migration: add credits column if table already exists
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS credits TEXT;

-- Enable Row Level Security
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Public can read published collections (used by the frontend)
CREATE POLICY "Public read published"
    ON public.collections
    FOR SELECT
    USING (published = TRUE);

-- Authenticated users (site owner) have full access
CREATE POLICY "Authenticated full access"
    ON public.collections
    FOR ALL
    USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- About Keywords table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.about_keywords (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    folder_name  TEXT UNIQUE NOT NULL,
    keyword_text TEXT NOT NULL,
    image_urls   TEXT[] DEFAULT '{}' NOT NULL,
    thumb_urls   TEXT[] DEFAULT '{}' NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.about_keywords ENABLE ROW LEVEL SECURITY;

-- Public can read all keywords (used by the frontend)
CREATE POLICY "Public read keywords"
    ON public.about_keywords
    FOR SELECT
    USING (TRUE);

-- Authenticated users have full access
CREATE POLICY "Authenticated full access keywords"
    ON public.about_keywords
    FOR ALL
    USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage bucket: portfolio-assets
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this AFTER creating the bucket in the Supabase dashboard
-- (Storage → New bucket → "portfolio-assets" → Public: ON)

-- Allow public read access to storage objects
CREATE POLICY "Public read portfolio assets"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'portfolio-assets');

-- Allow authenticated users to upload/delete
CREATE POLICY "Authenticated upload portfolio assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'portfolio-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete portfolio assets"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'portfolio-assets' AND auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- Create your admin account
-- ─────────────────────────────────────────────────────────────────────────────
-- Go to: Authentication → Users → Invite user
-- Enter your email, set a password — that's your only login.
-- ─────────────────────────────────────────────────────────────────────────────
