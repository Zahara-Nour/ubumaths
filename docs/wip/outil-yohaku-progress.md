# Chantier `outil-yohaku` : grille jugée par ses contraintes (outil n° 56)

Lot `yohaku` d'[outils-lots.md](outils-lots.md). Ligne n° 56 d'[outils-manquants.md](outils-manquants.md).
Né du relevé `idees-3e-calcul-litteral` (3L11-8, Yohaku multiplicatif ; [journal archivé](../archive/wip/idees-3e-calcul-litteral/idees-3e-calcul-litteral-progress.md),
question 3 de sa phase 0) ; même famille que la rose des sommes de 6e (6N0A-2, en attente dans
[idees-ailleurs-repartition.md](idees-ailleurs-repartition.md)).

## Reprendre ici

_Mis à jour le 2026-11-28, phase 0 validée._

- **État** : cœur écrit et testé (parseur, totaux, juge : 24 tests) ; branchement (générateur,
  juge, écran, PDF, éditeur riche, catalogue) en cours · **Prochaine action** : vérifier à
  l'écran (`pnpm voir`), doc `docs/systeme/ubumark.md`, revue `code-reviewer` (Opus), PR ·
  **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** :
  `../ubumaths-wt-outil-yohaku`, `feat/outil-yohaku`.

## Phase 0 (envoyée le 2026-11-28)

Besoin : une grille 2 × 2 ; au bout de chaque ligne et de chaque colonne, son produit (ou sa
somme). L'élève remplit les cases vides. **Plusieurs remplissages sont justes** : la grille est
jugée sur ses produits, pas sur une solution unique. Aujourd'hui le modèle CM2-065 contourne
le manque en donnant assez de cases pour qu'il n'y ait qu'une réponse.

Syntaxe d'auteur proposée : l'auteur écrit **une** solution ; les cases entre crochets sont à
remplir ; le bloc calcule lui-même les produits (développés, réduits) ou les sommes.

````text
Complète la grille : au bout de chaque ligne et de chaque colonne, le produit de ses cases.

```yohaku
opération: produit
grille:
  [{{a}}x+{{b}}] | [{{c}}x+{{d}}]
  [{{e}}x+{{f}}] | [{{g}}x+{{h}}]
```
````

- **Cas normal (3e)** : solution `x+2 | x+3` / `2x+1 | x+1` ; l'élève voit les quatre cases
  vides et les produits `x²+5x+6`, `2x²+3x+1` (lignes), `2x²+5x+2`, `x²+4x+3` (colonnes). Il
  écrit `x+2 | x+3` / `2x+1 | x+1` : juste. Il écrit `2x+4 | ½x+3/2` / `x+½ | 2x+2` : juste
  aussi, les quatre produits tombent (équivalence de mathAST, comme une case d'expression).
- **Cas normal (école, 6e)** : `opération: somme`, nombres ; `[3] | 7` / `[5] | [4]`.
- **Limite** : une case vide → « Remplis toutes les cases. » ; une case donnée (sans crochets)
  ne se modifie pas.
- **Erreur de l'élève** : la deuxième ligne donne `2x²+3x+2` au lieu de `2x²+3x+1` → faux, avec
  le message « La 2e ligne ne donne pas le bon produit. » et la ligne fautive marquée (une par
  ligne ou colonne fausse).
- **Corrigé** : la solution de l'auteur, avec « D'autres remplissages sont justes. » quand il y
  en a. **PDF** : grille imprimée, cases vides ; corrigé imprimé avec la solution.
- **Erreurs d'auteur** : grille qui n'est pas 2 × 2, opération inconnue, aucune case à remplir.
- Rendu : je pars du tableau à compléter existant (` ```tableau `) pour l'écran, le PDF et les
  champs MathLive, plutôt que d'en dessiner un neuf.

Questions :

- **Q1 taille** : 2 × 2 seulement (les deux cas réels), ou aussi 3 × 3 ? Reco : **2 × 2
  seulement**, 3 × 3 quand un modèle le demandera.
- **Q2 ce qu'on accepte dans une case** : tout ce qui donne les bons produits (une fraction
  comprise, si elle tombe juste), ou seulement des expressions du premier degré / des entiers ?
  Reco : **tout ce qui tombe juste**, sans réglage (c'est vrai mathématiquement ; un réglage
  quand un cas réel d'élève le demandera).
- **Q3 produits affichés** : calculés par le bloc depuis la solution (reco : aucune erreur
  d'auteur possible), ou écrits par l'auteur ?
- **Q4 découpage** : **une PR : le bloc, le juge, l'écran et le PDF** ; les modèles (3L11-8,
  rose des sommes) restent aux sessions « idées » (règle 5 d'`outils-lots.md`). Reco : oui.

Décisions (David, 2026-11-28 : « go » après « tes recos ? ») : **Q1** 2 × 2 seulement ; **Q2**
tout ce qui donne les bons totaux est juste, fractions comprises, sans réglage ; **Q3** totaux
calculés par le bloc ; **Q4** une PR (bloc, juge, écran, PDF), modèles aux sessions « idées ».

## PR 1 : l'outil

- **Écart de syntaxe à la phase 0** (forme seulement) : une clé `ligne:` par ligne de la grille
  au lieu de `grille:` suivi de deux lignes nues ; une ligne nue sans chiffre (`[x] | [y]`) aurait
  été prise pour du texte par la règle de fermeture des blocs (Q66).
- Cœur : `types/yohaku.ts`, `utils/yohaku-moteur.ts` (case lue en syntaxe maison et nettoyée :
  `1x+-3` → `x − 3` ; totaux par `expandedForm`, le moteur de `.développer`),
  `parser/yohaku-parser.ts`, `utils/yohaku-answer.ts` (juge : chaque total par `areEquivalent`,
  500 ms, comme une case d'expression). Tests écrits juste après le code du cœur (pas rouges
  d'abord), 24 verts.

## Historique

- 2026-11-28 : lot réservé par `pnpm outils lancer` ; phase 0 écrite et envoyée.
- 2026-11-28 : phase 0 validée ; cœur commité.
