# Plan d'implémentation : Système de rapport de bugs

> **Statut** : ✅ Phase 0 validée - Prêt pour implémentation
> **Branche** : `claude/bug-reporting-feature-xyhVR`
> **Créé le** : 2025-12-29
> **Mis à jour** : 2025-12-29

---

## Phase 0 : Spécification TDD (OBLIGATOIRE)

### Fonctionnalité : Système de rapport de bugs utilisateurs

#### Comportements proposés

##### A. Soumission de rapport (utilisateur authentifié)

1. **Cas nominal** : Un utilisateur authentifié peut soumettre un rapport de bug avec catégorie, sévérité, titre (5-200 car.), description (20-5000 car.)
2. **Cas nominal** : Le contexte technique est capturé automatiquement (URL, user agent, viewport, erreurs récentes, freezes)
3. **Cas nominal** : L'utilisateur peut ajouter une capture d'écran optionnelle (max 5 Mo, formats image)
4. **Cas limite** : Un utilisateur non authentifié ne peut pas soumettre de rapport (redirection login)
5. **Cas limite** : Les champs titre/description sont validés côté client ET serveur
6. **Cas erreur** : Rejet si titre < 5 ou > 200 caractères
7. **Cas erreur** : Rejet si description < 20 ou > 5000 caractères
8. **Cas erreur** : Rejet si catégorie ou sévérité invalide

##### B. Détection automatique de freeze

9. **Cas nominal** : Les Long Tasks (>100ms) sont détectées et enregistrées
10. **Cas nominal** : Un freeze >15s déclenche un prompt proposant de créer un rapport
11. **Cas nominal** : Un freeze >30s génère automatiquement un rapport silencieux
12. **Cas limite** : Les données de freeze sont conservées 15 minutes max
13. **Cas limite** : Les 20 dernières actions utilisateur sont conservées
14. **Cas limite** : Les données survivent au refresh via sessionStorage

##### C. Enrichissement automatique du contexte

15. **Cas nominal** : Les 10 dernières erreurs (5 min) de l'utilisateur sont attachées au rapport
16. **Cas nominal** : Les requêtes lentes récentes sont attachées au rapport
17. **Cas nominal** : Les Web Vitals actuels sont inclus dans le contexte

##### D. Consultation des rapports (utilisateur)

18. **Cas nominal** : Un utilisateur peut voir la liste de ses propres rapports
19. **Cas nominal** : Un utilisateur peut filtrer ses rapports par statut
20. **Cas nominal** : Un utilisateur voit le statut et la note de résolution de ses rapports
21. **Cas limite** : Un utilisateur ne peut PAS voir les rapports des autres

##### E. Gestion des rapports (admin)

22. **Cas nominal** : Un admin peut voir tous les rapports
23. **Cas nominal** : Un admin peut filtrer par catégorie, sévérité, statut
24. **Cas nominal** : Un admin peut changer le statut d'un rapport
25. **Cas nominal** : Un admin peut ajouter une note de résolution
26. **Cas limite** : Un non-admin ne peut pas accéder au dashboard admin

##### F. Notifications

27. **Cas nominal** : Les admins reçoivent une notification pour chaque nouveau rapport
28. **Cas nominal** : Les rapports critiques/high ont une notification prioritaire
29. **Cas nominal** : Les rapports auto-générés (freeze >30s) notifient immédiatement

##### G. Screenshots

30. **Cas nominal** : Upload d'image vers Supabase Storage (bucket dédié)
31. **Cas limite** : Rejet si fichier > 5 Mo
32. **Cas limite** : Rejet si format non supporté (acceptés: jpeg, png, gif, webp)
33. **Cas erreur** : Validation magic bytes (signature fichier)

##### H. Export pour Claude Code (admin)

34. **Cas nominal** : Un admin peut exporter un rapport au format Markdown optimisé pour Claude Code
35. **Cas nominal** : L'export contient le contexte complet (titre, description, erreurs, stack traces, actions)
36. **Cas nominal** : L'export suggère les fichiers potentiellement concernés (basé sur stack traces)
37. **Cas nominal** : L'export inclut les commandes utiles (chemins fichiers, patterns de recherche)
38. **Cas nominal** : Le screenshot est inclus comme lien ou base64 dans l'export
39. **Cas limite** : L'export est copié dans le presse-papier en un clic
40. **Cas limite** : L'export peut être téléchargé comme fichier `.md`

#### Décisions validées

