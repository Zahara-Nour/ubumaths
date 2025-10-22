# FlashCard Component - Changelog

Toutes les modifications notables du composant FlashCard sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.0.0] - 2025-10-21

### 🎯 Refactoring majeur : QuestionDisplay → FlashCard

Cette version introduit une refonte complète du composant avec une API simplifiée.

### ⚠️ Breaking Changes

#### Renommage du composant

- **AVANT** : `QuestionDisplay.svelte`
- **APRÈS** : `FlashCard.svelte`
- **Raison** : Nom plus descriptif reflétant la mécanique de flip

#### API simplifiée

1. **Prop `mode` supprimée**

   - **AVANT** : `mode: 'flashcard' | 'interactive'`
   - **APRÈS** : `interactive?: boolean` (default: `false`)
   - **Raison** : Boolean plus simple et plus clair

2. **Prop `showConfetti` supprimée**

   - **AVANT** : `showConfetti?: boolean` (default: `true`)
   - **APRÈS** : Prop supprimée, pas de confetti
   - **Raison** : Éviter les distractions dans les tests

3. **Prop `allowMultipleAttempts` supprimée**
   - **AVANT** : `allowMultipleAttempts?: boolean` + `maxAttempts?: number`
   - **APRÈS** : `maxAttempts?: number` uniquement (0 = illimité)
   - **Raison** : Simplification, une seule prop suffit

### ✨ Ajouts

#### Nouveau type de question

- **Type `ordering` ajouté** avec placeholder
  - Message informatif : "Type de question 'ordering' non implémenté"
  - Permet de préparer le terrain pour l'implémentation future
  - Évite les erreurs si ce type est généré

#### Comportement du flip

- **Flip toujours actif** dans tous les modes
  - **AVANT** : Flip actif uniquement en mode flashcard OU après validation en mode interactive
  - **APRÈS** : Bouton flip toujours visible et fonctionnel
  - **Raison** : Plus de flexibilité pour l'utilisateur

### 🔧 Modifications

#### Documentation

- ✅ Nouvelle documentation complète : `FLASHCARD_COMPONENT.md`
- ✅ Guide de migration : `FLASHCARD_MIGRATION_GUIDE.md`
- ✅ Hub de documentation : `FLASHCARD_README.md`
- ✅ Changelog : `FLASHCARD_CHANGELOG.md`
- 📦 Ancien fichier archivé : `QUESTION_DISPLAY_COMPONENT_OLD.md`

#### Fichiers migrés

- ✅ `TestInteractive.svelte` - Mode quiz
- ✅ `TestCourse.svelte` - Mode course aux nombres
- ✅ `QuestionPreview.svelte` - Preview dans le formulaire
- ✅ `QuestionPreviewCard.svelte` - Modal de preview
- ✅ `debug/question-display/+page.svelte` - Page de debug
- ✅ `demo/question-display-demo/+page.svelte` - Page de démo
- ✅ `questions/[id]/preview/+page.svelte` - Preview admin

#### Types TypeScript

- ❌ Type `QuestionDisplayMode` supprimé
- ✅ Interface `QuestionDisplayProps` mise à jour
- ✅ Tous les autres types conservés (`AnswerData`, `QuestionStats`, etc.)

### 📚 Migration

Consultez le guide complet : [FLASHCARD_MIGRATION_GUIDE.md](FLASHCARD_MIGRATION_GUIDE.md)

**Exemple de migration** :

```diff
- import QuestionDisplay from '$lib/components/questions/QuestionDisplay.svelte';
+ import FlashCard from '$lib/components/questions/FlashCard.svelte';

- <QuestionDisplay
-   mode="interactive"
-   {instance}
-   showConfetti={true}
-   allowMultipleAttempts={false}
- />
+ <FlashCard
+   interactive={true}
+   {instance}
+   maxAttempts={1}
+ />
```

### 🐛 Corrections

- Correction du comportement du flip (maintenant cohérent dans tous les modes)
- Amélioration de la gestion des états disabled pour les inputs
- Simplification de la logique conditionnelle interne

### 📊 Statistiques

