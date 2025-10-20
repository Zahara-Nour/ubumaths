/**
 * Question Template API - Single Template
 * ========================================
 *
 * GET /api/questions/templates/[id] - Get template by ID
 * PUT /api/questions/templates/[id] - Update template
 * DELETE /api/questions/templates/[id] - Delete template
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';
import { validateTemplate, detectCircularDependencies } from '$lib/questions';

/**
 * GET /api/questions/templates/[id]
 *
 * Retrieve a single template by ID
 */
export const GET: RequestHandler = async ({ params, locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession();

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    throw error(403, 'Only teachers and admins can access question templates');
  }

  try {
    const { data: template, error: queryError } = await supabase
      .from('question_templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (queryError || !template) {
      throw error(404, 'Template not found');
    }

    return json(template);
  } catch (err) {
    console.error('Error fetching template:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    throw error(500, 'Internal server error');
  }
};

/**
 * PUT /api/questions/templates/[id]
 *
 * Update an existing template
 */
export const PUT: RequestHandler = async ({ params, request, locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession();

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check role (only admins can update)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw error(403, 'Only admins can update question templates');
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

    // Detect circular dependencies in each variation
    const allCircularErrors: string[] = [];
    if (templateData.variations) {
      templateData.variations.forEach((variation, index) => {
        const circularErrors = detectCircularDependencies(variation.variables);
        if (circularErrors.length > 0) {
          allCircularErrors.push(...circularErrors.map(err => `Variation ${index + 1}: ${err}`));
        }
      });
    }

    if (allCircularErrors.length > 0) {
      return json(
        {
          success: false,
          errors: allCircularErrors
        },
        { status: 400 }
      );
    }

    // Update template (map camelCase to snake_case for database)
    const { data: template, error: updateError } = await supabase
      .from('question_templates')
      .update({
        type: templateData.type,
        variations: templateData.variations,
        precision: templateData.precision || { type: 'none' },
        options: templateData.options || null,
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
        transform_type: templateData.transformType || null,
        multiple_answers: templateData.multipleAnswers ?? null
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);

      // Check if template exists
      if (updateError.code === 'PGRST116') {
        throw error(404, 'Template not found');
      }

      throw error(500, 'Failed to update template');
    }

    return json({
      success: true,
      template
    });
  } catch (err) {
    console.error('Error in PUT /api/questions/templates/[id]:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    return json({
      success: false,
      errors: ['Internal server error']
    });
  }
};

/**
 * DELETE /api/questions/templates/[id]
 *
 * Delete a template
 */
export const DELETE: RequestHandler = async ({ params, locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession();

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check role (only admins can delete)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw error(403, 'Only admins can delete question templates');
  }

  try {
    // Check if template exists first
    const { data: existing } = await supabase
      .from('question_templates')
      .select('id')
      .eq('id', params.id)
      .single();

    if (!existing) {
      throw error(404, 'Template not found');
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('question_templates')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      throw error(500, 'Failed to delete template');
    }

    return json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error in DELETE /api/questions/templates/[id]:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    return json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
};
