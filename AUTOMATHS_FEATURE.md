# Fonctionnalité Automaths

## Vue d'ensemble

La fonctionnalité **Automaths** permet aux utilisateurs (enseignants et élèves) de parcourir la banque de questions, sélectionner des questions selon une hiérarchie thématique, et les ajouter à un panier pour créer des exercices personnalisés.

## Architecture

### Pages créées

1. **`/automaths`** - Page principale de sélection
2. **`/automaths/panier`** - Page de gestion du panier

### Composants créés

| Composant                    | Emplacement           | Description                                  |
| ---------------------------- | --------------------- | -------------------------------------------- |
| `questionCart.svelte.ts`     | `src/lib/stores/`     | Store Svelte 5 avec persistance localStorage |
| `QuestionPreviewCard.svelte` | `src/lib/components/` | Carte de prévisualisation d'une question     |
| `CartFloatingButton.svelte`  | `src/lib/components/` | Bouton flottant d'accès au panier (FAB)      |

### Fichiers modifiés

- **`Sidebar.svelte`** : Ajout de l'entrée "Automaths" avec icône Calculator
- **`+layout.svelte`** : Retrait du `bg-background` du main (non nécessaire)

## Hiérarchie de navigation

```
Thème (Select natif)
  └─ Domaine (Tabs)
      └─ Sous-domaine (Accordéon)
          └─ Questions (Galerie de cartes)
```

### 1. Sélection du thème

- **UI** : `<select>` HTML natif
- **Style** : Classes Tailwind cohérentes avec le design system
- Auto-sélection du premier thème au chargement

### 2. Sélection du domaine

- **UI** : Tabs (composant shadcn-svelte)
- **Style** :
  - `Tabs.List` : Transparent avec bordure (`!bg-transparent border border-border`)
  - Badge affichant le nombre total de questions par domaine

### 3. Navigation des sous-domaines

- **UI** : Accordéon multi-ouverture
- **Style** :
  - `Accordion.Item` : `bg-card` (blanc/sombre selon thème)
  - Bordure arrondie : `rounded-lg border border-border`
  - Suppression bordure inférieure par défaut : `!border-b-0`
  - Hover : `hover:bg-muted/50`

### 4. Galerie de questions

- **Layout** : Grid responsive
  - Mobile : 1 colonne
  - Tablet : 2 colonnes
  - Desktop : 3 colonnes
- **Carte** : `QuestionPreviewCard`

## Store du panier

### Structure `CartItem`

```typescript
interface CartItem {
	category: QuestionCategory; // Catégorie de questions
	quantity: number; // Quantité désirée (1-99)
	delay: number; // Délai d'affichage en secondes (5-300, défaut: 20)
}

interface QuestionCategory {
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
}
```

**Note** : Le système actuel stocke uniquement la **catégorie** (pas de `templateId` spécifique). Cela permet de sélectionner un template aléatoire parmi tous ceux qui correspondent à la catégorie à chaque génération.

### API du store

```typescript
// Getters réactifs
questionCart.allItems; // CartItem[]
questionCart.totalItems; // number (nombre de catégories)
questionCart.totalInstances; // number (somme des quantités)

// Méthodes
questionCart.addToCart(category, quantity, delay); // delay optionnel, défaut: 20s
questionCart.removeFromCart(category);
questionCart.updateQuantity(category, quantity);
questionCart.incrementQuantity(category); // +1 (max 99)
questionCart.decrementQuantity(category); // -1 (supprime si = 0)
questionCart.updateDelay(category, delay); // Modifier le délai (5-300s)
questionCart.clearCart();
questionCart.hasCategory(category);
questionCart.getItem(category);
questionCart.getItemsByCategory();
```

### Persistance

- **Storage** : `localStorage` (clé : `ubumaths_question_cart`)
- **Initialisation** : Automatique via `$effect()` côté client
- **Sauvegarde** : Automatique après chaque modification
- **Gestion erreurs** : QuotaExceededError avec message utilisateur

