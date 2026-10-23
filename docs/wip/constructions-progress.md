# Constructions animées — journal

## Reprendre ici

_Mis à jour le 2026-10-23, après #1621._

- **État** : lot 5 **livré** — #1621 mergée : `parallele @euclide @double_perpendiculaire` (16 sous-étapes) et `@equerre @double_perpendiculaire` (10), `P ∈ (AB)` → erreur à la ligne. Code des lots 1 à 5 (#1615, #1616, #1618, #1619, #1621) part au prochain `deploy:prod`. Vérification à l'œil notée dans `verifications-manuelles.md`.
- **Prochaine action** : choisir le lot 6 avec David.
- **En attente de David** : le lot 6. Restent : formes `(P, d)` décorées · `@mesure` (rapporteur, chantier à part) · consigne affichée après une erreur d'exécution = celle de la sous-étape fautive (cosmétique) · (revue #1621, mineur) tests de la double perpendiculaire sur d'autres décors ((AB) verticale, P dessous).
- **Pièges en cours** : 3 constructions en prod avec des `@cacher("T_3")`/`@cacher("arc_9")` sans effet, non réparées (choix de David) ; base locale : `migration up` bute sur `20261022200000` ; `db:migrate` depuis le dépôt principal seulement. Test qui déplace un point : `movePoint` ne fait que marquer sale → appeler `figure.recompute()`.
- **Worktree / branche** : `../ubumaths-wt-constructions` gardé le temps de la vérification de David (serveur 5177), puis supprimé. Lot suivant : `git worktree add -b <type>/constructions-<lot> ../ubumaths-wt-constructions origin/main`.

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

## Lot 2 — Consignes, `masque`, ménage (2026-10-23)

Inventaire de départ : [constructions.md](../systeme/geometrie/constructions.md) § Fonctions manquantes, Dette de code, Commentaires périmés.

### Phase 0 — validée par David le 2026-10-23

**A. Consignes des sous-étapes affichées** (`SubStep.instruction`, ~60 consignes écrites, jamais affichées)

1. Pendant une sous-étape qui porte une consigne, le lecteur l'affiche ; elle suit le curseur (avancer, reculer, recommencer).
2. Instruction non chorégraphiée, ou sous-étape sans consigne : rien de plus ; la consigne de sous-étape disparaît au pas suivant.
3. **Deux lignes** (choix de David) : la consigne `@instruction` de l'auteur reste en haut, celle de la sous-étape dessous, plus petite.
4. Construction en erreur : figure partielle comme aujourd'hui ; consigne = celle du dernier pas joué.

**B. Convertisseur** : un point « masquer » / « montrer » de l'XML IEP → `masque(A)` / `montre(A)` (au lieu de `@cacher("A")` / `@montrer("A")`, sans effet). Instruments inchangés (`@cacher`). Les 3 constructions déjà en prod ne sont **pas** réparées (choix de David) : leurs arguments sont des identifiants IEP (`T_3`, `arc_9`) sans nom dans le script.

**C. Ménage sans changement de comportement** : code mort (`resolveCurrentDecorators`, `_speedFactor`, `ConstructionMeta`, `DirectiveName`) ; `any` de `ScriptEditor.svelte` ; coloration de l'éditeur tirée de `BUILTIN_NAMES` (seul changement visible) ; commentaires périmés du code et `couvre:` du README ; `constructions.md` mis à jour. Journaux d'archive inchangés.

**Hors lot** (choix de David) : les deux défauts de l'API des scripts de démo → lot à part (revue sécurité).

Revue : `code-reviewer` (Sonnet).

### Réalisé (2026-10-23)

- **A** : `ConstructionPlayer.svelte` lit `executor.currentSubStep?.instruction` dans `syncState()` et l'affiche sous la consigne de l'auteur (« ↳ », plus petit). Test `components/__tests__/ConstructionPlayer-consignes.svelte.test.ts` : 4 rouges sans le code, 4/4 verts avec (rendu réel, curseur avant/arrière).
- **B** : `converter.ts` écrit `masque(A)` / `montre(A)`. 2 tests dans `converter.test.ts` (sortie + point réellement masqué à l'exécution) : rouges sans le correctif, verts avec.
- **C** : code mort retiré, `any` de l'éditeur → `StateEffectType<number[]>`, coloration tirée de `BUILTIN_NAMES` / `MATH_FUNCTIONS` (sur-ensemble strict de l'ancienne liste, aucun mot ne change de couleur), 7 commentaires corrigés, `constructions.md` recalé (numéros de ligne, lignes réglées retirées, les 3 constructions de prod notées).
- `check:incremental` 0 erreur · `types:cliquet` tenu · `lint:fast` propre · `test:server constructions-v2` 189 ✓ / 21 ignorés.

