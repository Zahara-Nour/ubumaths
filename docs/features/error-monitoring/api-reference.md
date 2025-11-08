# Error Monitoring API Reference

Documentation complète des endpoints API du système de monitoring d'erreurs.

**Dernière mise à jour** : 2025-11-08
**Version** : 1.1.0

---

## 🔐 Authentification

Tous les endpoints nécessitent une authentification admin via `requireRole(locals, 'admin')`.

**Header requis** :

```
Cookie: session=<session_token>
```

**Réponses d'erreur communes** :

- `401 Unauthorized` : Non authentifié
- `403 Forbidden` : Authentifié mais pas admin
- `400 Bad Request` : Validation Zod échouée
- `500 Internal Server Error` : Erreur serveur

---

## 📋 Liste des Endpoints

### GET /api/errors

Liste les occurrences d'erreurs avec filtres et pagination.

#### Query Parameters

| Paramètre    | Type   | Requis | Description             | Validation                                                                                               |
| ------------ | ------ | ------ | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `error_type` | string | Non    | Type d'erreur           | Enum: `client_js`, `server_api`, `server_load`, `server_action`, `validation`, `performance`, `database` |
| `severity`   | string | Non    | Niveau de sévérité      | Enum: `info`, `warning`, `error`, `critical`                                                             |
| `resolved`   | string | Non    | Statut de résolution    | `"true"` ou `"false"` (converti en boolean)                                                              |
| `user_id`    | string | Non    | UUID de l'utilisateur   | UUID valide                                                                                              |
| `date_from`  | string | Non    | Date de début           | ISO 8601 datetime                                                                                        |
| `date_to`    | string | Non    | Date de fin             | ISO 8601 datetime                                                                                        |
| `search`     | string | Non    | Recherche textuelle     | Max 200 caractères                                                                                       |
| `limit`      | number | Non    | Nombre max de résultats | 1-100, défaut: 50                                                                                        |
| `offset`     | number | Non    | Décalage de pagination  | ≥0, défaut: 0                                                                                            |

#### Exemple de Requête

```bash
GET /api/errors?error_type=client_js&severity=error&resolved=false&limit=20&offset=0
```

#### Réponse Succès (200)

```json
{
	"success": true,
	"data": [
		{
			"id": "123e4567-e89b-12d3-a456-426614174000",
			"error_signature": "a3f9c1e2...",
			"error_type": "client_js",
			"severity": "error",
			"message": "Cannot read property 'x' of undefined",
			"occurrence_count": 45,
			"first_seen": "2025-11-01T10:30:00Z",
			"last_seen": "2025-11-08T14:22:00Z",
			"is_resolved": false,
			"resolved_by": null,
			"resolved_at": null,
			"resolution_notes": null
		}
	],
	"count": 127,
	"filters": {
		"error_type": "client_js",
		"severity": "error",
		"resolved": false
	}
}
```

---

### POST /api/errors/log

Enregistre une nouvelle erreur dans le système (usage interne).

#### Request Body

```json
{
	"error_type": "frontend",
	"message": "Uncaught TypeError: Cannot read property",
	"url": "https://ubumaths.com/dashboard",
	"stack_trace": "Error: ...\n  at ...",
	"user_agent": "Mozilla/5.0 ...",
	"severity": "error",
	"metadata": {
		"component": "StudentDashboard",
		"action": "loadData"
	}
}
```

#### Body Schema

| Champ         | Type   | Requis | Description                    | Validation                                                |
| ------------- | ------ | ------ | ------------------------------ | --------------------------------------------------------- |
| `error_type`  | string | Oui    | Type d'erreur                  | Enum: `frontend`, `backend`, `api`, `database`, `unknown` |
| `message`     | string | Oui    | Message d'erreur               | Max 1000 caractères                                       |
| `url`         | string | Oui    | URL où l'erreur s'est produite | URL valide, max 500 caractères                            |
| `stack_trace` | string | Non    | Stack trace complète           | Max 5000 caractères                                       |
| `user_agent`  | string | Non    | User agent du navigateur       | Max 500 caractères                                        |
| `severity`    | string | Non    | Sévérité                       | Enum: `low`, `medium`, `high`, `critical`                 |
| `metadata`    | object | Non    | Métadonnées additionnelles     | Objet JSON libre                                          |

#### Réponse Succès (201)

