# API d'authentification — UbuMaths

Référence des surfaces publiques d'authentification et d'autorisation.
Le code et les commentaires sont en anglais (langue technique du projet) ;
les messages d'erreur destinés à l'UI sont en français.

Deux processus distincts, chaque fonction étiquetée **[P1]** ou **[P2]** :

- **Process 1 — Supabase Auth** : session, RBAC, chargement de profil. Source de
  vérité des rôles = table `profiles` (jamais le JWT, jamais le client).
- **Process 2 — Google OAuth** : couche d'autorisation Classroom / Drive
  par-dessus la session Supabase (PKCE, échange/refresh de tokens, chiffrement).

Voir [`tests.md`](./tests.md) pour l'état de la couverture (et ses lacunes).

---

## 1. RBAC / session — Process 1

> **Doublon homonyme à connaître.** `requireAuth` et `requireRole` existent en
> **deux versions** :
>
> | Module                           | Signe d'appel                 | Comportement à l'échec                     | Usage                                                                                            |
> | -------------------------------- | ----------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
> | `$lib/server/auth.ts`            | `(user)` / `(profile, roles)` | `throw redirect(303)` / `throw error(403)` | **Load functions** (`+page.server.ts`, `+layout.server.ts`) — on a déjà `user`/`profile` en main |
> | `$lib/server/middleware/auth.ts` | `(locals)` / `(locals, role)` | `throw error(401/403)`                     | **Endpoints API** (`+server.ts`) — fait lui-même `safeGetSession()` + fetch profil               |
>
> **Règle** : dans une **load function**, utiliser `auth.ts` (redirige vers le
> login). Dans un **endpoint API** (`+server.ts`), utiliser `middleware/auth.ts`
> (renvoie `{ user, profile }` et lève 401/403). Ne pas mélanger les imports.

### Types partagés

```typescript
// $lib/server/middleware/auth.ts
export type UserRole = 'student' | 'teacher' | 'admin';
export type Profile = Database['public']['Tables']['profiles']['Row'];
export interface AuthResult {
	user: import('@supabase/supabase-js').User;
	profile: Profile;
}
```

---

### 1.1 `safeGetSession()` — [P1]

Méthode exposée sur `event.locals` par le hook `src/lib/server/supabase.ts`.
Vérifie l'utilisateur **auprès du serveur d'auth Supabase** via `getUser()` (ne
fait jamais confiance aux cookies seuls). Timeout 15 s → fallback `{ user: null }`.

```typescript
locals.safeGetSession: () => Promise<{ user: User | null }>
```

- **Retourne** : `{ user }` vérifié, ou `{ user: null }` si non authentifié /
  erreur / timeout. **Ne throw jamais.**

---

### 1.2 `getUserProfile(supabase, userId)` — [P1]

```typescript
// $lib/server/auth.ts
export async function getUserProfile(
	supabase: SupabaseClient<Database>,
	userId: string
): Promise<Profile | null>;
```

Récupère le profil complet (dont `role`) depuis `profiles`. Timeout 10 s.

- **Retourne** : le `Profile`, ou `null` si introuvable / erreur / timeout
  (journalisé, **ne throw pas**).

---

### 1.3 `requireAuth(user)` — load function — [P1]

```typescript
// $lib/server/auth.ts
export function requireAuth(user: { id: string } | null): void;
```

