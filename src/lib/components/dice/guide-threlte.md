# Système de lancer de dés 3D avec Threlte pour Svelte 5

**Threlte 8 apporte un support natif complet de Svelte 5 avec runes**, permettant de créer des systèmes de dés 3D réactifs et performants. Ce guide compile toutes les connaissances nécessaires pour implémenter un système de lancer de dés professionnel dans votre application SvelteKit 2.

## 1. Threlte - Documentation et bases

### Installation et configuration

**Nouvelle installation (recommandé) :**
```bash
npm create threlte my-dice-project
```

**Installation manuelle dans un projet SvelteKit 2 existant :**
```bash
# Packages essentiels
npm install three @threlte/core

# Types TypeScript
npm install -D @types/three

# Extras (recommandé)
npm install @threlte/extras

# Physique Rapier (indispensable pour les dés)
npm install @threlte/rapier @dimforge/rapier3d-compat
```

### Configuration Vite requise

**Fichier `vite.config.js` :**
```javascript
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['three'] // Critique pour SSR
  }
})
```

### Architecture de Threlte

Threlte 8 a été entièrement reconstruit pour Svelte 5 avec plusieurs améliorations majeures :

**Le composant `<Canvas>` :**
- Racine de toute scène 3D
- Crée le renderer WebGL avec des defaults sensés
- Responsive automatiquement (100% du parent)
- Tous les composants Threlte doivent être des enfants de `<Canvas>`

**Le composant `<T>` universel :**
- Wrapper générique pour TOUS les objets Three.js
- Props évaluées individuellement (boost de performance majeur)
- Gestion automatique du disposal des objets

**Structure de base :**
```svelte
<!-- +page.svelte -->
<script>
  import { Canvas } from '@threlte/core'
  import Scene from '$lib/Scene.svelte'
</script>

<div style="width: 100vw; height: 100vh;">
  <Canvas>
    <Scene />
  </Canvas>
</div>
```

### Intégration Svelte 5 runes

**Threlte 8 = Support natif Svelte 5**, sorti fin 2024/début 2025. Les runes fonctionnent seamlessly :

**1. État réactif ($state) :**
```svelte
<script>
  import { T, useTask } from '@threlte/core'
  
  let rotation = $state(0)
  let dicePosition = $state({ x: 0, y: 5, z: 0 })
  
  useTask((delta) => {
    rotation += delta * 0.5
  })
</script>

<T.Mesh 
  rotation.y={rotation} 
  position={[dicePosition.x, dicePosition.y, dicePosition.z]}
>
  <T.IcosahedronGeometry args={[1, 0]} />
  <T.MeshStandardMaterial color="hotpink" />
</T.Mesh>
```

**2. État dérivé ($derived) :**
```svelte
<script>
  let diceVelocity = $state({ x: 0, y: 0, z: 0 })
  
  let isMoving = $derived(
    Math.abs(diceVelocity.x) > 0.01 || 
    Math.abs(diceVelocity.y) > 0.01 ||
    Math.abs(diceVelocity.z) > 0.01
  )
  
  let speed = $derived.by(() => {
    return Math.sqrt(
      diceVelocity.x ** 2 + 
      diceVelocity.y ** 2 + 
      diceVelocity.z ** 2
    )
  })
</script>

{#if isMoving}
  <p>Le dé roule à {speed.toFixed(2)} unités/sec</p>
{/if}
```

**3. Effets ($effect) :**
```svelte
<script>
  import { useThrelte } from '@threlte/core'
  
  const { camera, scene } = useThrelte()
  
  // Réagir aux changements de caméra
  $effect(() => {
    console.log('Position caméra:', $camera.position)
  })
  
  // Cleanup automatique
  $effect(() => {
    const timer = setInterval(() => {
      updateDicePhysics()
    }, 100)
    
    return () => clearInterval(timer)
  })
</script>
```

**4. Props rune ($props) :**
```svelte
<script>
  let {
    diceType = 'd20',
    color = '#ff0000',
    initialPosition = { x: 0, y: 5, z: 0 },
    onRollComplete = () => {},
    children
  } = $props()
</script>

<T.Mesh position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
  <T.IcosahedronGeometry args={[1, 0]} />
  <T.MeshStandardMaterial color={color} />
</T.Mesh>
```

**5. Modules .svelte.js pour logique réutilisable :**
```javascript
// dicePhysics.svelte.js
export function createDicePhysics() {
  let velocity = $state({ x: 0, y: 0, z: 0 })
  let angularVelocity = $state({ x: 0, y: 0, z: 0 })
  let position = $state({ x: 0, y: 5, z: 0 })
  
  let isMoving = $derived(
    Math.abs(velocity.x) > 0.01 ||
    Math.abs(velocity.y) > 0.01 ||
    Math.abs(velocity.z) > 0.01
  )
  
  function applyImpulse(force) {
    velocity.x += force.x
    velocity.y += force.y
    velocity.z += force.z
  }
  
  return {
    get velocity() { return velocity },
    get angularVelocity() { return angularVelocity },
    get position() { return position },
    get isMoving() { return isMoving },
    applyImpulse
  }
}
```

```svelte
<!-- Dice.svelte -->
<script>
  import { createDicePhysics } from './dicePhysics.svelte.js'
  
  const physics = createDicePhysics()
  
  function rollDice() {
    physics.applyImpulse({ x: 5, y: 10, z: -15 })
  }
</script>
```

### Best practices pour la performance

