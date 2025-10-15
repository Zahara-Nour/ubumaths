# Chat System Implementation Guide

## 🎉 What's Been Implemented

A complete group chat system with real-time messaging, rich text support (including mathematical formulas), file attachments, emoji reactions, and moderation features.

### ✅ Completed Components

#### 1. **Database Schema** (7 migrations: 036-042)
- ✅ `conversations` - Group chats (class rooms) and 1-on-1 chats
- ✅ `conversation_participants` - Many-to-many relationship
- ✅ `messages` - Rich text messages (TipTap JSON format)
- ✅ `message_attachments` - File uploads (teachers only, 1MB limit)
- ✅ `message_reactions` - Emoji reactions
- ✅ `message_reports` - User reporting system

**Key Features:**
- Auto-creates class chat rooms when classes are created
- Auto-adds students to class chats when they join a class
- Profanity detection (basic SQL-based, enhanced server-side planned)
- Soft delete for messages
- Read receipts and unread counts
- Complete RLS policies for security

#### 2. **WebSocket Server** (`src/lib/server/websocket-server.ts`)
- ✅ Real-time message delivery
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Emoji reaction broadcasting
- ✅ Message handlers for all chat events

#### 3. **Chat Store** (`src/lib/stores/chat.svelte.ts`)
- ✅ Svelte 5 runes-based state management
- ✅ Conversations management
- ✅ Messages management with pagination
- ✅ Typing indicators
- ✅ WebSocket integration
- ✅ Optimistic UI updates
- ✅ All CRUD operations

#### 4. **UI Components** (`src/lib/components/chat/`)
- ✅ **ChatConversationList.svelte** - Sidebar with conversations
  - Search/filter conversations
  - Unread badges
  - Online status indicators
  - Group chat icons

- ✅ **ChatMessageList.svelte** - Message display
  - Rich text rendering
  - Date headers ("Today", "Yesterday", etc.)
  - Emoji reactions
  - File attachments display
  - Typing indicators
  - Infinite scroll support
  - Message actions menu (Report, etc.)

- ✅ **ChatComposer.svelte** - Message input
  - RichTextEditor integration
  - File attachment support (teachers only)
  - Typing indicator emission (debounced)
  - File preview before upload

- ✅ **ChatWindow.svelte** - Main container
  - Responsive layout (desktop split-view, mobile fullscreen)
  - Auto-loads conversations
  - Real-time updates
  - Navigation (back button on mobile)

---

## 🚧 Remaining Tasks

### 1. File Upload Implementation
**Status:** Component ready, needs Supabase Storage integration

**What to do:**
1. Create Supabase Storage bucket named `chat-attachments`
2. Configure bucket RLS policies:
   ```sql
   -- Allow authenticated teachers to upload
   CREATE POLICY "Teachers can upload files"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'chat-attachments'
     AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
   );

   -- Allow participants to view attachments
   CREATE POLICY "Participants can view attachments"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'chat-attachments'
     AND EXISTS (
       SELECT 1
       FROM messages m
       JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
       WHERE m.id = (storage.foldername(name))[2]::uuid
       AND cp.user_id = auth.uid()
     )
   );
   ```

3. Implement upload function in `ChatComposer.svelte`:
   ```typescript
   async function uploadFile(file: File, messageId: string): Promise<string> {
     const path = `${conversationId}/${messageId}/${file.name}`;

     const { data, error } = await supabase.storage
       .from('chat-attachments')
       .upload(path, file);

     if (error) throw error;

     const { data: { publicUrl } } = supabase.storage
       .from('chat-attachments')
       .getPublicUrl(path);

     return publicUrl;
   }
   ```

### 2. Profanity Filter (Server-Side)
**Status:** Basic SQL check implemented, needs enhancement

**What to do:**
1. Install `bad-words` library:
   ```bash
   pnpm add bad-words
   ```

2. Create profanity filter utility (`src/lib/server/profanity-filter.ts`):
   ```typescript
   import Filter from 'bad-words';

   const filter = new Filter();

   // Add French bad words
   filter.addWords(...['list', 'of', 'french', 'bad', 'words']);

   export function checkProfanity(text: string): {
     isProfane: boolean;
     cleanedText: string;
   } {
     const isProfane = filter.isProfane(text);
     const cleanedText = filter.clean(text);

     return { isProfane, cleanedText };
   }
   ```

