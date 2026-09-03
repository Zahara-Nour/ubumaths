-- Traductions anglaises des exercices de seconde
-- ===========================================================================
--
-- 30 exercices, 30 variations, 30 énoncés traduits. Toutes les solutions de ces
-- exercices sont des placeholders (« a » ou « * ») : il n'y avait rien à
-- traduire de ce côté.
--
-- Complète la migration 20260907090000 (1ʳᵉ spé) : ce sont les exercices de
-- seconde qui composent les fiches en cours.
--
-- Le français reste la source de vérité : chaque UPDATE se contente d'AJOUTER
-- la clé translations.en dans la variation visée via jsonb_set. Aucun champ
-- français n'est réécrit.
--
-- VERROU OPTIMISTE : chaque UPDATE porte l'empreinte md5 des variations telles
-- que lues le 2026-09-03. Un exercice modifié depuis n'est PAS mis à jour
-- plutôt que d'écraser le travail du professeur. Le bloc final distingue le
-- succès, le no-op local et le cas où le verrou a mordu.
--
-- Contrôle passé avant génération : 210 comparaisons de jetons mathématiques
-- entre français et anglais, aucun écart. Les traductions ont ensuite été
-- relues par Postgres et comparées au md5 près à la source.

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Which of these numbers are terminating decimals?\n\n1. ~-5~\n2. ~5/7~\n3. ~3/40~\n4. ~40/3~"}}'::jsonb, true)
  WHERE id = '404a165e-a08f-4ed9-ae4d-a208dcdcbaed' AND md5(variations::text) = 'f22a3a1385a1fe2082ef04d5eb3dffac';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Find two different irrational numbers whose product is irrational."}}'::jsonb, true)
  WHERE id = 'c0f51946-d4bf-4ddd-b61c-8a13f75623f0' AND md5(variations::text) = '27618fe9f497e84d26794c91ee2968c4';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Find two different irrational numbers whose product is a natural number."}}'::jsonb, true)
  WHERE id = '62c800f1-c1f1-4dd8-ab38-f625146a0a09' AND md5(variations::text) = '92c407226e37d00c0fe0cfb052bf5572';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Expand and simplify the following expressions. \n\n1. ~A=x-3(x-7)~\n2. ~B=(3x-2)^2~\n3. ~C=(2x-5)(2x+5)~"}}'::jsonb, true)
  WHERE id = 'd148cf3b-5885-4075-8da8-6c1abf16ee95' AND md5(variations::text) = '00978d88fdbaa4489169b7c0a8ce254d';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Find bounds for ~x^2~ in each of the following cases. \n\n1. $-8\\leqslant x<-3$\n2. ~2<x<=7~\n3. ~-4<=x<2~"}}'::jsonb, true)
  WHERE id = '31aa21df-4bc9-4d6a-a09e-8afe44262e78' AND md5(variations::text) = '813c3b1c6d27b98f610cf39107cf8f0c';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Consider a circle whose circumference is rational. Prove that its diameter must be irrational."}}'::jsonb, true)
  WHERE id = 'b90a0da1-91a4-4b92-98ce-a58430495991' AND md5(variations::text) = '4d19734ea56d80afff5ec9f84b59ad47';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Simplify the following fractions.\n\n1. ~{2^5*3^4}/{2^8*3^2}~\n2. ~{3^3*2^5}/{6^4}~\n3. ~{12^3*10^4}/{15^2*8^2}~"}}'::jsonb, true)
  WHERE id = 'c5e3535c-622d-4d95-aa4a-2bcce0da34c1' AND md5(variations::text) = 'c27655ed60f3730a65beec7dfab2f6a2';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Solve the following equations and inequalities in $\\mathbb{R}$. \n\n1. ~x^2=25~\n2. ~3x^2+7=4~\n3. ~x^2>5~\n4. ~6-5x^2>=1~"}}'::jsonb, true)
  WHERE id = 'e4e6e667-8026-4e53-868b-8358f3fe59c0' AND md5(variations::text) = '42b739f9bc468350b0a940a8ded1de38';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Determine the sign of each of the following expressions, defined on $\\mathbb{R}$. \n\n1. ~5x-8~\n2. ~6-3x~\n3. ~(2x-3)(7-5x)~\n4. ~-1/2x^2~"}}'::jsonb, true)
  WHERE id = 'd483e500-2d7f-4990-9f17-32248cedf30d' AND md5(variations::text) = 'a8b4bb9706a66c88e4f09107971fc005';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Simplify the following. \n\n1. ~sqrt(8)~\n2. ~sqrt(48)~\n3. ~sqrt(98)~\n4. ~{-12+sqrt(36)}/6~\n5. ~{6-sqrt(27)}/3~\n6. ~{2+sqrt(12)}/2~"}}'::jsonb, true)
  WHERE id = 'a1dc3e21-daba-4e71-b264-8842b193fe5b' AND md5(variations::text) = 'b585e1da65828ed3ca48e5fe62fe7528';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"What is the smallest number set that each of the following numbers belongs to? \n\n1.  ~1/2~\n\n2. ~sqrt(5)~\n3. ~{10-4}/3~\n4. ~-sqrt(16)~"}}'::jsonb, true)
  WHERE id = '0de9d117-3510-49a9-a543-2711a5221cdf' AND md5(variations::text) = 'bf1054ced7b07472fb91946463b56f55';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Work out the following numbers.\n\n*Give each answer in its simplest form.*\n\n1. ~{10-sqrt(16)}/4~\n2. ~{5+sqrt(9)}/6~\n3. ~{-6-sqrt(12)}/2~\n4. ~{8+sqrt(48)}/4~"}}'::jsonb, true)
  WHERE id = '08728a1e-6d35-4b0c-a55d-20ca76ac3c98' AND md5(variations::text) = '79ffb9b7694427338aee89079e674b52';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"What is the smallest number set that each of the following numbers belongs to? \n\n1. ~1/2+1/3+1/6~\n2. ~sqrt(16)-sqrt(25)~\n3. ~91/7~\n4. ~34/2-sqrt(289)~"}}'::jsonb, true)
  WHERE id = '2500c746-b39d-4b38-9618-fd8839257ff1' AND md5(variations::text) = 'd8afa950042adca99fcf6fc70d3c00d1';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Give the solution set of each of the following inequalities, as an interval.\n\n1. ~4/3x>6/5~\n2. ~-2/3x+1<=5/7~\n3. ~-2x-2/9<1/2x~\n4. ~2x-1/3>=1/5+7/3x~"}}'::jsonb, true)
  WHERE id = 'f98599fb-23dc-403f-9336-b63778fc35ee' AND md5(variations::text) = 'd2594c970f08b277dd5845566c2b8fe3';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Factorise the following expressions. \n\n1. ~A=x^2-36~\n2. ~B=9x^2-25~\n3. ~C=1-4y^2~\n4. ~D=(-2x+1)^2-4~\n5. ~E=25-(2x+5)^2~\n6. ~F=7-(x+1)^2~\n7. ~G=(2x-3)^2-(x+1)^2~\n8. ~H=(3x+1)^2-(x-7)^2~"}}'::jsonb, true)
  WHERE id = 'ddd94712-02ed-4a0b-b4eb-51fc0d5a4be5' AND md5(variations::text) = 'eb037bc058cc86cadc984c672474f74e';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Are the following statements true or false? Justify your answer. \n\n1. The quotient of two distinct prime numbers can be an integer.\n2. The quotient of two distinct prime numbers can be a terminating decimal."}}'::jsonb, true)
  WHERE id = 'f5df524b-b2c9-4f3e-ad08-35581f61c35d' AND md5(variations::text) = '391995d24a00793270781311733aa275';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Let ~f~ be the function defined on $\\mathbb{R}$ by\n\n~~f(x)=3x^2-10x-3~~\n\nWork out ~f(a)~ for each of the following values of ~a~.\n\n1. ~a=-1/2~\n2. ~a=sqrt(3)~\n3. ~a=sqrt(2)/5~\n4. ~a={1+sqrt(2)}/2~\n5. ~a=-{1-sqrt(5)}/2~\n6. ~a={sqrt(8)-4}/2~"}}'::jsonb, true)
  WHERE id = '5b233301-0115-45d0-bcc9-a5caf9444e73' AND md5(variations::text) = '138d74eec8041c86fa0daa15af52c129';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"For each statement, say whether it is true or false. \n\n1. ~-3~ is a solution of ~x^2+x-6=0~.\n2. If ~x=2~, then ~3x^2=7x-2~.\n3. For every real ~x~, ~x^2-3x=x-x(4-x)~.\n4. The opposite of ~3x^2-6x+5~ is ~-3x^2+6x+5~.\n5. For every real ~x~, ~(x-7)^2+51.3>0~."}}'::jsonb, true)
  WHERE id = 'e286f938-fae3-456e-9a33-78f52416c10b' AND md5(variations::text) = '0383443d9a2075c70abc71708d87f91f';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"In the plane with orthonormal axes, consider the set of points $M(x\\,;\\,y)$ such that ~1<x<4~ and ~5<=y<=6~.\n\n1. Sketch this set.\n2. Do the same for the set of points $N(x\\,;\\,y)$ such that ~1<=2x+1<=4~ and ~5<2-5y<6~."}}'::jsonb, true)
  WHERE id = '47c20db4-0c53-463a-a88c-d8beee8a7905' AND md5(variations::text) = 'c31d2d9462909ddd40710f6ee96dc6af';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Let ~n~ be a non-zero integer.\n\nIn each of the following cases, factorise the numerator and the denominator of the given fraction ~A(n)~ by ~B(n)~, then give the simplified expression.\n\n1. ~A(n)={n^2-2n+1}/{2n^2+3}~   and   ~B(n)=n^2~\n2. ~A(n)={n^3-3n^2+1}/{n^3-{n^2}/2+5n}~   and   ~B(n)=n^3~"}}'::jsonb, true)
  WHERE id = '366aa2e4-bc14-4f22-9510-9384d8379732' AND md5(variations::text) = '1342ef65be8b646b65f62bdc41b09055';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"In each case, find, where possible, a number ~x~ meeting the following conditions. \n\n1. $x \\in \\mathbb{Q}$ and $x \\notin \\mathbb{N}$\n2. $x \\in \\mathbb{Q}$ and $x \\notin \\mathbb{Z}$\n3. $x \\in \\mathbb{R}$ and $x \\notin \\mathbb{Q}$\n4. $x \\in \\mathbb{Q}$ and $x \\notin \\mathbb{R}$"}}'::jsonb, true)
  WHERE id = '591d7925-b3da-4927-9be0-936e76049cee' AND md5(variations::text) = 'd52fc9e74e70acb93b56db980ea88659';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"The maths teacher makes the claim:\n “The product of two irrational numbers is always a rational number.”\n Josy answers: “True, for example $\\sqrt{2} \\times \\sqrt{2} = 2 \\in \\mathbb{Q}$”.\n Marc answers: “False, for example $\\sqrt{5} \\times \\sqrt{2} \\notin \\mathbb{Q}$”.\n Which student is right?"}}'::jsonb, true)
  WHERE id = '78452f65-f4b6-4eae-ba25-b8a73e7b0559' AND md5(variations::text) = 'c9368b0adb260a18dac598b549487c93';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"A right-angled triangle is said to be *almost isosceles*when its hypotenuse is a whole number and the two sides about the right angle are consecutive whole numbers. \n\n1. Show that a triangle with sides ~3~ ; ~4~ and ~5~ is an almost isosceles right-angled triangle.\n2. Give an algorithm for finding others."}}'::jsonb, true)
  WHERE id = '250f7564-5a66-4a01-9e1a-d8f479ce2bda' AND md5(variations::text) = '294f6b34bed726ad2c15b8fddbd4e149';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Copy and complete with $\\in$ or $\\notin$.\n\n1. $2 \\ldots \\,]1\\,;\\,3[$\n2. $0 \\ldots [-1\\,;\\,2[$\n3. $\\dfrac{1}{3} \\ldots [0\\,;\\,3]$\n4. $2 \\ldots \\,]-2\\,;\\,2[$\n5. $\\sqrt{2} \\ldots [-3\\,;\\,1]$\n6. $0 \\ldots \\,]0\\,;\\,+\\infty[$\n7. $-100 \\ldots \\,]-\\infty\\,;\\,1[$\n8. $\\dfrac{1}{10} \\ldots [0.01\\,;\\,0.2[$"}}'::jsonb, true)
  WHERE id = 'e220a478-d33c-47bb-b3d0-ae98536e845b' AND md5(variations::text) = '56e0436ba8e3573cc3cacbf917e6b778';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"1. Solve the following equations in $\\mathbb{R}$.\n   1. ~x^2=8~\n   2. ~x^2=-4~\n   3. ~(x-1)^2=9~\n   4. ~(x-1)(-3x+2)=0~\n   5. ~x^2+2x+1=0~\n   6. ~(2x+3)^2+1=0~\n   7. ~(2x+3)^2-4=0~\n   8. ~(x-1)^2-3=0~\n   9. ~x(-7x+11)=0~\n2. Make a conjecture about the number of solutions of a quadratic equation.\n3. Give three quadratic equations whose solutions are ~-1~ and ~5~."}}'::jsonb, true)
  WHERE id = '18000cfb-a5d2-4d94-98f3-04dcc24f2fd1' AND md5(variations::text) = '7427c5625b3205455912062078607b0b';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"For each of the following statements, say whether it is always true. If it is false, give a counter-example. \n\n1. The difference of two natural numbers is a natural number.\n2. The quotient of two terminating decimals is a terminating decimal.\n3. The quotient of two real numbers is a rational number.\n4. The product of a rational number and an integer is a rational number."}}'::jsonb, true)
  WHERE id = '9a140578-3bec-41fc-8f72-fb607dd431b0' AND md5(variations::text) = '117f221f13c26d75b56d99b7b14d3a28';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"1. What are the coordinates of the points marked on the number line below?\\\n\n\n   ![algebre 5wneqx5n 1](https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/exercise-images/97c1d5e4-5fa0-44ce-be83-ed5467f3a424/algebre-5wneqx5n-1.png){size=large align=center}\n2. Draw a number line and mark the following numbers exactly: ~3~ ; ~-1.5~ ; ~5/4~ ; ~{-2}/5~ ; ~sqrt(2)~.\\"}}'::jsonb, true)
  WHERE id = '7c974266-05b6-4b95-b03b-0dca9c74ceb4' AND md5(variations::text) = '523293593916f7f75d85860236192340';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Let $x \\in \\mathbb{N}$. For each of the following statements, say whether it is false or always true. If it is false, give a counter-example and give the smallest set that makes it always true.\n\n1. $2x + 1 \\in \\mathbb{N}$\n2. $2x + 1 \\in \\mathbb{Q}$\n3. $3x - 7 \\in \\mathbb{N}$\n4. $\\dfrac{x-6}{2} \\in \\mathbb{Z}$\n5. $\\dfrac{x+1}{\\sqrt{2}} \\in \\mathbb{R}$\n6. $\\sqrt{x} \\in \\mathbb{Q}$"}}'::jsonb, true)
  WHERE id = 'fe606ef5-0249-413b-a556-2ab006420ed1' AND md5(variations::text) = '8022845723947a996ce7761206c2fa29';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Copy and complete the table as in the example below.\n\n![Capture d’écran 2026 09 01 à 20.38.33](https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/exercise-images/97c1d5e4-5fa0-44ce-be83-ed5467f3a424/algebre-dd9rkjap-1.png){size=full align=center}\n\n![Capture d’écran 2026 09 01 à 20.38.39](https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/exercise-images/97c1d5e4-5fa0-44ce-be83-ed5467f3a424/algebre-dd9rkjap-2.png){size=large align=center}"}}'::jsonb, true)
  WHERE id = '8c602d2f-a909-471d-96a8-36505aec790b' AND md5(variations::text) = 'f83b91732c28fcec10b8d5d0bb2a528a';

