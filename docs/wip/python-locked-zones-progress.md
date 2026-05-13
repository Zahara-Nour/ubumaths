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
| 5     | Zod refine + tests intégration             | ✅ Complétée            |
| 6     | Quality checks finaux + doc finale         | ✅ Complétée            |

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

## Phase 5 — état final

### Ajouts dans `python-exercises.ts` (server)

- **Helper `lockedZonesStarterRefine`** : appelle `parseTemplate(starter_code)` (le même utilitaire que les composants Svelte). Si erreurs, retourne `{ valid: false, message: ... }` avec la liste des erreurs concaténées.
- **`createExerciseSchema.superRefine`** : appelle le helper, ajoute une issue Zod avec `path: ['starter_code']` et le message en cas d'erreur.
- **`updateExerciseSchema.superRefine`** : même refine appliquée aux updates partiels (le `starter_code` est optionnel donc `null`/`undefined` est OK).

### Tests

- 8 nouveaux tests dans `python-exercises.test.ts` :
  - payload sans `starter_code` accepté
  - `starter_code` sans marqueur accepté
  - marqueurs bien formés acceptés
  - marqueur malformé (id invalide) rejeté avec issue sur `starter_code`
  - id dupliqué rejeté avec message en français (« plusieurs fois »)
  - marqueur non terminé rejeté
  - `updateExerciseSchema` applique le même refine

### Quality

- `pnpm test:server` : 51 tests (43 préexistants + 8 nouveaux), tous passent.
- `pnpm check:incremental` : 9 errors / 47 warnings (inchangé).
- `npx eslint` : 0 issue.

## Phase 6 — état final

### Code review final (groupé Phases 3+4+5)

- **#1 Remount du preview à chaque keystroke** → fix : debounce 500ms via `$state debouncedStarterCode` + `$effect` avec `setTimeout`. Le `{#key}` block et le `parseTemplate` utilisent maintenant la version debounced. Plus de flicker pendant la frappe.
- **#2 Click handler shift/middle-click** → noté, non-critique. Acceptable en l'état.
- **#3 Reset-all transaction batch** → confirmé safe : zones triées par construction, mapPos préserve l'ordre, pas de chevauchement.
- **#4 Import server-side de `parseTemplate`** → confirmé safe (aucune dépendance browser).
- **#5 `superRefine` + `optional().nullable()`** → composition correcte, le guard `starter == null` couvre les deux cas.
- **#6 Tests UI manquants** → reporté V2. Reco du reviewer : extraire le predicate `isChangeAllowed(changes, zones)` du closure CodeMirror en fonction pure testable, puis tester la fonction plutôt que le composant. Plus cost-effective que vitest-browser-svelte.

### Décisions reportées à V2

