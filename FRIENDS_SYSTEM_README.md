# Friends System - Complete Implementation

A complete mutual friendship system with real-time presence tracking for UbuMaths.

## 📚 Documentation Index

### 1. [FRIENDS_SYSTEM_SETUP.md](FRIENDS_SYSTEM_SETUP.md) - **START HERE**

Your main setup guide covering:

- What was implemented
- Step-by-step local setup instructions
- Testing the system
- User guide for students/teachers
- Troubleshooting common issues

### 2. [WEBSOCKET_DEPLOYMENT_GUIDE.md](WEBSOCKET_DEPLOYMENT_GUIDE.md) - **Production Deployment**

Detailed deployment instructions for production:

- **Why Vercel can't host WebSocket servers**
- Railway deployment (recommended, easiest)
- Render deployment (good free tier)
- DigitalOcean deployment (most reliable)
- Supabase Realtime alternative
- Complete code examples for each option

### 3. [WEBSOCKET_ARCHITECTURE.md](WEBSOCKET_ARCHITECTURE.md) - **Technical Deep Dive**

Complete technical documentation:

- Architecture overview with diagrams
- WebSocket message protocol
- Client/server implementation details
- Database functions and RLS policies
- Performance considerations
- Security best practices
- Future enhancements (chat, gifting)

### 4. [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - **Database Reference**

Database schema documentation (updated sections):

- `friendships` table schema
- `user_presence` table schema
- RLS policies
- Helper functions

## 🚀 Quick Start

### Development Setup (5 minutes)

```bash
# 1. Apply database migrations
pnpm db:migrate

# 2. Start SvelteKit dev server (Terminal 1)
pnpm dev

# 3. Start WebSocket server (Terminal 2)
pnpm ws:dev

# 4. Visit http://localhost:5173/dashboard/friends
```

### Production Deployment

**Main App (Vercel):**

- Your SvelteKit app deploys to Vercel normally
- No changes needed

**WebSocket Server (Railway - Recommended):**

- Extract WebSocket server as standalone app
- Deploy to Railway (free tier)
- Takes 10 minutes

**See [WEBSOCKET_DEPLOYMENT_GUIDE.md](WEBSOCKET_DEPLOYMENT_GUIDE.md) for step-by-step instructions.**

## 🎯 Features Implemented

### Core Friendship Features

- ✅ Send friend requests with types (classmate/mentor)
- ✅ Accept/reject/cancel requests
- ✅ Unfriend users
- ✅ Search users by name
- ✅ View friends list with filters

### Real-Time Presence

- ✅ WebSocket-based online/offline tracking
- ✅ 60-second heartbeat system
- ✅ Green dot for online, gray for offline
- ✅ Friends-only visibility (privacy)
- ✅ Automatic reconnection with exponential backoff

### Teacher Moderation

- ✅ View all student friendships
- ✅ Filter by class
- ✅ Search by student name
- ✅ Delete inappropriate friendships
- ✅ Statistics dashboard

### UI Components

- ✅ 3-tab interface (Friends, Requests, Add Friend)
- ✅ Real-time status indicators
- ✅ Avatar with fallback
- ✅ Empty states with helpful messages
- ✅ Connection status warnings

## 📦 Files Created

### Database (2 files)

- `supabase/migrations/034_create_friendships_table.sql`
- `supabase/migrations/035_create_user_presence_table.sql`

### WebSocket System (3 files)

- `src/lib/server/websocket-server.ts` - Server
- `src/lib/stores/websocket.svelte.ts` - Client manager
- `src/lib/stores/friends.svelte.ts` - Friends operations

### UI Components (4 files)

- `src/lib/components/OnlineStatus.svelte`
- `src/lib/components/FriendsList.svelte`
- `src/lib/components/FriendRequests.svelte`
- `src/lib/components/AddFriend.svelte`

### Routes (4 files)

- `src/routes/(protected)/dashboard/friends/+page.svelte`
- `src/routes/(protected)/dashboard/friends/+page.server.ts`
- `src/routes/(protected)/dashboard/admin/friendships/+page.svelte`
- `src/routes/(protected)/dashboard/admin/friendships/+page.server.ts`

### Types (1 file)

- `src/lib/types/database.ts` - Updated with friendship types

### Documentation (4 files)

- `FRIENDS_SYSTEM_SETUP.md` - Setup guide
- `WEBSOCKET_DEPLOYMENT_GUIDE.md` - Deployment guide
- `WEBSOCKET_ARCHITECTURE.md` - Technical docs
- `DATABASE_SCHEMA.md` - Updated schema docs

## 🔍 How It Works

### Friend Request Flow

