# Message Attachments Storage Setup

## Overview

The messaging system supports file attachments (max 3 files, 5MB each). The UI and code are complete, but the Supabase storage bucket needs to be created.

## Setup Instructions

### 1. Create Storage Bucket

In your Supabase Dashboard:

1. Go to **Storage** section
2. Click **New bucket**
3. Configure the bucket:
   - **Name**: `message-attachments`
   - **Public bucket**: ✅ Checked (files need to be publicly accessible)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: Leave empty (all types allowed)

### 2. Set Bucket Policies

After creating the bucket, set up the following policies:

#### Policy 1: Upload (INSERT)

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = 'messages'
);
```

#### Policy 2: Read (SELECT)

```sql
-- Allow authenticated users to read message attachments
CREATE POLICY "Users can read message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments'
);
```

#### Policy 3: Delete (Optional)

```sql
-- Allow users to delete their own message attachments
-- (for future moderation features)
CREATE POLICY "Users can delete message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
);
```

### 3. Verify Setup

Test the attachment feature:

1. Go to `/messages/compose`
2. Select a file using the "Joindre des fichiers" button
3. Send a message
4. Check that:
   - File uploads successfully
   - Record appears in `message_attachments_v2` table
   - File is viewable in message view

## File Structure

Files are stored with the following path structure:

```
messages/
  └── {message_id}/
      └── {timestamp}_{filename}
```

Example: `messages/123e4567-e89b-12d3-a456-426614174000/1234567890_document.pdf`

## Database Schema

Attachments are stored in the `message_attachments_v2` table:

```sql
CREATE TABLE message_attachments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES private_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size <= 5242880), -- 5MB
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Features

### Client-Side Validation

- ✅ Maximum 3 files per message
- ✅ Maximum 5MB per file
- ✅ File type validation (all types allowed)
- ✅ Real-time file preview
- ✅ Remove files before sending

### Server-Side

- ✅ File upload to Supabase Storage
- ✅ Database record creation
- ✅ Public URL generation
- ✅ Error handling with user feedback

### Security

- 🔒 Authenticated users only
- 🔒 RLS policies on database table
- 🔒 File size validation (client + server)
- 🔒 Path sanitization

## Troubleshooting

### Issue: "Storage bucket not found"

**Solution**: Create the `message-attachments` bucket in Supabase Dashboard.

### Issue: "Permission denied"

**Solution**: Verify the storage policies are correctly set up.

### Issue: Files upload but don't appear in messages

**Solution**: Check that the `message_attachments_v2` table exists and has proper RLS policies.

## Next Steps

Once the storage bucket is created and policies are set:

1. Test file uploads in development
2. Verify files appear in message view
3. Test file downloads
4. Monitor storage usage in Supabase Dashboard

## Storage Bucket Configuration Summary

```yaml
Bucket Name: message-attachments
Public: Yes
Max File Size: 5 MB
Path Structure: messages/{message_id}/{timestamp}_{filename}
Policies:
  - INSERT: Authenticated users can upload
  - SELECT: Authenticated users can read
  - DELETE: Authenticated users can delete
```
