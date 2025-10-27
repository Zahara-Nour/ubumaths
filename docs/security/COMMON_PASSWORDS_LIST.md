# Common Passwords Blocklist

This document lists all passwords blocked by the UbuMaths password policy.

## Why These Passwords?

These passwords appear in major data breach databases and are:

- First tried in automated dictionary attacks
- Trivially crackable in seconds with modern hardware
- Provide no meaningful security
- Frequently used despite being widely known as insecure

**Sources**: Have I Been Pwned, RockYou breach, multiple security research databases

---

## Complete Blocklist (100+ Passwords)

### Numeric Patterns (9)

```
123456
12345678
123456789
1234567890
12345
1234
111111
000000
123123
654321
```

**Why**: Pure numeric passwords with obvious patterns are the weakest possible passwords.

---

### Common English Words (25)

```
password
password1
password123
pass1234
qwerty
qwerty123
qwertyuiop
welcome
welcome1
admin
admin123
administrator
root
guest
user
login
monkey
dragon
master
superman
batman
trustno1
letmein
iloveyou
princess
starwars
```

**Why**: Appear in top 100 most common passwords worldwide. Dictionary attack primary targets.

---

### French Common Passwords (12)

```
motdepasse
azerty
azerty123
bienvenue
bonjour
soleil
marseille
chocolat
jetaime
ordinateur
france
paris
```

**Why**: French equivalents of common passwords. "azerty" is French keyboard equivalent of "qwerty". "motdepasse" = "password" in French.

---

### Keyboard Patterns (11)

```
abc123
abc123456
abcdef
abcd1234
1q2w3e4r
1qaz2wsx
zxcvbnm
asdfgh
asdfghjkl
```

**Why**: Follow keyboard layout patterns. Easy to type but trivial to crack.

---

### Names and Common Terms (12)

```
jordan
michael
jennifer
football
baseball
```

**Why**: Popular names and sports terms frequently used as passwords.

---

### Education-Related (14)

```
student
student1
student123
teacher
teacher1
school
school123
education
voltaire
voltaire123
doha
doha123
math
mathematics
ubumaths
```

**Why**: Specific to educational platforms. "voltaire" and "doha" are relevant to Voltaire Doha school. Users often use institution names as passwords.

---

### Simple Variations (9)

```
passw0rd
p@ssword
p@ssw0rd
password!
qwerty1
qwerty!
azerty1
azerty!
```

**Why**: Common "l33t speak" variations. Substituting '0' for 'o' or '@' for 'a' doesn't meaningfully increase security - these are still dictionary words.

---

### Year Patterns (5)

```
2024
2023
2022
2021
2020
```

**Why**: Current/recent years commonly appended to weak passwords. "Password2024" is still weak.

---

### Repeated Characters (4)

```
aaaaaa
aaaa
aaaaaaaa
```

**Why**: Pure repetition provides no security. Easy to generate in brute force.

---

## Implementation Details

### Case Sensitivity

All password checks are **case-insensitive**:

```typescript
COMMON_PASSWORDS.has(password.toLowerCase());
```

This means "PASSWORD", "Password", and "PaSsWoRd" are all blocked if "password" is in the list.

**Why**: Case variations of common passwords don't meaningfully improve security. "PASSWORD" is just as weak as "password".

---

## Adding Passwords to Blocklist

### Process

1. Edit `/src/lib/server/passwordPolicy.ts`
2. Add password(s) to `COMMON_PASSWORDS` Set
3. Run tests: `pnpm test:unit src/lib/server/passwordPolicy.test.ts`
4. Update this documentation

### Criteria for Adding

Add passwords that are:

- ✅ In top 1000 most common passwords lists
- ✅ Appeared in major breach databases
- ✅ Platform-specific weak patterns (e.g., "ubumaths123")
- ✅ Simple keyboard patterns
- ✅ Pure numeric sequences

Do NOT add:

- ❌ Strong passwords accidentally
- ❌ Overly specific restrictions
- ❌ Names of current students/teachers (privacy)

---

## Statistics

| Category          | Count    | % of Blocklist |
| ----------------- | -------- | -------------- |
| Numeric patterns  | 10       | 9%             |
| Common English    | 25       | 23%            |
| French passwords  | 12       | 11%            |
| Keyboard patterns | 11       | 10%            |
| Names & terms     | 12       | 11%            |
| Education-related | 14       | 13%            |
| Simple variations | 9        | 8%             |
| Year patterns     | 5        | 5%             |
| Repeated chars    | 4        | 4%             |
| **TOTAL**         | **~100** | **100%**       |

