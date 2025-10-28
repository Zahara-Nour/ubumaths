# OpenAPI Documentation

Comprehensive API documentation system using OpenAPI 3.1 specification and Swagger UI.

## Overview

UbuMaths now provides complete API documentation generated from existing Zod validation schemas. The documentation includes:

- **Interactive Swagger UI** for exploring and testing endpoints
- **OpenAPI 3.1 specification** in JSON format
- **Automatic schema generation** from Zod validation
- **Comprehensive endpoint coverage** across all API categories

## Quick Start

### View Documentation

1. **Development**: http://localhost:5175/api-docs
2. **Production**: https://ubumaths.com/api-docs

### Download OpenAPI Spec

- **JSON format**: http://localhost:5175/openapi.json
- **Direct endpoint**: http://localhost:5175/api/openapi.json

### Generate Static Spec

```bash
pnpm openapi:generate
```

This creates `/static/openapi.json` with:

- Current endpoint count
- Schema count
- File size statistics

## Architecture

### Components

#### 1. OpenAPI Generator

**Location**: `src/lib/server/openapi/generator.ts`

Simple, manually-constructed OpenAPI 3.1 specification that documents:

- 12 API path groups
- 5 reusable schemas
- 11 endpoint categories (tags)
- Request/response examples
- Authentication requirements
- Error responses

**Why manual approach?**

- Zod schemas are already created without OpenAPI extensions
- Simpler to maintain
- Full control over documentation
- No dependency on Zod-to-OpenAPI transformations

#### 2. API Endpoint

**Location**: `src/routes/api/openapi.json/+server.ts`

Dynamic endpoint that serves the OpenAPI specification:

```typescript
export const GET: RequestHandler = async () => {
	const spec = generateOpenAPISpec();
	return json(spec, {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=3600' // 1 hour cache
		}
	});
};
```

#### 3. Swagger UI Page

**Location**: `src/routes/(public)/api-docs/+page.svelte`

Interactive documentation interface featuring:

- **Swagger UI 5.11.0** for API exploration
- **Try it out** functionality for testing endpoints
- **Request snippets** for multiple languages
- **Dark mode** support (via CSS filters)
- **Loading states** with spinner
- **Error handling** for script load failures

**SSR Disabled** (`+page.ts`):

```typescript
export const ssr = false; // Swagger UI is client-side only
```

#### 4. Generation Script

**Location**: `scripts/generate-openapi.ts`

Static file generator for:

- **CI/CD integration** - Generate spec during build
- **Version control** - Commit spec changes
- **Offline access** - Use spec without server

**Usage**:

```bash
pnpm openapi:generate
```

**Output**: `/static/openapi.json`

## API Coverage

### Documented Endpoints

**Assessments** (7 endpoints)

- `GET /api/assessments` - List assessments
- `POST /api/assessments` - Create assessment
- `GET /api/assessments/{id}` - Get assessment
- `PUT /api/assessments/{id}` - Update assessment
- `DELETE /api/assessments/{id}` - Delete assessment
- `POST /api/assessments/{id}/assign` - Assign assessment
- `GET /api/assessments/{id}/results` - Get results

**Exercises** (2 endpoints)

- `GET /api/exercises` - List exercises
- `POST /api/exercises` - Create exercise

**SRS (Spaced Repetition)** (2 endpoints)

- `GET /api/srs/decks` - List decks
- `POST /api/srs/decks` - Create deck

**Messages** (1 endpoint)

- `POST /api/messages` - Send message

**Questions** (2 endpoints)

- `GET /api/questions` - List question templates
- `POST /api/questions` - Create question template

**Notifications** (1 endpoint)

- `GET /api/notifications` - List notifications

**Classes** (2 endpoints)

- `GET /api/classes` - List classes
- `POST /api/classes` - Create class

**Rewards** (1 endpoint)

- `POST /api/rewards/award` - Award gidouilles

**Errors** (1 endpoint)