**1. useTask - Boucle d'animation :**
```svelte
<script>
  import { T, useTask } from '@threlte/core'
  
  let meshRef = $state.raw() // Utiliser .raw() pour objets Three.js
  
  const { start, stop, started } = useTask((delta) => {
    if (!meshRef) return
    
    // Animation indépendante du framerate
    meshRef.rotation.y += delta * 0.5
  }, {
    autostart: true,
    autoInvalidate: true // Déclenche re-render auto
  })
</script>

<T.Mesh bind:ref={meshRef}>
  <T.IcosahedronGeometry />
</T.Mesh>
```

**2. Modes de rendu :**
```svelte
<!-- Always render (défaut) - pour animations continues -->
<Canvas renderMode="always">
  <Scene />
</Canvas>

<!-- On-demand (optimisé) - render seulement sur invalidation -->
<Canvas renderMode="on-demand">
  <Scene />
</Canvas>

<!-- Manual - contrôle total -->
<Canvas renderMode="manual" autoRender={false}>
  <Scene />
</Canvas>
```

**3. Gestion mémoire automatique (Threlte 8) :**
```svelte
<!-- Disposal automatique des géométries/matériaux -->
<T.Mesh>
  <T.BoxGeometry /> <!-- Nettoyé auto au démontage -->
  <T.MeshStandardMaterial /> <!-- Nettoyé auto au démontage -->
</T.Mesh>
```

**4. Utiliser $state.raw() pour objets Three.js :**
```svelte
<script>
  // ❌ Mauvais - Svelte va wrapper l'objet dans un proxy
  let mesh = $state()
  
  // ✅ Bon - Pas de proxy, meilleure performance
  let mesh = $state.raw()
  let rigidBody = $state.raw()
</script>
```

---

## 2. Géométries des dés

### Spécifications mathématiques des polyèdres

**D4 (Tétraèdre) :**
- 4 faces triangulaires, 4 vertices, 6 arêtes
```javascript
const vertices = [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1]
const faces = [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1]
```

**D6 (Cube) :**
- 6 faces carrées, 8 vertices, 12 arêtes
- Convention : faces opposées = 7 (6↔1, 5↔2, 4↔3)

**D8 (Octaèdre) :**
- 8 faces triangulaires, 6 vertices, 12 arêtes
- Convention : faces opposées = 9
```javascript
const vertices = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1]
```

**D10 (Trapézoèdre pentagonal) :**
- 10 faces en cerf-volant, 12 vertices, 20 arêtes
- Pas un solide platonique
```javascript
const sides = 10
const vertices = [0, 0, 1, 0, 0, -1] // Pôles

// Anneau central zigzag
for (let i = 0; i < sides; i++) {
  const angle = (i * Math.PI * 2) / sides
  const z = 0.105 * (i % 2 ? 1 : -1) // Alternance haut/bas
  vertices.push(
    -Math.cos(angle),
    -Math.sin(angle),
    z
  )
}
```

**D12 (Dodécaèdre) :**
- 12 faces pentagonales, 20 vertices, 30 arêtes
- Utilise le nombre d'or φ = (1 + √5)/2 ≈ 1.618
- Convention : faces opposées = 13

**D20 (Icosaèdre) :**
- 20 faces triangulaires, 12 vertices, 30 arêtes
- Utilise le nombre d'or
- Convention : faces opposées = 21

```javascript
const t = (1 + Math.sqrt(5)) / 2 // Nombre d'or

const vertices = [
  -1, t, 0,    1, t, 0,     // Rectangle haut
  -1, -t, 0,   1, -t, 0,    // Rectangle bas
  0, -1, t,    0, 1, t,     // Rectangle avant
  0, -1, -t,   0, 1, -t,    // Rectangle arrière
  t, 0, -1,    t, 0, 1,     // Rectangle droite
  -t, 0, -1,   -t, 0, 1     // Rectangle gauche
]
```

### Création dans Three.js/Threlte

**Géométries intégrées (simples) :**
```svelte
<script>
  import { T } from '@threlte/core'
</script>

<!-- D4 -->
<T.Mesh>
  <T.TetrahedronGeometry args={[1, 0]} />
  <T.MeshStandardMaterial />
</T.Mesh>

<!-- D6 -->
<T.Mesh>
  <T.BoxGeometry args={[1, 1, 1]} />
  <T.MeshStandardMaterial />
</T.Mesh>

<!-- D8 -->
<T.Mesh>
  <T.OctahedronGeometry args={[1, 0]} />
  <T.MeshStandardMaterial />
</T.Mesh>

<!-- D12 -->
<T.Mesh>
  <T.DodecahedronGeometry args={[1, 0]} />
  <T.MeshStandardMaterial />
</T.Mesh>

<!-- D20 -->
<T.Mesh>
  <T.IcosahedronGeometry args={[1, 0]} />
  <T.MeshStandardMaterial />
</T.Mesh>
```

**D10 personnalisé avec PolyhedronGeometry :**
```svelte
<script>
  import { T } from '@threlte/core'
  import { PolyhedronGeometry } from 'three'
  
  // Créer vertices D10
  const sides = 10
  const vertices = [0, 0, 1, 0, 0, -1]
  
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI * 2) / sides
    vertices.push(
      -Math.cos(angle),
      -Math.sin(angle),
      0.105 * (i % 2 ? 1 : -1)
    )
  }
  
  const faces = [
    0, 2, 3,  0, 3, 4,  0, 4, 5,  0, 5, 6,  0, 6, 7,
    0, 7, 8,  0, 8, 9,  0, 9, 10, 0, 10, 11, 0, 11, 2,
    1, 3, 2,  1, 4, 3,  1, 5, 4,  1, 6, 5,  1, 7, 6,
    1, 8, 7,  1, 9, 8,  1, 10, 9, 1, 11, 10, 1, 2, 11
  ]
  
  const d10Geometry = new PolyhedronGeometry(vertices, faces, 1, 0)
</script>

<T.Mesh>
  <T is={d10Geometry} attach="geometry" />
  <T.MeshStandardMaterial />
</T.Mesh>
```

