/**
 * Script to check for broken internal links in documentation
 *
 * Usage: npx tsx scripts/check-doc-links.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';

interface BrokenLink {
	file: string;
	line: number;
	link: string;
	target: string;
}

const DOCS_DIR = join(process.cwd(), 'docs');
const ROOT_DIR = process.cwd();
const broken: BrokenLink[] = [];
let totalLinks = 0;
let filesChecked = 0;

// Regex to find markdown links: [text](path)
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

function getAllMarkdownFiles(dir: string): string[] {
	const files: string[] = [];

	const items = readdirSync(dir);

	for (const item of items) {
		const fullPath = join(dir, item);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...getAllMarkdownFiles(fullPath));
		} else if (item.endsWith('.md')) {
			files.push(fullPath);
		}
	}

	return files;
}

function checkLinksInFile(filePath: string) {
	filesChecked++;
	const content = readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');

	lines.forEach((line, index) => {
		let match;

		while ((match = LINK_REGEX.exec(line)) !== null) {
			const linkText = match[1];
			const linkPath = match[2];

			// Skip external links (http, https, mailto)
			if (
				linkPath.startsWith('http://') ||
				linkPath.startsWith('https://') ||
				linkPath.startsWith('mailto:')
			) {
				continue;
			}

			// Skip anchor-only links (#section)
			if (linkPath.startsWith('#')) {
				continue;
			}

			totalLinks++;

			// Remove anchor from path
			const pathWithoutAnchor = linkPath.split('#')[0];

			// Resolve relative path
			const fileDir = dirname(filePath);
			const targetPath = resolve(fileDir, pathWithoutAnchor);

			// Check if file exists
			try {
				statSync(targetPath);
			} catch {
				broken.push({
					file: filePath.replace(ROOT_DIR, ''),
					line: index + 1,
					link: linkText,
					target: pathWithoutAnchor
				});
			}
		}
	});
}

function main() {
	console.log('🔍 Checking documentation links...\n');

	// Check CLAUDE.md at root
	const claudeMd = join(ROOT_DIR, 'CLAUDE.md');
	checkLinksInFile(claudeMd);

	// Check all docs
	const docsFiles = getAllMarkdownFiles(DOCS_DIR);
	docsFiles.forEach(checkLinksInFile);

	console.log(`📊 Statistics:`);
	console.log(`   Files checked: ${filesChecked}`);
	console.log(`   Total links: ${totalLinks}`);
	console.log(`   Broken links: ${broken.length}\n`);

	if (broken.length === 0) {
		console.log('✅ All links are valid!\n');
		process.exit(0);
	} else {
		console.log('❌ Found broken links:\n');

		broken.forEach(({ file, line, link, target }) => {
			console.log(`   ${file}:${line}`);
			console.log(`      Link: "${link}"`);
			console.log(`      Target: ${target}\n`);
		});

		process.exit(1);
	}
}

main();
