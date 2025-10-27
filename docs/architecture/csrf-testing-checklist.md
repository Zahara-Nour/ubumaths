# CSRF Protection Testing Checklist

## Pre-Deployment Testing

### 1. Development Environment (localhost)

#### Form Actions
- [ ] Login form works (`/auth/login`)
- [ ] Password reset form works (`/auth/reset-password`)
- [ ] Student import form works (`/dashboard/admin/import-students`)
- [ ] Question creation form works (`/dashboard/admin/questions`)
- [ ] Assessment creation form works (`/dashboard/teacher/assessments/new`)
- [ ] Message sending form works (`/dashboard/teacher/notifications`)
- [ ] Class creation form works (`/dashboard/admin/classes`)
- [ ] Riddle submission form works (`/dashboard/student/riddles/[id]`)

#### API Routes (POST)
- [ ] `/api/rewards/gidouilles` - Award gidouilles
- [ ] `/api/assessments` - Create assessment
- [ ] `/api/messages/send` - Send message
- [ ] `/api/srs/review/submit` - Submit SRS review
- [ ] `/api/exercises/[id]/assign` - Assign exercise
- [ ] `/api/notifications/mark-read` - Mark notification read
- [ ] `/api/chat` - Send chat message

#### API Routes (PUT)
- [ ] `/api/assessments/[id]` - Update assessment
- [ ] `/api/exercises/[id]` - Update exercise
- [ ] `/api/questions/templates/[id]` - Update question template
- [ ] `/api/srs/cards/[id]` - Update SRS card
- [ ] `/api/messages/templates/[id]` - Update message template

#### API Routes (DELETE)
- [ ] `/api/assessments/[id]` - Delete assessment
- [ ] `/api/exercises/[id]` - Delete exercise
- [ ] `/api/messages/[id]` - Delete message
- [ ] `/api/srs/decks/[id]` - Delete SRS deck

---

### 2. Port Configuration Testing

Test on both development ports:

#### Port 5173 (User Port)
```bash
pnpm dev -- --port 5173
```

- [ ] Forms work on `http://localhost:5173`
- [ ] API POST requests work
- [ ] No CSRF errors in console

#### Port 5175 (Claude Port)
```bash
pnpm dev -- --port 5175
```

- [ ] Forms work on `http://localhost:5175`
- [ ] API POST requests work
- [ ] No CSRF errors in console

---

### 3. CSRF Rejection Testing (Development)

Use curl or Postman to test that disallowed origins are blocked:

#### Test 1: Missing Origin Header (should FAIL with 403)
```bash
curl -X POST http://localhost:5173/api/rewards/gidouilles \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"studentId": "test", "amount": 10}'
```
**Expected:** 403 Forbidden (Cross-site POST form submissions are forbidden)

#### Test 2: Invalid Origin Header (should FAIL with 403)
```bash
curl -X POST http://localhost:5173/api/rewards/gidouilles \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"studentId": "test", "amount": 10}'
```
**Expected:** 403 Forbidden

#### Test 3: Valid Origin Header (should SUCCEED)
```bash
curl -X POST http://localhost:5173/api/rewards/gidouilles \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"studentId": "test", "amount": 10}'
```
**Expected:** 200 OK (or 401 if not authenticated)

---

## Production Environment Testing

### 1. Vercel Deployment (Staging)

After deploying to Vercel preview:

#### Form Actions
- [ ] Login works on `https://ubumaths-6op8.vercel.app`
- [ ] All form submissions work
- [ ] No CSRF errors in browser console

#### API Routes
- [ ] POST requests work from same origin
- [ ] PUT requests work from same origin
- [ ] DELETE requests work from same origin

---

### 2. Production Domain Testing

After deploying to production:

#### Production Domain (`ubumaths.com`)
- [ ] Login form works
- [ ] All teacher workflows work:
  - [ ] Create assessment
  - [ ] Assign exercise
  - [ ] Send message
  - [ ] Award gidouilles
- [ ] All student workflows work:
  - [ ] Submit riddle answer
  - [ ] Complete SRS review
  - [ ] Take assessment
