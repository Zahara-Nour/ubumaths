"""Générateur des migrations de SCISSIONS de la passe lycée (un modèle → l'origine + un ou plusieurs
modèles neufs, chacun sur ses propres points).

Il généralise `docs/wip/arbre-notions/analyse/lot_2bis_outils.py`, laissé tel quel (ses migrations
sont jouées en prod et se régénèrent à l'identique) :

- un modèle d'origine peut donner PLUSIEURS modèles neufs ;
- chaque modèle, origine ou neuf, peut recevoir PLUSIEURS tags (Tle spé et Tle compl. sur un même
  modèle) ;
- les tags qu'une origine porte déjà (relevés) sont exigés à l'identique et laissés en place ; un
  modèle neuf les reçoit s'ils figurent dans sa liste ;
- dédoublement (PR 2 des scissions) : une variation peut aller dans plusieurs parts, réécrite par la
  retouche de chacune ; une origine peut rester intacte (contenu et `updated_at` inchangés, aucun tag
  posé), ses modèles neufs emportant seuls la réécriture ;
- passe lycée, H (PR 3 des scissions) : un modèle peut changer de niveau scolaire (`grades`, vers son
  vrai programme ; ses neufs le copient) et un modèle MODIFIER n'a qu'une part, sans modèle neuf.

Un script de lot décrit chaque origine par une liste de parts : la première est l'origine, les
suivantes ses modèles neufs. Chaque part = variations gardées (base 0), codes de ses points, titre,
sous-titre, et éventuellement une fonction qui retouche le contenu après le partage.

La fixture (`modeles`) est lue par `tests/helpers/database/lot-2bis-migration.ts`, qui accepte les
deux formes : `tag` / `scission` (lots d'avant) ou `tags` / `neufs` (ce générateur).
"""

import copy
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, 'docs/wip/arbre-notions/analyse')
from lot_2bis_outils import garder_variations, texte_jsonb  # noqa: E402

CHAMPS = ('title', 'description', 'variations', 'shared', 'test_specs')
GRADES = {'1SPE': '1_SPE', 'TSPE': 'T_SPE', 'TCOMP': 'T_COMP', 'TEXP': 'T_EXP', '2': '2', '1TECHNO': '1_TECHNO'}


# ============================================================================
# CONTENU
# ============================================================================

def grade_du_code(code: str) -> str:
    return GRADES[code.rsplit('-', 1)[0]]


def tag(code: str) -> dict:
    return {'grade': grade_du_code(code), 'code': code}


def partager(avant: dict, garder: list[int], titre: str, sous_titre: str, retouche=None) -> dict:
    """Une part du modèle : les variations `garder`, specs suivies, titre et sous-titre propres."""
    t = copy.deepcopy(avant)
    garder_variations(t, garder)
    t['title'] = titre
    t['description'] = sous_titre
    if retouche:
        retouche(t)
    return t


# ============================================================================
# GÉNÉRATION
# ============================================================================

