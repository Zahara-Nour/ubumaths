# Password Policy Documentation

## Overview

UbuMaths implements a modern, secure password policy aligned with **NIST 800-63B Digital Identity Guidelines** to protect student data, grades, and personal information.

### Security Context

This platform handles sensitive educational data including:
- Student personally identifiable information (PII)
- Academic records and grades
- Authentication credentials
- Teacher and admin access to multiple student accounts

**Strong password requirements are critical** for preventing unauthorized access and protecting student privacy.

---

## Password Requirements

### Minimum Standards

All user passwords must meet the following criteria:

1. **Length**: 8-128 characters
   - Minimum: 8 characters (NIST recommendation)
   - Maximum: 128 characters (DoS prevention)

2. **Complexity**: At least 3 of 4 character types:
   - Lowercase letters (a-z)
   - Uppercase letters (A-Z)
   - Numbers (0-9)
   - Special characters (!@#$%^&*()_+-=[]{};\':"|,.<>/?~`)

3. **Common Password Check**: Password must not appear in the common passwords blocklist

### Why These Requirements?

**8-character minimum**: NIST 800-63B (2017) recommends minimum 8 characters for user-chosen passwords. The previous 6-character minimum was outdated (circa 2014).

**Complexity requirement**: Requiring 3 of 4 character types balances security with usability, preventing weak patterns like "password" or "12345678" while avoiding excessive complexity that leads to password reuse.

**Common password blocking**: Prevents users from selecting passwords that appear in breach databases and are targeted by automated attacks.

---

## Implementation

### Server-Side Validation

**Location**: `/src/lib/server/passwordPolicy.ts`

```typescript
import { validatePasswordPolicy } from '$lib/server/passwordPolicy';

// Validate password
const result = validatePasswordPolicy(password);

if (!result.valid) {
  // Handle validation errors
  console.error(result.errors); // Array of French error messages
}
```

**Key Functions**:

#### `validatePasswordPolicy(password: string): PasswordValidationResult`

Validates password against all security requirements.

**Returns**:
```typescript
{
  valid: boolean;
  errors: string[]; // French error messages
  requirements: {
    minLength: boolean;
    maxLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    notCommon: boolean;
    complexityMet: boolean; // At least 3 of 4 types
  };
}
```

#### `getPasswordRequirements(): string[]`

Returns user-friendly requirement descriptions in French for display purposes.

#### `calculatePasswordScore(password: string): number`

Returns password strength score (0-4) for client-side feedback.

### Client-Side Validation

**Location**: `/src/lib/utils/passwordStrength.ts`

Provides real-time password strength feedback during signup.

**Important**: Client-side validation is for **UX purposes only**. Server-side validation is authoritative.

```typescript
import { calculatePasswordStrength } from '$lib/utils/passwordStrength';

const strength = calculatePasswordStrength(password);
// Returns: { strength: 'weak' | 'fair' | 'good' | 'strong', score: 0-4, feedback: string, ... }
```

### Signup Integration

**Location**: `/src/routes/(public)/signup/+page.server.ts`

```typescript
// Validate password against security policy
const passwordValidation = validatePasswordPolicy(password);
if (!passwordValidation.valid) {
  return fail(400, {
    error: passwordValidation.errors.join('. '),
    email
  });
}
```

---

## Common Password Blocklist

The system maintains a list of 100+ common passwords that are blocked, including:

### Categories Blocked

1. **Numeric patterns**: 123456, 12345678, 111111, etc.
2. **Common words**: password, welcome, admin, etc.
3. **Keyboard patterns**: qwerty, azerty, asdfgh, etc.
4. **French passwords**: motdepasse, bienvenue, bonjour, etc.
5. **Education-related**: student, teacher, school, voltaire, doha, etc.
6. **Simple variations**: password1, p@ssword, qwerty!, etc.

### Why Block These?

These passwords appear in nearly **every major data breach** and are:
- First tried in automated attacks
- Trivially crackable in seconds
- Provide no real security value

**Full list**: See `COMMON_PASSWORDS` constant in `/src/lib/server/passwordPolicy.ts`

---

## User Experience

### Signup Form Features

The signup page provides:

1. **Real-time strength indicator**: Visual bar showing password strength
2. **Color-coded feedback**:
   - Red: Weak (score 0-1)
   - Orange: Fair (score 2)
   - Yellow: Good (score 3)
   - Green: Strong (score 4)
3. **Requirements checklist**: Shows which requirements are met
4. **French error messages**: Clear, helpful error text

### Example User Flows

**Weak password attempt**:
```
User enters: "abc123"
Feedback: "Trop court - utilisez au moins 8 caractères"
Requirements: ○ Au moins 8 caractères (not met)
```

**Common password attempt**:
```
User enters: "password123"
Feedback: "Mot de passe trop commun - choisissez-en un plus unique"
Server error: "Ce mot de passe est trop commun et facile à deviner"
```

**Valid password**:
```
User enters: "MathClass2024!"
Feedback: "Mot de passe fort !"
All requirements: ✓ (green checkmarks)
```

---

## Testing

### Test Coverage

Comprehensive test suite at: `/src/lib/server/passwordPolicy.test.ts`

**31 test cases covering**:
- Length validation (min/max)
- Complexity requirements (all combinations)
- Common password detection (numeric, words, French, education)
- Case-insensitive blocking
- Error message localization
- Score calculation
- Edge cases

### Running Tests

```bash
pnpm test:unit src/lib/server/passwordPolicy.test.ts
```

**Expected result**: All 31 tests pass

### Example Test Cases

```typescript
// Should reject too short
validatePasswordPolicy('Short1!') → invalid

// Should accept minimum valid
validatePasswordPolicy('Abcd123!') → valid

// Should reject common password
validatePasswordPolicy('password123') → invalid (common)

// Should accept strong password
validatePasswordPolicy('MyStr0ng!Pass') → valid
```

---

## Security Best Practices

### Defense in Depth

Password policy is **one layer** in a multi-layer security approach:

1. **Password policy** (this document)
2. **Rate limiting** on signup/login (separate module)
3. **Email verification** (Supabase auth)
4. **Row-level security (RLS)** in database
5. **OAuth restrictions** (@voltairedoha.com domain)

### Password Storage

Passwords are **never stored in plaintext**. Supabase Auth handles:
- bcrypt hashing with salt
- Secure password comparison
- Password reset flows

**We never see or log passwords** - validation happens before hashing.

### Future Enhancements

Potential improvements:

1. **zxcvbn integration**: More sophisticated entropy checking
2. **Have I Been Pwned API**: Check against 500M+ breached passwords
3. **Password history**: Prevent reuse of last N passwords
4. **Passphrase support**: Encourage long, memorable passwords
5. **Breach notification**: Alert users if their password appears in new breach

---

## Compliance

### NIST 800-63B Alignment

| Requirement | NIST Guideline | UbuMaths Implementation |
|-------------|----------------|-------------------------|
| Minimum length | 8 characters | ✅ 8 characters |
| Maximum length | 64+ characters | ✅ 128 characters |
| Complexity | Complexity optional but recommended | ✅ 3 of 4 types required |
| Common passwords | Must block | ✅ 100+ passwords blocked |
| Password hints | Not allowed | ✅ Not used |
| Arbitrary rules | Avoid (special char positions, etc.) | ✅ Flexible complexity |

### Educational Data Privacy

**GDPR Considerations**:
- Strong passwords protect student PII (personal data)
- Prevents unauthorized data access
- Required for data controller responsibilities

**Potential FERPA/COPPA**:
- US schools may require FERPA compliance
- Strong auth protects educational records
- Password policy supports compliance framework

---

## Migration Notes

### Previous Policy

**Old requirement**: Minimum 6 characters (no other checks)

**Security risk**: CRITICAL
- 6-character passwords crackable in minutes
- No complexity = "123456" was valid
- Common passwords allowed

### Migration Strategy

**Existing users**: Grandfathered (not forced to change immediately)

**New users**: Must meet new policy at signup

**Recommended**: Periodic password reset campaign for existing users

---

## Error Messages Reference

All error messages are in **French** for user-facing display:

| Scenario | Error Message |
|----------|---------------|
| Too short | "Le mot de passe doit contenir au moins 8 caractères" |
| Too long | "Le mot de passe ne peut pas dépasser 128 caractères" |
| Insufficient complexity | "Le mot de passe doit contenir au moins 3 types de caractères parmi : lettres majuscules, minuscules, chiffres et caractères spéciaux. Manquant : [list]" |
| Common password | "Ce mot de passe est trop commun et facile à deviner. Veuillez en choisir un plus unique" |
| Passwords don't match | "Les mots de passe ne correspondent pas" |

---

## Developer Guide

### Adding New Common Passwords

1. Edit `/src/lib/server/passwordPolicy.ts`
2. Add to `COMMON_PASSWORDS` Set
3. Run tests: `pnpm test:unit src/lib/server/passwordPolicy.test.ts`
4. Update documentation

### Modifying Requirements

**Warning**: Changing core requirements may lock out users or weaken security.

**Process**:
1. Update validation logic in `passwordPolicy.ts`
2. Update client-side feedback in `passwordStrength.ts`
3. Update UI checklist in `signup/+page.svelte`
4. Update all tests
5. Update this documentation
6. Consider migration plan for existing users

### Debugging Validation Issues

```typescript
// Add detailed logging
const result = validatePasswordPolicy(password);
console.log('Validation result:', result);
console.log('Requirements:', result.requirements);
console.log('Errors:', result.errors);
```

---

## Related Documentation

- [Security Audit Report](../security-audit.md)
- [Authentication Flow](../architecture/authentication.md)
- [Rate Limiting](./rate-limiting.md)
- [Supabase Auth Configuration](../infrastructure/supabase-auth.md)

---

## Changelog

### Version 1.0 (2025-10-27)
- Initial implementation
- NIST 800-63B alignment
- 8-character minimum
- Complexity requirements (3 of 4 types)
- 100+ common password blocklist
- Comprehensive test suite
- French error messages
- Real-time client feedback

---

## Support

For security concerns or questions:
- **Security issues**: Contact admin immediately
- **User support**: Direct to help documentation
- **Development questions**: See developer guide above
