# FlashCard Component - Documentation Hub

## 📚 Documentation complète

Bienvenue dans la documentation du composant **FlashCard** pour l'affichage de questions mathématiques interactives.

---

## 🗂️ Index de la documentation

### 1. [**FLASHCARD_COMPONENT.md**](FLASHCARD_COMPONENT.md) - Documentation principale

La documentation complète du composant FlashCard :

- 📖 Vue d'ensemble et features
- 🔧 Props et API
- 💡 Exemples d'utilisation
- 🏗️ Architecture et intégration
- 🧪 Tests et debugging
- 🚀 Guide de troubleshooting

**👉 Commencez ici si vous découvrez le composant**

### 2. [**FLASHCARD_MIGRATION_GUIDE.md**](FLASHCARD_MIGRATION_GUIDE.md) - Guide de migration

Guide de migration depuis QuestionDisplay (v1.0) vers FlashCard (v2.0) :

- 🔄 Résumé des changements
- 📝 Exemples de migration
- ✅ Checklist complète
- ⚠️ Erreurs communes
- 🗂️ Fichiers déjà migrés

**👉 Utilisez ce guide si vous migrez du code existant**

### 3. [**TEST_FEATURE_DOCUMENTATION.md**](TEST_FEATURE_DOCUMENTATION.md) - Intégration avec les tests

Documentation de l'utilisation du FlashCard dans le système de tests :

- 🎯 Modes de test (Révision, Quiz, Course aux nombres)
- 🏗️ Architecture des tests
- 🔄 Flux de données
- 💡 Exemples d'utilisation

**👉 Consultez ce document pour l'intégration dans les tests**

---

## 🚀 Quick Start

### Installation

Le composant est déjà installé dans le projet. Pas de dépendances supplémentaires requises.

### Utilisation basique

```svelte
<script>
	import FlashCard from '$lib/components/questions/FlashCard.svelte';

	// Votre instance de question
	const instance = {
		/* QuestionInstance */
	};
</script>

<!-- Mode lecture seule -->
<FlashCard interactive={false} {instance} />

<!-- Mode interactif -->
<FlashCard interactive={true} {instance} maxAttempts={3} />
```

---

## 📍 Chemins importants

### Composant principal

```
src/lib/components/questions/FlashCard.svelte
```

### Types TypeScript

```
src/lib/types/question-display.ts
```

### Composants de saisie

```
src/lib/components/question-inputs/
├── NumericalInput.svelte
├── AlgebraicInput.svelte
├── FillBlanksInput.svelte
├── MultipleChoiceInput.svelte
└── OrderingInput.svelte
```

### Utilitaires

```
src/lib/utils/answer-validator.ts
```

### Pages de test

```
src/routes/(public)/demo/question-display-demo/+page.svelte
src/routes/(protected)/dashboard/admin/debug/question-display/+page.svelte
```

---

## 🎯 Cas d'usage courants

### 1. Affichage simple d'une question (flashcard)

```svelte
<FlashCard interactive={false} {instance} />
```

### 2. Question interactive avec validation

```svelte
<FlashCard
	interactive={true}
	{instance}
	onAnswerSubmit={handleSubmit}
	onComplete={handleComplete}
/>
```

### 3. Quiz avec limite de tentatives

```svelte
<FlashCard
	interactive={true}
	{instance}
	maxAttempts={3}
	onAnswerSubmit={handleSubmit}
	showCorrectionOnWrong={true}
/>
```

### 4. Test chronométré

```svelte
<FlashCard
	interactive={true}
	{instance}
	maxAttempts={1}
	showValidationFeedback={false}
	onAnswerSubmit={storeAnswer}
/>
```

---

## 🧪 Testing & Debug

### Demo page publique

Visitez la page de démo pour tester le composant :

```
http://localhost:5173/demo/question-display-demo
```

**Features** :

- Sélection du mode (lecture seule / interactif)
- Test de tous les types de questions
- Feedback en temps réel

### Page de debug admin

Pour un debugging approfondi avec inspection d'état :

```
http://localhost:5173/dashboard/admin/debug/question-display
```

**Features** :

- Configuration complète des props
- Logs d'événements en temps réel
- Inspection JSON des données
- 5 types de questions pré-configurés
- Informations d'environnement

