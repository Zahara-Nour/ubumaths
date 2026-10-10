# RGPD et sécurité — progression

> Chantier ouvert le 2026-10-10. Constats : [rgpd-securite-constats.md](rgpd-securite-constats.md).
> Worktree `../ubumaths-wt-rgpd`, branche `fix/rgpd-suppression-compte`.

## Ordre fixé par David

1. A1 — suppression de compte (art. 17)
2. B4 — élévation admin qui survit au logout
3. A2 — mode lecture seule contournable (garde côté base à proposer)
4. E19 — six fonctions qui écrivent dans `gidouilles_history`
5. A3 — règle de consentement : question produit, David tranche
6. Le reste (B5-B8, C, D, E20) : ordre à proposer ; C point par point (code ou documents)

## A1 — suppression de compte

### Mesures en prod (MCP lecture seule, 2026-10-10)

- `delete_user_account` en prod = celle du baseline. Tables absentes : `shop_purchase_history`,
  `item_usage_log`, `student_item_inventory`, `message_template_audit`, `message_template_drafts` ;
  colonne absente : `notifications.user_id`.
- Colonnes `NOT NULL` que la fonction passe à NULL : `gidouilles_activity.student_id`,
  `bonus_history.student_id`, `vip_cards_activity.student_id` (élève) ;
  `exercises.created_by`, `exercise_assignments.assigned_by`, `message_template_versions.modified_by`
  (prof).
- **Second verrou, absent des constats** : clés étrangères vers `profiles` sans `ON DELETE`
  (`NO ACTION`) → `auth.admin.deleteUser` échouerait même la fonction réparée.
  Côté élève : `exercise_completions.student_id`, `exercise_assignments.student_id`,
  `student_achievements.unlocked_by`. Côté prof : `exercise_assignments.assigned_by`,
  `exercise_share_tokens.created_by`, `user_restrictions.restricted_by`,
  `template_audit_log.performed_by`, `migration_edits.editor_id`, `message_templates.reviewed_by`,
  `message_template_versions.modified_by`, `worksheet_error_reports.reviewed_by`,
  `class_journal_share_tokens.created_by`, `game_challenges.created_by`, `game_monsters.*`.
- `account_deletion_audit` vide : **aucune suppression n'a jamais été tentée en prod**.
- `exercise_completions` / `exercise_assignments` : 0 ligne d'élève en prod aujourd'hui.
- Le local reproduit la prod (mêmes tables absentes, mêmes `NOT NULL`).

### État

- [x] Test rouge : `tests/integration/suppression-compte-art17.test.ts`
- [ ] Question d'accès posée à David
- [ ] Migration
- [ ] security-auditor
- [ ] Docs : `docs/systeme/conformite/`, `auth.md`, `base-de-donnees.md`

### Décisions de David (2026-10-10, question d'accès)

1. Économie (gidouilles, bonus, cartes VIP) : **tout supprimer** (cascade), plus d'anonymisation.
2. Messages de l'élève : **supprimés pour tous**, texte et aperçu compris (les signalements de ces
   messages partent avec eux, `message_reports` en cascade).
3. **Élèves seulement** : prof/admin refusés (403 route, refus dans la fonction, bouton masqué).

### Fait

- Migration `20261014100000_suppression_compte_art17.sql` ; test d'intégration rouge sans elle
  (`23502` élève actif, `42P01` élève vierge), vert avec (5/5). Tests voisins verts (655).
- Route : 403 prof/admin avant limite de débit et audit (test unitaire rouge → vert).
- Docs : `rgpd.md` §5.2 et §7.2 réécrits, README conformité §2, AIPD.

## A2 — mesures en prod (2026-10-10)

- 11 élèves en lecture seule (consentement requis, ni accordé ni en grâce), 70 non soumis, 0 consenti.
- Depuis la fin de leur grâce : 0 message, 0 annonce du marché, 0 message de marché, 0 partie de
  démineur → **contournement non exploité à ce jour** (reste à prouver par un test qu'il est possible).
- **Mais 56 versements de gidouilles `weekly_no_warning`** (tâche hebdomadaire, sans auteur) à ces
  élèves, alors que `earn_rewards` est une action fermée en lecture seule → question à David.
