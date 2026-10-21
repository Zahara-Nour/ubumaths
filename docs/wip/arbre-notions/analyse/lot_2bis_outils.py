"""Outils communs aux migrations des MODIFIER du lot 2 bis (un script par lot : A `lot-2bis-nombres.py`,
B `lot-2bis-variations.py`…).

Un script de lot écrit une fonction par modèle (clé = 8 premiers caractères de l'id), qui modifie
le contenu relevé en prod en vérifiant chaque ancienne valeur, puis appelle `generer`. Celle-ci
écrit la fixture du test d'intégration et la migration : garde sur le contenu, le nœud, les
niveaux et l'absence de tag ; nouveau contenu ; tag du point ; rollback à empreinte md5.

Une SCISSION (lot D) garde le modèle d'origine, qui reçoit une partie du contenu et le premier point de
sa ligne (« 5-026,5-123 »), et crée un modèle neuf (UUID fixé par le script) qui reçoit l'autre partie
et le second point. Le modèle neuf copie toutes les autres colonnes de l'origine (type, nœud, niveaux,
statut, auteur…).
"""

import copy
import hashlib
import json
import os
import re
import sys

ETAT = 'docs/wip/arbre-notions/analyse/etat-prod-2026-10-21/'
LISTE = 'docs/wip/arbre-notions/analyse/lot-2bis-modifications.md'
CHAMPS = ('title', 'description', 'variations', 'shared', 'test_specs')


# ============================================================================
# OUTILS DE MODIFICATION
# ============================================================================

def variable(conteneur: dict, nom: str, avant: str, apres: str) -> None:
    """Remplace l'expression d'une variable, après avoir vérifié l'ancienne."""
    v = next(v for v in conteneur['variables'] if v['name'] == nom)
    assert v['expression'] == avant, (nom, v['expression'], avant)
    v['expression'] = apres


def retirer_variable(conteneur: dict, nom: str) -> None:
    n = len(conteneur['variables'])
    conteneur['variables'] = [v for v in conteneur['variables'] if v['name'] != nom]
    assert len(conteneur['variables']) == n - 1, nom


def garder_variations(t: dict, garder: list[int]) -> None:
    """Garde les variations d'indices `garder` (base 0) ; les specs suivent, réindexées."""
    t['variations'] = [t['variations'][i] for i in garder]
    nouveau = {ancien: i for i, ancien in enumerate(garder)}
    specs = []
    for s in t['test_specs']:
        if s['variationIndex'] in nouveau:
            i = nouveau[s['variationIndex']]
            description = re.sub(r'^v\d+\b', f'v{i}', s['description'])
            specs.append({**s, 'variationIndex': i, 'description': description})
    t['test_specs'] = specs


def spec(reponse: str, statut: str, variables: dict, description: str, variation: int = 0,
         violations: list[str] | None = None) -> dict:
    attendu: dict = {'status': statut}
    if violations:
        attendu['constraintViolations'] = violations
    return {
        'answers': [reponse],
        'expected': attendu,
        'variables': variables,
        'description': description,
        'variationIndex': variation,
    }


def remplacer(t: dict, champ: str, avant: str, apres: str) -> None:
    assert t[champ] == avant, (champ, t[champ])
    t[champ] = apres


# ============================================================================
# GÉNÉRATION
# ============================================================================

def lire_liste(section: str) -> dict[str, tuple[str, str]]:
    """Modèle → (niveau, point), lu dans la liste validée (§ 4, sous-section `section`)."""
    texte = open(LISTE).read().split('### ' + section)[1].split('### ')[0]
    lignes = {}
    for ligne in texte.splitlines():
        m = re.match(r'\| `(\w+)` \| (\S+)\s*\| (\S+)\s*\|', ligne)
        if m:
            lignes[m.group(1)] = (m.group(2), m.group(3))
    return lignes


