/**
 * Chapter Templates Server Functions - Unit Tests
 * =================================================
 *
 * Schémas Zod, conversions de lignes, fonctions serveur du modèle (création,
 * lecture, modification, publication, archivage, instanciation, rattachement
 * affiché). Le contenu POSSÉDÉ par le modèle et le lien du chapitre (ADR 0029)
 * sont couverts par `modele-lien.test.ts` et les tests d'intégration `modele-*`.
 *
 * Uses mocked Supabase client to isolate business logic from database.
 *
 * @module server/chapter-templates.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import * as templates from '../chapter-templates';
import * as validation from '../validation/chapter-templates';
import type {
	CreateChapterTemplateInput,
	CreateTemplateFromChapterInput,
	UpdateChapterTemplateInput,
	InstantiateTemplateInput
} from '../validation/chapter-templates';
import type { GradeCode } from '$lib/types/grades';
import type {
	DbChapterTemplate,
	DbChapterTemplateInstantiation
} from '$lib/types/chapter-templates';
import { dbTemplateToApp, dbInstantiationToApp } from '$lib/types/chapter-templates';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Create a mock Supabase client with chainable query builder
 */
function createMockSupabase() {
	const mockChain = {
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		not: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		overlaps: vi.fn().mockReturnThis(),
		ilike: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		single: vi.fn(),
		maybeSingle: vi.fn(),
		// Terminal operations that return promises
		then: vi.fn()
	};

	const mockRpc = vi.fn();

	return {
		from: vi.fn(() => mockChain),
		rpc: mockRpc,
		_mockChain: mockChain,
		_mockRpc: mockRpc
	} as unknown as SupabaseClient<Database> & {
		_mockChain: typeof mockChain;
		_mockRpc: typeof mockRpc;
	};
}

type MockSupabaseClient = ReturnType<typeof createMockSupabase>;

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

// Use valid UUIDs for all IDs (RFC 4122 compliant)
const mockUserId = '11111111-1111-4111-8111-111111111111';
const mockTemplateId = '22222222-2222-4222-8222-222222222222';
const mockInstantiationId = '44444444-4444-4444-8444-444444444444';
const mockChapterId = '55555555-5555-4555-8555-555555555555';
const mockClassId = '66666666-6666-4666-8666-666666666666';

