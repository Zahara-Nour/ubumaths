# Fiches de phase 0 : produit scalaire de Première (2026-11-26)

Chantier [`idees-1re-produit-scalaire`](idees-1re-produit-scalaire-progress.md) · [relevé](idees-1re-produit-scalaire-releve.md).
Chaque fiche donne ma recommandation, son point (un seul, ADR 0020), sa sous-notion, ses variations,
ses plages et sa forme de réponse, avec le passage « chez eux → chez nous ». Chaque variation aura ses
`testSpecs`, trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse. Tout est
en 1re spé (`grades` : `1_SPE`) ; les niveaux numérotés seront relevés en prod juste avant la
migration de rangement.

**En tout** : 5 modèles neufs (N1 à N5) et 11 variations sur 7 modèles publiés. Aucun de ces modèles
n'est réservé par une autre session (grep de `docs/wip/`, 2026-11-26).

**Question d'accès** : personne ne gagne d'accès. On range des modèles neufs (nœud et point) et on
ajoute des variations à des modèles publiés.

**Outils** : aucun ne manque. Figures écrites avec le bloc `figure` (`grille: oui`, `vecteur`,
`polygone`, `angle`, `marque_segment`).

## Modèles neufs

### F1. Produit scalaire dans un parallélogramme (1G10-1, cas 2) : modèle neuf N1

