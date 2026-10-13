# Moteur web de la console mathAST

`WebReplEngine` exécute dans le navigateur ce que fait la console de `pnpm math` : expressions,
commandes à point (`.dériver`, `.résoudre`…), égalités, grandeurs. **Son seul lecteur est la vue
Calcul de l'atelier** (`src/lib/atelier/engine.ts`, `src/lib/atelier/desk.svelte.ts`) : l'atelier
traduit les commandes en français, lit la saisie lui-même et met en forme les réponses
(doc : [docs/systeme/atelier.md](../../../../../docs/systeme/atelier.md)).

Le REPL web `/cas` (store `repl.svelte.ts`, composants `components/cas/`, complétion
`cli/completion/`) est **retiré depuis le 2026-10-13** : l'adresse mène à `/atelier`.

## Fichiers

| Fichier                   | Rôle                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `web-repl-engine.ts`      | `WebReplEngine` : `execute`, `getCommands`, `getEvalState`, `getLastAst`                        |
| `types.ts`                | `ReplExecutionResult` (texte, HTML, arbre, LaTeX, valeurs exacte et approchée), `ReplInputMode` |
| `output-formatter-web.ts` | Sortie HTML (classes CSS à la place des couleurs du terminal)                                   |
| `french-errors.ts`        | Messages d'erreur du moteur traduits en français                                                |
| `index.ts`                | Exports publics                                                                                 |

## Ce qui n'a plus de lecteur

La sortie HTML (`outputHtml`, `exactOutputHtml`, `decimalOutputHtml`) et le mode de saisie
(`setInputMode`, `.latex` / `.texte` / `.auto` sans argument) servaient `/cas`. L'atelier ne les
lit pas (il refuse `.latex` et `.texte` sans expression) ; ils restent tant que le moteur n'est pas
allégé.

## Tests

```bash
pnpm test:server src/lib/mathAST/cli/web/
```