- [ ] All admin workflows work:
  - [ ] Import students
  - [ ] Create questions
  - [ ] Manage classes

---

### 3. Cross-Origin Testing (Production)

Test that external origins are properly blocked:

#### Test 1: External Origin (should FAIL with 403)
```bash
curl -X POST https://ubumaths.com/api/rewards/gidouilles \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"studentId": "test", "amount": 10}'
```
**Expected:** 403 Forbidden

#### Test 2: Production Origin (should SUCCEED)
```bash
curl -X POST https://ubumaths.com/api/rewards/gidouilles \
  -H "Origin: https://ubumaths.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"studentId": "test", "amount": 10}'
```
**Expected:** 200 OK (or 401 if not authenticated)

---

## Security Testing

### 1. CSRF Attack Simulation

Create a test HTML file on a different domain to simulate CSRF attack:

```html
<!-- evil-test.html - Serve from different origin -->
<!DOCTYPE html>
<html>
<head>
  <title>CSRF Test</title>
</head>
<body>
  <h1>CSRF Attack Simulation</h1>

  <!-- Form submission test -->
  <form id="csrf-form" action="https://ubumaths.com/api/rewards/gidouilles" method="POST">
    <input type="hidden" name="studentId" value="test-student">
    <input type="hidden" name="amount" value="9999">
    <button type="submit">Attempt CSRF Attack</button>
  </form>

  <!-- Fetch API test -->
  <button onclick="attemptFetch()">Attempt Fetch CSRF</button>

  <script>
    async function attemptFetch() {
      try {
        const response = await fetch('https://ubumaths.com/api/rewards/gidouilles', {
          method: 'POST',
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: 'test-student',
            amount: 9999
          })
        });
        console.log('Response:', response.status);
        alert('Attack succeeded - SECURITY ISSUE!');
      } catch (error) {
        console.log('Attack blocked:', error);
        alert('Attack blocked - Security working correctly');
      }
    }
  </script>
</body>
</html>
```

#### Testing Steps:
1. Serve file from different domain (e.g., `http://localhost:8000`)
2. Login to UbuMaths in same browser
3. Visit the evil-test.html page
4. Click "Attempt CSRF Attack"
5. Check browser DevTools Network tab

**Expected Results:**
- ❌ Form submission: Blocked by browser (403 or CORS error)
- ❌ Fetch request: Blocked by SvelteKit (403 Forbidden)
- ✅ No state change in database
- ✅ Error logged in browser console

---

### 2. Legitimate Cross-Origin Testing

Verify that legitimate cross-origin scenarios work:

#### Scenario: Mobile App API Calls
If UbuMaths has a mobile app making API calls:

- [ ] Configure CORS headers for mobile app domain
- [ ] Test API authentication works
- [ ] Verify CSRF protection doesn't interfere

**Note:** CSRF protection only applies to browser-based same-site requests. Proper CORS configuration handles cross-origin API access.

---

## Browser Compatibility Testing

Test CSRF protection across different browsers:

### Desktop Browsers
- [ ] Chrome/Edge (Chromium) - Latest
- [ ] Firefox - Latest
- [ ] Safari - Latest

### Mobile Browsers
- [ ] Chrome Mobile - Latest
- [ ] Safari iOS - Latest
- [ ] Firefox Mobile - Latest

**For each browser, test:**
1. Login flow
2. Form submission
3. API POST request via UI interaction
4. No console errors

---

## Regression Testing

After enabling CSRF protection, verify no regressions:

### User Workflows
- [ ] Student can complete daily riddle
- [ ] Teacher can create and assign assessment
- [ ] Teacher can award gidouilles
- [ ] Admin can import students
- [ ] Messages can be sent and received
- [ ] SRS flashcards can be reviewed
- [ ] Exercises can be assigned and completed

### Performance
- [ ] No noticeable slowdown in request handling
- [ ] Server response times unchanged
- [ ] No increase in server errors

