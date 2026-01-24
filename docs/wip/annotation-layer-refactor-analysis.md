# Analyse complète : Refonte du système d'Annotations

## Contexte

L'implémentation actuelle de AnnotationLayer a des problèmes fondamentaux de conception :

- Le resize et rotate ne fonctionnent pas
- Le code a été écrit sans analyse approfondie de l'architecture existante
- On n'a pas réutilisé correctement les patterns existants du whiteboard

## Objectif de cette analyse

Comprendre en profondeur les différences et similitudes entre :

1. **WhiteboardElements** (shapes, strokes, images, textblocks, groups)
2. **Annotations** (annotation-strokes, annotation-shapes, annotation-stamps)

Pour déterminer **exactement** ce qu'on peut réutiliser et ce qui doit être spécifique.

---

## Questions à investiguer

### 1. Architecture des Layers

**Fichiers à analyser :**

- `src/lib/whiteboard/components/WhiteboardCanvas.svelte` - Rendu des WhiteboardElements
- `src/lib/whiteboard/components/SelectionLayer.svelte` - UI de sélection
- `src/lib/whiteboard/components/AnnotationLayer.svelte` - Rendu des annotations

**Questions :**

- Comment les éléments sont-ils rendus dans WhiteboardCanvas ?
- Comment SelectionLayer est-il intégré ? Où est-il dans le DOM ?
- Pourquoi AnnotationLayer est-il un SVG séparé au lieu d'être dans le même SVG ?
- Les annotations pourraient-elles être rendues DANS le même SVG que WhiteboardCanvas ?

### 2. Pattern "Live Preview" pour les interactions

**Fichiers à analyser :**

- `src/lib/whiteboard/stores/whiteboard.svelte.ts` - Store avec liveRotations, liveResizes, livePositions
- `src/lib/whiteboard/components/SelectionLayer.svelte` - Comment il utilise onResizeLive, onRotate, etc.
- `src/lib/whiteboard/components/WhiteboardCanvas.svelte` - Comment il lit liveRotations.get(), liveResizes.get()

**Pattern observé pour WhiteboardElements :**

```
1. Pointer down : sauvegarder état initial
2. Pointer move : mettre à jour liveRotations/liveResizes/livePositions (Maps dans le store)
3. Le RENDU lit ces Maps et applique des transforms CSS/SVG SANS modifier les données
4. Pointer up : "commit" - appliquer les changements aux vraies données, vider les Maps
```

**Questions :**

- Pourquoi ce pattern "live preview" existe-t-il ? (performance ? undo/redo ? )
- Les annotations ont-elles besoin du même pattern ?
- Peut-on ajouter `liveAnnotationRotations`, `liveAnnotationResizes`, etc. au store ?

### 3. Système de types

**Fichiers à analyser :**

- `src/lib/whiteboard/types/document.ts` - WhiteboardElement vs AnnotationElement

**Comparaison à faire :**

| Aspect   | WhiteboardElement                                       | AnnotationElement                                     |
| -------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Types    | shape, stroke, image, textblock, group, arrow           | stroke, shape, stamp                                  |
| Rotation | shape.rotation, stroke.rotation, group.rotation         | shape.rotation, stamp.rotation                        |
| Position | shape: start/end ou x,y,width,height ; stroke: points[] | shape: start/end ; stroke: points[] ; stamp: position |
| Bounds   | calculé par getElementBounds()                          | calculé par getAnnotationBBox()                       |

**Questions :**

- Les types sont-ils suffisamment similaires pour utiliser les mêmes utilitaires ?
- `getElementBounds` peut-il être réutilisé pour les annotations ?
- Les transformations (rotate, resize) peuvent-elles utiliser la même logique ?

### 4. SelectionLayer - Peut-on le réutiliser ?

**Analyse de SelectionLayer.svelte :**

- Props attendues : `selectedElements: readonly WhiteboardElement[]`
- Callbacks : `onResizeLive`, `onResizeEnd`, `onRotate`, `onRotateEnd`, etc.
- Lit : `whiteboardStore.liveRotations`, `whiteboardStore.liveResizes`, `whiteboardStore.livePositions`

