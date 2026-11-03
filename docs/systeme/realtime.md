---
couvre:
  - 'src/lib/stores/{supabaseRealtime,presence,notificationsRealtime,achievementsRealtime,chat,tradeRealtime,multiplayer,friends}.svelte.ts'
  - src/lib/stores/pomodoro/broadcast.ts
  - 'src/lib/components/chat/**'
  - src/lib/server/validation/chat.ts
  - src/lib/components/markdown/restricted-rendering.ts
  - 'src/routes/(protected)/dashboard/+layout.svelte'
  - 'src/routes/(protected)/dashboard/friends/**'
  - 'src/routes/(protected)/dashboard/chat/**'
  - 'src/routes/(protected)/dashboard/student/marketplace/trade/**'
  - 'src/routes/api/chat/**'
  - 'supabase/migrations/*_realtime_*.sql'
---

# Temps réel (Supabase Realtime)

> Vérifié contre le code le 2026-10-10.

## À quoi ça sert

Pousser vers le navigateur, sans rechargement : la présence des amis, les notifications, les
succès débloqués, les messages du chat, l'échange de cartes entre deux élèves (troc) et le
démineur multijoueur. Tout vit côté client (`src/lib/stores/*.svelte.ts`), jamais en SSR : chaque
`init` / `createChannel` / `subscribe` sort tôt si `!browser`.

Données d'élèves mineurs : **un signal reçu d'un autre client n'est jamais affiché tel quel**. Le
chat et le troc passent par des canaux **privés** et relisent la base (sous RLS) à chaque signal.

## Carte du code

| Fichier                                                            | Rôle                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `src/lib/stores/supabaseRealtime.svelte.ts`                        | `supabaseRealtimeManager` : registre central des canaux           |
| `src/lib/stores/presence.svelte.ts`                                | `presenceManager` : en ligne / hors ligne des amis                |
| `src/lib/stores/notificationsRealtime.svelte.ts`                   | `notificationsRealtimeManager`                                    |
| `src/lib/stores/achievementsRealtime.svelte.ts`                    | `achievementsRealtimeManager`                                     |
| `src/lib/stores/chat.svelte.ts`                                    | `chatStore` : chat par conversation                               |
| `src/lib/stores/tradeRealtime.svelte.ts`                           | `tradeRealtimeStore` : échange de cartes en direct                |
| `src/lib/stores/multiplayer.svelte.ts`                             | `multiplayerStore` : démineur multijoueur (hors registre central) |
| `supabase/migrations/20261004090000_realtime_chat_prive.sql`       | policies `realtime.messages` du chat                              |
| `supabase/migrations/20261004120000_realtime_trade_prive.sql`      | policies `realtime.messages` du troc                              |
| `supabase/migrations/20260914140000_republish_realtime_tables.sql` | tables publiées pour `postgres_changes`                           |

Sans rapport avec Supabase : `src/lib/stores/pomodoro/broadcast.ts` utilise le `BroadcastChannel`
du **navigateur** (synchronisation entre onglets).

## Deux mécanismes (pas de Presence API native)

| Mécanisme              | Coût                 | Usage                                                       |
| ---------------------- | -------------------- | ----------------------------------------------------------- |
| **`postgres_changes`** | compte dans le quota | notifications, succès, messages du chat, multijoueur        |
| **`broadcast`**        | gratuit, éphémère    | signaux du chat et du troc ; présence du partenaire de troc |

L'API Presence native (`channel.track()`) n'est **pas** utilisée. La présence des amis n'est
**pas du temps réel** : elle est relue en base toutes les 60 s (voir `presenceManager`) ; celle du
partenaire de troc passe par un événement broadcast `'presence'`.

**Un `postgres_changes` ne reçoit rien si la table n'est pas publiée**, et l'abonnement réussit
quand même. La liste fermée des tables publiées est gardée par
`tests/integration/realtime-publication.test.ts` : `messages`, `notifications`,
`student_achievements`, `minesweeper_multiplayer_matches`, `minesweeper_multiplayer_game_state`.

## Le registre : `supabaseRealtimeManager`

