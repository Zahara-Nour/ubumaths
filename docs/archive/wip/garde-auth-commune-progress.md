---
title: Garde d'authentification commune (écart T7) — journal
date: 2026-11-03
status: clos — #2311 mergée le 2026-11-03 (suite dans ecarts-a-trier-progress.md)
---

## Reprendre ici

_Mis à jour le 2026-11-03, avant la PR._

- **État** : `requireAuth(user)` des pages renommée `requireUserOrRedirect` ; 62 endpoints API passés de la garde à la main à `middleware/auth.ts` (rôles préservés, jamais `requireAdmin`). Laissés : `admin/elevate*` (parcours d'élévation), `auth/logout`, `errors/log` (session optionnelle), GET de `python-exercises/[id]` (session optionnelle).
- **Prochaine action** : CI verte, merge de #2311 ; puis T8 (journal `ecarts-a-trier`). Revues faites : sécurité sans finding bloquant ; code → panne de lecture du profil en 500 dans la garde commune (fait).
- **En attente de David** : rien.
- **Pièges en cours** : doublure de test `tests/helpers/garde-auth-locals.ts` (lit `locals.user`/`locals.profile`, sinon la vraie garde) ; `preview` et `students` gardent une requête `profiles` redondante dans leurs helpers.
- **Worktree / branche** : `../ubumaths-wt-garde-auth-commune` · `refactor/garde-auth-commune`.

---

Chantier parent : [ecarts-a-trier-progress.md](../../wip/ecarts-a-trier-progress.md) (T7).

Changements de comportement voulus : « pas de session » → 401 partout (certains répondaient 403) ; messages d'erreur de la garde ; profil absent → 403 (certains laissaient passer, ou 404/500) ; `tests/save` → `HttpError` au lieu de `json({error})` (le client ne lit que le statut).

## Revues de #2311 (2026-11-03)

- `security-auditor` : personne ne gagne d'accès ; aucun contrôle perdu (consentement, auteur, école, marketplace, restriction) ; statut vérifié en amont par `accountStatusHandle`.
- `code-reviewer` : 15 gardes à la main distinguaient « profil absent » (403) et « panne de lecture » (500) → reporté dans `requireAuth` (PGRST116 → 403, sinon 500), test vu rouge puis vert.
- **À signaler à David, non traité** : (1) performance — `requireAuth` relance `getUser()` et relit `profiles` alors que le hook l'a déjà fait (vrai pour les 342 endpoints) ; (2) antérieur à la PR — `python-exercises/mastery` et `[id]/mastery` prennent `student_id` du client et ne comptent que sur la RLS ; `worksheets/…/correction` ouvert à tout prof (sans effet en mono-prof).