**Options possibles :**

**Option A : Adapter SelectionLayer pour supporter les deux types**

- Ajouter props optionnelles pour annotations
- Généraliser les types avec `WhiteboardElement | AnnotationElement`
- Problèmes potentiels : complexité accrue, risque de régression

**Option B : Créer AnnotationSelectionLayer séparé**

- Copier/adapter le code de SelectionLayer
- Inconvénient : duplication

**Option C : Extraire une abstraction commune**

- Créer un composant `SelectionHandles` réutilisable
- SelectionLayer et AnnotationLayer l'utilisent tous les deux
- Plus propre architecturalement

**Option D : Intégrer les annotations dans le flux principal**

- Rendre les annotations DANS WhiteboardCanvas (pas un SVG séparé)
- Utiliser SelectionLayer tel quel
- Les annotations deviendraient un sous-type de WhiteboardElement
- Changement plus profond mais plus cohérent

### 5. Calcul des Bounding Boxes avec rotation

**Problème identifié :**
Quand un élément est rotaté, son bounding box axis-aligned change. Actuellement :

- `getElementBounds()` pour WhiteboardElements gère-t-il la rotation ?
- `getAnnotationBBox()` ne gère PAS la rotation - c'est un bug potentiel

**Fichiers à analyser :**

- `src/lib/whiteboard/core/hit-testing.ts` - getElementBounds, calculateAngleFromCenter, etc.

### 6. Système de coordonnées

**Questions :**

- WhiteboardCanvas et AnnotationLayer ont-ils le même viewBox ?
- Quand on resize/rotate, les coordonnées sont-elles correctement transformées ?
- Y a-t-il des problèmes de scale ?

---

## Actions demandées

1. **Lire et analyser** tous les fichiers mentionnés ci-dessus
2. **Documenter** les patterns exacts utilisés par le système existant
3. **Proposer** une architecture claire pour les annotations avec :
   - Schéma du flux de données pour resize/rotate
   - Liste exacte des fichiers à modifier
   - Code réutilisable vs code nouveau
4. **Tester** que l'implémentation proposée fonctionne avant de la finaliser

---

## Critères de succès

- [ ] Resize fonctionne visuellement pendant le drag (preview fluide)
- [ ] Resize est committé correctement au pointer up
- [ ] Rotate fonctionne visuellement pendant le drag
- [ ] Rotate est committé correctement au pointer up
- [ ] Le bounding box de sélection suit correctement la rotation
- [ ] Pas de duplication inutile de code
- [ ] Tests unitaires passent
- [ ] Undo/redo fonctionne pour resize et rotate

---

## Fichiers clés à lire

```
src/lib/whiteboard/
├── components/
│   ├── WhiteboardCanvas.svelte    # Comment les éléments sont rendus + liveRotations
│   ├── SelectionLayer.svelte      # UI de sélection + handlers resize/rotate
│   ├── AnnotationLayer.svelte     # Implémentation actuelle (bugguée)
│   └── Whiteboard.svelte          # Comment tout s'assemble
├── stores/
│   └── whiteboard.svelte.ts       # liveRotations, liveResizes, livePositions, setLiveRotation, commitLiveRotation
├── core/
│   └── hit-testing.ts             # getElementBounds, calculateAngleFromCenter
└── types/
    └── document.ts                # WhiteboardElement, AnnotationElement
```

---

## Prompt pour nouvelle session

Utilise ce prompt pour démarrer une nouvelle session avec toutes les informations :

