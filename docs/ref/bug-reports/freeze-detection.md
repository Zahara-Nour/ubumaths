# Bug Reports - Freeze Detection System

> Systeme client-side de detection des freezes UI avec reporting automatique.

## Table des matieres

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Long Task Observer](#long-task-observer)
- [Heartbeat System](#heartbeat-system)
- [Activity Tracking](#activity-tracking)
- [Web Vitals Integration](#web-vitals-integration)
- [State Management](#state-management)
- [Callbacks](#callbacks)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [False Positive Prevention](#false-positive-prevention)

---

## Vue d'ensemble

Le systeme de detection des freezes surveille la reactivite de l'interface utilisateur en utilisant deux mecanismes complementaires:

1. **Long Task Observer** - Detecte les taches JavaScript bloquant le main thread
2. **Heartbeat System** - Detecte les freezes complets par derive de setTimeout

### Seuils

| Seuil       | Duree  | Action                     |
| ----------- | ------ | -------------------------- |
| Notable     | >100ms | Log en memoire             |
| Error       | >500ms | Log dans error monitoring  |
| Prompt      | >15s   | Affiche dialog utilisateur |
| Auto-report | >30s   | Cree rapport silencieux    |

### Diagramme de flux

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Page Load                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ initFreezeDetection()│
                         └──────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
   │ Long Task       │   │   Heartbeat     │   │   Activity      │
   │ Observer        │   │   System        │   │   Tracking      │
   │                 │   │                 │   │                 │
   │ PerformanceObs  │   │ setTimeout      │   │ Event listeners │
   │ 'longtask'      │   │ every 2s        │   │ click, input,   │
   │                 │   │                 │   │ scroll, nav     │
   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
            │                     │                     │
            ▼                     ▼                     ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                    State (in-memory)                        │
   │  • freezeEvents[]  • actions[]  • webVitals  • isUnresponsive│
   └─────────────────────────────────────────────────────────────┘
            │                     │
            ▼                     ▼
   ┌─────────────────┐   ┌─────────────────┐
   │ sessionStorage  │   │   Callbacks     │
   │ (persistence)   │   │                 │
   │                 │   │ onFreezePrompt  │
   │                 │   │ onAutoReport    │
   └─────────────────┘   └─────────────────┘
```

---

## Architecture

### Fichiers

| Fichier                                  | Description            |
| ---------------------------------------- | ---------------------- |
| `src/lib/utils/freezeDetection.ts`       | Logique principale     |
| `src/lib/stores/activityStore.svelte.ts` | Store reactif Svelte 5 |

### Dependances

```typescript
import { browser } from '$app/environment';
// No external dependencies - uses native APIs:
// - PerformanceObserver (Long Task API)
// - setTimeout (Heartbeat)
// - addEventListener (Activity tracking)
// - sessionStorage (Persistence)
```

---

## Long Task Observer

Utilise l'API Long Task pour detecter les taches JavaScript qui bloquent le main thread.

### Principe

Le navigateur considere une tache "longue" si elle depasse 50ms. Notre implementation ajoute des seuils supplementaires:

```typescript
const LONG_TASK_THRESHOLD_MS = 100; // Log as notable
const LONG_TASK_ERROR_THRESHOLD_MS = 500; // Log to error monitoring
```

### Implementation

```typescript
function initLongTaskObserver(): void {
	if (!browser || !('PerformanceObserver' in window)) return;

	try {
		longTaskObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const duration = entry.duration;

				if (duration > LONG_TASK_THRESHOLD_MS) {
					// Create freeze event
					const event: FreezeEvent = {
						id: generateId(),
						timestamp: new Date().toISOString(),
						duration,
						type: 'long_task',
						context: {
							url: window.location.href,
							lastAction: getLastAction()?.type
						}
					};

					addFreezeEvent(event);

					// Log to error monitoring if very long
					if (duration > LONG_TASK_ERROR_THRESHOLD_MS) {
						capturePerformance('long_task', duration, LONG_TASK_ERROR_THRESHOLD_MS, {
							url: window.location.href,
							lastAction: getLastAction()?.type
						});
					}
				}
			}
		});

		longTaskObserver.observe({ entryTypes: ['longtask'] });
	} catch {
		console.debug('[Freeze Detection] Long Task Observer not supported');
	}
}
```

### Compatibilite navigateur

| Navigateur | Support          |
| ---------- | ---------------- |
| Chrome     | Oui (depuis v58) |
| Edge       | Oui              |
| Firefox    | Non              |
| Safari     | Non              |

> Le systeme fonctionne toujours sans Long Task Observer grace au Heartbeat.

---

## Heartbeat System

Detecte les freezes complets en mesurant la derive de setTimeout.

### Principe

Un setTimeout de 2000ms devrait s'executer apres ~2000ms. Si le main thread est bloque, l'execution sera retardee. La difference (drift) indique la duree du freeze.

```
Expected:  |----2000ms----|
                          ^ callback should fire here

Frozen:    |----2000ms----|====FREEZE 15s====|
                                              ^ callback actually fires here
                                              drift = 15000ms
```

### Implementation

```typescript
const HEARTBEAT_INTERVAL_MS = 2000;
const FREEZE_PROMPT_THRESHOLD_MS = 15000;
const FREEZE_AUTO_REPORT_THRESHOLD_MS = 30000;

let expectedHeartbeatTime = 0;

function initHeartbeat(): void {
	if (!browser) return;

	expectedHeartbeatTime = Date.now() + HEARTBEAT_INTERVAL_MS;

	const checkHeartbeat = (): void => {
		const now = Date.now();
		const drift = now - expectedHeartbeatTime;

		if (drift > FREEZE_PROMPT_THRESHOLD_MS) {
			state.isUnresponsive = true;

			const freezeEvent: FreezeEvent = {
				id: generateId(),
				timestamp: new Date(expectedHeartbeatTime).toISOString(),
				duration: drift,
				type: 'unresponsive',
				context: {
					url: window.location.href,
					lastAction: getLastAction()?.type
				}
			};

			addFreezeEvent(freezeEvent);

			// Decide action based on duration
			if (drift > FREEZE_AUTO_REPORT_THRESHOLD_MS) {
				// Auto report (> 30s)
				onAutoReport?.(drift, { ...state });
			} else {
				// Prompt user (> 15s)
				onFreezePrompt?.(drift, freezeEvent);
			}
		} else {
			state.isUnresponsive = false;
		}

		state.lastHeartbeat = now;
		expectedHeartbeatTime = now + HEARTBEAT_INTERVAL_MS;
		heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
	};

	heartbeatTimeout = setTimeout(checkHeartbeat, HEARTBEAT_INTERVAL_MS);
}
```

### Avantages

- Fonctionne sur tous les navigateurs
- Detecte les freezes complets (JS + rendering)

### Prevention des faux positifs

Le systeme heartbeat est inherement susceptible aux faux positifs car de nombreux facteurs peuvent retarder les timers sans qu'il y ait de freeze reel. Voir [False Positive Prevention](#false-positive-prevention) pour les details.

---

## Activity Tracking

Enregistre les actions utilisateur pour fournir du contexte de debugging.

### Actions trackees

| Type         | Trigger                   | Debounce            |
| ------------ | ------------------------- | ------------------- |
| `click`      | click event               | Non                 |
| `input`      | input event               | 500ms               |
| `scroll`     | scroll event              | 500ms + 2s cooldown |
| `navigation` | Navigation API / popstate | Non                 |

### Implementation

```typescript
const MAX_ACTIONS = 20;

function initActivityTracking(): void {
	if (!browser || activityInitialized) return;
	activityInitialized = true;

	// Track clicks
	document.addEventListener(
		'click',
		(e) => {
			const target = e.target as HTMLElement;
			if (target) {
				addAction({
					type: 'click',
					target: getSimpleSelector(target)
				});
			}
		},
		{ passive: true, capture: true }
	);

	// Track inputs (debounced)
	let inputTimeout: ReturnType<typeof setTimeout>;
	document.addEventListener(
		'input',
		(e) => {
			clearTimeout(inputTimeout);
			inputTimeout = setTimeout(() => {
				const target = e.target as HTMLElement;
				if (target) {
					addAction({
						type: 'input',
						target: getSimpleSelector(target)
					});
				}
			}, 500);
		},
		{ passive: true, capture: true }
	);

	// Track scroll (debounced with cooldown)
	let scrollTimeout: ReturnType<typeof setTimeout>;
	let lastScrollTime = 0;
	window.addEventListener(
		'scroll',
		() => {
			const now = Date.now();
			if (now - lastScrollTime > 2000) {
				clearTimeout(scrollTimeout);
				scrollTimeout = setTimeout(() => {
					addAction({ type: 'scroll', target: 'window' });
					lastScrollTime = now;
				}, 500);
			}
		},
		{ passive: true }
	);

	// Track navigation
	if ('navigation' in window) {
		window.navigation.addEventListener('navigate', (e) => {
			addAction({
				type: 'navigation',
				target: e.destination?.url || window.location.href
			});
		});
	} else {
		window.addEventListener('popstate', () => {
			addAction({
				type: 'navigation',
				target: window.location.href
			});
		});
	}
}
```

### Selector extraction

```typescript
function getSimpleSelector(el: HTMLElement): string {
	if (el.id) return `#${el.id}`;
	if (el.className && typeof el.className === 'string') {
		const firstClass = el.className.split(' ')[0];
		if (firstClass) return `.${firstClass}`;
	}
	return el.tagName.toLowerCase();
}
```

---

## Web Vitals Integration

Integration avec le systeme de Web Vitals existant.

### Metriques supportees

| Metrique | Description               | Seuil "good" |
| -------- | ------------------------- | ------------ |
| LCP      | Largest Contentful Paint  | < 2.5s       |
| FID      | First Input Delay         | < 100ms      |
| CLS      | Cumulative Layout Shift   | < 0.1        |
| FCP      | First Contentful Paint    | < 1.8s       |
| TTFB     | Time to First Byte        | < 800ms      |
| INP      | Interaction to Next Paint | < 200ms      |

### API

```typescript
/**
 * Report a Web Vital metric
 * Called from errorMonitoring.ts
 */
export function reportWebVital(name: string, value: number): void {
	const vitalName = name.toUpperCase() as keyof WebVitalsData;
	if (['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'].includes(vitalName)) {
		state.webVitals[vitalName] = value;
		persistState();
	}
}
```

---

## State Management

### Structure du state

```typescript
interface FreezeStoreState {
	freezeEvents: FreezeEvent[]; // Max 50 events
	actions: UserAction[]; // Max 20 actions
	webVitals: WebVitalsData;
	isUnresponsive: boolean;
	lastHeartbeat: number;
}

const state: FreezeStoreState = {
	freezeEvents: [],
	actions: [],
	webVitals: {},
	isUnresponsive: false,
	lastHeartbeat: Date.now()
};
```

### Persistence (sessionStorage)

Les donnees sont persistees dans `sessionStorage` pour survivre aux refreshes:

```typescript
const SESSION_STORAGE_KEY = 'ubumaths_freeze_data';

function persistState(): void {
	if (!browser) return;

	try {
		const dataToStore = {
			freezeEvents: state.freezeEvents,
			actions: state.actions,
			webVitals: state.webVitals
		};
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToStore));
	} catch {
		// Ignore storage errors (quota, private mode, etc.)
	}
}

function restoreState(): void {
	if (!browser) return;

	try {
		const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
		if (stored) {
			const data = JSON.parse(stored);
			state.freezeEvents = data.freezeEvents || [];
			state.actions = data.actions || [];
			state.webVitals = data.webVitals || {};
		}
	} catch {
		// Ignore parse errors
	}
}
```

### Retention

Les freeze events de plus de 15 minutes sont nettoyes a l'initialisation:

```typescript
const FREEZE_RETENTION_MS = 15 * 60 * 1000; // 15 minutes

// On init
const cutoff = Date.now() - FREEZE_RETENTION_MS;
state.freezeEvents = state.freezeEvents.filter((e) => new Date(e.timestamp).getTime() > cutoff);
```

---

## Callbacks

### onFreezePrompt

Appele quand un freeze de plus de 15s (mais moins de 30s) est detecte.

```typescript
type FreezeCallback = (duration: number, context: FreezeEvent) => void;

let onFreezePrompt: FreezeCallback | null = null;

export function setFreezePromptCallback(callback: FreezeCallback): void {
	onFreezePrompt = callback;
}
```

**Usage:**

```typescript
setFreezePromptCallback((duration, context) => {
	freezeDuration = duration;
	freezePromptOpen = true;
});
```

### onAutoReport

Appele quand un freeze de plus de 30s est detecte. Le rapport est cree silencieusement.

```typescript
type AutoReportCallback = (duration: number, context: FreezeStoreState) => Promise<void>;

let onAutoReport: AutoReportCallback | null = null;

export function setAutoReportCallback(callback: AutoReportCallback): void {
	onAutoReport = callback;
}
```

**Usage:**

```typescript
setAutoReportCallback(async (duration, context) => {
	await fetch('/api/bug-reports', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			category: 'bug',
			severity: 'high',
			title: `Application figee pendant ${Math.round(duration / 1000)}s`,
			description:
				"Rapport genere automatiquement suite a une non-reponse prolongee de l'application.",
			autoGenerated: true,
			pageUrl: window.location.href,
			sessionContext: {
				freezeEvents: context.freezeEvents,
				recentActions: context.actions,
				webVitals: context.webVitals
			}
		})
	});
});
```

---

## API Reference

### Initialization

```typescript
/**
 * Initialize all freeze detection systems
 * Call once on app mount
 */
