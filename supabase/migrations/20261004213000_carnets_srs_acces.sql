-- =============================================================================
-- Carnets Python et paquets SRS : trois écritures retirées aux comptes connectés
-- =============================================================================
--
-- DÉCISIONS DE DAVID (questions d'accès tranchées le 2026-10-04) :
--   1. Seuls le professeur et l'administrateur publient un carnet : un élève ne
--      peut plus poser `python_notebooks.is_public = true` NI `is_template =
--      true`, ni à la création ni en modification. Prod : aucun carnet public
--      n'a un élève pour auteur (requête de David : 0). `is_template` ajouté
--      après l'audit des carnets (2026-10-04) : un template public d'élève
--      apparaissait dans la galerie du professeur, qui en le clonant devenait
--      auteur du code de l'élève (filtre côté code livré dans la PR A).
--   2. Un paquet SRS assigné (`is_assigned`), auto-géré (`is_auto_managed`) ou
--      copie d'un autre (`source_deck_id`) est TOUJOURS créé par le serveur
--      (client service), jamais par un compte connecté (option a).
--   3. Un élève n'enregistre plus de résultat d'étape de validation (checkpoint
--      run) sur un carnet qui ne lui est pas ASSIGNÉ. Avant : tout carnet
--      `is_public` suffisait.
--   4. (Élève retiré d'une classe → ne lit plus les carnets de cette classe.)
--      DÉJÀ EN PROD : `is_notebook_assigned_to_student` filtre
--      `cm.status = 'active'` depuis 20260912170000. Rien ici ; test de
--      non-régression seulement.
--
-- QUI PERD QUOI (question en miroir) :
--   - l'élève : rendre public un carnet, ou en faire un template ; créer ou modifier un paquet vers
--     assigné / auto-géré / copie ; écrire un checkpoint run hors carnet assigné.
--   - le professeur et l'administrateur : créer ou modifier un paquet vers
--     assigné / auto-géré / copie avec LEUR client. Mesuré dans le code : aucun
--     chemin ne le fait. Les copies d'assignation sont écrites par le client
--     service (api/srs/decks/[id]/assign), le paquet Programme aussi depuis la
--     PR « paquet Programme créé par le serveur ». Le seul UPDATE de ce genre
--     (`is_assigned = true` sur le deck SOURCE, assign/+server.ts) est DÉJÀ
--     refusé aujourd'hui : la policy UPDATE n'a qu'un USING, qui sert de WITH
--     CHECK. Test de constat dans le fichier de tests.
--   - le professeur : repointer une assignation de carnet vers un carnet dont
--     il n'est pas l'auteur, ou vers une classe qui n'est pas la sienne
--     (section 4). Aucun chemin applicatif ne modifie une assignation.
--   Inchangés : toute lecture ; le professeur qui rend public son carnet ; la
--   création d'un paquet personnel ordinaire ; l'élève sur un carnet assigné.
--
-- ⚠️ ORDRE DE DÉPLOIEMENT : la PR A (code : `ensureProgrammeDeck` crée le
-- paquet avec le client service) doit être EN PROD AVANT `db:migrate`. Sinon
-- plus aucun nouvel élève n'obtient de paquet Programme, en silence (erreur
-- attrapée et seulement journalisée par les appelants).
--
-- MÉCANISME : policies RESTRICTIVE (combinées en ET aux permissives
-- existantes), sans retirer aucune policy. `TO authenticated` : le client
-- service (`service_role`, BYPASSRLS) et les fonctions SECURITY DEFINER
-- possédées par `postgres` ne sont pas visés. Pour UPDATE, seul le WITH CHECK
-- est posé : la NOUVELLE ligne est jugée ; une restrictive sans USING ne
-- filtre pas les lignes existantes.
--
-- Tests : tests/integration/carnets-srs-acces.test.ts
--
-- ROLLBACK (non destructif, rétablit exactement l'état antérieur) :
--   DROP POLICY IF EXISTS python_notebooks_public_par_le_prof_insert ON public.python_notebooks;
--   DROP POLICY IF EXISTS python_notebooks_public_par_le_prof_update ON public.python_notebooks;
--   DROP POLICY IF EXISTS srs_decks_paquets_serveur_insert ON public.srs_decks;
--   DROP POLICY IF EXISTS srs_decks_paquets_serveur_update ON public.srs_decks;
--   DROP POLICY IF EXISTS checkpoint_runs_carnet_assigne_insert ON public.python_notebook_checkpoint_runs;
--   DROP POLICY IF EXISTS checkpoint_runs_carnet_assigne_update ON public.python_notebook_checkpoint_runs;
--   DROP POLICY IF EXISTS python_notebook_assignments_update_carnet_de_l_auteur ON public.python_notebook_assignments;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Carnet public ou template : prof et admin seulement.
-- -----------------------------------------------------------------------------
CREATE POLICY python_notebooks_public_par_le_prof_insert ON public.python_notebooks
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((is_public IS NOT TRUE AND is_template IS NOT TRUE) OR public.is_teacher_or_admin());

CREATE POLICY python_notebooks_public_par_le_prof_update ON public.python_notebooks
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  WITH CHECK ((is_public IS NOT TRUE AND is_template IS NOT TRUE) OR public.is_teacher_or_admin());

COMMENT ON POLICY python_notebooks_public_par_le_prof_insert ON public.python_notebooks IS
  '2026-10-04 : seuls le professeur et l''administrateur créent un carnet public ou un template.';
COMMENT ON POLICY python_notebooks_public_par_le_prof_update ON public.python_notebooks IS
  '2026-10-04 : seuls le professeur et l''administrateur rendent un carnet public ou en font un template.';

-- -----------------------------------------------------------------------------
-- 2. Paquets assignés, auto-gérés ou copies : le serveur seul.
-- -----------------------------------------------------------------------------
CREATE POLICY srs_decks_paquets_serveur_insert ON public.srs_decks
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_assigned IS NOT TRUE
    AND is_auto_managed IS NOT TRUE
    AND source_deck_id IS NULL
  );

CREATE POLICY srs_decks_paquets_serveur_update ON public.srs_decks
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  WITH CHECK (
    is_assigned IS NOT TRUE
    AND is_auto_managed IS NOT TRUE
    AND source_deck_id IS NULL
  );

COMMENT ON POLICY srs_decks_paquets_serveur_insert ON public.srs_decks IS
  '2026-10-04 : un paquet assigné, auto-géré ou copie (source_deck_id) est créé par le serveur (client service), jamais par un compte connecté.';
COMMENT ON POLICY srs_decks_paquets_serveur_update ON public.srs_decks IS
  '2026-10-04 : un compte connecté ne transforme pas un paquet en paquet assigné, auto-géré ou copie.';

-- -----------------------------------------------------------------------------
-- 3. Checkpoint runs : carnet ASSIGNÉ pour l'élève (prof et admin inchangés).
--    Les deux RPC d'écriture (upsert_checkpoint_run,
--    mark_checkpoint_hint_revealed) sont SECURITY INVOKER : elles passent ici.
--    SELECT et DELETE ne sont pas touchés.
-- -----------------------------------------------------------------------------
CREATE POLICY checkpoint_runs_carnet_assigne_insert ON public.python_notebook_checkpoint_runs
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_teacher_or_admin() OR public.is_notebook_assigned_to_student(notebook_id));

