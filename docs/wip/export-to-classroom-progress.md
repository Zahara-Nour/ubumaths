# Export Whiteboard vers Google Classroom - Progression

## Statut actuel

**Phase**: 5 - Intégration UI (complète)
**Dernière mise à jour**: 2026-01-12

---

## Phases complétées

### Phase 1: Mise à jour OAuth Scopes ✅

- Commit: `d91db8e8`
- Modification: `classroom.courseworkmaterials.readonly` → `classroom.courseworkmaterials`

### Phase 2: Implémenter createCourseWorkMaterial() ✅

- Commit: `a7722a65`
- Fichiers: schemas.ts, google.ts, classroom-api.ts
- Validation Zod, méthode POST, gestion erreurs

### Phase 3: Endpoint API d'export ✅

- Commit: `fc7c2172`
- Fichier créé: `src/routes/api/whiteboard/export-to-classroom/+server.ts`
- Security audit passé: validation PDF magic bytes, course_state ACTIVE check

### Phase 4: Composant Dialog ✅

- Fichier créé: `src/lib/whiteboard/components/ExportToClassroomDialog.svelte`
- MySelect pour cours et rubriques
- Svelte 5 runes, gestion erreurs, état de succès

### Phase 5: Intégration UI ✅

- WhiteboardToolbar: bouton "Publier sur Classroom" (visible si Google connecté)
- Dialog intégré avec bind:open

---

## Décisions prises

1. **État par défaut**: PUBLISHED (les élèves voient le material immédiatement)
2. **Limite PDF**: 15MB max (20MB après encodage base64)
3. **shareMode**: VIEW par défaut (lecture seule pour les élèves)
4. **Dossier Drive**: "UbuMaths Whiteboards"
5. **courseId**: UUID interne (pas google_course_id)
6. **Bouton visible**: Uniquement si Google connecté

---

## Fichiers modifiés/créés

| Fichier                                                        | Action     | Phase |
| -------------------------------------------------------------- | ---------- | ----- |
| `src/lib/server/google/oauth.ts`                               | Modifié ✅ | 1     |
| `src/lib/server/google/schemas.ts`                             | Modifié ✅ | 2     |
| `src/lib/types/google.ts`                                      | Modifié ✅ | 2     |
| `src/lib/server/google/classroom-api.ts`                       | Modifié ✅ | 2     |
| `src/routes/api/whiteboard/export-to-classroom/+server.ts`     | Créé ✅    | 3     |
| `src/lib/whiteboard/components/ExportToClassroomDialog.svelte` | Créé ✅    | 4     |
| `src/lib/whiteboard/components/WhiteboardToolbar.svelte`       | Modifié ✅ | 5     |

---

## Prochaines étapes

1. Phase Finale: Quality checks (lint, check:fast, format)
2. Commit final
