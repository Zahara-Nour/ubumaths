# Phase 3 Migration Checklist

## Pre-Migration Checklist

### Environment Setup

- [ ] Verify `.env` file exists and contains required variables:
  - [ ] `PUBLIC_SUPABASE_URL` (correct environment)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (correct key for environment)
- [ ] Confirm using staging environment first (not production)
- [ ] Verify Supabase project is accessible and active

### Code Validation

- [ ] Run TypeScript validation: `npx tsc --noEmit scripts/sanitize-existing-notifications.ts`
- [ ] Run sanitization logic test: `pnpm tsx scripts/test-sanitize-migration.ts`
- [ ] Confirm all tests pass (12/12 tests)

### Documentation Review

- [ ] Read `scripts/README-sanitize-notifications.md` completely
- [ ] Understand what gets sanitized (allowed/removed tags)
- [ ] Review troubleshooting section
- [ ] Understand rollback plan

---

## Staging Migration Checklist

### Before Running

- [ ] Confirm `.env` points to **staging** environment
- [ ] Backup staging database (optional but recommended)
- [ ] Notify team of migration test
- [ ] Document current staging notification count

### Run Migration

- [ ] Execute: `pnpm migrate:sanitize`
- [ ] Monitor output for errors
- [ ] Save output to log file (optional): `pnpm migrate:sanitize | tee staging-migration.log`

### Post-Migration Verification

- [ ] Review migration statistics:
  - [ ] Total processed matches expected count
  - [ ] Modification rate is reasonable (expect 0-5%)
  - [ ] Error count is 0 (or minimal)
- [ ] Check database:
  - [ ] Query modified notifications
  - [ ] Verify safe HTML is preserved
  - [ ] Confirm dangerous HTML is removed
- [ ] Test UI rendering:
  - [ ] Teacher dashboard notifications display correctly
  - [ ] Student dashboard notifications display correctly
  - [ ] No broken formatting
  - [ ] No missing content
- [ ] Security verification:
  - [ ] No `<script>` tags in notifications
  - [ ] No event handlers (`onclick`, etc.)
  - [ ] No malicious URLs

### Staging Results

- [ ] Document results in staging:
  - [ ] Number of notifications processed: \_\_\_\_\_
  - [ ] Number modified: \_\_\_\_\_
  - [ ] Number unchanged: \_\_\_\_\_
  - [ ] Errors encountered: \_\_\_\_\_
  - [ ] Issues found: \_\_\_\_\_
- [ ] Get team approval to proceed to production

---

## Production Migration Checklist

### Pre-Production

- [ ] Confirm staging migration was successful
- [ ] Get formal approval from security/tech lead
- [ ] Schedule migration during low-traffic period
- [ ] Notify team of production migration
- [ ] Update `.env` to point to **production** environment
- [ ] Verify production service role key is correct

### Backup (Recommended)

- [ ] Create production database backup:
  ```bash
  # Via Supabase Dashboard or CLI
  supabase db dump -f backup-pre-sanitize-$(date +%Y%m%d).sql
  ```
- [ ] Verify backup file exists and is not empty

### Run Production Migration

- [ ] Execute: `pnpm migrate:sanitize | tee migration-$(date +%Y%m%d-%H%M%S).log`
- [ ] Monitor output in real-time
- [ ] Note any errors or warnings
- [ ] Do not interrupt unless critical error occurs

### Immediate Verification

- [ ] Review migration output:
  - [ ] Success rate: \_\_\_\_\_%
  - [ ] Modification rate: \_\_\_\_\_%
  - [ ] Errors: \_\_\_\_\_
- [ ] Quick database check:
  - [ ] Sample 10 random notifications
  - [ ] Verify content is intact
- [ ] Quick UI check:
  - [ ] Load teacher dashboard
  - [ ] Load student dashboard
  - [ ] Confirm no obvious issues

### Comprehensive Verification (Within 1 Hour)

