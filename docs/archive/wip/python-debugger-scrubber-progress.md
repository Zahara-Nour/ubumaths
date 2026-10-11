# Python Debugger — Scrubber temporel + transitions animées (Phase A)

> Chantier issu de l'analyse « meilleur outil de visualisation façon Python Tutor ».
> Branche : `feat/python-debugger-scrubber`. **Ne rien merger sans accord explicite.**

## Décisions (validées avec David)

- **Archi (A) enregistrer-puis-rejouer** : une passe déroule le générateur jusqu'à la fin (ou
  budget), collecte tous les snapshots → l'élève gratte librement.
- **Modèle UNIFIÉ à la Python Tutor (révisé avec David)** : un seul mode. Le bouton **Lancer** en
  mode Debug **enregistre tout**, puis on **navigue** dans l'enregistrement (scrubber + pas
  précédent/suivant, avant ET arrière). **Plus de bouton « Enregistrer » séparé** (ambigu vs
  sauvegarde). **Plus de step-into/over/out live.** Points d'arrêt → « sauter au prochain/précédent
  point d'arrêt dans la trace ». Clavier : F5 = enregistrer, Shift+F5 = effacer, F10/F11 =
  pas suivant/précédent.
- **Budget de pas = 1000** (`DEBUG_CONFIG.STEP_BUDGET`, comme Python Tutor). Au-delà : arrêt +
  `traceTruncated = true` + bannière.
- **Slider dans `DebugToolbar`**.
- **`prefers-reduced-motion: reduce` désactive les animations** (a11y).

## Pourquoi ces choix (recherche)

- Python Tutor n'a jamais livré ni animation ni vrai layout → ce sont nos différenciateurs.
- Trace immuable = modèle « omniscient debugging » ; socle nécessaire à l'arbre de récursion (#4).
- Le record-then-replay **ne touche pas au worker** : on auto-pilote `debug-step('step')` jusqu'à
  `debug-finished` (protocole existant). Optimisation batch worker = follow-up si latence.

## Découpage

### Étape 1 — Couche store (trace complète) ✅ FAIT (121 tests verts, check:incremental 0 erreur)

`src/lib/shared/python/debug/types.ts` : `MAX_HISTORY_SIZE: 10` → `STEP_BUDGET: 1000`.
`src/lib/stores/pythonDebug.svelte.ts` :

- trace complète (plus de drop circulaire ; stop au budget + flag `traceTruncated`).
- Couche chronologique par-dessus l'orientation interne (most-recent-first) pour ne casser aucun
  consommateur : `stepIndex`, `stepCount`, `trace`, `goToStep(i)`, `eventMarkers`, `isTraceFull`.
- Tests réécrits (section snapshots) + nouveaux tests scrubbing.

### Étape 2 — Record-then-replay (executor) ✅ FAIT (code) — ⏳ vérif visuelle

`playground-executor` : `recordDebugSession(code)` auto-pilote `debug-step('step')` dans
`onDebugPaused` jusqu'à `debug-finished`, s'arrête si `isTraceFull` (`finishRecording`), positionne
le scrubber à `goToStep(0)`. Flag store `isRecording` → spinner « Enregistrement… (N pas) » au lieu
de re-rendre le diagramme (coûteux) à chaque pas. Délégation `pythonStore.recordDebugSession` +
handler `handleDebugRecord` + gating du `DebugPanel` (mobile + desktop). Typecheck 0 erreur.

### Étape 3 — UI Scrubber + modèle unifié (`DebugToolbar`) ✅ FAIT (code) — ⏳ vérif visuelle

Réécrit **unifié** : plus de bouton « Enregistrer » ni de step-into/over/out live. Navigation dans
l'enregistrement : pas précédent/suivant (chevrons), saut au point d'arrêt précédent/suivant (rouge,
si `hasBreakpointInTrace`), Slider shadcn bindé à `stepIndex`, marqueurs colorés + légende,
play/pause (350 ms), compteur « Pas i/N », bannière si tronquée. `Lancer` (playground) →
`recordDebugSession`. Store : `goToNextBreakpointStep`/`goToPrevBreakpointStep`/`hasBreakpointInTrace`
(+5 tests). `svelte-autofixer` = 0 issue · check:incremental = 0 erreur · **127 tests verts**.

> **À vérifier sur `/python`** : mode Debug → écrire un petit programme → **Lancer** → spinner bref
> puis le scrubber ; glisser le curseur / Play rejoue le diagramme mémoire ; poser un point d'arrêt
> (gouttière) → boutons rouges sautent d'un arrêt à l'autre ; marqueurs aux appels/retours.

### Trous découverts au test David (2 corrigés, 1 à décider)

