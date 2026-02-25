# Audit du flow d'approbation/activation des cartes VIP

## Contexte

Le systeme de cartes VIP a un flow d'activation en 2 etapes (eleve demande, prof approuve, eleve active). Mais il y a aussi des cas ou le prof active directement une carte pour un eleve. Le flow actuel a des bugs et des incoherences qui ont ete partiellement corriges mais meritent une analyse globale.

## Ce qu'il faut analyser

### 1. Les differents chemins d'activation d'une carte VIP

Il y a au moins 3 chemins distincts pour "utiliser" une carte VIP :

**Chemin A - Flow standard (2 etapes) :**

- Eleve demande l'activation (`request-activation` endpoint)
- Prof approuve (`use-card` endpoint) → pose `activationApprovedAt`
- Eleve active (`activate-card` ou via modals d'action)

**Chemin B - Prof active directement depuis le modal "Voir Cartes" d'un eleve :**

- `VipCardsModal.svelte` (teacherView=true) → `handleUseCard()` → `markCardAsUsed()` → appelle `use-card` endpoint
- Ou pour les cartes avec action : ouvre le modal d'action correspondant

**Chemin C - Prof utilise les quick actions du TeacherDashboard :**

- `TeacherDashboard.svelte` → appelle le RPC `use_vip_card(student_id, card_id)` directement
- Utilise pour Batman & Robin, Mathemagie

### 2. Fichiers cles a examiner

**Endpoints API :**

- `src/routes/api/vip-cards/use-card/+server.ts` - Approbation teacher (recemment modifie pour auto-consommer les cartes bonus)
- `src/routes/api/vip-cards/request-activation/+server.ts` - Demande eleve
- `src/routes/api/vip-cards/use-consumable/+server.ts` - Cartes consumable (minesweeper-hint)
- Chercher aussi un eventuel `activate-card` endpoint

**Composants Svelte :**

- `src/lib/components/VipCardsModal.svelte` - Modal teacher pour voir/utiliser les cartes d'un eleve
- `src/lib/components/StudentVipCardsModal.svelte` - Modal eleve pour voir/activer ses cartes
- `src/routes/(protected)/dashboard/teacher/gamification/rewards/ActivationRequestsTab.svelte` - Onglet demandes d'activation

**RPC Postgres :**

- `use_vip_card(p_student_id, p_card_id)` - Dernier fichier: `supabase/migrations/20260112093425_fix_use_vip_card_marking_multiple_cards.sql`
- `use_consumable_card(p_student_id, p_instance_id)` - Dans `supabase/migrations/20260103100302_extend_vip_cards_purchase_consumable.sql`

**Audit trail :**

- Table `vip_cards_activity` - Creee dans `supabase/migrations/20251113140346_create_vip_cards_activity_table.sql`
- Trigger `log_vip_card_changes()` sur `profiles.vip_cards` - Refactore dans `supabase/migrations/20260103144626_refactor_vip_cards_activity_logging.sql` (ne logue plus que les 'removed')
- Trigger `log_vip_cards_to_events()` sur `vip_cards_activity` → `reward_events` - Dans `supabase/migrations/20251121115959_create_reward_events_table.sql`

### 3. Questions specifiques a resoudre

**Flow :**

- Le flow 2 etapes est-il necessaire pour TOUTES les cartes avec action ? Ou certaines pourraient etre activees directement par le prof ?
- Quand le prof clique "Utiliser" sur une carte dans `VipCardsModal`, ca appelle `use-card` endpoint (approbation) alors que conceptuellement c'est une activation directe. Est-ce le bon endpoint ?
- `VipCardsModal.markCardAsUsed()` pose `usedAt` en optimistic PUIS appelle `use-card` qui pose `activationApprovedAt`. Mais `use-card` rejetait les cartes deja approuvees. Bug corrige recemment mais le flow reste confus.

**Audit trail :**

- Le trigger `log_vip_card_changes()` ne logue plus que les 'removed'. Les 'gained' et 'used' sont censes etre logues par les RPCs.
- MAIS l'endpoint `use-card` ne passe pas par un RPC - il fait un UPDATE direct sur `profiles.vip_cards`. Donc pas de log 'used' automatique.
- Un insert direct dans `vip_cards_activity` a ete ajoute dans `use-card` pour les cartes bonus (sans action). Mais quid des cartes AVEC action activees via ce meme endpoint ?
- Le RPC `use_vip_card` insere bien dans `vip_cards_activity`. Mais il n'est utilise que par `TeacherDashboard.svelte` pour Batman/Mathemagie.
- Verifier CHAQUE chemin d'activation et confirmer que `vip_cards_activity` recoit bien un INSERT a chaque fois.

**Coherence :**

- Il y a 2 mecanismes paralleles : le JS dans `use-card/+server.ts` et le RPC `use_vip_card`. Ils font la meme chose differemment. Peut-on unifier ?
- Les cartes sans action (bonus, privilege, etc.) n'ont pas de step 2 eleve. Le fix actuel auto-consomme dans `use-card`. Est-ce suffisant ?

### 4. Corrections recentes (contexte)

Commit `557ebb3d` : `use-card` auto-consomme les cartes sans action (pose `usedAt` en plus de `activationApprovedAt`).

Modification non commitee :

- `use-card` ne rejette plus les cartes deja approuvees si elles sont sans action
- `use-card` insere dans `vip_cards_activity` pour les cartes bonus auto-consommees

### 5. Livrable attendu

1. **Cartographie complete** : tableau de tous les chemins d'activation avec pour chacun : declencheur, endpoint/RPC, ce qui est pose dans `profiles.vip_cards`, ce qui est insere dans `vip_cards_activity`, ce qui arrive dans `reward_events`
2. **Bugs identifies** : chemins ou l'audit trail est manquant
3. **Proposition de simplification** : unifier les mecanismes si possible, clarifier le flow pour chaque type de carte
4. **Plan d'implementation** si des changements sont necessaires
