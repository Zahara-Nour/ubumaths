# Error Monitoring Dashboard

Documentation complète du dashboard admin de monitoring d'erreurs.

**Dernière mise à jour** : 2025-11-08
**Version** : 1.1.0

---

## 📍 Accès

- **Dashboard principal** : `/dashboard/admin/errors`
- **Détail d'une erreur** : `/dashboard/admin/errors/[id]`
- **Page de test** : `/dashboard/admin/errors/test`

**Permissions** : Admin uniquement (vérification via `requireRole(locals, 'admin')`)

---

## 🎯 Vue d'ensemble

Le dashboard de monitoring d'erreurs permet aux administrateurs de :

- Surveiller toutes les erreurs de l'application en temps réel
- Filtrer et rechercher des erreurs spécifiques
- Résoudre des erreurs individuellement ou en masse
- Analyser les tendances et la fréquence des erreurs
- Nettoyer les anciennes erreurs

---

## 📊 Statistiques (Cards)

Le dashboard affiche 4 statistiques clés en haut de page :

### Total Erreurs

- Nombre total d'erreurs dans les dernières 24 heures
- Inclut erreurs résolues et non résolues

### Non Résolues

- Nombre d'erreurs non encore traitées
- Affichage en orange (alerte)
- Indicateur principal pour la charge de travail

### Critiques

- Erreurs de sévérité `critical` uniquement
- Affichage en rouge (urgence)
- Nécessitent une attention immédiate

### Dernière Heure

- Erreurs apparues dans les 60 dernières minutes
- Indicateur de tendance récente
- Utile pour détecter des pics soudains

---

## 🔍 Système de Filtres

### Filtres disponibles

#### Type d'erreur

- `client_js` : Erreurs JavaScript côté client
- `server_api` : Erreurs dans les endpoints API
- `server_load` : Erreurs dans les fonctions `load()`
- `server_action` : Erreurs dans les form actions
- `validation` : Erreurs de validation de formulaires
- `performance` : Problèmes de performance
- `database` : Erreurs de base de données

#### Sévérité

- `info` : Informationnel (logs, debug)
- `warning` : Avertissement (non bloquant)
- `error` : Erreur (fonctionnalité affectée)
- `critical` : Critique (app cassée, données perdues)

#### Statut

- `Toutes` : Afficher toutes les erreurs
- `Non résolues` : Uniquement les erreurs à traiter
- `Résolues` : Uniquement les erreurs marquées comme résolues

#### Recherche textuelle

- Recherche dans les messages d'erreur
- Maximum 200 caractères
- Sensible à la casse (non)

### Utilisation des filtres

**Application des filtres** :

1. Sélectionner les valeurs dans les dropdowns
2. Taper dans le champ de recherche
3. Cliquer sur "Appliquer les filtres"
4. Les paramètres sont ajoutés à l'URL (navigation maintenue)

**Réinitialisation** :

- Cliquer sur "Réinitialiser"
- Tous les filtres retournent à "Tous"
- Retour à la page de base sans paramètres

---

## 🆕 Résolution Groupée (Bulk Resolve)

**🆕 2025-11-08**

Fonctionnalité permettant de résoudre plusieurs erreurs en une seule action.

### Fonctionnement

1. **Application de filtres** : L'admin applique des filtres pour isoler un groupe d'erreurs
2. **Activation du bouton** : Le bouton "Marquer tous comme résolus" s'active si :
   - Au moins une erreur correspond aux filtres
   - Au moins une erreur non résolue existe dans les résultats
3. **Confirmation** : Une modale de confirmation affiche :
   - Nombre d'occurrences qui seront résolues
   - Nombre total d'erreurs individuelles affectées
   - Liste des filtres actifs
   - Champ de notes optionnel (max 2000 caractères)
   - Avertissement de l'action irréversible
4. **Exécution** : L'API traite chaque occurrence séquentiellement
5. **Résultat** : Toast de succès avec le nombre d'erreurs résolues

### Interface utilisateur

#### Bouton principal

```svelte
<Button
	variant="destructive"
	disabled={filteredOccurrences.length === 0 || allFilteredResolved}
	onclick={openBulkResolveDialog}
>
	Marquer tous comme résolus
</Button>
```

**États du bouton** :

- ✅ Activé : Au moins une erreur non résolue correspondant aux filtres
- ❌ Désactivé : Aucune erreur, ou toutes déjà résolues

#### Modale de confirmation

**Titre** : "Marquer comme résolus ?"

**Description** : Indique le nombre exact d'occurrences et d'erreurs individuelles

**Filtres actifs** :

- Affichage en encadré gris
- Liste à puces des filtres appliqués
- Visible uniquement si au moins un filtre est actif

**Champ de notes** :

- Textarea multi-lignes (4 lignes)
- Optionnel
- Maximum 2000 caractères
- Les notes sont ajoutées à **toutes** les erreurs résolues

**Avertissement** :