1. **Marqueurs verts/bleus absents** ✅ CORRIGÉ : le tracer worker n'émet que `line`/`start`/
   `exception`, jamais `call`/`return`. → `eventMarkers` **dérive call/return de la profondeur de
   pile** (`callStack.length` ↑ = appel, ↓ = retour). Sans toucher au worker. 128 tests verts.
2. **Pas à pas dans les fonctions** ✅ OK par design (entre tout seul) + **« step over » AJOUTÉ** :
   bouton ►► (`ChevronsRight`) → `debugStore.goToStepOver()` saute les frames plus profonds (jusqu'au
   prochain pas à la même profondeur de pile), fallback dernier pas. +3 tests.
3. **Points d'arrêt** ✅ GOUTTIÈRE AJOUTÉE : `PythonEditor` a maintenant une **gouttière breakpoint
   cliquable** (clic dans la marge → `onToggleBreakpoint` → `debugStore.toggleBreakpoint`), point
   rouge sur les lignes avec breakpoint, hint au survol. Marqueur `codemirror-breakpoint-marker.ts`.
   `PythonPlayground` passe `breakpoints={breakpointLines}` + handler aux 2 éditeurs. → les boutons
   rouges de saut deviennent utilisables.

### Étape 3.5 — RÉÉCRITURE DU MOTEUR : `sys.settrace` ✅ FAIT + VÉRIFIÉ (Pyodide réel)

**Cause racine trouvée** (test David « step into ne marche pas ») : l'ancien tracer était un
interpréteur AST maison qui **n'entrait PAS** dans les fonctions (`pass` explicite, `call_stack`
jamais rempli) → pas de step-into, pas de marqueurs call/return, _Frames_ vide, pas de récursion.

**Fix** : nouveau `_chiphre_record_trace(code, budget)` dans `pyodide.worker.ts` basé sur
`sys.settrace` (filtre `co_filename == '<chiphre-debug>'` → entre dans les fonctions user, pas dans
les libs). `_chiphre_debug_generator` enregistre tout puis _yield_ les snapshots — **plomberie
existante (messages/executor/store) inchangée**, ancien interpréteur AST devenu code mort (après
`return`). Skip de l'event `call` module à lineno 0 + clamp `max(1, f_lineno)`.

**Débloque d'un coup** (car `callStack` a enfin de vraies frames) : step-into (◄ ►), marqueurs
verts/bleus (appel/retour), panneau _Frames_ réel (locales de fonction), « step over » (vraie
profondeur), récursion.

**Vérif** : nouveau test **Pyodide réel** `debug-record-real.svelte.test.ts` (3 tests, RUN_PYODIDE_REAL=1) :
step-into (profondeur ≥ 2, events call/return, frame `somme`), récursion (≥ 3), pas de descente lib
(script plat = profondeur 1), aucun snapshot rejeté. + messages.debug 70 ✓, worker.debug 41 ✓,
check:incremental 0 erreur.

**Dette/suites** : (1) l'indicateur de boucle (`loops`) est vide en V1 settrace (à réimplémenter si
besoin) ; (2) ancien interpréteur AST = code mort à retirer ; (3) perf : ~1000 aller-retours
postMessage (drive `step`) — optimisable en 1 seul message `debug-record` plus tard.

### Étape 3.6 — Mode LIVE (auto-record) ✅ FAIT (code) — ⏳ vérif visuelle

Décision David : plus de bouton « Lancer » à presser. En mode Debug, `PythonPlayground` enregistre
automatiquement (`$effect` sur `pythonStore.code` + `isDebugging`, debounce 600 ms) → à l'entrée ET
à chaque modif du code, comme Python Tutor. Gardes : anti-doublon (`lastRecordedCode`), anti-course
(retry si `isRecording`), reset au sortir du mode Debug. `handleDebugRun` met à jour `lastRecordedCode`
(le bouton Lancer reste un « forcer maintenant »). Message de barre ajusté (« enregistré
automatiquement »). autofixer 0 issue · check:incremental 0 erreur.

### Étape 4 — Animation (`MemoryDiagramView`) ⏳

`animate:flip` sur les cartes heap (clé = `id()`), `crossfade` des valeurs, recalcul des flèches
pendant la transition, respect `prefers-reduced-motion`, anti-empilement au scrub rapide.

## Definition of Done

- [ ] Tests store verts (`pnpm test:client src/lib/stores/__tests__/pythonDebug.svelte.test.ts`)
- [ ] `svelte-autofixer` sur les `.svelte` modifiés · `pnpm check:incremental` = 0 erreur
- [ ] `code-reviewer` en fin de phase
- [ ] Vérif manuelle du rendu animé + scrubber sur `/python`
