/**
 * Tests for Exercise Backup/Restore System
 *
 * @module server/admin/exercise-backup.test
 */

import { describe, it, expect } from 'vitest';
import {
	validateBackup,
	validateRestoreOptions,
	isBackupSizeValid,
	getMaxFileSizeDisplay,
	BACKUP_VERSION,
	BACKUP_FORMAT,
	MAX_BACKUP_SIZE_BYTES,
	type ExerciseBackup
} from '$lib/server/validation/backup';

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Backup Validation', () => {
	describe('validateBackup', () => {
		it('should validate a complete valid backup', () => {
			const validBackup: ExerciseBackup = {
				version: '1.0',
				format: 'ubumaths-backup',
				created_at: new Date().toISOString(),
				created_by: 'admin@test.com',
				metadata: {
					tables_included: [
						'exercises',
						'exercise_templates',
						'exercise_favorites',
						'exercise_share_tokens'
					],
					record_counts: {
						exercises: 10,
						exercise_templates: 2,
						exercise_favorites: 5,
						exercise_share_tokens: 3
					}
				},
				data: {
					exercises: [],
					exercise_templates: [],
					exercise_favorites: [],
					exercise_share_tokens: []
				}
			};

			const result = validateBackup(validBackup);
			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
		});

		it('should reject invalid version', () => {
			const invalidBackup = {
				version: '2.0', // Invalid
				format: 'ubumaths-backup',
				created_at: new Date().toISOString(),
				created_by: 'admin@test.com',
				metadata: {
					tables_included: [],
					record_counts: {
						exercises: 0,
						exercise_templates: 0,
						exercise_favorites: 0,
						exercise_share_tokens: 0
					}
				},
				data: {
					exercises: [],
					exercise_templates: [],
					exercise_favorites: [],
					exercise_share_tokens: []
				}
			};

			const result = validateBackup(invalidBackup);
			expect(result.success).toBe(false);
			expect(result.error).toContain('version');
		});

		it('should reject invalid format', () => {
			const invalidBackup = {
				version: '1.0',
				format: 'wrong-format', // Invalid
				created_at: new Date().toISOString(),
				created_by: 'admin@test.com',
				metadata: {
					tables_included: [],
					record_counts: {
						exercises: 0,
						exercise_templates: 0,
						exercise_favorites: 0,
						exercise_share_tokens: 0
					}
				},
				data: {
					exercises: [],
					exercise_templates: [],
					exercise_favorites: [],
					exercise_share_tokens: []
				}
			};

			const result = validateBackup(invalidBackup);
			expect(result.success).toBe(false);
			expect(result.error).toContain('format');
		});

		it('should reject invalid email', () => {
			const invalidBackup = {
				version: '1.0',
				format: 'ubumaths-backup',
				created_at: new Date().toISOString(),
				created_by: 'not-an-email', // Invalid
				metadata: {
					tables_included: [],
					record_counts: {
						exercises: 0,
						exercise_templates: 0,
						exercise_favorites: 0,
						exercise_share_tokens: 0
					}
				},
				data: {
					exercises: [],
					exercise_templates: [],
					exercise_favorites: [],
					exercise_share_tokens: []
				}
			};

			const result = validateBackup(invalidBackup);
			expect(result.success).toBe(false);
			expect(result.error).toContain('email');
		});

		it('should reject missing data field', () => {
			const invalidBackup = {
				version: '1.0',
				format: 'ubumaths-backup',
				created_at: new Date().toISOString(),
				created_by: 'admin@test.com',
				metadata: {
					tables_included: [],
					record_counts: {
						exercises: 0,
						exercise_templates: 0,
						exercise_favorites: 0,
						exercise_share_tokens: 0
					}
				}
				// Missing data field
			};

			const result = validateBackup(invalidBackup);
			expect(result.success).toBe(false);
		});
	});

	describe('validateRestoreOptions', () => {
		it('should validate valid skip options', () => {
			const options = {
				conflict_strategy: 'skip',
				reassign_orphans_to_admin: false
			};

			const result = validateRestoreOptions(options);
			expect(result.success).toBe(true);
			expect(result.data?.conflict_strategy).toBe('skip');
		});

		it('should validate valid replace options', () => {
			const options = {
				conflict_strategy: 'replace',
				reassign_orphans_to_admin: false
			};

			const result = validateRestoreOptions(options);
			expect(result.success).toBe(true);
			expect(result.data?.conflict_strategy).toBe('replace');
		});

		it('should require admin_id when reassign_orphans_to_admin is true', () => {
			const options = {
				conflict_strategy: 'skip',
				reassign_orphans_to_admin: true
				// Missing admin_id
			};

			const result = validateRestoreOptions(options);
			expect(result.success).toBe(false);
			expect(result.error).toContain('admin_id');
		});

		it('should accept admin_id when reassign_orphans_to_admin is true', () => {
			const options = {
				conflict_strategy: 'skip',
				reassign_orphans_to_admin: true,
				admin_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = validateRestoreOptions(options);
			expect(result.success).toBe(true);
		});

		it('should reject invalid conflict_strategy', () => {
			const options = {
				conflict_strategy: 'invalid',
				reassign_orphans_to_admin: false
			};

			const result = validateRestoreOptions(options);
			expect(result.success).toBe(false);
		});

		it('should apply default values', () => {
			const options = {};

			const result = validateRestoreOptions(options);
			expect(result.success).toBe(true);
			expect(result.data?.conflict_strategy).toBe('skip');
			expect(result.data?.reassign_orphans_to_admin).toBe(false);
		});
	});

	describe('Exercise Record Validation', () => {
		it('should validate a complete exercise record', () => {
			const validBackup: ExerciseBackup = {
				version: '1.0',
				format: 'ubumaths-backup',
				created_at: new Date().toISOString(),
				created_by: 'admin@test.com',
				metadata: {
					tables_included: ['exercises'],
					record_counts: {
						exercises: 1,
						exercise_templates: 0,
						exercise_favorites: 0,
						exercise_share_tokens: 0
					}
				},
				data: {
					exercises: [
						{
							id: '550e8400-e29b-41d4-a716-446655440000',
							slug: 'test-exercise',
							title: 'Test Exercise',
							source: null,
							difficulty: 2,
							tags: ['algebra', 'equations'],
							statement_md: '# Problem\n\nSolve $x + 5 = 10$',
							solution_md: '# Solution\n\n$x = 5$',
							grade_levels: ['3eme', '2nde'],
							topic: 'Algebra',
							is_public: true,
							distribution_mode: 'on_demand',
							variables: [],
							variations: null,
							shared: null,
							resources: null,
							generic_functions: null,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
							created_by: '550e8400-e29b-41d4-a716-446655440001',
							_created_by_email: 'teacher@test.com'
						}
					],
					exercise_templates: [],
					exercise_favorites: [],
					exercise_share_tokens: []
				}
			};

			const result = validateBackup(validBackup);
			expect(result.success).toBe(true);
		});

		it('should reject exercise with invalid difficulty', () => {
			const invalidBackup = {
				version: '1.0' as const,
				format: 'ubumaths-backup' as const,
				created_at: new Date().toISOString(),
				created_by: 'admin@test.com',
				metadata: {
					tables_included: ['exercises'],
					record_counts: {
						exercises: 1,
						exercise_templates: 0,
						exercise_favorites: 0,
						exercise_share_tokens: 0
					}
				},
				data: {
					exercises: [
						{
							id: '550e8400-e29b-41d4-a716-446655440000',
							slug: null,
							title: null,
							source: null,
							difficulty: 5, // Invalid - must be 1, 2, or 3
							tags: [],
							statement_md: 'Test',
							solution_md: 'Test',
							grade_levels: null,
							topic: null,
							is_public: false,
							distribution_mode: 'on_demand',
							variables: {},
							variations: null,
							shared: null,
							resources: null,
							generic_functions: null,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
							created_by: '550e8400-e29b-41d4-a716-446655440001'
						}
					],
					exercise_templates: [],
					exercise_favorites: [],
					exercise_share_tokens: []
				}
			};

			const result = validateBackup(invalidBackup);
			expect(result.success).toBe(false);
			expect(result.error).toContain('difficulty');
		});

		it('should reject exercise with invalid UUID', () => {
			const invalidBackup = {
				version: '1.0' as const,
				format: 'ubumaths-backup' as const,
				created_at: new Date().toISOString(),
				created_by: 'admin@test.com',
				metadata: {
					tables_included: ['exercises'],
					record_counts: {
						exercises: 1,
						exercise_templates: 0,
						exercise_favorites: 0,
						exercise_share_tokens: 0
					}
				},
				data: {
					exercises: [
						{
							id: 'not-a-uuid', // Invalid
							slug: null,
							title: null,
							source: null,
							difficulty: 1,
							tags: [],
							statement_md: 'Test',
							solution_md: 'Test',
							grade_levels: null,
							topic: null,
							is_public: false,
							distribution_mode: 'on_demand',
							variables: {},
							variations: null,
							shared: null,
							resources: null,
							generic_functions: null,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
							created_by: '550e8400-e29b-41d4-a716-446655440001'
						}
					],
					exercise_templates: [],
					exercise_favorites: [],
					exercise_share_tokens: []
				}
			};

			const result = validateBackup(invalidBackup);
			expect(result.success).toBe(false);
			expect(result.error).toContain('UUID');
		});
	});
});

