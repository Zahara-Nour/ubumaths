"""Écrit l'instantané `etat-prod-2026-11-03-etapes/` des 14 modèles de démonstrations (lot 4).

Relevé de la prod du 2026-11-03 au MCP Supabase (LECTURE SEULE ; le script `releve-prod.ts` a été
refusé par le classifieur du mode auto). Le contenu (variations, specs) n'est pas recopié du MCP : c'est
l'ancienne source (`git show origin/main:scripts/questions/1spe-demonstrations-*/…`), dont les md5 jsonb
ont été comparés à ceux de la prod, un à un (14/14 identiques). Le reste (catégorie, nœud, tags, points,
chemin des nœuds) est recopié du relevé MCP ; l'empreinte complète (titre, description, variations,
shared, specs) relevée au MCP est vérifiée ici contre l'ancienne source.

    python3 docs/archive/wip/questions-1spe-demonstrations/etat_prod_releve.py
"""

import json
import os
import subprocess
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
from scissions_outils import md5  # noqa: E402

ETAT = 'docs/archive/wip/questions-1spe-demonstrations/etat-prod-2026-11-03-etapes/'

# id → (fichier source, theme, domain, level, nœud, empreinte md5 relevée, point_id, code)
RELEVE = {
    '0931c87e-2038-422e-a783-a096c3bd23e8': ('3/02-demontrer-cos-sin-pi-sur-3', 'Fonctions', 'Fonctions trigonométriques', 2, 'f7e20059-daa8-400c-bab1-42c02f37f252', '999e7781ea74f8b6020f5eccd742b977', 'c0c59eb8-72db-4aeb-a530-b788e7ed1d51', '1SPE-411'),
    '16ee6f33-695d-45c0-b6fe-deb1ae02138f': ('2/05-demontrer-derivee-produit', 'Fonctions', 'Dérivation', 5, 'a4c971ee-ce04-4d1b-bf4f-22653977b4b7', '320895c4111306958873321a6815c166', '5d2e616e-d67c-4270-8e0b-5b35e7bf07d6', '1SPE-278'),
    '5fbb9a04-d4c3-4810-b717-075493df916b': ('1/03-demontrer-somme-des-entiers', 'Suites', 'Sommes', 1, '3890b49e-ea75-49dd-8ecf-8a82671a79f1', '076668f456249085901a1d711891829c', 'd504739f-671f-4946-80a6-b2384bfa1ec8', '1SPE-234'),
    '66ecbb33-60fc-46a9-bdfe-2a978c5dec47': ('3/01-demontrer-cos-sin-pi-sur-4', 'Fonctions', 'Fonctions trigonométriques', 1, 'f7e20059-daa8-400c-bab1-42c02f37f252', '95016ba591b8a5b70b4bb7f2200b60c6', 'c25400dc-38f2-4132-8d01-83bd598a6dd6', '1SPE-308'),
    '8865b98c-ba20-4188-bd16-5c6637cd6fad': ('1/05-demontrer-resolution-second-degre', 'Fonctions', 'Polynôme du second degré', 1, '34c8c2c8-8911-4952-bd9a-edbe69e61552', 'b3b473cb567da9d4284655186561fb45', '048b1cd4-b31e-4083-a711-f078d2957544', '1SPE-255'),
    '9e377c97-6940-48c9-9442-d64f05cb9a94': ('2/01-demontrer-equation-tangente', 'Fonctions', 'Dérivation', 4, 'e7f414da-e4fa-49cb-9b96-b1b2e0f1068d', '536948f6a4e5eba05a58efdd257bce8d', '0c4f81cb-41ce-48f9-a053-57f1828cfa22', '1SPE-275'),
    'a81c4c9f-7a25-48a4-89c4-d48cadf0fa1b': ('1/01-demontrer-terme-general-arithmetique', 'Suites', 'Suites arithmétiques', 1, '51c396af-438d-4b70-9e45-0dc7ffb39549', 'e7312eb683f3c8b7fe65984c5870cbe5', '0bc6a39b-1057-42ef-ac04-8e3cc381d8c9', '1SPE-232'),
    'acaeb02a-e934-43b6-99bc-46bb1ffb4f0f': ('1/02-demontrer-terme-general-geometrique', 'Suites', 'Suites géométriques', 1, 'c89e6615-e4f2-447e-baba-ac49c14dee5a', 'd8f0d3ed3732112160783d218d19e62f', 'ddd55166-7527-4164-b27f-27bda728c4fc', '1SPE-233'),
    'b05ec37a-3e3a-4a98-bd32-635636b84281': ('2/03-demontrer-derivee-carre', 'Fonctions', 'Dérivation', 1, '9f11f79d-6065-4361-a40f-df8d9dd52a9a', 'e1c748197dbeb8cf61feb0a19d505601', '276b995e-7864-4bdd-b83f-9d8110db5a78', '1SPE-277'),
    'b554a47f-1b2e-4530-a979-44d785890adf': ('1/04-demontrer-somme-geometrique', 'Suites', 'Sommes', 2, '2adca282-538d-4779-81aa-84b368d1765f', 'e19d6c65e376acbcf96f6a993e6a2c13', '0b071bc8-1dad-420a-ad40-c37ebb014909', '1SPE-235'),
    'dbdf02be-9dbe-4b9a-97ff-3ab197135785': ('3/04-demontrer-cercle-de-diametre', 'Géométrie', 'Produit scalaire', 2, '26b15bc5-3885-432e-9cb7-518da9d73fd0', '2efcfdb125dfd42acbf48ec2d89faed2', '29a6f5aa-3562-4fcf-8835-b6e7b3420ed1', '1SPE-323'),
    'e2908d60-2360-453c-a6e2-5c0318d8b9b2': ('2/04-demontrer-derivee-inverse', 'Fonctions', 'Dérivation', 2, '9f11f79d-6065-4361-a40f-df8d9dd52a9a', '54383e006d785034d7f5d38748e90be4', 'ce622044-972d-4ee2-8bb8-02c153938e34', '1SPE-398'),
    'e8011f4e-72fe-4419-8ba2-6956775ce5f7': ('3/03-demontrer-al-kashi', 'Géométrie', 'Produit scalaire', 1, '35cfd263-d25e-4680-ae51-471ef852b8ac', 'ebb468f914aa7e1a0129ecd5b3d9db75', '9c350800-6959-4560-9229-92ab5c367d12', '1SPE-322'),
    'f7938cd3-471f-43e8-81e0-3108215d399a': ('2/02-demontrer-racine-non-derivable-en-0', 'Fonctions', 'Dérivation', 3, '3cfed021-5c0a-4150-8b81-2558a8561682', '59d0169df7aab1113e43377c2799545d', '3e352a07-222c-4a63-ba22-30ac0c6a9f9c', '1SPE-276'),
}