def generer(modifs: dict, *, modeles: str, section: str, migration: str, fixture: str, prefixe: str,
            entete: str, options: bool = False, scissions: dict | None = None) -> None:
    """Écrit la fixture et la migration du lot. `modeles` : fichier du relevé dans ETAT ;
    `prefixe` : nom court des tables temporaires et des chaînes dollar (`l2n` → `_l2n_modeles`) ;
    `entete` : commentaire de tête de la migration (`{n}` = nombre de modèles) ; `options` : le lot
    change aussi la colonne `options` (QCM à ne pas mélanger…), gardée et rendue comme le reste ;
    `scissions` : modèle → (UUID du modèle neuf, fonction qui écrit son contenu à partir de celui
    d'avant de l'origine).

    Argument optionnel du script : un dossier qui reçoit un <id>.json par modèle modifié (pour
    `pnpm question:specs --file` et `scripts/audit-question-draws.ts --dir`)."""
    sortie_modeles = sys.argv[1] if len(sys.argv) > 1 else None
    noeuds = {n['id']: n for n in json.load(open(ETAT + 'nodes.json'))}
    points = {(p['grade'], p['code']): p for p in json.load(open(ETAT + 'points.json')) if p['archived_at'] is None}
    releves = {t['id'][:8]: t for t in json.load(open(ETAT + modeles))}
    liste = lire_liste(section)
    assert set(liste) == set(modifs) == set(releves), (set(liste) ^ set(modifs), set(releves) ^ set(modifs))

    def chemin(i: str) -> list[str]:
        r = []
        while i:
            r.append(noeuds[i]['name'])
            i = noeuds[i]['parent_id']
        return list(reversed(r))

    def notion_de(i: str) -> str:
        n = noeuds[i]
        return n['parent_id'] if n['kind'] == 'subnotion' else n['id']

    scissions = scissions or {}
    assert set(scissions) <= set(modifs), set(scissions) - set(modifs)

    def point_du_noeud(t: dict, grade: str, code: str) -> None:
        p = points[(grade, code)]
        assert p['node_id'] in (t['classification_node_id'], notion_de(t['classification_node_id'])), (t['id'], code)

    lot = []
    for court in sorted(modifs, key=lambda c: releves[c]['id']):
        t = releves[court]
        grade, codes = liste[court]
        codes = codes.split(',')
        assert len(codes) == (2 if court in scissions else 1), (court, codes)
        assert grade in t['grades'], (court, grade, t['grades'])
        for code in codes:
            point_du_noeud(t, grade, code)
        avant = {k: t[k] for k in CHAMPS + (('options',) if options else ())}
        neuf = copy.deepcopy(avant)
        modifs[court](neuf)
        assert neuf != avant, court
        m = {
            'id': t['id'],
            'noeud': chemin(t['classification_node_id']),
            'grades': t['grades'],
            'tag': {'grade': grade, 'code': codes[0]},
            'avant': avant,
            'apres': neuf,
        }
        if court in scissions:
            id_neuf, ecrire = scissions[court]
            assert id_neuf not in {r['id'] for r in releves.values()}, id_neuf
            contenu = copy.deepcopy(avant)
            ecrire(contenu)
            assert contenu not in (avant, neuf), court
            m['scission'] = {'id': id_neuf, 'tag': {'grade': grade, 'code': codes[1]}, 'contenu': contenu}
        lot.append(m)
        if sortie_modeles:
            os.makedirs(sortie_modeles, exist_ok=True)
            json.dump({**t, **neuf}, open(f"{sortie_modeles}/{t['id']}.json", 'w'), ensure_ascii=False, indent='\t')
            if 'scission' in m:
                n = m['scission']
                json.dump({**t, **n['contenu'], 'id': n['id']}, open(f"{sortie_modeles}/{n['id']}.json", 'w'),
                          ensure_ascii=False, indent='\t')

    json.dump({'modeles': lot}, open(fixture, 'w'), ensure_ascii=False, indent='\t')
    open(fixture, 'a').write('\n')
    ecrire_migration(lot, migration, prefixe, entete, options)
    print(f'{len(lot)} modèles modifiés et tagués, {len(scissions)} modèles neufs')


