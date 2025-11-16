# Google Classroom Integration - Phase 2

OAuth configuration and authentication services for Google Classroom integration.

## Overview

This module provides utilities for:

- Google OAuth 2.0 authentication with PKCE
- Token encryption/decryption (AES-256-GCM)
- Token refresh and validation
- Secure token storage

## Files

### `oauth.ts`

OAuth 2.0 utilities for Google Classroom API access.

**Functions**:

- `getAuthUrl(state?)` - Generate authorization URL with PKCE
- `exchangeCodeForTokens(code, verifier)` - Exchange auth code for tokens
- `refreshAccessToken(refreshToken)` - Refresh expired access token
- `revokeAccess(token)` - Revoke OAuth access
- `validateToken(accessToken)` - Validate token and get metadata
- `shouldRefreshToken(expiry)` - Check if token needs refresh
- `parseGoogleAPIError(error)` - Parse Google API errors

**Constants**:

- `GOOGLE_CLASSROOM_SCOPES` - Required OAuth scopes

### `encryption.ts`

AES-256-GCM encryption for OAuth tokens.

**Functions**:

- `encryptToken(token)` - Encrypt token for database storage
- `decryptToken(encrypted)` - Decrypt token for API use
- `hashToken(token)` - One-way hash for comparison
- `validateEncryptionKey()` - Check if encryption key is configured
- `testEncryption()` - Test encryption roundtrip

### `index.ts`

Barrel export for convenient imports.

## Usage

### 1. Environment Setup

```bash
# .env
GOOGLE_CLASSROOM_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLASSROOM_CLIENT_SECRET=your-client-secret
GOOGLE_CLASSROOM_REDIRECT_URI=https://your-app.com/api/google/auth/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

Generate encryption key:

```bash
openssl rand -base64 32
```

### 2. OAuth Flow (Step-by-Step)

#### Step 1: Initiate OAuth

```typescript
import { getAuthUrl } from '$lib/server/google';

export async function GET({ cookies }) {
	const { url, codeVerifier } = await getAuthUrl('csrf-token-123');

	// Store code verifier in session cookie
	cookies.set('google_code_verifier', codeVerifier, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600 // 10 minutes
	});

	// Redirect to Google authorization
	return new Response(null, {
		status: 302,
		headers: { Location: url }
	});
}
```

#### Step 2: Handle Callback

```typescript
import { exchangeCodeForTokens, encryptToken } from '$lib/server/google';

export async function GET({ url, cookies, locals }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const codeVerifier = cookies.get('google_code_verifier');

	if (!code || !codeVerifier) {
		throw error(400, 'Missing authorization code or verifier');
	}

	// Verify state (CSRF protection)
	// ... verify state matches session ...

	// Exchange code for tokens
	const tokens = await exchangeCodeForTokens(code, codeVerifier);

	// Encrypt and store tokens
	const supabase = locals.supabase;
	await supabase.from('google_integrations').insert({
		teacher_id: locals.user.id,
		access_token: encryptToken(tokens.access_token),
		refresh_token: encryptToken(tokens.refresh_token!),
		token_expiry: new Date(Date.now() + tokens.expires_in * 1000),
		scopes: tokens.scope.split(' '),
		google_email: null, // Set after fetching user info
		last_sync_at: null
	});

	// Clean up cookie
	cookies.delete('google_code_verifier', { path: '/' });

	return redirect(302, '/dashboard/teacher/google-classroom');
}
```

### 3. Token Management

#### Check and Refresh Token

```typescript
import {
	shouldRefreshToken,
	refreshAccessToken,
	encryptToken,
	decryptToken
} from '$lib/server/google';

async function getValidAccessToken(supabase, teacherId) {
	const { data } = await supabase
		.from('google_integrations')
		.select('access_token, refresh_token, token_expiry')
		.eq('teacher_id', teacherId)
		.single();

	if (!data) {
		throw new Error('No Google integration found');
	}

	// Check if token needs refresh
	if (shouldRefreshToken(data.token_expiry)) {
		const refreshToken = decryptToken(data.refresh_token);
		const { access_token, expires_in } = await refreshAccessToken(refreshToken);

		// Update database
		await supabase
			.from('google_integrations')
			.update({
				access_token: encryptToken(access_token),
				token_expiry: new Date(Date.now() + expires_in * 1000)
			})
			.eq('teacher_id', teacherId);

		return access_token;
	}

	return decryptToken(data.access_token);
}
```

#### Make API Request

```typescript
async function fetchGoogleClassrooms(supabase, teacherId) {
	const accessToken = await getValidAccessToken(supabase, teacherId);

	const response = await fetch('https://classroom.googleapis.com/v1/courses', {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!response.ok) {
		throw new Error(`Google API error: ${response.statusText}`);
	}

	return await response.json();
}
```

#### Revoke Access

```typescript
import { revokeAccess, decryptToken } from '$lib/server/google';

async function disconnectGoogleClassroom(supabase, teacherId) {
	const { data } = await supabase
		.from('google_integrations')
		.select('access_token')
		.eq('teacher_id', teacherId)
		.single();

	if (data) {
		const accessToken = decryptToken(data.access_token);
		await revokeAccess(accessToken);

		// Delete integration
		await supabase.from('google_integrations').delete().eq('teacher_id', teacherId);
	}
}
```

### 4. Error Handling

```typescript
import { parseGoogleAPIError } from '$lib/server/google';

try {
	const tokens = await exchangeCodeForTokens(code, verifier);
} catch (err) {
	const message = parseGoogleAPIError(err);

	if (message.includes('INVALID_GRANT')) {
		// Refresh token expired, require re-authentication
		return error(401, 'Your Google connection has expired. Please reconnect.');
	}

	return error(500, message);
}
```

## Security Notes

1. **PKCE**: OAuth flow uses PKCE (Proof Key for Code Exchange) for enhanced security
2. **Token Encryption**: All tokens encrypted with AES-256-GCM before database storage
3. **Secure Cookies**: Code verifier stored in httpOnly, secure cookie
4. **State Parameter**: Include CSRF token in state parameter
5. **Token Rotation**: Refresh tokens 5 minutes before expiry
6. **No Logging**: Never log decrypted tokens

## Testing

```typescript
import { testEncryption } from '$lib/server/google';

// Test encryption configuration
try {
	testEncryption();
	console.log('✅ Encryption configured correctly');
} catch (error) {
	console.error('❌ Encryption test failed:', error);
}
```

## Next Steps (Phase 3)

- [ ] Implement Google Classroom API client
- [ ] Create sync service for courses and coursework
- [ ] Build teacher UI for linking classes
- [ ] Implement coursework sharing system

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Classroom API Reference](https://developers.google.com/classroom/reference/rest)
- [PKCE Specification (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [Database Schema Documentation](../../../../docs/architecture/google-classroom-schema.md)
