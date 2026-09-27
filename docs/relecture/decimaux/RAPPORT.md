# Lot « Décimaux » — rapport de relecture

83 questions TinyMath (#228–#310), CM1 à 6e. Relecture le 2026-09-27 (Claude, quatre relecteurs,
puis contrôle d'ensemble).

> ✅ **Feu vert d'import donné par David avant la relecture. Les 83 questions sont importées en
> BROUILLON** (vérifié en base : reliées au suivi, statut draft, 83 emplacements distincts).
> David les publie lui-même.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 23     |
| Corrigée puis approuvée         | 60     |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/decimaux`) : **83 analysés,
0 non importable**, 445 specs vertes, 50 tirages par variation sans échec. Quand un décimal est
attendu, `3.5` et `3{,}5` sont tous deux jugés justes. Contrôle d'ensemble : 8 tirages par
variation, sans marqueur brut ni zéro final.

## Corrections notables

- **Réponses fausses** : décimal formé en collant ≥ 3 chiffres tirés (`d.fg`, `a.bc`, `0.0b`) →
  8,2 + 1,55 = 33,2 (#250, #255, #263, #265) ; #262 ne générait pas. Réécrits en calcul
  (`{{eval:d+f/10+g/100;d}}`).
- **Réponse = énoncé** (#242, #243) : « forme fractionnaire de 0,8 » attendait 0,8 ; la fraction est
  maintenant attendue (consigne de #243 complétée par « en simplifiant au maximum »).
- **Corrections fausses** : #278 affichait « 3 × 0,1 = 82,4 » (variable inversée, déjà dans
  TinyMath) ; corrections inversées (#258) ; accolade de couleur non fermée (#267).
- **Tirages** : `digits:X.Y` tirait des décimaux finissant par 0 (7,0 ; 0,70), voire 0 ; bornes
  calculées `0..4-a` lues `0..4` ; conditions ajoutées ou tirages réécrits (≈ 30 questions).
- Typographie : « dizièmes », « Utiiser », « obternir », « a trou », « Jusqu'au centièmes ».

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## Décisions de David (2026-09-27)

1. Espace dans la partie décimale (`0,183 8`) : **gardée**.
2. #229, #234, 0 en tête (« 61,97, chiffre des centaines » → 0) : **gardé**.
3. #239, #241 : **écriture en fractions décimales exigée**, ordre des termes libre, terme nul
   facultatif (forme exigée par motif, #479) ; `5 + 4/5 + 1/100` refusé. Brouillons mis à jour.
4. #248 (encadrement au centième en CM1) : **correct**, inchangé.

## Défauts trouvés dans le code

- **#478** : réponse à plusieurs cases dont une fausse → `status: 'correct'` avec
  `isCorrect: false` (les écrans lisent `isCorrect`, sans effet élève ; le lanceur de specs lisait
  `status`). Conditions converties : `mod(a, 3)` avec espace (`mod(14,3)` se lit `mod(14.3)`).

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. Décimal formé en collant ≥ 3 variables (`&4.&5&6`) : mal converti.
2. `digits:X.Y` : le générateur peut tirer un dernier chiffre nul (TinyMath l'excluait), et
   `digits:0` donne 0.
3. Borne calculée `0..4-a` lue `0..4` (le `-a` ignoré en silence).
4. Noms de variables avec « \_ » (`a_int`) : illisibles dans une condition (lus comme indice).
5. Virgule décimale écrite en dur dans le LaTeX (`0,5`) : s'affiche « 0, 5 ».
6. Décimal sans solution TinyMath (`[._…_]`) : la réponse attendue devient le décimal lui-même.
