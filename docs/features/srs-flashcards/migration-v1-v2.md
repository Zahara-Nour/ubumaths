# FlashCard Component - Migration Guide

## QuestionDisplay → FlashCard (v2.0)

Ce guide vous aidera à migrer votre code de l'ancien composant `QuestionDisplay` vers le nouveau `FlashCard`.

---

## 🎯 Résumé des changements

### Changements majeurs (Breaking Changes)

1. **Composant renommé** : `QuestionDisplay.svelte` → `FlashCard.svelte`
2. **Prop `mode` supprimée** : Remplacée par `interactive: boolean`
3. **Prop `showConfetti` supprimée** : Plus d'animations de confetti
4. **Prop `allowMultipleAttempts` supprimée** : Utiliser uniquement `maxAttempts`
5. **Type `ordering` ajouté** : Placeholder pour les questions d'ordre (implémentation future)

### Changements non-breaking

- ✅ Tous les callbacks conservés (`onAnswerSubmit`, `onComplete`, `onFlip`)
- ✅ Le système de flip est conservé (toujours actif)
- ✅ Tous les types de questions fonctionnent (sauf `ordering` qui est un placeholder)

---

## 📦 Import

### Avant (v1.0)

```svelte
import QuestionDisplay from '$lib/components/questions/QuestionDisplay.svelte';
```

### Après (v2.0)

```svelte
import FlashCard from '$lib/components/questions/FlashCard.svelte';
```

---

## 🔧 Props

### Mode d'affichage

#### Avant (v1.0)

```svelte
<!-- Mode flashcard (lecture seule) -->
<QuestionDisplay mode="flashcard" {instance} />

<!-- Mode interactive (validation) -->
<QuestionDisplay mode="interactive" {instance} />
```

#### Après (v2.0)

```svelte
<!-- Mode lecture seule -->
<FlashCard interactive={false} {instance} />

<!-- Mode interactif -->
<FlashCard interactive={true} {instance} />
```

### Confetti

#### Avant (v1.0)

```svelte
<QuestionDisplay mode="interactive" {instance} showConfetti={true} />
```

#### Après (v2.0)

```svelte
<!-- La prop showConfetti n'existe plus -->
<FlashCard interactive={true} {instance} />
```

**Note** : Les confetti ont été supprimés pour éviter les distractions, surtout dans les tests.

### Tentatives multiples

#### Avant (v1.0)

```svelte
<!-- Tentatives illimitées -->
<QuestionDisplay mode="interactive" {instance} allowMultipleAttempts={true} />

<!-- Une seule tentative -->
<QuestionDisplay mode="interactive" {instance} allowMultipleAttempts={false} />

<!-- Nombre limité de tentatives -->
<QuestionDisplay mode="interactive" {instance} allowMultipleAttempts={true} maxAttempts={3} />
```

#### Après (v2.0)

```svelte
<!-- Tentatives illimitées (par défaut) -->
<FlashCard interactive={true} {instance} maxAttempts={0} />

<!-- Une seule tentative -->
<FlashCard interactive={true} {instance} maxAttempts={1} />

<!-- Nombre limité de tentatives -->
<FlashCard interactive={true} {instance} maxAttempts={3} />
```

**Note** : `maxAttempts={0}` signifie "illimité" (comportement par défaut).

---

## 🔄 Exemples de migration complets

### Exemple 1 : Usage basique

```svelte
<!-- AVANT -->
<QuestionDisplay mode="flashcard" {instance} />

<!-- APRÈS -->
<FlashCard interactive={false} {instance} />
```

### Exemple 2 : Mode interactif avec toutes les options

```svelte
<!-- AVANT -->
<QuestionDisplay
	mode="interactive"
	{instance}
	size="lg"
	showCorrectionOnWrong={true}
	showConfetti={true}
	allowMultipleAttempts={true}
	maxAttempts={3}
	onAnswerSubmit={handleSubmit}
	onComplete={handleComplete}
	onFlip={handleFlip}
/>

<!-- APRÈS -->
<FlashCard
	interactive={true}
	{instance}
	size="lg"
	showCorrectionOnWrong={true}
	maxAttempts={3}
	onAnswerSubmit={handleSubmit}
	onComplete={handleComplete}
	onFlip={handleFlip}
/>
```

### Exemple 3 : Test mode (une tentative, pas de feedback)

```svelte
<!-- AVANT -->
<QuestionDisplay
	mode="interactive"
	{instance}
	showConfetti={false}
	showValidationFeedback={false}
	allowMultipleAttempts={false}
	onAnswerSubmit={handleAnswerSubmit}
/>

<!-- APRÈS -->
<FlashCard
	interactive={true}
	{instance}
	showValidationFeedback={false}
	maxAttempts={1}
	onAnswerSubmit={handleAnswerSubmit}
/>
```