| Question | Réponse |
|----------|---------|
| **Catégories** | `bug`, `content`, `ux`, `feature`, `other` ✅ |
| **Sévérités** | `low`, `medium`, `high`, `critical` ✅ |
| **Statuts** | `pending`, `acknowledged`, `in_progress`, `resolved`, `wont_fix`, `duplicate` ✅ |
| **FAB** | Visible sur TOUTES les pages protégées ✅ |
| **Icône FAB** | Fourmi 🐜 (style Claude Code web) ✅ |
| **Export Claude Code** | Format Markdown structuré pour debugging ✅ |

---

## Phase 1 : Base de données

### Tâches

| # | Tâche | Agent | Modèle |
|---|-------|-------|--------|
| 1.1 | Créer migration `bug_reports` table | `supabase-expert` | Opus |
| 1.2 | Créer bucket Storage `bug-report-screenshots` | `supabase-expert` | Opus |
| 1.3 | Configurer RLS policies (user voit ses rapports, admin voit tout) | `supabase-expert` | Opus |
| 1.4 | Créer index optimisés | `supabase-expert` | Opus |
| 1.5 | Mettre à jour `src/lib/types/database.ts` | Direct | - |
| 1.6 | Mettre à jour `docs/architecture/database-schema.md` | `documentation-writer` | Haiku |

### Livrables

- `supabase/migrations/YYYYMMDDHHMMSS_create_bug_reports.sql`
- Types TypeScript mis à jour
- Documentation schema mise à jour

### Validation

- [ ] Migration appliquée sans erreur
- [ ] RLS testées manuellement
- [ ] Code review phase 1

---

## Phase 2 : Validation et types

### Tâches

| # | Tâche | Agent | Modèle |
|---|-------|-------|--------|
| 2.1 | Créer schémas Zod pour bug reports | Direct | - |
| 2.2 | Créer types TypeScript dédiés | `typescript-expert` | Sonnet |
| 2.3 | Tests unitaires validation | `test-automator` | Sonnet |

### Livrables

- `src/lib/server/validation/bug-reports.ts`
- `src/lib/types/bug-reports.ts`
- Tests de validation

### Validation

- [ ] Tests passent
- [ ] Code review phase 2

---

## Phase 3 : API endpoints

### Tâches

| # | Tâche | Agent | Modèle |
|---|-------|-------|--------|
| 3.1 | `POST /api/bug-reports` - Créer rapport | `backend-developer` | Opus |
| 3.2 | `GET /api/bug-reports` - Liste (user: ses rapports, admin: tous) | `backend-developer` | Opus |
| 3.3 | `GET /api/bug-reports/[id]` - Détail | `backend-developer` | Sonnet |
| 3.4 | `PATCH /api/bug-reports/[id]` - Modifier statut (admin) | `backend-developer` | Sonnet |
| 3.5 | `POST /api/bug-reports/[id]/screenshot` - Upload image | `backend-developer` | Opus |
| 3.6 | `GET /api/bug-reports/[id]/export` - Export Markdown pour Claude Code | `backend-developer` | Opus |
| 3.7 | Fonction `notifyAdminsOfNewBugReport` | Direct | - |
| 3.8 | Fonction `generateClaudeCodeExport` | Direct | - |
| 3.9 | Tests API endpoints | `test-automator` | Sonnet |
| 3.10 | Security audit endpoints | `security-auditor` | Opus |

### Livrables

- `src/routes/api/bug-reports/+server.ts`
- `src/routes/api/bug-reports/[reportId]/+server.ts`
- `src/routes/api/bug-reports/[reportId]/screenshot/+server.ts`
- `src/routes/api/bug-reports/[reportId]/export/+server.ts`
- `src/lib/server/notifications.ts` (mise à jour)
- `src/lib/server/bug-report-export.ts` (générateur export)
- Tests API

### Validation

- [ ] Tests passent
- [ ] Security audit OK
- [ ] Code review phase 3

---

## Phase 4 : Détection de freeze (client)

### Tâches

| # | Tâche | Agent | Modèle |
|---|-------|-------|--------|
| 4.1 | Créer `freezeDetection.ts` (Long Task Observer) | `frontend-developer` | Opus |
| 4.2 | Implémenter Heartbeat system | `frontend-developer` | Opus |
| 4.3 | Créer `activityStore` (tracking actions) | `frontend-developer` | Sonnet |
| 4.4 | Persistence sessionStorage | `frontend-developer` | Sonnet |
| 4.5 | Intégration dans `hooks.client.ts` | Direct | - |
| 4.6 | Tests unitaires freeze detection | `test-automator` | Sonnet |

### Livrables

- `src/lib/utils/freezeDetection.ts`
- `src/lib/stores/activityStore.svelte.ts`
- Mise à jour `src/hooks.client.ts`
- Tests

### Validation

- [ ] Long Task Observer fonctionne
- [ ] Heartbeat détecte les freezes
- [ ] Persistence sessionStorage OK
- [ ] Tests passent
- [ ] Code review phase 4

