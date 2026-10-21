-- Mathoux : la mémoire retient la sieste
-- ==============================================================================
--
-- Pour annoncer en fin de séance « Pile-Poil s'est réveillé ! », il faut savoir
-- que le Mathou dormait au calcul précédent : le calcul de la Chatterie se refait
-- à chaque affichage et ne garde rien. `asleep` retient l'état de sieste écrit
-- par le dernier calcul, comme `best_stage` retient le stade.
--
-- QUESTION D'ACCÈS (tranchée par David le 2026-10-21) : personne ne lit rien de
-- neuf. La colonne suit les règles de la table : l'élève lit ses lignes et voit
-- déjà ses siestes sur la Chatterie ; le prof lit celles de ses élèves et voit
-- déjà leurs siestes dans sa vue de la Chatterie ; l'admin lit tout. Personne
-- n'écrit au client connecté (`authenticated` n'a que SELECT sur la table, et
-- aucune policy d'écriture) : seul le serveur, au client service.
-- Personne ne perd d'accès : rien n'est retiré.
--
-- Valeur des lignes existantes : faux (éveillé). Un Mathou qui dort aujourd'hui
-- sera écrit endormi au prochain calcul, sans annonce ; son réveil suivant sera
-- annoncé. Aucun faux « s'est réveillé » au déploiement.
--
-- Additive : une colonne avec défaut, rien d'existant n'est modifié ni perdu.
--
-- Preuve : tests/integration/mathoux-memoire.test.ts, describe « sieste (asleep) ».
--
-- ROLLBACK (à exécuter tel quel) :
--   alter table public.student_mathoux drop column if exists asleep;

alter table public.student_mathoux
	add column asleep boolean not null default false;

comment on column public.student_mathoux.asleep is
	'Sieste écrite par le dernier calcul de la Chatterie (point à revoir ou carte due). Sert à annoncer le réveil. Écrite par le serveur seul.';