export function initFreezeDetection(): void;

/**
 * Cleanup freeze detection systems
 * Call on app unmount
 */
export function cleanupFreezeDetection(): void;
```

### Getters

```typescript
/**
 * Get recent freeze events (within retention period)
 */
export function getRecentFreezeEvents(): FreezeEvent[];

/**
 * Get recent user actions
 */
export function getRecentActions(): UserAction[];

/**
 * Get current web vitals
 */
export function getWebVitals(): WebVitalsData;

/**
 * Check if currently unresponsive
 */
export function isUnresponsive(): boolean;

/**
 * Get full context for bug report
 */
export function getFreezeDetectionContext(): {
	freezeEvents: FreezeEvent[];
	recentActions: UserAction[];
	webVitals: WebVitalsData;
};
```

### Setters

```typescript
/**
 * Set callback for freeze prompt (> 15s)
 */
export function setFreezePromptCallback(callback: FreezeCallback): void;

/**
 * Set callback for auto report (> 30s)
 */
export function setAutoReportCallback(callback: AutoReportCallback): void;

/**
 * Update web vitals (called from errorMonitoring)
 */
export function updateWebVitals(vitals: Partial<WebVitalsData>): void;

/**
 * Report a single web vital
 */
export function reportWebVital(name: string, value: number): void;
```

---

## Configuration

### Constantes

```typescript
// Detection thresholds
const LONG_TASK_THRESHOLD_MS = 100; // Log as notable
const LONG_TASK_ERROR_THRESHOLD_MS = 500; // Log to error monitoring
const HEARTBEAT_INTERVAL_MS = 2000; // Check interval
const FREEZE_PROMPT_THRESHOLD_MS = 15000; // Show prompt
const FREEZE_AUTO_REPORT_THRESHOLD_MS = 30000; // Auto report

