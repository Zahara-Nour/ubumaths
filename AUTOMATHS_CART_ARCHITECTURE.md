# Architecture du Panier Automaths

## Vue d'ensemble

Le panier Automaths utilise une architecture basée sur les **catégories** qui :

- Stocke uniquement la **catégorie** (thème, domaine, sous-domaine, niveau) + quantité
- Sélectionne un **template aléatoire** parmi tous ceux qui matchent la catégorie
- **Génère une instance fraîche** à chaque affichage
- Permet d'avoir des exercices toujours différents

## Flux de données

### 1. Ajout au panier (depuis `/automaths`)

```
QuestionPreviewCard
  ↓
questionCart.addToCart({
  theme: string,
  domain: string,
  subdomain: string | null,
  level: number
}, quantity)
  ↓
localStorage (catégorie + quantité uniquement)
```

**Avantages** :

- ✅ Taille minimale dans localStorage (juste la catégorie)
- ✅ Pas d'ID de template figé (flexibilité totale)
- ✅ Permet d'avoir plusieurs questions de la même catégorie
- ✅ Évolutif : si de nouvelles questions sont ajoutées, elles apparaîtront

### 2. Affichage du panier (dans `/automaths/panier`)

```
+page.server.ts
  ↓ load()
  ↓ Fetch ALL published templates
  ↓
+page.svelte
  ↓ cartItems (from store) - contains categories
  ↓ templates (from data)
  ↓ Filter templates by category (theme/domain/subdomain/level)
  ↓ Randomly select ONE template from matches
  ↓ generateInstance(randomTemplate)
  ↓
CartQuestionCard
  ↓ Displays generated instance
```

**Avantages** :

- ✅ Questions aléatoires à chaque affichage
- ✅ Template différent sélectionné à chaque fois
- ✅ Instance différente générée à chaque fois
- ✅ Vraiment aléatoire (template ET variables)

## Structure des données

### QuestionCategory (identifie une catégorie)

```typescript
interface QuestionCategory {
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
}
```

### CartItem (stocké dans localStorage)

```typescript
interface CartItem {
	category: QuestionCategory; // Catégorie de questions
	quantity: number; // Quantité désirée (1-99)
	delay: number; // Délai d'affichage en secondes (5-300, défaut: 20)
}
```

**Exemple** :

```json
{
	"category": {
		"theme": "Géométrie",
		"domain": "Triangles",
		"subdomain": "Pythagore",
		"level": 3
	},
	"quantity": 5,
	"delay": 20
}
```

→ Générera 5 questions aléatoires parmi toutes celles de cette catégorie avec un délai de 20 secondes

### Instance générée (à la demande)

```typescript
interface QuestionInstance {
	statement: ContentField[];
	answer: string[];
	solution_steps: ContentField[];
	variables: Record<string, number>;
	type: QuestionType;
	choices?: MultipleChoiceOption[] | null;
	correct_answer_index?: number | null;
	blanks?: Blank[] | null;
}
```

## Composants

### `questionCart.svelte.ts` (Store)

- Gère la liste des `CartItem` (catégories + quantités + délais)
- Persistance dans localStorage
- Utilise `getCategoryKey()` pour identifier les catégories de manière unique
- Méthodes :
  - `addToCart(category, quantity, delay)` : Ajoute une catégorie avec délai par défaut (20s)
  - `hasCategory(category)` : Vérifie si une catégorie est dans le panier
  - `incrementQuantity(category)` : Augmente la quantité (max 99)
  - `decrementQuantity(category)` : Diminue la quantité (supprime si = 0)
  - `updateDelay(category, delay)` : Modifie le délai (5-300s)
  - `removeFromCart(category)` : Supprime une catégorie
  - `clearCart()` : Vide tout le panier

### `CartQuestionCard.svelte`

- Affiche une carte de question dans le panier avec contrôles compacts
- Props :
  - `item: CartItem` - Métadonnées (catégorie, quantité, délai)
  - `instance?: QuestionInstance` - Instance générée (optionnelle)
  - `onIncrementQuantity(category)` - Callback pour augmenter la quantité
  - `onDecrementQuantity(category)` - Callback pour diminuer la quantité
  - `onUpdateDelay(category, delay)` - Callback pour modifier le délai
- **Design compact** : Format `[délai .....[-+]][quantité]` en bas à droite
  - Badge de quantité (fond bleu) : **Toujours visible**
  - Badge de délai avec boutons [-][+] : **Visible au hover uniquement**
  - Contrôles de quantité [-][+] : **Intégrés dans le badge, visibles au hover**
