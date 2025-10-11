# UbuMaths

An educational math application built by a math teacher for students, featuring interactive mathematical input and rendering.

## Features

- 🔐 **Secure Authentication** - Supabase Auth with SSR support, email confirmation, and password reset
- ✏️ **Interactive Math Editor** - Powered by **MathLive** for mathematical input and rendering
- 🎨 **Modern UI** - Responsive design with **Tailwind CSS 4** and **Skeleton UI**
- 🚀 **Built with Svelte 5** - Modern reactive framework with runes and **SvelteKit**
- 📝 **Full TypeScript** - Type-safe development throughout
- 🔍 **Standardized Logging** - Color-coded severity levels and threshold filtering
- 👥 **Role-Based Access** - Student, teacher, and admin roles with permission system
- 📊 **Progress Tracking** - Student attempts and performance metrics
- 🏫 **Multi-School Support** - Manage multiple schools and classes

## Tech Stack

- [Svelte 5](https://svelte.dev/) - Modern reactive framework with runes
- [SvelteKit](https://kit.svelte.dev/) - Full-stack framework with SSR
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Supabase](https://supabase.com/) - Backend (Auth, Database, Storage)
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first styling
- [Skeleton UI](https://www.skeleton.dev/) - UI component library
- [MathLive](https://cortexjs.io/mathlive/) - Mathematical input and rendering
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E testing

## Prerequisites

- Node.js 18+
- pnpm (recommended package manager)
- Supabase account (for auth and database)

## Getting Started

1. **Clone the repository and install dependencies:**

```bash
pnpm install
```

2. **Set up environment variables:**

Create a `.env` file in the root directory:

```bash
PUBLIC_SUPABASE_URL=your-supabase-project-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Get these values from your [Supabase Dashboard](https://app.supabase.com) → Project Settings → API

3. **Configure Supabase (first-time setup):**

- Go to **Authentication → Email Templates** in Supabase Dashboard
- Update redirect URLs:
  - **Confirm signup**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
  - **Reset password**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

4. **Run database migrations (if needed):**

```bash
pnpm db:migrate
```

5. **Start the development server:**

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm check            # Run svelte-check for type checking
pnpm check:watch      # Watch mode for type checking
pnpm lint             # Run prettier and eslint checks
pnpm format           # Format code with prettier

# Testing
pnpm test             # Run all tests (unit + e2e)
pnpm test:unit        # Run Vitest unit tests
pnpm test:e2e         # Run Playwright e2e tests

# Database
pnpm db:migrate       # Push pending migrations to Supabase
pnpm db:status        # Check database user/profile status
pnpm db:link          # Link to Supabase project
```

## Testing

The project uses a dual-project Vitest setup:

- **Client tests** (`*.svelte.test.ts`) - Run in browser environment for component testing
- **Server tests** (`*.test.ts`) - Run in Node environment for server-side logic
- **E2E tests** (`e2e/*.spec.ts`) - Full application testing with Playwright

## Deployment

Configured for deployment on [Vercel](https://vercel.com/) using `@sveltejs/adapter-vercel`.

## Project Structure

```
src/
├── routes/                    # SvelteKit file-based routes
│   ├── (public)/              # Public routes (no auth required)
│   │   ├── +page.svelte       # Home page
│   │   ├── login/             # Login page
│   │   ├── signup/            # Signup with password strength indicator
│   │   └── auth/              # Auth-related routes
│   │       ├── logout/        # Logout endpoint
│   │       ├── confirm/       # Email confirmation handler
│   │       ├── reset-password/    # Password reset request
│   │       └── update-password/   # Set new password
│   │
│   └── (protected)/           # Protected routes (auth required)
│       └── dashboard/         # Dashboard (automatic auth)
│           └── admin/         # Admin-only routes
│
├── lib/
│   ├── components/            # Reusable Svelte components
│   ├── server/                # Server-only code
│   │   ├── auth.ts            # Auth utilities (requireAuth, requireRole)
│   │   └── supabase.ts        # Supabase server client
│   ├── stores/                # Svelte stores
│   ├── utils/                 # Utility functions
│   │   ├── logger.ts          # Logging system
│   │   └── passwordStrength.ts # Password validation
│   └── types/                 # TypeScript types
├── hooks.server.ts            # Server hooks (auth)
├── app.d.ts                   # Global type definitions
├── app.html                   # HTML template
└── app.css                    # Global styles
```

**Route Groups:**
- `(public)/` - No authentication required
- `(protected)/` - Automatic authentication for all child routes
- Parentheses don't affect URLs: `(public)/login` → `/login`

## Authentication

The application uses **Supabase Auth** with a fully SSR-compatible implementation:

### Features

- ✅ Server-side rendering support
- ✅ Email/password authentication
- ✅ Email confirmation
- ✅ Password reset with email
- ✅ Password strength indicator
- ✅ Real-time auth state synchronization
- ✅ Cookie-based session management
- ✅ Role-based access control (student, teacher, admin)

### Available Routes

- `/login` - Login with email/password
- `/signup` - Create account with password strength feedback
- `/auth/reset-password` - Request password reset email
- `/auth/update-password` - Set new password after reset
- `/auth/confirm` - Email confirmation and password reset handler

### Quick Example

Protecting a route:

```typescript
// +page.server.ts
import { requireAuth } from '$lib/server/auth';

export const load = async ({ locals: { safeGetSession } }) => {
  const { user } = await safeGetSession();
  requireAuth(user); // Redirects to login if not authenticated

  // Your protected page logic here
};
```

For complete documentation, see [AUTH_SYSTEM.md](./AUTH_SYSTEM.md).

## Logging System

The application includes a standardized logging system for development debugging:

### Features

- **4 Severity Levels**: `trace` (0) < `info` (1) < `warn` (2) < `error` (3)
- **Color-Coded Output**:
  - 🔴 **Red** for errors
  - 🟠 **Orange** for warnings
  - 🔵 **Blue** for info
  - ⚪ **Normal** for trace
- **File Prefix**: Shows `[filename]` for each log message
- **Threshold Filtering**: Set minimum log level (default: `info`)
- **Environment-Aware**:
  - Browser: Styled console output in Chrome DevTools
  - Server: ANSI colored output with timestamps in VSCode terminal
- **Production Safe**: Automatically disabled in production mode

### Usage

```typescript
import { createLogger } from '$lib/utils/logger';

// Default threshold (info) - trace messages suppressed
const logger = createLogger('MyComponent.svelte');

logger.trace('Detailed debug info');  // Not displayed (below threshold)
logger.info('User action');           // ✅ Displayed
logger.warn('Potential issue');       // ✅ Displayed
logger.error('Error occurred');       // ✅ Displayed

// Custom threshold for debugging
const debugLogger = createLogger('Debug.svelte', 'trace');
debugLogger.trace('Now visible');     // ✅ Displayed (trace threshold)

// Production-like (errors only)
const prodLogger = createLogger('Service.ts', 'error');
prodLogger.info('Info message');      // Not displayed (below error threshold)
prodLogger.error('Critical error');   // ✅ Displayed
```

### Server Output Format

```
4:55:51 PM [server/auth.ts] User verified: user@example.com
4:55:52 PM [+layout.ts] Loading, isBrowser: false
```

### Demo

Visit the main page to see an interactive demo of the logging system with examples of all threshold levels.

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Instructions for Claude AI assistant when working on this codebase
- **[AUTH_SYSTEM.md](./AUTH_SYSTEM.md)** - Complete authentication system documentation
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Database schema and table documentation

## Contributing

This is an educational project. For development guidelines:
1. Follow the code style in [CLAUDE.md](./CLAUDE.md)
2. Use the logging system for debugging
3. Write tests for new features
4. Ensure authentication follows patterns in [AUTH_SYSTEM.md](./AUTH_SYSTEM.md)

## License

Created for educational purposes.
