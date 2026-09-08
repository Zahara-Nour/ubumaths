# Référencement des ressources — état des lieux et proposition d'unification

> Statut : **phase 1 en prod. Phases 2-4 prêtes, EN ATTENTE DE LA MIGRATION PROD** (2026-09-08).
> Date : 2026-09-04 (analyse), 2026-09-08 (décisions + phase 1). Origine : question posée en marge du chantier « cahier de texte partageable ».
> Tous les constats ci-dessous ont été **vérifiés dans le code** le 2026-09-04 (branche `fix/emploi-du-temps-semaine-ecole`). Les références `fichier:ligne` sont à revérifier si le code a bougé depuis.

---

## 1. Diagnostic

Le référencement n'est pas fragmenté par manque d'implémentation : **trois questions différentes sont traitées comme une seule.**

1. **Adressage** — comment je nomme une ressource, et où est son URL ?
2. **Lien** — cet objet-ci utilise cette ressource-là.
3. **Classification** — de quoi parle cette ressource ?

Un système unifié donne **une réponse par question**, pas une table pour tout.

---

## 2. État des lieux

### 2.1 Adressage — aucune source de vérité

Chaque endroit qui a besoin d'une URL la recalcule : `InternalLink.svelte:57-70` a son `switch`, la navigation a le sien, `src/hooks.server.ts:62-110` rattrape les anciens chemins au cas par cas.

Conséquence directe : les liens internes `[[type:uuid|label]]` pointent vers des routes qui n'existent pas (annexe B). Le jour où `exercices` est passé sous `contenu/`, rien ne pouvait le signaler.

Seul `exercises` porte un `slug` (`idx_exercises_slug`, unique partiel). Tout le reste s'adresse par uuid. (`game_achievements` / `game_challenges` ont aussi un slug, mais ce ne sont pas des ressources de contenu.)

### 2.2 Lien — trois patterns coexistent

| Pattern                                         | Exemples                                                          | Intégrité     |
| ----------------------------------------------- | ----------------------------------------------------------------- | ------------- |
| Jonction dédiée par couple conteneur × type     | `chapter_exercises`, `chapter_documents`, `worksheet_exercises`   | ✅ FK réelles |
| Arc exclusif (une FK nullable par type + CHECK) | `journal_entry_activities`                                        | ✅ FK réelles |
| Référence libre non contrainte                  | `moderation_logs(target_type, target_id)`, `[[type:uuid]]` inline | ❌ aucune     |

**Le pattern 1 explose en combinatoire** : conteneurs (chapitre, séance, fiche, deck SRS, évaluation…) × ~11 types de contenu (annexe A).

**Le pattern 2 ne passe pas l'échelle non plus.** La migration `20260904093000_journal_entry_question_activities.sql` en est la démonstration : passer de 3 à 5 types a coûté 2 colonnes + 2 contraintes réécrites, et elle documente elle-même le piège `ON DELETE SET NULL` qui viole le CHECK de forme (supprimer un exercice référencé par une séance échoue).

### 2.3 Classification — cinq vocabulaires

| Vocabulaire                                        | Porté par                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Catalogue `tags` + jonction                        | `exercise_tags` (normalisé par `20260509094828`)                                       |
| Catalogue `python_tags` + jonction                 | `python_exercise_tags` — **schéma identique à `tags`**                                 |
| Quadruplet thème / domaine / sous-domaine / niveau | `question_templates` (+ index unique de catégorie)                                     |
| `text[]` libre, hors catalogue                     | `constructions`, `worksheets`, `parody_evaluations`, `message_templates`, `error_logs` |
| Points de programme (référentiel curriculum)       | `exercise_curriculum_points`, `journal_entry_points`                                   |

Plus `grades[]` disséminé, et `question_template_skills` pour les compétences. Le catalogue est alimenté par auto-création à la volée (`src/lib/server/tags-resolution.ts`).

### 2.4 Le contenu inline (ubumark) — écrit, jamais branché

L'AST prévoit tout (`src/lib/ubumark/types/ast.ts`) :

- `#hashtag` → `HashtagNode` (ligne 113)
- `@mention` → `MentionNode` (ligne 130)
- `[[type:uuid|label]]` → `InternalLinkNode` (ligne 180), types `chapter | document | exercise | assessment`

