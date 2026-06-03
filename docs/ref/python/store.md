# Python Playground — Store

Documentation de `src/lib/stores/pythonPlayground.svelte.ts` (≈ 1 000 lignes), le store réactif du playground Python.

> Pour le notebook, voir `src/lib/stores/notebookStore.svelte.ts` (mêmes patterns, contexte persistant). Pour le debugger, voir `src/lib/stores/pythonDebug.svelte.ts`. Ces 3 stores partagent la même brique d'exécution : voir [`worker.md § Executor pattern`](./worker.md#executor-pattern-côté-main-thread).

---

## Vue d'ensemble

`PythonPlaygroundStore` est une **classe Svelte 5** exposée en singleton :

```typescript
import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
```

Le store **délègue toute l'exécution** à un `PlaygroundExecutor` privé (`this._executor`) et ajoute la couche **playground-specific** :

- Persistance localStorage (code + paramètres éditeur)
- Sync paramètres en DB (`profiles.python_settings`) pour les utilisateurs connectés
- Cloud files (`python_files`) : load, save, update, delete, prompt migration localStorage → cloud
- URL sharing (LZ-String)
- Thèmes éditeur (12 thèmes)
- Font size (10-24)

L'état réactif (`state`, `stdout`, `plotData`, …) est **forwardé** depuis l'executor via des `get …()`. Aucun `$state` redéclaré dans le store pour les champs d'exécution.

---

## Hiérarchie

```
pythonStore (PythonPlaygroundStore, singleton)
   │
   ├─ this._executor: PlaygroundExecutor    ← gère le Web Worker
   │     ├─ state, stdout, stderr, plotData, …  (réactif Svelte 5)
   │     └─ execute(), cancel(), requestCompletion(), …
   │
   └─ Couche playground (ce store)
         ├─ code (= éditeur)
         ├─ fontSize, editorTheme, showPedagogicErrors
         ├─ currentFile, isSaving, cloudError                  (cloud)
         ├─ localStorage : load/save debouncé 500 ms
         ├─ DB sync : PUT /api/profile/python-settings (1 s debounce)
         └─ generateShareUrl() / loadFromUrl() (LZ-String)
```

---

## État réactif

### Forwardé depuis l'executor (getters)

| Propriété           | Type                | Source                       |
| ------------------- | ------------------- | ---------------------------- |
| `state`             | `ExecutorState`     | `_executor.state`            |
| `stdout`            | `string`            | `_executor.stdout`           |
| `stderr`            | `string`            | `_executor.stderr`           |
| `plotData`          | `string \| null`    | base64 PNG matplotlib        |
| `plotlyData`        | `string \| null`    | JSON spec Plotly             |
| `latexOutput`       | `string \| null`    | LaTeX SymPy                  |
| `loadingProgress`   | `number` (0-100)    |                              |
| `loadingStage`      | `string`            |                              |
| `executionTime`     | `number` (ms)       |                              |
| `errorLine`         | `number \| null`    |                              |
| `packagesLoading`   | `string[]`          | Lazy-load en cours           |
| `loadedPackages`    | `string[]`          | Packages chargés (cumulatif) |
| `isReady`           | `boolean` (derived) |                              |
| `isExecuting`       | `boolean` (derived) |                              |
| `isLoading`         | `boolean` (derived) | Pyodide ou packages          |
| `hasError`          | `boolean` (derived) |                              |
| `hasOutput`         | `boolean` (derived) |                              |
| `isLoadingPackages` | `boolean` (derived) |                              |

### Local au store (Svelte 5 runes)

| Propriété             | Type                 | Défaut         | Description                               |
| --------------------- | -------------------- | -------------- | ----------------------------------------- |
| `code`                | `string`             | `DEFAULT_CODE` | Code Python (exemple sin/Matplotlib)      |
| `showPedagogicErrors` | `boolean`            | `true`         | Affiche les messages d'erreur en français |
| `fontSize`            | `number`             | `14`           | Borné `[10, 24]`                          |
| `editorTheme`         | `EditorTheme`        | `'default'`    | Voir `EDITOR_THEMES` (12 entrées)         |
| `currentFile`         | `PythonFile \| null` | `null`         | Fichier cloud actuellement chargé         |
| `isSaving`            | `boolean`            | `false`        | Sauvegarde cloud en cours                 |
| `isLoadingFiles`      | `boolean`            | `false`        | Chargement liste cloud                    |
| `cloudError`          | `string \| null`     | `null`         | Erreur cloud à afficher                   |