---

## Phase 5 : Composants UI

### Tâches

| # | Tâche | Agent | Modèle |
|---|-------|-------|--------|
| 5.1 | `BugReportFAB.svelte` - Bouton flottant | `frontend-developer` | Sonnet |
| 5.2 | `BugReportDialog.svelte` - Formulaire complet | `frontend-developer` | Opus |
| 5.3 | `BugReportCard.svelte` - Affichage rapport | `frontend-developer` | Sonnet |
| 5.4 | `BugReportStatusBadge.svelte` - Badge statut | `frontend-developer` | Haiku |
| 5.5 | `BugReportList.svelte` - Liste avec filtres | `frontend-developer` | Sonnet |
| 5.6 | `FreezeReportPrompt.svelte` - Prompt après freeze | `frontend-developer` | Sonnet |
| 5.7 | `ExportClaudeCodeButton.svelte` - Bouton export + dialog preview | `frontend-developer` | Opus |
| 5.8 | Tests composants | `test-automator` | Sonnet |
| 5.9 | Accessibility audit | `accessibility-tester` | Sonnet |

### Livrables

- `src/lib/components/bug-reports/*.svelte` (7 composants)
- Tests composants

### Validation

- [ ] Composants fonctionnels
- [ ] Accessibilité OK (clavier, screen reader)
- [ ] Tests passent
- [ ] Code review phase 5

---

## Phase 6 : Pages et routes

### Tâches

| # | Tâche | Agent | Modèle |
|---|-------|-------|--------|
| 6.1 | Page utilisateur `/dashboard/bug-reports` | `fullstack-developer` | Sonnet |
| 6.2 | Page admin `/dashboard/admin/bug-reports` | `fullstack-developer` | Opus |
| 6.3 | Intégrer FAB dans layout protected | Direct | - |
| 6.4 | Tests E2E parcours utilisateur | `test-automator` | Sonnet |

### Livrables

- `src/routes/(protected)/dashboard/bug-reports/+page.svelte`
- `src/routes/(protected)/dashboard/bug-reports/+page.server.ts`
- `src/routes/(protected)/dashboard/admin/bug-reports/+page.svelte`
- `src/routes/(protected)/dashboard/admin/bug-reports/+page.server.ts`
- Mise à jour layout

### Validation

- [ ] Navigation fonctionne
- [ ] Permissions respectées
- [ ] Tests E2E passent
- [ ] Code review phase 6

---

## Phase 7 : Intégration et polish

### Tâches

| # | Tâche | Agent | Modèle |
|---|-------|-------|--------|
| 7.1 | Intégration FAB + Dialog dans app | Direct | - |
| 7.2 | Intégration FreezeReportPrompt | Direct | - |
| 7.3 | Test manuel parcours complet | Direct | - |
| 7.4 | Performance audit | `performance-optimizer` | Sonnet |
| 7.5 | Security audit final | `security-auditor` | Opus |

### Livrables

- Application intégrée et fonctionnelle

### Validation

- [ ] Parcours utilisateur complet OK
- [ ] Performance OK
- [ ] Security OK
- [ ] Code review finale

---

## Phase 8 : Finalisation

### Tâches

| # | Tâche | Agent | Modèle |
|---|-------|-------|--------|
| 8.1 | `pnpm check` - Vérification types | Direct | - |
| 8.2 | `pnpm lint` - Linting | Direct | - |
| 8.3 | `pnpm build` - Build production | Direct | - |
| 8.4 | Documentation feature | `documentation-writer` | Sonnet |
| 8.5 | Commit final | `commit-manager` | Sonnet |

### Livrables

- Build sans erreur
- Documentation complète
- Commit structuré

### Validation

- [ ] 0 erreurs TypeScript
- [ ] 0 erreurs ESLint
- [ ] Build OK
- [ ] Documentation à jour

---

## Récapitulatif des fichiers à créer/modifier

### Nouveaux fichiers (20)

```
supabase/migrations/
└── YYYYMMDDHHMMSS_create_bug_reports.sql

src/lib/
├── server/
│   ├── validation/
│   │   └── bug-reports.ts
│   └── bug-report-export.ts          # Générateur export Claude Code
├── types/
│   └── bug-reports.ts
├── utils/
│   └── freezeDetection.ts
├── stores/
│   └── activityStore.svelte.ts
└── components/bug-reports/
    ├── BugReportFAB.svelte            # Bouton flottant avec icône fourmi 🐜
    ├── BugReportDialog.svelte
    ├── BugReportCard.svelte
    ├── BugReportStatusBadge.svelte
    ├── BugReportList.svelte
    ├── FreezeReportPrompt.svelte
    └── ExportClaudeCodeButton.svelte  # Export pour Claude Code

src/routes/
├── api/bug-reports/
│   ├── +server.ts
│   └── [reportId]/
│       ├── +server.ts
│       ├── screenshot/
│       │   └── +server.ts
│       └── export/
│           └── +server.ts             # Export Markdown
└── (protected)/dashboard/
    ├── bug-reports/
    │   ├── +page.svelte
    │   └── +page.server.ts
    └── admin/bug-reports/
        ├── +page.svelte
        └── +page.server.ts
```