**Composant réutilisable pour tous les dés :**
```svelte
<!-- DiceGeometry.svelte -->
<script>
  import { T } from '@threlte/core'
  import { PolyhedronGeometry } from 'three'
  
  let { type = 'd20', radius = 1 } = $props()
  
  const geometries = {
    d4: () => new T.TetrahedronGeometry(radius, 0),
    d6: () => new T.BoxGeometry(radius, radius, radius),
    d8: () => new T.OctahedronGeometry(radius, 0),
    d10: () => createD10Geometry(radius),
    d12: () => new T.DodecahedronGeometry(radius, 0),
    d20: () => new T.IcosahedronGeometry(radius, 0)
  }
  
  function createD10Geometry(r) {
    const sides = 10
    const vertices = [0, 0, 1, 0, 0, -1]
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides
      vertices.push(
        -Math.cos(angle),
        -Math.sin(angle),
        0.105 * (i % 2 ? 1 : -1)
      )
    }
    
    const faces = [
      0, 2, 3,  0, 3, 4,  0, 4, 5,  0, 5, 6,  0, 6, 7,
      0, 7, 8,  0, 8, 9,  0, 9, 10, 0, 10, 11, 0, 11, 2,
      1, 3, 2,  1, 4, 3,  1, 5, 4,  1, 6, 5,  1, 7, 6,
      1, 8, 7,  1, 9, 8,  1, 10, 9, 1, 11, 10, 1, 2, 11
    ]
    
    return new PolyhedronGeometry(vertices, faces, r, 0)
  }
</script>

{#if type === 'd4'}
  <T.TetrahedronGeometry args={[radius, 0]} />
{:else if type === 'd6'}
  <T.BoxGeometry args={[radius, radius, radius]} />
{:else if type === 'd8'}
  <T.OctahedronGeometry args={[radius, 0]} />
{:else if type === 'd10'}
  <T is={createD10Geometry(radius)} />
{:else if type === 'd12'}
  <T.DodecahedronGeometry args={[radius, 0]} />
{:else if type === 'd20'}
  <T.IcosahedronGeometry args={[radius, 0]} />
{/if}
```

---

## 3. Moteur physique Rapier

### Configuration de base

```svelte
<!-- Scene.svelte -->
<script>
  import { T } from '@threlte/core'
  import { World, RigidBody, AutoColliders } from '@threlte/rapier'
</script>

<World gravity={[0, -9.81, 0]}>
  <!-- Contenu avec physique -->
  
  {#snippet fallback()}
    <p>Votre navigateur ne supporte pas WASM.</p>
  {/snippet}
</World>
```

### Configuration des corps rigides pour dés

**Paramètres réalistes pour dés en plastique :**
```svelte
<script>
  import { RigidBody, AutoColliders } from '@threlte/rapier'
  
  let diceBody = $state.raw()
  
  const dicePhysicsProps = {
    type: 'dynamic',
    mass: 0.01,              // 10 grammes
    restitution: 0.4,        // Rebond modéré
    friction: 0.6,           // Friction surface
    linearDamping: 0.1,      // Résistance air
    angularDamping: 0.1      // Ralentissement rotation
  }
</script>

<RigidBody
  bind:rigidBody={diceBody}
  type="dynamic"
  position={[0, 5, 0]}
  linearDamping={0.1}
  angularDamping={0.1}
>
  <AutoColliders 
    shape="convexHull"
    density={1.0}
    restitution={0.4}
    friction={0.6}
  >
    <T.Mesh>
      <T.IcosahedronGeometry args={[1, 0]} />
      <T.MeshStandardMaterial color="#ff0000" />
    </T.Mesh>
  </AutoColliders>
</RigidBody>
```

**Formes de collision par type de dé :**
```svelte
<!-- D6 - Cuboid (plus rapide) -->
<RigidBody type="dynamic">
  <Collider shape="cuboid" args={[0.5, 0.5, 0.5]} />
  <T.Mesh>
    <T.BoxGeometry />
  </T.Mesh>
</RigidBody>

<!-- D20 - ConvexHull (plus précis) -->
<RigidBody type="dynamic">
  <AutoColliders shape="convexHull">
    <T.Mesh>
      <T.IcosahedronGeometry />
    </T.Mesh>
  </AutoColliders>
</RigidBody>
```

### Sol et murs

```svelte
<script>
  import { Collider } from '@threlte/rapier'
</script>

<!-- Sol statique -->
<Collider 
  shape="cuboid" 
  args={[50, 0.1, 50]}
  friction={0.7}
  restitution={0.3}
/>

<!-- Murs pour contenir les dés -->
<Collider shape="cuboid" args={[1, 5, 50]} position={[25, 0, 0]} />
<Collider shape="cuboid" args={[1, 5, 50]} position={[-25, 0, 0]} />
<Collider shape="cuboid" args={[50, 5, 1]} position={[0, 0, 25]} />
<Collider shape="cuboid" args={[50, 5, 1]} position={[0, 0, -25]} />
```

### Appliquer des forces et impulsions