3. Use in API route when creating messages

### 3. Create Chat Routes
**Status:** Components ready, needs routing

**What to do:**

Create route: `src/routes/(protected)/dashboard/chat/+page.svelte`
```svelte
<script lang="ts">
  import ChatWindow from '$lib/components/chat/ChatWindow.svelte';
  import { page } from '$app/stores';

  let { data } = $props();
</script>

<div class="h-screen">
  <ChatWindow
    userId={data.session.user.id}
    isTeacher={data.profile.role === 'teacher' || data.profile.role === 'admin'}
    supabase={data.supabase}
  />
</div>
```

Create server load: `src/routes/(protected)/dashboard/chat/+page.server.ts`
```typescript
export async function load({ locals }) {
  // Verify user is authenticated
  if (!locals.session) {
    redirect(303, '/auth/login');
  }

  return {
    session: locals.session,
    profile: locals.profile
  };
}
```

### 4. Report Message Dialog
**Status:** Function ready, needs UI

**What to do:**

Create `src/lib/components/chat/ReportMessageDialog.svelte`:
```svelte
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';

  // Props & logic for report form
  // - Reason selection (radio buttons)
  // - Optional details textarea
  // - Submit to chatStore.reportMessage()
</script>
```

Integrate into ChatMessageList message actions menu.

### 5. Friend Selection for New Chat
**Status:** Function ready, needs UI

**What to do:**

Create `src/lib/components/chat/NewChatDialog.svelte`:
```svelte
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  // Load user's friends from friendships table
  // Display list with avatars
  // On select, call chatStore.create1on1Chat(friendId)
</script>
```

---

## 📋 Testing Checklist

### Database Setup
- [ ] Migrations applied: `pnpm db:migrate`
- [ ] Supabase Storage bucket created: `chat-attachments`
- [ ] Bucket policies configured

### Local Development
- [ ] SvelteKit dev server running: `pnpm dev`
- [ ] WebSocket server running: `pnpm ws:dev`
- [ ] Navigate to `/dashboard/chat`

### Feature Tests
- [ ] **Conversations List**
  - [ ] Shows all user's conversations
  - [ ] Search/filter works
  - [ ] Unread badges display correctly
  - [ ] Clicking conversation loads messages

- [ ] **Messaging**
  - [ ] Can send text messages
  - [ ] Can send rich text (bold, italic)
  - [ ] Can insert math formulas (inline and block)
  - [ ] Messages appear in real-time for both users

- [ ] **Typing Indicators**
  - [ ] Shows when other user is typing
  - [ ] Clears after 3 seconds

- [ ] **Emoji Reactions**
  - [ ] Can add reactions to messages
  - [ ] Can remove reactions
  - [ ] Reaction counts update in real-time

- [ ] **File Attachments (Teachers Only)**
  - [ ] Teachers can attach files
  - [ ] Students cannot attach files
  - [ ] Files under 1MB upload successfully
  - [ ] Files over 1MB are rejected
  - [ ] Attachments display as download links

- [ ] **Class Chat Rooms**
  - [ ] Auto-created when class is created
  - [ ] All class members added automatically
  - [ ] New students auto-added when they join class

- [ ] **1-on-1 Chats**
  - [ ] Students can create chats with friends
  - [ ] Cannot create duplicate chats
  - [ ] Non-friends cannot create chats

- [ ] **Profanity Detection**
  - [ ] Messages with bad words are flagged
  - [ ] Flagged messages show warning

- [ ] **Message Reporting**
  - [ ] Students can report inappropriate messages
  - [ ] Teachers see reported messages in moderation dashboard

- [ ] **Responsive Design**
  - [ ] Desktop: Split view works correctly
  - [ ] Mobile: Fullscreen conversation list
  - [ ] Mobile: Back button returns to conversation list

---

## 🔧 Configuration

### Environment Variables
Already configured in your `.env` file:
- `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Supabase Storage Bucket
Run this SQL in Supabase SQL Editor:
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);
```

Then apply RLS policies (see "File Upload Implementation" above).

