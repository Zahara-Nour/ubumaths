# Architecture - TutorBot System

> Detailed technical architecture of the chatbot and tutoring systems.

---

## System Overview

The UbuMaths chat system consists of two integrated subsystems sharing a single API endpoint:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  TutorWidget     │  │   ChatBot        │  │   ChatWindow             │  │
│  │  TutorChat       │  │                  │  │   (Peer Chat)            │  │
│  │  (AI Tutoring)   │  │  (General AI)    │  │                          │  │
│  └────────┬─────────┘  └────────┬─────────┘  └─────────────┬────────────┘  │
│           │                     │                          │               │
│           │                     │                          ▼               │
│           │                     │                 ┌────────────────┐       │
│           │                     │                 │   chatStore    │       │
│           │                     │                 │ (Svelte store) │       │
│           │                     │                 └────────┬───────┘       │
│           │                     │                          │               │
└───────────┼─────────────────────┼──────────────────────────┼───────────────┘
            │                     │                          │
            ▼                     ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    /api/chat Endpoint                               │   │
│  │                    (+server.ts)                                     │   │
│  │                                                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ Auth Check  │ │ Zod Valid.  │ │ Rate Limit  │ │ Mode Router │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  └───────────────────────────────────────────────────────────────────┬─┘   │
│                                                                      │     │
│                              ┌───────────────────────────────────────┼─┐   │
│                              │                                       │ │   │
│                              ▼                                       ▼ │   │
│                 ┌────────────────────────┐        ┌──────────────────┐ │   │
│                 │     TUTOR MODE         │        │  REGULAR MODE    │ │   │
│                 │                        │        │                  │ │   │
│                 │ - Cheat Detection      │        │ - Pere Ubu AI    │ │   │
│                 │ - Help Selection       │        │ - Image Support  │ │   │
│                 │ - Grade Adaptation     │        │ - General Chat   │ │   │
│                 │ - RAG Search           │        │                  │ │   │
│                 │ - Effort Analysis      │        │                  │ │   │
│                 └───────────┬────────────┘        └────────┬─────────┘ │   │
│                             │                              │           │   │
│                             └──────────────┬───────────────┘           │   │
│                                            │                           │   │
│                                            ▼                           │   │
│                              ┌──────────────────────────┐              │   │
│                              │      Groq API Call       │              │   │
│                              │   (LLaMA 70B/Scout)      │              │   │
│                              └──────────────────────────┘              │   │
│                                                                        │   │
└────────────────────────────────────────────────────────────────────────┴───┘
                                                                      │
┌─────────────────────────────────────────────────────────────────────┼───────┐
│                         DATA LAYER                                  │       │
├─────────────────────────────────────────────────────────────────────┼───────┤
│                                                                     │       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │       │
│  │ ai_chat_usage  │  │  rate_limits   │  │  rag_chunks    │        │       │
│  │ (Usage Log)    │  │  (Quotas)      │  │  (Embeddings)  │        │       │
│  └────────────────┘  └────────────────┘  └────────────────┘        │       │
│                                                                     │       │
│  ┌────────────────────────────────────────────────────────┐        │       │
│  │              Supabase Realtime                         │◄───────┘       │
│  │   (Broadcast + postgres_changes for Peer Chat)         │               │
│  └────────────────────────────────────────────────────────┘               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### 1. Tutor Mode Request Flow

