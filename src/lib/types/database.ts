export type UserRole = 'student' | 'teacher' | 'admin';
export type Gender = 'boy' | 'girl';
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';
export type FriendshipType = 'classmate' | 'mentor';
export type PresenceStatus = 'online' | 'offline';

// Import VIP card types
import type { StudentVipCards } from './vip-card';

// School Timetable Types
export interface SchoolPeriod {
	number: number; // 1, 2, 3, etc. (sequential)
	name?: string; // Optional custom name (e.g., "Morning Break")
	start_time: string; // HH:MM:SS format
	end_time: string; // HH:MM:SS format
}

export interface SchoolTimetable {
	periods: SchoolPeriod[];
}

export interface School {
	id: string;
	name: string;
	city: string;
	country: string;
	address: string | null;
	logo_url: string | null;
	is_active: boolean;
	timetable: SchoolTimetable | null;
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

export interface Friendship {
	id: string;
	requester_id: string;
	addressee_id: string;
	status: FriendshipStatus;
	friendship_type: FriendshipType;
	created_at: string;
	updated_at: string;
}

export interface UserPresence {
	user_id: string;
	status: PresenceStatus;
	last_heartbeat: string;
	updated_at: string;
}

export interface ClassSchedule {
	id: string;
	class_id: string;
	teacher_id: string;
	day_of_week: number; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday
	start_time: string; // HH:MM:SS format from database TIME type
	end_time: string; // HH:MM:SS format from database TIME type
	period_number: number | null; // Links to school timetable period (source of truth)
	subject: string | null;
	room: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Helper type for enriched friendship data with profile info
export interface FriendshipWithProfile extends Friendship {
	friend_profile: {
		id: string;
		full_name: string | null;
		firstname: string | null;
		lastname: string | null;
		avatar_url: string | null;
		role: UserRole;
	};
	presence?: UserPresence;
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
				Insert: Omit<
					PendingStudent,
					'id' | 'is_activated' | 'activated_at' | 'created_at' | 'updated_at'
				> & {
					id?: string;
					is_activated?: boolean;
					activated_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<PendingStudent, 'id' | 'created_at' | 'updated_at'>>;
			};
			friendships: {
				Row: Friendship;
				Insert: Omit<Friendship, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<Friendship, 'id' | 'created_at' | 'updated_at'>>;
			};
			user_presence: {
				Row: UserPresence;
				Insert: Omit<UserPresence, 'updated_at'> & {
					updated_at?: string;
				};
				Update: Partial<Omit<UserPresence, 'user_id'>>;
			};
			class_schedules: {
				Row: ClassSchedule;
				Insert: Omit<ClassSchedule, 'id' | 'created_at' | 'updated_at'> & {
					id?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: Partial<Omit<ClassSchedule, 'id' | 'created_at' | 'updated_at'>>;
			};
		};
	};
}
