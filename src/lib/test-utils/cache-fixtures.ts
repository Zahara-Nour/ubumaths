/**
 * Test Fixtures for Teacher Students Cache
 * =========================================
 *
 * Provides factory functions and mock data for testing the cache system.
 *
 * Author: Claude Code
 * Date: 2025-10-17
 */

import type { CachedStudent, CachedStudentFull } from '$lib/stores/teacherStudentsCache.svelte';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a mock student with minimal data (for Wheel component)
 */
export function createMockStudent(overrides: Partial<CachedStudent> = {}): CachedStudent {
	const defaults: CachedStudent = {
		id: `student-${Math.random().toString(36).substr(2, 9)}`,
		firstname: 'John',
		lastname: 'Doe',
		avatar_url: '/avatars/default.png'
	};

	return { ...defaults, ...overrides };
}

/**
 * Create a mock student with full data (for Rewards page)
 */
export function createMockStudentFull(
	overrides: Partial<CachedStudentFull> = {}
): CachedStudentFull {
	const defaults: CachedStudentFull = {
		id: `student-${Math.random().toString(36).substr(2, 9)}`,
		firstname: 'John',
		lastname: 'Doe',
		full_name: 'John Doe',
		avatar_url: '/avatars/default.png',
		gidouilles: 0,
		vip_cards: {},
		role: 'student',
		gender: 'boy'
	};

	return { ...defaults, ...overrides };
}

/**
 * Create a mock class object
 */
export interface MockClass {
	id: string;
	name: string;
	teacher_id: string;
	join_code: string;
	student_count: number;
}

export function createMockClass(overrides: Partial<MockClass> = {}): MockClass {
	const defaults: MockClass = {
		id: `class-${Math.random().toString(36).substr(2, 9)}`,
		name: 'Math 6A',
		teacher_id: 'teacher-1',
		join_code: 'MATH6A',
		student_count: 0
	};

	return { ...defaults, ...overrides };
}

// ============================================================================
// PRESET TEST DATA
// ============================================================================

/**
 * Collection of test students with minimal data
 */
export const MOCK_STUDENTS: Record<string, CachedStudent> = {
	alice: createMockStudent({
		id: 'student-alice',
		firstname: 'Alice',
		lastname: 'Smith',
		avatar_url: '/avatars/alice.png'
	}),
	bob: createMockStudent({
		id: 'student-bob',
		firstname: 'Bob',
		lastname: 'Johnson',
		avatar_url: '/avatars/bob.png'
	}),
	charlie: createMockStudent({
		id: 'student-charlie',
		firstname: 'Charlie',
		lastname: 'Brown',
		avatar_url: '/avatars/charlie.png'
	}),
	diana: createMockStudent({
		id: 'student-diana',
		firstname: 'Diana',
		lastname: 'Prince',
		avatar_url: '/avatars/diana.png'
	}),
	eve: createMockStudent({
		id: 'student-eve',
		firstname: 'Eve',
		lastname: 'Taylor',
		avatar_url: '/avatars/eve.png'
	})
};

/**
 * Collection of test students with full data
 */
export const MOCK_STUDENTS_FULL: Record<string, CachedStudentFull> = {
	alice: createMockStudentFull({
		id: 'student-alice',
		firstname: 'Alice',
		lastname: 'Smith',
		full_name: 'Alice Smith',
		avatar_url: '/avatars/alice.png',
		gidouilles: 10,
		vip_cards: { card_1: 1 },
		role: 'student',
		gender: 'girl'
	}),
	bob: createMockStudentFull({
		id: 'student-bob',
		firstname: 'Bob',
		lastname: 'Johnson',
		full_name: 'Bob Johnson',
		avatar_url: '/avatars/bob.png',
		gidouilles: 5,
		vip_cards: {},
		role: 'student',
		gender: 'boy'
	}),
	charlie: createMockStudentFull({
		id: 'student-charlie',
		firstname: 'Charlie',
		lastname: 'Brown',
		full_name: 'Charlie Brown',
		avatar_url: '/avatars/charlie.png',
		gidouilles: 15,
		vip_cards: { card_2: 2, card_5: 1 },
		role: 'student',
		gender: 'boy'
	})
};

