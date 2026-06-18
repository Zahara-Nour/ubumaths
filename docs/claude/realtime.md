# Realtime (Supabase)

Référence synthétique pour Claude : **canaux Realtime Supabase** (presence amis, notifications, achievements, chat, troc/marketplace, multijoueur). Tout vit côté client (`.svelte.ts`), jamais en SSR (garde `browser`). Implémentation : `src/lib/stores/*Realtime.svelte.ts` + `presence.svelte.ts` + `chat.svelte.ts` + `tradeRealtime.svelte.ts` + `multiplayer.svelte.ts`.

---

## Deux mécanismes utilisés (pas de Presence API native)

| Mécanisme              | Quota                              | Latence | Usage dans le code                                                                     |
| ---------------------- | ---------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| **`postgres_changes`** | **compte** vers le quota free tier | ~300 ms | Presence amis, notifications, achievements, chat (source de vérité), match multijoueur |
| **`broadcast`**        | **gratuit**, éphémère              | ~50 ms  | Chat (UX instantanée), troc (offres/validation/chat/presence partenaire)               |

> ⚠️ L'**API Presence native** de Supabase (`channel.track()` / event `presence`) **n'est PAS utilisée**. La « presence » des amis passe par `postgres_changes` sur `user_presence` ; celle du troc par un **event broadcast custom** `'presence'`. Ne pas confondre avec `src/lib/stores/pomodoro/broadcast.ts` qui utilise le **`BroadcastChannel` du navigateur** (sync entre onglets), sans rapport avec Supabase.

---

## Manager central : `supabaseRealtimeManager`

`src/lib/stores/supabaseRealtime.svelte.ts` — singleton qui possède une `Map<string, RealtimeChannel>` et centralise le cycle de vie. **Tous** les stores realtime passent par lui (sauf `multiplayer`, cf. ci-dessous).

```ts
import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';

supabaseRealtimeManager.init(supabase, userId); // une fois (idempotent — appelé par chaque store)
const channel = supabaseRealtimeManager.createChannel(channelName); // crée OU renvoie l'existant
channel.on(
	'postgres_changes',
	{ event: 'INSERT', schema: 'public', table: 'notifications', filter },
	cb
);
await supabaseRealtimeManager.subscribeChannel(channelName); // Promise → SUBSCRIBED | reject sur CLOSED/ERROR/TIMED_OUT
// ...
await supabaseRealtimeManager.unsubscribeChannel(channelName); // removeChannel + delete de la Map
await supabaseRealtimeManager.disconnect(); // tous les canaux (cleanup global)
```

- `createChannel` est **idempotent** : un canal déjà présent dans la Map est renvoyé (pas de double souscription).
- `subscribeChannel` enveloppe `channel.subscribe(status => …)` dans une **Promise** : `SUBSCRIBED` → `resolve` ; `CLOSED`/`CHANNEL_ERROR`/`TIMED_OUT` → `reject` (évite la Promise pendante). `connectionStatus` est un `$state` (`'connected' | 'disconnected' | 'connecting'`), exposé via `isConnected`.

---

## Convention de nommage des canaux

| Concern                 | Nom du canal                                     | Type                                          |
| ----------------------- | ------------------------------------------------ | --------------------------------------------- |
| Presence amis           | `'user-presence-updates'` (const `CHANNEL_NAME`) | postgres_changes                              |
| Notifications           | `'user-notifications'`                           | postgres_changes                              |
| Achievements            | `'achievements-realtime'`                        | postgres_changes                              |
| Chat (par conversation) | `` `chat-${conversationId}` ``                   | broadcast + postgres_changes                  |
| Troc (par trade)        | `` `trade:${tradeId}` ``                         | broadcast                                     |
| Match multijoueur       | `` `match:${matchId}` ``                         | postgres_changes (canal direct, hors manager) |

**Un canal par concern** : presence/notifs/achievements ont chacun **un** canal nommé constant ; chat et troc sont **scopés par entité** (`chat-<id>`, `trade:<id>`).

---

## Stores spécialisés

### `presenceManager` — `presence.svelte.ts`

Online/offline des amis via `postgres_changes` sur `user_presence`, filtré `user_id=in.(...)`. **Heartbeat** RPC `upsert_user_presence` toutes les **180 s** (`HEARTBEAT_INTERVAL`, exporté).

```ts
export const HEARTBEAT_INTERVAL = 180000; // 180 s — CRITIQUE billing, NE PAS changer sans recalculer le quota
```

- `init(supabase, userId)` → `startPresenceTracking(friendIds)` → `getFriendPresence(id)` (`'online' | 'offline'`, défaut `'offline'`) → `stopPresenceTracking()` (marque offline + clear interval + unsubscribe).
- Reconnexion auto avec **backoff exponentiel** (`MAX_RECONNECT_ATTEMPTS = 5`, `RECONNECT_DELAY_MS = 5000`) sur les events `system` ≠ `ok`.

### `notificationsRealtimeManager` — `notificationsRealtime.svelte.ts`

`postgres_changes` INSERT/UPDATE sur `notifications` filtré `user_id=eq.${userId}`. **Couche fine** : sur INSERT, déclenche `notificationStore.fetchUnread()` (refetch avec JOINs) plutôt que d'utiliser `payload.new` (brut, sans JOINs). UPDATE = no-op (optimistic déjà appliqué). `startListening()` / `stopListening()`.

