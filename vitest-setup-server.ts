/**
 * Vitest Setup for Server Tests
 * =============================
 *
 * Global setup file for server-side tests (Node environment).
 * This file runs before each test file in the 'server' project.
 *
 * To use, add to vitest config:
 * ```typescript
 * test: {
 *   setupFiles: ['./vitest-setup-server.ts']
 * }
 * ```
 */

import { vi, beforeEach } from 'vitest';
// Messages Zod en français, comme en production (src/hooks.server.ts)
import '$lib/zod-locale';

/**
 * Clear all mocks before each test
 *
 * This ensures test isolation by resetting:
 * - Mock function call history
 * - Mock implementation state
 * - Mock return values
 */
beforeEach(() => {
	vi.clearAllMocks();
});
