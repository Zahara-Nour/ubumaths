# Dashboard Troubleshooting Guide

This guide helps you resolve common issues with the role-based dashboard system.

## Error: "Profile not found for authenticated user"

### Symptoms

- User can log in successfully
- Accessing `/dashboard` shows 500 error
- Console shows: `Profile not found for user: <uuid>`

### Root Cause

The user exists in `auth.users` table but has no corresponding record in `public.profiles` table.

### Why This Happens

1. **User signed up before trigger was created**: If users signed up before the database trigger was set up, their profiles weren't created automatically
2. **Trigger not installed**: The automatic profile creation trigger hasn't been run
3. **Manual deletion**: Someone manually deleted the profile record

### Solution Steps

#### Step 1: Run the Database Trigger Migration

This ensures future signups will automatically create profiles.

1. Open Supabase Dashboard → **SQL Editor**
2. Run the migration: `supabase/migrations/create_profile_trigger.sql`
3. Or copy and paste this:

```sql
-- Create function to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'student'
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

#### Step 2: Fix Existing Users

Create profiles for users who signed up before the trigger existed.

**Option A: Fix specific user by email**

```sql
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  'student' as role
FROM auth.users
WHERE email = 'user@example.com'  -- Replace with actual email
ON CONFLICT (id) DO NOTHING;
```

**Option B: Fix all missing profiles at once**

```sql
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

#### Step 3: Verify the Fix

```sql
-- Check that all users now have profiles
SELECT
  u.email,
  CASE
    WHEN p.id IS NULL THEN 'MISSING PROFILE ❌'
    ELSE p.role || ' ✓'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

You should see no "MISSING PROFILE" rows.

#### Step 4: Test Login

1. Log out and log back in
2. Navigate to `/dashboard`
3. You should see the student dashboard

### Changing User Roles

After creating the profile, you can update the role:

```sql
-- Make a user a teacher
UPDATE public.profiles
SET role = 'teacher'
WHERE email = 'teacher@school.com';

-- Make a user an admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@school.com';
```

## Error: 403 Forbidden on Dashboard Sub-Routes

### Symptoms

- Main `/dashboard` works fine
- Accessing `/dashboard/classes` shows 403 error
- Error message: "Access denied: This page requires teacher role"

### Root Cause

User's role doesn't have permission for that route.

### Solution

**Check the route's requirements:**

Look at the route's `+page.server.ts`:

```typescript
requireRole(profile, 'teacher'); // This route requires teacher role
```

**Fix:**

1. Verify this is the correct restriction
2. If user should have access, update their role in database
3. If restriction is wrong, update the `requireRole()` call

## Error: Redirect Loop to Login

### Symptoms

- User logs in successfully
- Immediately redirected back to login
- Infinite redirect loop

### Root Cause

Session cookies not being set properly.

### Solution

1. **Check cookie settings** in `src/lib/server/supabase.ts`
2. **Verify domain** matches your app's domain
3. **Check browser** allows cookies (not in private mode)
4. **Clear cookies** and try again

## Error: Wrong Dashboard Showing

### Symptoms

- User is a teacher but sees student dashboard
- Role displayed in header doesn't match database

### Root Cause

Cached data or stale session.

### Solution

1. **Check database role:**

   ```sql
   SELECT email, role FROM public.profiles
   WHERE email = 'user@example.com';
   ```

2. **Clear browser cache** and cookies

3. **Log out and log back in** to refresh session

4. **Check +page.svelte** role routing logic:
   ```svelte
   {#if data.profile.role === 'student'}
     <StudentDashboard {data} />
   {:else if data.profile.role === 'teacher'}
     <TeacherDashboard {data} />
   ```

## Database Schema Issues

### Missing `profiles` Table

If you see "relation 'profiles' does not exist":

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
```

### Missing Role Column

If you see "column 'role' does not exist":

```sql
ALTER TABLE public.profiles
ADD COLUMN role TEXT NOT NULL DEFAULT 'student'
CHECK (role IN ('student', 'teacher', 'admin'));
```

## Common Development Issues

### TypeScript Errors

**Error**: `Property 'profile' does not exist on type 'PageData'`

**Fix**: Run SvelteKit type generation:

```bash
pnpm run check
```

### Hot Module Reload Issues

**Issue**: Changes not reflecting in browser

**Fix**:

1. Stop dev server
2. Delete `.svelte-kit` folder
3. Restart: `pnpm dev`

## Quick Diagnostic Script

Run this in Supabase SQL Editor to check overall health:

```sql
-- Dashboard Health Check
SELECT
  'Total Users' as metric,
  COUNT(*)::text as value
FROM auth.users
UNION ALL
SELECT
  'Users with Profiles',
  COUNT(*)::text
FROM public.profiles
UNION ALL
SELECT
  'Missing Profiles',
  COUNT(*)::text
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
UNION ALL
SELECT
  'Students',
  COUNT(*)::text
FROM public.profiles
WHERE role = 'student'
UNION ALL
SELECT
  'Teachers',
  COUNT(*)::text
FROM public.profiles
WHERE role = 'teacher'
UNION ALL
SELECT
  'Admins',
  COUNT(*)::text
FROM public.profiles
WHERE role = 'admin';
```

Expected output:

- Total Users = Users with Profiles (no missing profiles)
- Missing Profiles = 0

## Getting Help

If you're still stuck:

1. **Check server logs** for detailed error messages
2. **Verify database schema** matches the types in `src/lib/types/database.ts`
3. **Test authentication** with a fresh incognito window
4. **Review [DASHBOARD.md](./DASHBOARD.md)** for architecture details
5. **Check [AUTHENTICATION.md](./AUTHENTICATION.md)** for auth flow

## Prevention

To avoid these issues in the future:

✅ Always run the profile creation trigger before allowing signups
✅ Test signup flow in development before deploying
✅ Monitor for missing profiles in production
✅ Set up alerts for 500 errors on `/dashboard`
✅ Consider adding a profile setup page as fallback
