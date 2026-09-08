-- ============================================================================
-- Création de tags réservée au prof/admin + deux résidus d'ACL
-- ============================================================================
-- QUESTION D'ACCÈS : **quelqu'un PERD un accès, personne n'en gagne.** Les élèves
-- ne peuvent plus créer de tag. La lecture du catalogue ne change pas.
--
-- Pourquoi : `tags_insert_authenticated` porte un `WITH CHECK (true)` pour tout
-- compte connecté, et `tags_select_public` s'applique au pseudo-rôle PUBLIC.
-- Autrement dit, un élève mineur peut publier du texte libre non modéré,
-- immédiatement lisible par un visiteur anonyme. C'est antérieur à ce chantier,
-- mais la phase 3 en a élargi la portée : `tags` est devenu le vocabulaire de
-- TOUTES les ressources et l'entrée de la recherche.
--
-- Vérifié avant d'écrire, pour ne casser aucun usage réel :
--   - zéro tag ATTRIBUABLE à un élève. Nuance importante : 78 des 140 lignes ont
--     `created_by NULL` (seeds, et surtout la reprise de `python_tags` en §3b de
--     20260908130000, qui n'insère que `name`). La provenance de celles-là est
--     perdue — on ne peut donc pas prouver « zéro », seulement « aucune trace ».
--   - `TagBadgeSelector` est présent sur cinq surfaces prof (exercices new/[id],
--     worksheets new/[id] via MetadataCards, presques-évaluations) plus la page
--     publique EN CONSULTATION (`restrictTo` y met `canCreateTag` à false).
--     Toutes les surfaces de création sont derrière une garde prof.
--
-- ROLLBACK :
--   drop policy "Teachers and admins create tags" on public.tags;
--   create policy "tags_insert_authenticated" on public.tags
--     for insert to authenticated with check (true);
--   grant execute on function public.tag_slug(text) to anon;
--   grant select on public.resources to authenticated;  -- (TRUNCATE ne se restaure pas, et tant mieux)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Créer un tag devient un geste d'enseignant
-- ---------------------------------------------------------------------------
-- La lecture reste inchangée : un nom de tag n'a jamais été sensible, et la page
-- publique des presques-évaluations s'en sert pour filtrer.
drop policy if exists "tags_insert_authenticated" on public.tags;

drop policy if exists "Teachers and admins create tags" on public.tags;
create policy "Teachers and admins create tags"
	on public.tags for insert
	to authenticated
	with check (public.is_teacher_or_admin());

-- Même motif que `resource_tags` (20260908130000) : le `ALTER DEFAULT PRIVILEGES
-- ... GRANT ALL ON TABLES` du baseline donne `ALL` à `anon` ET `authenticated`,
-- TRUNCATE compris — et TRUNCATE IGNORE la RLS. Durcir la vue `resources` (§2)
-- sans durcir la table qui porte réellement les données aurait appliqué
-- l'invariant là où il ne sert à rien, et pas là où il a du sens.
revoke all on public.tags from public, anon, authenticated;
grant select on public.tags to anon, authenticated;
grant insert, delete on public.tags to authenticated;

comment on table public.tags is
	'Catalogue unique des tags de contenu. Lecture ouverte (y compris anonyme, pour les pages publiques) ; création réservée au prof/admin depuis 20260908160000 — un élève ne publie pas de texte libre lisible sans compte.';

-- `tags_delete_own` (`created_by = auth.uid()`) devenait du bois mort qui
-- contredit l'intention : un élève ayant créé un tag avant cette migration
-- pourrait encore le supprimer, ce qui CASCADE sur `resource_tags` et détruirait
-- des associations posées par le prof. Si créer est un geste d'enseignant,
-- supprimer l'est aussi.
drop policy if exists "tags_delete_own" on public.tags;

drop policy if exists "Teachers and admins delete tags" on public.tags;
create policy "Teachers and admins delete tags"
	on public.tags for delete
	to authenticated
	using (public.is_teacher_or_admin());

-- ---------------------------------------------------------------------------
-- 1bis. Même traitement pour le catalogue Python
-- ---------------------------------------------------------------------------
-- `python_tags` restait ouvert à tout compte connecté. Moins exposé (sa lecture
-- est réservée aux comptes connectés, pas à `anon`), mais c'est toujours du texte
-- libre écrit par un mineur et lu par ses pairs mineurs — la frontière
-- safeguarding, pas seulement la frontière anonyme. Et il existe un chemin de
-- transfert : la reprise recopie les noms Python dans `tags`, qui est lisible
-- sans compte.
drop policy if exists "python_tags_insert_authenticated" on public.python_tags;

drop policy if exists "Teachers and admins create python tags" on public.python_tags;
create policy "Teachers and admins create python tags"
	on public.python_tags for insert
	to authenticated
	with check (public.is_teacher_or_admin());

revoke all on public.python_tags from public, anon, authenticated;
grant select, insert, delete on public.python_tags to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Résidu d'ACL : TRUNCATE sur la vue `resources`
-- ---------------------------------------------------------------------------
-- `20260908120000` révoquait `public` et `anon` mais pas `authenticated`, qui
-- garde donc le `GRANT ALL` du baseline — TRUNCATE compris, lequel IGNORE la RLS.
-- Le privilège est inerte (on ne tronque pas une vue) mais l'invariant écrit dans
-- cette migration-là était faux. On le rend vrai.
revoke all on public.resources from authenticated;
grant select on public.resources to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Résidu d'ACL : `tag_slug` exécutable par anon
-- ---------------------------------------------------------------------------
-- Fonction pure de transformation de chaîne, sans accès aux données : le risque
-- est nul. Mais elle échappait au motif appliqué aux deux autres fonctions du
-- chantier, et une exception non expliquée finit par servir de précédent.
--
-- Précision de mécanisme : il n'existe AUCUNE entrée ACL `anon` sur cette
-- fonction. Le droit d'anon vient du `=X/postgres` de PUBLIC, accordé par défaut
-- à toute nouvelle fonction. C'est donc `from public` qui fait le travail ;
-- `from anon` est un no-op défensif.
--
-- ⚠️ `authenticated` doit CONSERVER l'exécution : `tags.slug` est une colonne
-- générée qui appelle cette fonction, et l'expression est évaluée avec les droits
-- de celui qui insère. La révoquer à `authenticated` casserait toute création de
-- tag par le prof — c'est ce que vérifie le test « le slug est toujours calculé ».
revoke all on function public.tag_slug(text) from public, anon;
grant execute on function public.tag_slug(text) to authenticated, service_role;
