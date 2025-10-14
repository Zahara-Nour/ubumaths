# WebSocket Architecture Documentation

This document describes the real-time presence system using WebSocket for the friend feature in UbuMaths.

## Overview

The WebSocket system provides **real-time online/offline presence tracking** for users who are friends. This enables students and teachers to see which of their friends are currently online.

### Key Features

- **Real-time presence updates**: Friends see online/offline status instantly
- **60-second heartbeat**: Client sends periodic heartbeat to maintain online status
- **Automatic cleanup**: Users marked offline after 2 minutes of inactivity
- **Privacy-focused**: Only friends can see each other's presence
- **No multi-device persistence**: One connection per user (simplest implementation)
- **Exponential backoff reconnection**: Automatic reconnection with increasing delays

## Architecture

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│   Browser       │◄─────────(ws://...)────────►│  WebSocket       │
│   Client        │                              │  Server          │
│  (Svelte App)   │         HTTP/REST            │  (Node.js)       │
└─────────────────┘◄────────────────────────────►└──────────────────┘
        │                                                 │
        │                                                 │
        ▼                                                 ▼
┌─────────────────┐                              ┌──────────────────┐
│  Local State    │                              │  Supabase DB     │
│  friendsPresence│                              │  - user_presence │
│  Map<id,status> │                              │  - friendships   │
└─────────────────┘                              └──────────────────┘
```

## Components

### 1. WebSocket Server

**Location**: `src/lib/server/websocket-server.ts`

**Port**: 3001 (standalone server, separate from SvelteKit)

**Responsibilities**:
- Maintain active WebSocket connections (Map<user_id, WebSocket>)
- Authenticate users via JWT token validation
- Handle heartbeat messages (update `last_heartbeat`)
- Broadcast presence updates to friends only
- Cleanup stale connections

**Startup**: `pnpm ws:dev` (runs `npx tsx src/lib/server/websocket-server.ts`)

**Message Types**:

```typescript
// Client → Server
{
  type: 'auth',
  token: 'jwt-access-token'  // Supabase session token
}

{
  type: 'heartbeat'  // Sent every 60 seconds
}

// Server → Client
{
  type: 'auth_success',
  userId: 'uuid'
}

{
  type: 'presence_update',
  userId: 'friend-uuid',
  status: 'online' | 'offline'
}

{
  type: 'error',
  message: 'error description'
}
```

**Connection Flow**:

1. Client establishes WebSocket connection to `ws://localhost:3001`
2. Client sends `auth` message with Supabase session token
3. Server validates token via `supabase.auth.getUser(token)`
4. Server adds connection to `connections` Map
5. Server updates `user_presence` table (status = 'online')
6. Server fetches friend IDs via `get_friend_ids()` RPC
7. Server broadcasts `presence_update` to all online friends
8. Client starts 60-second heartbeat interval

**Disconnect Flow**:

1. Client closes connection or network failure
2. Server removes from `connections` Map
3. Server updates `user_presence` table (status = 'offline')
4. Server broadcasts `presence_update` to all online friends

**Cleanup Task**:

Every 60 seconds, server calls `cleanup_stale_presence()` RPC to mark users offline if `last_heartbeat` is older than 2 minutes.

### 2. WebSocket Client Store

**Location**: `src/lib/stores/websocket.svelte.ts`

**Type**: Svelte 5 rune-based class with `$state`

**Responsibilities**:
- Establish and maintain WebSocket connection
- Send heartbeat every 60 seconds
- Handle incoming presence updates
- Reconnect with exponential backoff on disconnect
- Store friends' presence in reactive Map

**Key Properties**:

```typescript
friendsPresence: Map<string, 'online' | 'offline'>  // Reactive state
connectionStatus: 'connected' | 'disconnected' | 'connecting'
```

**Key Methods**:

```typescript
connect(userId: string, token: string): void
disconnect(): void
getFriendPresence(friendId: string): 'online' | 'offline'
```

**Reconnection Strategy**:

- Base delay: 1 second
- Max delay: 30 seconds
- Formula: `delay = min(1000 * 2^attempts, 30000)`
- Example: 1s → 2s → 4s → 8s → 16s → 30s → 30s...

### 3. Friends Manager Store

**Location**: `src/lib/stores/friends.svelte.ts`

**Type**: Svelte 5 rune-based class with `$state`

**Responsibilities**:
- Load friendships from Supabase
- Send/accept/reject/cancel friend requests
- Unfriend users
- Search for users to add as friends
- Integrate with WebSocket presence

**Key Properties**:

```typescript
friendships: FriendshipWithProfile[]        // Accepted friends
pendingIncoming: FriendshipWithProfile[]    // Requests to accept/reject
pendingSent: FriendshipWithProfile[]        // Requests awaiting response
loading: boolean
error: string | null
```

**Key Methods**:

```typescript
init(supabase: SupabaseClient, userId: string): void
loadFriendships(): Promise<void>
sendFriendRequest(friendId: string, type: 'classmate' | 'mentor'): Promise<boolean>
acceptRequest(friendshipId: string): Promise<boolean>
rejectRequest(friendshipId: string): Promise<boolean>
unfriend(friendshipId: string): Promise<boolean>
searchUsers(query: string): Promise<UserSearchResult[]>
getFriendPresence(friendId: string): 'online' | 'offline'
getDisplayName(friend: FriendshipWithProfile): string
```

### 4. UI Components

#### OnlineStatus.svelte

Simple status indicator badge component.

**Props**:
- `status: 'online' | 'offline'`
- `showLabel?: boolean` (default: false)
- `size?: 'sm' | 'md' | 'lg'` (default: 'md')

**Appearance**:
- Green pulsing dot for online
- Gray dot for offline
- Optional label text

#### FriendsList.svelte

Displays accepted friends with online status.

**Features**:
- Search bar to filter friends by name
- Avatar with fallback initial
- Online/offline status indicator
- Friendship type badge (Camarade/Mentor)
- Dropdown menu: View profile, Unfriend

#### FriendRequests.svelte

Shows pending incoming and sent friend requests.

**Features**:
- **Incoming section**: Accept/Reject buttons
- **Sent section**: Cancel button with status label
- Empty states with helpful icons

#### AddFriend.svelte

Search for users and send friend requests.

**Features**:
- Search input (min 2 characters)
- Friendship type selector (Camarade/Mentor)
- Search results with status badges:
  - "Déjà ami" (green) - Already friends
  - "En attente" (yellow) - Request pending
  - "Refusée" (red) - Request rejected
- Add button for users not yet friends

### 5. Routes

#### `/dashboard/friends`

Main friends page with 3 tabs:

**Tab 1: Mes amis** (`FriendsList.svelte`)
- Shows accepted friendships
- Badge count of total friends

**Tab 2: Demandes** (`FriendRequests.svelte`)
- Shows incoming and sent requests
- Red badge count of incoming requests

**Tab 3: Ajouter** (`AddFriend.svelte`)
- Search and send friend requests

**Connection Status Banner**:
- Shows warning if WebSocket is disconnected
- "Connexion au serveur de présence..." (connecting)
- "Déconnecté du serveur de présence..." (disconnected)

#### `/dashboard/admin/friendships`

Teacher moderation page (teachers & admins only).

**Features**:
- View all student friendships
- Stats cards: Active, Pending, Total
- Filter by class or search by name
- View friendship details: requester → addressee
- Delete inappropriate friendships
- Status badges (Acceptée/En attente/Refusée)

**Server Action**: `deleteFriendship` - teachers can remove any friendship

## Database Functions

### `get_friend_ids(p_user_id UUID)`

**Returns**: `TABLE(friend_id UUID)`

**Purpose**: Get list of accepted friend IDs for a user

**Used by**: WebSocket server to find who to broadcast presence updates to

**SQL**:
```sql
SELECT CASE
  WHEN requester_id = p_user_id THEN addressee_id
  WHEN addressee_id = p_user_id THEN requester_id
END AS friend_id
FROM friendships
WHERE status = 'accepted'
AND (requester_id = p_user_id OR addressee_id = p_user_id)
```

### `upsert_user_presence(p_user_id UUID, p_status TEXT)`

**Returns**: `void`

**Purpose**: Insert or update user presence status

**Used by**: WebSocket server on connect/disconnect/heartbeat

**SQL**:
```sql
INSERT INTO user_presence (user_id, status, last_heartbeat, updated_at)
VALUES (p_user_id, p_status, now(), now())
ON CONFLICT (user_id)
DO UPDATE SET
  status = EXCLUDED.status,
  last_heartbeat = EXCLUDED.last_heartbeat,
  updated_at = EXCLUDED.updated_at
```

### `cleanup_stale_presence()`

**Returns**: `void`

**Purpose**: Mark users offline if no heartbeat in 2 minutes

**Called by**: WebSocket server every 60 seconds

**SQL**:
```sql
UPDATE user_presence
SET status = 'offline', updated_at = now()
WHERE status = 'online'
AND last_heartbeat < now() - interval '2 minutes'
```

## Usage Flow

### User Login Flow

1. User logs in via Google OAuth
2. SvelteKit creates session with JWT access token
3. User navigates to `/dashboard/friends`
4. Page component calls:
   ```typescript
   friendsManager.init(supabase, userId)
   await friendsManager.loadFriendships()
   websocketManager.connect(userId, session.access_token)
   ```
5. WebSocket authenticates and marks user online
6. Friends see presence update instantly

### Sending Friend Request

1. User searches for friend in "Ajouter" tab
2. `friendsManager.searchUsers(query)` fetches matching users
3. User selects friendship type (classmate/mentor)
4. User clicks "Ajouter" button
5. `friendsManager.sendFriendRequest(friendId, type)` inserts row
6. Status changes to "En attente" in search results
7. Other user sees request in "Demandes reçues"

### Accepting Friend Request

1. User sees incoming request in "Demandes" tab
2. User clicks "Accepter" button
3. `friendsManager.acceptRequest(friendshipId)` updates status
4. Both users see each other in "Mes amis"
5. Both users can now see each other's presence

### Real-Time Presence Update

1. User A connects → WebSocket server marks online
2. Server calls `get_friend_ids(userA.id)` → [userB.id, userC.id]
3. Server sends to userB and userC:
   ```json
   {
     "type": "presence_update",
     "userId": "userA-id",
     "status": "online"
   }
   ```
4. Client receives message and updates:
   ```typescript
   websocketManager.friendsPresence.set(message.userId, message.status)
   ```
5. UI automatically re-renders with green online indicator

## Security Considerations

### Authentication

- WebSocket requires valid Supabase JWT access token
- Token validated via `supabase.auth.getUser(token)`
- Invalid tokens immediately close connection

### Privacy

- RLS policies ensure users can only see friends' presence
- `user_presence` table SELECT policy:
  ```sql
  user_id IN (
    SELECT friend_id FROM get_friend_ids(auth.uid())
  )
  OR user_id = auth.uid()
  ```

### Authorization

- Only teachers/admins can moderate friendships
- `friendships` table DELETE policy for teachers:
  ```sql
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'teacher'
  )
  ```

## Performance Considerations

### Connection Management

- **One connection per user**: Simple implementation, easy to reason about
- **Connection Map**: O(1) lookup for broadcasting
- **No database polling**: WebSocket push model, not REST polling

### Database Load

- **Heartbeat = Database write**: 60-second interval minimizes writes
- **Indexed queries**: `user_presence` has index on `user_id`
- **Batch updates**: Cleanup function runs once per minute for all stale users

### Scalability

**Current architecture (single-server)**:
- Suitable for: 100-1000 concurrent connections
- Limitation: All connections on one Node.js process

**Future improvements** (if needed):
- Redis pub/sub for multi-server presence sharing
- Sticky sessions or shared state store
- Horizontal scaling with load balancer

## Deployment Considerations

### Development

**Two servers needed**:
1. SvelteKit dev server: `pnpm dev` (port 5173)
2. WebSocket server: `pnpm ws:dev` (port 3001)

**Terminal setup**:
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm ws:dev
```

### Production (Vercel)

**Challenge**: Vercel does not support persistent WebSocket connections on serverless functions.

**Options**:

**Option 1: External WebSocket Service** (Recommended)
- Deploy WebSocket server separately (e.g., Railway, Render, DigitalOcean)
- Update `WS_URL` in `websocket.svelte.ts` to point to external server
- Configure CORS and authentication

**Option 2: Supabase Realtime** (Alternative)
- Replace WebSocket with Supabase Realtime channels
- Use `supabase.channel('presence')` for presence tracking
- Simpler deployment but less control

**Option 3: Polling Fallback** (Degraded UX)
- Disable WebSocket on production
- Poll `user_presence` table every 30-60 seconds
- Higher latency but no WebSocket infrastructure needed

### Environment Variables

**WebSocket Server**:
```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx  # Secret key for server-side operations
```

**Client**:
```env
WS_URL=ws://localhost:3001  # Development
# or
WS_URL=wss://ws.yourapp.com  # Production
```

## Testing

### Manual Testing

1. Open two browser windows (different profiles or incognito)
2. Log in as two different users
3. Send friend request from User A to User B
4. Accept request in User B's window
5. Check WebSocket connection status in both windows
6. Verify green "online" indicator appears for each user
7. Close User A's browser → User B sees "offline" after 2 minutes

### WebSocket Testing with `wscat`

```bash
# Install wscat
pnpm add -g wscat

# Connect to WebSocket server
wscat -c ws://localhost:3001

# Send auth message (replace with real token)
> {"type":"auth","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

# Expected response
< {"type":"auth_success","userId":"user-uuid"}

# Send heartbeat
> {"type":"heartbeat"}

# Expected: presence updates for friends coming online/offline
< {"type":"presence_update","userId":"friend-uuid","status":"online"}
```

## Future Enhancements

### Chat System (Planned)

The WebSocket infrastructure is designed to support future chat features:

**New message types**:
```typescript
{
  type: 'chat_message',
  from: 'sender-uuid',
  to: 'recipient-uuid',
  content: 'message text',
  timestamp: '2025-10-14T...'
}

{
  type: 'typing_indicator',
  userId: 'user-uuid',
  isTyping: boolean
}
```

**Database additions** (not implemented yet):
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  content TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Gifting System (Planned)

Send gidouilles and VIP cards to friends:

**New message types**:
```typescript
{
  type: 'gift_notification',
  from: 'sender-uuid',
  giftType: 'gidouille' | 'vip_card',
  amount: 3,
  message: 'optional message'
}
```

**Database additions** (not implemented yet):
```sql
CREATE TABLE gift_transactions (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  gift_type TEXT,
  gift_item_id UUID,
  amount INT,
  message TEXT,
  created_at TIMESTAMPTZ
);
```

## Troubleshooting

### WebSocket Connection Failed

**Symptom**: Connection status stuck on "connecting" or "disconnected"

**Causes**:
- WebSocket server not running → Run `pnpm ws:dev`
- Wrong port → Check `WS_URL` in `websocket.svelte.ts`
- Firewall blocking port 3001 → Allow port in firewall/router

### Presence Not Updating

**Symptom**: Friends show as offline even though they're online

**Causes**:
- Heartbeat not sending → Check browser console for errors
- Stale data in DB → Manually run `SELECT cleanup_stale_presence()`
- RLS policy blocking → Ensure users are actually friends (status='accepted')

### Connection Keeps Reconnecting

**Symptom**: Rapid connect/disconnect cycles

**Causes**:
- Invalid JWT token → Refresh session token
- Server crashing → Check WebSocket server logs for errors
- Network instability → Check network connection

## Summary

The WebSocket architecture provides a **scalable, privacy-focused real-time presence system** that:
- ✅ Updates friends' online status instantly
- ✅ Uses minimal database writes (60s heartbeat)
- ✅ Respects privacy (friends-only visibility)
- ✅ Handles reconnections gracefully
- ✅ Foundation for future chat and gifting features

For development, simply run both servers:
```bash
pnpm dev      # SvelteKit (port 5173)
pnpm ws:dev   # WebSocket (port 3001)
```

For production deployment, consider using an external WebSocket service (Railway, Render) or Supabase Realtime as an alternative.
