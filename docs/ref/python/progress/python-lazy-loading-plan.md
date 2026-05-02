# Python Playground - Lazy Loading & Plotly Implementation Plan

## Objectif

1. Réduire le temps de chargement initial de ~26 MB à ~10 MB
2. Charger les packages à la demande (numpy, matplotlib, sympy, plotly)
3. Ajouter le support Plotly pour les graphiques interactifs

## Tailles des packages (estimées)

| Package      | Taille compressée | Dépendances |
| ------------ | ----------------- | ----------- |
| Pyodide core | ~10 MB            | -           |
| numpy        | ~5 MB             | -           |
| matplotlib   | ~8 MB             | numpy, PIL  |
| sympy        | ~3 MB             | mpmath      |
| plotly       | ~3 MB             | -           |
| pandas       | ~5 MB             | numpy       |

## Architecture

### Nouveau workflow d'exécution

```
User clicks "Executer"
         │
         ▼
┌─────────────────────────────┐
│ loadPackagesFromImports()   │
│ Analyse: import numpy as np │
│ Détecte: numpy requis       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Package déjà chargé ?       │
├─────────────────────────────┤
│ OUI → continuer             │
│ NON → charger + UI feedback │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ executeCode()               │
└─────────────────────────────┘
```

### Nouveaux types de messages

```typescript
// Worker → Main Thread
| { type: 'packages-loading'; packages: string[]; id: string }
| { type: 'packages-loaded'; packages: string[]; id: string }
| { type: 'plotly'; jsonSpec: string; id: string }
```

## Modifications par fichier

### 1. `src/lib/types/python-worker.ts`

```typescript
// Ajouter aux messages
export interface PackagesLoadingMessage {
	type: 'packages-loading';
	packages: string[];
	id: string;
}

export interface PackagesLoadedMessage {
	type: 'packages-loaded';
	packages: string[];
	id: string;
}

export interface PlotlyMessage {
	type: 'plotly';
	jsonSpec: string;
	id: string;
}

// Modifier la config
export const PYODIDE_CONFIG = {
	CDN_URL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
	// Packages initiaux: VIDE - tout est lazy loaded
	INITIAL_PACKAGES: [] as const,
	// Packages supportés (pour loadPackagesFromImports)
	SUPPORTED_PACKAGES: ['numpy', 'matplotlib', 'sympy', 'plotly', 'pandas'] as const,
	TIMEOUT_MS: 30000
} as const;
```

### 2. `src/lib/workers/pyodide.worker.ts`

```typescript
// État pour tracker les packages chargés
let loadedPackages = new Set<string>();

async function initializePyodide(): Promise<void> {
	sendProgress(0, 'Initialisation...');

	const loadPyodide = await loadPyodideModule();
	sendProgress(30, 'Téléchargement de Python...');

	pyodide = await loadPyodide({
		indexURL: PYODIDE_CONFIG.CDN_URL
	});

	// NE PAS charger de packages ici
	// Configurer matplotlib en mode non-interactif (sera chargé plus tard si besoin)

	sendProgress(100, 'Prêt !');
	postMessage({ type: 'pyodide-ready' });
}

async function loadRequiredPackages(code: string, id: string): Promise<void> {
	if (!pyodide) return;

	// Utiliser l'API Pyodide pour détecter les imports
	const imports = pyodide
		.runPython(
			`
    import pyodide.code
    list(pyodide.code.find_imports(${JSON.stringify(code)}))
  `
		)
		.toJs() as string[];

	// Filtrer les packages pas encore chargés
	const packagesToLoad = imports.filter(
		(pkg) =>
			!loadedPackages.has(pkg) &&
			![
				'sys',
				'os',
				'io',
				'math',
				're',
				'json',
				'datetime',
				'random',
				'collections',
				'itertools',
				'functools'
			].includes(pkg)
	);

	if (packagesToLoad.length === 0) return;

	// Notifier le main thread
	postMessage({
		type: 'packages-loading',
		packages: packagesToLoad,
		id
	});

	// Charger les packages
	await pyodide.loadPackagesFromImports(code, {
		messageCallback: (msg: string) => {
			console.log('[Pyodide]', msg);
		}
	});

	// Tracker les packages chargés
	packagesToLoad.forEach((pkg) => loadedPackages.add(pkg));

	// Configuration post-chargement
	if (packagesToLoad.includes('matplotlib')) {
		await pyodide.runPythonAsync(`
      import matplotlib
      matplotlib.use('AGG')
      import matplotlib.pyplot as plt
      import warnings
      warnings.filterwarnings('ignore', message='.*Matplotlib.*using.*agg.*cannot show.*')
    `);
	}

	postMessage({
		type: 'packages-loaded',
		packages: packagesToLoad,
		id
	});
}

async function executeCode(code: string, id: string): Promise<void> {
	// NOUVEAU: Charger les packages requis avant exécution
	await loadRequiredPackages(code, id);

	// ... reste du code existant
}
```

### 3. Helpers Python pour Plotly