Singleton qui tient une `Map<string, RealtimeChannel>` et la nature (privé / public) de chaque
canal. Tous les stores passent par lui, sauf `multiplayerStore`.

```ts
supabaseRealtimeManager.init(supabase, userId); // idempotent, appelé par chaque store
const channel = supabaseRealtimeManager.createChannel(name, { private: true }); // ou sans option
channel.on('broadcast', { event: 'new_message' }, handler);
await supabase.realtime.setAuth(); // canal privé : jeton AVANT la jonction
await supabaseRealtimeManager.subscribeChannel(name);
supabaseRealtimeManager.getChannel(name); // pour émettre
await supabaseRealtimeManager.unsubscribeChannel(name);
await supabaseRealtimeManager.disconnect(); // tous les canaux
```

- `createChannel` renvoie le canal existant s'il est déjà dans la Map ; il **lève une erreur** si
  ce canal a l'autre nature (privé contre public).
- `subscribeChannel` enveloppe `channel.subscribe` dans une Promise : `SUBSCRIBED` → résolue ;
  `CLOSED`, `CHANNEL_ERROR` (avec la raison du serveur, ex. `Unauthorized…`), `TIMED_OUT` → rejetée.
- `connectionStatus` (`$state` : `'connected' | 'disconnected' | 'connecting'`), lu via
  `isConnected`.

## Les canaux

| Concern        | Nom du canal                   | Nature    | Mécanisme                                        |
| -------------- | ------------------------------ | --------- | ------------------------------------------------ |
| Notifications  | `'user-notifications'`         | public    | postgres_changes `notifications`                 |
| Succès         | `'achievements-realtime'`      | public    | postgres_changes `student_achievements`          |
| Chat           | `` `chat-${conversationId}` `` | **privé** | broadcast (signal) + postgres_changes `messages` |
| Troc           | `` `trade:${tradeId}` ``       | **privé** | broadcast (signaux, chat éphémère, présence)     |
| Match démineur | `` `match:${matchId}` ``       | public    | postgres_changes (canal direct)                  |

