-- Migration: Add Performance Indexes
-- Description: Adds critical indexes to improve query performance across assessment, exercise, and SRS features
-- Date: 2025-10-27

-- =============================================================================
-- ASSESSMENT PERFORMANCE INDEXES
-- =============================================================================

-- Index for filtering assessment assignments by assessment and student
-- Used in: getAssessmentResults() to fetch assignments
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assessment_student
ON assessment_assignments(assessment_id, student_id);

-- Index for filtering assessment assignments by assessment and class
-- Used in: getAssessmentResults() when assignments are class-based
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assessment_class
ON assessment_assignments(assessment_id, class_id);

-- Index for test session lookups by assignment and user
-- Used in: getAssessmentResults() to batch fetch all attempts
CREATE INDEX IF NOT EXISTS idx_test_sessions_assignment_user
ON test_sessions(assignment_id, user_id, completed_at DESC);

-- Index for counting test attempts per assignment
-- Used in: validateAttempt() to check attempt limits
CREATE INDEX IF NOT EXISTS idx_test_sessions_assignment_completed
ON test_sessions(assignment_id, user_id)
WHERE completed_at IS NOT NULL;

-- =============================================================================
-- EXERCISE ASSIGNMENT PERFORMANCE INDEXES
-- =============================================================================

-- Index for active student assignments with deadlines
-- Used in: student dashboard to show active assignments
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_student_active
ON exercise_assignments(student_id, is_active, optional_deadline)
WHERE is_active = true;

-- Index for template-based exercise lookups
-- Used in: exercise generation and validation
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_template
ON exercise_assignments(template_id, is_active);

-- Index for class-based exercise assignments
-- Used in: teacher dashboard to view class assignments
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_class_active
ON exercise_assignments(class_id, is_active)
WHERE class_id IS NOT NULL;

-- =============================================================================
-- SRS (SPACED REPETITION) PERFORMANCE INDEXES
-- =============================================================================

-- Index for SRS card statistics by user and deck
-- Used in: SRS study sessions to filter cards
CREATE INDEX IF NOT EXISTS idx_srs_card_stats_user_deck
ON srs_card_stats(user_id, deck_id, next_review_at);

-- Index for finding cards due for review
-- Used in: SRS study queue to fetch cards due today
CREATE INDEX IF NOT EXISTS idx_srs_card_stats_next_review
ON srs_card_stats(user_id, next_review_at)
WHERE next_review_at IS NOT NULL;

-- =============================================================================
-- CLASS MEMBERSHIP INDEXES
-- =============================================================================

-- Index for class member lookups (used heavily in assessment results)
-- Used in: getAssessmentResults() to batch fetch class members
CREATE INDEX IF NOT EXISTS idx_class_members_class
ON class_members(class_id, student_id);

-- Index for student's class memberships
-- Used in: student dashboard to show class-based assignments
CREATE INDEX IF NOT EXISTS idx_class_members_student
ON class_members(student_id, class_id);

-- =============================================================================
-- NOTIFICATIONS PERFORMANCE INDEX
-- =============================================================================

-- Index for user notifications sorted by date
-- Used in: notification center to fetch recent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC)
WHERE is_read = false;

-- =============================================================================
-- COMMENT
-- =============================================================================

COMMENT ON INDEX idx_assessment_assignments_assessment_student IS 'Optimizes assessment assignment lookups by assessment and student';
COMMENT ON INDEX idx_assessment_assignments_assessment_class IS 'Optimizes class-based assessment assignment queries';
COMMENT ON INDEX idx_test_sessions_assignment_user IS 'Optimizes test attempt fetching for assessment results (sorted by completion date)';
COMMENT ON INDEX idx_test_sessions_assignment_completed IS 'Optimizes counting completed attempts for validation';
COMMENT ON INDEX idx_exercise_assignments_student_active IS 'Optimizes student dashboard active assignment queries';
COMMENT ON INDEX idx_exercise_assignments_template IS 'Optimizes template-based exercise lookups';
COMMENT ON INDEX idx_exercise_assignments_class_active IS 'Optimizes teacher class assignment views';
COMMENT ON INDEX idx_srs_card_stats_user_deck IS 'Optimizes SRS card lookups by user and deck';
COMMENT ON INDEX idx_srs_card_stats_next_review IS 'Optimizes SRS due card queries';
COMMENT ON INDEX idx_class_members_class IS 'Optimizes batch class member fetching (N+1 query prevention)';
COMMENT ON INDEX idx_class_members_student IS 'Optimizes student class membership lookups';
COMMENT ON INDEX idx_notifications_user_created IS 'Optimizes unread notification queries';
