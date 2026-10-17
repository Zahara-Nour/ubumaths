---
title: Lenteur des grandes fractions — phase 0
date: 2026-10-12
status: phase 0 validée par David (« je suis tes reco » : option A, seuil 1 000, 2026-10-12) — codé sur `perf/grandes-fractions`
---

# Lenteur des grandes fractions — phase 0

Lot ouvert par décision de David (2026-10-12, « lot à part ») après la reco 2 du mode décimal
(#1155). Worktree : `ubumaths-wt-grandes-fractions`, branche `perf/grandes-fractions`.

## Mesures (2026-10-12, console de Calcul, `main` après #1155)

### Où passe le temps — `(1+1/10000)^10000`

| Étape                                        | Durée                                |
| -------------------------------------------- | ------------------------------------ |
| calcul exact (`evaluate`, `normalize`)       | 3,7 s — fait **deux fois** (booléen) |
| lecture de l'arrondi (`approximateDigitsOf`) | 1,9 s — faite **deux fois**          |
| mise au propre (`tidy`)                      | 2,7 s — refaite au rendu (1,65 s)    |
| **console, mode exact + rendu**              | **13 s**                             |
| **console, mode décimal**                    | **16 s**                             |

Le résultat exact affiché fait **80 003 caractères**. `(1+1/100000)^100000` bloque le navigateur
plus de 200 s.

**Cause** : le pgcd d'Euclide, quadratique — 1,5 à 1,8 s pour deux nombres de 40 000 chiffres ;
la puissance du calcul exact (`powPolynomial`) élève au carré en réduisant à chaque produit.

### Un pgcd plus rapide ne suffit pas

Prototype de Lehmer (0 écart sur 3 000 paires comparées à Euclide) : 4,6 fois plus rapide
(1,8 s → 0,4 s à 40 000 chiffres). Branché dans mathAST : `(1+1/10000)^10000` passe de 13 s à
3 s. Mais l'écran porterait toujours 80 003 caractères, et `n = 100 000` (un million de chiffres)
resterait hors de portée — le coût est quadratique.

### Longueur des résultats exacts d'élèves (mode exact, aujourd'hui)

| Saisie                                                   | Caractères | Saisie                 | Caractères |
| -------------------------------------------------------- | ---------- | ---------------------- | ---------- |
| `2^64`, `30!`, `2^100`                                   | 20 à 33    | `1.01^365`             | 1 464      |
| `100!` ; `200!`                                          | 158 ; 375  | `1.5^2000`             | 1 559      |
| `2^1000`                                                 | 302        | `1000*(1+0.03/12)^360` | 1 873      |
| `(1+1/100)^100`                                          | 403        | `(1+1/1000)^1000`      | 6 003      |
| `1000!`, `\binom{1000}{500}` : **déjà gardés** (`1000!`) | —          | `2^100000`             | 30 103     |

Précédent : la factorielle garde déjà son écriture quand elle est trop grande (`1000!` reste
`1000!` en mode exact) — mais son mode décimal répond une erreur (« result too large to stay
exact ») au lieu de ≈ 4,0239 × 10²⁵⁶⁷.

## Diagnostic

1. On **calcule et affiche des résultats exacts illisibles** : au-delà de quelques centaines de
   chiffres, une fraction n'apprend rien à l'élève, et son calcul fige la page.
2. Le pgcd d'Euclide est quadratique (accélérable ×4,6, pas plus).
3. La console fait plusieurs fois le même calcul (exact ×2, arrondi ×2, `tidy` ×2).

## Question à David — le résultat exact trop long (produit)

| Option                                  | Ce que voit l'élève pour `(1+1/1000)^1000`                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **A (recommandée)** — garder l'écriture | mode exact : `(1+1/1000)^{1000}` tel que tapé, + bouton ≈ 2,7169 ; mode décimal : ≈ 2,7169 — comme `1000!` aujourd'hui |
| B — tout afficher                       | 6 003 caractères ; plus rapide avec Lehmer, mais `n = 100 000` reste bloqué                                            |
| C — tronquer                            | « 2716923932… (3 001 chiffres) / 1000… » : il faut quand même tout calculer                                            |

**Seuil proposé : 1 000 caractères** — `2^1000`, `200!`, `(1+1/100)^100` restent écrits en
entier ; les intérêts composés, `1.01^365`, `1.5^2000`, `(1+1/1000)^1000`, `2^100000` gardent leur
écriture. La taille se **prévoit avant de calculer** (une puissance de base a/b et d'exposant k fait
environ k × (chiffres de a + chiffres de b)), sinon le garde-fou arriverait après le blocage.

## Comportements attendus (si A)

| Saisie                  | Mode exact                    | Bouton ≈ / mode décimal            | Temps                            |
| ----------------------- | ----------------------------- | ---------------------------------- | -------------------------------- |
| `2^1000` ; `200!`       | inchangé (en entier)          | inchangé                           | inchangé                         |
| `(1+1/100)^100`         | inchangé (fraction, 403 car.) | ≈ 2,7048                           | inchangé                         |
| `1.01^365`              | `1.01^{365}`                  | ≈ 37,7834                          | < 1 s (test)                     |
| `1000*(1+0.03/12)^360`  | `1000 × (1+0.03/12)^{360}`    | ≈ 2456,8422                        | < 1 s                            |
| `(1+1/1000)^1000`       | `(1+1/1000)^{1000}`           | ≈ 2,7169                           | < 1 s                            |
| `(1+1/10000)^10000`     | `(1+1/10000)^{10000}`         | ≈ 2,7181                           | **< 1 s** (13 s)                 |
| `(1+1/100000)^100000`   | `(1+1/100000)^{100000}`       | ≈ 2,7183                           | **< 1 s** (bloqué)               |
| `1.5^2000`              | `1.5^{2000}`                  | ≈ 1,5224 × 10³⁵²                   | < 1 s                            |
| `2^100000`              | `2^{100000}`                  | ≈ 9,9900 × 10³⁰¹⁰²                 | < 1 s                            |
| `1000!`                 | `1000!` (inchangé)            | ≈ 4,0239 × 10²⁵⁶⁷ (était : erreur) | < 1 s                            |
| `.variations e^{-2x^2}` | inchangé                      | inchangé                           | inchangé (non-régression, 16 ms) |

Une note sous la ligne dit pourquoi : « Valeur exacte trop longue (environ 3 000 chiffres) : voici
sa valeur approchée. »

## Comment (si A)

- **Garde-fou de taille dans la console** : avant le calcul exact, une estimation de la taille du
  résultat (puissances à base numérique, factorielles, coefficients binomiaux) ; au-delà du seuil,
  le mode exact garde l'écriture tapée — rien n'est développé, rien ne bloque.
- **La valeur approchée d'une écriture gardée** se calcule sur l'expression (`evaluateToRational`) :
  le plafond des puissances exactes passe de « exposant ≤ 1000 » à « exposant ≤ 1000 **ou** résultat
  ≤ 100 000 bits » (puissance native, sans pgcd) — `1.5^2000` exact ; e et π (fractions de
  16 chiffres) gardent la limite d'aujourd'hui, donc pas de retour de la lenteur de
  `.variations e^{-2x^2}`. Au-delà, le flottant (`Math.pow(1.00001, 100000)` = 2,71826…). Même budget
  pour la factorielle et le coefficient binomial (1000! = 8 530 bits).
- **Ne plus calculer en double** : le calcul exact une seule fois (le test du booléen réutilise le
  résultat), la lecture de l'arrondi une seule fois (ligne et bouton ≈).
- **Pas de pgcd de Lehmer dans ce lot** : une fois le garde-fou posé, la console ne manipule plus
  de fractions géantes ; gain mesuré ×4,6, gardé en réserve si un autre chemin le demande.

## Tests (écrits avant le code, rouges sur `main`)

- Console (`cli/web/__tests__/`) : chaque ligne du tableau — texte du mode exact, bouton ≈, mode
  décimal — et le temps (< 1 s) pour les lignes marquées.
- Estimation de taille : bornes du seuil (999 / 1 001 caractères), puissance, factorielle, produit.
- Non-régression : `.variations`/`.signe` identiques à `main` (comparaison de sorties, comme #1155),
  suites `atelier`, `cli`, `eval`.
- Revue `code-reviewer` en fin de lot.

## Journal

- 2026-10-12 — mesures et phase 0 (ci-dessus). En attente de la décision de David (A, B ou C, et le
  seuil).
- 2026-10-12 — **David : « je suis tes reco »** (option A, seuil 1 000 caractères). Codé sur
  `perf/grandes-fractions` : `cli/exact-size.ts` (taille prévue : puissance, factorielle, coefficient
  binomial ; jamais pour une comparaison) ; console : écriture gardée (`exactTooLong`, texte écrit
  comme tapé — une division tapée `1/1000`, en ligne, s'écrivait `1:/1000`), calcul exact une fois
  (le booléen le réutilise), arrondi lu une fois ; `render.ts` ne la passe pas à `tidy` ; note dans
  Calcul (espace fine insécable dans « 6 000 ») ; budget de taille dans `evaluateNodeToRational`
  seulement (le calcul décimal général garde ses bornes, dont la factorielle en `number` exact).
  Tests rouges d'abord (13 échecs pour la bonne raison ; `(1+1/100000)^100000` exclu du passage rouge,
  il bloque — mesuré > 200 s). Mesuré après : `(1+1/10000)^10000` et `(1+1/100000)^100000` ≈ 1 ms.
  Comparaison de la console avant/après sur 46 saisies × 2 modes : seuls `1000!` et
  `\binom{1000}{500}` changent (valeur approchée au lieu d'une erreur). Écart de forme : à l'écran,
  la division tapée `/` reste en ligne (`\left( 1 + 1 / 1000 \right)^{1000}`), comme ailleurs dans
  Calcul.
- 2026-10-12 — revue `code-reviewer` : rien de bloquant. **Corrigé** : les fonctions de
  l'utilisateur échappaient au garde-fou (`.def u(n) = (1+1/n)^n` : `u(6000)` 2 s, `u(100000)` figeait
  la page) — l'estimation se fait désormais sur les fonctions développées ; une écriture gardée sans
  aucune valeur est une erreur (`(1/0)^{2000}` réussissait) ; `f(2^{5000})` avec `f(x) = x > 2`
  redonne `true` ; test du bouton « valeur exacte » en mode décimal. **Laissés (mineurs, mesurés)** :
  une base irrationnelle échappe au seuil sans figer (`\sqrt{2}^{100000}` : 15 052 caractères en
  1 ms) ; faux positifs rares où l'estimation additionne avant simplification
  (`10^{600}×10^{-598}` garde son écriture, note « environ 1 200 chiffres ») ; sommes de grandes
  puissances chacune dans le budget (≈ 0,9 s, pas un cas d'élève).
- 2026-10-12 — **David : « Corrige les défauts »** (les trois mineurs ci-dessus). Branche
  `fix/grandes-fractions-mineurs`. Mesuré d'abord : le calcul exact reste rapide jusqu'à ~20 000
  caractères (107 ms au pire, `\sqrt{3}^{100000}/2^{30000}`) — c'étaient l'arrondi et `tidy` qui
  coûtaient. Donc : la prévision ne sert plus qu'au **plafond de calcul** (20 000 caractères
  prévus) ; en deçà, la règle des 1 000 caractères se lit sur la **longueur réelle**
  (`exactCharacters` ; une factorielle gardée par le moteur compte par sa valeur). Corrige
  `\sqrt{2}^{100000}`, `(1+\sqrt{2})^{3000}`, `(\sqrt{2}/3)^{2000}` (écriture gardée), et les faux
  positifs `10^{600}×10^{-598}`, `1000!/999!`. Sommes : la somme de 5 fractions de ~9 000 chiffres
  prenait **4,1 s** (pire que les 0,9 s notés : le temps croît avec le nombre de termes) — pgcd
  de **Lehmer** dans `gcd` (979 ms) + opérations de **Henrici** dans `evaluateToRational`
  (`addReduced`…, fractions réduites seulement) : **71 ms**. Comparaison avant/après sur 69
  saisies × 2 modes : seuls les cas visés changent ; aucune saisie ne ralentit. Reste connu : la
  prévision n'est pas une borne pour une somme de fractions (13 735 prévus, 25 523 réels, calculé
  en 124 ms) ; au-delà de 20 000 prévus, un faux positif reste possible (`10^{6000}×10^{-5998}`).
- 2026-10-12 — revue `code-reviewer` : rien de bloquant (Lehmer et Henrici égaux à la référence
  sur des milliers de paires ; contrat « réduit » vérifié source par source). **Corrigé** : seuil
  du test du pgcd à 1 200 ms (357 ms mesurés, marge CI) ; deux contournements du plafond —
  base irrationnelle (`\sqrt{2}^{40000000}` 2,6 s, `(1+\sqrt{2})^{10000000}` 3,9 s ; prévue
  désormais par sa hauteur) et exposant hors des entiers sûrs (`2^{2^{100}}` 2,4 s puis
  « Maximum BigInt size exceeded ») : « Valeur hors d'échelle » immédiat. **Laissés** : contrat
  « réduit » tenu par un commentaire (garde en test jugée coûteuse) ; mesure sur `toCustom` et non
  sur l'écriture mise au propre (quelques caractères au seuil) ; `1000!/999!` s'écrit
  `factorial(1000)/factorial(999)` en mode exact (antérieur, le moteur garde les factorielles).
- 2026-10-12 — **David : « corrige ce faux positif `10^6000 × 10^-5998` »**. Erreur de mon
  compte rendu : ce cas répondait déjà 100 (12 000 prévus, sous le plafond) ; le vrai faux positif
  est `10^{60000}/10^{59990}`. Premier essai (prévision compensée dans le plafond) refusé par la
  revue : le moteur calcule chaque puissance AVANT de compenser —
  `(1+1/100000)^{100000}×(1+1/100000)^{-100000}` = 1 prenait 305 s, `2^{100000000}×2^{-99999999}`
  19 s. Retenu : le plafond garde la taille non compensée ; au-delà, un produit ou quotient de
  puissances de bases rationnelles courtes se calcule sur ses facteurs (`productValue` : bases
  décomposées sur les premiers < 1 000, exposants entiers sûrs additionnés, signe suivi, valeur
  compensée bornée à 20 000 caractères). Tous ces cas répondent en moins de 300 ms ; la note
  compte la taille compensée.
- 2026-10-12 — #1184 mergée. Seconde revue : bloquant levé (les cas lents en ≤ 6 ms, signes
  justes). **Ouvert, hors de ce lot** : une **comparaison** échappe au plafond
  (`isTooLongToCompute` rend `false` pour une relation) — `2^{30000000}/2^{29999999} = 2` prend
  3,5 s, `(1+1/20000)^{20000}×(1+1/20000)^{-20000} = 1` prend 10 s. Mineurs (exotiques, comme
  avant) : deux restes > 1 000 qui partagent un facteur ne se compensent pas
  (`1022117^{2000}/(1009×1013)^{2000}` = 1 garde son écriture) ; un facteur 0 abandonne la
  décomposition (`0×2^{100000}` garde son écriture, note de 30 105 caractères).
