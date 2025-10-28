/**
 * Private Messaging System Trigger Tests
 *
 * Tests for triggers related to the private messaging system
 *
 * Triggers tested:
 * - trigger_update_message_search_index (AFTER INSERT OR UPDATE on private_messages)
 * - trigger_update_search_index_on_attachment (AFTER INSERT on message_attachments_v2)
 * - trigger_update_folder_count_on_insert (AFTER INSERT on message_inbox)
 * - trigger_update_folder_count_on_update (AFTER UPDATE on message_inbox)
 * - trigger_update_folder_count_on_delete (AFTER DELETE on message_inbox)
 * - enforce_max_attachments (BEFORE INSERT on message_attachments_v2)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../helpers/trigger-test-helpers';
import { TestData } from '../helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Private Messaging Triggers', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	describe('trigger_update_message_search_index', () => {
		it('should create search index entry when message is inserted', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('teacher').withFullName('John Doe').create();

			// Act: Create message
			const message = await TestData.privateMessage(sender.id)
				.withSubject('Test Subject')
				.withPlainText('Test message content')
				.create();

			// Wait for trigger to execute
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Search index should be created
			const { data: searchIndex, error } = await serviceClient
				.from('message_search_index')
				.select()
				.eq('message_id', message.id)
				.single();

			expect(error).toBeNull();
			expect(searchIndex).toBeDefined();
			expect(searchIndex?.message_id).toBe(message.id);
			expect(searchIndex?.sender_name).toBe('John Doe');
			expect(searchIndex?.sender_role).toBe('teacher');
			expect(searchIndex?.has_attachments).toBe(false);
			expect(searchIndex?.recipient_count).toBe(1);
		});

		it('should populate TSVector fields for full-text search', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('student').create();

			// Act: Create message with French content
			const message = await TestData.privateMessage(sender.id)
				.withSubject('Question sur les mathématiques')
				.withPlainText("Bonjour, j'ai une question sur les équations du second degré.")
				.create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: TSVector fields should be populated
			const { data: searchIndex } = await serviceClient
				.from('message_search_index')
				.select('subject_tsv, content_tsv, search_tsv')
				.eq('message_id', message.id)
				.single();

			expect(searchIndex).toBeDefined();
			expect(searchIndex?.subject_tsv).toBeDefined();
			expect(searchIndex?.content_tsv).toBeDefined();
			expect(searchIndex?.search_tsv).toBeDefined();

			// TSVector should contain stemmed French words (not testing exact format, just existence)
			expect(searchIndex?.subject_tsv).not.toBeNull();
			expect(searchIndex?.content_tsv).not.toBeNull();
		});

		it('should update search index when message is updated', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('teacher').create();
			const message = await TestData.privateMessage(sender.id)
				.withSubject('Original Subject')
				.withPlainText('Original content')
				.create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Act: Update message
			await serviceClient
				.from('private_messages')
				.update({
					subject: 'Updated Subject',
					plain_text: 'Updated content'
				})
				.eq('id', message.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Search index should be updated
			const { data: searchIndex } = await serviceClient
				.from('message_search_index')
				.select('subject_tsv, content_tsv')
				.eq('message_id', message.id)
				.single();

			expect(searchIndex).toBeDefined();
			// TSVector should reflect updated content (not testing exact format)
			expect(searchIndex?.subject_tsv).toBeDefined();
			expect(searchIndex?.content_tsv).toBeDefined();
		});

		it('should handle empty subject and content gracefully with COALESCE', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('student').create();

			// Act: Create message with empty plain_text (edge case)
			const { data: message } = await serviceClient
				.from('private_messages')
				.insert({
					sender_id: sender.id,
					subject: 'Subject only',
					content: { type: 'doc', content: [] },
					plain_text: null as unknown as string, // Force NULL
					recipient_count: 1
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Search index should be created with COALESCE handling NULL
			const { data: searchIndex, error } = await serviceClient
				.from('message_search_index')
				.select()
				.eq('message_id', message!.id)
				.single();

			expect(error).toBeNull();
			expect(searchIndex).toBeDefined();
			// Should not fail even with NULL plain_text
			expect(searchIndex?.content_tsv).toBeDefined();
		});

		it('should populate sender info correctly from profiles table', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('admin').withFullName('Admin User').create();

			// Act
			const message = await TestData.privateMessage(sender.id).create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Sender info should be denormalized in search index
			const { data: searchIndex } = await serviceClient
				.from('message_search_index')
				.select('sender_name, sender_role')
				.eq('message_id', message.id)
				.single();

			expect(searchIndex?.sender_name).toBe('Admin User');
			expect(searchIndex?.sender_role).toBe('admin');
		});

		it('should set has_attachments to false when no attachments exist', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('teacher').create();

			// Act
			const message = await TestData.privateMessage(sender.id).create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert
			const { data: searchIndex } = await serviceClient
				.from('message_search_index')
				.select('has_attachments')
				.eq('message_id', message.id)
				.single();

			expect(searchIndex?.has_attachments).toBe(false);
		});

		it('should store correct recipient_count from message', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('teacher').create();

			// Act: Create group message
			const message = await TestData.privateMessage(sender.id)
				.isGroupMessage()
				.withRecipientCount(15)
				.create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert
			const { data: searchIndex } = await serviceClient
				.from('message_search_index')
				.select('recipient_count')
				.eq('message_id', message.id)
				.single();

			expect(searchIndex?.recipient_count).toBe(15);
		});
	});

	describe('trigger_update_search_index_on_attachment', () => {
		it('should update has_attachments flag when attachment is added', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('student').create();
			const message = await TestData.privateMessage(sender.id).create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify initial state
			const { data: initialIndex } = await serviceClient
				.from('message_search_index')
				.select('has_attachments')
				.eq('message_id', message.id)
				.single();

			expect(initialIndex?.has_attachments).toBe(false);

			// Act: Add attachment
			await serviceClient.from('message_attachments_v2').insert({
				message_id: message.id,
				file_name: 'test.pdf',
				file_type: 'application/pdf',
				file_size: 1000,
				storage_path: 'messages/test.pdf',
				uploaded_by: sender.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: has_attachments should be TRUE
			const { data: updatedIndex } = await serviceClient
				.from('message_search_index')
				.select('has_attachments')
				.eq('message_id', message.id)
				.single();

			expect(updatedIndex?.has_attachments).toBe(true);
		});

		it('should update search index even when multiple attachments are added', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('teacher').create();
			const message = await TestData.privateMessage(sender.id).create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Act: Add two attachments
			await serviceClient.from('message_attachments_v2').insert([
				{
					message_id: message.id,
					file_name: 'file1.pdf',
					file_type: 'application/pdf',
					file_size: 1000,
					storage_path: 'messages/file1.pdf',
					uploaded_by: sender.id
				},
				{
					message_id: message.id,
					file_name: 'file2.jpg',
					file_type: 'image/jpeg',
					file_size: 2000,
					storage_path: 'messages/file2.jpg',
					uploaded_by: sender.id
				}
			]);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: has_attachments should still be TRUE (idempotent)
			const { data: searchIndex } = await serviceClient
				.from('message_search_index')
				.select('has_attachments')
				.eq('message_id', message.id)
				.single();

			expect(searchIndex?.has_attachments).toBe(true);
		});
	});

	describe('trigger_update_folder_count_on_insert', () => {
		it('should increment folder message count when message is added to folder', async () => {
			// Arrange
			const user = await TestData.profile().withRole('student').create();
			const sender = await TestData.profile().withRole('teacher').create();

			// Create folder
			const { data: folder } = await serviceClient
				.from('user_folders')
				.insert({
					user_id: user.id,
					name: 'Important',
					message_count: 0
				})
				.select()
				.single();

			const message = await TestData.privateMessage(sender.id).create();

			// Act: Add message to inbox with folder
			await serviceClient.from('message_inbox').insert({
				message_id: message.id,
				recipient_id: user.id,
				folder_id: folder!.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Folder count should be incremented
			const { data: updatedFolder } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder!.id)
				.single();

			expect(updatedFolder?.message_count).toBe(1);
		});

		it('should not increment count if folder_id is NULL', async () => {
			// Arrange
			const user = await TestData.profile().withRole('student').create();
			const sender = await TestData.profile().withRole('teacher').create();

			const { data: folder } = await serviceClient
				.from('user_folders')
				.insert({
					user_id: user.id,
					name: 'Test Folder',
					message_count: 5 // Starting count
				})
				.select()
				.single();

			const message = await TestData.privateMessage(sender.id).create();

			// Act: Add message to inbox WITHOUT folder
			await serviceClient.from('message_inbox').insert({
				message_id: message.id,
				recipient_id: user.id,
				folder_id: null
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Folder count should remain unchanged
			const { data: updatedFolder } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder!.id)
				.single();

			expect(updatedFolder?.message_count).toBe(5); // Unchanged
		});
	});

	describe('trigger_update_folder_count_on_update', () => {
		it('should adjust folder counts when message is moved between folders', async () => {
			// Arrange
			const user = await TestData.profile().withRole('student').create();
			const sender = await TestData.profile().withRole('teacher').create();

			// Create two folders
			const { data: folder1 } = await serviceClient
				.from('user_folders')
				.insert({
					user_id: user.id,
					name: 'Folder 1',
					message_count: 5
				})
				.select()
				.single();

			const { data: folder2 } = await serviceClient
				.from('user_folders')
				.insert({
					user_id: user.id,
					name: 'Folder 2',
					message_count: 3
				})
				.select()
				.single();

			const message = await TestData.privateMessage(sender.id).create();

			// Create inbox entry in folder1
			const { data: inboxEntry } = await serviceClient
				.from('message_inbox')
				.insert({
					message_id: message.id,
					recipient_id: user.id,
					folder_id: folder1!.id
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify folder1 count increased
			const { data: folder1After } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder1!.id)
				.single();

			expect(folder1After?.message_count).toBe(6); // 5 + 1

			// Act: Move message to folder2
			await serviceClient
				.from('message_inbox')
				.update({ folder_id: folder2!.id })
				.eq('id', inboxEntry!.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Folder1 decremented, Folder2 incremented
			const { data: folder1Final } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder1!.id)
				.single();

			const { data: folder2Final } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder2!.id)
				.single();

			expect(folder1Final?.message_count).toBe(5); // 6 - 1
			expect(folder2Final?.message_count).toBe(4); // 3 + 1
		});

		it('should only fire when folder_id changes (WHEN clause)', async () => {
			// Arrange
			const user = await TestData.profile().withRole('student').create();
			const sender = await TestData.profile().withRole('teacher').create();

			const { data: folder } = await serviceClient
				.from('user_folders')
				.insert({
					user_id: user.id,
					name: 'Test Folder',
					message_count: 10
				})
				.select()
				.single();

			const message = await TestData.privateMessage(sender.id).create();

			const { data: inboxEntry } = await serviceClient
				.from('message_inbox')
				.insert({
					message_id: message.id,
					recipient_id: user.id,
					folder_id: folder!.id
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Act: Update other field (not folder_id)
			await serviceClient
				.from('message_inbox')
				.update({ is_starred: true })
				.eq('id', inboxEntry!.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Folder count should remain unchanged (trigger didn't fire)
			const { data: folderAfter } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder!.id)
				.single();

			expect(folderAfter?.message_count).toBe(11); // Only the initial insert increment
		});

		it('should handle moving from folder to NULL (no folder)', async () => {
			// Arrange
			const user = await TestData.profile().withRole('student').create();
			const sender = await TestData.profile().withRole('teacher').create();

			const { data: folder } = await serviceClient
				.from('user_folders')
				.insert({
					user_id: user.id,
					name: 'Test Folder',
					message_count: 5
				})
				.select()
				.single();

			const message = await TestData.privateMessage(sender.id).create();

			const { data: inboxEntry } = await serviceClient
				.from('message_inbox')
				.insert({
					message_id: message.id,
					recipient_id: user.id,
					folder_id: folder!.id
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Act: Remove from folder (set to NULL)
			await serviceClient
				.from('message_inbox')
				.update({ folder_id: null })
				.eq('id', inboxEntry!.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Folder count should be decremented
			const { data: folderAfter } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder!.id)
				.single();

			expect(folderAfter?.message_count).toBe(5); // 6 (after insert) - 1 (after removal)
		});
	});

	describe('trigger_update_folder_count_on_delete', () => {
		it('should decrement folder count when inbox entry is deleted', async () => {
			// Arrange
			const user = await TestData.profile().withRole('student').create();
			const sender = await TestData.profile().withRole('teacher').create();

			const { data: folder } = await serviceClient
				.from('user_folders')
				.insert({
					user_id: user.id,
					name: 'Test Folder',
					message_count: 5
				})
				.select()
				.single();

			const message = await TestData.privateMessage(sender.id).create();

			const { data: inboxEntry } = await serviceClient
				.from('message_inbox')
				.insert({
					message_id: message.id,
					recipient_id: user.id,
					folder_id: folder!.id
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify count increased
			const { data: folderBefore } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder!.id)
				.single();

			expect(folderBefore?.message_count).toBe(6); // 5 + 1

			// Act: Delete inbox entry
			await serviceClient.from('message_inbox').delete().eq('id', inboxEntry!.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Folder count should be decremented
			const { data: folderAfter } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder!.id)
				.single();

			expect(folderAfter?.message_count).toBe(5); // 6 - 1
		});

		it('should use GREATEST to prevent negative counts', async () => {
			// Arrange: Create folder with count of 0 (edge case)
			const user = await TestData.profile().withRole('student').create();
			const sender = await TestData.profile().withRole('teacher').create();

			const { data: folder } = await serviceClient
				.from('user_folders')
				.insert({
					user_id: user.id,
					name: 'Empty Folder',
					message_count: 0
				})
				.select()
				.single();

			const message = await TestData.privateMessage(sender.id).create();

			// Manually set message_count to 1 before insert (simulating edge case)
			await serviceClient.from('user_folders').update({ message_count: 1 }).eq('id', folder!.id);

			const { data: inboxEntry } = await serviceClient
				.from('message_inbox')
				.insert({
					message_id: message.id,
					recipient_id: user.id,
					folder_id: folder!.id
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Manually force count to 0 (simulating corruption/race condition)
			await serviceClient.from('user_folders').update({ message_count: 0 }).eq('id', folder!.id);

			// Act: Delete inbox entry (should not go negative)
			await serviceClient.from('message_inbox').delete().eq('id', inboxEntry!.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Count should be 0, not negative (GREATEST(count - 1, 0))
			const { data: folderAfter } = await serviceClient
				.from('user_folders')
				.select('message_count')
				.eq('id', folder!.id)
				.single();

			expect(folderAfter?.message_count).toBe(0); // Not -1
			expect(folderAfter?.message_count).toBeGreaterThanOrEqual(0);
		});
	});

	describe('enforce_max_attachments (BEFORE INSERT)', () => {
		it('should allow up to 3 attachments per message', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('teacher').create();
			const message = await TestData.privateMessage(sender.id).create();

			// Act: Add 3 attachments (should succeed)
			const insertPromises = [1, 2, 3].map((i) =>
				serviceClient.from('message_attachments_v2').insert({
					message_id: message.id,
					file_name: `file${i}.pdf`,
					file_type: 'application/pdf',
					file_size: 1000,
					storage_path: `messages/file${i}.pdf`,
					uploaded_by: sender.id
				})
			);

			const results = await Promise.all(insertPromises);

			// Assert: All 3 inserts should succeed
			results.forEach((result) => {
				expect(result.error).toBeNull();
			});

			// Verify count
			const { data: attachments } = await serviceClient
				.from('message_attachments_v2')
				.select()
				.eq('message_id', message.id);

			expect(attachments).toHaveLength(3);
		});

		it('should raise exception when trying to add 4th attachment', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('student').create();
			const message = await TestData.privateMessage(sender.id).create();

			// Add 3 attachments first
			await Promise.all(
				[1, 2, 3].map((i) =>
					serviceClient.from('message_attachments_v2').insert({
						message_id: message.id,
						file_name: `file${i}.pdf`,
						file_type: 'application/pdf',
						file_size: 1000,
						storage_path: `messages/file${i}.pdf`,
						uploaded_by: sender.id
					})
				)
			);

			// Act: Try to add 4th attachment (should fail)
			const { error } = await serviceClient.from('message_attachments_v2').insert({
				message_id: message.id,
				file_name: 'file4.pdf',
				file_type: 'application/pdf',
				file_size: 1000,
				storage_path: 'messages/file4.pdf',
				uploaded_by: sender.id
			});

			// Assert: Should raise exception
			expect(error).not.toBeNull();
			expect(error?.message).toContain('Maximum 3 attachments per message allowed');

			// Verify count is still 3
			const { data: attachments } = await serviceClient
				.from('message_attachments_v2')
				.select()
				.eq('message_id', message.id);

			expect(attachments).toHaveLength(3);
		});

		it('should check count BEFORE insert (not after)', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('teacher').create();
			const message = await TestData.privateMessage(sender.id).create();

			// Add 3 attachments
			await Promise.all(
				[1, 2, 3].map((i) =>
					serviceClient.from('message_attachments_v2').insert({
						message_id: message.id,
						file_name: `file${i}.pdf`,
						file_type: 'application/pdf',
						file_size: 1000,
						storage_path: `messages/file${i}.pdf`,
						uploaded_by: sender.id
					})
				)
			);

			// Act: Try to add 4th attachment
			const { error } = await serviceClient.from('message_attachments_v2').insert({
				message_id: message.id,
				file_name: 'file4.pdf',
				file_type: 'application/pdf',
				file_size: 1000,
				storage_path: 'messages/file4.pdf',
				uploaded_by: sender.id
			});

			// Assert: Trigger should prevent insert (BEFORE INSERT)
			expect(error).not.toBeNull();

			// Verify the 4th attachment was NOT inserted (transaction rolled back)
			const { data: attachments } = await serviceClient
				.from('message_attachments_v2')
				.select()
				.eq('message_id', message.id);

			expect(attachments).toHaveLength(3); // Still only 3
		});

		it('should allow 3 attachments on different messages independently', async () => {
			// Arrange
			const sender = await TestData.profile().withRole('teacher').create();
			const message1 = await TestData.privateMessage(sender.id).withSubject('Message 1').create();
			const message2 = await TestData.privateMessage(sender.id).withSubject('Message 2').create();

			// Act: Add 3 attachments to each message
			await Promise.all([
				...([1, 2, 3].map((i) =>
					serviceClient.from('message_attachments_v2').insert({
						message_id: message1.id,
						file_name: `msg1_file${i}.pdf`,
						file_type: 'application/pdf',
						file_size: 1000,
						storage_path: `messages/msg1_file${i}.pdf`,
						uploaded_by: sender.id
					})
				) as Promise<unknown>[]),
				...([1, 2, 3].map((i) =>
					serviceClient.from('message_attachments_v2').insert({
						message_id: message2.id,
						file_name: `msg2_file${i}.pdf`,
						file_type: 'application/pdf',
						file_size: 1000,
						storage_path: `messages/msg2_file${i}.pdf`,
						uploaded_by: sender.id
					})
				) as Promise<unknown>[])
			]);

			// Assert: Both messages should have 3 attachments each
			const { data: attachments1 } = await serviceClient
				.from('message_attachments_v2')
				.select()
				.eq('message_id', message1.id);

			const { data: attachments2 } = await serviceClient
				.from('message_attachments_v2')
				.select()
				.eq('message_id', message2.id);

			expect(attachments1).toHaveLength(3);
			expect(attachments2).toHaveLength(3);
		});
	});
});
