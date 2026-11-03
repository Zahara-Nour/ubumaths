# Chantier questions-1spe-tangente — tracer une tangente (1SPE-271)

Sous-chantier de [questions-1spe](../archive/wip/questions-1spe-progress.md) (clos) : le modèle du point
1SPE-271, classé C là-bas en attendant le geste `tracer:` du bloc ` ```courbe ` (#2265,
[points-repere § 8-9](points-repere-progress.md)). Démarche : skill `couvrir-niveau`.

## Reprendre ici

_Mis à jour le 2026-11-03, avant toute PR._

- **État** : relevé fait, phase 0 écrite (§ 3) · **Prochaine action** : validation de la phase 0 par David,
  puis script `lot-tangente.py` · **En attente de David** : les questions du § 4 · **Pièges en cours** :
  #2265 pas en prod → brouillons seulement, publication après un `deploy:prod` ; ne pas toucher
  `docs/wip/outils-manquants.md` (session `tracer-droite`) · **Worktree / branche** :
  `../ubumaths-wt-questions-1spe-tangente`, `feat/questions-1spe-tangente`.

## 1. Vérification de l'outil (2026-11-03)

- `courbe-parser.ts` : un bloc peut porter `f(x) = …` **et** `tracer:` ; seul `placer:` est refusé avec
  `tracer:`. Essai : `f(x) = x^2 - 2x` + `tracer: y = 2x - 4` → 0 erreur, `spec.functions` et
  `spec.tracer` remplis.
- `CourbePlacer.svelte` dessine `base` = la spec **sans** `placer`/`tracer` : la courbe de f est visible
  sous le geste, l'équation attendue n'entre pas dans le DOM.
- Ne **pas** écrire la clé `tangente:` dans l'énoncé (elle dessinerait la réponse).

## 2. Relevé MCP prod (2026-11-03)

| Point    | Intitulé                                                                  | Modèles |
| -------- | ------------------------------------------------------------------------- | ------- |
| 1SPE-261 | Tangente comme limite des sécantes ; pente                                | 1       |
| 1SPE-270 | Déterminer graphiquement un nombre dérivé                                 | 1       |
| 1SPE-271 | **Construire la tangente connaissant le nombre dérivé**                   | **0**   |
| 1SPE-272 | Déterminer l'équation de la tangente                                      | 4       |
| 1SPE-433 | Tracer une droite (point + coefficient directeur) — session tracer-droite | 0       |

Catégorie **Fonctions › Dérivation › Tangente** (tous publiés, `grades = ['1_SPE']`) :

| Niv. | Modèle                                            | Points                |
| ---- | ------------------------------------------------- | --------------------- |
| 1    | Équation d'une tangente connaissant f(a) et f′(a) | 1SPE-272, 1TECHNO-079 |
| 2    | Équation de la tangente à un polynôme             | 1SPE-272, 1TECHNO-079 |
| 3    | Lire l'équation d'une tangente sur un graphique   | 1SPE-261, 1TECHNO-079 |

→ **niveau 4 libre**. Les deux autres modèles 272 sont dans Fonction exponentielle › Représentation
graphique (niv. 2, 3). Point jumeau en 1re techno : **1TECHNO-078** « Construire la tangente à une courbe en
un point » (0 modèle vu ici).

Bornes ([1spe.md](../systeme/programmes/bornes/lycee/1spe.md), l. 311) : « Tracé de la tangente en un
point, le nombre dérivé étant connu. » Fonctions du programme : polynômes, inverse, racine…

## 3. Phase 0 (proposée le 2026-11-03)

**Un modèle**, « Tracer une tangente connaissant le nombre dérivé », point **1SPE-271**, catégorie
Fonctions › Dérivation › Tangente, **niveau 4**, nœud = celui des trois voisins.

Énoncé : la courbe 𝒞_f (bleue) et le point A d'abscisse a dessus ; « On sait que f′(a) = s. Trace la
tangente à 𝒞_f au point A. » Geste `tracer:` (deux nœuds de la grille, la droite se dessine).

Courbe : f(x) = k/2·(x − a)² + s(x − a) + b (même famille que le niveau 3) : f(a) = b, f′(a) = s, A sur
un nœud. Fenêtre −5 ; 5, grille 1. Attendue : `tracer: y = (s)*(x-(a))+(b)`.

| Var. | f′(a)                    | Plages                          | Deuxième nœud qu'on vise |
| ---- | ------------------------ | ------------------------------- | ------------------------ |
| 0    | entier : ±1, ±2, ±3      | a ∈ ±1..3, b ∈ −3..3, k ∈ ±1..2 | (a + 1 ; b + s)          |
| 1    | demi-entier : ±1/2, ±3/2 | a ∈ ±1..3, b ∈ −3..3, k ∈ ±1..2 | (a + 2 ; b + t)          |

Conditions : la tangente passe par au moins deux nœuds de la fenêtre (le parseur le refuse sinon) ; la
courbe ne sort pas de la fenêtre près de A.

Correction : « La tangente passe par A(a ; b) et a pour coefficient directeur f′(a) = s : depuis A, on
avance de 1 et on monte de s (descend si s < 0) : B(a + 1 ; b + s). » Puis la figure avec 𝒞_f, la
tangente en pointillés rouges, A et B ; équation y = s(x − a) + b en conclusion.

`testSpecs` : juste (A et B), juste avec deux autres nœuds de la droite, faux par le signe (pente −s),
faux par l'inverse (pente 1/s), faux par un seul point posé, deux points confondus.

Question d'accès de la migration nœud + tag : **personne ne pourra lire quelque chose qu'il ne lisait
pas** — un lien modèle ↔ point et un nœud, sur un modèle publié plus tard comme les autres.

## 4. Questions à David

1. Valider la phase 0 (un modèle, deux variations, niveau 4) ?
2. Une troisième variation f′(a) = 0 (tangente horizontale) ? Je la mettrais plutôt dans la variation 0.
3. Taguer aussi **1TECHNO-078** (comme les voisins portent 1TECHNO-079) ? Le piège § 9 veut alors
   `grades = ['1_SPE', '1_TECHNO']`, ce que les voisins n'ont pas.
4. Courbe d'une autre famille (cube, inverse) pour ne pas avoir que des paraboles ? Je propose non.