const mockDbTemplate: DbChapterTemplate = {
	id: mockTemplateId,
	created_by: mockUserId,
	status: 'draft',
	title: 'Algebre - Chapitre 1',
	description: "Introduction a l'algebre",
	grades: ['6', '5'],
	color: 'blue',
	icon: 'calculator',
	instantiation_count: 0,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

const mockDbInstantiation: DbChapterTemplateInstantiation = {
	id: mockInstantiationId,
	template_id: mockTemplateId,
	chapter_id: mockChapterId,
	is_detached: false,
	instantiated_at: '2024-01-01T00:00:00Z'
};

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

describe('Template CRUD Validation Schemas', () => {
	describe('createChapterTemplateSchema', () => {
		it('should validate minimal template data', () => {
			const data = {
				title: 'Algebre'
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.grades).toEqual([]);
			}
		});

		it('should validate complete template data', () => {
			const data: CreateChapterTemplateInput = {
				title: 'Algebre - Chapitre 1',
				description: 'Introduction complete',
				grades: ['6', '5'],
				color: 'blue',
				icon: 'calculator'
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty title', () => {
			const data = {
				title: ''
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject title longer than 200 characters', () => {
			const data = {
				title: 'A'.repeat(201)
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept title at max length (200 chars)', () => {
			const data = {
				title: 'A'.repeat(200)
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject description longer than 2000 characters', () => {
			const data = {
				title: 'Algebre',
				description: 'A'.repeat(2001)
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept valid grade levels', () => {
			const data = {
				// Lycée codes are split by track ('1' → '1_GEN'/'1_SPE'/…, 'T' → 'T_GEN'/…)
				title: 'Algebre',
				grades: ['6', '5', '4', '3', '2', '1_GEN', 'T_GEN']
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid grade level', () => {
			const data = {
				title: 'Algebre',
				grades: ['6', '8']
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many grades (>18)', () => {
			// The array limit is `.max(18)`; 19 entries → rejected on count.
			// (Previously this used the invalid codes '1'/'T', so it was rejected
			// for the wrong reason and hid the real limit.)
			const data = {
				title: 'Algebre',
				grades: Array.from({ length: 19 }, () => '6')
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should trim whitespace from title', () => {
			const data = {
				title: '  Algebre  '
			};

			const result = validation.createChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe('Algebre');
			}
		});
	});

	describe('createTemplateFromChapterSchema', () => {
		it('should validate template from chapter', () => {
			const data: CreateTemplateFromChapterInput = {
				chapterId: mockChapterId,
				title: 'Template from Chapter',
				description: 'Created from existing chapter',
				grades: ['6']
			};

			const result = validation.createTemplateFromChapterSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid chapter UUID', () => {
			const data = {
				chapterId: 'not-a-uuid',
				title: 'Template',
				grades: []
			};

			const result = validation.createTemplateFromChapterSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should default to empty grades array', () => {
			const data = {
				chapterId: mockChapterId,
				title: 'Template'
			};

			const result = validation.createTemplateFromChapterSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.grades).toEqual([]);
			}
		});
	});

	describe('updateChapterTemplateSchema', () => {
		it('should validate single field update', () => {
			const data: UpdateChapterTemplateInput = {
				title: 'Nouveau titre'
			};

			const result = validation.updateChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should validate multiple field updates', () => {
			const data: UpdateChapterTemplateInput = {
				title: 'Nouveau titre',
				description: 'Nouvelle description',
				grades: ['6', '5'],
				color: 'red'
			};

			const result = validation.updateChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty update object', () => {
			const data = {};

			const result = validation.updateChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Au moins un champ');
			}
		});

		it('should reject invalid title in update', () => {
			const data = {
				title: ''
			};

			const result = validation.updateChapterTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('instantiateTemplateSchema', () => {
		it('should validate instantiation with all fields', () => {
			const data: InstantiateTemplateInput = {
				templateId: mockTemplateId,
				classId: mockClassId,
				title: 'Custom Chapter Title',
				isVisible: true
			};

			const result = validation.instantiateTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should validate minimal instantiation', () => {
			const data = {
				templateId: mockTemplateId,
				classId: mockClassId
			};

			const result = validation.instantiateTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isVisible).toBe(false);
			}
		});

		it('should reject invalid template UUID', () => {
			const data = {
				templateId: 'not-a-uuid',
				classId: mockClassId
			};

			const result = validation.instantiateTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid class UUID', () => {
			const data = {
				templateId: mockTemplateId,
				classId: 'not-a-uuid'
			};

			const result = validation.instantiateTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});
});

// ============================================================================
// TYPE CONVERSION TESTS
// ============================================================================

describe('Type Conversion Functions', () => {
	describe('dbTemplateToApp', () => {
		it('should convert database template to app type', () => {
			const app = dbTemplateToApp(mockDbTemplate);

			expect(app.id).toBe(mockTemplateId);
			expect(app.createdBy).toBe(mockUserId);
			expect(app.status).toBe('draft');
			expect(app.title).toBe('Algebre - Chapitre 1');
			expect(app.instantiationCount).toBe(0);
		});
	});

	describe('dbInstantiationToApp', () => {
		it('should convert database instantiation to app type', () => {
			const app = dbInstantiationToApp(mockDbInstantiation);

			expect(app).toEqual({
				id: mockInstantiationId,
				templateId: mockTemplateId,
				chapterId: mockChapterId,
				isDetached: false,
				instantiatedAt: '2024-01-01T00:00:00Z'
			});
		});
	});
});

// ============================================================================
// SERVER FUNCTION TESTS - TEMPLATE CRUD
// ============================================================================

describe('Template CRUD Functions', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	describe('createChapterTemplate', () => {
		it('should create template with valid data', async () => {
			const templateData: CreateChapterTemplateInput = {
				title: 'Algebre',
				description: 'Introduction',
				grades: ['6', '5'],
				color: 'blue',
				icon: 'calculator'
			};

			supabase._mockChain.single.mockResolvedValueOnce({
				data: mockDbTemplate,
				error: null
			});

			const result = await templates.createChapterTemplate(templateData, mockUserId, supabase);

			expect(result.error).toBeNull();
			expect(result.data).toBeDefined();
			expect(result.data?.title).toBe('Algebre - Chapitre 1');
			expect(result.data?.status).toBe('draft');
		});

		it('should create template with minimal data', async () => {
			const templateData = {
				title: 'Minimal Template',
				grades: [] as GradeCode[]
			};

			const minimalTemplate = {
				...mockDbTemplate,
				title: 'Minimal Template',
				description: null,
				grades: [],
				color: null,
				icon: null
			};

			supabase._mockChain.single.mockResolvedValueOnce({
				data: minimalTemplate,
				error: null
			});

			const result = await templates.createChapterTemplate(templateData, mockUserId, supabase);

			expect(result.error).toBeNull();
			expect(result.data?.title).toBe('Minimal Template');
		});

		it('should handle database error', async () => {
			const templateData = {
				title: 'Test',
				grades: [] as GradeCode[]
			};

			supabase._mockChain.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Database error' }
			});

			const result = await templates.createChapterTemplate(templateData, mockUserId, supabase);

			expect(result.error).toBeDefined();
			expect(result.data).toBeNull();
		});
	});

	describe('getChapterTemplate', () => {
		it('should retrieve template by ID', async () => {
			supabase._mockChain.single.mockResolvedValueOnce({
				data: mockDbTemplate,
				error: null
			});

			const result = await templates.getChapterTemplate(mockTemplateId, supabase);

			expect(result.error).toBeNull();
			expect(result.data?.id).toBe(mockTemplateId);
			expect(result.data?.title).toBe('Algebre - Chapitre 1');
		});

		it('should handle template not found', async () => {
			supabase._mockChain.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Template not found' }
			});

			const result = await templates.getChapterTemplate('non-existent-id', supabase);

			expect(result.error).toBeDefined();
			expect(result.data).toBeNull();
		});
	});

	describe('updateChapterTemplate', () => {
		it('should update template metadata', async () => {
			const updates: UpdateChapterTemplateInput = {
				title: 'Nouveau titre',
				description: 'Nouvelle description'
			};

			supabase._mockChain.single.mockResolvedValueOnce({
				data: { ...mockDbTemplate, title: 'Nouveau titre' },
				error: null
			});

			const result = await templates.updateChapterTemplate(mockTemplateId, updates, supabase);

			expect(result.error).toBeNull();
			expect(result.data?.title).toBe('Nouveau titre');
			// Seules les métadonnées s'écrivent : plus aucune colonne de version.
			expect(supabase._mockChain.update).toHaveBeenCalledWith({
				title: 'Nouveau titre',
				description: 'Nouvelle description'
			});
		});

		it('should handle database error', async () => {
			supabase._mockChain.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Database error' }
			});

			const result = await templates.updateChapterTemplate(
				mockTemplateId,
				{ title: 'New title' },
				supabase
			);

			expect(result.error).toBeDefined();
			expect(result.data).toBeNull();
		});
	});
});

// ============================================================================
// SERVER FUNCTION TESTS - PUBLISHING OPERATIONS
// ============================================================================

describe('Publishing Operations', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	describe('instantiateTemplate', () => {
		// Publier, c'est justement dire « ce modèle est prêt à servir ». Laisser
		// instancier un brouillon vidait ce geste de son sens, et répandait dans
		// des classes un contenu encore en chantier.
		it('refuse d’instancier un brouillon', async () => {
			supabase._mockChain.single.mockResolvedValueOnce({
				data: { ...mockDbTemplate, status: 'draft' },
				error: null
			});

			const result = await templates.instantiateTemplate(
				{ templateId: mockTemplateId, classId: mockClassId, isVisible: false },
				mockUserId,
				supabase
			);

			expect(result.data).toBeNull();
			expect(result.error?.message).toContain('brouillon');
		});

		it('refuse d’instancier un modèle archivé', async () => {
			supabase._mockChain.single.mockResolvedValueOnce({
				data: { ...mockDbTemplate, status: 'archived' },
				error: null
			});

			const result = await templates.instantiateTemplate(
				{ templateId: mockTemplateId, classId: mockClassId, isVisible: false },
				mockUserId,
				supabase
			);

			expect(result.data).toBeNull();
			expect(result.error).toBeDefined();
		});
	});

	describe('deleteChapterTemplate', () => {
		// Archivé veut dire « retiré de l'usage, mais conservé » : le détruire
		// effacerait la trace de ce qui a servi.
		it('refuse de supprimer un modèle archivé', async () => {
			supabase._mockChain.single.mockResolvedValueOnce({
				data: { status: 'archived' },
				error: null
			});

			const result = await templates.deleteChapterTemplate(mockTemplateId, supabase);

			expect(result.error?.message).toContain('archivé');
		});
	});

	describe('archiveTemplate', () => {
		it('should archive template', async () => {
			supabase._mockChain.single.mockResolvedValueOnce({
				data: { ...mockDbTemplate, status: 'archived' },
				error: null
			});

			const result = await templates.archiveTemplate(mockTemplateId, supabase);

			expect(result.error).toBeNull();
			expect(result.data?.status).toBe('archived');
		});

		it('should handle database error', async () => {
			supabase._mockChain.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Archive failed' }
			});

			const result = await templates.archiveTemplate(mockTemplateId, supabase);

			expect(result.error).toBeDefined();
			expect(result.data).toBeNull();
		});
	});
});

