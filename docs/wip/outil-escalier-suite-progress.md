---
title: Lot d'outils escalier-suite — journal
date: 2026-11-28
status: outil 48 codé, revu, PR à ouvrir
---

# Lot `escalier-suite` (outil 48)

## Reprendre ici

_Mis à jour le 2026-11-28, avant toute PR._

- **État** : outil 48 codé (geste, juge, correction, PDF, catalogue, doc), revu (code-reviewer Opus :
  A chaînes forgées → cases jugées sur la chaîne de la dernière case, C escalier d'une autre suite
  refusé, E clic droit / aria corrigés), vérifié à l'écran (`e2e/verifs/bloc-courbe-construire.spec.ts`,
  4 verts) · **Prochaine action** : PR, CI, merge, puis § 4 « Livré » d'`outils-manquants.md` et
  clôture du lot · **En attente de David** : point B (élève qui pose tout sur le point fixe : N−1/N ;
  laissé tel quel sauf avis contraire) · **Pièges en cours** : `construire 4` avec √(2x+3), u₀ = 0,
  fenêtre 0..4 est refusé (u₃, u₄ trop proches) → `construire 3` · **Worktree / branche** :
  `../ubumaths-wt-outil-escalier-suite`, `feat/outil-escalier-suite`.

## Outil 48 — construire l'escalier (ou la spirale) de uₙ₊₁ = f(uₙ)

Source : `outils-manquants.md` § 1 n° 48 ; relevé archivé
`docs/archive/wip/idees-tle-suites/idees-tle-suites-releve.md` (TSA1-33, TSPE-432).

Existant : `u(0) = … ; u(n+1) = … escalier [termes]` dessine l'escalier **tout tracé**
(`computeCobwebPath`, `src/lib/grapheur/sequence.ts`) ; `placer:` / `tracer:` posent des points sur
les nœuds de grille, pas un escalier (les termes ne tombent presque jamais sur un nœud).

### Phase 0 (2026-11-28)

Proposition de syntaxe d'auteur : un mot sur la ligne de la suite, `construire 4` (l'élève construit
u₁ à u₄) à la place de `escalier`.

Exemple : f(x) = √(2x + 3), u₀ = 0, l'élève voit la courbe de f, la droite y = x et u₀ sur l'axe.

- **Nominal** : il touche l'axe des abscisses là où il pense trouver u₁. Le trait de l'escalier se
  dessine alors de u₀ jusqu'à son point (monter à la courbe, aller à la droite, descendre à l'axe).
  Puis u₂, u₃, u₄. Chaque terme = une case, juste s'il est à moins d'une demi-graduation (ou ~3 % de
  la fenêtre) de la vraie valeur.
- **Spirale** (f décroissante) : même geste, rien de spécial.
- **Limite côté auteur** : un terme hors de la fenêtre, ou deux termes trop proches pour être
  distingués (la suite converge trop vite) → erreur « Ligne N : … » à l'écriture.
- **Erreur de l'élève** : un point loin de la vraie valeur → case fausse ; la correction dessine le
  vrai escalier d'une autre couleur.
- **PDF** : le repère avec la courbe, y = x et u₀ ; l'enfant trace à la main.

Questions à David :

1. Geste : **(A)** toucher l'axe pour chaque terme (4 touches), ou **(B)** toucher tour à tour la
   courbe et la droite, comme au crayon (8 touches, plus fidèle, plus long sur téléphone) ?
2. Après une erreur, le terme suivant se juge-t-il depuis **la vraie valeur** ou depuis **le point de
   l'élève** (comme sur papier, où l'erreur se propage) ?
3. Tolérance : demi-graduation de la grille, ou part fixe de la fenêtre ?

**Décision de David (2026-11-28)** : il valide les trois recommandations.

1. Geste **(A)** : toucher l'axe des abscisses pour chaque terme ; le trait de la marche se dessine.
2. Chaque terme se juge **depuis le point posé par l'élève** (f appliquée à son terme précédent) ;
   le premier depuis u₀. La correction montre le vrai escalier.
3. Marge = **3 % de la largeur de la fenêtre** ; l'auteur ne peut pas écrire deux termes consécutifs
   séparés de moins de deux marges.