- Encadré orange avec icône ⚠️
- Message : "Cette action affectera toutes les erreurs correspondant aux filtres actifs."

**Actions** :

- Bouton "Annuler" (outline, ferme la modale)
- Bouton "Confirmer" (primary, lance la résolution)
- Désactivation des boutons pendant le traitement

### Exemples d'utilisation

#### Exemple 1 : Résoudre toutes les erreurs client non critiques

```
Filtres :
- Type : client_js
- Sévérité : warning
- Statut : Non résolues

Résultat : 45 occurrences résolues (127 erreurs individuelles)
```

#### Exemple 2 : Résoudre les erreurs d'un utilisateur spécifique

```
Filtres :
- user_id : 550e8400-e29b-41d4-a716-446655440000
- Statut : Non résolues

Notes : "Problème résolu après mise à jour du navigateur de l'utilisateur"

Résultat : 12 occurrences résolues (34 erreurs individuelles)
```

#### Exemple 3 : Résoudre les erreurs d'une période donnée

```
Filtres :
- date_from : 2025-11-01T00:00:00Z
- date_to : 2025-11-07T23:59:59Z
- Statut : Non résolues

Notes : "Erreurs liées au déploiement du 2025-11-05, corrigé en production"

Résultat : 89 occurrences résolues (312 erreurs individuelles)
```

### Implémentation technique

#### Endpoint API

**Route** : `POST /api/errors/bulk-resolve`

**Authentification** : Admin requis (`requireRole(locals, 'admin')`)

**Validation** : Zod schema `bulkResolveErrorsSchema`

**Body** :

```typescript
{
  error_type?: 'client_js' | 'server_api' | 'server_load' | ...,
  severity?: 'info' | 'warning' | 'error' | 'critical',
  resolved?: boolean,
  user_id?: string (UUID),
  date_from?: string (ISO 8601),
  date_to?: string (ISO 8601),
  search?: string (max 200 chars),
  notes?: string (max 2000 chars)
}
```

**Validation importante** :

- Au moins **un filtre** doit être spécifié
- Empêche de résoudre accidentellement **toutes** les erreurs du système
- Message d'erreur explicite si aucun filtre fourni

**Réponse** :

```typescript
{
  success: true,
  resolved_count: number,      // Total error_logs résolus
  affected_occurrences: number // Nombre de signatures uniques résolues
}
```

#### Logique serveur

**Fichier** : `/src/routes/api/errors/bulk-resolve/+server.ts`

**Workflow** :

1. Validation Zod du body
2. Construction de l'objet `ErrorFilters` (exclusion de `notes`)
3. Fetch de toutes les occurrences correspondant aux filtres via `getErrorOccurrences()`
4. Si 0 occurrences → retour immédiat avec `resolved_count: 0`
5. Pour chaque occurrence :
   - Appel de `resolveErrorBySignature()` avec la signature, user_id, et notes
   - Comptabilisation des erreurs résolues
   - Log en cas d'échec, mais continuation du traitement
6. Retour du résultat avec totaux

**Traitement séquentiel** :

- Utilise une boucle `for...of` (non parallèle)
- Garantit l'ordre de traitement
- Point d'optimisation futur : parallélisation avec `Promise.all()`

#### Frontend

**Fichier** : `/src/routes/(protected)/dashboard/admin/errors/+page.svelte`

**État réactif** :

```typescript
let bulkResolveDialogOpen = $state(false);
let bulkResolveNotes = $state('');
let submitting = $state(false);

// Dérivés
const allFilteredResolved = $derived(filteredOccurrences.every((o) => o.is_resolved));
```

**Fonction de résolution** :

```typescript
async function confirmBulkResolve() {
	submitting = true;
	try {
		const requestBody = {
			error_type: typeFilter !== 'all' ? typeFilter : undefined,
			severity: severityFilter !== 'all' ? severityFilter : undefined,
			resolved: resolvedFilter !== 'all' ? resolvedFilter : undefined,
			search: searchInput || undefined,
			notes: bulkResolveNotes || undefined
		};

		const response = await fetch('/api/errors/bulk-resolve', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || 'Erreur lors de la résolution groupée');
		}

		const result = await response.json();

		toaster.success(
			`${result.resolved_count} ${result.resolved_count > 1 ? 'erreurs résolues' : 'erreur résolue'} avec succès`
		);

		bulkResolveDialogOpen = false;
		await invalidateAll(); // Refresh data
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
		toaster.error(errorMessage);
	} finally {
		submitting = false;
	}
}
```

**Refresh automatique** :

- Appel de `invalidateAll()` après succès
- Recharge les données serveur via `+page.server.ts`
- Liste des erreurs mise à jour automatiquement

---

## 🔒 Sécurité

### Protection d'accès

- Vérification du rôle admin dans `+page.server.ts` (fonction `load()`)
- Vérification du rôle admin dans l'API endpoint
- Utilisation de `requireRole(locals, 'admin')` (middleware)

### Validation des entrées

