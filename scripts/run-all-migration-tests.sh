#!/bin/bash
# ============================================================================
# Automated Migration Test Runner
# ============================================================================
# This script runs all migration tests in sequence and generates a report
#
# Usage:
#   chmod +x scripts/run-all-migration-tests.sh
#   ./scripts/run-all-migration-tests.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# Database connection params
DB_HOST="localhost"
DB_PORT="54322"
DB_USER="postgres"
DB_NAME="postgres"
PSQL="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -q"

# Log functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_failure() {
    echo -e "${RED}✗${NC} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# ============================================================================
# Pre-Flight Checks
# ============================================================================
log_header "Pre-Flight Checks"

# Check Docker is running
log_info "Checking Docker..."
if docker ps >/dev/null 2>&1; then
    log_success "Docker is running"
else
    log_failure "Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if Supabase is running
log_info "Checking Supabase..."
if curl -s http://localhost:54321/rest/v1/ -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" >/dev/null 2>&1; then
    log_success "Supabase is running"
else
    log_warning "Supabase is not running. Starting..."
    pnpm db:start
    if [ $? -eq 0 ]; then
        log_success "Supabase started successfully"
    else
        log_failure "Failed to start Supabase"
        exit 1
    fi
fi

# Check database connection
log_info "Checking database connection..."
if $PSQL -c "SELECT 1;" >/dev/null 2>&1; then
    log_success "Database connection successful"
else
    log_failure "Cannot connect to database"
    exit 1
fi

# Check if question_templates table exists
log_info "Checking question_templates table..."
TABLE_EXISTS=$($PSQL -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'question_templates');" | xargs)
if [ "$TABLE_EXISTS" = "t" ]; then
    TEMPLATE_COUNT=$($PSQL -t -c "SELECT COUNT(*) FROM question_templates;" | xargs)
    log_success "question_templates table exists with $TEMPLATE_COUNT templates"
else
    log_failure "question_templates table not found"
    exit 1
fi

# ============================================================================
# Test Suite 1: Function Unit Tests
# ============================================================================
log_header "Test Suite 1: Function Unit Tests (13 tests)"
TOTAL_TESTS=$((TOTAL_TESTS + 13))

log_info "Running function unit tests..."
TEST_OUTPUT=$(mktemp)

# Run test script and capture output
if $PSQL -f scripts/test-template-migration.sql > "$TEST_OUTPUT" 2>&1; then
    # Parse test results
    if grep -q "All tests passed!" "$TEST_OUTPUT"; then
        log_success "All 13 unit tests passed"
        PASSED_TESTS=$((PASSED_TESTS + 13))

        # Show test summary
        grep -A3 "Test Results:" "$TEST_OUTPUT" | tail -4
    else
        log_failure "Some unit tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 13))

        # Show failures
        echo "Failed tests:"
        grep "✗ Test" "$TEST_OUTPUT" || echo "See $TEST_OUTPUT for details"
    fi
else
    log_failure "Test script execution failed"
    FAILED_TESTS=$((FAILED_TESTS + 13))
    cat "$TEST_OUTPUT"
fi

rm "$TEST_OUTPUT"

# Only proceed if unit tests passed
if [ $FAILED_TESTS -gt 0 ]; then
    log_failure "Unit tests failed. Stopping here."
    exit 1
fi

# ============================================================================
# Test Suite 2: Pre-Migration Data Analysis
# ============================================================================
log_header "Test Suite 2: Pre-Migration Data Analysis"
TOTAL_TESTS=$((TOTAL_TESTS + 3))

# Test 2.1: Count templates with Questions syntax
log_info "Analyzing Questions syntax usage..."
SYNTAX_COUNTS=$($PSQL -t -c "
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE statement::TEXT LIKE '%{@:%') as var_syntax,
  COUNT(*) FILTER (WHERE statement::TEXT LIKE '%{#:%') as random_syntax,
  COUNT(*) FILTER (WHERE statement::TEXT LIKE '%{eval:%') as eval_syntax
FROM question_templates;
" | xargs)

read TOTAL VAR_COUNT RANDOM_COUNT EVAL_COUNT <<< "$SYNTAX_COUNTS"

echo "  Total templates: $TOTAL"
echo "  Using variable syntax ({@:var}): $VAR_COUNT"
echo "  Using random syntax ({#:spec}): $RANDOM_COUNT"
echo "  Using eval syntax ({eval:expr}): $EVAL_COUNT"

if [ "$TOTAL" -gt 0 ]; then
    log_success "Found $TOTAL templates to analyze"
else
    log_failure "No templates found in database"
fi