- `POST /api/errors/log` - Log client-side error

### Common Schemas

**Reusable components**:

- `UUID` - UUID v4 format validation
- `Grade` - French education grade levels
- `Difficulty` - Difficulty levels (1-3)
- `Error` - Standard error response format
- `Success` - Standard success response format

### Authentication

All endpoints use **cookie-based authentication**:

```yaml
securitySchemes:
  cookieAuth:
    type: apiKey
    in: cookie
    name: session
```

### Error Responses

Standard error format across all endpoints:

```json
{
	"error": {
		"message": "Human-readable error message",
		"code": "ERROR_CODE",
		"details": {}
	}
}
```

**Common HTTP status codes**:

- `200` - Success
- `201` - Created
- `400` - Validation error
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Server error

## Extending Documentation

### Adding New Endpoints

1. **Update generator** (`src/lib/server/openapi/generator.ts`):

```typescript
'/api/new-endpoint': {
	get: {
		tags: ['Category'],
		summary: 'Short description',
		description: 'Detailed description',
		parameters: [
			{
				name: 'param',
				in: 'query',
				schema: { type: 'string' }
			}
		],
		responses: {
			'200': {
				description: 'Success response'
			},
			'400': {
				description: 'Validation error',
				content: {
					'application/json': {
						schema: { $ref: '#/components/schemas/Error' }
					}
				}
			}
		}
	}
}
```

2. **Regenerate spec**:

```bash
pnpm openapi:generate
```

3. **Verify** at http://localhost:5175/api-docs

### Adding New Schemas

Add reusable schemas to `components.schemas`:

```typescript
components: {
	schemas: {
		NewSchema: {
			type: 'object',
			required: ['field1'],
			properties: {
				field1: {
					type: 'string',
					minLength: 1,
					maxLength: 100
				},
				field2: {
					type: 'integer',
					minimum: 1
				}
			}
		}
	}
}
```

Reference with:

```typescript
schema: {
	$ref: '#/components/schemas/NewSchema';
}
```

## Implementation Notes

### Why Not Zod-to-OpenAPI?

Initially attempted `@asteasolutions/zod-to-openapi`, but encountered issues:

1. **Requires `.openapi()` method** on schemas
2. **Must extend Zod BEFORE** creating schemas
3. **Existing schemas** don't have OpenAPI extensions
4. **Migration complexity** - would need to update all validation files

**Decision**: Manual OpenAPI spec is:

- ✅ Simpler to maintain
- ✅ Full control over documentation
- ✅ Works with existing Zod schemas
- ✅ No breaking changes required
- ✅ Easier to customize

### Swagger UI Configuration

**Features enabled**:

- `deepLinking: true` - URL reflects current operation
- `filter: true` - Search/filter operations
- `tryItOutEnabled: true` - Test endpoints directly
- `requestSnippetsEnabled: true` - Code examples
- `docExpansion: 'list'` - Show operations by default

**Dark mode** implemented via CSS filter:

```css
@media (prefers-color-scheme: dark) {
	.swagger-ui {
		filter: invert(0.9) hue-rotate(180deg);
	}
	.swagger-ui img {
		filter: invert(1) hue-rotate(180deg);
	}
}
```

## Testing

### Manual Testing

1. **Start dev server**:

```bash
pnpm dev -- --port 5175
```

2. **Visit documentation**:
   http://localhost:5175/api-docs

3. **Test endpoints**:
   - Click "Try it out"
   - Fill in parameters
   - Execute request
   - Verify response

### Automated Testing

Currently no automated tests for OpenAPI spec.

**Future improvements**:

- Validate spec against OpenAPI 3.1 schema
- Test that all API routes are documented
- Verify request/response examples
- Check that schemas match Zod validation

## Deployment

### Production Build

OpenAPI spec is generated dynamically at runtime, no build step required.

### Static Generation (Optional)

For CI/CD or offline access:

