# Ancien programme — copie figée avant suppression

Copie de la prod faite le 2026-10-21, avant la migration `20261022080000_suppression_ancien_programme.sql`
(étape 4 de C5, décision de David du 2026-10-21, Q2). Lecture seule, `select *` par PostgREST ; aucune donnée
d'élève.

| Fichier             | Table                                              | Lignes |
| ------------------- | -------------------------------------------------- | -----: |
| `themes.csv`        | `curriculum_themes`                                |     29 |
| `objectifs.csv`     | `curriculum_objectives`                            |     87 |
| `points.csv`        | `curriculum_points` dont `objective_id` est rempli |  1 007 |
| `liens-modeles.csv` | `question_template_points` vers ces points         |  1 026 |

Séparateur `;`, valeurs entre guillemets quand elles contiennent `;`, `"` ou un saut de ligne ; vide = `null`.
Rechargement (rollback) : voir l'en-tête de la migration.