def generer(lot: dict, *, releve: list[dict], etat: str, niveaux_pris: dict, migration: str, fixture: str,
            prefixe: str, entete: str, retouches_avant: dict | None = None, dedoubles: set[str] | None = None,
            intactes: set[str] | None = None, grades_apres: dict[str, list[str]] | None = None) -> None:
    """`lot` : court (8 caractères) → liste de parts `(variations, codes, titre, sous_titre[, retouche])`,
    l'origine d'abord, puis ses neufs ; un neuf porte en plus son UUID fixé, en tête :
    `(uuid, variations, codes, titre, sous_titre[, retouche])`.
    `releve` : les modèles tels qu'en prod (contenu, catégorie, nœud `classification_node_id`).
    `etat` : instantané (nodes.json, points.json, tags.json : tags d'avant des modèles).
    `niveaux_pris` : (thème, domaine, sous-domaine) → niveau le plus haut pris en prod, brouillons
    compris ; les neufs d'une même catégorie prennent les niveaux suivants, dans l'ordre des origines.
    `retouches_avant` : court → fonction qui modifie le contenu de l'origine AVANT le partage (une
    variation réécrite qui reste sur l'origine).
    `dedoubles` : origines dont une variation peut aller dans plusieurs parts (chacune la réécrit).
    `intactes` : origines (parmi `dedoubles`) dont le contenu ne change pas : la mise à jour et le
    rollback ne les touchent pas (`tag_seul` de la fixture, `updated_at` gardé).
    `grades_apres` : court → niveaux scolaires du modèle après la migration (son vrai programme) ; ses
    neufs naissent avec eux, ses tags y sont pris."""
    sortie_modeles = sys.argv[1] if len(sys.argv) > 1 else None
    retouches_avant = retouches_avant or {}
    dedoubles = dedoubles or set()
    intactes = intactes or set()
    grades_apres = grades_apres or {}
    assert set(grades_apres) <= set(lot) and not set(grades_apres) & intactes, grades_apres
    assert dedoubles <= set(lot) and intactes <= dedoubles, (dedoubles, intactes)
    noeuds = {n['id']: n for n in json.load(open(etat + 'nodes.json'))}
    tous_points = json.load(open(etat + 'points.json'))
    points = {(p['grade'], p['code']): p for p in tous_points if p['archived_at'] is None}
    par_id = {p['id']: p for p in tous_points}
    tags_releves: dict[str, list[dict]] = {}
    for x in json.load(open(etat + 'tags.json')):
        p = par_id[x['point_id']]
        tags_releves.setdefault(x['template_id'], []).append({'grade': p['grade'], 'code': p['code']})
    releves = {t['id'][:8]: t for t in releve}
    assert set(lot) == set(releves), set(lot) ^ set(releves)
    assert set(retouches_avant) <= set(lot)

    def chemin(i: str) -> list[str]:
        r = []
        while i:
            r.append(noeuds[i]['name'])
            i = noeuds[i]['parent_id']
        return list(reversed(r))

    def notion_de(i: str) -> str:
        n = noeuds[i]
        return n['parent_id'] if n['kind'] == 'subnotion' else n['id']

    def sur_le_noeud(noeud: str, t: dict) -> bool:
        return points[(t['grade'], t['code'])]['node_id'] in (noeud, notion_de(noeud))

    niveaux = dict(niveaux_pris)
    ids_neufs: set[str] = set()
    modeles = []
    for court in sorted(lot, key=lambda c: releves[c]['id']):
        t = releves[court]
        parts = lot[court]
        # Une seule part : un MODIFIER (contenu réécrit, aucun modèle neuf ; garde plus bas).
        assert parts and (len(parts) >= 2 or court not in intactes), court
        avant = {k: t[k] for k in CHAMPS}
        base = copy.deepcopy(avant)
        if court in retouches_avant:
            retouches_avant[court](base)
            assert base != avant, court
        n_var = len(avant['variations'])
        # Chaque variation va dans exactement une part (dédoublement : dans une part au moins).
        vues = sorted(list(parts[0][0]) + [v for p in parts[1:] for v in p[1]])
        if court in dedoubles:
            assert sorted(set(vues)) == list(range(n_var)) and len(vues) > n_var, (court, vues)
        else:
            assert vues == list(range(n_var)), (court, vues)
        noeud = t['classification_node_id']
        categorie = {k: t[k] for k in ('theme', 'domain', 'subdomain', 'level', 'status')}
        cle = (t['theme'], t['domain'], t['subdomain'] or '')
        avant_tags = sorted(tags_releves.get(t['id'], []), key=lambda x: (x['grade'], x['code']))
        grades = grades_apres.get(court, t['grades'])
        assert grades != t['grades'] or court not in grades_apres, court

        def verifier_tags(codes: list[str]) -> list[dict]:
            tags = [tag(c) for c in codes]
            assert len({x['code'] for x in tags}) == len(tags), (court, codes)
            for x in tags:
                # Un tag d'avant d'un autre programme (1re techno) est gardé sans son niveau scolaire.
                assert x['grade'] in grades or x in avant_tags, (court, x, grades)
                assert (x['grade'], x['code']) in points, (court, x)
            # Un tag par niveau scolaire du modèle, au plus (deux programmes : Tle spé et Tle compl.).
            assert len({x['grade'] for x in tags}) == len(tags), (court, codes)
            return tags

        variations, codes, titre, sous_titre, *r = parts[0]
        tags_origine = verifier_tags(codes)
        for x in avant_tags:
            assert x in tags_origine, (court, 'tag relevé absent de la liste de l\'origine', x)
        poses = [x for x in tags_origine if x not in avant_tags]
        # R2 (passe lycée, 2026-10-23) : un modèle dont les points vivent ailleurs passe sur le nœud
        # de son premier point, où doivent vivre aussi ses autres points (tags d'avant compris).
        noeud_apres = noeud
        if not all(sur_le_noeud(noeud, x) for x in tags_origine):
            assert not avant_tags, (court, 'déplacement d\'un modèle déjà tagué')
            noeud_apres = points[(tags_origine[0]['grade'], tags_origine[0]['code'])]['node_id']
            assert all(sur_le_noeud(noeud_apres, x) for x in tags_origine), (court, tags_origine)
        apres = partager(base, variations, titre, sous_titre, *r)
        assert (apres == avant) == (court in intactes), court
        assert court not in intactes or not poses, (court, 'origine intacte : aucun tag posé')
        m = {
            'id': t['id'],
            'noeud': chemin(noeud),
            'grades': t['grades'],
            'tags': poses,
            'tags_avant': avant_tags,
            'avant': avant,
            'apres': apres,
            'categorie': categorie,
            'neufs': [],
        }
        if noeud_apres != noeud:
            m['noeud_apres'] = chemin(noeud_apres)
        if court in grades_apres:
            m['grades_apres'] = grades
        if court in intactes:
            m['tag_seul'] = True
        for uuid, variations, codes, titre, sous_titre, *r in parts[1:]:
            assert re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', uuid), uuid
            assert uuid not in ids_neufs and uuid[:8] not in releves, uuid
            ids_neufs.add(uuid)
            tags_neuf = verifier_tags(codes)
            niveaux[cle] += 1
            contenu = partager(base, variations, titre, sous_titre, *r)
            assert contenu not in (avant, apres), (court, uuid)
            neuf = {'id': uuid, 'niveau': niveaux[cle], 'tags': tags_neuf, 'contenu': contenu}
            # Nœud : celui de l'origine (après son éventuel déplacement) si tous ses points y vivent
            # (ou sur sa notion) ; sinon celui de son premier point (R2), où doivent vivre les autres.
            if not all(sur_le_noeud(noeud_apres, x) for x in tags_neuf):
                propre = points[(tags_neuf[0]['grade'], tags_neuf[0]['code'])]['node_id']
                assert all(sur_le_noeud(propre, x) for x in tags_neuf), (court, uuid)
                neuf['noeud'] = chemin(propre)
            m['neufs'].append(neuf)
        modeles.append(m)
        if sortie_modeles:
            os.makedirs(sortie_modeles, exist_ok=True)
            json.dump({**t, **apres}, open(f"{sortie_modeles}/{t['id']}.json", 'w'), ensure_ascii=False, indent='\t')
            for x in m['neufs']:
                json.dump({**t, **x['contenu'], 'id': x['id'], 'level': x['niveau']},
                          open(f"{sortie_modeles}/{x['id']}.json", 'w'), ensure_ascii=False, indent='\t')

    json.dump({'modeles': modeles}, open(fixture, 'w'), ensure_ascii=False, indent='\t')
    open(fixture, 'a').write('\n')
    texte = ecrire_migration(modeles, prefixe, entete)
    if os.path.exists(migration) and open(migration).read() != texte and not os.environ.get('REECRIRE_MIGRATION'):
        sys.exit(f'{migration} existe et différerait : REECRIRE_MIGRATION=1 pour la réécrire (jamais une migration jouée).')
    open(migration, 'w').write(texte)
    k = sum(len(m['neufs']) for m in modeles)
    print(f'{len(modeles)} modèles scindés, {k} modèles neufs, '
          f"{sum(len(m['tags']) for m in modeles) + sum(len(x['tags']) for m in modeles for x in m['neufs'])} tags posés")


