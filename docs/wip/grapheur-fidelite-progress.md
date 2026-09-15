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
