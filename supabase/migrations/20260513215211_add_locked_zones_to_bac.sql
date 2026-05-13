-- Migration: Add locked-zones markers to real Bac exercises
-- Created: 2026-05-13
--
-- For each Bac exercise, every line containing `# à compléter`
-- in its `starter_code` is wrapped with a locked-zones marker
-- `{{id | "default"}}` so the student editor allows editing
-- only those spots. The rest of the buffer stays read-only.
--
-- The `validation_config` and `solution_code` are NOT touched
-- — this migration is purely about the student editing UX.
--
-- Generated via scripts/generate-bac-locked-zones-migration.ts

-- Bac Amérique du Nord 03/2023 Q7 — Seuil 1280 — clubs sportifs (3 zones)
UPDATE python_exercises
SET starter_code = 'def seuil():
    n = 0
    A = 1700
    while {{cond | "False"}}:    # à compléter (condition sur A et 1280)
        n = n + 1
        A = {{update_A | "..."}}     # à compléter (relation de récurrence)
    return {{result | "..."}}      # à compléter (que doit-on renvoyer ?)
'
WHERE id = '72200560-cf09-4ac2-8b91-834267dd7762';

-- Bac Amérique du Nord 05/2024 Q5 — Suite d'intégrales — seuil de 0,1 (1 zones)
UPDATE python_exercises
SET starter_code = 'from math import *

def seuil():
    n = 0
    I = 2
    while {{cond | "False"}}:    # à compléter (condition sur I et 0.1)
        n = n + 1
        I = (1 + exp(-n * pi)) / (n * n + 1)
    return n
'
WHERE id = '08bfdc89-4073-452b-9cd9-500bf7059725';

-- Bac Amérique du Nord 05/2024 sujet 2 Q9 — Seuil — suite quadratique 2u − u² (2 zones)
UPDATE python_exercises
SET starter_code = 'def seuil():
    n = 0
    u = 0.5
    while u < 0.95:
        n = {{update_n | "..."}}    # à compléter
        u = {{update_u | "..."}}    # à compléter (relation de récurrence)
    return n
'
WHERE id = '1c42d27a-9664-4a5a-8594-060a5f5d2f4f';

-- Bac Amérique du Nord 05/2025 Q3 — Algorithme de Briggs — approximation de ln(a) (1 zones)
UPDATE python_exercises
SET starter_code = 'from math import *

def Briggs(a):
    n = 0
    while a >= 1.01:
        a = sqrt(a)
        n = n + 1
    L = {{update_L | "..."}}    # à compléter
    return L
'
WHERE id = '094a32c7-d267-47fb-80fd-2a9f5c9a1bbe';

-- Bac Amérique du Sud 09/2022 Q1.b — Suite quadratique u²/5 — calcul du p-ième terme (3 zones)
UPDATE python_exercises
SET starter_code = 'def suite_u(p):
    u = {{update_u | "..."}}    # à compléter (valeur initiale u_0)
    for i in range({{range_args | "1, ..."}}):    # à compléter (borne supérieure)
        u = {{update_u_2 | "..."}}    # à compléter (relation de récurrence)
    return u
'
WHERE id = 'b27aed1a-e815-499b-a10b-5fed9960c070';

-- Bac Amérique du Sud 09/2022 sujet 2 Q6.b — Population — années avant un seuil (4 zones)
UPDATE python_exercises
SET starter_code = 'def population(S):
    n = 0
    u = 2000
    while {{cond | "False"}}:    # à compléter (condition sur u et S)
        u = {{update_u | "..."}}     # à compléter (relation de récurrence)
        n = {{update_n | "..."}}     # à compléter
    return {{result | "..."}}      # à compléter (que doit-on renvoyer ?)
'
WHERE id = '9c290871-6311-48d5-8cf8-62e2578a73c3';

-- Bac Amérique du Sud 09/2023 Q2 — Suite arithmétique récurrente — calcul du n-ième terme (2 zones)
UPDATE python_exercises
SET starter_code = 'def suite_u(n):
    u = {{update_u | "..."}}    # à compléter (valeur initiale u_0)
    for i in range(1, n + 1):
        u = {{update_u_2 | "..."}}    # à compléter (relation de récurrence : utiliser i-1 pour l''indice n de la formule)
    return u
'
WHERE id = '73bf2e59-233b-4236-a2b9-b6a6a57b24ba';

-- Bac Asie 03/2023 Q5 — Désintégration du polonium — liste des termes (1 zones)
UPDATE python_exercises
SET starter_code = 'def noyaux(n):
    V = 6 * 10 ** 21
    L = [V]
    for k in range(n):
        V = {{update_V | "..."}}    # à compléter (relation de récurrence)
        L.append(V)
    return L
'
WHERE id = '6463678c-1ed5-4c2b-a563-4e2d91532d6a';

