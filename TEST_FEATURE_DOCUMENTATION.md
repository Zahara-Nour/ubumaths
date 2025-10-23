# Fonctionnalité Tests / Évaluations Automaths

## 📋 Vue d'ensemble

La fonctionnalité de tests permet aux utilisateurs de créer des sessions d'évaluation à partir des questions sélectionnées dans leur panier Automaths. Trois modes sont disponibles selon le cas d'usage.

## 🎯 Modes disponibles

### 1. Mode Révision (Display)

**Objectif** : Mémorisation et révision sans pression

- Questions affichées en diaporama automatique
- Countdown visible basé sur le délai de chaque question
- Contrôles Pause/Play disponibles
- À la fin : choix entre "Revoir tout" ou "Voir corrections"
- **Pas de score** (mode révision uniquement)
- **Pas de sauvegarde** en base de données

**Utilisation idéale** : Révision avant un contrôle, mémorisation de formules

### 2. Mode Quiz (Interactive)

**Objectif** : Évaluation avec score

- Questions présentées une par une
- Utilisateur répond et valide
- Pas de correction immédiate (stockage des réponses)
- Auto-avance après validation
- À la fin : affichage du score sur 10 + corrections détaillées
- **Score calculé** et **sauvegardé** en base de données

**Utilisation idéale** : Auto-évaluation, entraînement en conditions réelles

### 3. Course aux nombres

**Objectif** : Rapidité et efficacité

- Toutes les questions affichées simultanément en grid
- Countdown global (temps paramétrable)
- Réponse dans n'importe quel ordre
- Bouton "Terminer" ou fin automatique quand temps écoulé
- Score sur 10 + corrections détaillées
- **Score calculé** et **sauvegardé** en base de données

**Utilisation idéale** : Entraînement au calcul mental rapide, compétitions

## 🏗️ Architecture technique

### Fichiers créés

#### Base de données

```
supabase/migrations/079_create_test_sessions.sql
```

- Tables `test_sessions` et `test_answers`
- RLS (Row Level Security) configuré
- Indexes pour performances

#### Types TypeScript

```
src/lib/types/test.ts
```

- `TestMode`, `TestConfig`, `TestSession`, `TestResult`
- Types pour base de données : `DbTestSession`, `DbTestAnswer`

#### Composants Svelte

```
src/lib/components/test/
├── TestModeDialog.svelte      # Sélection du mode
├── TestTimer.svelte           # Countdown circulaire réutilisable
├── TestDisplay.svelte         # Mode révision
├── TestInteractive.svelte     # Mode quiz
├── TestCourse.svelte          # Mode course aux nombres
└── TestResults.svelte         # Page de résultats

src/lib/components/questions/
├── QuestionCard.svelte        # Question display sans feedback (utilisé par tous les modes)
├── FlashCard.svelte           # Question display avec flip (pour étude/révision)
└── CorrectionCard.svelte      # Correction display avec flip 3D (utilisé dans TestResults)

src/lib/transitions/
└── slide-transition.ts        # Transitions slide + fade pour questions
```

#### Pages et API

```
src/routes/(public)/automaths/test/
├── +page.svelte               # Page principale du test
└── +page.server.ts            # Load des templates

src/routes/api/tests/save/
└── +server.ts                 # API de sauvegarde des résultats
```

### Modifications de fichiers existants

#### `src/routes/(public)/automaths/panier/+page.svelte`

- Bouton "Pratique en ligne" remplacé par "Commencer un test"
- Intégration du `TestModeDialog`
- Fonction de navigation vers `/automaths/test` avec URL params

## 🔄 Flux de données

### 1. Sélection du mode (Panier → Dialog → Test)

```
User clicks "Commencer un test"
    ↓
TestModeDialog opens
    ↓
User selects mode + (time for course mode)
    ↓
Navigate to /automaths/test?mode=X&categories=JSON&time=Y
```

### 2. Génération des questions

```
+page.server.ts loads all published templates
    ↓
+page.svelte decodes URL params (mode, categories, time)
    ↓
For each CartItem:
    Filter matching templates
    Select random template
    Generate instance with generateInstance()
    ↓
Create TestSession with all instances
```

### 3. Déroulement du test

**Mode Display:**

```
Display question 1 → Timer countdown → Auto-advance → ... → End
    ↓
Choose "Review all" or "View corrections"
```

**Mode Interactive:**

