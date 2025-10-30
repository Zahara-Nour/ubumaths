// @ts-nocheck - Database schema integration tests validated at runtime
/**
 * Template Versioning Trigger Tests
 *
 * Tests for message template version history triggers
 *
 * Migration: supabase/migrations/098_enhance_message_templates.sql
 *
 * Triggers tested:
 * - trigger_save_template_version (BEFORE UPDATE on message_templates)
 *   → save_template_version()
 *
 * Trigger behavior:
 * - Creates version history BEFORE UPDATE when template content changes
 * - WHEN: title, subject_template, body_template, or variables change
 * - Inserts snapshot into message_template_versions table
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../helpers/trigger-test-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

type MessageTemplate = Database['public']['Tables']['message_templates']['Row'];
type MessageTemplateVersion = Database['public']['Tables']['message_template_versions']['Row'];

describe('Template Version History Triggers', () => {
	let serviceClient: SupabaseClient<Database>;
	let testTeacher: Database['public']['Tables']['profiles']['Row'];

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		await cleanupAllTestData();

		// Create test teacher
		const { data: teacher } = await serviceClient
			.from('profiles')
			.insert({
				email: `teacher-${Date.now()}@test.com`,
				role: 'teacher',
				full_name: 'Test Teacher'
			})
			.select()
			.single();

		testTeacher = teacher!;
	});

	/**
	 * Helper to create a test template
	 */
	async function createTemplate(
		overrides?: Partial<Database['public']['Tables']['message_templates']['Insert']>
	): Promise<MessageTemplate> {
		const { data, error } = await serviceClient
			.from('message_templates')
			.insert({
				created_by: testTeacher.id,
				title: 'Test Template',
				subject_template: 'Test Subject',
				body_template: 'Test Body',
				trigger_type: 'manual',
				scope: 'class',
				variables: [{ name: 'student_name', type: 'text' }],
				...overrides
			})
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	/**
	 * Helper to get version history for a template
	 */
	async function getVersionHistory(templateId: string): Promise<MessageTemplateVersion[]> {
		const { data } = await serviceClient
			.from('message_template_versions')
			.select()
			.eq('template_id', templateId)
			.order('version_number', { ascending: true });

		return data || [];
	}

	describe('trigger_save_template_version (BEFORE UPDATE)', () => {
		it('should create version history when title changes', async () => {
			// Arrange: Create template
			const template = await createTemplate({
				title: 'Original Title',
				subject_template: 'Subject',
				body_template: 'Body'
			});

			// Act: Update title
			await serviceClient
				.from('message_templates')
				.update({ title: 'Updated Title' })
				.eq('id', template.id);

			// Assert: Version history should be created
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(1);
			expect(versions[0].version_number).toBe(1);
			expect(versions[0].title).toBe('Original Title'); // Saves OLD values
			expect(versions[0].subject_template).toBe('Subject');
			expect(versions[0].body_template).toBe('Body');
			expect(versions[0].modified_by).toBe(testTeacher.id);
			expect(versions[0].change_summary).toBe('Titre modifié');
		});

		it('should create version history when subject_template changes', async () => {
			// Arrange
			const template = await createTemplate({
				title: 'Title',
				subject_template: 'Original Subject',
				body_template: 'Body'
			});

			// Act: Update subject
			await serviceClient
				.from('message_templates')
				.update({ subject_template: 'New Subject' })
				.eq('id', template.id);

			// Assert
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(1);
			expect(versions[0].subject_template).toBe('Original Subject');
			expect(versions[0].change_summary).toBe('Sujet modifié');
		});

		it('should create version history when body_template changes', async () => {
			// Arrange
			const template = await createTemplate({
				title: 'Title',
				subject_template: 'Subject',
				body_template: 'Original Body'
			});

			// Act: Update body
			await serviceClient
				.from('message_templates')
				.update({ body_template: 'New Body Content' })
				.eq('id', template.id);

			// Assert
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(1);
			expect(versions[0].body_template).toBe('Original Body');
			expect(versions[0].change_summary).toBe('Corps modifié');
		});

		it('should create version history when variables change', async () => {
			// Arrange
			const originalVariables = [
				{ name: 'student_name', type: 'text' },
				{ name: 'grade', type: 'number' }
			];

			const template = await createTemplate({
				title: 'Title',
				subject_template: 'Subject',
				body_template: 'Body',
				variables: originalVariables
			});

			// Act: Update variables
			const newVariables = [{ name: 'student_name', type: 'text' }];

			await serviceClient
				.from('message_templates')
				.update({ variables: newVariables })
				.eq('id', template.id);

			// Assert
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(1);
			expect(versions[0].variables).toEqual(originalVariables);
			expect(versions[0].change_summary).toBe('Template modifié');
		});

		it('should NOT create version when non-tracked fields change', async () => {
			// Arrange
			const template = await createTemplate({
				title: 'Title',
				subject_template: 'Subject',
				body_template: 'Body',
				description: 'Original Description'
			});

			// Act: Update description (not tracked in WHEN clause)
			await serviceClient
				.from('message_templates')
				.update({ description: 'New Description' })
				.eq('id', template.id);

			// Assert: No version should be created
			const versions = await getVersionHistory(template.id);
			expect(versions).toHaveLength(0);
		});

		it('should track multiple versions over time', async () => {
			// Arrange
			const template = await createTemplate({
				title: 'Version 1',
				subject_template: 'Subject V1',
				body_template: 'Body V1'
			});

			// Act: Make multiple changes
			// Change 1: Update title
			await serviceClient
				.from('message_templates')
				.update({ title: 'Version 2' })
				.eq('id', template.id);

			// Wait to ensure distinct timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Change 2: Update subject
			await serviceClient
				.from('message_templates')
				.update({ subject_template: 'Subject V2' })
				.eq('id', template.id);

			// Wait again
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Change 3: Update body
			await serviceClient
				.from('message_templates')
				.update({ body_template: 'Body V2' })
				.eq('id', template.id);

			// Assert: Three versions should exist
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(3);

			// Version 1: Original title change
			expect(versions[0].version_number).toBe(1);
			expect(versions[0].title).toBe('Version 1');
			expect(versions[0].change_summary).toBe('Titre modifié');

			// Version 2: Subject change (title was already 'Version 2')
			expect(versions[1].version_number).toBe(2);
			expect(versions[1].title).toBe('Version 2');
			expect(versions[1].subject_template).toBe('Subject V1');
			expect(versions[1].change_summary).toBe('Sujet modifié');

			// Version 3: Body change
			expect(versions[2].version_number).toBe(3);
			expect(versions[2].body_template).toBe('Body V1');
			expect(versions[2].change_summary).toBe('Corps modifié');
		});

		it('should preserve all template fields in version snapshot', async () => {
			// Arrange: Create template with all optional fields
			const template = await createTemplate({
				title: 'Complete Template',
				description: 'Full description',
				subject_template: 'Subject with {{variable}}',
				body_template: 'Body with {{student_name}}',
				trigger_type: 'assessment_completed',
				scope: 'system',
				variables: [{ name: 'student_name', type: 'text' }],
				tags: ['important', 'automated']
			});

			// Act: Update title to trigger version save
			await serviceClient
				.from('message_templates')
				.update({ title: 'Updated Title' })
				.eq('id', template.id);

			// Assert: Version should preserve all fields
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(1);
			const version = versions[0];

			expect(version.title).toBe('Complete Template');
			expect(version.description).toBe('Full description');
			expect(version.subject_template).toBe('Subject with {{variable}}');
			expect(version.body_template).toBe('Body with {{student_name}}');
			expect(version.trigger_type).toBe('assessment_completed');
			expect(version.scope).toBe('system');
			expect(version.variables).toEqual([{ name: 'student_name', type: 'text' }]);
			expect(version.tags).toEqual(['important', 'automated']);
		});

		it('should handle simultaneous updates to multiple tracked fields', async () => {
			// Arrange
			const template = await createTemplate({
				title: 'Original',
				subject_template: 'Original Subject',
				body_template: 'Original Body'
			});

			// Act: Update multiple tracked fields at once
			await serviceClient
				.from('message_templates')
				.update({
					title: 'New Title',
					subject_template: 'New Subject',
					body_template: 'New Body'
				})
				.eq('id', template.id);

			// Assert: Only one version should be created (single UPDATE)
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(1);
			expect(versions[0].title).toBe('Original');
			expect(versions[0].subject_template).toBe('Original Subject');
			expect(versions[0].body_template).toBe('Original Body');

			// Change summary should prioritize title (first in CASE statement)
			expect(versions[0].change_summary).toBe('Titre modifié');
		});
	});

	describe('Edge cases', () => {
		it('should handle NULL to non-NULL transitions', async () => {
			// Arrange: Create template with NULL description
			const template = await createTemplate({
				title: 'Title',
				subject_template: 'Subject',
				body_template: 'Body',
				description: null
			});

			// Act: Update title (triggers version save)
			await serviceClient
				.from('message_templates')
				.update({ title: 'New Title' })
				.eq('id', template.id);

			// Assert: Version should handle NULL description
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(1);
			expect(versions[0].description).toBeNull();
		});

		it('should handle empty arrays in variables', async () => {
			// Arrange
			const template = await createTemplate({
				title: 'Title',
				subject_template: 'Subject',
				body_template: 'Body',
				variables: []
			});

			// Act: Update variables to non-empty
			await serviceClient
				.from('message_templates')
				.update({ variables: [{ name: 'test', type: 'text' }] })
				.eq('id', template.id);

			// Assert
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(1);
			expect(versions[0].variables).toEqual([]);
		});

		it('should handle rapid successive updates with version numbering', async () => {
			// Arrange
			const template = await createTemplate({
				title: 'V1',
				subject_template: 'Subject',
				body_template: 'Body'
			});

			// Act: Rapid updates
			const updatePromises = Array.from({ length: 5 }, (_, i) =>
				serviceClient
					.from('message_templates')
					.update({ title: `V${i + 2}` })
					.eq('id', template.id)
			);

			await Promise.all(updatePromises);

			// Assert: All versions should have unique, sequential version numbers
			const versions = await getVersionHistory(template.id);

			expect(versions.length).toBeGreaterThan(0);
			expect(versions.length).toBeLessThanOrEqual(5);

			// Verify version numbers are sequential
			versions.forEach((version, index) => {
				expect(version.version_number).toBe(index + 1);
			});
		});
	});

	describe('Integration with template operations', () => {
		it('should maintain version history when template is updated via UI workflow', async () => {
			// Arrange: Simulate real workflow
			const template = await createTemplate({
				title: 'Welcome Email',
				subject_template: 'Welcome to {{class_name}}',
				body_template: 'Dear {{student_name}}, welcome!',
				trigger_type: 'manual',
				scope: 'class'
			});

			// Act: Teacher makes iterative improvements
			// Iteration 1: Improve subject line
			await serviceClient
				.from('message_templates')
				.update({ subject_template: "Welcome to {{class_name}} - Let's Get Started!" })
				.eq('id', template.id);

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Iteration 2: Add more personalization to body
			await serviceClient
				.from('message_templates')
				.update({
					body_template:
						"Dear {{student_name}},\n\nWelcome to {{class_name}}! I'm excited to have you."
				})
				.eq('id', template.id);

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Iteration 3: Change title for clarity
			await serviceClient
				.from('message_templates')
				.update({ title: 'Welcome Email - New Students' })
				.eq('id', template.id);

			// Assert: Full history preserved
			const versions = await getVersionHistory(template.id);

			expect(versions).toHaveLength(3);

			// Can trace back to original
			expect(versions[0].subject_template).toBe('Welcome to {{class_name}}');
			expect(versions[1].body_template).toBe('Dear {{student_name}}, welcome!');
			expect(versions[2].title).toBe('Welcome Email');
		});

		it('should NOT create version on INSERT', async () => {
			// Arrange & Act: Create new template
			const template = await createTemplate({
				title: 'New Template',
				subject_template: 'Subject',
				body_template: 'Body'
			});

			// Assert: No versions should exist (trigger only fires BEFORE UPDATE)
			const versions = await getVersionHistory(template.id);
			expect(versions).toHaveLength(0);
		});
	});
});