## Composant QuestionPreviewCard

### Props

```typescript
{
	template: QuestionTemplate;
	preview: QuestionInstance;
}
```

### Éléments affichés

1. **Header**
   - Type de question (badge secondary)
   - Niveau (badge outline)
   - Durée si définie (badge outline avec ⏱️)

2. **Titre**
   - `template.title`

3. **Aperçu de l'énoncé**
   - Texte tronqué à 4 lignes (`line-clamp-4`)
   - Rendu HTML avec `{@html}`

4. **Catégories**
   - Thème (badge bleu)
   - Domaine (badge violet)
   - Sous-domaine si présent (badge ambre)

5. **Contrôles**
   - Input quantité (1-99)
   - Bouton "Ajouter" / "Ajouté" (désactivé si déjà dans le panier)

### États visuels

- **Normal** : Bouton avec icône `Plus`
- **Ajouté** : Bouton désactivé avec icône `Check` et texte "Ajouté"
- **Hover** : Effet shadow-lg sur la carte

## Floating Action Button (FAB)

### Position

- `fixed bottom-6 right-6 z-50`
- Toujours visible, au-dessus du contenu

### Fonctionnalités

- **Badge** : Affiche le nombre total de questions dans le panier
- **Animation** : Pulse si le panier contient des items
- **Hover** : Scale 1.1 avec shadow-xl
- **Click** : Navigation vers `/automaths/panier`

### Accessibilité

- `aria-label="Voir le panier"`
- `title` avec détail du nombre de questions

## Page Panier

### Sections

1. **Header**
   - Bouton retour vers `/automaths`
   - Titre avec icône
   - Compteurs (catégories + instances totales)
   - Bouton "Vider le panier" (avec confirmation)

2. **Empty State**
   - Icône de panier vide
   - Message encourageant à parcourir les questions
   - Bouton d'action vers `/automaths`

3. **Galerie de cartes (CartQuestionCard)**
   - Grid responsive (1-3 colonnes)
   - Chaque carte affiche :
     - Aperçu de la question générée
     - Badge compact en bas à droite : `[délai .....[-+]][quantité]`
   - **Interaction hover** :
     - Badge de délai apparaît à gauche (ex: "20s ..... [-][+]")
     - Contrôles [-][+] apparaissent dans le badge de quantité
   - **Toujours visible** :
     - Nombre de questions (badge bleu)

4. **Actions disponibles**
   - 📄 **Export PDF** (à implémenter)
   - 🎯 **Pratique en ligne** (à implémenter)
   - 🔗 **Partager** (à implémenter)

### Gestion de la quantité et du délai

**Quantité** :

- Contrôles [-][+] dans le badge de quantité (visible au hover)
- Range : 1-99
- Si quantité = 0 : suppression automatique de la carte

**Délai** :

- Contrôles [-][+] dans le badge de délai (visible au hover)
- Range : 5-300 secondes
- Incréments : +/- 5 secondes par clic
- Affichage : "20s" avec les contrôles

### Suppression

- Par item : Décrémenter jusqu'à 0
- Globale : Bouton "Vider le panier" avec confirmation native

## Génération des previews

### Server-side (`+page.server.ts`)

```typescript
const PREVIEW_SEED = 12345; // Seed fixe pour cohérence

for (const template of templates) {
	const result = generateInstance(template, PREVIEW_SEED);
	if (result.success && result.instance) {
		questionsWithPreviews.push({
			template,
			preview: result.instance
		});
	}
}
```

### Avantages

- Previews identiques à chaque chargement
- Génération côté serveur (performance)
- Pas de flicker côté client

## Styles et thème

### Classes sémantiques utilisées

| Élément           | Classes                                      | Objectif                        |
| ----------------- | -------------------------------------------- | ------------------------------- |
| Accordion.Item    | `bg-card border-border`                      | Fond adaptatif au thème         |
| Accordion.Trigger | `text-foreground hover:bg-muted/50`          | Texte et hover thématiques      |
| Tabs.List         | `!bg-transparent border-border`              | Transparent, bordure thématique |
| Select natif      | `bg-background border-input focus:ring-ring` | Cohérence avec le thème         |

