# Chantier `ecarts-morts-utilitaires`

Lot `morts-utilitaires` de [ecarts-lots.md](ecarts-lots.md) : M27, M31, M50, M51, M53, M54, M56,
M57, L115 (code mort et doublons d'utilitaires, sans décision).

## Reprendre ici

_Mis à jour le 2026-11-28, avant l'ouverture de la PR._

- **État** : les 9 écarts traités sur la branche, typecheck 0, tests ciblés verts, preuves vertes · **Prochaine action** : rendu de `CodeEditor` vérifié à l'écran, revue, PR, merge ; puis registre barré, lot « fait », journal archivé (commit doc sur `main`) · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-ecarts-morts-utilitaires`, `chore/ecarts-morts-utilitaires`

## Écarts

Chacun vérifié dans le code avant d'y toucher (grep des importeurs, globs `import.meta.glob`
compris).

- **M27** : `types/academic_periods_types.ts` supprimé (aucun import).
- **M31** : supprimés `stores/auth.svelte.ts`, `stores/input-capability.svelte.ts` (et son test),
  `LoadingDashboard`, `LoadingTable`, `FontSelector`, `modals/ExampleModal`, `skeleton/Skeleton{Avatar,Button,Icon,NavItem}`.
  `activityStore.svelte.ts`, cité par le constat, n'existait déjà plus. `exerciseFont.svelte.ts`,
  que seul `FontSelector` importait, reste : c'est M58 (lot `morts-interface`).
- **M54** : supprimés `JsonViewer.svelte`, `supabase-test.ts`, `supabaseClient.ts`, `src/lib/index.ts`.
- **M50** : `containsDangerousHtml` de `utils/sanitize.ts` supprimée ; reste celle de
  `server/sanitization.ts` (testée).
- **M51** : `escapeHtml` en un seul exemplaire (`utils/html-escape.ts`) ; `components/markdown/utils.ts`
  le réexporte ; courriel de consentement, export PDF du tableau blanc et `GeometryCanvas`
  l'importent. Même sortie partout (la copie de `GeometryCanvas` n'échappait pas les guillemets :
  sans effet dans du texte).
- **M53** : retirés `flyAndScale`, `formatNumber` (`utils/format.ts`), `formatDate` de
  `worksheet-constants.ts`, `deleteChatAttachment`, `validateFileType`, `getFileIcon`
  (`file-upload.ts`), `getFilenameWithoutExtension`, cinq constantes de `constants/deadlines.ts` ;
  `sanitizeSearchQuery` n'est plus exportée. `NUMBERING_STYLE_OPTIONS` et `PAGE_LAYOUT_OPTIONS`
  n'existaient déjà plus. **Laissés** : `initMathFonts`, `preloadAllFonts` (`mathlive-fonts.ts`),
  outillage des polices KaTeX / Shantell auquel David a demandé de ne pas toucher.
- **L115** : le `formatDuration` des minutes (`worksheet-constants.ts`) s'appelle `formatMinutes`.
- **M56** : un seul `slugify` (`utils/string.ts`), qui retire maintenant les accents comme son
  exemple l'annonçait (« Théorème » → `theoreme`, avant `th-or-me`) ; `slug-generator.ts`
  l'importe. Effet : les ancres des titres accentués de `/dashboard/admin/docs` (table des
  matières et titres calculés par la même fonction, donc toujours d'accord).
- **M57** : `LaTeXEditor` et `rich-text/MarkdownCodeEditor` fondus en `components/CodeEditor.svelte`
  (`language="markdown"`). Ses styles globaux sont désormais bornés à `.code-editor` (ceux de
  `LaTeXEditor` touchaient tout CodeMirror de la page). **Laissés à part** : `CodeViewer`
  (lecture seule, JSON / Python) et `constructions/components/JsonEditor` (validation propre aux
  constructions, 500 lignes) : pas des copies.
