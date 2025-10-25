# 🏗️ Architecture

Documentation de l'architecture technique d'UbuMaths.

---

## Documents

### [Structure du projet](project-structure.md)

Organisation des dossiers, conventions de nommage, organisation des fichiers.

### [Schéma base de données](database-schema.md)

Tables, relations, RLS policies, migrations Supabase.

### [Routing](routing.md)

Organisation des routes SvelteKit, groupes de routes, patterns.

### [WebSocket](websocket.md)

Architecture temps réel, événements, présence utilisateurs.

### [Éditeur rich text](rich-text-editor.md)

TipTap + MathLive, toolbar, math templates, emojis.

### [Performance](performance.md)

Optimisations, patterns (optimistic UI + debouncing), best practices.

---

## Tech Stack

- **Framework** : SvelteKit + Svelte 5 (runes)
- **Language** : TypeScript (strict mode)
- **Styling** : Tailwind CSS 4
- **UI Components** : Shadcn-svelte + Bits UI
- **Math** : MathLive (LaTeX editor + renderer)
- **Database** : Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hosting** : Vercel
- **Package Manager** : pnpm

---

## Principes d'architecture

### Separation of Concerns

- Server-only code dans `/lib/server/`
- Types partagés dans `/lib/types/`
- Utilities génériques dans `/lib/utils/`

### Data Fetching

- Préférer `load` functions de SvelteKit
- Form actions pour mutations
- WebSocket pour temps réel

### State Management

- Svelte runes ($state, $derived, $effect)
- Stores pour état global partagé
- Contexte pour état local de composant

### Performance

- Optimistic UI pour feedback immédiat
- Debouncing pour updates serveur fréquentes
- Code splitting automatique par route

---

[← Retour à l'index principal](../README.md)
