# Python exercises — Starter code à zones verrouillées — Progress

> Mode d'édition pour les exercices où l'élève ne peut modifier que des
> zones précises du `starter_code`, le reste étant read-only dans Monaco.
> Empêche la triche paresseuse type `return 7` sur les exos parameterless.

## Décisions de design (validées avec l'utilisateur)

- **Single-line uniquement** (V1). 100% des `# à compléter` des starters BAC actuels sont sur une seule ligne.
- **Marqueurs inline dans `starter_code`** : `{{id}}` ou `{{id | "default"}}`. Pas de schéma DB additionnel.
- **Placeholder visible avec contenu par défaut** : le code starter reste runnable au chargement (`while False:` au lieu de `while {{cond}}:`), zones surlignées pour signaler éditables.
- **Boutons « Réinitialiser cette zone » + « Tout réinitialiser »** (avec confirmation pour le global).
- **Tout côté frontend** : reconstruction du code complet juste avant l'envoi au worker Pyodide. Pas de validation serveur (impossible dans le contexte free-tier Vercel).
- **Pas d'anti-bypass fort** : verrouillage UI uniquement, sécurité contre la triche paresseuse. Un élève motivé peut bypasser via DevTools — c'est OK car aucun résultat n'a de poids académique.
- **Substitution telle quelle** (pas de trim). Python tolère les espaces ; trim pourrait masquer une intention.
- **Zone vide à la soumission** : substituée par chaîne vide, Python lève une SyntaxError remontée à l'élève via la stack trace.
- **Validation Zod côté schema** : `createExerciseSchema` refuse les marqueurs malformés à la création teacher.

## Compatibilité

- Orthogonal aux 5 stratégies de validation (`output`, `unit_test`, `variable_check`, `reference_solution`, `ast_requirements`) — c'est un **mode d'édition**, pas une 6ème stratégie.
- Rétro-compatible : un exo sans marqueurs continue de fonctionner en édition libre.

## Phases

| Phase | Description                                | Statut                  |
| ----- | ------------------------------------------ | ----------------------- |
| 1     | Parser + reconstruction (utilitaires purs) | ✅ Complétée (38 tests) |
| 2     | CodeMirror zones éditables côté élève      | ✅ Complétée            |
| 3     | Surlignage + boutons reset                 | ✅ Complétée            |
| 4     | UI teacher (prévisualisation + aide)       | ✅ Complétée            |
| 5     | Zod refine + tests intégration             | À faire                 |
| 6     | Quality checks finaux + doc finale         | À faire                 |

> **Note** : éditeur de code = **CodeMirror** (pas Monaco). Mentions « Monaco » dans les phases ci-dessus à interpréter comme CodeMirror.

## Phase 1 — état final

### Fichiers

- `src/lib/utils/locked-zones.ts` (290 lignes) — `parseTemplate`, `reconstructCode`, `renderDefaults` + helpers privés.
- `src/lib/utils/locked-zones.test.ts` (38 tests).

### Findings du code-reviewer adressés

- **BLOCKER #2** — `{{x | "foo"bar}}` silently accepted → fix : scan du quote fermant avec gestion `\<quote>` + vérification qu'il n'y a rien après le quote (sinon `unquoted-default`). Tests ajoutés.
- **IMPORTANT #3** — Test mixte valid + malformed + valid ajouté pour `reconstructCode`. Confirme que les marqueurs cassés sont laissés littéralement entre deux marqueurs valides sans casser le découpage.
- **IMPORTANT #5** — _À reprendre en Phase 2/3_ : quand `parseTemplate` retourne des erreurs, `renderDefaults` retombe en mode "template inchangé + zones vides". Côté UI, il faudra signaler visuellement à l'élève (banner rouge « cet exercice est mal configuré ») et au teacher (validation Zod en Phase 5 catchera ça avant la publication).
- **NIT #7** — Documenté : `unescapeString` et `findClosingBraces` sont couplés sur l'absence de `\n` dans les defaults. Si V2 ajoute multi-line, les deux doivent être étendus ensemble.
- **NIT #9** — `parseTemplate` est appelé en interne par `reconstructCode` et `renderDefaults`. Pour V1 (~10 markers max), overhead négligeable. À garder en tête si la Phase 2 fait du re-rendering sur chaque keystroke.
- **NIT #10** — UTF-16 vs CodeMirror position model : à vérifier à l'intégration Phase 2.

### API publique (résumé)

```typescript
parseTemplate(code: string): { markers: Marker[]; errors: ParseError[] }
reconstructCode(template: string, values: Record<string, string>): string
renderDefaults(template: string): { rendered: string; zones: RenderZone[]; errors: ParseError[] }
```

## Phase 2 — état final

### Fichiers

- `src/lib/components/python/LockedPythonEditor.svelte` (NOUVEAU) — composant CodeMirror dédié, `StateField<LiveZone[]>` pour les positions courantes, `transactionFilter` qui rejette les changements hors zones + newlines, `EditorView.decorations.compute` pour le surlignage des zones.
- `src/routes/(public)/python-exercises/[id]/+page.svelte` (modifié) — détection `lockedZonesActive` via `parseTemplate`, switch entre `LockedPythonEditor` et `PythonEditor`, désactivation de la persistance localStorage + bouton "Charger ce code" en mode locked.

