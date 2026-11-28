---
title: Écarts — lot interface-prof
date: 2026-11-28
status: clos (#3276, 2026-11-28)
---

# Écarts — lot `interface-prof`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3276._

- **État** : lot clos, PR #3276 mergée, 11 lignes barrées au registre, journal archivé · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : retirés par `pnpm pr:merger`

## Écarts du lot

V74, V106, V116, V118, V120, V121, V122, V123, L41, L116, M48 (lignes au [registre](../../ecarts/registre.md)).

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

### 2026-11-28 — phase 0 validée par David (« je valide »)

1. **V74** : « Aucun résultat pour le tag #fractions. » ; texte + tag : « Aucun résultat pour « pythagore » avec le tag #géométrie. »
2. **V106** : retirer la mention « @ » de l'éditeur riche.
3. **V116** : rubriques = vrais dossiers, ordre systeme, pratiques, adr, wip, archive ; la recherche filtre sur titre et chemin.
4. **V118** (+ M48) : HTML riche collé = mise en forme gardée ; markdown seulement pour du texte brut ou une enveloppe triviale (`isTrivialHtmlWrapper`).
5. **V120** : retirer le réglage admin de numérotation des listes (choix b).
6. **V121** : « Contenu pédagogique » · « Gérez vos modèles de chapitres, exercices, énigmes et fiches » · onglets Modèles de chapitres, Exercices, Énigmes, Fiches, Carnets Python.
7. **V122** : infobulle en texte simple, sans signes LaTeX.

### 2026-11-28 — correctifs et revue

- Tests d'abord (rouges vérifiés) pour V74, L41, V116, V118, V122, V123, L116 ; puis correctifs.
- V106 : retrait de la liste « @ » (store `mentions` supprimé), le nœud `mention` reste pour les contenus existants. V120 : store `listNumbering` supprimé, `MarkdownRenderer` lit `DEFAULT_CONFIG`.
- Preuves réécrites au registre : V106 (« Alice Dupont » reste un nom fictif d'un autre test), M48 (fonction branchée, pas retirée).
- Revue : rubriques de la doc admin rouvertes à chaque recherche ; `toPlainText` traite fractions imbriquées, `\frac12`, parenthèses ; HTML d'éditeur de code (police à chasse fixe) toujours lu comme markdown.

### 2026-11-28 — clôture

- #3276 mergée après une mise en prod restée six heures sur le pager de `git log` (corrigé par #3279, `GIT_PAGER=cat`) et un conflit avec le lot `cache` dans `ecarts-coquille.svelte.test.ts`.
