/**
 * Generate Static OpenAPI Specification
 * Generates openapi.json file from Zod schemas
 *
 * Usage: pnpm openapi:generate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the generator (need to use dynamic import for ESM)
async function main() {
	console.log('🚀 Generating OpenAPI specification...\n');

	try {
		// Dynamic import to handle ESM modules
		const { generateOpenAPISpec } = await import('../src/lib/server/openapi/generator.js');

		// Generate the spec
		const spec = generateOpenAPISpec();

		// Output to static directory
		const outputPath = path.join(process.cwd(), 'static', 'openapi.json');

		// Ensure static directory exists
		const staticDir = path.dirname(outputPath);
		if (!fs.existsSync(staticDir)) {
			fs.mkdirSync(staticDir, { recursive: true });
		}

		// Write the spec
		fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

		// Stats
		const pathCount = Object.keys(spec.paths || {}).length;
		const schemaCount = Object.keys(spec.components?.schemas || {}).length;
		const tagCount = (spec.tags || []).length;
		const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);

		console.log('✅ OpenAPI spec generated successfully!\n');
		console.log(`📁 Output: ${outputPath}`);
		console.log(`📊 Statistics:`);
		console.log(`   - API Paths: ${pathCount}`);
		console.log(`   - Schemas: ${schemaCount}`);
		console.log(`   - Tags: ${tagCount}`);
		console.log(`   - File Size: ${fileSize} KB`);
		console.log(`\n🔗 View docs: http://localhost:5175/api-docs`);
		console.log(`🔗 Download spec: http://localhost:5175/openapi.json`);
	} catch (error) {
		console.error('❌ Failed to generate OpenAPI spec:', error);
		if (error instanceof Error) {
			console.error('Error details:', error.message);
			console.error(error.stack);
		}
		process.exit(1);
	}
}

main();
