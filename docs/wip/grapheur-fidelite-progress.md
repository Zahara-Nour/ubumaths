# Grapheur — fidélité du tracé hors des ruptures (fix/grapheur-lissage)

Signalé par David le 2026-09-15, après les PR #323 à #326 : « c'est beaucoup
mieux, par contre il y a quand même des problèmes de lissage, et **pas en des
points proches des ruptures**. Regarde en x ≈ -1,4. »

## Ce que je croyais, et ce que la mesure dit

Première hypothèse — le calcul des pentes de la spline. **Fausse** :

|                                            | écart max visible  |
| ------------------------------------------ | ------------------ |
| moyenne arithmétique (l'existant)          | 65,7 px            |
| moyenne harmonique pondérée (PCHIP)        | 56,7 px — **pire** |
| **subdivision adaptative, tolérance 1 px** | **1,1 px**         |

Ce n'est donc pas la spline, c'est la **résolution** : l'échantillonnage est
uniforme en abscisse, et dans une zone de forte courbure la fonction s'écarte
franchement de la corde qui joint deux échantillons voisins. Aucune cubique ne
rattrape ça, quelles que soient ses pentes.

⚠️ **J'avais écrit cette subdivision pendant le chantier #324, puis je l'ai
retirée** en constatant qu'elle ne se déclenchait jamais. La raison n'était pas
l'idée mais le critère : je mesurais la distance **perpendiculaire** rapportée à
la diagonale du cadre, et elle valait 0,4 px là où l'écart **vertical** à la
corde en vaut 40. Mauvais critère, bonne idée jetée avec.

## Correction

`viewport/sampler.ts` — `subdivideSegment()` insère des points tant que le
milieu s'écarte de la corde de plus de 1/400 de la hauteur de fenêtre (≈ le
pixel sur un cadre de 400 px). Profondeur bornée à 6, budget global de deux
fois le nombre d'échantillons.

