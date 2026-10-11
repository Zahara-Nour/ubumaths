---
title: Grandeurs — phase 0 du lot C (écrire « 5 km » dans l'atelier)
date: 2026-10-11
status: phase 0 validée par David (« je valide », 2026-10-11) — en cours sur `feat/grandeurs-ecriture`
---

# Lot C — écrire une grandeur naturellement dans l'atelier

Décision de David (Q1 = A, 2026-10-11, [grandeurs-analyse.md](grandeurs-analyse.md) §6) :
**« un nombre, une espace, une unité » est une grandeur ; collé ou avec `*`, c'est un produit.**
C'est la règle typographique officielle (SI : une espace entre le nombre et l'unité ; un coefficient
collé à sa lettre). Les crochets (`5[km]`) et `\unit{km}` restent acceptés.

## Où la règle s'applique

| Contexte                                              | Règle de l'espace ?                                      |
| ----------------------------------------------------- | -------------------------------------------------------- |
| Calcul : un calcul (`12 km + 300 m`)                  | **oui**                                                  |
| Calcul et cartes : une **valeur** (`d = 5 km`)        | **oui**                                                  |
| Cartes : champ MathLive d'une valeur                  | **oui** — l'espace tapée doit survivre (`mathModeSpace`) |
| Définition de **fonction** (`f(t) = 3 t + 2`)         | non : une fonction n'a pas d'unité, t y est la variable  |
| **Commandes** (`.résoudre 2 a = 4`, `.dériver 3 t^2`) | non : algèbre (`.convertir km/h` lit déjà une unité)     |
| Énoncés, `{{eval}}`, questions                        | non (inchangé : `5[km]`)                                 |

## Comportements

| Saisie                                  | Attendu                                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `5 km`                                  | 5 km                                                                                                                                                  |
| `12 km + 300 m` (l'exemple du champ)    | 12,3 km                                                                                                                                               |
| `2,5 km * 4`                            | 10 km (virgule décimale comme ailleurs)                                                                                                               |
| `90 km/h * 2 h`                         | 180 km (unité composée)                                                                                                                               |
| `9,81 m/s^2 * 2 kg`                     | 19,62 kg·m/s² = 19,62 N (unité avec exposant)                                                                                                         |
| `2 h 30 min`                            | **2 h 30 min** — l'unité écrite est gardée (décision de David : « par défaut on garde l'unité écrite ») ; `2 h 30 min + 45 min` → 3 h 15 min          |
| `d = 5 km` puis `t = 2 h` puis `d/t`    | cartes grandeurs ; 2,5 km/h                                                                                                                           |
| `5 kg + 3 cm`                           | refus « On ne peut pas ajouter une masse et une longueur. »                                                                                           |
| `2 x`, `3 a b`                          | produits (x, b ne sont pas des unités ; `3 a` seul : voir plus bas)                                                                                   |
| `5m`, `2a+1`, `3t+2` (collés)           | produits, comme aujourd'hui                                                                                                                           |
| `5km` (collé, k et m inconnus)          | produit 5·k·m + aide : « Pour 5 kilomètres, écris 5 km (avec une espace). »                                                                           |
| `5 m` quand une valeur `m = 3` existe   | 5 m (grandeur — la règle est la même partout) + aide : « m est aussi une valeur du panneau : pour 5 × m, écris 5m. »                                  |
| `3 t + 2` (espaces, t curseur ou non)   | refus « On ne peut pas ajouter une masse et un nombre sans unité. » + aide : « « 3 t » se lit 3 tonnes : pour 3 × t, écris 3t. »                      |
| `1/2 m`, `3/4 km`                       | **(1/2) m**, (3/4) km — l'unité porte sur le nombre qui la précède, **fraction de nombres comprise** (décision de David) ; `x/2 m` reste de l'algèbre |
| Carte valeur, MathLive : on tape `5 km` | 5 km (l'espace devient `\,`, relue comme l'espace de Calcul)                                                                                          |

## Comment

