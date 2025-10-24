# CorrectionCard Component

## Vue d'ensemble

Le composant **CorrectionCard** est utilisé pour afficher les corrections de questions dans les tests Automaths. Il utilise un mécanisme de flip 3D (similaire à FlashCard) pour révéler la correction détaillée.

**Statut** : ✅ Implémenté et intégré
**Fichier** : `src/lib/components/questions/CorrectionCard.svelte`
**Utilisé dans** : `src/lib/components/test/TestResults.svelte`

## Caractéristiques principales

### Interface utilisateur

#### Face AVANT (Front)

- **Header** :
  - Titre : "Question N" (si `questionNumber` fourni) ou "Correction"
  - Badge de statut : Vert (✓ Correct) ou Rouge (✗ Incorrect)

- **Énoncé** (collapsible) :
  - Bouton toggle "Voir/Masquer l'énoncé"
  - État initial : caché
  - Contenu : statement (text + images)

- **Votre réponse** :
  - Section colorée selon correct/incorrect
  - Bordure : verte (correct) ou rouge (incorrect)
  - Fond : `green-100/green-950` ou `red-100/red-950`
  - Rendu adapté au type de question

- **Réponse correcte** :
  - Toujours avec bordure et fond verts
  - Affichage de la réponse attendue

- **Statistiques** (si disponibles) :
  - ⏱️ Temps passé (en secondes)
  - 🔄 Nombre de tentatives

#### Face ARRIÈRE (Back)

- **Header** : "Correction détaillée"
- **Contenu** :
  - Affichage de `instance.correction`
  - Support text et images
  - Message par défaut si pas de correction

### Gestion de la hauteur

Même système que FlashCard :

- Utilise `ResizeObserver` pour mesurer les hauteurs des deux faces
- `currentHeight = Math.min(Math.max(frontHeight, backHeight), maxViewportHeight)`
- `maxViewportHeight = 80vh`
- Scroll automatique si contenu dépasse

### Flip 3D

- Animation fluide avec `transform: rotateY(180deg)`
- Transition : `0.6s cubic-bezier(0.33, 1, 0.68, 1)`
- Bouton flip en bas à droite (icône rotation)
- Même style et comportement que FlashCard

## Props

```typescript
interface Props {
	answerResult: TestAnswerResult; // Résultat complet avec instance et userAnswer
	questionNumber?: number; // Numéro de la question (optionnel)
	size?: 'sm' | 'md' | 'lg'; // Taille de la carte (défaut: 'md')
}
```

### `answerResult: TestAnswerResult`

Structure complète contenant :

```typescript
{
  index: number;
  instance: QuestionInstance;       // Question générée
  userAnswer?: AnswerData;          // Réponse de l'utilisateur
  isCorrect: boolean;               // Correctness
  timeSpent?: number;               // Temps passé (secondes)
  attempts?: number;                // Nombre de tentatives
}
```

## Rendu adapté par type de question

### Numerical (exact, decimal, rounded)

```typescript
<MathDisplay text={String(userAnswer.value)} />
```

### Algebraic transform

```typescript
<MathDisplay text={String(userAnswer.value)} />
```

### Fill-in-blanks

```typescript
<ul class="space-y-1">
  {#each userAnswer.value as value, i}
    <li><code>{value}</code></li>
  {/each}
</ul>
```

### Multiple choice

```typescript
<ul class="space-y-1">
  {#each userAnswer.value as index}
    <li>{String.fromCharCode(65 + index)}</li>  // A, B, C...
  {/each}
</ul>
```

## Utilisation

### 1. Dans TestResults (après un test avec réponses)

Utilisé pour afficher les corrections après un test Interactive ou Course.

```svelte
<script>
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import type { TestResult } from '$lib/types/test';

	let { result }: { result: TestResult } = $props();
</script>

<div class="grid gap-6 lg:grid-cols-2">
	{#each result.answers as answerResult, index}
		<CorrectionCard {answerResult} questionNumber={index + 1} size="md" />
	{/each}
</div>
```

**Affiche** :

- ✅ Badge correct/incorrect
- ✅ Section "Votre réponse" (colorée selon correct/incorrect)
- ✅ Section "Réponse correcte"
- ✅ Stats (temps, tentatives) si disponibles
- ✅ Correction détaillée (flip)

### 2. Dans TestDisplay (mode révision sans réponses)

Utilisé pour afficher les corrections après un mode révision/display.

