-- Publication au fur et à mesure des contenus d'un chapitre
-- =========================================================
--
-- Jusqu'ici, `class_chapters.is_visible` était le SEUL interrupteur : un
-- chapitre était entièrement visible, ou entièrement caché. Le professeur ne
-- pouvait donc pas préparer un chapitre complet puis en libérer les parties au
-- rythme du cours — il devait tout garder caché jusqu'au dernier moment.
--
-- Chaque contenu porte désormais sa propre date de mise à disposition.
--
-- ⚠️ « Publier » a déjà DEUX autres sens dans ce dépôt :
--     - `worksheets.status = 'published'`        → la fiche est terminée
--     - `chapter_templates.status = 'published'` → le modèle est diffusable
--   Celui-ci est un TROISIÈME sens : « mis à disposition des élèves de cette
--   classe, dans ce chapitre ». D'où `published_at` et non `status`, pour que
--   les trois ne se confondent pas à la lecture.
--
-- Horodatage plutôt que booléen : le professeur veut savoir QUAND il a libéré
-- quoi (c'est le sens même de « au fur et à mesure »), et `null` dit sans
-- ambiguïté « préparé, pas encore donné ».
--
-- ⚠️ Les policies testent `published_at <= now()`, et NON `is not null`. La
-- différence est tout sauf théorique : une colonne nommée « date de mise à
-- disposition » appelle un jour un sélecteur de date, et un professeur qui
-- programmerait « demain 8 h » pour ouvrir son chapitre au prochain cours
-- rendrait le contenu lisible AUSSITÔT — les questions du contrôle comprises.
-- `<= now()` couvre les deux cas d'un coup : `null <= now()` vaut `null`, donc
-- faux, donc la ligne reste masquée.
--
-- ACCÈS — qui pourra lire quoi, qu'il ne pouvait pas lire avant ?
--   PERSONNE. Cette migration ne fait que RESTREINDRE : elle ajoute une
--   condition `published_at is not null` à des policies élève qui existaient
--   déjà. Aucun élève ne gagne le moindre accès.
--   Aucune donnée n'est en jeu non plus : les cinq tables sont à 0 ligne en
--   production (mesuré le 2026-09-13), donc le défaut `null` — « rien n'est
--   publié » — ne retire rien à personne.
--   Le vrai changement d'accès viendra du CODE, pas d'ici : publier une fiche
--   déclenchera sa distribution. Tranché par David le 2026-09-13.
--
-- ROLLBACK (additive, donc réversible sans perte) :
--   -- 1. rétablir les cinq policies sans la condition de publication :
--   --    reprendre chaque PAIRE `drop policy if exists` + `create policy`
--   --    ci-dessous, en retirant la ligne `and <table>.published_at <= now()`.
--   --    Ne reprendre que les `create` échouerait en 42710 (la policy existe
--   --    déjà), et s'arrêterait à la première table.
--   -- 2. puis :
--   --    alter table chapter_documents       drop column published_at;
--   --    alter table chapter_exercises       drop column published_at;
--   --    alter table chapter_checklist_items drop column published_at;
--   --    alter table chapter_quiz_questions  drop column published_at;
--   --    alter table chapter_worksheets      drop column published_at;
--   ⚠️ ATTENTION — le rollback, lui, N'EST PAS neutre en accès, et c'est
--   pourtant lui qu'on exécute sous pression. À la seconde où les anciennes
--   policies reviennent, TOUT ce que le professeur a préparé sans le donner
--   devient visible : sujets à venir, corrigés, documents. Faire donc, AVANT
--   l'étape 1 :
--     -- étape 0 : masquer les chapitres concernés
--     --   update class_chapters set is_visible = false
--     --   where id in (select distinct chapter_id from chapter_documents
--     --                where published_at is null);  -- et idem pour les 4 autres
--   Et « réversible » ne veut pas dire « sans perte » : l'étape 2 détruit les
--   `published_at`, donc on perd QUEL contenu avait été libéré et QUAND. Le
--   contenu lui-même, lui, est intact.

-- ---------------------------------------------------------------------------
-- 1. La colonne, sur les cinq contenus d'un chapitre
-- ---------------------------------------------------------------------------

alter table chapter_documents add column if not exists published_at timestamptz;
alter table chapter_exercises add column if not exists published_at timestamptz;
alter table chapter_checklist_items add column if not exists published_at timestamptz;
alter table chapter_quiz_questions add column if not exists published_at timestamptz;
alter table chapter_worksheets add column if not exists published_at timestamptz;

comment on column chapter_documents.published_at is
	'Mise à disposition des élèves. NULL = préparé, invisible. Sens DISTINCT de worksheets.status et de chapter_templates.status.';
comment on column chapter_exercises.published_at is
	'Mise à disposition des élèves. NULL = préparé, invisible.';
comment on column chapter_checklist_items.published_at is
	'Mise à disposition des élèves. NULL = préparé, invisible.';
comment on column chapter_quiz_questions.published_at is
	'Mise à disposition des élèves. NULL = préparé, invisible.';
comment on column chapter_worksheets.published_at is
	'Mise à disposition des élèves. NULL = préparé, invisible. Ne remplace PAS student_has_worksheet_access : les deux conditions valent, publier sans distribuer ne montre rien.';

-- ---------------------------------------------------------------------------
-- 2. Les policies élève : le chapitre visible NE SUFFIT PLUS
-- ---------------------------------------------------------------------------
-- Le garde vit ici, dans la policy, et non dans l'API — comme pour la
-- distribution des fiches. Une route réécrite demain ne pourra pas le
-- contourner par inadvertance.

drop policy if exists "Students can view documents of visible chapters" on chapter_documents;
create policy "Students can view documents of visible chapters"
	on chapter_documents for select to authenticated
	using (
		exists (
			select 1 from class_chapters ch
			where ch.id = chapter_documents.chapter_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
		and chapter_documents.published_at <= now()
	);

drop policy if exists "Students can view exercises of visible chapters" on chapter_exercises;
create policy "Students can view exercises of visible chapters"
	on chapter_exercises for select to authenticated
	using (
		exists (
			select 1 from class_chapters ch
			where ch.id = chapter_exercises.chapter_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
		and chapter_exercises.published_at <= now()
	);

drop policy if exists "Students can view checklist items of visible chapters" on chapter_checklist_items;
create policy "Students can view checklist items of visible chapters"
	on chapter_checklist_items for select to authenticated
	using (
		exists (
			select 1 from class_chapters ch
			where ch.id = chapter_checklist_items.chapter_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
		and chapter_checklist_items.published_at <= now()
	);

drop policy if exists "Students can view quiz questions of visible chapters" on chapter_quiz_questions;
create policy "Students can view quiz questions of visible chapters"
	on chapter_quiz_questions for select to authenticated
	using (
		exists (
			select 1 from class_chapters ch
			where ch.id = chapter_quiz_questions.chapter_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
		and chapter_quiz_questions.published_at <= now()
	);

-- La fiche cumule DEUX gardes, et c'est délibéré : publier la range dans le
-- cours, `student_has_worksheet_access` prouve qu'elle lui a bien été
-- distribuée. Retirer l'un des deux rouvrirait le canal de distribution
-- parallèle que `chapter_worksheets` a justement été conçue pour interdire.
drop policy if exists "Students can view worksheets of visible chapters" on chapter_worksheets;
create policy "Students can view worksheets of visible chapters"
	on chapter_worksheets for select to authenticated
	using (
		exists (
			select 1 from class_chapters ch
			where ch.id = chapter_worksheets.chapter_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
		and student_has_worksheet_access(chapter_worksheets.worksheet_id)
		and chapter_worksheets.published_at <= now()
	);
