# Chantier `variation-limite-infinie` — journal

Outil n° 50 de [outils-manquants.md](outils-manquants.md) : cacher une limite infinie dans un
tableau de variations (` ```variation `), pour que l'élève la complète. Né du chantier
[`idees-tle-limites`](idees-tle-limites-progress.md), fiche F3 (point TSPE-415, fonction
homographique : −∞, à gauche et à droite de la valeur interdite, +∞).

## Reprendre ici

_Mis à jour le 2026-11-23, chantier ouvert._

- **État** : relevé du code fait, phase 0 écrite (ci-dessous) · **Prochaine action** : coder
  après les réponses · **En attente de David** : validation de la phase 0, questions Q1 et Q2 ·
  **Pièges en cours** : `{{e}}` interdit (Euler) · **Worktree / branche** :
  `../ubumaths-wt-variation-limite-infinie`, `feat/variation-limite-infinie`.

## Historique

### 2026-11-23 — chantier lancé

- David : « F3 reste en attente » (chantier `idees-tle-limites` laissé ouvert), puis « lance le
  chantier du 50 ».

### 2026-11-23 — relevé du code

- Trois refus, tous dans `src/lib/ubumark/parser/variation-table-parser.ts` :
  1. valeur cachée sur un point (`+inf: ?+inf, top`) → « un infini n'est pas une valeur à
     calculer » (`readHiddenVariationCell`) ;
  2. limite cachée autour d'une asymptote (`3: ||, ?-inf, +inf`) → « on ne peut pas cacher une
     limite autour de « || » » (`parseVariationRowEntries`) : aucune case n'existe pour une
     limite d'asymptote, finie ou infinie ;
  3. valeur de x cachée dans `domain:` (`?-inf`) → même message (`parseDomainPoint`).
- Une valeur cachée devient une case `math` jugée comme une case ordinaire
  (`sign-table-case.ts`, `assign-blank-indices.ts`) : la réponse attendue est l'expression écrite
  (`-inf`), à faire passer en LaTeX (`-\infty`) pour le juge.
- Évaluation notée : `masked-statement.ts` remplace les cases cachées par `?` / `??n` ; à
  vérifier pour les limites d'asymptote (cellule à plusieurs morceaux).

## Phase 0 — comportements (à valider par David)

Exemple qui sert partout : f(x) = (2x + 1)/(x − 3).

```variation
domain: -inf, 3, +inf
variation:
  -inf: ?2, top
  3: ||, ?-inf, ?+inf
  +inf: ?2, bottom
```

L'élève voit le tableau avec ses flèches, et une case à la place de chaque limite cachée.

**Nominal**

1. Limite infinie aux bords : `-inf: ?-inf, bottom` ou `+inf: ?+inf, top` → une case à cet
   endroit ; l'élève tape −∞ (ou +∞) au clavier ; juste si c'est le bon infini.
2. Limites autour d'une valeur interdite : `3: ||, ?-inf, ?+inf` → une case de chaque côté de la
   double barre, à la hauteur écrite (en bas à gauche, en haut à droite) ; on peut n'en cacher
   qu'une (`3: ||, ?-inf, +inf`).
3. Même chose pour une limite **finie** autour d'une double barre (`3: ||, ?2, +inf`) : refusée
   aujourd'hui pour la même raison, elle vient avec.
4. Limite d'un seul côté (`3: ||, left, ?-inf, bottom`) : une case, du côté écrit.
5. La correction affiche −∞ / +∞ dans la case, comme les autres valeurs.
6. Évaluation notée : la limite cachée part masquée (l'élève ne lit pas la réponse dans
   l'énoncé envoyé).

**Limite**

7. L'élève tape `-\infty`, `−∞` ou `-inf` : même réponse, comptée juste.
8. L'élève tape ∞ sans signe → voir Q2.
9. L'élève répond 2 là où il faut +∞ (ou l'inverse) : faux.

**Erreur (refus à l'écriture du modèle, message en français)**

10. Cacher une valeur de x infinie dans `domain:` (`?-inf`) : toujours refusé, ce n'est pas un
    calcul.
11. `3: ||, ?, +inf` (rien après le `?`) : refusé, « écrire la limite après le ? ».
12. Une limite cachée écrite aussi en clair ailleurs dans le tableau : refusé, comme les autres
    cases cachées.

**Questions**

- **Q1 — comment l'élève répond ?** (a) case de calcul ordinaire : il tape −∞ avec le clavier, et
  peut aussi taper un nombre quand la limite est finie ; (b) deux boutons « −∞ » / « +∞ ». Je
  recommande (a) : avec des boutons, il a une chance sur deux, et une case peut aussi attendre une
  limite finie.
- **Q2 — ∞ sans signe ?** (a) faux ; (b) compté comme +∞. Je recommande (a) : en Terminale on
  attend le signe.
