/**
 * Migration Dashboard - Server
 * ============================
 *
 * Server-side data loading for the question migration review dashboard.
 *
 * Features:
 * - Reads manifest.json from migration export
 * - Provides hierarchical structure (theme > domain > subdomain)
 * - Calculates question counts per category
 *
 * Security:
 * - Admin-only access (role check)
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { promises as fs } from 'fs';
import path from 'path';
import type { MigrationManifest, ManifestStructure, TreeNode } from '$lib/types/migration';

/**
 * Get the latest export folder from data/migration-output/
 */
async function getLatestExportFolder(): Promise<string> {
	const baseDir = path.join(process.cwd(), 'data/migration-output');
	const entries = await fs.readdir(baseDir);
	const exportFolders = entries
		.filter((e) => e.startsWith('export-'))
		.sort()
		.reverse();

	if (exportFolders.length === 0) {
		throw error(404, 'No export folder found in data/migration-output/');
	}

	return path.join(baseDir, exportFolders[0]);
}

export const load: PageServerLoad = async ({ locals }) => {
	// Authentication check
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Authorization check - admin only
	const { profile } = locals;
	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Acces reserve aux administrateurs');
	}

	// Read manifest.json from the latest export directory
	const latestExport = await getLatestExportFolder();
	const manifestPath = path.join(latestExport, 'manifest.json');

	try {
		const manifestContent = await fs.readFile(manifestPath, 'utf-8');
		const manifest: MigrationManifest = JSON.parse(manifestContent);

		// Query migration_tracking for review statuses
		// Only count Phase 4 (manual validation via UI) — not Phase 1 (auto-import)
		const statusMap = new Map<number, 'validated' | 'failed'>();
		if (locals.supabase) {
			const { data: trackingData } = await locals.supabase
				.from('migration_tracking')
				.select('old_question_index, migration_status')
				.eq('phase', 4)
				.in('migration_status', ['validated', 'failed']);

			if (trackingData) {
				for (const row of trackingData) {
					statusMap.set(row.old_question_index, row.migration_status as 'validated' | 'failed');
				}
			}
		}

		// Build globalIndex mapping from level files
		const globalIndexMap = await buildGlobalIndexMap(latestExport, manifest.structure);

		// Transform structure into tree nodes with real progress
		const treeData = transformToTreeNodes(manifest.structure, statusMap, globalIndexMap);

		// Calculate total statistics
		let totalApproved = 0;
		let totalRejected = 0;
		for (const status of statusMap.values()) {
			if (status === 'validated') totalApproved++;
			else if (status === 'failed') totalRejected++;
		}

		const stats = {
			totalQuestions: manifest.totalQuestions,
			totalThemes: manifest.totalThemes,
			totalDomains: manifest.totalDomains,
			totalSubdomains: manifest.totalSubdomains,
			successCount: manifest.successCount,
			warningCount: manifest.warningCount,
			errorCount: manifest.errorCount,
			exportDate: manifest.exportDate,
			totalApproved,
			totalRejected
		};

		return {
			treeData,
			stats,
			manifest
		};
	} catch (err) {
		console.error('Error reading migration manifest:', err);

		// Return empty data with error state
		return {
			treeData: [],
			stats: {
				totalQuestions: 0,
				totalThemes: 0,
				totalDomains: 0,
				totalSubdomains: 0,
				successCount: 0,
				warningCount: 0,
				errorCount: 0,
				exportDate: null
			},
			manifest: null,
			error:
				'Impossible de charger les donnees de migration. Verifiez que le fichier manifest.json existe.'
		};
	}
};

/**
 * Build a mapping of subdomain path → globalIndex[] by reading level files.
 * Each level-*.json file contains questions with a globalIndex field.
 */
async function buildGlobalIndexMap(
	exportFolder: string,
	structure: ManifestStructure
): Promise<Map<string, number[]>> {
	const indexMap = new Map<string, number[]>();

	for (const themeData of Object.values(structure)) {
		for (const domainData of Object.values(themeData)) {
			for (const subdomainData of Object.values(domainData)) {
				const subdomainDir = path.join(exportFolder, subdomainData.path);
				const indices: number[] = [];

				try {
					const files = await fs.readdir(subdomainDir);
					const levelFiles = files.filter((f) => f.startsWith('level-') && f.endsWith('.json'));

					for (const file of levelFiles) {
						const content = await fs.readFile(path.join(subdomainDir, file), 'utf-8');
						const questions = JSON.parse(content) as Array<{ globalIndex: number }>;
						for (const q of questions) {
							indices.push(q.globalIndex);
						}
					}
				} catch {
					// Skip if directory doesn't exist
				}

				indexMap.set(subdomainData.path, indices);
			}
		}
	}

	return indexMap;
}

/**
 * Transform the manifest structure into a flat tree representation
 * suitable for the UI component
 */
function transformToTreeNodes(
	structure: ManifestStructure,
	statusMap: Map<number, 'validated' | 'failed'>,
	globalIndexMap: Map<string, number[]>
): TreeNode[] {
	const themeNodes: TreeNode[] = [];

	for (const [themeName, themeData] of Object.entries(structure)) {
		const domainNodes: TreeNode[] = [];
		let themeTotal = 0;
		let themeApproved = 0;
		let themeRejected = 0;

		for (const [domainName, domainData] of Object.entries(themeData)) {
			const subdomainNodes: TreeNode[] = [];
			let domainTotal = 0;
			let domainApproved = 0;
			let domainRejected = 0;

			for (const [subdomainName, subdomainData] of Object.entries(domainData)) {
				const globalIndices = globalIndexMap.get(subdomainData.path) ?? [];
				const levelCount = globalIndices.length || subdomainData.levels.length;
				let approved = 0;
				let rejected = 0;
				for (const idx of globalIndices) {
					const status = statusMap.get(idx);
					if (status === 'validated') approved++;
					else if (status === 'failed') rejected++;
				}

				domainTotal += levelCount;
				domainApproved += approved;
				domainRejected += rejected;

				subdomainNodes.push({
					name: subdomainName,
					type: 'subdomain',
					path: subdomainData.path,
					levels: subdomainData.levels,
					levelCount,
					progress: {
						total: levelCount,
						approved,
						pending: levelCount - approved - rejected,
						rejected
					}
				});
			}

			themeTotal += domainTotal;
			themeApproved += domainApproved;
			themeRejected += domainRejected;

			domainNodes.push({
				name: domainName,
				type: 'domain',
				levelCount: domainTotal,
				children: subdomainNodes,
				progress: {
					total: domainTotal,
					approved: domainApproved,
					pending: domainTotal - domainApproved - domainRejected,
					rejected: domainRejected
				}
			});
		}

		themeNodes.push({
			name: themeName,
			type: 'theme',
			levelCount: themeTotal,
			children: domainNodes,
			progress: {
				total: themeTotal,
				approved: themeApproved,
				pending: themeTotal - themeApproved - themeRejected,
				rejected: themeRejected
			}
		});
	}

	return themeNodes;
}