```svelte
<script>
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import type { TestSession, TestAnswerResult } from '$lib/types/test';

	let { session }: { session: TestSession } = $props();

	function createAnswerResultForDisplay(index: number): TestAnswerResult {
		return {
			index,
			instance: session.instances[index],
			userAnswer: undefined, // No user answer in display mode
			isCorrect: false,
			timeSpent: undefined,
			attempts: undefined
		};
	}
</script>

<div class="grid gap-6 lg:grid-cols-2">
	{#each session.instances as instance, index}
		<CorrectionCard
			answerResult={createAnswerResultForDisplay(index)}
			questionNumber={index + 1}
			size="md"
		/>
	{/each}
</div>
```

**Affiche** :

- ❌ Pas de badge correct/incorrect (userAnswer === undefined)
- ❌ Pas de section "Votre réponse"
- ✅ Section "Réponse correcte"
- ❌ Pas de stats
- ✅ Correction détaillée (flip)

### 3. Usage standalone

```svelte
<script>
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import type { TestAnswerResult } from '$lib/types/test';

	let answerResult: TestAnswerResult = {
		index: 0,
		instance: {
			/* ... */
		},
		userAnswer: {
			/* ... */
		}, // ou undefined pour mode révision
		isCorrect: true,
		timeSpent: 45,
		attempts: 1
	};
</script>

<CorrectionCard {answerResult} questionNumber={1} size="lg" />
```

## Layout responsive

### Grid configuration (TestResults et TestDisplay)

```css
.grid gap-6 lg:grid-cols-2
```

- **Mobile** (`< 1024px`) : 1 colonne (pleine largeur)
- **Desktop** (`≥ 1024px`) : 2 colonnes

**Utilisé dans** :

- `TestResults.svelte` (ligne 129)
- `TestDisplay.svelte` (ligne 359)

### Card sizes

```typescript
const sizeClasses = {
	sm: 'max-w-md', // 448px
	md: 'max-w-2xl', // 672px (défaut)
	lg: 'max-w-4xl' // 896px
};
```

## Feedback visuel

### Couleurs par statut

| Élément                  | Correct                          | Incorrect                    |
| ------------------------ | -------------------------------- | ---------------------------- |
| **Badge**                | Vert (default)                   | Rouge (destructive)          |
| **Bordure réponse user** | `border-green-600`               | `border-red-600`             |
| **Fond réponse user**    | `bg-green-100 dark:bg-green-950` | `bg-red-100 dark:bg-red-950` |
| **Réponse correcte**     | Toujours vert                    | Toujours vert                |

### Icônes

- ✓ (`Check`) : Réponse correcte
- ✗ (`X`) : Réponse incorrecte
- ⏱️ : Temps passé
- 🔄 : Tentatives
- `ChevronDown/ChevronUp` : Toggle énoncé
- `RotateCw` : Bouton flip

## Animations

### Fade-in (sections de contenu)

```css
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
```

Appliqué à :

- `.statement-toggle`
- `.user-answer-section`
- `.correct-answer-section`

### Flip 3D

- Rotation Y de 180° avec easing cubic-bezier
- Transition smooth sur height également
- Bouton flip avec hover scale et rotation

## Accessibilité

### ARIA labels

```svelte
<button
  class="flip-button"
  aria-label={isFlipped ? 'Retour aux réponses' : 'Voir la correction détaillée'}
  title={isFlipped ? 'Retour aux réponses' : 'Voir la correction détaillée'}
>
```

### Navigation clavier

- Bouton flip accessible au focus
- Toggle énoncé accessible au clavier
- Scroll automatique si nécessaire

### Contraste

- Bordures et fonds colorés respectent WCAG AA
- Texte muted-foreground pour les stats

## Dark mode

Support complet avec classes Tailwind :

- `dark:bg-green-950` / `dark:bg-red-950`
- Bordures adaptées automatiquement
- Scrollbar custom s'adapte au thème

## Font scaling

Support de la variable CSS `--font-scale` :

```css
.correction-card-wrapper {
	font-size: calc(1rem * var(--font-scale, 1));
}

.flip-button {
	width: calc(3rem * var(--font-scale, 1));
	height: calc(3rem * var(--font-scale, 1));
}
```

## Performance

### Optimisations

- ResizeObserver cleanup automatique
- Effect guards pour SSR (`typeof window !== 'undefined'`)
- Lazy rendering via Svelte's reactivity
- Minimal re-renders (state localisé)

### Considérations