Parser, AST et composants de rendu sont complets. Mais :

- **Les hashtags ne référencent rien.** L'autocomplétion puise dans une liste de ~60 chaînes codées en dur (`src/lib/stores/hashtags.svelte.ts:19`), sans lien avec la table `tags`. Le rendu accepte un callback `onHashtagClick` qu'**aucun appelant ne passe** (grep sur tout `src/`). Aucune page de recherche par tag n'existe.
- **Les liens internes mènent à des 404** (annexe B), il n'existe **aucune UI d'insertion** de `[[…]]`, et la syntaxe n'apparaît nulle part dans le repo hors commentaires de doc et tests. Elle n'a donc jamais servi.

---

## 3. Proposition

### Axe 1 — Adressage : un résolveur unique

Le moins cher, et celui qui débloque le reste.

```ts
// $lib/resources/registry.ts
RESOURCE_KINDS = {
  exercise: { route: (id, role) => `/dashboard/${role}/contenu/exercices/${id}`, icon, label },
  …
}
resolveResource(kind, id) → { label, url, icon, visibility }
```

Tout consommateur (InternalLink, cahier de texte, recherche, chapitres) passe par là.

**Avec un test qui vérifie que chaque route déclarée correspond à une route SvelteKit existante.** C'est le point structurant : ce test aurait attrapé les 4 liens morts le jour de la restructuration, et c'est lui qui empêche la rechute.

Côté base, une **vue `public.resources`** en `UNION ALL` sur les tables de contenu, exposant `(kind, id, title, slug, is_public, owner_id, updated_at)`. Zéro migration de données, zéro risque, jamais désynchronisée. Elle sert à résoudre une référence connue et à alimenter une recherche globale.

> Écarté : un vrai registre en table. Il demanderait ~11 triggers et introduirait la désynchronisation comme nouveau mode de panne, pour un bénéfice (FK vers le registre) dont on n'a pas besoin.

### Axe 2 — Lien : ne pas tout polymorphiser

La tentation est une table `resource_links(source_kind, source_id, target_kind, target_id, role)`. Elle unifie tout et fait perdre **toutes les FK**, donc l'intégrité, sur des données de production. Mauvais échange.

Ligne proposée : **l'intégrité suit l'enjeu.**

- Référence morte = fonctionnalité cassée (couverture du programme, devoirs assignés, contenu d'une fiche) → **jonction dédiée avec FK**, comme aujourd'hui. On n'y touche pas.
- Référence morte = bénigne (mention `[[…]]` dans du texte libre) → **pas de table du tout**. La référence vit dans le texte, le résolveur la rend au mieux, un lien mort s'affiche en grisé plutôt que de mener à un 404.

Ce qui unifie alors n'est pas le stockage mais **la lecture** : une vue `resource_links` en UNION des jonctions existantes, pour répondre à « qu'est-ce qui référence cet exercice ? » sans que l'appelant connaisse les 8 jonctions.

### Axe 3 — Classification : un catalogue, deux niveaux

- **Contrôlé** : le référentiel curriculum (Thème → Item → Point). Vocabulaire structurant, sert la couverture. **Il ne fusionne avec rien.**
- **Libre** : un seul catalogue `tags` + une jonction polymorphe `resource_tags(resource_kind, resource_id, tag_id)` remplaçant `exercise_tags`, `python_exercise_tags` et les colonnes `text[]`. `python_tags` a exactement le même schéma que `tags` → fusion mécanique. **Kanban reste dehors** : c'est de l'organisation, pas du contenu.
- **`#hashtag` = l'écriture inline d'un tag** : autocomplétion depuis le catalogue au lieu de la liste en dur, clic → recherche filtrée. C'est là que le système actuel cesse d'être décoratif.
- **`grades[]` reste une dimension à part**, pas un tag.

---

## 4. Chemin de migration

Du moins risqué au plus engageant. Chaque phase a de la valeur seule.

1. **Résolveur + table de routes + test d'existence des routes.** Pas de DB. Répare `[[…]]`. ~1 PR.
2. **Vue `resources`** + recherche globale par-dessus.
3. **Catalogue de tags unifié** : `resource_tags`, migration des `text[]`, fusion `python_tags` → `tags`. Migration additive d'abord, nettoyage destructif **après** déploiement (cf. règle migrations du CLAUDE.md).
4. **Brancher `#hashtag`** sur le catalogue (autocomplétion DB + clic → recherche).
5. **UI d'insertion `[[…]]`** (sélecteur de ressource dans l'éditeur). Sans elle, la syntaxe restera inutilisée, comme depuis le début.

