// TypeScript types for Academic Periods System
// Add these types to src/lib/types/database.ts

// =============================================================================
// Add to Database['public']['Tables'] interface
// =============================================================================

export interface Database {
	public: {
		Tables: {
			// ... existing tables ...

			school_years: {
				Row: {
					id: string;
					school_id: string;
					name: string; // "2024-2025", "2025-2026"
					start_date: string; // Date in ISO format
					end_date: string; // Date in ISO format
					is_active: boolean;
					metadata: Record<string, unknown>; // JSONB
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					school_id: string;
					name: string;
					start_date: string;
					end_date: string;
					is_active?: boolean;
					metadata?: Record<string, unknown>;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					school_id?: string;
					name?: string;
					start_date?: string;
					end_date?: string;
					is_active?: boolean;
					metadata?: Record<string, unknown>;
					created_at?: string;
					updated_at?: string;
				};
			};

			academic_periods: {
				Row: {
					id: string;
					school_year_id: string;
					type: 'trimester' | 'semester' | 'quarter' | 'custom';
					name: string; // "Trimestre 1", "1er Semestre"
					start_date: string; // Date in ISO format
					end_date: string; // Date in ISO format
					period_order: number; // 1, 2, 3...
					color: string; // Hex color code
					metadata: Record<string, unknown>; // JSONB
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					school_year_id: string;
					type: 'trimester' | 'semester' | 'quarter' | 'custom';
					name: string;
					start_date: string;
					end_date: string;
					period_order: number;
					color?: string;
					metadata?: Record<string, unknown>;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					school_year_id?: string;
					type?: 'trimester' | 'semester' | 'quarter' | 'custom';
					name?: string;
					start_date?: string;
					end_date?: string;
					period_order?: number;
					color?: string;
					metadata?: Record<string, unknown>;
					created_at?: string;
					updated_at?: string;
				};
			};

			school_holidays: {
				Row: {
					id: string;
					school_year_id: string;
					name: string; // "Vacances de Noël"
					start_date: string; // Date in ISO format
					end_date: string; // Date in ISO format
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					school_year_id: string;
					name: string;
					start_date: string;
					end_date: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					school_year_id?: string;
					name?: string;
					start_date?: string;
					end_date?: string;
					created_at?: string;
					updated_at?: string;
				};
			};

			// UPDATE to existing assessments table
			assessments: {
				Row: {
					// ... existing fields ...
					academic_period_id: string | null; // ADD THIS FIELD
				};
				Insert: {
					// ... existing fields ...
					academic_period_id?: string | null; // ADD THIS FIELD
				};
				Update: {
					// ... existing fields ...
					academic_period_id?: string | null; // ADD THIS FIELD
				};
			};
		};
	};
}

// =============================================================================
// Helper Types for Type-Safe Queries
// =============================================================================

export type SchoolYear = Database['public']['Tables']['school_years']['Row'];
export type SchoolYearInsert = Database['public']['Tables']['school_years']['Insert'];
export type SchoolYearUpdate = Database['public']['Tables']['school_years']['Update'];

export type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];
export type AcademicPeriodInsert = Database['public']['Tables']['academic_periods']['Insert'];
export type AcademicPeriodUpdate = Database['public']['Tables']['academic_periods']['Update'];

export type SchoolHoliday = Database['public']['Tables']['school_holidays']['Row'];
export type SchoolHolidayInsert = Database['public']['Tables']['school_holidays']['Insert'];
export type SchoolHolidayUpdate = Database['public']['Tables']['school_holidays']['Update'];

// Enum type for period types
export type PeriodType = 'trimester' | 'semester' | 'quarter' | 'custom';

// =============================================================================
// Extended Types with Relationships
// =============================================================================

export interface SchoolYearWithPeriods extends SchoolYear {
	academic_periods: AcademicPeriod[];
	school_holidays: SchoolHoliday[];
}

export interface AcademicPeriodWithYear extends AcademicPeriod {
	school_year: SchoolYear;
}

export interface AssessmentWithPeriod {
	// ... existing assessment fields ...
	academic_period: AcademicPeriod | null;
}

// =============================================================================
// UI Display Types
// =============================================================================

export interface PeriodSummary {
	id: string;
	name: string;
	start_date: string;
	end_date: string;
	color: string;
	assessment_count: number;
	is_current: boolean; // True if today's date is within this period
}

export interface YearSummary {
	id: string;
	name: string;
	is_active: boolean;
	period_count: number;
	holiday_count: number;
	assessment_count: number;
}

// =============================================================================
// Form Validation Types (for Zod schemas)
// =============================================================================

export interface CreateSchoolYearData {
	school_id: string;
	name: string;
	start_date: string;
	end_date: string;
	is_active?: boolean;
}

export interface CreateAcademicPeriodData {
	school_year_id: string;
	type: PeriodType;
	name: string;
	start_date: string;
	end_date: string;
	period_order: number;
	color?: string;
}

export interface CreateSchoolHolidayData {
	school_year_id: string;
	name: string;
	start_date: string;
	end_date: string;
}

// =============================================================================
// Utility Functions Type Signatures
// =============================================================================

export type BackfillAssessmentsResult = {
	school_year_id: string;
	updated_count: number;
};

export type GetCurrentPeriodResult = AcademicPeriod | null;
