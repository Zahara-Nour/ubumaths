# Friends System Setup Guide

This guide will help you deploy and test the new friends system with real-time presence tracking.

## 🎉 What's Been Implemented

A complete **mutual friendship system** with:

- ✅ Friend requests (pending/accepted/rejected states)
- ✅ Two friendship types: "classmate" (student-student) and "mentor" (teacher-student)
- ✅ Real-time online/offline presence via WebSocket (60-second heartbeat)
- ✅ Privacy: presence visible only to friends
- ✅ Teacher moderation dashboard
- ✅ Search and add friends functionality
- ✅ Foundation for future chat and gifting features

## 📦 Files Created/Modified

### Database Migrations

- `supabase/migrations/034_create_friendships_table.sql` - Friendships table
- `supabase/migrations/035_create_user_presence_table.sql` - User presence table

### TypeScript Types

- `src/lib/types/database.ts` - Updated with `Friendship`, `UserPresence`, `FriendshipWithProfile`

### WebSocket System

- `src/lib/server/websocket-server.ts` - Standalone WebSocket server (port 3001)
- `src/lib/stores/websocket.svelte.ts` - Client-side WebSocket manager
- `package.json` - Added `ws:dev` script and `ws` dependency

### State Management

- `src/lib/stores/friends.svelte.ts` - Friends manager with all operations

### UI Components

- `src/lib/components/OnlineStatus.svelte` - Status indicator badge
- `src/lib/components/FriendsList.svelte` - Accepted friends list
- `src/lib/components/FriendRequests.svelte` - Pending requests
- `src/lib/components/AddFriend.svelte` - Search and add friends

### Routes

- `src/routes/(protected)/dashboard/friends/+page.svelte` - Main friends page
- `src/routes/(protected)/dashboard/friends/+page.server.ts` - Server logic
- `src/routes/(protected)/dashboard/admin/friendships/+page.svelte` - Teacher moderation
- `src/routes/(protected)/dashboard/admin/friendships/+page.server.ts` - Moderation logic

### Documentation

- `DATABASE_SCHEMA.md` - Updated with friendships and presence tables
- `WEBSOCKET_ARCHITECTURE.md` - Complete WebSocket system documentation
- `FRIENDS_SYSTEM_SETUP.md` - This setup guide

## 🚀 Step-by-Step Setup

### Step 1: Push Database Migrations

Run the database migrations to create the new tables:

```bash
pnpm db:migrate
```

This creates:

- `friendships` table with RLS policies
- `user_presence` table with RLS policies
- Helper functions: `get_friend_ids()`, `upsert_user_presence()`, `cleanup_stale_presence()`

**Verify migration succeeded:**

```bash
pnpm db:status
```

### Step 2: Check Environment Variables

Ensure your `.env` file has:

```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # For WebSocket server
```

### Step 3: Start Development Servers

You need **TWO terminal windows**:

**Terminal 1 - SvelteKit Dev Server:**

```bash
pnpm dev
```

Runs on http://localhost:5173

**Terminal 2 - WebSocket Server:**

```bash
pnpm ws:dev
```

Runs on ws://localhost:3001

### Step 4: Test the System

#### 4.1 Create Two Test Users

Open two browser windows (use incognito for second user):

**Window 1:**

- Log in as User A (e.g., teacher or student)
- Navigate to `/dashboard/friends`

**Window 2:**

- Log in as User B (different user)
- Navigate to `/dashboard/friends`

#### 4.2 Send Friend Request

**In Window 1 (User A):**

1. Click "Ajouter" tab
2. Search for User B by name
3. Select friendship type (Camarade or Mentor)
4. Click "Ajouter" button
5. Request appears in "Demandes envoyées"

**In Window 2 (User B):**

1. Incoming request appears in "Demandes" tab
2. See User A's profile and friendship type
3. Click "Accepter" button

#### 4.3 Verify Online Presence

**Both windows should now show:**

- Green pulsing dot next to friend's name (online status)
- Friend appears in "Mes amis" tab

**Close Window 1 → Window 2 should:**

- Show User A as offline after ~2 minutes
- Gray dot instead of green

**Reopen Window 1 → Window 2 should:**

- Show User A as online instantly (green dot returns)

#### 4.4 Test Teacher Moderation (Optional)

**Log in as teacher or admin:**

1. Navigate to `/dashboard/admin/friendships`
2. See all student friendships
3. Filter by class or search by name
4. Delete inappropriate friendships

## 🐛 Troubleshooting

### WebSocket Connection Failed

**Symptom:** Connection status shows "Déconnecté du serveur de présence"

**Solution:**

```bash
# Check if WebSocket server is running
lsof -i :3001

# If not running, start it:
pnpm ws:dev
```

### Friends Show as Offline When Online

**Possible causes:**

1. **WebSocket not connected** → Check connection status banner
2. **Not actually friends** → Verify friendship status is "accepted"
3. **Stale database data** → Restart WebSocket server

**Manual cleanup:**

```bash
# Connect to Supabase and run:
SELECT cleanup_stale_presence();
```

### Friend Request Not Appearing

**Possible causes:**

1. **RLS policies** → Check both users can query `friendships` table
2. **Duplicate request** → Can't send request if one already exists
3. **Self-friending** → Can't send request to yourself

**Debug in browser console:**

```javascript
// Check friendships
const { data, error } = await supabase.from('friendships').select('*');
console.log(data, error);
```

## 📱 User Guide (for your students/teachers)

### How to Add Friends