```
Je dois refaire l'implémentation du resize/rotate pour les annotations dans le whiteboard.

L'implémentation actuelle dans AnnotationLayer.svelte est bugguée : le resize et rotate ne fonctionnent pas.

Avant d'écrire du code, j'ai besoin d'une analyse complète.

**Ta mission :**

1. Lis et analyse les fichiers suivants pour comprendre l'architecture existante :
   - src/lib/whiteboard/components/WhiteboardCanvas.svelte (lignes 280-350 et 2000-2200)
   - src/lib/whiteboard/components/SelectionLayer.svelte (entier)
   - src/lib/whiteboard/stores/whiteboard.svelte.ts (sections liveRotations, liveResizes, setLiveRotation, commitLiveRotation)
   - src/lib/whiteboard/core/hit-testing.ts (getElementBounds)

2. Documente le pattern "live preview" utilisé pour les WhiteboardElements :
   - Comment le resize fonctionne pendant le drag
   - Comment le rotate fonctionne pendant le drag
   - Comment le commit se fait au pointer up

3. Analyse si SelectionLayer peut être réutilisé pour les annotations, et comment.

4. Propose une architecture propre pour les annotations avec :
   - Schéma du flux de données
   - Liste des modifications à faire
   - Code à réutiliser vs code nouveau

5. Implémente la solution de manière incrémentale avec des tests à chaque étape.

Fichier de référence avec l'analyse préliminaire : docs/wip/annotation-layer-refactor-analysis.md
```

---

## Annexe : Analyse du code actuel (bugué)

### Problème 1 : Pas de "live preview" pour les annotations

**Code actuel (AnnotationLayer.svelte) :**

```typescript
function handleRotateMove(e: PointerEvent) {
	// ...calcul de newRotation...
	const selectedId = Array.from(selectedIds)[0];
	whiteboardStore.rotateAnnotation(selectedId, newRotation); // Modifie directement les données !
}
```

**Comment WhiteboardElements font :**

```typescript
// Dans SelectionLayer.svelte
function handleRotationPointerMove(e: PointerEvent) {
	// ...calcul de newRotation...
	onRotate?.(rotateElementId, newRotation); // Appelle callback
}

// Le callback met à jour liveRotations (pas les vraies données)
// Le rendu lit liveRotations pour afficher la preview
// Au pointer up, commitLiveRotation() applique aux vraies données
```

### Problème 2 : Le rendu n'utilise pas de "live state"

**Code actuel (AnnotationLayer.svelte) :**

```svelte
{:else if annotation.type === 'shape'}
    {@const shapeRotation = annotation.rotation ?? 0}  <!-- Lit directement les données -->
    <path transform={shapeRotation !== 0 ? `rotate(...)` : undefined} />
```

**Comment WhiteboardCanvas fait :**

```svelte
{@const liveRot = whiteboardStore.liveRotations.get(shape.id)}
<!-- Lit le live state d'abord -->
{@const storedRot = shape.rotation ?? 0}
{@const rotation = liveRot ?? storedRot}
<!-- Priorise le live state -->
```

### Problème 3 : Calcul du bounding box ne tient pas compte de la rotation

Le bounding box de sélection est calculé sans tenir compte de la rotation de l'élément.
Quand on rotate, le bounding box devrait tourner avec l'élément.

### Problème 4 : Le resize recalcule à partir des coordonnées modifiées

Pendant un resize drag, à chaque pointermove :

1. On calcule un nouveau bbox
2. On appelle resizeAnnotation() qui modifie start/end
3. Au prochain pointermove, on recalcule à partir des coords modifiées
4. Cela crée une dérive cumulative

**Solution correcte :**

1. Au pointerdown : sauvegarder les coords originales
2. Pendant le drag : calculer la transformation depuis l'état original
3. Au pointerup : appliquer une seule fois

---

## Résumé des changements nécessaires

1. **Ajouter au store :**

   - `liveAnnotationRotations: Map<string, number>`
   - `liveAnnotationResizes: Map<string, { scaleX, scaleY, originX, originY }>`
   - Méthodes : `setLiveAnnotationRotation`, `commitLiveAnnotationRotation`, etc.

2. **Modifier AnnotationLayer.svelte :**

   - Utiliser les live states pour le rendu
   - Handlers appellent setLive* pendant drag, commit* au pointer up

3. **Évaluer si SelectionLayer peut être généralisé** ou si on extrait un composant commun.

4. **Corriger le calcul de bounding box** pour les éléments rotatés.