### Fichiers à modifier (5)

```
src/lib/types/database.ts          # Ajouter types bug_reports
src/lib/server/notifications.ts    # Ajouter notifyAdminsOfNewBugReport
src/hooks.client.ts                # Init freeze detection
src/routes/(protected)/+layout.svelte  # Ajouter FAB
docs/architecture/database-schema.md   # Documenter table
```

---

## Format Export Claude Code

L'export génère un fichier Markdown structuré optimisé pour Claude Code :

```markdown
# Bug Report: [Titre du rapport]

## Informations générales
- **ID**: `uuid`
- **Catégorie**: bug | content | ux | feature | other
- **Sévérité**: low | medium | high | critical
- **Statut**: pending | acknowledged | in_progress | resolved
- **Créé le**: YYYY-MM-DD HH:mm:ss
- **Auteur**: Nom (rôle)

## Description du problème
[Description complète fournie par l'utilisateur]

## Contexte technique

### Page concernée
- **URL**: /chemin/vers/page
- **Viewport**: 1920x1080
- **Navigateur**: Chrome 120 (Windows)

### Erreurs récentes (5 dernières minutes)
| Timestamp | Type | Message | Fichier | Ligne |
|-----------|------|---------|---------|-------|
| HH:mm:ss | client_js | TypeError: Cannot read... | src/lib/... | 42 |

### Stack traces
```
TypeError: Cannot read property 'foo' of undefined
    at handleClick (src/lib/components/Example.svelte:42:15)
    at HTMLButtonElement.onclick (src/routes/+page.svelte:18:9)
```

### Freezes détectés
| Timestamp | Durée | Type |
|-----------|-------|------|
| HH:mm:ss | 2500ms | long_task |

### Actions utilisateur récentes
1. `HH:mm:ss` - click sur `#submit-button`
2. `HH:mm:ss` - input dans `.search-field`
3. `HH:mm:ss` - navigation vers `/dashboard`

### Web Vitals
- LCP: 2.1s (good)
- FID: 45ms (good)
- CLS: 0.05 (good)
- INP: 180ms (needs improvement)

## Fichiers potentiellement concernés
Basé sur les stack traces et l'URL :
- `src/lib/components/Example.svelte:42`
- `src/routes/+page.svelte:18`
- `src/routes/api/example/+server.ts`

## Commandes utiles
```bash
# Rechercher les occurrences de l'erreur
grep -r "Cannot read property" src/

# Ouvrir les fichiers concernés
code src/lib/components/Example.svelte src/routes/+page.svelte
```

## Screenshot
[Lien vers le screenshot si disponible]
```

---

## Paramètres confirmés

| Paramètre | Valeur |
|-----------|--------|
| Seuil freeze → prompt | 15 secondes |
| Seuil freeze → rapport silencieux | 30 secondes |
| Rétention actions | 20 dernières |
| Rétention freezes | 15 minutes |
| Rétention erreurs (serveur) | 5 minutes |
| Persistence client | sessionStorage |
| Max screenshot | 5 Mo |
| Formats screenshot | jpeg, png, gif, webp |

---

## Notes importantes

1. **TDD** : Les tests seront écrits AVANT l'implémentation pour chaque phase
2. **Pas de lint/check intermédiaire** : Uniquement en Phase 8
3. **Documentation de progression** : Ce fichier sera mis à jour après chaque phase
4. **Agents ne lancent PAS** de commandes build/lint/format/check

---

## Progression

| Phase | Statut | Date | Notes |
|-------|--------|------|-------|
| 0 - Spec TDD | ✅ Validée | 2025-12-29 | 40 comportements, icône fourmi, export Claude Code |
| 1 - Database | ⬜ À faire | - | - |
| 2 - Validation | ⬜ À faire | - | - |
| 3 - API | ⬜ À faire | - | - |
| 4 - Freeze detection | ⬜ À faire | - | - |
| 5 - Composants UI | ⬜ À faire | - | - |
| 6 - Pages | ⬜ À faire | - | - |
| 7 - Intégration | ⬜ À faire | - | - |
| 8 - Finalisation | ⬜ À faire | - | - |
