# Chantier `ensembles-2de` — ensembles de nombres en Seconde : couverture et manques

## Reprendre ici

_Mis à jour le 2026-11-20 : phase 0 du lot 1 validée par David._

- **État** : phase 0 du lot 1 **validée** (« je suis tes recos », 2026-11-20) : modèles 1, 2, 3 à écrire ; petits ajouts reportés. Rien d'écrit.
- **Prochaine action** : ouvrir le worktree `../ubumaths-wt-ensembles-2de` (branche `feat/questions-ensembles-2de`), écrire le lot (skill `couvrir-niveau` § 2, gabarit `docs/wip/questions-2de/lot-ensembles-10a-2de.py`), simulation verte, essai en base locale, PR des fichiers.
- **En attente de David** : rien avant la PR ; ensuite `create-questions --publier` (David, `!`).
- **Pièges en cours** : ne jamais nommer la plateforme d'origine (commits, branches, PR, journal) ; niveaux = premier libre de chaque sous-notion, relevés en prod avant d'écrire.
- **Worktree / branche** : aucun pour l'instant.

## Décisions de David (2026-11-20)

- **But** : pouvoir créer des séries qui travaillent les automatismes officiels du lycée ; compléter nos modèles avec les idées d'une autre plateforme.
- **Sens** : on parcourt la plateforme **rubrique par rubrique** et on rattache ensuite chaque idée à un point. Les idées hors automatismes sont **gardées** : elles complètent nos modèles existants.
- **Ordre** : la **Seconde** d'abord (ses points nourrissent les listes de 1re et de Terminale).
- **Les 4 manques d'« Ensembles de nombres »** : à créer tout de suite, en brouillon, publication par David.

## Relevé (2026-11-20)

| Exercice relevé                                                | Ce qu'on demande                                                      | Modèle(s) Chiphre                                                                                                          | Verdict                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Plus petit ensemble d'un nombre (question flash et série de 5) | −123 · 146 · 59/4 · √47 · 6/3 → ℕ, ℤ, 𝔻, ℚ ou ℝ                       | « Le plus petit ensemble de nombres » (ab/b, −√a², p/q décimal, p/q non décimal, √k)                                       | ✅ ; pas de 5,78, de −123 écrit tel quel, ni de π                           |
| Plus petit ensemble du **résultat d'un calcul**                | 3−15 · 24/2−√16 · 4+√29 · 8/10+5/100 · √49−√121 · 3+4/7 · 1/3+1/3+1/3 | aucun                                                                                                                      | ❌ manque 1                                                                 |
| Cocher **tous** les ensembles d'un nombre                      | 5,78 · −√81 · (6−1)/5 · π · 3+1/3                                     | « À quels ensembles de nombres appartient ce nombre ? » (±p/q, ±√n, m/100) ; « Entiers naturels, entiers relatifs » var. 3 | 🟡 ; pas de π ni de sommes                                                  |
| Compléter par ∈ / ∉ / ⊂ / ⊄                                    | 17 … {16;22;44} · {b;p;t;x} … {b;h;p;t;x}                             | « Élément d'un ensemble, appartenance » · « Vrai ou faux : inclusion » · « Le bon symbole : ∈, ⊂, ∩, ∪ »                   | 🟡 ; jamais ⊄, jamais le choix parmi les quatre, pas d'ensembles de lettres |
| A∪B, A∩B, A∖B, B∖A                                             | ensembles de lettres ou de nombres                                    | « Réunion… », « Intersection… », « Complémentaire d'un ensemble fini », « L'ensemble vide »                                | 🟡 ; pas de différence A∖B entre deux ensembles quelconques                 |

### Manques, par priorité

1. Plus petit ensemble qui contient le résultat d'un calcul (nouveau modèle).
2. Différence A∖B / B∖A (variation ou nouveau modèle).
3. Choisir entre ∈, ∉, ⊂, ⊄ (variation de « Le bon symbole »).
4. Petits ajouts : π et 5,78 dans « À quels ensembles… » ; −123 écrit tel quel dans « Le plus petit ensemble… ».

## Comment un modèle devient « automatisme » (rappel, 2026-11-20)

Un modèle ne porte aucune marque « automatisme ». Il est relié à des **points** (`question_template_points`) ; un point figure dans la liste d'automatismes d'un ou plusieurs programmes (`curriculum_point_automatismes`). Exemple : « Réunion de deux ensembles finis » → point 2-404 (Seconde) → listes de 1re spé, 1re techno, Tle spé, Tle compl., Tle techno.

## Lot 1 : phase 0 validée (David, 2026-11-20)

1. **Le plus petit ensemble qui contient le résultat** — point 2-243, sous-notion ℕ, ℤ, 𝔻, ℚ, ℝ ; choix parmi ℕ, ℤ, 𝔻, ℚ, ℝ ; 6 variations : différence d'entiers (ℤ), racines parfaites (ℤ), fractions qui font un entier (ℕ), fractions décimales (𝔻), entier + fraction non décimale (ℚ), entier + racine non parfaite (ℝ).
2. **∈, ∉, ⊂ ou ⊄ ?** — point 2-203, sous-notion Opérations sur les ensembles ; 4 variations : nombre / ensemble fini, deux ensembles finis, nombre / ensemble de nombres, deux ensembles de nombres.
3. **A privé de B** — point proposé 2-206 (complémentaire), hors BO strict ; réponse entre accolades ; A∖B, B∖A, cas inclus (∅).
4. **Petits ajouts** (π, 5,78, −123) sur modèles publiés : proposés pour plus tard.

Décisions (David, 2026-11-20, « je suis tes recos ») : modèles 1 et 2 tels quels ; modèle 3 sur le point 2-206 ; petits ajouts reportés (à noter pour un lot de corrections de modèles publiés) ; question d'accès : personne (la migration range des brouillons, aucune règle d'accès ne change).