```json
{
	"success": true,
	"error_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

### PUT /api/errors/[id]

Résout une erreur individuelle par son ID.

#### URL Parameters

| Paramètre | Type | Description                 |
| --------- | ---- | --------------------------- |
| `id`      | UUID | ID de l'occurrence d'erreur |

#### Request Body

```json
{
	"notes": "Corrigé dans le commit abc123. Ajout d'une vérification null."
}
```

#### Body Schema

| Champ   | Type   | Requis | Description         | Validation          |
| ------- | ------ | ------ | ------------------- | ------------------- |
| `notes` | string | Non    | Notes de résolution | Max 2000 caractères |

#### Réponse Succès (200)

```json
{
	"success": true,
	"message": "Erreur résolue avec succès"
}
```

#### Réponses d'Erreur

- `404 Not Found` : Occurrence d'erreur introuvable
- `400 Bad Request` : Notes trop longues

---

### POST /api/errors/bulk-resolve

🆕 Résout plusieurs erreurs en masse basé sur des filtres.

#### Request Body

```json
{
	"error_type": "client_js",
	"severity": "warning",
	"resolved": "false",
	"date_from": "2025-11-01T00:00:00Z",
	"date_to": "2025-11-07T23:59:59Z",
	"search": "TypeError",
	"notes": "Erreurs résolues après mise à jour du navigateur"
}
```

#### Body Schema

Tous les champs sont **optionnels**, mais **au moins un filtre doit être fourni**.

| Champ        | Type   | Description           | Validation                                                                                               |
| ------------ | ------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `error_type` | string | Type d'erreur         | Enum: `client_js`, `server_api`, `server_load`, `server_action`, `validation`, `performance`, `database` |
| `severity`   | string | Niveau de sévérité    | Enum: `info`, `warning`, `error`, `critical`                                                             |
| `resolved`   | string | Statut de résolution  | `"true"` ou `"false"`                                                                                    |
| `user_id`    | string | UUID de l'utilisateur | UUID valide                                                                                              |
| `date_from`  | string | Date de début         | ISO 8601 datetime                                                                                        |
| `date_to`    | string | Date de fin           | ISO 8601 datetime                                                                                        |
| `search`     | string | Recherche textuelle   | Max 200 caractères                                                                                       |
| `notes`      | string | Notes de résolution   | Max 2000 caractères                                                                                      |

#### Validation Spéciale

```typescript
// Schema Zod enforce au moins un filtre
.refine((data) => {
  return !!(
    data.error_type ||
    data.severity ||
    data.resolved !== undefined ||
    data.user_id ||
    data.date_from ||
    data.date_to ||
    data.search
  );
}, {
  message: 'Au moins un filtre doit être spécifié pour éviter de résoudre toutes les erreurs accidentellement'
});
```

#### Réponse Succès (200)

```json
{
	"success": true,
	"resolved_count": 127,
	"affected_occurrences": 34
}
```

**Explication des champs** :

- `resolved_count` : Nombre total de logs d'erreur individuels résolus (table `error_logs`)
- `affected_occurrences` : Nombre de signatures d'erreur uniques résolues (table `error_occurrences`)

#### Réponses d'Erreur

- `400 Bad Request` : Aucun filtre fourni
  ```json
  {
  	"message": "Au moins un filtre doit être spécifié pour éviter de résoudre toutes les erreurs accidentellement"
  }
  ```
- `500 Internal Server Error` : Échec de récupération ou résolution

#### Exemple cURL

```bash
curl -X POST https://ubumaths.com/api/errors/bulk-resolve \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<token>" \
  -d '{
    "error_type": "client_js",
    "severity": "warning",
    "resolved": "false",
    "notes": "Fixed in deployment v1.2.3"
  }'
```

---

### POST /api/errors/cleanup

Supprime les anciennes erreurs résolues (nettoyage).

#### Request Body

```json
{
	"days_old": 90
}
```

#### Body Schema

| Champ      | Type   | Requis | Description                                    | Validation                        |
| ---------- | ------ | ------ | ---------------------------------------------- | --------------------------------- |
| `days_old` | number | Non    | Âge minimum des erreurs à supprimer (en jours) | Entier positif, 1-365, défaut: 90 |

#### Réponse Succès (200)

```json
{
	"success": true,
	"deleted_count": 1523,
	"message": "Erreurs supprimées avec succès"
}
```

#### Réponses d'Erreur

- `400 Bad Request` : `days_old` invalide (hors plage 1-365)
- `500 Internal Server Error` : Échec de suppression

---

## 📊 Types de Données

### ErrorType Enum

```typescript
type ErrorType =
	| 'client_js' // Erreurs JavaScript côté client
	| 'server_api' // Erreurs dans les endpoints API
	| 'server_load' // Erreurs dans les fonctions load()
	| 'server_action' // Erreurs dans les form actions
	| 'validation' // Erreurs de validation de formulaires
	| 'performance' // Problèmes de performance
	| 'database'; // Erreurs de base de données
```

### Severity Enum

```typescript
type Severity =
	| 'info' // Informationnel (logs)
	| 'warning' // Avertissement (non bloquant)
	| 'error' // Erreur (fonctionnalité affectée)
	| 'critical'; // Critique (app cassée, perte de données)
