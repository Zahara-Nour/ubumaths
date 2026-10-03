# Chat : canal temps réel privé (S3) — suivi

Branche `feat/realtime-chat-prive`, worktree `ubumaths-wt-realtime`.

## Problème (audit `security-auditor` du 2026-10-03)

Le chat diffuse chaque message sur un canal Realtime `chat-<conversationId>`
**public** (`src/lib/stores/supabaseRealtime.svelte.ts:96`,
`this.supabase.channel(channelName)` sans `config: { private: true }`), et
`realtime.messages` n'a aucune policy. Quiconque connaît l'UUID d'une
conversation et la clé publique peut :

- **écouter** les broadcasts (contenus de messages d'élèves mineurs) ;
- **diffuser** un `new_message` affiché sous n'importe quel nom (usurpation du
  prof), qui ne passe jamais par la base (ni modération, ni filtre).

Les messages persistants arrivent aussi par `postgres_changes` sur
`public.messages`, eux filtrés par la RLS de la table.

## Décision de David (question d'accès tranchée le 2026-10-03)

« Seuls les participants d'une conversation peuvent écouter et diffuser sur son
canal temps réel ; l'expéditeur affiché est celui enregistré en base. Quelqu'un
qui pouvait écouter ou diffuser dans une conversation dont il n'est pas membre
ne le pourra plus. »

## Découpage

- **PR 1 (celle-ci)** : migration seule (policies sur `realtime.messages`) +
  tests d'intégration. N'affecte aucun canal existant (tous publics).
- **PR 2 (après `db:migrate` en prod)** : client en canal privé. Si la PR 2
  partait avant la migration, tout canal privé serait refusé → temps réel du
  chat coupé.

## Inventaire des canaux Realtime (2026-10-03, `grep -rn "\.channel(\|createChannel" src`)

Un seul point de création générique : `supabaseRealtimeManager.createChannel`
(`src/lib/stores/supabaseRealtime.svelte.ts:96`), plus un appel direct dans le
multijoueur. **Aucun canal n'est privé** (`grep -rn "private: true" src` : 0).

| Topic                    | Fichier                                     | Usage                                                                                     |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `chat-<conversation_id>` | `stores/chat.svelte.ts:395/483/1794`        | broadcast `new_message`, `message_reaction`, `message_read` + `postgres_changes` messages |
| `trade:<trade_id>`       | `stores/tradeRealtime.svelte.ts:537`        | broadcast (offre, validation, `chat_message`, `presence` en tant qu'événement broadcast)  |
| `match:<match_id>`       | `stores/multiplayer.svelte.ts:810`          | `postgres_changes` seulement                                                              |
| `user-presence-updates`  | `stores/presence.svelte.ts:38`              | `postgres_changes` seulement                                                              |
| `user-notifications`     | `stores/notificationsRealtime.svelte.ts:13` | `postgres_changes` seulement                                                              |
| `achievements-realtime`  | `stores/achievementsRealtime.svelte.ts:14`  | `postgres_changes` seulement                                                              |

- Le chat n'utilise **pas** la présence Realtime (`track`, `'presence'` : 0 dans
  `chat.svelte.ts`) → policies limitées à l'extension `broadcast`.