```
Client Request (tutorMode: true)
        │
        ▼
┌───────────────────┐
│ 1. Authentication │ → requireAuth(locals)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 2. Zod Validation │ → tutorRequestSchema.safeParse()
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 3. Rate Limiting  │ → checkTutorRateLimit(userId, exerciseId)
│   - Per Exercise  │    15/exercise, 30/hour, 100/day
│   - Per Hour      │
│   - Per Day       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 4. Cheat Detection│ → analyzeMessage(userMessage)
│   If cheat:       │    Returns early with refusal
│   → Return early  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 5. Effort Analysis│ → analyzeStudentMessages()
│                   │ → calculateEffortScore()
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 6. Grade Adapt.   │ → getAdaptationForGrade(gradeCode)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 7. Help Selection │ → selectHelpMethod(helpContext)
│   Based on:       │    Returns: HelpMethodId
│   - First message │
│   - Wrong answer  │
│   - Frustration   │
│   - Failure count │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 8. Build Prompt   │ → buildTutorPrompt(options)
│   - Base prompt   │    Combines all prompt sections
│   - Help method   │
│   - Grade level   │
│   - Anti-cheat    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 9. RAG Search     │ → hybridSearch() (if ENABLE_RAG=true)
│   (Optional)      │ → formatResultsForPrompt()
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 10. Groq API Call │ → POST /openai/v1/chat/completions
│   Model: llama-   │    temperature: 0.8, max_tokens: 1000
│   3.3-70b-versati │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 11. Increment Use │ → incrementTutorUsage(userId, exerciseId)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 12. Log Usage     │ → INSERT INTO ai_chat_usage
│   (Async)         │    (non-blocking)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 13. Return        │ { message, tutorMetadata }
│   Response        │
└───────────────────┘
```

### 2. Regular Chat Mode Request Flow

```
Client Request (no tutorMode)
        │
        ▼
┌───────────────────┐
│ 1. Authentication │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 2. Rate Limiting  │ → checkChatbotRateLimit()
│   5 req/15 min    │    (simpler than tutor)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 3. Zod Validation │ → chatRequestSchema.safeParse()
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 4. Image Detection│ → Check for image_url content
│   Select model    │    Vision: llama-4-scout
│                   │    Text: llama-3.3-70b
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 5. Groq API Call  │ → With Pere Ubu personality
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 6. Log Usage      │ → INSERT INTO ai_chat_usage
│   (Async)         │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 7. Return         │ { message }
│   Response        │
└───────────────────┘
```

### 3. Peer Chat Message Flow

```
User Types Message
        │
        ▼
┌───────────────────────┐
│ 1. Optimistic UI      │ → Local state update
│    (Instant)          │    pending: true
└────────┬──────────────┘
         │
         ├─────────────────────────────────────────┐
         │                                         │
         ▼                                         ▼
┌───────────────────────┐              ┌───────────────────────┐
│ 2a. Broadcast         │              │ 2b. Database INSERT   │
│     (~50ms, FREE)     │              │     (~200ms)          │
│     Ephemeral         │              │     Persistent        │
└────────┬──────────────┘              └────────┬──────────────┘
         │                                      │
         │                                      ▼
         │                             ┌───────────────────────┐
         │                             │ 3. postgres_changes   │
         │                             │     (~300ms)          │
         │                             │     Source of truth   │
         │                             └────────┬──────────────┘
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                        ▼
               ┌────────────────────┐
               │ 4. Deduplication   │
               │    Replace broadcast│
               │    with DB version │
               └────────────────────┘
```

---

## Component Architecture

### Tutor Components

