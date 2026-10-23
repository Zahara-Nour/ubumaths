# Lot 2de : questions à trancher

Analyse du 2026-10-23 (passe lycée, étape d). Quatre questions pour six modèles ; tout le reste du lot est dans `2de.csv`.

## N1. Retirer la valeur absolue d'une expression littérale dont on connaît le signe

**Modèle** : `d6a810f4-aa45-46b3-853a-c276a22870e7`, « Calculer une valeur absolue » (valeur absolue d'une expression littérale dont il faut étudier le signe). Tag actuel : 2-245.

**Ce que le modèle génère** (8 variations) :

- V1-V4 : |kx| ou |−kx|, k de 1 à 3, avec « si x ⩾ 0 » ou « si x ⩽ 0 ». Exemple : « Calcule cette expression si x ⩽ 0 : |−3x| » → −3x.
- V5-V8 : |x + a| ou |x − a|, a de 1 à 3, avec « si x ⩾ −a » ou « si x ⩽ a ». Exemple : « Calcule cette expression si x ⩽ 3 : |x − 3| » → 3 − x.

**Le problème** : le BO de 2de réserve la notation |a| à la distance et aux intervalles de centre donné (« Toute autre utilisation est hors programme »). La décision l2-1 garde aussi la fonction x ↦ |x| (définition, courbe, signe, variations, |x| = k, |x| < k) et √a² = |a|, et exclut |2x − 1| < 3, |ab| = |a||b| et les expressions à plusieurs valeurs absolues. Retirer les barres d'une expression littérale dont on connaît le signe n'est dans aucune des deux listes.

**Options** :

- **A. Tag 2-245** (« Notation en valeur absolue |a| pour la distance de a à 0 ») : |A| = A si A ⩾ 0 et −A sinon, c'est la définition appliquée à un réel A dont on connaît le signe.
- **B. Tag par variation** : V1-V4 dans 2-245 ; V5-V8 dans 2-420 (« Distance entre deux nombres réels ») : |x − 3| est la distance de x à 3, qui vaut 3 − x quand x ⩽ 3. Un modèle ne porte qu'un point : il faudrait le scinder.
- **C. Hors programme en 2de** : calculer sur |expression littérale| est une « autre utilisation ».

**Reco** : A. Le modèle n'utilise que la définition de |a|, sans propriété ni équation. Si David lit « toute autre utilisation » strictement, C.

## N2. Signe de kx ou de x ± a quand on connaît le signe de x

**Modèles** : `4cc21ccd-03d9-4e62-b669-f5ca03a1cc9a` (x positif) et `c7cdca01-326b-487f-8400-ba25d382de74` (x négatif), « Signe d'une expression ». Tag actuel : 2-263 (« Somme d'inégalités »).

**Ce que les modèles génèrent** (QCM positif / négatif / « On ne peut pas savoir », 4 variations chacun) :

- V1-V2 : kx et −kx, k de 1 à 4. Exemple : « Si x est négatif, quel est le signe de −3x ? » → positif.
- V3-V4 : x + a et x − a, a de 1 à 4. Exemple : « Si x est positif, quel est le signe de x − 3 ? » → on ne peut pas savoir.

