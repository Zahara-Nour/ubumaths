# Remédiation sécurité 2026-08 — Progression (crash-recovery)

Rapport d'audit : [`security-audit-2026-08.md`](./security-audit-2026-08.md).
Mandat : David a validé d'avance tous les TDD et toutes les propositions ; exécution autonome en continu jusqu'à la fin.
**Seule réserve** : `pnpm db:migrate` (push prod EU live) + merge prod = gate final explicite (données mineurs, irréversible). Tout le reste autonome.

## Stratégie git

- Doc d'audit + progression : branche `chore/security-audit-2026-08` (créée depuis `feat/referentiel-ubumark-math`).
- **Fixes** : branches depuis `main`, PR → `main` (fixes prod urgents, indépendants du référentiel). Workflow obligatoire : branche → PR → CI verte → merge.
- Migrations empilées par timestamp ; tests d'intégration locaux **obligatoires** (RLS/definer).

## État des vagues

### Vague 0 — INCIDENT (8 critiques) — ✅ CODE PRÊT (PR fix/security-vague0)

Branche `fix/security-vague0` (depuis `main`). Migrations `20260902090000`→`094000`.
Tests : `security-anon-reachability.test.ts` + `security-authz-guards.test.ts` (14 tests, verts).
Suite d'intégration complète : **426 passed / 0 failed / 12 skipped** après les fixes.

- [x] Tests d'intégration « anon reachability » + « role escalation » (14 tests)
- [x] C1 `promote_user_to_admin` REVOKE PUBLIC/anon/auth + garde `is_admin` (null-uid OK)
- [x] C5 `delete_user_account` REVOKE PUBLIC/anon/auth + regrant service_role
- [x] C6 `search_users_unaccent` garde `is_admin` + clamp limit + REVOKE PUBLIC/anon
- [x] C7 `check_and_increment_rate_limit` + `cleanup_expired_rate_limits` REVOKE PUBLIC/anon/auth + regrant service_role
- [x] C2 `profiles` DROP policy anon SELECT + REVOKE anon (partie critique non authentifiée). ⚠️ narrowing policy `authenticated USING(true)` **différé Vague 1** (casse la feature « amis » sans policy dédiée)
- [x] C3 `send_private_message` + 6 RPC lecture : garde `auth.uid()` (exempte service_role) + REVOKE PUBLIC/anon + GRANT authenticated/service_role
- [x] C4 policy UPDATE `profiles` WITH CHECK (role=student) + trigger `guard_profile_role_change` + garde app `update_profile`
- [x] C8 draw VIP prix serveur + rareté bloquée (self-draw non privilégié) + `validate_riddle_attempt` garde teacher/admin + garde app. ⚠️ scores jeux 2048/mathemo + validation carte d'action (vip_card branch) **différé Vague 1**
- [ ] Vérif post-deploy prod (MCP read-only) — après `db:migrate` (gate David)

**Bug attrapé par les tests** : `REVOKE ... FROM anon` seul est insuffisant (EXECUTE est PUBLIC par défaut, anon ∈ PUBLIC) → il faut `REVOKE FROM PUBLIC` + `GRANT TO authenticated/service_role`. Sinon anon lisait n'importe quelle inbox.

**Revue (security-auditor + code-reviewer) — 2 blockers corrigés :**

- **F1** : le fix C8 prix/rareté était côté endpoint SEULEMENT → contournable en appelant `draw_multiple_vip_cards` directement via PostgREST. Ajout de **gardes internes dans la RPC** (`20260902096000`) : rareté forcée réservée teacher/admin (42501) + plancher ≥1 gidouille/carte (22023), avec exemption service_role (null-uid). Le prix UI complet (VIP_CARD_COST=3) reste appliqué à l'endpoint.
- **F2** : un élève pouvait s'auto-écrire `gidouilles` (monnaie illimitée) / `school_id` (frontière safeguarding) via « Users can update own profile » (WITH CHECK n'épinglait que role/status). Correctif `20260902097000` : gidouilles cappé au courant (baisse OK → buddy/change ; hausse bloquée ; les gains passent par des RPC definer qui bypassent la RLS) + school_id figé. `vip_cards` non figé (flux directs légitimes) → Vague 1.
- Régressions tests corrigées (garde messagerie exempte service_role ; VIP tests paient 1/carte) ; 5 tests d'escalade authentifiée ajoutés (F4). Suite complète : **432 passed / 0 failed / 12 skipped** (1 flake pré-existant non déterministe de funding VIP, confirmé vert au re-run).

**Reste pour Vague 1** (issus de la Vague 0) : narrowing policy `profiles authenticated` + policy « amis » + RPC classement ; scores de jeux client (2048/mathemo/tournoi) ; validation carte d'action VIP (`vip_card` branch) + figer `vip_cards` ; prix économie complet.

### Vague 1 — sweep systémique + haute sévérité (H1-H15)

- [ ] H1 sweep `REVOKE … FROM anon` + `ALTER DEFAULT PRIVILEGES` + whitelist
- [ ] H2/H3 cookies HTML, CSP, maxAge
- [ ] H4/H11 XSS notebook + schéma chat
- [ ] H5 flag Google login
- [ ] H6/H7 password policy + reset
- [ ] H8 share-tokens
- [ ] H9/H10 auto-inscription par code
- [ ] H12 thread CTE filtre
- [ ] H13 latex compile auth
- [ ] H14/H15 RGPD erasure (pending_students, moderation_logs FK)

### Vague 2 — durcissement + RGPD (M1-M24)

- [ ] cluster RGPD (M13, M19, M20, M23)
- [ ] storage (M1)
- [ ] endpoints defense-in-depth (M4-M12)
- [ ] frontières (M14, M16, M21, M22)
- [ ] client (M2, M3, M17, M24)

### Vague 3 — nettoyage (L1-L7)

- [ ] L1-L7

## Journal

- 2026-08-30 : audit livré, doc committé, démarrage Vague 0.