- Un **lecteur de l'atelier**, avant le parseur : `5 km` → `5[km]` quand ce qui suit l'espace est
  une écriture d'unité connue (`parseUnit`), non suivie de `(` (une fonction : `2 h(3)`) ni d'une
  lettre ; deux grandeurs collées de même nature reçoivent un `+` (`2[h]+30[min]`).
- Appliqué au texte de Calcul (calculs, valeurs), aux valeurs des cartes et des URL.
- Cartes : `mathModeSpace = '\,'` sur le champ MathLive, comme les cases à unité des questions.
- Les aides sont des **notes** sous la ligne (le calcul a lieu), sauf le refus de dimension.

## Tests (écrits avant le code)

- Le lecteur : chaque ligne du tableau, dans les deux sens (grandeur / produit).
- Calcul de bout en bout (`runInput`) : réponses et aides.
- Carte : frappe réelle de `5 km` dans le champ MathLive d'une valeur.
- Non-régression : définitions de fonctions, commandes, `5[km]`, algèbre collée.

## Décisions de David (2026-10-11)

1. **Durées composées** : « je préfère garder 2 h 30 min. Par défaut on garde l'unité écrite. » Une
   somme de durées écrites en h et min se répond en h et min (comme `;hms` de `{{eval}}`).
2. **`1/2 m` se lit (1/2) m**, pas 1 ÷ (2 m) : l'unité porte sur la fraction de nombres qui la
   précède. ⚠️ Écart assumé avec la notation stricte des énoncés, où `1/2[m]` reste 1 ÷ (2 m)
   (`notation-unites.md`).

## Idée de David, à étudier à part (pas dans ce lot)

Un **champ hybride** dans Calcul, comme l'onglet « Hybride » de `/cas` : du texte mêlé à des champs
mathématiques (MathLive). Une fraction tapée dans un champ mathématique lèverait l'ambiguïté de
`1/2 m` à la source. C'est un changement de la saisie de Calcul : phase 0 séparée.

## Journal

- 2026-10-11 — lot C codé sur `feat/grandeurs-ecriture` : `readNaturalQuantities` (calculs et valeurs
  de Calcul), aides en note (`5km`, `5 m` avec une valeur `m`, `3 t + 2` refusé) ; durées composées
  (`compositeDuration`, `quantities.ts`) : deux unités de durée écrites → réponse en h, min, s, arbre
  juxtaposé pour l'affichage, grandeur exacte transmise à part (`quantityAst`) pour « Garder » et
  `.convertir` ; `render.ts` ne repasse plus une grandeur par `tidy` (qui recalculait `2 h · 30 min`
  en h²). Cartes : `mathModeSpace = '\,'` sur une valeur, `5\,m` relu en grandeur.
  Conséquences sur le lot A : `3[h]+20[min]` → « 3 h 20 min » (était « 200 min »), `1 h + 30 min` →
  « 1 h 30 min ».
- 2026-10-11 — revue `code-reviewer` du lot C, corrigés : **bloquant** — une durée composée n'était
  pas parenthésée (`1 h 30 min * 2` → 2 h ; désormais `(1[h]+30[min])`, c'est UN nombre) ; une valeur
  `d = 3 t + 2` était rangée sans erreur ; l'aide d'une lettre s'affichait pour un refus d'une autre
  cause (`5 kg + 3 m`) — seulement quand le refus parle d'un nombre sans unité ; `3 a + 2 b` rendait
  des crochets bruts — refusé (« Une grandeur ne se combine pas avec une lettre. ») avec l'aide ;
  `2{,}5\,km` dans une carte ; aides en double ; « nom du panneau » (pas « valeur »). Une durée
  écrite en h et min reste composée même avec une seule partie (`1 h 30 min / 2` → 45 min).
- Laissés pour plus tard (mineurs) : une carte rangée `(2[h]+30[min])` ou `(1/2)[m]` ne se relit
  pas après retouche dans le champ MathLive ; `2\,h\,30\,min` tapé dans une carte ; le membre gauche
  de `.convertir` après une durée composée s'écrit `2,5 h`. Rejeu : un historique exporté avant ce lot
  qui contient de l'algèbre écrite avec des espaces (`5 s + 1`) s'arrête désormais sur un refus.