// ============================================================================
// SIZE VALIDATION TESTS
// ============================================================================

describe('Size Validation', () => {
	describe('isBackupSizeValid', () => {
		it('should accept valid file sizes', () => {
			expect(isBackupSizeValid(1024)).toBe(true); // 1 KB
			expect(isBackupSizeValid(1024 * 1024)).toBe(true); // 1 MB
			expect(isBackupSizeValid(50 * 1024 * 1024)).toBe(true); // 50 MB (limit)
		});

		it('should reject zero size', () => {
			expect(isBackupSizeValid(0)).toBe(false);
		});

		it('should reject negative size', () => {
			expect(isBackupSizeValid(-1)).toBe(false);
		});

		it('should reject files over limit', () => {
			expect(isBackupSizeValid(50 * 1024 * 1024 + 1)).toBe(false); // Just over 50 MB
			expect(isBackupSizeValid(100 * 1024 * 1024)).toBe(false); // 100 MB
		});
	});

	describe('getMaxFileSizeDisplay', () => {
		it('should return human-readable size', () => {
			const display = getMaxFileSizeDisplay();
			expect(display).toBe('50 MB');
		});
	});
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Constants', () => {
	it('should have correct backup version', () => {
		expect(BACKUP_VERSION).toBe('1.0');
	});

	it('should have correct backup format', () => {
		expect(BACKUP_FORMAT).toBe('ubumaths-backup');
	});

	it('should have correct max backup size', () => {
		expect(MAX_BACKUP_SIZE_BYTES).toBe(50 * 1024 * 1024);
	});
});

