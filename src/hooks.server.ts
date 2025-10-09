import { handle as supabaseHandle } from '$lib/server/supabase';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = supabaseHandle;