### Findings du code-reviewer adressés

- **B2 Undo/redo bloqué** → bypass du filter pour `tr.isUserEvent('undo' | 'redo')`. Sans ça, undo silently stripped après une rejection de paste — UX cassée.
- **B3 Paste mixte silently dropped** → toast d'avertissement via `toaster.warning(...)` avec message localisé selon la raison (newline vs hors zone). Évite le « keyboard cassé » perçu.
- **I2 Race lazy-load + onDestroy** → guard `if (!editorContainer) return` après le `await Promise.all([...])`. Bail clean si le composant est démonté pendant le chargement.
- **I3 Sort + filter décorations** → `zones.filter(z.start < z.end).sort(...)` avant `Decoration.set`. Évite le crash sur zone collapsed (from === to) et un éventuel out-of-order après mapPos.
- **I4 "Charger ce code" silent fail** → bouton masqué en mode locked (la string saved est reconstruite, pas un Record<id, value>).
- **N1 fontSize hardcodé** → retiré du `EditorView.theme`, le CSS variable `--editor-font-size` du container fait déjà le job.

### Décisions reportées à V2 (acceptables pour V1)

- I1 : `reconstructCode` re-parse le template à chaque keystroke. Mesure d'abord avant d'optimiser (cacher les markers).
- Restauration localStorage en mode locked : Phase 3 stockera un `Record<id, value>` séparé.

### Compatibilité

- Exo sans marqueurs (la plupart actuellement) → `lockedZonesActive` retourne `false` → `PythonEditor` classique inchangé.
- Exo avec marqueurs malformés → `LockedPythonEditor` affiche un banner rouge « Cet exercice est mal configuré » avec la liste des erreurs.

## Phase 3 — état final

### Ajouts dans `LockedPythonEditor.svelte`

- **Widget `ZoneResetWidget`** : bouton inline `↺` placé juste après chaque zone via `Decoration.widget({ side: 1 })`. Click handler centralisé via `EditorView.domEventHandlers({ click })` qui regarde `target.dataset.zoneId` et dispatche une transaction de reset.
- **Annotation `resetAnnotation`** : les transactions de reset portent cette annotation et le `transactionFilter` les laisse passer sans vérifier les ranges (le contenu inséré est garanti propre — c'est le default original du teacher).
- **Toolbar au-dessus de l'éditeur** : compteur de zones + bouton « ↺ Tout réinitialiser » qui dispatche un `editor.dispatch({ changes: [...all], annotations: resetAnnotation.of(true) })` en une seule transaction (position-mapping reste cohérent).
- **CSS** : `.cm-zoneResetBtn` discret (couleur primary 70%, hover renforcé, focus-visible avec outline). Variante dark mode.

### Reste à faire

- Persistance localStorage des valeurs par zone : reportée en V2 (cf. Phase 2 notes).
- Badge « valeur par défaut » : skipé, le surlignage des zones suffit visuellement.

### Quality

- `pnpm check:incremental` : 9 errors / 47 warnings (vs 46 baseline → +1 warning sur un fichier inchangé, vraisemblablement effet cascade de svelte-check qui n'apparaît sur aucun des fichiers Phase 3 dans le grep).
- `npx eslint` : 0 issue sur les fichiers modifiés.
- `svelte-autofixer` : 0 issue sur la portion locked-zones du composant.

## Phase 4 — état final

### Ajouts dans `ExerciseForm.svelte`

- **Aide à la syntaxe** : `<details>` repliable sous le textarea `starter_code` qui décrit la syntaxe des marqueurs avec un exemple. Caché par défaut (ne pollue pas l'UI quand le teacher n'utilise pas la feature).
- **Validation en direct des marqueurs** : `$derived` qui parse `form.starter_code` à chaque keystroke. Si erreurs → banner rouge listant les messages + précision « tant que mal formé, l'exercice s'ouvre en mode dégradé côté élève ».
- **Prévisualisation côté élève** : si markers détectés et zéro erreur, un `LockedPythonEditor` est instancié juste sous le textarea, montrant exactement ce que l'élève verra (zones surlignées, boutons reset, toolbar). Le composant est re-mounted via `{#key form.starter_code}` à chaque modif pour rester synchrone.

### Détails

- Le `bind:value` du preview écrit dans une variable locale ignorée (`_starterPreviewSink`) — la valeur reconstruite n'est utile que dans le contexte élève.
- Pas de debounce sur le `{#key ...}` : le remount lazy-load les modules CodeMirror (cache après 1er load), donc ne coûte que la création d'un EditorView. Acceptable.

### Quality

- `pnpm check:incremental` : 9 errors / 47 warnings (inchangé vs Phase 3).
- `npx eslint` : 0 issue sur le fichier modifié.

## Fichiers modifiés (au fur et à mesure)

- ✅ `src/lib/utils/locked-zones.ts`
- ✅ `src/lib/utils/locked-zones.test.ts`
- ✅ `src/lib/components/python/LockedPythonEditor.svelte`
- ✅ `src/lib/components/python/exercises/ExerciseForm.svelte`
- ✅ `src/routes/(public)/python-exercises/[id]/+page.svelte`
- ✅ `docs/wip/python-locked-zones-progress.md`
