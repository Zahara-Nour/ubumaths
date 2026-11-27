# Fiches de phase 0 « géométrie repérée » de 1re spé (2026-11-27)

Chantier [`idees-1re-geometrie-reperee`](idees-1re-geometrie-reperee-progress.md) · [relevé](idees-1re-geometrie-reperee-releve.md).
Deux modèles neufs, aucune variation de modèle publié. Les 7 autres cas de la rubrique sont déjà
couverts. **Question d'accès** de la migration : personne ne gagne d'accès, on range deux modèles.

## F1. Problème de synthèse : droite, perpendiculaire, projeté et cercle (1G21-1) : modèle neuf N1

- **Point** : 1SPE-437 « Utiliser un repère pour étudier une configuration » (porté par la notion
  « Géométrie repérée ») · **sous-notion** : projeté orthogonal (niveaux 2 et 3 pris ; N1 au niveau 4).
- **Chez eux → chez nous** : même chaîne sur les mêmes points, en **une variation à cases
  numérotées**, comme ed2c1c0b :
  1. une équation cartésienne de (AB) (case `equation`, multiples acceptés) ;
  2. une équation cartésienne de la droite d perpendiculaire à (AB) passant par C (AB est normal à d) ;
  3. les coordonnées de H, point d'intersection de (AB) et de d, c'est-à-dire le projeté de C sur (AB)
     (2 cases, fractions irréductibles) ;
  4. la longueur AB (valeur exacte, √n accepté) ;
  5. les coordonnées du milieu Ω de [AB] (2 cases) ;
  6. une équation du cercle de diamètre [AB] (case `equation`).
- **V1** : H à coordonnées entières (C choisi pour cela), AB entier ou √n.
- **V2** : comme chez eux, A, B, C quelconques de −5 à 5 non alignés : H à coordonnées fractionnaires.
- **Plages** : coordonnées de −5 à 5, non nulles, A, B, C non alignés, AB² ⩾ 8 (figure lisible).
- **Erreurs prévues** :
  - question 2 : la parallèle à (AB) par C (AB pris comme vecteur directeur de d au lieu de normal) ;
  - question 3 : H pris au milieu de [AB] ;
  - question 6 : le rayon r au second membre au lieu de r², ou un signe faux au centre
    ((x + x_Ω)² au lieu de (x − x_Ω)²).
- **Coup de pouce** : « Le vecteur $\overrightarrow{AB}$ est normal à toute droite perpendiculaire à
  (AB). Pour H, résous le système formé par les deux équations. »

## F2. Problème de synthèse avec le produit scalaire : carré, projeté et cercle (1G21-2) : modèle neuf N2

- **Point** : 1SPE-437 « Utiliser un repère pour étudier une configuration » · **sous-notion** :
  projeté orthogonal (niveau 5).
  Autre choix possible : 1SPE-436 « Utiliser le produit scalaire pour résoudre un problème
  géométrique », sous-notion « propriétés » du produit scalaire (niveau 9), à côté de la droite
  d'Euler (ed2c1c0b). Je recommande 1SPE-437 : la moitié des questions sont des équations (droite,
  cercle), et les deux synthèses de la rubrique restent ensemble.
- **Chez eux → chez nous** : même figure (carré OABC de côté c, I(x_I ; y_I), H projeté de C sur (OI),
  cercle ε de centre D(x_I/2 ; x_I/2) et de diamètre d), figure tracée par le bloc `figure`, cases
  numérotées :
  1. les coordonnées de $\overrightarrow{OI}$ et $\overrightarrow{OC}$ (4 cases), puis
     $\overrightarrow{OI}\cdot\overrightarrow{OC}$ ;
  2. les longueurs OI puis OH (avec $\overrightarrow{OI}\cdot\overrightarrow{OC} = OI \times OH$) ;
     leur case « exprimer en fonction de OH et OI » (saisie de lettres) devient l'étape écrite du
     corrigé : on demande directement la longueur OH ;
  3. une équation cartésienne de (CH) ($\overrightarrow{OI}$ est normal à (CH)), et l'équation
     développée de ε (case `equation`) ;
  4. leur « M appartient-il à ε ∩ (CH) ? Répondre O ou N » devient un **choix à quatre réponses** :
     « M est sur ε et sur (CH) », « sur (CH) seulement », « sur ε seulement », « sur aucun des deux ».
     Les quatre cas sont tirés à parts égales, pour qu'on ne puisse pas répondre au hasard.
- **V1** : OI irrationnel (OI = √(x_I² + y_I²)), OH écrit avec un dénominateur sans racine.
- **V2** : I(4 ; 3), donc OI = 5 et OH = 3c/5 (décimal ou fraction).
- **Plages** : celles de leur code : x_I de 3 à 6, y_I de 1 à x_I − 1, côté c de x_I + 1 à x_I + 4,
  diamètre de 2 à x_I + 3 ; M pris parmi les points à coordonnées simples de (CH), de ε, ou d'aucun.
- **Erreurs prévues** :
  - question 1 : OI·OC = OI × OC (produit des longueurs) ;
  - question 2 : OH = OI·OC (sans diviser par OI) ;
  - question 3 : $\overrightarrow{OI}$ pris comme vecteur directeur de (CH) ; le rayon au lieu du
    rayon² dans l'équation de ε.
- **Coup de pouce** : « H est le projeté de C sur (OI) : $\overrightarrow{OI}\cdot\overrightarrow{OC}
  = \overrightarrow{OI}\cdot\overrightarrow{OH}$, et ces deux vecteurs ont le même sens. »

## Rien d'autre

1G20-1 (4 cas), 1G20-2 (2 cas) et 1G20-3 sont couverts par e710f32f, 6e074f0e, d8a958ba, e6552232,
c2add21a, 81811b59 et 9bea5ec2, sans écart qui vaille une variation (plages et formes de réponse
équivalentes ou meilleures chez nous).
