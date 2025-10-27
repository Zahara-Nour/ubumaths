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

-- Index for class-based exercise assignments
-- Used in: teacher dashboard to view class assignments
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_class_active
ON exercise_assignments(class_id, is_active)
WHERE class_id IS NOT NULL;

-- =============================================================================
-- SRS (SPACED REPETITION) PERFORMANCE INDEXES
-- =============================================================================

-- Index for finding cards due for review by user
-- Used in: SRS study queue to fetch cards due today
CREATE INDEX IF NOT EXISTS idx_srs_card_stats_user_next_review
ON srs_card_stats(user_id, next_review)
WHERE next_review IS NOT NULL;

-- Index for looking up specific cards by reference
-- Used in: SRS card lookup and updates
CREATE INDEX IF NOT EXISTS idx_srs_card_stats_reference
ON srs_card_stats(card_reference_type, card_reference_id);

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
-- NOTIFICATIONS PERFORMANCE INDEXES
-- =============================================================================

-- Index for notification reads by user
-- Used in: finding which notifications a user has already read
CREATE INDEX IF NOT EXISTS idx_notification_reads_user
ON notification_reads(user_id, notification_id);

-- Index for sorting notifications by creation date
-- Used in: notification center to fetch recent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications(created_at DESC)
WHERE deleted_at IS NULL;

-- =============================================================================
-- COMMENT
-- =============================================================================

COMMENT ON INDEX idx_assessment_assignments_assessment_student IS 'Optimizes assessment assignment lookups by assessment and student';
COMMENT ON INDEX idx_assessment_assignments_assessment_class IS 'Optimizes class-based assessment assignment queries';
COMMENT ON INDEX idx_test_sessions_assignment_user IS 'Optimizes test attempt fetching for assessment results (sorted by completion date)';
COMMENT ON INDEX idx_test_sessions_assignment_completed IS 'Optimizes counting completed attempts for validation';
COMMENT ON INDEX idx_exercise_assignments_student_active IS 'Optimizes student dashboard active assignment queries';
COMMENT ON INDEX idx_exercise_assignments_class_active IS 'Optimizes teacher class assignment views';
COMMENT ON INDEX idx_srs_card_stats_user_next_review IS 'Optimizes SRS due card queries for a specific user';
COMMENT ON INDEX idx_srs_card_stats_reference IS 'Optimizes SRS card lookups by card reference';
COMMENT ON INDEX idx_class_members_class IS 'Optimizes batch class member fetching (N+1 query prevention)';
COMMENT ON INDEX idx_class_members_student IS 'Optimizes student class membership lookups';
COMMENT ON INDEX idx_notification_reads_user IS 'Optimizes finding which notifications a user has read';
COMMENT ON INDEX idx_notifications_created_at IS 'Optimizes sorting notifications by creation date (excludes deleted)';