// Limits
const MAX_ACTIONS = 20; // Keep last N actions
const MAX_FREEZE_EVENTS = 50; // Keep last N events
const FREEZE_RETENTION_MS = 15 * 60 * 1000; // 15 min retention

// Storage
const SESSION_STORAGE_KEY = 'ubumaths_freeze_data';
```

### Modifier les seuils

Pour modifier les seuils, editer directement `src/lib/utils/freezeDetection.ts`:

```typescript
// Exemple: Reduire le seuil de prompt a 10s
const FREEZE_PROMPT_THRESHOLD_MS = 10000;
```

> **Note**: Les seuils sont intentionnellement eleves (15s/30s) pour eviter les faux positifs. Un freeze de 15s est clairement anormal et merite d'etre signale.

---

## Types

### FreezeEvent

```typescript
interface FreezeEvent {
	id: string; // Unique identifier
	timestamp: string; // ISO timestamp
	duration: number; // Duration in ms
	type: 'long_task' | 'unresponsive'; // Detection method
	context?: {
		url?: string; // Page URL
		lastAction?: string; // Last user action type
	};
}
```

### UserAction

```typescript
interface UserAction {
	type: 'click' | 'input' | 'navigation' | 'scroll';
	target: string; // CSS selector
	timestamp: string; // ISO timestamp
}
```

### WebVitalsData

```typescript
interface WebVitalsData {
	LCP?: number; // Largest Contentful Paint (ms)
	FID?: number; // First Input Delay (ms)
	CLS?: number; // Cumulative Layout Shift (score)
	FCP?: number; // First Contentful Paint (ms)
	TTFB?: number; // Time to First Byte (ms)
	INP?: number; // Interaction to Next Paint (ms)
}
```

---

## Exemple complet d'integration

```svelte
<!-- src/routes/(protected)/dashboard/+layout.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		initFreezeDetection,
		cleanupFreezeDetection,
		setFreezePromptCallback,
		setAutoReportCallback,
		getFreezeDetectionContext
	} from '$lib/utils/freezeDetection';
	import FreezeReportPrompt from '$lib/components/bug-reports/FreezeReportPrompt.svelte';
	import BugReportDialog from '$lib/components/bug-reports/BugReportDialog.svelte';
	import BugReportFAB from '$lib/components/bug-reports/BugReportFAB.svelte';

	let freezePromptOpen = $state(false);
	let freezeDuration = $state(0);
	let bugReportOpen = $state(false);
	let autoGenerated = $state(false);
	let initialDescription = $state('');

	$effect(() => {
		// Initialize freeze detection
		initFreezeDetection();

		// Handle 15s+ freeze: show prompt
		setFreezePromptCallback((duration, context) => {
			freezeDuration = duration;
			freezePromptOpen = true;
		});

		// Handle 30s+ freeze: auto-report
		setAutoReportCallback(async (duration, stateContext) => {
			try {
				await fetch('/api/bug-reports', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						category: 'bug',
						severity: 'high',
						title: `Application figee pendant ${Math.round(duration / 1000)}s`,
						description: `Rapport automatique genere suite a un freeze de ${Math.round(duration / 1000)} secondes.`,
						autoGenerated: true,
						pageUrl: window.location.href,
						userAgent: navigator.userAgent,
						viewportSize: `${window.innerWidth}x${window.innerHeight}`,
						sessionContext: {
							freezeEvents: stateContext.freezeEvents,
							recentActions: stateContext.actions,
							webVitals: stateContext.webVitals
						}
					})
				});
			} catch (error) {
				console.error('[Freeze Detection] Auto-report failed:', error);
			}
		});

		return () => cleanupFreezeDetection();
	});

	function handleFreezeReport() {
		autoGenerated = true;
		initialDescription = `L'application s'est figee pendant ${Math.round(freezeDuration / 1000)} secondes.

## Contexte
Cette erreur a ete detectee automatiquement par le systeme de monitoring.`;
		freezePromptOpen = false;
		bugReportOpen = true;
	}