- ⚠️ Hors périmètre S3 mais même classe de faille : `trade:<id>` est un canal
  broadcast public (échange de cartes entre élèves, `chat_message` compris).
  À traiter dans un chantier séparé (question d'accès à poser).

### Pourquoi la migration ne touche aucun canal public

Documentation Supabase « Realtime Authorization » : les policies RLS de
`realtime.messages` ne sont consultées que pour les canaux rejoints avec
`config: { private: true }` ; un canal public n'interroge pas la table. Vérifié
en local de bout en bout : le test « le canal public actuel du chat fonctionne
toujours » passe AVEC la migration, et avant la migration (sans aucune policy,
RLS activée) tout canal privé est refusé (`Unauthorized: You do not have
permissions to read from this Channel topic`) pendant que les canaux publics
marchent.

### Table des participants

`public.conversation_participants (conversation_id uuid, user_id uuid, …)`,
unique `(conversation_id, user_id)`. Policy SELECT :
`"Users can view conversation participants"` =
`user_id = auth.uid() OR is_conversation_participant(conversation_id, auth.uid())`.
Index `idx_participants_user (user_id, joined_at DESC)`.

### Forme des topics

`chat-${conversationId}`, `conversationId` = uuid rendu par la base (minuscules,
forme canonique 8-4-4-4-12). Côté serveur, `realtime.topic()` rend le topic
sans préfixe (`nullif(current_setting('realtime.topic', true), '')`).

## Conception (migration `20261004090000_realtime_chat_prive.sql`)

Deux policies sur `realtime.messages`, `TO authenticated`, extension
`broadcast` :

- `chat_realtime_participants_receive` (SELECT = recevoir) ;
- `chat_realtime_participants_send` (INSERT = diffuser).

Condition : il existe une ligne `conversation_participants` avec
`user_id = auth.uid()` et `'chat-' || conversation_id::text = realtime.topic()`.

- **Comparaison texte, pas de cast** : un topic mal formé (pas un uuid,
  majuscules, préfixe/suffixe, NULL) ne correspond à rien → refus, jamais
  d'erreur 22P02.
- **Pas de fonction SECURITY DEFINER** : la sous-requête tourne avec les droits
  d'`authenticated` et ne cherche que SA ligne, visible par la policy existante.
  Rien à ajouter au garde-fou SECURITY DEFINER (vérifié : test vert).
- Prof/admin non participants : refusés (décision : participants seulement).
- `anon` : aucune policy → refusé.

### Rollback (en tête du fichier de migration)

```sql
DROP POLICY IF EXISTS "chat_realtime_participants_receive" ON realtime.messages;
DROP POLICY IF EXISTS "chat_realtime_participants_send" ON realtime.messages;
```

Exécuté tel quel en local pendant les preuves (voir ci-dessous) : sans erreur.

## Preuves (local, 2026-10-03, `tests/integration/realtime-chat-prive.test.ts`)

Bout en bout contre le serveur Realtime local (realtime v2.135.3), avec de vrais
comptes connectés (JWT) — pas de simulation — plus un cas SQL (rôle
`authenticated` simulé via `request.jwt.claims` et `realtime.topic`).

**Vert avec la migration** : 7/7 (et garde SECURITY DEFINER + publication
realtime : 25/25 sur les 3 fichiers).

**Rouge sans la migration** (rollback appliqué, même fichier de test) :

```
× un participant reçoit, sur le canal privé, le broadcast d’un autre participant
× un non-participant authentifié ne peut ni s’abonner ni diffuser
× anon ne peut ni s’abonner ni diffuser
× un participant de conv1 est refusé sur le canal de conv2
× au niveau SQL, la policy refuse sans erreur un topic mal formé ou absent
AssertionError: B refusé : "Unauthorized: You do not have permissions to read
  from this Channel topic: chat-de8f…": expected 'CHANNEL_ERROR' to be 'SUBSCRIBED'
Tests  5 failed | 2 passed (7)
```

Les tests de refus contiennent un TÉMOIN participant (B abonné) : sans la
migration, c'est le témoin qui rougit. Les 2 verts sans migration (topic mal
formé, canal public) sont des refus / une non-régression, vrais avant comme
après.

**Les refus prouvent quelque chose** (mutations, appliquées puis retirées en
local) :

- policies trop larges (`extension = 'broadcast'` seul, SELECT + INSERT) →
  4 rouges : non-participant, autre conversation, topic mal formé (abonnés
  `SUBSCRIBED`), SQL.
- SELECT correct mais INSERT trop large → 3 rouges, dont
  `expected [ { texte: 'usurpation' } ] to deeply equal []` : la diffusion REST
  d'un non-participant arrivait chez B. C'est l'usurpation de l'audit.

## Non testé de bout en bout

- Le comportement en PRODUCTION (version de Realtime hébergée, réglage « Allow
  public access » du projet). Le local reproduit le mécanisme, pas la config prod.
- Les policies déjà présentes en prod sur `realtime.messages` : non lues (aucune
  requête prod dans ce chantier). Si une policy permissive y existe, elle
  s'ajouterait en OU aux nôtres → à lire en lecture seule avant `db:migrate`.

## Reste à faire — PR 2 (après `db:migrate` + vérification en prod)

1. `createChannel` : `config: { private: true }` pour `chat-<id>` (et appeler
   `supabase.realtime.setAuth()` avant l'abonnement — le jeton de session, pas
   la clé anon, doit porter l'identité).
2. Ne plus afficher le contenu d'un broadcast `new_message` : le traiter comme
   « nouveau message », relu en base (`get_messages_paginated` / ligne
   `messages`) — l'expéditeur affiché est celui enregistré en base, même si un
   participant forge un payload.
3. Même traitement pour `message_reaction` / `message_read` (payloads forgeables
   par un participant).
4. Test d'intégration côté client + vérification manuelle en preview/prod.
5. Ensuite seulement, envisager de couper l'accès public au Realtime
   (réglage projet) — vérifier d'abord les 5 autres canaux de l'inventaire.
