# Constructions animées — journal

## Reprendre ici

_Mis à jour le 2026-10-22, avant la première PR._

- **État** : lot sécurité codé (phase 0 validée par David le 2026-10-22) : migration `20261022200000`, API, pages, tests rouges prouvés puis verts. Migration appliquée sur la base **locale** seulement.
- **Prochaine action** : PR #1615 ouverte, revues faites (`security-auditor` : aucun bloquant ; `code-reviewer` : mineurs corrigés) → CI verte → merge → `db:migrate` depuis `main` (4 conditions réunies).
- **En attente de David** : rien.
- **Pièges en cours** : un client Supabase tourne dans le navigateur → la règle doit être tenue en base (RLS), pas seulement par l'API.
- **Worktree / branche** : `../ubumaths-wt-constructions` · `fix/constructions-securite`.
- **Suite du chantier** (ordre proposé, non validé) : consignes des sous-étapes affichées · convertisseur `@cacher` · ménage → parallèle double perpendiculaire · formes `(P, d)` décorées → `@mesure` (rapporteur).

---

## Lot 1 — Sécurité (2026-10-22)

### Question d'accès (tranchée par David le 2026-10-22)

- **Écriture** : créer, modifier, publier une construction = **prof et admin seuls**. Un élève ne peut plus en créer. Mesure prod : 9 constructions, toutes publiques, toutes sans auteur (comptes supprimés) ; aucun élève n'en a écrit → personne ne perd rien qu'il utilise.
- **Lecture** : inchangée — tout compte connecté lit les constructions publiées (contenu de cours écrit par un adulte).

### Phase 0 — comportements

Nominal :

1. Un prof (ou l'admin) crée, modifie, publie, supprime ses constructions comme aujourd'hui.
2. Un élève voit la liste `/constructions` et joue les constructions publiées, comme aujourd'hui.

Limite :

3. Un élève n'a plus les boutons « Nouvelle construction » ni « Conversion » sur `/constructions`.
4. Un élève qui ouvre `/constructions/new` ou `/constructions/[id]/edit` à la main reçoit un 403.
5. Un élève qui conserve une construction (cas théorique : ancien prof devenu élève) peut encore la **supprimer**, plus la modifier.

Erreur :

6. `POST /api/constructions` et `PUT /api/constructions/[id]` par un élève → **403**, rien d'écrit.
7. Un élève qui écrit **directement en base** (client Supabase du navigateur) : `insert` refusé (erreur `42501`), `update` → zéro ligne modifiée. Tenu par la RLS : `INSERT` et `UPDATE` exigent `is_teacher_or_admin()` en plus de `auth.uid() = author_id`.

Migration : **additive au sens du risque** (resserre deux policies, aucune donnée touchée) ; rollback écrit en commentaire (les deux policies d'origine).

### Réalisé (2026-10-22)

- Migration `20261022200000_constructions_ecriture_prof_admin.sql` : `INSERT` et `UPDATE` exigent `is_teacher_or_admin()`. Test `tests/integration/constructions-ecriture-reservee.test.ts` : 3 rouges sans la migration (création élève ×2, modification élève), 7/7 verts avec.
- API : `POST` et `PUT` → `requireRoles(CONSTRUCTION_AUTHOR_ROLES)` (`src/lib/server/constructions-access.ts`) ; `DELETE` avec `.select()` (zéro ligne → 404).
- Pages : `/constructions/new` et `/constructions/[id]/edit` → 403 pour un élève ; boutons « nouvelle », « importer XML », « modifier » masqués (`canAuthor`). Test `src/routes/api/constructions/__tests__/ecriture-reservee.test.ts` : 6 rouges sans le correctif, 10/10 verts avec.
- Revues : `security-auditor` aucun finding bloquant ; `code-reviewer` → PUT refusé par la RLS = 404, assertions 200/201 strictes, DELETE à zéro ligne testé (11/11).
