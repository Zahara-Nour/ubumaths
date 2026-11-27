# Relevé « Durées » de 6e (2026-11-27)

Chantier [`idees-6e-durees`](idees-6e-durees-progress.md). Lecture factuelle des 11 exercices 6M4 de l'autre
plateforme (copie locale, code lu en entier, `Old` ignorés), comparés à nos modèles de prod (MCP, lecture seule).
Points de 6e : 6-156 (années, siècles), 6-157 (horaire ou durée), 6-158 (problèmes), 6-159 (convertir), 6-206
(calculer sur des durées). Bornes : `docs/systeme/programmes/bornes/cycle3.md` ; BO :
`src/lib/server/programmes/transcriptions/cycle-3/6-grandeurs.md` (« Le repérage dans le temps et les durées »).

## Nos modèles de 6e (prod, 2026-11-27)

Tous publiés, rangés, une variation chacun sauf mention.

| Point | Modèles                                                                                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6-156 | ffca5b4a (3 var.) : siècles → ans, millénaires → ans ou siècles, jours d'une année (bissextile ou non, deux années)                                                                          |
| 6-157 | 663fafd3, 0bb7a4ca : durée entre deux horaires (h min, sans passage de minuit), une case à unité                                                                                             |
| 6-158 | ee82f057 (3 var.) : n séances de d min, arrivée d'un car avec un arrêt, durée d'un film après les publicités                                                                                 |
| 6-159 | 0d7faf05 … 65c32979 (12 modèles, niveaux 1 à 12) : h ↔ min, min ↔ s (1 à 10) ; h min → min ; min → h min (1 à 2 h) ; a,1 / a,25 / a,5 h → h min et → min ; a,b h (dixièmes) → h min et → min |
| 6-206 | de806bd6 … 75956b22 (6 modèles) : h min + min, h min + h min (dizaines de minutes, puis quelconques), en deux cases ou une case libre                                                        |

Voisins : CM2 2fda6db8 (s → min s, h → j h dans des problèmes), CM2 99f80f5e (durée à la seconde sur horloges),
CE1 10ec8633 (quart, demi, trois quarts d'heure → min).

## Exercices

| Id       | Ce qu'on demande (plages exactes)                                                                                                                                                                            | Forme chez eux                                | Nos modèles                                       | Verdict                                                                                              | Fiche  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| 6M4A     | Additionner : min s + min s (20..59 min, 11..39 s + 1..20 s, retenue min → h) ; h min + h min (retenue) ; h min s + h min s sans retenue ; min s + min s avec deux retenues ; h min s + h min s avec retenue | une case « h min s »                          | 6-206 : h min seulement, jamais de secondes       | 🟡 manque l'addition avec les secondes                                                               | N1     |
| 6M4A-1   | Durée entre deux horaires, horaire de fin, horaire de début ; film 20..22 h + 2 h, série 20..23 h (**passe minuit**), émission, gymnastique, train ; durées de 27 à 75 min ou 1 à 5 h, avec retenue          | une case « h min »                            | 6-157 : durée seulement ; 6-158 : une arrivée     | ❌ horaire de **début** absent ; horaire de fin seul hors problème absent ; passage de minuit absent | N2     |
| 6M4autoC | 1 j = 24 h, 1 h = 60 min, 1 min = 60 s : retrouver l'unité de gauche ou de droite                                                                                                                            | liste déroulante d'unités                     | aucun en 6e (relations implicites dans 6-159)     | 🟡 relations entre unités à connaître (automatisme du BO)                                            | N6     |
| 6M4autoD | 1 millénaire = 1 000 ans, 1 siècle = 100 ans, 1 année = 365 j : retrouver l'unité                                                                                                                            | liste déroulante                              | ffca5b4a (3 var.)                                 | ✅ (on demande le nombre, c'est mieux que l'unité)                                                   | —      |
| 6M4autoE | ¼ h, ½ h, ¾ h ↔ 15, 30, 45 min, en phrase ou en fraction écrite                                                                                                                                              | liste déroulante                              | CE1 10ec8633 v1 en mots ; rien en 6e              | 🟡 la fraction écrite ($\frac34$ h) manque en 6e                                                     | N6     |
| 6M4C     | Convertir : h → min (2..11), h → s (1, 2, 10, 20), min → s (2..59), h min → s ; h → j h (1..6 j) ; s → h min s (0 à 2 h) ; h → semaines j h (2..9 sem.)                                                      | une case « durée composée »                   | 6-159 : h, min, s simples (1 à 10)                | 🟡 manquent jours, semaines, h min → s, s → h min s                                                  | N3, N4 |
| 6M4C-1   | min → h min (2..4 h, 10..59 min) ; s → min s (2..4 min)                                                                                                                                                      | une case « h min » ou « min s »               | 3e21300d, ebdc9d34 (1 à 2 h) ; s → min s au CM2   | 🟡 s → min s absent en 6e                                                                            | N4     |
| 6M4C-2   | a,b h → h min, a 1..12, b ∈ 0,1 … 0,9, 0,25, 0,75                                                                                                                                                            | une case « h min »                            | 311bf024 (0,1 ; 0,25 ; 0,5), 38ba3458 (dixièmes)  | 🟡 seul 0,75 h manque                                                                                | F1     |
| 6M4C-3   | (quarts d'heure) h min → h décimales ; h min → min ; min → h décimales                                                                                                                                       | une case nombre                               | aucun : nous n'allons que du décimal vers h min   | ❌ sens sexagésimal → décimal absent (1 h 45 min = 1,75 h ; 90 min = 1,5 h)                          | N5     |
| 6M4C-4   | (quarts) h décimales → h min s ; min décimales → h min s (2,5 min = 2 min 30 s)                                                                                                                              | une case « h min s »                          | h décimales → h min ; rien pour les min décimales | 🟡 minutes décimales → min s absent                                                                  | N5     |
| 6M4C-5   | Composées dans les deux sens : ans mois (×12), sem. j (×7), j h (×24), h min, min s, sem. j h, j h min, h min s                                                                                              | une case « durée composée », clavier d'unités | 6-159 : h min seulement                           | 🟡 années-mois, semaines-jours, jours-heures et triples absents                                      | N3     |

## Ce que leur format fait et pas le nôtre

Rien de bloquant. Leur case « durée composée » (une case, `2 h 15 min`) existe chez nous : case à unité,
`units/composite-duration.ts`, déjà utilisée par 663fafd3 et 90aaf9dd. Les années et les mois dans une même case
restent à vérifier en local (le clavier d'unités chez eux est un clavier à part, `clavierPersonnalisable`) : si notre
case n'accepte pas `3 ans 5 mois`, on passe en deux cases (`? ans ? mois`), et la fiche N3 le dit.
