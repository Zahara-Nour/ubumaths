-- Migration: Enable Realtime on messages table
-- Description: Enables postgres_changes subscription for the chat system
-- The chat store uses postgres_changes to receive message updates with JOINs
-- Required for: src/lib/stores/chat.svelte.ts subscribeToConversation()

-- Enable Realtime on the messages table
-- This allows postgres_changes subscriptions to work
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Note: To verify this worked, run:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