### Derived locaux

```typescript
isModified = code !== _lastSavedCode;
hasCloudFile = currentFile !== null;
currentFileName = currentFile?.title ?? 'Sans titre';
isModifiedFromCloud = currentFile !== null && code !== currentFile.code;
```

---

## API publique

### Cycle de vie

```typescript
onMount(() => {
	pythonStore.initPyodide(); // Crée le worker + envoie 'init'
	pythonStore.initWithProfile(profile); // Charge les settings DB si connecté
});

onDestroy(() => {
	pythonStore.destroy(); // Termine worker + clear timeouts
});
```

### Exécution

| Méthode                                | Action                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `execute()`                            | Exécute `this.code` via l'executor                             |
| `cancel()`                             | Annule l'exécution courante                                    |
| `clearOutput()`                        | Vide stdout/stderr/plot/latex/plotly                           |
| `requestCompletion(code, cursor)`      | Auto-complétion (`Promise<CompletionItem[]>`, debounce 150 ms) |
| `startDebugSession(code, breakpoints)` | Démarre session debug                                          |
| `debugStep(action)`                    | Step Into / Over / Out / Continue                              |
| `stopDebugSession()`                   | Stoppe session debug                                           |

### Édition

| Méthode                  | Action                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| `setCode(code)`          | Met à jour le code + déclenche `saveToStorage` (debounce 500 ms) |
| `resetCode()`            | Réinitialise au `DEFAULT_CODE`                                   |
| `saveCode()` → `boolean` | Sauvegarde **immédiate** en localStorage (bypass debounce)       |

### Paramètres éditeur

| Méthode                   | Action                                      |
| ------------------------- | ------------------------------------------- |
| `increaseFontSize()`      | +2 px (max 24)                              |
| `decreaseFontSize()`      | −2 px (min 10)                              |
| `setTheme(theme)`         | Change le thème + persist localStorage + DB |
| `togglePedagogicErrors()` | Toggle messages français                    |

Tous ces setters déclenchent `saveToStorage()` qui debounce de 500 ms puis :

1. Sérialise `{ code, showPedagogicErrors, fontSize, editorTheme }` en localStorage (clé `ubumaths-python-playground`).
2. Si `userId` connu (utilisateur connecté), debounce 1 s puis `PUT /api/profile/python-settings` avec `{ editorTheme, fontSize, showPedagogicErrors }`.

### Cloud files

| Méthode                                         | Action                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `loadCloudFile(file: PythonFile)`               | Charge dans l'éditeur, `_lastSavedCode = file.code`                       |
| `loadExample(code: string)`                     | Charge un exemple statique (lib), comme un brouillon (currentFile = null) |
| `saveToCloud(title, description?, isPublic?)`   | `POST /api/python-files` si `currentFile === null`, sinon `PUT`           |
| `updateCloudFile(updates)`                      | `PUT /api/python-files/[id]` sur le fichier courant                       |
| `deleteCloudFile(id)`                           | `DELETE /api/python-files/[id]` + reset `currentFile` si match            |
| `newFile()`                                     | `currentFile = null`, code → DEFAULT_CODE                                 |
| `hasLocalCodeToMigrate()` → `boolean`           | Détecte du code localStorage ≠ `DEFAULT_CODE` (déclencheur du prompt)     |
| `getLocalCodeForMigration()` → `string \| null` | Renvoie le code localStorage à migrer                                     |
| `clearLocalStorageAfterMigration()`             | Reset localStorage au `DEFAULT_CODE` (anti-replay du prompt)              |

### URL sharing

| Méthode                             | Action                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `generateShareUrl()` → `string`     | LZ-String + `?code=…`. **Throw** si compressé > 2000 chars                  |
| `loadFromUrl(url: URL)` → `boolean` | Décompresse et remplit `code` ; `false` si param absent ou decompression KO |

