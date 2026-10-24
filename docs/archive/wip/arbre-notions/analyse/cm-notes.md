# Lot `cm` (CM1, CM2) — questions pour David

Analyse du 2026-10-18 : 128 modèles (84 CM1, 44 CM2), verdicts dans `cm.csv`.
Une entrée A_TRANCHER, puis trois questions transversales qui conditionnent plusieurs verdicts déjà rendus.

## A_TRANCHER

### 1. Critères de divisibilité par 3 et par 9 (9c03423a, e81493f7 — CM2)

- **Modèles** : « Utiliser un critère de divisibilité — Par 9 » et « — Par 3 ». QCM Oui / Non, nombres à
  trois chiffres.
- **Exemple** : « Le nombre 999 est-il divisible par 9 ? » → Oui ; « 994 est-il divisible par 3 ? » → Non.
- **Tension** : la question générée est dans CM2-008 (« déterminer si un entier ≤ 10 est un diviseur d'un
  nombre donné ») ; mais le titre annonce le critère par 9 / par 3, et la borne générale du CM2 dit « seuls les
  critères de divisibilité par 2, 5 et 10 sont au programme » (BO c3 p.9).
- **Options** :
  - A. TAG CM2-008 : on juge la question, pas le titre ; l'élève peut répondre par une division.
  - B. MODIFIER puis TAG CM2-008 : retitrer « Déterminer si 9 est un diviseur » et retirer toute mention du
    critère dans la correction (division ou table).
  - C. HORS_PROGRAMME au CM2 : le modèle enseigne un critère hors programme ; il reste sur son nœud (critères
    par 3 et 9 = 6e au mieux).
- **Reco** : B. Le titre et la correction disent ce que l'élève apprend ; la question elle-même convient.

## Questions transversales (verdicts provisoires rendus selon la règle existante)

### T1. Opérations à trou et CM1-061 / CM2-065 (23 modèles HORS_PROGRAMME)

- **Modèles** : `? × 10 = 983`, `2,9 + ? = 9,8`, `? : 1 000 = 9,763`, `90 × ? = 8 100`, `586 + ? = 999`…
  (liste : verdicts citant « Q1 » dans `cm.csv`).
- **Règle appliquée** : Q1 du 2026-10-17, « opérations à trou hors tables → pas de tag ».
- **Tension** : les bornes de CM1-061 « Trouver le nombre manquant dans une égalité à trous » citent
  « 347 = 20 + … », « 5 760 − … = 5 360 », « 24 × 5 = … × 10 », « à l'écrit 748 + … = 1 200 » (exemples de
  réussite CM1 p.13) ; CM2-065 « chaque membre contient au plus deux opérations ». Q1 a été posée au moment des
  scissions (le trou n'est pas l'autre sens d'un point de calcul) ; elle ne dit pas si CM1-061 accueille ces
  modèles.
- **Options** : A. garder Q1 telle quelle (23 HORS) ; B. taguer CM1-061 / CM2-065 les trous dont les nombres
  restent dans le champ du niveau (presque tous) ; C. CM1-061 seulement pour les trous qui ne sont pas la
  simple réciproque d'un calcul déjà au programme.
- **Reco** : B. L'égalité à trou est précisément la tâche de CM1-061 et les exemples de réussite en donnent de
  ce type exact (`748 + … = 1 200`) ; les modèles hors champ (× 100 d'un décimal au CM1, retenues…) restent
  à refuser sur leurs nombres, pas sur le trou.

### T2. CM1-039 / CM1-133 : « un nombre entier d'unités, de dixièmes… » (4 MODIFIER)

- **Modèles** : 3bbe92f2, f1a392f5 (sommes), b100ddb2, b9a9048a (différences). Ex. `1,5 + 8,4`, `9,95 − 7,4`.
- **Lecture appliquée** : le nombre ajouté ou soustrait est k unités d'**un seul** rang (k de 1 à 9) : BO c3 p.7,
  exemples `4,45 + 0,3`, `1 462 + 300` ; même lecture que ta décision c3-2 au CM2 (« pas un décimal
  quelconque, 2,37 »). Les quatre modèles ajoutent un nombre à deux ou trois rangs, sans retenue.
- **Options** : A. MODIFIER (un seul rang non nul, ce que propose le CSV) ; B. HORS_PROGRAMME (le modèle vise
  justement « parties entière et décimale », on le garde tel quel, hors progression) ; C. lecture large de
  CM1-039 (sans retenue suffit) → TAG.
- **Reco** : A pour garder un modèle tagué sur CM1-039 ; sinon B. C contredirait c3-2.

### T3. QCM « Quel est le plus petit ? » et « comparer avec les symboles » (2 MODIFIER)

- **Modèles** : 9c0c47ef (décimaux, CM1-034), 0021eee7 (entiers, CM1-008).
- **Lecture appliquée** : même refus que 943151d0 au CP (le point dit « avec les symboles =, < et > », le QCM
  n'en montre aucun) → MODIFIER : choix <, =, >. Les QCM de fractions (CM1-020 « Comparer des fractions »,
  sans symbole dans le libellé) sont tagués tels quels.
- **Reco** : confirmer la lecture ; elle vaut pour les autres lots.