- **Throws** : `redirect(303, '/auth/login')` si `user` est `null`/`undefined`.
- **Sinon** : ne fait rien (l'appelant continue).

```typescript
// /dashboard/+layout.server.ts
const { user } = await locals.safeGetSession();
requireAuth(user); // redirige vers le login si non connecté
```

---

### 1.4 `requireRole(profile, allowedRoles)` — load function — [P1]

```typescript
// $lib/server/auth.ts
export function requireRole(profile: Profile | null, allowedRoles: UserRole | UserRole[]): void;
```

Accepte un rôle unique **ou** un tableau (logique OR). Aucune hiérarchie implicite.

- **Throws** :
  - `error(403, 'Access denied: No profile found')` si `profile` est `null`.
  - `error(403, 'Access denied: This page requires {roles} role')` si le rôle
    n'est pas dans `allowedRoles`.
- **Sinon** : ne fait rien.

```typescript
const { profile } = await parent();
requireRole(profile, ['teacher', 'admin']); // 403 pour les autres
```

---

### 1.5 `hasRole(profile, role)` / `hasAnyRole(profile, roles)` — [P1]

```typescript
// $lib/server/auth.ts — helpers NON bloquants (pas de throw)
export function hasRole(profile: Profile | null, role: UserRole): boolean;
export function hasAnyRole(profile: Profile | null, roles: UserRole[]): boolean;
```

- `hasRole` → `true` si `profile?.role === role`.
- `hasAnyRole` → `false` si `profile` est `null`, sinon `roles.includes(profile.role)`.

```svelte
{#if hasAnyRole(data.profile, ['teacher', 'admin'])}<button>Réglages avancés</button>{/if}
```

---

### 1.6 `requireAuth(locals)` — endpoint API — [P1]

```typescript
// $lib/server/middleware/auth.ts
export async function requireAuth(locals: App.Locals): Promise<AuthResult>;
```

Vérifie la session **et** charge le profil (fetch `profiles`). À utiliser dans les
`+server.ts`.

- **Retourne** : `{ user, profile }`.
- **Throws** :
  - `error(401, 'Non autorisé - Authentification requise')` si pas de session.
  - `error(403, 'Profil utilisateur introuvable')` si le profil n'existe pas.

```typescript
const { user, profile } = await requireAuth(locals);
return json({ userId: user.id, role: profile.role });
```

---

### 1.7 `requireRole(locals, role)` / `requireRoles(locals, roles)` — endpoint API — [P1]

```typescript
// $lib/server/middleware/auth.ts
export async function requireRole(locals: App.Locals, role: UserRole): Promise<AuthResult>;
export async function requireRoles(locals: App.Locals, roles: UserRole[]): Promise<AuthResult>;
```

`requireRole` exige un rôle unique ; `requireRoles` accepte un tableau (OR).

- **Retournent** : `{ user, profile }`.
- **Throws** :
  - `error(401, …)` si pas de session.
  - `error(403, 'Interdit - {RoleFR} uniquement')` si rôle non autorisé.
    Noms FR : `student → Élèves`, `teacher → Enseignants`, `admin → Administrateurs`.
    `requireRoles` joint la liste : `Interdit - Enseignants, Administrateurs uniquement`.

```typescript
const { user, profile } = await requireRole(locals, 'teacher'); // enseignants seuls
const { profile } = await requireRoles(locals, ['teacher', 'admin']); // teachers OU admins
```

---

### 1.8 `verifyCronAuth(request)` — [P1]

```typescript
// $lib/server/auth/cron.ts
export function verifyCronAuth(request: Request): void;
export function generateCronSecret(): string;
```

Protège les endpoints déclenchés par Vercel Cron via un secret partagé. Compare
l'en-tête `Authorization: Bearer <CRON_SECRET>` en **temps constant** (garde
anti-timing par longueur puis valeur). `Bearer` insensible à la casse.

- **Throws** :
  - `error(503, 'CRON endpoints disabled: CRON_SECRET not configured')` (fail-secure).
  - `error(401, …)` si en-tête manquant, format invalide, ou token erroné.
- `generateCronSecret()` → string hex de 32 caractères (génération du secret).

```typescript
export const POST: RequestHandler = async ({ request }) => {
	verifyCronAuth(request); // 401/503 si non autorisé
};
```

---

## 2. Google OAuth — Process 2