UPDATE public.exercises SET variations = jsonb_set(variations, '{0,translations}', '{"en":{"statement_md":"Copy and complete as in the example, then write it mathematically using the symbol $\\Leftrightarrow$.\n\n**Example:**\n $x \\in [1\\,;\\,2]$ if and only if $3x \\in [3\\,;\\,6]$\n\n$x \\in [1\\,;\\,2] \\Leftrightarrow 3x \\in [3\\,;\\,6]$\n\n1. $x \\in [7\\,;\\,20]$ if and only if $7x \\in \\ldots$\n2. $x \\in \\,]-1\\,;\\,3]$ if and only if $7-x \\in \\ldots$\n3. $x \\in [-5\\,;\\,7]$ if and only if $2x+3 \\in \\ldots$\n4. $x \\in \\ldots$ if and only if $-2x \\in [1\\,;\\,+\\infty[$\n5. $x \\in \\ldots$ if and only if $3-x \\in \\,]-\\infty\\,;\\,6]$\n6. $x \\in \\ldots$ if and only if $7+2x \\in [-1\\,;\\,1]$"}}'::jsonb, true)
  WHERE id = '43687716-a5b5-47f7-9c52-2acd682596c9' AND md5(variations::text) = '5fd0a41277dbbe3b1ccd39b2c51ac60b';


-- Contrôle : 30 variations doivent porter une traduction anglaise.
DO $$
DECLARE
  traduites integer;
  total integer;
BEGIN
  SELECT count(*) INTO traduites
  FROM public.exercises e, LATERAL jsonb_array_elements(e.variations) v
  WHERE '2' = ANY(e.grades) AND v ? 'translations';

  SELECT count(*) INTO total FROM public.exercises WHERE '2' = ANY(grades);

  IF total = 0 THEN
    RAISE NOTICE 'Traductions 2de : aucun exercice de seconde dans cette base, rien a traduire.';
  ELSIF traduites = 30 THEN
    RAISE NOTICE 'Traductions 2de : 30/30 variations traduites.';
  ELSE
    RAISE WARNING 'Traductions 2de : % variation(s) traduite(s) sur 30 attendues. Les exercices modifies depuis le 2026-09-03 ont ete ecartes par le verrou md5 : rien n a ete ecrase, mais ils restent en francais.', traduites;
  END IF;
END $$;
