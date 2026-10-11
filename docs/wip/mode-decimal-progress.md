---
title: Mode décimal — conversion des grandes fractions et règle d'écriture unique
date: 2026-10-11
status: reco 1 livrée (#1138) ; reco 2 sur `feat/mode-decimal-scientifique` (PR) ; lot « lenteur des grandes fractions » à ouvrir (décision de David)
---

# Mode décimal — progression

Analyse faite avec David le 2026-10-11 (Calcul, `.mode décimal`, bouton ≈). Le diagnostic :
**deux problèmes distincts, et un faux problème.**

1. **La conversion fraction → flottant déborde.** `evaluateToRational` calcule en fractions
   BigInt exactes ; `rationalToNumber` faisait `Number(n) / Number(d)`, qui rend NaN ou Infinity
   dès que les termes dépassent 10³⁰⁸ — même pour une valeur ordinaire. Mesuré (console, mode
   décimal → `≈ NaN`, bouton ≈ → rien) : `(1+1/1000)^1000` (3001 chiffres, vaut 2,7169),
   `1000*(1+0.03/12)^360` (intérêts composés, 2456,8422), `1.01^365`, `0.99^365`, `π^20`, `e^30`.
   Ce sont surtout des **rationnels** : basculer les transcendants en flottant n'aurait rien réparé.
2. **Deux règles d'écriture en mode décimal.** `approximateDigitsOf` (4 décimales, `=`/`≈`)
   refuse hors de [10⁻⁶ ; 10⁹[ ; la console retombe alors sur le flottant brut d'`evaluate`
   (15 chiffres, `e+30`). Bug silencieux : `2^64` en mode décimal s'écrit `18446744073709552000`
   (chiffres faux) sans `≈`.
3. **Faux problème : les transcendants rangés en fractions** (π = 3141592653589793/10¹⁵). Précision
   du flottant d'origine, coût négligeable (π²⁰ : 0,2 ms ; pire cas mesuré 12 ms), et un avantage :
   `(10^20+π)-10^20` donne π (0 en flottant). Décision : **ne pas toucher `evaluateToRational`**,
   documenter son contrat.

## Reco 1 — conversion robuste (validée : « oui », 2026-10-11 ; livrée #1138)

- `rationalToNumber` : cas ordinaire inchangé ; si le quotient n'est pas fini (ou vaut 0 pour
  n ≠ 0), quotient entier sur 64 bits puis mise à l'échelle par puissances de 2. Un vrai
  débordement reste Infinity / 0.
- `cli/approximation.ts` et `algebraicToNumber` passent par elle (conversions écrites à la main).
- Contrat documenté : commentaire d'`evaluateToRational`, invariant 10 de
  `docs/systeme/mathast/README.md`.
- Tests rouges d'abord (25 échecs pour la bonne raison : NaN, Infinity, 0, null) :
  `normal/__tests__/rational-to-number.test.ts`, `eval/__tests__/grandes-fractions.test.ts`,
  `cli/__tests__/approximation.test.ts`, `cli/web/__tests__/mode-decimal.test.ts`.

## Reco 2 — une seule règle d'écriture : phase 0

**Décisions de David (« je valide a, b, c et d », 2026-10-12)** :

- **a.** Hors de l'échelle, la notation scientifique du collège, 4 décimales sur la mantisse
  (zéros gardés si c'est arrondi, retirés si c'est exact) : `≈ 8,7700 × 10⁹`.
- **b.** Un entier exact s'écrit en entier, sans `≈`, jusqu'à 15 chiffres ; au-delà, notation
  scientifique. Le mode exact garde tous les chiffres.
- **c.** Seuils inchangés : notation scientifique à partir de 10⁹ et sous 10⁻⁶ ; entre 10⁻⁶ et
  10⁻⁴, 4 chiffres significatifs (comme aujourd'hui).
- **d.** Les puissances entières exactes au-delà de 1000 : plafond monté à 10 000, et plus jamais
  « = 0 » ni erreur pour une valeur qui sort du flottant.

**Principe** : `approximateDigitsOf` ne refuse plus aucun réel fini, et son écriture se calcule
**sur la fraction exacte** (mantisse et exposant en BigInt), jamais sur un flottant. La console
n'a plus de repli sur le flottant brut (`toString()` : 15 chiffres, `e+30`, chiffres faux).

### Mode décimal de Calcul (et bouton ≈ en mode exact)

Valeurs attendues calculées sur les fractions exactes (Python `Fraction`), indépendamment du code.

| Saisie                   | Aujourd'hui (mesuré 2026-10-12)                           | Attendu                         | Règle                       |
| ------------------------ | --------------------------------------------------------- | ------------------------------- | --------------------------- |
| `π^20`                   | ≈ 8769956796.08269 ; bouton : —                           | ≈ 8,7700 × 10⁹                  | a                           |
| `-π^20`                  | ≈ -8769956796.08269                                       | ≈ -8,7700 × 10⁹                 | a, signe                    |
| `e^30`                   | ≈ 10686474581524.4                                        | ≈ 1,0686 × 10¹³                 | a                           |
| `e^1000`                 | ≈ Infinity (1,2 s)                                        | ≈ 1,9701 × 10⁴³⁴                | a, d                        |
| `1/7000000`              | ≈ 1.42857142857143e-7                                     | ≈ 1,4286 × 10⁻⁷                 | a                           |
| `1/8000000`              | ≈ 1.25000000000000e-7                                     | 1,25 × 10⁻⁷ (exact)             | a : zéros retirés, pas de ≈ |
| `2^40`                   | 1099511627776                                             | 1099511627776                   | b (13 chiffres)             |
| `10^14+1`                | 100000000000001                                           | 100000000000001                 | b (15 chiffres)             |
| `10^15+1`                | 1000000000000001                                          | ≈ 1,0000 × 10¹⁵                 | b (16 chiffres)             |
| `2^64`                   | 18446744073709552000 (faux, sans ≈)                       | ≈ 1,8447 × 10¹⁹                 | b                           |
| `3*10^20`                | 300000000000000000000                                     | 3 × 10²⁰ (exact)                | b, a                        |
| `999999999.12345`        | ≈ 999999999.1235                                          | ≈ 999999999,1235                | c : inchangé sous 10⁹       |
| `0.00001234`             | 0.00001234                                                | 0,00001234                      | c : inchangé                |
| retenue : `9.99996*10^9` | —                                                         | ≈ 1,0000 × 10¹⁰                 | a (la mantisse reste < 10)  |
| `0.3^1000`               | ≈ 0.0000                                                  | ≈ 1,3221 × 10⁻⁵²³               | a, sur la fraction          |
| `0.5^2000`               | ≈ 0.0000                                                  | ≈ 8,7098 × 10⁻⁶⁰³               | a, d                        |
| `1.5^2000`               | erreur (« Cannot convert Infinity… »), même en mode exact | ≈ 1,5224 × 10³⁵²                | d                           |
| `(1+1/10000)^10000`      | ≈ 2.7181, en **14 s** (navigateur bloqué)                 | ≈ 2,7181 en moins d'une seconde | d (puissance native)        |
| `0`                      | 0                                                         | 0                               | inchangé                    |

Écritures : à l'écran `8{,}7700 \times 10^{9}` (virgule posée par la vue, comme ailleurs) ; dans
le **texte** de la console (export, `/cas`) `8.7700*10^9`, `1.4286*10^-7` — mesuré : ces textes se
relisent dans la console. Bouton ≈ en mode exact : `\approx 8.7700 \times 10^{9}` sur `π^20`
(aujourd'hui : rien).

### Grandeurs (même fonction, `decimalOf`)

| Saisie (mode décimal) | Aujourd'hui        | Attendu                 |
| --------------------- | ------------------ | ----------------------- |
| `9.4607*10^15[m]`     | 9460700000000000 m | 9,4607 × 10¹⁵ m (exact) |
| `3*10^8[m/s]*1[an]`   | 9460800000000000 m | 9,4608 × 10¹⁵ m (exact) |

### Puissances (d)

- `powRational` : la puissance d'une fraction irréductible est irréductible — calculer `nᵏ / dᵏ`
  par la puissance native de BigInt, sans réduire à chaque multiplication. Mesuré : 101¹⁰⁰⁰⁰⁰ en
  1,9 ms, contre 194 s par `powRational` aujourd'hui (3/2 puissance 10 000 : 21 ms).
- Plafond de la puissance entière exacte d'`evaluateToRational` : 1000 → 10 000.
- Mesuré aujourd'hui : `(1+1/10000)^10000` prend 14 s et `e^1000` 1,2 s dans la console — la
  réduction à chaque multiplication ; la puissance native les ramène sous la seconde (test).
- Au-delà du plafond (calcul par le flottant) : un résultat qui sort du flottant (0 pour une base
  non nulle, ±Infinity) devient une erreur claire au lieu de « = 0 » ou de « Cannot convert
  Infinity to Rational ».

### Ce qui ne change pas

- Entre 10⁻⁶ et 10⁹ : rien (4 décimales, `=`/`≈`, 4 chiffres significatifs sous 10⁻⁴).
- Le mode exact (écriture des résultats exacts, même géants : question à part, plus bas).
- Les calculs de mathAST (grapheur, géométrie, tableaux de signes…) : seule l'écriture change.

### Tests (écrits avant le code, rouges sur `main`)

- `cli/__tests__/approximation.test.ts` : chaque ligne des tableaux (texte et LaTeX), la retenue,
  le signe, l'exact sans zéros.
- `cli/web/__tests__/mode-decimal.test.ts` : la console de bout en bout, dont `2^64` et la
  relecture du texte (`8.7700*10^9` retapé redonne la valeur arrondie).
- Grandeurs : `cli/web/__tests__/grandeurs.test.ts`.
- `powRational` : même résultat qu'avant (cas existants), grands exposants sous une seconde.
- Revue `code-reviewer` en fin de lot.

## Plus tard (questions, pas des recos)

- Mode exact : `(1+1/1000)^1000` affiche une fraction de 3001 chiffres.
- Avertissement pour `1e-7` (lu e − 7, e = Euler) : mesuré, `1e-7` donne ≈ -4,2817 dans Calcul.

## Journal

- 2026-10-11 — reco 1 codée sur `fix/conversion-rationnel` ; suite serveur complète verte.
- 2026-10-11 — revue `code-reviewer` : rien de bloquant. Corrigés : la valeur dénormale (2^-shift
  d'un seul tenant sous-dépassait vers 0 — testé, le commentaire se trompait de côté) ; arrondi
  correct par bit collant (2⁵³ + 1 + ε → 2⁵³ + 2) ; tests du signe en bas et de la division par
  zéro. Les deux nouveaux tests échouent sur le code sans ces protections (mutant mesuré).
- 2026-10-12 — David valide a, b, c, d. Mesures pour la phase 0 : `1.5^2000` échoue aussi en
  mode exact (la console lève l'erreur du calcul décimal) ; dans la console, `0.5^2000` donne
  « ≈ 0.0000 » (le « = 0 » de la revue venait d'`evaluate` appelé directement) ; `powRational`
  réduit la fraction à chaque multiplication (194 s pour 1,01¹⁰⁰⁰⁰⁰, 1,9 ms en puissance native).
- 2026-10-12 — phase 0 validée (« oui »). Reco 2 codée sur `feat/mode-decimal-scientifique` :
  `approximateDigitsOf` rend `exponent` (notation scientifique en BigInt, retenue comprise),
  `approximationText` / `approximationLatex` / `approximationNode` ; console sans repli sur le
  flottant, tolérante à un échec du calcul décimal ; grandeurs ; `isScientificNotation` dans
  `render.ts` ; `powRational` natif ; plafond 10 000 ; refus « hors d'échelle ». 34 tests rouges
  d'abord, pour la bonne raison. Suite serveur complète verte **sauf un test**.
- ⚠️ 2026-10-12 — **clause de la phase 0 non tenue** : « `(1+1/10000)^10000` en moins d'une
  seconde ». La puissance native ne suffit pas : 11,7 s (14 s avant). Mesuré : 14 pgcd (Euclide)
  de nombres de 40 000 chiffres, 1 à 1,5 s chacun — la puissance du mode exact (`normalize`, par
  multiplications réduites, sans `powRational`), `tidy` (×2), la lecture de l'arrondi (×2), et la
  console évalue le mode exact deux fois. `(1+1/3000)^3000` : 0,45 s ; `(1+1/100000)^100000` :
  bloqué plus de 200 s (chemin `normalize`, non touché ici — non mesuré sur `main`). Question posée
  à David : traiter ici (pgcd plus rapide + calculs en double) ou dans un lot à part.
- 2026-10-12 — **décision de David : lot à part** pour la lenteur des grandes fractions (pgcd plus
  rapide, puissance du mode exact, calcul exact en double dans la console, garde-fou contre le
  blocage de `(1+1/100000)^100000`). Le test de lenteur de la console est retiré de cette PR ;
  celui de `powRational` reste.
- 2026-10-12 — revue `code-reviewer` de la reco 2 : notation scientifique juste (3 620 cas comparés
  à `Fraction`, 0 écart). **Bloquant** : le plafond à 10 000 figeait le navigateur
  (`.variations e^{-2x^2}` 23 ms → 5,7 s, `e^{-5000}+1` 4 ms → 71 s : e et π entrent en fractions de
  16 chiffres, puis pgcd). **Décision de David : plafond gardé à 1000** ; sa hausse passe dans le lot
  de lenteur. Mesuré : les lignes de la phase 0 restent vraies dans la console (elle lit l'arrondi
  sur le résultat exact) ; `.variations`/`.signe` (12 commandes) et 16 limites + 8 tableaux de signes
  identiques à `main`. Seul écart : `e^{-5000}+1` en mode décimal répond « Valeur hors d'échelle »
  (était `1`). Corrigés aussi : le mode exact ne dépend plus du calcul décimal (`e^{-5000}+1`
  échouait) ; « Garder » range le résultat exact quand le flottant est sorti de sa plage
  (`e^{1000}` rangeait Infinity, `10^{-400}` 0) ; pôles de tan/sec/csc/cot refusés (le bouton ≈
  montrait tan(π/2) ≈ 1,6331 × 10¹⁶) ; `0^{-π}` = division par zéro ; entre 10⁻⁶ et 10⁻⁴,
  l'exactitude se décide sur les 4 chiffres écrits (`0,0000123456` s'écrivait « = 0.00001235 ») ;
  JSDoc orphelin. Consigné : `i^2`, `(1+i)(1-i)`, `100!` en mode décimal donnent désormais une
  valeur (avant : une erreur du calcul décimal) — tests ajoutés. Six des nouveaux tests échouent
  sur le commit précédent.