**Le problème** : le tag actuel 2-263 ne justifie que V3-V4 (de x > 0 on tire x + 4 > 4). V1-V2 relèvent de 2-424 (« Produit d'une inégalité par un réel positif, négatif, en liaison avec le sens de variation d'une fonction affine »). Un seul point couvrirait les quatre variations : 2-328 (« Signe d'une fonction affine »), restreint à x > 0 ou x < 0.

**Options** :

- **A. Tag 2-328** (« Signe d'une fonction affine ») pour les deux modèles : kx et x ± a sont des fonctions affines, et on lit leur signe sur une demi-droite.
- **B. Tag par variation** : 2-424 pour V1-V2, 2-263 pour V3-V4. Un modèle ne porte qu'un point : il faudrait scinder chaque modèle en deux.
- **C. Garder 2-263** et retirer V1-V2 (ou les déplacer dans un modèle tagué 2-424).

**Reco** : A. Un seul point par modèle, sans rien retirer. Le raisonnement attendu (règles des inégalités) reste celui que le BO lie au sens de variation d'une fonction affine (2-424).

## N3. Équation |x − a| = b

**Modèle** : `939153b6-9aa8-4a59-809e-071a7d3b8b77`, « Résoudre une équation avec une valeur absolue ». Tag actuel : 2-340.

**Ce que le modèle génère** : |x − a| = b, a de −9 à 9 non nul, b de 1 à 9, |a| ≠ b ; deux solutions a + b et a − b. Exemple : « |x − 9| = 8 » → x = 17 ou x = 1 ; « |x + 8| = 9 » → x = 1 ou x = −17.

**Le problème** : 2-340 et 2-458 portent sur f(x) = |x| seulement (|x| = k, décision l2-1), et 2-246 sur l'inéquation |x − a| ⩽ r. L'équation |x − a| = b n'est nommée nulle part. La décision l2-1 exclut |2x − 1| < 3 (coefficient de x différent de 1) mais ne dit rien de |x − a| = b.

**Options** :

- **A. Tag 2-420** (« Distance entre deux nombres réels », |a − b|) : chercher les x dont la distance à a vaut b, c'est-à-dire les deux points à distance b de a.
- **B. Hors programme en 2de** : seule l'inéquation |x − a| ⩽ r est au programme ; l'équation est une « autre utilisation ».

**Reco** : A. La lecture « distance de x à a » est exactement celle que le BO donne à |x − a|, et la résolution n'utilise rien d'autre.

## N4. Probabilités conditionnelles hors d'un tableau croisé d'effectifs (texte, pourcentages)

**Modèles** :

- `77d6fedc-1643-4451-a685-2451dc1616cb`, « Parmi les… : modéliser un tableau croisé ou un sondage ». Tag actuel : 2-395.
- `f3e68e4b-9855-4e91-bc0d-7363b7650b86`, « Tableau croisé : probabilité de A sachant B ». Tag actuel : 2-396.

**Ce que les modèles génèrent** :

- 77d6fedc V1 : tableau d'effectifs 2 × 3 (régime × niveau), deux probabilités conditionnelles p₁ et p₂. Exemple : 116 demi-pensionnaires en seconde sur 390 → p₁ = 58/195.
- 77d6fedc V2 : sondage décrit en texte, sans tableau. Exemple : « 600 élèves, 180 prennent le bus, 112 habitent à plus de 10 km, 66 les deux » → p₁ = 33/56, p₂ = 11/30.
- 77d6fedc V3 : tableau en pourcentages de l'ensemble des élèves. Exemple : filles en club 12 %, garçons en club 14 % → P(fille | club) = 6/13.
- f3e68e4b V1 : tableau d'effectifs 2 × 2 → P_B(A).
- f3e68e4b V2 : tableau en pourcentages de la population. Exemple : A ∩ B = 5 %, B = 35 % → P_B(A) = 1/7.

**Le problème** : 2-396 (« Calculer des probabilités conditionnelles lorsque les évènements sont présentés sous forme de tableau croisé d'effectifs ») ne couvre que les tableaux d'effectifs (77d6fedc V1, f3e68e4b V1). Un tableau en pourcentages de la population est un tableau de probabilités. La décision l2-10 a dit, pour la construction (2-394), que « le tableau de probabilités n'a pas de point en 2de ». Un sondage en texte n'est pas présenté sous forme de tableau. Le tag actuel de 77d6fedc (2-395, traduire un énoncé en notations P(A), P_A(B)…) ne convient pas : aucune notation n'est demandée, les réponses s'appellent p₁ et p₂.

**Options** :

- **A. Tag 2-390** (« Probabilité conditionnelle d'un évènement B sachant un évènement A de probabilité non nulle ; notation P_A(B) ») pour 77d6fedc, et 2-396 gardé pour f3e68e4b en acceptant V2 : 2-390 est la notion même, sans contrainte sur la présentation des données ; le « parmi les … » qui fixe l'univers est la définition.
- **B. Strict, dans la ligne de l2-10** : 2-396 pour les deux modèles, en retirant les variations qui ne sont pas des tableaux d'effectifs. Il faut retirer 77d6fedc V2 et V3 et f3e68e4b V2 (MODIFIER).
- **C. Intermédiaire** : un tableau en pourcentages « de la population » se lit comme un tableau d'effectifs ramenés à 100 (même calcul Card(A ∩ B)/Card(B)). On accepte donc les pourcentages dans 2-396 et on retire seulement 77d6fedc V2 (texte).

**Reco** : A pour 77d6fedc, et B pour f3e68e4b (retirer V2), pour rester cohérent avec l2-10 sur les tableaux de probabilités. Si David préfère une seule règle pour les deux modèles, B.

Dans tous les cas, ces modèles reçoivent TCOMP-302 en Terminale complémentaire (tableaux croisés parmi les outils cités, sans restriction effectifs ou pourcentages).