```
Question 1 → User answers → Validate → Store answer → Next → ... → End
    ↓
Calculate score → Save to DB → Show TestResults
```

**Mode Course:**

```
Display all questions in grid → User answers → Timer or manual finish
    ↓
Calculate score → Save to DB → Show TestResults
```

### 4. Sauvegarde en base

```
TestResult generated
    ↓
POST /api/tests/save
    ↓
Insert test_sessions row
    ↓
Insert test_answers rows (one per question)
    ↓
Return sessionId
```

## 📊 Structure des données

### URL Parameters

```typescript
/automaths/test?mode=interactive&categories=ENCODED_JSON&time=300

// Decoded categories format:
[
  {
    category: { theme, domain, subdomain, level },
    quantity: 5,
    delay: 20
  }
]
```

### TestSession (runtime)

```typescript
{
  mode: 'display' | 'interactive' | 'course',
  categories: CartItem[],
  instances: QuestionInstance[],
  userAnswers: Map<number, AnswerData>,
  startTime: number,
  timeLimit?: number,
  currentQuestionIndex: number,
  isPaused: boolean
}
```

### TestResult (final)

```typescript
{
  sessionId?: string,
  mode: TestMode,
  score: number,              // sur 10 (ex: 7.5)
  scorePercentage: number,    // pourcentage (75%)
  totalQuestions: number,
  correctAnswers: number,
  timeSpent: number,          // secondes
  averageTime: number,
  answers: TestAnswerResult[],
  completedAt: string
}
```

## 🎨 UI/UX

### TestTimer

- Cercle de progression SVG avec `stroke-dashoffset` animé
- Couleurs progressives : vert (>50%) → jaune (>20%) → rouge (<20%)
- 3 tailles : `sm`, `md`, `lg`
- Format MM:SS
- Indicateur "En pause" si nécessaire

### TestDisplay

- Progress bar en haut
- Timer centralisé avec ajustements dynamiques (boutons +/-)
- FAB Pause/Play (coin inférieur droit)
- Questions affichées avec `QuestionCard` en mode `interactive={false}`
- **Transition animée entre questions** (slide depuis droite + fade, 500ms)
- Choix final avec cartes cliquables :
  - **Mode "Revoir tout"** : Questions avec `QuestionCard`
  - **Mode "Corrections"** : Grid de `CorrectionCard` (sans réponses utilisateur)

### TestInteractive

- Progress bar
- Questions avec `QuestionCard` en mode `interactive={true}`
- **Transition animée entre questions** (slide depuis droite + fade, 500ms)
- Pas de feedback de validation immédiat (validation silencieuse)
- Input désactivé après soumission
- Tentative unique par question

### TestCourse

- Sticky header avec timer + compteur + bouton Terminer
- Grid responsive (1-3 colonnes)
- Questions avec `QuestionCard` (taille `sm`)
- Badge numérique sur chaque question
- Ring effect quand question répondue
- Scroll to top button (apparaît après scroll)

### TestResults

- Score hero (grand, coloré selon performance)
- Statistiques (temps total, temps moyen)
- **Grid de CorrectionCard** (2 colonnes desktop, 1 colonne mobile)
- Chaque carte avec :
  - **Face avant** : Énoncé (collapsible), réponse user vs correcte, badges ✓/✗
  - **Face arrière** : Correction détaillée (flip 3D)
  - Bouton flip en bas à droite (icône rotation)
- Boutons "Recommencer" et "Retour au panier"

### Transitions entre questions

**Fichier** : `src/lib/transitions/slide-transition.ts`

Les modes Display et Interactive utilisent des transitions Svelte personnalisées pour une meilleure expérience utilisateur :

#### Comportement

- **Ancienne question** : Sort vers la gauche avec fade out (500ms)
- **Nouvelle question** : Arrive depuis la droite avec fade in (500ms)
- **Easing** : `cubicOut` (décélération naturelle)
- **Positionnement** : Carte ancrée en haut pour éviter le "saut" vertical

#### Implémentation technique

```svelte
<!-- Wrapper avec position relative et hauteur minimale -->
<div class="relative min-h-[500px]">
	{#key currentIndex}
		<!-- Carte en position absolue, ancrée en haut -->
		<div class="absolute inset-x-0 top-0 w-full" in:slideFromRight out:slideToLeft>
			<QuestionCard ... />
		</div>
	{/key}
</div>
```

**Détails clés** :