-- Bac Asie 05/2022 Partie A Q4.a — Médicament — seuil d'efficacité (2 zones)
UPDATE python_exercises
SET starter_code = 'def efficace():
    u = 1
    n = 0
    while {{cond | "False"}}:    # à compléter (condition sur u et 1.8)
        u = {{update_u | "..."}}     # à compléter (relation de récurrence)
        n = n + 1
    return n
'
WHERE id = '6007b2aa-9f96-4b92-9640-03f56a801fce';

-- Bac Asie 05/2022 sujet 2 Q4 — Bactérie — liste des n premiers termes (3 zones)
UPDATE python_exercises
SET starter_code = 'def suite(n):
    p = {{update_p | "..."}}    # à compléter (valeur initiale p_0)
    s = [p]
    for i in range({{range_args | "..."}}):    # à compléter
        p = {{update_p_2 | "..."}}    # à compléter (relation de récurrence)
        s.append(p)
    return s
'
WHERE id = '4bfb4438-9e76-4788-89ff-a495b5919439';

-- Bac Asie 06/2024 Q9 — Seuil — probabilité de gagner (2 zones)
UPDATE python_exercises
SET starter_code = 'def seuil(e):
    g = 0.5
    n = 1
    while {{cond | "False"}}:    # à compléter (condition sur g et 0.4 + e)
        g = 0.5 * g + 0.2
        n = {{update_n | "..."}}     # à compléter
    return n
'
WHERE id = 'db5fb6e2-0178-4869-b356-351d26778076';

-- Bac Centres étrangers 06/2021 Partie A Q1.c — Centrale solaire — seuil 12000 panneaux (3 zones)
UPDATE python_exercises
SET starter_code = 'u = 10560
n = 0
while {{cond | "False"}}:    # à compléter (condition sur u et 12000)
    u = {{update_u | "..."}}     # à compléter (relation de récurrence)
    n = {{update_n | "..."}}     # à compléter
'
WHERE id = 'e5044b96-3d22-40d8-baac-6baa008b790b';

-- Bac Centres étrangers 06/2024 Q4.b — Approximation de ln(2) (2 zones)
UPDATE python_exercises
SET starter_code = 'from math import exp, log as ln

def seuil():
    n = 0
    u = 0.1
    while {{cond | "False"}}:    # à compléter (condition sur ln(2) - u et 0.0001)
        n = n + 1
        u = {{update_u | "..."}}     # à compléter (relation de récurrence)
    return (u, n)
'
WHERE id = 'f4b712ba-7176-4df4-a2fd-8dbbdfa84b51';

-- Bac Centres étrangers 06/2025 Q4 — Croisement de populations (3 zones)
UPDATE python_exercises
SET starter_code = 'n = 0
u = 6
v = 6
while {{cond | "False"}}:    # à compléter (condition d''arrêt sur u et v)
    u = {{update_u | "..."}}     # à compléter (mise à jour de u)
    v = {{update_v | "..."}}     # à compléter (mise à jour de v)
    n = n + 1
print(2025 + n)
'
WHERE id = '67641903-55a7-4fda-a80d-624dea6cedd2';

-- Bac Madagascar 05/2022 Partie B Q1.b — Suites entrelacées exp — termes(n) (2 zones)
UPDATE python_exercises
SET starter_code = 'from math import exp

def termes(n):
    a = 1 / 10
    b = 1
    for k in range(0, n):
        c = {{update_c | "..."}}    # à compléter (nouveau a, à partir de l''ancien b)
        b = {{update_b | "..."}}    # à compléter (mise à jour de b, à partir de l''ancien a)
        a = c
    return (a, b)
'
WHERE id = 'a682b0db-8962-4922-8716-76de8aa3913d';

-- Bac Métropole 06/2021 Q7.c — Décongélation (4 zones)
UPDATE python_exercises
SET starter_code = 'def seuil():
    n = 0
    T = {{update_T | "..."}}       # à compléter
    while {{cond | "..."}}:    # à compléter
        T = {{update_T_2 | "..."}}   # à compléter
        n = n + 1
    return {{result | "..."}}    # à compléter
'
WHERE id = 'd535f6ae-d8bf-4daa-9d04-0176866f6d34';

-- Bac Métropole 06/2024 Q5.a — Seuil — suite avec ln(u²+1) (2 zones)
UPDATE python_exercises
SET starter_code = 'from math import log as ln

def seuil(h):
    n = 0
    u = 7
    while {{cond | "False"}}:    # à compléter (condition sur u et h)
        n = n + 1
        u = {{update_u | "..."}}     # à compléter (relation de récurrence)
    return n
'
WHERE id = 'c4c6c934-237c-40e3-b16e-9bbd42c1dc00';