# Les 12 nœuds des modèles et leurs ancêtres (relevé MCP, chemin complet)
NOEUDS = [
    ('13322c55-ec45-43c5-9c84-3fb034df583e', '808d6f9c-1b5d-4796-86dd-0bdb185b34f1', 'notion', 'Produit scalaire'),
    ('26b15bc5-3885-432e-9cb7-518da9d73fd0', '13322c55-ec45-43c5-9c84-3fb034df583e', 'subnotion', 'lieux de points'),
    ('26ca7245-f68b-423b-a1e3-ba8f10edb5f4', 'b138aafc-ad8a-4c13-8865-46fa2684e888', 'notion', 'Fonctions trigonométriques'),
    ('2adca282-538d-4779-81aa-84b368d1765f', 'c90700c5-6111-437b-b66f-fdc76f3b1720', 'subnotion', 'somme des termes'),
    ('34c8c2c8-8911-4952-bd9a-edbe69e61552', '51bba43f-bb50-41e8-8e91-865ffc8e1fc1', 'subnotion', 'discriminant'),
    ('35cfd263-d25e-4680-ae51-471ef852b8ac', '13322c55-ec45-43c5-9c84-3fb034df583e', 'subnotion', 'angles et longueurs'),
    ('3890b49e-ea75-49dd-8ecf-8a82671a79f1', '7ed1251c-fd0a-4319-8715-aeac8e2dee22', 'subnotion', 'somme des termes'),
    ('3cfed021-5c0a-4150-8b81-2558a8561682', 'ccfd8ed9-1edf-411b-a540-f41afd66103a', 'subnotion', 'dérivabilité en un point'),
    ('51bba43f-bb50-41e8-8e91-865ffc8e1fc1', '600d983b-da8d-4d22-8c9a-e5e8eda869fa', 'notion', 'Équations : second degré'),
    ('51c396af-438d-4b70-9e45-0dc7ffb39549', '7ed1251c-fd0a-4319-8715-aeac8e2dee22', 'subnotion', 'terme général'),
    ('600d983b-da8d-4d22-8c9a-e5e8eda869fa', None, 'branch', 'Algèbre'),
    ('7ed1251c-fd0a-4319-8715-aeac8e2dee22', 'bfe69202-e5bb-4f9b-9f5e-6ce92f176542', 'notion', 'Suites arithmétiques'),
    ('808d6f9c-1b5d-4796-86dd-0bdb185b34f1', None, 'branch', 'Géométrie'),
    ('9f11f79d-6065-4361-a40f-df8d9dd52a9a', 'ccfd8ed9-1edf-411b-a540-f41afd66103a', 'subnotion', 'fonctions dérivées'),
    ('a4c971ee-ce04-4d1b-bf4f-22653977b4b7', 'ccfd8ed9-1edf-411b-a540-f41afd66103a', 'subnotion', 'opérations sur les dérivées'),
    ('b138aafc-ad8a-4c13-8865-46fa2684e888', None, 'branch', 'Fonctions'),
    ('bfe69202-e5bb-4f9b-9f5e-6ce92f176542', None, 'branch', 'Suites'),
    ('c89e6615-e4f2-447e-baba-ac49c14dee5a', 'c90700c5-6111-437b-b66f-fdc76f3b1720', 'subnotion', 'terme général'),
    ('c90700c5-6111-437b-b66f-fdc76f3b1720', 'bfe69202-e5bb-4f9b-9f5e-6ce92f176542', 'notion', 'Suites géométriques'),
    ('ccfd8ed9-1edf-411b-a540-f41afd66103a', 'b138aafc-ad8a-4c13-8865-46fa2684e888', 'notion', 'Dérivation'),
    ('e7f414da-e4fa-49cb-9b96-b1b2e0f1068d', 'ccfd8ed9-1edf-411b-a540-f41afd66103a', 'subnotion', 'tangente'),
    ('f7e20059-daa8-400c-bab1-42c02f37f252', '26ca7245-f68b-423b-a1e3-ba8f10edb5f4', 'subnotion', "cosinus et sinus d'un réel"),
]