### Error Handling
- [ ] Appropriate error messages for blocked requests
- [ ] No stack traces leaked to client
- [ ] Errors logged server-side for monitoring

---

## Monitoring After Deployment

### 1. Server Logs

Monitor for CSRF-related errors:

```bash
# Check Vercel logs for CSRF errors
vercel logs --follow

# Look for patterns:
# - "Cross-site POST form submissions are forbidden"
# - 403 status codes
# - Origin header mismatches
```

### 2. Error Tracking

In error monitoring dashboard (if configured):

- [ ] No spike in 403 errors
- [ ] No increase in form submission failures
- [ ] No user complaints about blocked requests

### 3. User Feedback

Monitor user support channels for:

- [ ] "Form not submitting" reports
- [ ] "Access denied" errors
- [ ] "403 Forbidden" errors

---

## Rollback Plan

If CSRF protection causes issues in production:

### Immediate Rollback

1. **Disable CSRF in svelte.config.js:**
```javascript
kit: {
  adapter: adapter(),
  csrf: {
    checkOrigin: false // TEMPORARY - security risk!
  }
}
```

2. **Deploy emergency fix:**
```bash
git checkout main
git revert HEAD  # Revert CSRF commit
git push
```

3. **Investigate root cause:**
- Check server logs for error patterns
- Review allowed origins configuration
- Test locally with production-like setup

4. **Re-enable with fix:**
- Update ALLOWED_ORIGINS if needed
- Add missing deployment URLs
- Re-deploy with proper configuration

---

## Success Criteria

CSRF protection is successfully deployed when:

- ✅ All user workflows function correctly
- ✅ No increase in 403 errors
- ✅ Simulated CSRF attacks are blocked
- ✅ Legitimate requests from allowed origins succeed
- ✅ No user complaints about blocked functionality
- ✅ Browser DevTools show no CSRF errors
- ✅ All automated tests pass

---

## Testing Tools

### Recommended Tools

1. **Browser DevTools**
   - Network tab: Check request/response headers
   - Console: Monitor for CSRF errors
   - Application tab: Verify cookies

2. **curl**
   - Test API endpoints with different origins
   - Simulate missing headers
   - Verify error responses

3. **Postman**
   - Collection of API endpoint tests
   - Environment variables for different origins
   - Automated test scripts

4. **Playwright/E2E Tests**
   - Automated browser testing
   - Form submission workflows
   - Cross-browser compatibility

### Test Script Example

```typescript
// tests/csrf-protection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('CSRF Protection', () => {
  test('should allow same-origin form submission', async ({ page }) => {
    await page.goto('http://localhost:5173/auth/login');

    await page.fill('input[name="email"]', 'test@voltairedoha.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should not show CSRF error
    await expect(page.locator('text=forbidden')).not.toBeVisible();
  });

  test('should block cross-origin API request', async ({ page, context }) => {
    // Login first
    await page.goto('http://localhost:5173/auth/login');
    // ... login steps

    // Create page with different origin
    const maliciousPage = await context.newPage();

    // Attempt cross-origin request
    const response = await maliciousPage.evaluate(async () => {
      return fetch('http://localhost:5173/api/rewards/gidouilles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: 'test', amount: 9999 })
      });
    });

    expect(response.status).toBe(403);
  });
});
```

---

## Documentation

After testing is complete, update:

- [ ] This checklist with any new tests discovered
- [ ] Main CSRF documentation with any edge cases found
- [ ] Security audit report with CSRF protection status
- [ ] Deployment documentation with CSRF configuration notes

---

## Sign-Off

### Pre-Production
- [ ] Developer: All tests passed in development
- [ ] Code Review: CSRF implementation reviewed
- [ ] Security Review: Configuration validated

### Post-Production
- [ ] Deployment: Production deployment successful
- [ ] Monitoring: No errors in first 24 hours
- [ ] User Testing: Sample users verify functionality
- [ ] Final Sign-Off: CSRF protection confirmed working

---

**Last Updated:** 2025-10-27
**Next Review:** After any svelte.config.js changes or deployment URL updates
