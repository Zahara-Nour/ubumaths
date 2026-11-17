# Chantier « probtree-indices » — étiquettes indicées de l'arbre pondéré

> Origine : ligne 11 de [`outils-manquants.md`](../../wip/outils-manquants.md) (TSPE-506, 617, arbres du lot 5a).
> Phase 0 validée par David le 2026-11-05 (« je te suis »), dans la session de clôture de `solide-vecteur`.

## Reprendre ici

_Mis à jour le 2026-11-05, après #2398. **Chantier clos** (journal archivé)._

- **État** : #2398 mergée (pas encore en prod) ; ligne 11 de `outils-manquants.md` passée dans « Livré » ; doc
  versée dans `docs/systeme/ubumark.md` (étiquette d'un évènement) et `docs/pratiques/`.
- **Reste à David** : vérification notée dans `verifications-manuelles.md` (après `deploy:prod`).
- **Worktree / branche** : supprimés.

---

## Phase 0 (2026-11-05, validée)

- `G_1`, `G_{12}` : G indicé, sur la branche et dans la notation P(…) / P_A(…).
- `Malade_1` : mot en texte droit, indice en maths. `Pile`, `A` : inchangés. Contient `\` : intact.
- PDF vérifié : `G_1` déjà juste ; un mot sortait en lettres italiques espacées (`P i l e`) → corrigé par la même
  fonction (« je ne le corrige que s'il est faux »).
- A1 (David) : les 2 modèles en `\mathrm{G}_1` ne sont pas réécrits (restent justes).
- Mesure prod (MCP, 2026-11-05) : 20 modèles à arbre ; étiquettes écrites sans `$` ; 2 en `\mathrm{A}_1`.

## Livraison

- `src/lib/ubumark/utils/probtree-label.ts` (`probTreeLabelLatex`), appelée par `ProbabilityTree.svelte`
  (remplace `wrapTextLabel`) et `probability-tree-typst.ts` (étiquettes des branches).
- Tests : `probtree-label.test.ts` (5), `probability-tree-etiquettes.svelte.test.ts` (2, rouges sans le
  correctif du composant), `probability-tree-typst.test.ts` (+2, le test « mots » rouge avant).
