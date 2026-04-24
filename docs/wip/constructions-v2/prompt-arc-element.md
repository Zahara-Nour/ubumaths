# Prompt : Ajouter l'element Arc a geometry-core et au DSL

## Contexte

Le module `geometry-core` (1113+ tests) gere des figures geometriques avec un DSL en francais. Le module `constructions-v2` (71 tests) ajoute des animations pas-a-pas au-dessus de geometry-core avec des directives `@`.

Le DSL supporte : `point`, `segment`, `droite`, `demidroite`, `cercle`, `milieu`, `symetrie`, `rotation`, `translation`, `homothetie`, `intersection`, `marque_angle`, `angle_droit`, `marque_segment`, `mesure`, `style`, et les macros/stdlib.

**Il manque l'element `arc`** — necessaire pour :

1. Convertir les constructions InstrumenPoche (les arcs de compas sont le coeur des constructions geometriques)
2. Tracer des angles visuellement (un arc entre deux cotes d'un angle)
3. Representer des arcs de cercle dans les figures

## Ce qu'il faut faire

### 1. Type GeoArc dans geometry-core

Fichier : `src/lib/geometry-core/types/elements.ts`

```typescript
export interface GeoArc {
	readonly type: 'arc';
	readonly centerId: string; // point centre
	readonly radius: GeoValue; // rayon
	readonly startAngle: GeoValue; // angle de debut (radians)
	readonly endAngle: GeoValue; // angle de fin (radians)
	// ... + GeoElementBase fields
}
```

Ajouter `GeoArc` au union `GeoElement`.

Deux variantes a supporter :

- **Arc par rayon** : `arc(centre, rayon=3, debut=0, fin=90)` — angles en degres dans le DSL, radians en interne
- **Arc par 3 points** : `arc(A, B, C)` — arc passant par A, B, C (ou arc de A a C centre sur B) — utile pour tracer des angles

### 2. Factory dans Figure

Fichier : `src/lib/geometry-core/graph/figure.ts`

```typescript
createArc(centerId: string, radius: GeoValue, startAngle: GeoValue, endAngle: GeoValue, options?: ElementOptions): string
createArcByPoints(startId: string, centerId: string, endId: string, options?: ElementOptions): string
```

- `createArc` : arc defini par centre, rayon, angles
- `createArcByPoints` : arc de startId a endId autour de centerId (pour tracer des angles)
- L'arc depend de son centre (et des points pour la variante par points)
- `computePosition` : pas de position unique, mais les points de debut/fin sont calculables

### 3. Rendu SVG

Fichier : `src/lib/geometry-core/rendering/svg-primitives.ts`

Ajouter `arcToSVG(id, figure, transformer)` qui retourne un path SVG avec la commande `A` (arc).

Attention au sens (horaire/anti-horaire) et au flag `large-arc` pour les arcs > 180°.

Fichier : `src/lib/components/geometry/GeometryCanvas.svelte`

Ajouter le rendu de l'arc dans le template (entre les cercles et les points).

### 4. Builtin DSL

Fichier : `src/lib/geometry-core/dsl/builtins.ts`

Ajouter `arc` aux `BUILTIN_NAMES` et dans le switch `executeBuiltin` :

```python
# DSL syntax — arc par rayon + angles (en degres)
a = arc(O, rayon=3, debut=0, fin=90)

# DSL syntax — arc par 3 points (trace l'angle)
a = arc(A, O, B)  # arc de A a B centre en O (= trace de l'angle AOB)
```

La variante 3 points est la plus utile pour tracer des angles dans les constructions.

Fichier : `src/lib/geometry-core/dsl/keywords.ts` — ajouter `'arc'` aux keywords.

### 5. Serializer

Fichier : `src/lib/geometry-core/dsl/serializer.ts`

Ajouter la serialisation de l'arc dans `serializeElement`.

### 6. Schemas Zod

Fichier : `src/lib/geometry-core/types/schemas.ts`

Ajouter le schema pour `GeoArc` et l'inclure dans le schema element.

### 7. Exports

Fichiers : `src/lib/geometry-core/rendering/export-tikz.ts`, `export-typst.ts`, `export-svg.ts`

Ajouter le rendu de l'arc dans les 3 exporteurs.

### 8. Mettre a jour le convertisseur

Fichier : `scripts/migrate-constructions-to-dsl.ts`

Remplacer le cas `drawArc` qui cree un `cercle` par un vrai `arc` :

```typescript
case 'drawArc': {
    const center = act.center;
    const radius = act.radius;
    const startAngle = act.startAngle;
    const endAngle = act.endAngle;
    if (center && radius) {
        const mc = toMath(center.x, center.y, canvasW, canvasH, ppu);
        const rMath = radius / ppu;
        const cp = `_ac${nameCounter++}`;
        lines.push(`${cp} = point(${mc.x}, ${mc.y})`);
        lines.push(`arc(${cp}, rayon=${rMath}, debut=${startAngle}, fin=${endAngle})`);
    }
    break;
}
```

Aussi mettre a jour `src/lib/constructions-v2/converter.ts` (le convertisseur XML→DSL).

### 9. Tests

- `createArc` : creation, dependances, cascade delete, undo/redo
- `createArcByPoints` : idem + calcul des angles a partir des points
- `arcToSVG` : path SVG correct, arcs > 180°, arcs negatifs
- DSL : `arc(O, rayon=3, debut=0, fin=90)` parse et interprete correctement
- DSL : `arc(A, O, B)` parse et interprete correctement
- Serializer : round-trip
- Exports : TikZ/Typst/SVG

## Cas d'usage pour les angles

L'arc par 3 points est particulierement utile pour tracer des angles :

```python
# Tracer l'angle AOB avec un arc
A = point(3, 0)
O = point(0, 0)
B = point(0, 3)
segment(O, A)
segment(O, B)
a = arc(A, O, B)  # trace l'arc de l'angle

# Avec style
style(a, couleur="rouge")
```

C'est different de `marque_angle` qui est une annotation (petit arc ou carre pour indiquer l'angle). L'arc est un element geometrique a part entiere qui peut avoir n'importe quel rayon.