- Persistance localStorage des valeurs par zone (Phase 2 trade-off).
- Extraction du predicate de filter pour testabilité unitaire (review final #6).
- Migration des starters BAC existants vers la syntaxe `{{id | "default"}}` (recommandation initiale Q4 : séparée, ad-hoc, ~5 min/exo × 30 = 2.5h).

### Quality finale

- **Tests serveur** : 89 passants (38 locked-zones + 51 python-exercises validation).
- **Tests client** : aucun nouveau (le composant Svelte CodeMirror est testé manuellement).
- **`pnpm check:incremental`** : 9 errors / 48 warnings (vs baseline 46). Le +2 warnings n'est pas identifié sur les fichiers Phase 1-5 par grep ciblé — probable cascade svelte-check, à investiguer hors scope feature.
- **`npx eslint`** sur tous les fichiers modifiés : 0 issue.
- **`svelte-autofixer`** : 0 issue sur les portions locked-zones.

### Compatibilité finale

- **Rétro** : exos sans marqueurs continuent de fonctionner en édition libre (path PythonEditor inchangé).
- **Orthogonale aux 5 stratégies** (`output`, `unit_test`, `variable_check`, `reference_solution`, `ast_requirements`) : le code reconstruit est envoyé au worker exactement comme avant.
- **Anti-bypass** : verrouillage UI uniquement. Un élève motivé peut contourner via DevTools — acceptable car aucun résultat n'a de poids académique officiel. La feature protège contre la triche paresseuse (`return 7`).

## Fichiers modifiés (état final)

| Fichier                                                   | Type                              |
| --------------------------------------------------------- | --------------------------------- |
| `src/lib/utils/locked-zones.ts`                           | NOUVEAU (parser + reconstruction) |
| `src/lib/utils/locked-zones.test.ts`                      | NOUVEAU (38 tests)                |
| `src/lib/components/python/LockedPythonEditor.svelte`     | NOUVEAU (composant CodeMirror)    |
| `src/lib/components/python/exercises/ExerciseForm.svelte` | MODIFIÉ (preview + aide)          |
| `src/lib/server/validation/python-exercises.ts`           | MODIFIÉ (Zod refine)              |
| `src/lib/server/validation/python-exercises.test.ts`      | MODIFIÉ (+ 8 tests)               |
| `src/routes/(public)/python-exercises/[id]/+page.svelte`  | MODIFIÉ (switch éditeur)          |
| `docs/wip/python-locked-zones-progress.md`                | NOUVEAU (ce fichier)              |

## Commits

- `cc82a5eef` — Phase 1 : parser + reconstruction utilitaires purs
- `3d090cbab` — Phase 2 : LockedPythonEditor + intégration page élève
- `659144199` — Phase 3 : widgets reset par zone + toolbar globale
- `aa8a40d51` — Phase 4 : preview teacher + aide syntaxe
- `b14c77945` — Phase 5 : Zod refine côté serveur + 8 tests
- (à venir) — Phase 6 : debounce preview + doc finale

## Patch V1.1 — Garde-fou UI et déplacement du bouton « Appeler » (2026-05-14)

### Contexte

Régression remontée par l'utilisateur sur l'exo BAC `d535f6ae-d8bf-4daa-9d04-0176866f6d34` (Décongélation, validation `unit_test`) : un clic sur « Appeler » avant de remplir la zone du `while` déclenchait un timeout 5 s côté worker Pyodide. Cause racine : `bool(Ellipsis) is True` en Python — le placeholder pédagogique `while ...:` est un `while True:` exécutable qui boucle à l'infini.

### Approche retenue (Option A)

Préserver le placeholder pédagogique `...` (signal visuel « à compléter » très clair) et bloquer côté UI toute exécution tant que des zones sont à leur valeur par défaut. Justification utilisateur : « Quel est l'intérêt de faire un essai sans que tout ne soit complété ? ».

### Changements

1. **`LockedPythonEditor`** — nouveau prop `$bindable hasUnmodifiedZones: boolean`. Une `StateField` recompute les décorations à chaque `docChange` et applique `cm-lockedZone--unmodified` (fond ambre + outline pointillé) tant que le contenu d'une zone égale son `defaultValue`. L'updater calcule `anyUnmodified` à chaque keystroke et le remonte au parent.

2. **Page consultation `+page.svelte`** — `zonesBlocked = $derived(lockedZonesActive && hasUnmodifiedZones)`. Tous les boutons d'action (Run / Vérifier / Soumettre / Appeler) intègrent `zonesBlocked` dans leur `disabled`. Quand `zonesBlocked` est vrai, chaque bouton est enveloppé dans un `bits-ui` `Tooltip.Provider > Tooltip.Root` (snippet réutilisable `zonesTooltipWrap`) qui affiche au survol « Complète toutes les zones surlignées avant de tester. ». Le tooltip-trigger sit sur un `<span>` parent (workaround standard pour les boutons disabled qui ne propagent pas hover).

3. **Garde silencieuse `ensureZonesCompleted()`** — conservée pour le raccourci clavier Ctrl+Enter de CodeMirror qui contourne l'attribut `disabled` du bouton. Plus de toast : le tooltip prend le relais en feedback visuel.

4. **Migration `20260514011041_restore_locked_zones_while_ellipsis_default.sql`** — revert idempotent du fix précédent (`20260514010325`) qui forçait `"False"` sur les zones `while`. Restaure le placeholder original (`...`) maintenant que la sécurité runtime vient du blocage UI.

5. **Scripts** — `scripts/generate-bac-locked-zones-migration.ts` ne réécrit plus l'expression captée sur le `while` ; commentaire explicatif ajouté.

### Déplacement « Appeler » dans la toolbar de l'éditeur

Même session, follow-up UX. Le formulaire d'appel d'une fonction (`funcname(args)` + bouton) vivait sous l'éditeur dans un panneau dédié « Tester ma fonction ». Déplacé dans la toolbar au-dessus de l'éditeur :

- `flex items-center gap-2` : à gauche le formulaire d'appel (uniquement `isUnitTest`), à droite le bouton Réinitialiser (`ml-auto`).
- **Bouton « Appeler » réduit à l'icône `Play`** (`title="Appeler funcname"`, aria-label explicite). Plus de label "Appeler" / "Appel…" texte.
- **`funcname(...)`** affiché **uniquement si `callTakesArgs`** (au moins un test_case avec des args positionnels). Pour les fonctions parameterless, seule l'icône est rendue — la décoration `funcname()` était redondante avec le tooltip.
- Le panneau « Tester ma fonction » sous l'éditeur ne contient plus que le résultat / l'erreur / l'historique, et n'apparaît que lorsque l'élève a déjà appelé la fonction au moins une fois.

### Fichiers modifiés

- `src/lib/components/python/LockedPythonEditor.svelte` — `hasUnmodifiedZones` bindable, `StateField` décorations, CSS `.cm-lockedZone--unmodified`.
- `src/routes/(public)/python-exercises/[id]/+page.svelte` — `zonesBlocked` derived, snippet `zonesTooltipWrap` (Tooltip.Provider + Tooltip.Root + child-snippet pattern), boutons enveloppés conditionnellement, déplacement du formulaire d'appel dans la toolbar, panneau résultats conditionné sur la présence de contenu.
- `scripts/generate-bac-locked-zones-migration.ts` — préserve le placeholder original (commentaire explicatif).
- `supabase/migrations/20260514011041_restore_locked_zones_while_ellipsis_default.sql` — NOUVEAU.
- `docs/ref/python/README.md` — description « Tester ma fonction » mise à jour.

### Commits de ce patch

- `dd245f769` — feat : block run/submit while locked zones are untouched
- `c69a4cbdb` — feat : disable run/submit/call buttons with tooltip on unfilled zones
- `24560f61f` — fix : wrap zones tooltip in Tooltip.Provider (contexte bits-ui v2)
- `124e7dc53` — feat : move call-function form into the editor toolbar
- `6fe28ba4a` — fix : hide function-name notation when the call takes no args