- **Lignes modifiées** : ~200 lignes dans le composant principal
- **Fichiers impactés** : 11 fichiers (7 usages + 4 docs)
- **Props supprimées** : 3
- **Props ajoutées** : 0 (simplification)

---

## [1.0.0] - 2025-10-19

### 🎉 Release initiale

Premier déploiement du composant QuestionDisplay.

### ✨ Features

#### Modes d'affichage

- **Mode Flashcard** : Affichage lecture seule avec flip
- **Mode Interactive** : Validation de réponse avec feedback

#### Types de questions supportés

- ✅ `numerical_exact` - Valeur exacte
- ✅ `numerical_decimal` - Précision décimale
- ✅ `numerical_rounded` - Arrondi
- ✅ `algebraic_transform` - Transformations algébriques
- ✅ `fill_in_blanks` - Remplir les blancs
- ✅ `multiple_choice` - QCM (choix simple ou multiple)

#### Système FlipCard

- Animation 3D avec CSS transforms
- Hauteur dynamique via ResizeObserver
- Contrainte viewport (80vh max)
- Scrolling automatique si contenu trop long

#### Validation des réponses

- Validation numérique (exacte, décimale, arrondie)
- Validation algébrique via Compute Engine
- Validation des blancs (par champ)
- Validation QCM (choix simple/multiple)

#### Feedback visuel

- ✅ Bordures et backgrounds colorés (vert/rouge)
- ✅ Icônes (Check/X)
- ✅ Confetti sur réponse correcte
- ✅ Messages de validation
- ✅ Auto-flip optionnel sur erreur

#### Statistiques

- ⏱️ Temps passé (secondes)
- 🔢 Nombre de tentatives
- 📜 Historique des réponses
- ✅ Première tentative correcte
- 📅 Timestamp de complétion

#### Callbacks

- `onAnswerSubmit` - À chaque soumission
- `onAnswerChange` - En temps réel (pendant la saisie)
- `onComplete` - À la fin de la question
- `onFlip` - Quand la carte est retournée

#### Accessibilité

- ARIA labels sur tous les éléments interactifs
- Navigation clavier (Tab, Enter, Space)
- Support lecteur d'écran
- High contrast mode
- Font scaling

#### Intégrations

- ✅ MathLive pour le rendu LaTeX
- ✅ Shadcn-svelte pour l'UI
- ✅ Svelte 5 runes pour la réactivité
- ✅ canvas-confetti pour l'animation
- ✅ Question Bank System

### 📚 Documentation

- Documentation complète : `QUESTION_DISPLAY_COMPONENT.md`
- Documentation des tests : `TEST_FEATURE_DOCUMENTATION.md`
- Page de démo : `/demo/question-display-demo`
- Page de debug : `/dashboard/admin/debug/question-display`

### 🧪 Tests

- Page de démo publique avec 4 questions types
- Page de debug admin avec inspection d'état
- 5 types de questions testés
- Tests manuels sur desktop et mobile

---

## [0.1.0] - 2025-10-18

### 🚧 Développement initial

- Création du composant de base
- Implémentation des inputs spécifiques
- Intégration MathLive
- Tests préliminaires

---

## Types de changements

- `Added` - Nouvelles fonctionnalités
- `Changed` - Modifications de fonctionnalités existantes
- `Deprecated` - Fonctionnalités bientôt supprimées
- `Removed` - Fonctionnalités supprimées
- `Fixed` - Corrections de bugs
- `Security` - Corrections de vulnérabilités

---

## Roadmap

### [2.1.0] - Prévu

#### Ajouts prévus

- [ ] Implémentation complète du type `ordering`
- [ ] Tests unitaires Vitest
- [ ] Tests E2E Playwright
- [ ] Support des images dans les réponses

### [2.2.0] - Prévu

#### Améliorations prévues

- [ ] Système de hints progressifs
- [ ] Mode explication interactive
- [ ] Amélioration de l'accessibilité
- [ ] Optimisation des performances

### [3.0.0] - Futur

#### Features futures

- [ ] Mode collaboratif
- [ ] Adaptive difficulty
- [ ] Gamification (XP, badges)
- [ ] Export PDF des résultats
- [ ] Support hors-ligne

---

**Mainteneur** : Claude Code
**License** : Projet privé
**Repository** : ubumaths
