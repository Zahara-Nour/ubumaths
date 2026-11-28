# Chantier `variation-limite-infinie` — journal

Outil n° 50 de [outils-manquants.md](../../wip/outils-manquants.md) : cacher une limite infinie dans un
tableau de variations (` ```variation `), pour que l'élève la complète. Né du chantier
[`idees-tle-limites`](idees-tle-limites/idees-tle-limites-progress.md), fiche F3 (point TSPE-415, fonction
homographique : −∞, à gauche et à droite de la valeur interdite, +∞).

## Reprendre ici

_Mis à jour le 2026-11-23, après #3027 : chantier clos, journal archivé._

- **État** : livré (#3027 mergée) ; doc versée dans `docs/systeme/ubumark.md` et
  `questions.md` ; outil n° 50 passé en « Livré » d'`outils-manquants.md` · **Prochaine
  action** : aucune ici ; la fiche F3 du chantier `idees-tle-limites` est débloquée ·
  **En attente de David** : rien · **Pièges** : un message d'erreur prévue d'intervalle
  s'ajoute à la remarque du juge ; vartable : `(pos, "||", v)` dessine `v` des deux côtés si
  le domaine continue (hors périmètre) · **Worktree / branche** : retirés.

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

**Réponses de David (2026-11-23)**

- **Q1 → case de calcul**, « on peut ajouter des erreurs prévues pour pouvoir basculer en QCM
  facilement ».
- **Q2 → (a)** : ∞ sans signe est faux.

**Ce que la réponse à Q1 ajoute** (relevé : aujourd'hui une case de tableau ne prend **aucune**
erreur prévue, refus dans `instance-generator.ts` ; le QCM ne vaut que pour une question à **une
seule case**, `canBeChoice` dans `choice-from-errors.ts`)

13. Une case **valeur** d'un tableau (limite ou valeur cachée) accepte des erreurs prévues, comme
    une case de calcul ordinaire : l'élève qui répond +∞ au lieu de −∞ lit le message de l'auteur
    (« regarde le signe de x − 3 juste à gauche de 3 »). Les cases signe, marque et flèche n'en
    prennent pas (elles se choisissent déjà).
14. Un tableau à **une seule** case cachée, avec des erreurs prévues, peut se poser en QCM : la
    case affiche « … » dans le tableau, les choix (bonne réponse + jusqu'à trois erreurs
    prévues, mélangés) sont sous le tableau.

- **Q3 — tableau à plusieurs cases cachées, en QCM ?** (a) pas dans ce chantier : l'auteur écrit
  une variation par limite cachée pour la version QCM, et le QCM à plusieurs cases va dans
  `outils-manquants.md` ; (b) dans ce chantier : chaque case du tableau devient son propre petit
  choix. Je recommande (a) : le QCM à plusieurs cases n'existe nulle part aujourd'hui, c'est un
  outil à part, qui servira aussi hors des tableaux.
- **Q3 → (a)**, et « un qcm sur plusieurs cases, je trouve ça illisible » : **pas** d'outil
  « QCM à plusieurs cases » à noter dans `outils-manquants.md`.
- David demande de revoir pour quels types de cases les erreurs prévues sont censées marcher
  (relevé ci-dessous, en attente de sa décision).
