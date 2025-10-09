# Dashboard Setup Guide

Quick start guide to set up the role-based dashboard system.

## Prerequisites

- ✅ Supabase project created
- ✅ Authentication enabled in Supabase
- ✅ `profiles` table exists in your database

## Step 1: Verify Database Schema

Make sure your `profiles` table exists with the correct schema:

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
```

## Step 2: Set Up Automatic Profile Creation

Run this SQL to automatically create profiles when users sign up:

```sql
-- Function to create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'student'  -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Location**: Copy from `supabase/migrations/create_profile_trigger.sql`

## Step 3: Fix Existing Users (if any)

If you have users who signed up before the trigger was created:

```sql
-- Create profiles for all users who don't have one
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  'student' as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

## Step 4: Set Up Row Level Security (RLS) Policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Step 5: Create Your First Admin User

After signing up your first user, promote them to admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';  -- Replace with your email
```

## Step 6: Test the Dashboard

1. **Sign up** a new user at `/signup`
2. **Log in** at `/login`
3. **Access dashboard** at `/dashboard`
4. You should see the **Student Dashboard** (default role)

## Step 7: Test Different Roles

```sql
-- Create a test teacher
UPDATE public.profiles SET role = 'teacher'
WHERE email = 'test@example.com';

-- Create a test admin
UPDATE public.profiles SET role = 'admin'
WHERE email = 'admin@example.com';
```

Log in with each account and verify you see the correct dashboard.

## Verification Checklist

Run this SQL to verify everything is set up correctly:

```sql
-- Dashboard Setup Health Check
SELECT
  'Setup Step' as category,
  'Status' as status
UNION ALL
SELECT
  '1. Profiles table exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN '✓ Pass' ELSE '✗ Fail' END
UNION ALL
SELECT
  '2. Trigger function exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
  ) THEN '✓ Pass' ELSE '✗ Fail' END
UNION ALL
SELECT
  '3. Trigger exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN '✓ Pass' ELSE '✗ Fail' END
UNION ALL
SELECT
  '4. All users have profiles',
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
  ) THEN '✓ Pass' ELSE '✗ Fail - Run fix-missing-profile.sql' END
UNION ALL
SELECT
  '5. RLS enabled',
  CASE WHEN (
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = 'profiles'
  ) THEN '✓ Pass' ELSE '✗ Fail' END;
```

All checks should show "✓ Pass".

## File Structure

Your dashboard files are located at:

```
src/routes/dashboard/
├── +layout.server.ts       ← Authentication & profile loading
├── +layout.svelte          ← Shared header
├── +page.server.ts         ← Inherits profile from parent
├── +page.svelte            ← Role-based routing
├── StudentDashboard.svelte ← Student view
├── TeacherDashboard.svelte ← Teacher view
└── AdminDashboard.svelte   ← Admin view
```

## Next Steps

- 📖 Read [DASHBOARD.md](./DASHBOARD.md) for complete architecture docs
- 🔧 See [TROUBLESHOOTING-DASHBOARD.md](./TROUBLESHOOTING-DASHBOARD.md) if you encounter issues
- 🔒 Review [AUTHENTICATION.md](./AUTHENTICATION.md) for security details

## Quick Reference

### Access Dashboard
- URL: `http://localhost:5173/dashboard`
- Requires: Authentication
- Shows: Role-based view (Student/Teacher/Admin)

### Change User Role
```sql
UPDATE public.profiles
SET role = 'teacher'  -- or 'student', 'admin'
WHERE email = 'user@example.com';
```

### View User Roles
```sql
SELECT email, role, created_at
FROM public.profiles
ORDER BY created_at DESC;
```

### Create Manual Profile
```sql
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'user-uuid-from-auth-users',
  'user@example.com',
  'Full Name',
  'student'
);
```

## Troubleshooting Quick Links

| Error | Fix |
|-------|-----|
| "Profile not found" | Run `fix-missing-profile.sql` |
| "403 Forbidden" | Check user role matches route requirements |
| "Redirect to login" | Clear cookies, verify authentication |
| TypeScript errors | Run `pnpm run check` |

---

**Need Help?** Check [TROUBLESHOOTING-DASHBOARD.md](./TROUBLESHOOTING-DASHBOARD.md)
