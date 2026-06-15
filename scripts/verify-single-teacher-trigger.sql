-- ============================================================================
-- Vérification du trigger trg_enforce_single_teacher (Lot 2)
-- À lancer UNE FOIS après avoir poussé la migration 20260615190937_enforce_single_teacher.sql
-- Tout est en transaction ROLLBACK : ne modifie RIEN.
-- Attendu : 2 lignes "OK ..." en NOTICE, aucune erreur rouge.
-- ============================================================================

BEGIN;

DO $$
DECLARE
	v_student uuid;
BEGIN
	SELECT id INTO v_student FROM profiles WHERE role = 'student' LIMIT 1;
	IF v_student IS NULL THEN
		RAISE EXCEPTION 'Aucun élève pour le test';
	END IF;

	-- 1) Promouvoir un 2e prof doit ÉCHOUER (sous-transaction)
	BEGIN
		UPDATE profiles SET role = 'teacher' WHERE id = v_student;
		RAISE EXCEPTION 'ECHEC TEST: la promotion d''un 2e prof aurait du etre bloquee';
	EXCEPTION
		WHEN check_violation THEN
			RAISE NOTICE 'OK 1/2 : promotion d''un 2e prof bloquee par le trigger.';
	END;

	-- 2) Réaffirmer le prof existant (David) doit RÉUSSIR
	UPDATE profiles SET role = 'teacher' WHERE role = 'teacher';
	RAISE NOTICE 'OK 2/2 : edition du prof existant autorisee.';
END $$;

ROLLBACK;