### Support Dark Mode

Toutes les classes utilisent les variables CSS du thème :

- `bg-background` : `#fafafa` (clair) / `#262624` (sombre)
- `bg-card` : `#ffffff` (clair) / `#2e2e2c` (sombre)
- `border-border` : Bordures adaptatives
- `text-foreground` : Texte principal

## Problèmes résolus

### 1. Erreur d'hydration SSR

**Problème** : `Cannot read properties of undefined (reading '0')` lors de l'initialisation avec `data.themes?.[0]`

**Solution** : Initialisation différée avec `$effect()`

```typescript
let selectedTheme = $state<string | undefined>(undefined);

$effect(() => {
	if (!selectedTheme && data.themes && data.themes.length > 0) {
		selectedTheme = data.themes[0];
	}
});
```

### 2. Select shadcn-svelte non fonctionnel

**Problème** : Le composant Select complexe ne se comportait pas correctement

**Solution** : Remplacement par un `<select>` HTML natif avec styling cohérent

### 3. Fond gris/blanc autour de l'accordéon

**Problème** : `Tabs.List` avait un `bg-muted` par défaut créant un container visible

**Solutions appliquées** :

- `Tabs.List` : `!bg-transparent` pour retirer le fond
- `Accordion.Content` : Retrait de `bg-card` (hérité du parent)
- `Accordion.Item` : Suppression `border-b` avec `!border-b-0`

## Cache des Templates de Questions

### Architecture

Le système utilise un **cache client-side** pour optimiser les performances et permettre un **fonctionnement offline** partiel.

**Store** : `questionTemplates.svelte.ts`
**API** : `/api/questions/templates/all`

### Stratégie de chargement (par priorité)

1. **Server-Side Rendering (SSR)** - Premier chargement
   - `+page.server.ts` charge les templates depuis Supabase
   - Hydratation du cache avec `initializeFromServer()`
2. **Cache client** - Navigations suivantes
   - Le cache persiste en mémoire pendant toute la session
   - Aucun TTL - valide jusqu'à invalidation explicite
3. **API fetch** - Fallback uniquement
   - Uniquement si cache vide ET server load a échoué
   - Un seul essai - évite les fetch en boucle si offline

### Comportement Offline

**Scénario** : WiFi coupé après avoir chargé la page

✅ **Fonctionne** :

- Test continu avec le cache en mémoire
- Navigation entre questions
- Génération d'instances depuis les templates cachés
- Timer et affichage des questions (tout le code client)

❌ **Ne fonctionne pas** :

- Refresh de la page (pas de service worker)
- Sauvegarde des résultats en base de données
- Rechargement des templates (le server load échoue)

⚠️ **IMPORTANT - Première visite** :

**Il faut charger la page test AVEC une connexion Internet la première fois** :

1. ✅ Connecté → Ouvrir `/automaths/panier` → Démarrer le test
2. ✅ Les templates sont chargés et mis en cache
3. ✅ Maintenant vous pouvez couper le WiFi
4. ✅ Le test continue avec le cache

Si vous coupez le WiFi AVANT de charger `/automaths/test`, vous verrez :

```
Error: Aucun template disponible.
Veuillez vous reconnecter à Internet et recharger la page.
```

C'est normal - le cache ne peut pas se remplir si la connexion est coupée dès le départ.

⚠️ **Erreurs attendues dans la console** :

Quand vous êtes offline, vous verrez des erreurs réseau dans la console :

```
POST https://aqtijumsgfufoztohdua.supabase.co/auth/v1/token?grant_type=refresh_token
net::ERR_INTERNET_DISCONNECTED
```

**C'est normal et ne casse rien** :