```
User A                         Database                      User B
  │                                │                           │
  ├─ Search for User B             │                           │
  ├─ Click "Ajouter"               │                           │
  ├─────────────────INSERT─────────►                           │
  │          (status: pending)     │                           │
  │                                │                           │
  │                                ├───────NOTIFICATION────────►
  │                                │                           │
  │                                │        User B clicks      │
  │                                │        "Accepter"         │
  │                                ◄────────UPDATE─────────────┤
  │                                │  (status: accepted)       │
  │                                │                           │
  ◄────REAL-TIME PRESENCE──────────┴───────────────────────────►
  │     (WebSocket updates)                                    │
  │                                                            │
  └─────────────────── Both see each other online ────────────┘
```

### Real-Time Presence Flow

```
Browser                 WebSocket Server           Database
  │                           │                        │
  ├──────CONNECT──────────────►                        │
  │                           │                        │
  ├─────auth message──────────►                        │
  │     (JWT token)           │                        │
  │                           ├─────verify token───────►
  │                           │                        │
  │                           ◄───user validated───────┤
  │                           │                        │
  │                           ├───update presence──────►
  │                           │   (status: online)     │
  │                           │                        │
  │                           ├───get friend IDs───────►
  │                           │                        │
  │                           │                        │
  │                           ├──broadcast to friends──►
  ◄──presence_update──────────┤   (notify friends)     │
  │  (friend is online)       │                        │
  │                           │                        │
  ├────heartbeat (60s)────────►                        │
  │                           │                        │
  │                           ├───update heartbeat─────►
  │                           │                        │
  │                           │                        │
  X  (disconnect)             │                        │
                              │                        │
                              ├───update presence──────►
                              │   (status: offline)    │
                              │                        │
                              └──broadcast to friends──►
                                 (notify friends)
```

## 🛠️ Technology Stack

- **SvelteKit 2** - Main application framework
- **Svelte 5** - UI with runes ($state, $derived, $effect)
- **TypeScript** - Type safety
- **Supabase** - Database and authentication
- **WebSocket (ws)** - Real-time presence (Node.js server)
- **Shadcn-svelte** - UI components
- **Tailwind CSS 4** - Styling

## 🎓 Learning Resources

### Understanding WebSocket

- Why we need WebSocket for real-time features
- How heartbeat keeps connections alive
- Message protocol (auth, heartbeat, presence_update)

### Understanding RLS Policies

- Friends can only see each other's presence
- Teachers can moderate all friendships
- Privacy-first design

### Understanding Svelte 5 Runes

- `$state` for reactive data
- `$derived` for computed values
- `$effect` for side effects (WebSocket connections)

## 🔮 Future Enhancements

The system is architected to support these features:

### Chat System (Planned)

- Real-time messaging between friends
- Typing indicators
- Read receipts
- Message history

### Gifting System (Planned)

- Send gidouilles to friends
- Exchange VIP cards
- Gift notifications
- Transaction history

### Group Features (Possible)

- Friend groups/circles
- Group chats
- Shared achievements

## 📊 Performance Notes

### Current Capacity

- **100-1000 concurrent WebSocket connections** (single server)
- **~0.017 writes/second per user** (60s heartbeat)
- **Minimal database load** (presence table is lightweight)

### Scalability Options

- Increase heartbeat interval (60s → 120s)
- Add Redis for presence caching
- Horizontal scaling with multiple WebSocket servers
- Load balancer with sticky sessions

## 🐛 Common Issues

### "WebSocket connection failed"

→ See [FRIENDS_SYSTEM_SETUP.md](FRIENDS_SYSTEM_SETUP.md#troubleshooting) - Troubleshooting section

### "Friends show as offline when online"

→ Check WebSocket connection status
→ Verify friendship is accepted (status = 'accepted')

### "Can't deploy to Vercel"

→ WebSocket server needs separate deployment
→ See [WEBSOCKET_DEPLOYMENT_GUIDE.md](WEBSOCKET_DEPLOYMENT_GUIDE.md)

## ✅ Testing Checklist

- [ ] Database migrations applied
- [ ] Both servers running (SvelteKit + WebSocket)
- [ ] Can send friend requests
- [ ] Can accept/reject requests
- [ ] Online presence shows green dot
- [ ] Offline presence shows gray dot after 2 min
- [ ] Teacher moderation page works
- [ ] Search finds users correctly
- [ ] Can unfriend users
- [ ] Connection status banner accurate

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section in [FRIENDS_SYSTEM_SETUP.md](FRIENDS_SYSTEM_SETUP.md)
2. Review [WEBSOCKET_ARCHITECTURE.md](WEBSOCKET_ARCHITECTURE.md) for technical details
3. Check browser console for error messages
4. Verify database migrations were applied
5. Ensure both servers are running

## 🎉 You're All Set!

The friend system is complete and ready to use. Follow the setup guide to get started, then deploy to production when ready.

**Next Steps:**

1. Read [FRIENDS_SYSTEM_SETUP.md](FRIENDS_SYSTEM_SETUP.md)
2. Run `pnpm db:migrate`
3. Start both servers
4. Test with multiple users
5. Deploy to production using [WEBSOCKET_DEPLOYMENT_GUIDE.md](WEBSOCKET_DEPLOYMENT_GUIDE.md)

Enjoy your new friend system! 🚀