def texte_jsonb(v) -> str:
    """Le texte que Postgres donne à `v::jsonb::text` : clés triées par longueur puis octets,
    séparateurs « , » et « : ». Sert à l'empreinte md5 de la garde du rollback (le test
    d'intégration la vérifie : un écart ferait échouer le rollback)."""
    if isinstance(v, dict):
        cles = sorted(v, key=lambda k: (len(k.encode()), k.encode()))
        return '{' + ', '.join(json.dumps(k, ensure_ascii=False) + ': ' + texte_jsonb(v[k]) for k in cles) + '}'
    if isinstance(v, list):
        return '[' + ', '.join(texte_jsonb(x) for x in v) + ']'
    assert not isinstance(v, float), v
    return json.dumps(v, ensure_ascii=False)


def ecrire_migration(lot: list[dict], migration: str, prefixe: str, entete: str, options: bool = False) -> None:
    dollar = f'${prefixe}$'
    tmp = f'_{prefixe}'

    def lit(s: str) -> str:
        assert dollar not in s
        return dollar + s + dollar

    def contenu(c: dict) -> str:
        return lit(json.dumps(c, ensure_ascii=False, separators=(',', ':'))) + '::jsonb'

    def ch(c: list[str]) -> str:
        return ', '.join(lit(v) for v in c) + (', null' if len(c) == 2 else '')

    def tableau(g: list[str]) -> str:
        return 'array[' + ', '.join("'" + v + "'" for v in g) + ']'

    n = len(lot)
    neufs = [m['scission'] | {'origine': m['id']} for m in lot if 'scission' in m]
    k = len(neufs)
    empreinte = ("jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,"
                 " 'shared', q.shared, 'test_specs', q.test_specs)")
    rb_neufs = []
    if neufs:
        liste_neufs = ', '.join(f"'{x['id']}'" for x in neufs)
        rb_neufs = [
            "-- Modèles neufs des scissions : le rollback les SUPPRIME. Il refuse si l'un d'eux a été",
            "-- retouché depuis la migration ou porte une donnée d'élève (la suppression emporterait en",
            "-- cascade cartes SRS et activités de journal).",
            "-- do $retour_neufs$",
            "-- declare v_intacts integer; v_eleves integer;",
            "-- begin",
            f"-- \tperform 1 from public.question_templates where id in ({liste_neufs}) for update;",
            "-- \tselect count(*) into v_intacts from public.question_templates q join (values",
        ]
        rb_neufs += [f"-- \t\t('{x['id']}'::uuid, '{hashlib.md5(texte_jsonb(x['contenu']).encode()).hexdigest()}')"
                     + (',' if i < k - 1 else '') for i, x in enumerate(neufs)]
        rb_neufs += [
            "-- \t) as r(id, h) on r.id = q.id",
            f"-- \t where md5({empreinte}::text) = r.h;",
            f"-- \tif v_intacts <> {k} then",
            f"-- \t\traise exception 'rollback : % modèle(s) neuf(s) sur {k} portent encore le contenu de la migration', v_intacts;",
            "-- \tend if;",
            "-- \tselect (select count(*) from public.srs_cards where template_id in (" + liste_neufs + "))",
            "-- \t     + (select count(*) from public.skill_attempts where template_id in (" + liste_neufs + "))",
            "-- \t     + (select count(*) from public.journal_entry_activities where question_template_id in (" + liste_neufs + "))",
            "-- \t     + (select count(*) from public.evaluation_attempt_questions where template_id in (" + liste_neufs + "))",
            "-- \t     + (select count(*) from public.test_answers where template_id in (" + liste_neufs + "))",
            "-- \t  into v_eleves;",
            "-- \tif v_eleves <> 0 then",
            "-- \t\traise exception 'rollback : % donnée(s) d''élève tiennent aux modèles neufs', v_eleves;",
            "-- \tend if;",
            "-- end $retour_neufs$;",
        ]
    rb = [
        "-- Rollback (il rend aux modèles leur contenu d'avant et retire les tags posés ; aucune",
        "-- donnée d'élève). Garde : il refuse si un modèle n'a plus EXACTEMENT le contenu posé par",
        "-- la migration (empreinte md5), pour ne pas écraser une modification faite depuis dans",
        "-- l'éditeur. Bloc éprouvé par le test d'intégration, à jouer dans une transaction :",
        "-- ROLLBACK:BEGIN",
        *rb_neufs,
        "-- do $retour$",
        "-- declare v_intacts integer;",
        "-- begin",
        "-- \tperform 1 from public.question_templates where id in (",
    ]
    rb += [f"-- \t\t'{m['id']}'" + (',' if i < n - 1 else ') for update;') for i, m in enumerate(lot)]
    rb += [
        "-- \tselect count(*) into v_intacts from public.question_templates q join (values",
    ]
    rb += [f"-- \t\t('{m['id']}'::uuid, '{hashlib.md5(texte_jsonb(m['apres']).encode()).hexdigest()}')"
           + (',' if i < n - 1 else '') for i, m in enumerate(lot)]
    rb += [
        "-- \t) as r(id, h) on r.id = q.id",
        "-- \t where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,",
        "-- \t                              'shared', q.shared, 'test_specs', q.test_specs)::text) = r.h;",
        f"-- \tif v_intacts <> {n} then",
        f"-- \t\traise exception 'rollback : % modèle(s) sur {n} portent encore le contenu de la migration', v_intacts;",
        "-- \tend if;",
        "-- end $retour$;",
        "-- delete from public.question_template_points q",
        "--  using public.curriculum_points p, (values",
    ]
    rb += [f"--   ('{m['id']}'::uuid, '{m['tag']['grade']}', '{m['tag']['code']}')" + (',' if i < n - 1 else '')
           for i, m in enumerate(lot)]
    rb += [
        "--  ) as r(template_id, grade, code)",
        "--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;",
        "-- update public.question_templates q",
        "--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',",
        "--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)",
        "--   from (values",
    ]
    rb += [f"--   ('{m['id']}'::uuid, {contenu(m['avant'])})" + (',' if i < n - 1 else '') for i, m in enumerate(lot)]
    rb += ["--   ) as r(id, c)", "--  where q.id = r.id;"]
    if neufs:
        rb += [f"-- delete from public.question_templates where id in ({liste_neufs});"]
    rb += ["-- ROLLBACK:END"]
    rollback = '\n'.join(rb)

    o = [entete.format(n=n) + '\n' + f'''{rollback}
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ---------------------------------------------------
drop table if exists pg_temp.{tmp}_modeles;
create temporary table {tmp}_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	tag_grade text not null, tag_code text not null,
	avant jsonb not null, apres jsonb not null
);''']
    for m in lot:
        o.append(f"insert into {tmp}_modeles values ('{m['id']}', {ch(m['noeud'])}, {tableau(m['grades'])}, "
                 f"'{m['tag']['grade']}', '{m['tag']['code']}',\n  {contenu(m['avant'])},\n  {contenu(m['apres'])});")
    if neufs:
        o.append(f'''
-- Modèles neufs des scissions : chacun copie les autres colonnes de son origine.
drop table if exists pg_temp.{tmp}_neufs;
create temporary table {tmp}_neufs (
	id uuid primary key,
	origine uuid not null references {tmp}_modeles (id),
	tag_grade text not null, tag_code text not null,
	contenu jsonb not null
);''')
        for x in neufs:
            o.append(f"insert into {tmp}_neufs values ('{x['id']}', '{x['origine']}', "
                     f"'{x['tag']['grade']}', '{x['tag']['code']}',\n  {contenu(x['contenu'])});")
    o.append(f'''
-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table {tmp}_resolus as
	select r.id,
	       case when r.sous_notion is null then nn.id else s.id end as noeud,
	       p.id as point_id
	  from {tmp}_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.curriculum_points p on p.grade = r.tag_grade and p.code = r.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from {tmp}_resolus where noeud is null or point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from {tmp}_resolus where noeud is null or point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu et rangement relevés, aucun tag posé -------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join {tmp}_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from {tmp}_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, {n}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur {n}', v_presents;
	end if;
	select count(*) into v_contenus from {tmp}_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,
	                          'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from {tmp}_modeles r
	  join {tmp}_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join {tmp}_modeles r on r.id = q.template_id
	  join public.curriculum_points p on p.id = q.point_id
	 where p.grade in ('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3');
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
end $garde$;

-- ---- 4. Nouveau contenu, puis tags ------------------------------------------------------
update public.question_templates q
   set title = r.apres->>'title',
       description = r.apres->>'description',
       variations = r.apres->'variations',
       shared = nullif(r.apres->'shared', 'null'::jsonb),
       test_specs = nullif(r.apres->'test_specs', 'null'::jsonb)
  from {tmp}_modeles r
 where q.id = r.id;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from {tmp}_resolus x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer;
begin
	select count(*) into v_presents from {tmp}_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from {tmp}_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,
	                          'shared', q.shared, 'test_specs', q.test_specs) = r.apres;
	select count(*) into v_tags from {tmp}_resolus x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	if v_ok <> v_presents or v_tags <> v_presents then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_presents;
	end if;
end $check$;

drop table pg_temp.{tmp}_resolus;
drop table pg_temp.{tmp}_modeles;
''')
    texte = '\n'.join(o)
    if neufs:
        texte = ajouter_neufs(texte, tmp, k, empreinte)
    if options:
        # Colonne `options` : dans chaque empreinte de contenu et dans chaque mise à jour.
        texte = texte.replace("'test_specs', q.test_specs)", "'test_specs', q.test_specs, 'options', q.options)")
        for r in ('r.c', 'r.apres'):
            avant = f"test_specs = nullif({r}->'test_specs', 'null'::jsonb)"
            assert avant in texte, avant
            texte = texte.replace(avant, avant + f", options = nullif({r}->'options', 'null'::jsonb)")
        assert texte.count("'options', q.options)") == (5 if neufs else 3)
    open(migration, 'w').write(texte)


