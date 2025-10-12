/**
 * Test avatar fallback function
 */

import { getAvatarFallback } from '../src/lib/utils/avatar';

console.log('🧪 Testing avatar fallback function...\n');

console.log('Admin (no gender):', getAvatarFallback('admin', null));
console.log('Admin (boy):', getAvatarFallback('admin', 'boy'));
console.log('Admin (girl):', getAvatarFallback('admin', 'girl'));
console.log('Teacher (boy):', getAvatarFallback('teacher', 'boy'));
console.log('Teacher (girl):', getAvatarFallback('teacher', 'girl'));
console.log('Student (boy):', getAvatarFallback('student', 'boy'));
console.log('Student (girl):', getAvatarFallback('student', 'girl'));
