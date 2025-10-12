export type UserRole = 'student' | 'teacher' | 'admin';

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
	gidouilles: number;
	vip_cards: Record<string, unknown>;
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
		};
	};
}