// ============================================================================
// TEMPLATE RECORD VALIDATION TESTS
// ============================================================================

describe('Template Record Validation', () => {
	it('should validate a system template', () => {
		const validBackup: ExerciseBackup = {
			version: '1.0',
			format: 'ubumaths-backup',
			created_at: new Date().toISOString(),
			created_by: 'admin@test.com',
			metadata: {
				tables_included: ['exercise_templates'],
				record_counts: {
					exercises: 0,
					exercise_templates: 1,
					exercise_favorites: 0,
					exercise_share_tokens: 0
				}
			},
			data: {
				exercises: [],
				exercise_templates: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						title: 'System Template',
						description: 'A system template for equations',
						template_data: { version: '1.0', difficulty: 1, tags: [], statement_md: '', solution_md: '' },
						is_system: true,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						created_by: null // System templates have null created_by
					}
				],
				exercise_favorites: [],
				exercise_share_tokens: []
			}
		};

		const result = validateBackup(validBackup);
		expect(result.success).toBe(true);
	});

	it('should validate a user template', () => {
		const validBackup: ExerciseBackup = {
			version: '1.0',
			format: 'ubumaths-backup',
			created_at: new Date().toISOString(),
			created_by: 'admin@test.com',
			metadata: {
				tables_included: ['exercise_templates'],
				record_counts: {
					exercises: 0,
					exercise_templates: 1,
					exercise_favorites: 0,
					exercise_share_tokens: 0
				}
			},
			data: {
				exercises: [],
				exercise_templates: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						title: 'User Template',
						description: null,
						template_data: { version: '1.0', difficulty: 2, tags: ['custom'], statement_md: 'Q', solution_md: 'A' },
						is_system: false,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						created_by: '550e8400-e29b-41d4-a716-446655440001',
						_created_by_email: 'teacher@test.com'
					}
				],
				exercise_favorites: [],
				exercise_share_tokens: []
			}
		};

		const result = validateBackup(validBackup);
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// FAVORITE RECORD VALIDATION TESTS
// ============================================================================

