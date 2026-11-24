# Chantier `rendu-indice-parentheses` : `P_A(G)` affiché « P_A G »

## Reprendre ici

_Mis à jour le 2026-11-24, correctif écrit, PR à ouvrir._

- **État** : correctif et tests sur la branche ; revue puis PR.
- **Prochaine action** : PR, CI, merge ; rien à migrer.
- **En attente de David** : rien.
- **Pièges en cours** : `scripts/sonde-indice.tmp.ts` (sonde non suivie, à supprimer avec l'accord de David).
- **Worktree / branche** : `../ubumaths-wt-rendu-indice-parentheses` · `fix/rendu-indice-parentheses`.

## Historique

### 2026-11-24 : défaut trouvé et corrigé

- Trouvé par le chantier `idees-tle-probas` (journal `docs/archive/wip/idees-tle-probas/idees-tle-probas-progress.md`) : dans un
  modèle qui a l'option `shared.cleanCoefficients`, `$P_A(G)=0{,}7$` s'affichait « P_A G = 0,7 ».
- Cause : `withoutAtomicParentheses` (`src/lib/questions/clean-coefficients.ts`) garde la parenthèse
  de la notation fonctionnelle quand le facteur qui la précède est une `variable` ou une `function`,
  pas quand c'est un nom indicé (`subscript`). `P_A(G)`, `C_M(x)`, `f_1(x)` perdaient leur
  parenthèse ; `u_n(q-1)` et `P_{R_1}(R_2)` non (contenu qui n'est pas une seule lettre).
- Touchés en prod (option active, relevé MCP du 2026-11-24) : bb7bcab6 « Coût moyen, prix unitaire »
  (`C_M(x)` dans l'énoncé de trois variations, rendu « C_M x » par la génération), ecf4d46b « Probabilités totales »
  (`P_{A_1}(D)` dans la correction), 5925e666 « Deux ou trois tirages sans remise ».
- Correctif : `subscript` ajouté aux facteurs qui gardent la parenthèse ; la revue (`code-reviewer`,
  Opus) a trouvé le cas frère `\varphi(x)` → « φ x » (nœud `greek`) : ajouté, avec `superscript`
  (`f^(-1)(x)` en syntaxe maison ; la forme LaTeX `f^{-1}(x)` était déjà lue comme une fonction).
- Vérifié : tests rouges avant (8), verts après ; `test:server src/lib/questions` vert (7 152) ;
  specs de 2938b16b, 5925e666, bb7bcab6, ecf4d46b vertes avec le correctif ; `check:incremental`
  0 erreur ; `types:cliquet` tenu ; copie locale de bb7bcab6 vue dans l'aperçu (`pnpm voir`, iPhone) :
  `C_M(x)` garde ses parenthèses ; copie supprimée.