```python
# Ajouter dans pyodide.worker.ts (section Python helpers)

def _ubumaths_get_plotly_json():
    """Extract Plotly figure as JSON for client-side rendering."""
    try:
        import plotly.io as pio
        from plotly import graph_objects as go

        # Récupérer toutes les figures Plotly créées
        # Note: Plotly ne garde pas une liste globale, on utilise la dernière figure
        # Cette approche nécessite que l'utilisateur assigne sa figure
        if '_ubumaths_last_plotly_fig' in globals():
            fig = globals()['_ubumaths_last_plotly_fig']
            return pio.to_json(fig)
    except ImportError:
        pass
    except Exception as e:
        print(f"Plotly export error: {e}")
    return None

def _ubumaths_check_plotly_result(result):
    """Check if result is a Plotly figure and store it."""
    try:
        from plotly.graph_objs import Figure
        if isinstance(result, Figure):
            globals()['_ubumaths_last_plotly_fig'] = result
            return True
    except ImportError:
        pass
    return False
```

### 4. `src/lib/stores/pythonPlayground.svelte.ts`

```typescript
// Ajouter au state
packagesLoading = $state<string[]>([]);
loadedPackages = $state<string[]>([]);

// Ajouter aux messages
case 'packages-loading':
  if (message.id === this.currentExecutionId) {
    this.packagesLoading = message.packages;
    this.loadingStage = `Chargement de ${message.packages.join(', ')}...`;
  }
  break;

case 'packages-loaded':
  if (message.id === this.currentExecutionId) {
    this.packagesLoading = [];
    this.loadedPackages = [...new Set([...this.loadedPackages, ...message.packages])];
  }
  break;

case 'plotly':
  if (message.id === this.currentExecutionId) {
    this.plotlyData = message.jsonSpec;
  }
  break;
```

### 5. `src/lib/components/python/PythonOutput.svelte`

```svelte
<script lang="ts">
	// Ajouter prop
	let { plotlyData = null as string | null } = $props();

	// Lazy load Plotly renderer
	let PlotlyComponent: (typeof import('...'))['default'] | null = $state(null);

	$effect(() => {
		if (plotlyData && !PlotlyComponent) {
			// Lazy import de la lib de rendu Plotly
			import('plotly.js-dist-min').then((module) => {
				PlotlyComponent = module;
			});
		}
	});
</script>

{#if plotlyData}
	<div>
		<div class="mb-1">
			<span class="text-xs font-medium text-muted-foreground">Graphique Plotly</span>
		</div>
		<div id="plotly-container" class="rounded border bg-white"></div>
	</div>
{/if}
```

### 6. Rendu Plotly côté client

Option A: Utiliser `plotly.js-dist-min` (~1MB)

```bash
pnpm add plotly.js-dist-min
```

Option B: Charger depuis CDN (recommandé pour lazy loading)

```svelte
<script>
	let plotlyLoaded = $state(false);

	$effect(() => {
		if (plotlyData && !plotlyLoaded) {
			const script = document.createElement('script');
			script.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
			script.onload = () => {
				plotlyLoaded = true;
				renderPlot();
			};
			document.head.appendChild(script);
		}
	});

	function renderPlot() {
		if (window.Plotly && plotlyData) {
			const spec = JSON.parse(plotlyData);
			window.Plotly.newPlot('plotly-container', spec.data, spec.layout);
		}
	}
</script>
```

## Diagramme de séquence

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│   User   │          │  Store   │          │  Worker  │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │ Click "Executer"    │                     │
     │────────────────────►│                     │
     │                     │ execute(code)       │
     │                     │────────────────────►│
     │                     │                     │
     │                     │                     │ find_imports(code)
     │                     │                     │ → ['numpy', 'plotly']
     │                     │                     │
     │                     │ packages-loading    │
     │                     │◄────────────────────│
     │ "Chargement..."     │                     │
     │◄────────────────────│                     │
     │                     │                     │
     │                     │                     │ loadPackage(['numpy'])
     │                     │                     │ loadPackage(['plotly'])
     │                     │                     │
     │                     │ packages-loaded     │
     │◄────────────────────│◄────────────────────│
     │                     │                     │
     │                     │                     │ exec(code)
     │                     │                     │
     │                     │ plotly: {json}      │
     │◄────────────────────│◄────────────────────│
     │                     │                     │
     │ Render Plotly       │                     │
     │                     │                     │
```

## Tests

1. **Chargement initial** : Vérifier que seul Pyodide core est chargé
2. **Premier import numpy** : Vérifier le chargement à la demande
3. **Second exécution avec numpy** : Vérifier que le cache fonctionne
4. **Import plotly** : Vérifier le rendu interactif

## Migration

1. Déployer en mode feature flag d'abord
2. A/B test pour mesurer l'amélioration du temps de chargement
3. Rollout progressif

## Risques et mitigations

| Risque            | Mitigation                                      |
| ----------------- | ----------------------------------------------- |
| Premier plot lent | Précharger matplotlib en background après ready |
| UX dégradée       | Indicateur de progression clair                 |
| Cache navigateur  | Pyodide gère le cache automatiquement           |

## Estimation

| Tâche               | Effort  |
| ------------------- | ------- |
| Worker lazy loading | 2h      |
| Types & store       | 1h      |
| Plotly support      | 2h      |
| Output component    | 1h      |
| Tests               | 2h      |
| Documentation       | 1h      |
| **Total**           | **~9h** |
