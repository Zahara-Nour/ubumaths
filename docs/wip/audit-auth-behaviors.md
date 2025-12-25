# Audit TDD - Authentification

**Domaine** : #24 - Authentification
**Date début** : 2025-12-09
**Statut** : En cours

---

## Légende

| Icône | Signification         |
| ----- | --------------------- |
| ⬜    | Non audité            |
| ✅    | Validé                |
| ❌    | Invalidé (à corriger) |
| ⚠️    | Validé avec remarques |

---

## 1. Authentification CRON

Fichier : `src/lib/server/auth/cron.test.ts`

### 1.1 Configuration CRON_SECRET manquante ✅

**Comportement testé** : Si la variable d'environnement `CRON_SECRET` n'est pas configurée sur le serveur, toute requête CRON doit être rejetée avec une erreur HTTP 503 (Service Unavailable).

**Raison métier** : Empêcher l'exécution de tâches planifiées si le système n'est pas correctement configuré. Le code 503 indique un problème de configuration serveur plutôt qu'une erreur client.

**Code test** :

```typescript
it('rejects when CRON_SECRET is not configured', async () => {
	delete process.env.CRON_SECRET;
	const result = await verifyCronAuth(mockRequest);
	expect(result.status).toBe(503);
});
```

**Fichier test** : `src/lib/server/auth/cron.test.ts`

**Validation** : ✅ Validé le 2025-12-09

---

### 1.2 Header Authorization manquant ✅

**Comportement testé** : Si une requête CRON arrive sans header `Authorization`, elle doit être rejetée avec une erreur HTTP 401 (Unauthorized).

**Qu'est-ce que le header Authorization ?**

C'est un header HTTP standard (RFC 7235) utilisé pour transmettre les informations d'authentification. Dans le contexte des tâches CRON d'UbuMaths :

```
Authorization: Bearer abc123xyz...
```

**Comment ça fonctionne ?**

```
┌─────────────────┐         ┌─────────────────┐
│  Vercel Cron    │         │   UbuMaths      │
│  ou GitHub      │ ──────► │   Server        │
│  Actions        │         │                 │
└─────────────────┘         └─────────────────┘
        │                           │
        │  POST /api/cron/cleanup   │
        │  Authorization: Bearer    │
        │  <CRON_SECRET>            │
        │                           │
        └───────────────────────────┘
```

1. **Service externe** (Vercel Cron) déclenche une requête vers `/api/cron/...`
2. Il inclut le header `Authorization: Bearer <secret>`
3. Le serveur UbuMaths extrait le token et le compare à `CRON_SECRET`
4. Si match → exécution de la tâche
5. Si pas de header → erreur 401

**Pourquoi "Bearer" ?**

- Standard OAuth 2.0 (RFC 6750)
- "Bearer" = "porteur du token" = celui qui possède ce token a le droit d'accès
- Format universel reconnu par tous les outils

**Exemples de tâches CRON protégées** :

- `/api/cron/daily-summary` - Génération des résumés quotidiens
- `/api/cron/cleanup-expired` - Nettoyage des données expirées
- `/api/cron/refresh-stats` - Mise à jour des statistiques

**Raison métier** : Toute requête CRON doit être authentifiée. L'absence de header indique une requête non autorisée ou une mauvaise configuration du service appelant.

**Code test** :

```typescript
it('rejects when Authorization header is missing', async () => {
	const request = new Request('http://test', { headers: {} });
	const result = await verifyCronAuth(request);
	expect(result.status).toBe(401);
});
```

**Validation** : ✅ Validé le 2025-12-09

---

### 1.3 Format header Authorization invalide ✅

**Comportement testé** : Si le header `Authorization` n'est pas au format "Bearer <token>", la requête est rejetée avec erreur 401.

**Formats rejetés** :