# ============================================================================
# MIGRATION
# ============================================================================

EMPREINTE = ("jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,"
             " 'shared', q.shared, 'test_specs', q.test_specs)")


def md5(contenu: dict) -> str:
    return hashlib.md5(texte_jsonb(contenu).encode()).hexdigest()


def ecrire_migration(modeles: list[dict], prefixe: str, entete: str) -> str:
    dollar = f'${prefixe}$'
    tmp = f'_{prefixe}'

    def lit(s: str) -> str:
        assert dollar not in s
        return dollar + s + dollar

    def contenu(c: dict) -> str:
        return lit(json.dumps(c, ensure_ascii=False, separators=(',', ':'))) + '::jsonb'

    def ch(c: list[str] | None) -> str:
        if c is None:
            return 'null, null, null'
        return ', '.join(lit(v) for v in c) + (', null' if len(c) == 2 else '')

    def tableau(g: list[str]) -> str:
        return 'array[' + ', '.join("'" + v + "'" for v in g) + ']'

    def valeurs(lignes: list[str], indent: str = '-- \t\t') -> list[str]:
        return [indent + x + (',' if i < len(lignes) - 1 else '') for i, x in enumerate(lignes)]

    n = len(modeles)
    neufs = [x | {'origine': m['id'], 'statut': m['categorie']['status'],
                  'chemin': x.get('noeud', m.get('noeud_apres', m['noeud']))}
             for m in modeles for x in m['neufs']]
    deplaces = [m for m in modeles if 'noeud_apres' in m]
    # Changements de niveau scolaire (H) : rien n'est écrit quand il n'y en a pas (migrations jouées).
    changent = [m for m in modeles if 'grades_apres' in m]
    k = len(neufs)
    tags_neufs = [(x['id'], t) for x in neufs for t in x['tags']]
    kt = len(tags_neufs)
    poses = [(m['id'], t) for m in modeles for t in m['tags']]
    liste = ', '.join(f"'{m['id']}'" for m in modeles)
    liste_neufs = ', '.join(f"'{x['id']}'" for x in neufs)
    # Origines intactes (dédoublement) : ni la mise à jour ni le rollback ne les touchent.
    reecrits = [m for m in modeles if not m.get('tag_seul')]
    assert reecrits, 'aucune origine réécrite : le rollback rendrait un `values` vide'
    filtre = ' and r.apres is distinct from r.avant' if len(reecrits) < n else ''

    # ---- Rollback -----------------------------------------------------------------------
    rb = [
        "-- Rollback : il SUPPRIME les modèles neufs, rend aux origines leur contenu d'avant et retire",
        "-- les tags posés (les tags d'avant restent). Gardes : il refuse si un modèle, origine ou neuf,",
        "-- n'a plus EXACTEMENT le contenu posé par la migration (empreinte md5), si un neuf a été publié,",
        "-- rangé ailleurs ou retagué, ou si une donnée d'élève tient à un neuf (la suppression emporterait",
        "-- en cascade cartes SRS et activités de journal). Bloc éprouvé par le test d'intégration, à jouer",
        "-- dans UNE transaction (sinon une garde qui échoue n'arrête pas la suite) :",
        "-- `psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi :",
        "-- ROLLBACK:BEGIN",
        "-- do $retour_neufs$",
        "-- declare v_intacts integer; v_eleves integer; v_ranges integer; v_tags integer; v_poses integer;",
        "-- begin",
        f"-- \tperform 1 from public.question_templates where id in ({liste_neufs}) for update;",
        "-- \tselect count(*) into v_intacts from public.question_templates q join (values",
        *valeurs([f"('{x['id']}'::uuid, '{md5(x['contenu'])}')" for x in neufs]),
        "-- \t) as r(id, h) on r.id = q.id",
        f"-- \t where md5({EMPREINTE}::text) = r.h;",
        f"-- \tif v_intacts <> {k} then",
        f"-- \t\traise exception 'rollback : % modèle(s) neuf(s) sur {k} portent encore le contenu de la migration', v_intacts;",
        "-- \tend if;",
        "-- \t-- Ni publiés, ni rangés ailleurs, ni retagués depuis (la suppression emporterait ce travail).",
        "-- \tselect count(*) into v_ranges from public.question_templates q join (values",
        *valeurs([f"('{x['id']}'::uuid, '{x['statut']}', {ch(x['chemin'])})" for x in neufs]),
        "-- \t) as r(id, statut, branche, notion, sous_notion) on r.id = q.id",
        "-- \t join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche",
        "-- \t join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion",
        "-- \t left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion",
        "-- \t where q.status = r.statut",
        "-- \t   and q.classification_node_id = case when r.sous_notion is null then nn.id else s.id end;",
        f"-- \tif v_ranges <> {k} then",
        f"-- \t\traise exception 'rollback : % modèle(s) neuf(s) sur {k} ont encore le statut et le nœud de la migration', v_ranges;",
        "-- \tend if;",
        f"-- \tselect count(*) into v_tags from public.question_template_points where template_id in ({liste_neufs});",
        "-- \tselect count(*) into v_poses from public.question_template_points t",
        "-- \t  join public.curriculum_points p on p.id = t.point_id",
        "-- \t  join (values",
        *valeurs([f"('{i}'::uuid, '{t['grade']}', '{t['code']}')" for i, t in tags_neufs]),
        "-- \t  ) as r(id, grade, code) on r.id = t.template_id and p.grade = r.grade and p.code = r.code;",
        f"-- \tif v_tags <> {kt} or v_poses <> {kt} then",
        f"-- \t\traise exception 'rollback : les modèles neufs portent % tag(s), dont % posé(s) par la migration (attendu : {kt})', v_tags, v_poses;",
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
        "-- do $retour$",
        "-- declare v_intacts integer;",
        "-- begin",
        f"-- \tperform 1 from public.question_templates where id in ({liste}) for update;",
        "-- \tselect count(*) into v_intacts from public.question_templates q join (values",
        *valeurs([f"('{m['id']}'::uuid, '{md5(m['apres'])}')" for m in modeles]),
        "-- \t) as r(id, h) on r.id = q.id",
        f"-- \t where md5({EMPREINTE}::text) = r.h;",
        f"-- \tif v_intacts <> {n} then",
        f"-- \t\traise exception 'rollback : % modèle(s) sur {n} portent encore le contenu de la migration', v_intacts;",
        "-- \tend if;",
        *([
            "-- \t-- Origines déplacées (R2) : encore sur le nœud où la migration les a mises.",
            "-- \tselect count(*) into v_intacts from public.question_templates q join (values",
            *valeurs([f"('{m['id']}'::uuid, {ch(m['noeud_apres'])})" for m in deplaces]),
            "-- \t) as r(id, branche, notion, sous_notion) on r.id = q.id",
            "-- \t join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche",
            "-- \t join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion",
            "-- \t left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion",
            "-- \t where q.classification_node_id = case when r.sous_notion is null then nn.id else s.id end;",
            f"-- \tif v_intacts <> {len(deplaces)} then",
            f"-- \t\traise exception 'rollback : % modèle(s) déplacé(s) sur {len(deplaces)} sont encore sur le nœud de la migration', v_intacts;",
            "-- \tend if;",
        ] if deplaces else []),
        *([
            "-- \t-- Origines changées de niveau scolaire : encore au niveau posé par la migration.",
            "-- \tselect count(*) into v_intacts from public.question_templates q join (values",
            *valeurs([f"('{m['id']}'::uuid, {tableau(m['grades_apres'])})" for m in changent]),
            "-- \t) as r(id, grades) on r.id = q.id",
            "-- \t where q.grades = r.grades;",
            f"-- \tif v_intacts <> {len(changent)} then",
            f"-- \t\traise exception 'rollback : % modèle(s) sur {len(changent)} sont encore au niveau scolaire de la migration', v_intacts;",
            "-- \tend if;",
        ] if changent else []),
        "-- end $retour$;",
        f"-- delete from public.question_templates where id in ({liste_neufs});",
        "-- delete from public.question_template_points q",
        "--  using public.curriculum_points p, (values",
        *valeurs([f"('{i}'::uuid, '{t['grade']}', '{t['code']}')" for i, t in poses], '--   '),
        "--  ) as r(template_id, grade, code)",
        "--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;",
        *([
            "-- update public.question_templates q",
            "--    set classification_node_id = case when r.sous_notion is null then nn.id else s.id end",
            "--   from (values",
            *valeurs([f"('{m['id']}'::uuid, {ch(m['noeud'])})" for m in deplaces], '--   '),
            "--   ) as r(id, branche, notion, sous_notion)",
            "--   join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche",
            "--   join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion",
            "--   left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion",
            "--  where q.id = r.id;",
        ] if deplaces else []),
        *([
            "-- update public.question_templates q",
            "--    set grades = r.grades",
            "--   from (values",
            *valeurs([f"('{m['id']}'::uuid, {tableau(m['grades'])})" for m in changent], '--   '),
            "--   ) as r(id, grades)",
            "--  where q.id = r.id;",
        ] if changent else []),
        "-- update public.question_templates q",
        "--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',",
        "--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)",
        "--   from (values",
        *valeurs([f"('{m['id']}'::uuid, {contenu(m['avant'])})" for m in reecrits], '--   '),
        "--   ) as r(id, c)",
        "--  where q.id = r.id;",
        "-- ROLLBACK:END",
    ]

    # ---- Corps --------------------------------------------------------------------------
    o = [entete.format(n=n, k=k) + '\n' + '\n'.join(rb) + f'''
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp.{tmp}_modeles;
create temporary table {tmp}_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	-- Statut relevé : les neufs en héritent (un brouillon publié depuis publierait ses neufs).
	statut text not null,
	avant jsonb not null, apres jsonb not null,
	-- Nœud d'arrivée (R2 : les points du modèle vivent ailleurs) ; null : il ne bouge pas.
	branche_apres text, notion_apres text, sous_notion_apres text''' + (''',
	-- Niveaux scolaires après la migration (son vrai programme) ; null : ils ne changent pas.
	grades_apres text[]''' if changent else '') + '''
);''']
    for m in modeles:
        o.append(f"insert into {tmp}_modeles values ('{m['id']}', {ch(m['noeud'])}, {tableau(m['grades'])}, "
                 f"'{m['categorie']['status']}',\n"
                 f"  {contenu(m['avant'])},\n  {contenu(m['apres'])},\n  {ch(m.get('noeud_apres'))}"
                 + (f", {tableau(m['grades_apres']) if 'grades_apres' in m else 'null'}" if changent else '') + ');')
    o.append(f'''
-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp.{tmp}_tags;
create temporary table {tmp}_tags (
	id uuid not null references {tmp}_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into {tmp}_tags values
''' + ',\n'.join([f"  ('{m['id']}', '{t['grade']}', '{t['code']}', true)" for m in modeles for t in m['tags_avant']]
                 + [f"  ('{i}', '{t['grade']}', '{t['code']}', false)" for i, t in poses]) + ';')
    o.append(f'''
-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp.{tmp}_neufs;
create temporary table {tmp}_neufs (
	id uuid primary key,
	origine uuid not null references {tmp}_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);''')
    for x in neufs:
        o.append(f"insert into {tmp}_neufs values ('{x['id']}', '{x['origine']}', {x['niveau']},\n"
                 f"  {contenu(x['contenu'])},\n  {ch(x.get('noeud'))});")
    o.append(f'''drop table if exists pg_temp.{tmp}_tags_neufs;
create temporary table {tmp}_tags_neufs (
	id uuid not null references {tmp}_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);
insert into {tmp}_tags_neufs values
''' + ',\n'.join(f"  ('{x['id']}', {r}, '{t['grade']}', '{t['code']}')" for x in neufs for r, t in enumerate(x['tags']))
             + ';')
    o.append(f'''
-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table {tmp}_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from {tmp}_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table {tmp}_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from {tmp}_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table {tmp}_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from {tmp}_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table {tmp}_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from {tmp}_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from {tmp}_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from {tmp}_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from {tmp}_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from {tmp}_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from {tmp}_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from {tmp}_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from {tmp}_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from {tmp}_resolus_tags_neufs where point_id is null)
			+ (select count(*) from {tmp}_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from {tmp}_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join {tmp}_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from {tmp}_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, {n}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur {n}', v_presents;
	end if;
	select count(*) into v_contenus from {tmp}_modeles r
	  join public.question_templates q on q.id = r.id
	 where {EMPREINTE} is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from {tmp}_modeles r
	  join {tmp}_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from {tmp}_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join {tmp}_modeles r on r.id = q.template_id
	 where not exists (select 1 from {tmp}_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from {tmp}_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from {tmp}_neufs n
	  join public.question_templates o on o.id = n.origine
	  join public.question_templates q on q.status = 'published' and q.theme = o.theme and q.domain = o.domain
	   and coalesce(q.subdomain, '') = coalesce(o.subdomain, '') and q.level = n.niveau;
	if v_pris <> 0 then
		raise exception 'catégories des modèles neufs déjà prises : %', v_pris;
	end if;
end $garde$;

-- ---- 4. Nouveau contenu des origines, modèles neufs, tags ---------------------------------
update public.question_templates q
   set title = r.apres->>'title',
       description = r.apres->>'description',
       variations = r.apres->'variations',
       shared = nullif(r.apres->'shared', 'null'::jsonb),
       test_specs = nullif(r.apres->'test_specs', 'null'::jsonb)
  from {tmp}_modeles r
 where q.id = r.id{filtre};

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from {tmp}_resolus x
 where q.id = x.id and x.deplace;

''' + (f'''-- Niveau scolaire : le modèle passe dans son vrai programme, AVANT ses modèles neufs (qui le
-- copient).
update public.question_templates q
   set grades = r.grades_apres
  from {tmp}_modeles r
 where q.id = r.id and r.grades_apres is not null;

''' if changent else '') + f'''insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from {tmp}_resolus_tags x
  join public.question_templates q on q.id = x.id
 where not x.avant;

-- Modèles neufs : toutes les colonnes de l'origine (type, options, nœud, niveaux scolaires, statut,
-- auteur…), puis leur propre identifiant, leur niveau dans la catégorie, leur contenu, leur nœud s'il
-- est propre et des dates neuves. Rien n'est créé si l'origine est absente.
insert into public.question_templates
select (jsonb_populate_record(null::public.question_templates,
	to_jsonb(q) || n.contenu
	  || jsonb_build_object('id', n.id, 'level', n.niveau, 'created_at', now(), 'updated_at', now())
	  || case when x.noeud_propre then jsonb_build_object('classification_node_id', x.noeud) else '{{}}'::jsonb end)).*
  from {tmp}_neufs n
  join {tmp}_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from {tmp}_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from {tmp}_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from {tmp}_modeles r
	  join {tmp}_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where {EMPREINTE} = r.apres and q.classification_node_id = x.noeud_apres''' + (
        '\n   and q.grades = coalesce(r.grades_apres, r.grades)' if changent else '') + f''';
	select count(*) into v_tags from {tmp}_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join {tmp}_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * {len(poses) + sum(len(m['tags_avant']) for m in modeles)} then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from {tmp}_neufs n
	  join {tmp}_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where {EMPREINTE} = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from {tmp}_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join {tmp}_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * {k} or v_neufs_tags <> least(v_presents, 1) * {kt} or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp.{tmp}_resolus_tags_neufs;
drop table pg_temp.{tmp}_resolus_neufs;
drop table pg_temp.{tmp}_resolus_tags;
drop table pg_temp.{tmp}_resolus;
drop table pg_temp.{tmp}_tags_neufs;
drop table pg_temp.{tmp}_neufs;
drop table pg_temp.{tmp}_tags;
drop table pg_temp.{tmp}_modeles;
''')
    return '\n'.join(o)
