---
title: Mode décimal — conversion des grandes fractions et règle d'écriture unique
date: 2026-10-11
status: reco 1 en cours (`fix/conversion-rationnel`) ; reco 2 en attente des décisions a, b, c de David
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

## Reco 1 — conversion robuste (validée : « oui », 2026-10-11)

- `rationalToNumber` : cas ordinaire inchangé ; si le quotient n'est pas fini (ou vaut 0 pour
  n ≠ 0), quotient entier sur 64 bits puis mise à l'échelle par puissances de 2. Un vrai
  débordement reste Infinity / 0.
- `cli/approximation.ts` et `algebraicToNumber` passent par elle (conversions écrites à la main).
- Contrat documenté : commentaire d'`evaluateToRational`, invariant 10 de
  `docs/systeme/mathast/README.md`.
- Tests rouges d'abord (25 échecs pour la bonne raison : NaN, Infinity, 0, null) :
  `normal/__tests__/rational-to-number.test.ts`, `eval/__tests__/grandes-fractions.test.ts`,
  `cli/__tests__/approximation.test.ts`, `cli/web/__tests__/mode-decimal.test.ts`.

## Reco 2 — une seule règle d'écriture (décisions de David attendues)

`approximateDigitsOf` ne refuse plus aucun réel fini ; le repli sur le flottant brut est retiré
de la console. Questions :

| Question                               | Proposition                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| a. Écriture scientifique               | `≈ 8,7700 × 10⁹`, `≈ 1,4286 × 10⁻⁷` (4 décimales sur la mantisse)                                   |
| b. Entier exact de plus de 10 chiffres | en entier avec `=` jusqu'à 15 chiffres (2⁴⁰) ; au-delà `≈ 1,8447 × 10¹⁹` ; le mode exact garde tout |
| c. Seuils de bascule                   | garder 10⁹ et 10⁻⁶                                                                                  |

## Plus tard (questions, pas des recos)

- Mode exact : `(1+1/1000)^1000` affiche une fraction de 3001 chiffres.
- Avertissement pour `1e-7` (lu e − 7, e = Euler).

## Journal

- 2026-10-11 — reco 1 codée sur `fix/conversion-rationnel` ; suite mathAST verte (472 fichiers).