## Fichiers a modifier

| Fichier                                             | Modification                                            |
| --------------------------------------------------- | ------------------------------------------------------- |
| `src/lib/geometry-core/types/elements.ts`           | Ajouter `GeoArc`, ajouter au union                      |
| `src/lib/geometry-core/graph/figure.ts`             | `createArc()`, `createArcByPoints()`, `computePosition` |
| `src/lib/geometry-core/rendering/svg-primitives.ts` | `arcToSVG()`                                            |
| `src/lib/geometry-core/types/schemas.ts`            | Schema Zod pour arc                                     |
| `src/lib/geometry-core/dsl/keywords.ts`             | Ajouter `'arc'`                                         |
| `src/lib/geometry-core/dsl/builtins.ts`             | Builtin `arc` avec 2 variantes                          |
| `src/lib/geometry-core/dsl/serializer.ts`           | Serialisation arc                                       |
| `src/lib/geometry-core/rendering/export-tikz.ts`    | Export TikZ                                             |
| `src/lib/geometry-core/rendering/export-typst.ts`   | Export Typst                                            |
| `src/lib/geometry-core/rendering/export-svg.ts`     | Export SVG                                              |
| `src/lib/components/geometry/GeometryCanvas.svelte` | Rendu arc                                               |
| `scripts/migrate-constructions-to-dsl.ts`           | drawArc → arc()                                         |
| `src/lib/constructions-v2/converter.ts`             | Compas tracer → arc()                                   |
| `docs/wip/geometry/phase1-progress.md`              | Documenter                                              |

## Etat actuel du projet

- Progress doc : `docs/wip/constructions-v2/progress.md`
- geometry-core memory : `.claude/projects/.../memory/geometry-core-status.md`
- constructions-v2 memory : `.claude/projects/.../memory/constructions-v2-status.md`
- Demo page : `/construction-demo`
- 9 constructions en base (format DSL, migrees depuis JSON)
- Les arcs de compas sont actuellement convertis en cercles complets (approximation)
