---
couvre:
  - 'src/routes/(protected)/organisation/*'
  - 'src/routes/(protected)/organisation/pomodoro/**'
  - 'src/lib/stores/pomodoro/**'
  - 'src/routes/api/documents/**'
  - 'src/lib/components/documents/**'
  - 'src/lib/server/documents/**'
  - src/lib/server/validation/documents.ts
---

# Organisation (pomodoro) et documents du professeur

> Vérifié contre le code le 2026-10-13 (commit ba2469d92).
> Sujets voisins, cités et non recopiés : le kanban de `/organisation` est dans
> [outils-prof.md § 4](outils-prof.md) ; le RAG (`src/lib/server/rag/`), qui reçoit les documents
> déposés, dans [tuteur-ia.md](tuteur-ia.md) ; le dépôt des documents de **chapitre** et leur
> lecture par lien sans compte dans [cours-et-chapitres.md](cours-et-chapitres.md) ; `requireAuth`
> et les rôles dans [auth.md](auth.md).

## À quoi ça sert

La zone réunit trois morceaux sans lien fonctionnel entre eux :

1. **`/organisation`** : une section à sous-navigation (Kanban / Pomodoro). Le kanban est décrit
   ailleurs ; ici, le layout et le **minuteur pomodoro**, entièrement côté navigateur.
2. **Les documents du tuteur IA** (`rag_documents`) : le professeur dépose un PDF, un TXT ou un MD
   dont le texte est extrait puis indexé pour le Père Ubu. Page `/dashboard/teacher/documents`
   (hors zone), composants `src/lib/components/documents/`, routes `GET`/`PATCH`/`DELETE
/api/documents` et `POST /api/documents/upload`.
3. **La lecture d'un document de chapitre** (`chapter_documents`, fichier dans le bucket
   `chapter-documents`) : `GET /api/documents/[id]`, la seule route du dossier qui touche des
   fichiers stockés. Malgré le dossier commun, elle n'a rien à voir avec le n° 2.

## Carte du code

