# Chantier `idees-6e-algebre` : idées de la rubrique « Algèbre » de 6e

## Reprendre ici

_Mis à jour le 2026-11-28, après la publication des 4 modèles neufs par David._

- **État** : rubrique **publiée** (vérifié en base : 9e0a8c36, 660db94b, b407006d, 048246da
  `published`) ; « je valide » + « go » de David = les 8 bons, aucun verdict en base, rien
  corrigé. Répartition mise à jour (« publiée », 4 réservations levées). Aucun worktree.
- **Prochaine action** : PR à part pour les noms rognés des schémas en barres
  (`schema-barres-scene.ts` l. 58), décidée le 2026-11-28, dans
  `ubumaths-wt-idees-6e-algebre-barres` ; puis verser le journal (fin de chantier).
- **En attente de David** : rien.
- **Pièges en cours** : aucun.

## Rubrique

Rubrique 6N4 « Algèbre » d'une autre plateforme : 9 exercices (6N4A-1 à 5, 6N4B-1, 6N4B, 6N4B-2,
6N43-1). Réservée le 2026-11-28 dans [idees-ailleurs-repartition.md](idees-ailleurs-repartition.md).
Points de 6e : 6-142 (schémas en barre), 6-143 (motif évolutif).

## Phase 0 (2026-11-28)

**Validée par David le 2026-11-28** (« je valide les modèles ») : F1 à F8 oui. Q1, Q2 tranchées le même jour (« je te suis », après mes recommandations) : Q1 oui (outil n° 72), Q2 6-143 pour F6 et F8.

Page à cocher : https://claude.ai/artifact/Cr9XEGScXm4C3HMUETjyLb (Oui / Non / Autrement + note, collection `verdicts`).

Si tout est oui : 4 modèles neufs (F2, F3, F6, F8) et 10 variations ajoutées à 4 modèles publiés
(F1 a9c37578, F4 a06458ad, F5 4048d9c5, F7 39bafe0e). Question d'accès : personne ne gagne d'accès
(rangement de modèles, variations de modèles publiés).

- **F1** a9c37578 « Schéma en barres : choisir le schéma d'un énoncé » : 4 variations (une partie
  cherchée, « n fois plus », valeur d'une part, nombre de parts).
- **F2** modèle neuf « Choisir le calcul qui résout le problème » (6-142), 4 variations.
- **F3** modèle neuf « Schéma en barres : compléter l'énoncé » (6-142), 4 variations.
- **F4** a06458ad « Balances » : 1 variation, pesées en kg.
- **F5** 4048d9c5 « Deux nombres inconnus » : 2 variations (têtes et pattes ; pièces de monnaie).
- **F6** modèle neuf « Motif répétitif » (6-143 ?), 3 variations.
- **F7** 39bafe0e « Motif évolutif : trouver la régularité » : 3 variations (étape 100, motifs de cubes).
- **F8** modèle neuf « Ce nombre est-il dans la suite ? » (6-143 ?), 3 variations.
- **Q1** outil « construire l'étape suivante d'un motif » dans `outils-manquants.md` ?
- **Q2** point de F6 et F8 : 6-143, ou sans point ?

## Fiches validées (copie de la page à cocher, 2026-11-28)

Texte des fiches F1 à F8 tel que David l'a validé (« je valide les modèles »), recopié de la page à
cocher pour que le lot s'écrive sans elle.

- **F1** (4 variations à a9c37578 « Schéma en barres : choisir le schéma d'un énoncé », 6-142
  inchangé). Même forme : un énoncé, trois ou quatre schémas dans une case choix ; mauvais schémas =
  erreurs habituelles (? au mauvais endroit, addition au lieu de « n fois plus », total sur une seule
  barre). v3 une partie cherchée (« 45 élèves, dont 27 filles : combien de garçons ? ») ; v4 « n fois
  plus » (« Tom a 12 billes, Léa 4 fois plus ») ; v5 valeur d'une part (« 56 gommes partagées entre
  8 amis ») ; v6 nombre de parts (« 56 gommes rangées par 8 : combien de paquets ? »). Entiers 10 à
  99, facteurs 3 à 9. Coup de pouce : « Cherche d'abord ce qu'on connaît : le tout, ou une des
  parts ? »
- **F2** (modèle neuf « Choisir le calcul qui résout le problème », 6-142, 4 variations). Case choix :
  les quatre opérations avec les mêmes nombres (32 + 7, 32 − 7, 32 × 7, 32 ÷ 7) ; corrigé = schéma en
  barres. v1 tout ou partie (+ ou −) ; v2 comparaison (« 6 ans de moins que sa sœur ») ; v3 produit
  (« 7 paquets de 32 cartes ») ; v4 partage avec, dans une partie des tirages, le piège « avec mes 7
  amis » (÷ 8). Un nombre 15 à 50, l'autre 5 à 9 ; partages exacts. Coup de pouce : « Dessine le
  schéma : cherches-tu le tout, une partie ou une part ? »
