# UbuMaths Theme System

Ce document décrit le système de thème de l'application UbuMaths.

## 🎨 Palette de Couleurs

Le projet utilise la syntaxe **Tailwind CSS 4 `@theme`** avec la fonction `light-dark()` pour gérer automatiquement les deux modes.

### Dark Mode (Principal)

- **Background**: `#262624` - Gris chaud foncé
- **Card**: `#2E2E2C` - Gris légèrement plus clair pour les surfaces
- **Foreground**: `#EFEFEF` - Blanc crème pour le texte
- **Primary** (Orange): `#C66140` - Orange chaud et saturé ✨
- **Accent** (Jaune): `#FFE266` - Jaune lumineux pour les highlights
- **Ring** (Focus): `#E0D5A6` - Beige/crème pour les états focus
- **Border**: `#3D3D3A` - Bordures subtiles
- **Muted**: `#333331` - Backgrounds secondaires
- **Muted Foreground**: `#9E9E9E` - Texte atténué

### Light Mode

- **Background**: `#FAFAFA` - Blanc cassé
- **Card**: `#FFFFFF` - Blanc pur
- **Foreground**: `#1A1A1A` - Noir doux
- **Primary** (Orange): `#FC8F1B` - Orange vif ✨
- **Accent** (Jaune): `#FFA000` - Orange/jaune
- **Ring** (Focus): `#FFA000` - Même couleur que l'accent
- **Border**: `#E0E0E0` - Bordures claires
- **Muted**: `#F0F0F0` - Backgrounds secondaires
- **Muted Foreground**: `#737373` - Texte atténué

### Configuration Tailwind CSS 4

Les couleurs sont définies dans `src/app.css` avec la syntaxe moderne :

```css
@theme {
	--color-primary: light-dark(#fc8f1b, #c66140);
	--color-accent: light-dark(#ffa000, #ffe266);
	--color-ring: light-dark(#ffa000, #e0d5a6);
	/* ... autres couleurs */
}
```

La fonction `light-dark(light-value, dark-value)` bascule automatiquement selon la propriété CSS `color-scheme` qui est gérée dynamiquement par le store `theme.svelte.ts`.

## 🔤 Typographie

### Polices installées

- **Inter** (`@fontsource/inter`) - Corps de texte, UI
  - Poids: 400, 500, 600, 700
  - Features: `cv11`, `ss01` pour un look moderne
- **Lora** (`@fontsource/lora`) - Titres (h1-h6)
  - Poids: 400, 600, 700
  - Style serif élégant inspiré de Tiempos Text

### Hiérarchie

```css
body {
	font-family: 'Inter', sans-serif;
	font-feature-settings: 'cv11', 'ss01';
}

h1,
h2,
h3,
h4,
h5,
h6 {
	font-family: 'Lora', serif;
	font-weight: 600;
	letter-spacing: -0.015em;
}
```

## 🧩 Composants UI

### Button

- **Border radius**: `rounded-lg` (0.5rem)
- **Focus ring**: `ring-4 ring-ring/30` - Large anneau bleu subtil
- **Hover**: `hover:shadow-md` - Ombre douce
- **Active**: `active:scale-[0.98]` - Léger effet de pression
- **Transition**: `duration-300` - Animations fluides

### Input / Textarea

- **Height**: `h-10` (40px) - Plus généreux
- **Border radius**: `rounded-lg`
- **Focus**: `focus:ring-4 focus:ring-ring/30` - Grand anneau bleu
- **Hover**: `hover:border-ring/50` - Feedback visuel subtil
- **Background dark**: `dark:bg-card` - Fond légèrement différent

### Dropdown Menu / Select

- **Content**: `rounded-lg shadow-lg` - Plus arrondi et ombre prononcée
- **Item padding**: `px-3 py-2` - Espacement généreux
- **Item hover**: `bg-muted/60 dark:bg-muted/40` - Hover subtil
- **Transitions**: `duration-200` - Feedback rapide

## 🏗️ Layout

### Header

- **Shadow**: `shadow-sm` - Ombre subtile
- **Border**: `border-b border-border`
- **Title**: Police Lora avec `tracking-tight`
- **Buttons**: Utilisation du primary (orange) pour les CTA

### Sidebar

