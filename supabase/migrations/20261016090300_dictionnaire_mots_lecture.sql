-- ============================================================================
-- Dictionnaire : les 4 mots de la lecture d'une expression (ADR 0022)
-- ============================================================================
--
-- La lecture d'une expression (/test-structure, src/lib/mathAST/structure/reading.ts)
-- passe à LexiconTerm les clés « différent », « racine cubique », « racine n-ième »
-- et « logarithme décimal », absentes du dictionnaire : leur mot s'affichait sans
-- lien. Définitions et niveaux validés par David le 2026-10-11.
--
-- Question d'accès posée et tranchée par David (2026-10-11) :
--   « Qui pourra lire quoi, qu'il ne pouvait pas lire avant ? »
--   → tout le monde (visiteurs compris) lit ces 4 définitions, comme les 671 autres
--     entrées non masquées ; aucun autre accès. Aucun droit ni aucune policy ne change.
--
-- Données seules, additive : 4 lignes insérées, rangées après la plus grande position
-- existante, dans l'ordre ci-dessous. Idempotente : une entrée de même nom et même sens
-- (index unique dictionary_entries_term_sense) n'est pas réécrite.
-- Le trigger dictionary_entries_keep_version laisse passer la migration (auth.role() NULL)
-- et n'écrit l'historique qu'à une modification : un INSERT n'en crée pas.
--
-- Rollback (ces 4 lignes seulement, telles que la migration les a écrites : updated_by
-- NULL. Une entrée de même nom créée ou modifiée depuis la page admin porte son auteur
-- et n'est pas touchée ; à décider à la main, son historique partirait avec elle) :
--   delete from public.dictionary_entries
--   where sense is null
--     and updated_by is null
--     and term in ('différent', 'racine cubique', 'racine n-ième', 'logarithme décimal');

insert into public.dictionary_entries (position, term, grade, tags, definitions, auto_link)
select
	(select coalesce(max(position), -1) from public.dictionary_entries) + x.rank,
	x.term,
	x.grade,
	x.tags,
	x.definitions,
	x.auto_link
from (
	values
		(
			1,
			'différent',
			'CE1',
			array['transversal'],
			-- Mot courant de la langue (« des valeurs différentes ») : jamais souligné, comme « égal »
			$def${"items":[{"grade":"CE1","content":"Se dit de deux quantités qui n'ont pas la même valeur. Symbole : $\\neq$. Ex : $3 + 4 \\neq 8$."}]}$def$::jsonb,
			false
		),
		(
			2,
			'racine cubique',
			'2',
			array['racines-carrees'],
			$def${"items":[{"grade":"2","content":"$\\sqrt[3]{a}$ est le nombre dont le cube vaut $a$. Ex : $\\sqrt[3]{8} = 2$ car $2^3 = 8$."}]}$def$::jsonb,
			true
		),
		(
			3,
			'racine n-ième',
			'T_EXP',
			array['racines-carrees'],
			$def${"items":[{"grade":"T_EXP","content":"Pour $a \\geq 0$ et $n$ entier non nul, $\\sqrt[n]{a}$ est le nombre positif dont la puissance $n$ vaut $a$. Ex : $\\sqrt[4]{81} = 3$ car $3^4 = 81$."}]}$def$::jsonb,
			true
		),
		(
			4,
			'logarithme décimal',
			'T_TECHNO',
			array['fonctions'],
			$def${"items":[{"grade":"T_TECHNO","content":"Pour $b > 0$, $\\log(b)$ est le nombre $x$ tel que $10^x = b$. Ex : $\\log(1000) = 3$."}]}$def$::jsonb,
			true
		)
) as x (rank, term, grade, tags, definitions, auto_link)
order by x.rank
on conflict (term, coalesce(sense, '')) do nothing;