```
┌─────────────────────────────────────────────────────────────┐
│                    TutorWidget.svelte                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Props:                                                │  │
│  │   - exerciseContext: ExerciseContext                  │  │
│  │   - position: 'bottom-right' | 'bottom-left'          │  │
│  │                                                       │  │
│  │ State:                                                │  │
│  │   - isOpen: $state(false)                            │  │
│  │   - isMinimized: $state(false)                       │  │
│  │                                                       │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │              TutorChat.svelte                   │   │  │
│  │ │ ┌─────────────────────────────────────────────┐ │   │  │
│  │ │ │ State:                                      │ │   │  │
│  │ │ │   - messages: $state<Message[]>([])         │ │   │  │
│  │ │ │   - helpLevel: $state(0)                    │ │   │  │
│  │ │ │   - isLoading: $state(false)                │ │   │  │
│  │ │ │   - remaining: $state({exercise, hour, day})│ │   │  │
│  │ │ │                                             │ │   │  │
│  │ │ │ Methods:                                    │ │   │  │
│  │ │ │   - sendMessage(content: string)            │ │   │  │
│  │ │ │   - handleKeydown(e: KeyboardEvent)         │ │   │  │
│  │ │ └─────────────────────────────────────────────┘ │   │  │
│  │ │                                                 │   │  │
│  │ │ ┌─────────────────────────────────────────────┐ │   │  │
│  │ │ │     TutorUsageIndicator.svelte              │ │   │  │
│  │ │ │                                             │ │   │  │
│  │ │ │ Props: remaining: { exercise, hour, day }   │ │   │  │
│  │ │ │ Display: "15/15 restants pour cet exercice" │ │   │  │
│  │ │ └─────────────────────────────────────────────┘ │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Peer Chat Components

```
┌─────────────────────────────────────────────────────────────┐
│                    ChatWindow.svelte                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Props:                                                │  │
│  │   - conversationId: string                            │  │
│  │   - participant: User                                 │  │
│  │                                                       │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │              MessageList.svelte                 │   │  │
│  │ │                                                 │   │  │
│  │ │ Props:                                          │   │  │
│  │ │   - messages: Message[]                         │   │  │
│  │ │   - currentUserId: string                       │   │  │
│  │ │                                                 │   │  │
│  │ │ Features:                                       │   │  │
│  │ │   - Infinite scroll (load more)                 │   │  │
│  │ │   - Message grouping by date                    │   │  │
│  │ │   - Reactions (ephemeral)                       │   │  │
│  │ │   - Report button                               │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  │                                                       │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │              MessageInput.svelte                │   │  │
│  │ │                                                 │   │  │
│  │ │ Features:                                       │   │  │
│  │ │   - TipTap rich text editor                     │   │  │
│  │ │   - File attachments                            │   │  │
│  │ │   - Typing indicator (broadcast)                │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Store Architecture

### chatStore (Peer Chat)

```typescript
// src/lib/stores/chat.svelte.ts

class ChatStore {
	// ═══════════════════════════════════════════════════════════
	// STATE (Svelte 5 Runes)
	// ═══════════════════════════════════════════════════════════

	private messages = $state<Map<string, Message[]>>(new Map());
	activeConversationId = $state<string | null>(null);
	private typingUsers = $state<Map<string, Set<string>>>(new Map());
	private conversationsMap = $state<Map<string, Conversation>>(new Map());
	private unreadCountsMap = $state<Map<string, number>>(new Map());

	// ═══════════════════════════════════════════════════════════
	// DERIVED STATE
	// ═══════════════════════════════════════════════════════════

	get conversations(): Conversation[] {
		return $derived([...this.conversationsMap.values()]);
	}

	get activeConversation(): Conversation | null {
		return $derived(
			this.activeConversationId
				? (this.conversationsMap.get(this.activeConversationId) ?? null)
				: null
		);
	}

	// ═══════════════════════════════════════════════════════════
	// INITIALIZATION
	// ═══════════════════════════════════════════════════════════

	init(client: SupabaseClient, userId: string, user: User): void {
		this.client = client;
		this.userId = userId;
		this.user = user;
		this.loadConversations();
	}

	// ═══════════════════════════════════════════════════════════
	// SUBSCRIPTIONS
	// ═══════════════════════════════════════════════════════════

	subscribeToConversation(conversationId: string): () => void {
		// Subscribe to broadcast (fast, ephemeral)
		const broadcastChannel = this.client.channel(`chat:${conversationId}`);

		// Subscribe to postgres_changes (reliable, persistent)
		const dbChannel = this.client.channel(`db:${conversationId}`).on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'messages'
			},
			this.handleNewMessage
		);

		return () => {
			broadcastChannel.unsubscribe();
			dbChannel.unsubscribe();
		};
	}

	// ═══════════════════════════════════════════════════════════
	// MESSAGE OPERATIONS
	// ═══════════════════════════════════════════════════════════

	async sendMessage(conversationId: string, content: TipTapJSON): Promise<void> {
		// 1. Optimistic update
		const optimisticMsg = this.createOptimisticMessage(content);
		this.addMessage(conversationId, optimisticMsg);

		// 2. Broadcast to peers (fast)
		await this.broadcastMessage(conversationId, optimisticMsg);

		// 3. Insert to database (persistent)
		const { data, error } = await this.client
			.from('messages')
			.insert({ conversation_id: conversationId, content })
			.select()
			.single();

		// 4. Replace optimistic with real message
		this.replaceOptimisticMessage(conversationId, optimisticMsg.id, data);
	}

	// ═══════════════════════════════════════════════════════════
	// TYPING INDICATORS
	// ═══════════════════════════════════════════════════════════

	sendTypingIndicator(conversationId: string, isTyping: boolean): void {
		// Broadcast only - no database persistence
		this.client.channel(`chat:${conversationId}`).send({
			type: 'broadcast',
			event: 'typing',
			payload: { userId: this.userId, isTyping }
		});
	}

	// ═══════════════════════════════════════════════════════════
	// REACTIONS
	// ═══════════════════════════════════════════════════════════

	toggleReaction(messageId: string, emoji: string): void {
		// Ephemeral - broadcast only, not persisted
		// ...
	}
}

export const chatStore = new ChatStore();
```