describe('Favorite Record Validation', () => {
	it('should validate a favorite record', () => {
		const validBackup: ExerciseBackup = {
			version: '1.0',
			format: 'ubumaths-backup',
			created_at: new Date().toISOString(),
			created_by: 'admin@test.com',
			metadata: {
				tables_included: ['exercise_favorites'],
				record_counts: {
					exercises: 0,
					exercise_templates: 0,
					exercise_favorites: 1,
					exercise_share_tokens: 0
				}
			},
			data: {
				exercises: [],
				exercise_templates: [],
				exercise_favorites: [
					{
						user_id: '550e8400-e29b-41d4-a716-446655440000',
						exercise_id: '550e8400-e29b-41d4-a716-446655440001',
						created_at: new Date().toISOString(),
						_user_email: 'teacher@test.com'
					}
				],
				exercise_share_tokens: []
			}
		};

		const result = validateBackup(validBackup);
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// SHARE TOKEN RECORD VALIDATION TESTS
// ============================================================================

describe('Share Token Record Validation', () => {
	it('should validate a share token record', () => {
		const validBackup: ExerciseBackup = {
			version: '1.0',
			format: 'ubumaths-backup',
			created_at: new Date().toISOString(),
			created_by: 'admin@test.com',
			metadata: {
				tables_included: ['exercise_share_tokens'],
				record_counts: {
					exercises: 0,
					exercise_templates: 0,
					exercise_favorites: 0,
					exercise_share_tokens: 1
				}
			},
			data: {
				exercises: [],
				exercise_templates: [],
				exercise_favorites: [],
				exercise_share_tokens: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						exercise_id: '550e8400-e29b-41d4-a716-446655440001',
						token: 'ABC123DEF456GH78',
						created_by: '550e8400-e29b-41d4-a716-446655440002',
						expires_at: null,
						is_active: true,
						access_count: 5,
						last_accessed_at: new Date().toISOString(),
						created_at: new Date().toISOString(),
						_created_by_email: 'teacher@test.com'
					}
				]
			}
		};

		const result = validateBackup(validBackup);
		expect(result.success).toBe(true);
	});

	it('should validate a share token with expiration', () => {
		const validBackup: ExerciseBackup = {
			version: '1.0',
			format: 'ubumaths-backup',
			created_at: new Date().toISOString(),
			created_by: 'admin@test.com',
			metadata: {
				tables_included: ['exercise_share_tokens'],
				record_counts: {
					exercises: 0,
					exercise_templates: 0,
					exercise_favorites: 0,
					exercise_share_tokens: 1
				}
			},
			data: {
				exercises: [],
				exercise_templates: [],
				exercise_favorites: [],
				exercise_share_tokens: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						exercise_id: '550e8400-e29b-41d4-a716-446655440001',
						token: 'XYZ789',
						created_by: '550e8400-e29b-41d4-a716-446655440002',
						expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
						is_active: false,
						access_count: 0,
						last_accessed_at: null,
						created_at: new Date().toISOString()
					}
				]
			}
		};

		const result = validateBackup(validBackup);
		expect(result.success).toBe(true);
	});
});
