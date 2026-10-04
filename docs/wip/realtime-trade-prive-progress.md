# Canal temps réel privé des échanges de cartes — progression

Branches `feat/realtime-trade-prive` (PR 1) et `feat/realtime-trade-client-prive` (PR 2), worktree `../ubumaths-wt-trade`. Même chantier que le chat
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
- Table : `marketplace_trades`, élèves = `initiator_id` et `partner_id` (`CHECK initiator_id <>
partner_id`, mais **modifiables** après création, cf. Limites connues). Policy SELECT `marketplace_trades_select_participants`
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

## PR 2 — client (branche `feat/realtime-trade-client-prive`)

Migration déjà en prod. Fichiers : `src/lib/stores/tradeRealtime.svelte.ts`,
`src/lib/stores/__tests__/trade-canal-prive.svelte.test.ts` (11 tests),
`tests/integration/realtime-trade-client-prive.test.ts` (3 tests), filtre `paths` du nightly
(`check:integration-paths` l'exigeait).

- [x] `createChannel(name, { private: true })` + `await supabase.realtime.setAuth()` avant
      l'abonnement. Un SEUL endroit ouvre `trade:<id>` (`subscribeToChannel`) ; la
      « réouverture » repasse par `init()` (page rechargée) ; `destroy()` ne fait que fermer.
- [x] Inventaire et traitement des événements :
  - `offer_updated`, `validation_changed`, `confirmation`, `trade_cancelled`, `trade_completed` :
    **signaux sans contenu** → relecture de la ligne `marketplace_trades` (sous RLS) ; on applique
    l'offre, la validation et la confirmation de l'AUTRE élève, le statut et le refus. Zéro ligne →
    rien. Émis APRÈS l'écriture en base (l'offre est désormais sauvée puis signalée ; la remise à
    zéro de ma validation, quand je change d'offre, est écrite en base avant le signal).
  - `chat_message` : **aucune source en base** (le store n'écrit pas `marketplace_chat_messages` ;
    l'utiliser changerait le produit : messages persistés). Seul le texte (≤ 500) est lu ; auteur =
    l'autre élève d'après la ligne de l'échange, id et heure locaux (un id forgé en double cassait
    la liste à clés). Plafond 20 messages / 10 s, 200 gardés en mémoire.
  - `presence` (heartbeat) : **aucune source en base**, booléen seul ; sur le canal privé, seul
    l'autre élève peut l'émettre. Inchangé.
- [x] Anti-saturation : regroupement 300 ms, une relecture à la fois (+ une après si signal
      pendant), plafond 20 relectures / 10 s, la relecture en trop est REPORTÉE (pas perdue).
- [x] Preuves rouges : unitaires sur le store d'origine → **11/11 échecs** ; intégration sans
      `private: true` (copie scratchpad, restaurée par `cmp`) → le test du 3ᵉ élève échoue
      (`promise resolved "undefined" instead of rejecting`). Vert : 11/11 + 3/3 (+ PR 1 10/10).
- ⚠️ Après cette PR, un rollback de la migration coupe le temps réel des échanges.
- [x] Corrections après revue et audit (commit séparé) :
  - regroupement en **fenêtre fixe** : un minuteur posé (300 ms ou report du plafond) n'est
    jamais relancé ni effacé — avant, un signal toutes les 250 ms empêchait toute relecture ;
  - refus de confirmation ignoré si la relecture a été lancée avant MA dernière écriture de
    validation (compteur `myValidationWrites`) ;
  - `saveMyValidationReset` : `.select('id')`, zéro ligne → erreur loguée ;
  - chat : plafond appliqué AVANT la validation Zod (pas de rafale d'avertissements), fenêtre
    dédiée, 200 messages aussi pour mes envois ; `confirmation_started_at` retiré de la relecture ;
  - `createChannel` lève une erreur si le canal en cache n'a pas la même nature privée/publique ;
    `subscribeChannel` joint la raison du serveur à l'erreur (`Unauthorized…`) ;
  - intégration : refus du 3ᵉ élève asserté sur le message d'autorisation, + témoin PUBLIC sur
    le même topic qui ne reçoit rien (rouge prouvé : `A a diffusé en public`).

## Limites connues

- Un canal déjà ouvert le reste jusqu'à la reconnexion ou au rafraîchissement du JWT (~1 h).
- ⚠️ **Les participants ne sont PAS figés** (finding I1 de l'audit, non bloquant) : la policy
  `marketplace_trades_update_participants` (baseline:41565) exige seulement que l'appelant reste
  initiateur ou partenaire APRÈS l'UPDATE ; aucun trigger ni droit par colonne ne protège
  `initiator_id` / `partner_id`. Scénario : A pose `partner_id = O`, O rejoint `trade:<id>`, A
  remet `partner_id = B` → O reste abonné (reçoit et diffuse) jusqu'au rafraîchissement de son
  JWT (~1 h). Même chose si la ligne est supprimée.
- **Correctif de fond à décider (PR séparée, question d'accès à poser à David)** : figer les
  deux colonnes, soit par un trigger `BEFORE UPDATE` qui refuse leur changement, soit par
  `REVOKE UPDATE (initiator_id, partner_id)` — ⚠️ sans effet tant que `authenticated` garde
  l'UPDATE sur TOUTE la table : il faut `REVOKE UPDATE ON marketplace_trades` puis
  `GRANT UPDATE (<autres colonnes>)`. Vérifier d'abord qu'aucun code légitime ne modifie ces
  colonnes : `grep -rn "partner_id\|initiator_id" src`.
- La comparaison texte du topic n'utilise pas l'index de clé primaire (évaluée à la jonction
  et au rafraîchissement du JWT seulement).

## Preuve clause par clause (M2, audit)

Seule la clause `realtime.messages.extension = 'broadcast'` retirée des deux policies (copie dans le
scratchpad, restauration vérifiée par `cmp`), `db:reset` → le test 6 (présence) tombe :
`AssertionError: expected [ 'a' ] to not include 'a'` (B voit le `track()` de A). Restauré +
`db:reset` → 10/10. Le test 6 prouve donc bien la clause `extension`, sans renfort.

## Constaté en PR 2, hors périmètre

- La policy UPDATE laisse chaque élève écrire TOUTE la ligne (ma validation, l'offre de l'autre) :
  la relecture affiche la base, donc ce que l'autre y a écrit. Défense de fond = côté base.
