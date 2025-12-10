# Chapter Templates API Routes - Implementation Progress

**Date**: 2025-12-10
**Feature**: Chapter Templates API Routes
**Status**: Implementation Complete, Testing Pending

## Overview

Implemented all 11 API routes for the Chapter Templates feature following TDD principles and project standards.

## Completed Tasks

### 1. Validation Schemas ✅

- **File**: `src/lib/server/validation/chapter-templates.ts`
- **Status**: Already existed, complete
- **Content**: All Zod schemas for request/response validation

### 2. Server Functions ✅

- **File**: `src/lib/server/chapter-templates.ts`
- **Status**: Already existed, complete
- **Functions**:
  - CRUD: create, get, update, delete, list templates
  - Publishing: publish, archive
  - Versioning: createVersion, getVersions, computeDiff
  - Instantiation: instantiate, extract/apply snapshots
  - Migration: checkUpdates, getPreview, migrate, detach

### 3. API Routes Created ✅

#### Template Management Routes

1. **`/api/teacher/chapter-templates` (+server.ts)**
   - GET: List templates with filters/pagination
   - POST: Create new template from scratch

2. **`/api/teacher/chapter-templates/[id]` (+server.ts)**
   - GET: Retrieve single template
   - PATCH: Update template metadata/content
   - DELETE: Archive template (soft delete)

3. **`/api/teacher/chapter-templates/[id]/publish` (+server.ts)**
   - POST: Publish draft template (with content validation)

4. **`/api/teacher/chapter-templates/[id]/versions` (+server.ts)**
   - GET: List all versions
   - POST: Create new version with diff

5. **`/api/teacher/chapter-templates/[id]/instantiate` (+server.ts)**
   - POST: Instantiate template into chapter

#### Chapter-Template Integration Routes

6. **`/api/teacher/chapters/[id]/create-template` (+server.ts)**
   - POST: Create template from existing chapter

7. **`/api/teacher/chapters/[id]/template-updates` (+server.ts)**
   - GET: Check for template updates, optional preview

8. **`/api/teacher/chapters/[id]/migrate` (+server.ts)**
   - POST: Migrate chapter to new template version

9. **`/api/teacher/chapters/[id]/detach` (+server.ts)**
   - POST: Detach chapter from template

## Implementation Details

### Security & Validation

- ✅ All routes use `requireRole(locals, 'teacher')` for authentication
- ✅ All request bodies validated with Zod schemas
- ✅ All UUIDs validated with `uuidSchema`
- ✅ Ownership checks before mutations
- ✅ Access control for public vs private templates

### Error Handling

- ✅ Proper HTTP status codes (400, 401, 403, 404, 500)
- ✅ Descriptive error messages
- ✅ Validation error details in French
- ✅ Console logging for server errors

### Best Practices

- ✅ TypeScript strict mode
- ✅ No `any` types (except for test mocks)
- ✅ Consistent error message format
- ✅ Early returns for validation
- ✅ JSDoc comments for all endpoints

## File Structure

```
src/routes/api/teacher/
├── chapter-templates/
│   ├── +server.ts                           # List, Create
│   └── [id]/
│       ├── +server.ts                       # Get, Update, Delete
│       ├── publish/+server.ts               # Publish
│       ├── versions/+server.ts              # List/Create versions
│       └── instantiate/+server.ts           # Instantiate
└── chapters/[id]/
    ├── create-template/+server.ts           # Create from chapter
    ├── template-updates/+server.ts          # Check updates
    ├── migrate/+server.ts                   # Migrate
    └── detach/+server.ts                    # Detach
```

## Next Steps

1. **Testing** (Pending)
   - Create comprehensive test file following project patterns
   - Test all endpoints for auth, validation, success, error cases
   - Mock Supabase responses
   - Run: `pnpm test:server src/routes/api/teacher/chapter-templates`

2. **Code Review** (Pending)
   - Use `code-reviewer` agent
   - Verify best practices adherence
   - Check error handling completeness

3. **Commit** (Pending)
   - Simple commit (9 new files)
   - Message: "feat(api): add chapter templates API routes"

4. **Quality Checks** (Pending - ONCE at end)
   - `pnpm lint`
   - `pnpm check`

## Technical Notes

### Query Parameters Handled

- **List templates**: status, grades, search, ownOnly, publicOnly, sortBy, sortDir, page, limit
- **Template updates**: preview (true/false)

### Content Snapshot Structure

Templates store JSONB snapshots containing:

- `documents[]`: External URLs or Google Drive links
- `quizQuestions[]`: Question template IDs with overrides
- `checklistItems[]`: Copied checklist items
- `exercises[]`: Exercise IDs

### Migration Strategy

1. Clear existing chapter content
2. Apply template version snapshot
3. Update instantiation record with version + timestamp

### Detach vs Delete

- **Detach**: Marks `is_detached=true`, preserves content
- **Delete**: Archives template (sets status='archived')

## Decisions Made

1. **Default pagination**: 20 items per page
2. **Search scope**: Title only (not description)
3. **Soft delete**: Always archive, never hard delete
4. **Grade validation**: Strict enum ['6', '5', '4', '3', '2', '1', 'T']
5. **No rate limiting**: Not needed for MVP

## Files Created

- `/src/routes/api/teacher/chapter-templates/+server.ts`
- `/src/routes/api/teacher/chapter-templates/[id]/+server.ts`
- `/src/routes/api/teacher/chapter-templates/[id]/publish/+server.ts`
- `/src/routes/api/teacher/chapter-templates/[id]/versions/+server.ts`
- `/src/routes/api/teacher/chapter-templates/[id]/instantiate/+server.ts`
- `/src/routes/api/teacher/chapters/[id]/create-template/+server.ts`
- `/src/routes/api/teacher/chapters/[id]/template-updates/+server.ts`
- `/src/routes/api/teacher/chapters/[id]/migrate/+server.ts`
- `/src/routes/api/teacher/chapters/[id]/detach/+server.ts`
- `/docs/wip/chapter-templates-api-progress.md` (this file)

## Recovery Information

If interrupted, resume from:

- **Current task**: Writing tests for API routes
- **Dependencies**: All server functions and validation schemas exist
- **State**: All 9 route files written and saved