- **Width**: `w-64` (256px)
- **Gap**: `gap-1` - Espacement serré
- **Item hover**: `hover:bg-muted/80` avec scale sur icônes
- **Transitions**: `duration-300` - Animations douces

### Dashboard Rail

- **Width**: `w-20` (80px) - Rail vertical étroit
- **Background**: `bg-card/50 dark:bg-card` - Semi-transparent
- **Active state**: `bg-primary/10 text-primary` - Accent orange
- **Icon scale**: `group-hover:scale-110` - Effet zoom sur hover

## ✨ Effets Visuels

### Transitions

- **Durée standard**: `300ms` - Pour la plupart des interactions
- **Durée rapide**: `200ms` - Pour les menus et dropdowns
- **Timing**: `ease-in-out` (par défaut Tailwind)

### Focus States

- **Ring color**: Bleu accent (`hsl(210 75% 58%)`)
- **Ring width**: `4px` (ring-4)
- **Ring opacity**: `30%` (ring-ring/30)
- **Border**: Devient bleu également

### Shadows

- **Small**: `shadow-sm` - Headers, inputs
- **Medium**: `shadow-md` - Buttons hover
- **Large**: `shadow-lg` - Dropdowns, modals

### Radius

- **Standard**: `0.625rem` (10px) - Variable `--radius`
- **Appliqué**: `rounded-lg` sur la plupart des éléments
- **Petits éléments**: `rounded-md` (8px)

## 📦 Fichiers Modifiés

1. **`src/app.css`**
   - Nouvelles variables CSS pour les deux thèmes
   - Configuration typographique
   - Système de font-scaling préservé

2. **`src/routes/+layout.svelte`**
   - Import des polices Fontsource
   - Poids multiples pour Inter et Lora

3. **Components UI Shadcn**
   - `button/button.svelte` - Nouveaux variants et tailles
   - `input/input.svelte` - Focus élégant
   - `textarea/textarea.svelte` - Cohérence avec input
   - `dropdown-menu/*` - Content, items, styling
   - `select/*` - Trigger, content, items

4. **Layout Components**
   - `Header.svelte` - Accents orange, shadows
   - `Sidebar.svelte` - Style minimaliste
   - `dashboard/+layout.svelte` - Rail sidebar Claude AI

## 🎯 Caractéristiques du Thème

### ✅ Implémenté

- [x] Palette de couleurs dark mode gris chaud
- [x] Accent orange/jaune distinctive et chaleureuse
- [x] Typographie élégante (Inter + Lora)
- [x] Focus ring beige/crème visible et accessible
- [x] Transitions fluides (300ms)
- [x] Borders arrondies (8-10px)
- [x] Shadows douces et subtiles
- [x] Hover states minimaux mais perceptibles
- [x] Active states avec scale
- [x] Rail sidebar vertical
- [x] Light mode orthogonal et cohérent
- [x] Système de switching light/dark fonctionnel avec `color-scheme`

### 📝 Notes

- Le système de font-scaling existant a été préservé
- Toutes les variables CSS sont compatibles avec les composants Shadcn
- Le dark mode utilise une palette chaude (gris avec tons jaunes/oranges)
- Les animations respectent les préférences `prefers-reduced-motion`
- Le switching light/dark utilise la propriété CSS `color-scheme` synchronisée avec la classe `.dark` par le store `theme.svelte.ts`

## 🚀 Utilisation

### Développement

```bash
pnpm dev
```

### Build Production

```bash
pnpm build
```

### Type Checking

```bash
pnpm check
```

## 🎨 Personnalisation des Couleurs

Pour ajuster les couleurs, modifier les variables dans `src/app.css`:

```css
@theme {
	/* Exemple: changer le primary */
	--color-primary: light-dark(#fc8f1b, #c66140);

	/* Exemple: changer l'accent */
	--color-accent: light-dark(#ffa000, #ffe266);

	/* Exemple: changer le background */
	--color-background: light-dark(#fafafa, #262624);
}
```

**Important:** La fonction `light-dark()` prend deux valeurs :

1. **Première valeur** : couleur en mode light
2. **Deuxième valeur** : couleur en mode dark

Les polices peuvent être changées dans `src/routes/+layout.svelte` et `src/app.css`.
