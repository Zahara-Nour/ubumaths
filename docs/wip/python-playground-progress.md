# Python Playground - Progression

## Statut: TERMINÉ

Environnement Python interactif pour UbuMaths utilisant Pyodide (Python dans le navigateur).

## Phases d'implémentation

### Phase 1 : Structure de base

- [x] Store `pythonPlayground.svelte.ts`
  - State management avec Svelte 5 runes
  - Types: `PlaygroundState` pour les états de chargement/exécution
  - Persistence localStorage du code et préférences (debounce 500ms)
  - Méthodes: `execute()`, `clearOutput()`, `resetCode()`, `setCode()`, `cancel()`, `togglePedagogicErrors()`
- [x] Composant `PythonToolbar.svelte`
  - Bouton Exécuter avec spinner pendant exécution
  - Raccourci clavier Ctrl+Entrée affiché
  - Boutons secondaires: Effacer, Copier, Réinitialiser
  - Indicateur d'état (pastille verte si prêt)
- [x] Composant `PythonPlayground.svelte`
  - Layout responsive grid lg:grid-cols-2
  - Zone éditeur CodeMirror
  - Zone sortie avec stdout/stderr/plot
  - États: loading, empty, output
- [x] Page `/python`
  - Route publique
  - Meta description pour SEO

### Phase 2 : Web Worker Pyodide

- [x] Créer `src/lib/workers/pyodide.worker.ts`
- [x] Charger Pyodide v0.26.2 depuis CDN
- [x] Installer packages: numpy, matplotlib, sympy (en parallèle)
- [x] Communication bidirectionnelle worker <-> main avec validation Zod
- [x] Capture stdout/stderr
- [x] Génération plots en base64 PNG
- [x] Gestion timeout (30 secondes) et interruption

### Phase 3 : CodeMirror

- [x] Intégrer CodeMirror 6 avec lazy loading
- [x] Coloration syntaxique Python
- [x] Autocomplétion
- [x] Raccourcis clavier éditeur (Ctrl+Enter pour exécuter)
- [x] Numéros de ligne
- [x] Thème dark/light (one-dark)
- [x] Détection automatique du thème via MutationObserver

### Phase 4 : Output + Erreurs pédagogiques

- [x] Formatage des erreurs Python
- [x] Mode erreurs pédagogiques (traduction française)
  - SyntaxError, NameError, TypeError, IndexError, KeyError
  - ValueError, ZeroDivisionError, IndentationError
  - ImportError, ModuleNotFoundError, AttributeError
  - RecursionError, MemoryError
- [x] Affichage plots matplotlib (fond blanc)
- [x] Temps d'exécution affiché

### Phase 5 : Loading UX

- [x] Progress bar animée
- [x] Messages d'étape détaillés (6 étapes)
- [x] Indicateur de pourcentage

### Phase 6 : Tests

- [x] Tests unitaires store (41 tests)
  - Initial state, Pyodide initialization, Code execution
  - Cancel execution, Clear output, Reset code
  - Pedagogic errors toggle, localStorage persistence
  - Derived states, Destroy cleanup, Worker not supported
- [x] Tests composant PythonOutput (36 tests)
  - Tous les types d'erreurs Python
  - Messages pédagogiques français
  - Edge cases et erreurs inconnues

### Phase 7 : Quality Checks

- [x] Build réussi (avec `NODE_OPTIONS="--max-old-space-size=8192"`)
- [x] Pas d'erreurs lint/TypeScript dans les fichiers Python
- [x] Code review effectué
- [x] Tous les tests passent (77 total)

## Décisions techniques

### Architecture

- **Web Worker pour Pyodide**: Évite le blocage de l'UI pendant le chargement (~30MB) et l'exécution
- **Singleton store**: Pattern cohérent avec le reste de l'application
- **localStorage**: Persistence du code utilisateur entre sessions (debounce 500ms)
- **Validation Zod**: 100% des messages worker validés

### États du playground

```
initial -> loading-pyodide -> loading-packages -> ready <-> executing
                                                    |
                                                    v
                                                  error
```

### Packages Python inclus

- `numpy`: Calcul numérique
- `matplotlib`: Visualisation (backend AGG)
- `sympy`: Calcul symbolique

### Erreurs pédagogiques

Toggle pour afficher:

- Mode standard: traceback Python complet
- Mode pédagogique: message simplifié en français avec suggestions

## Fichiers créés

```
src/lib/types/python-worker.ts                    # Types TypeScript
src/lib/stores/pythonPlayground.svelte.ts         # Store principal
src/lib/workers/pyodide.worker.ts                 # Web Worker Pyodide
src/lib/components/python/PythonPlayground.svelte # Container principal
src/lib/components/python/PythonToolbar.svelte    # Barre d'outils
src/lib/components/python/PythonEditor.svelte     # Éditeur CodeMirror
src/lib/components/python/PythonOutput.svelte     # Affichage sortie
src/lib/components/python/index.ts                # Exports
src/routes/(public)/python/+page.svelte           # Page route
src/lib/stores/pythonPlayground.svelte.test.ts    # Tests store (41)
src/lib/components/python/PythonOutput.svelte.test.ts # Tests output (36)
docs/wip/python-playground-progress.md            # Ce fichier
```

## Commits

1. `feat(python): create Python Playground with Pyodide integration` (Phase 1)
2. `feat(python): implement Pyodide Web Worker for code execution` (Phase 2)
3. `feat(python): add CodeMirror 6 editor with lazy loading` (Phase 3)
4. `feat(python): add output component with pedagogic errors and loading UX` (Phases 4-5)
5. `test(python): add comprehensive tests for Python Playground` (Phase 6)

## Dépendances ajoutées

```json
{
	"@codemirror/autocomplete": "^6.20.0",
	"@codemirror/commands": "^6.10.0",
	"@codemirror/lang-python": "^6.2.1",
	"@codemirror/language": "^6.11.3",
	"@codemirror/state": "^6.5.2",
	"@codemirror/theme-one-dark": "^6.1.3",
	"@codemirror/view": "^6.38.8"
}
```

## Notes

- Le code par défaut montre un exemple de tracé avec numpy/matplotlib
- UI entièrement en français
- Responsive: layout vertical sur mobile, côte à côte sur desktop
- Dark mode supporté via détection automatique
- 77 tests unitaires couvrant toutes les fonctionnalités