| Fichier                                               | Rôle                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/routes/(protected)/organisation/+layout.svelte`  | Fil d'Ariane (segments UUID masqués) et sous-navigation ; tableau `tools` à étendre.                |
| `src/routes/(protected)/organisation/+page.server.ts` | Redirection 307 vers `/organisation/kanban`.                                                        |
| `src/routes/(protected)/organisation/pomodoro/`       | Page (titre d'onglet « MM:SS — phase »), `PomodoroDisplay`, `PomodoroControls`, `PomodoroSettings`. |
| `src/lib/stores/pomodoro/logic.ts`                    | Machine à états **pure** (temps passé en `now`), bornes des réglages, schéma Zod de stockage.       |
| `src/lib/stores/pomodoro/pomodoro.svelte.ts`          | Singleton `pomodoroStore` : état réactif, boucle de 250 ms, `localStorage`, synchro d'onglets.      |
| `src/lib/stores/pomodoro/broadcast.ts`                | `BroadcastChannel` `chiphre:pomodoro:v1` ; ignore ses propres messages (`getTabId`).                |
| `src/lib/stores/pomodoro/effects.ts`                  | Cloche synthétisée (Web Audio, aucun fichier son), notifications du navigateur.                     |
| `src/lib/stores/pomodoro/PomodoroEffects.svelte`      | Seul consommateur des transitions : cloche, notification, région `aria-live`.                       |
| `src/lib/components/documents/`                       | `DocumentManager` (liste paginée + onglet de dépôt), `DocumentUploader`, `DocumentCard`.            |
| `src/routes/api/documents/+server.ts`                 | Lister, modifier (`PATCH`), supprimer les documents du tuteur.                                      |
| `src/routes/api/documents/upload/+server.ts`          | Dépôt multipart → extraction du texte → `indexDocument` (`src/lib/server/rag/processor.ts`).        |
| `src/lib/server/documents/pdf-extractor.ts`           | `extractText` : `pdf-parse` (import dynamique) pour le PDF, nettoyage du MD et du texte brut.       |
| `src/lib/server/validation/documents.ts`              | Schémas Zod du dépôt, du fichier, de la liste, de la modification, de la suppression.               |
| `src/routes/api/documents/[id]/+server.ts`            | Sert un document de chapitre depuis le storage (en ligne ou en pièce jointe).                       |

## Le pomodoro

- **Accès** : tout utilisateur connecté (garde du groupe `(protected)`), élève compris ; aucune
  vérification de rôle. Aucun menu n'y mène : on y arrive par la sous-navigation de
  `/organisation`, elle-même atteinte par « Suivi du site » (menu admin) ou par l'adresse.
- **Aucune donnée serveur.** L'état vit dans le `localStorage` du navigateur, clé
  `chiphre:pomodoro:v1` (`STORAGE_KEY`), relu au démarrage et validé par Zod (`deserialize`) : une
  valeur forgée ou périmée est ignorée, les réglages sont rebornés par `clampSettings`.
- **Phases** : travail → pause courte, et pause longue après `pomodorosUntilLongBreak` pomodoros.
  Bornes (`LIMITS`) : travail 1-90 min (25), pause courte 1-30 (5), pause longue 1-60 (15), 2 à 8
  pomodoros par cycle (4). Son activé, notifications désactivées par défaut.
- **Temps absolu** : `endsAt` est une date (epoch ms), pas un compte à rebours ; après une veille
  ou un rechargement, `tick` rattrape **une seule** transition, jamais plusieurs d'affilée.
- **Compteur du jour** (`todayCount`) remis à zéro au changement de date locale ; « Réinitialiser »
  remet le cycle à zéro, pas le compteur du jour.
- **Hors de la page** : `PomodoroEffects` est monté dans `src/routes/(protected)/+layout.svelte`,
  et le singleton tourne tant que l'onglet est ouvert : la cloche sonne sur n'importe quelle page
  connectée. Plusieurs onglets restent d'accord par `BroadcastChannel` ; seul l'onglet d'origine
  sonne et notifie, tous annoncent la phase au lecteur d'écran.

## Les documents du tuteur IA (`rag_documents`)

**Qui fait quoi.** Toutes les routes exigent `requireAuth` puis le rôle `teacher` ou `admin`
(sinon 403). Les écritures passent par `locals.supabase` : la RLS de l'appelant s'applique.
Policies (`20260616220000_baseline_schema.sql`, `20260620090000_drop_class_teacher_id_mono_teacher.sql`) :

| Opération | Policy                                           | Qui                                                                      |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| SELECT    | « Teachers can read own and system documents »   | ses documents, et les documents système (`teacher_id` NULL)              |
| SELECT    | « Students can read system and class documents » | tout membre d'une classe (`class_members`) : documents de tout `teacher` |
| INSERT    | « Teachers can create own documents »            | `teacher_id = auth.uid()` et rôle `teacher` ou `admin`                   |
| UPDATE    | « Teachers can update own documents »            | les siens seulement                                                      |
| DELETE    | « Teachers can delete own documents »            | les siens ; `rag_chunks` suit en cascade                                 |

Aucune policy ne donne à l'admin les documents d'un autre (voir Écarts connus). `anon` n'a aucun
droit sur la table (`20261001170000_anon_retrait_droits_herites.sql`).

**Pas de fichier stocké.** Le dépôt ne garde **que le texte extrait** : `rag_documents.content`
plus les fragments de `rag_chunks`. Le fichier d'origine n'est écrit ni dans un bucket ni ailleurs ;
`metadata` garde son nom, son type, sa taille, le nombre de pages et la description.

**Validation et limites** (`src/lib/server/validation/documents.ts`) :

- fichier : `application/pdf`, `text/plain`, `text/markdown`, `text/x-markdown` (type MIME déclaré
  par le navigateur), **10 Mo** au plus (`MAX_FILE_SIZE`, répété dans la route, et `maxSizeMB` dans
  `DocumentUploader`) ;
- métadonnées (`documentUploadSchema`) : titre 1-200 caractères, description ≤ 1 000, 15 niveaux
  (`gradeCodeSchema`), 10 thèmes libres de 50 caractères ; sans métadonnées, le titre est le nom
  du fichier ;
- texte extrait de moins de 50 caractères → 400 « trop peu de texte » ;
- liste (`documentListQuerySchema`) : `limit` ≤ 100 (20 par défaut), `search` ≤ 200 (filtre `ilike`
  sur le titre), `enabledOnly` vrai par défaut ;
- suppression : `documentId` UUID (`documentDeleteSchema`).

**Vérification de propriété** : `PATCH` et `DELETE` relisent `teacher_id` avant d'agir pour un
`teacher` (403 « réservée à l'auteur du document ») ; l'admin saute cette relecture.

## La lecture d'un document de chapitre (`GET /api/documents/[id]`)

- **Entrée** : `id` validé comme UUID ; `?download` force la pièce jointe.
- **Garde dans la route** : connecté (`locals.profile`, sinon 401). Admin et professeur : accès
  (mono-professeur, tout chapitre est le sien). Élève : chapitre `is_visible` **et** adhésion
  `active` à la classe du chapitre (`class_members.status`), sinon 403.
- **Garde en base** : la ligne est lue avec la RLS de l'appelant. Pour un élève, « Students can view
  documents of visible chapters » (`20260915140000_chapter_content_publication.sql`) exige en plus
  `published_at <= now()` et `is_class_student` (adhésion active depuis
  `20260915220000_is_class_student_active_only.sql`) : un document non publié rend 404.
- **Fichier** : bucket **privé** `chapter-documents` (`public = false` dans `supabase/seed.sql`),
  25 Mo au plus (`20260915200000_chapter_documents_25mb.sql`), chemin `chapters/<chapter_id>/…`
  ou, pour un élément de modèle relié par le chapitre (ADR 0029), `templates/<template_id>/…`.
  Depuis l'étape 3b, le téléchargement passe par le **client service**, APRÈS la lecture de la
  ligne sous RLS ci-dessus — c'est elle, la garde : l'élève n'a, à dessein, aucune règle de
  stockage sur `templates/…`. Le chemin téléchargé est toujours celui de la ligne lue, borné à
  `chapters/` ou `templates/` (sinon 404). Une ligne de modèle (sans chapitre) n'est lisible que
  du professeur. La règle de stockage élève de `chapters/…` (« Students can read visible chapter
  documents », production seulement, sans test de `published_at`) n'est donc plus nécessaire à
  cette route ; son retrait viendra à part (journal de la refonte, Q6).
- **Type servi** : seuls PDF, PNG, JPEG, GIF et WebP s'affichent en ligne ; tout autre
  `mime_type` part en `application/octet-stream` et en pièce jointe (finding M6 : un HTML ou un
  SVG servi en ligne s'exécuterait sur notre origine). Un document `google_drive` rend 400.
- `Cache-Control: private, no-store` : un document dépublié ne reste pas lisible dans le cache du
  navigateur de l'élève.

## Invariants

- Le pomodoro n'écrit **rien** côté serveur ; un nouveau réglage passe par `LIMITS`,
  `clampSettings` **et** `SettingsSchema` (sinon un ancien stockage le rejette entier).
- Une seule consommatrice des transitions (`PomodoroEffects`) ; la page n'en draine aucune.
- Toute nouvelle route sous `api/documents` revalide le rôle elle-même : le groupe `api/` n'a pas
  de garde de layout.
- La liste blanche des types servis en ligne est la même que celle de
  `src/routes/(public)/cours/[token]/document/[id]/+server.ts` ; elles bougent ensemble.

## Comment étendre

- **Nouvel outil d'organisation** : un dossier sous `src/routes/(protected)/organisation/`, une
  entrée dans `tools` du layout, et une ligne au `couvre:` de la doc qui le décrit.
- **Nouveau format déposable** : `ALLOWED_MIME_TYPES`, `acceptedTypes` de `DocumentUploader`, et
  une branche dans `extractText`.

## Tests

- `src/lib/stores/pomodoro/__tests__/logic.test.ts` : la machine à états (réglages, actions,
  `tick`, compteur du jour, sérialisation, rejet des états incohérents).
- **Aucun test** des routes `api/documents`, de l'extracteur ni des composants de documents.
  `tests/integration/anon-option-b.test.ts` vérifie seulement que `anon` ne lit pas
  `rag_documents` ; `tests/integration/chapter-documents-size-limit.test.ts` porte sur le plafond.

## Écarts connus

1. **L'admin croit tout voir et tout gérer, la RLS ne le suit pas.** `GET` annonce « admins see
   all » mais aucune policy SELECT ne lui ouvre les documents d'un autre professeur. Pire, sur un
   document d'autrui, `PATCH` et `DELETE` sautent la vérification de propriété, la RLS refuse en
   silence (0 ligne, pas d'erreur : `deleteDocument`, `enableDocument`, `disableDocument` et
   l'`update` n'utilisent pas `.select()`) et la route répond **succès**. Cas improbable
   aujourd'hui (l'admin ne voit pas ces documents), mais la réponse ment.
2. **Un document désactivé disparaît de l'écran.** `DocumentManager` ne passe pas `enabledOnly` ;
   le schéma vaut `true` par défaut ; après « Désactiver », le rechargement le retire de la liste,
   et rien ne permet de le réactiver ni de le supprimer depuis l'interface.
3. **La policy élève de `rag_documents` ne regarde pas le statut** de l'adhésion : un élève archivé
   (`class_members.status` ≠ `active`) lit encore les documents des professeurs, et le tuteur peut
   les lui citer. Hors zone (accès du RAG), à trancher avec [tuteur-ia.md](tuteur-ia.md).
4. **Policy storage élève absente du baseline local** (relevé dans
   `20260915220000_is_class_student_active_only.sql`) : en local, un élève qui ouvre un document
   de chapitre reçoit 500 ; aucun test ne peut exercer le chemin de production.
5. `PATCH` ne valide pas `documentId` comme UUID (seulement `typeof string`) ; `description`
   est acceptée par `documentUpdateSchema` mais jamais écrite ; `enabledForRag` du dépôt est
   ignoré (`indexDocument` force `true`, déjà noté dans tuteur-ia.md).
6. `extractText` : le test `mimeType.endsWith('.md')` ne peut jamais servir (un type MIME n'a pas
   d'extension) ; `text/x-markdown` est traité comme du texte brut.
7. L'en-tête de `api/documents/[id]/+server.ts` annonce des chemins `/view` et `/download` qui
   n'existent pas : c'est `?download`.
8. Bouton « Modifier » de `DocumentCard` désactivé (« bientôt disponible ») ; suppression confirmée
   par `confirm()` natif.
9. Pomodoro : la clé `localStorage` n'est pas propre au compte. Sur un ordinateur partagé, le compte
   suivant hérite du minuteur et du compteur du jour (aucune donnée personnelle). Le commentaire
   de `tick` renvoie à un « design doc » introuvable dans le dépôt.