- Zod schemas pour tous les endpoints
- Validation des UUIDs avec `.uuid()`
- Validation des dates avec `.datetime()`
- Limites de longueur : search (200 chars), notes (2000 chars)
- Limites de pagination : max 100 erreurs par requête

### RLS Policies

- Les tables `error_logs` et `error_occurrences` ont des RLS policies
- Seuls les admins peuvent lire/écrire
- Protection au niveau de la base de données (couche supplémentaire)

### Prévention d'erreurs

- Requiert au moins un filtre pour bulk resolve
- Empêche la résolution accidentelle de toutes les erreurs
- Modale de confirmation avec avertissement
- Affichage des filtres actifs avant confirmation

---

## ⚡ Performance

### Optimisations actuelles

- Déduplication des erreurs via `error_signature` hash
- Index sur les colonnes de filtrage (`error_type`, `severity`, `resolved`, etc.)
- Pagination avec `limit` et `offset` (max 100 par page)
- Comptage optimisé avec `count('*')`

### Points d'amélioration futurs

- **Bulk resolve** : Parallélisation du traitement (actuellement séquentiel)
- Utilisation de `Promise.all()` ou batching SQL pour résoudre plusieurs signatures en une seule requête
- Estimation : Réduction du temps de résolution de 50-70% pour de gros volumes

### Métriques

- Temps de chargement initial : ~200-500ms (selon nombre d'erreurs)
- Temps de filtrage : Instantané (réactif côté client)
- Temps de résolution individuelle : ~50-100ms
- Temps de résolution groupée (100 occurrences) : ~5-10 secondes (séquentiel)

---

## 🐛 Résolution d'Erreurs Individuelles

### Via la liste

1. Cliquer sur une occurrence dans la liste
2. Ouvre la page de détail `/dashboard/admin/errors/[id]`
3. Bouton "Marquer comme résolu"
4. Champ de notes optionnel
5. Toast de confirmation

### Via le détail

- Affichage complet du stack trace
- Contexte utilisateur (si disponible)
- Contexte navigateur (user agent, URL, etc.)
- Historique des occurrences (toutes les fois où l'erreur est apparue)

---

## 📈 Cas d'Usage

### 1. Monitoring quotidien

**Objectif** : Vérifier les nouvelles erreurs chaque matin

**Workflow** :

1. Ouvrir le dashboard
2. Regarder les stats "Dernières 24h" et "Critiques"
3. Filtrer par "Non résolues" + "critical"
4. Traiter les erreurs critiques en premier
5. Filtrer par "Non résolues" + "error"
6. Investiguer et résoudre

### 2. Nettoyage après déploiement

**Objectif** : Résoudre les erreurs liées à un bug corrigé

**Workflow** :

1. Identifier le message d'erreur spécifique (ex: "Cannot read property 'x'")
2. Filtrer par recherche : "Cannot read property 'x'"
3. Filtrer par date : depuis le déploiement du bug
4. Bulk resolve avec notes : "Corrigé dans le déploiement v1.2.3"

### 3. Analyse de tendance

**Objectif** : Identifier les erreurs récurrentes

**Workflow** :

1. Trier par "Occurrence count" (décroissant)
2. Identifier les erreurs avec >10 occurrences
3. Investiguer les causes racines
4. Créer des issues GitHub pour corrections
5. Résoudre après déploiement de la correction

### 4. Gestion des erreurs utilisateur

**Objectif** : Résoudre les erreurs d'un utilisateur spécifique

**Workflow** :

1. Utilisateur signale un problème
2. Filtrer par `user_id` de l'utilisateur
3. Analyser les erreurs récentes
4. Reproduire le problème
5. Corriger et bulk resolve avec notes explicatives

---

## 🔗 Liens connexes

- [Quick Start](quick-start.md) - Guide de démarrage rapide
- [Architecture système](system.md) - Documentation technique complète
- [API Reference](../../architecture/api-reference.md) - Documentation des endpoints API
- [Database Schema](../../architecture/database-schema.md) - Tables `error_logs` et `error_occurrences`

---

## 📝 Notes de développement

### Ajout de nouveaux filtres

Pour ajouter un nouveau filtre au dashboard :

1. **Backend** : Ajouter le filtre dans `bulkResolveErrorsSchema` (`src/lib/server/validation/errors.ts`)
2. **Frontend** : Ajouter un `MySelect` dans la section Filtres
3. **Backend** : Modifier `getErrorOccurrences()` pour supporter le nouveau filtre
4. **Frontend** : Inclure le filtre dans `activeFilters()` pour l'affichage
5. **Documentation** : Mettre à jour cette page

### Personnalisation de la période de rétention

Actuellement, les erreurs sont conservées indéfiniment. Pour implémenter une rétention automatique :

1. Créer un cron job Vercel (`/api/cron/cleanup-errors`)
2. Appeler l'endpoint `/api/errors/cleanup` avec `days_old: 90`
3. Scheduler le cron pour s'exécuter quotidiennement

---

[← Retour au système d'erreurs](README.md)