- [ ] Database verification:

  ```sql
  SELECT id, message, created_at
  FROM notifications
  WHERE created_at < '2025-11-10'
  ORDER BY created_at DESC
  LIMIT 50;
  ```

  - [ ] Safe HTML preserved (`<strong>`, `<em>`, etc.)
  - [ ] Dangerous HTML removed (`<script>`, handlers)
  - [ ] Text content intact

- [ ] UI verification:
  - [ ] Teacher creates new notification → displays correctly
  - [ ] Student views notifications → displays correctly
  - [ ] Old notifications display correctly
  - [ ] New notifications display correctly
- [ ] Security verification:
  - [ ] Attempt to create notification with `<script>` → blocked
  - [ ] View existing notifications → no XSS vectors
  - [ ] Review sanitization logs → appropriate blocking

### Post-Migration Actions

- [ ] Archive migration log file
- [ ] Document results:
  - [ ] Production notifications processed: \_\_\_\_\_
  - [ ] Production notifications modified: \_\_\_\_\_
  - [ ] Production modification rate: \_\_\_\_\_%
  - [ ] Issues encountered: \_\_\_\_\_
- [ ] Update security documentation
- [ ] Notify team of successful completion

---

## Post-Migration Monitoring (First 24 Hours)

### Continuous Monitoring

- [ ] Monitor error tracking system for XSS-related errors
- [ ] Check user reports/support tickets for notification issues
- [ ] Monitor application logs for sanitization warnings
- [ ] Track notification creation rate (should be normal)

### Issue Response

If issues are detected:

- [ ] Document issue clearly
- [ ] Identify affected notifications
- [ ] Assess severity (critical/high/medium/low)
- [ ] Execute rollback if critical
- [ ] Fix selectively if non-critical

---

## Rollback Procedures (If Needed)

### Option 1: Full Database Restore (Critical Issues)

```bash
supabase db restore backup-pre-sanitize-YYYYMMDD.sql
```

- [ ] Restore from backup
- [ ] Verify restoration successful
- [ ] Test application functionality
- [ ] Notify team of rollback

### Option 2: Selective Fix (Minor Issues)

```sql
-- Fix specific notifications
UPDATE notifications
SET message = 'corrected_content'
WHERE id IN ('id1', 'id2', 'id3');
```

- [ ] Identify problematic notifications
- [ ] Manually correct content
- [ ] Verify fixes in UI
- [ ] Document corrections

### Option 3: Re-run Migration (Safe to Repeat)

```bash
pnpm migrate:sanitize
```

- [ ] Fix any script bugs if identified
- [ ] Re-run migration script
- [ ] Verify results
- [ ] Document re-run reason

---

## Final Sign-Off

### Completion Criteria

- [ ] All pre-migration checks passed
- [ ] Staging migration successful
- [ ] Production migration successful
- [ ] All verifications passed
- [ ] No critical issues detected
- [ ] Documentation updated
- [ ] Team notified

### Sign-Off

- **Migration completed by**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- **Date**: \_\_\_\_\_\_\_\_\_\_\_\_
- **Production notifications processed**: \_\_\_\_\_\_\_\_\_\_\_\_
- **Modification rate**: \_\_\_\_\_\_\_%
- **Issues encountered**: \_\_\_\_\_\_\_\_\_\_\_\_
- **Status**: ✅ Success / ⚠️ Issues / ❌ Failure

### Archive Checklist

- [ ] Migration logs saved to archive
- [ ] Backup files labeled and stored
- [ ] Documentation updated (security, architecture)
- [ ] Phase 3 marked complete in project tracking

---

## Emergency Contacts

- **Tech Lead**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- **Security Team**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- **DevOps**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- **On-call Engineer**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Notes / Issues Encountered

<!-- Document any issues, anomalies, or important notes here -->

---

**Document Version**: 1.0
**Created**: 2025-11-10
**Last Updated**: 2025-11-10
