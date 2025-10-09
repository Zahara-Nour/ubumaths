# Supabase CLI Fix Guide

This guide shows you how to fix missing user profiles using the Supabase CLI.

## Prerequisites

### 1. Install Supabase CLI

If you don't have it installed:

```bash
# Using npm
npm install -g supabase

# OR using Homebrew (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### 2. Link to Your Supabase Project

```bash
# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF
```

**Finding your project ref:**
- Go to your Supabase dashboard
- URL looks like: `https://app.supabase.com/project/aqtijumsgfufoztohdua`
- Your project ref is: `aqtijumsgfufoztohdua`

You can also find it in your `.env`:
```bash
# Extract from PUBLIC_SUPABASE_URL
grep PUBLIC_SUPABASE_URL .env
# https://aqtijumsgfufoztohdua.supabase.co → aqtijumsgfufoztohdua
```

**Link command:**
```bash
supabase link --project-ref aqtijumsgfufoztohdua
```

## Quick Fix (3 Options)

### Option 1: Run All Migrations (Recommended) ⭐

This runs all pending migrations, including the trigger and the fix:

```bash
pnpm run db:migrate

# OR directly:
supabase db push
```

**What this does:**
- ✅ Creates the automatic profile trigger (migration 004)
- ✅ Fixes all existing users without profiles (migration 005)
- ✅ Future signups will automatically create profiles

### Option 2: Run Only the User Fix

If you already have the trigger but need to fix existing users:

```bash
pnpm run db:fix-profiles

# OR directly:
supabase db execute --file supabase/migrations/005_fix_existing_users.sql
```

### Option 3: Run Quick SQL Fix

One-liner to fix all users immediately:

```bash
supabase db execute --sql "
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', '') as full_name,
  'student' as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
"
```

## Verify the Fix

Check how many users are missing profiles:

```bash
pnpm run db:status

# OR directly:
supabase db execute --sql "
SELECT
  COUNT(CASE WHEN p.id IS NULL THEN 1 END) as missing_profiles,
  COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as users_with_profiles,
  COUNT(*) as total_users
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
"
```

**Expected output:**
```
 missing_profiles | users_with_profiles | total_users
------------------+--------------------+-------------
                0 |                  5 |           5
```

If `missing_profiles = 0`, you're all set! ✅

## Interactive Script

We also created an interactive script:

```bash
./scripts/fix-profiles.sh
```

This script will:
1. Check if Supabase CLI is installed
2. Verify you're linked to a project
3. Give you options to fix the issue
4. Verify the fix worked

## Step-by-Step Tutorial

### Complete Setup from Scratch

```bash
# 1. Install Supabase CLI (if needed)
npm install -g supabase

# 2. Link your project
supabase link --project-ref aqtijumsgfufoztohdua

# 3. Run all migrations
pnpm run db:migrate

# 4. Check status
pnpm run db:status

# 5. Test the dashboard
# - Log out and log back in
# - Visit /dashboard
# - You should see your role-based dashboard
```

## Troubleshooting

### Error: "Project ref not found"

Make sure you're using the correct project ref from your Supabase dashboard URL.

```bash
# Check your .env file
cat .env | grep PUBLIC_SUPABASE_URL

# Extract the project ref (between https:// and .supabase.co)
```

### Error: "Not linked to a project"

Run the link command:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Error: "Permission denied"

Make sure you're authenticated:

```bash
# Login to Supabase
supabase login

# Then link your project
supabase link --project-ref YOUR_PROJECT_REF
```

### Error: "Migration already applied"

This is fine! It means the migration already ran. Just verify:

```bash
pnpm run db:status
```

## Migration Files

The following migrations are in `supabase/migrations/`:

- **`004_create_profile_trigger.sql`**: Creates automatic profile creation
- **`005_fix_existing_users.sql`**: Backfills profiles for existing users

## Manual Alternative (Supabase Dashboard)

If you prefer using the dashboard:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Paste this:

```sql
-- Create profiles for existing users
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', '') as full_name,
  'student' as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

4. Click **Run**

## Available npm Scripts

We added these scripts to `package.json`:

```json
{
  "db:migrate": "Run all pending migrations",
  "db:fix-profiles": "Fix existing users without profiles",
  "db:status": "Check how many users are missing profiles"
}
```

**Usage:**
```bash
pnpm run db:migrate       # Run all migrations
pnpm run db:fix-profiles  # Fix existing users
pnpm run db:status        # Check status
```

## Summary

**Quickest Fix (if Supabase CLI is installed):**

```bash
supabase link --project-ref aqtijumsgfufoztohdua
pnpm run db:migrate
pnpm run db:status
```

**Without CLI (use dashboard):**
- Open SQL Editor in Supabase dashboard
- Run the SQL from `005_fix_existing_users.sql`

Both methods will fix your "Profile not found" error! ✨