**Lancer réaliste de dés :**
```svelte
<script>
  let diceBody = $state.raw()
  
  function throwDice() {
    if (!diceBody) return
    
    // Réinitialiser position
    diceBody.setTranslation({ x: 0, y: 5, z: 0 }, true)
    diceBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    
    // Impulsion linéaire (direction de lancer)
    const throwStrength = 15 + Math.random() * 5
    diceBody.setLinvel({
      x: (Math.random() - 0.5) * 4,  // Dispersion horizontale
      y: Math.random() * 2,           // Légère élévation
      z: -throwStrength               // Direction principale
    }, true)
    
    // Impulsion angulaire (spin aléatoire)
    const spinStrength = 8
    diceBody.setAngvel({
      x: (Math.random() - 0.5) * spinStrength,
      y: (Math.random() - 0.5) * spinStrength,
      z: (Math.random() - 0.5) * spinStrength
    }, true)
  }
  
  // Alternative : impulsion ponctuelle
  function applyImpulse() {
    diceBody.applyImpulse({ x: 0, y: 5, z: -10 }, true)
    diceBody.applyTorqueImpulse({ x: 3, y: 3, z: 3 }, true)
  }
</script>

<button onclick={throwDice}>Lancer le dé</button>
```

### Détecter l'arrêt du dé

**Méthode 1 : Vérification de vélocité**
```svelte
<script>
  import { useTask } from '@threlte/core'
  
  let diceBody = $state.raw()
  let isRolling = $state(false)
  let result = $state(null)
  
  const VELOCITY_THRESHOLD = 0.05
  
  function checkIfStopped(body) {
    const linvel = body.linvel()
    const angvel = body.angvel()
    
    const linearSpeed = Math.sqrt(
      linvel.x ** 2 + linvel.y ** 2 + linvel.z ** 2
    )
    const angularSpeed = Math.sqrt(
      angvel.x ** 2 + angvel.y ** 2 + angvel.z ** 2
    )
    
    return linearSpeed < VELOCITY_THRESHOLD && 
           angularSpeed < VELOCITY_THRESHOLD
  }
  
  useTask(() => {
    if (!diceBody || !isRolling) return
    
    if (checkIfStopped(diceBody)) {
      isRolling = false
      result = readDiceValue(diceBody)
      console.log('Résultat:', result)
    }
  })
</script>
```

**Méthode 2 : Sleep state (intégré)**
```svelte
<script>
  useTask(() => {
    if (!diceBody || !isRolling) return
    
    if (diceBody.isSleeping()) {
      isRolling = false
      result = readDiceValue(diceBody)
    }
  })
</script>
```

### Lecture de la valeur du dé par raycasting

```svelte
<script>
  import { Raycaster, Vector3 } from 'three'
  import { useThrelte } from '@threlte/core'
  
  const { scene } = useThrelte()
  
  // Mapping face index -> valeur du dé
  const d20FaceToValue = {
    0: 17, 1: 3, 2: 7, 3: 1, 4: 19, 5: 16,
    6: 10, 7: 15, 8: 13, 9: 9, 10: 8, 11: 12,
    12: 5, 13: 11, 14: 6, 15: 20, 16: 2, 17: 18,
    18: 4, 19: 14
  }
  
  function readDiceValue(rigidBody, diceMesh) {
    const trans = rigidBody.translation()
    
    // Raycast depuis au-dessus du dé vers le bas
    const raycaster = new Raycaster(
      new Vector3(trans.x, trans.y + 5, trans.z),
      new Vector3(0, -1, 0),  // Direction vers le bas
      0.1,   // near
      15     // far
    )
    
    let intersects = raycaster.intersectObjects($scene.children, true)
    
    // Filtrer pour ce dé uniquement
    intersects = intersects.filter(hit => hit.object.id === diceMesh.id)
    
    if (intersects.length > 0) {
      const topFaceIndex = intersects[0].faceIndex
      return d20FaceToValue[topFaceIndex] || null
    }
    
    return null
  }
</script>
```

---

## 4. Textures et numérotation

### Créer des textures avec Canvas 2D

**Fonction génératrice de texture pour face de dé :**
```javascript
// utils/diceTextures.js
export function createNumberTexture(number, size = 256) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  canvas.width = size
  canvas.height = size
  
  // Fond blanc
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size, size)
  
  // Bordure
  context.strokeStyle = '#cccccc'
  context.lineWidth = 2
  context.strokeRect(0, 0, size, size)
  
  // Nombre
  context.fillStyle = '#000000'
  context.font = `bold ${size * 0.6}px Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(number.toString(), size / 2, size / 2)
  
  return canvas
}

export function createDiceTexture(faceLabels) {
  const canvases = faceLabels.map(label => createNumberTexture(label))
  return canvases
}
```

### Application des textures dans Threlte

**Méthode 1 : Matériaux multiples (D6)**
```svelte
<script>
  import { T } from '@threlte/core'
  import { CanvasTexture } from 'three'
  import { createNumberTexture } from '$lib/utils/diceTextures'
  import { onMount } from 'svelte'
  
  let materials = $state([])
  
  onMount(() => {
    // Créer 6 textures pour D6
    const faceNumbers = [1, 2, 3, 4, 5, 6]
    materials = faceNumbers.map(num => {
      const canvas = createNumberTexture(num)
      const texture = new CanvasTexture(canvas)
      texture.needsUpdate = true
      return new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.7,
        metalness: 0.1
      })
    })
  })
</script>