# Test 2.2: Verify no Markdown syntax yet
log_info "Checking for existing Markdown syntax..."
MARKDOWN_COUNT=$($PSQL -t -c "
SELECT COUNT(*) FROM question_templates
WHERE statement::TEXT ~ '\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}'
  AND statement::TEXT NOT LIKE '%{{@:%';
" | xargs)

if [ "$MARKDOWN_COUNT" -eq 0 ]; then
    log_success "No Markdown syntax found (expected before migration)"
elif [ "$MARKDOWN_COUNT" -lt "$TOTAL" ]; then
    log_warning "Found $MARKDOWN_COUNT templates with Markdown syntax (mixed state)"
else
    log_warning "All templates already use Markdown syntax - migration may have run"
fi

# Test 2.3: Sample data inspection
log_info "Inspecting sample templates..."
$PSQL -c "
SELECT
  type,
  substring(statement::TEXT FROM 1 FOR 60) as statement_sample
FROM question_templates
LIMIT 3;
" 2>/dev/null && log_success "Sample data retrieved" || log_failure "Failed to retrieve samples"

# ============================================================================
# Test Suite 3: Migration Dry Run
# ============================================================================
log_header "Test Suite 3: Migration Dry Run (Transaction-Based)"
TOTAL_TESTS=$((TOTAL_TESTS + 5))

log_info "Creating transaction-safe migration test..."

# Create temp migration file without COMMIT
TEMP_MIGRATION=$(mktemp)
sed '/^COMMIT;/d' supabase/migrations/20251117120527_unify_template_syntax_to_markdown.sql > "$TEMP_MIGRATION"
echo "ROLLBACK;" >> "$TEMP_MIGRATION"

log_info "Running migration in transaction (will rollback)..."
DRY_RUN_OUTPUT=$(mktemp)

if $PSQL -f "$TEMP_MIGRATION" > "$DRY_RUN_OUTPUT" 2>&1; then
    if grep -q "Migration successful" "$DRY_RUN_OUTPUT"; then
        log_success "Dry run migration executed successfully"
    else
        log_warning "Dry run completed but no success message found"
    fi

    # Check for validation messages
    if grep -q "All templates successfully converted" "$DRY_RUN_OUTPUT"; then
        log_success "All templates converted successfully in dry run"
    fi
else
    log_failure "Dry run migration failed"
    echo "Error output:"
    cat "$DRY_RUN_OUTPUT"
fi

rm "$TEMP_MIGRATION" "$DRY_RUN_OUTPUT"

# Verify original data unchanged after rollback
log_info "Verifying data unchanged after rollback..."
STILL_QUESTIONS=$($PSQL -t -c "
SELECT COUNT(*) FROM question_templates
WHERE statement::TEXT LIKE '%{@:%' OR statement::TEXT LIKE '%{#:%';
" | xargs)

if [ "$STILL_QUESTIONS" -gt 0 ]; then
    log_success "Original Questions syntax still present (rollback successful)"
else
    log_failure "Questions syntax gone - rollback may have failed"
fi

# ============================================================================
# Test Suite 4: Edge Cases
# ============================================================================
log_header "Test Suite 4: Edge Case Testing"
TOTAL_TESTS=$((TOTAL_TESTS + 6))

log_info "Test 4.1: NULL handling..."
NULL_TEST=$($PSQL -t -c "SELECT convert_questions_to_markdown_syntax(NULL) IS NULL;" | xargs)
if [ "$NULL_TEST" = "t" ]; then
    log_success "NULL input handled correctly"
else
    log_failure "NULL handling failed"
fi

log_info "Test 4.2: Empty string handling..."
EMPTY_TEST=$($PSQL -t -c "SELECT convert_questions_to_markdown_syntax('') = '';" | xargs)
if [ "$EMPTY_TEST" = "t" ]; then
    log_success "Empty string handled correctly"
else
    log_failure "Empty string handling failed"
fi

log_info "Test 4.3: Idempotence (already converted)..."
IDEMPOTENT_TEST=$($PSQL -t -c "
SELECT convert_questions_to_markdown_syntax('{{a}} + {{b}}') = '{{a}} + {{b}}';
" | xargs)
if [ "$IDEMPOTENT_TEST" = "t" ]; then
    log_success "Idempotence verified - already converted syntax unchanged"
else
    log_failure "Idempotence failed"
fi

log_info "Test 4.4: LaTeX interference..."
LATEX_TEST=$($PSQL -t -c "
SELECT convert_questions_to_markdown_syntax('\$\$\\frac{{@:a}}{{@:b}}\$\$') = '\$\$\\frac{{a}}{{b}}\$\$';
" | xargs)
if [ "$LATEX_TEST" = "t" ]; then
    log_success "LaTeX braces don't interfere with conversion"
else
    log_failure "LaTeX handling failed"
fi

log_info "Test 4.5: Nested expressions..."
NESTED_TEST=$($PSQL -t -c "
SELECT convert_questions_to_markdown_syntax('{#:1-{@:max}}') = '{{1-{{max}}}}';
" | xargs)
if [ "$NESTED_TEST" = "t" ]; then
    log_success "Nested expressions converted correctly"
else
    log_failure "Nested expression handling failed"
fi

log_info "Test 4.6: Complex eval..."
COMPLEX_TEST=$($PSQL -t -c "
SELECT convert_questions_to_markdown_syntax('{eval:({@:a}+{@:b})/{@:c}}') = '{{eval:({{a}}+{{b}})/{{c}}}}';
" | xargs)
if [ "$COMPLEX_TEST" = "t" ]; then
    log_success "Complex eval expressions converted correctly"
else
    log_failure "Complex eval handling failed"
fi

# ============================================================================
# Test Suite 5: Performance Testing
# ============================================================================
log_header "Test Suite 5: Performance Testing"
TOTAL_TESTS=$((TOTAL_TESTS + 2))

log_info "Measuring conversion performance on single template..."
PERF_SINGLE=$($PSQL -t -c "
EXPLAIN (ANALYZE, TIMING)
SELECT convert_questions_to_markdown_syntax(statement::TEXT)
FROM question_templates
LIMIT 1;
" 2>&1 | grep "Execution Time" | awk '{print $3}')

echo "  Single conversion: ${PERF_SINGLE}ms"
if (( $(echo "$PERF_SINGLE < 10" | bc -l) )); then
    log_success "Single template conversion < 10ms"
else
    log_warning "Single template conversion slower than expected: ${PERF_SINGLE}ms"
fi

log_info "Estimating full migration time for $TOTAL templates..."
ESTIMATED_TIME=$(echo "$PERF_SINGLE * $TOTAL / 1000" | bc -l)
printf "  Estimated migration time: %.2f seconds\n" "$ESTIMATED_TIME"

if (( $(echo "$ESTIMATED_TIME < 5" | bc -l) )); then
    log_success "Estimated migration time < 5 seconds"
elif (( $(echo "$ESTIMATED_TIME < 30" | bc -l) )); then
    log_warning "Estimated migration time: ${ESTIMATED_TIME}s (acceptable but monitor)"
else
    log_failure "Estimated migration time too long: ${ESTIMATED_TIME}s"
fi

# ============================================================================
# Test Suite 6: Backup and Rollback
# ============================================================================
log_header "Test Suite 6: Backup and Rollback Testing"
TOTAL_TESTS=$((TOTAL_TESTS + 3))

log_info "Testing backup table creation..."
# This would be tested as part of actual migration, so we'll simulate
log_info "Creating test backup..."
TEST_BACKUP_OUTPUT=$($PSQL -c "
CREATE TABLE IF NOT EXISTS question_templates_test_backup AS
SELECT * FROM question_templates;
" 2>&1)

if [ $? -eq 0 ]; then
    log_success "Test backup table created successfully"

    # Verify backup count
    BACKUP_COUNT=$($PSQL -t -c "SELECT COUNT(*) FROM question_templates_test_backup;" | xargs)
    ORIGINAL_COUNT=$($PSQL -t -c "SELECT COUNT(*) FROM question_templates;" | xargs)

    if [ "$BACKUP_COUNT" -eq "$ORIGINAL_COUNT" ]; then
        log_success "Backup contains all $BACKUP_COUNT templates"
    else
        log_failure "Backup count mismatch: $BACKUP_COUNT vs $ORIGINAL_COUNT"
    fi

    # Cleanup
    $PSQL -c "DROP TABLE question_templates_test_backup;" >/dev/null 2>&1
else
    log_failure "Failed to create test backup"
fi

log_info "Testing rollback function exists..."
ROLLBACK_EXISTS=$($PSQL -t -c "
SELECT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE proname = 'rollback_template_syntax_migration'
);" | xargs)

if [ "$ROLLBACK_EXISTS" = "t" ]; then
    log_success "Rollback function exists"
else
    log_warning "Rollback function not found - will be created by migration"
fi

# ============================================================================
# Final Report
# ============================================================================
log_header "Test Results Summary"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Total Tests Run:     $TOTAL_TESTS"
echo "Passed:              ${GREEN}$PASSED_TESTS${NC}"
echo "Failed:              ${RED}$FAILED_TESTS${NC}"
echo "Success Rate:        $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo "Duration:            ${DURATION}s"
echo ""

# Go/No-Go Decision
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ APPROVED - READY FOR PRODUCTION${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "All tests passed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Review test results above"
    echo "2. Create production database backup"
    echo "3. Schedule maintenance window"
    echo "4. Execute migration: pnpm db:migrate"
    echo "5. Monitor for 24 hours"
    echo ""
    exit 0
elif [ $FAILED_TESTS -le 2 ] && [ $PASSED_TESTS -ge $((TOTAL_TESTS * 95 / 100)) ]; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}⚠ APPROVED WITH CAUTION${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo "Most tests passed but some issues found."
    echo "Review failures carefully before proceeding."
    echo ""
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ REJECTED - DO NOT PROCEED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Too many test failures. Do not run migration."
    echo ""
    echo "Actions required:"
    echo "1. Review failed tests above"
    echo "2. Fix conversion functions"
    echo "3. Re-run tests until all pass"
    echo ""
    exit 1
fi
