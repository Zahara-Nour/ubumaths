# WebSocket Server Deployment Guide

## ⚠️ Important: Vercel Cannot Host WebSocket Servers

**Vercel's serverless functions do NOT support persistent WebSocket connections.** This is a fundamental limitation of serverless architecture where functions are stateless and short-lived.

This guide provides **three production-ready alternatives** for deploying your WebSocket server while keeping your main SvelteKit app on Vercel.

---

## Architecture Overview

```
┌─────────────────────┐
│   Vercel            │
│   (SvelteKit App)   │
│   your-app.vercel.app│
└─────────────────────┘
         │
         │ HTTP/REST (Supabase)
         ▼
┌─────────────────────┐
│   Supabase          │
│   (Database)        │
└─────────────────────┘
         ▲
         │ WebSocket for presence
         │
┌─────────────────────┐
│   External Service  │
│   (WebSocket Server)│
│   ws.your-app.com   │
└─────────────────────┘
```

Your SvelteKit app on Vercel connects to an **external WebSocket service** for real-time presence.

---

## Option 1: Railway (Recommended - Easiest)

**Why Railway:**
- ✅ Simplest deployment (push code, auto-deploy)
- ✅ Free tier: $5 credit/month (enough for development)
- ✅ Automatic HTTPS/WSS certificates
- ✅ Built-in logs and monitoring
- ✅ Great developer experience

### Step-by-Step: Deploy to Railway

#### 1. Prepare Your WebSocket Server as Standalone App

Create a new directory for the WebSocket server:

```bash
mkdir websocket-server
cd websocket-server
```

**File: `package.json`**
```json
{
  "name": "ubumaths-websocket-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "ws": "^8.18.3",
    "@supabase/supabase-js": "^2.74.0",
    "dotenv": "^17.2.3"
  }
}
```

**File: `server.js`**
```javascript
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing Supabase environment variables');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Connection store
const connections = new Map();

// Get friend IDs for a user
async function getFriendIds(userId) {
	const { data, error } = await supabase.rpc('get_friend_ids', { p_user_id: userId });
	if (error) {
		console.error('Error fetching friend IDs:', error);
		return [];
	}
	return data?.map((row) => row.friend_id) || [];
}

// Update user presence in database
async function updatePresence(userId, status) {
	const { error } = await supabase.rpc('upsert_user_presence', {
		p_user_id: userId,
		p_status: status
	});
	if (error) {
		console.error('Error updating presence:', error);
	}
}

// Broadcast presence update to specific users
function broadcastToUsers(userIds, message) {
	userIds.forEach((userId) => {
		const ws = connections.get(userId);
		if (ws && ws.readyState === 1) {
			// 1 = OPEN
			ws.send(JSON.stringify(message));
		}
	});
}

// Verify JWT token
async function verifyToken(token) {
	const {
		data: { user },
		error
	} = await supabase.auth.getUser(token);
	if (error || !user) {
		console.error('Token verification failed:', error);
		return null;
	}
	return user.id;
}

// Handle WebSocket connection
async function handleConnection(ws) {
	let userId = null;

	ws.on('message', async (data) => {
		try {
			const message = JSON.parse(data.toString());

			switch (message.type) {
				case 'auth': {
					if (!message.token) {
						ws.send(JSON.stringify({ type: 'error', message: 'Token required' }));
						ws.close();
						return;
					}

					const verifiedUserId = await verifyToken(message.token);
					if (!verifiedUserId) {
						ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
						ws.close();
						return;
					}

					userId = verifiedUserId;
					connections.set(userId, ws);

					await updatePresence(userId, 'online');

					const friendIds = await getFriendIds(userId);
					broadcastToUsers(friendIds, {
						type: 'presence_update',
						userId,
						status: 'online'
					});

					ws.send(JSON.stringify({ type: 'auth_success', userId }));
					console.log(`User ${userId} connected`);
					break;
				}

				case 'heartbeat': {
					if (userId) {
						await updatePresence(userId, 'online');
					}
					break;
				}

				default:
					console.warn('Unknown message type:', message.type);
			}
		} catch (error) {
			console.error('Error handling message:', error);
		}
	});

	ws.on('close', async () => {
		if (userId) {
			console.log(`User ${userId} disconnected`);
			connections.delete(userId);
			await updatePresence(userId, 'offline');

			const friendIds = await getFriendIds(userId);
			broadcastToUsers(friendIds, {
				type: 'presence_update',
				userId,
				status: 'offline'
			});
		}
	});

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});
}

// Cleanup stale presence (every minute)
setInterval(async () => {
	const { error } = await supabase.rpc('cleanup_stale_presence');
	if (error) {
		console.error('Error cleaning up stale presence:', error);
	}
}, 60000);

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', handleConnection);

wss.on('error', (error) => {
	console.error('WebSocket server error:', error);
});

console.log(`WebSocket server running on port ${PORT}`);
```

