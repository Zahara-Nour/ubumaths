# Moteur web de la console mathAST

`WebReplEngine` exécute dans le navigateur ce que fait la console de `pnpm math` : expressions,
commandes à point (`.dériver`, `.résoudre`…), égalités, grandeurs. **Deux lecteurs** : la vue
Calcul de l'atelier (`src/lib/atelier/engine.ts`, `src/lib/atelier/desk.svelte.ts`), qui traduit les
commandes en français, lit la saisie elle-même et met en forme les réponses (doc :
[docs/systeme/atelier.md](../../../../../docs/systeme/atelier.md)) ; et la calculatrice `/calc`
(`src/lib/stores/calculator.svelte.ts`).

Le REPL web `/cas` (store `repl.svelte.ts`, composants `components/cas/`, complétion
`cli/completion/`) est **retiré depuis le 2026-10-13** : l'adresse mène à `/atelier`.

## Fichiers

| Fichier                   | Rôle                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `web-repl-engine.ts`      | `WebReplEngine` : `execute`, `getCommands`, `getEvalState`, `getState`, `getFunctions`                |
| `types.ts`                | `ReplExecutionResult` (texte, HTML, arbre, LaTeX, valeurs exacte et approchée), `WebFunctionInfo`     |
| `output-formatter-web.ts` | Sortie HTML des erreurs et des arbres (classes CSS à la place des couleurs du terminal), `escapeHtml` |
| `french-errors.ts`        | Messages d'erreur du moteur traduits en français                                                      |
| `index.ts`                | Export de `WebReplEngine` (lu par le store de `/calc`)                                                |

## Lecteurs

- **Atelier** (vue Calcul) : `execute`, `getCommands` (catalogue), `getEvalState` (mode),
  `getState` (`syncEngine`) ; champs `output`, `latex`, `ast`, `error`, `approximateLatex`,
  `exactLatex`, `quantityAst`, `exactTooLong`.
- **`/calc`** (`src/lib/stores/calculator.svelte.ts`) : `execute`, `getCommands` ; champs `output`,
  `latex`, `outputHtml`, `error`. `outputHtml` n'a plus que ce lecteur, qui le recopie dans son
  historique sans l'afficher.
- `getFunctions` n'est lu que par des tests (`atelier/__tests__/engine.test.ts` s'en sert pour
  vérifier `syncEngine`).

## Allégé après le retrait de `/cas` (2026-10-13)

Retirés faute de lecteur : la bascule du mode de saisie (`setInputMode`, `getInputMode`,
`ReplInputMode`, `.latex` / `.custom` sans argument, `.auto`) — la saisie est toujours détectée ;
`.export` / `.exp` et l'historique passé au moteur (`setHistory`, `ReplHistoryEntry`, `exportData`)
— l'atelier exporte lui-même (`.exporter`) ; les champs de bascule exact/décimal (`exactOutput`,
`exactOutputHtml`, `decimalOutput`, `decimalOutputHtml`, `canToggle`, `showDecimalInitially`) de
`ReplExecutionResult`, et `highlightRanges` ; `getLastAst` ; `TabStyle` ; les formateurs HTML `escapeWithLabel`,
`formatHashHtml`, `formatFunction*Html`.

⚠️ Côté CLI, `CommandResult` (`cli/types.ts`) déclare toujours ces champs de bascule et `.solve`
(`solve.command.ts`) les remplit encore : seul le moteur web a cessé de les transmettre. Ils n'ont
plus de lecteur (ni `repl.ts`, ni `cli.ts`) ; `QuantityOutcome.exact` / `.decimal`
(`cli/quantities.ts`) non plus. À alléger dans un second temps.

Sans argument, `.latex` et `.custom` sont désormais les commandes du registre (sur la dernière
expression du moteur ; sans expression antérieure, un échec à la sortie vide) ; `.auto`, `.export` et `.exp` sont des commandes inconnues. L'atelier ne
les envoie jamais au moteur (refus ou commande inconnue avant, `calcul.ts`).

## Tests

```bash
pnpm test:server src/lib/mathAST/cli/web/
```