- **F3** (modèle neuf « Schéma en barres : compléter l'énoncé », 6-142, 4 variations). Schéma donné
  avec nombres et étiquettes, énoncé à cases. v1 trois achats et leur total (livre, cahier, stylo) :
  3 cases puis le total ; v2 triathlon (natation 200 à 1 500 m, vélo 15 fois plus, course 5 fois
  plus) : 2 cases puis le total ; v3 trois étapes dont une manque (randonnée, total donné) : la partie
  cherchée ; v4 partage avec reste (gâteaux entre 4 à 9 amis) : parts puis reste. Les étiquettes du
  schéma disent quelle case va où. De 2 à 4 cases. Erreurs prévues : deux nombres inversés, total à
  la place d'une partie, reste oublié. Coup de pouce : « Chaque barre porte un nom : trouve-le dans
  l'énoncé. »
- **F4** (1 variation à a06458ad « Balances : la masse de deux objets », 6-142 inchangé). v4 pesées en
  kg (0,5 à 3 kg), réponse en kg, deux cases. Erreurs prévues : différence pas partagée, pesée
  partagée entre tous les objets, réponse en g dans la case en kg.
- **F5** (2 variations à 4048d9c5 « Deux nombres inconnus : billets et devinettes », 6-142 inchangé).
  Corrigé par essai puis ajustement (« s'il n'y avait que des poules, 18 pattes ; chaque lapin en
  ajoute 2 »). v3 têtes et pattes (lapins/poules, chats/oiseaux) ou voitures/motos (roues), tirés
  dans une liste ; v4 pièces de 20 c et 2 €, ou 50 c et 1 €, somme en euros décimale. Effectifs 2 à 10. Deux cases. Erreurs prévues : nombres inversés, total partagé en deux, pattes divisées par 4.
  Coup de pouce : « Et s'il n'y avait que des poules ? »
- **F6** (modèle neuf « Motif répétitif : la forme d'un rang lointain », **6-143** (Q2), 3
  variations). Frise de formes de couleur (rond, carré, triangle, étoile) ; forme choisie dans une
  case choix qui montre les formes du bloc ; longueur du bloc et nombre de ronds se tapent. v1
  longueur du bloc (2 à 6 formes ; 2 à 3 blocs montrés) ; v2 forme d'un rang lointain (30 à 100),
  case choix ; v3 combien de ronds parmi les 60 premières formes. Erreurs prévues : quotient pris pour
  le reste, compte qui commence à 0, un bloc compté une fois de trop. Coup de pouce : « Combien de
  blocs entiers avant cette forme ? »
- **F7** (3 variations à 39bafe0e « Motif évolutif : trouver la régularité », 6-143 inchangé). Formes
  a × n + b seulement. v4 jetons en croix (4 × n + 1) à l'étape 100 ; v5 motif de cubes (tours
  reliées, a × n + b, a de 2 à 4) à l'étape 10 ou 20, bloc ` ```cubes ` ; v6 même motif de cubes : à
  quelle étape compte-t-il N cubes ? (étape 15 à 60). Une case. Erreurs prévues : 100 × (éléments de
  l'étape 1), + b oublié, étape suivante seulement. Coup de pouce : « Que garde-t-on d'une étape à
  l'autre, et qu'ajoute-t-on ? »
- **F8** (modèle neuf « Ce nombre est-il dans la suite ? », **6-143** (Q2), 3 variations). Suite à
  pas constant (pas 2 à 8, départ 2 à 9) ; nombre de la suite si son écart au premier terme est un
  multiple du pas. v1, v2 : quatre grands nombres dans une case choix, un seul dans la suite, les
  autres décalés de 1, de pas − 1, de la moitié du pas ; v1 suite depuis le début, nombres 100 à
  1 000 ; v2 suite montrée à partir d'un terme lointain, 1 000 à 10 000 ; v3 (saisie) le plus grand
  terme ≤ N. Erreurs prévues (v3) : N lui-même, le terme d'après, un multiple du pas oubliant le
  départ. Coup de pouce : « Combien faut-il ajouter au premier terme pour arriver à ce nombre ? »

## Lot écrit (2026-11-28)

Deux agents (neufs, publiés), relus dans le code ; specs relancées par la session : 168/168.
Écarts aux fiches, tous écrits en tête des deux scripts :

- F2 v4 : cinquième choix N ÷ (k + 1), sans lequel le piège « entre lui et ses k amis » n'aurait pas
  sa bonne réponse parmi les choix.
- F3 v2 : barres du triathlon pas à l'échelle 1 : 5 : 15 (étiquette de la natation illisible
  sinon) ; ordre des longueurs gardé.
- F6 v1 : coup de pouce propre et 2 erreurs prévues seulement ; v2 : blocs de 4 à 6 formes (la case
  choix montre exactement les formes du bloc) ; v3 : 60 multiple de toutes les longueurs, jamais de
  bloc entamé.
- F8 : pas de 3 à 8 en v1 et v2 (corrigé par la session : avec un pas de 2, les trois intrus étaient
  tous décalés de 1, une question de parité) ; v3 : N de 100 à 1 000.
- F1 : trois schémas par variation ; F4 : masses d'objet 0,5 à 3 kg, pesées jusqu'à 15 kg ; F5 v4 :
  erreurs transposées aux pièces ; F7 v6 : 2 erreurs prévues ; F7 : motif de cubes = tour de départ
  de b cubes puis une tour de a cubes par étape.