**File: `.env.example`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

**File: `.gitignore`**
```
node_modules/
.env
```

#### 2. Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Verify email

#### 3. Deploy to Railway

**Option A: Deploy from GitHub (Recommended)**

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "WebSocket server for Railway"
   git remote add origin https://github.com/yourusername/ubumaths-websocket.git
   git push -u origin main
   ```

2. **In Railway dashboard:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your `ubumaths-websocket` repository
   - Railway automatically detects Node.js and deploys

**Option B: Deploy via CLI**

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

#### 4. Configure Environment Variables in Railway

1. In Railway dashboard → your project
2. Click "Variables" tab
3. Add environment variables:
   ```
   SUPABASE_URL = https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key-here
   PORT = 3001
   ```
4. Railway will automatically redeploy

#### 5. Get Your WebSocket URL

Railway provides a public URL automatically:
- Go to "Settings" tab
- Click "Generate Domain"
- You'll get: `ubumaths-websocket-production.up.railway.app`

**Your WebSocket URLs:**
- HTTP: `https://ubumaths-websocket-production.up.railway.app`
- WebSocket: `wss://ubumaths-websocket-production.up.railway.app`

#### 6. Update Your SvelteKit App

**File: `src/lib/stores/websocket.svelte.ts`**

Change the WS_URL constant:

```typescript
import { browser } from '$app/environment';
import { PUBLIC_WS_URL } from '$env/static/public';

// Use environment variable for flexibility
const WS_URL = browser && PUBLIC_WS_URL
  ? PUBLIC_WS_URL
  : 'ws://localhost:3001';
```

**File: `.env` (in your main SvelteKit project)**

```env
PUBLIC_WS_URL=wss://ubumaths-websocket-production.up.railway.app
```

**File: `.env.development` (for local development)**

```env
PUBLIC_WS_URL=ws://localhost:3001
```

#### 7. Deploy to Vercel

```bash
vercel --prod
```

Make sure to add `PUBLIC_WS_URL` environment variable in Vercel dashboard:
1. Project Settings → Environment Variables
2. Add: `PUBLIC_WS_URL = wss://ubumaths-websocket-production.up.railway.app`

#### 8. Test Production

1. Visit your Vercel app: `https://ubumaths.vercel.app`
2. Log in and go to `/dashboard/friends`
3. Check connection status (should show "connected")
4. Test friend presence with two browsers

### Railway Pricing

**Free Tier (Hobby Plan):**
- $5 credit per month
- Usage-based billing after credits
- ~550 hours of uptime per month (free tier)
- Perfect for development/small projects

**Pro Plan ($20/month):**
- Unlimited projects
- Priority support
- Team features

---

## Option 2: Render (Good Free Tier)

**Why Render:**
- ✅ Generous free tier (750 hours/month)
- ✅ Automatic SSL/TLS
- ✅ Simple deployment
- ❌ Free tier spins down after 15 minutes of inactivity (cold starts)

### Step-by-Step: Deploy to Render

#### 1. Prepare WebSocket Server (Same as Railway)

Use the same standalone server code from Option 1 above.

#### 2. Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Verify email

#### 3. Create Web Service

1. **In Render dashboard:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Or use "Deploy from Git URL"

