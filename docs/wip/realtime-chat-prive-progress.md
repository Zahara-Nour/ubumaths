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

⚠️ Sans risque tant que le client utilise le canal public. **Après la PR 2**
(client en `private: true`), ce rollback **coupe le temps réel du chat** : sans
policy, tout canal privé est refusé. Revenir d'abord au client public.

### Limite connue : retrait d'un participant

Realtime ne vérifie la policy qu'à la jonction du canal et au rafraîchissement
du JWT. Un participant retiré de la conversation (sortie de la classe) continue
de recevoir les broadcasts d'un canal déjà ouvert jusqu'à sa reconnexion ou au
rafraîchissement de son jeton (~1 h). C'est un progrès net par rapport au canal
public actuel, ouvert à quiconque connaît l'UUID.

## Preuves (local, 2026-10-03, `tests/integration/realtime-chat-prive.test.ts`)

Bout en bout contre le serveur Realtime local (realtime v2.135.3), avec de vrais
comptes connectés (JWT) — pas de simulation — plus un cas SQL (rôle
`authenticated` simulé via `request.jwt.claims` et `realtime.topic`).

**Présence (ajout après audit)** : test « la présence n'est pas ouverte » —
A et B, participants, rejoignent le canal privé ; A fait `track()` ; B ne doit
pas le voir. Preuve que la clause `extension = 'broadcast'` sert : retirée des
deux policies (copie du fichier, `db:reset`) →

```
× la présence n’est pas ouverte : un participant ne voit pas le track() d’un autre
AssertionError: expected [ 'a' ] to not include 'a'
Tests  1 failed | 7 passed (8)
```

Fichier restauré depuis la copie, `db:reset` → 8/8.

**Vert avec la migration** : 8/8 (7/7 avant l'ajout du test de présence) (et garde SECURITY DEFINER + publication
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
4. La policy INSERT n'inspecte **pas** le payload : le client doit ignorer
   `sender` et le contenu du broadcast, et relire la base.
5. Tester aussi `postgres_changes` (table `messages`) sur un canal **privé** :
   l'abonnement doit toujours livrer les INSERT aux participants.
6. Test d'intégration côté client + vérification manuelle en preview/prod.
7. Ensuite seulement, envisager de couper l'accès public au Realtime
   (réglage projet) — vérifier d'abord les 5 autres canaux de l'inventaire.

## PR 2 — client en canal privé (branche `feat/realtime-chat-client-prive`, 2026-10-03)

Faite après `db:migrate` de la PR 1 (migration en prod).

### Ce qui change

- `supabaseRealtimeManager.createChannel(name, { private: true })` →
  `supabase.channel(name, { config: { private: true } })`. Seul `chat-<id>`
  l'utilise ; `trade:`, `match:`, notifications, présence, succès : inchangés.
- `chatStore.subscribeToConversation` appelle `supabase.realtime.setAuth()` avant
  la jonction. Rafraîchissement du jeton : déjà fait par supabase-js 2.103.3
  (`_handleTokenChanged` sur `TOKEN_REFRESHED`/`SIGNED_IN` → `realtime.setAuth`),
  rien à ajouter.
- **Broadcast = signal.** `new_message` ne transporte plus que `{ message: { id } }`,
  envoyé APRÈS l'insertion en base (avant : avant l'insertion, avec contenu et
  expéditeur). Le destinataire relit la ligne (`messages` + jointure `profiles`,
  sous RLS) via `relireEtAfficherMessage` — le même chemin que `postgres_changes`.
  Zéro ligne (PGRST116 : id inventé ou masqué par la RLS) → rien d'affiché ; ligne
  d'une autre conversation que celle du canal → ignorée. Les champs en trop
  (anciens clients) sont ignorés par Zod.
- `message_reaction` : signal `{ messageId }` ; le destinataire relit les
  réactions du message en base (`message_reactions`) et les remplace. Auteur,
  emoji, ajout/retrait du payload : jamais appliqués.
- `message_read` : aucun client ne l'émet, le handler ne fait que journaliser →
  rien d'affiché, laissé tel quel.
- Présence : le chat n'en utilise pas (vérifié) → rien ne casse.

### Preuves

- Unitaires `src/lib/stores/__tests__/chat-canal-prive.svelte.test.ts` : 6/6,
  **6 rouges avant l'implémentation** (dont « expected [ {…} ] to deeply equal [] » :
  le payload forgé s'affichait). `chat.svelte.test.ts` : 7 tests qui asseraient
  l'ancien comportement (affichage du payload, payload complet à l'envoi,
  `createChannel('chat-conv-1')`) réécrits ; dossier `stores/__tests__` 437/437.
- Intégration `tests/integration/realtime-chat-client-prive.test.ts` (le VRAI
  `chatStore`, une instance par utilisateur via `vi.resetModules`) : 4/4, stable
  sur 4 exécutions :
  1. A → B en privé, `sender_id` relu en base ;
  2. signal forgé par un participant (expéditeur « prof », contenu « FAUX ») : B
     affiche la ligne en base ; id inconnu → rien ;
  3. `postgres_changes` livre bien sur le canal privé (ligne insérée sans
     broadcast) ;
  4. non-participant : abonnement rejeté, rien reçu.
- **Rouge sans `private: true`** (copie du fichier, flag retiré, restauré depuis la
  copie) : `× un non-participant ne peut pas s'abonner et ne reçoit rien —
promise resolved "undefined" instead of rejecting` (1 failed | 3 passed). Le
  test « échange en privé » ne PEUT pas rougir sans le flag : un canal public
  livre aussi broadcast et `postgres_changes` entre participants. C'est le refus
  du non-participant qui prouve que le canal est privé.

### Observations

- Base locale trouvée SANS les deux policies alors que la migration
  `20261004090000` était inscrite (probablement l'état du test de rollback de la
  PR 1, ou une autre session). `db:reset` → policies présentes. À vérifier en
  prod en lecture seule avant le merge : `select polname from pg_policy where
polrelid = 'realtime.messages'::regclass`.
- Premier run juste après `db:reset` : le test `postgres_changes` a échoué une
  fois (Realtime redémarré, réplication pas prête), vert ensuite (4 fois).
- Le nom de l'expéditeur affiché chez un élève dépend de la lecture de
  `profiles` (B ne lisait pas le profil de A en local : `sender_firstname` null)
  — comportement antérieur, hors périmètre, non asserté.

### Risques

- Rollback de la migration = temps réel du chat coupé (canal privé refusé) :
  revenir au client public d'abord.
- Déploiement : un ancien client (public) et un nouveau (privé) ne s'échangent
  plus de broadcast ; les messages passent toujours par `postgres_changes`
  (~300 ms au lieu de ~50 ms) jusqu'au rechargement des pages.
- Latence : le signal part après l'insertion → ~+200 ms par rapport à l'ancien
  broadcast. C'est le prix de « l'expéditeur affiché est celui de la base ».
- Retrait d'un participant : cf. « Limite connue » plus haut (inchangée).

### Reste

- Vérification manuelle en preview/prod (deux comptes, échange, refus d'un tiers).
- `security-auditor` + `code-reviewer` sur cette PR.
- `trade:<id>` : même classe de faille, chantier séparé.