</script>

<slot />

<!-- FAB always visible -->
<BugReportFAB
	onclick={() => {
		autoGenerated = false;
		initialDescription = '';
		bugReportOpen = true;
	}}
/>

<!-- Normal bug report dialog -->
<BugReportDialog
	bind:open={bugReportOpen}
	onOpenChange={(open) => (bugReportOpen = open)}
	{autoGenerated}
	{initialDescription}
/>

<!-- Freeze prompt dialog -->
<FreezeReportPrompt
	bind:open={freezePromptOpen}
	onOpenChange={(open) => (freezePromptOpen = open)}
	{freezeDuration}
	onSubmit={handleFreezeReport}
/>
```

---

## Debugging

### Console logs

En mode developpement, des logs sont emis:

```
[Freeze Detection] Initialized
[Freeze Detection] Long Task Observer not supported  // Firefox/Safari
```

### Inspecter le state

```javascript
// Dans la console du navigateur
const stored = sessionStorage.getItem('ubumaths_freeze_data');
console.log(JSON.parse(stored));
```

### Simuler un freeze

```javascript
// Bloquer le main thread pendant 20s
const start = Date.now();
while (Date.now() - start < 20000) {
	// Busy wait
}
// -> Devrait declencher onFreezePrompt
```

### Verifier les Long Tasks

```javascript
// Observer les long tasks manuellement
const observer = new PerformanceObserver((list) => {
	for (const entry of list.getEntries()) {
		console.log('Long task:', entry.duration, 'ms');
	}
});
observer.observe({ entryTypes: ['longtask'] });
```

---

## False Positive Prevention

Le systeme de heartbeat est inherement susceptible aux faux positifs car de nombreux facteurs peuvent retarder les timers JavaScript sans qu'il y ait de freeze reel de l'interface.

### Sources de faux positifs

#### 1. Background Tab Throttling

Les navigateurs throttlent agressivement les timers des onglets en arriere-plan pour economiser les ressources.

| Navigateur | Comportement                                                                    |
| ---------- | ------------------------------------------------------------------------------- |
| Chrome     | "Intensive throttling" apres 5 min hidden + 30s silent → timers verifies 1x/min |
| Firefox    | Throttling similaire pour les onglets inactifs                                  |
| Safari     | Throttling agressif, surtout sur iOS                                            |

**Exceptions au throttling:**

- Onglets jouant de l'audio
- WebSockets/WebRTC actifs
- Web Workers (non throttles)

> **Reference:** [Chrome Timer Throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)

#### 2. Computer Sleep/Wake

Quand l'ordinateur passe en veille:

- Aucun evenement `visibilitychange` n'est emis
- Les timers sont simplement retardes, pas les taches JS
- `performance.now()` peut se comporter differemment selon la plateforme

| Plateforme | Comportement de performance.now()                          |
| ---------- | ---------------------------------------------------------- |
| Windows    | Timers retardes pendant le sleep                           |
| Linux      | Timers fires immediatement au wake si dus pendant le sleep |
| macOS      | Possible drift de l'horloge monotonique                    |

> **Reference:** [Medium - Detecting Computer Wake](https://medium.com/@erlan.zharkeev/how-to-detect-when-a-computer-wakes-up-from-sleep-my-experience-solving-the-problem-with-6639f79e5275)

#### 3. Page Visibility API Edge Cases

L'API `visibilitychange` ne couvre pas tous les cas:

- `pagehide` est plus fiable dans certains navigateurs
- Les lecteurs d'ecran peuvent definir `hidden=false` meme si la page est masquee
- `focus`/`blur` ≠ visibilite (une page peut etre visible mais non focusee)

> **Reference:** [trivago - Page Visibility API](https://tech.trivago.com/post/2020-11-17-exploringthepagevisibilityapifordetectin)

#### 4. Energy/Battery Saver Modes

| Mode                         | Impact                                              |
| ---------------------------- | --------------------------------------------------- |
| Chrome Energy Saver          | Reduit le refresh rate a 30fps quand batterie < 20% |
| iOS Low Power Mode           | Throttle rAF et animations CSS a 30fps              |
| Android Battery Saver        | Impact significatif sur les performances web        |
| iframes cross-origin sur iOS | Throttles a 30fps                                   |

> **Reference:** [Chrome Energy Saver Mode](https://developer.chrome.com/blog/memory-and-energy-saver-mode)

#### 5. Long Task API Limitations

| Limitation               | Impact                                        |
| ------------------------ | --------------------------------------------- |
| Support navigateur       | Chromium uniquement (pas Firefox/Safari)      |
| Flag `buffered`          | Non supporte (doit initialiser dans `<head>`) |
| Attribution cross-origin | Limitee a 3 iframes                           |
| Apres 10 long tasks      | Attribution devient "unknown"                 |

#### 6. Autres sources

- **Garbage Collection**: Pause toute execution JS, ressemble a un freeze
- **JIT Compilation**: Pauses imprevisibles pendant l'optimisation
- **Extensions navigateur**: Content scripts peuvent bloquer l'execution
- **DevTools**: Le profiling memoire prend des snapshots frequents (50ms)

### Strategies de prevention implementees

#### 1. Check document.hidden directement

```typescript
const isCurrentlyHidden = document.hidden;
if (isCurrentlyHidden) {
	// Skip - page is backgrounded, timer throttling expected
}
```

#### 2. Ecouter plusieurs evenements

```typescript
// visibilitychange: standard mais incomplet
document.addEventListener('visibilitychange', () => {
	pageWasHiddenDuringHeartbeat = true;
});