def ajouter_neufs(texte: str, tmp: str, k: int, empreinte: str) -> str:
    """Ajoute au corps de la migration ce que demandent les modèles neufs des scissions : résolution
    de leur point, garde « identifiant libre », insertion par copie de l'origine, tag, vérification."""
    def inserer(apres: str, ajout: str) -> None:
        nonlocal texte
        assert texte.count(apres) == 1, apres
        texte = texte.replace(apres, apres + ajout)

    inserer('end $resolution$;\n', f'''
create temporary table {tmp}_resolus_neufs as
	select n.id, p.id as point_id
	  from {tmp}_neufs n
	  left join public.curriculum_points p on p.grade = n.tag_grade and p.code = n.tag_code and p.archived_at is null;
do $resolution_neufs$
begin
	if exists (select 1 from {tmp}_resolus_neufs where point_id is null) then
		raise exception 'points des modèles neufs introuvables : %',
			(select count(*) from {tmp}_resolus_neufs where point_id is null);
	end if;
end $resolution_neufs$;
''')
    inserer('declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer;', ' v_pris integer;')
    inserer("""		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;""", f'''
	select count(*) into v_pris from {tmp}_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;''')
    inserer("""  from {tmp}_resolus x
  join public.question_templates q on q.id = x.id;
""".format(tmp=tmp), f'''
-- Modèles neufs : toutes les colonnes de l'origine (type, nœud, niveaux, statut, auteur…), puis leur
-- propre identifiant, leur contenu et des dates neuves. Rien n'est créé si l'origine est absente.
insert into public.question_templates
select (jsonb_populate_record(null::public.question_templates,
	to_jsonb(q) || n.contenu || jsonb_build_object('id', n.id, 'created_at', now(), 'updated_at', now()))).*
  from {tmp}_neufs n
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from {tmp}_resolus_neufs x
  join public.question_templates q on q.id = x.id;
''')
    inserer('declare v_presents integer; v_ok integer; v_tags integer;', ' v_neufs integer; v_neufs_tags integer;')
    inserer("""		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_presents;
	end if;""", f'''
	select count(*) into v_neufs from {tmp}_neufs n
	  join public.question_templates q on q.id = n.id
	 where {empreinte} = n.contenu;
	select count(*) into v_neufs_tags from {tmp}_resolus_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	if v_neufs <> case when v_presents = 0 then 0 else {k} end or v_neufs_tags <> v_neufs then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;''')
    inserer('\ndrop table pg_temp.{tmp}_resolus;\n'.format(tmp=tmp),
            f'drop table pg_temp.{tmp}_resolus_neufs;\ndrop table pg_temp.{tmp}_neufs;\n')
    return texte
