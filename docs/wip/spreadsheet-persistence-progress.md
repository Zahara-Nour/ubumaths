# Spreadsheet Persistence - Documentation de progression

**Date**: 2025-12-04
**Statut**: Migration SQL créée, API endpoints créés, Pages SvelteKit créées
**Prochaine étape**: Pousser la migration et tester

---

## Fichiers créés

### 1. Migration Supabase

**Fichier**: `supabase/migrations/20251205000000_create_spreadsheets_table.sql`

Crée la table `spreadsheets` avec :

- Colonnes : `id`, `user_id`, `name`, `description`, `data` (JSONB), `created_at`, `updated_at`
- Index sur `user_id` et `updated_at`
- RLS policies complètes (SELECT, INSERT, UPDATE, DELETE)
- Trigger pour `updated_at`

### 2. Validation Zod

**Fichier**: `src/lib/server/validation/spreadsheet.ts`

Schémas de validation :

- `spreadsheetDataSchema` : Valide la structure JSONB complète
- `createSpreadsheetSchema` : Validation pour création
- `updateSpreadsheetSchema` : Validation pour mise à jour (partielle)
- `listSpreadsheetsSchema` : Validation des paramètres de pagination

### 3. API Endpoints

**Fichier**: `src/routes/api/spreadsheets/+server.ts`

- `GET /api/spreadsheets` : Liste paginée des spreadsheets de l'utilisateur
- `POST /api/spreadsheets` : Création d'un nouveau spreadsheet

**Fichier**: `src/routes/api/spreadsheets/[id]/+server.ts`

- `GET /api/spreadsheets/:id` : Récupération d'un spreadsheet avec données complètes
- `PUT /api/spreadsheets/:id` : Mise à jour (nom, description, ou données)
- `DELETE /api/spreadsheets/:id` : Suppression

Tous les endpoints :

- Utilisent `requireRole(locals, 'student')` pour l'auth
- Vérifient `user_id` explicitement (en plus de RLS)
- Valident les inputs avec Zod
- Retournent des messages d'erreur en français

### 4. Pages SvelteKit

**Fichier**: `src/routes/(protected)/spreadsheet/+page.server.ts`

- Charge la liste des spreadsheets pour l'utilisateur

**Fichier**: `src/routes/(protected)/spreadsheet/+page.svelte`

- **MODIFIÉ** : Transformé en page de liste
- Affiche tous les spreadsheets de l'utilisateur
- Bouton "Nouveau tableur" pour créer
- Bouton de suppression par spreadsheet
- Empty state si aucun spreadsheet
- Design en grille responsive

**Fichier**: `src/routes/(protected)/spreadsheet/[id]/+page.server.ts`

- Charge un spreadsheet spécifique avec toutes ses données

**Fichier**: `src/routes/(protected)/spreadsheet/[id]/+page.svelte`

- Page d'édition d'un spreadsheet
- Charge les données dans `spreadsheetStore` au mount
- Auto-save toutes les 2 secondes après modification
- Affiche le statut de sauvegarde
- Bouton "Retour" vers la liste
- Composant `<Spreadsheet />` pour l'édition

---

## Architecture de persistance

### localStorage → Supabase

**Avant** : Le store `spreadsheetStore` sauvegardait dans localStorage uniquement

**Maintenant** : Double sauvegarde

1. **localStorage** : Sauvegarde locale immédiate (déjà implémenté dans le store)
2. **Supabase** : Sauvegarde serveur avec auto-save (nouvel ajout)

### Flow utilisateur

1. **Liste** (`/spreadsheet`)
   - Affiche tous les spreadsheets de l'utilisateur
   - Bouton "Nouveau tableur" → Crée via API → Redirige vers `/spreadsheet/:id`
   - Click sur un spreadsheet → Redirige vers `/spreadsheet/:id`

2. **Édition** (`/spreadsheet/:id`)
   - Charge les données depuis Supabase
   - Importe dans `spreadsheetStore`
   - Modifications → Auto-save vers API toutes les 2s
   - Bouton retour → Liste

### Auto-save logic

```typescript
$effect(() => {
	if (spreadsheetStore.hasUnsavedChanges && data.spreadsheet?.id) {
		// Debounce 2s
		setTimeout(async () => {
			await fetch(`/api/spreadsheets/${id}`, {
				method: 'PUT',
				body: JSON.stringify({ data: spreadsheetStore.exportData() })
			});
		}, 2000);
	}
});
```

---

## Prochaines étapes

### 1. Pousser la migration (REQUIS)

```bash
pnpm db:migrate
```

Cette commande va :

- Appliquer la migration SQL sur Supabase
- Créer la table `spreadsheets`
- Activer RLS et créer les policies

### 2. Régénérer les types TypeScript (REQUIS)

```bash
pnpm db:types
```

Cela va régénérer `src/lib/types/database.ts` avec la nouvelle table `spreadsheets`.

### 3. Mettre à jour la documentation

**Fichier à mettre à jour** : `docs/architecture/database-schema.md`

Ajouter une section pour la table `spreadsheets` :

