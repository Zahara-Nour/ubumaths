---
title: Écarts — lot interface-prof
date: 2026-11-28
status: en cours
---

# Écarts — lot `interface-prof`

## Reprendre ici

_Mis à jour le 2026-11-28, à l'ouverture._

- **État** : lot réservé (`docs/wip/ecarts-lots.md`), les 11 écarts vérifiés vrais dans le code le 2026-11-28 · **Prochaine action** : après les réponses de David, tests rouges puis correctifs, une PR · **En attente de David** : phase 0 de V74, V106, V116, V118, V120, V121, V122 · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-ecarts-interface-prof`, `fix/ecarts-interface-prof`

## Écarts du lot

V74, V106, V116, V118, V120, V121, V122, V123, L41, L116, M48 (lignes au [registre](../ecarts/registre.md)).

## Vérification (2026-11-28)

| Écart | Vrai ? | Ce qu'on voit dans le code                                                                                               |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| V74   | oui    | `recherche/+page.svelte` : « Aucun résultat pour « {data.query} ». » même quand la recherche n'a qu'un tag               |
| L41   | oui    | test `it.fails` « écart L41 » toujours dans `ecarts-coquille.svelte.test.ts`                                             |
| V106  | oui    | `stores/mentions.svelte.ts` : liste de personnes inventées (« Alice Dupont »…) proposée par « @ »                        |
| V116  | oui    | `docs-scanner.ts` : rubriques `features`, `architecture`… qui n'existent plus ; `searchQuery` rendu mais jamais appliqué |
| V118  | oui    | `markdown-paste-extension.ts` ne lit que `text/plain` : une liste copiée de Word passe par le markdown et perd le gras   |
| M48   | oui    | `isTrivialHtmlWrapper` sans appelant ; se ferme avec V118                                                                |
| V120  | oui    | réglage de numérotation des listes rangé dans le `localStorage` de l'admin                                               |
| V121  | oui    | `contenu/+layout.svelte` : « Contenu pedagogique », « Gerez », « Enigmes », « Templates », « Worksheets », « Notebooks » |
| V122  | oui    | `ClassCurriculumPointGrid.svelte` : `title={point.name}` avec le LaTeX brut                                              |
| L116  | oui    | `MathField.svelte` : `if (value) node.value = value` ne vide jamais le champ                                             |
| V123  | oui    | `class-knowledge.ts` : `skill_attempts` lus d'un bloc, sans pagination (plafond PostgREST de 1000 lignes)                |

## Journal