- Wrapper `relative min-h-[500px]` : Crée un conteneur de référence stable
- Element `absolute inset-x-0 top-0` : Ancre la carte en haut du wrapper
- Le `{#key}` force le remontage et déclenche les transitions in/out
- Les deux transitions s'exécutent simultanément pour un effet fluide

#### Fonctions de transition

```typescript
// Entrée : slide depuis la droite + fade in
slideFromRight(node, { duration: 500, easing: cubicOut })
  → translateX: 100% → 0%
  → opacity: 0 → 1

// Sortie : slide vers la gauche + fade out
slideToLeft(node, { duration: 500, easing: cubicOut })
  → translateX: 0% → -100%
  → opacity: 1 → 0
```

**Avantages** :

- Transitions CSS natives (performances optimales)
- Aucun layout shift pendant l'animation
- Compatible avec les timers et contrôles de pause
- Expérience visuelle cohérente entre Display et Interactive

## 📝 Score calculation

```typescript
const scorePercentage = (correctAnswers / totalQuestions) * 100;
const scoreOn10 = Math.round((correctAnswers / totalQuestions) * 10 * 10) / 10;
// Arrondi à 1 décimale : 7.5/10
```

**Paliers de couleur:**

- ≥ 8/10 : Vert (Excellent)
- ≥ 5/10 : Jaune (Moyen)
- < 5/10 : Rouge (À retravailler)

## 🔒 Sécurité

### Row Level Security (RLS)

- Les utilisateurs ne peuvent voir que leurs propres sessions
- Les utilisateurs ne peuvent créer/modifier que leurs propres données
- Les réponses sont liées aux sessions via foreign key

### Validation

- Mode validé (display | interactive | course)
- Catégories requises
- Time limit optionnel (course uniquement)
- User authentifié requis pour sauvegarde

## 🚀 Utilisation

### Pour l'utilisateur final

1. **Sélectionner des questions** dans `/automaths`
2. **Ajouter au panier** (bouton "Ajouter")
3. **Accéder au panier** via le FAB
4. **Cliquer sur "Commencer un test"**
5. **Choisir le mode** dans le dialog
6. **Pour "Course aux nombres"** : définir le temps (en minutes)
7. **Le test démarre** automatiquement
8. **Répondre aux questions** selon le mode
9. **Voir les résultats** à la fin

### Pour le développeur

#### Créer un nouveau mode de test

```typescript
// 1. Ajouter le mode dans les types
export type TestMode = 'display' | 'interactive' | 'course' | 'newmode';

// 2. Créer le composant
// src/lib/components/test/TestNewMode.svelte

// 3. Ajouter dans +page.svelte
{:else if testSession.mode === 'newmode'}
  <TestNewMode session={testSession} onComplete={handleTestComplete} onBack={handleBackToCart} />
{/if}

// 4. Ajouter dans TestModeDialog
const modeConfigs = [
  // ... existing modes
  {
    mode: 'newmode' as TestMode,
    title: 'Nouveau mode',
    icon: SomeIcon,
    description: 'Description du mode',
    features: ['Feature 1', 'Feature 2']
  }
];
```

#### Modifier le calcul du score

Le score est calculé dans les composants `TestInteractive` et `TestCourse` via la fonction `completeTest()`.

```typescript
// Exemple : ajouter un bonus de rapidité
const timeBonus = timeSpent < session.instances.length * 15 ? 0.5 : 0;
const scoreOn10 = Math.round((correctAnswers / totalQuestions) * 10 * 10) / 10 + timeBonus;
```

## 📈 Prochaines étapes possibles

### Fonctionnalités futures

1. **Historique des tests**
   - Page `/dashboard/tests/history`
   - Liste des sessions avec filtres (mode, date, score)
   - Graphiques d'évolution

2. **Statistiques par catégorie**
   - Taux de réussite par thème/domaine
   - Temps moyen par type de question
   - Points forts / points faibles

3. **Mode "Révision intelligente"**
   - Priorise les questions ratées
   - Adapte la difficulté selon les performances
   - Système de répétition espacée (SRS)

4. **Partage de tests**
   - Générer un lien de partage
   - Permettre aux enseignants de créer des tests pour leurs élèves
   - Mode "examen" (désactiver pause, limite de temps stricte)

5. **Export des résultats**
   - Export PDF des résultats
   - Export CSV pour analyse
   - Envoi par email

6. **Récompenses et badges**
   - Badge "Perfectionniste" (10/10)
   - Badge "Rapide" (finir avant 50% du temps)
   - Badge "Persévérant" (5+ tentatives)