2. **Configure service:**
   - **Name**: `ubumaths-websocket`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

3. **Advanced settings:**
   - **Port**: `3001` (Render will expose this automatically)

#### 4. Add Environment Variables

In Render dashboard → Environment:
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
PORT = 3001
```

#### 5. Deploy

Click "Create Web Service" → Render automatically deploys

Your WebSocket URL will be:
- `wss://ubumaths-websocket.onrender.com`

#### 6. Update SvelteKit App

Same as Railway (Step 6), but use Render URL:
```env
PUBLIC_WS_URL=wss://ubumaths-websocket.onrender.com
```

### Important: Free Tier Limitations

**Render's free tier spins down after 15 minutes of inactivity.**

**Workaround: Keep-Alive Ping**

Add a health check endpoint to your WebSocket server:

```javascript
import http from 'http';

// Create HTTP server for health checks
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  }
});

httpServer.listen(3001, () => {
  console.log('HTTP health check on port 3001');
});

// Attach WebSocket to same port
const wss = new WebSocketServer({ server: httpServer });
```

Then use a service like **UptimeRobot** (free) to ping `https://ubumaths-websocket.onrender.com/health` every 5 minutes.

### Render Pricing

**Free Tier:**
- 750 hours/month
- Spins down after 15 min inactivity
- 500 MB RAM
- Free SSL

**Starter Plan ($7/month per service):**
- Always on (no spin down)
- 512 MB RAM
- Perfect for production

---

## Option 3: DigitalOcean App Platform (Most Control)

**Why DigitalOcean:**
- ✅ More control and predictability
- ✅ No cold starts
- ✅ Simple pricing ($5/month fixed)
- ❌ No free tier
- ❌ Slightly more complex setup

### Step-by-Step: Deploy to DigitalOcean

#### 1. Prepare WebSocket Server

Same standalone server as Option 1.

#### 2. Create DigitalOcean Account

1. Go to https://www.digitalocean.com
2. Sign up (requires credit card, but $200 free credit for 60 days)

#### 3. Create App

1. **In DO dashboard:**
   - Click "Create" → "Apps"
   - Connect GitHub repo
   - Select `ubumaths-websocket` repo

2. **Configure app:**
   - **Resource Type**: Web Service
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Port**: `3001`
   - **Plan**: Basic ($5/month)

#### 4. Add Environment Variables

Under "Environment Variables":
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
PORT = 3001
```

#### 5. Deploy

Click "Create Resources" → DigitalOcean deploys

Your URL will be:
- `wss://ubumaths-websocket-xxxxx.ondigitalocean.app`

#### 6. Update SvelteKit App

Same as Railway, but use DO URL:
```env
PUBLIC_WS_URL=wss://ubumaths-websocket-xxxxx.ondigitalocean.app
```

### DigitalOcean Pricing

**Basic Plan ($5/month):**
- 512 MB RAM
- Always on
- 1 vCPU
- Great for production

---

## Option 4: Supabase Realtime (Alternative Approach)

Instead of hosting your own WebSocket server, use **Supabase Realtime** built-in presence system.

### Why Supabase Realtime:

- ✅ Already included with Supabase (no extra cost)
- ✅ Works perfectly with Vercel
- ✅ No separate server to manage
- ✅ Built-in presence tracking
- ❌ Requires rewriting WebSocket client code
- ❌ Less control over presence logic

### How to Implement

Replace `src/lib/stores/websocket.svelte.ts` with Supabase Realtime:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

class PresenceManager {
	private channel: RealtimeChannel | null = null;
	friendsPresence = $state<Map<string, 'online' | 'offline'>>(new Map());

