---
title: Thème authentication — Documentation de référence
date: 2026-06-12
version: 1.0
status: vivant
audience: développeurs UbuMaths (nouveaux et mainteneurs)
scope: authentification & autorisation — Supabase Auth (login/session) + Google OAuth (API)
---

# Thème `authentication` — Documentation de référence

Système d'authentification et d'autorisation d'UbuMaths (SvelteKit 5 + Supabase

- Vercel). Couvre la connexion des utilisateurs (session, rôles, garde des
  routes) **et** l'autorisation des API Google (Classroom / Drive / Gmail).

> **Ce répertoire suit le modèle** de [`docs/ref/geometry/`](../geometry/). Doc
> en français, code et commentaires en anglais.

---

## ⚠️ Le point à ne jamais confondre : deux process « auth » distincts

Le mot « auth » recouvre **deux process indépendants**, et le mot « Google »
apparaît dans les deux — d'où la confusion que cette doc existe pour tuer.

| Process                            | Ce que c'est                                                                                                                                                                               | Produit une session ?             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **SUPABASE AUTH** (login/session)  | Connexion d'un utilisateur : email+mot de passe **ou** « Se connecter avec Google » (bouton Lycée Voltaire, `@voltairedoha.com`). Google n'est ici qu'un **fournisseur d'identité (IdP)**. | **Oui** — session Supabase + RBAC |
| **GOOGLE AUTH** (autorisation API) | Un prof **connecte son compte Google** pour autoriser UbuMaths à appeler Classroom/Drive/Gmail. OAuth 2.0 + PKCE, tokens chiffrés en base.                                                 | **Non** — ce n'est pas un login   |

> **« Se connecter AVEC Google » (Supabase Auth) ≠ « Connecter SON compte Google
> pour Classroom » (Google Auth).** Deux mécanismes Google totalement différents,
> deux callbacks différents (`/auth/callback` vs `/api/google/auth/callback`).

---

## Chiffres clés (2026-06-12)

| Indicateur                           | Valeur                                                  |
| ------------------------------------ | ------------------------------------------------------- |
| Fichiers — Process 1 (Supabase Auth) | 20 (2 982 lignes)                                       |
| Fichiers — Process 2 (Google OAuth)  | 15 (5 982 lignes)\*                                     |
| Tests rattachés                      | 4 fichiers — **154 tests**                              |
| Posture sécurité globale             | **Solide** (0 critical)                                 |
| Findings sécurité                    | 8 MEDIUM / 6 LOW                                        |
| Dette qualité critique               | **2 HIGH** (redirections `/login`, mot de passe 6 vs 8) |
| Hot path identifié                   | `getUser()` + `SELECT profiles` à chaque requête        |
| Documents de référence               | 9 (+ ce README)                                         |

> \* Process 2 inclut les consommateurs d'API (Classroom/Drive/Gmail) qui sont
> **hors périmètre d'audit** ici — la couche autorisation seule est documentée ;
> le reste relèvera d'un futur `docs/ref/google-classroom/`.
>
> Chiffres vérifiés via `wc -l` sur le périmètre et
> `grep -cE "^\s*(it|test)\(" --include="*.test.ts"`.

---

## Les 9 documents de référence

### Cœur

#### 1. [architecture.md](./architecture.md) — Vue d'ensemble

> **Audience** : nouveaux développeurs, onboarding · **Longueur** : 395 lignes

Les 2 process / 3 flux avec diagrammes de séquence, la chaîne de hooks
(`hooks.server.ts`), le modèle `locals` (user/profile/supabase), le RBAC lu
en DB, la propagation de session côté client, l'**invariant TDZ Safari** (import
dynamique de `@supabase/ssr`), le cycle de vie du compte (`status`), la carte des
fichiers, et les guides « ajouter une route protégée / un rôle ».

**À lire en premier.**

#### 2. [code-quality.md](./code-quality.md) — Qualité & dette technique

> **Audience** : mainteneurs, avant refactor · **Longueur** : 438 lignes