def ancienne_source(court: str) -> dict:
    d, nom = court.split('/')
    chemin = f'scripts/questions/1spe-demonstrations-{d}/{nom}.json'
    texte = subprocess.run(['git', 'show', f'origin/main:{chemin}'], check=True,
                           capture_output=True, text=True).stdout
    return json.loads(texte)


if __name__ == '__main__':
    templates, tags, points = [], [], []
    for i, (court, theme, domain, level, noeud, empreinte, point, code) in sorted(RELEVE.items()):
        s = ancienne_source(court)
        t = {'id': i, 'theme': theme, 'domain': domain, 'subdomain': 'Démonstrations', 'level': level,
             'status': 'published', 'grades': ['1_SPE'], 'classification_node_id': noeud,
             'title': s['title'], 'description': s['description'], 'variations': s['variations'],
             'shared': {}, 'test_specs': s['testSpecs']}
        assert md5({k: t[k] for k in ('title', 'description', 'variations', 'shared', 'test_specs')}) == empreinte, court
        templates.append(t)
        tags.append({'template_id': i, 'point_id': point})
        points.append({'id': point, 'code': code, 'grade': '1_SPE', 'node_id': noeud, 'archived_at': None})
    nodes = [{'id': a, 'parent_id': p, 'kind': k, 'name': n, 'archived_at': None} for a, p, k, n in NOEUDS]
    os.makedirs(ETAT, exist_ok=True)
    for nom, x in (('templates', templates), ('tags', tags), ('points', sorted(points, key=lambda p: p['code'])),
                   ('nodes', nodes)):
        with open(f'{ETAT}{nom}.json', 'w') as f:
            json.dump(x, f, ensure_ascii=False, indent='\t')
            f.write('\n')
    print(f'{len(templates)} modèles, empreintes = prod')