// pagehide: plus fiable dans certains navigateurs
window.addEventListener('pagehide', () => {
	pageWasHiddenDuringHeartbeat = true;
});

// Page Lifecycle API: freeze/resume par le navigateur
document.addEventListener('freeze', () => {
	pageWasFrozen = true;
});
document.addEventListener('resume', () => {
	pageWasFrozen = true;
});
```

> **Reference:** [Page Lifecycle API](https://developer.chrome.com/blog/page-lifecycle-api)

#### 3. Detection d'inactivite utilisateur

Si l'utilisateur n'a pas interagi depuis > 5 minutes et qu'on detecte un drift, c'est probablement du throttling navigateur:

```typescript
const timeSinceLastInteraction = now - lastUserInteractionTime;
const isLongIdle = timeSinceLastInteraction > 5 * 60 * 1000;

if (isLongIdle && drift > 5000) {
	// Skip - likely browser throttling during idle period
}
```

#### 4. Corroboration par Long Task Observer

Un vrai freeze JavaScript serait detecte par le Long Task Observer. Si on a un grand drift sans long tasks correspondantes, c'est probablement un sleep/wake:

```typescript
const recentLongTasks = state.freezeEvents.filter((e) => {
	const timeSinceEvent = now - new Date(e.timestamp).getTime();
	return e.type === 'long_task' && timeSinceEvent < 30000 && e.duration > 1000;
});

