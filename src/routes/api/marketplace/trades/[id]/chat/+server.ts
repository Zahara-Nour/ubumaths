import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { chatMessageSchema } from '$lib/server/marketplace/validation';
import { z } from 'zod';

// ID validation schema
const idSchema = z.string().uuid("ID d'échange invalide");

/**
 * GET /api/marketplace/trades/[id]/chat
 * Get chat messages for a trade
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate trade ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const tradeId = idValidation.data;

	// Verify user is a participant
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.select('initiator_id, partner_id')
		.eq('id', tradeId)
		.single();

	if (tradeError || !trade) {
		throw error(404, 'Échange non trouvé');
	}

	if (trade.initiator_id !== userId && trade.partner_id !== userId) {
		throw error(403, "Vous n'êtes pas participant à cet échange");
	}

	// Get chat messages
	const { data: messages, error: messagesError } = await supabase
		.from('marketplace_chat_messages')
		.select(
			`
      *,
      sender:profiles!marketplace_chat_messages_sender_id_fkey(
        id,
        username,
        avatar_url
      )
    `
		)
		.eq('trade_id', tradeId)
		.order('created_at', { ascending: true });

	if (messagesError) {
		console.error('Error fetching chat messages:', messagesError);
		throw error(500, 'Erreur lors de la récupération des messages');
	}

	return json(messages || []);
};

/**
 * POST /api/marketplace/trades/[id]/chat
 * Send a chat message in a trade
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate request body
	const body = await request.json().catch(() => ({}));

	// Override trade_id from params to ensure consistency
	const messageData = { ...body, trade_id: params.id };
	const validation = chatMessageSchema.safeParse(messageData);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { trade_id, message } = validation.data;

	// Verify user is a participant and trade is active
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.select('initiator_id, partner_id, status')
		.eq('id', trade_id)
		.single();

	if (tradeError || !trade) {
		throw error(404, 'Échange non trouvé');
	}

	if (trade.initiator_id !== userId && trade.partner_id !== userId) {
		throw error(403, "Vous n'êtes pas participant à cet échange");
	}

	if (trade.status === 'cancelled') {
		throw error(403, "Impossible d'envoyer des messages dans un échange annulé");
	}

	// Create the chat message
	const { data: chatMessage, error: messageError } = await supabase
		.from('marketplace_chat_messages')
		.insert({
			trade_id: trade_id,
			sender_id: userId,
			message: message
		})
		.select(
			`
      *,
      sender:profiles!marketplace_chat_messages_sender_id_fkey(
        id,
        username,
        avatar_url
      )
    `
		)
		.single();

	if (messageError) {
		console.error('Error creating chat message:', messageError);
		throw error(500, "Erreur lors de l'envoi du message");
	}

	// In Phase 5, we'll broadcast this via Supabase Realtime
	// For now, the other user will see it when they refresh

	return json(chatMessage, { status: 201 });
};
