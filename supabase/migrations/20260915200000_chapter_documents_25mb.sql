-- Relever le plafond d'un document de chapitre : 10 Mo → 25 Mo
--
-- Pourquoi : un scan de cours ou un polycopié illustré dépassait 10 Mo et se
-- voyait refusé, alors que la plateforme accepte jusqu'à 50 Mo. 25 Mo laisse
-- passer ces documents tout en gardant un garde-fou : il faudrait quarante
-- fichiers de cette taille pour saturer le gigaoctet du plan de stockage.
--
-- Le plafond vit à TROIS endroits, et les trois doivent s'accorder :
--   1. le bucket `chapter-documents` (ci-dessous) ;
--   2. la contrainte `valid_file_size` de `chapter_documents` (ci-dessous) ;
--   3. l'application (composant d'envoi et action serveur).
-- Relever le seul bucket faisait monter le fichier puis échouer son
-- enregistrement : le professeur attendait la fin d'un envoi de 15 Mo pour
-- récolter une erreur générique, et le fichier était effacé derrière lui.
--
-- Additive : aucune donnée n'est touchée, deux limites sont desserrées.
-- Rollback :
--   update storage.buckets set file_size_limit = 10485760
--     where id = 'chapter-documents';
--   alter table public.chapter_documents
--     drop constraint valid_file_size,
--     add constraint valid_file_size
--       check (file_size is null or (file_size > 0 and file_size <= 10485760));
--
-- ⚠️ Le repli n'est pas inconditionnel : dès qu'un document dépassera 10 Mo,
-- ce `add constraint` échouera sur les lignes existantes. Il faudra d'abord
-- supprimer ou alléger ces documents — à savoir avant d'y recourir dans
-- l'urgence.

update storage.buckets
set file_size_limit = 26214400 -- 25 Mo
where id = 'chapter-documents';

alter table public.chapter_documents
	drop constraint if exists valid_file_size,
	add constraint valid_file_size
		check (file_size is null or (file_size > 0 and file_size <= 26214400));

comment on column public.chapter_documents.file_size is 'Taille du fichier en octets (max 25 Mo)';