-- Bac Métropole 06/2024 sujet 2 Partie A Q4 — Alerte chlore (3 zones)
UPDATE python_exercises
SET starter_code = 'def alerte_chlore(s):
    n = 0
    u = 0.7
    while {{cond | "False"}}:    # à compléter (condition sur u et s)
        n = {{update_n | "..."}}     # à compléter
        u = {{update_u | "..."}}     # à compléter (relation de récurrence)
    return n
'
WHERE id = 'fddbcaf8-6245-48c6-9293-194b35782e88';

-- Bac Métropole 06/2025 Q3.b — Posidonie — seuil de 14 hectares (3 zones)
UPDATE python_exercises
SET starter_code = 'def seuil():
    n = 0
    u = 1
    while {{cond | "False"}}:    # à compléter (condition d''arrêt sur u)
        n = {{update_n | "..."}}     # à compléter
        u = {{update_u | "..."}}     # à compléter
    return n
'
WHERE id = '4c686bcf-19fa-4a39-9593-5a6e68b58189';

-- Bac Métropole 09/2021 Q3 — Seuil — suite homographique 4u/(1+3u) (2 zones)
UPDATE python_exercises
SET starter_code = 'def seuil(E):
    u = 0.5
    n = 0
    while {{cond | "False"}}:    # à compléter (condition sur 1 - u et E)
        u = {{update_u | "..."}}     # à compléter (relation de récurrence)
        n = n + 1
    return n
'
WHERE id = '86081be4-ade5-44b8-8b75-38d10d5ee41b';

-- Bac Métropole 09/2023 Q2 — Suite n/eⁿ — calcul du n-ième terme (2 zones)
UPDATE python_exercises
SET starter_code = 'from math import e

def suite(n):
    u = {{update_u | "..."}}    # à compléter (valeur initiale u_1)
    for i in range(1, n):
        u = {{update_u_2 | "..."}}    # à compléter (relation de récurrence)
    return u
'
WHERE id = '8c9facc7-f4b0-4a5a-b41c-43882bc5fea0';

-- Bac Nouvelle Calédonie 08/2023 Q4 — Seuil 10⁷ — suite 5u − 4n − 3 (2 zones)
UPDATE python_exercises
SET starter_code = 'def suite():
    u = 3
    n = 0
    while {{cond | "False"}}:    # à compléter (condition sur u et 10**7)
        u = {{update_u | "..."}}     # à compléter (relation de récurrence)
        n = n + 1
    return n
'
WHERE id = '342e98b4-6e04-491d-abf1-eb1a067f59fd';

-- Bac Nouvelle Calédonie 08/2023 sujet 2 Q2 — Suite homographique — calcul du n-ième terme (2 zones)
UPDATE python_exercises
SET starter_code = 'def terme(n):
    u = {{update_u | "..."}}    # à compléter (valeur initiale u_0)
    for i in range(n):
        u = {{update_u_2 | "..."}}    # à compléter (relation de récurrence)
    return u
'
WHERE id = '4ca5b349-14ba-4879-8cb8-5b1e6bfa8c50';

-- Bac Polynésie 05/2022 Q1.b — Suite 1/(n+1) — liste des termes (2 zones)
UPDATE python_exercises
SET starter_code = 'def liste(k):
    L = []
    u = {{update_u | "..."}}    # à compléter (valeur initiale u_0)
    for i in range(0, k + 1):
        L.append(u)
        u = {{update_u_2 | "..."}}    # à compléter (relation de récurrence)
    return L
'
WHERE id = 'c1808174-5f22-485e-a726-1867d4c0288c';

-- Bac Polynésie 06/2024 Partie A Q1 — Suite homographique — calcul du n-ième terme (2 zones)
UPDATE python_exercises
SET starter_code = 'def suite(n):
    u = {{update_u | "..."}}    # à compléter (valeur initiale u_0)
    for i in range(n):
        {{stmt | "..."}}    # à compléter (relation de récurrence)
    return u
'
WHERE id = 'b6459994-fd00-4188-9102-0533a5ee242d';

-- Bac Polynésie 09/2023 Q5 — Seuil — suite divergente 3u²/4 − 2u + 3 (3 zones)
UPDATE python_exercises
SET starter_code = 'def seuil():
    u = 3
    n = 0
    while {{cond | "False"}}:    # à compléter (condition sur u et 100)
        u = {{update_u | "..."}}     # à compléter (relation de récurrence)
        n = {{update_n | "..."}}     # à compléter
    return n
'
WHERE id = '8def2290-c9b3-4741-bcfa-b65f7ce7c83d';

-- Bac Polynésie 09/2024 Q2.b — Pyramide de boules (2 zones)
UPDATE python_exercises
SET starter_code = 'def pyramide(n):
    S = 0
    for i in range(1, n + 1):
        S = {{update_S | "..."}}   # à compléter
    return {{result | "..."}}    # à compléter
'
WHERE id = '459aefe4-5686-4c90-9309-e8ce3135abbd';

