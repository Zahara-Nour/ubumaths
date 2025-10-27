/**
 * Message Test Helper Functions
 * ==============================
 *
 * Helper functions and mock data for messaging system tests.
 * Provides utilities for:
 * - Mock Supabase client creation
 * - Test data fixtures
 * - Common test assertions
 * - Message template helpers
 */

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Create a mock Supabase client with chainable query builder
 *
 * Returns a mock that simulates the Supabase API for testing.
 * Use _mockChain methods to configure return values.
 */
export function createMockSupabase() {
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
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		single: vi.fn(),
		maybeSingle: vi.fn(),
		then: vi.fn()
	};

	return {
		from: vi.fn(() => mockChain),
		rpc: vi.fn(),
		_mockChain: mockChain
	} as unknown as SupabaseClient<Database> & { _mockChain: typeof mockChain };
}

/**
 * Create mock request object for API route tests
 */
export function createMockRequest(data?: Record<string, unknown>) {
	return {
		json: vi.fn().mockResolvedValue(data || {}),
		formData: vi.fn()
	} as unknown as Request;
}

/**
 * Create mock locals object for API route tests
 */
export function createMockLocals(userId: string, supabase?: ReturnType<typeof createMockSupabase>) {
	return {
		supabase: supabase || createMockSupabase(),
		user: userId ? { id: userId } : null,
		safeGetSession: vi.fn().mockResolvedValue(
			userId
				? {
						user: { id: userId },
						session: { access_token: 'mock-token' }
					}
				: null
		)
	};
}

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

export const mockIds = {
	teacher: 'teacher-123',
	student1: 'student-456',
	student2: 'student-789',
	student3: 'student-abc',
	class1: 'class-3a',
	class2: 'class-3b',
	message1: 'msg-001',
	message2: 'msg-002',
	draft1: 'draft-001',
	template1: 'template-001'
};

/**
 * Mock private message
 */
export const mockMessage = {
	id: mockIds.message1,
	sender_id: mockIds.teacher,
	subject: 'Test Message',
	content: '<p>This is a test message</p>',
	is_group_message: false,
	class_id: null,
	parent_message_id: null,
	thread_root_id: null,
	sent_at: '2024-01-15T10:00:00Z',
	deleted_by_sender: false,
	created_at: '2024-01-15T10:00:00Z',
	updated_at: '2024-01-15T10:00:00Z'
};

/**
 * Mock group message
 */
export const mockGroupMessage = {
	...mockMessage,
	id: mockIds.message2,
	is_group_message: true,
	class_id: mockIds.class1,
	subject: 'Group Announcement',
	content: '<p>Important class announcement</p>'
};

/**
 * Mock message inbox entry
 */
export const mockInboxEntry = {
	id: 'inbox-001',
	message_id: mockIds.message1,
	recipient_id: mockIds.student1,
	read_at: null,
	status: 'inbox' as const,
	folder_id: null,
	is_starred: false,
	deleted: false,
	created_at: '2024-01-15T10:00:00Z'
};

/**
 * Mock message draft
 */
export const mockDraft = {
	id: mockIds.draft1,
	author_id: mockIds.teacher,
	subject: 'Draft Message',
	content: '<p>Work in progress...</p>',
	recipient_ids: [mockIds.student1, mockIds.student2],
	is_group_message: false,
	class_id: null,
	replying_to_message_id: null,
	created_at: '2024-01-15T09:00:00Z',
	updated_at: '2024-01-15T09:30:00Z'
};

/**
 * Mock message template
 */
export const mockTemplate = {
	id: mockIds.template1,
	title: 'Assessment Question Template',
	description: 'Template for asking about assessments',
	subject_template: 'Question about {{assessment_title}}',
	body_template: 'Hi {{student_name}}, I have a question about {{assessment_title}}.',
	trigger_type: 'assessment_question' as const,
	trigger_config: {},
	scope: 'system' as const,
	created_by: mockIds.teacher,
	class_id: null,
	variables: [
		{ name: 'assessment_title', label: 'Assessment Title', example: 'Math Quiz 1' },
		{ name: 'student_name', label: 'Student Name', example: 'Alice' }
	],
	is_active: true,
	created_at: '2024-01-10T00:00:00Z',
	updated_at: '2024-01-10T00:00:00Z'
};

/**
 * Mock message with rich text (TipTap format with math)
 */
export const mockRichTextMessage = {
	...mockMessage,
	content: JSON.stringify({
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'Solve for x: ' },
					{ type: 'math', attrs: { latex: 'x^2 + 5x + 6 = 0' } }
				]
			}
		]
	})
};

/**
 * Mock thread messages (parent + replies)
 */
export const mockThreadMessages = [
	{
		...mockMessage,
		id: 'thread-root',
		subject: 'Original Message',
		thread_root_id: null,
		parent_message_id: null
	},
	{
		...mockMessage,
		id: 'thread-reply-1',
		subject: 'Re: Original Message',
		thread_root_id: 'thread-root',
		parent_message_id: 'thread-root',
		sender_id: mockIds.student1
	},
	{
		...mockMessage,
		id: 'thread-reply-2',
		subject: 'Re: Original Message',
		thread_root_id: 'thread-root',
		parent_message_id: 'thread-reply-1',
		sender_id: mockIds.teacher
	}
];

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Check if content is valid TipTap JSON
 */