---

## 📋 Props disponibles

| Prop                     | Type                             | Default | Description                               |
| ------------------------ | -------------------------------- | ------- | ----------------------------------------- |
| `interactive`            | `boolean`                        | `false` | Active le mode interactif avec validation |
| `instance`               | `QuestionInstance`               | -       | **Requis** - Instance de question générée |
| `size`                   | `'sm' \| 'md' \| 'lg'`           | `'md'`  | Taille de la carte                        |
| `maxAttempts`            | `number`                         | `0`     | Nombre max de tentatives (0 = illimité)   |
| `showCorrectionOnWrong`  | `boolean`                        | `false` | Auto-flip vers la correction si faux      |
| `showValidationFeedback` | `boolean`                        | `true`  | Affiche les messages de validation        |
| `onAnswerSubmit`         | `(answer: AnswerData) => void`   | -       | Callback à chaque soumission              |
| `onAnswerChange`         | `(value: string[]) => void`      | -       | Callback en temps réel (avant soumission) |
| `onComplete`             | `(stats: QuestionStats) => void` | -       | Callback quand la question est terminée   |
| `onFlip`                 | `(isFlipped: boolean) => void`   | -       | Callback quand la carte est retournée     |

---

## 🔧 Types de questions supportés

| Type                  | Composant de saisie | Statut         |
| --------------------- | ------------------- | -------------- |
| `numerical_exact`     | NumericalInput      | ✅ Implémenté  |
| `numerical_decimal`   | NumericalInput      | ✅ Implémenté  |
| `numerical_rounded`   | NumericalInput      | ✅ Implémenté  |
| `algebraic_transform` | AlgebraicInput      | ✅ Implémenté  |
| `fill_in_blanks`      | FillBlanksInput     | ✅ Implémenté  |
| `multiple_choice`     | MultipleChoiceInput | ✅ Implémenté  |
| `ordering`            | OrderingInput       | ⏳ Placeholder |

---

## 🆚 Versions

### Version 2.0 (Actuelle) - FlashCard

- ✅ API simplifiée (`interactive` au lieu de `mode`)
- ✅ Pas de confetti (moins de distractions)
- ✅ `maxAttempts` uniquement (plus simple)
- ✅ Type `ordering` avec placeholder
- ✅ Flip toujours actif

### Version 1.0 (Deprecated) - QuestionDisplay

- ❌ API avec `mode: 'flashcard' | 'interactive'`
- ❌ Props `showConfetti` et `allowMultipleAttempts`
- ❌ Flip conditionnel selon le mode

**Migration** : Consultez [FLASHCARD_MIGRATION_GUIDE.md](FLASHCARD_MIGRATION_GUIDE.md)

---

## 📞 Support et contribution

### Problèmes connus

Consultez la section **Known Limitations** dans [FLASHCARD_COMPONENT.md](FLASHCARD_COMPONENT.md#known-limitations)

### Debugging

1. Vérifiez les types : `pnpm check`
2. Utilisez la page de debug : `/dashboard/admin/debug/question-display`
3. Consultez le guide de troubleshooting

### Améliorations futures

Voir la section **Future Enhancements** dans [FLASHCARD_COMPONENT.md](FLASHCARD_COMPONENT.md#future-enhancements)

---

## 📊 Statistiques du projet

- **Composant principal** : 717 lignes (FlashCard.svelte)
- **Types** : 238 lignes (question-display.ts)
- **Validateur** : ~300 lignes (answer-validator.ts)
- **Composants de saisie** : 5 fichiers
- **Pages de test** : 2 (demo + debug)
- **Documentation** : 3 fichiers principaux

---

## 🗺️ Roadmap

### Court terme

- [ ] Compléter l'implémentation du type `ordering`
- [ ] Ajouter des tests unitaires Vitest
- [ ] Améliorer l'accessibilité (ARIA)

### Moyen terme

- [ ] Système de hints progressifs
- [ ] Mode explication interactive
- [ ] Support des images dans les réponses

### Long terme

- [ ] Mode collaboratif multi-joueurs
- [ ] Adaptive difficulty
- [ ] Gamification (XP, badges)

---

**Dernière mise à jour** : 2025-10-21
**Version** : 2.0
**Statut** : ✅ Production ready