{#if materials.length > 0}
  <T.Mesh material={materials}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
{/if}
```

**Méthode 2 : Texture atlas unique**
```javascript
// Créer un atlas de texture avec tous les numéros
export function createDiceAtlas(numbers, gridSize = 4) {
  const tileSize = 256
  const atlasSize = tileSize * gridSize
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = atlasSize
  canvas.height = atlasSize
  
  numbers.forEach((num, i) => {
    const x = (i % gridSize) * tileSize
    const y = Math.floor(i / gridSize) * tileSize
    
    // Dessiner le numéro dans sa cellule
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, tileSize, tileSize)
    
    ctx.fillStyle = '#000000'
    ctx.font = `bold ${tileSize * 0.6}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(num.toString(), x + tileSize/2, y + tileSize/2)
  })
  
  return canvas
}
```

### UV Mapping personnalisé

**Modifier les UVs pour D6 avec atlas :**
```svelte
<script>
  import { T } from '@threlte/core'
  import { BoxGeometry, CanvasTexture } from 'three'
  import { createDiceAtlas } from '$lib/utils/diceTextures'
  import { onMount } from 'svelte'
  
  let geometry = $state.raw()
  let texture = $state.raw()
  
  onMount(() => {
    // Créer géométrie
    geometry = new BoxGeometry(1, 1, 1)
    
    // Créer atlas
    const atlasCanvas = createDiceAtlas([1, 2, 3, 4, 5, 6], 3)
    texture = new CanvasTexture(atlasCanvas)
    texture.needsUpdate = true
    
    // Modifier UVs pour mapper chaque face à sa position dans l'atlas
    const uvAttribute = geometry.attributes.uv
    
    // Positions dans atlas 3x3 (normalize to 0-1)
    const faceUVs = [
      [0, 0],      // Face 1: coin supérieur gauche
      [1/3, 0],    // Face 2
      [2/3, 0],    // Face 3
      [0, 1/3],    // Face 4
      [1/3, 1/3],  // Face 5
      [2/3, 1/3]   // Face 6
    ]
    
    // Appliquer UVs (4 vertices par face, 6 faces)
    for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
      const [u, v] = faceUVs[faceIndex]
      const tileSize = 1/3
      
      // Les 4 coins de la face dans l'atlas
      const uvs = [
        u, v + tileSize,              // Bottom-left
        u + tileSize, v + tileSize,   // Bottom-right
        u, v,                         // Top-left
        u + tileSize, v               // Top-right
      ]
      
      // BoxGeometry a 2 triangles par face (6 vertices)
      const vertexOffset = faceIndex * 4
      for (let i = 0; i < 4; i++) {
        uvAttribute.setXY(vertexOffset + i, uvs[i * 2], uvs[i * 2 + 1])
      }
    }
    
    uvAttribute.needsUpdate = true
  })
</script>

{#if geometry && texture}
  <T.Mesh geometry={geometry}>
    <T.MeshStandardMaterial map={texture} />
  </T.Mesh>
{/if}
```

### Textures animées ou dynamiques

```svelte
<script>
  import { useTask } from '@threlte/core'
  import { CanvasTexture } from 'three'
  
  let canvas = $state(null)
  let texture = $state.raw()
  let frame = $state(0)
  
  onMount(() => {
    canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    texture = new CanvasTexture(canvas)
  })
  
  // Mettre à jour la texture chaque frame
  useTask(() => {
    if (!canvas || !texture) return
    
    const ctx = canvas.getContext('2d')
    
    // Effacer
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 512, 512)
    
    // Dessiner contenu animé
    ctx.fillStyle = `hsl(${frame % 360}, 70%, 50%)`
    ctx.fillRect(100, 100, 312, 312)
    
    // Marquer pour mise à jour
    texture.needsUpdate = true
    frame++
  })
</script>

{#if texture}
  <T.Mesh>
    <T.BoxGeometry />
    <T.MeshStandardMaterial map={texture} />
  </T.Mesh>
{/if}
```

---

## 5. Interactivité et contrôles

### Système de lancer complet

```svelte
<!-- DiceRoller.svelte -->
<script>
  import { T, useTask, useThrelte } from '@threlte/core'
  import { World, RigidBody, AutoColliders } from '@threlte/rapier'
  import { Raycaster, Vector3 } from 'three'
  
  const { scene } = useThrelte()
  
  let diceBody = $state.raw()
  let diceMesh = $state.raw()
  let isRolling = $state(false)
  let result = $state(null)
  let rollHistory = $state([])
  
  // Mapping faces
  const d20Faces = {
    0: 17, 1: 3, 2: 7, 3: 1, 4: 19, 5: 16,
    6: 10, 7: 15, 8: 13, 9: 9, 10: 8, 11: 12,
    12: 5, 13: 11, 14: 6, 15: 20, 16: 2, 17: 18,
    18: 4, 19: 14
  }
  
  function rollDice() {
    if (isRolling || !diceBody) return
    
    isRolling = true
    result = null
    
    // Position de départ aléatoire
    diceBody.setTranslation({
      x: (Math.random() - 0.5) * 2,
      y: 5,
      z: 0
    }, true)
    
    // Rotation aléatoire
    diceBody.setRotation({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      w: Math.random()
    }, true)
    
    // Lancer
    const throwForce = 15 + Math.random() * 5
    diceBody.setLinvel({
      x: (Math.random() - 0.5) * 4,
      y: Math.random() * 2,
      z: -throwForce
    }, true)
    
    // Spin
    diceBody.setAngvel({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10
    }, true)
  }
  
  function readResult() {
    const trans = diceBody.translation()
    
    const raycaster = new Raycaster(
      new Vector3(trans.x, trans.y + 5, trans.z),
      new Vector3(0, -1, 0),
      0.1,
      15
    )
    
    let intersects = raycaster.intersectObjects($scene.children, true)
    intersects = intersects.filter(hit => hit.object.id === diceMesh.id)
    
    if (intersects.length > 0) {
      const faceIndex = intersects[0].faceIndex
      return d20Faces[faceIndex] || null
    }
    
    return null
  }
  
  // Vérifier chaque frame si le dé s'est arrêté
  useTask(() => {
    if (!isRolling || !diceBody) return
    
    const linvel = diceBody.linvel()
    const angvel = diceBody.angvel()
    
    const speed = Math.sqrt(
      linvel.x ** 2 + linvel.y ** 2 + linvel.z ** 2
    )
    const angularSpeed = Math.sqrt(
      angvel.x ** 2 + angvel.y ** 2 + angvel.z ** 2
    )
    
    if (speed < 0.05 && angularSpeed < 0.05) {
      isRolling = false
      result = readResult()
      
      if (result) {
        rollHistory = [...rollHistory, {
          value: result,
          timestamp: Date.now()
        }]
      }
    }
  })
</script>

<div class="ui">
  <button onclick={rollDice} disabled={isRolling}>
    {isRolling ? 'Lancer en cours...' : 'Lancer le D20'}
  </button>
  
  {#if result !== null}
    <div class="result">
      <h2>Résultat: {result}</h2>
    </div>
  {/if}
  
  {#if rollHistory.length > 0}
    <div class="history">
      <h3>Historique:</h3>
      <ul>
        {#each rollHistory.slice(-5).reverse() as roll}
          <li>{roll.value}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<World gravity={[0, -9.81, 0]}>
  <!-- Lumières -->
  <T.DirectionalLight position={[5, 10, 5]} intensity={1} castShadow />
  <T.AmbientLight intensity={0.3} />
  
  <!-- Caméra -->
  <T.PerspectiveCamera makeDefault position={[0, 8, 12]} fov={50} />
  
  <!-- Dé -->
  <RigidBody
    bind:rigidBody={diceBody}
    type="dynamic"
    position={[0, 5, 0]}
    linearDamping={0.1}
    angularDamping={0.1}
  >
    <AutoColliders shape="convexHull" restitution={0.4} friction={0.6}>
      <T.Mesh bind:ref={diceMesh} castShadow>
        <T.IcosahedronGeometry args={[1, 0]} />
        <T.MeshStandardMaterial 
          color={isRolling ? '#ff0000' : '#ffffff'}
          roughness={0.7}
          metalness={0.3}
        />
      </T.Mesh>
    </AutoColliders>
  </RigidBody>
  
  <!-- Sol -->
  <RigidBody type="fixed">
    <AutoColliders shape="cuboid">
      <T.Mesh rotation.x={-Math.PI / 2} receiveShadow>
        <T.PlaneGeometry args={[20, 20]} />
        <T.MeshStandardMaterial color="#228B22" />
      </T.Mesh>
    </AutoColliders>
  </RigidBody>
</World>

<style>
  .ui {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 100;
  }
  
  button {
    padding: 12px 24px;
    font-size: 18px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  
  button:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
  
  .result {
    margin-top: 20px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .history {
    margin-top: 20px;
    padding: 15px;
    background: white;
    border-radius: 8px;
  }
  
  .history ul {
    list-style: none;
    padding: 0;
  }
  
  .history li {
    padding: 5px;
    margin: 2px 0;
    background: #f0f0f0;
    border-radius: 4px;
  }
</style>
```

### Animations et effets visuels

**Animation de saut avant lancer :**
```svelte
<script>
  import { spring } from 'svelte/motion'
  
  let yPosition = spring(5, { stiffness: 0.1, damping: 0.3 })
  
  async function animatedRoll() {
    // Animation de saut
    yPosition.set(7)
    await new Promise(resolve => setTimeout(resolve, 200))
    yPosition.set(5)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Lancer
    rollDice()
  }
</script>

<T.Mesh position.y={$yPosition}>
  <!-- Dé -->
</T.Mesh>
```

**Trail effect (traînée) :**
```svelte
<script>
  import { useTask } from '@threlte/core'
  
  let trailPositions = $state([])
  
  useTask(() => {
    if (!diceBody || !isRolling) return
    
    const trans = diceBody.translation()
    trailPositions = [
      ...trailPositions.slice(-20), // Garder 20 dernières positions
      { x: trans.x, y: trans.y, z: trans.z }
    ]
  })
</script>

<!-- Afficher trail -->
{#each trailPositions as pos, i}
  <T.Mesh position={[pos.x, pos.y, pos.z]}>
    <T.SphereGeometry args={[0.05]} />
    <T.MeshBasicMaterial 
      color="#ff0000" 
      opacity={i / trailPositions.length}
      transparent
    />
  </T.Mesh>
{/each}
```

---

## 6. Implémentation complète

### Structure de projet recommandée

```
src/
├── routes/
│   └── +page.svelte              # Point d'entrée Canvas
├── lib/
│   ├── components/
│   │   ├── Scene.svelte          # Scène principale
│   │   ├── Dice.svelte           # Composant dé individuel
│   │   ├── DiceRoller.svelte     # Système de lancer complet
│   │   └── Table.svelte          # Sol/table de jeu
│   ├── stores/
│   │   └── diceState.svelte.js   # État avec runes
│   └── utils/
│       ├── diceGeometries.js     # Géométries polyèdres
│       ├── diceTextures.js       # Génération textures
│       └── diceFaces.js          # Mapping face->valeur
└── static/
    └── textures/                 # Textures optionnelles
```

### État global avec runes

```javascript
// lib/stores/diceState.svelte.js
export function createDiceStore() {
  let diceInPlay = $state([])
  let isRolling = $state(false)
  let currentResults = $state([])
  let rollHistory = $state([])
  
  const totalValue = $derived(
    currentResults.reduce((sum, r) => sum + (r.value || 0), 0)
  )
  
  function addDie(type) {
    diceInPlay = [...diceInPlay, {
      id: crypto.randomUUID(),
      type,
      rigidBody: null,
      mesh: null
    }]
  }
  
  function removeDie(id) {
    diceInPlay = diceInPlay.filter(d => d.id !== id)
  }
  
  function rollAll() {
    if (isRolling) return
    
    isRolling = true
    currentResults = []
    
    diceInPlay.forEach(die => {
      if (die.rigidBody) {
        throwDie(die.rigidBody)
      }
    })
  }
  
  function throwDie(rigidBody) {
    rigidBody.setTranslation({
      x: (Math.random() - 0.5) * 3,
      y: 5,
      z: (Math.random() - 0.5) * 3
    }, true)
    
    rigidBody.setLinvel({
      x: (Math.random() - 0.5) * 4,
      y: Math.random() * 2,
      z: (Math.random() - 0.5) * 4
    }, true)
    
    rigidBody.setAngvel({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10
    }, true)
  }
  
  function recordResult(dieId, value) {
    const existing = currentResults.find(r => r.dieId === dieId)
    if (!existing) {
      currentResults = [...currentResults, { dieId, value }]
    }
    
    // Si tous les dés ont donné un résultat
    if (currentResults.length === diceInPlay.length) {
      isRolling = false
      rollHistory = [...rollHistory, {
        timestamp: Date.now(),
        results: [...currentResults],
        total: totalValue
      }]
    }
  }
  
  return {
    get diceInPlay() { return diceInPlay },
    get isRolling() { return isRolling },
    get currentResults() { return currentResults },
    get rollHistory() { return rollHistory },
    get totalValue() { return totalValue },
    addDie,
    removeDie,
    rollAll,
    recordResult
  }
}

// Instance globale
export const diceStore = createDiceStore()
```

### Composant Dice complet

```svelte
<!-- lib/components/Dice.svelte -->
<script>
  import { T, useTask, useThrelte } from '@threlte/core'
  import { RigidBody, AutoColliders } from '@threlte/rapier'
  import { Raycaster, Vector3 } from 'three'
  import { diceStore } from '$lib/stores/diceState.svelte.js'
  
  let {
    id,
    type = 'd20',
    color = '#ffffff',
    initialPosition = { x: 0, y: 5, z: 0 }
  } = $props()
  
  const { scene } = useThrelte()
  
  let rigidBody = $state.raw()
  let mesh = $state.raw()
  let hasReported = $state(false)
  
  const geometryMap = {
    d4: () => ({ component: 'TetrahedronGeometry', args: [1, 0] }),
    d6: () => ({ component: 'BoxGeometry', args: [1, 1, 1] }),
    d8: () => ({ component: 'OctahedronGeometry', args: [1, 0] }),
    d12: () => ({ component: 'DodecahedronGeometry', args: [1, 0] }),
    d20: () => ({ component: 'IcosahedronGeometry', args: [1, 0] })
  }
  
  const faceMap = {
    d20: {
      0: 17, 1: 3, 2: 7, 3: 1, 4: 19, 5: 16,
      6: 10, 7: 15, 8: 13, 9: 9, 10: 8, 11: 12,
      12: 5, 13: 11, 14: 6, 15: 20, 16: 2, 17: 18,
      18: 4, 19: 14
    },
    d6: { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6 }
    // Ajouter d'autres mappings...
  }
  
  function readValue() {
    if (!rigidBody || !mesh) return null
    
    const trans = rigidBody.translation()
    const raycaster = new Raycaster(
      new Vector3(trans.x, trans.y + 5, trans.z),
      new Vector3(0, -1, 0),
      0.1,
      15
    )
    
    let intersects = raycaster.intersectObjects($scene.children, true)
    intersects = intersects.filter(hit => hit.object.id === mesh.id)
    
    if (intersects.length > 0) {
      const faceIndex = intersects[0].faceIndex
      return faceMap[type]?.[faceIndex] || null
    }
    
    return null
  }
  
  useTask(() => {
    if (!rigidBody || !diceStore.isRolling) return
    
    const linvel = rigidBody.linvel()
    const angvel = rigidBody.angvel()
    
    const speed = Math.sqrt(
      linvel.x ** 2 + linvel.y ** 2 + linvel.z ** 2
    )
    const rotation = Math.sqrt(
      angvel.x ** 2 + angvel.y ** 2 + angvel.z ** 2
    )
    
    if (speed < 0.05 && rotation < 0.05 && !hasReported) {
      const value = readValue()
      if (value) {
        diceStore.recordResult(id, value)
        hasReported = true
      }
    }
  })
  
  $effect(() => {
    if (diceStore.isRolling) {
      hasReported = false
    }
  })
  
  const geom = geometryMap[type]()
</script>

<RigidBody
  bind:rigidBody={rigidBody}
  type="dynamic"
  position={[initialPosition.x, initialPosition.y, initialPosition.z]}
  linearDamping={0.1}
  angularDamping={0.1}
>
  <AutoColliders shape="convexHull" restitution={0.4} friction={0.6}>
    <T.Mesh bind:ref={mesh} castShadow>
      <T 
        is={geom.component} 
        args={geom.args} 
      />
      <T.MeshStandardMaterial 
        color={diceStore.isRolling ? '#ff0000' : color}
        roughness={0.7}
        metalness={0.3}
      />
    </T.Mesh>
  </AutoColliders>
</RigidBody>
```

### Page principale

```svelte
<!-- routes/+page.svelte -->
<script>
  import { Canvas } from '@threlte/core'
  import { World } from '@threlte/rapier'
  import Scene from '$lib/components/Scene.svelte'
  import { diceStore } from '$lib/stores/diceState.svelte.js'
</script>

<div class="container">
  <div class="ui">
    <h1>Lanceur de Dés 3D</h1>
    
    <div class="controls">
      <button onclick={() => diceStore.addDie('d20')}>
        Ajouter D20
      </button>
      <button onclick={() => diceStore.addDie('d6')}>
        Ajouter D6
      </button>
      <button 
        onclick={() => diceStore.rollAll()} 
        disabled={diceStore.isRolling || diceStore.diceInPlay.length === 0}
      >
        {diceStore.isRolling ? 'Lancer en cours...' : 'Lancer tous'}
      </button>
    </div>
    
    {#if diceStore.currentResults.length > 0}
      <div class="results">
        <h2>Total: {diceStore.totalValue}</h2>
        <ul>
          {#each diceStore.currentResults as result}
            <li>{result.value}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
  
  <Canvas>
    <World gravity={[0, -9.81, 0]}>
      <Scene />
    </World>
  </Canvas>
</div>

<style>
  .container {
    position: relative;
    width: 100vw;
    height: 100vh;
  }
  
  .ui {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 100;
    background: rgba(255, 255, 255, 0.9);
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  
  .controls {
    display: flex;
    gap: 10px;
    margin-top: 15px;
  }
  
  button {
    padding: 10px 20px;
    font-size: 16px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  button:hover:not(:disabled) {
    background: #45a049;
  }
  
  button:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
  
  .results {
    margin-top: 20px;
    padding: 15px;
    background: #f9f9f9;
    border-radius: 8px;
  }
  
  .results ul {
    list-style: none;
    padding: 0;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .results li {
    padding: 8px 12px;
    background: white;
    border-radius: 6px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
</style>
```

---

## Optimisations de performance

### 1. Réduire les calculs de physique

```svelte
<World 
  gravity={[0, -9.81, 0]}
  framerate={60}  <!-- Timestep fixe pour déterminisme -->
>
```

### 2. Utiliser on-demand rendering

```svelte
<Canvas renderMode="on-demand">
  <!-- Render seulement quand nécessaire -->
</Canvas>
```

### 3. Simplifier les colliders

```svelte
<!-- Au lieu de convexHull pour D6, utiliser cuboid -->
<Collider shape="cuboid" args={[0.5, 0.5, 0.5]} />
```

### 4. Limiter le nombre de dés actifs

```javascript
const MAX_DICE = 10

function addDie(type) {
  if (diceInPlay.length >= MAX_DICE) {
    console.warn('Maximum de dés atteint')
    return
  }
  // ...
}
```

### 5. Pooling d'objets

```javascript
// Réutiliser les dés au lieu de les détruire/recréer
let dicePool = $state([])

function getDieFromPool(type) {
  let die = dicePool.find(d => d.type === type && !d.active)
  if (!die) {
    die = createNewDie(type)
    dicePool.push(die)
  }
  die.active = true
  return die
}

function returnDieToPool(die) {
  die.active = false
  die.rigidBody.setTranslation({ x: 0, y: -100, z: 0 }, true)
}
```

---

## Ressources et références

**Documentation officielle :**
- Threlte : https://threlte.xyz/
- Three.js : https://threejs.org/docs/
- Rapier : https://rapier.rs/docs/
- Svelte 5 Runes : https://svelte.dev/docs/svelte/what-are-runes

**Exemples et inspirations :**
- Owlbear Rodeo Dice : https://github.com/owlbear-rodeo/dice
- dddice.com : Système de dés commercial avancé
- Three.js Dice Library : https://github.com/byWulf/threejs-dice

**Packages npm :**
- `@threlte/core` - v8.1.3+ (Svelte 5 compatible)
- `@threlte/rapier` - Physique
- `@threlte/extras` - Composants utilitaires
- `three` - Moteur 3D
- `@dimforge/rapier3d-compat` - Moteur physique WASM

---

## Conclusion

Ce guide complet couvre tous les aspects nécessaires pour créer un système de lancer de dés 3D professionnel avec **Threlte 8 et Svelte 5**. Les runes de Svelte 5 ($state, $derived, $effect) s'intègrent seamlessly avec Threlte, offrant une réactivité native et performante. Le moteur physique Rapier fournit des simulations réalistes et déterministes, tandis que Three.js permet un rendu 3D de haute qualité dans le navigateur.

**Points clés à retenir :**

- Threlte 8 est entièrement reconstruit pour Svelte 5 avec support natif des runes
- Utiliser $state.raw() pour les objets Three.js afin d'éviter le wrapping par proxy
- Rapier offre une physique excellente pour les polyèdres avec convexHull
- Le raycasting est la méthode standard pour lire la valeur des dés
- Les textures Canvas 2D permettent une génération procédurale des numéros
- L'architecture modulaire avec stores.svelte.js facilite la gestion d'état complexe

Ce système est prêt pour une utilisation en production et peut être étendu avec des fonctionnalités supplémentaires comme le multijoueur (WebRTC/WebSockets), les animations avancées, les effets visuels (particules, bloom), et l'intégration avec des systèmes de jeu de rôle.