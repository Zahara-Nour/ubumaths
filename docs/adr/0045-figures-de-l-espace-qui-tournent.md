# 0045 — Figures de l'espace qui tournent : moteur maison en SVG, cavalière au repos

- **Statut** : acceptée — phase 0 du chantier `solides-3d` (journal
  [`docs/wip/solides-3d-progress.md`](../archive/wip/solides-3d-progress.md))
- **Date** : 2026-11-26 · **Décidée par** : David (« je valide » aux cinq recommandations, après la
  maquette)
- **Amende** : le point 3 de l'[ADR 0034](0034-solides-trois-blocs-un-noeud-une-scene-cavaliere.md)
  (« une seule perspective : la cavalière »), qui reste vrai au repos et au PDF

## Contexte

Les blocs ` ```cubes `, ` ```solide ` et ` ```patron ` dessinent l'espace en perspective cavalière
fixe (ADR 0034). Une vue fixe laisse des ambiguïtés : deux droites qui semblent se couper, un point
dont on ne sait pas s'il est dans un plan. David veut pouvoir faire tourner une configuration pour
voir la disposition des objets entre eux, d'abord dans les modèles de questions, peut-être un jour
dans le module de géométrie.

Le dépôt n'a aucun moteur 3D ; `geometry-core` est en 2D. `espace-solides.ts` calcule déjà les
sommets des polyèdres en 3D avant de les projeter. Une maquette hors dépôt (pavé, pyramide, cylindre,
cube coupé par un plan) a montré la rotation en SVG, arêtes cachées en tirets recalculées à chaque
angle, sans bibliothèque.

## Décision

| Sujet                   | Décision                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Moteur                  | **Maison, en SVG** : rotation, projection et calcul de ce qui est caché, en calcul pur partagé comme la scène actuelle. Aucune bibliothèque 3D ni WebGL                |
| Ordre                   | D'abord faire tourner les **solides existants** (` ```solide `, puis ` ```cubes `) ; les objets de Terminale (repère, droites, plans quelconques) ensuite, même moteur |
| Qui allume la rotation  | **L'auteur, bloc par bloc**, éteinte par défaut : au collège, lire la perspective est souvent ce qu'on évalue                                                          |
| Vue pendant la rotation | **Vue droite** (projection orthogonale, le solide garde sa forme)                                                                                                      |
| Vue au repos et au PDF  | **La cavalière de l'ADR 0034**, inchangée ; un bouton y ramène                                                                                                         |
| Module de géométrie     | Pas de pont avec `geometry-core` pour l'instant ; à rouvrir si le besoin se confirme                                                                                   |

## Écarté

- **Three.js / Threlte, vue 3D de JSXGraph, GeoGebra embarqué** : pas de tirets d'arêtes cachées ni
  d'étiquettes nettes sans travail à part, perte de la scène unique écran + PDF, gestes de l'élève à
  refaire, poids pour des scènes de quelques dizaines de points.
- **Cavalière gardée pendant la rotation** : un solide qui tourne s'y déforme (comparé sur la
  maquette, cube de trois quarts).
- **Rotation allumée partout par défaut** : donnerait la réponse des questions de lecture de
  perspective et de vues.
- **Objets 3D dans le DSL de `geometry-core` dès maintenant** : chantier d'une autre taille ; le
  moteur reste réutilisable le jour venu.

## Conséquences

- Deux projections coexistent à l'écran (cavalière au repos, droite en rotation), avec un passage de
  l'une à l'autre ; le PDF n'en connaît qu'une.
- Le calcul de ce qui est caché devient dépendant de l'angle : simple pour les polyèdres convexes,
  à écrire pour le cylindre, le cône, la boule, les sections et les assemblages de cubes.
- Une figure dont la rotation est éteinte doit rester **strictement** celle d'aujourd'hui, écran et
  PDF.
