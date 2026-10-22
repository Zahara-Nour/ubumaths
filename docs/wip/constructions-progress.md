# Constructions animées — journal

## Reprendre ici

_Mis à jour le 2026-10-22, après #1615._

- **État** : lot 1 sécurité **livré** — #1615 mergée, migration `20261022200000` appliquée en prod (policies relues). Le code (API, pages) part au prochain `deploy:prod` ; d'ici là, un élève qui tenterait de créer reçoit une erreur 500 de la base (refus RLS), pas un 403.
- **Prochaine action** : choisir le lot suivant avec David (aucun worktree ouvert).
- **En attente de David** : le choix du lot 2. Proposé : consignes des sous-étapes affichées + convertisseur `@cacher` → `masque` + ménage (commentaires périmés, code mort, `any`) ; puis parallèle double perpendiculaire + formes `(P, d)` décorées ; `@mesure` (rapporteur) = chantier à part.
- **Pièges en cours** : aucun.
- **Worktree / branche** : aucun (supprimé après #1615). Lot suivant : `git worktree add -b feat/constructions-<lot> ../ubumaths-wt-constructions origin/main`.

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
