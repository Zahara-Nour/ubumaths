-- Nombre de lignes des cadres de réponse, par exercice dans la fiche (ADR 0030, lot 4)
--
-- ROLLBACK (perd les réglages des profs, revenus à l'estimation automatique) :
--   alter table public.worksheet_exercises
--     drop constraint if exists worksheet_exercises_answer_frame_lines_check;
--   alter table public.worksheet_exercises drop column if exists answer_frame_lines;
--
-- Migration ADDITIVE : une colonne nullable, sans défaut ; les lignes existantes
-- valent NULL (= estimation automatique, le comportement du lot 3).
--
-- Accès (question tranchée par David, 2026-10-15) : AUCUN nouvel accès. Aucune
-- policy, aucun GRANT : la colonne hérite des policies de la ligne
-- (« Teachers can manage own worksheet exercises » : auteur de la fiche ou admin ;
-- « Users can view worksheet exercises » : en plus, l'élève destinataire). Les RPC
-- par lien de partage nomment leurs colonnes une à une : elles ne la rendent pas.
--
-- Forme : { "questions": [int|null, …], "exercise": int|null }
--   questions[k] = lignes du cadre de la question k+1 (mode « après chaque question ») ;
--   exercise     = lignes du cadre unique (mode « après l'exercice ») ;
--   null = estimation automatique ; 0 = pas de cadre ; au plus 40 lignes ;
--   au plus 200 questions (MAX_VIEW_QUESTIONS) ; aucune autre clé.

alter table public.worksheet_exercises
	add column answer_frame_lines jsonb null;

alter table public.worksheet_exercises
	add constraint worksheet_exercises_answer_frame_lines_check check (
		answer_frame_lines is null
		or (
			jsonb_typeof(answer_frame_lines) = 'object'
			and (answer_frame_lines - array['questions', 'exercise']) = '{}'::jsonb
			and (
				not (answer_frame_lines ? 'questions')
				or (
					jsonb_typeof(answer_frame_lines -> 'questions') = 'array'
					and jsonb_array_length(answer_frame_lines -> 'questions') <= 200
				)
			)
			-- Chaque nombre de lignes : null, ou entier de 0 à 40. Mode strict : un
			-- tableau imbriqué n'est pas déplié ; silent : une clé absente rend NULL
			-- au lieu de lever une erreur, d'où le coalesce (clé absente = valide).
			and not coalesce(jsonb_path_exists(
				answer_frame_lines,
				'strict $.questions[*] ? (!(@ == null || (@.type() == "number" && @ >= 0 && @ <= 40 && @.floor() == @)))',
				'{}'::jsonb,
				true
			), false)
			and not coalesce(jsonb_path_exists(
				answer_frame_lines,
				'strict $.exercise ? (!(@ == null || (@.type() == "number" && @ >= 0 && @ <= 40 && @.floor() == @)))',
				'{}'::jsonb,
				true
			), false)
		)
	);

comment on column public.worksheet_exercises.answer_frame_lines is
	'Lignes des cadres de réponse choisies par le prof pour cet exercice dans cette fiche (ADR 0030, lot 4) : {"questions": [int|null], "exercise": int|null} ; null = estimation automatique, 0 = pas de cadre, 0..40 lignes, ≤ 200 questions. NULL = tout automatique.';