---

## Client-Side Subset

For performance, the **client-side** validation (`/src/lib/utils/passwordStrength.ts`) uses a subset of ~25 passwords:

```typescript
const COMMON_PASSWORDS_CLIENT = new Set([
	'123456',
	'12345678',
	'123456789',
	'password',
	'password1',
	'password123',
	'motdepasse',
	'azerty',
	'azerty123',
	'qwerty',
	'qwerty123',
	'welcome',
	'admin',
	'admin123',
	'bienvenue',
	'bonjour',
	'abc123',
	'letmein',
	'iloveyou',
	'student',
	'teacher',
	'school',
	'voltaire',
	'doha'
]);
```

**Why subset?**

- Reduces JavaScript bundle size
- Provides instant feedback for most common cases
- Server-side still checks full list (authoritative)

---

## Examples

### Blocked Passwords

```
❌ "password"        → "Ce mot de passe est trop commun"
❌ "PASSWORD"        → "Ce mot de passe est trop commun" (case-insensitive)
❌ "123456"          → "Ce mot de passe est trop commun"
❌ "azerty123"       → "Ce mot de passe est trop commun"
❌ "student123"      → "Ce mot de passe est trop commun"
❌ "voltaire"        → "Ce mot de passe est trop commun"
```

### Allowed Passwords

```
✅ "MyStr0ng!Pass"   → Strong password (not common, meets complexity)
✅ "MathClass2024!"  → Valid (not a simple year pattern)
✅ "Correct-Horse-Battery-Staple" → Valid passphrase
✅ "J@1me_L3s_M@th3m@t1qu3s!" → Valid (unique variation)
```

---

## Testing

The blocklist is tested in:
`/src/lib/server/passwordPolicy.test.ts`

### Relevant Tests

- `should reject common numeric passwords` (6 cases)
- `should reject common word passwords` (6 cases)
- `should reject French common passwords` (4 cases)
- `should reject education-related common passwords` (6 cases)
- `should perform case-insensitive common password check` (5 cases)

**Total**: 27 tests specifically for common password blocking

---

## Security Research References

### Major Password Breach Databases

1. **RockYou (2009)**: 32 million plaintext passwords
   - Source of "123456", "password", "qwerty" dominance
2. **Have I Been Pwned**: 500M+ breached passwords
   - Continuously updated with new breaches
3. **SplashData Annual Reports**: Top 100 worst passwords
4. **NCSC/UK Cyber Survey**: Common UK passwords

### Academic Research

- "The Tangled Web of Password Reuse" (CMU, 2014)
- "The Science of Guessing" (Wheeler, 2012)
- "Fast, Lean, and Accurate: Modeling Password Guessability Using Neural Networks" (Melicher et al., 2016)

---

## Future Enhancements

### Potential Improvements

1. **Dynamic blocklist updates**: Fetch from Have I Been Pwned API
2. **Expand to top 1000**: Currently ~100, could expand
3. **Context-aware blocking**: Block passwords containing user's name/email
4. **Fuzzy matching**: Catch slight variations ("p@ssw0rd123!")
5. **Regional lists**: Add more French/Arabic common passwords

### API Integration (Future)

```typescript
// Potential Have I Been Pwned integration
async function checkPwnedPasswords(password: string): Promise<boolean> {
	// Check password against 500M+ breached passwords
	// Returns true if password appears in breach database
}
```

**Note**: This would require hashing password (k-Anonymity model) to protect privacy.

---

## FAQ

### Why not use Have I Been Pwned API?

- **Current**: Static list is faster, no external dependency, privacy-preserving
- **Future**: May integrate for additional security layer

### Why block "voltaire" and "doha"?

- School-specific passwords are predictable
- Students/teachers might use "voltaire123" or "doha2024"
- Better to block and encourage unique passwords

### What if a user's name is in the blocklist?

- Unlikely (we only block common names like "michael", "jennifer")
- If it happens, they can use name + other characters (meets complexity)
- Example: "Michael" is blocked, but "Michael2024!" would pass (if Michael wasn't blocked, since it has complexity)

### Can I still use my favorite password?

- If it's common/weak: **No** - it's blocked for your security
- If it's unique and strong: **Yes** - it will be accepted

---

## Related Documentation

- [Password Policy Guide](./password-policy.md)
- [Password Policy Implementation](./PASSWORD_POLICY_IMPLEMENTATION.md)
- [Security Audit Report](../security-audit.md)

---

Last updated: 2025-10-27
