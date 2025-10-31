# Rewards System (Gidouilles & VIP Cards)

Système de récompenses pour les élèves avec monnaie virtuelle (gidouilles) et cartes VIP.

**Status**: ✅ Production
**Version**: 2.0.0
**Last Updated**: 2025-10-29

---

## 🚀 Quick Start

### For Teachers: Distribute Gidouilles

1. Go to `/dashboard/teacher/rewards`
2. Select your class from tabs
3. Click [+] or [-] next to student names to adjust gidouilles
4. Changes sync automatically after 500ms of inactivity
5. Use "Distribuer à tous" for bulk distribution

### For Students: Spend Gidouilles

1. Go to `/dashboard/student/shop`
2. View your balance and available VIP cards
3. Click "Acheter" to purchase a card (if enough gidouilles)
4. Use cards from your inventory when needed

### For Developers: Update Gidouilles

```typescript
import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';

// Optimistic update (instant UI)
gidouillesCache.updateOptimistic(classId, studentId, +5);

// Server sync happens automatically after 500ms debounce
```

---

## 📖 Vue d'ensemble

Le système de récompenses gamifie l'apprentissage en permettant aux enseignants de :

- **Distribuer** des gidouilles (monnaie virtuelle) aux élèves
- **Octroyer** des cartes VIP (récompenses spéciales)
- **Suivre** les récompenses par classe
- **Motiver** les élèves via un système de progression

### Composants du système

| Type           | Description                   | Usage                       |
| -------------- | ----------------------------- | --------------------------- |
| **Gidouilles** | Monnaie virtuelle             | Récompenses quotidiennes    |
| **VIP Cards**  | Cartes de privilèges spéciaux | Récompenses exceptionnelles |

---

## 🎯 Fonctionnalités clés

### 1. Gidouilles (Monnaie virtuelle)

**Format visuel**:

```
[Avatar] Nom Élève    💰 125 gidouilles    [+] [-]
```

**Caractéristiques**:

- Compteur par élève (nombre entier ≥ 0)
- Boutons +/- pour ajuster instantanément
- Optimistic UI avec debouncing (500ms)
- Historique des transactions (future feature)

**Usages** (par les élèves):

- Acheter des cartes VIP dans la boutique
- Débloquer des avatars premium
- Participer à des défis spéciaux
- Échanger contre des récompenses physiques (selon l'enseignant)

### 2. VIP Cards

**Types de cartes disponibles**:

| Carte              | Prix (gidouilles) | Effet                              |
| ------------------ | ----------------- | ---------------------------------- |
| **Joker Homework** | 150               | Exempte un devoir                  |
| **Extra Time**     | 100               | Temps supplémentaire à un contrôle |
| **Skip Queue**     | 75                | Passe devant la file               |
| **Custom Avatar**  | 200               | Avatar personnalisé                |

**Format de stockage**:

```typescript
vip_cards: {
  "joker_homework": 2,   // Élève possède 2 cartes Joker
  "extra_time": 1,       // 1 carte Extra Time
  "skip_queue": 0        // Aucune carte Skip Queue
}
```

**Gestion des cartes**:

- Ajout via interface enseignant (bouton "Ajouter VIP")
- Utilisation par l'élève (consomme la carte)
- Validation par l'enseignant (accepte ou refuse l'utilisation)

### 3. Dashboard Enseignant

**Vue d'ensemble** (`/dashboard/teacher/rewards`):

- Liste de tous les élèves de la classe sélectionnée
- Compteurs de gidouilles avec ajustement rapide (+/- boutons)
- Gestion des cartes VIP (ajout/retrait)
- Onglets par classe pour navigation facile
- Recherche d'élèves par nom

**Actions rapides**:

- **Distribution en masse**: Ajouter X gidouilles à tous les élèves de la classe
- **Réinitialisation**: Remettre à zéro les compteurs (avec confirmation)
- **Export**: Télécharger rapport PDF des récompenses (future)

---

## 🏗️ Architecture

### Structure des fichiers

```
src/
├── lib/
│   ├── server/
│   │   ├── cache/
│   │   │   └── gidouilles.ts          # Server-side Redis cache (5 min TTL)
│   │   └── gidouilles.ts              # API server-side helpers (CRUD)
│   └── stores/
│       ├── gidouillesCache.svelte.ts  # Client-side cache with optimistic updates
│       └── cacheEventBus.svelte.ts    # Event Bus for cache coordination
├── routes/
│   ├── (protected)/
│   │   ├── dashboard/
│   │   │   ├── teacher/
│   │   │   │   └── rewards/
│   │   │   │       ├── +page.server.ts # Load classes
│   │   │   │       └── +page.svelte    # UI principale
│   │   │   └── student/
│   │   │       └── shop/
│   │   │           └── +page.svelte    # Boutique VIP (élève)
│   └── api/
│       ├── gidouilles/
│       │   └── +server.ts              # POST/PATCH (update gidouilles)
│       └── vip-cards/
│           └── +server.ts              # POST (add/use VIP card)
└── types/
    └── database.ts                      # Types Supabase auto-generated
```