---

## Server-Side Modules

### Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                        /api/chat/+server.ts                         │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   middleware/     │   │   validation/     │   │     tutor/        │
│   auth.ts         │   │   chat.ts         │   │                   │
│                   │   │                   │   │                   │
│ - requireAuth()   │   │ - chatRequest     │   │ ┌───────────────┐ │
│ - requireRole()   │   │   Schema          │   │ │rate-limiter.ts│ │
└───────────────────┘   │ - tutorRequest    │   │ │               │ │
                        │   Schema          │   │ │-checkTutor    │ │
                        └───────────────────┘   │ │ RateLimit()   │ │
                                                │ │-increment     │ │
                                                │ │ TutorUsage()  │ │
                                                │ └───────────────┘ │
                                                │                   │
                                                │ ┌───────────────┐ │
                                                │ │cheat-detector │ │
                                                │ │.ts            │ │
                                                │ │               │ │
                                                │ │-analyzeMsg()  │ │
                                                │ └───────────────┘ │
                                                │                   │
                                                │ ┌───────────────┐ │
                                                │ │help-escalation│ │
                                                │ │.ts            │ │
                                                │ │               │ │
                                                │ │-analyzeStudent│ │
                                                │ │ Messages()    │ │
                                                │ │-calculate     │ │
                                                │ │ EffortScore() │ │
                                                │ └───────────────┘ │
                                                └───────────────────┘
                                                          │
                                                          ▼
                              ┌────────────────────────────────────────┐
                              │             config/                    │
                              │                                        │
                              │ ┌────────────────────────────────────┐ │
                              │ │ tutor-prompts.ts                   │ │
                              │ │                                    │ │
                              │ │ - BASE_TUTOR_PROMPT                │ │
                              │ │ - HELP_METHOD_PROMPTS              │ │
                              │ │ - ANTI_CHEAT_PROMPT                │ │
                              │ │ - buildTutorPrompt()               │ │
                              │ └────────────────────────────────────┘ │
                              │                                        │
                              │ ┌────────────────────────────────────┐ │
                              │ │ tutor-help-methods.ts              │ │
                              │ │                                    │ │
                              │ │ - HELP_METHODS (15 methods)        │ │
                              │ │ - selectHelpMethod()               │ │
                              │ └────────────────────────────────────┘ │
                              │                                        │
                              │ ┌────────────────────────────────────┐ │
                              │ │ tutor-grade-adaptations.ts         │ │
                              │ │                                    │ │
                              │ │ - GRADE_ADAPTATIONS                │ │
                              │ │ - getAdaptationForGrade()          │ │
                              │ └────────────────────────────────────┘ │
                              └────────────────────────────────────────┘
