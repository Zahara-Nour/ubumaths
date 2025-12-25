# Checklist Responsive

Verification a effectuer avant chaque commit impliquant des changements UI.

---

## Checklist Rapide

### Layout

- [ ] Sidebar cachee sur mobile (`hidden md:block`)
- [ ] Hamburger visible sur mobile (`md:hidden`)
- [ ] Contenu principal occupe toute la largeur sur mobile
- [ ] Pas de scroll horizontal non desire

### Grids

- [ ] `grid-cols-1` explicite pour mobile
- [ ] Progression logique (`sm:grid-cols-2`, `md:grid-cols-3`, etc.)
- [ ] Gaps responsifs (`gap-4 sm:gap-6`)

### Tables

- [ ] Wrapper avec `overflow-x-auto`
- [ ] Colonnes secondaires cachees sur mobile (`hidden sm:table-cell`)
- [ ] Padding reduit sur mobile (`px-2 py-2 sm:px-4 sm:py-3`)
- [ ] Info importante toujours visible

### Boutons

- [ ] Touch targets >= 44px
- [ ] Texte cache sur mobile si necessaire (`sr-only sm:not-sr-only`)
- [ ] `flex-wrap` sur groupes de boutons
- [ ] Icones avec marges responsives (`sm:mr-2`)

### Tabs

- [ ] `flex flex-wrap` au lieu de `grid-cols-N` fixe
- [ ] Labels caches sur mobile si nombreux tabs
- [ ] Icones distinctes pour chaque tab

### Texte

- [ ] Titres avec tailles responsives (`text-xl sm:text-2xl`)
- [ ] `line-clamp-1` ou `truncate` pour texte long
- [ ] Padding/margin responsifs

### Modals

- [ ] Max-width appropriee (`max-w-lg sm:max-w-xl`)
- [ ] Hauteur max sur mobile (`max-h-[90vh]`)
- [ ] Boutons empiles sur mobile (`flex-col sm:flex-row`)

---

## Tests Manuels

### Viewports a Tester

| Device    | Largeur | A verifier                |
| --------- | ------- | ------------------------- |
| iPhone SE | 375px   | Layout mobile complet     |
| iPhone 14 | 390px   | Pas de debordement        |
| iPad Mini | 768px   | Transition mobile/desktop |
| Desktop   | 1280px  | Layout desktop complet    |

### Points de Controle

1. **Navigation**

   - Hamburger visible et fonctionnel
   - Drawer s'ouvre/ferme correctement
   - Liens actifs surlignés

2. **Contenu**

   - Texte lisible (pas trop petit)
   - Images redimensionnees
   - Pas de contenu coupe

3. **Interactions**

   - Boutons facilement cliquables
   - Formulaires utilisables
   - Scroll fluide

4. **Orientation**
   - Portrait fonctionne
   - Paysage fonctionne (tablettes)

---

## Classes a Eviter

### ❌ Largeurs Fixes

```svelte
<!-- EVITER -->
<div class="w-[500px]">
<div class="min-w-[300px]">

<!-- PREFERER -->
<div class="w-full max-w-lg">
<div class="w-full sm:w-auto sm:min-w-48">
```

### ❌ Grid Dynamique

```svelte
<!-- EVITER - Tailwind ne peut pas purger -->
<div class="grid-cols-{count}">

<!-- PREFERER -->
<div class="flex flex-wrap gap-2">
<!-- ou -->
<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
```

### ❌ Desktop-First

```svelte
<!-- EVITER -->
<div class="p-8 max-md:p-4">
<div class="hidden max-sm:block">

<!-- PREFERER (mobile-first) -->
<div class="p-4 md:p-8">
<div class="block sm:hidden">
```

### ❌ Store pour Affichage

```svelte
<!-- EVITER -->
{#if mobileStore.isMobile}
	<div>Mobile content</div>
{/if}

<!-- PREFERER -->
<div class="md:hidden">Mobile content</div>
```

---

## Classes Recommandees

### Navigation

```
hidden md:block          /* Sidebar desktop */
md:hidden                /* Hamburger mobile */
flex flex-col md:flex-row /* Layout stack/row */
```

### Spacing

```
p-4 sm:p-6 md:p-8        /* Padding progressif */
gap-2 sm:gap-4           /* Gap progressif */
mt-4 sm:mt-6             /* Margin progressif */
```

### Typography

```
text-sm sm:text-base     /* Texte body */
text-lg sm:text-xl       /* Titres secondaires */
text-xl sm:text-2xl      /* Titres principaux */
```

### Flex/Grid

```
grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4
flex flex-col sm:flex-row
flex flex-wrap gap-2
```

### Visibility

```
hidden sm:block          /* Cache mobile */
sm:hidden                /* Cache desktop */
hidden sm:table-cell     /* Colonne table */
sr-only sm:not-sr-only   /* Texte accessible */
```

---

## Debug

### Indicateur Breakpoint

Ajouter temporairement pour debug :

```svelte
<div class="fixed bottom-2 left-2 z-50 rounded bg-black/80 px-2 py-1 text-xs text-white">
	<span class="sm:hidden">XS</span>
	<span class="hidden sm:inline md:hidden">SM</span>
	<span class="hidden md:inline lg:hidden">MD</span>
	<span class="hidden lg:inline xl:hidden">LG</span>
	<span class="hidden xl:inline">XL</span>
</div>
```

### DevTools

1. Chrome : F12 > Toggle Device Toolbar (Ctrl+Shift+M)
2. Firefox : F12 > Responsive Design Mode (Ctrl+Shift+M)
3. Safari : Develop > Enter Responsive Design Mode

---

## Ressources

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [Touch Target Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility#Touch-targets)

---

## Voir Aussi

- [Index](./index.md)
- [Breakpoints](./breakpoints.md)
- [Composants](./components.md)
- [Patterns](./patterns.md)