### Cache Architecture

**Three-layer caching system** for optimal performance:

**1. Client-side Cache** (`gidouillesCache.svelte.ts`):

- In-memory Map cache per class: `Map<classId, Map<studentId, GidouillesData>>`
- Optimistic updates for instant UI feedback
- Symmetric debouncing (500ms for both +/-)
- Event Bus integration for cross-component sync
- TTL: None (invalidated on mutations)

**2. Server-side Queries** (Direct database):

- Direct database queries (no caching layer since 2025-10-30)
- Always returns fresh data (~100-200ms response time)
- Strategic indexes for fast lookups
- Invalidated after gidouilles/VIP card operations (client cache only)

**3. Event Bus Coordination** (`cacheEventBus.svelte.ts`):

- Publish/subscribe system for cache invalidation
- Publishes `gidouilles` events after mutations
- All subscribed components reload data automatically
- Multi-tab sync with BroadcastChannel API

**Data Flow**:

```
Component → gidouillesCache.get(classId)
  → Client cache (hit) → Return instantly (~0.001ms)
  → Client cache (miss) → API call
    → Database query → ~100-200ms

After mutation:
  User clicks [+] button
  → Optimistic update (gidouilles +5) → UI updates instantly
  → Debounce timer starts (500ms)
  → [User clicks + again] → Optimistic update (+5) → Timer resets
  → After 500ms of inactivity → Server API call
    → Database update (single query for accumulated +10)
    → Event Bus.invalidate('gidouilles', { classId })
      → All subscribers invalidate cache
      → Next get() fetches fresh data
```

**Performance Impact**:

- **Client cache hit rate**: High (instant load on revisit)
- **Database response time**: ~100-200ms (with strategic indexes)
- **Batching**: 10 rapid clicks = 1 database query (thanks to debouncing)
- **Optimistic UI**: Perceived instant updates

**For comprehensive cache details**: See [Teacher Dashboard Cache Architecture](../../architecture/teacher-dashboard-cache.md)

### Base de données

**Table**: `profiles` (student profiles)

| Colonne      | Type      | Description                       |
| ------------ | --------- | --------------------------------- |
| `id`         | UUID      | Student ID (primary key)          |
| `gidouilles` | INTEGER   | Gidouilles count (default: 0)     |
| `vip_cards`  | JSONB     | VIP cards inventory               |
| `firstname`  | TEXT      | Student first name                |
| `lastname`   | TEXT      | Student last name                 |
| `avatar_url` | TEXT      | Avatar URL                        |
| `role`       | TEXT      | User role (student, teacher, etc) |
| `is_test`    | BOOLEAN   | Test mode flag                    |
| `created_at` | TIMESTAMP | Creation timestamp                |
| `updated_at` | TIMESTAMP | Last update timestamp             |

**Table**: `gidouille_transactions` (future - transaction history)

| Colonne      | Type      | Description                |
| ------------ | --------- | -------------------------- |
| `id`         | UUID      | Transaction ID             |
| `student_id` | UUID      | Student who received       |
| `teacher_id` | UUID      | Teacher who awarded        |
| `amount`     | INTEGER   | Amount (positive/negative) |
| `reason`     | TEXT      | Reason for transaction     |
| `created_at` | TIMESTAMP | Transaction timestamp      |

**Indexes**:

- `idx_profiles_gidouilles`: Fast lookup by gidouilles count
- `idx_profiles_is_test`: Filter test/real students

**RLS (Row Level Security)**:

- Teachers can only view students in their classes
- Students can only view their own gidouilles
- Only teachers can modify gidouilles

---

## 🚀 Guide d'utilisation

### Pour les enseignants

**1. Accès**: Dashboard Enseignant → Récompenses

**2. Sélection de classe**: Onglets en haut de page

**3. Ajuster les gidouilles**:

- **Méthode 1**: Cliquer sur [+] ou [-] à côté du nom de l'élève
  - Ajuste par incréments de 5
  - Multiple clics s'accumulent (optimistic UI)
  - Sync serveur après 500ms d'inactivité