- 2026-10-12 — **David : « Oui »** (corriger les comparaisons hors plafond). Mesuré : les
  puissances ENTIÈRES se comparent vite (`2^{100000} > 3^{60000}` : 19 ms — un refus aurait été une
  régression) ; ce sont les puissances de fractions et de décimaux qui coûtent (`1.0001^{30000} >
20` 16,7 s, `(1+1/20000)^{20000} > 2` 8,8 s). `cli/bounded-comparison.ts` : un membre au-delà
  du plafond prend sa valeur exacte s'il est un produit de puissances (`productValue`), sinon la
  relation (`= < > ≤ ≥`) se tranche sur les valeurs arrondies (monotones), refus si égales. Branché
  dans l'évaluation ET dans `executeEquality` (`a = b` y suit son propre chemin). Les chaînes
  (`1 < x < 3`) ne sont pas prises en charge par la console (antérieur) ; `a != b` se lit
  `a! = b` (antérieur).
- 2026-10-12 — revue de #1199 : **sens faux** (bloquant) — comparer les arrondis supposait leur
  ordre préservé, faux entre 10⁹ et 10¹⁵ (`(1+1/20000)^{20000} + 10^9 > 10^9 + 1` → `false`).
  Corrigé : intervalles (demi-pas + 10⁻¹² ; point seulement pour un membre calculé exactement),
  refus s'ils se recouvrent ; message propre quand une variable libre bloque. Laissés (refus non
  faux, pas des cas d'élèves) : `2^{100000} + 1 > 2^{100000}` (« trop proches »),
  `2^{10^7} + 1 > 3` (« trop grande »).
