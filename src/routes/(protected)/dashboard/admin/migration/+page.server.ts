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

	// Read manifest.json from the export directory
	const manifestPath = path.join(
		process.cwd(),
		'data/migration-output/export-2025-11-27/manifest.json'
	);

	try {
		const manifestContent = await fs.readFile(manifestPath, 'utf-8');
		const manifest: MigrationManifest = JSON.parse(manifestContent);

		// Transform structure into tree nodes
		const treeData = transformToTreeNodes(manifest.structure);

		// Calculate total statistics
		const stats = {
			totalQuestions: manifest.totalQuestions,
			totalThemes: manifest.totalThemes,
			totalDomains: manifest.totalDomains,
			totalSubdomains: manifest.totalSubdomains,
			successCount: manifest.successCount,
			warningCount: manifest.warningCount,
			errorCount: manifest.errorCount,
			exportDate: manifest.exportDate
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
 * Transform the manifest structure into a flat tree representation
 * suitable for the UI component
 */
function transformToTreeNodes(structure: ManifestStructure): TreeNode[] {
	const themeNodes: TreeNode[] = [];

	for (const [themeName, themeData] of Object.entries(structure)) {
		const domainNodes: TreeNode[] = [];
		let themeTotal = 0;

		for (const [domainName, domainData] of Object.entries(themeData)) {
			const subdomainNodes: TreeNode[] = [];
			let domainTotal = 0;

			for (const [subdomainName, subdomainData] of Object.entries(domainData)) {
				const levelCount = subdomainData.levels.length;
				domainTotal += levelCount;

				subdomainNodes.push({
					name: subdomainName,
					type: 'subdomain',
					path: subdomainData.path,
					levels: subdomainData.levels,
					levelCount,
					progress: {
						total: levelCount,
						approved: 0, // Will be populated from database later
						pending: levelCount, // All pending initially
						rejected: 0
					}
				});
			}

			themeTotal += domainTotal;

			domainNodes.push({
				name: domainName,
				type: 'domain',
				levelCount: domainTotal,
				children: subdomainNodes,
				progress: {
					total: domainTotal,
					approved: 0,
					pending: domainTotal,
					rejected: 0
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
				approved: 0,
				pending: themeTotal,
				rejected: 0
			}
		});
	}

	return themeNodes;
}