CREATE POLICY checkpoint_runs_carnet_assigne_update ON public.python_notebook_checkpoint_runs
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  WITH CHECK (public.is_teacher_or_admin() OR public.is_notebook_assigned_to_student(notebook_id));

COMMENT ON POLICY checkpoint_runs_carnet_assigne_insert ON public.python_notebook_checkpoint_runs IS
  '2026-10-04 : un élève n''enregistre un checkpoint run que sur un carnet qui lui est assigné (un carnet public ne suffit plus).';
COMMENT ON POLICY checkpoint_runs_carnet_assigne_update ON public.python_notebook_checkpoint_runs IS
  '2026-10-04 : un élève ne met à jour un checkpoint run que sur un carnet qui lui est assigné.';

-- -----------------------------------------------------------------------------
-- 4. Assignations de carnets : on ne repointe pas vers le carnet d'un autre
--    (défense en profondeur, audit des carnets du 2026-10-04).
--    « Teachers can update own notebook assignments » ne vérifie que
--    `shared_by` : un professeur pouvait repointer `notebook_id` vers le carnet
--    d'un élève, que toute la classe aurait alors lu et exécuté. Même contrôle
--    que la policy INSERT « Teachers can assign their notebooks to their
--    classes ». Aucun chemin applicatif ne fait d'UPDATE sur cette table
--    (vérifié : seule l'INSERT de api/python-notebooks/[id]/share écrit).
-- -----------------------------------------------------------------------------
CREATE POLICY python_notebook_assignments_update_carnet_de_l_auteur
  ON public.python_notebook_assignments
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  WITH CHECK (
    shared_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.python_notebooks pn
      WHERE pn.id = python_notebook_assignments.notebook_id
        AND pn.author_id = (SELECT auth.uid())
    )
    AND public.is_teacher_of_class(class_id)
  );

COMMENT ON POLICY python_notebook_assignments_update_carnet_de_l_auteur ON public.python_notebook_assignments IS
  '2026-10-04 : une assignation modifiée pointe toujours vers un carnet de son auteur, dans une de ses classes (même contrôle que l''INSERT).';
