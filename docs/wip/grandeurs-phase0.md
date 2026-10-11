---
title: Grandeurs — phase 0 des lots A (calculer juste) et B (afficher depuis l'arbre)
date: 2026-10-11
status: phase 0 validée par David le 2026-10-11 (avec deux ajouts : unité dérivée nommée, tidy sur tous les résultats)
---

# Grandeurs — phase 0 des lots A et B

Analyse et décisions : [grandeurs-analyse.md](grandeurs-analyse.md) (David, 2026-10-11 : « je suis
tes recos »). Ces deux lots ne changent **aucune écriture** : on tape toujours `5[km]` ou
`5\unit{km}` ; l'écriture naturelle `5 km` est le lot C.

**Principe** : Calcul et `/cas` calculent une grandeur comme `{{eval}}` — par `tidy`, **unité
écrite d'abord** — et la réponse garde son unité jusqu'à l'écran.

## Lot A — calculer juste (Calcul, `/cas`, même moteur)

### Résultats

| Saisie (mode exact)                                 | Attendu                                                               | Aujourd'hui                    |
| --------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| `10[km]/1[h]`                                       | 10 km/h                                                               | 10 m/s                         |
| `7[mm]*5[mm]` ; `7[mm]*5[cm]`                       | 35 mm² ; 350 mm²                                                      | 35 m² ; 350 m²                 |
| `90[km/h]*2[h]`                                     | 180 km                                                                | 180 m                          |
| `100[g]/2[L]`                                       | 50 g/L                                                                | 50 g/m³                        |
| `12[km]+300[m]`                                     | 12,3 km                                                               | 123/10 km                      |
| `3[h]+20[min]`                                      | 200 min                                                               | 33333333333333333/1…0 h        |
| `3[h]/1[min]` ; `10[km]/2[m]`                       | 180 ; 5000 (un nombre, sans unité)                                    | fractions géantes, unité « 1 » |
| `9.81[m/s^2]*2[kg]`                                 | 19,62 kg·m/s² = 19,62 N (l'unité écrite, puis l'unité dérivée nommée) | 981/50 m·g/s²                  |
| `d = 5[km]`, `t = 2[h]`, `d/t` ; `v*3[h]` (v = d/t) | 2,5 km/h ; 7,5 km                                                     | 5/2 m/s ; 15/2 m               |
| `10[km]/3` ; `(3[h]+20[min])*1[km/h]`               | 10/3 km, et le bouton ≈ donne `≈ 3,3333 km`                           | 10/3 km ; 3,33… m              |
| `sqrt(9[m^2])` ; `(3[m])^2`                         | 3 m ; 9 m²                                                            | inchangé                       |
| `30[°C]-20[°C]` ; `20[°C]+5[K]`                     | 10 K ; 25 °C                                                          | inchangé                       |
| `5[€]*3` ; `2.5[km]*4`                              | 15 € ; 10 km                                                          | inchangé                       |

### Erreurs, en français

| Saisie        | Attendu                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `5[m]+3[s]`   | « On ne peut pas ajouter une longueur et une durée. »                    |
| `5[m]+3`      | « On ne peut pas ajouter une longueur et un nombre sans unité. »         |
| `2[kg]+3[cm]` | « On ne peut pas ajouter une masse et une longueur. »                    |
| `20[°C]*2`    | « Une température en °C ne se multiplie pas : écris-la en kelvins (K). » |

### `.convertir`

| Après            | Saisie           | Attendu                                                                                             |
| ---------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `12[km]+300[m]`  | `.convertir m`   | `12,3 km = 12300 m` (une ligne, en mathématiques)                                                   |
| `d/t` (2,5 km/h) | `.convertir m/s` | `2,5 km/h = 25/36 m/s`, bouton ≈ `≈ 0,6944 m/s`                                                     |
| `1[km]`          | `.convertir kg`  | « On ne peut pas convertir des km en kg : ce ne sont pas les mêmes grandeurs. »                     |
| un nombre        | `.convertir m`   | « Il n'y a pas de grandeur à convertir : calcule d'abord une grandeur, par exemple 12[km]+300[m]. » |

### `.mode décimal` (décision Q3)

| Saisie          | Attendu     | Aujourd'hui             |
| --------------- | ----------- | ----------------------- |
| `12[km]+300[m]` | 12,3 km     | ≈ 12,3 km               |
| `10[km]/3`      | ≈ 3,3333 km | ≈ 3,3333333333333335 km |

La règle des nombres sans unité (`.mode décimal` écrit encore 15 chiffres) reste la PR à part
déjà décidée.

### Ce qui disparaît, ce qui ne bouge pas

- `.mode-unités` (first / si / best, sous `.aide dev`) : retirée du moteur et du catalogue ;
  tapée, elle reçoit le refus d'une commande inconnue.
- `evaluateWithUnits` : retiré une fois Calcul passé (seul usage réel).
- **Inchangés** (non-régression) : `{{eval}}` et les questions, les calculs sans unité, le grapheur.

## Lot B — afficher depuis l'arbre

| Ligne de Calcul                 | Attendu à l'écran                     | Aujourd'hui                     |
| ------------------------------- | ------------------------------------- | ------------------------------- |
| `5[km]` ; `5\unit{km}`          | 5 km (unité droite, pas en italique)  | 5                               |
| `90[km/h]` ; `20[°C]`           | 90 km/h ; 20 °C                       | 90 ; 20                         |
| `10[km]/3`                      | fraction empilée 10/3, puis km        | 10/3 km                         |
| `π/3` ; `2π/3` ; `arcsin(1)`    | π/3 ; 2π/3 ; π/2 (fractions empilées) | 1/3π ; 2/3π ; 1/2π (en ligne)   |
| `\sqrt{2}/2` ; `π^2/6` ; `3x/4` | √2/2 ; π²/6 ; 3x/4 (empilée)          | ½ √2 ; ⅙ π² ; 3x / 4 (en ligne) |

- **Ajout validé (2026-10-11)** : tout résultat de calcul de Calcul passe par `tidy` (la mise au
  propre de mathAST, déjà utilisée par les corrections et la carte f′) avant d'être écrit —
  `evaluate` rend une forme de calcul (« coefficient × π »), `tidy` la forme de lecture.
- **Ajout validé (2026-10-11)** : une grandeur dont l'unité écrite correspond à une unité dérivée
  nommée (N, J, W, Pa, V…) montre les deux : `19,62 kg·m/s² = 19,62 N`.
- Plus aucune heuristique sur le texte du moteur : une réponse s'écrit **depuis l'arbre**, et
  les unités par la traduction des énoncés (`displayUnitsInLatex`) ; virgule décimale comme
  ailleurs.
- **« Garder… »** sur une grandeur crée une valeur grandeur (`12,3 km` → `a = 12.3[km]`, carte
  avec son unité) ; aujourd'hui l'unité est perdue.
- **Bouton ≈ (#1086)** : aussi sur les grandeurs dont la valeur n'est pas décimale
  (`10/3 km` → `≈ 3,3333 km`) ; rien sur `12,3 km`.

## Tests (écrits avant le code, rouges sur `main`)

- Oracle « grandeurs dans Calcul » : chaque ligne des tableaux ci-dessus, par `runInput` (texte et
  rendu LaTeX), dans les deux sens (aujourd'hui faux → juste).
- Vue (navigateur) : `5[km]` affiche « km » ; `π/3` affiche une fraction empilée.
- Non-régression : suites `eval` (`{{eval}}`), `tidy`, `units`, `atelier`, `cli`.

## Découpage

Une PR par lot : **A** (moteur, `.convertir`, erreurs, `.mode décimal` des grandeurs, retrait de
`.mode-unités` et `evaluateWithUnits`), puis **B** (affichage, « Garder », bouton ≈).

## Journal

- 2026-10-11 — lot A codé sur `feat/grandeurs-calcul` : `mathAST/cli/quantities.ts`
  (`computeQuantity`, `convertQuantity`) branché dans `WebReplEngine` ; `evaluateWithUnits` et
  `.unitmode` retirés (et leurs tests) ; code d'erreur `QUANTITY_ERROR` (refus en français dans
  l'atelier) ; `render.ts` traduit les unités de l'arbre (`displayUnitsInLatex`) — sans quoi
  l'arbre muni de son unité aurait affiché `\unit` en rouge. `sqrt(9[m^2])` : `tidy` ne réduit
  pas la racine, repli sur la forme normale (`denormalize(normalize(…))`).
- 2026-10-11 — revue `code-reviewer` du lot A, corrigés : une racine de grandeur prise dans un
  produit restait non calculée (`sqrt(9[km^2])/1[h]`) ; racine, valeur absolue, fonction d'un
  angle, comparaison passent par un **repli exact** (chaque grandeur ramenée à ses unités de base,
  coefficient exact, π compris) ; **règle d'unité** : une unité tapée par l'élève (seule, en
  puissance, ou deux combinées) quand la valeur y tombe juste (`3[kW]*2[h]` → `6 kW.h = 21600000 J`,
  `sqrt(9[km^2])` → `3 km`), sinon celle de `tidy` (`7[h]/3` → `140 min`), sinon l'écriture la plus
  courte ; `.convertir` des températures (`20 °C = 293.15 K`) et des angles (`180 ° = π rad`) ;
  bouton ≈ et bascule de `/cas` rétablis ; `≈` dans l'arbre en mode décimal ; noms de dimensions
  (force, énergie, puissance, masse volumique…) ; analyse dimensionnelle : l'indice d'une racine
  (`\sqrt[3]{…}`) n'était pas lu (m^1,5 pour une racine cubique de km³).
- 2026-10-11 — lot A mergé (#1099). Lot B codé sur `feat/grandeurs-affichage` : `render.ts` écrit un
  calcul depuis l'arbre passé par `tidy` (π/3, √2/2, π²/6), sauf s'il porte un décimal (mode
  décimal : `tidy` aurait écrit 3/10 pour 0,3 — mesuré) ; l'heuristique de l'antislash ne sert
  plus qu'aux commandes. « Garder » une grandeur gardait déjà son unité depuis le lot A (test).
- 2026-10-11 — revue du lot B : DÉCISION DE DAVID (« ok pour A ») — `tidy` seulement pour un résultat
  SANS variable libre (π, √, e, ln) : `x/x` n'est pas simplifié en 1, `3-2x+x^2` garde son ordre,
  `3x/4` reste en ligne comme avant (la ligne `3x/4` empilée de la phase 0 est abandonnée). Corrigé :
  le bouton « Valeur exacte » en mode décimal écrivait ⅓ π.
- 2026-10-11 — points mis de côté réglés sur `fix/calcul-mode-decimal` : `.mode décimal` des nombres
  suit la règle du bouton ≈ (4 décimales, `≈` à l'écran seulement si arrondi ; hors de l'échelle
  ≥ 10⁹ ou < 10⁻⁶, la valeur décimale du moteur, sans `≈` devant un entier exact — revue) ; le TEXTE
  d'un résultat exact est mis au propre par `tidy` (`\pi/3`, plus `{1/3}\pi` — dans `/cas` et l'export
  de Calcul ; l'écran de Calcul l'était depuis le lot B).