if (recentLongTasks.length === 0) {
	// No corroborating long tasks - likely sleep/wake, not real freeze
}
```

### Resume des checks

| Check                   | Ce qu'il detecte                                   |
| ----------------------- | -------------------------------------------------- |
| `document.hidden`       | Page actuellement en arriere-plan                  |
| `visibilitychange`      | Transitions hidden/visible                         |
| `pagehide`              | Plus fiable que visibilitychange dans certains cas |
| `freeze`/`resume`       | Gel de page par le navigateur (Page Lifecycle API) |
| `blur` + hidden         | Perte de focus pendant que la page est cachee      |
| Idle detection          | Aucune activite utilisateur depuis > 5 min         |
| Long Task corroboration | Un vrai freeze aurait des evenements Long Task     |

### Interactions trackees pour la detection d'idle

| Event       | Debounce                              |
| ----------- | ------------------------------------- |
| `click`     | Non                                   |
| `input`     | Non (pour idle), 500ms (pour logging) |
| `scroll`    | Non (pour idle)                       |
| `keydown`   | Non                                   |
| `mousemove` | 1s (throttle pour performance)        |

### Logs de debug

```
[Freeze Detection] Skipping check - page is hidden
[Freeze Detection] Skipping check - page was hidden during interval
[Freeze Detection] Skipping check - page was frozen by browser
[Freeze Detection] Large drift (XXms) during idle period - likely browser throttling, skipping
[Freeze Detection] Large drift (XXms) but no corroborating long tasks - likely sleep/wake, skipping
[Freeze Detection] Large drift (XXms) with N corroborating long tasks - real freeze detected
```

---
