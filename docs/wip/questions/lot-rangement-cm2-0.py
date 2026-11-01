"""Génère la migration de RANGEMENT du chantier « questions-cm2 », lot 0 (changements de niveau) :
11 modèles du CM2, sans contenu changé ; niveaux scolaires, tags et statut (3 brouillons).

Les 12 modèles du lot venus du CM1 (CM1 → CM2, edc5d7d4 et 322f3479 compris) ont été traités par le
chantier « questions-cm1 » (#1893, migrations 20261028100000 / 20261028100100, jouées le 2026-10-28) :
ils sortent de ce lot. Le sort de 322f3479 (doublon de dd7db98e sur CM2-039) reste à trancher.

Corps (étapes 1 à 5) repris du lot 0 du CE1 (`20261027000100_questions_ce1_rangement_tags.sql`) ;
seules les données et le rollback sont écrits ici. Phase 0 validée par David le 2026-10-28 (§ 5 du
journal `docs/wip/questions-cm2-progress.md`). Relevé en prod le 2026-10-28 (MCP, lecture seule) :
chemins des nœuds, niveaux, statuts, aucun tag sur les 11 modèles, 0 donnée d'élève.

    python3 docs/wip/questions/lot-rangement-cm2-0.py
"""

MIGRATION = 'supabase/migrations/20261028120000_questions_cm2_rangement_tags.sql'
P = '_qcm2r'

NC = 'Nombres et calculs'
DEC_CALC = (NC, 'Décimaux : calculs')
MULT_DEC = (*DEC_CALC, 'multiplication')
DIV_DEC = (*DEC_CALC, 'division')
PARTICULIERS = (NC, 'Entiers : multiplication', 'produits particuliers')
CRITERES = ('Arithmétique', 'Divisibilité', 'critères de divisibilité')

# (id, nœud avant, nœud après, niveaux avant, niveaux après, statut après, tag posé (grade, code) ou None)
# Tous relevés publiés, sans tag.
LOT = [
    # CM2 → 6e
    ('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d', DIV_DEC, DIV_DEC, 'CM2', '6', 'published', ('6', '6-121')),
    ('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80', MULT_DEC, MULT_DEC, 'CM2', '6', 'published', ('6', '6-118')),
    ('814a46a9-2f73-4b2d-91e4-2052fc425b53', MULT_DEC, MULT_DEC, 'CM2', '6', 'published', ('6', '6-118')),
    ('4b543657-6739-4183-8959-32f282fa826f', MULT_DEC, MULT_DEC, 'CM2', '6', 'published', ('6', '6-118')),
    ('918598f5-d7b0-43f8-b679-f69ab2039134', MULT_DEC, MULT_DEC, 'CM2', '6', 'published', ('6', '6-118')),
    ('9826af8b-0ba0-4c43-b9ed-dd6ccf552723', MULT_DEC, MULT_DEC, 'CM2', '6', 'published', ('6', '6-118')),
    # CM2 → 5e
    ('e81493f7-38fe-4028-a265-872329534ae3', CRITERES, CRITERES, 'CM2', '5', 'published', ('5', '5-010')),
    ('9c03423a-38ce-44e3-ab44-20b4e90659b7', CRITERES, CRITERES, 'CM2', '5', 'published', ('5', '5-119')),
    # Brouillons (niveaux, nœud, catégorie gardés)
    ('32351845-9672-415f-9397-fa446b6edd78', PARTICULIERS, PARTICULIERS, 'CM2', 'CM2', 'draft', None),
    ('e58b1357-6fa8-4fce-9518-91d09d9acc49', PARTICULIERS, PARTICULIERS, 'CM2', 'CM2', 'draft', None),
    ('e009f9d0-bc51-452e-9119-b6eff18cfe83', PARTICULIERS, PARTICULIERS, 'CM2', 'CM2', 'draft', None),
]
N = len(LOT)
TAGS = [(i, *t) for i, *_, t in LOT if t]
ENTETE = f"""-- ============================================================================
-- Chantier « questions-cm2 », lot 0 (changements de niveau) : rangement, tags, niveaux et statut de {N} modèles
-- ============================================================================
--   - 6 modèles du CM2 passent en 6e et sont tagués : 7f0fbff0 (6-121) ; 3c40e59b, 814a46a9,
--     4b543657, 918598f5, 9826af8b (6-118) ;
--   - 2 modèles du CM2 passent en 5e et sont tagués : e81493f7 (5-010), 9c03423a (5-119) ;
--   - 3 modèles repassent en BROUILLON (niveaux, nœud, catégorie gardés) : 32351845, e58b1357, e009f9d0.
-- Le contenu ne change pas : `updated_at` est PRÉSERVÉ. Les modèles du CM1 passés au CM2 l'ont été par
-- le chantier « questions-cm1 » (#1893).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-cm2-progress.md § 5).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-rangement-cm2-0.py — ne pas éditer à la main ; corps
-- (étapes 1 à 5) repris du lot 0 du CE1 (20261027000100_questions_ce1_rangement_tags).
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({N} modèles). Elle est prouvée
-- par tests/integration/questions-cm2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud, aux niveaux et au statut relevés le 2026-10-28, et
-- ne porter aucun tag (relevé). Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune (relevé du 2026-10-28 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès (question tranchée par David le 2026-10-28) : les élèves et le prof de 6e voient 6 modèles
-- publiés de plus, ceux de 5e 2 ; ceux du CM2 ne voient plus ces 11 modèles (8 partis en 6e et en 5e,
-- 3 en brouillon). Aucune règle (policy) ne change.
--"""


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def arr(g: str) -> str:
    return f"array[{q(g)}]"