2 bugs **HIGH** (redirections vers `/login` inexistant → 404 ; validation mot de
passe 6 vs 8), le doublon de modules RBAC (`auth.ts` vs `middleware/auth.ts`),
les schémas Zod non branchés, la duplication, les fonctions trop longues.

#### 3. [security.md](./security.md) — Sécurité

> **Audience** : mainteneurs, sécurité · **Longueur** : 366 lignes

Posture **solide**. Positifs (`getUser()`-only, restriction domaine serveur,
PKCE+state, AES-256-GCM, double rate-limit, CSP). Findings : open-redirect via
`next` dans le callback, parité mot de passe, approbation deny-by-exclusion,
dérivation de clé sans KDF, rate-limit fail-open, dette XSS CSP.

#### 4. [performance.md](./performance.md) — Performance

> **Audience** : perf, avant déploiement · **Longueur** : 345 lignes

Hot path = `getUser()` (réseau) + `SELECT * profiles` à chaque requête. Quick
wins fort impact (select ciblé, réutiliser `locals.user`, lire le profil élève
depuis `locals`). Ce qui est **déjà bien optimisé**. Encart « pas d'optimisation
en aveugle » (mesurer avant tout cache à TTL).

#### 5. [tests.md](./tests.md) — Tests & couverture

> **Audience** : QA, test-automator · **Longueur** : 268 lignes

4 fichiers / 154 tests (cron, rate limiter, drive-api, google-drive). Surtout :
les **angles morts** — flux login, callback OAuth, restriction de domaine, RBAC
et `approval_status` sont à **0 test direct**. Backlog de tests.

### Complémentaires

#### 6. [data-model.md](./data-model.md) — Modèle de données

> **Audience** : backend, DB · **Longueur** : 299 lignes

Tables `profiles` (`role`, `status` enum `user_status`), `google_integrations`
(tokens chiffrés), `user_restrictions`, `user_presence` ; trigger
`handle_new_user` ; politiques **RLS** (dont l'anti-auto-promotion du rôle).

#### 7. [api.md](./api.md) — Surface publique

> **Audience** : développeurs intégrateurs · **Longueur** : 378 lignes

Référence des deux surfaces : RBAC / session (`requireAuth`, `requireRole`,
`getUserProfile`, `hasRole`…) et Google OAuth (`getAuthUrl`,
`exchangeCodeForTokens`, `refreshAccessToken`, `revokeAccess`,
`encryptToken`/`decryptToken`). Signatures exactes + exemples.

#### 8. [decisions.md](./decisions.md) — Décisions d'architecture

> **Audience** : architecture, onboarding · **Longueur** : 312 lignes

9 ADR : `getUser()`-only, rôle en DB, restriction domaine serveur, import
dynamique (TDZ Safari), PKCE+state, tokens AES-256-GCM, workflow d'approbation,
rate-limit fail-open, et le **doublon RBAC** (décision ouverte).

#### 9. [glossaire.md](./glossaire.md) — Glossaire

> **Audience** : tous · **Longueur** : 155 lignes

~30 termes (session, IdP, OAuth, PKCE, `state`, scope, RLS, `approval_status`,
`safeGetSession`, TDZ Safari…), chacun tagué Process 1 / Process 2 / les deux.

---

## [progress/](./progress/) — Documents de travail

Les progress docs (`docs/wip/`) liés à ce thème seront regroupés ici. **Vide
pour l'instant** : aucun wip auth/google n'existait dans `docs/wip/` à la
création de cette doc.

---

## Voir aussi

- [`docs/ref/geometry/`](../geometry/) — Répertoire modèle pour cette structure.
- [`docs/ref/safari-webkit-tdz.md`](../safari-webkit-tdz.md) — Détail de
  l'invariant TDZ (import dynamique `@supabase/ssr` dans le root layout).
- [`docs/architecture/database-schema.md`](../../architecture/database-schema.md)
  — Schéma DB complet (tables `profiles`, `google_integrations`…).
- [`CLAUDE.md`](../../../CLAUDE.md) — Instructions projet pour Claude Code.
- Futur `docs/ref/google-classroom/` — Consommateurs des API Google (Classroom /
  Drive / Gmail), hors périmètre du thème authentication.
