"""Génère la migration de CONTENU de 83b1f614 v3 (chantier « questions-1techno », Q4 bis (a), journal § 7
et § 19) et la fixture de son test d'intégration.

Le corrigé de la variation 3 (index 2) factorisait f′ d'emblée ; il cherche désormais les racines
évidentes de f′ (f′(p) = 0 et f′(q) = 0, calculs affichés) puis factorise. Rien d'autre ne change.

`create-questions --mettre-a-jour` ne touche pas un modèle publié : d'où cette migration
(docs/pratiques/couvrir-un-niveau.md § 7). Avant = instantané prod (`export-question-templates.ts`) ;
après = la source `scripts/questions/1spe-0-variations/83b1f614.json` (identique à
`scripts/questions/derivation-1spe/C-03-…json`). Le script vérifie que seules ces étapes diffèrent.

    python3 -I docs/wip/questions-1techno/83b1f614-contenu.py
"""

import copy
import json

ID = '83b1f614-95db-4d74-9fbf-d4d502ee8c01'
AVANT = 'scripts/questions/1techno-83b1f614/83b1f614.json'
APRES = 'scripts/questions/1spe-0-variations/83b1f614.json'
JUMEAU = 'scripts/questions/derivation-1spe/C-03-maximum-local-polynome-degre-3.json'
MIGRATION = 'supabase/migrations/20261117171928_questions_1techno_83b1f614_contenu.sql'
FIXTURE = 'tests/integration/fixtures/questions-1techno-83b1f614-contenu.json'
# md5(variations::text) relevé en prod le 2026-11-17 (MCP), avant la migration
MD5_PROD = 'd2ee6195f8ffbfd44cf7d6ec80049b3e'
Q = '$q83$'
assert Q not in ('$lot$', '$retour$')

avant = json.load(open(AVANT))
apres = json.load(open(APRES))
jumeau = json.load(open(JUMEAU))
assert avant['id'] == apres['id'] == jumeau['id'] == ID
assert apres['variations'] == jumeau['variations'], 'les deux sources divergent'
for cle in ('title', 'description', 'level', 'delay', 'testSpecs'):
    assert avant[cle] == apres[cle], cle
# Seules les étapes du corrigé de la variation d'index 2 changent
a, b = copy.deepcopy(avant['variations']), copy.deepcopy(apres['variations'])
del a[2]['correction']['steps']
del b[2]['correction']['steps']
assert a == b, 'autre chose que les étapes de v3 change'
assert avant['variations'][2]['correction']['steps'][2:] == apres['variations'][2]['correction']['steps'][3:]

v_avant = json.dumps(avant['variations'], ensure_ascii=False)
v_apres = json.dumps(apres['variations'], ensure_ascii=False)
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
		raise exception '83b1f614 : contenu différent de celui attendu, rien n''est modifié';
	end if;
	update public.question_templates
	   set variations = {Q}{vers}{Q}::jsonb
	 where id = '{ID}';
	if not exists (select 1 from public.question_templates
	                where id = '{ID}' and variations = {Q}{vers}{Q}::jsonb) then
		raise exception '83b1f614 : contenu final inattendu';
	end if;
end ${nom}$;"""
    return '\n'.join(prefixe + l if prefixe else l for l in lignes.split('\n'))


ENTETE = f"""-- ============================================================================
-- 1re techno : corrigé de 83b1f614 v3, racines évidentes de f′ avant la factorisation
-- ============================================================================
--   « Maximum local d'une fonction polynôme de degré 3 », publié, grades {{1_SPE,1_TECHNO}}.
--   Variation 3 : f(x) = 2x³ − 3(p+q)x² + 6pqx + c. Le corrigé factorisait f′ d'emblée ; il cherche
--   désormais les racines évidentes (f′(p) = 0 et f′(q) = 0, calculs affichés), puis factorise. La
--   1re technologique n'a pas le discriminant (borne l1t-2 : « racines évidentes »).
--   Seules les ÉTAPES DU CORRIGÉ de la variation 3 changent (2 étapes deviennent 3). Énoncé,
--   réponses attendues, variables, specs, titre, nœud, tags, niveaux, statut : inchangés.
-- ============================================================================
-- Chantier `questions-1techno`, décision Q4 bis (a) de David le 2026-11-17 (journal
-- docs/archive/wip/questions-1techno-progress.md § 7). questions-1gen et questions-ttechno prévenus.
-- Fichier GÉNÉRÉ par docs/wip/questions-1techno/83b1f614-contenu.py — ne pas éditer à la main.
-- Instantané prod : {AVANT} ; source : {APRES}.
--
-- Le modèle n'existe qu'en production : en base locale, la migration ne touche rien. Garde : le
-- modèle doit porter EXACTEMENT les variations relevées en prod le 2026-11-17 (md5 {MD5_PROD}),
-- sinon rien n'est modifié. Prouvée par tests/integration/questions-1techno-83b1f614-contenu.test.ts,
-- qui fabrique une copie portant le vrai identifiant et le contenu de la prod, puis rejoue CE fichier.
--
-- Données d'élèves : non touchées (le corrigé est recalculé à l'affichage ; aucun indice de
-- variation ne bouge).
--
-- Accès : aucune règle (policy) ne change ; personne ne gagne ni ne perd d'accès. Effet visible :
-- le corrigé de la variation 3 montre la recherche des racines évidentes, en 1re spé comme en
-- 1re techno.
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
json.dump({'id': ID, 'md5Prod': MD5_PROD, 'grades': avant['grades'], 'status': avant['status'],
           'avant': avant['variations'], 'apres': apres['variations'], 'testSpecs': avant['testSpecs']},
          open(FIXTURE, 'w'), ensure_ascii=False, indent='\t')
print(MIGRATION, FIXTURE)
