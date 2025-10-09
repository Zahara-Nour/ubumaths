export type UserRole = 'student' | 'teacher' | 'admin';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ExerciseType = 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank';

export interface Profile {
	id: string;
	email: string;
	full_name: string | null;
	role: UserRole;
	created_at: string;
	updated_at: string;
}

export interface Topic {
	id: string;
	name: string;
	description: string | null;
	icon: string | null;
	order_index: number;
	created_at: string;
	updated_at: string;
}

export interface Subtopic {
	id: string;
	topic_id: string;
	name: string;
	description: string | null;
	order_index: number;
	created_at: string;
	updated_at: string;
}

export interface Exercise {
	id: string;
	subtopic_id: string;
	created_by: string | null;
	title: string;
	question: string;
	type: ExerciseType;
	difficulty: DifficultyLevel;
	points: number;
	time_limit_seconds: number | null;
	hints: string[];
	explanation: string | null;
	is_published: boolean;
	created_at: string;
	updated_at: string;
}

export interface ExerciseOption {
	id: string;
	exercise_id: string;
	option_text: string;
	is_correct: boolean;
	order_index: number;
	created_at: string;
}

export interface ExerciseAnswer {
	id: string;
	exercise_id: string;
	answer_text: string;
	is_primary: boolean;
	created_at: string;
}

export interface StudentAttempt {
	id: string;
	student_id: string;
	exercise_id: string;
	submitted_answer: string;
	is_correct: boolean;
	points_earned: number;
	time_spent_seconds: number | null;
	hints_used: number;
	attempt_number: number;
	created_at: string;
}

export interface StudentProgress {
	id: string;
	student_id: string;
	subtopic_id: string;
	exercises_completed: number;
	exercises_correct: number;
	total_points: number;
	last_practiced_at: string | null;
	mastery_level: number;
	created_at: string;
	updated_at: string;
}

export interface Class {
	id: string;
	teacher_id: string;
	name: string;
	description: string | null;
	join_code: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface ClassMember {
	id: string;
	class_id: string;
	student_id: string;
	joined_at: string;
}

export interface Assignment {
	id: string;
	class_id: string;
	created_by: string | null;
	title: string;
	description: string | null;
	due_date: string | null;
	is_published: boolean;
	created_at: string;
	updated_at: string;
}

export interface AssignmentExercise {
	id: string;
	assignment_id: string;
	exercise_id: string;
	order_index: number;
	points_override: number | null;
	created_at: string;
}

export interface AssignmentSubmission {
	id: string;
	assignment_id: string;
	student_id: string;
	total_points: number;
	max_points: number;
	completion_percentage: number;
	submitted_at: string | null;
	is_complete: boolean;
	created_at: string;
	updated_at: string;
}

// Database schema type (for Supabase client)
export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: Profile;
				Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
					id: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
			};
			topics: {
				Row: Topic;
				Insert: Omit<Topic, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<Topic, 'id' | 'created_at' | 'updated_at'>>;
			};
			subtopics: {
				Row: Subtopic;
				Insert: Omit<Subtopic, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<Subtopic, 'id' | 'created_at' | 'updated_at'>>;
			};
			exercises: {
				Row: Exercise;
				Insert: Omit<Exercise, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<Exercise, 'id' | 'created_at' | 'updated_at'>>;
			};
			exercise_options: {
				Row: ExerciseOption;
				Insert: Omit<ExerciseOption, 'id' | 'created_at'> & {
					id?: string;
					created_at?: string;
				};
				Update: Partial<Omit<ExerciseOption, 'id' | 'created_at'>>;
			};
			exercise_answers: {
				Row: ExerciseAnswer;
				Insert: Omit<ExerciseAnswer, 'id' | 'created_at'> & {
					id?: string;
					created_at?: string;
				};
				Update: Partial<Omit<ExerciseAnswer, 'id' | 'created_at'>>;
			};
			student_attempts: {
				Row: StudentAttempt;
				Insert: Omit<StudentAttempt, 'id' | 'created_at'> & {
					id?: string;
					created_at?: string;
				};
				Update: Partial<Omit<StudentAttempt, 'id' | 'created_at'>>;
			};
			student_progress: {
				Row: StudentProgress;
				Insert: Omit<StudentProgress, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<StudentProgress, 'id' | 'created_at' | 'updated_at'>>;
			};
			classes: {
				Row: Class;
				Insert: Omit<Class, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<Class, 'id' | 'created_at' | 'updated_at'>>;
			};
			class_members: {
				Row: ClassMember;
				Insert: Omit<ClassMember, 'id' | 'joined_at'> & {
					id?: string;
					joined_at?: string;
				};
				Update: Partial<Omit<ClassMember, 'id' | 'joined_at'>>;
			};
			assignments: {
				Row: Assignment;
				Insert: Omit<Assignment, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<Assignment, 'id' | 'created_at' | 'updated_at'>>;
			};
			assignment_exercises: {
				Row: AssignmentExercise;
				Insert: Omit<AssignmentExercise, 'id' | 'created_at'> & {
					id?: string;
					created_at?: string;
				};
				Update: Partial<Omit<AssignmentExercise, 'id' | 'created_at'>>;
			};
			assignment_submissions: {
				Row: AssignmentSubmission;
				Insert: Omit<AssignmentSubmission, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<AssignmentSubmission, 'id' | 'created_at' | 'updated_at'>>;
			};
		};
	};
}