- **Point** : 1SPE-412 « Produit scalaire à partir de la formule avec le cosinus » (un seul modèle
  aujourd'hui, un QCM de cours) · **sous-notion** : expressions du produit scalaire.
- **Chez eux → chez nous** : même idée (figure du parallélogramme, angle en A marqué, une saisie). Leurs
  10 produits se ramènent à 3 situations. Chacune devient une variation.
- **V1** : vecteurs de même origine, AB·AD, avec l'angle en A donné.
- **V2** : côtés consécutifs, AB·BC : l'angle en B est le supplémentaire de l'angle en A, et
  BC = AD (DC·BC, CD·AD aussi).
- **V3** : un vecteur opposé : AB·CB, DA·DC, BA·CB (on se ramène à V1 ou V2 en changeant le signe).
- **V4** : V1 à V3 avec l'angle en radians (π/6, π/4, π/3).
- **Plages** : AB de 4 à 8, AD de 3 à 6, angle en A de 30°, 45° ou 60°. Réponse exacte : entier,
  fraction, k√2 ou k√3, éventuellement sur 2 (3 × 5 × √3/2 = 15√3/2).
- **Erreurs prévues** : l'angle en A pris à la place de l'angle en B (signe faux) ; AB × AD sans le
  cosinus ; le sinus à la place du cosinus.
- **Coup de pouce** : « Dans un parallélogramme, deux angles consécutifs sont supplémentaires. »

### F2. Produit scalaire par projection sur une figure à points espacés (1G10-2, cas 3) : modèle neuf N2

- **Point** : 1SPE-310 « Produit scalaire à partir de la projection orthogonale » (un seul modèle
  aujourd'hui, un QCM) · **sous-notion** : expressions du produit scalaire.
- **Chez eux → chez nous** : même figure : [AB] partagé en 10 parties égales, C au-dessus de A
  ((AC) ⊥ (AB)), D sur [AB], E et F de part et d'autre de H, avec (EF) ⊥ (AB). Une saisie, rien à
  changer.
- **V1** : AB·DE (projeté de DE sur (AB) : DH, de même sens).
- **V2** : AD·CF (C se projette en A, F en H).
- **V3** : CE·DB (projeté AH ; le sens compte).
- **V4** : DC·BH (projeté DA, de sens opposé : résultat négatif).
- **Plages** : AB = 10, 5 ou 20 (graduation 1, 0,5 ou 2) ; D sur l'une des graduations 2 à 4 ; H sur la
  graduation 8 (ou 7, 9).
- **Erreurs prévues** : le produit des longueurs des deux vecteurs ; le bon projeté mais le signe
  oublié ; la graduation comptée pour 1 quand elle vaut 0,5 ou 2.
- **Coup de pouce** : « Projette les deux extrémités du second vecteur sur la droite (AB). »

### F3. Produit scalaire lu sur un quadrillage (1G10-3) : modèle neuf N3

- **Point** : 1SPE-310 · **sous-notion** : expressions du produit scalaire.
- **Chez eux → chez nous** : même figure (quadrillage, l'unité est le côté d'un carreau). Une saisie.
- **V1** : AB horizontal, C se projette du même côté que B.
- **V2** : AB vertical, C se projette de l'autre côté (résultat négatif).
- **V3** : AB horizontal ou vertical, et C dans les deux sens, au hasard.
- **V4** : AB penché (vecteurs (2 ; 1), (1 ; 2), (3 ; 1)…), et C tel que son projeté tombe sur un
  nœud du quadrillage : AB·AC = k × AB², avec k de −2 à 3, jamais 0. Chez eux, le cas penché vaut
  toujours 0 (angle droit). Chez nous, le résultat est un nombre, et l'élève ne peut pas deviner 0.
- **Plages** : longueurs de 3 à 6 carreaux (V1 à V3).
- **Erreurs prévues** : la longueur AC comptée à la place du projeté ; le signe oublié ; AB × AC.
- **Coup de pouce** : « Trace la perpendiculaire à (AB) qui passe par C. »

### F4. Aire d'un triangle avec le produit scalaire (1G12-1) : modèle neuf N4

- **Point** : 1SPE-320 « Utiliser le produit scalaire pour calculer une longueur dans le plan » ·
  **sous-notion** : angles et longueurs.
- **Chez eux → chez nous** : même chaîne en 4 cases : AB·AC, puis AD (D projeté de C sur (AB)), la
  hauteur CD, l'aire de ABC. Valeurs exactes.
- **V1** : AB entier (vecteur AB de la forme (3 ; 4), (6 ; 8), (5 ; 12)…).
- **V2** : AB irrationnel (AB = √n) : AD = (AB·AC)/√n, écrit avec un dénominateur sans racine.
- **Plages** : coordonnées de −5 à 5, A, B, C non alignés, AB·AC > 0 (D est du côté de B, comme chez
  eux).
- **Erreurs prévues** : AD = AB·AC (sans diviser par AB) ; aire = AB × CD (sans diviser par 2) ; CD²
  donné à la place de CD.
- **Coup de pouce** : « AB·AC = AB × AD, car D est le projeté de C sur (AB). »

### F5. Droite d'Euler dans un repère (1G12-2) : modèle neuf N5

- **Point** : 1SPE-436 « Utiliser le produit scalaire pour résoudre un problème géométrique » ·
  **sous-notion** : propriétés (celle de 6058963e, déjà tagué 1SPE-436).
- **Chez eux → chez nous** : leurs « montrer que » deviennent des calculs à saisir, l'un après l'autre.
  A, B, C sont des points entiers d'un cercle de centre K (rayon² 45 ou 90), et H est donné.
  1. AB·HC et AC·HB (deux saisies) ;
  2. « Que représente H pour le triangle ABC ? » (choix : orthocentre, centre du cercle circonscrit,
     centre de gravité, milieu de [BC]) ;
  3. KA² = KB² = KC² (une saisie) ;
  4. les coordonnées de G, avec AG = 2/3 AM (deux saisies) ;
  5. le réel k tel que KH = k·KG (k = 3), qui montre l'alignement.
- **V1** : rayon² = 45 · **V2** : rayon² = 90.
- **Point faible** : à l'étape 1, on attend 0, et l'élève le sait. Elle reste parce que c'est le
  « montrer que » de l'exercice. Le calcul utile vient après (étapes 3 à 5). On peut la retirer si
  tu préfères.
- **Erreurs prévues** : G pris au milieu de [BC] (AG = AM) ; G avec AG = 1/3 AM ; k = 1/3 (rapport à
  l'envers) ; KA au lieu de KA².
- **Coup de pouce** : « H est sur deux hauteurs ; une droite passe par le sommet et est perpendiculaire au côté
  opposé. »

## Variations de modèles publiés

### F6. Rectangle avec centre et milieu (1G10-2, cas 1) : 1 variation de b73923a1 (1SPE-321)

- **Chez eux → chez nous** : même figure. Les 3 cases de nos autres variations (b73923a1 en a toujours 3).
- **V5** : rectangle ABCD de centre O, I milieu de [AB] : AB·AO, CA·AI, ID·BC.
- **Plages** : AB pair de 6 à 14, AD de 3 à 8, AD < AB.
- **Erreurs prévues** : CA·AI positif (le signe oublié) ; AB × AO ; ID·BC = ID × BC.
- **Coup de pouce** : « Projette O sur (AB) : c'est I. »

### F7. Triangle et hauteur, vecteurs de sens opposés (1G10-2, cas 2) : 1 variation de 9c7f7ef0 (1SPE-321)

- **V5** : H entre A et B (figure de la v1) : BA·AC et HB·CA (deux cases), réponses négatives.
- **Plages** : celles de la v1.
- **Erreurs prévues** : le signe oublié ; AB × AH à la place de HB × HA ; CH utilisé.
- **Coup de pouce** : « BA et AH sont-ils de même sens ? »

### F8. Normes, vecteurs qui ne partent pas du même point (1G10-4, cas 3) : 1 variation de d787d8c0 (1SPE-321)

- **V5** : triangle aux trois côtés donnés : BA·AC (= −AB·AC).
- **Plages** : celles de la v3.
- **Erreurs prévues** : AB·AC (le signe oublié) ; (AB² + AC² + BC²)/2 ; la division par 2 oubliée.
- **Coup de pouce** : « BA = −AB. »

### F9. Combinaisons et graphique en coordonnées (1G10-5, cas 3 et 4) : 3 variations de fe407c88 (1SPE-321)

- **V5** : (k u)·v, avec k de −5 à 5 (sauf 0 et 1).
- **V6** : u·(v + w) ou u·(v − w).
- **V7** : u et v dessinés dans un repère quadrillé (coordonnées de −5 à 5) : u·v.
- **Erreurs prévues** : V5 : k appliqué aux deux vecteurs ; V6 : le signe de w ; V7 : les coordonnées
  de l'extrémité à la place de celles du vecteur, x et y échangés.
- **Coup de pouce** : « Calcule d'abord les coordonnées de k u (de v + w). » ; « Compte les carreaux de
  l'origine à la pointe de la flèche. »

### F10. Quatre points, deux droites (1G11-1, cas 1) : 1 variation de f2cc01fc (1SPE-318)

- **Chez eux → chez nous** : leur « montrer que » devient le choix de nos v1 à v4, avec la case du
  produit scalaire avant, pour que le choix ne soit pas au hasard.
- **V5** : A, B, C, D : AB·CD, puis « (AB) et (CD) sont-elles perpendiculaires ? ». Une fois sur deux,
  elles ne le sont pas.
- ⚠️ f2cc01fc a un écart ouvert (termes nuls dans le corrigé, `docs/wip/ecarts-tri/pedagogie.md`) :
  le corrigé de V5 n'écrira pas de terme nul.
- **Erreurs prévues** : AB·AC à la place de AB·CD ; xx′ − yy′ ; « oui » si le produit n'est pas nul.
- **Coup de pouce** : « Deux droites sont perpendiculaires si leurs vecteurs directeurs sont orthogonaux. »

### F11. Rectangle et points placés par une fraction (1G11-1, cas 3 et 4) : 2 variations de 6058963e (1SPE-436)

- **V5** (sans repère, comme leur cas 3) : rectangle ABCD, AE = k·AD, AF = k′·AB ; par Chasles,
  EC = ED + DC et DF = DA + AF. On demande ED·DA, DC·AF, puis EC·DF (= 0).
- **V6** (avec repère, cas 4) : repère d'origine A, axes portés par (AB) et (AD), en unités de longueur :
  coordonnées de EC et DF, puis EC·DF.
- **Plages** : leurs 7 rectangles (12 × 4, 6 × 4, 15 × 5…), qui donnent (EC) ⊥ (DF).
- **Erreurs prévues** : ED·DA positif ; DC·AF = DC × AB ; EC·DF calculé sans les termes nuls.
- **Coup de pouce** : « ED et DA sont colinéaires, de sens opposés. »

### F12. Angle au dixième de degré à partir de trois points (1G11-2) : 2 variations de bf5dadf6 (1SPE-319)

- **V7** : A, B, C (de −5 à 5) : AB·AC, AB et AC (valeurs exactes), puis BAC au dixième de degré.
- **V8** : A, B, C lus sur la figure (repère quadrillé) : AB·AC, puis BAC au dixième.
- **Plages** : A, B, C non alignés, AB·AC ≠ 0 (comme chez eux).
- **Erreurs prévues** : l'angle en radians ; arccos(AB·AC) sans diviser par AB × AC ; l'arrondi à
  l'unité.
- **Coup de pouce** : « Écris AB·AC de deux façons : avec les coordonnées et avec le cosinus. »

## Rien à faire

1G10-1 cas 1 (ba8ae428), 1G10-4 cas 1 et 2 (d787d8c0, affe59f7), 1G10-5 cas 1 et 2 (fe407c88),
1G11-1 cas 2 (f2cc01fc v4, 2bfbf2fc v3), 1G11-3 (721324f9 v3, v4).
