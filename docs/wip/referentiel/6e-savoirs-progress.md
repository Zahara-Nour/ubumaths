# 6ᵉ — Famille A modèle B — Progression et points en discussion

> **Démarré** : 2026-06-07
> **Tous items validés** : 2026-06-08
> **Modèle** : B (4 capacités ordonnées par item, cf. design doc §3 et §10 décision 57)
> **Source de vérité** : BO 2026 cycle 3 — Inspiration : PDF 2016 de David (`~/Google Drive/Réorganisation/Evaluations/echelles descriptives connaissance 6 2016.pdf`)

## État d'avancement

| #     | Item                                          | Statut                                                                                           |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | Nombres entiers                               | ✓ validé                                                                                         |
| 2     | Nombres décimaux                              | ✓ validé                                                                                         |
| 3     | Fractions                                     | ✓ validé                                                                                         |
| ~~4~~ | ~~Calcul mental ⚡~~                          | ✗ **supprimé** (2026-06-08 — calcul mental devient une modalité d'évaluation timée, pas un item) |
| 5     | Calcul (sens des opérations + calcul posé)    | ✓ validé                                                                                         |
| 6     | Algèbre                                       | ✓ validé                                                                                         |
| 7     | Organiser et lire des données                 | ✓ validé (renommé depuis « Représenter et lire »)                                                |
| 8     | Probabilités                                  | ✓ validé                                                                                         |
| 9     | Proportionnalité et pourcentages              | ✓ validé                                                                                         |
| 10    | Figures usuelles (lexique, reconnaissance) ⚡ | ✓ validé                                                                                         |
| 11    | Constructions                                 | ✓ validé                                                                                         |
| 12    | Symétrie axiale                               | ✓ validé                                                                                         |
| 13    | Espace (vision 3D, patrons)                   | ✓ validé                                                                                         |
| 14    | Longueurs (périmètres)                        | ✓ validé                                                                                         |
| 15    | Aires                                         | ✓ validé                                                                                         |
| 16    | Volumes                                       | ✓ validé                                                                                         |
| 17    | Angles (mesure)                               | ✓ validé                                                                                         |
| 18    | Durées et repérage dans le temps              | ✓ validé                                                                                         |
| 19    | Programmer                                    | ✓ validé                                                                                         |

**Statut global** : structure et choix pédagogiques validés pour 18 items (item 4 supprimé). Libellés et variations à retravailler à la rédaction de `6e-savoirs.md` final.

**Décision 2026-06-08 — Suppression de l'item 4 (Calcul mental)** :

- Le BO 2026 6ᵉ ne fait pas du calcul mental un sous-domaine séparé.
- La règle `automatisme` du système valide la réussite binaire, pas la fluence.
- Les contenus calcul mental sont logés dans les items adjacents (5 Calcul, 2 Décimaux, 3 Fractions, 14 Longueurs, 18 Durées).
- **Approche retenue** : le calcul mental devient une **modalité d'évaluation timée** (cf. `TestModeDialog` « Course aux nombres » existant), applicable à des questions de n'importe quel item. Suivi fluence dédié reporté en V2.

---

## Items validés — capacités, justifications, points en discussion

### Item 1 — Nombres entiers

| Rang | Capacité                                                                                  | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------- | ------------------- |
| 1    | Comprendre la valeur d'un chiffre selon sa position                                       | `capacite_attendue` |
| 2    | Lire et écrire un grand nombre entier (jusqu'au milliard) en chiffres et en lettres       | `capacite_attendue` |
| 3 ⭐ | Comparer et ordonner des nombres entiers, les placer sur une demi-droite graduée          | `capacite_attendue` |
| 4    | Estimer et interpréter de très grands nombres (au-delà du milliard) dans un contexte réel | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Rang 2** : « grand nombre entier » précisé à **« jusqu'au milliard »** (nouveauté BO 2026) ; ajout **« en chiffres et en lettres »** (essentiel à ce niveau).
- **Rang 3** : ajout d'**« ordonner »** (objectif BO 2026 explicite) et de **« placer sur une demi-droite graduée »**.
- **Rang 4** : reformulation. Le « 12 chiffres » du PDF 2016 était arbitraire ; le BO 2026 oriente vers les **contextes réels** (démographie, distances dans l'Univers).

**Points en discussion** :

- Rang 4 alternative possible : _« Encadrer et arrondir des nombres entiers »_.

---

### Item 2 — Nombres décimaux

| Rang | Capacité                                                                | Rubrique            |
| ---- | ----------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître un nombre décimal et passer entre ses différentes écritures | `capacite_attendue` |
| 2    | Placer un nombre décimal sur une demi-droite graduée et le repérer      | `capacite_attendue` |
| 3 ⭐ | Comparer et ordonner des nombres décimaux, encadrer, intercaler         | `capacite_attendue` |
| 4    | Arrondir un nombre décimal à l'unité, au dixième, au centième           | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Pourcentage comme écriture d'un décimal** : pas mis ici (traité dans item 9). Évite le doublon.
- **Rang 4 PDF 2016 vide** rempli avec **« Arrondir »** — attendu BO 2026.
- **Comparer et placer permutés** : la demi-droite (rang 2) précède les fines comparaisons rang/chiffre (rang 3).

**Points en discussion** :

- Pourcentage comme écriture d'un décimal — à rediscuter si variation rang 4 alternative à introduire.

---

### Item 3 — Fractions

| Rang | Capacité                                                                                                   | Rubrique            |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître et représenter une fraction (sens partage + sens quotient) ; placer sur demi-droite            | `capacite_attendue` |
| 2    | Établir des égalités de fractions et comparer des fractions (y compris encadrer entre deux entiers)        | `capacite_attendue` |
| 3 ⭐ | Calculer une fraction d'une quantité ou d'un nombre (opérateur multiplicatif)                              | `capacite_attendue` |
| 4    | Effectuer des opérations sur les fractions (addition, soustraction simples ; multiplication par un entier) | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Sens quotient au rang 1** : grand pivot BO 2026 6ᵉ. Le PDF 2016 le mettait en expert (rang 4) ; remonté en foundation parce que tout le reste s'appuie dessus.
- **Égalités + comparaison fusionnés au rang 2** : BO 2026 les traite ensemble.
- **« d'une quantité ou d'un nombre » au rang 3** : précision BO 2026.
- **Opérations au rang 4** : nouveauté forte BO 2026 6ᵉ.

**Points en discussion** :

- **Rang 1 chargé** : sens partage + sens quotient + demi-droite. Possible scission.
- **Variations rang 4 abondantes** : à élaguer.

---

### Item 5 — Calcul (sens des opérations + calcul posé)

| Rang | Capacité                                                                                                                    | Rubrique            |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Comprendre le sens des 4 opérations et choisir l'opération pertinente dans un problème                                      | `capacite_attendue` |
| 2    | Additionner et soustraire (entiers et décimaux, calcul posé)                                                                | `capacite_attendue` |
| 3 ⭐ | Multiplier (posé) et diviser : entier × entier, entier × décimal ; division euclidienne ; division décimale par entier < 10 | `capacite_attendue` |
| 4    | Multiplier deux nombres décimaux et calculer avec parenthèses, en contrôlant par un ordre de grandeur                       | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Rang 1 enrichi** : ajout du **choix de l'opération dans un problème**.
- **Rang 3 élargi** : précisions BO 2026 (division euclidienne diviseur ≤ 100, division décimale par entier < 10).
- **Rang 4 reformulé** : **multiplication de deux décimaux** + parenthèses + ordre de grandeur (grande nouveauté BO 2026 6ᵉ).

**Points en discussion** :

- **Rang 3 chargé** (multiplications + 2 sortes de divisions).
- **Multiplication par 0,1, 0,01, 0,001** : actuellement dans calcul mental (item 4 suspendu). À rapatrier ici si l'item 4 ne couvre pas.

---

### Item 6 — Algèbre

| Rang | Capacité                                                                                            | Rubrique            |
| ---- | --------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Compléter une égalité à trous (en utilisant l'opération inverse)                                    | `capacite_attendue` |
| 2    | Résoudre un problème avec un nombre inconnu (schéma en barre ou représentation visuelle)            | `capacite_attendue` |
| 3 ⭐ | Identifier et poursuivre une régularité (suite de nombres, suite de motifs évolutifs)               | `capacite_attendue` |
| 4    | Exécuter et produire un programme de calcul ; identifier la structure générique d'un motif évolutif | `capacite_attendue` |

**Justifications** :

- **Item nouveau** : pas de PDF 2016 — structure construite ex nihilo, alignée BO 2026.
- **Progression d'abstraction croissante** : arithmétique concrète → résolution de problème → structure régulière → généralisation et programmes.
- **Pas de calcul littéral** : volontairement absent — c'est cycle 4.

**Points en discussion** :

- **Adjacence avec Fractions** (égalités à trous multiplicatives apparaissent aussi sous Fractions BO).
- **Schéma en barre vs lettres** : choix retenu = schéma en barre privilégié (recommandation BO).

---

### Item 7 — Organiser et lire des données

_(Renommage validé depuis « Représenter et lire des données » → aligné sur « Organisation et gestion de données » du BO 2026.)_

| Rang | Capacité                                                                                              | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe                        | `automatisme`       |
| 2    | Construire un tableau pour présenter des données et y filtrer une information selon un critère        | `capacite_attendue` |
| 3 ⭐ | Tracer un diagramme (barres ou circulaire) pour représenter des données                               | `capacite_attendue` |
| 4    | Mener une enquête statistique : planifier, recueillir, organiser, choisir la représentation, analyser | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Nouveau nom** : aligné sur le terme BO « Organisation et gestion de données ».
- **Rang 1 en `automatisme`** : automatisme officiel BO 2026 6ᵉ.
- **Rang 2 modifié** : le BO 2026 fait du **tableau + filtre** un pré-requis essentiel.
- **Rang 4 reformulé** : la grande nouveauté BO 2026 = **mener une enquête complète**.

**Points en discussion** :

- **Rang 3 (tracer)** : pas explicitement attendu par le BO 2026 mais conservé pour utilité pédagogique.
- **Sujets actualité (climat, biodiversité)** : insistance BO 2026 — recommandation de contexte pour variations rang 4.

---

### Item 8 — Probabilités

| Rang | Capacité                                                                                                    | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître si une situation est certaine, impossible, peu/très probable ; situer une probabilité sur 0 → 1 | `capacite_attendue` |
| 2    | Dénombrer les issues possibles et celles qui correspondent à un événement (« a chances sur b »)             | `capacite_attendue` |
| 3 ⭐ | Calculer une probabilité en équiprobabilité et l'exprimer en fraction, décimal ou pourcentage               | `capacite_attendue` |
| 4    | Comparer une fréquence observée et une probabilité calculée (approche fréquentiste)                         | `capacite_attendue` |

**Justifications** :

- **Item nouveau** : pas de PDF 2016. Structure construite depuis le BO 2026 seul.
- **Rang 3 ⭐ = pivot BO 2026 6ᵉ** : passer de « a chances sur b » au **nombre quotient a/b** sous ses différentes écritures.
- **Rang 4 = fréquentiste** (NEW BO 2026 6ᵉ).
- **Vocabulaire spécialisé** : volontairement absent des libellés (BO dit qu'il n'est « pas attendu » de l'élève).

**Points en discussion** :

- **Vocabulaire « événement », « issue »** : possible compromis libellé visible élève adouci.
- **Rang 2 chargé** (dénombrement + arbre/tableau + reconnaissance équiprobabilité).

---

### Item 9 — Proportionnalité et pourcentages

| Rang | Capacité                                                                                             | Rubrique            |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Identifier une situation de proportionnalité et la distinguer d'une situation non proportionnelle    | `capacite_attendue` |
| 2    | Résoudre un problème de proportionnalité (linéarité ×/+, retour à l'unité) ; représenter par tableau | `capacite_attendue` |
| 3 ⭐ | Comprendre, calculer et appliquer un pourcentage                                                     | `capacite_attendue` |
| 4    | Résoudre un problème d'échelle (carte, plan)                                                         | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Rang 2 plus exigeant** : le BO 2026 met les **3 procédures** (linéarité ×, linéarité +, retour à l'unité) comme attendu unifié.
- **Pourcentage promu en rang 3 ⭐** (vs rang 4 PDF 2016) : BO 2026 le formalise comme attendu standard.
- **Échelles maintenu en rang 4 expert** : BO dit « s'initier ».
- **Produit en croix volontairement absent** : interdit par BO 2026 6ᵉ.

**Points en discussion** :

- **Pourcentage rang 3 ⭐** : ambitieux pour « objectif pour tous ». Justifié BO mais à observer.
- **Tableau avec noms + unités** : insistance BO — variation V2.e ou capacité à part ?
- **« Produit en croix »** : interdit BO — garde-fou de rédaction à maintenir.

---

### Item 10 — Figures usuelles (lexique, reconnaissance) ⚡

| Rang | Capacité                                                                                                    | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître et nommer les figures planes usuelles (carré, rectangle, triangle, cercle)                      | `automatisme`       |
| 2    | Connaître et utiliser le lexique géométrique (sommet, côté, perpendiculaire, parallèle, rayon, diamètre, …) | `automatisme`       |
| 3 ⭐ | Coder et lire un codage d'une figure (angles droits, longueurs égales, axes de symétrie)                    | `automatisme`       |
| 4    | Reconnaître les figures particulières à partir de leurs propriétés (triangles, quadrilatères)               | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Découpage strict** : reconnaissance ici (item 10), tracer dans Constructions (item 11).
- **⚡ justifié par le BO** : 3 capacités sur 4 en `automatisme` (BO classe explicitement lexique + reconnaître + coder en automatismes 6ᵉ).
- **Rang 4 en `capacite_attendue`** : « identifier par propriétés » mobilise un raisonnement. **Rubrique mixte assumée**.

**Points en discussion** :

- **Découpage 10 / 11** : reconnaître vs construire — à rediscuter si artificiel.
- **Rubrique mixte** : précédent à valider pour les autres items mixtes.

---

### Item 11 — Constructions

| Rang | Capacité                                                                                                                                          | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Tracer un schéma à main levée d'une figure (avec codages)                                                                                         | `capacite_attendue` |
| 2    | Tracer aux instruments une figure usuelle de dimensions données (cercle, triangle, rectangle, carré, losange)                                     | `capacite_attendue` |
| 3 ⭐ | Réaliser une construction à partir d'un programme ou d'un schéma : perpendiculaire, parallèle, médiatrice, bissectrice, triangle sous contraintes | `capacite_attendue` |
| 4    | Écrire un programme de construction pour qu'un autre puisse reproduire la figure                                                                  | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Fusion 2016** « Figures usuelles (tracer) » + « Constructions ».
- **Rang 1 enrichi en « schéma codé »** (cohérence avec item 10 rang 3).
- **Médiatrice et bissectrice au rang 3 ⭐** : constructions canoniques attendues BO 2026.
- **Rang 4 « écrire un programme »** = méta-savoir (anticipe item 19).
- **Polygone régulier (PDF 2016 rang 4) absent** : pas attendu BO 2026 6ᵉ.

**Points en discussion** :

- **Cercle circonscrit au rang 3** (V3.f) : BO l'attend explicitement, complexité à débattre.
- **Polygone régulier** : à réintroduire en V4 ou supprimer ?
- **Médiatrice / bissectrice** : geste de construction ici ; propriété caractéristique non couverte. Créer un item « Notions configurations planes » ?

---

### Item 12 — Symétrie axiale

| Rang | Capacité                                                                                                                            | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Reconnaître un axe de symétrie d'une figure et reconnaître si deux figures sont symétriques par rapport à un axe                    | `capacite_attendue` |
| 2    | Compléter une figure par symétrie sur quadrillage ou papier pointé                                                                  | `capacite_attendue` |
| 3 ⭐ | Construire le symétrique d'un point ou d'une figure par rapport à une droite sur papier uni (aux instruments)                       | `capacite_attendue` |
| 4    | Utiliser les propriétés de conservation (longueurs, angles, alignements) pour effectuer des constructions ou résoudre des problèmes | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Structure proche du PDF 2016** : le BO 2026 a peu changé.
- **Rang 1 enrichi** : ajout de « reconnaître si deux figures sont symétriques ».
- **Rang 2 enrichi** : papier **pointé** ajouté (explicite BO 2026).
- **Rang 3 ⭐** : « papier uni » remplace « feuille blanche ».
- **Rang 4 précisé** : propriétés de conservation détaillées + propriété caractéristique de l'axe.

**Points en discussion** :

- **Définition du symétrique d'un point** : BO demande de « connaître ». Intégrée dans rangs 1+3, pas capacité distincte.
- **Papier pointé vs quadrillage** : regroupés rang 2, possible scission.
- **Réactivation item 10 V3.d** (compter axes) en V1.e : double-tagging à documenter.

---

### Item 13 — Espace (vision 3D, patrons)

| Rang | Capacité                                                                                                          | Rubrique            |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Identifier (nommer) les solides usuels : pavé, cube, cylindre, cône, boule, pyramide, prisme droit                | `automatisme`       |
| 2    | Connaître le lexique et compter : faces, arêtes, sommets ; reconnaître les caractéristiques d'un solide           | `capacite_attendue` |
| 3 ⭐ | Voir dans l'espace : passer entre un assemblage 3D et ses représentations 2D (vues, dénombrement de cubes cachés) | `capacite_attendue` |
| 4    | Construire un patron d'un cube ou d'un pavé droit (prolongement CM2 — pas attendu explicite BO 2026 6ᵉ)           | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Renversement de la pyramide de difficulté** : le PDF 2016 mettait patrons et perspective au cœur. Le BO 2026 met « vision dans l'espace 3D ↔ 2D » comme attendu unique 6ᵉ.
- **Rang 1 en `automatisme`** : automatisme explicite BO.
- **Patrons relégués au rang 4** : pas attendu BO 2026 6ᵉ, conservé pour continuité.
- **Perspective optionnelle** (V4.d) : mention « initiation ».

**Points en discussion** :

- **Discrepancy PDF 2016 ↔ BO 2026** : compromis retenu (BO strict + prolongement PDF). À rediscuter si strict alignement BO préférable.
- **Perspective cavalière** : pas attendu BO, traditionnel en enseignement.
- **Maquette physique** (V4.e) : activité plutôt que capacité — tagging discutable.

---

### Item 14 — Longueurs (périmètres)

| Rang | Capacité                                                                                      | Rubrique            |
| ---- | --------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Connaître les unités de longueur (du kilomètre au millimètre) et leurs relations              | `automatisme`       |
| 2    | Convertir entre unités de longueur (cas usuels)                                               | `automatisme`       |
| 3 ⭐ | Calculer le périmètre d'un polygone (carré, rectangle, triangle) et d'un disque (formule π×d) | `capacite_attendue` |
| 4    | Calculer le périmètre d'une figure composée ; résoudre un problème impliquant des longueurs   | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Rang 1 reformulé** : « comparer deux périmètres » (PDF 2016 rang 1) acquis CM, remplacé par les unités (automatisme BO).
- **Rangs 1-2 en `automatisme`** : conformes au BO 2026 6ᵉ.
- **Disque promu au rang 3 ⭐** (vs rang 4 PDF 2016) : BO 2026 en fait un attendu standard.
- **Rang 4** : « figures composées » (nouveauté forte BO 2026).
- **Compas comme outil de report** (automatisme BO) : mentionné V4.d.

**Points en discussion** :

- **« Comparer deux périmètres »** (PDF 2016) : absent. À rediscuter ?
- **Rang 3 chargé** : polygones + disque — possible scission.
- **Compas de report** : à promouvoir comme variation distincte au rang 1 ?

---

### Item 15 — Aires

| Rang | Capacité                                                                                             | Rubrique            |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Connaître les unités d'aire (cm², dm², m²) et leurs relations                                        | `automatisme`       |
| 2    | Comparer des aires sans recours à la mesure ; déterminer une aire par quadrillage                    | `automatisme`       |
| 3 ⭐ | Calculer l'aire d'un carré ou d'un rectangle (formules, première sensibilisation au calcul littéral) | `capacite_attendue` |
| 4    | Effectuer des conversions d'aire et résoudre un problème d'aire (figures composées de rectangles)    | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Alignement strict BO 2026 6ᵉ** : pas de triangle quelconque, polygone ou disque (vs PDF 2016 rang 4). Ces objets sont cycle 4.
- **Rang 1 reformulé** : unités d'aire en automatisme.
- **Rang 2 fusionné** : comparer (sans mesure) + quadrillage.
- **Triangle rectangle (PDF 2016 rang 2) supprimé** : pas attendu BO 2026 6ᵉ.
- **« Sensibilisation calcul littéral »** ajoutée V3.c : insistance BO 2026.

**Points en discussion** :

- **Triangle quelconque, polygone, disque** (PDF 2016 rang 4) : ABSENTS — alignement strict BO. À rediscuter si on élargit (cohérence avec item 13).
- **Sensibilisation calcul littéral** : possible capacité distincte ?

---

### Item 16 — Volumes

| Rang | Capacité                                                                                                | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Connaître l'unité cm³ et reconnaître que 1 cm³ = volume d'un cube de 1 cm d'arête                       | `automatisme`       |
| 2    | Comparer des volumes (par superposition mentale, transvasement, dénombrement) ; estimer un volume usuel | `capacite_attendue` |
| 3 ⭐ | Déterminer un volume par dénombrement de cubes (assemblages avec cubes cachés)                          | `capacite_attendue` |
| 4    | Calculer le volume d'un pavé droit (formule L × l × h) ; résoudre un problème de volume composé         | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Inversion vs PDF 2016** : « calculer le volume d'un pavé » (PDF 2016 rang 2 attendu) descendu rang 4. Le BO 2026 6ᵉ ne le demande **pas** explicitement.
- **Rang 3 ⭐ = unique objectif explicite BO** : dénombrement d'assemblages (lien direct item 13).
- **Rang 1 en `automatisme`** : connaître cm³.
- **Conversions d'unités de volume** (PDF 2016 rang 3) **supprimées** : pas attendues BO 2026 6ᵉ.

**Points en discussion** :

- **Discrepancy forte PDF 2016 ↔ BO 2026** : BO très allégé. Compromis strict BO + prolongement PDF.
- **Conversions d'unités de volume** : pas mises — variation V4 possible ?
- **Volume vs capacité** (litres) : V1.c et V1.d — possible capacité distincte ?
- **Double-tagging avec item 13** (assemblages cubes) : stratégie à formaliser.

---

### Item 17 — Angles (mesure)

| Rang | Capacité                                                                                                               | Rubrique            |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Connaître le lexique des angles : droit, plat, plein, nul, aigu, obtus ; reconnaître opposés/adjacents/supplémentaires | `automatisme`       |
| 2    | Mesurer un angle avec un rapporteur ; tracer un angle de mesure donnée                                                 | `capacite_attendue` |
| 3 ⭐ | Utiliser la somme des angles d'un triangle (180°) pour calculer un angle manquant                                      | `capacite_attendue` |
| 4    | Utiliser les propriétés des angles (opposés, supplémentaires, triangles particuliers) pour calculer ou justifier       | `capacite_attendue` |

**Justifications des changements vs PDF 2016** :

- **Rang 1 enrichi** : lexique au cœur (alignement BO 2026 — « comparer » du PDF 2016 acquis CM).
- **Rang 2 = mesurer + tracer combinés** (deux faces d'un même geste).
- **Rang 3 ⭐ = somme angles triangle** : nouveauté BO 2026 6ᵉ.
- **Bissectrice (PDF 2016 rang 3) déplacée en item 11** : construction couverte item 11 V3.d.
- **« Reproduire au compas »** (PDF 2016) descendu V4.e.

**Points en discussion** :

- **Rang 3 ⭐ chargé** (somme + cas particuliers). Possible scission.
- **Bissectrice double-tagging** : possible avec item 11.
- **Reproduire angle au compas** : caché V4.e — promouvoir si jugé important.
- **Angles complémentaires** : pas dans le BO 6ᵉ (cycle 4).

---

### Item 18 — Durées et repérage dans le temps

| Rang | Capacité                                                                                       | Rubrique            |
| ---- | ---------------------------------------------------------------------------------------------- | ------------------- |
| 1    | Lire l'heure (cadran à aiguilles, digital) et connaître les unités de durée et leurs relations | `automatisme`       |
| 2    | Convertir entre unités de durée (système sexagésimal)                                          | `capacite_attendue` |
| 3 ⭐ | Calculer la durée entre deux horaires ou un horaire à partir d'une durée                       | `capacite_attendue` |
| 4    | Résoudre un problème impliquant horaires et durées (avec conversions sexagésimal ↔ décimal)   | `capacite_attendue` |

**Justifications** :

- **Item nouveau** : pas de PDF 2016.
- **Rang 1 ⚡ en `automatisme`** : alignement automatismes BO 2026 (lecture heure + unités + relations).
- **Rang 2 séparé** : la conversion isolée permet validation graduelle.
- **Rang 3 ⭐ = calcul horaire/durée** : cœur attendu BO 2026 6ᵉ.
- **Rang 4 = conversion sexagésimal ↔ décimal** : nouveauté forte BO 2026.

**Points en discussion** :

- **Système sexagésimal ↔ décimal** : insistance forte BO. Capacité distincte possible.
- **Calendriers** : « mises en perspective historiques » — pas attendu DB.
- **Passage minuit** (V3.e) : bascule rang 4 si jugé trop dur ?

---

### Item 19 — Programmer

| Rang | Capacité                                                                                   | Rubrique            |
| ---- | ------------------------------------------------------------------------------------------ | ------------------- |
| 1    | Identifier une instruction, une séquence d'instructions, une répétition dans un programme  | `capacite_attendue` |
| 2    | Exécuter une séquence d'instructions à la main ou à l'aide d'un outil (Scratch, robot)     | `capacite_attendue` |
| 3 ⭐ | Produire une séquence d'instructions pour accomplir une tâche imposée (déplacement, tracé) | `capacite_attendue` |
| 4    | Programmer la construction d'un chemin en utilisant entrées, sorties et répétitions        | `capacite_attendue` |

**Justifications** :

- **Item nouveau** : pas de PDF 2016.
- **Progression naturelle** : identifier → exécuter → produire → programmer avec structures.
- **Rang 3 ⭐ « tâche simple »** : objectif central BO (« Produire et exécuter une séquence »).
- **Rang 4 « avec structures »** : objectif BO « Programmer la construction d'un chemin simple ».

**Points en discussion** :

- **Outil Scratch / robot** : pas une capacité DB. Tagging optionnel.
- **Tableur pour suites évolutives** : adjacence avec item 6 Algèbre — cross-item possible.
- **« À la main » vs « avec machine »** : non distinguées comme capacités.
- **Pseudo-code vs blocs Scratch** : à arbitrer côté templates.

---

## Conventions de travail

1. **Validation par item** : structure et choix pédagogiques validés ; libellés et variations à retravailler à la rédaction finale.
2. **Variations** : indications pédagogiques pour la création des templates, **pas d'entrée DB séparée**. Pool minimum visé : ≥ 2 variations distinctes par capacité (pour permettre la règle d'acquisition `capacite_attendue`).
3. **Rubriques** : portées par la capacité (pas par l'item). Items ⚡ ont une dominante automatisme mais peuvent avoir des capacités `capacite_attendue` au rang 4.
4. **Items mixtes** (10, 13, 14, 15, 16, 17, 18 — rubrique automatisme aux rangs bas et capacite_attendue plus haut) : précédent assumé et conforme au design doc.

## Documents produits / à produire

- `docs/wip/referentiel/6e-savoirs-progress.md` (ce document) — progression session par session, à jour
- `docs/wip/referentiel/6e-savoirs.md` (à réécrire) — référentiel final modèle B, à produire après ce point de validation
- `docs/wip/skills-referentiel-design.md` (patché 2026-06-07) — design doc à jour avec décision 57 et historique suite 18

## Étapes suivantes proposées

1. **Réécrire `6e-savoirs.md`** au format modèle B (18 items validés × 4 capacités + variations + rubriques + libellés finaux), en intégrant les choix actés.
2. **Item 4 (Calcul mental)** : à traiter dans une grille à part comme convenu, à un moment ultérieur.
3. **Points en discussion** : reprendre les points listés ci-dessus lors d'une session de relecture après rédaction du `6e-savoirs.md`.
4. **Migration DB et algorithmes** : à reporter après stabilisation du contenu (`6e-savoirs.md` validé).
