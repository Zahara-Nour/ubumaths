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

**PR app-layer (`fix/security-vague1`, stacked sur vague0)** — H4/H5/H6/H7/H11/H13 :

- [x] H4 XSS notebook : `{@html sanitizeHtml(...)}` sur la sortie de cellule (`CellOutputs.svelte`)
- [x] H5 flag Google login : `$lib/config/google-login.ts` + hard-fail server dans `googleSignIn` action ET `/auth/callback` (le flag UI ne gardait rien). ⚠️ **à faire côté ops** : confirmer le provider Google désactivé dans le dashboard Supabase Auth.
- [x] H6 password policy : `validatePasswordPolicy` branché via `.superRefine()` dans `registerFormSchema` + `updatePasswordSchema` (était du code mort). ⚠️ activer aussi « leaked password protection » au dashboard.
- [x] H7 reset password : Zod (`requestPasswordResetSchema`) + rate limit dédié (email 3/h, IP 20/h) avant l'envoi, réponse générique conservée (anti-énumération)
- [x] H11 chat : `chatMessageSchema` restreint à `user|assistant` (plus de `system` côté client → anti prompt-injection)
- [x] H13 latex compile : `requireAuth` (fermait le seul endpoint sans auth = proxy ouvert)
- [x] Tests : `security-hardening.test.ts` (5) + unit rate-limiter/password/login verts

**PR DB RGPD (`fix/security-vague1b`, stacked sur vague1)** — H14/H15 :

- [x] H14 pending_students : trigger AFTER INSERT sur profiles purge la ligne PII à l'activation + backfill (retention des jamais-activés = cron, différé M19). Test self-registration mis à jour (purge au lieu de « marked activated »).
- [x] H15 moderation_logs FK : `moderator_id` nullable + `ON DELETE SET NULL` (débloque la suppression staff, garde le log anonymisé).
- [x] Test `security-rgpd-erasure.test.ts` (2). Suite complète : 433 passed + 2 nouveaux (1 flake pré-existant `vip-card-enabled-filtering` funding-race, vert en isolation).

**PR DB exposition (`fix/security-vague1c`, stacked sur vague1b)** — H8/H12 :

- [x] H8 share-tokens : RPC definer `get_exercise_by_share_token(p_token)` (token requis → pas d'énumération/dump) + DROP des 2 policies blanket PUBLIC (`exercises` / `exercise_share_tokens`) + `getExerciseByShareToken` passe par la RPC + génération de token en CSPRNG (crypto). Policies propriétaire + `is_public` conservées.
- [x] H12 thread : `get_message_thread` filtre la sortie aux messages dont l'appelant est expéditeur OU destinataire (plus de fuite inter-destinataires). Reprend la garde `auth.uid()` de vague0.
- [x] Tests `security-share-tokens.test.ts` (1) + `security-message-thread.test.ts` (2). Suite complète **437 passed / 0 failed**.

**PR DB (à venir, stacked)** :

- [ ] H9/H10 auto-inscription par code (handle_new_user re-résout le code ; drop `students_can_join`) — ⚠️ touche le trigger de signup (fragile)
- [ ] H1 sweep `REVOKE … FROM anon` + `ALTER DEFAULT PRIVILEGES` + whitelist (⚠️ RISQUÉ, blast radius large)
- [ ] H2/H3 cookies HTML (retirer `cookies` du +layout.server.ts), CSP (retirer unsafe-eval/inline), maxAge

> ⚠️ **Flake de test connu** (pré-existant, non lié à la sécu) : `vip-card-enabled-filtering > all cards disabled` échoue par intermittence en suite complète (« Insufficient gidouilles: available 0 » = race de funding dans ProfileBuilder), vert en isolation. À traiter côté test-infra.

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
