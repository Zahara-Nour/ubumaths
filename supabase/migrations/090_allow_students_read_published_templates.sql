/**
 * Allow Students to Read Published Templates
 * ===========================================
 *
 * Students need to read published question templates for SRS reviews.
 * This policy allows students to view templates with status = 'published'.
 */

-- Students can view published templates (for SRS and Automaths)
CREATE POLICY "Students can view published templates"
ON question_templates
FOR SELECT
USING (
  status = 'published'
  AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
);
