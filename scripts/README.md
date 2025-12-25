# Scripts Guide

This guide explains the available scripts for managing your UbuMaths application.

## Table of Contents

1. [User Role Management](#user-role-management)
2. [Question Template Migration](#question-template-migration)

---

## User Role Management

This section explains how to promote users to different roles in your UbuMaths application.

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

---

## Question Template Migration

### Migrate Questions Syntax to Markdown Syntax

This script converts all existing question templates from the old Questions syntax to the new Markdown syntax.

**What gets converted:**

| Old Syntax (Questions) | New Syntax (Markdown) |
| ---------------------- | --------------------- |
| `{@:var}`              | `{{var}}`             |
| `{#:1-10}`             | `{{random:1-10}}`     |
| `{#:1.5}`              | `{{random:1.5}}`      |
| `{eval:a+b}`           | `{{eval:a+b}}`        |

### Usage

#### Step 1: Create a Backup (Recommended)

Before running the migration, create a backup of your question templates:

```bash
./scripts/backup-questions.sh
```

This creates a timestamped SQL backup in the `backups/` directory.

**To restore from backup:**

```bash
psql $DATABASE_URL < backups/question_templates_YYYYMMDD-HHMMSS.sql
```

#### Step 2: Test Migration (Dry Run)

Run the migration in dry-run mode to see what would be changed without modifying the database:

```bash
npx tsx scripts/migrate-syntax-to-markdown.ts --dry-run
```

**Expected output:**

```
🚀 Starting syntax migration...
Mode: 🧪 DRY RUN (no changes will be saved)

📥 Fetching question templates from database...

📊 Found 15 question template(s)

======================================================================

📝 Processing: 123e4567-e89b-12d3-a456-426614174000
   Title: "Addition simple"
   Changes detected:
  Variation 1:
    - Variable "a": {#:1-10} → {{random:1-10}}
    - Variable "b": {#:1-10} → {{random:1-10}}
    - Statement field: Calculer {@:a} + {@:b} → Calculer {{a}} + {{b}}
   🧪 Would be migrated (dry run mode)

======================================================================
📊 Migration Summary
======================================================================
Total templates:      15
✅ Migrated:          12
⏭️  Skipped:           3
❌ Errors:            0
======================================================================

🧪 DRY RUN COMPLETE - No changes were made to the database
💡 To apply these changes, run without --dry-run flag
```

#### Step 3: Run Migration

If the dry-run looks good, run the actual migration:

```bash
npx tsx scripts/migrate-syntax-to-markdown.ts
```

**Expected output:**

```
🚀 Starting syntax migration...
Mode: ✍️  LIVE RUN (database will be updated)

📥 Fetching question templates from database...

📊 Found 15 question template(s)

======================================================================

📝 Processing: 123e4567-e89b-12d3-a456-426614174000
   Title: "Addition simple"
   Changes detected:
  Variation 1:
    - Variable "a": {#:1-10} → {{random:1-10}}
    - Variable "b": {#:1-10} → {{random:1-10}}
    - Statement field: Calculer {@:a} + {@:b} → Calculer {{a}} + {{b}}
   ✅ Migrated successfully

======================================================================
📊 Migration Summary
======================================================================
Total templates:      15
✅ Migrated:          12
⏭️  Skipped:           3
❌ Errors:            0
======================================================================

🎉 Migration completed successfully!
✅ All question templates now use Markdown syntax
```

### What Gets Migrated

The script converts:

1. **Variable expressions** - All `variables[].expression` fields
2. **Statement content** - Text content in `statement` ContentFields
3. **Correction content** - Text content in `correction` ContentFields (if present)

### Templates That Get Skipped

Templates are automatically skipped if they:

- Already use Markdown syntax (e.g., `{{var}}`)
- Have no variables defined
- Have no parameterized content

### Error Handling

If errors occur during migration:

- Each template is processed independently
- Errors are logged but don't stop the migration
- Error count is shown in the summary
- Exit code 1 is returned if any errors occurred

### Troubleshooting

**"Missing required environment variables" error:**

Make sure your `.env` file contains:

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**"Error fetching templates" error:**

- Verify your Supabase connection
- Check that the service role key is correct
- Ensure the `question_templates` table exists

**Migration errors for specific templates:**

- Check the error message for details
- Verify the template's JSON structure is valid
- Check for malformed variable expressions
- You can manually fix problematic templates and re-run

### Testing After Migration

After migration, verify that:

1. **Templates still render correctly** - Check a few questions in the UI
2. **Variables resolve properly** - Generate a few variations
3. **Math expressions work** - Test templates with eval expressions
4. **No syntax errors** - Check browser console for errors

### Rollback

If something goes wrong, restore from the backup:

```bash
# List available backups
ls -lh backups/

# Restore from backup
psql $DATABASE_URL < backups/question_templates_20251026-210000.sql
```