1. Go to **"Amis"** in sidebar
2. Click **"Ajouter"** tab
3. Search for friend by name
4. Select relationship type:
   - **Camarade**: For students befriending other students
   - **Mentor**: For students befriending teachers
5. Click **"Ajouter"** button
6. Wait for friend to accept request

### How to Accept Friend Requests

1. Go to **"Amis"** → **"Demandes"** tab
2. See incoming requests with user info
3. Click **"Accepter"** or **"Refuser"**

### How to Unfriend Someone

1. Go to **"Amis"** → **"Mes amis"** tab
2. Find friend in list
3. Click three-dot menu (⋮)
4. Select **"Retirer des amis"**
5. Confirm action

### Online Status Indicators

- 🟢 **Green pulsing dot** = Friend is online right now
- ⚪ **Gray dot** = Friend is offline

## 🔮 Future Features (Not Yet Implemented)

The system is architected to support these features in the future:

### Chat System

- Real-time messaging between friends
- Typing indicators
- Message read receipts
- Database table: `messages`

### Gifting System

- Send gidouilles to friends
- Exchange VIP cards
- Gift notifications
- Database table: `gift_transactions`

### Group Features

- Create friend groups
- Group chats
- Shared rewards/achievements

## 🚀 Deployment to Production

### Challenge: Vercel + WebSocket

Vercel's serverless functions **do not support persistent WebSocket connections**. You need to deploy the WebSocket server separately from your main SvelteKit app.

### 📘 Complete Deployment Guide Available

**For detailed step-by-step instructions, see:**
**[WEBSOCKET_DEPLOYMENT_GUIDE.md](WEBSOCKET_DEPLOYMENT_GUIDE.md)**

The deployment guide provides complete tutorials for:

### Option 1: Railway (Recommended - Easiest)

- ✅ Simplest deployment (git push, auto-deploy)
- ✅ Free tier: $5 credit/month
- ✅ Automatic HTTPS/WSS certificates
- ✅ Complete code examples and step-by-step tutorial

### Option 2: Render (Good Free Tier)

- ✅ Generous free tier (750 hours/month)
- ✅ Automatic SSL
- ⚠️ Free tier spins down after 15 min inactivity

### Option 3: DigitalOcean App Platform

- ✅ Most reliable ($5/month)
- ✅ Always on, no cold starts
- ✅ Fixed predictable pricing

### Option 4: Supabase Realtime (No WebSocket Server Needed)

- ✅ Built-in to Supabase
- ✅ Works perfectly with Vercel
- ⚠️ Requires rewriting client code

**Quick Start: Railway Deployment**

1. Extract WebSocket server as standalone app
2. Push to GitHub
3. Deploy on Railway (auto-detects Node.js)
4. Add environment variables in Railway dashboard
5. Update `PUBLIC_WS_URL` in your SvelteKit app
6. Deploy SvelteKit app to Vercel

\*\*See [WEBSOCKET_DEPLOYMENT_GUIDE.md](WEBSOCKET_DEPLOYMENT_GUIDE.md) for complete instructions with code samples!

**Example:**

```typescript
const channel = supabase
	.channel('presence')
	.on('presence', { event: 'sync' }, () => {
		const state = channel.presenceState();
		// Update UI with presence state
	})
	.subscribe();
```

### Option 3: Polling Fallback (Degraded UX)

Disable WebSocket, poll presence every 30-60 seconds:

**Pros:**

- ✅ Works on any platform
- ✅ No WebSocket infrastructure

**Cons:**

- ❌ Higher latency (30-60s instead of instant)
- ❌ More database load
- ❌ Worse user experience

## 📊 Performance Considerations

### Current Capacity

**Single WebSocket server can handle:**

- ~100-1000 concurrent connections
- ~1000-10000 users (most offline)
- ~100-1000 friend requests per minute

### Database Load

**Per user:**

- 1 write per 60 seconds (heartbeat)
- 1 write per connection/disconnection
- ~0.017 writes/second per user

**For 100 users:**

- ~1.7 writes/second
- ~100 writes/minute
- ~6000 writes/hour

**For 1000 users:**

- ~17 writes/second
- ~1000 writes/minute
- ~60000 writes/hour

### Scaling Strategy

**If you hit performance limits:**

1. **Increase heartbeat interval** (60s → 120s)
2. **Add Redis caching** for presence state
3. **Horizontal scaling** with multiple WebSocket servers
4. **Load balancer** with sticky sessions

## 📚 Additional Resources

- **WebSocket Architecture**: See `WEBSOCKET_ARCHITECTURE.md`
- **Database Schema**: See `DATABASE_SCHEMA.md`
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

## ✅ Checklist

Before considering the system complete:

- [ ] Database migrations applied successfully
- [ ] Both dev servers running (SvelteKit + WebSocket)
- [ ] Can send and accept friend requests
- [ ] Online presence shows green dot
- [ ] Offline presence shows gray dot after 2 minutes
- [ ] Teacher moderation page accessible
- [ ] Can search and add friends
- [ ] Can unfriend users
- [ ] Connection status banner shows correct state

## 🎓 Next Steps

1. **Test thoroughly** with multiple users
2. **Add to navigation** - Add "Amis" link to dashboard sidebar
3. **User onboarding** - Show tooltip/tutorial for new users
4. **Analytics** - Track friendship creation, acceptance rate
5. **Deploy** - Choose deployment strategy for WebSocket server

## 💬 Questions?

If you encounter issues:

1. Check browser console for errors
2. Check WebSocket server logs
3. Verify database migrations applied
4. Ensure RLS policies are correct
5. Test with fresh user accounts (no cached state)

Good luck with your friend system! 🎉
