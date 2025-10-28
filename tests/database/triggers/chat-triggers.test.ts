/**
 * Chat System Trigger Tests
 *
 * Tests for chat system triggers in conversations and messages tables
 *
 * Triggers tested:
 * - trigger_create_class_chat_room (AFTER INSERT on classes)
 * - trigger_add_student_to_class_chat (AFTER INSERT on class_members)
 * - trigger_process_message_content (BEFORE INSERT OR UPDATE OF content on messages)
 * - trigger_update_conversation_last_message (AFTER INSERT on messages)
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

describe('Chat System Triggers', () => {
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

	describe('trigger_create_class_chat_room', () => {
		it('should create chat conversation when class is created', async () => {
			// Arrange: Create teacher
			const teacher = await TestData.profile().withRole('teacher').create();

			// Act: Create class
			const classData = await TestData.class(teacher.id).withName('6ème A').create();

			// Wait for trigger to execute
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Assert: Conversation should be created
			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('*')
				.eq('class_id', classData.id)
				.eq('is_group', true)
				.maybeSingle();

			expect(conversation).not.toBeNull();
			expect(conversation?.name).toBe('6ème A - Chat de classe');
			expect(conversation?.created_by).toBe(teacher.id);
		});

		it('should add teacher as participant when class is created', async () => {
			// Arrange & Act
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).withName('5ème B').create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Get conversation
			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Assert: Teacher should be participant
			const { data: participant } = await serviceClient
				.from('conversation_participants')
				.select('*')
				.eq('conversation_id', conversation.id)
				.eq('user_id', teacher.id)
				.maybeSingle();

			expect(participant).not.toBeNull();
			expect(participant?.user_id).toBe(teacher.id);
		});

		it('should add all existing class members to chat on class creation', async () => {
			// Arrange: Create teacher and students first
			const teacher = await TestData.profile().withRole('teacher').create();
			const student1 = await TestData.profile().withRole('student').create();
			const student2 = await TestData.profile().withRole('student').create();

			// Create class
			const classData = await TestData.class(teacher.id).withName('4ème C').create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Add students to class AFTER class creation
			await serviceClient.from('class_members').insert([
				{ class_id: classData.id, student_id: student1.id },
				{ class_id: classData.id, student_id: student2.id }
			]);

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Get conversation
			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Assert: All members should be participants (teacher + 2 students)
			const { data: participants } = await serviceClient
				.from('conversation_participants')
				.select('user_id')
				.eq('conversation_id', conversation.id);

			expect(participants).toHaveLength(3);
			const participantIds = participants?.map((p) => p.user_id) || [];
			expect(participantIds).toContain(teacher.id);
			expect(participantIds).toContain(student1.id);
			expect(participantIds).toContain(student2.id);
		});
	});

	describe('trigger_add_student_to_class_chat', () => {
		it('should add student to class chat when they join class', async () => {
			// Arrange: Create class with teacher
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Act: Add student to class
			await serviceClient
				.from('class_members')
				.insert({ class_id: classData.id, student_id: student.id });

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Assert: Student should be added to conversation
			const { data: participant } = await serviceClient
				.from('conversation_participants')
				.select('*')
				.eq('conversation_id', conversation.id)
				.eq('user_id', student.id)
				.maybeSingle();

			expect(participant).not.toBeNull();
			expect(participant?.user_id).toBe(student.id);
		});

		it('should handle duplicate participant insertion with ON CONFLICT', async () => {
			// Arrange: Create class with teacher and student
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Add student to class
			await serviceClient
				.from('class_members')
				.insert({ class_id: classData.id, student_id: student.id });

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Get initial participant count
			const { count: initialCount } = await serviceClient
				.from('conversation_participants')
				.select('*', { count: 'exact', head: true })
				.eq('conversation_id', conversation.id)
				.eq('user_id', student.id);

			// Act: Try to add student again (should not throw error due to ON CONFLICT)
			await serviceClient
				.from('class_members')
				.insert({ class_id: classData.id, student_id: student.id });

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Assert: Participant count should remain the same
			const { count: finalCount } = await serviceClient
				.from('conversation_participants')
				.select('*', { count: 'exact', head: true })
				.eq('conversation_id', conversation.id)
				.eq('user_id', student.id);

			expect(finalCount).toBe(initialCount);
			expect(finalCount).toBe(1); // Only one participant record
		});
	});

	describe('trigger_process_message_content', () => {
		it('should extract plain text from TipTap JSON content', async () => {
			// Arrange: Create conversation with participants
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Add student to conversation
			await serviceClient
				.from('conversation_participants')
				.insert({ conversation_id: conversation.id, user_id: student.id });

			// Act: Insert message with TipTap JSON
			const tiptapContent = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Bonjour à tous! ' },
							{ type: 'text', text: 'Comment allez-vous?' }
						]
					}
				]
			};

			const { data: message } = await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: tiptapContent
				})
				.select()
				.single();

			// Assert: Plain text should be extracted
			expect(message.plain_text).toBe('Bonjour à tous! Comment allez-vous?');
		});

		it('should extract plain text from nested TipTap paragraphs', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Act: Insert message with multiple paragraphs
			const tiptapContent = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Premier paragraphe.' }]
					},
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Deuxième paragraphe.' }]
					}
				]
			};

			const { data: message } = await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: tiptapContent
				})
				.select()
				.single();

			// Assert: Both paragraphs should be extracted with space separator
			expect(message.plain_text).toContain('Premier paragraphe.');
			expect(message.plain_text).toContain('Deuxième paragraphe.');
		});

		it('should flag message when profanity is detected', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Act: Insert message with profanity (from migration's bad words list)
			const tiptapContent = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Oh merde, je me suis trompé!' }]
					}
				]
			};

			const { data: message } = await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: tiptapContent
				})
				.select()
				.single();

			// Assert: Message should be flagged
			expect(message.is_flagged).toBe(true);
			expect(message.flag_reason).toBe('Profanité détectée automatiquement');
		});

		it('should NOT flag message without profanity', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Act: Insert clean message
			const tiptapContent = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Bonjour, comment vas-tu?' }]
					}
				]
			};

			const { data: message } = await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: tiptapContent
				})
				.select()
				.single();

			// Assert: Message should NOT be flagged
			expect(message.is_flagged).toBe(false);
		});

		it('should process content on UPDATE as well as INSERT', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Insert clean message
			const { data: message } = await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }]
					}
				})
				.select()
				.single();

			expect(message.is_flagged).toBe(false);

			// Act: Update with profanity
			const { data: updatedMessage } = await serviceClient
				.from('messages')
				.update({
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'putain' }] }]
					}
				})
				.eq('id', message.id)
				.select()
				.single();

			// Assert: Should now be flagged
			expect(updatedMessage.is_flagged).toBe(true);
			expect(updatedMessage.plain_text).toBe('putain');
		});
	});

	describe('trigger_update_conversation_last_message', () => {
		it('should update conversation with last message data', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('*')
				.eq('class_id', classData.id)
				.single();

			expect(conversation.last_message_id).toBeNull();
			expect(conversation.last_message_preview).toBeNull();

			// Act: Send a message
			const { data: message } = await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: {
						type: 'doc',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'Premier message du chat!' }]
							}
						]
					}
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Assert: Conversation should be updated
			const { data: updatedConversation } = await serviceClient
				.from('conversations')
				.select('*')
				.eq('id', conversation.id)
				.single();

			expect(updatedConversation.last_message_id).toBe(message.id);
			expect(updatedConversation.last_message_preview).toBe('Premier message du chat!');
			expect(updatedConversation.last_message_at).not.toBeNull();
		});

		it('should truncate preview at 100 characters with ellipsis', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Act: Send a long message (more than 100 chars)
			const longText =
				'Ceci est un message très très très long qui dépasse largement la limite de 100 caractères pour tester la troncature';

			await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: longText }] }]
					}
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Assert: Preview should be truncated
			const { data: updatedConversation } = await serviceClient
				.from('conversations')
				.select('last_message_preview')
				.eq('id', conversation.id)
				.single();

			expect(updatedConversation.last_message_preview?.length).toBeLessThanOrEqual(103); // 100 + '...'
			expect(updatedConversation.last_message_preview).toContain('...');
			expect(updatedConversation.last_message_preview?.startsWith('Ceci est')).toBe(true);
		});

		it('should NOT add ellipsis for messages under 100 characters', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Act: Send a short message
			const shortText = 'Message court';

			await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: shortText }] }]
					}
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Assert: Preview should be exact text without ellipsis
			const { data: updatedConversation } = await serviceClient
				.from('conversations')
				.select('last_message_preview')
				.eq('id', conversation.id)
				.single();

			expect(updatedConversation.last_message_preview).toBe('Message court');
			expect(updatedConversation.last_message_preview).not.toContain('...');
		});

		it('should update with most recent message', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();

			await new Promise((resolve) => setTimeout(resolve, 150));

			const { data: conversation } = await serviceClient
				.from('conversations')
				.select('id')
				.eq('class_id', classData.id)
				.single();

			// Send first message
			await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Premier message' }] }]
					}
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Act: Send second message
			const { data: secondMessage } = await serviceClient
				.from('messages')
				.insert({
					conversation_id: conversation.id,
					sender_id: teacher.id,
					content: {
						type: 'doc',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Deuxième message' }] }]
					}
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Assert: Conversation should show second message
			const { data: updatedConversation } = await serviceClient
				.from('conversations')
				.select('*')
				.eq('id', conversation.id)
				.single();

			expect(updatedConversation.last_message_id).toBe(secondMessage.id);
			expect(updatedConversation.last_message_preview).toBe('Deuxième message');
		});
	});
});
