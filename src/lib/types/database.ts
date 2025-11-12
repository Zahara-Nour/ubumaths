export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '13.0.5';
	};
	public: {
		Tables: {
			academic_periods: {
				Row: {
					color: string | null;
					created_at: string | null;
					end_date: string;
					id: string;
					metadata: Json | null;
					name: string;
					period_order: number;
					school_year_id: string;
					start_date: string;
					type: string;
					updated_at: string | null;
				};
				Insert: {
					color?: string | null;
					created_at?: string | null;
					end_date: string;
					id?: string;
					metadata?: Json | null;
					name: string;
					period_order: number;
					school_year_id: string;
					start_date: string;
					type: string;
					updated_at?: string | null;
				};
				Update: {
					color?: string | null;
					created_at?: string | null;
					end_date?: string;
					id?: string;
					metadata?: Json | null;
					name?: string;
					period_order?: number;
					school_year_id?: string;
					start_date?: string;
					type?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'academic_periods_school_year_id_fkey';
						columns: ['school_year_id'];
						isOneToOne: false;
						referencedRelation: 'school_years';
						referencedColumns: ['id'];
					}
				];
			};
			assessment_assignments: {
				Row: {
					assessment_id: string;
					assigned_at: string;
					assigned_by: string;
					class_id: string | null;
					id: string;
					student_id: string | null;
				};
				Insert: {
					assessment_id: string;
					assigned_at?: string;
					assigned_by: string;
					class_id?: string | null;
					id?: string;
					student_id?: string | null;
				};
				Update: {
					assessment_id?: string;
					assigned_at?: string;
					assigned_by?: string;
					class_id?: string | null;
					id?: string;
					student_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'assessment_assignments_assessment_id_fkey';
						columns: ['assessment_id'];
						isOneToOne: false;
						referencedRelation: 'assessments';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessment_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'assessment_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessment_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'assessment_assignments_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessment_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'assessment_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessment_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			assessments: {
				Row: {
					academic_period_id: string | null;
					categories: Json;
					created_at: string;
					created_by: string;
					description: string | null;
					grade: string;
					id: string;
					settings: Json;
					status: string;
					title: string;
					updated_at: string;
				};
				Insert: {
					academic_period_id?: string | null;
					categories: Json;
					created_at?: string;
					created_by: string;
					description?: string | null;
					grade: string;
					id?: string;
					settings?: Json;
					status?: string;
					title: string;
					updated_at?: string;
				};
				Update: {
					academic_period_id?: string | null;
					categories?: Json;
					created_at?: string;
					created_by?: string;
					description?: string | null;
					grade?: string;
					id?: string;
					settings?: Json;
					status?: string;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'assessments_academic_period_id_fkey';
						columns: ['academic_period_id'];
						isOneToOne: false;
						referencedRelation: 'academic_periods';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessments_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'assessments_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessments_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			background_job_runs: {
				Row: {
					completed_at: string | null;
					error_message: string | null;
					execution_time_ms: number | null;
					id: string;
					job_name: string;
					metadata: Json | null;
					started_at: string;
					status: string;
				};
				Insert: {
					completed_at?: string | null;
					error_message?: string | null;
					execution_time_ms?: number | null;
					id?: string;
					job_name: string;
					metadata?: Json | null;
					started_at?: string;
					status: string;
				};
				Update: {
					completed_at?: string | null;
					error_message?: string | null;
					execution_time_ms?: number | null;
					id?: string;
					job_name?: string;
					metadata?: Json | null;
					started_at?: string;
					status?: string;
				};
				Relationships: [];
			};
			class_members: {
				Row: {
					class_id: string;
					id: string;
					joined_at: string;
					student_id: string;
				};
				Insert: {
					class_id: string;
					id?: string;
					joined_at?: string;
					student_id: string;
				};
				Update: {
					class_id?: string;
					id?: string;
					joined_at?: string;
					student_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'class_members_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'class_members_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'class_members_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'class_members_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			class_schedules: {
				Row: {
					class_id: string;
					created_at: string;
					day_of_week: number;
					end_time: string;
					id: string;
					notes: string | null;
					period_number: number | null;
					room: string | null;
					start_time: string;
					subject: string | null;
					teacher_id: string;
					updated_at: string;
				};
				Insert: {
					class_id: string;
					created_at?: string;
					day_of_week: number;
					end_time: string;
					id?: string;
					notes?: string | null;
					period_number?: number | null;
					room?: string | null;
					start_time: string;
					subject?: string | null;
					teacher_id: string;
					updated_at?: string;
				};
				Update: {
					class_id?: string;
					created_at?: string;
					day_of_week?: number;
					end_time?: string;
					id?: string;
					notes?: string | null;
					period_number?: number | null;
					room?: string | null;
					start_time?: string;
					subject?: string | null;
					teacher_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'class_schedules_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'class_schedules_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'class_schedules_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'class_schedules_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			classes: {
				Row: {
					created_at: string;
					description: string | null;
					id: string;
					is_active: boolean;
					join_code: string;
					name: string;
					school_id: string | null;
					teacher_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					id?: string;
					is_active?: boolean;
					join_code: string;
					name: string;
					school_id?: string | null;
					teacher_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					id?: string;
					is_active?: boolean;
					join_code?: string;
					name?: string;
					school_id?: string | null;
					teacher_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'classes_school_id_fkey';
						columns: ['school_id'];
						isOneToOne: false;
						referencedRelation: 'schools';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'classes_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'classes_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'classes_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			conversation_participants: {
				Row: {
					conversation_id: string;
					id: string;
					is_archived: boolean | null;
					is_muted: boolean | null;
					joined_at: string | null;
					last_read_at: string | null;
					last_read_message_id: string | null;
					user_id: string;
				};
				Insert: {
					conversation_id: string;
					id?: string;
					is_archived?: boolean | null;
					is_muted?: boolean | null;
					joined_at?: string | null;
					last_read_at?: string | null;
					last_read_message_id?: string | null;
					user_id: string;
				};
				Update: {
					conversation_id?: string;
					id?: string;
					is_archived?: boolean | null;
					is_muted?: boolean | null;
					joined_at?: string | null;
					last_read_at?: string | null;
					last_read_message_id?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'conversation_participants_conversation_id_fkey';
						columns: ['conversation_id'];
						isOneToOne: false;
						referencedRelation: 'conversations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'conversation_participants_conversation_id_fkey';
						columns: ['conversation_id'];
						isOneToOne: false;
						referencedRelation: 'user_conversations_view';
						referencedColumns: ['conversation_id'];
					},
					{
						foreignKeyName: 'conversation_participants_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'conversation_participants_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'conversation_participants_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			conversations: {
				Row: {
					class_id: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					is_group: boolean | null;
					last_message_at: string | null;
					last_message_id: string | null;
					last_message_preview: string | null;
					name: string | null;
					updated_at: string | null;
				};
				Insert: {
					class_id?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_group?: boolean | null;
					last_message_at?: string | null;
					last_message_id?: string | null;
					last_message_preview?: string | null;
					name?: string | null;
					updated_at?: string | null;
				};
				Update: {
					class_id?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_group?: boolean | null;
					last_message_at?: string | null;
					last_message_id?: string | null;
					last_message_preview?: string | null;
					name?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'conversations_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'conversations_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'conversations_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'conversations_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'fk_conversations_last_message';
						columns: ['last_message_id'];
						isOneToOne: false;
						referencedRelation: 'messages';
						referencedColumns: ['id'];
					}
				];
			};
			error_logs: {
				Row: {
					browser_name: string | null;
					browser_version: string | null;
					column_number: number | null;
					context: Json | null;
					created_at: string;
					device_type: string | null;
					error_name: string | null;
					error_signature: string | null;
					error_type: string;
					file_path: string | null;
					id: string;
					line_number: number | null;
					message: string;
					os_name: string | null;
					request_body: Json | null;
					request_headers: Json | null;
					request_method: string | null;
					resolution_notes: string | null;
					resolved: boolean | null;
					resolved_at: string | null;
					resolved_by: string | null;
					response_time: number | null;
					session_id: string | null;
					severity: string;
					stack_trace: string | null;
					status_code: number | null;
					tags: string[] | null;
					url: string;
					user_agent: string | null;
					user_id: string | null;
					user_role: string | null;
					viewport_height: number | null;
					viewport_width: number | null;
				};
				Insert: {
					browser_name?: string | null;
					browser_version?: string | null;
					column_number?: number | null;
					context?: Json | null;
					created_at?: string;
					device_type?: string | null;
					error_name?: string | null;
					error_signature?: string | null;
					error_type: string;
					file_path?: string | null;
					id?: string;
					line_number?: number | null;
					message: string;
					os_name?: string | null;
					request_body?: Json | null;
					request_headers?: Json | null;
					request_method?: string | null;
					resolution_notes?: string | null;
					resolved?: boolean | null;
					resolved_at?: string | null;
					resolved_by?: string | null;
					response_time?: number | null;
					session_id?: string | null;
					severity?: string;
					stack_trace?: string | null;
					status_code?: number | null;
					tags?: string[] | null;
					url: string;
					user_agent?: string | null;
					user_id?: string | null;
					user_role?: string | null;
					viewport_height?: number | null;
					viewport_width?: number | null;
				};
				Update: {
					browser_name?: string | null;
					browser_version?: string | null;
					column_number?: number | null;
					context?: Json | null;
					created_at?: string;
					device_type?: string | null;
					error_name?: string | null;
					error_signature?: string | null;
					error_type?: string;
					file_path?: string | null;
					id?: string;
					line_number?: number | null;
					message?: string;
					os_name?: string | null;
					request_body?: Json | null;
					request_headers?: Json | null;
					request_method?: string | null;
					resolution_notes?: string | null;
					resolved?: boolean | null;
					resolved_at?: string | null;
					resolved_by?: string | null;
					response_time?: number | null;
					session_id?: string | null;
					severity?: string;
					stack_trace?: string | null;
					status_code?: number | null;
					tags?: string[] | null;
					url?: string;
					user_agent?: string | null;
					user_id?: string | null;
					user_role?: string | null;
					viewport_height?: number | null;
					viewport_width?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'error_logs_resolved_by_fkey';
						columns: ['resolved_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'error_logs_resolved_by_fkey';
						columns: ['resolved_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'error_logs_resolved_by_fkey';
						columns: ['resolved_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'error_logs_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'error_logs_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'error_logs_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			error_occurrences: {
				Row: {
					created_at: string;
					error_signature: string;
					error_type: string;
					file_path: string | null;
					first_seen: string;
					id: string;
					is_resolved: boolean | null;
					last_error_log_id: string | null;
					last_seen: string;
					line_number: number | null;
					message: string;
					occurrence_count: number;
					severity: string;
					updated_at: string;
					url: string | null;
				};
				Insert: {
					created_at?: string;
					error_signature: string;
					error_type: string;
					file_path?: string | null;
					first_seen?: string;
					id?: string;
					is_resolved?: boolean | null;
					last_error_log_id?: string | null;
					last_seen?: string;
					line_number?: number | null;
					message: string;
					occurrence_count?: number;
					severity: string;
					updated_at?: string;
					url?: string | null;
				};
				Update: {
					created_at?: string;
					error_signature?: string;
					error_type?: string;
					file_path?: string | null;
					first_seen?: string;
					id?: string;
					is_resolved?: boolean | null;
					last_error_log_id?: string | null;
					last_seen?: string;
					line_number?: number | null;
					message?: string;
					occurrence_count?: number;
					severity?: string;
					updated_at?: string;
					url?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'error_occurrences_last_error_log_id_fkey';
						columns: ['last_error_log_id'];
						isOneToOne: false;
						referencedRelation: 'error_logs';
						referencedColumns: ['id'];
					}
				];
			};
			exercise_assignments: {
				Row: {
					assigned_at: string;
					assigned_by: string;
					assigned_to_type: string;
					class_id: string | null;
					exercise_id: string;
					id: string;
					is_active: boolean;
					notes: string | null;
					optional_deadline: string | null;
					student_id: string | null;
				};
				Insert: {
					assigned_at?: string;
					assigned_by: string;
					assigned_to_type: string;
					class_id?: string | null;
					exercise_id: string;
					id?: string;
					is_active?: boolean;
					notes?: string | null;
					optional_deadline?: string | null;
					student_id?: string | null;
				};
				Update: {
					assigned_at?: string;
					assigned_by?: string;
					assigned_to_type?: string;
					class_id?: string | null;
					exercise_id?: string;
					id?: string;
					is_active?: boolean;
					notes?: string | null;
					optional_deadline?: string | null;
					student_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'exercise_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercise_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'exercise_assignments_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_assignments_exercise_id_fkey';
						columns: ['exercise_id'];
						isOneToOne: false;
						referencedRelation: 'exercises';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercise_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			exercise_completions: {
				Row: {
					assignment_id: string | null;
					completed_at: string | null;
					created_at: string;
					exercise_id: string;
					id: string;
					last_viewed_at: string;
					student_id: string;
					view_count: number;
				};
				Insert: {
					assignment_id?: string | null;
					completed_at?: string | null;
					created_at?: string;
					exercise_id: string;
					id?: string;
					last_viewed_at?: string;
					student_id: string;
					view_count?: number;
				};
				Update: {
					assignment_id?: string | null;
					completed_at?: string | null;
					created_at?: string;
					exercise_id?: string;
					id?: string;
					last_viewed_at?: string;
					student_id?: string;
					view_count?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'exercise_completions_assignment_id_fkey';
						columns: ['assignment_id'];
						isOneToOne: false;
						referencedRelation: 'assigned_exercises_with_details';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_completions_assignment_id_fkey';
						columns: ['assignment_id'];
						isOneToOne: false;
						referencedRelation: 'exercise_assignments';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_completions_exercise_id_fkey';
						columns: ['exercise_id'];
						isOneToOne: false;
						referencedRelation: 'exercises';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_completions_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercise_completions_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_completions_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			exercise_favorites: {
				Row: {
					created_at: string;
					exercise_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					exercise_id: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					exercise_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'exercise_favorites_exercise_id_fkey';
						columns: ['exercise_id'];
						isOneToOne: false;
						referencedRelation: 'exercises';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_favorites_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercise_favorites_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_favorites_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			exercise_templates: {
				Row: {
					created_at: string;
					created_by: string | null;
					description: string | null;
					id: string;
					is_system: boolean;
					template_data: Json;
					title: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					is_system?: boolean;
					template_data: Json;
					title: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					is_system?: boolean;
					template_data?: Json;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'exercise_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercise_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			exercises: {
				Row: {
					created_at: string;
					created_by: string;
					difficulty: number;
					distribution_mode: string;
					estimated_time_minutes: number | null;
					grade_levels: string[] | null;
					id: string;
					is_public: boolean;
					solution_md: string;
					source: string | null;
					statement_md: string;
					tags: string[];
					title: string | null;
					topic: string | null;
					updated_at: string;
					variables: Json;
				};
				Insert: {
					created_at?: string;
					created_by: string;
					difficulty: number;
					distribution_mode?: string;
					estimated_time_minutes?: number | null;
					grade_levels?: string[] | null;
					id?: string;
					is_public?: boolean;
					solution_md: string;
					source?: string | null;
					statement_md: string;
					tags?: string[];
					title?: string | null;
					topic?: string | null;
					updated_at?: string;
					variables?: Json;
				};
				Update: {
					created_at?: string;
					created_by?: string;
					difficulty?: number;
					distribution_mode?: string;
					estimated_time_minutes?: number | null;
					grade_levels?: string[] | null;
					id?: string;
					is_public?: boolean;
					solution_md?: string;
					source?: string | null;
					statement_md?: string;
					tags?: string[];
					title?: string | null;
					topic?: string | null;
					updated_at?: string;
					variables?: Json;
				};
				Relationships: [
					{
						foreignKeyName: 'exercises_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercises_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercises_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			friendships: {
				Row: {
					addressee_id: string;
					created_at: string;
					friendship_type: string;
					id: string;
					requester_id: string;
					status: string;
					updated_at: string;
				};
				Insert: {
					addressee_id: string;
					created_at?: string;
					friendship_type: string;
					id?: string;
					requester_id: string;
					status: string;
					updated_at?: string;
				};
				Update: {
					addressee_id?: string;
					created_at?: string;
					friendship_type?: string;
					id?: string;
					requester_id?: string;
					status?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'friendships_addressee_id_fkey';
						columns: ['addressee_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'friendships_addressee_id_fkey';
						columns: ['addressee_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'friendships_addressee_id_fkey';
						columns: ['addressee_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'friendships_requester_id_fkey';
						columns: ['requester_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'friendships_requester_id_fkey';
						columns: ['requester_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'friendships_requester_id_fkey';
						columns: ['requester_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_achievements: {
				Row: {
					category: string;
					created_at: string;
					description: string;
					element: string | null;
					gidouilles_reward: number;
					icon_url: string;
					id: string;
					name: string;
					prestige_reward: number;
					requirement_type: string;
					requirement_value: number;
					slug: string;
				};
				Insert: {
					category: string;
					created_at?: string;
					description: string;
					element?: string | null;
					gidouilles_reward?: number;
					icon_url: string;
					id?: string;
					name: string;
					prestige_reward?: number;
					requirement_type: string;
					requirement_value: number;
					slug: string;
				};
				Update: {
					category?: string;
					created_at?: string;
					description?: string;
					element?: string | null;
					gidouilles_reward?: number;
					icon_url?: string;
					id?: string;
					name?: string;
					prestige_reward?: number;
					requirement_type?: string;
					requirement_value?: number;
					slug?: string;
				};
				Relationships: [];
			};
			game_challenge_attempts: {
				Row: {
					answer_given: Json;
					attempted_at: string;
					challenge_id: string;
					challenge_instance: Json;
					combat_id: string | null;
					correct_answer: Json;
					id: string;
					success: boolean;
					time_taken: number;
					user_id: string;
				};
				Insert: {
					answer_given: Json;
					attempted_at?: string;
					challenge_id: string;
					challenge_instance: Json;
					combat_id?: string | null;
					correct_answer: Json;
					id?: string;
					success: boolean;
					time_taken: number;
					user_id: string;
				};
				Update: {
					answer_given?: Json;
					attempted_at?: string;
					challenge_id?: string;
					challenge_instance?: Json;
					combat_id?: string | null;
					correct_answer?: Json;
					id?: string;
					success?: boolean;
					time_taken?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'game_challenge_attempts_challenge_id_fkey';
						columns: ['challenge_id'];
						isOneToOne: false;
						referencedRelation: 'game_challenges';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_challenge_attempts_combat_id_fkey';
						columns: ['combat_id'];
						isOneToOne: false;
						referencedRelation: 'game_combats';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_challenge_attempts_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_challenge_attempts_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_challenge_attempts_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_challenges: {
				Row: {
					answer: Json;
					avg_time_taken: number | null;
					category: string;
					challenge_type: number;
					created_at: string;
					created_by: string | null;
					difficulty: number;
					element: string;
					hint: string | null;
					id: string;
					is_active: boolean;
					question: string;
					show_answer: Json | null;
					slug: string;
					timer: number;
					times_attempted: number;
					times_succeeded: number;
					updated_at: string;
					variables: Json;
					view_config: Json;
				};
				Insert: {
					answer: Json;
					avg_time_taken?: number | null;
					category: string;
					challenge_type: number;
					created_at?: string;
					created_by?: string | null;
					difficulty: number;
					element: string;
					hint?: string | null;
					id?: string;
					is_active?: boolean;
					question: string;
					show_answer?: Json | null;
					slug: string;
					timer: number;
					times_attempted?: number;
					times_succeeded?: number;
					updated_at?: string;
					variables?: Json;
					view_config?: Json;
				};
				Update: {
					answer?: Json;
					avg_time_taken?: number | null;
					category?: string;
					challenge_type?: number;
					created_at?: string;
					created_by?: string | null;
					difficulty?: number;
					element?: string;
					hint?: string | null;
					id?: string;
					is_active?: boolean;
					question?: string;
					show_answer?: Json | null;
					slug?: string;
					timer?: number;
					times_attempted?: number;
					times_succeeded?: number;
					updated_at?: string;
					variables?: Json;
					view_config?: Json;
				};
				Relationships: [
					{
						foreignKeyName: 'game_challenges_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_challenges_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_challenges_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_class_settings: {
				Row: {
					base_difficulty: number;
					challenge_timer_multiplier: number;
					class_id: string;
					created_at: string;
					gidouilles_multiplier: number;
					id: string;
					leaderboard_enabled: boolean;
					multiplayer_enabled: boolean;
					updated_at: string;
					xp_multiplier: number;
				};
				Insert: {
					base_difficulty?: number;
					challenge_timer_multiplier?: number;
					class_id: string;
					created_at?: string;
					gidouilles_multiplier?: number;
					id?: string;
					leaderboard_enabled?: boolean;
					multiplayer_enabled?: boolean;
					updated_at?: string;
					xp_multiplier?: number;
				};
				Update: {
					base_difficulty?: number;
					challenge_timer_multiplier?: number;
					class_id?: string;
					created_at?: string;
					gidouilles_multiplier?: number;
					id?: string;
					leaderboard_enabled?: boolean;
					multiplayer_enabled?: boolean;
					updated_at?: string;
					xp_multiplier?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'game_class_settings_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: true;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					}
				];
			};
			game_combats: {
				Row: {
					combat_flow: Json;
					completed_at: string | null;
					created_at: string;
					current_round: number;
					current_turn: number;
					id: string;
					invited_player_ids: string[];
					monster_endurance_remaining: number | null;
					monster_id: string;
					monster_snapshot: Json;
					organizer_id: string;
					outcome: string | null;
					player_snapshots: Json;
					prestige_gained: number | null;
					pyrs_gained: Json | null;
					ready_player_ids: string[];
					started_at: string | null;
					status: string;
					turn_order: Json;
					updated_at: string;
					xp_gained: number | null;
				};
				Insert: {
					combat_flow?: Json;
					completed_at?: string | null;
					created_at?: string;
					current_round?: number;
					current_turn?: number;
					id?: string;
					invited_player_ids?: string[];
					monster_endurance_remaining?: number | null;
					monster_id: string;
					monster_snapshot?: Json;
					organizer_id: string;
					outcome?: string | null;
					player_snapshots?: Json;
					prestige_gained?: number | null;
					pyrs_gained?: Json | null;
					ready_player_ids?: string[];
					started_at?: string | null;
					status?: string;
					turn_order?: Json;
					updated_at?: string;
					xp_gained?: number | null;
				};
				Update: {
					combat_flow?: Json;
					completed_at?: string | null;
					created_at?: string;
					current_round?: number;
					current_turn?: number;
					id?: string;
					invited_player_ids?: string[];
					monster_endurance_remaining?: number | null;
					monster_id?: string;
					monster_snapshot?: Json;
					organizer_id?: string;
					outcome?: string | null;
					player_snapshots?: Json;
					prestige_gained?: number | null;
					pyrs_gained?: Json | null;
					ready_player_ids?: string[];
					started_at?: string | null;
					status?: string;
					turn_order?: Json;
					updated_at?: string;
					xp_gained?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'game_combats_monster_id_fkey';
						columns: ['monster_id'];
						isOneToOne: false;
						referencedRelation: 'game_monsters';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_combats_organizer_id_fkey';
						columns: ['organizer_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_combats_organizer_id_fkey';
						columns: ['organizer_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_combats_organizer_id_fkey';
						columns: ['organizer_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_leaderboards: {
				Row: {
					challenges_completed: number;
					combats_won: number;
					created_at: string;
					id: string;
					prestige_earned: number;
					rank: number | null;
					season_identifier: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					challenges_completed?: number;
					combats_won?: number;
					created_at?: string;
					id?: string;
					prestige_earned?: number;
					rank?: number | null;
					season_identifier: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					challenges_completed?: number;
					combats_won?: number;
					created_at?: string;
					id?: string;
					prestige_earned?: number;
					rank?: number | null;
					season_identifier?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'game_leaderboards_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_leaderboards_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_leaderboards_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_monsters: {
				Row: {
					attack_coefficient: number;
					category: string;
					created_at: string;
					defeated_at: string | null;
					defeated_by: string | null;
					element: string;
					id: string;
					img_head_url: string;
					img_url: string;
					is_dead: boolean;
					level: number;
					max_endurance: number;
					name: string;
					position: string | null;
					spawned_at: string;
					spawned_by: string | null;
					updated_at: string;
				};
				Insert: {
					attack_coefficient: number;
					category: string;
					created_at?: string;
					defeated_at?: string | null;
					defeated_by?: string | null;
					element: string;
					id?: string;
					img_head_url: string;
					img_url: string;
					is_dead?: boolean;
					level: number;
					max_endurance: number;
					name: string;
					position?: string | null;
					spawned_at?: string;
					spawned_by?: string | null;
					updated_at?: string;
				};
				Update: {
					attack_coefficient?: number;
					category?: string;
					created_at?: string;
					defeated_at?: string | null;
					defeated_by?: string | null;
					element?: string;
					id?: string;
					img_head_url?: string;
					img_url?: string;
					is_dead?: boolean;
					level?: number;
					max_endurance?: number;
					name?: string;
					position?: string | null;
					spawned_at?: string;
					spawned_by?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'game_monsters_defeated_by_fkey';
						columns: ['defeated_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_monsters_defeated_by_fkey';
						columns: ['defeated_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_monsters_defeated_by_fkey';
						columns: ['defeated_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'game_monsters_spawned_by_fkey';
						columns: ['spawned_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_monsters_spawned_by_fkey';
						columns: ['spawned_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_monsters_spawned_by_fkey';
						columns: ['spawned_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_player_achievements: {
				Row: {
					achievement_id: string;
					completed: boolean;
					completed_at: string | null;
					created_at: string;
					id: string;
					progress: number;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					achievement_id: string;
					completed?: boolean;
					completed_at?: string | null;
					created_at?: string;
					id?: string;
					progress?: number;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					achievement_id?: string;
					completed?: boolean;
					completed_at?: string | null;
					created_at?: string;
					id?: string;
					progress?: number;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'game_player_achievements_achievement_id_fkey';
						columns: ['achievement_id'];
						isOneToOne: false;
						referencedRelation: 'game_achievements';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_player_achievements_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_player_achievements_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_player_achievements_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_players: {
				Row: {
					combats_lost: number;
					combats_won: number;
					created_at: string;
					help_bubbles_enabled: boolean;
					help_bubbles_seen: string[];
					id: string;
					last_played_at: string | null;
					level: number;
					music_settings: Json;
					prestige: number;
					pyrs_earth: number;
					pyrs_earth_spent: number;
					pyrs_fire: number;
					pyrs_fire_spent: number;
					pyrs_water: number;
					pyrs_water_spent: number;
					pyrs_wind: number;
					pyrs_wind_spent: number;
					total_combats: number;
					tutorial_completed_at: string | null;
					tutorial_stage: string;
					updated_at: string;
					user_id: string;
					xp: number;
				};
				Insert: {
					combats_lost?: number;
					combats_won?: number;
					created_at?: string;
					help_bubbles_enabled?: boolean;
					help_bubbles_seen?: string[];
					id?: string;
					last_played_at?: string | null;
					level?: number;
					music_settings?: Json;
					prestige?: number;
					pyrs_earth?: number;
					pyrs_earth_spent?: number;
					pyrs_fire?: number;
					pyrs_fire_spent?: number;
					pyrs_water?: number;
					pyrs_water_spent?: number;
					pyrs_wind?: number;
					pyrs_wind_spent?: number;
					total_combats?: number;
					tutorial_completed_at?: string | null;
					tutorial_stage?: string;
					updated_at?: string;
					user_id: string;
					xp?: number;
				};
				Update: {
					combats_lost?: number;
					combats_won?: number;
					created_at?: string;
					help_bubbles_enabled?: boolean;
					help_bubbles_seen?: string[];
					id?: string;
					last_played_at?: string | null;
					level?: number;
					music_settings?: Json;
					prestige?: number;
					pyrs_earth?: number;
					pyrs_earth_spent?: number;
					pyrs_fire?: number;
					pyrs_fire_spent?: number;
					pyrs_water?: number;
					pyrs_water_spent?: number;
					pyrs_wind?: number;
					pyrs_wind_spent?: number;
					total_combats?: number;
					tutorial_completed_at?: string | null;
					tutorial_stage?: string;
					updated_at?: string;
					user_id?: string;
					xp?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'game_players_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_players_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_players_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_spell_decks: {
				Row: {
					created_at: string;
					deck_name: string;
					id: string;
					is_active: boolean;
					spell_ids: string[];
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					deck_name: string;
					id?: string;
					is_active?: boolean;
					spell_ids: string[];
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					deck_name?: string;
					id?: string;
					is_active?: boolean;
					spell_ids?: string[];
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'game_spell_decks_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_spell_decks_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_spell_decks_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_spells: {
				Row: {
					created_at: string;
					element: string;
					id: string;
					last_upgraded_at: string | null;
					level: number;
					power: number;
					spell_num: number;
					type: string;
					unlocked_at: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					element: string;
					id?: string;
					last_upgraded_at?: string | null;
					level?: number;
					power: number;
					spell_num: number;
					type: string;
					unlocked_at?: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					element?: string;
					id?: string;
					last_upgraded_at?: string | null;
					level?: number;
					power?: number;
					spell_num?: number;
					type?: string;
					unlocked_at?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'game_spells_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_spells_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_spells_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			game_timeslots: {
				Row: {
					challenge_ids: string[];
					class_id: string;
					created_at: string;
					difficulty: number;
					ends_at: string;
					id: string;
					is_active: boolean;
					name: string;
					starts_at: string;
					teacher_id: string;
					updated_at: string;
				};
				Insert: {
					challenge_ids: string[];
					class_id: string;
					created_at?: string;
					difficulty: number;
					ends_at: string;
					id?: string;
					is_active?: boolean;
					name: string;
					starts_at: string;
					teacher_id: string;
					updated_at?: string;
				};
				Update: {
					challenge_ids?: string[];
					class_id?: string;
					created_at?: string;
					difficulty?: number;
					ends_at?: string;
					id?: string;
					is_active?: boolean;
					name?: string;
					starts_at?: string;
					teacher_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'game_timeslots_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_timeslots_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'game_timeslots_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'game_timeslots_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			message_attachments: {
				Row: {
					created_at: string | null;
					file_name: string;
					file_size: number;
					file_type: string;
					id: string;
					message_id: string;
					public_url: string;
					storage_path: string;
					uploaded_by: string;
				};
				Insert: {
					created_at?: string | null;
					file_name: string;
					file_size: number;
					file_type: string;
					id?: string;
					message_id: string;
					public_url: string;
					storage_path: string;
					uploaded_by: string;
				};
				Update: {
					created_at?: string | null;
					file_name?: string;
					file_size?: number;
					file_type?: string;
					id?: string;
					message_id?: string;
					public_url?: string;
					storage_path?: string;
					uploaded_by?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'message_attachments_message_id_fkey';
						columns: ['message_id'];
						isOneToOne: false;
						referencedRelation: 'messages';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_attachments_uploaded_by_fkey';
						columns: ['uploaded_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_attachments_uploaded_by_fkey';
						columns: ['uploaded_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_attachments_uploaded_by_fkey';
						columns: ['uploaded_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			message_attachments_v2: {
				Row: {
					file_name: string;
					file_size: number;
					file_type: string;
					id: string;
					message_id: string;
					public_url: string | null;
					storage_path: string;
					uploaded_at: string;
					uploaded_by: string;
				};
				Insert: {
					file_name: string;
					file_size: number;
					file_type: string;
					id?: string;
					message_id: string;
					public_url?: string | null;
					storage_path: string;
					uploaded_at?: string;
					uploaded_by: string;
				};
				Update: {
					file_name?: string;
					file_size?: number;
					file_type?: string;
					id?: string;
					message_id?: string;
					public_url?: string | null;
					storage_path?: string;
					uploaded_at?: string;
					uploaded_by?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'message_attachments_v2_message_id_fkey';
						columns: ['message_id'];
						isOneToOne: false;
						referencedRelation: 'private_messages';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_attachments_v2_uploaded_by_fkey';
						columns: ['uploaded_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_attachments_v2_uploaded_by_fkey';
						columns: ['uploaded_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_attachments_v2_uploaded_by_fkey';
						columns: ['uploaded_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			message_drafts: {
				Row: {
					author_id: string;
					class_id: string | null;
					content: Json | null;
					created_at: string;
					id: string;
					is_group_message: boolean | null;
					last_autosave_at: string | null;
					recipient_ids: string[] | null;
					replying_to_message_id: string | null;
					subject: string | null;
					updated_at: string;
				};
				Insert: {
					author_id: string;
					class_id?: string | null;
					content?: Json | null;
					created_at?: string;
					id?: string;
					is_group_message?: boolean | null;
					last_autosave_at?: string | null;
					recipient_ids?: string[] | null;
					replying_to_message_id?: string | null;
					subject?: string | null;
					updated_at?: string;
				};
				Update: {
					author_id?: string;
					class_id?: string | null;
					content?: Json | null;
					created_at?: string;
					id?: string;
					is_group_message?: boolean | null;
					last_autosave_at?: string | null;
					recipient_ids?: string[] | null;
					replying_to_message_id?: string | null;
					subject?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'message_drafts_author_id_fkey';
						columns: ['author_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_drafts_author_id_fkey';
						columns: ['author_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_drafts_author_id_fkey';
						columns: ['author_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'message_drafts_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_drafts_replying_to_message_id_fkey';
						columns: ['replying_to_message_id'];
						isOneToOne: false;
						referencedRelation: 'private_messages';
						referencedColumns: ['id'];
					}
				];
			};
			message_inbox: {
				Row: {
					deleted: boolean | null;
					folder_id: string | null;
					id: string;
					is_starred: boolean | null;
					message_id: string;
					read_at: string | null;
					received_at: string;
					recipient_id: string;
					status: string;
				};
				Insert: {
					deleted?: boolean | null;
					folder_id?: string | null;
					id?: string;
					is_starred?: boolean | null;
					message_id: string;
					read_at?: string | null;
					received_at?: string;
					recipient_id: string;
					status?: string;
				};
				Update: {
					deleted?: boolean | null;
					folder_id?: string | null;
					id?: string;
					is_starred?: boolean | null;
					message_id?: string;
					read_at?: string | null;
					received_at?: string;
					recipient_id?: string;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fk_message_inbox_folder';
						columns: ['folder_id'];
						isOneToOne: false;
						referencedRelation: 'user_folders';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_inbox_message_id_fkey';
						columns: ['message_id'];
						isOneToOne: false;
						referencedRelation: 'private_messages';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_inbox_recipient_id_fkey';
						columns: ['recipient_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_inbox_recipient_id_fkey';
						columns: ['recipient_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_inbox_recipient_id_fkey';
						columns: ['recipient_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			message_moderation_logs: {
				Row: {
					action: string;
					class_id: string | null;
					created_at: string;
					id: string;
					message_id: string | null;
					moderator_id: string;
					reason: string | null;
					student_id: string | null;
				};
				Insert: {
					action: string;
					class_id?: string | null;
					created_at?: string;
					id?: string;
					message_id?: string | null;
					moderator_id: string;
					reason?: string | null;
					student_id?: string | null;
				};
				Update: {
					action?: string;
					class_id?: string | null;
					created_at?: string;
					id?: string;
					message_id?: string | null;
					moderator_id?: string;
					reason?: string | null;
					student_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'message_moderation_logs_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_moderation_logs_message_id_fkey';
						columns: ['message_id'];
						isOneToOne: false;
						referencedRelation: 'private_messages';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_moderation_logs_moderator_id_fkey';
						columns: ['moderator_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_moderation_logs_moderator_id_fkey';
						columns: ['moderator_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_moderation_logs_moderator_id_fkey';
						columns: ['moderator_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'message_moderation_logs_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_moderation_logs_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_moderation_logs_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			message_reactions: {
				Row: {
					created_at: string | null;
					emoji: string;
					id: string;
					message_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					emoji: string;
					id?: string;
					message_id: string;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					emoji?: string;
					id?: string;
					message_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'message_reactions_message_id_fkey';
						columns: ['message_id'];
						isOneToOne: false;
						referencedRelation: 'messages';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_reactions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_reactions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_reactions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			message_reports: {
				Row: {
					created_at: string | null;
					details: string | null;
					id: string;
					message_id: string;
					reason: string;
					reported_by: string;
					review_notes: string | null;
					reviewed_at: string | null;
					reviewed_by: string | null;
					status: string | null;
				};
				Insert: {
					created_at?: string | null;
					details?: string | null;
					id?: string;
					message_id: string;
					reason: string;
					reported_by: string;
					review_notes?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					status?: string | null;
				};
				Update: {
					created_at?: string | null;
					details?: string | null;
					id?: string;
					message_id?: string;
					reason?: string;
					reported_by?: string;
					review_notes?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					status?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'message_reports_message_id_fkey';
						columns: ['message_id'];
						isOneToOne: false;
						referencedRelation: 'messages';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_reports_reported_by_fkey';
						columns: ['reported_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_reports_reported_by_fkey';
						columns: ['reported_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_reports_reported_by_fkey';
						columns: ['reported_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'message_reports_reviewed_by_fkey';
						columns: ['reviewed_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_reports_reviewed_by_fkey';
						columns: ['reviewed_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_reports_reviewed_by_fkey';
						columns: ['reviewed_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			message_search_index: {
				Row: {
					content_tsv: unknown;
					has_attachments: boolean | null;
					message_id: string;
					recipient_count: number | null;
					search_tsv: unknown;
					sender_name: string;
					sender_role: string;
					sent_at: string;
					subject_tsv: unknown;
				};
				Insert: {
					content_tsv?: unknown;
					has_attachments?: boolean | null;
					message_id: string;
					recipient_count?: number | null;
					search_tsv?: unknown;
					sender_name: string;
					sender_role: string;
					sent_at: string;
					subject_tsv?: unknown;
				};
				Update: {
					content_tsv?: unknown;
					has_attachments?: boolean | null;
					message_id?: string;
					recipient_count?: number | null;
					search_tsv?: unknown;
					sender_name?: string;
					sender_role?: string;
					sent_at?: string;
					subject_tsv?: unknown;
				};
				Relationships: [
					{
						foreignKeyName: 'message_search_index_message_id_fkey';
						columns: ['message_id'];
						isOneToOne: true;
						referencedRelation: 'private_messages';
						referencedColumns: ['id'];
					}
				];
			};
			message_template_versions: {
				Row: {
					body_template: string;
					change_summary: string | null;
					description: string | null;
					id: string;
					modified_at: string;
					modified_by: string;
					scope: string;
					subject_template: string;
					tags: string[] | null;
					template_id: string;
					title: string;
					trigger_type: string;
					variables: Json | null;
					version_number: number;
				};
				Insert: {
					body_template: string;
					change_summary?: string | null;
					description?: string | null;
					id?: string;
					modified_at?: string;
					modified_by: string;
					scope: string;
					subject_template: string;
					tags?: string[] | null;
					template_id: string;
					title: string;
					trigger_type: string;
					variables?: Json | null;
					version_number: number;
				};
				Update: {
					body_template?: string;
					change_summary?: string | null;
					description?: string | null;
					id?: string;
					modified_at?: string;
					modified_by?: string;
					scope?: string;
					subject_template?: string;
					tags?: string[] | null;
					template_id?: string;
					title?: string;
					trigger_type?: string;
					variables?: Json | null;
					version_number?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'message_template_versions_modified_by_fkey';
						columns: ['modified_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_template_versions_modified_by_fkey';
						columns: ['modified_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_template_versions_modified_by_fkey';
						columns: ['modified_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'message_template_versions_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'message_templates';
						referencedColumns: ['id'];
					}
				];
			};
			message_templates: {
				Row: {
					approval_status: string | null;
					body_template: string;
					class_id: string | null;
					created_at: string;
					created_by: string;
					description: string | null;
					id: string;
					is_active: boolean | null;
					review_notes: string | null;
					reviewed_at: string | null;
					reviewed_by: string | null;
					scope: string;
					search_vector: unknown;
					subject_template: string;
					tags: string[] | null;
					title: string;
					trigger_config: Json | null;
					trigger_type: string;
					updated_at: string;
					variables: Json | null;
				};
				Insert: {
					approval_status?: string | null;
					body_template: string;
					class_id?: string | null;
					created_at?: string;
					created_by: string;
					description?: string | null;
					id?: string;
					is_active?: boolean | null;
					review_notes?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					scope: string;
					search_vector?: unknown;
					subject_template: string;
					tags?: string[] | null;
					title: string;
					trigger_config?: Json | null;
					trigger_type: string;
					updated_at?: string;
					variables?: Json | null;
				};
				Update: {
					approval_status?: string | null;
					body_template?: string;
					class_id?: string | null;
					created_at?: string;
					created_by?: string;
					description?: string | null;
					id?: string;
					is_active?: boolean | null;
					review_notes?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					scope?: string;
					search_vector?: unknown;
					subject_template?: string;
					tags?: string[] | null;
					title?: string;
					trigger_config?: Json | null;
					trigger_type?: string;
					updated_at?: string;
					variables?: Json | null;
				};
				Relationships: [
					{
						foreignKeyName: 'message_templates_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'message_templates_reviewed_by_fkey';
						columns: ['reviewed_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'message_templates_reviewed_by_fkey';
						columns: ['reviewed_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_templates_reviewed_by_fkey';
						columns: ['reviewed_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			messages: {
				Row: {
					content: Json;
					conversation_id: string;
					created_at: string | null;
					deleted_at: string | null;
					edited_at: string | null;
					flag_reason: string | null;
					id: string;
					is_flagged: boolean | null;
					is_reported: boolean | null;
					plain_text: string | null;
					sender_id: string | null;
				};
				Insert: {
					content: Json;
					conversation_id: string;
					created_at?: string | null;
					deleted_at?: string | null;
					edited_at?: string | null;
					flag_reason?: string | null;
					id?: string;
					is_flagged?: boolean | null;
					is_reported?: boolean | null;
					plain_text?: string | null;
					sender_id?: string | null;
				};
				Update: {
					content?: Json;
					conversation_id?: string;
					created_at?: string | null;
					deleted_at?: string | null;
					edited_at?: string | null;
					flag_reason?: string | null;
					id?: string;
					is_flagged?: boolean | null;
					is_reported?: boolean | null;
					plain_text?: string | null;
					sender_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'messages_conversation_id_fkey';
						columns: ['conversation_id'];
						isOneToOne: false;
						referencedRelation: 'conversations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'messages_conversation_id_fkey';
						columns: ['conversation_id'];
						isOneToOne: false;
						referencedRelation: 'user_conversations_view';
						referencedColumns: ['conversation_id'];
					},
					{
						foreignKeyName: 'messages_sender_id_fkey';
						columns: ['sender_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'messages_sender_id_fkey';
						columns: ['sender_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'messages_sender_id_fkey';
						columns: ['sender_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			moderation_logs: {
				Row: {
					action: string;
					created_at: string;
					id: string;
					metadata: Json | null;
					moderator_id: string;
					reason: string | null;
					target_id: string;
					target_type: string;
				};
				Insert: {
					action: string;
					created_at?: string;
					id?: string;
					metadata?: Json | null;
					moderator_id: string;
					reason?: string | null;
					target_id: string;
					target_type: string;
				};
				Update: {
					action?: string;
					created_at?: string;
					id?: string;
					metadata?: Json | null;
					moderator_id?: string;
					reason?: string | null;
					target_id?: string;
					target_type?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'moderation_logs_moderator_id_fkey';
						columns: ['moderator_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'moderation_logs_moderator_id_fkey';
						columns: ['moderator_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'moderation_logs_moderator_id_fkey';
						columns: ['moderator_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			notification_reads: {
				Row: {
					created_at: string;
					id: string;
					notification_id: string;
					read_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					notification_id: string;
					read_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					notification_id?: string;
					read_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'notification_reads_notification_id_fkey';
						columns: ['notification_id'];
						isOneToOne: false;
						referencedRelation: 'notifications';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'notification_reads_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'notification_reads_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'notification_reads_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			notifications: {
				Row: {
					action_label: string | null;
					action_url: string | null;
					created_at: string;
					created_by: string | null;
					deleted_at: string | null;
					expires_at: string;
					id: string;
					is_system: boolean;
					message: string;
					priority: string;
					system_event_type: string | null;
					target_class_ids: string[] | null;
					target_roles: string[] | null;
					target_type: string;
					target_user_ids: string[] | null;
					title: string;
					type: string;
				};
				Insert: {
					action_label?: string | null;
					action_url?: string | null;
					created_at?: string;
					created_by?: string | null;
					deleted_at?: string | null;
					expires_at?: string;
					id?: string;
					is_system?: boolean;
					message: string;
					priority?: string;
					system_event_type?: string | null;
					target_class_ids?: string[] | null;
					target_roles?: string[] | null;
					target_type: string;
					target_user_ids?: string[] | null;
					title: string;
					type: string;
				};
				Update: {
					action_label?: string | null;
					action_url?: string | null;
					created_at?: string;
					created_by?: string | null;
					deleted_at?: string | null;
					expires_at?: string;
					id?: string;
					is_system?: boolean;
					message?: string;
					priority?: string;
					system_event_type?: string | null;
					target_class_ids?: string[] | null;
					target_roles?: string[] | null;
					target_type?: string;
					target_user_ids?: string[] | null;
					title?: string;
					type?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'notifications_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'notifications_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'notifications_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			pending_students: {
				Row: {
					activated_at: string | null;
					class_ids: string[] | null;
					created_at: string | null;
					email: string;
					firstname: string;
					gender: string | null;
					grade: string | null;
					id: string;
					is_activated: boolean | null;
					lastname: string;
					school_id: string | null;
					updated_at: string | null;
				};
				Insert: {
					activated_at?: string | null;
					class_ids?: string[] | null;
					created_at?: string | null;
					email: string;
					firstname: string;
					gender?: string | null;
					grade?: string | null;
					id?: string;
					is_activated?: boolean | null;
					lastname: string;
					school_id?: string | null;
					updated_at?: string | null;
				};
				Update: {
					activated_at?: string | null;
					class_ids?: string[] | null;
					created_at?: string | null;
					email?: string;
					firstname?: string;
					gender?: string | null;
					grade?: string | null;
					id?: string;
					is_activated?: boolean | null;
					lastname?: string;
					school_id?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'pending_students_school_id_fkey';
						columns: ['school_id'];
						isOneToOne: false;
						referencedRelation: 'schools';
						referencedColumns: ['id'];
					}
				];
			};
			private_messages: {
				Row: {
					class_id: string | null;
					content: Json;
					deleted_by_sender: boolean | null;
					edited_at: string | null;
					id: string;
					is_group_message: boolean | null;
					parent_message_id: string | null;
					plain_text: string | null;
					recipient_count: number | null;
					sender_id: string;
					sent_at: string;
					subject: string;
					thread_root_id: string | null;
				};
				Insert: {
					class_id?: string | null;
					content: Json;
					deleted_by_sender?: boolean | null;
					edited_at?: string | null;
					id?: string;
					is_group_message?: boolean | null;
					parent_message_id?: string | null;
					plain_text?: string | null;
					recipient_count?: number | null;
					sender_id: string;
					sent_at?: string;
					subject: string;
					thread_root_id?: string | null;
				};
				Update: {
					class_id?: string | null;
					content?: Json;
					deleted_by_sender?: boolean | null;
					edited_at?: string | null;
					id?: string;
					is_group_message?: boolean | null;
					parent_message_id?: string | null;
					plain_text?: string | null;
					recipient_count?: number | null;
					sender_id?: string;
					sent_at?: string;
					subject?: string;
					thread_root_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'private_messages_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'private_messages_parent_message_id_fkey';
						columns: ['parent_message_id'];
						isOneToOne: false;
						referencedRelation: 'private_messages';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'private_messages_sender_id_fkey';
						columns: ['sender_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'private_messages_sender_id_fkey';
						columns: ['sender_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'private_messages_sender_id_fkey';
						columns: ['sender_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'private_messages_thread_root_id_fkey';
						columns: ['thread_root_id'];
						isOneToOne: false;
						referencedRelation: 'private_messages';
						referencedColumns: ['id'];
					}
				];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					bonus: number;
					class_ids: string[] | null;
					created_at: string;
					email: string;
					firstname: string | null;
					full_name: string | null;
					gender: string | null;
					gidouilles: number;
					grade: string | null;
					id: string;
					is_test: boolean;
					lastname: string | null;
					role: Database['public']['Enums']['user_role'];
					school_id: string | null;
					updated_at: string;
					vip_cards: Json;
					vip_cards_history: Json;
				};
				Insert: {
					avatar_url?: string | null;
					bonus?: number;
					class_ids?: string[] | null;
					created_at?: string;
					email: string;
					firstname?: string | null;
					full_name?: string | null;
					gender?: string | null;
					gidouilles?: number;
					grade?: string | null;
					id: string;
					is_test?: boolean;
					lastname?: string | null;
					role?: Database['public']['Enums']['user_role'];
					school_id?: string | null;
					updated_at?: string;
					vip_cards?: Json;
					vip_cards_history?: Json;
				};
				Update: {
					avatar_url?: string | null;
					bonus?: number;
					class_ids?: string[] | null;
					created_at?: string;
					email?: string;
					firstname?: string | null;
					full_name?: string | null;
					gender?: string | null;
					gidouilles?: number;
					grade?: string | null;
					id?: string;
					is_test?: boolean;
					lastname?: string | null;
					role?: Database['public']['Enums']['user_role'];
					school_id?: string | null;
					updated_at?: string;
					vip_cards?: Json;
					vip_cards_history?: Json;
				};
				Relationships: [
					{
						foreignKeyName: 'profiles_school_id_fkey';
						columns: ['school_id'];
						isOneToOne: false;
						referencedRelation: 'schools';
						referencedColumns: ['id'];
					}
				];
			};
			question_templates: {
				Row: {
					created_at: string | null;
					created_by: string | null;
					delay: number | null;
					description: string | null;
					domain: string;
					exercise_instruction: string | null;
					grades: string[];
					id: string;
					level: number;
					multiple_answers: boolean | null;
					options: Json | null;
					precision: Json | null;
					status: string;
					subdomain: string | null;
					theme: string;
					title: string;
					transform_type: string | null;
					type: string;
					updated_at: string | null;
					variations: Json;
				};
				Insert: {
					created_at?: string | null;
					created_by?: string | null;
					delay?: number | null;
					description?: string | null;
					domain: string;
					exercise_instruction?: string | null;
					grades: string[];
					id?: string;
					level: number;
					multiple_answers?: boolean | null;
					options?: Json | null;
					precision?: Json | null;
					status: string;
					subdomain?: string | null;
					theme: string;
					title: string;
					transform_type?: string | null;
					type: string;
					updated_at?: string | null;
					variations: Json;
				};
				Update: {
					created_at?: string | null;
					created_by?: string | null;
					delay?: number | null;
					description?: string | null;
					domain?: string;
					exercise_instruction?: string | null;
					grades?: string[];
					id?: string;
					level?: number;
					multiple_answers?: boolean | null;
					options?: Json | null;
					precision?: Json | null;
					status?: string;
					subdomain?: string | null;
					theme?: string;
					title?: string;
					transform_type?: string | null;
					type?: string;
					updated_at?: string | null;
					variations?: Json;
				};
				Relationships: [
					{
						foreignKeyName: 'question_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'question_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'question_templates_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			rate_limits: {
				Row: {
					count: number;
					created_at: string | null;
					expires_at: string;
					id: string;
					key: string;
				};
				Insert: {
					count?: number;
					created_at?: string | null;
					expires_at: string;
					id?: string;
					key: string;
				};
				Update: {
					count?: number;
					created_at?: string | null;
					expires_at?: string;
					id?: string;
					key?: string;
				};
				Relationships: [];
			};
			riddle_assignments: {
				Row: {
					assigned_at: string;
					assigned_by: string;
					class_id: string | null;
					id: string;
					riddle_id: string;
					student_id: string | null;
				};
				Insert: {
					assigned_at?: string;
					assigned_by: string;
					class_id?: string | null;
					id?: string;
					riddle_id: string;
					student_id?: string | null;
				};
				Update: {
					assigned_at?: string;
					assigned_by?: string;
					class_id?: string | null;
					id?: string;
					riddle_id?: string;
					student_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'riddle_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'riddle_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'riddle_assignments_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_assignments_riddle_id_fkey';
						columns: ['riddle_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_stats';
						referencedColumns: ['riddle_id'];
					},
					{
						foreignKeyName: 'riddle_assignments_riddle_id_fkey';
						columns: ['riddle_id'];
						isOneToOne: false;
						referencedRelation: 'riddles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'riddle_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			riddle_attempts: {
				Row: {
					attempt_number: number;
					created_at: string;
					gidouilles_awarded: number;
					id: string;
					is_correct: boolean | null;
					riddle_id: string;
					student_id: string;
					submitted_answer: Json;
					validated_at: string | null;
					validated_by: string | null;
				};
				Insert: {
					attempt_number: number;
					created_at?: string;
					gidouilles_awarded?: number;
					id?: string;
					is_correct?: boolean | null;
					riddle_id: string;
					student_id: string;
					submitted_answer: Json;
					validated_at?: string | null;
					validated_by?: string | null;
				};
				Update: {
					attempt_number?: number;
					created_at?: string;
					gidouilles_awarded?: number;
					id?: string;
					is_correct?: boolean | null;
					riddle_id?: string;
					student_id?: string;
					submitted_answer?: Json;
					validated_at?: string | null;
					validated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'riddle_attempts_riddle_id_fkey';
						columns: ['riddle_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_stats';
						referencedColumns: ['riddle_id'];
					},
					{
						foreignKeyName: 'riddle_attempts_riddle_id_fkey';
						columns: ['riddle_id'];
						isOneToOne: false;
						referencedRelation: 'riddles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_attempts_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'riddle_attempts_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_attempts_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'riddle_attempts_validated_by_fkey';
						columns: ['validated_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'riddle_attempts_validated_by_fkey';
						columns: ['validated_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_attempts_validated_by_fkey';
						columns: ['validated_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			riddle_of_the_day: {
				Row: {
					auto_selected: boolean;
					created_at: string;
					date: string;
					id: string;
					riddle_id: string;
					selected_by: string | null;
				};
				Insert: {
					auto_selected?: boolean;
					created_at?: string;
					date: string;
					id?: string;
					riddle_id: string;
					selected_by?: string | null;
				};
				Update: {
					auto_selected?: boolean;
					created_at?: string;
					date?: string;
					id?: string;
					riddle_id?: string;
					selected_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'riddle_of_the_day_riddle_id_fkey';
						columns: ['riddle_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_stats';
						referencedColumns: ['riddle_id'];
					},
					{
						foreignKeyName: 'riddle_of_the_day_riddle_id_fkey';
						columns: ['riddle_id'];
						isOneToOne: false;
						referencedRelation: 'riddles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_of_the_day_selected_by_fkey';
						columns: ['selected_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'riddle_of_the_day_selected_by_fkey';
						columns: ['selected_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_of_the_day_selected_by_fkey';
						columns: ['selected_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			riddles: {
				Row: {
					answer: Json | null;
					correction: string;
					created_at: string;
					created_by: string;
					difficulty: number;
					genre: string | null;
					id: string;
					image_url: string | null;
					riddle_number: number;
					statement: string;
					status: string;
					title: string;
					updated_at: string;
				};
				Insert: {
					answer?: Json | null;
					correction: string;
					created_at?: string;
					created_by: string;
					difficulty: number;
					genre?: string | null;
					id?: string;
					image_url?: string | null;
					riddle_number?: number;
					statement: string;
					status?: string;
					title: string;
					updated_at?: string;
				};
				Update: {
					answer?: Json | null;
					correction?: string;
					created_at?: string;
					created_by?: string;
					difficulty?: number;
					genre?: string | null;
					id?: string;
					image_url?: string | null;
					riddle_number?: number;
					statement?: string;
					status?: string;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'riddles_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'riddles_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddles_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			school_holidays: {
				Row: {
					created_at: string | null;
					end_date: string;
					id: string;
					name: string;
					school_year_id: string;
					start_date: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					end_date: string;
					id?: string;
					name: string;
					school_year_id: string;
					start_date: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					end_date?: string;
					id?: string;
					name?: string;
					school_year_id?: string;
					start_date?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'school_holidays_school_year_id_fkey';
						columns: ['school_year_id'];
						isOneToOne: false;
						referencedRelation: 'school_years';
						referencedColumns: ['id'];
					}
				];
			};
			school_years: {
				Row: {
					created_at: string | null;
					end_date: string;
					id: string;
					is_active: boolean | null;
					metadata: Json | null;
					name: string;
					school_id: string;
					start_date: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					end_date: string;
					id?: string;
					is_active?: boolean | null;
					metadata?: Json | null;
					name: string;
					school_id: string;
					start_date: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					end_date?: string;
					id?: string;
					is_active?: boolean | null;
					metadata?: Json | null;
					name?: string;
					school_id?: string;
					start_date?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'school_years_school_id_fkey';
						columns: ['school_id'];
						isOneToOne: false;
						referencedRelation: 'schools';
						referencedColumns: ['id'];
					}
				];
			};
			schools: {
				Row: {
					address: string | null;
					city: string;
					country: string;
					created_at: string | null;
					id: string;
					is_active: boolean | null;
					logo_url: string | null;
					name: string;
					timetable: Json | null;
					updated_at: string | null;
				};
				Insert: {
					address?: string | null;
					city: string;
					country: string;
					created_at?: string | null;
					id?: string;
					is_active?: boolean | null;
					logo_url?: string | null;
					name: string;
					timetable?: Json | null;
					updated_at?: string | null;
				};
				Update: {
					address?: string | null;
					city?: string;
					country?: string;
					created_at?: string | null;
					id?: string;
					is_active?: boolean | null;
					logo_url?: string | null;
					name?: string;
					timetable?: Json | null;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			server_cache: {
				Row: {
					created_at: string | null;
					expires_at: string;
					key: string;
					value: Json;
				};
				Insert: {
					created_at?: string | null;
					expires_at: string;
					key: string;
					value: Json;
				};
				Update: {
					created_at?: string | null;
					expires_at?: string;
					key?: string;
					value?: Json;
				};
				Relationships: [];
			};
			srs_card_stats: {
				Row: {
					card_reference_id: string;
					card_reference_type: string;
					created_at: string;
					difficulty: number;
					id: string;
					last_review: string | null;
					next_review: string;
					review_history: Json;
					stability: number;
					state: string;
					total_reviews: number;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					card_reference_id: string;
					card_reference_type: string;
					created_at?: string;
					difficulty?: number;
					id?: string;
					last_review?: string | null;
					next_review?: string;
					review_history?: Json;
					stability?: number;
					state?: string;
					total_reviews?: number;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					card_reference_id?: string;
					card_reference_type?: string;
					created_at?: string;
					difficulty?: number;
					id?: string;
					last_review?: string | null;
					next_review?: string;
					review_history?: Json;
					stability?: number;
					state?: string;
					total_reviews?: number;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'srs_card_stats_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'srs_card_stats_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'srs_card_stats_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			srs_cards: {
				Row: {
					back_content: Json | null;
					card_type: string;
					created_at: string;
					deck_id: string;
					front_content: Json | null;
					id: string;
					template_id: string | null;
					updated_at: string;
				};
				Insert: {
					back_content?: Json | null;
					card_type: string;
					created_at?: string;
					deck_id: string;
					front_content?: Json | null;
					id?: string;
					template_id?: string | null;
					updated_at?: string;
				};
				Update: {
					back_content?: Json | null;
					card_type?: string;
					created_at?: string;
					deck_id?: string;
					front_content?: Json | null;
					id?: string;
					template_id?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'srs_cards_deck_id_fkey';
						columns: ['deck_id'];
						isOneToOne: false;
						referencedRelation: 'deck_stats_view';
						referencedColumns: ['deck_id'];
					},
					{
						foreignKeyName: 'srs_cards_deck_id_fkey';
						columns: ['deck_id'];
						isOneToOne: false;
						referencedRelation: 'srs_decks';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'srs_cards_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'question_templates';
						referencedColumns: ['id'];
					}
				];
			};
			srs_deck_assignments: {
				Row: {
					assigned_at: string;
					assigned_by: string;
					assigned_to: string;
					assignment_type: string;
					id: string;
					source_deck_id: string;
				};
				Insert: {
					assigned_at?: string;
					assigned_by: string;
					assigned_to: string;
					assignment_type: string;
					id?: string;
					source_deck_id: string;
				};
				Update: {
					assigned_at?: string;
					assigned_by?: string;
					assigned_to?: string;
					assignment_type?: string;
					id?: string;
					source_deck_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'srs_deck_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'srs_deck_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'srs_deck_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'srs_deck_assignments_source_deck_id_fkey';
						columns: ['source_deck_id'];
						isOneToOne: false;
						referencedRelation: 'deck_stats_view';
						referencedColumns: ['deck_id'];
					},
					{
						foreignKeyName: 'srs_deck_assignments_source_deck_id_fkey';
						columns: ['source_deck_id'];
						isOneToOne: false;
						referencedRelation: 'srs_decks';
						referencedColumns: ['id'];
					}
				];
			};
			srs_decks: {
				Row: {
					config: Json;
					created_at: string;
					deck_type: string;
					description: string | null;
					id: string;
					is_assigned: boolean;
					name: string;
					owner_id: string;
					updated_at: string;
				};
				Insert: {
					config?: Json;
					created_at?: string;
					deck_type: string;
					description?: string | null;
					id?: string;
					is_assigned?: boolean;
					name: string;
					owner_id: string;
					updated_at?: string;
				};
				Update: {
					config?: Json;
					created_at?: string;
					deck_type?: string;
					description?: string | null;
					id?: string;
					is_assigned?: boolean;
					name?: string;
					owner_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'srs_decks_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'srs_decks_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'srs_decks_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			srs_review_sessions: {
				Row: {
					average_time: number;
					cards_reviewed: number;
					completed_at: string | null;
					correct_count: number;
					deck_id: string;
					id: string;
					started_at: string;
					total_time: number;
					user_id: string;
				};
				Insert: {
					average_time?: number;
					cards_reviewed?: number;
					completed_at?: string | null;
					correct_count?: number;
					deck_id: string;
					id?: string;
					started_at?: string;
					total_time?: number;
					user_id: string;
				};
				Update: {
					average_time?: number;
					cards_reviewed?: number;
					completed_at?: string | null;
					correct_count?: number;
					deck_id?: string;
					id?: string;
					started_at?: string;
					total_time?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'srs_review_sessions_deck_id_fkey';
						columns: ['deck_id'];
						isOneToOne: false;
						referencedRelation: 'deck_stats_view';
						referencedColumns: ['deck_id'];
					},
					{
						foreignKeyName: 'srs_review_sessions_deck_id_fkey';
						columns: ['deck_id'];
						isOneToOne: false;
						referencedRelation: 'srs_decks';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'srs_review_sessions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'srs_review_sessions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'srs_review_sessions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			student_warnings: {
				Row: {
					academic_period_id: string;
					class_id: string;
					created_at: string | null;
					created_by: string;
					id: string;
					student_id: string;
					updated_at: string | null;
					warning_type: string;
				};
				Insert: {
					academic_period_id: string;
					class_id: string;
					created_at?: string | null;
					created_by: string;
					id?: string;
					student_id: string;
					updated_at?: string | null;
					warning_type: string;
				};
				Update: {
					academic_period_id?: string;
					class_id?: string;
					created_at?: string | null;
					created_by?: string;
					id?: string;
					student_id?: string;
					updated_at?: string | null;
					warning_type?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'student_warnings_academic_period_id_fkey';
						columns: ['academic_period_id'];
						isOneToOne: false;
						referencedRelation: 'academic_periods';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'student_warnings_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'student_warnings_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'student_warnings_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'student_warnings_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'student_warnings_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'student_warnings_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'student_warnings_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			teacher_vip_card_overrides: {
				Row: {
					card_id: string;
					created_at: string;
					id: string;
					is_enabled: boolean;
					teacher_id: string;
					updated_at: string;
				};
				Insert: {
					card_id: string;
					created_at?: string;
					id?: string;
					is_enabled: boolean;
					teacher_id: string;
					updated_at?: string;
				};
				Update: {
					card_id?: string;
					created_at?: string;
					id?: string;
					is_enabled?: boolean;
					teacher_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'teacher_vip_card_overrides_card_id_fkey';
						columns: ['card_id'];
						isOneToOne: false;
						referencedRelation: 'vip_card_templates';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'teacher_vip_card_overrides_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'teacher_vip_card_overrides_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'teacher_vip_card_overrides_teacher_id_fkey';
						columns: ['teacher_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			template_audit_log: {
				Row: {
					action: string;
					changes: Json | null;
					id: string;
					ip_address: unknown;
					metadata: Json | null;
					performed_at: string;
					performed_by: string;
					template_id: string | null;
					user_agent: string | null;
				};
				Insert: {
					action: string;
					changes?: Json | null;
					id?: string;
					ip_address?: unknown;
					metadata?: Json | null;
					performed_at?: string;
					performed_by: string;
					template_id?: string | null;
					user_agent?: string | null;
				};
				Update: {
					action?: string;
					changes?: Json | null;
					id?: string;
					ip_address?: unknown;
					metadata?: Json | null;
					performed_at?: string;
					performed_by?: string;
					template_id?: string | null;
					user_agent?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'template_audit_log_performed_by_fkey';
						columns: ['performed_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'template_audit_log_performed_by_fkey';
						columns: ['performed_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'template_audit_log_performed_by_fkey';
						columns: ['performed_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'template_audit_log_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'message_templates';
						referencedColumns: ['id'];
					}
				];
			};
			template_usage_stats: {
				Row: {
					class_id: string | null;
					completed: boolean | null;
					id: string;
					template_id: string;
					time_to_complete: number | null;
					used_at: string;
					user_id: string;
				};
				Insert: {
					class_id?: string | null;
					completed?: boolean | null;
					id?: string;
					template_id: string;
					time_to_complete?: number | null;
					used_at?: string;
					user_id: string;
				};
				Update: {
					class_id?: string | null;
					completed?: boolean | null;
					id?: string;
					template_id?: string;
					time_to_complete?: number | null;
					used_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'template_usage_stats_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'template_usage_stats_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'message_templates';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'template_usage_stats_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'template_usage_stats_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'template_usage_stats_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			test_answers: {
				Row: {
					attempts: number | null;
					created_at: string | null;
					id: string;
					is_correct: boolean | null;
					question_instance: Json;
					template_id: string | null;
					test_session_id: string;
					time_spent: number | null;
					user_answer: Json | null;
				};
				Insert: {
					attempts?: number | null;
					created_at?: string | null;
					id?: string;
					is_correct?: boolean | null;
					question_instance: Json;
					template_id?: string | null;
					test_session_id: string;
					time_spent?: number | null;
					user_answer?: Json | null;
				};
				Update: {
					attempts?: number | null;
					created_at?: string | null;
					id?: string;
					is_correct?: boolean | null;
					question_instance?: Json;
					template_id?: string | null;
					test_session_id?: string;
					time_spent?: number | null;
					user_answer?: Json | null;
				};
				Relationships: [
					{
						foreignKeyName: 'test_answers_test_session_id_fkey';
						columns: ['test_session_id'];
						isOneToOne: false;
						referencedRelation: 'test_sessions';
						referencedColumns: ['id'];
					}
				];
			};
			test_sessions: {
				Row: {
					assignment_id: string | null;
					categories: Json;
					completed_at: string | null;
					created_at: string | null;
					id: string;
					mode: string;
					score: number | null;
					time_limit: number | null;
					time_spent: number | null;
					total_questions: number;
					user_id: string | null;
				};
				Insert: {
					assignment_id?: string | null;
					categories: Json;
					completed_at?: string | null;
					created_at?: string | null;
					id?: string;
					mode: string;
					score?: number | null;
					time_limit?: number | null;
					time_spent?: number | null;
					total_questions: number;
					user_id?: string | null;
				};
				Update: {
					assignment_id?: string | null;
					categories?: Json;
					completed_at?: string | null;
					created_at?: string | null;
					id?: string;
					mode?: string;
					score?: number | null;
					time_limit?: number | null;
					time_spent?: number | null;
					total_questions?: number;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'test_sessions_assignment_id_fkey';
						columns: ['assignment_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_assignments';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'test_sessions_assignment_id_fkey';
						columns: ['assignment_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['assignment_id'];
					}
				];
			};
			user_favorite_templates: {
				Row: {
					created_at: string;
					template_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					template_id: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					template_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'user_favorite_templates_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'message_templates';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'user_favorite_templates_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'user_favorite_templates_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'user_favorite_templates_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			user_folders: {
				Row: {
					color: string | null;
					created_at: string;
					icon: string | null;
					id: string;
					message_count: number | null;
					name: string;
					sort_order: number | null;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					color?: string | null;
					created_at?: string;
					icon?: string | null;
					id?: string;
					message_count?: number | null;
					name: string;
					sort_order?: number | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					color?: string | null;
					created_at?: string;
					icon?: string | null;
					id?: string;
					message_count?: number | null;
					name?: string;
					sort_order?: number | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'user_folders_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'user_folders_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'user_folders_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			user_preferences: {
				Row: {
					created_at: string;
					test_mode_enabled: boolean;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					test_mode_enabled?: boolean;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					test_mode_enabled?: boolean;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			user_presence: {
				Row: {
					last_heartbeat: string;
					status: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					last_heartbeat?: string;
					status?: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					last_heartbeat?: string;
					status?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'user_presence_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'user_presence_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'user_presence_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			user_restrictions: {
				Row: {
					created_at: string;
					expires_at: string | null;
					id: string;
					reason: string;
					restricted_by: string;
					restriction_type: string;
					scope_id: string | null;
					scope_type: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					expires_at?: string | null;
					id?: string;
					reason: string;
					restricted_by: string;
					restriction_type: string;
					scope_id?: string | null;
					scope_type: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					expires_at?: string | null;
					id?: string;
					reason?: string;
					restricted_by?: string;
					restriction_type?: string;
					scope_id?: string | null;
					scope_type?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'user_restrictions_restricted_by_fkey';
						columns: ['restricted_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'user_restrictions_restricted_by_fkey';
						columns: ['restricted_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'user_restrictions_restricted_by_fkey';
						columns: ['restricted_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'user_restrictions_scope_id_fkey';
						columns: ['scope_id'];
						isOneToOne: false;
						referencedRelation: 'conversations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'user_restrictions_scope_id_fkey';
						columns: ['scope_id'];
						isOneToOne: false;
						referencedRelation: 'user_conversations_view';
						referencedColumns: ['conversation_id'];
					},
					{
						foreignKeyName: 'user_restrictions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'user_restrictions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'user_restrictions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			vip_card_config: {
				Row: {
					common_probability: number;
					config_name: string;
					created_at: string;
					description: string | null;
					epic_probability: number;
					id: string;
					is_active: boolean;
					legendary_probability: number;
					rare_probability: number;
					updated_at: string;
					valid_from: string | null;
					valid_until: string | null;
				};
				Insert: {
					common_probability: number;
					config_name: string;
					created_at?: string;
					description?: string | null;
					epic_probability: number;
					id?: string;
					is_active?: boolean;
					legendary_probability: number;
					rare_probability: number;
					updated_at?: string;
					valid_from?: string | null;
					valid_until?: string | null;
				};
				Update: {
					common_probability?: number;
					config_name?: string;
					created_at?: string;
					description?: string | null;
					epic_probability?: number;
					id?: string;
					is_active?: boolean;
					legendary_probability?: number;
					rare_probability?: number;
					updated_at?: string;
					valid_from?: string | null;
					valid_until?: string | null;
				};
				Relationships: [];
			};
			vip_card_templates: {
				Row: {
					action: Json | null;
					category: string | null;
					created_at: string;
					description: string;
					id: string;
					image_path: string;
					is_enabled: boolean;
					name: string;
					rarity: string;
					sort_order: number | null;
					updated_at: string;
				};
				Insert: {
					action?: Json | null;
					category?: string | null;
					created_at?: string;
					description: string;
					id: string;
					image_path: string;
					is_enabled?: boolean;
					name: string;
					rarity: string;
					sort_order?: number | null;
					updated_at?: string;
				};
				Update: {
					action?: Json | null;
					category?: string | null;
					created_at?: string;
					description?: string;
					id?: string;
					image_path?: string;
					is_enabled?: boolean;
					name?: string;
					rarity?: string;
					sort_order?: number | null;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			admin_content_stats: {
				Row: {
					assignments_24h: number | null;
					completions_24h: number | null;
					total_assessments: number | null;
					total_exercises: number | null;
					total_riddles: number | null;
					total_srs_decks: number | null;
				};
				Relationships: [];
			};
			admin_error_stats_24h: {
				Row: {
					critical_errors_1h: number | null;
					critical_errors_24h: number | null;
					error_level_24h: number | null;
					total_errors_1h: number | null;
					total_errors_24h: number | null;
					unresolved_errors: number | null;
					warning_level_24h: number | null;
				};
				Relationships: [];
			};
			admin_job_failures: {
				Row: {
					error_messages: string[] | null;
					failure_count: number | null;
					job_name: string | null;
					last_failure: string | null;
				};
				Relationships: [];
			};
			admin_job_status: {
				Row: {
					completed_at: string | null;
					error_message: string | null;
					execution_time_ms: number | null;
					job_name: string | null;
					metadata: Json | null;
					started_at: string | null;
					status: string | null;
				};
				Relationships: [];
			};
			admin_online_users: {
				Row: {
					online_users: number | null;
					online_users_1m: number | null;
					online_users_5m: number | null;
				};
				Relationships: [];
			};
			admin_user_activity: {
				Row: {
					active_users_7d: number | null;
					new_users_24h: number | null;
					new_users_30d: number | null;
					new_users_7d: number | null;
					total_admins: number | null;
					total_students: number | null;
					total_teachers: number | null;
					total_users: number | null;
				};
				Relationships: [];
			};
			assessment_results: {
				Row: {
					assessment_grade: string | null;
					assessment_id: string | null;
					assessment_title: string | null;
					assignment_id: string | null;
					attempts_count: number | null;
					best_score: number | null;
					class_id: string | null;
					class_name: string | null;
					last_attempt_at: string | null;
					status: string | null;
					student_firstname: string | null;
					student_id: string | null;
					student_lastname: string | null;
					student_user_id: string | null;
					total_questions: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'assessment_assignments_assessment_id_fkey';
						columns: ['assessment_id'];
						isOneToOne: false;
						referencedRelation: 'assessments';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessment_assignments_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessment_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'assessment_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'assessment_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			assigned_exercises_with_details: {
				Row: {
					assigned_at: string | null;
					assigned_by: string | null;
					assigned_by_name: string | null;
					assigned_by_role: Database['public']['Enums']['user_role'] | null;
					assigned_to_name: string | null;
					assigned_to_type: string | null;
					class_id: string | null;
					class_name: string | null;
					difficulty: number | null;
					distribution_mode: string | null;
					exercise_creator_id: string | null;
					exercise_id: string | null;
					exercise_is_public: boolean | null;
					exercise_title: string | null;
					grade_levels: string[] | null;
					id: string | null;
					is_active: boolean | null;
					notes: string | null;
					optional_deadline: string | null;
					solution_md: string | null;
					statement_md: string | null;
					student_email: string | null;
					student_id: string | null;
					tags: string[] | null;
					variables: Json | null;
				};
				Relationships: [
					{
						foreignKeyName: 'exercise_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercise_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_assignments_assigned_by_fkey';
						columns: ['assigned_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'exercise_assignments_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_assignments_exercise_id_fkey';
						columns: ['exercise_id'];
						isOneToOne: false;
						referencedRelation: 'exercises';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercise_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercise_assignments_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'exercises_created_by_fkey';
						columns: ['exercise_creator_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'exercises_created_by_fkey';
						columns: ['exercise_creator_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'exercises_created_by_fkey';
						columns: ['exercise_creator_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			deck_stats_view: {
				Row: {
					config: Json | null;
					created_at: string | null;
					deck_id: string | null;
					deck_type: string | null;
					description: string | null;
					due_count: number | null;
					is_assigned: boolean | null;
					learning_count: number | null;
					name: string | null;
					new_count: number | null;
					owner_id: string | null;
					review_count: number | null;
					total_cards: number | null;
					updated_at: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'srs_decks_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'srs_decks_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'srs_decks_owner_id_fkey';
						columns: ['owner_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			riddle_progress: {
				Row: {
					avatar_url: string | null;
					firstname: string | null;
					last_success_at: string | null;
					lastname: string | null;
					rank: number | null;
					riddles_completed: number | null;
					riddles_gidouilles: number | null;
					student_id: string | null;
					total_attempts: number | null;
				};
				Relationships: [];
			};
			riddle_stats: {
				Row: {
					avg_attempts_to_success: number | null;
					created_by: string | null;
					difficulty: number | null;
					first_attempts: number | null;
					genre: string | null;
					pending_validations: number | null;
					riddle_id: string | null;
					riddle_number: number | null;
					second_attempts: number | null;
					success_rate_percent: number | null;
					successful_attempts: number | null;
					third_plus_attempts: number | null;
					title: string | null;
					total_attempts: number | null;
					total_gidouilles_awarded: number | null;
					unique_students: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'riddles_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'riddles_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddles_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			riddle_student_history: {
				Row: {
					difficulty: number | null;
					ever_succeeded: boolean | null;
					first_attempt_number: number | null;
					first_success_at: string | null;
					genre: string | null;
					last_attempt_at: string | null;
					latest_attempt_number: number | null;
					max_gidouilles_earned: number | null;
					riddle_id: string | null;
					riddle_number: number | null;
					riddle_title: string | null;
					student_id: string | null;
					total_attempts: number | null;
					total_gidouilles_earned: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'riddle_attempts_riddle_id_fkey';
						columns: ['riddle_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_stats';
						referencedColumns: ['riddle_id'];
					},
					{
						foreignKeyName: 'riddle_attempts_riddle_id_fkey';
						columns: ['riddle_id'];
						isOneToOne: false;
						referencedRelation: 'riddles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_attempts_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'riddle_attempts_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'riddle_attempts_student_id_fkey';
						columns: ['student_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
			user_conversations_view: {
				Row: {
					class_id: string | null;
					conversation_id: string | null;
					created_by: string | null;
					is_archived: boolean | null;
					is_group: boolean | null;
					is_muted: boolean | null;
					last_message_at: string | null;
					last_message_preview: string | null;
					last_read_at: string | null;
					name: string | null;
					other_user_avatar_url: string | null;
					other_user_firstname: string | null;
					other_user_id: string | null;
					other_user_lastname: string | null;
					participant_count: number | null;
					unread_count: number | null;
					updated_at: string | null;
					user_id: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'conversation_participants_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'conversation_participants_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'conversation_participants_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					},
					{
						foreignKeyName: 'conversations_class_id_fkey';
						columns: ['class_id'];
						isOneToOne: false;
						referencedRelation: 'classes';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'conversations_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'assessment_results';
						referencedColumns: ['student_user_id'];
					},
					{
						foreignKeyName: 'conversations_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'conversations_created_by_fkey';
						columns: ['created_by'];
						isOneToOne: false;
						referencedRelation: 'riddle_progress';
						referencedColumns: ['student_id'];
					}
				];
			};
		};
		Functions: {
			add_student_gidouilles: {
				Args: { p_amount: number; p_student_id: string };
				Returns: number;
			};
			award_random_vip_card: { Args: { p_student_id: string }; Returns: Json };
			award_vip_card_no_cost: {
				Args: { p_card_id?: string; p_student_id: string };
				Returns: string;
			};
			award_vip_cards_with_filters: {
				Args: { p_count: number; p_filters?: Json; p_student_id: string };
				Returns: Json;
			};
			calculate_riddle_gidouilles: {
				Args: { p_attempt_number: number; p_difficulty: number };
				Returns: number;
			};
			can_moderate_message: {
				Args: { message_uuid: string; moderator_uuid: string };
				Returns: boolean;
			};
			can_view_student_profile: {
				Args: { student_profile_id: string };
				Returns: boolean;
			};
			check_profanity_simple: { Args: { p_text: string }; Returns: boolean };
			cleanup_expired_cache: {
				Args: never;
				Returns: {
					deleted_count: number;
				}[];
			};
			cleanup_expired_rate_limits: { Args: never; Returns: undefined };
			cleanup_old_errors: { Args: { p_days_old?: number }; Returns: number };
			cleanup_old_job_runs: {
				Args: never;
				Returns: {
					deleted_count: number;
				}[];
			};
			cleanup_stale_presence: { Args: never; Returns: undefined };
			complete_job_run: {
				Args: {
					p_error_message?: string;
					p_metadata?: Json;
					p_run_id: string;
					p_status: string;
				};
				Returns: undefined;
			};
			create_1on1_chat: {
				Args: { p_user1_id: string; p_user2_id: string };
				Returns: string;
			};
			delete_all_resolved_errors: { Args: never; Returns: number };
			delete_attachment: { Args: { p_attachment_id: string }; Returns: string };
			draw_multiple_vip_cards: {
				Args: {
					p_count: number;
					p_gidouilles_cost?: number;
					p_payment_method: string;
					p_student_id: string;
					p_vip_card_instance_id?: string;
				};
				Returns: Json;
			};
			duplicate_template: {
				Args: { p_new_title?: string; p_template_id: string; p_user_id: string };
				Returns: string;
			};
			exercises_search_vector: {
				Args: {
					solution_md: string;
					statement_md: string;
					tags: string[];
					title: string;
				};
				Returns: unknown;
			};
			extract_plain_text_from_tiptap: {
				Args: { p_content: Json };
				Returns: string;
			};
			generate_error_signature: {
				Args: {
					p_error_type: string;
					p_file_path: string;
					p_line_number: number;
					p_message: string;
				};
				Returns: string;
			};
			generate_join_code: { Args: never; Returns: string };
			get_allowed_recipients: {
				Args: { p_user_id: string };
				Returns: {
					avatar_url: string;
					full_name: string;
					relationship: string;
					role: string;
					user_id: string;
				}[];
			};
			get_assignment_completion_stats: {
				Args: { p_assignment_id: string };
				Returns: {
					avg_views_per_student: number;
					completion_rate: number;
					students_completed: number;
					students_viewed: number;
					total_target_students: number;
					total_views: number;
				}[];
			};
			get_available_cards_for_student: {
				Args: { p_student_id: string };
				Returns: {
					blocked_by_teachers: string[];
					card_id: string;
					card_name: string;
					is_globally_enabled: boolean;
					rarity: string;
				}[];
			};
			get_conversation_participants: {
				Args: { p_conversation_id: string };
				Returns: {
					avatar_url: string;
					firstname: string;
					joined_at: string;
					last_read_at: string;
					lastname: string;
					user_id: string;
				}[];
			};
			get_database_stats: { Args: never; Returns: Json };
			get_deck_stats: {
				Args: { p_deck_id: string; p_user_id: string };
				Returns: {
					due_count: number;
					learning_count: number;
					new_count: number;
					review_count: number;
					total_cards: number;
				}[];
			};
			get_due_cards_for_deck: {
				Args: { p_deck_id: string; p_user_id: string };
				Returns: {
					card_id: string;
					card_type: string;
					difficulty: number;
					next_review: string;
					stability: number;
					state: string;
					template_id: string;
				}[];
			};
			get_error_stats: {
				Args: { p_hours?: number };
				Returns: {
					critical_errors: number;
					errors_last_hour: number;
					most_common_error_type: string;
					total_errors: number;
					unique_errors: number;
					unresolved_errors: number;
				}[];
			};
			get_exercise_completion_stats: {
				Args: { p_exercise_id: string };
				Returns: {
					average_view_count: number;
					completed_count: number;
					completion_percentage: number;
					in_progress_count: number;
					not_started_count: number;
					total_assignments: number;
					total_students: number;
					total_viewed: number;
				}[];
			};
			get_friend_ids: {
				Args: { p_user_id: string };
				Returns: {
					friend_id: string;
				}[];
			};
			get_message_attachments: {
				Args: { p_message_id: string };
				Returns: {
					created_at: string;
					file_name: string;
					file_size: number;
					file_type: string;
					id: string;
					public_url: string;
					uploaded_by: string;
					uploader_firstname: string;
					uploader_lastname: string;
				}[];
			};
			get_message_details: {
				Args: { p_message_id: string; p_user_id: string };
				Returns: {
					attachments: Json;
					content: Json;
					edited_at: string;
					is_group_message: boolean;
					is_starred: boolean;
					message_id: string;
					parent_message_id: string;
					plain_text: string;
					read_at: string;
					recipient_count: number;
					recipients: Json;
					sender_avatar_url: string;
					sender_id: string;
					sender_name: string;
					sender_role: string;
					sent_at: string;
					status: string;
					subject: string;
					thread_root_id: string;
				}[];
			};
			get_message_reaction_counts: {
				Args: { p_message_id: string };
				Returns: {
					count: number;
					emoji: string;
					user_reacted: boolean;
				}[];
			};
			get_message_thread: {
				Args: { p_thread_root_id: string; p_user_id: string };
				Returns: {
					content: Json;
					edited_at: string;
					level: number;
					message_id: string;
					parent_message_id: string;
					sender_avatar_url: string;
					sender_id: string;
					sender_name: string;
					sent_at: string;
					subject: string;
				}[];
			};
			get_messages_paginated: {
				Args: {
					p_before_id?: string;
					p_before_timestamp?: string;
					p_conversation_id: string;
					p_limit?: number;
				};
				Returns: {
					content: Json;
					conversation_id: string;
					created_at: string;
					edited_at: string;
					id: string;
					is_flagged: boolean;
					plain_text: string;
					sender_avatar_url: string;
					sender_firstname: string;
					sender_id: string;
					sender_lastname: string;
				}[];
			};
			get_next_riddle_attempt_number: {
				Args: { p_riddle_id: string; p_student_id: string };
				Returns: number;
			};
			get_pending_reports_count: { Args: never; Returns: number };
			get_private_messages_unread_count: {
				Args: { p_user_id: string };
				Returns: number;
			};
			get_reaction_users: {
				Args: { p_emoji: string; p_message_id: string };
				Returns: {
					avatar_url: string;
					created_at: string;
					firstname: string;
					lastname: string;
					user_id: string;
				}[];
			};
			get_reports_for_moderation: {
				Args: { p_limit?: number; p_offset?: number; p_status?: string };
				Returns: {
					conversation_id: string;
					conversation_name: string;
					created_at: string;
					details: string;
					message_content: Json;
					message_created_at: string;
					message_id: string;
					message_plain_text: string;
					reason: string;
					report_id: string;
					reported_by: string;
					reporter_firstname: string;
					reporter_lastname: string;
					review_notes: string;
					reviewed_at: string;
					reviewed_by: string;
					reviewer_firstname: string;
					reviewer_lastname: string;
					sender_avatar_url: string;
					sender_firstname: string;
					sender_id: string;
					sender_lastname: string;
					status: string;
				}[];
			};
			get_riddle_of_the_day: { Args: { p_date?: string }; Returns: string };
			get_student_exercises: {
				Args: { p_student_id: string };
				Returns: {
					assigned_at: string;
					assigned_by_name: string;
					assignment_id: string;
					assignment_type: string;
					completed_at: string;
					difficulty: string;
					distribution_mode: string;
					exercise_id: string;
					exercise_title: string;
					grade_levels: string[];
					last_viewed_at: string;
					notes: string;
					optional_deadline: string;
					solution_md: string;
					statement_md: string;
					tags: string[];
					variables: Json;
					view_count: number;
				}[];
			};
			get_student_teachers: {
				Args: { p_student_id: string };
				Returns: {
					class_id: string;
					class_name: string;
					teacher_id: string;
					teacher_name: string;
				}[];
			};
			get_students_in_class: {
				Args: { class_uuid: string };
				Returns: {
					student_id: string;
				}[];
			};
			get_teacher_assignment_stats: {
				Args: { p_teacher_id: string };
				Returns: {
					active_assignments: number;
					class_assignments: number;
					public_assignments: number;
					student_assignments: number;
					total_assignments: number;
					total_completions: number;
					unique_students_engaged: number;
				}[];
			};
			get_teacher_classes_for_messaging: {
				Args: { p_teacher_id: string };
				Returns: {
					class_id: string;
					class_name: string;
					student_count: number;
				}[];
			};
			get_teacher_classes_with_data: {
				Args: { p_is_test_mode?: boolean; p_teacher_id: string };
				Returns: {
					created_at: string;
					description: string;
					id: string;
					is_active: boolean;
					join_code: string;
					name: string;
					schedules: Json;
					student_count: number;
					teacher_id: string;
					updated_at: string;
				}[];
			};
			get_teacher_classes_with_students: {
				Args: { p_is_test_mode?: boolean; p_teacher_id: string };
				Returns: {
					created_at: string;
					description: string;
					id: string;
					is_active: boolean;
					join_code: string;
					name: string;
					students: Json;
					teacher_id: string;
					updated_at: string;
				}[];
			};
			get_teacher_override_impact: {
				Args: { p_card_id: string; p_teacher_id: string };
				Returns: {
					class_count: number;
					student_count: number;
				}[];
			};
			get_teacher_overrides_summary: {
				Args: { p_teacher_id: string };
				Returns: {
					disabled_count: number;
					enabled_count: number;
					no_override_count: number;
					rarity: string;
					total_cards: number;
				}[];
			};
			get_teacher_students: {
				Args: { teacher_uuid: string };
				Returns: {
					student_id: string;
				}[];
			};
			get_template_statistics: {
				Args: { p_template_id: string };
				Returns: {
					avg_time_to_complete: number;
					completion_rate: number;
					last_used_at: string;
					total_usage: number;
					unique_users: number;
				}[];
			};
			get_templates_for_context: {
				Args: { p_class_id?: string; p_trigger_type: string };
				Returns: {
					body_template: string;
					description: string;
					id: string;
					scope: string;
					subject_template: string;
					title: string;
					trigger_type: string;
					variables: Json;
				}[];
			};
			get_unread_count: {
				Args: { p_conversation_id: string; p_user_id: string };
				Returns: number;
			};
			get_user_conversations: {
				Args: { p_user_id?: string };
				Returns: {
					class_id: string;
					conversation_id: string;
					is_group: boolean;
					is_muted: boolean;
					last_message_at: string;
					last_message_preview: string;
					name: string;
					other_user_avatar_url: string;
					other_user_firstname: string;
					other_user_id: string;
					other_user_lastname: string;
					participant_count: number;
					unread_count: number;
				}[];
			};
			get_user_frequent_templates: {
				Args: { p_limit?: number; p_user_id: string };
				Returns: {
					last_used: string;
					template_id: string;
					title: string;
					usage_count: number;
				}[];
			};
			get_user_inbox: {
				Args: {
					p_folder_id?: string;
					p_limit?: number;
					p_offset?: number;
					p_status?: string;
					p_user_id: string;
				};
				Returns: {
					attachment_count: number;
					content: Json;
					has_attachments: boolean;
					is_group_message: boolean;
					is_starred: boolean;
					message_id: string;
					plain_text: string;
					read_at: string;
					recipient_count: number;
					sender_avatar_url: string;
					sender_id: string;
					sender_name: string;
					sent_at: string;
					status: string;
					subject: string;
				}[];
			};
			get_user_moderation_history: {
				Args: { p_limit?: number; p_user_id: string };
				Returns: {
					action: string;
					created_at: string;
					id: string;
					metadata: Json;
					moderator_id: string;
					moderator_name: string;
					reason: string;
					target_id: string;
					target_type: string;
				}[];
			};
			get_user_sent_messages: {
				Args: { p_limit?: number; p_offset?: number; p_user_id: string };
				Returns: {
					content: Json;
					has_attachments: boolean;
					is_group_message: boolean;
					message_id: string;
					plain_text: string;
					recipient_count: number;
					recipients: Json;
					sent_at: string;
					subject: string;
				}[];
			};
			grant_specific_vip_card: {
				Args: { p_card_id: string; p_count?: number; p_student_id: string };
				Returns: Json;
			};
			is_admin: { Args: never; Returns: boolean };
			is_class_teacher: { Args: { p_class_id: string }; Returns: boolean };
			is_exercise_parameterized: {
				Args: { exercise_id: string };
				Returns: boolean;
			};
			is_riddle_assigned_to_student: {
				Args: { p_riddle_id: string; p_student_id: string };
				Returns: boolean;
			};
			is_riddle_of_the_day: { Args: { p_riddle_id: string }; Returns: boolean };
			is_student: { Args: never; Returns: boolean };
			is_teacher_or_admin: { Args: never; Returns: boolean };
			is_user_restricted: {
				Args: { p_conversation_id?: string; p_user_id: string };
				Returns: boolean;
			};
			link_existing_assessments_to_periods: {
				Args: { p_school_year_id: string };
				Returns: number;
			};
			log_moderation_action: {
				Args: {
					p_action: string;
					p_metadata?: Json;
					p_reason?: string;
					p_target_id: string;
					p_target_type: string;
				};
				Returns: string;
			};
			log_template_action: {
				Args: {
					p_action: string;
					p_changes?: Json;
					p_metadata?: Json;
					p_performed_by: string;
					p_template_id: string;
				};
				Returns: string;
			};
			mark_conversation_read: {
				Args: {
					p_conversation_id: string;
					p_message_id?: string;
					p_user_id: string;
				};
				Returns: undefined;
			};
			mark_message_as_read: {
				Args: { p_message_id: string; p_user_id: string };
				Returns: undefined;
			};
			move_message_to_folder: {
				Args: { p_folder_id: string; p_message_id: string; p_user_id: string };
				Returns: undefined;
			};
			promote_user_to_admin: {
				Args: { user_email: string };
				Returns: undefined;
			};
			remove_student_vip_card: {
				Args: { p_card_id: string; p_student_id: string };
				Returns: boolean;
			};
			report_message: {
				Args: { p_details?: string; p_message_id: string; p_reason: string };
				Returns: string;
			};
			resolve_error: {
				Args: { p_error_log_id: string; p_notes: string; p_resolved_by: string };
				Returns: boolean;
			};
			resolve_error_by_signature: {
				Args: {
					p_error_signature: string;
					p_notes: string;
					p_resolved_by: string;
				};
				Returns: number;
			};
			review_report: {
				Args: {
					p_delete_message?: boolean;
					p_new_status: string;
					p_report_id: string;
					p_review_notes?: string;
				};
				Returns: undefined;
			};
			search_private_messages: {
				Args: {
					p_date_from?: string;
					p_date_to?: string;
					p_has_attachments?: boolean;
					p_limit?: number;
					p_offset?: number;
					p_query: string;
					p_search_in?: string;
					p_sender_name?: string;
					p_user_id: string;
				};
				Returns: {
					has_attachments: boolean;
					is_starred: boolean;
					message_id: string;
					plain_text: string;
					rank: number;
					sender_id: string;
					sender_name: string;
					sent_at: string;
					subject: string;
				}[];
			};
			send_private_message: {
				Args: {
					p_class_id?: string;
					p_content: Json;
					p_is_group_message?: boolean;
					p_parent_message_id?: string;
					p_recipient_ids: string[];
					p_sender_id: string;
					p_subject: string;
				};
				Returns: string;
			};
			set_riddle_of_the_day: {
				Args: { p_date: string; p_riddle_id: string; p_selected_by: string };
				Returns: string;
			};
			soft_delete_message: {
				Args: { p_message_id: string };
				Returns: undefined;
			};
			start_job_run: {
				Args: { p_job_name: string; p_metadata?: Json };
				Returns: string;
			};
			student_has_exercise_access: {
				Args: { p_exercise_id: string; p_student_id: string };
				Returns: boolean;
			};
			submit_riddle_attempt: {
				Args: {
					p_is_correct?: boolean;
					p_riddle_id: string;
					p_student_id: string;
					p_submitted_answer: Json;
				};
				Returns: string;
			};
			teacher_owns_riddle: {
				Args: { p_riddle_id: string; p_teacher_id: string };
				Returns: boolean;
			};
			toggle_message_star: {
				Args: { p_message_id: string; p_user_id: string };
				Returns: boolean;
			};
			toggle_reaction: {
				Args: { p_emoji: string; p_message_id: string };
				Returns: boolean;
			};
			update_class_gidouilles: {
				Args: { p_class_id: string; p_delta: number };
				Returns: number;
			};
			update_message_status: {
				Args: { p_message_id: string; p_status: string; p_user_id: string };
				Returns: undefined;
			};
			update_student_bonus: {
				Args: { p_delta: number; p_student_id: string };
				Returns: number;
			};
			update_student_gidouilles: {
				Args: { p_delta: number; p_student_id: string };
				Returns: number;
			};
			upsert_error_occurrence: {
				Args: {
					p_error_log_id: string;
					p_error_signature: string;
					p_error_type: string;
					p_file_path: string;
					p_line_number: number;
					p_message: string;
					p_severity: string;
					p_url: string;
				};
				Returns: number;
			};
			upsert_user_presence: {
				Args: { p_status: string; p_user_id: string };
				Returns: undefined;
			};
			use_vip_card: {
				Args: { p_card_id: string; p_student_id: string };
				Returns: boolean;
			};
			validate_1on1_chat_creation: {
				Args: { p_user1_id: string; p_user2_id: string };
				Returns: boolean;
			};
			validate_attachment_upload: {
				Args: { p_file_size: number; p_message_id: string; p_user_id: string };
				Returns: boolean;
			};
			validate_class_message_recipients: {
				Args: { class_uuid: string; sender_uuid: string };
				Returns: boolean;
			};
			validate_message_recipients: {
				Args: { recipient_uuids: string[]; sender_uuid: string };
				Returns: boolean;
			};
			validate_riddle_attempt: {
				Args: {
					p_attempt_id: string;
					p_is_correct: boolean;
					p_teacher_id: string;
				};
				Returns: boolean;
			};
		};
		Enums: {
			difficulty_level: 'easy' | 'medium' | 'hard';
			exercise_type: 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank';
			user_role: 'student' | 'teacher' | 'admin';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

// ============================================================================
// Custom Type Exports
// ============================================================================
// These types provide convenient aliases and extensions to the generated
// database types above. They are used throughout the application.

// -----------------------------------------------------------------------------
// Table Type Aliases
// -----------------------------------------------------------------------------

/** Class table row type */
export type Class = Tables<'classes'>;

/** Class schedule table row type */
export type ClassSchedule = Tables<'class_schedules'>;

/** Notification table row type */
export type Notification = Tables<'notifications'>;

/** Notification read status table row type */
export type NotificationRead = Tables<'notification_reads'>;

// -----------------------------------------------------------------------------
// Enum Type Aliases
// -----------------------------------------------------------------------------

/** User role enum: 'student' | 'teacher' | 'admin' */
export type UserRole = Database['public']['Enums']['user_role'];

// -----------------------------------------------------------------------------
// String Union Types (from CHECK constraints in database)
// -----------------------------------------------------------------------------

/** Gender: 'boy' | 'girl' */
export type Gender = 'boy' | 'girl';

/** Friendship type: 'classmate' | 'mentor' */
export type FriendshipType = 'classmate' | 'mentor';

/** Notification type: 'info' | 'alert' | 'announcement' | 'reminder' */
export type NotificationType = 'info' | 'alert' | 'announcement' | 'reminder';

/** Notification priority: 'normal' | 'important' | 'urgent' */
export type NotificationPriority = 'normal' | 'important' | 'urgent';

/** Notification target type: 'all' | 'role' | 'classes' | 'users' */
export type NotificationTargetType = 'all' | 'role' | 'classes' | 'users';

/** System event types for automated notifications */
export type SystemEventType =
	| 'assignment_created'
	| 'resource_added'
	| 'reward_earned'
	| 'badge_unlocked'
	| 'maintenance_scheduled'
	| 'feature_released'
	| 'assessment_assigned'
	| 'assessment_graded';

// -----------------------------------------------------------------------------
// Composite/Derived Types
// -----------------------------------------------------------------------------

/**
 * Friendship with enriched profile and presence data
 * Used in friends store to display friend information
 */
export interface FriendshipWithProfile {
	id: string;
	user_id: string;
	friend_id: string;
	status: string; // 'pending' | 'accepted' | 'declined'
	friendship_type?: FriendshipType;
	created_at: string;
	updated_at: string;
	requester_id: string;
	addressee_id: string;
	friend_profile: {
		id: string;
		full_name: string | null;
		firstname: string | null;
		lastname: string | null;
		avatar_url: string | null;
		role: string;
	};
	presence?: {
		is_online: boolean;
		last_seen: string | null;
	};
}

/**
 * School period definition
 * Used in timetable system
 */
export interface SchoolPeriod {
	number: number;
	start_time: string; // HH:MM:SS format
	end_time: string; // HH:MM:SS format
	name?: string; // Optional display name (e.g., "Morning Break")
}

/**
 * School timetable with periods
 * Used in timetable system
 */
export interface SchoolTimetable {
	periods: SchoolPeriod[];
}

// ============================================================================
// Constants
// ============================================================================

export const Constants = {
	public: {
		Enums: {
			difficulty_level: ['easy', 'medium', 'hard'],
			exercise_type: ['multiple_choice', 'free_response', 'true_false', 'fill_blank'],
			user_role: ['student', 'teacher', 'admin']
		}
	}
} as const;