## 🐛 Dépannage

### Les questions ne se génèrent pas

- Vérifier que le panier contient des questions
- Vérifier que des templates publiés existent pour ces catégories
- Consulter la console pour les erreurs de génération

### Le timer ne démarre pas

- Vérifier que `duration` est un nombre positif
- Vérifier que `isPaused` est `false`
- Vérifier que le composant est monté correctement

### Les résultats ne se sauvegardent pas

- Vérifier que l'utilisateur est authentifié
- Vérifier les permissions RLS dans Supabase
- Consulter les logs serveur (`pnpm dev`)

### Erreurs TypeScript

- Exécuter `pnpm check` pour vérifier les types
- S'assurer que `database.ts` est à jour avec le schéma Supabase
- Vérifier les imports des types dans les fichiers

## 🔗 Composants associés

### QuestionCard vs FlashCard vs CorrectionCard

Le système utilise trois composants différents selon le contexte :

#### Pendant le test : QuestionCard

Les tests utilisent **QuestionCard** (pas FlashCard) pour afficher les questions **pendant** le test, car :

- ❌ Aucun feedback visuel (validation silencieuse)
- ❌ Pas de flip/correction immédiate
- ✅ Parfait pour les tests (feedback différé)

#### Après le test : CorrectionCard

Les résultats utilisent **CorrectionCard** pour afficher les corrections **après** le test :

- ✅ Flip 3D (face avant : réponses, face arrière : correction)
- ✅ Comparaison réponse user vs correcte
- ✅ Énoncé collapsible
- ✅ Adapté à tous les types de questions
- ✅ Lecture seule (pas d'input)

#### Pour l'étude : FlashCard

FlashCard est utilisé dans d'autres contextes (révision, apprentissage) :

- ✅ Interactive avec input
- ✅ Feedback immédiat
- ✅ Flip pour voir la correction

| Critère               | QuestionCard   | CorrectionCard        | FlashCard            |
| --------------------- | -------------- | --------------------- | -------------------- |
| **Usage**             | Tests en cours | Corrections post-test | Étude/révision       |
| **Flip 3D**           | ❌ Non         | ✅ Oui                | ✅ Oui               |
| **Input utilisateur** | ✅ Oui         | ❌ Lecture seule      | ✅ Oui               |
| **Feedback visuel**   | ❌ Aucun       | ✅ Comparaison        | ✅ Correct/Incorrect |
| **Feedback timing**   | Différé        | Après test complet    | Immédiat             |
| **Complexité**        | ~340 lignes    | ~460 lignes           | ~750 lignes          |

**Documentation complète** :

- `QUESTION_CARD_COMPONENT.md` - QuestionCard
- `CORRECTION_CARD_COMPONENT.md` - CorrectionCard
- `FLASHCARD_COMPONENT.md` - FlashCard

---

## 📚 Références

- **Documentation Svelte 5** : https://svelte.dev/docs/svelte/overview
- **Shadcn-svelte** : https://www.shadcn-svelte.com/docs
- **Supabase RLS** : https://supabase.com/docs/guides/auth/row-level-security
- **Question Bank System** : voir `CLAUDE_FEATURES_QUESTION_BANK.md`
- **QuestionCard Component** : voir `QUESTION_CARD_COMPONENT.md`
- **CorrectionCard Component** : voir `CORRECTION_CARD_COMPONENT.md`
- **FlashCard Component** : voir `FLASHCARD_COMPONENT.md`

---

**Date de création** : 2025-10-20
**Dernière mise à jour** : 2025-10-22
**Version** : 1.3.0
**Auteur** : Claude Code

---

## 📝 Changelog

### v1.3.0 (2025-10-22)

- ✨ Ajout de transitions animées entre questions (slide + fade, 500ms)
- 🎨 Nouveau fichier `slide-transition.ts` avec transitions réutilisables
- 🐛 Correction du positionnement vertical pendant les transitions
- 📚 Documentation complète des transitions dans section UI/UX

### v1.2.0 (2025-10-21)

- 📝 Documentation des composants QuestionCard, CorrectionCard, FlashCard
- 🔧 Ajout de comparaison détaillée des trois composants

### v1.0.0 (2025-10-20)

- 🎉 Version initiale avec 3 modes de test (Display, Interactive, Course)
- 💾 Sauvegarde en base de données (Supabase)
- 🎨 UI complète avec timers, résultats et corrections