### Initialisation profil

```typescript
initWithProfile(profile: Profile | null): void
```

- `profile === null` → mode anonyme, garde les settings localStorage chargés au constructor.
- `profile` présent → `userId = profile.id`, lit `profile.python_settings` (`{ editorTheme?, fontSize?, showPedagogicErrors? }`), valide (theme existant + fontSize ∈ `[10, 24]`) et applique.

Appelé par `PythonPlayground.svelte` en réception des props `user` / `profile` chargés par `+page.server.ts`.

---

## Persistance

### localStorage

```
Clé : 'ubumaths-python-playground'
Valeur : { code, showPedagogicErrors, fontSize?, editorTheme? }
```

Loadé au constructor (synchrone, fallback silencieux si JSON invalide). Sauvegardé via `saveToStorage()` (debounce 500 ms).

### DB sync (profil)

```
Endpoint : PUT /api/profile/python-settings
Body : { editorTheme, fontSize, showPedagogicErrors }
Trigger : tout setter de paramètre, si userId connu
Debounce : 1 000 ms (plus long que localStorage pour réduire les calls)
```

Cible la colonne `profiles.python_settings` (JSONB, migration `20251205160000_add_python_settings_to_profiles.sql`).

---

## Constantes exportées

```typescript
export const EDITOR_THEMES: { value: EditorTheme; label: string; dark: boolean }[]
//  12 entrées : default, oneDark, dracula, github, githubDark, nord,
//  solarizedLight, solarizedDark, material, materialDark, vscode, vscodeDark

export type EditorTheme  = 'default' | 'oneDark' | … | 'vscodeDark';
export type PlaygroundState = ExecutorState;  // alias rétro-compat
export type PythonFile = Database['public']['Tables']['python_files']['Row'];
```

Constantes internes :

```typescript
const STORAGE_KEY = 'ubumaths-python-playground';
const STORAGE_SAVE_DEBOUNCE_MS = 500; // localStorage
// (DB sync debounce inline : 1000)
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_THEME: EditorTheme = 'default';
```

---

## Exemple d'intégration minimale

```svelte
<script lang="ts">
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { user, profile } = $props();

	onMount(() => {
		pythonStore.initPyodide();
		pythonStore.initWithProfile(profile);
	});

	onDestroy(() => pythonStore.destroy());
</script>

<textarea bind:value={pythonStore.code} disabled={!pythonStore.isReady} />

<button onclick={() => pythonStore.execute()} disabled={!pythonStore.isReady}> Exécuter </button>

{#if pythonStore.isLoading}
	<p>{pythonStore.loadingStage} ({pythonStore.loadingProgress}%)</p>
{/if}

{#if pythonStore.stdout}
	<pre>{pythonStore.stdout}</pre>
{/if}

{#if pythonStore.plotData}
	<img src={pythonStore.plotData} alt="Graphique" />
{/if}

{#if pythonStore.latexOutput}
	<math-span>{pythonStore.latexOutput}</math-span>
{/if}
```

L'intégration complète (toolbar, splitter, dialogs cloud, debug panel, …) est dans `PythonPlayground.svelte` — voir [`components.md`](./components.md).

---

## Tests

```bash
pnpm test:client src/lib/stores/pythonPlayground.svelte.test.ts
# 61 tests : state transitions, localStorage, URL sharing, cloud lifecycle,
# autocomplete forwarding, font size bounds, theme validation
```

Le store debug a sa propre suite :

```bash
pnpm test:server src/lib/stores/pythonDebug.svelte.test.ts
```

---

## Pointeurs

- Worker / executor pattern → [`worker.md`](./worker.md)
- Composants Svelte → [`components.md`](./components.md)
- Vue fonctionnelle → [`README.md`](./README.md)
- Progress : [`progress/python-executor-pattern.md`](./progress/python-executor-pattern.md), [`progress/python-files-progress.md`](./progress/python-files-progress.md), [`progress/python-phase3-url-sharing.md`](./progress/python-phase3-url-sharing.md)
