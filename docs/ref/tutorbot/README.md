# TutorBot System - Technical Reference

> Comprehensive documentation for UbuMaths' chatbot and AI tutoring systems.

---

## Overview

UbuMaths contains **two distinct but integrated systems**:

| System                  | Purpose                 | Backend           | Real-time        |
| ----------------------- | ----------------------- | ----------------- | ---------------- |
| **AI Tutor (Pere Ubu)** | Math tutoring assistant | Groq API (LLaMA)  | Request/response |
| **Peer Chat**           | User-to-user messaging  | Supabase Realtime | Full real-time   |

Both systems share the `/api/chat` endpoint but serve different purposes.

---

## Quick Navigation

| Document                                                | Description                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| [Architecture](./architecture.md)                       | System design, data flow, integration points      |
| [Pere Ubu Tutor](./pere-ubu-tutor.md)                   | AI personality, pedagogical approach, prompts     |
| [Help Methods](./help-methods.md)                       | 15 pedagogical methods, selection algorithm       |
| [Peer Chat](./peer-chat.md)                             | Real-time messaging, typing indicators, reactions |
| [Rate Limiting & Security](./rate-limiting-security.md) | Quotas, anti-cheat, moderation                    |
| [RAG System](./rag-system.md)                           | Retrieval-augmented generation                    |
| [Database Schema](./database-schema.md)                 | Tables, relationships, RLS policies               |

---

## Key Features

### AI Tutor (Pere Ubu)

- **Never gives direct answers** - Socratic method by default
- **15 help methods** with intelligent selection
- **8 escalation levels** (0-7, level 7 = redirect to teacher)
- **Grade-level adaptation** (primary to high school)
- **Anti-cheat detection** for answer-seeking attempts
- **RAG integration** for pedagogical document retrieval

### Peer Chat

- **Hybrid real-time strategy** - Broadcast (50ms) + postgres_changes (300ms)
- **Typing indicators** - Ephemeral, free quota
- **Message reactions** - Ephemeral toggle
- **User restrictions** - Mute, timeout, ban
- **Message reporting** - Moderation workflow

---

## Architecture Diagram

```
                          ┌─────────────────────────────────────────┐
                          │              Client Layer               │
                          │                                         │
     ┌────────────────────┼────────────────────┬────────────────────┤
     │                    │                    │                    │
     ▼                    ▼                    ▼                    │
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐          │
│ TutorWidget │    │  ChatBot    │    │   ChatWindow    │          │
│ TutorChat   │    │             │    │   MessageList   │          │
│ (.svelte)   │    │ (.svelte)   │    │   MessageInput  │          │
└──────┬──────┘    └──────┬──────┘    └────────┬────────┘          │
       │                  │                    │                    │
       │                  │                    ▼                    │
       │                  │           ┌────────────────┐           │
       │                  │           │   chatStore    │           │
       │                  │           │ (chat.svelte)  │           │
       │                  │           └────────┬───────┘           │
       │                  │                    │                    │
       └──────────────────┼────────────────────┼────────────────────┤
                          │                    │                    │
                          ▼                    ▼                    ▼
                ┌─────────────────────────────────────────────────────┐
                │                  /api/chat Endpoint                 │
                │           (src/routes/api/chat/+server.ts)          │
                └───────────────────────┬─────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              │                              │
         ▼                              ▼                              ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│     Tutor Mode      │    │   Regular Chat      │    │   Shared Services   │
│                     │    │                     │    │                     │
│  - Cheat Detector   │    │  - Pere Ubu persona │    │  - Rate Limiting    │
│  - Help Escalation  │    │  - Image support    │    │  - Zod Validation   │
│  - RAG Context      │    │  - General AI chat  │    │  - Groq API Client  │
│  - Grade Adaptation │    │                     │    │  - Usage Logging    │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

---

## Technology Stack

| Component          | Technology                                                             |
| ------------------ | ---------------------------------------------------------------------- |
| **LLM Provider**   | Groq API                                                               |
| **Models**         | `llama-3.3-70b-versatile`, `meta-llama/llama-4-scout-17b-16e-instruct` |
| **Real-time**      | Supabase Broadcast + postgres_changes                                  |
| **Embeddings**     | HuggingFace `multilingual-e5-large`                                    |
| **Vector Search**  | pgvector (Supabase)                                                    |
| **Validation**     | Zod                                                                    |
| **UI Framework**   | Svelte 5 (runes)                                                       |
| **Math Rendering** | MathLive                                                               |

---

## Key File Locations

### Components

```
src/lib/components/
├── ChatBot.svelte              # General AI chat interface
├── chat/
│   ├── ChatWindow.svelte       # Peer chat container
│   ├── MessageList.svelte      # Message display
│   └── MessageInput.svelte     # Input component
└── tutor/
    ├── TutorChat.svelte        # Tutor interface
    ├── TutorWidget.svelte      # Floating tutor panel
    ├── TutorHelpButton.svelte  # Help trigger
    └── TutorUsageIndicator.svelte  # Quota display
```

### Server

```
src/lib/server/
├── tutor/
│   ├── tutor-rate-limiter.ts   # Rate limiting
│   ├── cheat-detector.ts       # Anti-cheat
│   └── help-escalation.ts      # Effort analysis
├── rag/
│   ├── search.ts               # Hybrid search
│   ├── embeddings.ts           # HuggingFace service
│   └── chunker.ts              # Document chunking
└── validation/
    └── chat.ts                 # Zod schemas
```

### Configuration

```
src/lib/config/
├── tutor-prompts.ts            # System prompts
├── tutor-help-methods.ts       # 15 help methods
├── tutor-grade-adaptations.ts  # Grade-level config
└── personalities.ts            # Pere Ubu personality
```

### API

```
src/routes/api/chat/+server.ts  # Main chat endpoint
```

### Store

```
src/lib/stores/chat.svelte.ts   # Peer chat store
```

---

## Rate Limits Summary

| Limit Type   | AI Tutor     | Regular Chat      |
| ------------ | ------------ | ----------------- |
| Per Exercise | 15 messages  | -                 |
| Per Hour     | 30 messages  | 5 requests/15 min |
| Per Day      | 100 messages | -                 |

---

## Quick Reference: API Endpoint

```typescript
// Regular chat
POST /api/chat
{
  "messages": [{ "role": "user", "content": "..." }]
}

// Tutor mode
POST /api/chat
{
  "tutorMode": true,
  "messages": [...],
  "exerciseContext": {
    "statement": "Solve: 2x + 3 = 7",
    "topic": "algebra",
    "level": 2,
    "studentGrade": "6e"
  },
  "helpLevel": 0
}
```

---

## See Also

- [Chat System Feature Doc](../../features/chat-system.md)
- [Tutor RAG System Feature Doc](../../features/tutor-rag-system.md)
- [Realtime Guide](../../claude/realtime.md)