- 2026-10-12 — 2ᵉ revue de #1199 : encore un **sens faux** — un membre lu par le flottant puis
  presque annulé (`(1+1/20000)^{20000}×10^{16} − 27182138745278831 < 0` → `false`) : une marge
  relative sur la valeur arrondie ne borne pas l'erreur absolue d'une soustraction. Corrigé
  autrement : `cli/interval.ts`, encadrements rigoureux (binaires à 256 bits arrondis vers
  l'extérieur ; test de rigueur aléatoire, rouge si l'arrondi vers le haut est faussé). Au
  passage, la revue s'était trompée sur un cas (`(1+1/20000)^{20000} + 10^{14} > 10^{14} + 3` est
  FAUX) : l'encadrement l'a tranché juste.
- 2026-10-12 — #1199 mergée. **David : « corrige ces limites »** (deux limites antérieures de la
  console) : `2 != 3` passait au parseur LaTeX (`factorial(2) = 3` → `false`) — `!=` désigne
  désormais la syntaxe maison dans `input-detector.ts` ; les chaînes `1 < x < 3` sont évaluées
  maillon par maillon (`evaluateToBoolean`) et passent par le plafond (`boundedComparison` les
  change en « et » de maillons : `1 < 1.0001^{30000} < 30` prenait 26,6 s).
  Revue : `!=` restait une factorielle avec du LaTeX autour (`\frac{1}{2} != 3` → false) — la
  règle est désormais une réécriture `!=` → `\ne` avant le parseur LaTeX (le motif du détecteur
  est retiré) ; une chaîne avec un `=` (`1 < 2 = 2`, `2 = 2 = 2`) partait dans
  `executeEquality` — lue en entier désormais.