- Éviter trop de cartes simultanées (pagination recommandée pour > 20 questions)
- Images optimisées (chargement lazy pour future amélioration)

## Cas particuliers

### Pas de réponse utilisateur (mode révision)

Quand `answerResult.userAnswer === undefined` :

- ❌ Le badge correct/incorrect n'est **pas affiché**
- ❌ La section "Votre réponse" n'est **pas affichée**
- ✅ La section "Réponse correcte" reste visible
- ✅ La correction détaillée reste accessible

**Cas d'usage** : Mode révision (TestDisplay) où l'utilisateur n'a pas répondu aux questions.

### Pas de correction détaillée

Affiche un état vide avec style :

```svelte
<div
	class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center"
>
	<p class="text-muted-foreground">Aucune correction détaillée disponible.</p>
</div>
```

## Comparaison avec d'autres composants

| Critère               | CorrectionCard           | FlashCard            | QuestionCard                             |
| --------------------- | ------------------------ | -------------------- | ---------------------------------------- |
| **Flip 3D**           | ✅ Oui                   | ✅ Oui               | ❌ Non                                   |
| **Height management** | ✅ Equal front/back      | ✅ Equal front/back  | ❌ N/A                                   |
| **Feedback visuel**   | ✅ Comparaison réponses  | ✅ Correct/Incorrect | ❌ Aucun                                 |
| **Interactive input** | ❌ Non (lecture seule)   | ✅ Oui               | ✅ Oui                                   |
| **Cas d'usage**       | Correction post-test     | Étude/révision       | Tests en cours                           |
| **Utilisé dans**      | TestResults, TestDisplay | -                    | TestInteractive, TestCourse, TestDisplay |
| **Complexité**        | ~460 lignes              | ~750 lignes          | ~340 lignes                              |

## Tests manuels recommandés

### Types de questions

- [ ] Numerical exact (`3 + 5 = 8`)
- [ ] Numerical decimal (`1/3 ≈ 0.33`)
- [ ] Numerical rounded (`π ≈ 3.14`)
- [ ] Algebraic transform (`x^2 - 4 = (x-2)(x+2)`)
- [ ] Fill-in-blanks (plusieurs réponses)
- [ ] Multiple choice (QCM single)
- [ ] Multiple choice (QCM multiple)

### Fonctionnalités

- [ ] Flip front/back fluide
- [ ] Toggle énoncé fonctionne
- [ ] Hauteurs égales front/back
- [ ] Scroll si contenu long
- [ ] Couleurs correctes (correct/incorrect)
- [ ] Stats affichées (temps, tentatives)
- [ ] Mode révision (pas de badge, pas de section "Votre réponse")
- [ ] Mode avec réponses (badge + section "Votre réponse")
- [ ] Pas de correction (état vide)

### Responsive

- [ ] Mobile (1 colonne)
- [ ] Tablet (1 colonne)
- [ ] Desktop (2 colonnes)
- [ ] Bouton flip ajusté mobile

### Thème

- [ ] Light mode
- [ ] Dark mode
- [ ] Transitions

## Améliorations futures possibles

1. **Animation d'entrée**
   - Stagger effect pour les cartes
   - Fade-in + slide-up au chargement

2. **Bouton "Tout révéler"**
   - Flip toutes les cartes simultanément
   - Utile pour révision rapide

3. **Export individuel**
   - Bouton pour copier/exporter une correction
   - Format Markdown ou PDF

4. **Partage**
   - Lien pour partager une correction spécifique
   - Utile pour discussions pédagogiques

5. **Annotations**
   - Permettre aux enseignants d'ajouter des notes
   - Système de commentaires

6. **Comparaison visuelle**
   - Mise en évidence des différences entre réponse user et correcte
   - Particulièrement utile pour algebraic et fill-in-blanks

## Documentation connexe

- **[TEST_FEATURE_DOCUMENTATION.md](TEST_FEATURE_DOCUMENTATION.md)** - Système de tests Automaths
- **[FLASHCARD_COMPONENT.md](FLASHCARD_COMPONENT.md)** - FlashCard (référence flip)
- **[QUESTION_CARD_COMPONENT.md](QUESTION_CARD_COMPONENT.md)** - QuestionCard (référence rendu)
- **[CLAUDE_FEATURES_QUESTION_BANK.md](../../../CLAUDE_FEATURES_QUESTION_BANK.md)** - Question Bank System

---

**Date de création** : 2025-10-21
**Version** : 1.0.0
**Auteur** : Claude Code
