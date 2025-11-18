#!/usr/bin/env tsx

/**
 * Manual Test Script for Hash Function
 * =====================================
 *
 * Quick verification that the centralized hash function works correctly.
 */

import {
	generateStableQuestionHash,
	generateQuestionDescription
} from '../src/lib/server/migration/hash-utils';

console.log('🧪 Testing Centralized Hash Function\n');

// Test 1: Basic question
const question1 = {
	description: 'Addition de deux nombres',
	enounces: ['Calculer 2 + 3'],
	variabless: [{ a: 2, b: 3 }],
	solutionss: [5]
};

const hash1a = generateStableQuestionHash(question1);
const hash1b = generateStableQuestionHash(question1);

console.log('✅ Test 1: Consistency');
console.log(`  Hash 1a: ${hash1a.substring(0, 16)}...`);
console.log(`  Hash 1b: ${hash1b.substring(0, 16)}...`);
console.log(`  Match: ${hash1a === hash1b ? 'YES ✓' : 'NO ✗'}\n`);

// Test 2: Different questions
const question2 = {
	description: 'Soustraction',
	enounces: ['Calculer 5 - 3'],
	variabless: [{ a: 5, b: 3 }],
	solutionss: [2]
};

const hash2 = generateStableQuestionHash(question2);

console.log('✅ Test 2: Different questions produce different hashes');
console.log(`  Hash 1: ${hash1a.substring(0, 16)}...`);
console.log(`  Hash 2: ${hash2.substring(0, 16)}...`);
console.log(`  Different: ${hash1a !== hash2 ? 'YES ✓' : 'NO ✗'}\n`);

// Test 3: Property order doesn't matter
const question3a = {
	description: 'Test',
	enounces: ['Q1'],
	variabless: [],
	solutionss: []
};

const question3b = {
	solutionss: [],
	description: 'Test',
	variabless: [],
	enounces: ['Q1']
};

const hash3a = generateStableQuestionHash(question3a);
const hash3b = generateStableQuestionHash(question3b);

console.log("✅ Test 3: Property order doesn't affect hash");
console.log(`  Hash 3a: ${hash3a.substring(0, 16)}...`);
console.log(`  Hash 3b: ${hash3b.substring(0, 16)}...`);
console.log(`  Match: ${hash3a === hash3b ? 'YES ✓' : 'NO ✗'}\n`);

// Test 4: Description generation
const desc1 = generateQuestionDescription(question1);
const desc2 = generateQuestionDescription(question2);

console.log('✅ Test 4: Description generation');
console.log(`  Question 1: "${desc1}"`);
console.log(`  Question 2: "${desc2}"\n`);

// Test 5: Missing properties
const question5 = {
	description: 'Test'
	// Missing: enounces, variabless, solutionss
};

const hash5 = generateStableQuestionHash(question5);

console.log('✅ Test 5: Handles missing properties');
console.log(`  Hash: ${hash5.substring(0, 16)}...`);
console.log(`  Valid format: ${/^[a-f0-9]{64}$/.test(hash5) ? 'YES ✓' : 'NO ✗'}\n`);

console.log('🎉 All tests completed!');