---

## 5. Décisions (prises le 2026-09-08)

### 5.1 Source de vérité : la liste structurée, et elle seule

`journal_entry_activities` reste la seule source de la couverture du programme. Le `[[…]]` inline est un **lien de navigation**, jamais un signal de couverture.

**Pourquoi** : un suivi ne vaut que si on peut le croire. Si la prose alimente la couverture, reformuler une phrase modifie silencieusement le suivi. Un chemin d'écriture, un endroit à réconcilier — d'autant que la réconciliation est déjà le point faible (la couverture `auto` n'est pas réconciliée à la suppression d'un exercice, cf. `20260904093000`).

**Pont ergonomique prévu, explicite** : à l'insertion d'un `[[exercise:…]]`, l'éditeur propose « ajouter aussi aux activités de la séance ? ». Un geste, pas une dérivation.

### 5.2 Tags : folksonomie normalisée

On garde l'auto-création. On ajoute une normalisation à l'écriture et une page de gestion.

**Pourquoi** : le vocabulaire contrôlé existe déjà — c'est le référentiel curriculum. Deux taxonomies rigides seraient une de trop. Et le prof est seul à taguer : le risque n'est pas la divergence entre contributeurs mais `algebre` / `algèbre` / `Algebre`, qui est un problème de données.

**Implémentation prévue** : colonne `slug` normalisée (sans accents, minuscules, kebab) + index UNIQUE ; autocomplétion depuis la base ; page de fusion / renommage / suppression.

### 5.3 Périmètre : 5 types

`exercise` · `question` · `assessment` · `chapter` · `document`.

**Pourquoi** : ce sont exactement les types que le cahier de texte référence déjà — l'usage a répondu à la question. Le registre est une table de constantes : ajouter un type coûtera cinq lignes. Candidats à la vague suivante : `worksheets`, `python_exercises`, `riddles`.

---

## 6. Phases livrées

### Phase 1 — registre d'adressage (PR #169, mergée)

`src/lib/resources/` (`registry.ts`, `kinds.ts`, `index.ts`) + `__tests__/registry.test.ts`, consommé par `InternalLink.svelte`.

Écart assumé par rapport au plan : les routes sont construites avec le **`resolve()` typé de SvelteKit** (`$app/paths`), pas par concaténation. Un identifiant de route qui n'existe plus devient une **erreur de compilation** — vérifié en cassant volontairement une route. Le test de correspondance avec les routes sur disque est conservé : il rattrape le retour à la concaténation, et il a été vérifié falsifiable.