- 2026-10-12 — #1203 mergée. **David : « ok corrige ça »** (`!==`, `not`/`and`, message anglais) :
  `withLogicOperators` (pipeline de la console) réécrit `&& || ! and or not et ou non == === !=
!==` dans la notation de chaque parseur ; `evaluateToBoolean` traverse les parenthèses
  (`\lnot (2 > 1)`) ; message français pour une relation non tranchée (≈, ∈…) ; préfixe des
  erreurs de la console « Erreur de calcul : ».
- 2026-10-12 — #1210 mergée. **David : « corrige les défauts »** : `not 2 > 1` se lit non(2 > 1)
  (le « non » sans parenthèses enveloppe la comparaison jusqu'au prochain et/ou) ; `||` n'est un
  « ou » que s'il y a une comparaison et hors d'une valeur absolue (`| 2 || 3 |`, `|2| || |3|`) ;
  messages « pas de valeur numérique » en français ; `.def` ne dérive plus une définition
  booléenne (avertissement anglais).
- 2026-10-12 — #1216 mergée. **David : « ok continue »** : messages d'erreur de la console en
  français, traduits à sa sortie (`cli/web/french-errors.ts`) — table des fréquents + formule
  générique ; golden des statistiques et un test de `.diff` mis à jour (anglais figé).