def lignes(items: list[str], indent: str) -> str:
    return ',\n'.join(indent + x for x in items)


def ids_sql(indent: str) -> str:
    return lignes([f"('{i}'::uuid)" for i, *_ in LOT], indent)


def in_liste() -> str:
    return ', '.join(f"'{i}'" for i, *_ in LOT)


def rollback() -> str:
    gardes = lignes([f"('{i}'::uuid, {q(ap[0])}, {q(ap[1])}, {q(ap[2])}, {arr(ga)}, {q(st)})"
                     for i, _, ap, _g, ga, st, _t in LOT], '-- \t\t')
    tags = lignes([f"('{i}'::uuid, {q(g)}, {q(c)})" for i, g, c in TAGS], '-- \t')
    deplaces = [(i, av) for i, av, ap, *_ in LOT if av != ap]
    noeuds = lignes([f"('{i}'::uuid, {q(av[0])}, {q(av[1])}, {q(av[2])})" for i, av in deplaces], '-- \t')
    # Aucun déplacé : pas de bloc (un `values` vide serait refusé).
    bloc_noeuds = '' if not deplaces else f"""-- update public.question_templates q set classification_node_id = s.id
--   from (values
{noeuds}
--   ) as r(id, branche, notion, sous_notion)
--   join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--   join public.classification_nodes n on n.kind = 'notion' and n.parent_id = b.id and n.archived_at is null and n.name = r.notion
--   join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = n.id and s.archived_at is null and s.name = r.sous_notion
--  where q.id = r.id;
"""
    grades = lignes([f"('{i}'::uuid, {arr(gv)})" for i, _a, _b, gv, ga, *_ in LOT if gv != ga], '-- \t')
    statuts = ', '.join(f"'{i}'" for i, *r in LOT if r[4] != 'published')
    n_tags = len(TAGS)
    return f"""-- Rollback (aucune donnée d'élève). Il retire les {n_tags} tags posés, rend aux modèles leur nœud,
-- leurs niveaux et leur statut d'avant (tous relevés publiés, sans tag ; aucun nœud ne change). Garde : il refuse si un
-- modèle n'a plus EXACTEMENT le nœud, les niveaux, le statut et les tags posés par la migration
-- (sinon une saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration,
-- à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
{ids_sql('--   ')}
--   ) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ({in_liste()}) order by id for update;
-- 	select count(*), count(*) filter (where q.grades = r.grades and q.status = r.statut
-- 	                                     and q.classification_node_id = s.id)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join (values
{gardes}
-- 	  ) as r(id, branche, notion, sous_notion, grades, statut) on r.id = q.id
-- 	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
-- 	  left join public.classification_nodes n on n.kind = 'notion' and n.parent_id = b.id and n.archived_at is null and n.name = r.notion
-- 	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = n.id and s.archived_at is null and s.name = r.sous_notion;
-- 	if v_presents not in (0, {N}) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur {N}', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les {n_tags} posés par la migration, rien d'autre.
-- 	select count(*), count(*) filter (where r.id is not null)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id
-- 	  left join (values
{lignes([f"('{i}'::uuid, {q(g)}, {q(c)})" for i, g, c in TAGS], '-- 		')}
-- 	  ) as r(id, grade, code) on r.id = q.template_id and p.grade = r.grade and p.code = r.code
-- 	 where q.template_id in ({in_liste()});
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * {n_tags} then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * {n_tags};
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
{tags}
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
{bloc_noeuds}-- update public.question_templates q set grades = r.grades
--   from (values
{grades}
--   ) as r(id, grades)
--  where q.id = r.id;
-- update public.question_templates set status = 'published' where id in ({statuts});
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================"""


def corps() -> str:
    """Étapes 1 à 5, reprises du lot 0 du CE1 (préfixe et effectifs changés)."""
    src = open('supabase/migrations/20261027000100_questions_ce1_rangement_tags.sql').read()
    debut = src.index("-- Pas de `lock table`")
    corps = src[debut:]
    # Données du CE1 remplacées par celles du lot.
    a = corps.index('insert into _qce1_modeles values')
    b = corps.index('-- Verrous avant les gardes')
    modeles = lignes([f"('{i}', {q(av[0])}, {q(av[1])}, {q(av[2])},\n\t {q(ap[0])}, {q(ap[1])}, {q(ap[2])}, "
                      f"{arr(gv)}, {arr(ga)}, 'published', {q(st)})" for i, av, ap, gv, ga, st, _t in LOT], '\t')
    tags = lignes([f"('{i}', {q(g)}, {q(c)}, false, true)" for i, g, c in TAGS], '\t')
    corps = corps[:a] + f'insert into _qce1_modeles values\n{modeles};\ninsert into _qce1_tags values\n{tags};\n\n' + corps[b:]
    for avant, apres in [('not in (0, 9)', f'not in (0, {N})'), ('sur 9', f'sur {N}'),
                         ('least(v_presents, 1) * 4', f'least(v_presents, 1) * {len(TAGS)}')]:
        assert avant in corps, avant
        corps = corps.replace(avant, apres)
    corps = corps.replace('_qce1_', P + '_')
    assert 'CE1' not in corps and 'qce1' not in corps, 'reste du CE1 dans le corps'
    return corps


if __name__ == '__main__':
    texte = ENTETE + '\n' + rollback() + '\n\n' + corps()
    open(MIGRATION, 'w').write(texte)
    print(f'{N} modèles, {len(TAGS)} tags posés → {MIGRATION}')