---

## 🚀 Deployment Notes

### WebSocket Server Deployment
The WebSocket server needs to be deployed separately from the main SvelteKit app.

**Recommended:** Deploy to Railway (see `WEBSOCKET_DEPLOYMENT_GUIDE.md`)

**Environment Variables for WebSocket Server:**
- `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT=3001`

### Main App Deployment
Deploys to Vercel as usual. No changes needed.

---

## 📚 Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Client)                   │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ ChatWindow   │  │ WebSocket    │                │
│  │ Component    │──│ Client       │──┐             │
│  └──────────────┘  └──────────────┘  │             │
│         │                              │             │
│         │                              │             │
│  ┌──────▼───────┐                     │             │
│  │ Chat Store   │                     │             │
│  │ (Svelte 5)   │                     │             │
│  └──────┬───────┘                     │             │
│         │                              │             │
└─────────┼──────────────────────────────┼─────────────┘
          │                              │
          │ HTTP/RPC                     │ WebSocket
          │                              │
┌─────────▼──────────────────────────────▼─────────────┐
│                    Supabase                           │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  PostgreSQL  │  │   Storage    │                │
│  │   (Chat DB)  │  │  (Files)     │                │
│  └──────────────┘  └──────────────┘                │
└───────────────────────────────────────────────────────┘
          ▲
          │
┌─────────┴─────────┐
│  WebSocket Server │
│   (Node.js / ws)  │
└───────────────────┘
```

### Data Flow

1. **Sending a Message:**
   - User types in ChatComposer
   - On send, ChatStore inserts into Supabase `messages` table
   - Message ID returned
   - ChatStore broadcasts via WebSocket
   - WebSocket server relays to conversation participants
   - Recipients receive real-time update

2. **Typing Indicator:**
   - User types in ChatComposer
   - Debounced event (every 500ms)
   - ChatStore sends `typing_indicator` via WebSocket
   - WebSocket server broadcasts to participants
   - Recipients see "X is typing..."
   - Auto-clears after 3 seconds

3. **Emoji Reaction:**
   - User clicks emoji
   - ChatStore calls `toggle_reaction` RPC
   - Database updated
   - ChatStore broadcasts via WebSocket
   - Recipients see reaction update in real-time

---

## 🎓 Key Learnings & Best Practices

### 1. **Svelte 5 Runes**
- Use `$state` for reactive variables
- Use `$derived` for computed values
- Use `$effect` for side effects (WebSocket subscriptions)
- Props with `$props()` destructuring

### 2. **Real-Time Architecture**
- WebSocket for instant delivery
- Optimistic UI for better UX
- Always validate on server-side
- Broadcast only to relevant users

### 3. **Security**
- RLS policies on all tables
- Server-side validation for permissions
- Teachers-only file uploads enforced in DB
- Profanity filtering on message creation

### 4. **Performance**
- Cursor-based pagination for messages
- Denormalized `last_message` on conversations
- Indexed queries for fast lookups
- Debounced typing indicators

---

## 📝 Next Features (Future Enhancements)

- [ ] Mentions (@username) in messages
- [ ] Message threading/replies
- [ ] Voice messages
- [ ] Video calls
- [ ] Message search
- [ ] Export chat history
- [ ] Dark mode for chat
- [ ] Customizable themes
- [ ] Notification sounds
- [ ] Desktop notifications
- [ ] Message translation
- [ ] GIF support
- [ ] Stickers/emojis picker

---

## 🐛 Known Issues & Limitations

1. **Profanity Filter:** Basic implementation. Consider using a more sophisticated service for production.

2. **File Storage:** Public URLs are used. For sensitive files, implement signed URLs.

3. **Typing Indicators:** Currently don't show user names from profiles. Need to fetch profile data.

4. **Read Receipts:** Visual indicators not fully implemented in UI.

5. **WebSocket Reconnection:** Basic implementation. Could be enhanced with better retry logic.

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review `WEBSOCKET_ARCHITECTURE.md`
3. Check browser console for errors
4. Verify all migrations are applied
5. Ensure both servers (SvelteKit + WebSocket) are running

---

**✨ Your chat system is ready! Follow the "Remaining Tasks" section to complete the implementation.**
