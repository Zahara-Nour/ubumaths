# Friends System - Documentation Technique Approfondie

> Analyse technique complète du système d'amis : WebSocket, performance, database, architecture

**Date** : 2025-01-09
**Type** : Technical Deep Dive

---

## Table des Matières

- [WebSocket & Présence Temps Réel](#websocket--présence-temps-réel)
- [Stratégie Reject vs Delete](#stratégie-reject-vs-delete)
- [Performance & Optimisations](#performance--optimisations)
- [Database Schema](#database-schema)
- [Notifications (Manquantes)](#notifications-manquantes)
- [Limites & Quotas (Manquants)](#limites--quotas-manquants)
- [Historique & Analytics (Manquants)](#historique--analytics-manquants)
- [Intégrations](#intégrations)

---

## WebSocket & Présence Temps Réel

### Architecture Générale

```
┌──────────────┐                    ┌──────────────────┐
│    Client    │                    │   WS Server      │
│   (Svelte)   │                    │   (port 3001)    │
└──────┬───────┘                    └────────┬─────────┘
       │                                     │
       │ 1. Connect                          │
       ├────────────────────────────────────>│
       │                                     │
       │ 2. Send auth token                  │
       ├────────────────────────────────────>│
       │                                     │
       │                                     │ 3. Verify JWT
       │                                     ├───────────►Supabase
       │                                     │
       │ 4. auth_success                     │
       │<────────────────────────────────────┤
       │                                     │
       │                                     │ 5. Update presence
       │                                     ├───────────►DB
       │                                     │
       │                                     │ 6. Get friend_ids
       │                                     ├───────────►DB
       │                                     │
       │                                     │ 7. Broadcast to friends
       │ 8. presence_update                  ├───────────►Friends
       │<────────────────────────────────────┤
       │                                     │
       │ Every 60s: heartbeat                │
       ├────────────────────────────────────>│
       │                                     │
       │                                     │ Cleanup job every 60s
       │                                     │ (mark offline if >2min)
```

### Système de Heartbeat

#### Configuration Temporelle

```typescript
// src/lib/stores/websocket.svelte.ts
const HEARTBEAT_INTERVAL = 60000; // 60 secondes
const RECONNECT_BASE_DELAY = 1000; // 1 seconde
const RECONNECT_MAX_DELAY = 30000; // 30 secondes

// src/lib/server/websocket-server.ts
const CLEANUP_INTERVAL = 60000; // 60 secondes
const STALE_THRESHOLD = '2 minutes'; // Seuil offline
```

#### Implémentation Client-Side

**Fichier** : `src/lib/stores/websocket.svelte.ts:180-189`

```typescript
private startHeartbeat(): void {
    if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
        this.send({ type: 'heartbeat' });
    }, HEARTBEAT_INTERVAL) as unknown as number;
}
```

**Message envoyé** :

```json
{ "type": "heartbeat" }
```

#### Implémentation Server-Side

**Fichier** : `src/lib/server/websocket-server.ts:202-208`

```typescript
case 'heartbeat': {
    // Update heartbeat timestamp
    if (userId) {
        await updatePresence(userId, 'online');
    }
    break;
}
```

#### Fonction Database

**Fichier** : `supabase/migrations/035_create_user_presence_table.sql:68-83`

```sql
CREATE OR REPLACE FUNCTION upsert_user_presence(
  p_user_id uuid,
  p_status text
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, last_heartbeat, updated_at)
  VALUES (p_user_id, p_status, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    last_heartbeat = EXCLUDED.last_heartbeat,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Opération** : UPSERT atomique avec `ON CONFLICT`

#### Cleanup des Connexions Zombies

**Fichier** : `supabase/migrations/035_create_user_presence_table.sql:58-66`

```sql
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline', updated_at = now()
  WHERE status = 'online'
  AND last_heartbeat < now() - interval '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Exécution serveur** : `src/lib/server/websocket-server.ts:354-359`

```typescript
setInterval(async () => {
	const { error } = await supabase.rpc('cleanup_stale_presence');
	if (error) {
		console.error('Error cleaning up stale presence:', error);
	}
}, 60000); // 1 minute
```

#### Analyse des Timings

| Événement            | Timing | Formule                                         | Raison                    |
| -------------------- | ------ | ----------------------------------------------- | ------------------------- |
| Client heartbeat     | 60s    | `HEARTBEAT_INTERVAL`                            | Balance freshness/DB load |
| Server cleanup       | 60s    | `CLEANUP_INTERVAL`                              | Catch zombie connections  |
| Seuil offline        | 2 min  | `last_heartbeat < now() - interval '2 minutes'` | Permet 1 heartbeat manqué |
| Reconnect attempt 1  | 1s     | `BASE_DELAY * 2^0`                              | Reconnexion rapide        |
| Reconnect attempt 2  | 2s     | `BASE_DELAY * 2^1`                              | Exponentiel               |
| Reconnect attempt 6+ | 30s    | `min(..., MAX_DELAY)`                           | Cap à 30s                 |

**User marqué offline si** : `last_heartbeat < now() - interval '2 minutes'`

### Détection Online/Offline

#### Cas 1 : Connexion Utilisateur

**Fichier** : `src/lib/server/websocket-server.ts:157-199`

```typescript
ws.on('message', async (data: Buffer) => {
	const message: WSMessage = JSON.parse(data.toString());

	switch (message.type) {
		case 'auth': {
			// 1. Verify JWT token
			const verifiedUserId = await verifyToken(message.token);
			userId = verifiedUserId;

			// 2. Store connection
			connections.set(userId, ws);

			// 3. Mark user online in DB
			await updatePresence(userId, 'online');

			// 4. Get friend IDs
			const friendIds = await getFriendIds(userId);

			// 5. Broadcast to friends
			broadcastToUsers(friendIds, {
				type: 'presence_update',
				userId,
				status: 'online'
			});

			// 6. Send success to client
			ws.send(
				JSON.stringify({
					type: 'auth_success',
					userId
				})
			);

			break;
		}
	}
});
```

**Latence** : ~200-500ms (JWT verify + DB update + broadcast)

#### Cas 2 : Déconnexion Utilisateur

**Fichier** : `src/lib/server/websocket-server.ts:323-346`

```typescript
ws.on('close', async () => {
	if (userId) {
		// 1. Remove from connections Map
		connections.delete(userId);

		// 2. Clear heartbeat interval
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
		}

		// 3. Mark offline in DB
		await updatePresence(userId, 'offline');

		// 4. Get friend IDs
		const friendIds = await getFriendIds(userId);

		// 5. Broadcast to friends
		broadcastToUsers(friendIds, {
			type: 'presence_update',
			userId,
			status: 'offline'
		});
	}
});
```

**Latence** : ~100-300ms (DB update + broadcast)

#### Cas 3 : Crash Navigateur / Perte Réseau

```
1. Client crash → Pas de ws.onclose event
   ↓
2. Serveur ne reçoit plus de heartbeat
   ↓
3. Cleanup job tourne toutes les 60s
   ↓
4. Si last_heartbeat > 2 minutes → UPDATE status = 'offline'
   ↓
5. User marqué offline après ~2-3 minutes max
```

**Latence détection** : 2-3 minutes (délai acceptable pour crash)

#### Mécanismes de Détection

| Mécanisme                | Latence | Use Case           |
| ------------------------ | ------- | ------------------ |
| `ws.onopen` + broadcast  | <500ms  | Connexion normale  |
| `ws.onclose` + broadcast | <300ms  | Déconnexion propre |
| Heartbeat update         | 60s     | Maintien connexion |
| Cleanup function         | 2-3 min | Zombie connections |

### Messages WebSocket

#### Types de Messages

**Fichier** : `src/lib/server/websocket-server.ts:24-44`

```typescript
interface WSMessage {
	type:
		| 'heartbeat'
		| 'auth'
		| 'presence_update'
		| 'chat_message'
		| 'message_read'
		| 'typing_indicator'
		| 'message_reaction';

	// Auth
	token?: string;

	// Presence
	userId?: string;
	status?: 'online' | 'offline';

	// Chat (future)
	conversationId?: string;
	messageId?: string;
	content?: unknown;
	attachments?: unknown[];
	isTyping?: boolean;
	emoji?: string;
	action?: 'add' | 'remove';
}
```

#### Client → Server

1. **Auth** (`websocket.svelte.ts:97-100`)

   ```json
   {
   	"type": "auth",
   	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

   **Taille** : ~1-2 KB (JWT token)

2. **Heartbeat** (`websocket.svelte.ts:187`)
   ```json
   {
   	"type": "heartbeat"
   }
   ```
   **Taille** : ~25 bytes

#### Server → Client

1. **Auth Success** (`websocket-server.ts:196`)

   ```json
   {
   	"type": "auth_success",
   	"userId": "uuid-here"
   }
   ```

   **Taille** : ~60 bytes

2. **Presence Update** (`websocket-server.ts:189-193`)

   ```json
   {
   	"type": "presence_update",
   	"userId": "friend-uuid",
   	"status": "online"
   }
   ```

   **Taille** : ~80 bytes

3. **Error** (`websocket-server.ts:168-171`)
   ```json
   {
   	"type": "error",
   	"message": "Invalid token"
   }
   ```
   **Taille** : ~50 bytes

#### Estimation Volume de Données

**Par utilisateur par heure** :

- 60 heartbeats × 25 bytes = 1,500 bytes
- ~5 presence updates (amis) × 80 bytes = 400 bytes
- Total : **~2 KB/user/heure** (négligeable)

**Pour 1000 utilisateurs concurrents** :

- 2 KB × 1000 = 2 MB/heure
- 48 MB/jour
- **Bandwidth totalement acceptable**

### Gestion des Connexions

#### Connection Store

**Fichier** : `src/lib/server/websocket-server.ts:21`

```typescript
const connections = new Map<string, WebSocket>();
```

**Structure** :

```
Map {
  'user-uuid-1' => WebSocket { readyState: OPEN },
  'user-uuid-2' => WebSocket { readyState: OPEN },
  ...
}
```

**Opérations** :

```typescript
// Add connection (websocket-server.ts:182)
connections.set(userId, ws);

// Remove connection (websocket-server.ts:328)
connections.delete(userId);

// Get connection
const userWs = connections.get(userId);

// Check if connected
const isConnected = connections.has(userId);
```

#### Lifecycle Management

```
1. Client connects
   ↓
2. ws.on('open') → Wait for auth
   ↓
3. ws.on('message', auth) → connections.set(userId, ws)
   ↓
4. Active connection (heartbeats every 60s)
   ↓
5. ws.on('close') → connections.delete(userId)
   ↓
6. Cleanup (if zombie)
```

#### Limitations Actuelles

| Aspect                  | Limitation                  | Impact                  |
| ----------------------- | --------------------------- | ----------------------- |
| Connexions concurrentes | ❌ Pas de limite            | Potentiel DoS           |
| Multi-device            | ❌ Dernière connexion gagne | UX médiocre             |
| Connection pooling      | ❌ Pas implémenté           | Scaling limité          |
| Load balancing          | ❌ Single server            | Single point of failure |

#### Reconnexion Stratégie

**Fichier** : `src/lib/stores/websocket.svelte.ts:194-210`

```typescript
private scheduleReconnect(): void {
    const delay = Math.min(
        RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
        RECONNECT_MAX_DELAY
    );

    this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.establishConnection();
    }, delay) as unknown as number;
}
```

**Timing de Reconnexion** :

| Tentative | Délai | Calcul                        |
| --------- | ----- | ----------------------------- |
| 1         | 1s    | `1000 * 2^0 = 1000ms`         |
| 2         | 2s    | `1000 * 2^1 = 2000ms`         |
| 3         | 4s    | `1000 * 2^2 = 4000ms`         |
| 4         | 8s    | `1000 * 2^3 = 8000ms`         |
| 5         | 16s   | `1000 * 2^4 = 16000ms`        |
| 6+        | 30s   | `min(32000, 30000) = 30000ms` |

**Formule** : `delay = min(1000 * 2^attempts, 30000)`

### Supabase Realtime vs Custom WebSocket

**Décision** : Custom WebSocket Server ✅

**Raisons** :

| Aspect                | Supabase Realtime | Custom WS      |
| --------------------- | ----------------- | -------------- |
| Contrôle du protocole | ❌ Limité         | ✅ Total       |
| Support chat features | ⚠️ Complexe       | ✅ Natif       |
| Subscription limits   | ⚠️ 100 per client | ✅ Illimité    |
| Custom logic          | ❌ Difficile      | ✅ Simple      |
| Coût                  | 💰 Metered        | 💰 Self-hosted |

**Usage de Supabase** :

- ✅ Database (`user_presence`, `friendships`)
- ✅ RLS policies (privacy)
- ✅ RPC functions (`get_friend_ids`, `cleanup_stale_presence`)
- ✅ Auth (JWT verification)
- ❌ Realtime subscriptions (pas utilisé)

### Data Storage - user_presence

**Fichier** : `supabase/migrations/035_create_user_presence_table.sql:2-7`

```sql
CREATE TABLE user_presence (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'offline')) DEFAULT 'offline',
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Indexes** :

```sql
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_heartbeat ON user_presence(last_heartbeat);
```

**Index Performance** :

| Query                      | Index Used                    | Performance |
| -------------------------- | ----------------------------- | ----------- |
| `WHERE status = 'online'`  | `idx_user_presence_status`    | O(log n)    |
| `WHERE last_heartbeat < X` | `idx_user_presence_heartbeat` | O(log n)    |
| Cleanup query (both)       | Bitmap index scan             | O(log n)    |

**RLS Policies** :

1. **View Own** (`035:17-19`)

   ```sql
   CREATE POLICY "Users can view own presence"
     ON user_presence FOR SELECT
     USING (auth.uid() = user_id);
   ```

2. **View Friends** (`035:22-34`)

   ```sql
   CREATE POLICY "Users can view friend presence"
     ON user_presence FOR SELECT
     USING (
       user_id IN (
         SELECT CASE
           WHEN requester_id = auth.uid() THEN addressee_id
           WHEN addressee_id = auth.uid() THEN requester_id
         END
         FROM friendships
         WHERE status = 'accepted'
         AND (requester_id = auth.uid() OR addressee_id = auth.uid())
       )
     );
   ```

3. **Manage Own** (`035:37-40`)
   ```sql
   CREATE POLICY "Users can manage own presence"
     ON user_presence FOR ALL
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   ```

**Storage Size** :

- ~50 bytes per row
- 10,000 users = ~500 KB
- Négligeable

---

## Stratégie Reject vs Delete

### Implémentation Actuelle

#### Reject (UPDATE)

**Fichier** : `src/lib/stores/friends.svelte.ts:191-214`

```typescript
async rejectRequest(friendshipId: string): Promise<boolean> {
    const { error } = await this.supabase
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', friendshipId);

    if (error) {
        throw error;
    }

    await this.loadFriendships();
    return true;
}
```

**SQL généré** :

```sql
UPDATE friendships
SET status = 'rejected', updated_at = now()
WHERE id = '...'
```

**Record conservé** : ✅ Oui

#### Delete (DELETE)

**Fichier** : `src/lib/stores/friends.svelte.ts:219-239`

```typescript
async unfriend(friendshipId: string): Promise<boolean> {
    const { error } = await this.supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

    if (error) {
        throw error;
    }

    await this.loadFriendships();
    return true;
}
```

**SQL généré** :

```sql
DELETE FROM friendships WHERE id = '...'
```

**Record supprimé** : ❌ Définitivement

### Analyse Décision Architecturale

#### Use Cases Identified

**1. Badge "Refusée"** ✅ Implémenté

**Fichier** : `src/lib/components/AddFriend.svelte:84-88`

```typescript
case 'rejected':
    return {
        icon: UserX,
        label: 'Refusée',
        class: 'bg-red-100 text-green-800 dark:bg-red-900 dark:text-red-200'
    };
```

**Résultat** : Requester voit badge rouge "Refusée" dans résultats de recherche

**2. Modération Enseignants** ✅ Implémenté

**Fichier** : `src/routes/(protected)/dashboard/admin/friendships/+page.server.ts:96-101`

```typescript
const stats = {
	total: transformedFriendships.length,
	accepted: transformedFriendships.filter((f) => f.status === 'accepted').length,
	pending: transformedFriendships.filter((f) => f.status === 'pending').length,
	rejected: transformedFriendships.filter((f) => f.status === 'rejected').length
};
```

**Résultat** : Teachers voient count de friendships rejetées

**3. Analytics** ❌ Pas implémenté

Pas de dashboard analytics utilisant rejected friendships

**4. Audit Trail** ⚠️ Partiel

Timestamps `created_at` et `updated_at` existent mais pas de log séparé

#### Vulnérabilité Critique : Re-Spam After Reject

**Scénario** :

```typescript
// Utilisateur A envoie demande à B
await friendsManager.sendFriendRequest('user-b-id', 'classmate');
// Status: pending

// Utilisateur B refuse
await friendsManager.rejectRequest(friendshipId);
// Status: rejected

// Utilisateur A voit badge "Refusée"
// Utilisateur A appelle unfriend()
await friendsManager.unfriend(friendshipId);
// DELETE FROM friendships → Record supprimé

// Utilisateur A peut immédiatement renvoyer
await friendsManager.sendFriendRequest('user-b-id', 'classmate');
// ✅ SUCCÈS - Aucun cooldown
```

**Problème** : Pas de protection contre re-spam après rejet

#### Recommandation : Rejection Cooldown

```sql
-- Ajouter metadata column
ALTER TABLE friendships ADD COLUMN metadata jsonb DEFAULT '{}';

-- Fonction de vérification cooldown
CREATE OR REPLACE FUNCTION check_rejection_cooldown(
    p_requester_id uuid,
    p_addressee_id uuid
)
RETURNS boolean AS $$
DECLARE
    last_rejection timestamptz;
    cooldown_days integer := 30;
BEGIN
    -- Chercher dernière rejection (même si deleted)
    -- Nécessite audit table pour tracker rejections passées
    SELECT
        (metadata->>'rejected_at')::timestamptz
    INTO last_rejection
    FROM friendships
    WHERE requester_id = p_requester_id
    AND addressee_id = p_addressee_id
    AND status = 'rejected'
    ORDER BY updated_at DESC
    LIMIT 1;

    IF last_rejection IS NOT NULL
       AND last_rejection > now() - interval '30 days' THEN
        RETURN false;  -- Cooldown actif
    END IF;

    RETURN true;  -- OK
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Limitation actuelle** : Si record deleted, impossible de tracker cooldown.
**Solution** : Soft delete ou audit table

### Privacy Implications

**Visibilité des Rejected Friendships** :

| User Role | Peut voir rejected ? | Fichier                        | Ligne |
| --------- | -------------------- | ------------------------------ | ----- |
| Requester | ✅ Badge "Refusée"   | AddFriend.svelte               | 84-88 |
| Addressee | ❌ Pas affiché       | FriendRequests.svelte          | N/A   |
| Teacher   | ✅ Liste complète    | admin/friendships/+page.svelte | Tout  |

**RLS Policy** :

```sql
-- Fichier: 034_create_friendships_table.sql:28-30
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
```

**Implications** :

- ⚠️ Requester sait qu'il a été rejeté (badge visible)
- ✅ Addressee ne voit plus les demandes rejetées dans son UI
- ⚠️ Teachers voient tous les rejets (potentiel privacy issue)

### Reject vs Delete Comparison

| Aspect                | Reject (UPDATE)              | Delete (DELETE)           |
| --------------------- | ---------------------------- | ------------------------- |
| SQL                   | `UPDATE status = 'rejected'` | `DELETE FROM`             |
| Record en DB          | ✅ Conservé                  | ❌ Supprimé               |
| Visible requester     | ✅ Badge "Refusée"           | ❌ Comme si jamais existé |
| Visible addressee     | ❌ Disparaît UI              | ❌ Disparaît UI           |
| Analytics             | ✅ Possible                  | ❌ Impossible             |
| Audit trail           | ⚠️ Partiel (timestamps)      | ❌ Aucun                  |
| Re-request prevention | ⚠️ Peut bypass               | ❌ Aucun                  |
| Privacy               | ⚠️ Requester sait            | ✅ Pas de trace           |

---

## Performance & Optimisations

### Caching

#### État Actuel

❌ **AUCUN CACHE** implémenté

**Evidence** :

```typescript
// src/lib/stores/friends.svelte.ts:26-128
async loadFriendships(): Promise<void> {
    this.loading = true;

    // Fetch fresh data - PAS DE CACHE
    const { data: friendshipsData } = await this.supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${this.currentUserId},addressee_id.eq.${this.currentUserId}`)
        .order('created_at', { ascending: false });

    // ...
}
```

**Appelé** :

- Sur initial page load
- Après chaque action (accept, reject, unfriend, send)
- **Pas de debouncing**

#### Impact Performance

| Scénario           | Requêtes DB                           | Latence     |
| ------------------ | ------------------------------------- | ----------- |
| Page load          | 3 (friendships + profiles + presence) | ~200ms      |
| Accept request     | 1 UPDATE + 3 SELECT (reload)          | ~250ms      |
| Unfriend           | 1 DELETE + 3 SELECT (reload)          | ~250ms      |
| 10 actions rapides | 30 SELECT                             | ~2.5s total |

#### Recommandation : Simple TTL Cache

```typescript
class FriendsManager {
	private cache: {
		data: FriendshipWithProfile[];
		timestamp: number;
		ttl: number;
	} | null = null;

	async loadFriendships(forceRefresh = false): Promise<void> {
		const now = Date.now();

		// Use cache if fresh
		if (!forceRefresh && this.cache && now - this.cache.timestamp < this.cache.ttl) {
			this.friendships = this.cache.data;
			this.loading = false;
			return;
		}

		// Fetch fresh
		this.loading = true;
		// ... (existing fetch logic)

		// Update cache
		this.cache = {
			data: enrichedFriendships,
			timestamp: now,
			ttl: 60000 // 1 minute
		};

		this.loading = false;
	}
}
```

**Bénéfices** :

- ✅ Réduit charge DB de ~80% (pour actions rapides)
- ✅ UI plus réactive
- ✅ Simple à implémenter

### Scaling avec Beaucoup d'Amis

#### Analyse Performance Théorique

**Query actuelle** :

```typescript
// Pas de LIMIT - charge TOUT
const { data } = await supabase
	.from('friendships')
	.select('*')
	.or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
	.order('created_at', { ascending: false });
```

**Breakdown des opérations** :

| Opération          | Complexité | 10 amis    | 100 amis   | 1000 amis | 10,000 amis |
| ------------------ | ---------- | ---------- | ---------- | --------- | ----------- |
| DB Query           | O(n)       | 50ms       | 200ms      | 2s        | 20s         |
| Profile Fetch      | O(n)       | 30ms       | 150ms      | 1.5s      | 15s         |
| Presence Fetch     | O(n)       | 20ms       | 100ms      | 1s        | 10s         |
| Enrichment (Map)   | O(n)       | <1ms       | <10ms      | ~50ms     | ~500ms      |
| UI Render (Svelte) | O(n)       | <10ms      | ~100ms     | ~1s       | ~10s        |
| **TOTAL**          | **O(n)**   | **~100ms** | **~550ms** | **~5.5s** | **~55s**    |

**Bottlenecks** :

1. ❌ Pas de LIMIT clause
2. ❌ 3 requêtes séquentielles (waterfall)
3. ❌ Pas de pagination
4. ❌ Tous les DOM nodes rendus d'un coup

#### Recommandation : Cursor-Based Pagination

```typescript
async loadFriendships(cursor?: string, limit = 50): Promise<void> {
    const query = this.supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${this.currentUserId},addressee_id.eq.${this.currentUserId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

    // Cursor-based pagination
    if (cursor) {
        query.lt('created_at', cursor);
    }

    const { data } = await query;

    // Append to existing (infinite scroll)
    this.friendships = [...this.friendships, ...enrichedData];
}
```

**UI Implementation** : Infinite scroll avec `IntersectionObserver`

```svelte
<script>
	let loadMoreTrigger: HTMLDivElement;

	$effect(() => {
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting && !friendsManager.loading) {
				const lastItem = friendsManager.friendships[friendsManager.friendships.length - 1];
				friendsManager.loadFriendships(lastItem.created_at);
			}
		});

		if (loadMoreTrigger) {
			observer.observe(loadMoreTrigger);
		}

		return () => observer.disconnect();
	});
</script>

<!-- ... friends list ... -->

<div bind:this={loadMoreTrigger} class="h-1"></div>
```

### Database Indexes

#### Indexes Existants

**Fichier** : `supabase/migrations/034_create_friendships_table.sql:19-22`

```sql
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_friendships_type ON friendships(friendship_type);
```

#### Index Coverage Analysis

| Query                                            | Index utilisé               | Performance        |
| ------------------------------------------------ | --------------------------- | ------------------ |
| `WHERE requester_id = 'X'`                       | `idx_friendships_requester` | ✅ O(log n)        |
| `WHERE addressee_id = 'X'`                       | `idx_friendships_addressee` | ✅ O(log n)        |
| `WHERE requester_id = 'X' OR addressee_id = 'X'` | ⚠️ Bitmap OR des deux       | Slower             |
| `WHERE status = 'accepted'`                      | `idx_friendships_status`    | ✅ O(log n)        |
| `ORDER BY created_at DESC`                       | ❌ **NO INDEX**             | ❌ O(n log n) sort |

**Problème** : `ORDER BY created_at` fait un sort en mémoire au lieu de scan d'index.

#### Indexes Recommandés

```sql
-- Pour requêtes utilisateur avec tri par date
CREATE INDEX idx_friendships_requester_created
ON friendships(requester_id, created_at DESC);

CREATE INDEX idx_friendships_addressee_created
ON friendships(addressee_id, created_at DESC);

-- Pour accepted friendships filtrées
CREATE INDEX idx_friendships_status_created
ON friendships(status, created_at DESC)
WHERE status = 'accepted';
```

**Bénéfices** :

- ✅ `ORDER BY` devient scan d'index (O(k) au lieu de O(n log n))
- ✅ Partial index pour `accepted` réduit taille (~50% de records)
- ✅ Composite index couvre `WHERE` + `ORDER BY`

**Taille estimée** :

- 1000 friendships × 40 bytes/index = 40 KB
- Négligeable

### N+1 Query Problem

#### Implémentation Actuelle

**Fichier** : `src/lib/stores/friends.svelte.ts:36-70`

```typescript
// Query 1: Get friendships
const { data: friendshipsData } = await this.supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${this.currentUserId},addressee_id.eq.${this.currentUserId}`);

// Extract friend IDs
const friendIds = friendshipsData.map(...);

// Query 2: Get profiles (DEPENDS ON Query 1)
const { data: profilesData } = await this.supabase
    .from('profiles')
    .select('id, full_name, firstname, lastname, avatar_url, role')
    .in('id', friendIds);

// Extract accepted friend IDs
const acceptedFriendIds = friendshipsData
    .filter((f) => f.status === 'accepted')
    .map(...);

// Query 3: Get presence (DEPENDS ON Query 2)
const { data: presenceData } = await this.supabase
    .from('user_presence')
    .select('*')
    .in('user_id', acceptedFriendIds);
```

**Waterfall** :

```
Query 1 (friendships) → 100ms
    ↓
Query 2 (profiles) → 80ms
    ↓
Query 3 (presence) → 60ms
    ↓
Total: 240ms
```

#### Alternative : Single JOIN Query

```sql
SELECT
    f.*,
    -- Friend profile (conditional based on who's requester)
    CASE
        WHEN f.requester_id = :current_user_id THEN
            jsonb_build_object(
                'id', p_addressee.id,
                'full_name', p_addressee.full_name,
                'avatar_url', p_addressee.avatar_url,
                'role', p_addressee.role
            )
        ELSE
            jsonb_build_object(
                'id', p_requester.id,
                'full_name', p_requester.full_name,
                'avatar_url', p_requester.avatar_url,
                'role', p_requester.role
            )
    END as friend_profile,

    -- Presence
    up.status as presence_status,
    up.last_heartbeat

FROM friendships f
LEFT JOIN profiles p_requester ON f.requester_id = p_requester.id
LEFT JOIN profiles p_addressee ON f.addressee_id = p_addressee.id
LEFT JOIN user_presence up ON (
    up.user_id = CASE
        WHEN f.requester_id = :current_user_id THEN f.addressee_id
        ELSE f.requester_id
    END
)
WHERE f.requester_id = :current_user_id OR f.addressee_id = :current_user_id
ORDER BY f.created_at DESC
LIMIT 50;
```

**Latence** : ~80ms (single query)

**Bénéfices** :

- ✅ 3× plus rapide (240ms → 80ms)
- ✅ Atomic snapshot (pas de race conditions)
- ✅ Database optimise JOIN

**Trade-off** :

- ❌ SQL plus complexe
- ❌ Typing manuel (Supabase ne type pas les JOINs complexes)

**Recommandation** : Utiliser JOIN en production, garder separate queries en dev pour simplicité.

### Debouncing/Throttling

#### État Actuel

❌ **PAS DE DEBOUNCING** implémenté

**Recherche** (`AddFriend.svelte:107`) :

```svelte
<Input
	type="text"
	placeholder="Rechercher par nom..."
	bind:value={searchQuery}
	onkeydown={(e) => e.key === 'Enter' && handleSearch()}
/>
```

✅ **Bon** : Recherche uniquement sur Enter (pas keystroke)
❌ **Manquant** : Pas de debounce si auto-search ajouté

#### Recommandation : Debounce Utility

```typescript
// src/lib/utils/debounce.ts
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return function (this: any, ...args: Parameters<T>) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}
```

**Usage** :

```typescript
import { debounce } from '$lib/utils/debounce';

const debouncedSearch = debounce(async (query: string) => {
	searchResults = await friendsManager.searchUsers(query);
}, 300); // 300ms delay

let searchQuery = $state('');

$effect(() => {
	if (searchQuery.length >= 2) {
		debouncedSearch(searchQuery);
	} else {
		searchResults = [];
	}
});
```

---

## Database Schema

### Table: friendships

**Fichier** : `supabase/migrations/034_create_friendships_table.sql:2-16`

```sql
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  friendship_type text NOT NULL CHECK (friendship_type IN ('classmate', 'mentor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id),
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
);
```

**Columns** :

| Column            | Type        | Nullable | Default           | Description                           |
| ----------------- | ----------- | -------- | ----------------- | ------------------------------------- |
| `id`              | uuid        | NO       | gen_random_uuid() | Primary key                           |
| `requester_id`    | uuid        | NO       | -                 | User qui envoie demande               |
| `addressee_id`    | uuid        | NO       | -                 | User qui reçoit demande               |
| `status`          | text        | NO       | -                 | `pending` \| `accepted` \| `rejected` |
| `friendship_type` | text        | NO       | -                 | `classmate` \| `mentor`               |
| `created_at`      | timestamptz | NO       | now()             | Date création                         |
| `updated_at`      | timestamptz | NO       | now()             | Date dernière modif                   |

**Constraints** :

- `unique_friendship`: Empêche doublons (A → B unique)
- `no_self_friendship`: Empêche self-friending
- Foreign keys: Cascade delete si user supprimé

**Indexes** : Voir section [Database Indexes](#database-indexes)

**Size Estimation** :

- ~100 bytes per row
- 1000 friendships = ~100 KB
- Négligeable

### Table: user_presence

Voir section [Data Storage - user_presence](#data-storage---user_presence)

---

## Notifications (Manquantes)

### État Actuel

❌ **AUCUNE NOTIFICATION** pour demandes d'ami

**Ce qui existe** :

- ✅ Badge rouge compte sur onglet "Demandes" (FE only)
- ❌ Pas de notification in-app
- ❌ Pas de notification push
- ❌ Pas d'email
- ❌ Pas de toast temps réel
- ❌ Pas de WebSocket broadcast pour nouvelles demandes

**Alerte actuelle** :

```svelte
<!-- src/routes/(protected)/dashboard/friends/+page.svelte:71-77 -->
<Tabs.Trigger value="requests">
	<Bell class="size-4" />
	Demandes
	{#if pendingIncomingCount > 0}
		<span class="badge-red">{pendingIncomingCount}</span>
	{/if}
</Tabs.Trigger>
```

**Problème** : User doit aller sur page `/dashboard/friends` pour voir

### Recommandation : Database Trigger

```sql
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' AND (TG_OP = 'INSERT') THEN
        -- Nouvelle demande
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            link,
            metadata
        )
        VALUES (
            NEW.addressee_id,
            'friend_request',
            'Nouvelle demande d''ami',
            (SELECT full_name FROM profiles WHERE id = NEW.requester_id) ||
                ' vous a envoyé une demande d''ami',
            '/dashboard/friends?tab=requests',
            jsonb_build_object(
                'friendship_id', NEW.id,
                'requester_id', NEW.requester_id,
                'friendship_type', NEW.friendship_type
            )
        );

    ELSIF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Demande acceptée
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            link,
            metadata
        )
        VALUES (
            NEW.requester_id,
            'friend_request_accepted',
            'Demande d''ami acceptée',
            (SELECT full_name FROM profiles WHERE id = NEW.addressee_id) ||
                ' a accepté votre demande',
            '/dashboard/friends',
            jsonb_build_object(
                'friendship_id', NEW.id,
                'friend_id', NEW.addressee_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friendships_notification_trigger
AFTER INSERT OR UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();
```

### WebSocket Real-Time Notification

```typescript
// Dans websocket-server.ts
case 'friend_request_sent': {
    if (!userId || !message.addresseeId) return;

    const addresseeWs = connections.get(message.addresseeId);
    if (addresseeWs && addresseeWs.readyState === WebSocket.OPEN) {
        addresseeWs.send(JSON.stringify({
            type: 'friend_request_received',
            requesterId: userId,
            friendshipId: message.friendshipId,
            friendshipType: message.friendshipType
        }));
    }
    break;
}
```

---

## Limites & Quotas (Manquants)

### État Actuel

❌ **AUCUNE LIMITE** implémentée

| Limite                   | Statut      | Recommandation |
| ------------------------ | ----------- | -------------- |
| Max friends total        | ❌ Illimité | ✅ 500         |
| Friend requests per hour | ❌ Illimité | ✅ 10          |
| Friend requests per day  | ❌ Illimité | ✅ 50          |
| Search requests per hour | ❌ Illimité | ✅ 20          |
| Cooldown after rejection | ❌ Aucun    | ✅ 30 jours    |

### Vulnérabilité Spam Critique

**Attack vector** :

```typescript
// Actuellement POSSIBLE :
for (let i = 0; i < 1000; i++) {
	await friendsManager.sendFriendRequest(randomUserId, 'classmate');
}
// ✅ SUCCÈS - Aucune protection
```

### Recommandation : Rate Limiting

**Utiliser rate limiter existant** :

```typescript
// src/lib/server/rateLimiter.ts existe déjà
import { checkRateLimit } from '$lib/server/rateLimiter';

async sendFriendRequest(friendId: string, type: FriendshipType): Promise<boolean> {
    const rateLimitKey = `friend_request:${this.currentUserId}`;

    // Check: 10 requests per hour
    const hourlyCheck = await checkRateLimit(rateLimitKey, 10, 3600000);
    if (!hourlyCheck.allowed) {
        this.error = 'Trop de demandes. Réessayez dans une heure.';
        return false;
    }

    // Check: 50 requests per day
    const dailyKey = `friend_request_daily:${this.currentUserId}`;
    const dailyCheck = await checkRateLimit(dailyKey, 50, 86400000);
    if (!dailyCheck.allowed) {
        this.error = 'Limite quotidienne atteinte. Réessayez demain.';
        return false;
    }

    // ... (existing logic)
}
```

---

## Historique & Analytics (Manquants)

### État Actuel

❌ **Hard Delete** → Pas d'historique
❌ **Pas d'Analytics** avancées

**Stats basiques** : `admin/friendships/+page.server.ts:96-101`

```typescript
const stats = {
	total: friendships.length,
	accepted: friendships.filter((f) => f.status === 'accepted').length,
	pending: friendships.filter((f) => f.status === 'pending').length,
	rejected: friendships.filter((f) => f.status === 'rejected').length // Calculé mais pas affiché
};
```

### Recommandation : Soft Delete

```sql
ALTER TABLE friendships ADD COLUMN deleted_at timestamptz;
ALTER TABLE friendships ADD COLUMN deleted_by uuid REFERENCES profiles(id);

-- Update RLS policies
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (
    (auth.uid() = requester_id OR auth.uid() = addressee_id)
    AND deleted_at IS NULL
  );
```

### Recommandation : Analytics View

```sql
CREATE VIEW friendship_analytics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_friendships,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'rejected') * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as rejection_rate_percent,
    COUNT(*) FILTER (WHERE friendship_type = 'classmate') as classmate_count,
    COUNT(*) FILTER (WHERE friendship_type = 'mentor') as mentor_count,
    AVG(
        EXTRACT(EPOCH FROM (updated_at - created_at))
    ) FILTER (WHERE status IN ('accepted', 'rejected')) as avg_response_time_seconds
FROM friendships
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

---

## Intégrations

### Chat System

✅ **Intégration partielle**

**Validation Friends** : `src/lib/components/chat/NewChatDialog.svelte:62-87`

```typescript
// Get accepted friendships
const { data: friendships } = await supabase
	.from('friendships')
	.select('requester_id, addressee_id')
	.eq('status', 'accepted');

const friendIds = friendships.map((f) =>
	f.requester_id === user.id ? f.addressee_id : f.requester_id
);

// Get friend profiles
const { data: profiles } = await supabase
	.from('profiles')
	.select('id, full_name, avatar_url')
	.in('id', friendIds);

friends = profiles || [];
```

**Database Validation** :

```sql
CREATE OR REPLACE FUNCTION validate_1on1_chat_creation(
  p_user1_id uuid,
  p_user2_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = p_user1_id AND addressee_id = p_user2_id)
      OR (requester_id = p_user2_id AND addressee_id = p_user1_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

✅ **Protection** : Database-level validation empêche chat non-friends

### Class System

⚠️ **Intégration indirecte**

**Modération enseignants** : Filtre par classe exists
**Manque** :

- ❌ Restriction friendships à même classe
- ❌ Cross-class approval requirement
- ❌ Badge classe dans friend list

### Rewards System

❌ **Aucune intégration**

**Manque** :

- ❌ Reward gidouilles pour faire amis
- ❌ Gift gidouilles/VIP cards aux amis
- ❌ Friend referral bonus
- ❌ Leaderboard "Most Connected"

---

## Changelog

| Date       | Changement                                |
| ---------- | ----------------------------------------- |
| 2025-01-09 | Documentation technique initiale complète |

---

**Maintenu par** : Équipe de développement UbuMaths
**Dernière mise à jour** : 2025-01-09