```markdown
### spreadsheets

Stocke les feuilles de calcul des utilisateurs avec formules et formatage.

| Colonne     | Type         | Description                                  |
| ----------- | ------------ | -------------------------------------------- |
| id          | UUID         | Identifiant unique                           |
| user_id     | UUID         | Propriétaire (FK → profiles.id, CASCADE)     |
| name        | VARCHAR(255) | Nom de la feuille (défaut: "Sans titre")     |
| description | TEXT         | Description optionnelle                      |
| data        | JSONB        | Données complètes (cells, metadata, version) |
| created_at  | TIMESTAMPTZ  | Date de création                             |
| updated_at  | TIMESTAMPTZ  | Date de dernière modification                |

**RLS Policies** :

- Users can read/insert/update/delete their own spreadsheets
- No public access

**Indexes** :

- `user_id` (recherche par utilisateur)
- `updated_at DESC` (tri par date)
```

### 4. Tester (CRITIQUE)

1. **Créer un spreadsheet**

   ```bash
   # Via UI : Aller sur /spreadsheet → Cliquer "Nouveau tableur"
   # Vérifier la redirection vers /spreadsheet/:id
   ```

2. **Éditer et auto-save**

   ```bash
   # Modifier des cellules
   # Attendre 2s
   # Vérifier dans la console Network que PUT /api/spreadsheets/:id est appelé
   ```

3. **Liste et suppression**

   ```bash
   # Retour à /spreadsheet
   # Vérifier que le spreadsheet apparaît dans la liste
   # Cliquer sur l'icône poubelle
   # Vérifier la suppression
   ```

4. **Vérifier RLS**
   ```bash
   # Se connecter avec un autre user
   # Aller sur /spreadsheet/:id d'un autre utilisateur (changer ID dans URL)
   # Devrait retourner 404
   ```

### 5. Tests unitaires (OPTIONNEL mais recommandé)

Créer des tests pour :

- Validation Zod : `src/lib/server/validation/spreadsheet.test.ts`
- API endpoints : Tests d'intégration pour GET/POST/PUT/DELETE
- Auto-save logic : Tester le debounce et les erreurs

---

## Décisions de design

### Pourquoi JSONB pour `data` ?

- **Flexible** : Peut stocker n'importe quelle structure de cellules
- **Versionnable** : Le champ `version` permet des migrations futures
- **Performant** : PostgreSQL indexe et requête efficacement le JSONB
- **Compatible** : Le store `spreadsheetStore` exporte déjà au format `SpreadsheetData`

### Pourquoi auto-save avec 2s de debounce ?

- **UX fluide** : L'utilisateur ne doit pas cliquer "Sauvegarder"
- **Performance** : Évite trop de requêtes pendant la frappe rapide
- **2 secondes** : Compromis entre réactivité et charge serveur

### Pourquoi double sauvegarde (localStorage + Supabase) ?

- **localStorage** : Backup local, fonctionne offline, rapide
- **Supabase** : Persistance cross-device, partage potentiel, backup serveur
- **Redondance** : Si Supabase échoue, localStorage conserve les données

### Séparation liste/édition

- **Liste** (`/spreadsheet`) : Vue d'ensemble rapide, pas de chargement lourd
- **Édition** (`/spreadsheet/:id`) : Charge les données JSONB complètes
- **Performance** : La liste ne charge pas toutes les cellules de tous les spreadsheets

---

## Compatibilité avec le store existant

Le store `spreadsheetStore` a déjà :

- `exportData()` : Retourne `SpreadsheetData` compatible avec le JSONB
- `importData(data)` : Accepte `SpreadsheetData` et valide avec Zod
- `hasUnsavedChanges` : Flag pour détecter les modifications

Donc **aucune modification du store n'est nécessaire** ! L'intégration est transparente.

---

## Sécurité

### RLS Policies

Tous les accès passent par RLS :

- `auth.uid() = user_id` : Seul le propriétaire peut accéder
- Pas d'accès public (`is_public = false` pour tous)
- CASCADE sur `user_id` : Suppression automatique si l'utilisateur est supprimé

### Validation Zod

Toutes les entrées sont validées :

- **Nom** : Max 255 caractères, non vide
- **Description** : Max 1000 caractères
- **Cells** : Validation de chaque cellule (format, valeur max 5000 chars)
- **Metadata** : Validation des rows/cols (1-20)

### Rate limiting (TODO futur)

Actuellement pas de rate limiting sur l'auto-save. Si nécessaire :

- Ajouter un rate limit côté Supabase (max 10 updates/minute par user)
- Ou implémenter un debounce plus long (5s au lieu de 2s)

---

## Fichiers modifiés

- `src/routes/(protected)/spreadsheet/+page.svelte` : Transformé en liste

---

## Commandes de test rapide

```bash
# 1. Pousser la migration
pnpm db:migrate

# 2. Régénérer les types
pnpm db:types

# 3. Démarrer le dev server
pnpm dev -- --port 5175

# 4. Ouvrir dans le navigateur
open http://localhost:5175/spreadsheet
```

---

## Notes

- Les messages d'erreur sont en français (comme requis par CLAUDE.md)
- Utilisation de `requireRole(locals, 'student')` : Students ET Teachers peuvent utiliser
- Auto-save affiche un statut visuel (icône + temps)
- Empty state si aucun spreadsheet
- Responsive design (mobile + desktop)
