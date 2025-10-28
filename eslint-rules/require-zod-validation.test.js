/**
 * @fileoverview Tests for require-zod-validation rule
 *
 * Note: These tests verify the rule logic works correctly.
 * The actual enforcement is tested via integration with real API files.
 */

import { RuleTester } from 'eslint';
import rule from './require-zod-validation.js';

const ruleTester = new RuleTester({
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: 'module'
	}
});

ruleTester.run('require-zod-validation', rule, {
	valid: [
		{
			// Valid: request.json() with Zod validation
			filename: '/Users/test/project/src/routes/api/messages/send/+server.ts',
			code: `
        import { z } from 'zod';
        import { json } from '@sveltejs/kit';

        export const POST = async ({ request }) => {
          const body = await request.json();
          const validation = schema.safeParse(body);
          if (!validation.success) {
            throw error(400, validation.error.message);
          }
          return json(validation.data);
        };
      `
		},
		{
			// Valid: url.searchParams with Zod validation
			filename: '/Users/test/project/src/routes/api/srs/decks/+server.ts',
			code: `
        import { z } from 'zod';
        import { json } from '@sveltejs/kit';

        export const GET = async ({ url }) => {
          const queryRaw = {
            deckType: url.searchParams.get('deckType'),
            search: url.searchParams.get('search')
          };
          const validation = querySchema.safeParse(queryRaw);
          if (!validation.success) {
            return json({ error: validation.error.message }, { status: 400 });
          }
          return json(validation.data);
        };
      `
		},
		{
			// Valid: No user input (GET endpoint with no params)
			filename: '/Users/test/project/src/routes/api/exercises/[id]/complete/+server.ts',
			code: `
        import { json } from '@sveltejs/kit';

        export const POST = async ({ params, locals }) => {
          const exerciseId = params.id;
          // No request.json() or searchParams - no validation needed
          return json({ id: exerciseId });
        };
      `
		},
		{
			// Valid: Non-API file (should be ignored)
			filename: '/Users/test/project/src/lib/utils/helper.ts',
			code: `
        export async function parseData(request) {
          const body = await request.json();
          return body; // Not an API route, rule doesn't apply
        }
      `
		},
		{
			// Valid: Test file (should be ignored)
			filename: '/Users/test/project/src/routes/api/messages/api-routes.test.ts',
			code: `
        import { describe, it } from 'vitest';

        describe('API tests', () => {
          it('should work', async () => {
            const body = await request.json(); // Test files are exempt
          });
        });
      `
		},
		{
			// Valid: Using .parse() instead of .safeParse()
			filename: '/Users/test/project/src/routes/api/admin/add-to-class/+server.ts',
			code: `
        import { z } from 'zod';

        export const POST = async ({ request }) => {
          const body = await request.json();
          const data = schema.parse(body); // .parse() throws on error
          return json(data);
        };
      `
		}
	],

	invalid: [
		{
			// Invalid: request.json() without validation
			filename: '/Users/test/project/src/routes/api/messages/send/+server.ts',
			code: `
        import { z } from 'zod';
        import { json } from '@sveltejs/kit';

        export const POST = async ({ request }) => {
          const body = await request.json();
          // Missing validation!
          return json(body);
        };
      `,
			errors: [
				{
					messageId: 'missingRequestValidation'
				}
			]
		},
		{
			// Invalid: url.searchParams without validation
			filename: '/Users/test/project/src/routes/api/srs/decks/+server.ts',
			code: `
        import { z } from 'zod';
        import { json } from '@sveltejs/kit';

        export const GET = async ({ url }) => {
          const deckType = url.searchParams.get('deckType');
          // Missing validation!
          return json({ deckType });
        };
      `,
			errors: [
				{
					messageId: 'missingQueryValidation'
				}
			]
		},
		{
			// Invalid: searchParams object construction without validation
			filename: '/Users/test/project/src/routes/api/srs/cards/+server.ts',
			code: `
        import { z } from 'zod';
        import { json } from '@sveltejs/kit';

        export const GET = async ({ url }) => {
          const query = {
            limit: url.searchParams.get('limit'),
            offset: url.searchParams.get('offset')
          };
          // Missing validation!
          return json(query);
        };
      `,
			errors: [
				{
					messageId: 'missingQueryValidation'
				}
			]
		},
		{
			// Invalid: Both request.json() and searchParams without validation
			filename: '/Users/test/project/src/routes/api/combined/+server.ts',
			code: `
        import { z } from 'zod';
        import { json } from '@sveltejs/kit';

        export const POST = async ({ request, url }) => {
          const body = await request.json();
          const param = url.searchParams.get('type');
          // Missing validation for both!
          return json({ body, param });
        };
      `,
			errors: [
				{
					messageId: 'missingRequestValidation'
				},
				{
					messageId: 'missingQueryValidation'
				}
			]
		}
	]
});

console.log('✅ All tests passed!');
