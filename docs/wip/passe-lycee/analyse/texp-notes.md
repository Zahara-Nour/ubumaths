# Lot `texp` : questions à trancher

Analyse du 2026-10-23, 57 modèles de maths expertes (`texp.csv`). Trois questions, qui couvrent les six lignes
`A_TRANCHER` (et une note sur un `TAG_PAR_VARIATION`).

## Q1 : un argument non remarquable obtenu par calcul (bbd211a5, et 2bf66851 V4)

**Modèle** : bbd211a5, « Produit, quotient, puissance et inverse sous forme exponentielle », à rattacher à
**TEXP-239** (« Effectuer des calculs sur des nombres complexes en choisissant une forme adaptée, en particulier dans
le cadre de la résolution de problèmes »).

**Exemple tiré du relevé** : « Soit z₁ = 9e^{−iπ/12} et z₂ = 3e^{−2iπ/3}. Écris z₁/z₂ sous forme exponentielle, avec
l'argument principal » → réponse 3e^{7iπ/12}. Les variations V1 (produit), V2 (quotient) et V4 (inverse) tirent des
arguments kπ/12, k de −11 à 11 : données et réponses comme π/12, 5π/12, 7π/12, 11π/12. V3 (puissance, multiples de
π/6) n'est pas concernée.

**Borne en jeu** : décision lte-2, « Argument exact attendu seulement quand cos θ et sin θ sont des valeurs
remarquables (multiples de π/6 et π/4) ». Ici l'argument n'est pas lu sur cos θ et sin θ : il est donné et s'obtient
par somme ou différence d'arguments donnés.

Même situation dans 2bf66851 V4 (« Soit ω = e^{2iπ/7}. Donne l'argument principal de ω¹⁰ » → 6π/7, n de 5 à 8).

**Options** :

- **A** : lte-2 ne vise que l'argument à **déterminer** à partir de cos θ et sin θ (forme algébrique → forme
  exponentielle) ; un argument donné ou obtenu par opérations sur des arguments donnés peut être quelconque.
  bbd211a5 → `TAG` TEXP-239 ; 2bf66851 V4 reste dans TEXP-257.
- **B** : lte-2 vaut pour tout argument exact attendu en réponse. bbd211a5 → `MODIFIER` : tirer m parmi les multiples
  de 2 et de 3 (arguments multiples de π/6 et π/4), données et résultats ; 2bf66851 V4 : n ∈ {3, 4, 6, 8}.

**Reco** : A. La décision répond à la question « quelles valeurs exactes de cos et sin connaître » ; ajouter π/3 et
−π/4 ne demande aucune trigonométrie, et l'argument π/12 est au programme par ailleurs (cos π/12 par la formule
d'addition, modèle 45d1cdd6).

## Q2 : « P à coefficients réels : si z est racine, z̄ l'est aussi » (293f8225 V1, 6ff00846 V3-V4)

**Point visé** : **TEXP-246**, « Un polynôme de degré n admet au plus n racines » (borne : « un polynôme de degré n a
au plus n racines »).

**Exemples tirés des relevés** :

- 293f8225 V1 : « P est un polynôme de degré 4 à coefficients réels tel que P(−4 + 3i) = 0 et P(5i) = 0. Donne ses
  deux autres racines » → −4 − 3i et −5i.
- 6ff00846 V3 (QCM) : « P est un polynôme à coefficients RÉELS, et P(−4 + 5i) = 0. Quel autre nombre est forcément une
  racine de P ? » → −4 − 5i.
- 6ff00846 V4 (QCM) : « P est un polynôme de degré 7 à coefficients RÉELS. Que peut-on affirmer ? » → « P a au moins
  une racine réelle ».

**Ce que dit le BO** : les racines conjuguées ne sont écrites que pour le degré 2 (TEXP-243, « Équation du second
degré à coefficients réels de discriminant négatif : solutions complexes conjuguées »). La propriété générale se
démontre avec les outils du programme (conjugué d'une somme, d'un produit, d'une puissance : TEXP-203, « Conjugaison.
Propriétés algébriques de la conjugaison »), mais n'est ni un contenu ni une capacité. Le degré impair ⇒ racine réelle
en découle (ou du théorème des valeurs intermédiaires de Tle spé).

Indépendamment de la question : 6ff00846 V1 écrit « P de degré n à coefficients complexes », hors borne générale
(polynôme à coefficients réels ; coefficients complexes = problème possible TEXP-364). À corriger dans tous les cas en
« à coefficients réels ».

**Options** :

- **A** : propriété admise comme application directe des propriétés de la conjugaison. 293f8225 → `TAG` TEXP-246 ;
  6ff00846 → `MODIFIER` TEXP-246 (V1 seulement).
- **B** : hors programme. 293f8225 → `MODIFIER` (retirer V1) ; 6ff00846 → `MODIFIER` (V1 corrigée, V3 et V4
  retirées, il ne reste que V1 et V2).
- **C** : admise seulement si l'énoncé rappelle la propriété (« on admet que, P étant à coefficients réels, le
  conjugué d'une racine est racine ») ; V4 retirée ou munie du même rappel.

**Reco** : C. Elle garde les variations utiles sans exiger un résultat que le BO ne nomme pas, comme la décision lte-7
le fait pour la formule ad − bc.

## Q3 : modèles de modélisation sur un point-compétence (1f88d29a, 41eb477b, 7d094336)

**Points visés** : **TEXP-335** « Modéliser une situation par un graphe » et **TEXP-336** « Modéliser une situation par
une matrice ». La borne de l'un et l'autre dit : « Point-compétence (modéliser) : pas de grain questionnable propre, il
se travaille dans les autres points ; aucune borne. »

**Exemples tirés des relevés** :

- 1f88d29a V2 (QCM) : « Dans un groupe de 7 personnes, chacune affirme avoir exactement 3 amis dans le groupe
  (l'amitié est réciproque). Est-ce possible ? » → non (somme des degrés impaire).
- 41eb477b V3 : cinq villes reliées par 7 lignes de bus → ordre 5, degré de B 4, 7 arêtes, 3 lignes à ajouter pour un
  graphe complet.
- 7d094336 V3 : « u_{n+2} = 3u_{n+1} − 2u_n ; avec X_n = (u_{n+1} ; u_n), donne A telle que X_{n+1} = AX_n. »

Toutes les variations restent dans les bornes générales (vocabulaire du BO, graphes non orientés, matrices réelles
d'ordre 2, récurrences du type AU_n + C). La seule question est le point qui les porte.

**Options** :

- **A** : garder TEXP-335 et TEXP-336 : la tâche de ces modèles est bien de traduire une situation (sommets, arêtes,
  matrice), et c'est leur seul trait commun. `TAG` pour les trois.
- **B** : retaguer sur les points de savoir, en suivant la note de la borne. 1f88d29a : V1 TEXP-312 (« Graphe, sommets,
  arêtes »), V2 TEXP-314 (« Degré »), V3 TEXP-313 (« Exemple du graphe complet ») ; 41eb477b : TEXP-314 (V3 touche
  aussi TEXP-313) ; 7d094336 : V1 TEXP-324 (« Représentation matricielle des systèmes linéaires »), V2-V4 TEXP-325
  (« Représentation matricielle des suites récurrentes »). Chacun devient `TAG_PAR_VARIATION`, sauf 41eb477b
  (TEXP-314 seul possible).

**Reco** : A pour les trois. Les modèles sont construits autour de la traduction d'une situation, et l'option B
disperse chacun sur deux ou trois points. La note de la borne s'écrivait sans modèle en vue.