- `question` a été ajouté au vocabulaire inline de l'ubumark, avec un test de synchronisation entre les deux listes.
- Une référence sans destination (un `document`, qui n'a pas de page ; un `chapter` lu hors de sa classe) s'affiche en texte inerte au lieu de mener à un 404.
- Table des routes **honnête sur les rôles** : le layout `/dashboard/teacher` refuse les admins (`+layout.server.ts:51`), donc aucun rôle n'hérite des routes d'un autre.
- `kinds.ts` a été extrait ensuite : le registre importe Lucide et `$app/paths`, qui n'ont rien à faire dans un schéma Zod serveur.

### Phase 2 — vue `resources` + recherche globale

Migration `20260908120000`. Vue `security_invoker = true` sur les 5 types, fonction `search_resources` (`SECURITY INVOKER`), API `GET /api/search` (Zod + `requireRoles` + rate limit), page `/dashboard/teacher/recherche`.

**Décisions produit** (David) : recherche **prof et admin uniquement**, sur **titres et métadonnées** — ni énoncés ni corrigés, pour que l'ouverture éventuelle aux élèves ne révèle jamais les solutions.

**16 tests d'intégration**, échec prouvé sans la migration (`PGRST205` / `PGRST202`).

Deux findings MEDIUM de `security-auditor`, corrigés et couverts par des tests :

- **F1** — `revoke ... from public` ne retire PAS l'entrée ACL de `anon`. Le baseline pose `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon` (`20260616220000:46144`), jamais neutralisé : le sweep de l'audit d'août ne couvrait que `ON FUNCTIONS`. C'est la **symétrie exacte** de la leçon d'août, retournée. → `revoke all on public.resources from anon;`
- **F2** — la RPC est appelable directement en `POST /rest/v1/rpc/...`, donc le `.max(100)` de Zod ne protégeait que la route. → bornes dans le corps SQL (longueur, cardinalité des types) + `rateLimit` sur l'API.

### Phase 3 — catalogue de tags unifié

Migration `20260908130000`, **additive**. `tags.slug` généré + index unique (normalisation sans accent / minuscules / kebab), jonction polymorphe `resource_tags`, reprise des données existantes, RLS. Double écriture branchée dans `tags-resolution.ts`.

⚠️ **Le nettoyage destructif n'est PAS fait** — supprimer `exercise_tags`, `python_tags` et les colonnes `tags text[]` fera l'objet d'une migration séparée, sur accord explicite. Les deux représentations coexistent, l'ancienne reste la source d'écriture.

Vérifié sur la prod avant application (l'index unique échouerait sur un doublon) : 86 tags sans collision, 57 `python_tags` tous distincts, aucun slug vide.

## 7. ⚠️ Ce qui reste à faire, et par qui

### Bloquant : appliquer les migrations en prod

Les trois migrations (`20260908120000`, `130000`, `140000`) sont **vérifiées en local** mais **pas appliquées en prod** : `supabase db push` demande le mot de passe de la base, indisponible en session non interactive (absent de `.env`, `.env.local` et de l'environnement).

**La PR ne doit pas être mergée avant.** `main` est la prod : sans la migration, `/dashboard/teacher/recherche` et `GET /api/search` appelleraient une RPC inexistante. Le reste dégrade proprement (le miroir de tags journalise et continue).

```bash
pnpm db:migrate     # applique les 3 migrations
pnpm db:types       # régénère database.ts, à committer
gh pr merge <n> --merge --delete-branch
```

Après `db:types`, les adaptateurs de typage temporaires de `src/lib/server/search.ts` et `src/lib/server/resource-tags.ts` peuvent être remplacés par les types générés — ils sont commentés comme tels.

### Décision produit en attente : qui peut créer un tag ?

Trouvé par `security-auditor` (MOYENNE-2), **préexistant**, non modifié par moi car il touche une policy hors périmètre :

- `tags_insert_authenticated ... WITH CHECK (true)` (baseline:42151) et `POST /api/tags` (`requireAuth` seul) laissent **tout compte connecté, élève inclus**, créer un tag ;
- `tags_select_public ... USING (true)` sans clause `TO` + `GRANT ALL ON TABLE tags TO anon` rendent le catalogue lisible **par les visiteurs anonymes**.

Autrement dit : un élève mineur peut publier du texte libre non modéré, immédiatement lisible sans authentification. La phase 3 n'aggrave pas la faille mais **en change la portée**, puisque `tags` devient le vocabulaire unique de toutes les ressources et l'entrée de la recherche.

Correctif d'une ligne, à valider :

```sql
drop policy "tags_insert_authenticated" on public.tags;
create policy "Teachers and admins create tags" on public.tags
  for insert to authenticated with check (public.is_teacher_or_admin());
```

### Dette connue, à honorer au moment du nettoyage destructif

Le miroir de `tags-resolution.ts` ne couvre que 2 des 5 types repris (`exercise`, `python_exercise`). Les colonnes `text[]` de `constructions`, `worksheets` et `parody_evaluations` continuent d'être écrites **sans miroir** : `resource_tags` diverge dès la première de ces ressources créée après le déploiement.

→ **La migration destructive devra rejouer un backfill complet et réconcilier**, jamais se fier à l'état du miroir.

Autre point relevé au passage, hors périmètre : les `upsert` de `presques-evaluations` utilisent `onConflict: 'name'` alors qu'**aucune contrainte unique n'existe sur `tags.name`** (le commentaire de colonne du baseline qui l'affirme est faux). Ces upserts échouent déjà en 42P10, avec un simple `console.warn`.

---

## Annexe A — Types de ressources (tables de contenu)

`exercises` · `question_templates` · `assessments` · `class_chapters` (+ `chapter_templates`) · `worksheets` (+ `worksheet_templates`) · `python_exercises` · `python_notebooks` · `riddles` · `constructions` · `rag_documents` (+ `chapter_documents`) · `parody_evaluations` · `srs_decks`

## Annexe B — Les 4 destinations mortes de `[[…]]`

`InternalLink.svelte:57-70` construit `/dashboard/{role}/{type}/{uuid}` :

| `[[…]]`      | Route générée                          | Réalité                                                                                                                                                                                      |
| ------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chapter`    | `/dashboard/{role}/cours/{uuid}`       | élève : `cours/[chapterId]` ✅ — prof : `cours/[classId]`, le paramètre est une **classe**, pas un chapitre ❌                                                                               |
| `document`   | `/dashboard/{role}/documents/{uuid}`   | prof : page d'index seule, pas de `[id]` ❌ — élève : aucune route ❌                                                                                                                        |
| `exercise`   | `/dashboard/{role}/exercices/{uuid}`   | inexistante pour les deux rôles ❌ — le vrai chemin est `/dashboard/teacher/contenu/exercices/[id]`, et la redirection `hooks.server.ts:70-76` ne rattrape que l'ancien `/exercises` anglais |
| `assessment` | `/dashboard/{role}/evaluations/{uuid}` | inexistante ❌                                                                                                                                                                               |

## Annexe C — Fichiers clés

- `src/lib/ubumark/types/ast.ts` — nœuds `HashtagNode` (113), `MentionNode` (130), `InternalLinkNode` (180)
- `src/lib/ubumark/parser/markdown-parser.ts` — parsing de `[[…]]` et `#tag`
- `src/lib/components/markdown/nodes/InternalLink.svelte` — rendu + calcul d'URL (à remplacer par le résolveur)
- `src/lib/stores/hashtags.svelte.ts` — liste de hashtags **codée en dur**
- `src/lib/extensions/hashtag-extension.ts` — extension TipTap (chips + autocomplétion)
- `src/lib/server/tags-resolution.ts` — noms ↔ ids + auto-création dans le catalogue
- `supabase/migrations/20260621100000_curriculum_tracking.sql` — modèle d'arc exclusif (`journal_entry_activities`) + référentiel curriculum
- `supabase/migrations/20260904093000_journal_entry_question_activities.sql` — le coût d'ajouter 2 types à un arc exclusif

## Annexe D — Hors périmètre, découvert au passage

> ✅ **RÉGLÉ le 2026-09-08 par une autre session** : les trois loaders utilisent désormais `.eq('status', 'published')` et la migration `20260908090000_automaths_anon_read_published_templates.sql` ouvre les templates publiés aux anonymes, avec son test d'intégration. Ce qui suit est conservé pour la trace du diagnostic.

**`/automaths` renvoyait 500 en production, pour tous les rôles, depuis le 2025-10-30.** Le commit `90e58e967` (« remove Redis completely ») a remplacé `.eq('status', 'published')` par `.eq('is_published', true)` — colonne inexistante sur `question_templates`. Même bug dans les trois loaders : `automaths/+page.server.ts:35`, `automaths/panier/+page.server.ts:12`, `automaths/test/+page.server.ts:15`.

Deux points liés :

- Avant ce commit, l'accès **anonyme** aux questions fonctionnait par un bug : le cache Redis avait une clé globale partagée entre visiteurs, donc un prof connecté remplissait le cache et l'anonyme suivant lisait son contenu — RLS court-circuitée. Il n'a jamais existé de policy anon sur `question_templates`.
- `/automaths/test?mode=…&categories=…` est bien un lien public partageable vers une série de questions (l'URL encode la sélection, `automaths/panier/+page.svelte:156-172`). Le bouton « Partager / Générer un lien » du panier est en revanche un stub (`alert()`, `panier/+page.svelte:280-285`).

Ouvrir la banque de questions publiées à l'anon (policy `status = 'published'`) est **décidé sur le principe** mais non planifié. À noter : le mode test s'auto-corrige dans le navigateur, donc les réponses parviennent au client de toute façon — une vue à colonnes restreintes ne protégerait rien.
