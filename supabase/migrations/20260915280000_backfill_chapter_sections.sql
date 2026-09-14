-- Rattrapage : les six sections pour les chapitres ANTÉRIEURS au trigger
-- =======================================================================
--
-- `trg_class_chapters_default_sections` (migration `20260915260000`) ne se
-- déclenche qu'à l'INSERT. Les chapitres créés avant elle n'ont donc aucune
-- section — en production, celui du 2026-09-13 se serait affiché vide, sans
-- une seule case où ranger quoi que ce soit.
--
-- C'est le trou classique d'un trigger posé après coup : il tient l'avenir, pas
-- le passé. Vérifié en production avant d'écrire ce fichier : 1 chapitre,
-- 0 section.
--
-- QUESTION D'ACCÈS : personne ne gagne d'accès. Les lignes créées sont lues
-- sous les policies posées par `20260915260000`, inchangées ici.
--
-- ADDITIVE et IDEMPOTENTE : le `not exists` ne sème que dans les chapitres qui
-- n'ont AUCUNE section. Un chapitre dont le professeur a déjà supprimé ou
-- renommé des sections n'est pas touché — rejouer cette migration ne
-- ressusciterait pas une section qu'il a voulu retirer, tant qu'il en reste au
-- moins une.
--
-- ⚠️ Le cas non couvert, et il est volontaire : un chapitre dont le professeur
-- supprimerait les SIX sections serait re-semé si cette migration était
-- rejouée. Une migration ne se rejoue pas (`schema_migrations` la marque), donc
-- le cas est théorique ; le noter vaut mieux que de prétendre l'avoir fermé.
--
-- ROLLBACK — retirer les sections semées par ce rattrapage :
--   ⚠️ IMPOSSIBLE À CIBLER PROPREMENT : rien ne distingue une section semée ici
--   d'une section semée par le trigger ou créée à la main. Le rollback
--   consisterait à supprimer les sections d'un chapitre nommément désigné :
--     delete from public.chapter_sections where chapter_id = '<uuid>';
--   Aucune ressource n'est perdue (`on delete set null (section_id)`), seul le
--   rangement l'est.

insert into public.chapter_sections (chapter_id, title, display_order)
select c.id, s.title, s.display_order
from public.class_chapters c
cross join (values
	('Préparation', 1),
	('Le cours', 2),
	('Les exercices', 3),
	('Méthodes', 4),
	('Résumé', 5),
	('Bilan', 6)
) as s(title, display_order)
where not exists (
	select 1 from public.chapter_sections existante
	where existante.chapter_id = c.id
);
