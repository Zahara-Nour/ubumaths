"""Génère la page à cocher de l'étape a (passe des points du lycée) depuis propositions.tsv.

Usage : python3 docs/wip/passe-lycee/page/generer.py
Sortie : docs/wip/passe-lycee/page/passe-lycee.html (publiée comme artifact, réponses dans la base de l'artifact,
collection `reponses`, un document par proposition : {choix: 'ok'|'revoir', commentaire, maj}).
"""

import csv
import html
import json
import pathlib
import re

ICI = pathlib.Path(__file__).parent
RACINE = ICI.parent
E = html.escape

PROGRAMMES = {
    '2de': 'Seconde',
    '1spe': '1re spécialité',
    '1gen': '1re générale (ens. sci.)',
    '1techno': '1re technologique',
    'tspe': 'Terminale spécialité',
    'tcomp': 'Terminale maths complémentaires',
    'texp': 'Terminale maths expertes',
    'ttechno': 'Terminale technologique',
}
TYPES = {
    'COUPE': 'Coupe',
    'ARCHIVE': 'Archivage',
    'AUTO': 'Point ⚙ neuf',
    'RETABLI': 'Puce rétablie',
    'AUTRE_RETRAIT': 'Retrait du seed',
    'GARDE': 'Non-coupe',
}


def lignes():
    with open(RACINE / 'propositions.tsv', encoding='utf-8') as f:
        return list(csv.DictReader(f, delimiter='\t'))


def fiche(r):
    libs = [l.strip() for l in (r.get('libelles_proposes') or '').split(' || ') if l.strip()]
    code = r['code'].strip()
    items = ''.join(
        f'<li><span class="code">{E(code) if i == 0 else "neuf"}</span><span class="lib">{E(l)}</span></li>'
        for i, l in enumerate(libs)
    )
    actuel = (r.get('libelle_actuel') or '').strip()
    meta = []
    if r.get('noeud'):
        meta.append(f'<span>Nœud : {E(r["noeud"])}</span>')
    if r.get('famille'):
        meta.append(f'<span>Famille : {E(r["famille"])}</span>')
    if (r.get('tags_prod') or '0').strip() not in ('', '0'):
        meta.append(f'<span class="tags">{E(r["tags_prod"])} modèle(s) tagué(s) en prod</span>')
    statut = r['statut'].strip()
    return f'''<article class="fiche" id="{E(r["id"])}" data-id="{E(r["id"])}" data-prog="{E(r["programme"])}" data-statut="{E(statut)}">
  <header><span class="pid">{E(r["id"])}</span><span class="type t-{E(r["type"])}">{E(TYPES.get(r["type"], r["type"]))}</span>
  <span class="regle">règle {E(r.get("regle") or "—")}</span>{'<span class="atr">à trancher</span>' if statut == 'A_TRANCHER' else ''}
  <span class="pcode">{E(code)}</span></header>
  {f'<p class="actuel"><b>Aujourd’hui :</b> {E(actuel)}</p>' if actuel else ''}
  {f'<ol class="libs">{items}</ol>' if items else ''}
  <p class="bo"><b>BO</b> {E(r.get("ligne_bo") or "")}</p>
  <p class="justif">{E(r.get("justification") or "")}</p>
  {f'<p class="meta">{"".join(meta)}</p>' if meta else ''}
  {'<p class="renvoi">À trancher : réponds dans la question correspondante, en tête de page.</p>' if statut == 'A_TRANCHER' else f'''<div class="rep">
    <div class="choix" role="group" aria-label="Réponse pour {E(r["id"])}">
      <button type="button" data-choix="ok">OK</button>
      <button type="button" data-choix="revoir">À revoir</button>
    </div>
    <label class="com-l" for="c-{E(r["id"])}">Commentaire</label>
    <textarea id="c-{E(r["id"])}" rows="2" placeholder="Ta version, ta remarque…"></textarea>
    <span class="etat" aria-live="polite"></span>
  </div>'''}
</article>'''


def questions():
    texte = (RACINE / 'questions.md').read_text(encoding='utf-8')
    bloc = texte.split('## Questions', 1)[1].split('\n## ', 1)[0]
    qs = re.findall(r'^(\d+)\. (.+?)(?=^\d+\. |^Hors de cette étape|\Z)', bloc, flags=re.S | re.M)
    return [(f'Q{int(n):02d}', ' '.join(t.split())) for n, t in qs]


def md(t):
    t = E(t)
    return re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)


def fiche_q(qid, t):
    return f'''<article class="fiche q" id="{qid}" data-id="{qid}" data-prog="questions" data-statut="A_TRANCHER">
  <header><span class="pid">{qid}</span><span class="atr">question</span></header>
  <p class="justif">{md(t)}</p>
  <div class="rep">
    <div class="choix" role="group" aria-label="Réponse à {qid}">
      <button type="button" data-choix="ok">Je suis la reco</button>
      <button type="button" data-choix="revoir">Autre choix</button>
    </div>
    <label class="com-l" for="c-{qid}">Commentaire</label>
    <textarea id="c-{qid}" rows="2" placeholder="Ton choix, ta remarque…"></textarea>
    <span class="etat" aria-live="polite"></span>
  </div>
</article>'''


def main():
    rs = lignes()
    qs = questions()
    sections = [f'<section class="prog" data-prog="questions"><h2>Questions à trancher <small>{len(qs)} questions · elles couvrent les fiches « à trancher »</small></h2>'
                + '\n'.join(fiche_q(q, t) for q, t in qs) + '</section>']
    for p, nom in PROGRAMMES.items():
        du = [r for r in rs if r['programme'].strip() == p]
        if not du:
            continue
        atr = sum(1 for r in du if r['statut'].strip() == 'A_TRANCHER')
        sections.append(
            f'<section class="prog" data-prog="{p}"><h2>{E(nom)} <small>{len(du)} propositions · {atr} à trancher</small></h2>'
            + f'<p class="lot"><button type="button" class="tout-ok" data-prog="{p}">Marquer OK les fiches sans réponse de ce programme</button></p>'
            + '\n'.join(fiche(r) for r in du)
            + '</section>'
        )
    ids = [q for q, _ in qs] + [r['id'] for r in rs if r['statut'].strip() != 'A_TRANCHER']
    tpl = (ICI / 'gabarit.html').read_text(encoding='utf-8')
    out = (
        tpl.replace('%%SECTIONS%%', '\n'.join(sections))
        .replace('%%TOTAL%%', str(len(ids)))
        .replace('%%IDS%%', json.dumps(ids))
        .replace('%%PROGS%%', json.dumps(PROGRAMMES, ensure_ascii=False))
    )
    (ICI / 'passe-lycee.html').write_text(out, encoding='utf-8')
    print(len(qs), 'questions,', len(rs), 'fiches,', len(ids), 'à répondre')


main()
