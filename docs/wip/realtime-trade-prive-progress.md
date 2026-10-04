# Canal temps réel privé des échanges de cartes — progression

Branche `feat/realtime-trade-prive`, worktree `../ubumaths-wt-trade`. Même chantier que le chat
(`docs/wip/realtime-chat-prive-progress.md`).

## Décision de David (2026-10-04)

« Seuls les deux élèves de l'échange peuvent écouter et écrire sur son canal temps réel. Ni le
prof, ni l'admin, ni les autres élèves. Quelqu'un qui pouvait écouter ou diffuser sur l'échange
d'un autre ne le pourra plus. »

## Inventaire du canal (`src/lib/stores/tradeRealtime.svelte.ts`)

- Topic : `trade:${tradeId}` (id rendu par la base, uuid en minuscules). Aucun autre fichier de
  `src/` n'ouvre ce topic.
- **Broadcast uniquement** : `offer_updated`, `validation_changed`, `confirmation`,
  `chat_message`, `trade_cancelled`, `trade_completed`, `presence`. ⚠️ `presence` est un
  **événement broadcast** (heartbeat de 30 s), PAS la Presence Realtime : aucun `track()`, aucun
  `on('presence')`. Pas de `postgres_changes` non plus.
- Canal créé par `supabaseRealtimeManager.createChannel(channelName)` sans `private` : public.
- Table : `marketplace_trades`, élèves = `initiator_id` et `partner_id` (fixés à la création,
  `CHECK initiator_id <> partner_id`). Policy SELECT `marketplace_trades_select_participants`
  → l'appelant voit sa propre ligne → pas de SECURITY DEFINER. Le prof et l'admin voient aussi
  la ligne (`_select_teacher` via `is_my_student`, `_select_admin`) : la policy Realtime exige
  donc l'égalité avec `auth.uid()`, pas la visibilité de la ligne.

## PR 1 — migration + preuves (cette branche)

- [x] `supabase/migrations/20261004120000_realtime_trade_prive.sql` (additive, rollback en tête).
- [x] `tests/integration/realtime-trade-prive.test.ts` (10 tests, bout en bout + SQL).
- [x] Preuve rouge : migration retirée (copie dans le scratchpad), `db:reset` → **8 échecs /
      2 passés** (les 2 passés : topics mal formés et canal public, vrais avant comme après).
      Tous les échecs : témoin refusé (`Unauthorized: You do not have permissions to read from
    this Channel topic`) ou, au niveau SQL, `42501` sur le cas autorisé.
- [x] Restauration depuis la copie, `db:reset` → **10/10** + chat 8/8.
- [x] `check:integration-paths` : rien à ajouter (`tests/integration/**` et `supabase/**` déjà
      couverts, le test n'importe aucun fichier de `src/lib` à l'exécution).
- [ ] `security-auditor` (session principale), puis `db:migrate` (4 conditions).

## PR 2 — client (à faire, APRÈS `db:migrate`)

- `createChannel(channelName, { private: true })` dans `tradeRealtime.svelte.ts` (3 appels
  `getChannel` inchangés).
- Ne pas croire le payload (`from`, `senderId`) : la policy INSERT n'inspecte pas son contenu.
- ⚠️ Après la PR 2, un rollback de la migration coupe le temps réel des échanges.

## Limites connues

- Un canal déjà ouvert le reste jusqu'à la reconnexion ou au rafraîchissement du JWT (~1 h).
  Les deux élèves d'un échange ne changent pas ; ne joue que si la ligne est supprimée.
- La comparaison texte du topic n'utilise pas l'index de clé primaire (évaluée à la jonction
  et au rafraîchissement du JWT seulement).