- Ces erreurs viennent du client Supabase qui essaie de rafraîchir le token d'authentification
- C'est un comportement **essentiel** quand on est online (maintient la session active)
- Ces erreurs sont loggées par le navigateur lui-même (pas notre code)
- Le test continue de fonctionner normalement avec le cache
- Lorsque la connexion revient, le refresh fonctionnera à nouveau automatiquement

**Pourquoi on ne peut pas les supprimer** :

- Désactiver l'auto-refresh casserait l'UX quand online (sessions expirées)
- Implémenter un service worker offline complet est hors scope pour le MVP
- Les erreurs réseau du navigateur sont normales et informatives pour le développeur

**Protection contre les erreurs en boucle** :

```typescript
// Store: skip fetch si erreur déjà présente
if (!force && this.cache.error) {
	console.log('[Templates Cache] Skipping fetch due to previous error (likely offline)');
	return;
}
```

**Logs améliorés** :

```typescript
// API: logs concis pour erreurs réseau
if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
	console.error('[Templates API] Network error - likely offline');
}
```

### Invalidation du cache

**Quand invalider** :

- Après création/modification/suppression d'un template (admin)
- Après changement de statut (draft → published)

**Comment** :

```typescript
import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';

// Marquer comme invalide (refetch au prochain accès)
questionTemplatesCache.invalidate();

// Ou vider complètement
questionTemplatesCache.clear();
```

### Méthodes utiles

```typescript
// Récupérer tous les templates
const templates = questionTemplatesCache.templates;

// Filtrer par catégorie complète
const filtered = questionTemplatesCache.getTemplatesByCategory({
	theme: 'Algèbre',
	domain: 'Équations',
	subdomain: null,
	level: 1
});

// Trouver par ID
const template = questionTemplatesCache.getTemplateById('abc-123');

// Obtenir la hiérarchie
const themes = questionTemplatesCache.getThemes();
const domains = questionTemplatesCache.getDomains('Algèbre');
const subdomains = questionTemplatesCache.getSubdomains('Algèbre', 'Équations');
```

## Système de Test (Modes d'utilisation)

### Architecture

Le système propose 3 modes de test :

1. **Display** (Mode Révision) - Diaporama pour mémorisation sans scoring
2. **Interactive** (Mode Quiz) - Validation des réponses avec scoring
3. **Course** (Course aux nombres) - Toutes les questions affichées simultanément avec limite de temps

### Mode Display - Fonctionnalités

#### Interface

- **Timer circulaire** : Compte à rebours visuel avec animations
- **Questions une par une** : Navigation automatique après expiration du timer
- **Contrôles pause/play** : Bouton FAB (Floating Action Button) en bas à droite
- **Barre de progression** : "Question X sur Y" dans l'en-tête

#### Ajustement dynamique des délais ⏱️

Le mode Display permet d'**ajuster en temps réel** le délai d'affichage par type de question :

**Interface** :

- Deux boutons FAB circulaires à gauche du timer
- **[−]** : Réduit le délai de 5 secondes
- **[+]** : Augmente le délai de 5 secondes

**Comportement** :

1. **Ajustement immédiat** : Le delta s'ajoute/soustrait au timer actuel
   - Ex: Timer affiche 15s, vous cliquez [+] → Timer passe à 20s instantanément
2. **Persistance par type** : L'ajustement s'applique à toutes les questions du même type
   - Type identifié par : `theme|domain|subdomain|level`
   - Ex: Ajuster "Calcul Mental / Addition / CE2" n'affecte pas "Calcul Mental / Multiplication / CE2"
3. **Limite minimum** : 5 secondes (bouton [−] désactivé si atteint)
4. **Limite maximum** : Aucune (mais part de la base configurée dans le panier)

**Architecture technique** :

```typescript
// TestDisplay.svelte
delayAdjustments: Record<string, number>; // Ajustements par catégorie
currentCategoryAdjustment: number; // Ajustement de la catégorie active

// TestTimer.svelte
durationAdjustment: number; // Delta à ajouter/soustraire du temps restant
```

**Exemple d'usage** :

