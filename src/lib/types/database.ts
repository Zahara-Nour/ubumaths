export type UserRole = 'student' | 'teacher' | 'admin';
export type Gender = 'boy' | 'girl';

// Import VIP card types
import type { StudentVipCards } from './vip-card';

export interface School {
	id: string;
	name: string;
	city: string;
	country: string;
	address: string | null;
	logo_url: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface Profile {
	id: string;
	email: string;
	full_name: string | null;
	firstname: string | null;
	lastname: string | null;
	role: UserRole;
	school_id: string | null;
	avatar_url: string | null;
	class_ids: string[];
	grade: string | null;
	gender: Gender | null;
	gidouilles: number;
	vip_cards: StudentVipCards;
	created_at: string;
	updated_at: string;
}

export interface Class {
	id: string;
	teacher_id: string;
	school_id: string | null;
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

export interface PendingStudent {
	id: string;
	email: string;
	firstname: string;
	lastname: string;
	grade: string | null;
	school_id: string | null;
	gender: Gender | null;
	class_ids: string[];
	is_activated: boolean;
	activated_at: string | null;
	created_at: string;
	updated_at: string;
}

// Database schema type (for Supabase client)
export interface Database {
	public: {
		Tables: {
			schools: {
				Row: School;
				Insert: Omit<School, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<School, 'id' | 'created_at' | 'updated_at'>>;
			};
			profiles: {
				Row: Profile;
				Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
					id: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
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
			pending_students: {
				Row: PendingStudent;
				Insert: Omit<PendingStudent, 'id' | 'is_activated' | 'activated_at' | 'created_at' | 'updated_at'> & {
					id?: string;
					is_activated?: boolean;
					activated_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<PendingStudent, 'id' | 'created_at' | 'updated_at'>>;
			};
		};
	};
}
