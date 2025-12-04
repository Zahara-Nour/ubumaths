# Python Playground - Progression

## Vue d'ensemble

Environnement Python interactif pour UbuMaths utilisant Pyodide (Python dans le navigateur).

## Phases d'implémentation

### Phase 1 : Structure de base

- [x] Store `pythonPlayground.svelte.ts`
  - State management avec Svelte 5 runes
  - Types: `PlaygroundState` pour les états de chargement/exécution
  - Persistence localStorage du code et préférences
  - Méthodes: `execute()`, `clearOutput()`, `resetCode()`, `setCode()`
- [x] Composant `PythonToolbar.svelte`
  - Bouton Exécuter avec spinner pendant exécution
  - Raccourci clavier Ctrl+Entrée affiché
  - Boutons secondaires: Effacer, Copier, Réinitialiser
  - Indicateur d'état (pastille verte si prêt)
- [x] Composant `PythonPlayground.svelte`
  - Layout responsive grid lg:grid-cols-2
  - Zone éditeur (placeholder textarea pour Phase 3)
  - Zone sortie avec stdout/stderr/plot
  - États: loading, empty, output
  - Gestion raccourci clavier global
- [x] Page `/python`
  - Route publique
  - Meta description pour SEO

### Phase 2 : Web Worker Pyodide (en attente)

- [ ] Créer `src/lib/workers/pyodide.worker.ts`
- [ ] Charger Pyodide depuis CDN
- [ ] Installer packages: numpy, matplotlib, scipy
- [ ] Communication bidirectionnelle worker <-> main
- [ ] Capture stdout/stderr
- [ ] Génération plots en base64 PNG
- [ ] Gestion timeout et interruption

### Phase 3 : CodeMirror (en attente)

- [ ] Intégrer CodeMirror 6 pour l'éditeur
- [ ] Coloration syntaxique Python
- [ ] Autocomplétion basique
- [ ] Raccourcis clavier éditeur
- [ ] Numéros de ligne
- [ ] Thème dark/light

### Phase 4 : Output + Plots (en attente)

- [ ] Formatage des erreurs Python
- [ ] Mode erreurs pédagogiques (traduction française)
- [ ] Affichage plots interactifs
- [ ] Zoom/téléchargement plots
- [ ] Historique des exécutions

### Phase 5 : Loading UX (en attente)

- [ ] Progress bar granulaire
- [ ] Messages d'étape détaillés
- [ ] Cache Pyodide dans IndexedDB
- [ ] Chargement différé des packages

### Phase 6 : Tests (en attente)

- [ ] Tests unitaires store
- [ ] Tests composants (vitest-svelte)
- [ ] Tests E2E basiques

### Phase 7 : Quality Checks (en attente)

- [ ] pnpm lint
- [ ] pnpm check
- [ ] Code review

## Décisions techniques

### Architecture

- **Web Worker pour Pyodide**: Évite le blocage de l'UI pendant le chargement (~30MB) et l'exécution
- **Singleton store**: Pattern cohérent avec le reste de l'application (replStore, etc.)
- **localStorage**: Persistence du code utilisateur entre sessions

### États du playground

```
initial -> loading-pyodide -> loading-packages -> ready <-> executing
                                                    |
                                                    v
                                                  error
```

### Packages Python inclus

- `numpy`: Calcul numérique
- `matplotlib`: Visualisation
- `scipy` (optionnel): Fonctions mathématiques avancées

### Erreurs pédagogiques

Toggle pour afficher:

- Mode standard: traceback Python complet
- Mode pédagogique: message simplifié en français avec suggestions

## Fichiers créés

```
src/lib/stores/pythonPlayground.svelte.ts    # Store principal
src/lib/components/python/PythonToolbar.svelte   # Barre d'outils
src/lib/components/python/PythonPlayground.svelte # Container principal
src/routes/(public)/python/+page.svelte      # Page route
docs/wip/python-playground-progress.md       # Ce fichier
```

## Dossiers créés

```
src/lib/components/python/   # Composants Python playground
src/lib/workers/             # Web workers (préparé pour Phase 2)
```

## Prochaines étapes

1. **Phase 2**: Implémenter le web worker Pyodide
   - Télécharger et initialiser Pyodide
   - Installer numpy et matplotlib
   - Capturer stdout/stderr/plots

2. **Phase 3**: Intégrer CodeMirror
   - Remplacer le textarea par un vrai éditeur
   - Coloration syntaxique Python

## Notes

- Le code par défaut montre un exemple de tracé avec numpy/matplotlib
- UI entièrement en français
- Responsive: layout vertical sur mobile, côte à côte sur desktop
- Dark mode supporté via les tokens Tailwind sémantiques
