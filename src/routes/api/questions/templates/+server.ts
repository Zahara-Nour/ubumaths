/**
 * Question Templates API
 * ======================
 *
 * CRUD endpoints for question templates
 *
 * GET /api/questions/templates - List templates with filters
 * POST /api/questions/templates - Create new template
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { QuestionTemplate, QuestionType, GradeLevel } from '$lib/questions/types';
import { validateTemplate } from '$lib/questions';
import { detectCircularDependencies } from '$lib/questions';

/**
 * GET /api/questions/templates
 *
 * List question templates with optional filters
 *
 * Query parameters:
 * - type: QuestionType (filter by question type)
 * - grades: GradeLevel[] (comma-separated, filter by grade)
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 *
 * Returns: { templates: QuestionTemplate[], total: number }
 */
export const GET: RequestHandler = async ({ url, locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession();

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check role (teachers and admins can view)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    throw error(403, 'Only teachers and admins can access question templates');
  }

  try {
    // Parse query parameters
    const typeParam = url.searchParams.get('type');
    const gradesParam = url.searchParams.get('grades');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('question_templates')
      .select('*', { count: 'exact' });

    // Apply filters
    if (typeParam) {
      query = query.eq('type', typeParam);
    }

    if (gradesParam) {
      const grades = gradesParam.split(',').map((g) => g.trim());
      query = query.overlaps('grades', grades);
    }

    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data: templates, error: queryError, count } = await query;

    if (queryError) {
      console.error('Error fetching templates:', queryError);
      throw error(500, 'Failed to fetch templates');
    }

    return json({
      templates: templates || [],
      total: count || 0
    });
  } catch (err) {
    console.error('Error in GET /api/questions/templates:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    throw error(500, 'Internal server error');
  }
};

/**
 * POST /api/questions/templates
 *
 * Create a new question template
 *
 * Body: QuestionTemplate (without id, timestamps)
 *
 * Returns: { success: true, template: QuestionTemplate } | { success: false, errors: string[] }
 */
export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession();

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check role (only admins can create)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw error(403, 'Only admins can create question templates');
  }

  try {
    const templateData = await request.json() as Partial<QuestionTemplate>;

    // Validate template structure
    const validationErrors = validateTemplate(templateData as QuestionTemplate);
    if (validationErrors.length > 0) {
      return json(
        {
          success: false,
          errors: validationErrors
        },
        { status: 400 }
      );
    }

    // Detect circular dependencies
    const circularErrors = detectCircularDependencies(templateData.variables);
    if (circularErrors.length > 0) {
      return json(
        {
          success: false,
          errors: circularErrors
        },
        { status: 400 }
      );
    }

    // Insert template (map camelCase to snake_case for database)
    const { data: template, error: insertError } = await supabase
      .from('question_templates')
      .insert({
        type: templateData.type,
        statement: templateData.statement,
        variables: templateData.variables || [],
        answer: templateData.answer,
        precision: templateData.precision || { type: 'none' },
        grades: templateData.grades,
        // Categorization fields (independent from grades)
        // - theme: Broad subject area (e.g., "Algèbre", "Géométrie") [required]
        // - domain: Specific topic (e.g., "Équations", "Triangles") [required]
        // - subdomain: Optional sub-topic (e.g., "Linéaires") [nullable]
        // - level: Difficulty (positive integer, 1=easy, higher=harder) [required]
        theme: templateData.theme,
        domain: templateData.domain,
        subdomain: templateData.subdomain || null,
        level: templateData.level,
        delay: templateData.delay || null,
        correction: templateData.correction || null,
        transform_type: templateData.transform_type || null,
        blanks: templateData.blanks || null,
        choices: templateData.choices || null,
        multiple_answers: templateData.multiple_answers ?? null,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting template:', insertError);
      throw error(500, 'Failed to create template');
    }

    return json(
      {
        success: true,
        template
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error in POST /api/questions/templates:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    return json({
      success: false,
      errors: ['Internal server error']
    });
  }
};
