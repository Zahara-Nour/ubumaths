#!/usr/bin/env node

/**
 * 🔍 Analyseur statique de +layout.server.ts
 *
 * Détecte les dépendances qui peuvent causer des réexécutions fréquentes
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

interface DependencyIssue {
	file: string;
	line: number;
	severity: 'warning' | 'error' | 'info';
	type: string;
	message: string;
	suggestion: string;
	code: string;
}

interface AnalysisResult {
	file: string;
	issues: DependencyIssue[];
	score: number;
	usesParams: boolean;
	usesSearchParams: boolean;
	usesParent: boolean;
	usesCookies: boolean;
	usesLocals: boolean;
}

class LayoutAnalyzer {
	private results: AnalysisResult[] = [];

	/**
	 * Analyse tous les layouts du projet
	 */
	analyzeProject(rootDir: string = 'src/routes'): AnalysisResult[] {
		console.log('🔍 Analyse des layouts...\n');

		this.results = [];
		this.findAndAnalyzeLayouts(rootDir);

		this.printSummary();

		return this.results;
	}

	/**
	 * Trouve et analyse tous les fichiers +layout.server.ts
	 */
	private findAndAnalyzeLayouts(dir: string): void {
		try {
			const entries = readdirSync(dir);

			for (const entry of entries) {
				const fullPath = join(dir, entry);
				const stat = statSync(fullPath);

				if (stat.isDirectory()) {
					this.findAndAnalyzeLayouts(fullPath);
				} else if (entry === '+layout.server.ts' || entry === '+layout.server.js') {
					const result = this.analyzeLayout(fullPath);
					this.results.push(result);
				}
			}
		} catch {
			// Ignore les erreurs de lecture
		}
	}

	/**
	 * Analyse un fichier layout spécifique
	 */
	analyzeLayout(filePath: string): AnalysisResult {
		const content = readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');

		const result: AnalysisResult = {
			file: filePath,
			issues: [],
			score: 100,
			usesParams: false,
			usesSearchParams: false,
			usesParent: false,
			usesCookies: false,
			usesLocals: false
		};

		// Analyser chaque ligne
		lines.forEach((line, index) => {
			this.analyzeLine(line, index + 1, result);
		});

		// Calculer le score final
		result.score = this.calculateScore(result);

		return result;
	}

	/**
	 * Analyse une ligne de code
	 */
	private analyzeLine(line: string, lineNumber: number, result: AnalysisResult): void {
		const trimmed = line.trim();

		// Détecter l'utilisation de params
		if (/\bparams\s*\.\s*\w+/.test(trimmed)) {
			result.usesParams = true;
			result.issues.push({
				file: result.file,
				line: lineNumber,
				severity: 'warning',
				type: 'params-dependency',
				message: 'Utilisation de params détectée',
				suggestion:
					'Le layout se réexécutera quand params change. Si possible, déplacer cette logique dans un layout enfant ou une page.',
				code: trimmed
			});
		}

		// Détecter l'utilisation de searchParams
		if (/searchParams|url\.searchParams/.test(trimmed)) {
			result.usesSearchParams = true;
			result.issues.push({
				file: result.file,
				line: lineNumber,
				severity: 'error',
				type: 'searchparams-dependency',
				message: 'Utilisation de searchParams détectée',
				suggestion:
					'ATTENTION : Le layout se réexécutera à CHAQUE changement de paramètre de recherche. Évitez cela dans les layouts racine.',
				code: trimmed
			});
		}

		// Détecter l'utilisation de await parent()
		if (/await\s+parent\s*\(\)/.test(trimmed)) {
			result.usesParent = true;
			result.issues.push({
				file: result.file,
				line: lineNumber,
				severity: 'info',
				type: 'parent-dependency',
				message: 'Utilisation de await parent() détectée',
				suggestion:
					"Le layout se réexécutera quand le parent change. Vérifiez que c'est nécessaire.",
				code: trimmed
			});
		}

		// Détecter l'utilisation de cookies
		if (/cookies\s*\./.test(trimmed)) {
			result.usesCookies = true;
			result.issues.push({
				file: result.file,
				line: lineNumber,
				severity: 'info',
				type: 'cookies-dependency',
				message: 'Utilisation de cookies détectée',
				suggestion: 'Le layout se réexécutera si les cookies changent.',
				code: trimmed
			});
		}

		// Détecter l'utilisation de locals
		if (/locals\s*\./.test(trimmed)) {
			result.usesLocals = true;
			// Pas d'issue, locals est normal
		}

		// Détecter les waterfalls potentiels
		if (/const.*=\s*await\s+parent/.test(trimmed)) {
			const nextLines = this.getNextLines(lineNumber, result.file);
			if (nextLines.some((l) => /await\s+(?!parent)/.test(l))) {
				result.issues.push({
					file: result.file,
					line: lineNumber,
					severity: 'warning',
					type: 'waterfall',
					message: 'Waterfall potentiel détecté',
					suggestion:
						'Utilisez Promise.all() pour charger parent() et les autres données en parallèle.',
					code: trimmed
				});
			}
		}

		// Détecter les opérations lourdes
		if (/await\s+db\./.test(trimmed) && /\.select|\.from/.test(trimmed)) {
			if (!result.issues.some((i) => i.type === 'heavy-operation')) {
				result.issues.push({
					file: result.file,
					line: lineNumber,
					severity: 'info',
					type: 'heavy-operation',
					message: 'Requête base de données détectée',
					suggestion:
						"Assurez-vous que cette requête est optimisée (index, limit, etc.) car elle s'exécutera à chaque chargement.",
					code: trimmed
				});
			}
		}
	}

	/**
	 * Obtenir les lignes suivantes
	 */
	private getNextLines(lineNumber: number, filePath: string, count: number = 5): string[] {
		const content = readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');
		return lines.slice(lineNumber, lineNumber + count);
	}

	/**
	 * Calculer le score du layout (100 = parfait)
	 */
	private calculateScore(result: AnalysisResult): number {
		let score = 100;

		// Pénalités
		result.issues.forEach((issue) => {
			switch (issue.severity) {
				case 'error':
					score -= 30;
					break;
				case 'warning':
					score -= 15;
					break;
				case 'info':
					score -= 5;
					break;
			}
		});

		return Math.max(0, score);
	}

	/**
	 * Afficher le résumé
	 */
	private printSummary(): void {
		console.log('='.repeat(80));
		console.log("📊 RÉSUMÉ DE L'ANALYSE");
		console.log('='.repeat(80));
		console.log('');

		if (this.results.length === 0) {
			console.log('❌ Aucun layout trouvé dans src/routes');
			return;
		}

		// Trier par score (du pire au meilleur)
		const sorted = [...this.results].sort((a, b) => a.score - b.score);

		sorted.forEach((result) => {
			const scoreEmoji = result.score >= 80 ? '✅' : result.score >= 50 ? '⚠️' : '❌';
			const relativePath = relative(process.cwd(), result.file);

			console.log(`${scoreEmoji} ${relativePath}`);
			console.log(`   Score: ${result.score}/100`);

			if (result.issues.length > 0) {
				console.log(`   ${result.issues.length} problème(s) détecté(s):`);

				result.issues.forEach((issue) => {
					const emoji =
						issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
					console.log(`   ${emoji} Ligne ${issue.line}: ${issue.message}`);
					console.log(`      💡 ${issue.suggestion}`);
					console.log('');
				});
			} else {
				console.log('   ✨ Aucun problème détecté');
			}

			console.log('');
		});

		// Statistiques globales
		const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0);
		const errorCount = this.results.reduce(
			(sum, r) => sum + r.issues.filter((i) => i.severity === 'error').length,
			0
		);
		const warningCount = this.results.reduce(
			(sum, r) => sum + r.issues.filter((i) => i.severity === 'warning').length,
			0
		);
		const avgScore = Math.round(
			this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length
		);

		console.log('='.repeat(80));
		console.log('📈 STATISTIQUES GLOBALES');
		console.log('='.repeat(80));
		console.log(`Layouts analysés: ${this.results.length}`);
		console.log(`Problèmes totaux: ${totalIssues}`);
		console.log(`  - Erreurs: ${errorCount}`);
		console.log(`  - Avertissements: ${warningCount}`);
		console.log(`Score moyen: ${avgScore}/100`);
		console.log('');

		// Recommandations
		console.log('='.repeat(80));
		console.log('💡 RECOMMANDATIONS');
		console.log('='.repeat(80));

		const hasSearchParams = this.results.some((r) => r.usesSearchParams);
		const hasParams = this.results.some((r) => r.usesParams);
		const hasWaterfalls = this.results.some((r) => r.issues.some((i) => i.type === 'waterfall'));

		if (hasSearchParams) {
			console.log('🔴 PRIORITÉ HAUTE: Certains layouts utilisent searchParams');
			console.log('   Cela peut causer de nombreuses réexécutions inutiles.');
			console.log('   Action: Déplacer la logique dans les pages ou utiliser des stores.');
			console.log('');
		}

		if (hasWaterfalls) {
			console.log('🟡 PRIORITÉ MOYENNE: Waterfalls détectés');
			console.log('   Utilisez Promise.all() pour améliorer les performances.');
			console.log('');
		}

		if (hasParams) {
			console.log('🔵 INFO: Certains layouts utilisent params');
			console.log('   Normal si le layout gère une section avec ID variable.');
			console.log("   Assurez-vous que c'est intentionnel.");
			console.log('');
		}

		console.log("✨ Pour plus d'infos, utilisez le tracer en développement!");
		console.log('');
	}

	/**
	 * Exporter le résultat en JSON
	 */
	exportJSON(outputPath: string = 'layout-analysis.json'): void {
		writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
		console.log(`📁 Résultats exportés vers: ${outputPath}`);
	}
}

// Fonction principale
function main() {
	const analyzer = new LayoutAnalyzer();

	// Chemin vers src/routes
	const routesPath = process.argv[2] || 'src/routes';

	console.log(`🚀 Démarrage de l'analyse...\n`);
	console.log(`📂 Dossier cible: ${routesPath}\n`);

	analyzer.analyzeProject(routesPath);

	// Exporter si demandé
	if (process.argv.includes('--export')) {
		analyzer.exportJSON();
	}
}

// Exécuter si appelé directement (ES module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
	main();
}

export { LayoutAnalyzer };
