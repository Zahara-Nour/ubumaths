#!/bin/bash
# ============================================================================
# Backup Question Templates Before Migration
# ============================================================================
#
# Creates a SQL backup of the question_templates table before running the
# syntax migration. This allows you to restore the data if something goes wrong.
#
# Usage:
#   ./scripts/backup-questions.sh
#
# Output:
#   Creates: backups/question_templates_YYYYMMDD-HHMMSS.sql
#
# To restore from backup:
#   psql $DATABASE_URL < backups/question_templates_YYYYMMDD-HHMMSS.sql
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}📦 Question Templates Backup Script${NC}"
echo -e "${BLUE}===================================================================${NC}"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Error: Supabase CLI is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo "  or"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

# Create backups directory if it doesn't exist
BACKUP_DIR="backups"
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${BLUE}📁 Creating backups directory...${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Generate timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/question_templates_$TIMESTAMP.sql"

echo -e "${BLUE}📥 Creating backup of question_templates table...${NC}"
echo ""

# Attempt to create backup using supabase CLI
if supabase db dump --table question_templates > "$BACKUP_FILE" 2>&1; then
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo ""
    echo -e "${GREEN}📄 File: $BACKUP_FILE${NC}"

    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}📊 Size: $FILE_SIZE${NC}"

    # Count number of rows (rough estimate from SQL file)
    ROW_COUNT=$(grep -c "INSERT INTO" "$BACKUP_FILE" || echo "0")
    echo -e "${GREEN}📝 Estimated rows: $ROW_COUNT${NC}"

    echo ""
    echo -e "${YELLOW}===================================================================${NC}"
    echo -e "${YELLOW}💡 To restore this backup:${NC}"
    echo -e "${YELLOW}   psql \$DATABASE_URL < $BACKUP_FILE${NC}"
    echo -e "${YELLOW}===================================================================${NC}"
    echo ""

    exit 0
else
    echo -e "${RED}❌ Error: Backup failed${NC}"
    echo ""
    echo -e "${YELLOW}💡 Make sure you're connected to the correct Supabase project:${NC}"
    echo "   supabase link"
    echo ""
    echo -e "${YELLOW}💡 Or check your database connection:${NC}"
    echo "   supabase status"
    echo ""
    exit 1
fi
