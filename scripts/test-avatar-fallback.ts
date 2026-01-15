/**
 * Test avatar fallback function
 *
 * Note: As of 2026-01-15, avatar fallback is now role-only (no gender)
 * for GDPR compliance (data minimization principle).
 */

import { getAvatarFallback } from '../src/lib/utils/avatar';

console.log('Testing avatar fallback function...\n');

console.log('Admin:', getAvatarFallback('admin'));
console.log('Teacher:', getAvatarFallback('teacher'));
console.log('Student:', getAvatarFallback('student'));
console.log('Unknown role (default):', getAvatarFallback('unknown' as 'student'));
