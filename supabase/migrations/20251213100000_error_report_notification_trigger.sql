-- Migration: Add trigger to create notification when error report is submitted
-- This replaces the API-level createSystemNotification call with a database trigger
-- Using SECURITY DEFINER to bypass RLS - the trigger runs with elevated privileges

-- Function to create notification for error reports
CREATE OR REPLACE FUNCTION create_error_report_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_worksheet_id UUID;
    v_worksheet_title TEXT;
    v_teacher_id UUID;
    v_student_firstname TEXT;
    v_student_lastname TEXT;
    v_exercise_position INT;
    v_student_display_name TEXT;
BEGIN
    -- Get worksheet info via assignment
    SELECT w.id, w.title, w.created_by
    INTO v_worksheet_id, v_worksheet_title, v_teacher_id
    FROM worksheet_assignments wa
    JOIN worksheets w ON w.id = wa.worksheet_id
    WHERE wa.id = NEW.assignment_id;

    -- Get exercise position
    SELECT position INTO v_exercise_position
    FROM worksheet_exercises
    WHERE id = NEW.worksheet_exercise_id;

    -- Get student name
    SELECT firstname, lastname
    INTO v_student_firstname, v_student_lastname
    FROM profiles
    WHERE id = NEW.student_id;

    -- Build display name
    IF v_student_firstname IS NOT NULL AND v_student_lastname IS NOT NULL THEN
        v_student_display_name := v_student_firstname || ' ' || v_student_lastname;
    ELSE
        v_student_display_name := 'Un élève';
    END IF;

    -- Create the notification (bypasses RLS due to SECURITY DEFINER)
    INSERT INTO notifications (
        created_by,
        title,
        message,
        type,
        priority,
        action_label,
        action_url,
        target_type,
        target_user_ids,
        expires_at,
        is_system,
        system_event_type
    ) VALUES (
        NULL, -- System notification has no creator
        'Signalement d''erreur',
        format(
            '<strong>%s</strong> a signalé une erreur dans l''exercice %s du devoir "%s".',
            v_student_display_name,
            v_exercise_position + 1,
            v_worksheet_title
        ),
        'alert',
        'normal',
        'Voir les signalements',
        format('/dashboard/teacher/worksheets/%s/assignments/%s/reports',
               v_worksheet_id, NEW.assignment_id),
        'users',
        ARRAY[v_teacher_id],
        now() + interval '30 days',
        true,
        'error_reported'
    );

    RETURN NEW;
END;
$$;

-- Create trigger that fires after a new error report is inserted
CREATE TRIGGER on_error_report_created
    AFTER INSERT ON worksheet_error_reports
    FOR EACH ROW
    EXECUTE FUNCTION create_error_report_notification();

-- Add comment for documentation
COMMENT ON FUNCTION create_error_report_notification() IS
    'Creates a system notification for the teacher when a student submits an error report. Uses SECURITY DEFINER to bypass RLS.';
