"""Génère la migration de CONTENU du modèle 04 du lot 8e du CM1 (b423785d, publié) et la fixture de son
test d'intégration (chantier « questions-cm1 », journal § 25 septies).

La dernière étape du corrigé de la variation 3 (index 2) mettait toute une phrase dans un seul
`\\textcolor{…}{\\text{…}}` : une formule ne passe pas à la ligne, elle débordait à 390 px. Seul le mot
« triangles » reste en couleur, le reste redevient du texte. Rien d'autre ne change.

`create-questions --mettre-a-jour` ne touche pas un modèle publié : d'où cette migration
(docs/pratiques/couvrir-un-niveau.md § 7). Après = la source
`scripts/questions/cm1-8e/04-faces-pyramide-base-laterales.json` ; avant = la même, ancienne phrase
remise. Le md5 de « avant » est celui relevé en prod (MCP, 2026-11-19) : le test d'intégration le vérifie.

    python3 -I docs/wip/questions/cm1-8e-04-contenu.py
"""

import json

ID = 'b423785d-cfe4-4387-a617-d71ab18838a1'
SOURCE = 'scripts/questions/cm1-8e/04-faces-pyramide-base-laterales.json'
MIGRATION = 'supabase/migrations/20261119060346_questions_cm1_lot8e_04_contenu.sql'
FIXTURE = 'tests/integration/fixtures/questions-cm1-lot8e-04-contenu.json'
# md5(variations::text) et md5(test_specs::text) relevés en prod le 2026-11-19 (MCP), avant la migration
MD5_PROD = '3dda5f67f392331228894921999ca1ee'
MD5_SPECS_PROD = '954a7dcc524728cb9b6c17a7197432e0'
ANCIENNE = (
    'Ce qui est toujours vrai : $\\textcolor{{{color:primary.0}}}'
    '{\\text{ses faces latérales sont des triangles qui se rejoignent au sommet}}$.'
)
NOUVELLE = (
    'Ce qui est toujours vrai : ses faces latérales sont des '
    '$\\textcolor{{{color:primary.0}}}{\\text{triangles}}$ qui se rejoignent au sommet.'
)
Q = '$q04$'

source = json.load(open(SOURCE))
assert source['id'] == ID
apres = source['variations']
assert apres[2]['correction']['steps'][-1] == NOUVELLE
avant = json.loads(json.dumps(apres))
avant[2]['correction']['steps'][-1] = ANCIENNE
assert json.dumps(apres).count(json.dumps(NOUVELLE)[1:-1]) == 1, 'la phrase doit être unique'

v_avant = json.dumps(avant, ensure_ascii=False)
v_apres = json.dumps(apres, ensure_ascii=False)
assert Q not in v_avant and Q not in v_apres


def bloc(depuis: str, vers: str, nom: str, prefixe: str = '') -> str:
    """Remplace `depuis` par `vers` si le modèle porte EXACTEMENT `depuis` ; absent : rien."""
    lignes = f"""set local lock_timeout = '5s';
do ${nom}$
declare v_present boolean; v_conforme boolean;
begin
	select true, q.variations = {Q}{depuis}{Q}::jsonb
	  into v_present, v_conforme
	  from public.question_templates q where q.id = '{ID}' for update;
	if v_present is null then
		return;
	end if;
	if not v_conforme then
		raise exception 'b423785d : contenu différent de celui attendu, rien n''est modifié';
	end if;
	update public.question_templates
	   set variations = {Q}{vers}{Q}::jsonb
	 where id = '{ID}';
	if not exists (select 1 from public.question_templates
	                where id = '{ID}' and variations = {Q}{vers}{Q}::jsonb) then
		raise exception 'b423785d : contenu final inattendu';
	end if;
end ${nom}$;"""
    return '\n'.join(prefixe + l if prefixe else l for l in lignes.split('\n'))


ENTETE = f"""-- ============================================================================
-- CM1, lot 8e : corrigé du modèle 04 (b423785d) sans débordement à 390 px
-- ============================================================================
--   « Les faces d'une pyramide : base et faces latérales », publié, grades {{CM1}}.
--   Variation 3, dernière étape du corrigé : la phrase entière était dans une formule colorée
--   (`\\textcolor{{…}}{{\\text{{…}}}}`), qui ne passe pas à la ligne et débordait sur un téléphone.
--   Seul le mot « triangles » reste en couleur. Énoncé, réponses attendues, variables, specs,
--   titre, nœud, tags, niveaux, statut : inchangés.
-- ============================================================================
-- Chantier `questions-cm1`, voie (a) tranchée par David le 2026-11-19 (journal
-- docs/archive/wip/questions-cm1-progress.md § 25 septies) : `create-questions --mettre-a-jour` ne
-- touche pas un modèle publié.
-- Fichier GÉNÉRÉ par docs/wip/questions/cm1-8e-04-contenu.py — ne pas éditer à la main.
-- Source : {SOURCE}.
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche rien. Garde : le
-- modèle doit porter EXACTEMENT les variations relevées en prod le 2026-11-19 (md5 {MD5_PROD}),
-- sinon rien n'est modifié. Prouvée par tests/integration/questions-cm1-lot8e-04-contenu.test.ts,
-- qui fabrique une copie portant le vrai identifiant et le contenu de la prod, puis rejoue CE fichier.
--
-- Données d'élèves : non touchées (le corrigé est recalculé à l'affichage ; aucun indice de
-- variation ne bouge).
--
-- Accès : aucune règle (policy) ne change ; personne ne gagne ni ne perd d'accès. Effet visible :
-- la dernière phrase du corrigé de la variation 3 tient dans l'écran d'un téléphone.
--
-- Rollback : rend les variations d'avant. Garde : il refuse si le modèle n'a plus EXACTEMENT le
-- contenu posé par la migration. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
{bloc(v_apres, v_avant, 'retour', '-- ')}
-- ROLLBACK:END
-- ============================================================================
"""

open(MIGRATION, 'w').write(ENTETE + '\n' + bloc(v_avant, v_apres, 'lot') + '\n')
json.dump({'id': ID, 'md5Prod': MD5_PROD, 'md5SpecsProd': MD5_SPECS_PROD, 'grades': source['grades'],
           'status': 'published', 'avant': avant, 'apres': apres, 'testSpecs': source['testSpecs'],
           'ancienne': ANCIENNE, 'nouvelle': NOUVELLE},
          open(FIXTURE, 'w'), ensure_ascii=False, indent='\t')
open(FIXTURE, 'a').write('\n')
print(MIGRATION, FIXTURE)