## Lot 3 — API des scripts de démo (2026-10-23)

**Phase 0 validée par David** : `DELETE` d'un id étranger ou inconnu → 404 « Script introuvable », rien de supprimé ; erreur de la base → 500 en français, détail au journal serveur ; question d'accès : **prof et admin seulement** (lecture comprise), comme l'écriture des constructions. Mesuré en prod : 5 scripts, tous de l'admin ; personne ne perd rien.

### Réalisé

- `+server.ts` : `requireRoles(CONSTRUCTION_AUTHOR_ROLES)` sur les trois verbes, `DELETE … .select('id')` (zéro ligne → 404), `logger.error` + message fixe en 500.
- Migration `20261023150000_construction_demo_scripts_prof_admin.sql` : la policy `*` « les siens » devient « les siens, prof ou admin » (`is_teacher_or_admin()`), rollback en commentaire.
- Tests : `api/construction-demo-scripts/__tests__/api.test.ts` (7 rouges sans le correctif, 9/9 verts) ; `tests/integration/construction-demo-scripts-reserves.test.ts` (2 rouges sans la migration — cas élève —, 5/5 verts avec).
- `constructions.md` : tables, API, dette réglée retirée.
- Non fait (hors lot) : la page `/construction-demo` montre toujours « Sauvegarder » à un élève, qui reçoit un toast d'erreur 403.
- Revues : `code-reviewer` et `security-auditor` sans finding bloquant ; ajout des tests « `author_id` usurpé » et « visiteur non connecté » (7/7). CI verte, mergée (#1618), `db:migrate` joué en prod le 2026-10-23 (policy vérifiée : une seule, `authenticated`).

## Lot 5 — Parallèle par double perpendiculaire (2026-10-23)

**Phase 0 validée par David** (2026-10-23), deux voies `double_perpendiculaire` :

- **`@euclide`** (le stub `NOT_YET_IMPLEMENTED` de `parallele.ts`) :
  1. Perpendiculaire à `(AB)` par `P`, animée comme `perpendiculaire @euclide` (`rayon_libre`, 7 sous-étapes, via `ctx.sub`) → la droite auxiliaire `e` apparaît.
  2. Perpendiculaire à `e` **au point `P`** (P ∈ e : `rayon_libre` dégénère) : deux petits arcs en `P` coupent `e` en `C*`, `D*` (fade-in) ; ouverture **plus grande**, arcs en `C*` puis `D*` qui se croisent en `R` (fade-in) ; règle `(PR)` = la parallèle.
- **`@equerre`** (nouvelle) : équerre posée sur `(AB)`, angle droit au pied, tracé de `e` ; puis équerre posée sur `e`, angle droit en `P`, tracé de la parallèle ; règle pour prolonger.
- Consignes de sous-étape en français (lot 2). `e` = **charnière** (visible `@squelette`/`@complet`, masquée `@epure`) ; arcs et points auxiliaires comme les autres voies. Défauts inchangés (`parallelogramme`, `pose_equerre`).
- Limite : `P` loin → rayon viewport-safe. `P ∈ (AB)` → erreur d'exécution claire, pas d'animation fausse (cas non élève, pas creusé).
- Tests d'abord : nombre et suite des sous-étapes, `e ⟂ (AB)`, droite finale ∥ `(AB)` passant par `P`, visibilité des 3 modes, rendu dans le lecteur ; le test du stub est remplacé.

### Réalisé (2026-10-23)

- `parallele.ts` : les deux voies (sous-perpendiculaires `rayon_libre` / `pose_equerre` par `ctx.sub`, méthodes passées explicitement) ; rayons fixes 1,5 et 2,5 pour la perpendiculaire en P ; charnières `[e, R]` (`@euclide`), `[e]` (`@equerre`), deux marqueurs d'angle droit. `ChoreographyError` (`types.ts`) → `DslRuntimeError` à la ligne (`executor.ts`).
- Tests : 17 d'intégration rouges sans le code + 3 de rendu du lecteur ; 208 ✓ / 21 ignorés. Revue `code-reviewer` opus : aucun bloquant ; mineurs 1-2 corrigés (direction de la parallèle à l'équerre tirée de `u`, juste quand P glisse sur (AB) — test rouge sans, vert avec) ; mineur 3 (autres décors) non fait.
- `check:incremental` 0 erreur · `types:cliquet` tenu · `lint:fast` propre · `docs:check-a-jour` sans alerte · CI verte, mergée (#1621).
