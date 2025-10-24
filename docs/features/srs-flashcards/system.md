# SRS System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [FSRS Algorithm](#fsrs-algorithm)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Components](#components)
7. [User Workflows](#user-workflows)
8. [Configuration](#configuration)
9. [Future Improvements](#future-improvements)

---

## Overview

Le système SRS (Spaced Repetition System) d'UbuMaths est une implémentation complète de l'algorithme FSRS-6 (Free Spaced Repetition Scheduler) pour optimiser la mémorisation à long terme.

### Caractéristiques principales

- **Algorithme FSRS-6** : Algorithme moderne basé sur la recherche scientifique
- **Decks hybrides** : Combinaison de cartes officielles (banque de questions) et personnalisées
- **Génération dynamique** : Les cartes basées sur des templates génèrent de nouvelles instances à chaque révision
- **Attribution prof → élève** : Les professeurs peuvent créer et attribuer des decks aux élèves
- **Stats globales** : Les statistiques FSRS sont partagées entre decks pour une même carte
- **Interface intuitive** : Système de notation à 4 boutons (Again, Hard, Good, Easy)

---

## Architecture

### Structure des dossiers

```
src/
├── lib/
│   ├── srs/
│   │   ├── types.ts           # Types TypeScript
│   │   ├── fsrs.ts            # Classe FSRS
│   │   ├── config.ts          # Configuration et constantes
│   │   └── generator.ts       # Générateur d'instances
│   └── components/
│       └── srs/
│           ├── DeckCard.svelte           # Carte de deck
│           ├── FSRSButtons.svelte        # Boutons de notation
│           ├── ReviewSession.svelte      # Session de révision
│           └── CustomCardEditor.svelte   # Éditeur de cartes
├── routes/
│   ├── api/srs/
│   │   ├── decks/              # API decks
│   │   ├── cards/              # API cartes
│   │   └── review/             # API révision
│   └── (protected)/dashboard/
│       ├── revisions/          # Pages élèves
│       └── teacher/srs/        # Pages professeurs
└── supabase/migrations/
    └── 080_create_srs_tables.sql
```

### Flux de données

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────┐
│   SvelteKit API Routes      │
│  (/api/srs/*)               │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────┐
│   Supabase Database         │
│  + RLS Policies             │
└─────────────────────────────┘
```

---

## FSRS Algorithm

### Modèle DSR

FSRS utilise un modèle à trois variables :

1. **Difficulty (D)** : Difficulté intrinsèque de la carte (0-10)
2. **Stability (S)** : Temps estimé pour oublier (jours)
3. **Retrievability (R)** : Probabilité de se souvenir actuellement (0-1)

### Formules clés

#### Retrievability

```
R = (1 + elapsed_days / (9 × S))^(-0.5)
```

#### Interval

```
I = 9 × S × (DR^(-2) - 1)
```

où `DR` est le taux de rétention souhaité (par défaut 0.9 ou 90%).

### États des cartes

| État         | Description                            |
| ------------ | -------------------------------------- |
| `new`        | Carte jamais révisée                   |
| `learning`   | Carte en cours d'apprentissage (< 24h) |
| `review`     | Carte en révision normale              |
| `relearning` | Carte oubliée, en réapprentissage      |

### Grades de notation

| Grade | Label | Description       | Impact                                          |
| ----- | ----- | ----------------- | ----------------------------------------------- |
| 1     | Again | Mauvaise réponse  | Retour en learning/relearning, intervalle court |
| 2     | Hard  | Réponse difficile | Intervalle réduit (~50%)                        |
| 3     | Good  | Bonne réponse     | Intervalle standard                             |
| 4     | Easy  | Réponse facile    | Intervalle augmenté (~130%)                     |

### Paramètres FSRS

FSRS-6 utilise 21 paramètres optimisés scientifiquement (voir `src/lib/srs/config.ts`).

#### Profils de rétention

| Profil   | Rétention | Usage                                  |
| -------- | --------- | -------------------------------------- |
| Relaxed  | 80%       | Apprentissage décontracté              |
| Balanced | 90%       | Équilibre rétention/révisions (défaut) |
| High     | 95%       | Haute rétention, plus de révisions     |
| Expert   | 97%       | Maîtrise maximale                      |

---

## Database Schema

### Tables

#### `srs_decks`

Collection de cartes SRS.

| Colonne       | Type      | Description                         |
| ------------- | --------- | ----------------------------------- |
| `id`          | UUID      | Identifiant unique                  |
| `name`        | TEXT      | Nom du deck                         |
| `description` | TEXT      | Description (optionnel)             |
| `owner_id`    | UUID      | Propriétaire (FK profiles)          |
| `deck_type`   | TEXT      | 'official' ou 'personal'            |
| `is_assigned` | BOOLEAN   | Si attribué par un prof (read-only) |
| `config`      | JSONB     | Configuration FSRS                  |
| `created_at`  | TIMESTAMP | Date de création                    |
| `updated_at`  | TIMESTAMP | Dernière modification               |

#### `srs_cards`

Cartes individuelles dans un deck.

| Colonne         | Type      | Description                    |
| --------------- | --------- | ------------------------------ |
| `id`            | UUID      | Identifiant unique             |
| `deck_id`       | UUID      | Deck parent (FK srs_decks)     |
| `card_type`     | TEXT      | 'template' ou 'custom'         |
| `template_id`   | UUID      | ID template (si type=template) |
| `front_content` | JSONB     | Contenu recto (si type=custom) |
| `back_content`  | JSONB     | Contenu verso (si type=custom) |
| `created_at`    | TIMESTAMP | Date de création               |

#### `srs_card_stats`

Statistiques FSRS par utilisateur et référence de carte.

| Colonne               | Type      | Description                                      |
| --------------------- | --------- | ------------------------------------------------ |
| `user_id`             | UUID      | Utilisateur (FK profiles)                        |
| `card_reference_type` | TEXT      | 'template' ou 'custom'                           |
| `card_reference_id`   | TEXT      | ID référence (template*id ou custom*{card_id})   |
| `difficulty`          | NUMERIC   | Difficulté FSRS                                  |
| `stability`           | NUMERIC   | Stabilité FSRS (jours)                           |
| `state`               | TEXT      | État ('new', 'learning', 'review', 'relearning') |
| `last_review`         | TIMESTAMP | Dernière révision                                |
| `next_review`         | TIMESTAMP | Prochaine révision due                           |
| `total_reviews`       | INTEGER   | Nombre total de révisions                        |
| `review_history`      | JSONB     | Historique des révisions                         |
| `updated_at`          | TIMESTAMP | Dernière mise à jour                             |

**Clé primaire composite** : `(user_id, card_reference_type, card_reference_id)`

#### `srs_review_sessions`

Sessions de révision.

| Colonne          | Type      | Description                               |
| ---------------- | --------- | ----------------------------------------- |
| `id`             | UUID      | Identifiant unique                        |
| `user_id`        | UUID      | Utilisateur (FK profiles)                 |
| `deck_id`        | UUID      | Deck (FK srs_decks)                       |
| `cards_reviewed` | INTEGER   | Nombre de cartes révisées                 |
| `correct_count`  | INTEGER   | Nombre de réponses correctes (grade >= 3) |
| `total_time`     | INTEGER   | Temps total (secondes)                    |
| `created_at`     | TIMESTAMP | Date de la session                        |

#### `srs_deck_assignments`

Historique des attributions de decks.

| Colonne           | Type      | Description                |
| ----------------- | --------- | -------------------------- |
| `id`              | UUID      | Identifiant unique         |
| `source_deck_id`  | UUID      | Deck source (FK srs_decks) |
| `assigned_by`     | UUID      | Professeur (FK profiles)   |
| `assigned_to`     | UUID      | Élève (FK profiles)        |
| `assignment_type` | TEXT      | 'student' ou 'class'       |
| `created_at`      | TIMESTAMP | Date d'attribution         |

### Fonctions SQL helpers

#### `get_due_cards_for_deck(user_id, deck_id)`

Retourne toutes les cartes dues pour révision dans un deck.

**Retour** :

- `card_id` : ID de la carte
- `card_type` : Type ('template' ou 'custom')
- `template_id` : ID template (si applicable)
- `front_content`, `back_content` : Contenu (si custom)
- `state`, `difficulty`, `stability` : Stats FSRS
- `total_reviews`, `last_review`, `next_review`

#### `get_deck_stats(user_id, deck_id)`

Retourne les statistiques d'un deck pour un utilisateur.

**Retour** :

- `total_cards` : Nombre total de cartes
- `due_count` : Cartes à réviser maintenant
- `new_count` : Nouvelles cartes
- `learning_count` : Cartes en apprentissage
- `review_count` : Cartes en révision

### Row Level Security (RLS)

Toutes les tables ont des politiques RLS activées :

- **Decks** : Les utilisateurs ne peuvent voir/modifier que leurs propres decks
- **Cards** : Accès via le deck parent
- **Stats** : Les utilisateurs ne peuvent voir/modifier que leurs propres stats
- **Sessions** : Les utilisateurs ne peuvent voir que leurs propres sessions
- **Assignments** : Visibles par l'assigneur et l'assigné

**Protection spéciale** : Les decks avec `is_assigned = true` sont en lecture seule (pas de UPDATE/DELETE sur decks, cards).

---

## API Reference

### Decks API

#### `GET /api/srs/decks`

Liste tous les decks de l'utilisateur avec statistiques.

**Réponse** :

```json
{
	"decks": [
		{
			"id": "uuid",
			"name": "Équations du second degré",
			"description": "...",
			"deckType": "official",
			"isAssigned": false,
			"config": { "desiredRetention": 0.9 },
			"stats": {
				"total_cards": 25,
				"due_count": 5,
				"new_count": 10,
				"learning_count": 3,
				"review_count": 7
			}
		}
	]
}
```

#### `POST /api/srs/decks`

Créer un nouveau deck.

**Body** :

```json
{
  "name": "Mon Deck",
  "description": "Description (optionnel)",
  "deckType": "official" | "personal",
  "config": {
    "desiredRetention": 0.9,
    "maximumInterval": 36500
  }
}
```

**Réponse** : `{ "deck": { ... } }`

#### `GET /api/srs/decks/[id]`

Détails d'un deck avec stats.

#### `PUT /api/srs/decks/[id]`

Modifier un deck (seulement si `is_assigned = false`).

**Body** :

```json
{
	"name": "Nouveau nom",
	"description": "...",
	"config": { "desiredRetention": 0.95 }
}
```

#### `DELETE /api/srs/decks/[id]`

Supprimer un deck (seulement si `is_assigned = false`). Supprime en cascade toutes les cartes.

#### `POST /api/srs/decks/[id]/assign`

Attribuer un deck à des élèves ou classes.

**Body** :

```json
{
  "targetType": "student" | "class",
  "targetIds": ["uuid1", "uuid2"]
}
```

**Comportement** : Crée une copie du deck pour chaque élève (marquée `is_assigned = true`), copie toutes les cartes, crée un enregistrement d'attribution.

### Cards API

#### `GET /api/srs/cards?deck_id=X`

Liste toutes les cartes d'un deck.

#### `POST /api/srs/cards`

Ajouter une carte à un deck.

**Body (template card)** :

```json
{
	"deckId": "uuid",
	"cardType": "template",
	"templateId": "uuid"
}
```

**Body (custom card)** :

```json
{
	"deckId": "uuid",
	"cardType": "custom",
	"frontContent": [{ "type": "text", "content": "..." }],
	"backContent": [{ "type": "text", "content": "..." }]
}
```

#### `GET /api/srs/cards/[id]`

Détails d'une carte.

#### `PUT /api/srs/cards/[id]`

Modifier une carte (seulement custom cards dans decks non-assignés).

#### `DELETE /api/srs/cards/[id]`

Supprimer une carte (seulement dans decks non-assignés).

### Review API

#### `GET /api/srs/review/due?deck_id=X`

Cartes dues pour révision.

**Réponse** :

```json
{
	"cards": [
		{
			"cardId": "uuid",
			"cardType": "template",
			"instance": {
				/* QuestionInstance */
			},
			"stats": {
				"state": "review",
				"difficulty": 5.2,
				"stability": 15.3,
				"totalReviews": 8,
				"nextReview": "2024-..."
			}
		}
	]
}
```

**Note** : Pour les template cards, une nouvelle instance est générée avec un seed aléatoire.

#### `POST /api/srs/review/submit`

Soumettre un résultat de révision.

**Body** :

```json
{
  "cardId": "uuid",
  "deckId": "uuid",
  "grade": 1 | 2 | 3 | 4,
  "timeSpent": 45  // secondes (optionnel)
}
```

**Réponse** :

```json
{
	"success": true,
	"stats": {
		"difficulty": 5.4,
		"stability": 22.1,
		"state": "review",
		"nextReview": "2024-12-01T10:00:00Z",
		"totalReviews": 9
	}
}
```

**Comportement** :

1. Récupère ou initialise les stats de la carte
2. Utilise FSRS pour calculer les nouvelles stats
3. Upsert dans `srs_card_stats`
4. Met à jour ou crée une session de révision

---

## Components

### `DeckCard.svelte`

Affiche un deck avec ses statistiques.

**Props** :

- `deck` : Objet deck avec stats
- `onclick` : Callback au clic
- `showActions` : Afficher le bouton d'action (défaut: true)

**Usage** :

```svelte
<DeckCard {deck} onclick={() => startStudy(deck.id)} />
```

### `FSRSButtons.svelte`

Les 4 boutons de notation FSRS.

**Props** :

- `onGrade` : `(grade: 1 | 2 | 3 | 4) => void`
- `disabled` : Désactiver les boutons
- `showIntervals` : Afficher les intervalles estimés
- `intervals` : `[number, number, number, number]` (jours pour chaque grade)

**Usage** :

```svelte
<FSRSButtons onGrade={handleGrade} showIntervals={true} intervals={[0.5, 2, 7, 30]} />
```

**Raccourcis clavier** : Les touches 1-4 permettent de noter rapidement.

### `ReviewSession.svelte`

Gère une session de révision complète.

**Props** :

- `deckId` : ID du deck à réviser
- `onComplete` : `(summary: SessionSummary) => void`
- `onBack` : Callback pour retour

**Comportement** :

1. Récupère les cartes dues via API
2. Affiche les cartes une par une avec FlashCard
3. Montre FSRSButtons après flip
4. Soumet les révisions
5. Affiche un résumé à la fin

**Usage** :

```svelte
<ReviewSession {deckId} onComplete={handleComplete} onBack={() => goto('/dashboard/revisions')} />
```

### `CustomCardEditor.svelte`

Éditeur de cartes personnalisées.

**Props** :

- `initialFrontContent` : ContentField[] (pour édition)
- `initialBackContent` : ContentField[]
- `onSave` : `(front, back) => Promise<void>`
- `onCancel` : Callback annulation

**Fonctionnalités** :

- Deux éditeurs rich-text (recto/verso)
- Aperçu en temps réel
- Support LaTeX, images, formatage

**Usage** :

```svelte
<CustomCardEditor onSave={handleSave} onCancel={() => (editing = false)} />
```

---

## User Workflows

### Workflow Élève

#### 1. Accéder aux révisions

1. Navigation : `/dashboard/revisions`
2. Voir liste des decks (assignés + personnels)
3. Statistiques : cartes totales, à réviser, etc.

#### 2. Réviser un deck

1. Clic sur un deck
2. Navigation : `/dashboard/revisions/decks/[id]/study`
3. ReviewSession charge les cartes dues
4. Pour chaque carte :
   - Voir le recto (question)
   - Flip pour voir le verso (correction)
   - Noter avec FSRSButtons (1-4)
5. Résumé de session à la fin

#### 3. Créer un deck personnel

1. Clic "Nouveau deck"
2. Remplir nom, description
3. Ajouter cartes (template ou custom)
4. Sauvegarder

### Workflow Professeur

#### 1. Créer un deck

1. Navigation : `/dashboard/teacher/srs/decks/create`
2. Remplir informations :
   - Nom, description
   - Type (official/personal)
   - Profil de rétention
3. Ajouter cartes :
   - Depuis banque de questions (template)
   - Cartes personnalisées (custom)
4. Sauvegarder

#### 2. Attribuer un deck

1. Après création, redirection vers `/dashboard/teacher/srs/decks/[id]/assign`
2. Sélectionner élèves et/ou classes
3. Clic "Attribuer"
4. Le système :
   - Crée une copie du deck pour chaque élève
   - Marque les copies comme `is_assigned = true` (read-only)
   - Copie toutes les cartes
   - Enregistre l'attribution

#### 3. Gérer les decks

1. Liste des decks créés
2. Modifier (si non-assignés)
3. Supprimer (si non-assignés)
4. Voir statistiques de progression des élèves (future)

---

## Configuration

### FSRS Config

Configuration par deck (stockée dans `deck.config` JSONB) :

```typescript
{
  desiredRetention: 0.9,        // 0.7 - 0.97
  maximumInterval: 36500,       // jours (défaut: 100 ans)
  parameters: [...21 params]    // Optionnel
}
```

### Profils de rétention

Définis dans `src/lib/srs/config.ts` :

```typescript
export const RETENTION_PROFILES = {
	relaxed: 0.8, // 80% rétention
	balanced: 0.9, // 90% (défaut)
	high: 0.95, // 95%
	expert: 0.97 // 97%
};
```

**Impact** : Un taux de rétention plus élevé = intervalles plus courts = plus de révisions.

### Paramètres FSRS-6

21 paramètres scientifiquement optimisés dans `DEFAULT_FSRS_PARAMS`.

**Note** : Il est recommandé de ne pas modifier ces paramètres sauf pour optimisation personnalisée basée sur des données.

---

## Future Improvements

### Phase 1 (Actuelle) ✅

- [x] Backend complet (API, database)
- [x] Algorithme FSRS-6
- [x] Pages élèves (liste decks, révision)
- [x] Pages professeurs (création, attribution)
- [x] Composants UI

### Phase 2 (À venir)

- [ ] Import/Export JSON
  - Exporter deck en format JSON
  - Importer deck depuis JSON
  - Partage entre professeurs
- [ ] Banque de questions intégration
  - Sélectionner templates depuis interface
  - Filtres par niveau, thème, difficulté
  - Prévisualisation des questions
- [ ] Statistiques avancées professeurs
  - Progression des élèves par deck
  - Taux de réussite par carte
  - Cartes les plus difficiles
  - Temps de révision moyen

### Phase 3 (Future)

- [ ] Optimisation des paramètres FSRS
  - Collecte de données de révision
  - Calcul de paramètres personnalisés
  - Suggestions d'amélioration
- [ ] Tags et organisation
  - Tags personnalisés pour cartes
  - Filtres par tags
  - Recherche globale
- [ ] Révision collaborative
  - Commentaires sur cartes
  - Suggestions d'amélioration
  - Cartes partagées communauté
- [ ] Mobile app
  - App native ou PWA
  - Notifications de révisions
  - Mode hors-ligne
- [ ] Gamification
  - Points XP par révision
  - Streaks (jours consécutifs)
  - Badges de progression
  - Leaderboards

### Améliorations techniques

- [ ] Tests unitaires (Vitest)
- [ ] Tests E2E (Playwright)
- [ ] Performance monitoring
- [ ] Analytics (respect RGPD)
- [ ] Backup automatique
- [ ] Migration wizard (depuis Anki)

---

## Glossaire

| Terme             | Définition                                                   |
| ----------------- | ------------------------------------------------------------ |
| **SRS**           | Spaced Repetition System - système de révision espacée       |
| **FSRS**          | Free Spaced Repetition Scheduler - algorithme open-source    |
| **DSR**           | Difficulty, Stability, Retrievability - modèle à 3 variables |
| **Deck**          | Collection de cartes flashcards                              |
| **Card**          | Carte flashcard (recto/verso)                                |
| **Template card** | Carte basée sur un template de question (régénérée)          |
| **Custom card**   | Carte personnalisée (contenu fixe)                           |
| **Instance**      | Génération concrète d'un template avec valeurs aléatoires    |
| **RLS**           | Row Level Security - sécurité au niveau des lignes Postgres  |
| **Grade**         | Note de 1-4 pour évaluer la difficulté de rappel             |

---

## Ressources

- **FSRS-6 Paper** : [https://github.com/open-spaced-repetition/fsrs4anki/wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- **Algorithme original** : [https://github.com/open-spaced-repetition/fsrs-rs](https://github.com/open-spaced-repetition/fsrs-rs)
- **Documentation Anki** : [https://docs.ankiweb.net/](https://docs.ankiweb.net/)
- **Spaced repetition research** : [https://www.gwern.net/Spaced-repetition](https://www.gwern.net/Spaced-repetition)

---

## Maintenance

### Mise à jour migration database

1. Créer nouvelle migration dans `supabase/migrations/`
2. Format : `<timestamp>_<description>.sql`
3. Tester localement
4. Push avec `pnpm db:migrate`
5. Mettre à jour `DATABASE_SCHEMA.md`

### Modification algorithme FSRS

1. Modifier `src/lib/srs/fsrs.ts`
2. Ajouter tests unitaires
3. Tester avec données réelles
4. Documenter changements
5. Considérer migration des stats existantes

### Ajout de nouvelles fonctionnalités

1. Mettre à jour `types.ts` si nécessaire
2. Créer migration database si schéma change
3. Implémenter API endpoints
4. Créer composants UI
5. Créer pages
6. Mettre à jour documentation
7. Ajouter tests

---

**Version** : 1.0.0
**Dernière mise à jour** : 2024-10-22
**Auteur** : Claude Code (Anthropic)
