---
title: Grandeurs — phase 0 des lots A (calculer juste) et B (afficher depuis l'arbre)
date: 2026-10-11
status: phase 0 — en attente de validation de David
---

# Grandeurs — phase 0 des lots A et B

Analyse et décisions : [grandeurs-analyse.md](grandeurs-analyse.md) (David, 2026-10-11 : « je suis
tes recos »). Ces deux lots ne changent **aucune écriture** : on tape toujours `5[km]` ou
`5\unit{km}` ; l'écriture naturelle `5 km` est le lot C.

**Principe** : Calcul et `/cas` calculent une grandeur comme `{{eval}}` — par `tidy`, **unité
écrite d'abord** — et la réponse garde son unité jusqu'à l'écran.

## Lot A — calculer juste (Calcul, `/cas`, même moteur)

### Résultats

| Saisie (mode exact)                                 | Attendu                                     | Aujourd'hui                    |
| --------------------------------------------------- | ------------------------------------------- | ------------------------------ |
| `10[km]/1[h]`                                       | 10 km/h                                     | 10 m/s                         |
| `7[mm]*5[mm]` ; `7[mm]*5[cm]`                       | 35 mm² ; 350 mm²                            | 35 m² ; 350 m²                 |
| `90[km/h]*2[h]`                                     | 180 km                                      | 180 m                          |
| `100[g]/2[L]`                                       | 50 g/L                                      | 50 g/m³                        |
| `12[km]+300[m]`                                     | 12,3 km                                     | 123/10 km                      |
| `3[h]+20[min]`                                      | 200 min                                     | 33333333333333333/1…0 h        |
| `3[h]/1[min]` ; `10[km]/2[m]`                       | 180 ; 5000 (un nombre, sans unité)          | fractions géantes, unité « 1 » |
| `9.81[m/s^2]*2[kg]`                                 | 19,62 kg·m/s² (l'unité écrite)              | 981/50 m·g/s²                  |
| `d = 5[km]`, `t = 2[h]`, `d/t` ; `v*3[h]` (v = d/t) | 2,5 km/h ; 7,5 km                           | 5/2 m/s ; 15/2 m               |
| `10[km]/3` ; `(3[h]+20[min])*1[km/h]`               | 10/3 km, et le bouton ≈ donne `≈ 3,3333 km` | 10/3 km ; 3,33… m              |
| `sqrt(9[m^2])` ; `(3[m])^2`                         | 3 m ; 9 m²                                  | inchangé                       |
| `30[°C]-20[°C]` ; `20[°C]+5[K]`                     | 10 K ; 25 °C                                | inchangé                       |
| `5[€]*3` ; `2.5[km]*4`                              | 15 € ; 10 km                                | inchangé                       |

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

| Ligne de Calcul        | Attendu à l'écran                                    | Aujourd'hui            |
| ---------------------- | ---------------------------------------------------- | ---------------------- |
| `5[km]` ; `5\unit{km}` | 5 km (unité droite, pas en italique)                 | 5                      |
| `90[km/h]` ; `20[°C]`  | 90 km/h ; 20 °C                                      | 90 ; 20                |
| `10[km]/3`             | fraction empilée 10/3, puis km                       | 10/3 km                |
| `π/3` ; `arcsin(1)`    | fraction empilée ⅓ π ; ½ π (comme `.simplifier π/3`) | 1/3π ; 1/2π (en ligne) |
| `\sqrt{2}/2`           | inchangé (½ √2)                                      | ½ √2                   |

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
