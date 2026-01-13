/**
 * Google Drive Types for Whiteboard FileDrawer
 * ==============================================
 *
 * Types used by the FileDrawer component for Drive folder organization
 */

/**
 * Folder metadata from Drive API
 */
export interface DriveFolder {
	id: string;
	name: string;
}

/**
 * Class schedule for auto-detection
 */
export interface ClassSchedule {
	id: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
	period_number: number | null;
	subject: string | null;
	room: string | null;
}

/**
 * Class data for FileDrawer
 */
export interface ClassForDrawer {
	id: string;
	name: string;
	join_code: string;
	schedules: ClassSchedule[];
}

/**
 * Response from /api/whiteboard/drive/list
 */
export interface ListFilesResponse {
	files: {
		id: string;
		name: string;
		modifiedTime: string;
		thumbnailUrl?: string;
	}[];
	folders: DriveFolder[];
	currentFolderId: string | null;
	parentFolderId: string | null;
	appFolderId: string;
}

/**
 * Response from /api/whiteboard/classes-for-drawer
 */
export interface ClassesForDrawerResponse {
	classes: ClassForDrawer[];
}

/**
 * Breadcrumb for folder navigation
 */
export interface FolderBreadcrumb {
	id: string;
	name: string;
}