```

### RAG Module Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                          src/lib/server/rag/                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                        search.ts                           │     │
│  │                                                            │     │
│  │  hybridSearch(client, query, options)                      │     │
│  │    │                                                       │     │
│  │    ├─► vectorSearch() ──► pgvector similarity             │     │
│  │    │                                                       │     │
│  │    ├─► fullTextSearch() ──► tsvector FTS                  │     │
│  │    │                                                       │     │
│  │    └─► reciprocalRankFusion() ──► combine results         │     │
│  │                                                            │     │
│  │  formatResultsForPrompt(results, options)                  │     │
│  │    └─► Format for LLM context injection                   │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                      embeddings.ts                         │     │
│  │                                                            │     │
│  │  HuggingFaceEmbeddings                                     │     │
│  │    - model: multilingual-e5-large                          │     │
│  │    - dimensions: 1024                                      │     │
│  │    - embed(text: string) → number[]                        │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                       chunker.ts                           │     │
│  │                                                            │     │
│  │  chunkDocument(content, options)                           │     │
│  │    - chunkSize: 500                                        │     │
│  │    - chunkOverlap: 50                                      │     │
│  │    - Returns: Chunk[]                                      │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                      processor.ts                          │     │
│  │                                                            │     │
│  │  indexDocument(client, document)                           │     │
│  │    1. Chunk document                                       │     │
│  │    2. Generate embeddings                                  │     │
│  │    3. Insert into rag_chunks                               │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Overview

### Entity Relationship Diagram

```
┌──────────────────────┐       ┌──────────────────────┐
│     profiles         │       │      classes         │
│──────────────────────│       │──────────────────────│
│ id (PK)              │       │ id (PK)              │
│ display_name         │       │ name                 │
│ avatar_url           │       │ teacher_id (FK)      │
└──────────┬───────────┘       └──────────────────────┘
           │                              │
           │                              │
    ┌──────┴──────────────────────────────┴──────┐
    │                                            │
    ▼                                            ▼
┌──────────────────────┐       ┌──────────────────────┐
│ tutor_conversations  │       │   conversations      │
│──────────────────────│       │──────────────────────│
│ id (PK)              │       │ id (PK)              │
│ student_id (FK)      │       │ type (1on1/group)    │
│ class_id (FK)        │       │ created_at           │
│ exercise_id          │       └──────────┬───────────┘
│ total_messages       │                  │
│ help_level_reached   │                  ▼
└──────────┬───────────┘       ┌──────────────────────┐
           │                   │conversation_          │
           ▼                   │participants           │
┌──────────────────────┐       │──────────────────────│
│   tutor_messages     │       │ conversation_id (FK) │
│──────────────────────│       │ user_id (FK)         │
│ id (PK)              │       │ last_read_at         │
│ conversation_id (FK) │       │ is_admin             │
│ role (user/assistant)│       └──────────┬───────────┘
│ content              │                  │
│ help_method          │                  ▼
│ cheat_detected       │       ┌──────────────────────┐
└──────────────────────┘       │     messages         │
                               │──────────────────────│
                               │ id (PK)              │
┌──────────────────────┐       │ conversation_id (FK) │
│   ai_chat_usage      │       │ sender_id (FK)       │
│──────────────────────│       │ content (JSON)       │
│ id (PK)              │       │ attachments          │
│ user_id (FK)         │       │ created_at           │
│ model                │       └──────────────────────┘
│ message_count        │
│ tokens_used          │       ┌──────────────────────┐
│ response_length      │       │   rate_limits        │
│ created_at           │       │──────────────────────│
└──────────────────────┘       │ id (PK)              │
                               │ user_id (FK)         │