	connect(supabase: SupabaseClient, userId: string) {
		this.channel = supabase.channel('presence', {
			config: {
				presence: {
					key: userId
				}
			}
		});

		this.channel
			.on('presence', { event: 'sync' }, () => {
				const state = this.channel!.presenceState();

				// Update friends presence
				Object.keys(state).forEach((userId) => {
					this.friendsPresence.set(userId, 'online');
				});
			})
			.on('presence', { event: 'join' }, ({ key }) => {
				this.friendsPresence.set(key, 'online');
			})
			.on('presence', { event: 'leave' }, ({ key }) => {
				this.friendsPresence.set(key, 'offline');
			})
			.subscribe(async (status) => {
				if (status === 'SUBSCRIBED') {
					await this.channel!.track({ userId, online_at: new Date().toISOString() });
				}
			});
	}

	disconnect() {
		if (this.channel) {
			this.channel.unsubscribe();
		}
	}
}

export const presenceManager = new PresenceManager();
```

**Pros:** Zero infrastructure, works everywhere
**Cons:** No control over heartbeat logic, need to rewrite client code

---

## Comparison Table

| Service | Cost | Free Tier | Cold Starts | SSL/TLS | Complexity |
|---------|------|-----------|-------------|---------|------------|
| **Railway** | $5 credit/mo | ✅ Yes | ❌ No | ✅ Auto | ⭐ Easy |
| **Render** | Free / $7+/mo | ✅ 750hr/mo | ✅ Yes (free) | ✅ Auto | ⭐ Easy |
| **DigitalOcean** | $5/mo | ❌ No | ❌ No | ✅ Auto | ⭐⭐ Medium |
| **Supabase Realtime** | Included | ✅ Yes | N/A | ✅ Auto | ⭐⭐ Medium |

---

## Recommended Setup

### For Development:
```
Local WebSocket server (ws://localhost:3001)
Local SvelteKit (http://localhost:5173)
```

### For Production (Small/Medium):
```
Railway WebSocket server (wss://...)  ← Recommended
Vercel SvelteKit app (https://...)
```

### For Production (High Traffic):
```
DigitalOcean WebSocket server ($5/mo)
Vercel SvelteKit app
```

### For Simplest Setup:
```
Supabase Realtime (replace WebSocket entirely)
Vercel SvelteKit app
```

---

## Testing Your Deployment

After deploying, test the connection:

### 1. Test WebSocket Connection

```bash
# Install wscat globally
npm install -g wscat

# Connect to your production WebSocket
wscat -c wss://your-websocket-server.railway.app

# Send auth message (replace with real token from Supabase)
> {"type":"auth","token":"eyJhbGci..."}

# Expected response
< {"type":"auth_success","userId":"user-uuid"}
```

### 2. Test from Browser

Open your production app and check browser console:
```javascript
// Should see:
WebSocket connected
WebSocket authentication successful
```

### 3. Test Presence Updates

1. Open two browser windows
2. Log in as different users (who are friends)
3. Check that green "online" indicator appears
4. Close one window → other should show "offline" after 2 minutes

---

## Troubleshooting Production Issues

### WebSocket Connection Failed

**Check:**
1. Is WebSocket server running? Check Railway/Render logs
2. Is `PUBLIC_WS_URL` set correctly in Vercel?
3. Firewall blocking WSS? Try from different network

**Debug:**
```bash
# Check if server is reachable
curl https://your-websocket-server.railway.app/health

# Check WebSocket connection (wscat)
wscat -c wss://your-websocket-server.railway.app
```

### CORS Issues

If you get CORS errors, you likely don't need to add CORS headers for WebSocket (WSS doesn't use CORS). But if using HTTP endpoints:

```javascript
// Add to server.js (if needed for HTTP health checks)
const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  }
});
```

### Environment Variables Not Loading

**Railway:** Variables take 30-60s to reload after changes
**Render:** Redeploy after adding variables
**DigitalOcean:** Restart app after adding variables

---

## Summary

**You have 4 options:**

1. **Railway** (Easiest) - Deploy standalone WebSocket server, $5 credit/month
2. **Render** (Good free tier) - Free but spins down after 15min inactivity
3. **DigitalOcean** ($5/month) - Most reliable, always on
4. **Supabase Realtime** - No WebSocket server needed, rewrite client code

**My recommendation for most users: Railway** - Perfect balance of ease, cost, and reliability.

For detailed Railway setup, see the step-by-step guide above!