Un canal privé n'est joint que si les policies de `realtime.messages` l'acceptent :
`chat_realtime_participants_receive` / `_send` (participants de la conversation) et
`trade_realtime_participants_receive` / `_send` (les deux élèves de l'échange). Un canal public
n'interroge pas ces policies.

## Les stores

### `presenceManager`

**Sans canal** (écart T1, décision de David du 2026-11-03). `startPresenceTracking(friendIds)`
(appelé par `friendsManager` dans `src/lib/stores/friends.svelte.ts`) lit `user_presence` (sous
RLS : seulement les amis acceptés) tout de suite, puis toutes les `PRESENCE_POLL_INTERVAL` = 60 s,
et lance le battement de cœur : RPC `upsert_user_presence` toutes les `HEARTBEAT_INTERVAL` = 180 s
(exporté ; calibré sur le quota, à recalculer avant tout changement).

Un ami est « en ligne » si sa ligne dit `online` **et** si `last_heartbeat` date de moins de
`STALE_AFTER_MS` = 270 s (180 s + 90 s de marge), calculé dans le navigateur
(`presenceStatusOf`) : la fonction `cleanup_stale_presence` existe en base mais n'est planifiée
nulle part, une ligne `online` reste donc figée quand un onglet se ferme sans arrêter le suivi.
Une relecture en échec garde le dernier statut connu. `getFriendPresence(id)`
(`'online' | 'offline'`, défaut hors ligne), `stopPresenceTracking()` (arrête la relecture et le
battement, marque l'utilisateur hors ligne).

### `notificationsRealtimeManager`

INSERT / UPDATE sur `notifications`, filtre `user_id=eq.<moi>`. Sur INSERT, il n'utilise pas
`payload.new` (brut, sans jointures) : il relance `notificationStore.fetchUnread()`. UPDATE : rien
(l'optimiste est déjà appliqué). `startListening()` / `stopListening()`.

### `achievementsRealtimeManager`

INSERT sur `student_achievements`, filtre `student_id=eq.<moi>`. Valide le payload
(`isValidPayload`), puis `achievementsStore.showUnlockToast(...)` et `achievementsStore.clearCache()`.

### `chatStore` — signal + relecture

- **Envoi** (`sendMessage`) : message optimiste → INSERT en base (pièces jointes comprises) →
  **puis** broadcast `new_message` portant **l'identifiant seul** (`{ message: { id } }`).
- **Réception** : `new_message` (broadcast) et INSERT `messages` (postgres_changes, filtre
  `conversation_id=eq.<id>`) mènent au même chemin, `refetchAndDisplayMessage` : relecture de la
  ligne sous RLS. Zéro ligne (`PGRST116` : id inventé ou masqué) → rien d'affiché ; ligne d'une
  autre conversation que celle du canal → ignorée. Un id déjà affiché ou en cours de relecture
  n'est pas relu ; au plus `SIGNAL_REFETCH_LIMIT` = 20 relectures par 10 s et par conversation.
- `message_reaction` : signal `{ messageId }` → `reloadReactions` relit `message_reactions`.
  `message_read` : aucun client ne l'émet ; le handler ne fait que journaliser.
- Payloads validés par Zod (`broadcastMessagePayloadSchema`, `broadcastReactionPayloadSchema`,
  `broadcastReadReceiptPayloadSchema`) ; les champs en trop sont ignorés.
- API : `subscribeToConversation`, `unsubscribeFromConversation`, `loadConversationHistory`,
  `loadMoreMessages`, `sendMessage`, `setActiveConversation`, `toggleReaction`, `create1on1Chat`
  (null si pas amis), `reportMessage` (POST `/api/chat/reports`), `cleanup`. Reconnexion par
  conversation (`reconnectConversation`).
- Rendu : `src/lib/components/chat/ChatMessageList.svelte` affiche les messages en **mode
  restreint** (`src/lib/components/markdown/restricted-rendering.ts`) — chantier vivant :
  [chat-rendu-restreint](../wip/chat-rendu-restreint-progress.md).

### `tradeRealtimeStore` — signaux + relecture

Page : `src/routes/(protected)/dashboard/student/marketplace/trade/[id]/+page.svelte`. Un seul
endroit ouvre `trade:<id>` ; `destroy()` le ferme.

- `offer_updated`, `validation_changed`, `confirmation`, `trade_cancelled`, `trade_completed` :
  **signaux sans contenu**, émis **après** l'écriture en base ; le destinataire relit la ligne
  `marketplace_trades` sous RLS (regroupement 300 ms, `SIGNAL_REFETCH_LIMIT` = 20 par 10 s, la
  relecture en trop est reportée, pas perdue). L'offre est écrite après `DEBOUNCE_DELAY` = 300 ms.
- `chat_message` : éphémère (rien en base) ; seul le texte est lu, l'auteur est l'autre élève de
  la ligne d'échange ; `CHAT_MESSAGE_LIMIT` = 20 par 10 s, `MAX_CHAT_MESSAGES` = 200 gardés.
- `presence` : battement toutes les `PRESENCE_INTERVAL` = 30 s → `partnerOnline` (`$state`) ;
  suspendu quand l'onglet est caché (`visibilitychange`), déconnexion après `IDLE_TIMEOUT`
  (10 min d'inactivité).

Ce que la base garantit sur l'échange (chaque élève n'écrit que sa moitié, participants figés) :
[jeux-et-economie.md](jeux-et-economie.md#marché).

### `multiplayerStore` (exception)

Canal direct `supabase.channel(`match:${matchId}`)` + `postgres_changes`, retiré par
`supabase.removeChannel`. Hors registre volontairement (période de grâce de 30 s avant abandon,
cycle de vie lié au match) : son en-tête l'explique, ne pas « corriger ». Règles du jeu :
[jeux-et-economie.md](jeux-et-economie.md#démineur--tournois-et-multijoueur).

## Branchements et cycle de vie

- Notifications : `src/routes/(protected)/dashboard/+layout.svelte` — `onMount` → `init` +
  `startListening` ; `$effect(() => () => stopListening())`.
- Présence amis : `src/routes/(protected)/dashboard/friends/+page.svelte` — `onMount` →
  `presenceManager.init` (le suivi démarre dans `friendsManager.loadFriendships()`) ; nettoyage →
  `stopPresenceTracking()`. Plus de bandeau « système de présence » (il ne reflétait que
  l'abonnement retiré). `presenceManager` est aussi lu
  par `ChatConversationList`, `NewChatDialog`, `StartFriendTradeModal`.
- Succès : `src/lib/components/achievements/AchievementNotifications.svelte`.
- Chat : `src/lib/components/chat/ChatWindow.svelte` et `ChatMessageList.svelte`.

## Invariants

1. **Toujours nettoyer** au démontage (`$effect(() => () => …)`) : un canal oublié fuit et coûte
   du quota.
2. **Un signal reçu n'est pas une donnée** : tout ce qui vient d'un autre client est validé par
   Zod et, quand une source existe en base, relu sous RLS. Jamais afficher l'expéditeur ou le
   contenu d'un payload.
3. **Canal privé pour tout échange entre élèves** : `createChannel(name, { private: true })`,
   `supabase.realtime.setAuth()` avant la jonction, et une policy sur `realtime.messages`
   (question d'accès à poser à David d'abord).
4. **Émettre le signal APRÈS l'écriture** : le destinataire relit une ligne qui doit exister.
5. **`broadcast` pour l'éphémère, `postgres_changes` pour la vérité** ; toute nouvelle table
   écoutée doit être publiée **et** ajoutée à `tests/integration/realtime-publication.test.ts`.
6. **Quota** : `HEARTBEAT_INTERVAL` (180 s) et `PRESENCE_INTERVAL` (30 s) sont calibrés ;
   recalculer avant de les changer.

## Tests

- Unitaires : `src/lib/stores/__tests__/` — `supabaseRealtime.svelte.test.ts`,
  `presence.svelte.test.ts`, `achievementsRealtime.test.ts`, `chat.svelte.test.ts`,
  `chat-canal-prive.svelte.test.ts`, `trade-canal-prive.svelte.test.ts`.
- Intégration (Supabase local) : `tests/integration/realtime-chat-prive.test.ts`,
  `realtime-chat-client-prive.test.ts`, `realtime-trade-prive.test.ts`,
  `realtime-trade-client-prive.test.ts`, `realtime-publication.test.ts`. Le refus d'un
  non-participant est ce qui prouve qu'un canal est privé (un canal public livre aussi entre
  participants).

Historique : [canal privé du chat](../archive/wip/realtime-chat-prive-progress.md),
[canal privé du troc](../archive/wip/realtime-trade-prive-progress.md).

## Écarts connus

- **`user_presence` n'est pas publiée** (gardé par `realtime-publication.test.ts` : la publier
  diffuserait l'UUID d'un compte supprimé). Réglé le 2026-11-03 (écart T1) : la présence des amis
  est relue toutes les 60 s, sans canal.
- Les canaux `match:<id>`, notifications et succès restent publics : ils ne portent que
  des `postgres_changes`, filtrés par la RLS des tables (mesuré le 2026-11-03 : un intrus qui
  rejoint le canal ne reçoit que ce qu'il pourrait déjà lire ; décision de David, écart T2 : pas de
  passage en privé). **Garde** : `src/lib/stores/__tests__/canaux-publics-garde.test.ts` échoue
  si un fichier qui ouvre un canal public utilise `broadcast`, `presence`, `.track()` ou
  `.send()` ; ce canal doit alors passer en privé.
- Un canal privé déjà joint le reste jusqu'à la reconnexion ou au rafraîchissement du JWT (~1 h).
  **Limite acceptée** (décision de David du 2026-11-03, écart T3) : aucun code ne sort un élève
  d'un canal quand ses droits changent (retrait d'une conversation, fin d'un troc). Les policies de
  `realtime.messages` ne sont relues qu'à la jonction et au rafraîchissement du jeton ; une
  suspension de compte ne coupe pas, à elle seule, un canal déjà joint. Pour une exclusion
  urgente, il faut que l'élève soit déconnecté.