┌──────────────────────┐       │ limit_type           │
│   rag_documents      │       │ count                │
│──────────────────────│       │ window_start         │
│ id (PK)              │       │ exercise_id          │
│ title                │       └──────────────────────┘
│ content              │
│ metadata             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    rag_chunks        │
│──────────────────────│
│ id (PK)              │
│ document_id (FK)     │
│ content              │
│ embedding (vector)   │
│ fts (tsvector)       │
│ metadata             │
└──────────────────────┘
```

---

## LLM Configuration

### Model Selection

| Mode             | Model                                       | Use Case                       |
| ---------------- | ------------------------------------------- | ------------------------------ |
| Tutor            | `llama-3.3-70b-versatile`                   | Text-only tutoring (no images) |
| Regular (text)   | `llama-3.3-70b-versatile`                   | General AI chat                |
| Regular (images) | `meta-llama/llama-4-scout-17b-16e-instruct` | Vision-enabled chat            |

### API Configuration

```typescript
// Groq API call configuration
const groqConfig = {
	endpoint: 'https://api.groq.com/openai/v1/chat/completions',
	headers: {
		Authorization: `Bearer ${GROQ_API_KEY}`,
		'Content-Type': 'application/json'
	},
	body: {
		model: model,
		messages: apiMessages,
		temperature: 0.8, // Higher for creative responses
		max_tokens: 1000,
		top_p: 1,
		stream: false // No streaming (request/response)
	}
};
```

---

## Security Architecture

### Authentication Flow

```
Request → requireAuth(locals) → Supabase Auth → User object
                                       │
                                       ▼
                              ┌────────────────┐
                              │ JWT Validation │
                              │ Session Check  │
                              └────────────────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                              ▼                 ▼
                        ┌──────────┐      ┌──────────┐
                        │ Valid    │      │ Invalid  │
                        │ Continue │      │ 401 Error│
                        └──────────┘      └──────────┘
```

### Rate Limiting Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Rate Limiting System                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Tutor Rate Limiter                       │   │
│  │                                                             │   │
│  │   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │   │
│  │   │ Per Exercise  │ │  Per Hour     │ │  Per Day      │    │   │
│  │   │    15 msgs    │ │   30 msgs     │ │  100 msgs     │    │   │
│  │   │  (permanent)  │ │  (sliding)    │ │  (sliding)    │    │   │
│  │   └───────────────┘ └───────────────┘ └───────────────┘    │   │
│  │                                                             │   │
│  │   Storage: rate_limits table                                │   │
│  │   Key: user_id + limit_type + exercise_id                   │   │
│  │   Expiry: 7 days TTL                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Regular Chat Rate Limiter                 │   │
│  │                                                             │   │
│  │   ┌───────────────────────────────────────────────────┐     │   │
│  │   │              5 requests / 15 minutes              │     │   │
│  │   │              Per user ID                          │     │   │
│  │   └───────────────────────────────────────────────────┘     │   │
│  │                                                             │   │
│  │   Storage: rate_limits table                                │   │
│  │   Key: user_id + 'chatbot'                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

### Required Environment Variables

```bash
# LLM Provider
GROQ_API_KEY=gsk_xxx...

# RAG (optional)
ENABLE_RAG=true
HUGGINGFACE_API_KEY=hf_xxx...

# Supabase (from supabase start)
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=xxx...
SUPABASE_SERVICE_ROLE_KEY=xxx...
```

---

## See Also

- [Pere Ubu Tutor](./pere-ubu-tutor.md) - AI personality and prompts
- [Help Methods](./help-methods.md) - 15 pedagogical methods
- [Rate Limiting & Security](./rate-limiting-security.md) - Quotas and protection
- [Database Schema](./database-schema.md) - Full table definitions
