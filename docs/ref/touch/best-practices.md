# Bonnes pratiques Touch-Friendly

## Principes fondamentaux

### 1. Design defensif (Touch-First)

Concevoir pour le tactile d'abord, puis ameliorer pour la souris.

```css
/* BON - Base touch, amelioration souris */
.btn {
	min-height: 44px; /* Touch par defaut */
}

@media (pointer: fine) {
	.btn {
		min-height: 36px; /* Plus compact sur souris */
	}
}

/* ACCEPTABLE - Base desktop, amelioration touch */
.btn {
	height: 36px;
}

@media (pointer: coarse) {
	.btn {
		min-height: 44px;
	}
}
```

### 2. Adapter a la capacite, pas au device

```svelte
<!-- BON - S'adapte aux capacites -->
{#if inputCapability.canHover}
	<Tooltip>Info</Tooltip>
{:else}
	<Popover>Info</Popover>
{/if}

<!-- MAUVAIS - Assume que mobile = touch -->
{#if mobileStore.isMobile}
	<Popover>Info</Popover>
{:else}
	<Tooltip>Info</Tooltip>
{/if}
```

### 3. Ne jamais supprimer de fonctionnalite

```svelte
<!-- BON - Alternatives equivalentes -->
{#if inputCapability.hasTouch}
	<p>Appuyez longuement pour plus d'options</p>
{:else}
	<p>Clic droit pour plus d'options</p>
{/if}

<!-- MAUVAIS - Fonctionnalite manquante sur touch -->
{#if inputCapability.canHover}
	<ContextMenu>...</ContextMenu>
{/if}
```

---

## Tailles et espacements

### Minimum 44x44px pour les cibles principales

```css
/* Elements interactifs principaux */
.primary-action {
	min-width: 44px;
	min-height: 44px;
}
```

### Minimum 24px pour les cibles secondaires

```css
/* Elements moins frequemment utilises */
.secondary-action {
	min-width: 24px;
	min-height: 24px;
}

@media (pointer: coarse) {
	.secondary-action {
		min-width: 44px;
		min-height: 44px;
	}
}
```

### Espacement adequat

```css
/* Eviter les tap accidentels */
.button-row {
	gap: 8px;
}

@media (pointer: coarse) {
	.button-row {
		gap: 12px; /* Plus d'espace entre les cibles */
	}
}
```

---

## Feedback visuel

### Etats actifs plutot que hover

```css
/* Desktop - hover state */
@media (hover: hover) {
	.btn:hover {
		background: var(--primary-hover);
	}
}

/* Touch - active state */
@media (hover: none) {
	.btn:active {
		background: var(--primary-active);
		transform: scale(0.98);
	}
}
```

### Feedback immediat

```css
.btn {
	transition:
		transform 150ms,
		background 150ms;
}

.btn:active {
	transform: scale(0.98); /* Feedback visuel immediat */
}
```

---

## Anti-patterns a eviter

### 1. Hover obligatoire pour les infos

```svelte
<!-- MAUVAIS - Info inaccessible sur touch -->
<button title="Cette action supprime l'element"> Supprimer </button>

<!-- BON - Info accessible a tous -->
<button>
	Supprimer
	<span class="sr-only">Cette action supprime l'element</span>
</button>
<!-- Ou utiliser un Popover/Dialog pour plus d'infos -->
```

### 2. Double-tap pour une action

```javascript
// MAUVAIS - Conflit avec le zoom natif
element.addEventListener('dblclick', handleAction);

// BON - Action au simple tap/clic
element.addEventListener('click', handleAction);
```

### 3. Drag obligatoire sans alternative

```svelte
<!-- MAUVAIS - Drag uniquement -->
<DraggableList {items} onReorder={handleReorder} />

<!-- BON - Drag + boutons de reordonnancement -->
<ReorderableList {items} onReorder={handleReorder} showMoveButtons={!inputCapability.canHover} />
```

### 4. Menus contextuels au clic droit uniquement

```svelte
<!-- MAUVAIS - Clic droit uniquement -->
<div oncontextmenu={showMenu}>Contenu</div>

<!-- BON - Long press + clic droit -->
<div oncontextmenu={showMenu} use:longPress={showMenu}>Contenu</div>
```

### 5. Tailles fixes trop petites

```css
/* MAUVAIS - Taille fixe petite */
.icon-btn {
	width: 24px;
	height: 24px;
}

/* BON - Zone cliquable adequate */
.icon-btn {
	width: 24px;
	height: 24px;
	padding: 10px; /* Total 44x44 */
}
```

---

## Gestion des etats

### Focus visible

```css
/* Toujours visible pour accessibilite */
.btn:focus-visible {
	outline: 2px solid var(--ring);
	outline-offset: 2px;
}

/* Ne pas supprimer le focus sur touch */
/* .btn:focus { outline: none; } ← NE PAS FAIRE */
```

### Active state sur touch

```css
.btn {
	-webkit-tap-highlight-color: transparent; /* Desactive le highlight iOS */
}

.btn:active {
	background: var(--primary-active);
	transform: scale(0.98);
}
```

### Disabled state

```css
.btn:disabled {
	opacity: 0.5;
	pointer-events: none; /* Empeche les interactions */
}
```

---

## Performance

### Eviter les listeners inutiles

```javascript
// MAUVAIS - Listener hover meme sur touch
element.addEventListener('mouseenter', handleHover);
element.addEventListener('mouseleave', handleHover);

// BON - Listener conditionnel
if (inputCapability.canHover) {
	element.addEventListener('mouseenter', handleHover);
	element.addEventListener('mouseleave', handleHover);
}
```

### Utiliser Pointer Events

```javascript
// MAUVAIS - Events separes mouse/touch
element.addEventListener('mousedown', handleStart);
element.addEventListener('touchstart', handleStart);

// BON - Pointer Events unifies
element.addEventListener('pointerdown', handleStart);
```

### Debounce sur scroll/resize

```javascript
// Eviter les calculs excessifs
const handleScroll = debounce(() => {
	// Logique...
}, 100);
```

---

## Accessibilite

### Labels explicites

```svelte
<!-- BON - Label accessible -->
<button aria-label="Supprimer l'element {item.name}">
	<TrashIcon />
</button>

<!-- MAUVAIS - Pas de label -->
<button>
	<TrashIcon />
</button>
```

### Zone de tap = zone visible

```css
/* BON - Zone cliquable evidente */
.card-link {
	display: block;
	padding: 16px;
	background: var(--card);
}

/* ATTENTION - Zone invisible etendue (peut etre confus) */
.card-link::before {
	content: '';
	position: absolute;
	inset: -16px;
}
```

### Navigation au clavier preservee

```svelte
<!-- BON - Fonctionne clavier + touch -->
<button onclick={handleAction} onkeydown={handleKeyboard}> Action </button>

<!-- MAUVAIS - Touch only -->
<div ontouchstart={handleAction}>Action</div>
```

---

## Checklist pre-deploiement

- [ ] Toutes les cibles interactives >= 44px sur touch
- [ ] Espacement adequat entre les cibles (>= 8px)
- [ ] Pas de fonctionnalite dependante du hover uniquement
- [ ] Feedback visuel sur :active
- [ ] Pas de double-tap requis
- [ ] Navigation clavier fonctionnelle
- [ ] Labels accessibles sur les icones
- [ ] Teste sur vrai appareil tactile
