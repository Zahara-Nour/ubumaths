/**
 * Skeleton Type Detector
 * ======================
 *
 * Detects the appropriate skeleton variant based on the current route.
 * Returns the skeleton type to display during navigation.
 */

export type SkeletonType = 'dashboard' | 'list' | 'form' | 'default';

/**
 * Determines the skeleton type based on the current pathname
 */
export function getSkeletonType(pathname: string): SkeletonType {
	// Dashboard routes - main dashboard pages with stats
	if (pathname === '/dashboard' || pathname === '/dashboard/') {
		return 'dashboard';
	}

	// List/Table routes - pages showing lists of items
	const listPatterns = [
		'/dashboard/admin/users',
		'/dashboard/admin/schools',
		'/dashboard/admin/classes',
		'/dashboard/admin/questions',
		'/dashboard/admin/errors',
		'/dashboard/teacher/classes',
		'/dashboard/teacher/rewards',
		'/dashboard/students',
		'/dashboard/classes',
		'/dashboard/friends',
		'/messages/inbox',
		'/messages/sent',
		'/messages/drafts',
		'/messages/archived'
	];

	if (listPatterns.some((pattern) => pathname.startsWith(pattern))) {
		return 'list';
	}

	// Form routes - pages with forms and data entry
	const formPatterns = [
		'/dashboard/admin/questions/new',
		'/dashboard/admin/schools/new',
		'/dashboard/teacher/riddles/new',
		'/dashboard/teacher/riddles/[id]/edit',
		'/messages/compose',
		'/settings',
		'/profile',
		'/signup',
		'/auth/login'
	];

	if (pathname.includes('/new') || pathname.includes('/edit')) {
		return 'form';
	}

	if (formPatterns.some((pattern) => pathname.startsWith(pattern))) {
		return 'form';
	}

	// Default fallback
	return 'default';
}