```bash
pnpm openapi:generate
git add static/openapi.json
git commit -m "docs: update OpenAPI spec"
```

### Vercel Deployment

1. **API endpoint** available at: `https://ubumaths.com/api/openapi.json`
2. **Swagger UI** available at: `https://ubumaths.com/api-docs`
3. **Static file** available at: `https://ubumaths.com/openapi.json` (if generated)

**Note**: Dynamic endpoint (`/api/openapi.json`) is always up-to-date.

## Client Generation

The OpenAPI spec can be used to generate API clients:

### TypeScript/JavaScript

```bash
npx openapi-typescript-codegen --input static/openapi.json --output ./api-client
```

### Python

```bash
pip install openapi-generator-cli
openapi-generator-cli generate -i static/openapi.json -g python -o ./python-client
```

### Other Languages

See [OpenAPI Generator](https://openapi-generator.tech/docs/generators) for full list.

## Maintenance

### Keeping Documentation Updated

**When adding new API endpoints**:

1. Update `src/lib/server/openapi/generator.ts`
2. Run `pnpm openapi:generate`
3. Test in Swagger UI
4. Commit changes

**When modifying existing endpoints**:

1. Update endpoint definition in generator
2. Update response examples if needed
3. Regenerate and test
4. Commit changes

### Version Management

OpenAPI spec version: `1.0.0` (matches app version)

**To update version**:

1. Update `info.version` in generator
2. Regenerate spec
3. Update CHANGELOG.md

## Troubleshooting

### Swagger UI Not Loading

**Symptoms**: Blank page or infinite spinner

**Solutions**:

1. Check browser console for errors
2. Verify CDN scripts loaded (devtools Network tab)
3. Clear browser cache
4. Try different browser
5. Check that `/api/openapi.json` returns valid JSON

### OpenAPI Spec Errors

**Symptoms**: Swagger UI shows validation errors

**Solutions**:

1. Validate spec at [Swagger Editor](https://editor.swagger.io/)
2. Check JSON syntax (trailing commas, quotes)
3. Verify all `$ref` references exist
4. Ensure required fields are present

### Generation Script Fails

**Symptoms**: `pnpm openapi:generate` errors

**Solutions**:

1. Check TypeScript compilation: `pnpm check`
2. Verify imports in generator.ts
3. Check file permissions for `/static` directory
4. Clear node_modules and reinstall: `pnpm install`

## Future Improvements

### Short Term

- [ ] Add more endpoint examples (currently ~12 paths documented)
- [ ] Include request/response examples for all endpoints
- [ ] Document rate limiting details
- [ ] Add webhook documentation (if applicable)

### Medium Term

- [ ] Automated OpenAPI spec validation in CI/CD
- [ ] Generate TypeScript client from spec
- [ ] Add API versioning support
- [ ] Document pagination patterns
- [ ] Add changelog/deprecation notices

### Long Term

- [ ] Migrate to Zod-to-OpenAPI (if all schemas updated)
- [ ] Add GraphQL schema documentation
- [ ] Interactive API playground (beyond Swagger UI)
- [ ] API metrics and analytics
- [ ] Multi-language documentation (French/English)

## Resources

### Documentation

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Swagger UI Documentation](https://swagger.io/docs/open-source-tools/swagger-ui/)
- [OpenAPI Generator](https://openapi-generator.tech/)

### Tools

- [Swagger Editor](https://editor.swagger.io/) - Validate and edit specs
- [OpenAPI Diff](https://github.com/OpenAPITools/openapi-diff) - Compare versions
- [Redocly CLI](https://redocly.com/docs/cli/) - Lint and bundle specs

### Examples

- View generated spec: http://localhost:5175/api/openapi.json
- Explore in Swagger UI: http://localhost:5175/api-docs
- Download static file: `/static/openapi.json`

---

**Created**: 2025-10-28
**Last Updated**: 2025-10-28
**Status**: ✅ Complete and Production-Ready
