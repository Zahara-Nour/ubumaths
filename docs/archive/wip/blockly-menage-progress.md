# blockly-menage — ménage du module Blockly partagé

## Reprendre ici

_Mis à jour le 2026-11-16, après #2733 (mergée) — **chantier clos**._

- **État** : module partagé nettoyé, revue `code-reviewer` (Sonnet) sans finding, CI verte · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : retirés

## Origine

Suite « ménage mineur » du chantier `blockly` (clos le 2026-11-16, journal
`docs/archive/wip/blockly-progress.md` § Suites). David, le 2026-11-16 : ménage maintenant, puis
phase 0 de `tortue-variables`.

## Ce qui est retiré (aucun usage, recensé par grep sur `src`, `scripts`, `tests`)

- `types.ts` : `ExecutorState`, `ModeBlockly`, `LoadingStage`, `OutputLineType`, `OutputLine`,
  `BlocklyWorkspaceState`, `ExecutionContext`, `WorkspaceOptions`, `LoadingStageIndex` (les
  homonymes du module Python sont les siens, pas importés d'ici). Gardés : `ExecutionLanguage`,
  `CodeGenerationResult` (`generateCode`).
- `config.ts` : délais JS / Python, `MAX_OUTPUT_LINES`, `CODE_GEN_DEBOUNCE_MS`, `LOADING_STAGES`,
  `CODE_TEMPLATES`, `DISPLAY_CONFIG`, les messages d'erreur jamais lus. Messages gardés passés en
  français accentué.
- `generators/index.ts` : `generateCodeFromXml`, `getRawCode`, `countExecutableBlocks`.
  Avertissements de `generateCode` accentués.
- `README.md` du module et de `generators/` (anglais, non vérifiés ; `docs/systeme/blockly.md` fait foi).
- `__tests__/types.test.ts` (tests de types tautologiques) → `__tests__/config.test.ts` (options
  de l'espace, messages).