```
Question 1 (Addition CE2) : 20s de base
  → Clic [+] à 15s restantes
  → Timer passe à 20s
  → Ajustement mémorisé : +5s

Question 2 (Addition CE2) : Démarre à 25s (20 + 5)
Question 3 (Multiplication CE2) : Démarre à 20s (non affectée)
Question 4 (Addition CE2) : Démarre à 25s (ajustement appliqué)
```

#### Navigation post-test

À la fin du test, l'utilisateur choisit :

- **Revoir tout** : Affichage de toutes les questions (énoncés uniquement) sur une page
- **Voir corrections** : Affichage des énoncés + réponses + explications

### Génération des instances

**Lors du lancement du test** (`/automaths/test`) :

1. Récupération des `CartItem[]` via URL params
2. Pour chaque catégorie :
   - Filtrage des templates correspondants
   - Génération de N instances (N = quantity)
   - Sélection aléatoire du template si plusieurs matchs
3. Création de la session `TestSession`

**Structure** :

```typescript
interface TestSession {
	mode: TestMode;
	categories: CartItem[];
	instances: QuestionInstance[];
	userAnswers: Map<number, AnswerData>;
	startTime: number;
	timeLimit?: number;
	currentQuestionIndex: number;
	isPaused: boolean;
}
```

### Sauvegarde des résultats

**Modes Interactive et Course** : Sauvegarde en base de données

- Table `test_sessions` : Métadonnées de session (score, durée, etc.)
- Table `test_answers` : Détail des réponses individuelles

**Mode Display** : Pas de sauvegarde (mode révision sans scoring)

## Fonctionnalités futures (MVP+)

### 1. Export PDF

- Génération document avec toutes les questions du panier
- Option : Avec/sans corrigés
- Format : A4, police adaptée à l'impression

### 2. Mode Pratique en ligne

- Session interactive avec les questions du panier
- Correction automatique
- Score et feedback

### 3. Système de partage

- Génération de lien/token
- Partage avec élèves ou collègues
- Possibilité d'importer un panier partagé

### 4. Sauvegarde en base de données

- Pour utilisateurs authentifiés
- Synchronisation multi-appareils
- Historique des paniers

### 5. Filtres avancés

- Par niveau de difficulté
- Par durée
- Par type de question
- Recherche textuelle

## Points techniques importants

### Svelte 5 Runes

Le code utilise exclusivement les runes Svelte 5 :

- `$state()` pour l'état réactif
- `$derived()` pour les valeurs calculées
- `$effect()` pour les effets de bord
- `$props()` pour les props de composants

### Gestion des null/undefined

Toutes les accès aux données utilisent l'optional chaining (`?.`) et les valeurs par défaut :

```typescript
data.themes?.length > 0
selectedTheme && data.hierarchy ? ... : []
subdomain || null
```

### Performance

- **SSR** : Génération des previews côté serveur
- **Lazy loading** : Accordéons chargent le contenu à la demande
- **Memoization** : Utilisation de `$derived()` pour éviter recalculs

## Testing

### Tests manuels recommandés

1. ✅ Navigation hiérarchique complète
2. ✅ Ajout/retrait de questions du panier
3. ✅ Modification des quantités
4. ✅ Persistance après refresh
5. ✅ FAB avec badge compteur
6. ✅ Responsive (mobile/tablet/desktop)
7. ✅ Dark mode
8. ✅ Empty states (pas de questions, panier vide)

### Tests unitaires à ajouter

- [ ] Store : `questionCart.svelte.ts`
- [ ] Composants : QuestionPreviewCard, CartFloatingButton
- [ ] Server load : génération de la hiérarchie

## Documentation liée

- [CLAUDE_FEATURES_QUESTION_BANK.md](./CLAUDE_FEATURES_QUESTION_BANK.md) - Système de questions
- [CLAUDE_FEATURES.md](./CLAUDE_FEATURES.md) - Autres fonctionnalités
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Schéma de la base de données
