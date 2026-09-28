# Lot « Suites » — rapport de relecture

15 questions TinyMath (#618–#632), 1re spé (une en terminale) : calculer un terme, écrire le terme
suivant, conjecturer le terme général, limites, suites arithmétiques. Relecture le 2026-09-28
(Claude, deux relecteurs puis contrôle d'ensemble).

> ⏳ **En attente du feu vert de David** pour l'import en BROUILLON.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 2      |
| Corrigée puis approuvée         | 13     |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/suites`) : **15 analysés,
0 non importable**, 50 tirages par variation sans échec (2 100 pour les 42 variations de #626).
Rendu (5 tirages par variation) : seul marqueur restant, `{{answer}}` dans le message de retour
(#627, #628, #631, #632), remplacé à l'affichage par la réponse de l'élève. Les décimaux des
formules (`0.3^n`, #625) sont affichés à la française par l'écran.

Avant relecture, **7 questions sur 15 ne généraient pas** (#621, #623, #627, #628, #631, #632) ou
échouaient 1 fois sur 10 (#625).

## Corrections notables

- **Case réponse absente** (#627, #628, #631, #632) : ajoutée (« Le terme suivant est □. »,
  « La raison est □. »).
- **Terme général en n** (#622–#624) : réponse attendue écrite pour que le correcteur la compare
  (`3\times(-2)^n`) ; écritures équivalentes naturelles acceptées (`9-7n` et `-7n+9`), erreur
  classique u_1 pris pour premier terme refusée.
- **#621** : la validation TinyMath (`testAnswers`) n'était pas convertie → reconstruite, une case
  par variation (expression de u\_{n+1}).
- **#626** : les 42 énoncés affichaient les codes TinyMath lettre par lettre (« i n f p l u s ») →
  réécrits (+∞, −∞, 0⁺, 0⁻) ; les 42 bonnes réponses contrôlées une à une ; 10 erreurs typiques
  testées (forme indéterminée prise pour 0 ou +∞, signe avec 0⁻).
- **#625** : variation `u_n = n` en échec (la variable valait la lettre « n ») ; `\infin` → `\infty`.
- **Corrections** : résultat affiché hors formule (`=$-17`) sur 8 questions ; astérisque (#624) ;
  `$$` jamais fermé (#628) ; triples accolades (#632).
- Consignes à l'impératif, « précédant » → « précédent », « A partir » → « À partir ».

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## Choix des relecteurs — à valider

1. **#621, formes** : variation 1, la forme développée est perfectible (forme factorisée attendue) ;
   variation 2, `4(n+1)` est perfectible (forme développée attendue). Veux-tu les deux formes justes ?
2. **#625** est classée 1re spé alors que les limites de suites relèvent de la terminale (#626 y est
   déjà). La déplacer en T_SPE ?
3. **#629 / #630** : identiques après conversion, seul le niveau change (3 et 4) — gardées toutes les
   deux (ta décision du lot Entiers).

## Limites du correcteur relevées (non bloquantes pour ce lot)

- **#623, #624** : des écritures justes mais rares sont refusées, car l'équivalence avec n en
  exposant n'est pas reconnue : `6\times2^{n-1}`, `\frac{6}{5^n}`, `5\times(-0{,}25)^n`.
- **#623** : pour a = ±1, la correction affiche `1\times2^n` (juste, mais maladroit).

## Défauts du moteur trouvés (vérifiés, à corriger)

1. ⚠️ **`{{eval}}` avec une lettre en exposant perd les parenthèses d'une base négative** :
   `{{eval:a*(b)^x}}` avec a = 3, b = −2 affiche `3 \times (-2^x)` au lieu de `3 \times (-2)^x` —
   **calcul faux, sans erreur**. Contourné dans ce lot (#623 : `{{a}}\times{{eval:b;()}}^n`).
2. **Contrainte « parenthèses inutiles »** : `6\times\left(\frac{1}{5}\right)^n` est rendu perfectible
   (`brackets`), alors que les parenthèses sont indispensables à l'écriture scolaire. Contrainte
   coupée sur #624.

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. Case réponse non placée quand la source n'a pas de champ de réponse.
2. `$$u_n=$$&solution` → résultat hors formule ; formules à cheval sur le mode math.
3. `\infin` non traduit ; codes `infplus`, `infmoins`, `0plus`, `0moins` non traduits.
4. Variable dont l'expression est une seule lettre (« n ») lue comme référence à une variable.
5. `testAnswers` non converti (#621).
6. Consignes TinyMath en question (« Quel semble être… »), accords, espaces avant « : » et « ? ».