Le lissage vit dans `push()` et non dans la boucle principale : c'est ce qui
couvre aussi les segments **bordant les points de marche d'un pôle**, là où
l'écart est le plus grand. Placé dans la boucle, il manquait précisément ces
segments-là (mesuré : l'écart restait à 42 px).

## Mesures

| fonction                                       | points | évaluations | durée   | écart                          |
| ---------------------------------------------- | ------ | ----------- | ------- | ------------------------------ |
| `1/(x(x+1)(x-1))`, cadrage de David            | 465    | 1819        | 1,41 ms | **0,96 px** (65 avant)         |
| `x²`                                           | 300    | 1496        | 0,53 ms | 0,00 px — aucune densification |
| `sin(x)` très dézoomé                          | 498    | 2564        | 0,65 ms | 0,98 px                        |
| `sin(200x)` (200 oscillations pour 300 points) | 902    | 5213        | 1,19 ms | 396 px                         |

Le dernier cas est hors de portée de tout échantillonnage uniforme : le budget
borne le coût, la fidélité n'est pas atteignable et le tracé est de toute façon
illisible.

## Un test antérieur assoupli

« n'insère aucun point quand le raffinement ne conclut à rien » exigeait
exactement 300 points sur `sin(200x)`. Le lissage en insère désormais
légitimement : le test vérifie la **borne** du budget et l'absence de rupture,
ce qui était son intention — repérer les points de marche inutiles.

## Revue — la répartition du budget, pour la troisième fois

L'auditeur a reproduit, sur une fonction qui oscille à gauche et a trois pôles à
droite, le défaut que ce fichier a déjà payé deux fois : **le budget se
consommait dans l'ordre des abscisses**. Le même groupe de pôles valait 1,00 px
d'écart en début de fenêtre et **14,55 px** après la zone oscillante — rien
d'autre n'avait changé que l'ordre de parcours.

Deux répartitions essayées, la première rejetée par la mesure :

1. **Par écart décroissant** (le remède des deux fois précédentes) : **sans
   effet**, 14,55 px inchangés. Une oscillation sous-échantillonnée a de GROS
   écarts qui ne diminuent jamais en subdivisant : elle rafle tout le budget
   sans que le tracé y gagne rien. Trier par amplitude, ici, c'est trier par
   gaspillage.
2. **Par niveaux** (retenu) : on insère un point au milieu de chaque segment
   infidèle, puis on recommence sur les moitiés encore infidèles. Chacun reçoit
   le même niveau de détail avant qu'on aille plus loin.

|                                       | avant    | après       |
| ------------------------------------- | -------- | ----------- |
| pôles en second (après l'oscillation) | 14,55 px | **1,63 px** |
| pôles en premier                      | 1,00 px  | 1,00 px     |

Le raffinement en largeur borne aussi le budget exactement : le compteur est
décrémenté avant d'empiler les moitiés, il n'y a plus de dépassement.

### Deux points signalés, traités

- **Fenêtre dégénérée ou inversée** : `height` retombait à `1e-10`, la tolérance
  à `2,5e-13`, et le budget se vidait entièrement sur une fenêtre sans hauteur
  visible (904 points pour `x²`). Le lissage est désormais désactivé dans ce cas,
  comme l'écrêtage l'était déjà.
- **Une évaluation par segment, même sur une courbe déjà fidèle** (`x²` :
  1197 → 1496 évaluations, +25 %). C'est le prix de savoir s'il faut densifier :
  la mesure doit précéder la dépense. Sub-milliseconde en absolu.

### Signalé, hors périmètre — à ticketer

Sur un cadrage à très grande abscisse (`xMin = 1e12`, largeur `1e-4`),
`viewport.xMin + i * step` perd entièrement le pas : **298 abscisses dupliquées
sur 300**. Défaut préexistant, indépendant de ce chantier ; la garde
`from.x < to.x` empêche le lissage d'y ajouter quoi que ce soit.

### Limite connue, mesurée : le dernier niveau reste biaisé

Quand le budget s'épuise **au milieu** d'un niveau, les derniers segments en
abscisse n'obtiennent pas leur point : un biais gauche-droite subsiste, mais sur
**un seul niveau** au lieu de tous.

Cela ne se produit que si le budget sature dès le niveau 0 — donc sur une
fonction qu'aucun échantillonnage uniforme ne peut rendre. Mesuré sur
`sin(200x)` (190 oscillations pour 300 échantillons, tracé crénelé de toute
façon) : 66 px à gauche contre 220 px à droite. Et sur une zone de pôles placée
après 90 % d'oscillation : 55 px, contre 118 px avant ce chantier et 1 px si la
même zone n'a pas d'oscillation devant elle.

Non corrigé, et non corrigeable en triant : le tri par amplitude est justement
ce que la mesure a montré contre-productif. C'est une limite bornée, pas un
défaut — notée pour que le prochain à mesurer 55 px sache que c'est attendu.

### Chiffres de la revue

| cas adverse                                  | avant ce chantier | version « par position » | version « par niveaux » |
| -------------------------------------------- | ----------------- | ------------------------ | ----------------------- |
| oscillation sur 90 %, pôles à la fin         | 118,0 px          | 118,0 px                 | **54,8 px**             |
| pôles – oscillation – pôles (zone du milieu) | 85,3 px           | 85,3 px                  | **23,4 px**             |
| 4 pôles symétriques                          | 26,7 px           | 0,94 px                  | 0,94 px                 |
| plat à gauche, courbure à droite             | 7,62 px           | 0,89 px                  | 0,89 px                 |

La version « par position » n'améliorait **rien** sur les deux premiers cas : le
budget partait intégralement dans la première moitié.

Drag de slider mesuré (6 courbes, cadrage mobile) : 0,43 ms par image en qualité
pleine, contre 0,24 avant — sur les 16 ms d'une image.
