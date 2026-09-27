# Lot « Calcul littéral » — rapport de relecture

68 questions TinyMath (#511–#578), de la 5e à la 2de. Relecture le 2026-09-27 (Claude, quatre
relecteurs puis contrôle d'ensemble).

> ✅ **Feu vert d'import donné par David avant la relecture. Les 68 questions sont importées en
> BROUILLON** (vérifié en base : reliées au suivi, statut draft, 68 emplacements distincts ; #553
> après le merge de #482, motif `acceptable` vérifié en base). David les publie lui-même.

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 9      |
| Corrigée puis approuvée         | 59     |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/calcul-litteral`) : **68
analysés, 0 non importable**, 50 tirages par variation sans échec.

## Défauts corrigés dans le moteur pendant ce lot

- **#480 — calcul littéral** : `{{eval:…}}` ne savait calculer qu'avec des nombres ; 29 questions
  sur 68 ne généraient pas (« free variables: x »). Il rend maintenant l'expression réduite par
  `tidy`, jamais développée (`2*3*x` → `6x`, `5*(2+3x)` → `5(3x+2)`). Décision de David.
- **#481 — lettre tirée homonyme d'une variable** : a = « b » (lettre tirée), b = 2 → « b × 2 × 6 »
  s'affichait « 2 × 2 × 6 », réponse 24 au lieu de 12b (≈ 17 questions du lot, et Puissances
  #414–#424 : « c² × c⁴ » affiché « 4² × 4⁴ »). Substitution simultanée : une valeur substituée
  n'est jamais relue.
- **#482 — motif « acceptable »** : `requiredForm { pattern, acceptable }` rend perfectible une
  réponse juste qui n'est pas sous la forme demandée (#553).

## Corrections notables

- **Énoncés faux par collision de lettres** (avant #481) : « Réduire 81 + 81 » au lieu de
  « 9c + 9c » ; lettres renommées à la main par les relecteurs (p, q, r… ou t, x, y, z).
- **Famille « Par substitution »** (#511–#514) : la valeur de la lettre n'était pas substituée,
  la réponse attendue était littérale (« 6a ») ; réécrite en calcul numérique. Une valeur négative
  est parenthésée dans le calcul (« −4 × (−3) »).
- **Ne généraient pas** : `$ers[1;9]` (relatif affiché avec son signe) non converti (#523, #529) ;
  exclusions mal numérotées (#533 excluait la lettre ; #570 `!ma,da` au lieu de `!m(a),d(a)`) ;
  lettre `x` en dur dans un calcul (#577, #578).
- **Développer** (#534) : la réponse attendue `{{eval:{{expression}}}}` sortait la forme factorisée
  (`tidy` réduit sans développer) ; forme développée écrite dans la réponse attendue.
- **Produits collés** (`ac`, `ba`) lus comme un nom de variable (#513, #538) ; `pgcd` et `:` non
  convertis (#544).
- **Corrections** : terme nul affiché « +16 × c 0 » (#526, tirages exclus) ; variation 3 de #526
  alignée sur sa correction ; `x=1--6` (#561, variation scindée).
- **Formes** : réponses non réduites ou recopiées refusées ; ordre des termes libre ; parenthèses
  gardées refusées dans « enlever les parenthèses » (#529, `brackets` strict).
- Typographie : consignes à l'impératif (« Réduis », « Développe et réduis », « Résous » au lieu de
  « Résouds »), « Simlifie », « variabless », « Equation ».

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## Décisions de David (2026-09-27)

1. `{{eval:…}}` littéral : politique « réduire » (`tidy`).
2. #553 (factoriser z² − 14z + 49) : `(z−7)²` et `(7−z)²` justes, `(z−7)(z−7)` **perfectible**,
   recopie refusée. Une règle globale « signe libre sous un carré » dans `checkForm` a été mesurée
   puis écartée : 0 question touchée en base, en TinyMath seules #553 (gagnante) et #609 (forme
   canonique : `(−x−2)²` serait devenue acceptée).
3. #573–#576, #578 : étapes redondantes de la correction (`x = \frac{3}{3}` puis `x = 1`,
   `x = \frac{4}{1}`) **gardées**.
4. Nombre mixte (`2\frac{4}{7}`) comme solution d'équation : **refusé**.

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. `$ers[a;b]` (relatif affiché avec son signe) non converti → `a..b;±` + `{{eval:x;+}}`.
2. Exclusions `\{&1;&2;&4}` mal numérotées ; exclusions arithmétiques sans parenthèses.
3. Produits collés `&1&3` → `ac`, lu comme un nom de variable.
4. `[_&4x_]` → `{{eval:4x}}` : lettre en dur dans le calcul.
5. Réponse attendue d'un « Développer » calculée par `{{eval:…}}` : forme non développée.
6. `pgcd` et `:` non convertis dans les calculs.
7. Consignes à l'infinitif ; « Résouds » dans toute la famille équations.
