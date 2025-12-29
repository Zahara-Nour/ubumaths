# Bug Reports System - Technical Guide

> Systeme complet de signalement de bugs avec detection automatique des freezes et workflow d'administration.

## Table des matieres

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Documentation detaillee](#documentation-detaillee)
- [Flux de donnees](#flux-de-donnees)
- [Configuration](#configuration)

---

## Overview

Le systeme de bug reports permet aux utilisateurs de signaler:

| Type      | Description                      | Icone      |
| --------- | -------------------------------- | ---------- |
| `bug`     | Bug technique (erreurs, crashes) | :bug:      |
| `content` | Erreur de contenu mathematique   | :memo:     |
| `ux`      | Probleme d'ergonomie             | :art:      |
| `feature` | Suggestion de fonctionnalite     | :bulb:     |
| `other`   | Autre                            | :question: |

### Fonctionnalites cles

- **Detection automatique des freezes** : Alerte apres 15s, rapport auto apres 30s
- **Capture de contexte** : URL, viewport, user agent, erreurs recentes, Web Vitals
- **Screenshots** : Upload avec validation des magic bytes
- **Export Claude Code** : Markdown optimise pour le debugging
- **Workflow admin** : Statuts, notes de resolution, filtres

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐     │
│  │  BugReportFAB   │───►│ BugReportDialog  │───►│ POST /api/bug-     │     │
│  │  (bottom-right) │    │ (form modal)     │    │      reports       │     │
│  └─────────────────┘    └──────────────────┘    └────────────────────┘     │
│          │                       ▲                                          │
│          │              ┌────────┴────────┐                                 │
│          ▼              │                 │                                 │
│  ┌─────────────────┐    │  ┌──────────────────────────────────────┐        │
│  │FreezeReportPrompt│◄───┤  │         Freeze Detection            │        │
│  │ (auto 15s)      │    │  │  • Long Task Observer (>100ms)      │        │
│  └─────────────────┘    │  │  • Heartbeat System (drift check)   │        │
│                         │  │  • Activity Tracking (clicks, etc)  │        │
│                         │  │  • sessionStorage persistence       │        │
│                         │  └──────────────────────────────────────┘        │
└─────────────────────────┼──────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               API LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         /api/bug-reports                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  GET    /                    │ List reports (user: own, admin: all) │   │
│  │  POST   /                    │ Create report + notify admins        │   │
│  │  GET    /[reportId]          │ Get report details                   │   │
│  │  PATCH  /[reportId]          │ Update (user: pending, admin: all)   │   │
│  │  DELETE /[reportId]          │ Delete (admin only)                  │   │
│  │  POST   /[reportId]/screenshot│ Upload screenshot                   │   │
│  │  GET    /[reportId]/export   │ Export markdown (admin only)         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │
│  │   Zod Validation   │  │   Auth Middleware  │  │  Notification Svc  │    │
│  │ (all inputs)       │  │  (requireAuth)     │  │ (notifyAdmins)     │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATABASE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐      │
│  │      bug_reports table       │    │  bug-report-screenshots      │      │
│  ├──────────────────────────────┤    │        (storage bucket)      │      │
│  │ • 6 RLS policies             │    ├──────────────────────────────┤      │
│  │ • 6 indexes (incl. partial)  │    │ • 5 storage policies         │      │
│  │ • updated_at trigger         │    │ • 5MB limit                  │      │
│  │ • FK to profiles             │    │ • MIME whitelist             │      │
│  └──────────────────────────────┘    └──────────────────────────────┘      │
│                                                                             │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐      │
│  │     error_logs table         │    │     notifications table      │      │
│  │  (context enrichment)        │    │   (admin notifications)      │      │
│  └──────────────────────────────┘    └──────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Pour les utilisateurs

1. Cliquer sur le bouton bug (:bug:) en bas a droite du dashboard
2. Remplir le formulaire (type, severite, titre, description)
3. Optionnellement ajouter une capture d'ecran
4. Soumettre - le contexte technique est capture automatiquement

### Pour les administrateurs

1. Aller dans Dashboard > Admin > Bug Reports
2. Filtrer par statut/categorie/severite
3. Cliquer sur un rapport pour voir les details
4. Mettre a jour le statut et ajouter des notes
5. Exporter en Markdown pour Claude Code si necessaire

### Pour les developpeurs

```typescript
// Creer un rapport programmatiquement
const response = await fetch('/api/bug-reports', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		category: 'bug',
		severity: 'high',
		title: 'Erreur lors du calcul',
		description: 'Description detaillee du probleme...',
		pageUrl: window.location.href,
		sessionContext: getFreezeDetectionContext()
	})
});
```

---

## Documentation detaillee

| Document                                     | Description                            |
| -------------------------------------------- | -------------------------------------- |
| [database.md](./database.md)                 | Schema, indexes, RLS policies, storage |
| [api.md](./api.md)                           | Endpoints, validation, examples        |
| [components.md](./components.md)             | Composants Svelte, props, usage        |
| [freeze-detection.md](./freeze-detection.md) | Systeme de detection cote client       |

---

## Flux de donnees

### Creation d'un rapport

```
1. User clicks FAB
   │
2. BugReportDialog opens
   │
3. User fills form + optional screenshot
   │
4. Submit clicked
   │
   ├──► getFreezeDetectionContext()  ──► Client context (freezes, actions, vitals)
   │
5. POST /api/bug-reports
   │
   ├──► Zod validation (createBugReportSchema)
   │
   ├──► Fetch recent errors from error_logs (last 5 min)
   │
   ├──► Fetch slow requests from error_logs
   │
   ├──► Insert into bug_reports with enriched context
   │
   ├──► notifyAdminsOfNewBugReport()
   │
6. Response with report ID
   │
7. If screenshot: POST /api/bug-reports/[id]/screenshot
   │
   ├──► Validate file (size, MIME, magic bytes)
   │
   ├──► Upload to storage bucket
   │
   └──► Update bug_report with screenshot URL
```

### Detection automatique de freeze

```
Page loads
   │
   ├──► initFreezeDetection()
   │    ├──► Long Task Observer (PerformanceObserver)
   │    ├──► Heartbeat System (setTimeout drift)
   │    └──► Activity Tracking (click, input, scroll, navigation)
   │
   ├──► Every 2s: Check heartbeat drift
   │
   ├──► If drift > 15s:
   │    └──► Show FreezeReportPrompt
   │         └──► User can submit pre-filled report
   │
   └──► If drift > 30s:
        └──► Auto-submit silent report (auto_generated: true)
```

---

## Configuration

### Seuils de detection (freezeDetection.ts)

| Constante                         | Valeur  | Description                     |
| --------------------------------- | ------- | ------------------------------- |
| `LONG_TASK_THRESHOLD_MS`          | 100ms   | Seuil pour logger une long task |
| `LONG_TASK_ERROR_THRESHOLD_MS`    | 500ms   | Seuil pour error monitoring     |
| `HEARTBEAT_INTERVAL_MS`           | 2000ms  | Intervalle de verification      |
| `FREEZE_PROMPT_THRESHOLD_MS`      | 15000ms | Seuil pour prompt utilisateur   |
| `FREEZE_AUTO_REPORT_THRESHOLD_MS` | 30000ms | Seuil pour rapport automatique  |
| `MAX_ACTIONS`                     | 20      | Nombre max d'actions gardees    |
| `MAX_FREEZE_EVENTS`               | 50      | Nombre max de freeze events     |
| `FREEZE_RETENTION_MS`             | 15 min  | Duree de retention des events   |

### Limites de validation (Zod)

| Champ           | Limites                |
| --------------- | ---------------------- |
| `title`         | 5-200 caracteres       |
| `description`   | 20-5000 caracteres     |
| `recentErrors`  | max 20 items           |
| `slowRequests`  | max 10 items           |
| `freezeEvents`  | max 50 items           |
| `recentActions` | max 30 items           |
| `screenshot`    | 5MB, JPEG/PNG/GIF/WebP |

### Storage bucket

```sql
-- Configuration du bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bug-report-screenshots',
  'bug-report-screenshots',
  true,                    -- Public pour URLs partageables
  5242880,                 -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);
```

---

## Fichiers sources

### Core

| Fichier                                                     | Description         |
| ----------------------------------------------------------- | ------------------- |
| `src/lib/types/bug-reports.ts`                              | Types et constantes |
| `src/lib/server/validation/bug-reports.ts`                  | Schemas Zod         |
| `src/lib/server/bug-report-export.ts`                       | Generateur Markdown |
| `src/lib/server/notifications.ts`                           | Notification admins |
| `supabase/migrations/20251229000000_create_bug_reports.sql` | Migration DB        |

### API

| Fichier                                                       | Endpoints          |
| ------------------------------------------------------------- | ------------------ |
| `src/routes/api/bug-reports/+server.ts`                       | GET, POST          |
| `src/routes/api/bug-reports/[reportId]/+server.ts`            | GET, PATCH, DELETE |
| `src/routes/api/bug-reports/[reportId]/screenshot/+server.ts` | POST               |
| `src/routes/api/bug-reports/[reportId]/export/+server.ts`     | GET                |

### Components

| Fichier                                                        | Description              |
| -------------------------------------------------------------- | ------------------------ |
| `src/lib/components/bug-reports/BugReportFAB.svelte`           | Floating action button   |
| `src/lib/components/bug-reports/BugReportDialog.svelte`        | Formulaire de soumission |
| `src/lib/components/bug-reports/BugReportCard.svelte`          | Carte de rapport         |
| `src/lib/components/bug-reports/BugReportList.svelte`          | Liste filtrable          |
| `src/lib/components/bug-reports/BugReportStatusBadge.svelte`   | Badge de statut          |
| `src/lib/components/bug-reports/FreezeReportPrompt.svelte`     | Prompt freeze            |
| `src/lib/components/bug-reports/ExportClaudeCodeButton.svelte` | Export admin             |

### Client-side

| Fichier                                  | Description          |
| ---------------------------------------- | -------------------- |
| `src/lib/utils/freezeDetection.ts`       | Systeme de detection |
| `src/lib/stores/activityStore.svelte.ts` | Store reactif        |

### Pages

| Fichier                                                           | Description      |
| ----------------------------------------------------------------- | ---------------- |
| `src/routes/(protected)/dashboard/bug-reports/+page.svelte`       | Page utilisateur |
| `src/routes/(protected)/dashboard/admin/bug-reports/+page.svelte` | Page admin       |
