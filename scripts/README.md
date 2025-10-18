# User Role Management Guide

This guide explains how to promote users to different roles in your UbuMaths application.

## Available Roles

1. **Student** (default) - Can view content, track progress, join classes
2. **Teacher** - Can create content, manage classes, view student progress
3. **Admin** - Has all teacher permissions + full system access

## Quick Start

### Method 1: Using the Scripts (Recommended)

1. **Get your Supabase Service Role Key**:
   - Go to your Supabase dashboard
   - Navigate to Project Settings → API
   - Copy the `service_role` key (NOT the `anon` key)

2. **Add to `.env` file**:

   ```bash
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Add this line
   ```

3. **First, sign up a user** (if you haven't already):
   - Go to your app's signup page: http://localhost:5173/signup
   - Create an account with the email you want to promote

4. **Run the appropriate script**:

   **To create a teacher:**

   ```bash
   npx tsx scripts/create-teacher.ts user@example.com
   ```

   **To create an admin:**

   ```bash
   npx tsx scripts/create-admin.ts user@example.com
   ```

   You should see:

   ```
   🔍 Looking for user: user@example.com
   ✅ Found user: User Name
      Current role: student
   ✅ User promoted to teacher successfully!
   ```

### Method 2: Direct SQL (Alternative)

If you prefer, you can promote users directly in the Supabase SQL Editor:

```sql
-- Promote to teacher
UPDATE profiles SET role = 'teacher' WHERE email = 'user@example.com';

-- Promote to admin
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';
```

## Verification

After promoting a user to admin, you can verify by:

1. **Check in Supabase dashboard**:
   - Go to Table Editor → profiles
   - Find the user and check their `role` column

2. **Check in the app**:
   - Log in with the admin user
   - The user should now have admin permissions according to your RLS policies

## Troubleshooting

**"User not found" error**:

- Make sure the user has signed up first
- Check that the email matches exactly (case-sensitive)

**"Missing environment variables" error**:

- Make sure your `.env` file contains both `PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**Permission errors**:

- Ensure you're using the `service_role` key, not the `anon` key
- The service role key bypasses Row Level Security (RLS)

## Security Notes

⚠️ **IMPORTANT**:

- Never commit your `.env` file or service role key to git
- The service role key has full database access - keep it secret
- Only use the script in development or secure environments
- Consider creating a proper admin panel in production