// ============================================================================
// SERVER FUNCTION TESTS - INSTANTIATION
// ============================================================================

describe('Instantiation Operations', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	describe('instantiateTemplate', () => {
		// La création d'un chapitre lié (lien, titre par défaut, retour arrière) est
		// couverte par `modele-lien.test.ts` ; ici, l'échec de lecture du modèle.
		it('should handle template not found', async () => {
			const input: InstantiateTemplateInput = {
				templateId: mockTemplateId,
				classId: mockClassId,
				isVisible: false
			};

			supabase._mockChain.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Template not found' }
			});

			const result = await templates.instantiateTemplate(input, mockUserId, supabase);

			expect(result.error).toBeDefined();
			expect(result.data).toBeNull();
		});
	});
});

// ============================================================================
// getInstantiationWithStatus — ce que l'ÉCRAN doit recevoir
// ============================================================================

describe('getInstantiationWithStatus', () => {
	let mockSupabase: MockSupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	/**
	 * ⚠️ LE cas qui a coûté un plantage en production : un objet « rien à
	 * signaler » passé pour un chapitre sans modèle — donc VRAI — faisait
	 * afficher « Template supprimé » sur tous les chapitres créés à la main,
	 * puis « Context "Tooltip.Provider" not found » et l'hydratation arrêtée net.
	 *
	 * `null` est la seule valeur qui dise « rien à montrer ».
	 */
	it('rend null quand le chapitre n’a aucun modèle', async () => {
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

		const result = await templates.getInstantiationWithStatus(mockChapterId, mockSupabase);

		expect(result.error).toBeNull();
		expect(result.data).toBeNull();
	});

	it('rend l’instanciation, avec le titre du modèle', async () => {
		mockSupabase._mockChain.maybeSingle
			.mockResolvedValueOnce({ data: mockDbInstantiation, error: null })
			.mockResolvedValueOnce({ data: { title: 'Les fonctions affines' }, error: null });

		const result = await templates.getInstantiationWithStatus(mockChapterId, mockSupabase);

		expect(result.error).toBeNull();
		expect(result.data).toEqual({
			id: mockInstantiationId,
			templateId: mockTemplateId,
			chapterId: mockChapterId,
			isDetached: false,
			instantiatedAt: '2024-01-01T00:00:00Z',
			templateTitle: 'Les fonctions affines'
		});
	});

	/** Plus aucune colonne de l'ancien système de versions n'est lue. */
	it('ne lit aucune colonne de version', async () => {
		mockSupabase._mockChain.maybeSingle
			.mockResolvedValueOnce({ data: mockDbInstantiation, error: null })
			.mockResolvedValueOnce({ data: { title: 'Les fonctions affines' }, error: null });

		await templates.getInstantiationWithStatus(mockChapterId, mockSupabase);

		const colonnes = mockSupabase._mockChain.select.mock.calls.map((c) => String(c[0]));
		expect(colonnes.join(' ')).not.toMatch(/\*|version|migrated|snapshot/);
	});

	/**
	 * Modèle supprimé : l'instanciation reste, et l'écran doit pouvoir le dire.
	 * C'est une absence de modèle, pas une absence d'instanciation — la
	 * distinction est justement celle que la page avait perdue.
	 */
	it('garde l’instanciation d’un modèle supprimé, sans titre', async () => {
		mockSupabase._mockChain.maybeSingle
			.mockResolvedValueOnce({ data: mockDbInstantiation, error: null })
			.mockResolvedValueOnce({ data: null, error: null });

		const result = await templates.getInstantiationWithStatus(mockChapterId, mockSupabase);

		expect(result.data).toMatchObject({
			id: mockInstantiationId,
			templateTitle: null
		});
	});
});
