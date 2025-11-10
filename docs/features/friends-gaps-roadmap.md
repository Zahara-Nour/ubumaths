# Friends System - Gaps & Roadmap

> Guide complet des fonctionnalités manquantes, priorités, et plan d'implémentation

**Date** : 2025-01-09
**Status** : Planification

---

## Table des Matières

- [Executive Summary](#executive-summary)
- [Gaps Critiques (P0)](#gaps-critiques-p0)
- [Gaps Importants (P1)](#gaps-importants-p1)
- [Enhancements (P2)](#enhancements-p2)
- [Features Futures (P3)](#features-futures-p3)
- [Roadmap par Phase](#roadmap-par-phase)
- [Estimation Globale](#estimation-globale)
- [Checklist d'Implémentation](#checklist-dimplémentation)

---

## Executive Summary

### Note Actuelle : 7/10

**Forces** :

- ✅ WebSocket temps réel solide
- ✅ RLS policies privacy-first
- ✅ Modération enseignants fonctionnelle
- ✅ Code moderne (Svelte 5, TypeScript)

**Faiblesses** :

- ❌ Pas de rate limiting → Spam possible
- ❌ Pas de notifications → Découvrabilité médiocre
- ❌ Pas de caching → Performance limitée
- ❌ Pas de pagination → Problème à 1000+ amis

### Priorités Globales

| Priorité | Focus                 | Timeline     |
| -------- | --------------------- | ------------ |
| **P0**   | Sécurité & Compliance | 2-3 jours    |
| **P1**   | Performance & Scaling | 3-5 jours    |
| **P2**   | UX & Features         | 1-2 semaines |
| **P3**   | Nice to Have          | TBD          |

### Effort Total Estimé

- **Phase 1 (P0)** : 2-3 jours (16-24h)
- **Phase 2 (P1)** : 3-5 jours (24-40h)
- **Phase 3 (P2)** : 1-2 semaines (40-80h)
- **Total minimal** : 80-144 heures

---

## Gaps Critiques (P0)

### 1. Rate Limiting

**Statut** : ❌ Manquant
**Impact** : **Critique** - Vulnérabilité spam
**Priorité** : **P0**
**Effort** : 4-6 heures

#### Problème

```typescript
// Actuellement POSSIBLE sans blocage :
for (let i = 0; i < 1000; i++) {
	await friendsManager.sendFriendRequest(randomUserId, 'classmate');
}
// ✅ SUCCÈS - Aucune protection
```

**Attack vectors** :

- Spam massif de demandes (1000+ par minute)
- Database scraping via recherche
- Harcèlement ciblé d'un user
- Charge DB excessive

#### Solution

**Utiliser rate limiter existant** : `src/lib/server/rateLimiter.ts`

**Fichiers à modifier** :

1. `src/lib/stores/friends.svelte.ts`
2. `src/lib/server/validation/friends.ts` (nouveau)

**Implémentation** :

```typescript
// friends.svelte.ts
import { checkRateLimit } from '$lib/server/rateLimiter';

async sendFriendRequest(friendId: string, type: FriendshipType): Promise<boolean> {
    // 1. Rate limit: 10 requests/hour
    const hourlyKey = `friend_request:${this.currentUserId}`;
    const hourlyCheck = await checkRateLimit(hourlyKey, 10, 3600000);

    if (!hourlyCheck.allowed) {
        this.error = `Trop de demandes. Réessayez dans ${Math.ceil(hourlyCheck.retryAfter / 60000)} minutes.`;
        return false;
    }

    // 2. Rate limit: 50 requests/day
    const dailyKey = `friend_request_daily:${this.currentUserId}`;
    const dailyCheck = await checkRateLimit(dailyKey, 50, 86400000);

    if (!dailyCheck.allowed) {
        this.error = 'Limite quotidienne atteinte. Réessayez demain.';
        return false;
    }

    // 3. Rate limit search: 20/hour
    // (dans searchUsers method)

    // Proceed...
}
```

**Limites recommandées** :

| Action                | Hourly | Daily | Reasoning            |
| --------------------- | ------ | ----- | -------------------- |
| Send friend request   | 10     | 50    | Évite spam massif    |
| Search users          | 20     | 100   | Évite scraping       |
| Accept/reject request | 50     | -     | Légitime si beaucoup |

**Tests** :

- [ ] Vérifier blocage après 10 requests/hour
- [ ] Vérifier message d'erreur user-friendly
- [ ] Vérifier reset après 1 heure
- [ ] Tester edge case : limite atteinte puis nouvelle session

**Estimation** : 4-6 heures

---

### 2. Rejection Cooldown

**Statut** : ❌ Manquant
**Impact** : **Critique** - Harcèlement possible
**Priorité** : **P0**
**Effort** : 3-4 heures

#### Problème

User peut re-spam après rejet :

```typescript
1. A → demande à B (pending)
2. B → refuse (rejected)
3. A → unfriend (DELETE)
4. A → renvoie immédiatement ✅ SUCCÈS
```

Pas de conséquence pour abus.

#### Solution

**Metadata-based tracking** avec cooldown 30 jours

**Fichiers à modifier** :

1. `supabase/migrations/XXX_add_friendship_metadata.sql` (nouveau)
2. `src/lib/stores/friends.svelte.ts`

**Migration** :

```sql
-- Add metadata column
ALTER TABLE friendships ADD COLUMN metadata jsonb DEFAULT '{}';

-- Update reject logic to store timestamp
CREATE OR REPLACE FUNCTION update_rejection_metadata()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        NEW.metadata = jsonb_set(
            COALESCE(NEW.metadata, '{}'::jsonb),
            '{rejected_at}',
            to_jsonb(now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rejection_timestamp
BEFORE UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION update_rejection_metadata();
```

**Check cooldown** :

```typescript
async sendFriendRequest(friendId: string, type: FriendshipType): Promise<boolean> {
    // Check for recent rejection
    const { data: rejection } = await this.supabase
        .from('friendships')
        .select('metadata')
        .eq('requester_id', this.currentUserId)
        .eq('addressee_id', friendId)
        .eq('status', 'rejected')
        .maybeSingle();

    if (rejection?.metadata?.rejected_at) {
        const rejectedAt = new Date(rejection.metadata.rejected_at);
        const cooldownEnd = new Date(rejectedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (new Date() < cooldownEnd) {
            this.error = `Demande refusée. Vous pourrez réessayer le ${cooldownEnd.toLocaleDateString('fr-FR')}`;
            return false;
        }
    }

    // Proceed...
}
```

**Alternative** : Audit table pour tracker rejections même après DELETE

**Tests** :

- [ ] Reject → Cooldown actif 30 jours
- [ ] Vérifier message avec date precise
- [ ] Edge case: DELETE puis re-request
- [ ] Vérifier cooldown expire après 30j

**Estimation** : 3-4 heures

---

### 3. Audit Logs

**Statut** : ❌ Manquant
**Impact** : **Critique** - Compliance (GDPR)
**Priorité** : **P0**
**Effort** : 6-8 heures

#### Problème

- Teacher delete friendship → Pas de trace qui/quand
- Impossible de debug disputes
- Pas de accountability
- GDPR requires audit trail pour data deletion

#### Solution

**Audit table complète** avec triggers automatiques

**Fichiers à créer** :

1. `supabase/migrations/XXX_create_friendship_audit.sql`

**Schema** :

```sql
CREATE TABLE friendship_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id uuid,  -- Peut être null si deleted
  action text NOT NULL CHECK (action IN (
    'created',
    'accepted',
    'rejected',
    'deleted',
    'teacher_deleted',
    'restored'
  )),
  performed_by uuid REFERENCES profiles(id),
  affected_user_id uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_friendship_audit_friendship ON friendship_audit(friendship_id);
CREATE INDEX idx_friendship_audit_user ON friendship_audit(performed_by);
CREATE INDEX idx_friendship_audit_action ON friendship_audit(action);
CREATE INDEX idx_friendship_audit_created ON friendship_audit(created_at DESC);

-- RLS Policies
ALTER TABLE friendship_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON friendship_audit FOR SELECT
  USING (performed_by = auth.uid() OR affected_user_id = auth.uid());

CREATE POLICY "Teachers can view all audit logs"
  ON friendship_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );
```

**Trigger automatique** :

```sql
CREATE OR REPLACE FUNCTION log_friendship_action()
RETURNS TRIGGER AS $$
DECLARE
    action_type text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO friendship_audit (
            friendship_id, action, performed_by, affected_user_id, metadata
        ) VALUES (
            NEW.id,
            'created',
            NEW.requester_id,
            NEW.addressee_id,
            jsonb_build_object('friendship_type', NEW.friendship_type)
        );

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            INSERT INTO friendship_audit (
                friendship_id, action, performed_by, affected_user_id
            ) VALUES (
                NEW.id, 'accepted', NEW.addressee_id, NEW.requester_id
            );

        ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            INSERT INTO friendship_audit (
                friendship_id, action, performed_by, affected_user_id
            ) VALUES (
                NEW.id, 'rejected', NEW.addressee_id, NEW.requester_id
            );
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- Determine if teacher deleted
        action_type := CASE
            WHEN EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role = 'teacher'
            ) THEN 'teacher_deleted'
            ELSE 'deleted'
        END;

        INSERT INTO friendship_audit (
            friendship_id, action, performed_by, metadata
        ) VALUES (
            OLD.id,
            action_type,
            auth.uid(),
            jsonb_build_object(
                'requester_id', OLD.requester_id,
                'addressee_id', OLD.addressee_id,
                'status', OLD.status,
                'friendship_type', OLD.friendship_type
            )
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER friendship_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON friendships
FOR EACH ROW
EXECUTE FUNCTION log_friendship_action();
```

**UI pour enseignants** :

```svelte
<!-- Teacher audit log viewer -->
<Card>
	<Card.Header>
		<Card.Title>Historique d'actions</Card.Title>
	</Card.Header>
	<Card.Content>
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Date</TableHead>
					<TableHead>Action</TableHead>
					<TableHead>Utilisateur</TableHead>
					<TableHead>Détails</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each auditLogs as log}
					<TableRow>
						<TableCell>{formatDate(log.created_at)}</TableCell>
						<TableCell>{getActionBadge(log.action)}</TableCell>
						<TableCell>{log.performed_by_name}</TableCell>
						<TableCell>{log.metadata}</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	</Card.Content>
</Card>
```

**Tests** :

- [ ] Create friendship → Audit log created
- [ ] Accept/reject → Log avec bon performer
- [ ] Delete par user → action='deleted'
- [ ] Delete par teacher → action='teacher_deleted'
- [ ] Query audit logs (teacher)

**Estimation** : 6-8 heures

---

## Gaps Importants (P1)

### 4. Notifications Système

**Statut** : ❌ Manquant
**Impact** : **High** - UX médiocre
**Priorité** : **P1**
**Effort** : 8-10 heures

#### Problème

- User ne sait pas qu'il a reçu demande
- Doit aller manuellement sur `/dashboard/friends`
- Découvrabilité très faible

#### Solution

**DB Trigger + WebSocket broadcast** + In-app notifications

**Fichiers à créer/modifier** :

1. `supabase/migrations/XXX_add_friendship_notifications.sql`
2. `src/lib/server/websocket-server.ts`
3. `src/lib/components/notifications/NotificationCenter.svelte` (si existe)

**Trigger DB** :

```sql
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Nouvelle demande
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        INSERT INTO notifications (
            user_id, type, title, message, link, metadata
        ) VALUES (
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

    -- Demande acceptée
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        INSERT INTO notifications (
            user_id, type, title, message, link, metadata
        ) VALUES (
            NEW.requester_id,
            'friend_request_accepted',
            'Demande acceptée',
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

CREATE TRIGGER friendship_notifications_trigger
AFTER INSERT OR UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();
```

**WebSocket broadcast** :

```typescript
// websocket-server.ts
case 'friend_request_sent': {
    const addresseeWs = connections.get(message.addresseeId);
    if (addresseeWs?.readyState === WebSocket.OPEN) {
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

**Tests** :

- [ ] Send request → Notification créée en DB
- [ ] Accept request → Requester notifié
- [ ] WebSocket broadcast temps réel
- [ ] Badge notification count updated

**Estimation** : 8-10 heures

---

### 5. Pagination & Infinite Scroll

**Statut** : ❌ Manquant
**Impact** : **High** - Problème à 1000+ amis
**Priorité** : **P1**
**Effort** : 6-8 heures

#### Problème

```typescript
// Charge TOUT d'un coup
const { data } = await supabase.from('friendships').select('*'); // ❌ Pas de LIMIT
```

**Performance** :

- 1000 amis = 5.5 secondes
- 10,000 amis = 55 secondes ⚠️

#### Solution

**Cursor-based pagination** + Infinite scroll

**Fichiers à modifier** :

1. `src/lib/stores/friends.svelte.ts`
2. `src/lib/components/FriendsList.svelte`

**Backend** :

```typescript
class FriendsManager {
	private cursor: string | null = null;
	private hasMore = true;
	readonly PAGE_SIZE = 50;

	async loadFriendships(loadMore = false): Promise<void> {
		if (!loadMore) {
			this.cursor = null;
			this.friendships = [];
		}

		if (!this.hasMore && loadMore) return;

		this.loading = true;

		const query = this.supabase
			.from('friendships')
			.select('*')
			.or(`requester_id.eq.${this.currentUserId},addressee_id.eq.${this.currentUserId}`)
			.order('created_at', { ascending: false })
			.limit(this.PAGE_SIZE);

		if (this.cursor) {
			query.lt('created_at', this.cursor);
		}

		const { data } = await query;

		// Enrich data...
		const enriched = await this.enrichFriendships(data);

		if (loadMore) {
			this.friendships = [...this.friendships, ...enriched];
		} else {
			this.friendships = enriched;
		}

		this.hasMore = data.length === this.PAGE_SIZE;
		if (data.length > 0) {
			this.cursor = data[data.length - 1].created_at;
		}

		this.loading = false;
	}
}
```

**Frontend (Infinite Scroll)** :

```svelte
<script>
	let loadMoreTrigger: HTMLDivElement;

	$effect(() => {
		if (!loadMoreTrigger) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !friendsManager.loading && friendsManager.hasMore) {
					friendsManager.loadFriendships(true);
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(loadMoreTrigger);
		return () => observer.disconnect();
	});
</script>

<!-- Friends list -->
{#each friendsManager.friendships as friend}
	<FriendCard {friend} />
{/each}

{#if friendsManager.hasMore}
	<div bind:this={loadMoreTrigger} class="flex h-20 items-center justify-center">
		{#if friendsManager.loading}
			<Spinner />
		{/if}
	</div>
{:else}
	<p class="text-center text-muted-foreground">Fin de la liste</p>
{/if}
```

**Tests** :

- [ ] Load initial 50 items
- [ ] Scroll → Load next 50
- [ ] Vérifier pas de doublons
- [ ] Edge case: moins de 50 items total
- [ ] Performance avec 1000+ amis

**Estimation** : 6-8 heures

---

### 6. Caching avec TTL

**Statut** : ❌ Manquant
**Impact** : **Medium** - Charge DB excessive
**Priorité** : **P1**
**Effort** : 3-4 heures

#### Problème

Chaque action reload tout :

- Accept → 3 queries
- Reject → 3 queries
- Unfriend → 3 queries

10 actions = 30 queries DB

#### Solution

**Simple TTL cache** en mémoire

**Fichier** : `src/lib/stores/friends.svelte.ts`

```typescript
class FriendsManager {
    private cache: {
        data: FriendshipWithProfile[];
        timestamp: number;
        ttl: number;
    } | null = null;

    private readonly CACHE_TTL = 60000; // 1 minute

    async loadFriendships(forceRefresh = false): Promise<void> {
        const now = Date.now();

        // Use cache if fresh
        if (!forceRefresh && this.cache && (now - this.cache.timestamp) < this.CACHE_TTL) {
            this.friendships = this.cache.data;
            this.pendingIncoming = this.cache.data.filter(...);
            // ...
            return;
        }

        // Fetch fresh data
        this.loading = true;
        // ... (existing fetch logic)

        // Update cache
        this.cache = {
            data: enrichedFriendships,
            timestamp: now,
            ttl: this.CACHE_TTL
        };

        this.loading = false;
    }

    // Invalide cache après mutation
    private invalidateCache(): void {
        this.cache = null;
    }

    async sendFriendRequest(...): Promise<boolean> {
        // ... (send logic)
        this.invalidateCache();
        await this.loadFriendships();
    }
}
```

**Benefits** :

- ✅ Réduit DB load ~80%
- ✅ UI plus réactive
- ✅ Simple (pas besoin Redis)

**Tests** :

- [ ] Load → Cache set
- [ ] Reload < 1min → Use cache
- [ ] Reload > 1min → Fresh fetch
- [ ] Mutation → Cache invalidated

**Estimation** : 3-4 heures

---

### 7. Validation Zod

**Statut** : ❌ Manquant
**Impact** : **Medium** - Best practice
**Priorité** : **P1**
**Effort** : 2-3 heures

#### Solution

**Create validation schemas** : `src/lib/server/validation/friends.ts`

```typescript
import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
	friendId: z.string().uuid('ID ami invalide'),
	friendshipType: z.enum(['classmate', 'mentor'], {
		errorMap: () => ({ message: 'Type invalide' })
	})
});

export const searchUsersSchema = z.object({
	query: z.string().min(2, 'Min 2 caractères').max(50, 'Max 50 caractères')
});
```

**Tests** :

- [ ] Invalid UUID → Error message
- [ ] Invalid enum → Error message
- [ ] Query too short → Error message

**Estimation** : 2-3 heures

---

## Enhancements (P2)

### 8. Analytics Dashboard Enseignants

**Priorité** : **P2**
**Effort** : 12-16 heures

Features :

- Rejection rate par étudiant
- Top 10 étudiants connectés
- Cross-class friendships count
- Timeline (chart)
- Export CSV

**Estimation** : 12-16 heures

---

### 9. Friend Profile Page

**Priorité** : **P2**
**Effort** : 10-12 heures

Features :

- Voir profil ami
- Stats publiques (opt-in)
- Achievements partagés
- Activity feed

**Estimation** : 10-12 heures

---

### 10. Gifting System

**Priorité** : **P2**
**Effort** : 16-20 heures

Features :

- Gift gidouilles to friends
- Gift VIP cards
- Gift history
- Constraints (max per day)

**Estimation** : 16-20 heures

---

## Features Futures (P3)

### 11. Friend Leaderboard

**Priorité** : **P3**
**Effort** : 8-10 heures

Compare with friends :

- Gidouilles earned this week
- Exercises completed
- Assessment scores

---

### 12. Friend Challenges

**Priorité** : **P3**
**Effort** : 20-24 heures

- Math duels
- Race to complete exercises
- Collaborative puzzles

---

### 13. Multi-Device Presence

**Priorité** : **P3**
**Effort** : 12-16 heures

Support multiple devices online simultaneously

---

## Roadmap par Phase

### Phase 1 : Sécurité & Compliance (P0)

**Timeline** : 2-3 jours
**Effort total** : 16-24 heures

| Task                  | Effort | Dependencies |
| --------------------- | ------ | ------------ |
| 1. Rate Limiting      | 4-6h   | -            |
| 2. Rejection Cooldown | 3-4h   | -            |
| 3. Audit Logs         | 6-8h   | -            |
| **Tests & QA**        | 3-6h   | All above    |

**Deliverables** :

- ✅ Rate limiting actif (10/h, 50/day)
- ✅ Cooldown 30j après rejet
- ✅ Audit logs complets
- ✅ Tests passing

---

### Phase 2 : Performance & Scaling (P1)

**Timeline** : 3-5 jours
**Effort total** : 24-40 heures

| Task                  | Effort | Dependencies |
| --------------------- | ------ | ------------ |
| 4. Notifications      | 8-10h  | Audit logs   |
| 5. Pagination         | 6-8h   | -            |
| 6. Caching            | 3-4h   | -            |
| 7. Validation Zod     | 2-3h   | -            |
| **Database Indexes**  | 2-3h   | -            |
| **JOIN Optimization** | 3-4h   | -            |
| **Tests & QA**        | 4-8h   | All above    |

**Deliverables** :

- ✅ Notifications temps réel
- ✅ Pagination infinite scroll
- ✅ Cache TTL 60s
- ✅ Input validation Zod
- ✅ Performance optimisée

---

### Phase 3 : UX & Features (P2)

**Timeline** : 1-2 semaines
**Effort total** : 40-80 heures

| Task                   | Effort | Dependencies        |
| ---------------------- | ------ | ------------------- |
| 8. Analytics Dashboard | 12-16h | Audit logs          |
| 9. Friend Profile Page | 10-12h | -                   |
| 10. Gifting System     | 16-20h | Rewards integration |
| **Tests & QA**         | 8-12h  | All above           |

**Deliverables** :

- ✅ Analytics pour enseignants
- ✅ Pages profil amis
- ✅ Système de cadeaux
- ✅ UX améliorée

---

## Estimation Globale

### Par Priorité

| Priorité  | Tasks | Effort Total | Timeline     |
| --------- | ----- | ------------ | ------------ |
| **P0**    | 3     | 16-24h       | 2-3 jours    |
| **P1**    | 4     | 24-40h       | 3-5 jours    |
| **P2**    | 3     | 40-80h       | 1-2 semaines |
| **P3**    | 3     | 40-50h       | TBD          |
| **Total** | 13    | 120-194h     | 3-4 semaines |

### Par Phase

| Phase | Focus       | Effort | Timeline |
| ----- | ----------- | ------ | -------- |
| **1** | Sécurité    | 16-24h | Week 1   |
| **2** | Performance | 24-40h | Week 2   |
| **3** | Features    | 40-80h | Week 3-4 |

### Criticalité vs Effort

```
High Impact, Low Effort (DO FIRST):
  ├─ Rate Limiting (4-6h) ⭐⭐⭐
  ├─ Caching (3-4h) ⭐⭐⭐
  └─ Validation Zod (2-3h) ⭐⭐

High Impact, Medium Effort (DO NEXT):
  ├─ Rejection Cooldown (3-4h)
  ├─ Pagination (6-8h)
  └─ Notifications (8-10h)

High Impact, High Effort (PLAN CAREFULLY):
  └─ Audit Logs (6-8h)

Medium Impact, High Effort (LATER):
  ├─ Analytics Dashboard (12-16h)
  ├─ Friend Profile (10-12h)
  └─ Gifting System (16-20h)
```

---

## Checklist d'Implémentation

### Pre-Implementation

- [ ] Review gaps analysis complète
- [ ] Prioritize P0 items
- [ ] Create feature branch `feature/friends-improvements`
- [ ] Setup testing environment

### Phase 1 - Sécurité (P0)

**Rate Limiting** :

- [ ] Implement hourly limit (10 requests)
- [ ] Implement daily limit (50 requests)
- [ ] Add user-friendly error messages
- [ ] Test edge cases
- [ ] Add E2E tests

**Rejection Cooldown** :

- [ ] Create migration (metadata column)
- [ ] Implement cooldown check (30 days)
- [ ] Update reject logic
- [ ] Show cooldown end date to user
- [ ] Test edge cases

**Audit Logs** :

- [ ] Create audit table migration
- [ ] Implement triggers (INSERT/UPDATE/DELETE)
- [ ] Add RLS policies
- [ ] Create teacher audit log viewer UI
- [ ] Test all actions logged

### Phase 2 - Performance (P1)

**Notifications** :

- [ ] Create notification trigger
- [ ] Integrate with existing notification system
- [ ] Add WebSocket broadcast
- [ ] Update notification center
- [ ] Test real-time delivery

**Pagination** :

- [ ] Implement cursor-based pagination backend
- [ ] Add infinite scroll frontend
- [ ] Handle edge cases (< 50 items)
- [ ] Test with 1000+ friendships
- [ ] Performance benchmarks

**Caching** :

- [ ] Implement TTL cache (60s)
- [ ] Add cache invalidation on mutations
- [ ] Test cache hit/miss
- [ ] Monitor cache effectiveness

**Validation** :

- [ ] Create Zod schemas
- [ ] Integrate in friends.svelte.ts
- [ ] User-friendly error messages
- [ ] Test all validation paths

**Database** :

- [ ] Add composite indexes
- [ ] Optimize with JOIN query
- [ ] Benchmark query performance
- [ ] Monitor slow query log

### Phase 3 - Features (P2)

**Analytics Dashboard** :

- [ ] Create analytics SQL views
- [ ] Build teacher dashboard UI
- [ ] Add charts (rejection rate, timeline)
- [ ] Export CSV functionality
- [ ] Test with real data

**Friend Profile** :

- [ ] Create profile page route
- [ ] Fetch friend public data
- [ ] Add privacy controls
- [ ] Display achievements/stats
- [ ] Test privacy settings

**Gifting System** :

- [ ] Create gift_transactions table
- [ ] Implement gift gidouilles
- [ ] Implement gift VIP cards
- [ ] Add daily limits
- [ ] Create gift history UI

### Post-Implementation

- [ ] Run full test suite
- [ ] Performance audit
- [ ] Security audit
- [ ] Code review
- [ ] Update documentation
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Monitor production metrics

---

## Success Criteria

### Phase 1 (P0) Success

- ✅ Zero spam incidents
- ✅ Zero harassment reports
- ✅ 100% actions logged
- ✅ Compliance requirements met

### Phase 2 (P1) Success

- ✅ < 500ms page load (1000 friends)
- ✅ 80% cache hit rate
- ✅ 90% users see notifications within 5s
- ✅ Zero input validation errors in production

### Phase 3 (P2) Success

- ✅ Teachers use analytics weekly
- ✅ 50%+ users visit friend profiles
- ✅ 10%+ users send gifts monthly
- ✅ User satisfaction > 8/10

---

## Changelog

| Date       | Changement                                 |
| ---------- | ------------------------------------------ |
| 2025-01-09 | Roadmap initiale complète avec estimations |

---

**Maintenu par** : Équipe de développement UbuMaths
**Dernière mise à jour** : 2025-01-09
**Prochaine revue** : Après Phase 1 completion
