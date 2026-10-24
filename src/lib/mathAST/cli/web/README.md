# Moteur web de la console mathAST

`WebReplEngine` exécute dans le navigateur ce que fait la console de `pnpm math` : expressions,
commandes à point (`.dériver`, `.résoudre`…), égalités, grandeurs. **Un lecteur** : la vue
Calcul de l'atelier (`src/lib/atelier/engine.ts`, `src/lib/atelier/desk.svelte.ts`), qui traduit les
commandes en français, lit la saisie elle-même et met en forme les réponses (doc :
[docs/systeme/atelier.md](../../../../../docs/systeme/atelier.md)).

Le REPL web `/cas` (store `repl.svelte.ts`, composants `components/cas/`, complétion
`cli/completion/`) est **retiré depuis le 2026-10-13**, la calculatrice `/calc` (store
`calculator.svelte.ts`, composants `components/calculator/`) depuis le 2026-10-25 : les deux adresses
mènent à `/atelier`.

## Fichiers

| Fichier                   | Rôle                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `web-repl-engine.ts`      | `WebReplEngine` : `execute`, `getCommands`, `getEvalState`, `getState`, `getFunctions`                |
| `types.ts`                | `ReplExecutionResult` (texte, HTML, arbre, LaTeX, valeurs exacte et approchée), `WebFunctionInfo`     |
| `output-formatter-web.ts` | Sortie HTML des erreurs et des arbres (classes CSS à la place des couleurs du terminal), `escapeHtml` |
| `french-errors.ts`        | Messages d'erreur du moteur traduits en français                                                      |
| `index.ts`                | Export de `WebReplEngine`                                                                             |

## Lecteurs

- **Atelier** (vue Calcul) : `execute`, `getCommands` (catalogue), `getEvalState` (mode),
  `getState` (`syncEngine`) ; champs `output`, `latex`, `ast`, `error`, `approximateLatex`,
  `exactLatex`, `quantityAst`, `exactTooLong`.
- `outputHtml` n'a plus aucun lecteur hors des tests depuis le retrait de `/calc` (2026-10-25).
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
