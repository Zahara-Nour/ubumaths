# `svelte-check` warnings — état et dette technique

Ce document recense l'usage de `svelte-ignore` dans le code source et catégorise ce qui est **légitime** (pattern Svelte recommandé) vs ce qui est **dette technique à rembourser**.

État actuel : **0 warnings** dans le périmètre projet (tout filtré ou supprimé). Les seules erreurs restantes (9) sont dans `slides/demo*` et `extern/`, exclues du check.

---

## 1. `state_referenced_locally` — pattern snapshot (LÉGITIME ✅)

### Contexte

Svelte 5 émet `state_referenced_locally` quand on lit une variable réactive (prop, `$state`, etc.) dans un contexte qui ne capture que la valeur initiale, par exemple :

```ts
let { template } = $props();
let title = $state(template?.title ?? ''); // ⚠️ warning state_referenced_locally
```

Le compilateur suppose que tu voulais probablement `$derived(template?.title)`. Mais pour un **formulaire d'édition**, on veut justement l'inverse : initialiser une fois, puis laisser l'utilisateur éditer indépendamment de la prop.

### Solution appliquée

Capture explicite dans une `const` non réactive :

```ts
let { template } = $props();
// svelte-ignore state_referenced_locally
const initialTemplate = template;

let title = $state(initialTemplate?.title ?? '');
```

Le `svelte-ignore` est **nécessaire** car la lecture de `template` (réactif) dans `const initialTemplate = template` déclenche le warning. C'est documenté par Svelte comme la solution recommandée pour un snapshot intentionnel.

### Fichiers concernés

~50 fichiers, tous des composants d'édition de formulaire (`*Form.svelte`, `*Editor.svelte`, `+page.svelte` initialisant des filtres depuis URL). La liste est trouvable avec :

```bash
grep -rln "svelte-ignore state_referenced_locally" src/ --include="*.svelte"
```

**Pas d'action future requise** sauf si Svelte introduit une syntaxe dédiée snapshot (ex: `$state.snapshot()` à l'init).

---

## 2. `a11y_*` sur SVG canvases & éléments interactifs custom — DETTE TECHNIQUE ⚠️

### Le problème honnête

Quand on a des éléments SVG interactifs (handles de redimensionnement, points draggables sur figures géométriques, hit areas sur tableau blanc, cellules de tableur), Svelte demande légitimement :

- `role="button"` ou autre rôle ARIA
- Handlers clavier en plus des handlers pointer (`onkeydown`)
- `tabindex` cohérent
- `aria-label` descriptif

**On a suppressé ces warnings sans implémenter l'accessibilité réelle.** Concrètement :

- Un utilisateur au clavier ne peut pas redimensionner une forme dans le whiteboard
- Les screen readers n'annoncent pas les éléments géométriques interactifs
- Les figures dans `GeometryCanvas` ne sont pas explorables sans souris

### Fichiers avec dette a11y suppressée

| Fichier                                                     | Type d'éléments                     |
| ----------------------------------------------------------- | ----------------------------------- |
| `src/lib/components/geometry/GeometryCanvas.svelte`         | 11 SVG handles draggables           |
| `src/lib/whiteboard/components/SelectionLayer.svelte`       | 7 hit areas resize/rotate           |
| `src/lib/whiteboard/components/AnnotationLayer.svelte`      | Resize/rotate handles               |
| `src/lib/whiteboard/components/ImageLayer.svelte`           | Image + handles                     |
| `src/lib/whiteboard/components/WhiteboardCanvas.svelte`     | SVG racine                          |
| `src/lib/whiteboard/components/InstrumentLayer.svelte`      | `<g>` pointer events                |
| `src/lib/whiteboard/components/PageThumbnails.svelte`       | Drag-to-reorder                     |
| `src/lib/whiteboard/components/DraggablePanel.svelte`       | Drag handle                         |
| `src/lib/components/markdown/nodes/ProbabilityTree.svelte`  | Click sur SVG / labels              |
| `src/lib/components/Wheel.svelte`                           | Texte cliquable SVG                 |
| `src/lib/components/question-inputs/NumberLineInput.svelte` | SVG slider tabindex                 |
| `src/lib/components/rich-text/RichTextEditor.svelte`        | TipTap container + resize separator |
| `src/lib/components/bug-reports/BugReportCard.svelte`       | Checkbox stopPropagation            |
| `src/lib/slides/core/Deck.svelte`                           | Wrapper deck tabindex               |
| `src/lib/slides/components/SlideAnnotationToolbar.svelte`   | Color palette                       |
| `src/lib/games/evoland/components/EvolandGame.svelte`       | Container `role="application"`      |
| `src/routes/(public)/games/2048/Game2048.svelte`            | Game board touch handlers           |
| `src/routes/(public)/games/2048/Tile2048.svelte`            | Tile tabindex                       |

