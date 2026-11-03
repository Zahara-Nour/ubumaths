---
title: Garde d'authentification commune (écart T7) — journal
date: 2026-11-03
status: PR ouverte, revue sécurité en cours
---

## Reprendre ici

_Mis à jour le 2026-11-03, avant la PR._

- **État** : `requireAuth(user)` des pages renommée `requireUserOrRedirect` ; 62 endpoints API passés de la garde à la main à `middleware/auth.ts` (rôles préservés, jamais `requireAdmin`). Laissés : `admin/elevate*` (parcours d'élévation), `auth/logout`, `errors/log` (session optionnelle), GET de `python-exercises/[id]` (session optionnelle).
- **Prochaine action** : revue `code-reviewer` + `security-auditor` (Opus), CI verte, merge ; puis T8 (journal `ecarts-a-trier`).
- **En attente de David** : rien.
- **Pièges en cours** : doublure de test `tests/helpers/garde-auth-locals.ts` (lit `locals.user`/`locals.profile`, sinon la vraie garde) ; `preview` et `students` gardent une requête `profiles` redondante dans leurs helpers.
- **Worktree / branche** : `../ubumaths-wt-garde-auth-commune` · `refactor/garde-auth-commune`.

---

Chantier parent : [ecarts-a-trier-progress.md](ecarts-a-trier-progress.md) (T7).

Changements de comportement voulus : « pas de session » → 401 partout (certains répondaient 403) ; messages d'erreur de la garde ; profil absent → 403 (certains laissaient passer, ou 404/500) ; `tests/save` → `HttpError` au lieu de `json({error})` (le client ne lit que le statut).
