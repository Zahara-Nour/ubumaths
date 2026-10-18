# Lot cycle4 (5e, 4e, 3e) — questions à trancher

Analyse du 2026-10-18, consigne `CONSIGNE.md`. Une entrée par question ; les modèles
concernés sont repérés par leur titre et leur `template_id` (CSV : `cycle4.csv`).

## Q1. Équations a − x = b et a ÷ x = b en 5e : dans le « type » x + b = c / ax = c ?

- Modèles : « Soustraction (2) » (a73f55ba, fractions), « Soustraction (2) a − x = b »
  (6bc8108f, entiers), « Soustraction (2) a − x = b » (d80e2e02, relatifs) → 5-045 ;
  « Division (2) a ÷ x = b » (c0c8920a) → 5-126.
- Exemple : `18 − x = 9` (x = 9) ; `81 / x = 9` (x = 9).
- Les bornes de 5-045 et 5-126 disent « type x + b = c seulement » / « type ax = c
  seulement ». L'inconnue soustraite ou au dénominateur n'est pas littéralement de ce type,
  mais se résout par la même opération inverse (18 − x = 9 ⇔ 9 + x = 18, une addition à
  trou ; 81 / x = 9 ⇔ 9x = 81).
- Options : (a) TAG 5-045 / 5-126, « type » lu comme la famille additive / multiplicative ;
  (b) HORS_PROGRAMME (lecture littérale) ; (c) MODIFIER : retirer ces modèles du 5e.
- Reco : (a). Le BO parle de « problème relevant d'une addition (multiplication) à trou »,
  ce que ces formes sont ; aucune technique nouvelle.

## Q2. « Traduire une phrase en expression » (vocabulaire somme, différence, produit, quotient) : 5e ou 4e ?

- Modèle : « Traduire une phrase en expression mathématique » (78feafed), niveau 5e,
  ancien CSV : TAG 5-116.
- Exemple : « le produit de 2 par la différence entre 9 et 6 » → `2*(9-6)` ; var. 3-4 avec
  « quotient ».
- C'est mot pour mot la tâche du point 4-073 (4e) : « Écrire l'enchaînement d'opérations
  décrit par une phrase (« le quotient de 12 par la somme de 2 et 4 ») », bornes
  « somme, différence, produit, quotient ». 5-116 traduit une suite d'actions
  (« ajoute 3, puis multiplie par 2 ») ; 5-006 réserve le vocabulaire complet au 4e.
- Options : (a) TAG 5-116 (une phrase = une succession donnée d'opérations) ;
  (b) reclasser le modèle en 4e et TAG 4-073 ; (c) MODIFIER : en 5e, ne garder que la
  var. 1 (somme, produit) — elle reste plus proche de 4-073 que de 5-116.
- Reco : (b). La consigne et les mots sont ceux de 4-073.

## Q3. Équations multiplicatives de 4e hors « a, b, c entiers relatifs »

- Modèles (4e) : « Division » x/b = c/a (07a51f8f) ; « Division » x/a = b en relatifs
  (4466d293) ; « Division (2) » b/x = c/a (419887ff) ; « Division (2) a/x = b »
  (b0ef6947) ; « Multiplication » bx = fraction (6a60ed10, var. 1-4). Ancien CSV : pas de
  tag (« contenu de 5e »).
- Exemples : `x/(−9) = 2` (x = −18) ; `9/x = 2/9` (x = 81/2) ; `9x = 81/4` (x = 9/4).
- 4-024 borne : « ax + b = c avec a, b, c entiers relatifs ». En 5e, le même type n'admet
  que des positifs, donc ces modèles n'ont de place qu'en 4e s'ils en ont une.
- Options : (a) TAG 4-024 pour tous, « type » lu largement ; (b) TAG 4-024 seulement pour
  x/a = b (5-126 compte déjà « x/2 = 0 » dans le type ax = c), le reste HORS_PROGRAMME ;
  (c) HORS_PROGRAMME pour tous (lecture littérale des entiers).
- Reco : (b), en cohérence avec Q1. x/a = b est le cas cité par le BO, transposé aux
  relatifs ; si Q1 est tranchée en (a), a/x = b (entiers) entre aussi. Les seconds membres
  fractionnaires (x/b = c/a, b/x = c/a, 9x = 81/4) sortent du « entiers relatifs ».
  Conséquences : 4466d293 et b0ef6947 → TAG 4-024 ; 07a51f8f → HORS_PROGRAMME ;
  419887ff → MODIFIER (retirer la var. 1, garder b/x = a) ; 6a60ed10 → MODIFIER
  (retirer les var. 1-4, garder ax = b).

## Q4. « Réduire un produit » (a × (−6) × 9 = −54a) : 3-012 ?

- Modèle : « Réduire un produit, coefficients relatifs » (93a5f7a9), niveau 3e. Ancien CSV :
  pas de tag (« règle des signes en 4e »). Modèle voisin en 5e : « Réduire un produit,
  coefficients positifs » (08a3f943), classé HORS_PROGRAMME (rien en 5e, et x² exclu).
- Exemples : `(−a) × (−5) × (−2) = −10a` ; `9 × (−6) × (−a) = 54a`.
- 3-012 : « Simplifier des expressions produits ou des rapports comportant des facteurs
  communs », exemples (a²b) × (bc), ab²/(a²b), πR²/(2πR). Le modèle simplifie bien un
  produit, mais sans facteur littéral commun : c'est la réduction de base que les exemples
  de 3-012 supposent acquise.
- Options : (a) TAG 3-012 (« expressions produits » lu au sens large) ; (b) HORS_PROGRAMME ;
  (c) MODIFIER : ajouter un facteur littéral commun (a × (−6) × a → −6a²) pour coller aux
  exemples de 3-012.
- Reco : (a). En 3e tous les nombres du cycle sont permis, et le geste « regrouper les
  nombres, puis les lettres » est celui de 3-012.

## Remarques (pas des questions)

- Borne « expressions à une variable » de 4-070 : appliquée strictement, elle met en
  MODIFIER six modèles de factorisation de 4e (variations à deux lettres, 81y + 18x). Si
  cette borne ne visait que le x² (« pouvant contenir x² »), ces modèles passeraient en TAG.
- Opérations à trou : la décision de David du 2026-10-17 (pas de tag) a été appliquée à
  toutes les opérations à trou du lot (fractions, relatifs). Les QCM « signe du facteur
  manquant » (4-001, 4-002) restent tagués : aucun nombre n'y est calculé, seule la règle des
  signes sert, comme dans l'ancien CSV.
- Plusieurs modèles de 4e ou de 3e relèvent d'un autre niveau (notation scientifique et
  exposants négatifs en 4e → 3e ; distributivité simple en 3e → 4e ; fraction d'une quantité
  et simplification en 5e → 6e/4e). Ils sont en HORS_PROGRAMME avec « reclassement
  possible » dans la justification : changer le niveau d'un modèle n'est pas une
  modification de plage, c'est à décider à part.
