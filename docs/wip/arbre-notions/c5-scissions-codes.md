# Codes des nouveaux points

> Prod au 2026-10-17 (SELECT). Les codes sont uniques sur toute la table (`curriculum_points_code_unique`), tous au format `<grade>-NNN`, aucun code d'un grade n'appartient à un autre grade. Les numéros ont des trous (points retirés : 5-081, 3-031… ; 6e numérotée 6-1xx/6-2xx) : on part du **maximum**, pas du nombre de points.

La migration des tables (20261016090000, pas encore en prod : CP s'arrête à CP-072) prend CP-073, CE1-090, CE1-091, CE2-084, CE2-085.

| Grade     | Points en prod | Code max en prod | Pris par la migration des tables | **Prochain code libre** | Points scindés | **Nouveaux codes nécessaires** | Plage             |
| --------- | -------------- | ---------------- | -------------------------------- | ----------------------- | -------------- | ------------------------------ | ----------------- |
| CP        | 72             | CP-072           | CP-073                           | **CP-074**              | 9              | **11**                         | CP-074 → CP-084   |
| CE1       | 89             | CE1-089          | CE1-090, CE1-091                 | **CE1-092**             | 13             | **16**                         | CE1-092 → CE1-107 |
| CE2       | 83             | CE2-083          | CE2-084, CE2-085                 | **CE2-086**             | 10             | **11**                         | CE2-086 → CE2-096 |
| CM1       | 138            | CM1-139          | —                                | **CM1-140**             | 26             | **31**                         | CM1-140 → CM1-170 |
| CM2       | 124            | CM2-125          | —                                | **CM2-126**             | 27             | **32**                         | CM2-126 → CM2-157 |
| 6         | 101            | 6-201            | —                                | **6-202**               | 8              | **9**                          | 6-202 → 6-210     |
| 5         | 114            | 5-115            | —                                | **5-116**               | 26             | **27**                         | 5-116 → 5-142     |
| 4         | 72             | 4-072            | —                                | **4-073**               | 8              | **8**                          | 4-073 → 4-080     |
| 3         | 55             | 3-056            | —                                | **3-057**               | 10             | **11**                         | 3-057 → 3-067     |
| **Total** |                |                  | 5                                |                         | 137            | **156**                        |                   |

Nombre de nouveaux codes = somme, par point, de (nombre de libellés − 1) : les scissions en trois (CE1-007, CE2-007, CM1-008, CM2-005, CP-006, CM1-028, CM2-028, CM1-031, CM2-031, CE1-016, CE1-017, CM1-014, CM1-023, CM2-013, CM2-023, 6-181, 5-005, CP-015, 3-022) en demandent deux.

⚠️ L'attribution dans l'ordre du BO (nouveau point juste après l'origine) concerne `display_order` ; les **codes** neufs, eux, ne suivent pas l'ordre d'affichage (comme CP-073 pour CP-018). Proposition : attribuer les codes dans l'ordre d'affichage des origines au sein de chaque grade, pour une table de correspondance lisible.

## Détail par grade (origines, dans l'ordre de la spec)

- **CP** (11 codes) : CP-022, CP-020, CP-021, CP-014, CP-019, CP-006, CP-069, CP-003, CP-015
- **CE1** (16 codes) : CE1-084, CE1-029, CE1-021, CE1-022, CE1-028, CE1-007, CE1-016, CE1-017, CE1-063, CE1-070, CE1-082, CE1-089, CE1-004
- **CE2** (11 codes) : CE2-014, CE2-016, CE2-022, CE2-007, CE2-059, CE2-068, CE2-075, CE2-083, CE2-004, CE2-017
- **CM1** (31 codes) : CM1-035, CM1-036, CM1-043, CM1-021, CM1-050, CM1-008, CM1-132, CM1-028, CM1-034, CM1-010, CM1-025, CM1-032, CM1-031, CM1-014, CM1-023, CM1-030, CM1-033, CM1-094, CM1-100, CM1-101, CM1-121, CM1-137, CM1-138, CM1-139, CM1-004, CM1-018
- **CM2** (32 codes) : CM2-036, CM2-035, CM2-045, CM2-020, CM2-005, CM2-028, CM2-117, CM2-034, CM2-007, CM2-025, CM2-032, CM2-031, CM2-013, CM2-023, CM2-030, CM2-033, CM2-084, CM2-089, CM2-090, CM2-067, CM2-008, CM2-107, CM2-123, CM2-124, CM2-125, CM2-002, CM2-017
- **6** (9 codes) : 6-135, 6-113, 6-133, 6-181, 6-157, 6-178, 6-195, 6-134
- **5** (27 codes) : 5-026, 5-017, 5-016, 5-046, 5-047, 5-013, 5-051, 5-076, 5-086, 5-045, 5-044, 5-062, 5-064, 5-070, 5-006, 5-090, 5-077, 5-094, 5-096, 5-109, 5-110, 5-111, 5-080, 5-010, 5-005, 5-058
- **4** (8 codes) : 4-004, 4-029, 4-048, 4-057, 4-060, 4-009, 4-040, 4-041
- **3** (11 codes) : 3-036, 3-045, 3-016, 3-014, 3-042, 3-044, 3-041, 3-030, 3-022, 3-023

## Surprise : horodatage de la migration des tables

La dernière migration en prod est `20261016104200_taille_texte_fiches_eleve` ; `20261016090000_scission_points_tables`
est **antérieure**. `supabase db push` refuse une migration locale qui s'insère avant la dernière migration distante
(sauf `--include-all`). Avant `db:migrate`, il faudra la renuméroter après `20261016104200` (en vérifiant les
worktrees : `ubumaths-wt-*` ont des migrations jusqu'à `20261016104200`, aucune au-delà).