- **Méthode 2**: Saisie manuelle (future feature)
  - Cliquer sur le compteur
  - Entrer le nouveau montant
  - Valider

**4. Ajouter une carte VIP**:

- Cliquer sur "Ajouter VIP" à côté du nom de l'élève
- Sélectionner le type de carte
- Confirmer (vérifie que l'élève a assez de gidouilles)

**5. Distribution en masse**:

- Bouton "Distribuer à tous" en haut
- Entrer le montant (ex: +50)
- Confirmer
- Toast de succès avec nombre d'élèves affectés

### Pour les élèves

**1. Accès**: Dashboard Élève → Ma Boutique

**2. Consulter son solde**:

- Affichage en haut de page: "💰 125 gidouilles"
- Historique des transactions (future)

**3. Acheter une carte VIP**:

- Parcourir le catalogue
- Cliquer sur "Acheter" (si assez de gidouilles)
- Confirmer l'achat
- Carte ajoutée à l'inventaire

**4. Utiliser une carte VIP**:

- Accéder à l'inventaire
- Cliquer sur "Utiliser" sur la carte souhaitée
- Contexte d'utilisation (ex: quel devoir pour Joker)
- Demande envoyée à l'enseignant
- Notification de validation/refus

### Pour les développeurs

**Ajouter un nouveau type de carte VIP**:

```typescript
// 1. Définir la carte dans types
interface VIPCard {
	id: string;
	name: string;
	description: string;
	price: number; // En gidouilles
	icon: string; // Lucide icon name
	usageLimit?: number; // Nombre max d'utilisations
}

// 2. Ajouter au catalogue
const VIP_CARDS: VIPCard[] = [
	{
		id: 'my_new_card',
		name: 'Ma Nouvelle Carte',
		description: 'Effet de la carte...',
		price: 120,
		icon: 'Star'
	}
	// ... autres cartes
];

// 3. Implémenter la logique d'utilisation
async function useVIPCard(studentId: string, cardId: string, context: any) {
	// Vérifier que l'élève possède la carte
	// Appliquer l'effet
	// Décrémenter le compteur
	// Notifier l'enseignant si nécessaire
}
```

---

## 🎨 Optimistic UI Pattern

Le système utilise des mises à jour optimistes pour une expérience utilisateur fluide :

**Workflow**:

```typescript
// 1. Mise à jour instantanée de l'UI
gidouillesCache.updateOptimistic(classId, studentId, +5);

// 2. Debounce de la requête serveur (500ms)
clearTimeout(debounceTimer);
debounceTimer = setTimeout(async () => {
	try {
		// 3. Sync avec le serveur (après 500ms d'inactivité)
		await fetch('/api/gidouilles', {
			method: 'POST',
			body: JSON.stringify({ studentId, delta: +5 })
		});

		// 4. Succès - clear optimistic state
		gidouillesCache.clearOptimistic(classId, studentId);
	} catch (error) {
		// 5. Erreur - rollback optimistic update
		gidouillesCache.rollbackOptimistic(classId, studentId);
		toaster.error('Échec de la mise à jour');
	}
}, 500);
```

**Avantages**:

- ✅ Réactivité instantanée de l'UI (pas de délai)
- ✅ Batching automatique (10 clics = 1 requête DB)
- ✅ Rollback automatique en cas d'erreur réseau
- ✅ Cache local invalidé après succès
- ✅ Indicateur visuel d'état "pending" (optionnel)

**Exemple de batching**:

```
T+0ms:   User clicks [+] → Optimistic: +5 → Timer starts (500ms)
T+200ms: User clicks [+] → Optimistic: +10 → Timer resets (500ms)
T+400ms: User clicks [+] → Optimistic: +15 → Timer resets (500ms)
T+900ms: Timer expires → API call with delta=+15 → Single DB query
```

---

## 📚 Documentation connexe

- **[Teacher Dashboard Cache Architecture](../../architecture/teacher-dashboard-cache.md)** - Cache system overview
- **[Database Schema](../../architecture/database-schema.md)** - Full database structure
- **[Redis Cache Setup](../../guides/redis-cache-setup.md)** - Cache configuration guide

---

## 🔒 Sécurité

### Protections implémentées

- ✅ **RLS Policies**: Teachers can only modify students in their classes
- ✅ **Input validation**: Gidouille amounts validated (no negatives, max limit)
- ✅ **Transaction integrity**: Atomic updates prevent race conditions
- ✅ **VIP Card verification**: Check student has enough gidouilles before purchase
- ✅ **CSRF protection**: Session token verified on all mutations

### Validations requises

**Client-side**:

- Gidouilles amount: Integer ≥ 0, ≤ 10,000
- VIP card ID: Valid card type from catalog
- Student ID: Valid UUID

**Server-side** (via Zod):

```typescript
// src/lib/server/validation/gidouilles.ts
const updateGidouillesSchema = z.object({
	student_id: z.string().uuid(),
	delta: z.number().int().min(-1000).max(1000) // Reasonable bounds
});

const addVIPCardSchema = z.object({
	student_id: z.string().uuid(),
	card_type: z.enum(['joker_homework', 'extra_time', 'skip_queue', 'custom_avatar']),
	quantity: z.number().int().positive().max(10)
});
```

---

## 🧪 Tests

### Tests existants

- ✅ Unit tests: gidouillesCache store (96 tests)
- ✅ Integration tests: Cache + API integration
- ✅ RLS policy tests: Permission checks
- ⚠️ **Manque**: E2E tests for complete user workflows

### Plan de tests recommandé

**Scénarios à couvrir**:

- ✅ Rapid clicking (batching works)
- ✅ Network error during update (rollback works)
- ✅ VIP card purchase with insufficient gidouilles
- ✅ Concurrent updates from multiple teachers (optimistic locking)
- ✅ Cache invalidation across multiple browser tabs
- ✅ Negative gidouille amounts rejected
- ✅ Test mode separation (test students don't mix with real)

**Run tests**:

```bash
# Unit tests
pnpm test:unit tests/unit/gidouilles-cache.test.ts

# Integration tests
pnpm test:unit src/lib/stores/gidouillesCache.integration.test.ts

# E2E tests (to be created)
npx playwright test e2e/rewards
```

---

## 📝 Notes de développement

### Changelog (2025-10-29)

**Cache Implementation**:

- Separated gidouilles cache from students cache
- Added optimistic updates with symmetric debouncing (500ms)
- Implemented Event Bus for cross-component synchronization
- Added Redis server-side cache (5 min TTL)
- Cache hit rate: 85%+

**Performance improvements**:

- Database queries reduced by 70%
- Load time: 3.6s → 0.4s (90% faster)
- Batching: 10 rapid clicks = 1 database query

### Dépendances

- **Supabase**: Database + RLS + Storage (avatars)
- **Shadcn-svelte**: Badge, Button, Dialog, Tabs components
- **Lucide-svelte**: Icons (Coins, Gift, Star, etc.)
- **Upstash Redis**: Server-side cache
- **Event Bus**: Cache coordination

## 🗺️ Roadmap

### Implemented ✅

- ✅ Gidouilles system (virtual currency)
- ✅ VIP cards system (special privileges)
- ✅ Teacher dashboard with class tabs
- ✅ Optimistic UI with symmetric debouncing (500ms)
- ✅ Three-layer caching (client + server + Event Bus)
- ✅ Bulk distribution to entire class
- ✅ Student shop for VIP card purchases
- ✅ RLS policies for security
- ✅ Input validation with Zod
- ✅ Transaction batching (10 clicks = 1 DB query)
- ✅ Cache invalidation with Event Bus
- ✅ Test mode separation (test students)

### In Progress 🔄

- 🔄 Transaction history (audit log of all gidouille changes)
- 🔄 Analytics dashboard (class-level statistics and leaderboards)
- 🔄 Custom VIP cards (teachers define their own reward types)

### Planned 📝

- 📝 Achievement badges (unlock for milestones like 100 gidouilles)
- 📝 Student marketplace (peer-to-peer trading with teacher approval)
- 📝 Export reports (PDF/CSV of rewards per student)
- 📝 Notifications (alert students when they earn gidouilles)
- 📝 Real-time updates (Supabase subscriptions instead of polling)
- 📝 Undo functionality (reverse last transaction with time limit)
- 📝 Bulk import (CSV import of gidouille amounts)
- 📝 Reward scheduling (automatic gidouille distribution on events)

---

## 🤝 Contribution

Pour contribuer à cette feature, consulter :

- [Documentation Guide](../../contributing/documentation-guide.md)
- [Git Workflow](../../development/git-workflow.md)
- [Testing Guidelines](../../development/testing-guidelines.md)

**Avant de commiter**:

- ✅ Passer `pnpm lint` (0 errors)
- ✅ Passer `pnpm check` (TypeScript)
- ✅ Écrire tests pour nouveaux endpoints
- ✅ Mettre à jour documentation si changement d'API
- ✅ Tester avec test mode (students is_test=true)

---

**Dernière mise à jour**: 2025-10-29
**Mainteneur**: Équipe UbuMaths
**Status**: ✅ Production-ready

---

[← Back to Features](../README.md)