```

### ErrorOccurrence (Response Type)

```typescript
interface ErrorOccurrence {
	id: string; // UUID
	error_signature: string; // Hash unique de l'erreur
	error_type: ErrorType;
	severity: Severity;
	message: string; // Message d'erreur principal
	occurrence_count: number; // Nombre de fois vu
	first_seen: string; // ISO 8601 datetime
	last_seen: string; // ISO 8601 datetime
	is_resolved: boolean;
	resolved_by: string | null; // UUID de l'admin
	resolved_at: string | null; // ISO 8601 datetime
	resolution_notes: string | null;
	stack_trace?: string; // Disponible si demandé
	url?: string; // URL de la première occurrence
	user_id?: string | null; // UUID de l'utilisateur (si connecté)
}
```

### ErrorFilters (Internal Type)

```typescript
interface ErrorFilters {
	error_type?: ErrorType;
	severity?: Severity;
	resolved?: boolean;
	user_id?: string; // UUID
	date_from?: string; // ISO 8601
	date_to?: string; // ISO 8601
	search?: string;
	limit?: number; // 1-100
	offset?: number; // ≥0
}
```

---

## 🔒 Sécurité

### Rate Limiting

Actuellement non implémenté pour les endpoints admin. À considérer pour le futur :

- Limiter à 100 requêtes/minute par admin
- Limiter bulk resolve à 10 requêtes/heure

### Input Sanitization

Tous les inputs sont validés via Zod schemas :

- UUIDs vérifiés avec `.uuid()`
- Dates vérifiées avec `.datetime()`
- Enums vérifiés avec `.enum()`
- Longueurs de chaîne limitées avec `.max()`

### CSRF Protection

- Vérification de l'origine dans `hooks.server.ts`
- Tous les endpoints POST/PUT/DELETE protégés
- Headers `Origin` et `Referer` validés

### RLS Policies

Les tables `error_logs` et `error_occurrences` ont des Row-Level Security policies :

- Lecture : Admin uniquement
- Écriture : Admin uniquement
- Service role bypass pour le logging système

---

## ⚡ Performance

### Indexes Database

Tables indexées sur :

- `error_logs` : `error_type`, `severity`, `created_at`, `user_id`, `resolved`
- `error_occurrences` : `error_signature` (UNIQUE), `error_type`, `severity`, `is_resolved`, `occurrence_count`

### Pagination

Utiliser `limit` et `offset` pour paginer :

```
Page 1: ?limit=50&offset=0
Page 2: ?limit=50&offset=50
Page 3: ?limit=50&offset=100
```

### Optimisations Bulk Resolve

**Actuel** : Traitement séquentiel (boucle `for...of`)

- 100 erreurs : ~5-10 secondes

**Futur** : Parallélisation ou batch SQL

- 100 erreurs : ~1-2 secondes (estimation)

---

## 🧪 Testing

### Exemples avec Playwright

```typescript
test('bulk resolve errors with filters', async ({ page }) => {
	// Login as admin
	await loginAsAdmin(page);

	// Navigate to errors dashboard
	await page.goto('/dashboard/admin/errors');

	// Apply filters
	await page.selectOption('[name="error_type"]', 'client_js');
	await page.selectOption('[name="severity"]', 'warning');
	await page.click('button:has-text("Appliquer les filtres")');

	// Open bulk resolve dialog
	await page.click('button:has-text("Marquer tous comme résolus")');

	// Fill notes
	await page.fill('textarea#bulk-resolve-notes', 'Test resolution');

	// Confirm
	await page.click('button:has-text("Confirmer")');

	// Wait for success toast
	await expect(page.locator('.toast-success')).toContainText('erreurs résolues');
});
```

### Exemples avec cURL

**Liste des erreurs critiques non résolues** :

```bash
curl "https://ubumaths.com/api/errors?severity=critical&resolved=false" \
  -H "Cookie: session=<token>"
```

**Résoudre toutes les erreurs client de la semaine dernière** :

```bash
curl -X POST "https://ubumaths.com/api/errors/bulk-resolve" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<token>" \
  -d '{
    "error_type": "client_js",
    "date_from": "2025-11-01T00:00:00Z",
    "date_to": "2025-11-08T00:00:00Z",
    "notes": "Fixed in v1.2.3"
  }'
```

---

## 🔗 Liens connexes

- [Dashboard Guide](dashboard.md) - Guide d'utilisation du dashboard
- [Architecture système](system.md) - Documentation technique complète
- [Quick Start](quick-start.md) - Guide de démarrage rapide
- [Database Schema](../../architecture/database-schema.md) - Tables et relations

---

[← Retour au système d'erreurs](README.md)