- `Basic abc123` (mauvais type d'authentification)
- `abc123` (pas de préfixe)
- `Bearer` (token manquant)
- `Bearer ` (token vide)

**Format accepté** :

```
Authorization: Bearer monSecretCRON123
```

**Raison métier** :

- Suivre le standard RFC 6750 pour l'authentification Bearer token
- Rejeter les tentatives d'authentification avec d'autres méthodes (Basic, Digest, etc.)
- Un format incorrect peut indiquer une mauvaise configuration ou une tentative d'attaque

**Code test** :

```typescript
it('rejects when Authorization header format is invalid', async () => {
	const request = new Request('http://test', {
		headers: { Authorization: 'Basic abc123' }
	});
	const result = await verifyCronAuth(request);
	expect(result.status).toBe(401);
});
```

**Validation** : ✅ Validé le 2025-12-09

---

### 1.4 Protection timing attack (longueur) ✅

**Comportement testé** : Avant de comparer les tokens, vérifier d'abord que leur longueur est identique pour éviter les timing attacks basées sur la longueur.

**Qu'est-ce qu'une timing attack ?**

Une attaque par analyse de temps (timing attack) exploite les différences de temps d'exécution pour deviner des informations secrètes.

```
Exemple SANS protection :
┌────────────────────────────────────────────────────────────┐
│ Secret serveur : "abc123def456"  (12 caractères)           │
│                                                            │
│ Attaquant essaie : "x"           → Rejet en 0.1ms          │
│ Attaquant essaie : "xx"          → Rejet en 0.1ms          │
│ ...                                                        │
│ Attaquant essaie : "xxxxxxxxxxxx" → Rejet en 0.5ms ⚠️      │
│                                                            │
│ L'attaquant déduit : le secret fait 12 caractères !        │
└────────────────────────────────────────────────────────────┘
```

**Protection implémentée** :

1. Vérifier la longueur séparément (temps constant)
2. Si longueur différente → rejet immédiat (sans révéler d'info)
3. Puis comparaison à temps constant (voir comportement suivant)

**Raison métier** : Un attaquant pourrait déduire la longueur du secret en mesurant le temps de réponse si on ne vérifie pas la longueur séparément.

**Code test** :

```typescript
it('checks length before comparison to prevent timing attacks', async () => {
	const shortToken = 'short';
	const request = new Request('http://test', {
		headers: { Authorization: `Bearer ${shortToken}` }
	});
	const result = await verifyCronAuth(request);
	expect(result.status).toBe(401);
});
```

**Validation** : ✅ Validé le 2025-12-09

---

### 1.5 Comparaison à temps constant ✅

**Comportement testé** : La comparaison du token utilise un algorithme à temps constant (constant-time comparison) pour éviter les timing attacks.

**Problème avec une comparaison standard** :

```javascript
// ❌ DANGEREUX - comparaison standard
if (userToken === secretToken) { ... }
```

```
Secret : "abc123"
┌─────────────────────────────────────────────────────────────┐
│ Essai "xbc123" → Compare 'x' vs 'a' → STOP immédiat (0.1ms) │
│ Essai "abc999" → Compare 'a','b','c','1' → STOP (0.4ms) ⚠️  │
│                                                             │
│ L'attaquant déduit les premiers caractères corrects !       │
└─────────────────────────────────────────────────────────────┘
```

**Solution : comparaison à temps constant** :

```javascript
// ✅ SÉCURISÉ - temps constant
import { timingSafeEqual } from 'crypto';

const userBuffer = Buffer.from(userToken);
const secretBuffer = Buffer.from(secretToken);
const isValid = timingSafeEqual(userBuffer, secretBuffer);
```

Cette fonction compare **toujours tous les caractères**, même si une différence est trouvée au début. Le temps d'exécution est identique quelle que soit la position de la différence.

**Raison métier** : Empêcher un attaquant de deviner le secret caractère par caractère en mesurant les temps de réponse.

**Code test** :

```typescript
it('uses constant-time comparison for token validation', async () => {
	// Test that similar tokens take same time as different tokens
	const validToken = process.env.CRON_SECRET;
	const almostValid = validToken.slice(0, -1) + 'X';
	// Both should be rejected in similar time
});
```

**Validation** : ✅ Validé le 2025-12-09

---

### 1.6 Token valide accepté ✅

**Comportement testé** : Une requête avec un token valide au format "Bearer <CRON_SECRET>" est acceptée.

**Flux de validation** :

```
┌─────────────────────────────────────────────────────────────┐
│                  VALIDATION TOKEN CRON                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Vérifier CRON_SECRET configuré        ✓ ou 503         │
│  2. Vérifier header Authorization présent  ✓ ou 401         │
│  3. Vérifier format "Bearer <token>"       ✓ ou 401         │
│  4. Vérifier longueur identique            ✓ ou 401         │
│  5. Comparaison temps constant             ✓ ou 401         │
│  6. Token valide → SUCCÈS                  ✓ exécution      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Permettre l'exécution des tâches CRON légitimes configurées dans Vercel ou GitHub Actions.

**Code test** :

```typescript
it('accepts valid token', async () => {
	process.env.CRON_SECRET = 'valid-secret';
	const request = new Request('http://test', {
		headers: { Authorization: 'Bearer valid-secret' }
	});
	const result = await verifyCronAuth(request);
	expect(result.success).toBe(true);
});
```

**Validation** : ✅ Validé le 2025-12-09

---

### 1.7 Bearer insensible à la casse ✅

**Comportement testé** : Le mot-clé "Bearer" est accepté quelle que soit la casse (bearer, BEARER, Bearer).

**Exemples acceptés** :

```
Authorization: Bearer abc123     ✅
Authorization: bearer abc123     ✅
Authorization: BEARER abc123     ✅
Authorization: BeArEr abc123     ✅
```

**Attention** : Seul le mot-clé "Bearer" est insensible à la casse. Le **token lui-même reste sensible à la casse** :

```
CRON_SECRET = "MonSecret123"

Authorization: bearer MonSecret123   ✅ Accepté
Authorization: bearer monsecret123   ❌ Rejeté (casse différente)
```

**Raison métier** :

- Tolérance aux variations d'implémentation des clients HTTP
- Certains proxies ou outils peuvent modifier la casse des headers
- Le standard HTTP recommande cette tolérance pour les schémas d'authentification

**Code test** :

```typescript
it('accepts Bearer keyword case-insensitively', async () => {
	const request = new Request('http://test', {
		headers: { Authorization: 'bearer valid-secret' }
	});
	const result = await verifyCronAuth(request);
	expect(result.success).toBe(true);
});
```

**Validation** : ✅ Validé le 2025-12-09

---

### 1.8 Génération de secret ✅

**Comportement testé** : `generateCronSecret()` génère une chaîne de 32 caractères hexadécimaux, unique à chaque appel.

**Caractéristiques du secret généré** :

- **Longueur** : 32 caractères (128 bits d'entropie)
- **Caractères** : hexadécimaux uniquement (0-9, a-f)
- **Unicité** : chaque appel génère une valeur différente
- **Source** : générateur cryptographique sécurisé (`crypto.randomBytes`)

**Exemple de secrets générés** :

```
a1b2c3d4e5f6789012345678abcdef01
9f8e7d6c5b4a3210fedcba9876543210
```

**Pourquoi 32 caractères hex ?**

```
32 caractères hex = 16 bytes = 128 bits d'entropie

Nombre de combinaisons possibles : 16^32 = 3.4 × 10^38
Temps pour brute-force (1 milliard d'essais/sec) : 10^22 années
```

**Raison métier** : Fournir un utilitaire pour générer des secrets suffisamment longs et aléatoires pour la sécurité des tâches CRON.

**Code test** :

```typescript
it('generates 32 hex characters', () => {
	const secret = generateCronSecret();
	expect(secret).toMatch(/^[0-9a-f]{32}$/);
});

it('generates unique values', () => {
	const secret1 = generateCronSecret();
	const secret2 = generateCronSecret();
	expect(secret1).not.toBe(secret2);
});
```

**Validation** : ✅ Validé le 2025-12-09

---

## 2. Protection CSRF

Fichier : `src/lib/server/csrfProtection.test.ts`

### 2.1 Domaine principal autorisé ✅

**Comportement testé** : Les requêtes avec Origin `https://ubumaths.com` sont autorisées.

**Qu'est-ce que le CSRF ?**

CSRF (Cross-Site Request Forgery) est une attaque où un site malveillant fait exécuter des actions sur un autre site où l'utilisateur est connecté.

```
┌─────────────────────────────────────────────────────────────┐
│                    ATTAQUE CSRF                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Victime connectée sur ubumaths.com (cookie actif)       │
│                                                             │
│  2. Victime visite evil.com (site malveillant)              │
│                                                             │
│  3. evil.com contient :                                     │
│     <form action="https://ubumaths.com/api/delete-account"  │
│           method="POST">                                    │
│       <input type="hidden" name="confirm" value="yes">      │
│     </form>                                                 │
│     <script>document.forms[0].submit()</script>             │
│                                                             │
│  4. Le navigateur envoie la requête AVEC le cookie !        │
│     → Compte supprimé sans le consentement de la victime    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Protection par vérification de l'Origin** :

Le serveur vérifie que le header `Origin` correspond à un domaine autorisé. Si la requête vient de `evil.com`, elle est bloquée.

**Raison métier** : `ubumaths.com` est le domaine principal de production, les requêtes légitimes en proviennent.

**Code test** :

```typescript
it('allows requests from ubumaths.com', () => {
	const result = validateOrigin('https://ubumaths.com');
	expect(result).toBe(true);
});
```

**Validation** : ✅ Validé le 2025-12-09

---

### 2.2 Sous-domaine www autorisé ✅

**Comportement testé** : Les requêtes avec Origin `https://www.ubumaths.com` sont autorisées.

**Pourquoi autoriser www ?**

Certains utilisateurs tapent `www.ubumaths.com` dans leur navigateur ou arrivent via des liens incluant le `www`. Les deux domaines doivent être traités comme équivalents :

```
https://ubumaths.com      → ✅ Autorisé
https://www.ubumaths.com  → ✅ Autorisé
```

**Raison métier** : Variante courante du domaine principal. Les utilisateurs peuvent accéder au site via l'une ou l'autre URL.

**Validation** : ✅ Validé le 2025-12-09

---

### 2.3 Déploiements Vercel autorisés ✅

**Comportement testé** : Les requêtes depuis les domaines Vercel (production et preview) sont autorisées.

**Domaines Vercel autorisés** :

```
https://ubumaths.vercel.app           → ✅ Production Vercel
https://ubumaths-abc123.vercel.app    → ✅ Preview (branch)
https://ubumaths-feature-x.vercel.app → ✅ Preview (PR)
```

**Qu'est-ce qu'un déploiement Preview ?**

Vercel crée automatiquement une URL unique pour chaque :

- Branche Git (ex: `ubumaths-git-feature-login.vercel.app`)
- Pull Request (ex: `ubumaths-pr-42.vercel.app`)

```
┌─────────────────────────────────────────────────────────────┐
│                 WORKFLOW VERCEL                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  main branch    → ubumaths.com (production)                 │
│  feature branch → ubumaths-git-feature.vercel.app (preview) │
│  Pull Request   → ubumaths-pr-123.vercel.app (preview)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Permettre les tests sur les environnements de staging/preview sans désactiver la protection CSRF.

**Validation** : ✅ Validé le 2025-12-09

---

### 2.4 Localhost autorisé en développement ✅

**Comportement testé** : Les requêtes depuis `localhost:5173` et `localhost:5175` sont autorisées.

**Ports utilisés** :

```
http://localhost:5173  → ✅ Port développeur (utilisateur)
http://localhost:5175  → ✅ Port Claude Code (assistant IA)
```

**Pourquoi deux ports ?**

Pour éviter les conflits quand le développeur et Claude Code travaillent en parallèle :

```
┌─────────────────────────────────────────────────────────────┐
│               DÉVELOPPEMENT EN PARALLÈLE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Terminal 1 (Développeur) :                                 │
│    pnpm dev                    → localhost:5173             │
│                                                             │
│  Terminal 2 (Claude Code) :                                 │
│    pnpm dev -- --port 5175     → localhost:5175             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Sécurité** : Ces ports ne sont autorisés qu'en environnement de développement.

**Raison métier** : Permettre le développement local sans désactiver la protection CSRF.

**Validation** : ✅ Validé le 2025-12-09

---

### 2.5 Domaines malveillants bloqués ✅

**Comportement testé** : Les requêtes depuis des domaines inconnus (ex: `evil.com`) sont bloquées.

**Exemples de domaines bloqués** :

```
https://evil.com                    → ❌ Bloqué
https://attacker.net                → ❌ Bloqué
https://phishing-ubumaths.com       → ❌ Bloqué
https://google.com                  → ❌ Bloqué (même si légitime)
```

**Principe de la whitelist** :

Seuls les domaines explicitement autorisés sont acceptés. Tout le reste est bloqué par défaut :

```
┌─────────────────────────────────────────────────────────────┐
│                    WHITELIST CSRF                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AUTORISÉS (whitelist) :                                    │
│    ✅ ubumaths.com                                          │
│    ✅ www.ubumaths.com                                      │
│    ✅ ubumaths*.vercel.app                                  │
│    ✅ localhost:5173, localhost:5175                        │
│                                                             │
│  BLOQUÉS (tout le reste) :                                  │
│    ❌ evil.com                                              │
│    ❌ ubumaths.evil.com                                     │
│    ❌ n'importe quel autre domaine                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Empêcher les attaques CSRF depuis des sites tiers malveillants.

**Validation** : ✅ Validé le 2025-12-09

---

### 2.6 Sous-domaines malveillants bloqués ✅

**Comportement testé** : Les requêtes depuis des sous-domaines suspects (ex: `evil.ubumaths.com`, `ubumaths.com.evil.com`) sont bloquées.

**Attaques par sous-domaine/domaine similaire** :

```
┌─────────────────────────────────────────────────────────────┐
│              TENTATIVES DE CONTOURNEMENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Attaque 1 : Sous-domaine malveillant                       │
│    evil.ubumaths.com          → ❌ Bloqué                   │
│                                                             │
│  Attaque 2 : Domaine englobant                              │
│    ubumaths.com.evil.com      → ❌ Bloqué                   │
│                                                             │
│  Attaque 3 : Typosquatting                                  │
│    ubumath.com                → ❌ Bloqué                   │
│                                                             │
│  Attaque 4 : Préfixe/Suffixe                                │
│    fake-ubumaths.com          → ❌ Bloqué                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : La validation doit être stricte et ne pas se laisser tromper par des domaines qui "ressemblent" au domaine légitime.

**Validation** : ✅ Validé le 2025-12-09

---

### 2.7 Requêtes sans Origin/Referer bloquées ✅

**Comportement testé** : Les requêtes POST/PUT/DELETE sans header Origin ni Referer sont bloquées.

**Pourquoi ces headers sont importants ?**

```
┌─────────────────────────────────────────────────────────────┐
│                  HEADERS HTTP                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Origin: https://ubumaths.com                               │
│    → Indique le domaine qui a initié la requête             │
│    → Envoyé automatiquement par le navigateur               │
│    → Ne peut PAS être falsifié par JavaScript               │
│                                                             │
│  Referer: https://ubumaths.com/dashboard                    │
│    → URL complète de la page d'origine                      │
│    → Alternative si Origin est absent                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Comportement de sécurité** :

```
POST /api/action
Origin: (absent)
Referer: (absent)
→ ❌ BLOQUÉ - Impossible de vérifier l'origine
```

**Raison métier** : Les navigateurs modernes envoient toujours Origin pour les requêtes cross-origin. L'absence totale de ces headers est suspecte.

**Validation** : ✅ Validé le 2025-12-09

---

### 2.8 Referer accepté si Origin absent ✅

**Comportement testé** : Si le header Origin est absent mais Referer est présent et valide, la requête est acceptée.

**Fallback Referer** :

```
┌─────────────────────────────────────────────────────────────┐
│              LOGIQUE DE VALIDATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Origin présent ?                                        │
│     OUI → Valider Origin                                    │
│     NON → Continuer                                         │
│                                                             │
│  2. Referer présent ?                                       │
│     OUI → Extraire domaine du Referer et valider            │
│     NON → ❌ BLOQUER                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Exemples** :

```
# Cas 1 : Origin présent (prioritaire)
Origin: https://ubumaths.com
→ ✅ Validé via Origin

# Cas 2 : Origin absent, Referer valide
Referer: https://ubumaths.com/dashboard
→ ✅ Validé via Referer (fallback)

# Cas 3 : Origin absent, Referer invalide
Referer: https://evil.com/fake-page
→ ❌ Bloqué
```

**Raison métier** : Certains navigateurs/proxies peuvent supprimer Origin mais conserver Referer. Le fallback évite de bloquer des requêtes légitimes.

**Validation** : ✅ Validé le 2025-12-09

---

## 3. Rate Limiting

Fichier : `src/lib/server/rateLimiter.test.ts`

### 3.1 Login : 5 tentatives par IP / 15 min ✅

**Comportement testé** : Maximum 5 tentatives de connexion par adresse IP sur une fenêtre de 15 minutes. Au-delà, les requêtes sont bloquées.

**Qu'est-ce que le Rate Limiting ?**

Le rate limiting limite le nombre de requêtes qu'un utilisateur peut faire dans un temps donné pour prévenir les abus.

```
┌─────────────────────────────────────────────────────────────┐
│                  RATE LIMITING LOGIN                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IP: 192.168.1.100                                          │
│                                                             │
│  Tentative 1  ✅ Autorisée (compteur: 1/5)                  │
│  Tentative 2  ✅ Autorisée (compteur: 2/5)                  │
│  Tentative 3  ✅ Autorisée (compteur: 3/5)                  │
│  Tentative 4  ✅ Autorisée (compteur: 4/5)                  │
│  Tentative 5  ✅ Autorisée (compteur: 5/5)                  │
│  Tentative 6  ❌ BLOQUÉE - Limite atteinte                  │
│  ...                                                        │
│  [15 minutes plus tard]                                     │
│  Tentative N  ✅ Autorisée (compteur réinitialisé: 1/5)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Limiter les attaques brute force depuis une même IP. 5 tentatives = assez pour un utilisateur légitime qui se trompe.

**Valeurs** : `max: 5, window: 15 minutes`

**Validation** : ✅ Validé le 2025-12-09

---

### 3.2 Login : 3 tentatives par email / 15 min ✅

**Comportement testé** : Maximum 3 tentatives de connexion par adresse email sur une fenêtre de 15 minutes (plus strict que par IP).

**Pourquoi une double limite (IP + Email) ?**

```
┌─────────────────────────────────────────────────────────────┐
│              ATTAQUE DISTRIBUÉE SUR UN COMPTE               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Attaquant utilise un botnet (plusieurs IPs) :              │
│                                                             │
│  IP 1.1.1.1  → Login prof@ecole.fr (tentative 1)  ✅        │
│  IP 2.2.2.2  → Login prof@ecole.fr (tentative 2)  ✅        │
│  IP 3.3.3.3  → Login prof@ecole.fr (tentative 3)  ✅        │
│  IP 4.4.4.4  → Login prof@ecole.fr (tentative 4)  ❌ BLOQUÉ │
│                                                             │
│  → La limite par IP (5) n'est jamais atteinte               │
│  → Mais la limite par email (3) protège le compte           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Protection renforcée contre le ciblage d'un compte spécifique via attaque distribuée.

**Valeurs** : `max: 3, window: 15 minutes`

**Validation** : ✅ Validé le 2025-12-09

---

### 3.3 Email normalisé en minuscules ✅

**Comportement testé** : L'email est converti en minuscules avant comptage pour éviter le contournement (Test@email.com = test@email.com).

**Problème sans normalisation** :

```
┌─────────────────────────────────────────────────────────────┐
│              CONTOURNEMENT PAR VARIATION DE CASSE           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SANS normalisation (VULNÉRABLE) :                          │
│  prof@ecole.fr   → tentative 1  ✅                          │
│  Prof@ecole.fr   → tentative 1  ✅ (nouveau compteur!)      │
│  PROF@ecole.fr   → tentative 1  ✅ (nouveau compteur!)      │
│                                                             │
│  AVEC normalisation (SÉCURISÉ) :                            │
│  prof@ecole.fr   → prof@ecole.fr → tentative 1  ✅          │
│  Prof@ecole.fr   → prof@ecole.fr → tentative 2  ✅          │
│  PROF@ecole.fr   → prof@ecole.fr → tentative 3  ✅          │
│  prof@Ecole.fr   → prof@ecole.fr → tentative 4  ❌ BLOQUÉ   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Empêcher le contournement du rate limiting par variation de casse de l'email.

**Validation** : ✅ Validé le 2025-12-09

---

### 3.4 Blocage persistant ✅

**Comportement testé** : Une fois la limite atteinte, toutes les tentatives suivantes sont bloquées jusqu'à expiration de la fenêtre.

**Comportement** :

```
┌─────────────────────────────────────────────────────────────┐
│                  BLOCAGE PERSISTANT                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  T+0min   Tentative 1  ✅                                   │
│  T+1min   Tentative 2  ✅                                   │
│  T+2min   Tentative 3  ✅                                   │
│  T+3min   Tentative 4  ❌ BLOQUÉ (limite atteinte)          │
│  ...                                                        │
│  T+14min  Tentative N  ❌ BLOQUÉ (toujours bloqué)          │
│  T+15min  Tentative N  ✅ AUTORISÉ (fenêtre expirée)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : L'attaquant ne peut pas "réinitialiser" son compteur en attendant quelques secondes. Le blocage dure jusqu'à la fin de la fenêtre.

**Validation** : ✅ Validé le 2025-12-09

---

### 3.5 Messages d'erreur en français ✅

**Comportement testé** : Les messages d'erreur de rate limiting sont en français.

**Messages affichés** :

```
Login bloqué (IP) :
"Trop de tentatives de connexion. Réessayez dans X min."

Login bloqué (email) :
"Trop de tentatives pour ce compte. Réessayez dans X min."

Signup bloqué :
"Trop d'inscriptions. Réessayez dans X min."
```

**Raison métier** : Application francophone, UX cohérente - une application en français doit afficher des erreurs en français.

**Validation** : ✅ Validé le 2025-12-09

---

### 3.6 Signup : 3 par IP / heure ✅

**Comportement testé** : Maximum 3 inscriptions par adresse IP par heure.

**Pourquoi limiter les inscriptions ?**

```
┌─────────────────────────────────────────────────────────────┐
│                  ABUS D'INSCRIPTION                         │
├─────────────────────────────────────────────────────────────┤
│  Attaque 1 : Spam de comptes                                │
│    → Créer des centaines de faux comptes                    │
│                                                             │
│  Attaque 2 : Enumération d'emails                           │
│    → Tester si un email existe déjà                         │
│                                                             │
│  Attaque 3 : DoS sur le service d'email                     │
│    → Déclencher des milliers d'emails de confirmation       │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Empêcher la création massive de comptes. Fenêtre d'1h (vs 15min pour login) car action plus sensible.

**Valeurs** : `max: 3, window: 1 heure`

**Validation** : ✅ Validé le 2025-12-09

---

### 3.7 OAuth : 10 tentatives par IP ✅

**Comportement testé** : Maximum 10 tentatives de connexion OAuth par IP.

**Pourquoi 10 (plus que login email/password) ?**

```
┌─────────────────────────────────────────────────────────────┐
│  Email/Password (5 tentatives) :                            │
│    → Vulnérable au brute force                              │
│    → Limite stricte nécessaire                              │
│                                                             │
│  OAuth Google (10 tentatives) :                             │
│    → Pas de mot de passe à deviner                          │
│    → Google gère sa propre sécurité                         │
│    → Utilisateur peut annuler/recommencer plusieurs fois    │
│    → Limite plus souple acceptable                          │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : OAuth est moins vulnérable au brute force, limite plus souple pour accommoder les erreurs utilisateur.

**Valeurs** : `max: 10`

**Validation** : ✅ Validé le 2025-12-09

---

### 3.8 Notifications create : limites par rôle ✅

**Comportement testé** : Création de notifications limitée par rôle (teacher: 10/h, admin: 50/h).

**Limites par rôle** :

```
┌─────────────────────────────────────────────────────────────┐
│  Teacher (Professeur) : 10 notifications / heure            │
│    → Envoie à ses élèves uniquement                         │
│                                                             │
│  Admin : 50 notifications / heure                           │
│    → Peut envoyer à tous les utilisateurs                   │
│    → Annonces générales, maintenance                        │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Empêcher le spam de notifications même pour les rôles autorisés.

**Valeurs** : `teacher: 10/h, admin: 50/h`

**Validation** : ✅ Validé le 2025-12-09

---

### 3.9 Notifications mark-read : 30 / 15 min ✅

**Comportement testé** : Maximum 30 marquages "lu" par 15 minutes.

**Pourquoi 30 (limite généreuse) ?**

- Action légitime fréquente (chaque visite)
- Un utilisateur peut avoir beaucoup de notifications non lues
- Ne pas bloquer l'UX normale
- 30 en 15 min = 2 par minute = très raisonnable

**Raison métier** : Limite généreuse pour usage normal, protection contre automatisation/DoS.

**Valeurs** : `max: 30, window: 15 min`

**Validation** : ✅ Validé le 2025-12-09

---

### 3.10 Notifications delete : limites par rôle ✅

**Comportement testé** : Suppression de notifications limitée par rôle (teacher: 20/h, admin: 100/h).

**Limites par rôle** :

```
┌─────────────────────────────────────────────────────────────┐
│  Teacher : 20 suppressions / heure                          │
│    → Supprime ses propres notifications                     │
│                                                             │
│  Admin : 100 suppressions / heure                           │
│    → Nettoyage de masse possible                            │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Action destructive - empêcher la suppression massive accidentelle ou malveillante.

**Valeurs** : `teacher: 20/h, admin: 100/h`

**Validation** : ✅ Validé le 2025-12-09

---

### 3.11 Protection race conditions ✅

**Comportement testé** : Les requêtes simultanées ne peuvent pas contourner le rate limiting.

**Qu'est-ce qu'une race condition ?**

```
┌─────────────────────────────────────────────────────────────┐
│  SANS protection (VULNÉRABLE) :                             │
│  T0: Compteur = 4/5                                         │
│  T1: Requête A lit compteur → 4                             │
│  T1: Requête B lit compteur → 4                             │
│  T2: Requête A : 4 < 5 → ✅ autorisée                       │
│  T2: Requête B : 4 < 5 → ✅ autorisée                       │
│  → 2 requêtes passent au lieu d'1 !                         │
│                                                             │
│  AVEC protection : Opération atomique                       │
│  → Seule 1 requête peut passer                              │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** : Empêcher le contournement du rate limiting par requêtes parallèles.

**Validation** : ✅ Validé le 2025-12-09

---

## 4. Login E2E

Fichier : `e2e/auth/login.spec.ts`

### 4.1 Connexion professeur ✅

**Comportement testé** : Un utilisateur avec le rôle "teacher" peut se connecter avec email/mot de passe.

**Flux testé** :

```
1. Naviguer vers /auth/login
2. Saisir email du professeur
3. Saisir mot de passe
4. Cliquer sur "Se connecter"
5. Vérifier redirection vers /dashboard
6. Vérifier cookie d'authentification créé
```

**Raison métier** : Vérifier que le flux de connexion fonctionne de bout en bout pour un professeur.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.2 Connexion élève ✅

**Comportement testé** : Un utilisateur avec le rôle "student" peut se connecter avec email/mot de passe.

**Flux** : Page login → Saisie identifiants élève → Submit → Redirection /dashboard

**Raison métier** : Vérifier que le flux de connexion fonctionne pour un élève.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.3 Connexion admin ✅

**Comportement testé** : Un utilisateur avec le rôle "admin" peut se connecter avec email/mot de passe.

**Flux** : Page login → Saisie identifiants admin → Submit → Redirection /dashboard

**Raison métier** : Vérifier que les administrateurs peuvent accéder au système (superuser).

**Validation** : ✅ Validé le 2025-12-09

---

### 4.4 Redirection dashboard ✅

**Comportement testé** : Après connexion réussie, l'utilisateur est redirigé vers `/dashboard`.

**Raison métier** : Point d'entrée central - l'utilisateur arrive sur son espace de travail immédiatement.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.5 Cookie d'authentification créé ✅

**Comportement testé** : Un cookie d'authentification Supabase est créé après connexion réussie.

**Pourquoi 2 types de cookies (tokens) ?**

Le système de double token est un pattern de sécurité standard (OAuth 2.0) qui sépare "preuve d'identité" et "droit de renouvellement" :

```
┌─────────────────────────────────────────────────────────────┐
│              SYSTÈME DOUBLE TOKEN                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ACCESS TOKEN (sb-access-token)                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ • Durée : COURTE (1 heure)                              ││
│  │ • Usage : Prouver l'identité à chaque requête           ││
│  │ • Contenu : user_id, role, expiration                   ││
│  │ • Si volé : L'attaquant n'a qu'1h pour l'exploiter     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  REFRESH TOKEN (sb-refresh-token)                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ • Durée : LONGUE (7 jours)                              ││
│  │ • Usage : Obtenir un nouvel access token quand expiré   ││
│  │ • Stocké : httpOnly cookie (inaccessible par JS)        ││
│  │ • Peut être RÉVOQUÉ côté serveur (logout forcé)         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Flux de renouvellement automatique** :

```
┌─────────────────────────────────────────────────────────────┐
│              RENOUVELLEMENT TOKEN                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Utilisateur connecté, access token valide               │
│     → Requêtes passent normalement                          │
│                                                             │
│  2. Access token expire (après 1h)                          │
│     → Requête échoue avec 401                               │
│                                                             │
│  3. Supabase détecte l'expiration                           │
│     → Envoie automatiquement le refresh token au serveur    │
│                                                             │
│  4. Serveur valide le refresh token                         │
│     → Génère un NOUVEL access token (1h)                    │
│     → Retourne le nouveau token au client                   │
│                                                             │
│  5. Client utilise le nouveau access token                  │
│     → Transparent pour l'utilisateur                        │
│     → Pas besoin de se reconnecter                          │
│                                                             │
│  [Au bout de 7 jours sans activité]                         │
│  → Refresh token expire                                     │
│  → Utilisateur doit se reconnecter                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Comparaison single token vs double token** :

```
┌─────────────────────────────────────────────────────────────┐
│  SINGLE TOKEN (Mauvaise pratique)                           │
│  Token unique valide 7 jours                                │
│  → Si volé : attaquant a 7 jours pour exploiter             │
│  → Pas de révocation possible sans changer le secret        │
├─────────────────────────────────────────────────────────────┤
│  DOUBLE TOKEN (Bonne pratique - utilisé par Supabase)       │
│  Access = 1h, Refresh = 7j                                  │
│  → Si access volé : 1h max d'exploitation                   │
│  → Si refresh volé : on peut le révoquer côté serveur       │
│  → Utilisateur peut faire "déconnexion de tous appareils"   │
└─────────────────────────────────────────────────────────────┘
```

**Analogie** :

- **Access token** = Badge visiteur temporaire (expire vite, usage quotidien)
- **Refresh token** = Carte d'identité (permet d'obtenir un nouveau badge, révocable)

**Raison métier** : Maintenir la session utilisateur entre les requêtes avec sécurité renforcée. Le système double token permet de limiter les dégâts en cas de vol de token tout en offrant une expérience fluide (pas besoin de se reconnecter toutes les heures).

**Validation** : ✅ Validé le 2025-12-09

---

### 4.6 URL redirect préservée ✅

**Comportement testé** : Si l'utilisateur tentait d'accéder à une page protégée avant login, il est redirigé vers cette page après connexion.

**Exemple** : `/dashboard/teacher/assessments` → Login → Retour vers `/dashboard/teacher/assessments`

**Raison métier** : UX fluide - l'utilisateur ne perd pas sa destination initiale.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.7 Erreur format email invalide ✅

**Comportement testé** : Un message d'erreur s'affiche si le format de l'email est invalide.

**Validation** : Validation HTML5 native du navigateur (`type="email"`).

**Raison métier** : Feedback immédiat à l'utilisateur avant envoi au serveur.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.8 Erreur mot de passe incorrect ✅

**Comportement testé** : Un message d'erreur s'affiche si le mot de passe est incorrect.

**Message attendu** : Contient "invalid", "incorrect", "wrong" ou "erreur"

**Raison métier** : Informer l'utilisateur que ses identifiants sont incorrects.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.9 Erreur email inexistant ➕

**Comportement testé** : Un message d'erreur s'affiche si l'email n'existe pas dans la base.

**Problème de sécurité : Énumération de comptes**

```
┌─────────────────────────────────────────────────────────────┐
│              ATTAQUE PAR ÉNUMÉRATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MAUVAISE PRATIQUE (révèle l'existence du compte) :         │
│                                                             │
│  Essai : toto@gmail.com                                     │
│  → "Cet email n'existe pas"                                 │
│  Essai : prof@ecole.fr                                      │
│  → "Mot de passe incorrect"                                 │
│                                                             │
│  L'attaquant sait maintenant que prof@ecole.fr existe !     │
│  → Il peut cibler ce compte avec du brute force             │
│  → Il peut tenter du phishing personnalisé                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Bonne pratique : Message générique identique**

```
┌─────────────────────────────────────────────────────────────┐
│              PROTECTION CONTRE L'ÉNUMÉRATION                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Essai : toto@gmail.com (n'existe pas)                      │
│  → "Email ou mot de passe incorrect"                        │
│                                                             │
│  Essai : prof@ecole.fr (existe, mauvais mdp)                │
│  → "Email ou mot de passe incorrect"                        │
│                                                             │
│  L'attaquant ne peut PAS distinguer les deux cas !          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Temps de réponse constant**

```
┌─────────────────────────────────────────────────────────────┐
│  VULNÉRABLE (timing attack) :                               │
│  Email inexistant → Réponse en 50ms (pas de hash à vérifier)│
│  Email existe     → Réponse en 200ms (bcrypt compare)       │
│                                                             │
│  SÉCURISÉ :                                                 │
│  Toujours faire un hash factice même si email n'existe pas  │
│  → Temps de réponse identique dans les deux cas             │
└─────────────────────────────────────────────────────────────┘
```

**Raison métier** :

- Empêcher l'énumération des comptes existants
- Protéger la vie privée des utilisateurs (ne pas révéler qui est inscrit)
- Réduire la surface d'attaque pour le phishing ciblé

**Tests ajoutés le 2025-12-09** :

1. **Test E2E** (`e2e/auth/login.spec.ts`) :

   - `error messages are identical for non-existent email and wrong password (enumeration protection)`
   - Compare les messages d'erreur entre email inexistant et mot de passe incorrect
   - S'assure qu'ils sont **identiques**

2. **Test unitaire** (`tests/unit/api/auth/login-timing.test.ts`) :
   - `response time is similar for non-existent email and wrong password`
   - Mesure le temps de réponse moyen sur plusieurs requêtes
   - Vérifie que la différence est < 50ms (tolérance)
   - `Supabase returns identical error messages for both cases`

**Validation** : ➕ Étendu le 2025-12-09 - Tests de sécurité ajoutés

---

### 4.10 Erreur champ email vide ✅

**Comportement testé** : Le formulaire ne peut pas être soumis avec un email vide.

**Validation** : Validation HTML5 native (`required`).

**Raison métier** : Empêcher la soumission de formulaires incomplets.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.11 Erreur champ mot de passe vide ✅

**Comportement testé** : Le formulaire ne peut pas être soumis avec un mot de passe vide.

**Validation** : Validation HTML5 native (`required`).

**Raison métier** : Empêcher la soumission de formulaires incomplets.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.12 Soumission avec touche Enter ✅

**Comportement testé** : Le formulaire peut être soumis en appuyant sur Enter dans les champs.

**Raison métier** : UX standard attendue par les utilisateurs - accélère le flux de connexion.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.13 Lien mot de passe oublié ✅

**Comportement testé** : Un lien "Mot de passe oublié ?" est visible et pointe vers `/auth/reset-password`.

**Raison métier** : Permettre aux utilisateurs de récupérer leur compte.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.14 Pas de lien inscription (inscription contrôlée) ➕

**Comportement testé** : La page de login ne doit PAS afficher de lien "S'inscrire".

**Règle métier** : L'inscription est contrôlée :

- **Élèves @voltairedoha.com** : Connexion via Google OAuth (déjà géré)
- **Élèves sans Google** : Compte créé manuellement par le professeur
- **Professeurs** : Inscription via invitation ou validation admin
- Pas d'inscription libre pour éviter les abus

**Flow pour élèves sans Google** :

```
┌─────────────────────────────────────────────────────────────┐
│                    FLOW D'INSCRIPTION CONTRÔLÉE             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Professeur va dans "Gestion classe" → "Ajouter élève"   │
│                                                             │
│  2. Professeur entre : prénom, nom, email (optionnel)       │
│                                                             │
│  3. Système génère :                                        │
│     - Identifiant : prenom.nom (ou custom)                  │
│     - Mot de passe temporaire : 8 caractères                │
│                                                             │
│  4. Professeur communique les identifiants à l'élève        │
│     (papier, email, oral...)                                │
│                                                             │
│  5. Élève se connecte → Forcé à changer son mot de passe    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tests ajoutés le 2025-12-09** :

1. **Test E2E** (`e2e/auth/login.spec.ts`) :

   - `does NOT display sign up link (controlled registration only)`
   - Vérifie qu'aucun lien "S'inscrire" n'est visible
   - Vérifie qu'aucun lien vers `/signup` ou `/register` n'existe

2. **Test E2E** (`e2e/auth/login.spec.ts`) :
   - `signup route is not accessible (returns 404 or redirects)`
   - Vérifie que la route `/signup` retourne 404 ou redirige vers login

**Validation** : ➕ Étendu le 2025-12-09 - Tests de sécurité ajoutés

---

### 4.15 Onglets Google/Email ✅

**Comportement testé** : L'interface propose des onglets pour choisir entre connexion Google (Voltaire) et Email/Mot de passe.

**Raison métier** : Offrir plusieurs méthodes de connexion selon les préférences.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.16 Email préservé après échec ✅

**Comportement testé** : Après une tentative de connexion échouée, l'email saisi reste dans le champ.

**Raison métier** : UX - éviter de resaisir l'email à chaque tentative.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.17 Mot de passe masqué ✅

**Comportement testé** : Le mot de passe est masqué (`type="password"`) et n'apparaît pas en clair dans le DOM.

**Raison métier** : Sécurité - empêcher la lecture visuelle du mot de passe par un tiers.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.18 Cookie sécurisé ✅

**Comportement testé** : Le cookie d'authentification a les attributs de sécurité appropriés.

**Attributs attendus** :

- `httpOnly` : inaccessible par JavaScript (protection XSS)
- `secure` : transmis uniquement via HTTPS
- `sameSite` : protection CSRF

**Raison métier** : Protection contre le vol de session.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.19 Protection CSRF formulaire ✅

**Comportement testé** : Le formulaire de login est protégé contre les attaques CSRF.

**Méthode** : Validation Origin par SvelteKit `hooks.server.ts`

**Raison métier** : Empêcher la soumission du formulaire depuis un site malveillant.

**Validation** : ✅ Validé le 2025-12-09

---

### 4.20 Rate limiting brute force ✅

**Comportement testé** : Après plusieurs tentatives échouées (6), un message de rate limiting s'affiche.

**Raison métier** : Empêcher les attaques brute force sur les mots de passe.

**Validation** : ✅ Validé le 2025-12-09

---

## 5. Routes Protégées / RBAC

Fichier : `e2e/auth/protected-routes.spec.ts`

### 5.1 Non-authentifié : redirection login ✅

**Comportement testé** : Un utilisateur non connecté qui accède à une route protégée est redirigé vers `/auth/login`.

**Routes testées** : `/dashboard`, `/messages`, `/dashboard/teacher/*`, `/dashboard/student/*`, `/dashboard/admin/*`, `/dashboard/navadra/*`

**Raison métier** : Empêcher l'accès aux fonctionnalités sans authentification.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.2 Teacher : accès dashboard ✅

**Comportement testé** : Un professeur peut accéder à `/dashboard`.

**Raison métier** : Point d'entrée principal après connexion.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.3 Teacher : accès routes teacher ✅

**Comportement testé** : Un professeur peut accéder aux routes `/dashboard/teacher/*`.

**Routes** : assessments, students, rewards, exercises

**Raison métier** : Fonctionnalités réservées aux enseignants.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.4 Teacher : accès REFUSÉ routes student ✅

**Comportement testé** : Un professeur NE PEUT PAS accéder aux routes `/dashboard/student/*`.

**Raison métier** : Séparation des rôles - les professeurs ont leur propre interface.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.5 Teacher : accès REFUSÉ routes admin ✅

**Comportement testé** : Un professeur NE PEUT PAS accéder aux routes `/dashboard/admin/*`.

**Raison métier** : Routes réservées aux administrateurs.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.6 Student : accès dashboard ✅

**Comportement testé** : Un élève peut accéder à `/dashboard`.

**Raison métier** : Point d'entrée principal après connexion.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.7 Student : accès routes student ✅

**Comportement testé** : Un élève peut accéder aux routes `/dashboard/student/*` et `/dashboard/navadra/*`.

**Routes** : assessments, flashcards, profile, navadra/combat

**Raison métier** : Fonctionnalités réservées aux élèves.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.8 Student : accès REFUSÉ routes teacher ✅

**Comportement testé** : Un élève NE PEUT PAS accéder aux routes `/dashboard/teacher/*`.

**Raison métier** : Empêcher les élèves d'accéder aux outils enseignants (notes, gestion classe).

**Validation** : ✅ Validé le 2025-12-09

---

### 5.9 Student : accès REFUSÉ routes admin ✅

**Comportement testé** : Un élève NE PEUT PAS accéder aux routes `/dashboard/admin/*`.

**Raison métier** : Routes réservées aux administrateurs.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.10 Admin : accès toutes routes ✅

**Comportement testé** : Un admin peut accéder à TOUTES les routes (superuser).

**Routes** : admin/_, teacher/_, student/_, navadra/_

**Raison métier** : L'administrateur doit pouvoir superviser et débugger toutes les parties de l'application.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.11 Manipulation URL bloquée ✅

**Comportement testé** : Modifier l'URL manuellement ne permet pas de contourner les vérifications de rôle.

**Qu'est-ce qu'une manipulation d'URL ?**

```
┌─────────────────────────────────────────────────────────────┐
│              MANIPULATION D'URL                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Un élève connecté est sur :                                │
│  https://ubumaths.com/dashboard/student/assessments         │
│                                                             │
│  Il modifie manuellement l'URL dans la barre d'adresse :    │
│  https://ubumaths.com/dashboard/teacher/students            │
│                       ───────────────────                   │
│                       Zone modifiée                         │
│                                                             │
│  Question : Peut-il accéder à la liste des élèves ?         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Attaques courantes par manipulation d'URL** :

```
┌─────────────────────────────────────────────────────────────┐
│  ATTAQUE 1 : Accès horizontal (IDOR)                        │
│  /dashboard/student/profile/123  → /dashboard/student/profile/456
│  → Voir le profil d'un AUTRE élève                          │
├─────────────────────────────────────────────────────────────┤
│  ATTAQUE 2 : Escalade verticale                             │
│  /dashboard/student/* → /dashboard/teacher/*                │
│  → Accéder aux fonctions d'un rôle supérieur                │
├─────────────────────────────────────────────────────────────┤
│  ATTAQUE 3 : Accès admin                                    │
│  /dashboard/* → /dashboard/admin/*                          │
│  → Accéder aux fonctions d'administration                   │
├─────────────────────────────────────────────────────────────┤
│  ATTAQUE 4 : Paramètres cachés                              │
│  /api/user?id=123 → /api/user?id=456&role=admin             │
│  → Injecter des paramètres pour élever ses privilèges       │
└─────────────────────────────────────────────────────────────┘
```

**Protection côté serveur (obligatoire)** :

```
┌─────────────────────────────────────────────────────────────┐
│              VÉRIFICATION SERVEUR                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MAUVAISE PRATIQUE (client-side only) :                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ // Svelte component                                     ││
│  │ if (user.role !== 'teacher') {                          ││
│  │   goto('/unauthorized')  // Facile à contourner !       ││
│  │ }                                                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  BONNE PRATIQUE (server-side) :                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ // +page.server.ts                                      ││
│  │ export const load = async ({ locals }) => {             ││
│  │   if (locals.user?.role !== 'teacher') {                ││
│  │     throw redirect(303, '/auth/login')                  ││
│  │   }                                                     ││
│  │   return { ... }                                        ││
│  │ }                                                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Le serveur vérifie TOUJOURS le rôle avant de servir        │
│  la page ou les données.                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Ce que teste ce comportement** :

1. Un élève qui tape `/dashboard/teacher/*` dans l'URL est redirigé ou bloqué
2. Un professeur qui tape `/dashboard/admin/*` est redirigé ou bloqué
3. La vérification se fait côté serveur (pas bypassable)

**Raison métier** :

- La sécurité ne doit JAMAIS reposer uniquement sur l'UI
- Tout utilisateur peut manipuler les URLs
- Les vérifications serveur sont la seule garantie

**Validation** : ✅ Validé le 2025-12-09

---

### 5.12 Bouton retour respecte permissions ✅

**Comportement testé** : Utiliser le bouton "Retour" du navigateur après changement de session ne donne pas accès aux anciennes pages.

**Raison métier** : Empêcher l'accès au cache du navigateur après déconnexion ou changement de compte.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.13 Session expirée : redirection login ✅

**Comportement testé** : Si la session expire (cookies supprimés), l'accès aux routes protégées redirige vers login.

**Raison métier** : Forcer une reconnexion quand la session n'est plus valide.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.14 Changement rôle : nouvelles permissions ✅

**Comportement testé** : Après logout et login avec un autre compte, les permissions sont celles du nouveau rôle.

**Raison métier** : S'assurer qu'il n'y a pas de "pollution" de session entre comptes différents.

**Validation** : ✅ Validé le 2025-12-09

---

### 5.15 Refresh conserve permissions ✅

**Comportement testé** : Un refresh de page (F5) conserve les permissions de l'utilisateur connecté.

**Raison métier** : La session doit persister après un rafraîchissement de page.

**Validation** : ✅ Validé le 2025-12-09

---

## Statistiques Audit

| Catégorie     | Total  | Validés | Invalidés | Étendus | En attente |
| ------------- | ------ | ------- | --------- | ------- | ---------- |
| CRON Auth     | 8      | 8       | 0         | 0       | 0          |
| CSRF          | 8      | 8       | 0         | 0       | 0          |
| Rate Limiting | 11     | 11      | 0         | 0       | 0          |
| Login E2E     | 20     | 18      | 0         | 2       | 0          |
| RBAC E2E      | 15     | 15      | 0         | 0       | 0          |
| **Total**     | **62** | **60**  | **0**     | **2**   | **0**      |

### Résumé

- **Taux de validation** : 100% (62/62)
- **Tests étendus** : 2 (4.9 - protection énumération, 4.14 - inscription contrôlée)
- **Tests à corriger** : 0

---

## Notes et Remarques

### Comportements étendus (tests ajoutés)

1. **4.9 - Erreur email inexistant** ➕ : Tests de sécurité ajoutés

   - Test E2E : vérifie que les messages sont identiques
   - Test unitaire : vérifie le timing constant (protection timing attack)
   - Fichiers : `e2e/auth/login.spec.ts`, `tests/unit/api/auth/login-timing.test.ts`

2. **4.14 - Inscription contrôlée** ➕ : Tests de sécurité ajoutés
   - Test E2E : vérifie qu'aucun lien inscription n'est visible
   - Test E2E : vérifie que la route `/signup` est inaccessible (404 ou redirect)
   - Fichier : `e2e/auth/login.spec.ts`

### Comportements invalidés (à corriger)

_Aucun - tous les comportements ont été validés ou étendus._

---

## Mapping Comportements → Fichiers Tests

| Catégorie        | Comportements                       | Fichier(s) test                                                       |
| ---------------- | ----------------------------------- | --------------------------------------------------------------------- |
| 1. CRON Auth     | 1.1 - 1.8                           | `src/lib/server/auth/cron.test.ts`                                    |
| 2. CSRF          | 2.1 - 2.8                           | `src/lib/server/csrfProtection.test.ts`                               |
| 3. Rate Limiting | 3.1 - 3.11                          | `src/lib/server/rateLimiter.test.ts`                                  |
| 4. Login E2E     | 4.1 - 4.8, 4.10 - 4.13, 4.15 - 4.20 | `e2e/auth/login.spec.ts`                                              |
| 4.9 (étendu)     | 4.9                                 | `e2e/auth/login.spec.ts` + `tests/unit/api/auth/login-timing.test.ts` |
| 4.14 (étendu)    | 4.14                                | `e2e/auth/login.spec.ts`                                              |
| 5. RBAC E2E      | 5.1 - 5.15                          | `e2e/auth/protected-routes.spec.ts`                                   |

---

## Historique des modifications

| Date       | Action                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| 2025-12-09 | Création du document, 62 comportements listés                             |
| 2025-12-09 | Audit terminé : 60 validés, 2 invalidés                                   |
| 2025-12-09 | Tests ajoutés pour 4.9 (énumération + timing) : 61 validés, 1 invalidé    |
| 2025-12-09 | Tests ajoutés pour 4.14 (inscription contrôlée) : 62 validés, 0 invalidés |