### `achievementsRealtimeManager` — `achievementsRealtime.svelte.ts`

`postgres_changes` INSERT sur `student_achievements` filtré `student_id=eq.${userId}`. **Valide le payload** (`isValidPayload`, type guard runtime) avant traitement, puis `achievementsStore.showUnlockToast(...)` + `clearCache()`.

### `chatStore` — `chat.svelte.ts` (hybride)

Stratégie **duale** par conversation : broadcast (50 ms, UX) **+** `postgres_changes` (300 ms, source de vérité avec JOINs), avec **déduplication**.

```
Envoi    : UI optimiste → broadcast (50 ms) → INSERT DB (200 ms) → postgres_changes (300 ms)
Réception: broadcast (affiche tout de suite, flag is_broadcast) → postgres_changes (remplace par la version DB)
```

- **Payloads broadcast validés par Zod** côté réception : `broadcastMessagePayloadSchema`, `broadcastReactionPayloadSchema`, `broadcastReadReceiptPayloadSchema`. Events : `'new_message'`, `'message_reaction'`, `'message_read'`.
- Dédup : un message broadcast (`is_broadcast: true`) est remplacé par la ligne DB (même `id` ou même `created_at`) à l'arrivée du `postgres_changes`. On ignore son propre broadcast (`sender_id === userId`).
- API : `subscribeToConversation(id)` / `unsubscribeFromConversation(id)` · `loadConversationHistory(id, limit?)` · `sendMessage(id, content, attachments?)` · `setActiveConversation(id)` · `create1on1Chat(friendId): Promise<string | null>` (null si pas amis) · `reportMessage(messageId, reason, details?): Promise<boolean>` (POST `/api/chat/reports`).
- Reconnexion par conversation avec backoff (même pattern que presence).

### `tradeRealtime` — `tradeRealtime.svelte.ts` (broadcast pur)

Canal `` `trade:${tradeId}` ``, **100 % broadcast** (le DB sert au chargement initial). Events : `'offer_updated'`, `'validation_changed'`, `'confirmation'`, `'chat_message'`, `'trade_cancelled'`, `'trade_completed'`, `'presence'`.

```ts
channel.send({ type: 'broadcast', event: 'offer_updated', payload }); // pattern d'émission
```

- Émissions debouncées : `DEBOUNCE_DELAY = 300` (offre). Heartbeat presence partenaire : `PRESENCE_INTERVAL = 30_000` ; `partnerOnline` est un `$state`. `destroy()` au démontage (pause sur tab caché via `visibilitychange`).

### `multiplayer` — `multiplayer.svelte.ts` (exception)

⚠️ **N'utilise PAS** `supabaseRealtimeManager` : canal direct `supabase.channel(\`match:${matchId}\`)`+`postgres_changes`, nettoyé via `supabase.removeChannel(this.channel)`. C'est documenté dans son en-tête — ne pas « corriger » sans raison.

---

## Cycle de vie & wiring (où c'est branché)

- **Notifications** : `src/routes/(protected)/dashboard/+layout.svelte` — `onMount` → `init` + `startListening` ; cleanup dans un `$effect(() => () => stopListening())`.
- **Presence amis** : `src/routes/(protected)/dashboard/friends/+page.svelte` — `onMount` → `presenceManager.init(...)` (le tracking démarre dans `friendsManager.loadFriendships()`) ; cleanup `$effect` → `stopPresenceTracking()` **+ `supabaseRealtimeManager.disconnect()`**.

Pattern de cleanup canonique (jamais d'`onMount` retournant un callback en Svelte 5 ici — on utilise `$effect`) :

```svelte
onMount(() => {
	manager.init(data.supabase, data.user.id);
	manager.startListening();
});
$effect(() => () => manager.stopListening()); // teardown au démontage
```

---

## Best practices (non négociables)

1. **Toujours cleanup** au démontage (`$effect(() => () => …)`) — un canal non désinscrit fuit et consomme du quota.
2. **Garde `browser`** : tous les `init`/`subscribe`/`send` sortent tôt si `!browser` (pas de Realtime en SSR).
3. **Un canal par concern**, nommage stable (cf. table) — `createChannel` étant idempotent, ne pas recréer manuellement.
4. **Valider tout payload broadcast avec Zod** côté réception (cf. chat) — un broadcast vient d'un autre client, c'est une **entrée non fiable**.
5. **`broadcast` pour l'éphémère, `postgres_changes` pour la vérité** : ne pas gaspiller le quota `postgres_changes` sur des signaux transitoires (frappe, presence, curseurs).
6. **Quota / billing** : `HEARTBEAT_INTERVAL` (180 s) et `PRESENCE_INTERVAL` (30 s) sont calibrés sur le free tier — recalculer avant toute modif.
7. **Reconnexion** : backoff exponentiel sur events `system` ≠ `ok` (ignorer `status: 'ok'`) ; Supabase gère le bas niveau, mais re-fetch l'état après reconnexion.

---

> Voir aussi : [architecture.md](architecture.md) · [database.md](database.md) · [best-practices.md](best-practices.md).