(Plus quelques fichiers pré-existants : `MarkdownRaw`, `TrigCircle`, `PythonSplitter`, `Spreadsheet`, `VipCard`, `ElementPopover`.)

### Ce qu'il faudrait vraiment faire (à terme)

Trois niveaux de remédiation, du moins au plus ambitieux :

#### Niveau 1 — Marquer le scope explicitement

- Mettre les SVG canvases avec `role="application"` + un `aria-label` descriptif global
- Documenter dans le composant que les interactions sont pointer-only
- Garder le `svelte-ignore` mais avec un commentaire explicatif

#### Niveau 2 — Clavier alternatif

- Sur `GeometryCanvas`, ajouter raccourcis clavier pour sélectionner / déplacer points (ex: Tab pour cycler entre éléments, flèches pour bouger un point sélectionné)
- Sur `WhiteboardCanvas` : sélection clavier des éléments + Delete pour supprimer
- Sur `2048` : déjà fait pour les flèches, mais les power-ups VIP ne sont pas accessibles au clavier

#### Niveau 3 — Vraie a11y screen reader

- ARIA live regions pour les changements de sélection
- Descriptions textuelles dynamiques des figures géométriques (ex: « Triangle ABC, sommet A déplacé »)
- Trad braille / audio pour les graphiques mathématiques

### Critère de priorité

À traiter en priorité quand :

- L'app vise une accessibilité réelle (pas juste « passe la CI »)
- Un utilisateur réel demande l'accès clavier
- Le projet vise une certification (RGAA / WCAG AA en France)

---

## 3. `perf_avoid_nested_class` — INÉVITABLE ⚠️

### Contexte

`JsonEditor.svelte` et `ScriptEditor.svelte` utilisent CodeMirror, dont les modules sont **importés dynamiquement** (pour réduire le bundle initial). On définit des sous-classes (ex: `class ErrorMarker extends GutterMarker`) à l'intérieur du callback async qui charge CodeMirror.

Svelte préfère que les classes soient déclarées au top-level pour éviter de les recréer à chaque render. Mais ici la classe parente n'est disponible qu'après l'import dynamique → on ne peut pas la déclarer top-level.

### Solution appliquée

```ts
// eslint-disable-next-line svelte/no-unused-svelte-ignore
// svelte-ignore perf_avoid_nested_class
class ErrorMarker extends GutterMarker { ... }
```

Le double-disable est nécessaire car ESLint ne « voit » pas le warning émis par svelte-check (rule `svelte/no-unused-svelte-ignore` mal calibrée).

**Pas d'action future** sauf changement architectural majeur (déplacer toute l'instantiation CodeMirror dans un module séparé chargé une fois).

---

## 4. Filtre `slides/demo` et `extern/` (CONFIG ✅)

`scripts/check-incremental.sh` filtre les warnings provenant de `slides/demo*` (démos slides obsolètes) et `extern/` (dépendances tierces). C'est un compromis assumé pour ne pas bruiter la CI avec du code qu'on ne maintient pas.

Si on veut vraiment passer à 0 warning brut, il faut soit :

- Supprimer `slides/demo*` du repo
- Sortir `extern/` du workspace ou ajouter un `tsconfig.json` racine plus strict en `exclude`

---

## Maintenance

À refaire **avant chaque mise à jour majeure de Svelte** :

```bash
pnpm check:incremental                 # Doit retourner ✓
grep -rn "svelte-ignore" src/          # Inspecter visuellement
```

Si Svelte 6+ change la sémantique d'un warning, certains `svelte-ignore` peuvent devenir invalides (ESLint le signalera via `svelte/no-unused-svelte-ignore`).
