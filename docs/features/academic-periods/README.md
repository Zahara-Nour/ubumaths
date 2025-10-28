# Academic Periods Feature

> 🆕 2025-10-28

Comprehensive academic calendar management system for organizing school years, teaching periods (trimesters/semesters), and vacation schedules.

---

## Table of Contents

- [Overview](#overview)
- [Key Capabilities](#key-capabilities)
- [Use Cases](#use-cases)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Related Documentation](#related-documentation)

---

## Overview

The Academic Periods feature provides a complete solution for managing the academic calendar structure of educational institutions. It enables administrators to:

- **Define school years** (e.g., "2024-2025") with precise start and end dates
- **Organize teaching periods** within each year (trimesters, semesters, quarters, or custom periods)
- **Track vacation schedules** (Christmas break, Spring break, Summer vacation, etc.)
- **Link assessments automatically** to the appropriate academic period based on their creation date
- **Duplicate years** for quick setup of subsequent academic years

This feature serves as the temporal foundation for organizing academic activities, generating report cards, and analyzing educational progress over defined time periods.

---

## Key Capabilities

### 1. School Year Management

- **CRUD Operations**: Create, read, update, and delete school years
- **Active Year**: Designate one active year per school (enforced by database constraint)
- **Year Format**: Standardized naming convention (YYYY-YYYY, e.g., "2024-2025")
- **Date Validation**: Ensures end date is after start date, years are consecutive
- **Metadata Support**: Extensible JSONB field for custom attributes (region, district, etc.)

### 2. Academic Period Organization

- **Flexible Period Types**:
  - Trimester (3 periods per year)
  - Semester (2 periods per year)
  - Quarter (4 periods per year)
  - Custom (any number, up to 10)
- **Sequential Ordering**: Periods numbered 1-10 with unique constraint per year
- **Visual Identification**: Each period has a customizable hex color for UI consistency
- **Date Ranges**: Each period has distinct start and end dates
- **Assessment Linking**: Assessments automatically assigned to periods based on creation date

### 3. Vacation Period Tracking

- **Holiday Management**: Define school vacation periods with names and date ranges
- **Cascading Deletion**: Holidays are removed when parent school year is deleted
- **Calendar Integration**: Holidays display in academic calendars and planning tools
- **Flexible Naming**: French language support for holiday names (e.g., "Vacances de Noël")

### 4. Year Duplication Wizard

- **Quick Setup**: Duplicate an existing year to create the next academic year
- **Date Offset**: Automatically shifts all dates by a specified number of days (typically 365)
- **Selective Copying**: Choose to include/exclude periods and holidays
- **Preserve Structure**: Maintains period types, order, and color schemes

### 5. Auto-Assignment Features

- **Automatic Period Linking**: New assessments automatically linked to the active period based on creation date
- **Backfill Function**: Manually link existing assessments to periods retroactively
- **Trigger-Based**: Database triggers ensure consistency without application logic

---

## Use Cases

### For School Administrators

1. **Annual Setup**: Create new school year with 3 trimesters and 5 vacation periods
2. **Quick Rollover**: Duplicate current year to setup 2025-2026 in minutes
3. **Calendar Coordination**: Define vacation schedules that sync across all classes
4. **Year Activation**: Mark new year as active, automatically linking new assessments

### For Report Card Generation

1. **Period-Based Reports**: Generate bulletin reports for Trimester 1, 2, or 3
2. **Assessment Filtering**: Retrieve all assessments for a specific period
3. **Progress Tracking**: Compare student performance across trimesters
4. **Date Range Queries**: Analyze results within exact period boundaries

### For Statistical Analysis

1. **Temporal Grouping**: Aggregate statistics by academic period
2. **Comparative Analysis**: Compare performance between trimesters/semesters
3. **Trend Detection**: Track improvement over consecutive periods
4. **Cohort Studies**: Analyze entire year's data across all periods

### For Data Archiving

1. **Year-Based Archival**: Archive all data associated with completed school years
2. **Historical Access**: Maintain access to past years for reference
3. **Audit Trails**: Track changes to academic periods over time
4. **Data Cleanup**: Cascade delete old years while preserving data integrity

---

## Architecture

### Database Tables

The feature consists of three core tables:

```
school_years
    ├── academic_periods (1:many)
    └── school_holidays (1:many)

assessments
    └── academic_period_id (FK → academic_periods)
```

#### school_years

- Stores academic year definitions (e.g., "2024-2025")
- One active year per school (enforced by unique constraint)
- Cascading delete removes all associated periods and holidays

#### academic_periods

- Stores teaching periods within a school year
- Types: trimester, semester, quarter, custom
- Sequential order (1-10) with unique constraint
- Color-coded for UI consistency

#### school_holidays

- Stores vacation periods within a school year
- Simple name + date range structure
- No ordering constraint (holidays can overlap or gap)

### Relationships

```
schools (1) ──→ (many) school_years
school_years (1) ──→ (many) academic_periods
school_years (1) ──→ (many) school_holidays
classes (many) ──→ (1) schools
assessments (many) ──→ (1) classes
assessments (many) ──→ (1) academic_periods [nullable]
```

### Access Control (RLS)

- **Admins**: Full CRUD access to all academic data for their school
- **Teachers**: Read-only access to their school's academic calendar
- **Students**: No direct access (data consumed via assessments)

### Automatic Features

1. **Auto-assignment Trigger**: On assessment creation, automatically links to matching period
2. **Active Year Constraint**: Database enforces only one active year per school
3. **Cascading Deletes**: Deleting a year removes all periods and holidays
4. **Updated_at Triggers**: Automatic timestamp updates on all modifications

---

## Getting Started

### Quick Start (5 Minutes)

1. **Navigate to School Organisation**
   - Go to Admin Dashboard → Schools → Select School → Organisation tab
   - Click "Périodes académiques" tab

2. **Create First School Year**
   - Click "Créer" button
   - Enter: Name "2024-2025", Start: 2024-09-01, End: 2025-06-30
   - Check "Année active"
   - Click "Enregistrer"

3. **Add Teaching Periods**
   - Click "Ajouter une période"
   - Create 3 periods:
     - Trimestre 1: 2024-09-01 to 2024-12-20 (order: 1, color: blue)
     - Trimestre 2: 2025-01-06 to 2025-03-31 (order: 2, color: green)
     - Trimestre 3: 2025-04-14 to 2025-06-30 (order: 3, color: purple)

4. **Add Vacations**
   - Click "Ajouter des vacances"
   - Create vacation periods:
     - Vacances de Noël: 2024-12-21 to 2025-01-05
     - Vacances d'hiver: 2025-02-15 to 2025-02-23
     - Vacances de printemps: 2025-04-01 to 2025-04-13
     - Vacances d'été: 2025-07-01 to 2025-08-31

5. **Verify Auto-Linking**
   - Create a new assessment (ensure date falls within a trimester)
   - Check that `academic_period_id` is automatically populated

### Advanced Setup

For detailed workflows, configuration options, and best practices, see:

- **[User Guide](./user-guide.md)** - Complete admin workflows
- **[Quick Start Guide](../../guides/academic-periods-quick-start.md)** - Step-by-step tutorial
- **[API Reference](./api-reference.md)** - Programmatic access
- **[Database Schema](./database.md)** - Technical details

---

## Related Documentation

### Feature Documentation

- [Assessment System](../assessments/) - How assessments link to periods
- [Report Cards](../report-cards/) - Period-based bulletin generation (coming soon)

### Technical Documentation

- [Database Schema](../../architecture/database-schema.md) - Full schema reference
- [Validation Library](../../../src/lib/server/validation/academic.ts) - Zod schemas

### Migration Files

- `20251028120000_create_school_years.sql`
- `20251028120100_create_academic_periods.sql`
- `20251028120200_create_school_holidays.sql`
- `20251028120300_link_assessments_to_periods.sql`

### User Interface

- Location: `/dashboard/admin/schools/[schoolId]/organisation`
- Tab: "Périodes académiques"
- Component: `+page.svelte` (1507 lines)

---

## Feature Status

- Status: Production-ready
- Added: 2025-10-28
- Tested: Database triggers, validation schemas, UI workflows
- RLS: Fully configured for admin/teacher access
- Migrations: All applied to production database

---

## Support

For questions or issues:

- Check [User Guide](./user-guide.md) for common workflows
- Review [API Reference](./api-reference.md) for integration details
- Consult [Database Schema](./database.md) for data structure
- See [Quick Start Guide](../../guides/academic-periods-quick-start.md) for tutorials