OAuth 2.0 Authorization Code Flow **avec PKCE**. Couche d'autorisation qu'un
enseignant connecte pour Classroom + Drive ; **n'authentifie pas** l'utilisateur
UbuMaths (c'est le rôle du Process 1).

### Constantes & scopes

```typescript
// $lib/server/google/oauth.ts
export const GOOGLE_CLASSROOM_SCOPES: readonly string[]; // openid, email, profile,
//   classroom.courses.readonly, classroom.topics.readonly,
//   classroom.coursework.students.readonly, classroom.courseworkmaterials,
//   drive.file, gmail.send
export const REQUIRED_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
```

---

### 2.1 `getAuthUrl(state?)` — [P2]

```typescript
export async function getAuthUrl(state?: string): Promise<{ url: string; codeVerifier: string }>;
```

Génère l'URL d'autorisation Google et un **code verifier PKCE** (challenge S256,
`access_type=offline`, `prompt=consent` pour garantir un refresh token). Le `state`
optionnel sert de jeton anti-CSRF.

- **Retourne** : `{ url, codeVerifier }`. **Stocker `codeVerifier` en cookie
  httpOnly** côté serveur, puis rediriger vers `url`.

---

### 2.2 `exchangeCodeForTokens(code, codeVerifier)` — [P2]

```typescript
export async function exchangeCodeForTokens(
	code: string,
	codeVerifier: string
): Promise<GoogleOAuthTokenResponse>;
```

Échange le code d'autorisation (reçu sur le callback) contre les tokens. Réponse
validée par Zod.

- **Retourne** : `{ access_token, expires_in, refresh_token?, scope, token_type }`.
- **Throws** : `Error('Google OAuth error: … (STATUS)')` sur erreur API,
  `Error('Invalid token response: …')` si la réponse ne valide pas le schéma.

#### Exemple connect → callback

```typescript
// /api/google/auth/connect — étape 1
const state = crypto.randomUUID(); // CSRF
const { url, codeVerifier } = await getAuthUrl(state);
cookies.set('google_oauth_state', state, { httpOnly: true, secure: true, path: '/' });
cookies.set('google_code_verifier', codeVerifier, { httpOnly: true, secure: true, path: '/' });
throw redirect(302, url);

// /api/google/auth/callback — étape 2
if (url.searchParams.get('state') !== cookies.get('google_oauth_state')) throw error(403, 'CSRF');
const tokens = await exchangeCodeForTokens(
	url.searchParams.get('code')!,
	cookies.get('google_code_verifier')!
);
// Stockage CHIFFRÉ en base (voir §2.6)
await supabase.from('google_integrations').insert({
	teacher_id: userId,
	access_token: encryptToken(tokens.access_token),
	refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
	token_expiry: new Date(Date.now() + tokens.expires_in * 1000),
	scopes: tokens.scope.split(' ')
});
```

---

### 2.3 `refreshAccessToken(refreshToken)` — [P2]

```typescript
export async function refreshAccessToken(
	refreshToken: string
): Promise<{ access_token: string; expires_in: number }>;
```

Rafraîchit un access token expiré. Ne renvoie pas de nouveau refresh token.

- **Retourne** : `{ access_token, expires_in }`.
- **Throws** : `Error('Refresh token is invalid or revoked. User must re-authorize
the application.')` sur `invalid_grant` ; sinon `Error('Google OAuth error: …')`.

```typescript
if (shouldRefreshToken(integration.token_expiry)) {
	const { access_token, expires_in } = await refreshAccessToken(
		decryptToken(integration.refresh_token)
	);
	await supabase
		.from('google_integrations')
		.update({
			access_token: encryptToken(access_token),
			token_expiry: new Date(Date.now() + expires_in * 1000)
		})
		.eq('teacher_id', userId);
}
```

---

### 2.4 `revokeAccess(token)` — [P2]

```typescript
export async function revokeAccess(token: string): Promise<boolean>;
```

Révoque l'access **et** le refresh token côté Google (best-effort).

- **Retourne** : `true` si la révocation a réussi (Google renvoie 200 même si déjà
  révoqué), `false` sur erreur réseau. **Ne throw pas.**

```typescript
const ok = await revokeAccess(decryptToken(integration.access_token));
if (ok) await supabase.from('google_integrations').delete().eq('teacher_id', userId);
```

---

### 2.5 `hasRequiredDriveScope(scopes)` — [P2]

```typescript
export function hasRequiredDriveScope(scopes: string[] | null): boolean;
```

Indique si l'utilisateur a accordé le scope `drive.file` requis pour la sync
whiteboard.

- **Retourne** : `false` si `scopes` est `null`, sinon
  `scopes.includes(REQUIRED_DRIVE_SCOPE)`.

```typescript
if (!hasRequiredDriveScope(integration.scopes))
	throw error(403, 'Veuillez reconnecter Google avec accès Drive.');
```

> Helpers connexes du même module (non détaillés ici) : `validateToken`,
> `shouldRefreshToken(tokenExpiry)`, `parseGoogleAPIError(error)`.

---

### 2.6 `encryptToken` / `decryptToken` — [P2]

```typescript
// $lib/server/google/encryption.ts
export function encryptToken(token: string): string;
export function decryptToken(encryptedToken: string): string;
```

Chiffrement **AES-256-GCM** des tokens OAuth avant stockage en base. Clé dérivée
(SHA-256) de `GOOGLE_TOKEN_ENCRYPTION_KEY`. Format combiné base64 :
`[IV 16o][AuthTag 16o][données chiffrées]`.

- `encryptToken` → base64 (IV + auth tag + payload). **Throws** :
  `'Token cannot be empty'` ; `'Failed to encrypt token: …'` (clé manquante /
  < 32 caractères, levée par la dérivation de clé).
- `decryptToken` → token en clair. **Throws** : `'Encrypted token cannot be empty'` ;
  `'Invalid encrypted token format: too short'` ; `'Failed to decrypt token: …'`
  (auth tag invalide, clé erronée).

```typescript
const encrypted = encryptToken(tokens.access_token); // avant insert en base
const token = decryptToken(integration.access_token); // avant appel API Drive
```

> Helpers connexes du module : `hashToken(token)` (SHA-256 hex, comparaison
> one-way), `validateEncryptionKey()`, `testEncryption()` (roundtrip de
> diagnostic).