/**
 * Collection of test classes
 */
export const MOCK_CLASSES: Record<string, MockClass> = {
	math6a: createMockClass({
		id: 'class-math6a',
		name: 'Math 6A',
		teacher_id: 'teacher-1',
		join_code: 'MATH6A',
		student_count: 3
	}),
	science5b: createMockClass({
		id: 'class-science5b',
		name: 'Science 5B',
		teacher_id: 'teacher-1',
		join_code: 'SCI5B',
		student_count: 2
	}),
	history7c: createMockClass({
		id: 'class-history7c',
		name: 'History 7C',
		teacher_id: 'teacher-2',
		join_code: 'HIST7C',
		student_count: 0
	})
};

// ============================================================================
// MOCK API RESPONSES
// ============================================================================

/**
 * Generate mock API response for /api/classes/[classId]/students
 */
export function mockApiResponse(
	students: CachedStudent[] | CachedStudentFull[],
	full: boolean = false
): { students: CachedStudent[] | CachedStudentFull[] } {
	return { students };
}

/**
 * Generate mock fetch response object
 */
export function mockFetchResponse(
	data: any,
	options: { ok?: boolean; status?: number; statusText?: string } = {}
): Response {
	const { ok = true, status = 200, statusText = 'OK' } = options;

	return {
		ok,
		status,
		statusText,
		json: async () => data,
		headers: new Headers(),
		redirected: false,
		type: 'basic',
		url: '',
		clone: function () {
			return this;
		},
		body: null,
		bodyUsed: false,
		arrayBuffer: async () => new ArrayBuffer(0),
		blob: async () => new Blob(),
		formData: async () => new FormData(),
		text: async () => JSON.stringify(data)
	} as Response;
}

/**
 * Create a mock fetch function for testing
 */
export function createMockFetch(
	responses: Map<string, { students: CachedStudent[] | CachedStudentFull[] }>
): typeof fetch {
	return async (url: string | URL | Request) => {
		const urlString = typeof url === 'string' ? url : url.toString();

		// Extract classId from URL
		const match = urlString.match(/\/api\/classes\/([^/]+)\/students/);
		if (!match) {
			return mockFetchResponse(
				{ error: 'Invalid URL' },
				{ ok: false, status: 404, statusText: 'Not Found' }
			);
		}

		const classId = match[1];
		const response = responses.get(classId);

		if (!response) {
			return mockFetchResponse(
				{ error: 'Class not found' },
				{ ok: false, status: 404, statusText: 'Not Found' }
			);
		}

		return mockFetchResponse(response);
	};
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Scenario: Small class with 3 students (minimal data)
 */
export function getSmallClassScenario(): {
	classId: string;
	students: CachedStudent[];
} {
	return {
		classId: MOCK_CLASSES.math6a.id,
		students: [MOCK_STUDENTS.alice, MOCK_STUDENTS.bob, MOCK_STUDENTS.charlie]
	};
}

/**
 * Scenario: Empty class (no students)
 */
export function getEmptyClassScenario(): {
	classId: string;
	students: CachedStudent[];
} {
	return {
		classId: MOCK_CLASSES.history7c.id,
		students: []
	};
}

/**
 * Scenario: Large class with many students
 */
export function getLargeClassScenario(): {
	classId: string;
	students: CachedStudent[];
} {
	const students: CachedStudent[] = [];
	for (let i = 1; i <= 30; i++) {
		students.push(
			createMockStudent({
				id: `student-${i}`,
				firstname: `Student${i}`,
				lastname: `Lastname${i}`,
				avatar_url: `/avatars/student${i}.png`
			})
		);
	}

	return {
		classId: 'class-large',
		students
	};
}

/**
 * Scenario: Class with full student data (for rewards page)
 */
export function getFullDataScenario(): {
	classId: string;
	students: CachedStudentFull[];
} {
	return {
		classId: MOCK_CLASSES.science5b.id,
		students: [MOCK_STUDENTS_FULL.alice, MOCK_STUDENTS_FULL.bob]
	};
}