export function isValidTipTapContent(content: string): boolean {
	try {
		const parsed = JSON.parse(content);
		return parsed.type === 'doc' && Array.isArray(parsed.content);
	} catch {
		return false;
	}
}

/**
 * Check if content contains math formulas
 */
export function containsMathFormulas(content: string): boolean {
	if (isValidTipTapContent(content)) {
		const parsed = JSON.parse(content);
		const checkNode = (node: any): boolean => {
			if (node.type === 'math') return true;
			if (node.content) {
				return node.content.some((child: any) => checkNode(child));
			}
			return false;
		};
		return parsed.content?.some((node: any) => checkNode(node)) || false;
	}
	// Check for LaTeX in plain text
	return /\$\$.*?\$\$|\$.*?\$/.test(content);
}

/**
 * Extract variables from template string
 */
export function extractTemplateVariables(template: string): string[] {
	const matches = template.match(/\{\{([^}]+)\}\}/g);
	if (!matches) return [];
	return matches.map((match) => match.replace(/\{\{|\}\}/g, '').trim());
}

/**
 * Check if message has been read
 */
export function isMessageRead(inboxEntry: typeof mockInboxEntry): boolean {
	return inboxEntry.read_at !== null;
}

/**
 * Check if message is in trash
 */
export function isMessageTrashed(inboxEntry: typeof mockInboxEntry): boolean {
	return inboxEntry.status === 'trash' || inboxEntry.deleted;
}

// ============================================================================
// DATA GENERATION HELPERS
// ============================================================================

/**
 * Create mock message with custom fields
 */
export function createMockMessage(overrides: Partial<typeof mockMessage> = {}) {
	return {
		...mockMessage,
		...overrides,
		id: overrides.id || `msg-${Date.now()}`
	};
}

/**
 * Create mock inbox entry with custom fields
 */
export function createMockInboxEntry(overrides: Partial<typeof mockInboxEntry> = {}) {
	return {
		...mockInboxEntry,
		...overrides,
		id: overrides.id || `inbox-${Date.now()}`
	};
}

/**
 * Create mock draft with custom fields
 */
export function createMockDraft(overrides: Partial<typeof mockDraft> = {}) {
	return {
		...mockDraft,
		...overrides,
		id: overrides.id || `draft-${Date.now()}`
	};
}

/**
 * Create mock template with custom fields
 */
export function createMockTemplate(overrides: Partial<typeof mockTemplate> = {}) {
	return {
		...mockTemplate,
		...overrides,
		id: overrides.id || `template-${Date.now()}`
	};
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate message send request data
 */
export function validateSendMessageData(data: Record<string, unknown>): {
	valid: boolean;
	error?: string;
} {
	if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
		return { valid: false, error: 'Subject is required' };
	}

	if (!data.content) {
		return { valid: false, error: 'Content is required' };
	}

	if (
		!data.isGroupMessage &&
		(!data.recipientIds || !Array.isArray(data.recipientIds) || data.recipientIds.length === 0)
	) {
		return { valid: false, error: 'Recipients are required for non-group messages' };
	}

	if (data.isGroupMessage && !data.classId) {
		return { valid: false, error: 'Class ID is required for group messages' };
	}

	return { valid: true };
}

/**
 * Validate template data
 */
export function validateTemplateData(data: Record<string, unknown>): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (
		!data.subject_template ||
		typeof data.subject_template !== 'string' ||
		data.subject_template.trim().length === 0
	) {
		errors.push('Subject template is required');
	}

	if (
		!data.body_template ||
		typeof data.body_template !== 'string' ||
		data.body_template.trim().length === 0
	) {
		errors.push('Body template is required');
	}

	if (!data.trigger_type) {
		errors.push('Trigger type is required');
	}

	if (!data.scope || !['system', 'class'].includes(data.scope as string)) {
		errors.push('Invalid scope');
	}

	if (data.scope === 'system' && data.class_id) {
		errors.push('System templates cannot have class_id');
	}

	if (data.scope === 'class' && !data.class_id) {
		errors.push('Class templates must have class_id');
	}

	return { valid: errors.length === 0, errors };
}

// ============================================================================
// XSS SANITIZATION HELPERS
// ============================================================================

/**
 * Check if content contains potential XSS
 */
export function containsPotentialXSS(content: string): boolean {
	const xssPatterns = [
		/<script/i,
		/javascript:/i,
		/on\w+\s*=/i, // onclick, onload, etc.
		/<iframe/i,
		/eval\(/i,
		/expression\(/i
	];

	return xssPatterns.some((pattern) => pattern.test(content));
}

/**
 * Mock sanitization function (replace with actual DOMPurify in production)
 */
export function mockSanitize(content: string): string {
	// Simple mock - in real tests, use DOMPurify
	return content
		.replace(/<script[^>]*>.*?<\/script>/gi, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+\s*=/gi, '');
}
