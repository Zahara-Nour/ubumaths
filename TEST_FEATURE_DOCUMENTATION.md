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
- Timer centralisé
- FAB Pause/Play (coin inférieur droit)
- Transition smooth entre questions (fade)
- Choix final avec cartes cliquables

### TestInteractive
- Progress bar
- Questions avec `QuestionDisplay` mode interactive
- Pas de confetti (pour ne pas distraire)
- Tentative unique par question

### TestCourse
- Sticky header avec timer + compteur + bouton Terminer
- Grid responsive (1-3 colonnes)
- Badge numérique sur chaque question
- Ring effect quand question répondue
- Scroll to top button (apparaît après scroll)

### TestResults
- Score hero (grand, coloré selon performance)
- Statistiques (temps total, temps moyen)
- Accordion pour chaque question
- Badges Correct ✓ / Incorrect ✗
- Détails : énoncé, réponse user, réponse correcte, explication
- Boutons "Recommencer" et "Retour au panier"

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
const timeBonus = timeSpent < (session.instances.length * 15) ? 0.5 : 0;
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

## 📚 Références

- **Documentation Svelte 5** : https://svelte.dev/docs/svelte/overview
- **Shadcn-svelte** : https://www.shadcn-svelte.com/docs
- **Supabase RLS** : https://supabase.com/docs/guides/auth/row-level-security
- **Question Bank System** : voir `CLAUDE_FEATURES_QUESTION_BANK.md`

---

**Date de création** : 2025-10-20
**Version** : 1.0.0
**Auteur** : Claude Code