---

## 📋 Checklist de migration

Utilisez cette checklist pour migrer votre code :

### Pour chaque fichier utilisant QuestionDisplay

- [ ] Changer l'import : `QuestionDisplay` → `FlashCard`
- [ ] Remplacer le tag : `<QuestionDisplay` → `<FlashCard`
- [ ] Convertir `mode="flashcard"` → `interactive={false}`
- [ ] Convertir `mode="interactive"` → `interactive={true}`
- [ ] Supprimer la prop `showConfetti` (si présente)
- [ ] Remplacer `allowMultipleAttempts={false}` → `maxAttempts={1}`
- [ ] Remplacer `allowMultipleAttempts={true}` → `maxAttempts={0}` (ou supprimer, c'est le défaut)
- [ ] Tester le composant pour vérifier qu'il fonctionne

---

## 🗂️ Fichiers migrés

Les fichiers suivants ont déjà été migrés dans le projet :

1. ✅ `src/lib/components/test/TestInteractive.svelte`
2. ✅ `src/lib/components/test/TestCourse.svelte`
3. ✅ `src/lib/components/QuestionPreview.svelte`
4. ✅ `src/lib/components/QuestionPreviewCard.svelte`
5. ✅ `src/routes/(protected)/dashboard/admin/debug/question-display/+page.svelte`
6. ✅ `src/routes/(public)/demo/question-display-demo/+page.svelte`
7. ✅ `src/routes/(protected)/dashboard/admin/questions/[id]/preview/+page.svelte`

---

## ⚠️ Types TypeScript

### Avant (v1.0)

```typescript
import type { QuestionDisplayMode } from '$lib/types/question-display';

// Type supprimé en v2.0
type Mode = QuestionDisplayMode; // 'flashcard' | 'interactive'
```

### Après (v2.0)

```typescript
// Plus besoin d'importer QuestionDisplayMode
// Utiliser directement boolean

let interactive: boolean = true;
```

### Interface Props

```typescript
// AVANT (v1.0)
interface QuestionDisplayProps {
	mode: 'flashcard' | 'interactive';
	instance: QuestionInstance;
	showConfetti?: boolean;
	allowMultipleAttempts?: boolean;
	maxAttempts?: number;
	// ...
}

// APRÈS (v2.0)
interface FlashCardProps {
	interactive?: boolean; // Default: false
	instance: QuestionInstance;
	maxAttempts?: number; // Default: 0 (unlimited)
	// ...
}
```

---

## 🐛 Erreurs communes après migration

### Erreur 1 : `Property 'mode' is missing`

**Cause** : Vous utilisez encore l'ancienne API avec `mode=`

**Solution** : Remplacer par `interactive={boolean}`

```svelte
<!-- ❌ Erreur -->
<FlashCard mode="interactive" {instance} />

<!-- ✅ Correct -->
<FlashCard interactive={true} {instance} />
```

### Erreur 2 : `Property 'showConfetti' does not exist`

**Cause** : La prop `showConfetti` a été supprimée

**Solution** : Supprimer cette prop

```svelte
<!-- ❌ Erreur -->
<FlashCard interactive={true} {instance} showConfetti={true} />

<!-- ✅ Correct -->
<FlashCard interactive={true} {instance} />
```

### Erreur 3 : `Property 'allowMultipleAttempts' does not exist`

**Cause** : La prop `allowMultipleAttempts` a été supprimée

**Solution** : Utiliser uniquement `maxAttempts`

```svelte
<!-- ❌ Erreur -->
<FlashCard interactive={true} {instance} allowMultipleAttempts={false} />

<!-- ✅ Correct -->
<FlashCard interactive={true} {instance} maxAttempts={1} />
```

---

## 📚 Ressources

- **Documentation complète** : [FLASHCARD_COMPONENT.md](FLASHCARD_COMPONENT.md)
- **Types** : `src/lib/types/question-display.ts`
- **Composant** : `src/lib/components/questions/FlashCard.svelte`
- **Demo** : `/demo/question-display-demo`
- **Debug** : `/dashboard/admin/debug/question-display`

---

## 🤝 Support

Si vous rencontrez des problèmes lors de la migration :

1. Vérifiez les erreurs TypeScript avec `pnpm check`
2. Consultez les exemples migrés dans le projet
3. Testez avec la page de debug
4. Consultez la documentation complète

---

**Date de migration** : 2025-10-21
**Version** : v2.0
**Statut** : ✅ Migration complète
