-- Migration: Add consent verification function and anonymous access policy
-- Allows parents to grant consent via public link without authentication

-- Function to grant parental consent (SECURITY DEFINER for anonymous access)
-- This function updates both parental_consents and profiles tables atomically
CREATE OR REPLACE FUNCTION public.grant_parental_consent(
    p_token UUID,
    p_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consent_id UUID;
    v_student_id UUID;
    v_status consent_status;
    v_expires_at TIMESTAMPTZ;
    v_student_name TEXT;
BEGIN
    -- Find the consent record by token
    SELECT id, student_id, status, expires_at
    INTO v_consent_id, v_student_id, v_status, v_expires_at
    FROM parental_consents
    WHERE consent_token = p_token;

    -- Token not found
    IF v_consent_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TOKEN_NOT_FOUND',
            'message', 'Lien de consentement invalide.'
        );
    END IF;

    -- Already granted
    IF v_status = 'granted' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_GRANTED',
            'message', 'Ce consentement a déjà été accordé.'
        );
    END IF;

    -- Token expired
    IF v_expires_at < NOW() THEN
        -- Update status to expired
        UPDATE parental_consents
        SET status = 'expired'
        WHERE id = v_consent_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'TOKEN_EXPIRED',
            'message', 'Ce lien a expiré. Contactez l''enseignant pour recevoir un nouveau lien.'
        );
    END IF;

    -- Grant consent - update parental_consents
    UPDATE parental_consents
    SET
        status = 'granted',
        consent_given_at = NOW(),
        consent_ip = p_ip,
        consent_user_agent = p_user_agent
    WHERE id = v_consent_id;

    -- Update student profile
    UPDATE profiles
    SET
        consent_granted_at = NOW(),
        consent_grace_period_ends = NULL -- Clear grace period once consent is granted
    WHERE id = v_student_id;

    -- Get student name for confirmation
    SELECT COALESCE(firstname || ' ' || lastname, firstname, 'L''élève')
    INTO v_student_name
    FROM profiles
    WHERE id = v_student_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Consentement accordé avec succès.',
        'student_name', v_student_name
    );
END;
$$;

-- Function to get consent info by token (for display on consent page)
-- Returns limited student info for verification without granting consent
CREATE OR REPLACE FUNCTION public.get_consent_info(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_consent_id UUID;
    v_student_id UUID;
    v_status consent_status;
    v_expires_at TIMESTAMPTZ;
    v_parent_email TEXT;
    v_student RECORD;
    v_teacher_name TEXT;
    v_school_name TEXT;
BEGIN
    -- Find the consent record by token
    SELECT id, student_id, status, expires_at, parent_email
    INTO v_consent_id, v_student_id, v_status, v_expires_at, v_parent_email
    FROM parental_consents
    WHERE consent_token = p_token;

    -- Token not found
    IF v_consent_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TOKEN_NOT_FOUND',
            'message', 'Lien de consentement invalide.'
        );
    END IF;

    -- Already granted
    IF v_status = 'granted' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_GRANTED',
            'message', 'Ce consentement a déjà été accordé.'
        );
    END IF;

    -- Token expired
    IF v_expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TOKEN_EXPIRED',
            'message', 'Ce lien a expiré. Contactez l''enseignant pour recevoir un nouveau lien.'
        );
    END IF;

    -- Get student info (limited fields for privacy)
    SELECT firstname, lastname, grade
    INTO v_student
    FROM profiles
    WHERE id = v_student_id;

    -- Try to get teacher name from class_members
    SELECT p.firstname || ' ' || p.lastname
    INTO v_teacher_name
    FROM class_members cm
    JOIN classes c ON cm.class_id = c.id
    JOIN profiles p ON c.teacher_id = p.id
    WHERE cm.student_id = v_student_id
    LIMIT 1;

    -- Try to get school name
    SELECT s.name
    INTO v_school_name
    FROM class_members cm
    JOIN classes c ON cm.class_id = c.id
    JOIN schools s ON c.school_id = s.id
    WHERE cm.student_id = v_student_id
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'firstname', v_student.firstname,
            'lastname', v_student.lastname,
            'grade', v_student.grade
        ),
        'teacher_name', v_teacher_name,
        'school_name', v_school_name,
        'parent_email', v_parent_email,
        'expires_at', v_expires_at
    );
END;
$$;

-- Grant execute permissions to anonymous users
GRANT EXECUTE ON FUNCTION public.grant_parental_consent(UUID, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_consent_info(UUID) TO anon;

-- Comments for documentation
COMMENT ON FUNCTION public.grant_parental_consent IS
'Grants parental consent for a student. Called by anonymous parents via consent link. SECURITY DEFINER ensures proper access to update profiles.';

COMMENT ON FUNCTION public.get_consent_info IS
'Returns limited student info for consent verification page. Called by anonymous parents before granting consent.';
