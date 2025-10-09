#!/bin/bash

# Fix Missing Profiles Script
# ============================
# This script uses Supabase CLI to fix users without profiles

set -e  # Exit on error

echo "🔧 Fixing missing user profiles..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "📦 Install it with:"
    echo "   npm install -g supabase"
    echo "   or"
    echo "   brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

# Check if we're linked to a Supabase project
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "⚠️  Not linked to a Supabase project"
    echo ""
    echo "🔗 Link your project with:"
    echo "   supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "You can find your project ref in your Supabase dashboard URL:"
    echo "https://app.supabase.com/project/YOUR_PROJECT_REF"
    echo ""
    exit 1
fi

echo "✓ Supabase CLI found"
echo "✓ Project linked"
echo ""

# Option 1: Run pending migrations
echo "📋 Option 1: Run all pending migrations (recommended)"
echo "   This will:"
echo "   - Create the automatic profile trigger (004_create_profile_trigger.sql)"
echo "   - Fix all existing users (005_fix_existing_users.sql)"
echo ""
echo "   Command: supabase db push"
echo ""

# Option 2: Run specific migration
echo "📋 Option 2: Run only the fix for existing users"
echo "   Command: supabase db execute --file supabase/migrations/005_fix_existing_users.sql"
echo ""

# Option 3: Direct SQL query
echo "📋 Option 3: Run direct SQL query"
echo "   Command: supabase db execute --sql \\"
echo "            \"INSERT INTO public.profiles (id, email, full_name, role)"
echo "             SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', ''), 'student'"
echo "             FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id"
echo "             WHERE p.id IS NULL ON CONFLICT (id) DO NOTHING;\""
echo ""

# Prompt user
read -p "Choose an option (1/2/3) or 'c' to cancel: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running all pending migrations..."
        supabase db push
        echo ""
        echo "✅ Migrations completed!"
        ;;
    2)
        echo ""
        echo "🚀 Running user fix migration..."
        supabase db execute --file supabase/migrations/005_fix_existing_users.sql
        echo ""
        echo "✅ User fix completed!"
        ;;
    3)
        echo ""
        echo "🚀 Running direct SQL fix..."
        supabase db execute --sql "INSERT INTO public.profiles (id, email, full_name, role) SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', ''), 'student' FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE p.id IS NULL ON CONFLICT (id) DO NOTHING;"
        echo ""
        echo "✅ Fix completed!"
        ;;
    c|C)
        echo ""
        echo "❌ Cancelled"
        exit 0
        ;;
    *)
        echo ""
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🔍 Verifying the fix..."
echo ""

# Verify the fix
supabase db execute --sql "
SELECT
  COUNT(CASE WHEN p.id IS NULL THEN 1 END) as missing_profiles,
  COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as users_with_profiles,
  COUNT(*) as total_users
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
"

echo ""
echo "✨ Done! If missing_profiles = 0, all users now have profiles."
echo ""
echo "🧪 Test by:"
echo "   1. Logging out and logging back in"
echo "   2. Navigating to /dashboard"
echo "   3. You should see your role-based dashboard"
