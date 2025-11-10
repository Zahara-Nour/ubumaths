# Friends System - Modération et Sécurité

> Documentation complète des capacités de modération enseignants et analyse de sécurité

**Date** : 2025-01-09
**Audience** : Enseignants, Administrateurs, Développeurs

---

## Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Capacités de modération enseignants](#capacités-de-modération-enseignants)
- [Permissions RLS détaillées](#permissions-rls-détaillées)
- [Gaps de sécurité critiques](#gaps-de-sécurité-critiques)
- [Protections implémentées](#protections-implémentées)
- [Recommandations de sécurité](#recommandations-de-sécurité)

---

## Vue d'ensemble

Le système Friends implémente un **modèle de sécurité privacy-first** avec des permissions RLS (Row-Level Security) strictes. Les enseignants disposent de capacités de modération pour surveiller et gérer les amitiés inappropriées.

### Principes de sécurité

1. **Privacy-First** : Les amitiés sont visibles uniquement par les parties concernées
2. **Friends-Only Visibility** : Présence en ligne visible uniquement pour amis acceptés
3. **Teacher Oversight** : Enseignants peuvent voir et modérer toutes les amitiés étudiantes
4. **Database-Enforced** : RLS policies au niveau database (pas contournable)

### Statut actuel

| Aspect                 | Statut           | Note                         |
| ---------------------- | ---------------- | ---------------------------- |
| RLS Policies           | ✅ Implémentées  | Solides                      |
| Modération enseignants | ✅ Fonctionnelle | Basique mais efficace        |
| Audit logs             | ❌ Manquant      | **P1 - Critique pour debug** |
| Rate limiting          | ❌ Manquant      | **P0 - Vulnérabilité spam**  |
| Input validation (Zod) | ❌ Manquant      | **P1 - Best practice**       |
| Prévention proactive   | ❌ Manquant      | **P2 - Nice to have**        |

---

## Capacités de modération enseignants

### Page de modération

**URL** : `/dashboard/admin/friendships`
**Accès** : Enseignants et Administrateurs uniquement

**Fichiers** :

- Server: `src/routes/(protected)/dashboard/admin/friendships/+page.server.ts`
- Client: `src/routes/(protected)/dashboard/admin/friendships/+page.svelte`

### Features implémentées

#### 1. Vue d'ensemble statistiques

**Fichier** : `+page.server.ts:96-101`

```typescript
const stats = {
	total: transformedFriendships.length,
	accepted: transformedFriendships.filter((f) => f.status === 'accepted').length,
	pending: transformedFriendships.filter((f) => f.status === 'pending').length,
	rejected: transformedFriendships.filter((f) => f.status === 'rejected').length
};
```

**Affichage** :

- ✅ Total d'amitiés
- ✅ Amitiés acceptées (badge vert)
- ✅ Demandes en attente (badge jaune)
- ❌ **Rejected count calculé mais pas affiché** (ligne 101 mais pas dans UI)

**Recommandation** : Ajouter card pour rejected count

```svelte
<!-- Ajouter dans +page.svelte -->
<Card>
	<Card.Header>
		<Card.Title>Demandes refusées</Card.Title>
	</Card.Header>
	<Card.Content>
		<p class="text-3xl font-bold text-red-600">{data.stats.rejected}</p>
	</Card.Content>
</Card>
```

#### 2. Filtre par classe

**Fichier** : `+page.server.ts:54-59`, `+page.svelte:38-44`

```typescript
// Load classes
const { data: classes } = await supabase
	.from('classes')
	.select('id, name')
	.eq('is_active', true)
	.order('name');

// Filter logic (client-side)
if (selectedClass !== 'all') {
	filtered = filtered.filter(
		(f) =>
			f.requester_class_ids.includes(selectedClass) || f.addressee_class_ids.includes(selectedClass)
	);
}
```

**UI** : Dropdown avec toutes les classes actives

**Limitation** : Filtre client-side (pas optimal pour beaucoup de friendships)

#### 3. Recherche par nom

**Fichier** : `+page.svelte:28-35`

```typescript
if (searchQuery) {
	const query = searchQuery.toLowerCase();
	filtered = filtered.filter(
		(f) =>
			f.requester_name.toLowerCase().includes(query) ||
			f.addressee_name.toLowerCase().includes(query)
	);
}
```

**UI** : Input text avec recherche instantanée

**Performance** : O(n) search client-side (acceptable jusqu'à ~1000 friendships)

#### 4. Affichage détaillé des amitiés

**Fichier** : `+page.svelte:166-216`

Pour chaque amitié :

- ✅ Avatar + nom du requester
- ✅ Rôle (étudiant/enseignant)
- ✅ Type d'amitié (badge "Camarade" ou "Mentor")
- ✅ Avatar + nom de l'addressee
- ✅ Statut (badge coloré : Acceptée/En attente/Refusée)
- ✅ Bouton de suppression

```svelte
<!-- Badge statut -->
{@const badge = getStatusBadge(friendship.status)}
<div class="badge {badge.class}">
	{badge.label}
</div>
```

**Couleurs statut** :

- `accepted` : Vert (bg-green-100)
- `pending` : Jaune (bg-yellow-100)
- `rejected` : Rouge (bg-red-100)

#### 5. Suppression d'amitiés

**Fichier** : `+page.server.ts:110-148`

```typescript
export const actions: Actions = {
	deleteFriendship: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();

		// 1. Vérifier rôle teacher/admin
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
			return fail(403, { error: 'Forbidden' });
		}

		// 2. Extraire friendshipId
		const formData = await request.formData();
		const friendshipId = formData.get('friendshipId') as string;

		// 3. Supprimer
		const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

		if (error) {
			return fail(500, { error: 'Failed to delete friendship' });
		}

		return { success: true };
	}
};
```

**Sécurité** :

- ✅ Vérification rôle server-side (ligne 119-127)
- ✅ RLS policy backup (database-level)
- ❌ **Pas d'audit log** (impossible de savoir qui a supprimé)
- ❌ **Pas de confirmation dialogue** (seulement bouton)

**UI Suppression** : `+page.svelte:220-246`

```svelte
<form method="POST" action="?/deleteFriendship" use:enhance={...}>
    <input type="hidden" name="friendshipId" value={friendship.id} />
    <Button type="submit" variant="ghost" size="icon" class="text-destructive">
        <Trash2 class="size-4" />
    </Button>
</form>
```

**Recommandation** : Ajouter confirmation dialogue

```svelte
<script>
	let confirmDelete = $state<string | null>(null);
</script>

{#if confirmDelete === friendship.id}
	<AlertDialog>
		<AlertDialog.Title>Confirmer la suppression</AlertDialog.Title>
		<AlertDialog.Description>
			Êtes-vous sûr de vouloir supprimer l'amitié entre
			{friendship.requester_name} et {friendship.addressee_name} ?
		</AlertDialog.Description>
		<AlertDialog.Actions>
			<Button onclick={() => (confirmDelete = null)}>Annuler</Button>
			<Button variant="destructive" onclick={handleDelete}>Supprimer</Button>
		</AlertDialog.Actions>
	</AlertDialog>
{/if}
```

### Limites actuelles modération

| Feature                       | Statut                 | Impact   |
| ----------------------------- | ---------------------- | -------- |
| Voir toutes les amitiés       | ✅                     | OK       |
| Filtrer par classe            | ✅                     | OK       |
| Rechercher par nom            | ✅                     | OK       |
| Supprimer amitiés             | ✅                     | OK       |
| **Voir rejected friendships** | ⚠️ Calculé pas affiché | Minor    |
| **Analytics avancées**        | ❌                     | Medium   |
| **Audit logs**                | ❌                     | **High** |
| **Blocage proactif**          | ❌                     | Medium   |
| **Force-accept request**      | ❌                     | Low      |
| **Bulk actions**              | ❌                     | Low      |

### Analytics manquantes

**Recommandées** :

1. **Taux de rejet par étudiant**

   ```sql
   SELECT
       p.full_name,
       COUNT(*) FILTER (WHERE f.status = 'rejected') as rejected,
       COUNT(*) as total,
       ROUND(COUNT(*) FILTER (WHERE f.status = 'rejected') * 100.0 / COUNT(*), 2) as rejection_rate
   FROM friendships f
   JOIN profiles p ON p.id = f.addressee_id
   WHERE p.role = 'student'
   GROUP BY p.id
   HAVING COUNT(*) > 5
   ORDER BY rejection_rate DESC;
   ```

2. **Étudiants les plus connectés**

   ```sql
   SELECT
       p.full_name,
       COUNT(*) as friend_count
   FROM friendships f
   JOIN profiles p ON (p.id = f.requester_id OR p.id = f.addressee_id)
   WHERE f.status = 'accepted' AND p.role = 'student'
   GROUP BY p.id
   ORDER BY friend_count DESC
   LIMIT 10;
   ```

3. **Friendships inter-classes**

   ```sql
   SELECT COUNT(DISTINCT f.id) as cross_class_count
   FROM friendships f
   JOIN profiles p1 ON f.requester_id = p1.id
   JOIN profiles p2 ON f.addressee_id = p2.id
   WHERE f.status = 'accepted'
   AND NOT EXISTS (
       SELECT 1 FROM class_members cm1
       JOIN class_members cm2 ON cm1.class_id = cm2.class_id
       WHERE cm1.student_id = p1.id AND cm2.student_id = p2.id
   );
   ```

4. **Timeline d'activité**
   ```sql
   SELECT
       DATE_TRUNC('day', created_at) as date,
       COUNT(*) as new_friendships,
       COUNT(*) FILTER (WHERE status = 'accepted') as accepted_today
   FROM friendships
   WHERE created_at > now() - interval '30 days'
   GROUP BY DATE_TRUNC('day', created_at)
   ORDER BY date DESC;
   ```

---

## Permissions RLS détaillées

### Table friendships - Policies complètes

**Fichier** : `supabase/migrations/034_create_friendships_table.sql:24-70`

#### 1. View Own Friendships

**Policy** : `"Users can view own friendships"`

```sql
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
```

**Signification** :

- User peut voir friendships où il est requester OU addressee
- Bidirectionnel : A voit friendship (A→B) et (B→A)
- **Pas de filtre sur status** : Voit pending, accepted, rejected

**Test** :

```sql
-- En tant que user 'alice-uuid'
SELECT * FROM friendships;
-- Retourne uniquement rows où requester_id='alice-uuid' OU addressee_id='alice-uuid'
```

#### 2. Teachers View All

**Policy** : `"Teachers can view all student friendships"`

```sql
CREATE POLICY "Teachers can view all student friendships"
  ON friendships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );
```

**Signification** :

- Si `auth.uid()` a `role = 'teacher'` → Voir TOUTES les friendships
- Pas de filtre sur student-only (teachers voient aussi friendships enseignants)
- **Overhead** : Subquery sur profiles pour chaque row (acceptable car teachers peu nombreux)

**Optimisation possible** :

```sql
-- Ajouter index pour accélérer subquery
CREATE INDEX idx_profiles_role ON profiles(role) WHERE role = 'teacher';
```

#### 3. Insert Friendship Request

**Policy** : `"Users can insert friendship requests"`

```sql
CREATE POLICY "Users can insert friendship requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
```

**Signification** :

- User peut INSERT uniquement si `requester_id = auth.uid()`
- Empêche usurpation d'identité (User A ne peut pas créer demande au nom de User B)
- **Pas de validation côté DB** sur addressee_id (peut cibler n'importe qui)

**Sécurité** :

- ✅ Empêche spoofing requester
- ⚠️ N'empêche pas spam (voir section Rate Limiting)

#### 4. Update Status (Addressee Only)

**Policy** : `"Addressee can update friendship status"`

```sql
CREATE POLICY "Addressee can update friendship status"
  ON friendships FOR UPDATE
  USING (auth.uid() = addressee_id);
```

**Signification** :

- SEUL l'addressee peut UPDATE (accepter/refuser)
- Requester **ne peut pas** changer status de sa propre demande
- Empêche requester de forcer `status = 'accepted'`

**Test** :

```sql
-- User A (requester) essaie d'UPDATE
UPDATE friendships SET status = 'accepted' WHERE id = '...';
-- ERROR: Policy violation (USING clause failed)

-- User B (addressee) UPDATE
UPDATE friendships SET status = 'accepted' WHERE id = '...';
-- SUCCESS
```

#### 5. Delete Own Friendships

**Policy** : `"Users can delete own friendships"`

```sql
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
```

**Signification** :

- Les DEUX parties peuvent DELETE
- Requester peut annuler demande envoyée
- Addressee peut supprimer demande reçue
- N'importe qui peut unfriend après accepted

**Symétrie** :

- ✅ Fair : Les deux ont pouvoir de terminer amitié
- ⚠️ Privacy : Si A unfriend, B ne sait pas forcément (juste disparaît)

#### 6. Teachers Delete Student Friendships

**Policy** : `"Teachers can delete student friendships"`

```sql
CREATE POLICY "Teachers can delete student friendships"
  ON friendships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );
```

**Signification** :

- Teachers peuvent DELETE n'importe quelle friendship
- Pas de distinction student vs teacher friendships (peut delete teacher-teacher aussi)
- **Pouvoir absolu** pour modération

**Note** : Policy name dit "student friendships" mais code permet ALL

### Table user_presence - Policies

**Fichier** : `supabase/migrations/035_create_user_presence_table.sql:14-43`

#### 1. View Own Presence

```sql
CREATE POLICY "Users can view own presence"
  ON user_presence FOR SELECT
  USING (auth.uid() = user_id);
```

**Simple** : User voit son propre statut

#### 2. View Friend Presence (Privacy-First)

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

**Signification** :

- User voit présence **uniquement** des amis acceptés
- CASE expression pour gérer bidirectionalité
- **Privacy-first** : Pending/rejected ne donnent pas accès à présence

**Performance** :

- Subquery executed for each row
- Filter `status = 'accepted'` réduit scan
- Index sur `(requester_id, status)` et `(addressee_id, status)` recommandé

**Test** :

```sql
-- Alice et Bob sont amis (status='accepted')
-- En tant que Alice
SELECT * FROM user_presence WHERE user_id = 'bob-uuid';
-- SUCCESS - Returns Bob's presence

-- Alice et Charlie ont status='pending'
SELECT * FROM user_presence WHERE user_id = 'charlie-uuid';
-- Returns 0 rows (policy blocks)
```

#### 3. Manage Own Presence

```sql
CREATE POLICY "Users can manage own presence"
  ON user_presence FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Signification** :

- User peut INSERT/UPDATE/DELETE son propre record presence
- WebSocket server utilise service role (bypass RLS) mais policy backup

### Matrice de permissions complète

| Action                    | Étudiant (self) | Étudiant (friend) | Étudiant (other) | Enseignant  | Admin       |
| ------------------------- | --------------- | ----------------- | ---------------- | ----------- | ----------- |
| **Friendships**           |
| View own                  | ✅              | ✅ (si accepted)  | ❌               | ✅ ALL      | ✅ ALL      |
| Create request            | ✅              | ✅                | ✅               | ✅          | ✅          |
| Accept/Reject (addressee) | ✅              | N/A               | N/A              | ✅          | ✅          |
| Delete own                | ✅              | ✅                | ❌               | ✅ ALL      | ✅ ALL      |
| Force accept              | ❌              | ❌                | ❌               | ❌          | ❌          |
| **Presence**              |
| View own                  | ✅              | ✅                | ✅               | ✅          | ✅          |
| View friend               | ❌              | ✅ (si accepted)  | ❌               | ⚠️ Indirect | ⚠️ Indirect |
| Update own                | ✅              | ✅                | ✅               | ✅          | ✅          |

**Note** : Enseignants ne voient pas directement présence via RLS, mais peuvent query via service role

---

## Gaps de sécurité critiques

### P0 - Critiques (Fixer immédiatement)

#### 1. Pas de rate limiting

**Vulnérabilité** : Spam illimité de friend requests

**Attack scenario** :

```typescript
// Actuellement POSSIBLE sans blocage :
for (let i = 0; i < 1000; i++) {
	await friendsManager.sendFriendRequest(randomUserId, 'classmate');
}
// ✅ SUCCÈS - Aucune protection
```

**Impact** :

- User malveillant peut spammer 1000+ demandes/minute
- Peut cibler un seul user (harcèlement)
- Peut scraper database (envoyer à tous les users)
- Charge DB excessive

**Fix** : Implémenter rate limiting (voir section Recommandations)

**Priorité** : **P0**

#### 2. Pas de cooldown après rejet

**Vulnérabilité** : Re-spam après rejet

**Attack scenario** :

```typescript
// 1. User A envoie demande à B
await friendsManager.sendFriendRequest('user-b', 'classmate'); // status='pending'

// 2. User B refuse
await friendsManager.rejectRequest(friendshipId); // status='rejected'

// 3. User A voit badge "Refusée" → unfriend
await friendsManager.unfriend(friendshipId); // DELETE

// 4. User A renvoie immédiatement
await friendsManager.sendFriendRequest('user-b', 'classmate'); // ✅ SUCCÈS
```

**Impact** :

- User peut harceler en re-envoyant après chaque rejet
- Badge "Refusée" pas bloquant
- Pas de conséquence pour abus

**Fix** : Cooldown 30 jours après rejet (voir section Recommandations)

**Priorité** : **P0**

#### 3. Pas d'audit logs

**Vulnérabilité** : Impossible de tracker actions enseignants

**Problème** :

- Teacher delete friendship → Pas de log de qui/quand
- Impossible de debug problèmes reportés
- Pas de accountability pour actions modération
- Pas d'historique si dispute

**Impact** :

- Debugging difficile
- Pas de traçabilité
- Risque légal (GDPR requires audit trail)

**Fix** : Audit table (voir section Recommandations)

**Priorité** : **P0** (compliance)

### P1 - Importants (Fixer avant scaling)

#### 4. Pas de validation Zod

**Vulnérabilité** : Input non validé

**Fichier** : `src/lib/stores/friends.svelte.ts:133-158`

```typescript
// Pas de validation Zod
async sendFriendRequest(friendId: string, friendshipType: FriendshipType): Promise<boolean> {
    const { error } = await this.supabase
        .from('friendships')
        .insert({
            requester_id: this.currentUserId,
            addressee_id: friendId,  // ❌ Pas validé (UUID ?)
            status: 'pending',
            friendship_type: friendshipType  // ❌ Pas validé (enum ?)
        });
}
```

**Problème** :

- `friendId` pas validé comme UUID
- `friendshipType` pas validé comme enum
- Possible d'envoyer values invalides (caught by DB mais pas graceful)

**Fix** : Validation Zod

```typescript
import { z } from 'zod';

const sendFriendRequestSchema = z.object({
    friendId: z.string().uuid(),
    friendshipType: z.enum(['classmate', 'mentor'])
});

async sendFriendRequest(friendId: string, friendshipType: string): Promise<boolean> {
    const validation = sendFriendRequestSchema.safeParse({ friendId, friendshipType });
    if (!validation.success) {
        this.error = validation.error.issues[0].message;
        return false;
    }
    // ...
}
```

**Priorité** : **P1** (best practice)

#### 5. Recherche non sécurisée

**Vulnérabilité** : Database scraping possible

**Fichier** : `src/lib/stores/friends.svelte.ts:259-316`

```typescript
async searchUsers(query: string): Promise<...> {
    // ❌ Pas de rate limiting
    // ❌ Pas de CAPTCHA
    const { data } = await this.supabase
        .from('profiles')
        .select('id, full_name, firstname, lastname, avatar_url, role')
        .neq('id', this.currentUserId)
        .or(`full_name.ilike.%${query}%,firstname.ilike.%${query}%,lastname.ilike.%${query}%`)
        .limit(20);  // ❌ Limite client-side uniquement
}
```

**Attack scenario** :

```typescript
// Scraper tous les users en itérant l'alphabet
for (let char of 'abcdefghijklmnopqrstuvwxyz') {
	const results = await searchUsers(char); // ✅ SUCCÈS
	// Store results...
}
// → Database scraped
```

**Impact** :

- Privacy violation (noms, avatars exposés)
- Possible de construire directory complet
- Pas de protection CAPTCHA

**Fix** :

1. Rate limiting sur recherche (5/min, 20/hour)
2. CAPTCHA après N searches
3. Require min 3 characters au lieu de 2

**Priorité** : **P1** (privacy)

### P2 - Enhancements (Nice to have)

#### 6. Pas de prévention proactive

**Manque** :

- ❌ Blacklist user pairs (bloquer A-B permanently)
- ❌ Require teacher approval pour cross-class friendships
- ❌ Auto-reject basé sur règles (age, grade)
- ❌ Restrict to same class only (option)

**Fix** : Table `friendship_restrictions`

```sql
CREATE TABLE friendship_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id uuid REFERENCES profiles(id),
  student_b_id uuid REFERENCES profiles(id),
  restriction_type text CHECK (restriction_type IN ('blocked', 'requires_approval')),
  created_by uuid REFERENCES profiles(id),  -- Teacher who created
  reason text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT unique_restriction UNIQUE (
    LEAST(student_a_id, student_b_id),
    GREATEST(student_a_id, student_b_id)
  )
);
```

**Priorité** : **P2** (advanced moderation)

---

## Protections implémentées

### Database Constraints

#### 1. No Self-Friending

```sql
CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
```

✅ **Efficace** : Impossible de s'ajouter soi-même

**Test** :

```sql
INSERT INTO friendships (requester_id, addressee_id, status, friendship_type)
VALUES ('alice-uuid', 'alice-uuid', 'pending', 'classmate');
-- ERROR: new row violates check constraint "no_self_friendship"
```

#### 2. Unique Friendship

```sql
CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
```

✅ **Efficace** : Empêche doublons exacts (A→B)

**Limitation** : N'empêche pas reverse (B→A)

**Recommandation** : Unique index bidirectionnel

```sql
CREATE UNIQUE INDEX idx_friendships_unique_pair
ON friendships (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
);
```

#### 3. Status Enum

```sql
status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected'))
```

✅ **Efficace** : Valeurs invalides rejetées

#### 4. Friendship Type Enum

```sql
friendship_type text NOT NULL CHECK (friendship_type IN ('classmate', 'mentor'))
```

✅ **Efficace** : Types invalides rejetés

### Application-Level Protections

#### 1. XSS Protection

✅ **Svelte auto-escape**

```svelte
<!-- Svelte échappe automatiquement HTML -->
<p>{friendName}</p>
<!-- Safe même si friendName contient <script> -->
```

**Test** :

```typescript
const maliciousName = '<script>alert("XSS")</script>';
// Rendu comme texte, pas exécuté
```

#### 2. SQL Injection Protection

✅ **Supabase parameterized queries**

```typescript
// Supabase utilise prepared statements internally
.from('friendships')
.select('*')
.eq('id', userInput);  // ✅ Safe - parameterized
```

**Pas de string concatenation** :

```typescript
// ❌ JAMAIS faire ça (n'existe pas dans codebase)
const query = `SELECT * FROM friendships WHERE id = '${userInput}'`;
```

#### 3. CSRF Protection

⚠️ **Partiellement protégé**

- ✅ Form actions (SvelteKit CSRF tokens automatiques)
- ⚠️ Direct Supabase calls (pas de CSRF car client-side)

**Note** : Friends system utilise direct Supabase client, donc CSRF not applicable

#### 4. Authorization Checks

✅ **Server-side role check** pour modération

**Fichier** : `+page.server.ts:119-127`

```typescript
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
	return fail(403, { error: 'Forbidden' });
}
```

✅ **Bon** : Check server-side avant DELETE

---

## Recommandations de sécurité

### 1. Implémenter Rate Limiting (P0)

**Utiliser rate limiter existant** : `src/lib/server/rateLimiter.ts`

```typescript
import { checkRateLimit } from '$lib/server/rateLimiter';

async sendFriendRequest(friendId: string, type: FriendshipType): Promise<boolean> {
    // Hourly limit: 10 requests
    const hourlyKey = `friend_request:${this.currentUserId}`;
    const hourlyCheck = await checkRateLimit(hourlyKey, 10, 3600000);

    if (!hourlyCheck.allowed) {
        this.error = 'Trop de demandes. Réessayez dans une heure.';
        return false;
    }

    // Daily limit: 50 requests
    const dailyKey = `friend_request_daily:${this.currentUserId}`;
    const dailyCheck = await checkRateLimit(dailyKey, 50, 86400000);

    if (!dailyCheck.allowed) {
        this.error = 'Limite quotidienne atteinte. Réessayez demain.';
        return false;
    }

    // Proceed...
}
```

**Limites recommandées** :

| Action        | Hourly | Daily | Reasoning                        |
| ------------- | ------ | ----- | -------------------------------- |
| Send request  | 10     | 50    | Évite spam massif                |
| Search users  | 20     | 100   | Évite scraping                   |
| Accept/Reject | 50     | -     | Légitime si beaucoup de demandes |

### 2. Rejection Cooldown (P0)

**Metadata-based tracking** :

```sql
-- Ajouter metadata column
ALTER TABLE friendships ADD COLUMN metadata jsonb DEFAULT '{}';

-- Stocker rejection timestamp
UPDATE friendships
SET
    status = 'rejected',
    metadata = jsonb_set(
        metadata,
        '{rejected_at}',
        to_jsonb(now())
    )
WHERE id = ...;
```

**Check cooldown avant re-request** :

```typescript
async sendFriendRequest(friendId: string, type: FriendshipType): Promise<boolean> {
    // Check if rejected recently
    const { data: existingRejection } = await this.supabase
        .from('friendships')
        .select('metadata')
        .eq('requester_id', this.currentUserId)
        .eq('addressee_id', friendId)
        .eq('status', 'rejected')
        .single();

    if (existingRejection) {
        const rejectedAt = new Date(existingRejection.metadata.rejected_at);
        const cooldownEnd = new Date(rejectedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        if (new Date() < cooldownEnd) {
            this.error = `Vous pourrez renvoyer une demande après le ${cooldownEnd.toLocaleDateString()}`;
            return false;
        }
    }

    // Proceed...
}
```

### 3. Audit Logs (P0)

**Create audit table** :

```sql
CREATE TABLE friendship_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id uuid,  -- Peut être null si friendship deleted
  action text NOT NULL CHECK (action IN ('created', 'accepted', 'rejected', 'deleted', 'teacher_deleted')),
  performed_by uuid REFERENCES profiles(id),
  target_user_id uuid REFERENCES profiles(id),  -- Addressee pour created, requester pour accepted
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_friendship_audit_friendship ON friendship_audit(friendship_id);
CREATE INDEX idx_friendship_audit_user ON friendship_audit(performed_by);
CREATE INDEX idx_friendship_audit_created ON friendship_audit(created_at DESC);
```

**Trigger pour auto-logging** :

```sql
CREATE OR REPLACE FUNCTION log_friendship_action()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO friendship_audit (friendship_id, action, performed_by, target_user_id, metadata)
        VALUES (
            NEW.id,
            'created',
            NEW.requester_id,
            NEW.addressee_id,
            jsonb_build_object('friendship_type', NEW.friendship_type)
        );

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            INSERT INTO friendship_audit (friendship_id, action, performed_by, target_user_id)
            VALUES (NEW.id, 'accepted', NEW.addressee_id, NEW.requester_id);

        ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            INSERT INTO friendship_audit (friendship_id, action, performed_by, target_user_id)
            VALUES (NEW.id, 'rejected', NEW.addressee_id, NEW.requester_id);
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO friendship_audit (friendship_id, action, performed_by, metadata)
        VALUES (
            OLD.id,
            'deleted',
            auth.uid(),  -- Qui a DELETE
            jsonb_build_object(
                'requester_id', OLD.requester_id,
                'addressee_id', OLD.addressee_id,
                'status', OLD.status
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

### 4. Input Validation Zod (P1)

**Create validation schemas** : `src/lib/server/validation/friends.ts`

```typescript
import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
	friendId: z.string().uuid('ID ami invalide'),
	friendshipType: z.enum(['classmate', 'mentor'], {
		errorMap: () => ({ message: "Type d'amitié invalide" })
	})
});

export const updateFriendshipStatusSchema = z.object({
	friendshipId: z.string().uuid(),
	status: z.enum(['accepted', 'rejected'])
});

export const searchUsersSchema = z.object({
	query: z.string().min(2).max(50)
});
```

**Use in friends.svelte.ts** :

```typescript
import { sendFriendRequestSchema } from '$lib/server/validation/friends';

async sendFriendRequest(friendId: string, friendshipType: string): Promise<boolean> {
    const validation = sendFriendRequestSchema.safeParse({ friendId, friendshipType });

    if (!validation.success) {
        this.error = validation.error.issues[0].message;
        return false;
    }

    const { friendId: validFriendId, friendshipType: validType } = validation.data;

    // Proceed with validated data...
}
```

### 5. Enhanced Teacher Dashboard (P2)

**Analytics views** :

```sql
-- Vue pour analytics enseignants
CREATE VIEW teacher_friendship_analytics AS
SELECT
    -- Par étudiant
    p.id as student_id,
    p.full_name as student_name,
    COUNT(*) FILTER (WHERE f.status = 'accepted') as accepted_friendships,
    COUNT(*) FILTER (WHERE f.status = 'pending' AND f.requester_id = p.id) as pending_sent,
    COUNT(*) FILTER (WHERE f.status = 'pending' AND f.addressee_id = p.id) as pending_received,
    COUNT(*) FILTER (WHERE f.status = 'rejected' AND f.addressee_id = p.id) as rejected_others,
    ROUND(
        COUNT(*) FILTER (WHERE f.status = 'rejected' AND f.addressee_id = p.id) * 100.0 /
        NULLIF(COUNT(*) FILTER (WHERE f.addressee_id = p.id), 0),
        2
    ) as rejection_rate

FROM profiles p
LEFT JOIN friendships f ON (p.id = f.requester_id OR p.id = f.addressee_id)
WHERE p.role = 'student'
GROUP BY p.id;
```

**UI Dashboard enhancements** :

1. Onglet "Analytics" avec charts
2. Table des étudiants avec metrics
3. Filtres avancés (rejection_rate > X%)
4. Export CSV pour reporting

---

## Changelog

| Date       | Changement                                    |
| ---------- | --------------------------------------------- |
| 2025-01-09 | Documentation initiale modération et sécurité |

---

**Maintenu par** : Équipe de développement UbuMaths
**Dernière mise à jour** : 2025-01-09
