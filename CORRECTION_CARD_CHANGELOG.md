# CorrectionCard - Changelog

Historique des versions du composant CorrectionCard.

---

## [1.1.0] - 2025-10-21

### ✨ Ajouté
- **Intégration dans TestDisplay** : Le composant est maintenant utilisé dans le mode révision
  - Grid responsive (2 colonnes desktop, 1 colonne mobile)
  - Support du mode sans réponses utilisateur
  - Fonction helper `createAnswerResultForDisplay()` dans TestDisplay

### 🔧 Amélioré
- **Affichage conditionnel** : Badge correct/incorrect masqué si `userAnswer === undefined`
- **Section "Votre réponse"** : Masquée si `userAnswer === undefined`
- **Type safety** : Ajout de type guard `Array.isArray()` pour `fill_in_blanks`

### 🐛 Corrigé
- **Images** : Utilisation de `field.content` au lieu de `field.url` (alignement avec le type `ContentField`)

### 📚 Documentation
- Ajout de l'exemple d'utilisation dans TestDisplay
- Documentation du mode révision vs mode avec réponses
- Mise à jour du tableau comparatif avec "Utilisé dans"
- Ajout de tests manuels pour le mode révision

### 📁 Fichiers modifiés
- `src/lib/components/questions/CorrectionCard.svelte` (lignes 166-176, 215-258, 204, 322)
- `src/lib/components/test/TestDisplay.svelte` (lignes 24, 27, 164-177, 343-372)
- `CORRECTION_CARD_COMPONENT.md` (sections Utilisation, Cas particuliers, Tests)
- `TEST_FEATURE_DOCUMENTATION.md` (section TestDisplay UI/UX)

---

## [1.0.0] - 2025-10-21

### 🎉 Version initiale

#### ✨ Fonctionnalités
- **Flip 3D** : Mécanisme de flip similaire à FlashCard
  - Face avant : Énoncé collapsible, réponse user vs correcte
  - Face arrière : Correction détaillée
  - Animation smooth avec transition cubic-bezier
  - Bouton flip en bas à droite

- **Gestion de la hauteur** : ResizeObserver pour égaliser front/back
  - `currentHeight = Math.min(Math.max(frontHeight, backHeight), 80vh)`
  - Scroll automatique si contenu dépasse
  - Adaptation responsive

- **Rendu par type de question** :
  - Numerical (exact, decimal, rounded)
  - Algebraic transform
  - Fill-in-blanks (liste des réponses)
  - Multiple choice (lettres A, B, C...)

- **Feedback visuel** :
  - Badge vert/rouge (correct/incorrect)
  - Bordures colorées selon correct/incorrect
  - Fond coloré pour réponse utilisateur
  - Icônes ✓/✗

- **Énoncé collapsible** :
  - État initial : caché
  - Bouton toggle "Voir/Masquer l'énoncé"
  - Icônes ChevronDown/ChevronUp

- **Stats** : Temps passé et nombre de tentatives (si disponibles)

#### 🎨 UI/UX
- **Props** :
  - `answerResult: TestAnswerResult` (obligatoire)
  - `questionNumber?: number` (optionnel)
  - `size?: 'sm' | 'md' | 'lg'` (défaut: 'md')

- **Tailles de carte** :
  - sm: max-w-md (448px)
  - md: max-w-2xl (672px)
  - lg: max-w-4xl (896px)

- **Support** :
  - Dark mode complet
  - Font scaling (`--font-scale`)
  - Responsive (mobile/desktop)
  - Accessibilité (ARIA labels)

#### 📁 Fichiers créés
- `src/lib/components/questions/CorrectionCard.svelte` (460 lignes)
- `CORRECTION_CARD_COMPONENT.md` (documentation complète)

#### 🔗 Intégrations
- **TestResults** : Remplacement de l'accordion par grid de CorrectionCard
  - Grid responsive (2 colonnes desktop, 1 colonne mobile)
  - Nettoyage des imports inutiles (Accordion, MathDisplay, Badge, Check, X)

#### 📚 Documentation
- Documentation technique complète (CORRECTION_CARD_COMPONENT.md)
- Ajout dans DOCS_INDEX.md
- Mise à jour TEST_FEATURE_DOCUMENTATION.md
- Exemples d'utilisation
- Tests manuels recommandés

---

## Format de version

Ce projet suit le [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- **MAJOR** : Changements incompatibles de l'API
- **MINOR** : Ajout de fonctionnalités compatibles
- **PATCH** : Corrections de bugs compatibles

---

**Date de création** : 2025-10-21
**Maintenu par** : Claude Code