- Affiche "Chargement..." si l'instance n'est pas encore disponible

### `/automaths/panier/+page.server.ts`

- Charge TOUS les templates publiés depuis Supabase
- Retourne `{ templates: QuestionTemplate[] }`

### `/automaths/panier/+page.svelte`

- Récupère `cartItems` du store (catégories + quantités)
- Récupère `templates` du serveur
- Utilise `$derived` pour :
  1. Pour chaque catégorie, filtrer les templates qui matchent
  2. Sélectionner **aléatoirement** un template parmi les matches
  3. Générer une instance avec `generateInstance(randomTemplate)`
  4. Créer `cartItemsWithInstances[]`
- Affiche les cartes avec contrôles de quantité (+/-)
- **Chaque rechargement de page génère de nouvelles questions aléatoires**

## Gestion des quantités et délais

### Incrémenter quantité (+)

```typescript
questionCart.incrementQuantity(category);
// Limite : 99
```

### Décrémenter quantité (-)

```typescript
questionCart.decrementQuantity(category);
// Si quantité = 1, supprime automatiquement la carte
```

### Modifier le délai

```typescript
questionCart.updateDelay(category, 30);
// Limites : 5-300 secondes
// Incréments : +/- 5 secondes via les boutons
```

### Suppression automatique

Quand la quantité atteint 0, la **catégorie entière** est **automatiquement retirée** du panier via `removeFromCart()`.

## Unicité dans le panier

Une catégorie ne peut apparaître **qu'une seule fois** dans le panier. Si l'utilisateur ajoute la même catégorie plusieurs fois, la quantité est simplement augmentée.

**Clé unique** : `theme|domain|subdomain|level`

Exemple :

- `Géométrie|Triangles|Pythagore|3` → Clé unique
- Ajouter 2x cette catégorie → Quantité = 2 (une seule entrée)

## Flux complet : De la sélection à l'affichage

1. **Utilisateur clique sur "Ajouter au panier"** depuis `/automaths`
   - `QuestionPreviewCard` extrait la catégorie du template
   - Appelle `questionCart.addToCart(category, 1)`
   - Stocke `{ category: {...}, quantity: 1 }` dans localStorage

2. **Utilisateur ouvre le panier** via le FAB
   - Navigue vers `/automaths/panier`
   - Le serveur charge tous les templates publiés
   - La page récupère les `cartItems` du store

3. **Pour chaque catégorie dans le panier** :
   - Filtre les templates : `theme === cat.theme && domain === cat.domain && ...`
   - Sélectionne un template au hasard : `randomIndex = Math.floor(Math.random() * matches.length)`
   - Génère une instance : `generateInstance(randomTemplate)`
   - Affiche dans `CartQuestionCard`

4. **Utilisateur modifie la quantité** :
   - Clique sur +/- → `incrementQuantity(category)` ou `decrementQuantity(category)`
   - Le store met à jour le localStorage
   - Svelte 5 réactive le `$derived` → Re-génère les instances
   - L'interface se met à jour automatiquement

## Pourquoi ce système ?

### Avantages

✅ **Exercices toujours différents** : Template ET variables changent à chaque chargement
✅ **Évolutif** : Nouvelles questions automatiquement incluses
✅ **Léger** : Pas de données lourdes dans localStorage
✅ **Flexible** : Pas de dépendance à un template spécifique
✅ **Pédagogique** : Encourage la pratique variée

### Cas d'usage

- Enseignant veut créer des exercices sur "Géométrie / Triangles / Niveau 3"
- Ajoute la catégorie au panier avec quantité = 10
- Chaque génération PDF donnera 10 questions **différentes**
- Peut regénérer autant de fois que souhaité → exercices uniques à chaque fois

## Optimisations futures possibles

1. **Cache intelligent des templates** : Éviter de recharger tous les templates à chaque visite
2. **Seed aléatoire** : Permettre de "figer" une génération avec un seed
3. **Preview en temps réel** : Bouton "Régénérer" pour voir d'autres questions
4. **Statistiques** : Montrer combien de templates différents matchent la catégorie
5. **Filtrage avancé** : Ajouter difficulté, tags, auteur, etc.

## Notes de développement

- Le générateur d'instances (`generateInstance()`) est côté client pour utiliser les runes Svelte 5
- Les templates sont chargés côté serveur pour bénéficier du SSR
- Le store utilise `$state()` (Svelte 5 runes) pour la réactivité
- Les instances sont recalculées automatiquement via `$derived()` quand le panier change
