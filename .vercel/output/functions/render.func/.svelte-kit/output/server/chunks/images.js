import { f as forwardEventsBuilder, c as classMap, S as SmuiElement, a as classAdderBuilder, R as Ripple, d as color1, e as color2, g as correct_color, h as color3, i as incorrect_color, u as unoptimal_color, m as mdc_colors, C as CommonIcon, b as Svg } from "./Ripple.js";
import math from "tinycas";
import { g as getLogger, s as shuffle, l as lexicoSort } from "./utils.js";
import { c as create_ssr_component, d as compute_rest_props, f as get_current_component, g as getContext, v as validate_component, m as missing_component, h as spread, i as escape_attribute_value, j as escape_object, k as add_attribute, s as setContext, w as globals, z as get_store_value, l as each, b as subscribe, o as onDestroy, A as is_promise, n as noop, B as tick, e as escape } from "./index.js";
import { mdiOrbitVariant } from "@mdi/js";
import { a as toMarkup, f as formatLatex, M as MathfieldElement, v as virtualKeyboardMode, b as fontSize } from "./stores.js";
import { createClient } from "@supabase/supabase-js";
import { e as env } from "./env-public.js";
function exclude(obj, keys) {
  let names = Object.getOwnPropertyNames(obj);
  const newObj = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const cashIndex = name.indexOf("$");
    if (cashIndex !== -1 && keys.indexOf(name.substring(0, cashIndex + 1)) !== -1) {
      continue;
    }
    if (keys.indexOf(name) !== -1) {
      continue;
    }
    newObj[name] = obj[name];
  }
  return newObj;
}
function prefixFilter(obj, prefix) {
  let names = Object.getOwnPropertyNames(obj);
  const newObj = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (name.substring(0, prefix.length) === prefix) {
      newObj[name.substring(prefix.length)] = obj[name];
    }
  }
  return newObj;
}
const CommonLabel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "component", "tag", "getElement"]);
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let element;
  let { component = SmuiElement } = $$props;
  let { tag = component === SmuiElement ? "span" : void 0 } = $$props;
  const context = getContext("SMUI:label:context");
  const tabindex = getContext("SMUI:label:tabindex");
  function getElement() {
    return element.getElement();
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.component === void 0 && $$bindings.component && component !== void 0)
    $$bindings.component(component);
  if ($$props.tag === void 0 && $$bindings.tag && tag !== void 0)
    $$bindings.tag(tag);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${validate_component(component || missing_component, "svelte:component").$$render(
      $$result,
      Object.assign(
        { tag },
        { use: [forwardEvents, ...use] },
        {
          class: classMap({
            [className]: true,
            "mdc-button__label": context === "button",
            "mdc-fab__label": context === "fab",
            "mdc-tab__text-label": context === "tab",
            "mdc-image-list__label": context === "image-list",
            "mdc-snackbar__label": context === "snackbar",
            "mdc-banner__text": context === "banner",
            "mdc-segmented-button__label": context === "segmented-button",
            "mdc-data-table__pagination-rows-per-page-label": context === "data-table:pagination",
            "mdc-data-table__header-cell-label": context === "data-table:sortable-header-cell"
          })
        },
        context === "snackbar" ? { "aria-atomic": "false" } : {},
        { tabindex },
        $$restProps,
        { this: element }
      ),
      {
        this: ($$value) => {
          element = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${slots.default ? slots.default({}) : ``}`;
        }
      }
    )}`;
  } while (!$$settled);
  return $$rendered;
});
const Paper = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "variant", "square", "color", "elevation", "transition", "getElement"]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { variant = "raised" } = $$props;
  let { square = false } = $$props;
  let { color = "default" } = $$props;
  let { elevation = 1 } = $$props;
  let { transition = false } = $$props;
  let element;
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.square === void 0 && $$bindings.square && square !== void 0)
    $$bindings.square(square);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.elevation === void 0 && $$bindings.elevation && elevation !== void 0)
    $$bindings.elevation(elevation);
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "smui-paper": true,
          "smui-paper--raised": variant === "raised",
          "smui-paper--unelevated": variant === "unelevated",
          "smui-paper--outlined": variant === "outlined",
          ["smui-paper--elevation-z" + elevation]: elevation !== 0 && variant === "raised",
          "smui-paper--rounded": !square,
          ["smui-paper--color-" + color]: color !== "default",
          "smui-paper-transition": transition
        }))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}
</div>`;
});
const Content = classAdderBuilder({
  class: "smui-paper__content",
  tag: "div"
});
const Title = classAdderBuilder({
  class: "smui-paper__title",
  tag: "h5"
});
const Subtitle = classAdderBuilder({
  class: "smui-paper__subtitle",
  tag: "h6"
});
const Badge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "square", "color", "position", "align", "getElement"]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { square = false } = $$props;
  let { color = "primary" } = $$props;
  let { position = "middle" } = $$props;
  let { align = "top-end" } = $$props;
  let element;
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.square === void 0 && $$bindings.square && square !== void 0)
    $$bindings.square(square);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.position === void 0 && $$bindings.position && position !== void 0)
    $$bindings.position(position);
  if ($$props.align === void 0 && $$bindings.align && align !== void 0)
    $$bindings.align(align);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<span${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "smui-badge": true,
          "smui-badge--rounded": !square,
          ["smui-badge--color-" + color]: true,
          ["smui-badge--position-" + position]: true,
          ["smui-badge--align-" + align]: true
        }))
      },
      { role: "status" },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}
</span>`;
});
const { Object: Object_1$1 } = globals;
const Fab = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "style",
    "ripple",
    "focusRing",
    "color",
    "mini",
    "exited",
    "extended",
    "touch",
    "href",
    "component",
    "tag",
    "getElement"
  ]);
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { ripple = true } = $$props;
  let { focusRing = false } = $$props;
  let { color = "secondary" } = $$props;
  let { mini = false } = $$props;
  let { exited = false } = $$props;
  let { extended = false } = $$props;
  let { touch = false } = $$props;
  let { href = void 0 } = $$props;
  let element;
  let internalClasses = {};
  let internalStyles = {};
  let { component = SmuiElement } = $$props;
  let { tag = component === SmuiElement ? href == null ? "button" : "a" : void 0 } = $$props;
  setContext("SMUI:label:context", "fab");
  setContext("SMUI:icon:context", "fab");
  function addClass(className2) {
    if (!internalClasses[className2]) {
      internalClasses[className2] = true;
    }
  }
  function removeClass(className2) {
    if (!(className2 in internalClasses) || internalClasses[className2]) {
      internalClasses[className2] = false;
    }
  }
  function addStyle(name, value) {
    if (internalStyles[name] != value) {
      if (value === "" || value == null) {
        delete internalStyles[name];
        internalStyles = internalStyles;
      } else {
        internalStyles[name] = value;
      }
    }
  }
  function getElement() {
    return element.getElement();
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.ripple === void 0 && $$bindings.ripple && ripple !== void 0)
    $$bindings.ripple(ripple);
  if ($$props.focusRing === void 0 && $$bindings.focusRing && focusRing !== void 0)
    $$bindings.focusRing(focusRing);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.mini === void 0 && $$bindings.mini && mini !== void 0)
    $$bindings.mini(mini);
  if ($$props.exited === void 0 && $$bindings.exited && exited !== void 0)
    $$bindings.exited(exited);
  if ($$props.extended === void 0 && $$bindings.extended && extended !== void 0)
    $$bindings.extended(extended);
  if ($$props.touch === void 0 && $$bindings.touch && touch !== void 0)
    $$bindings.touch(touch);
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.component === void 0 && $$bindings.component && component !== void 0)
    $$bindings.component(component);
  if ($$props.tag === void 0 && $$bindings.tag && tag !== void 0)
    $$bindings.tag(tag);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${validate_component(component || missing_component, "svelte:component").$$render(
      $$result,
      Object_1$1.assign(
        { tag },
        {
          use: [
            [
              Ripple,
              {
                ripple,
                unbounded: false,
                color,
                disabled: !!$$restProps.disabled,
                addClass,
                removeClass,
                addStyle
              }
            ],
            forwardEvents,
            ...use
          ]
        },
        {
          class: classMap({
            [className]: true,
            "mdc-fab": true,
            "mdc-fab--mini": mini,
            "mdc-fab--exited": exited,
            "mdc-fab--extended": extended,
            "smui-fab--color-primary": color === "primary",
            "mdc-fab--touch": touch,
            ...internalClasses
          })
        },
        {
          style: Object.entries(internalStyles).map(([name, value]) => `${name}: ${value};`).concat([style]).join(" ")
        },
        { href },
        $$restProps,
        { this: element }
      ),
      {
        this: ($$value) => {
          element = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `<div class="${"mdc-fab__ripple"}"></div>
  ${focusRing ? `<div class="${"mdc-fab__focus-ring"}"></div>` : ``}
  ${slots.default ? slots.default({}) : ``}${touch ? `<div class="${"mdc-fab__touch"}"></div>` : ``}`;
        }
      }
    )}`;
  } while (!$$settled);
  return $$rendered;
});
const makeGrade = (name, father) => {
  return {
    name,
    father
  };
};
const CP = "cp";
const CE1 = "ce1";
const CE2 = "ce2";
const CM1 = "cm1";
const CM2 = "cm2";
const SIXIEME = "6\xE8me";
const CINQUIEME = "5\xE8me";
const QUATRIEME = "4\xE8me";
const TROISIEME = "3\xE8me";
const SECONDE = "2nde";
const PREMIERE_SPE_MATHS = "1\xE8re sp\xE9 Maths";
const PREMIERE_STMG = "1\xE8re STMG";
const PREMIERE_GENERALE = "1\xE8re g\xE9n\xE9rale";
const TERMINALE_GENERALE = "Tale g\xE9n\xE9rale";
const TERMINALE_STMG = "Tale STMG";
const TERMINALE_SPE_MATHS = "Tale sp\xE9 Maths";
const MATHS_COMPLEMENTAIRES = "Maths Compl\xE9mentaires";
const MATHS_EXPERTES = "Maths Expertes";
const grades = [
  CP,
  CE1,
  CE2,
  CM1,
  CM2,
  SIXIEME,
  CINQUIEME,
  QUATRIEME,
  TROISIEME,
  SECONDE,
  PREMIERE_SPE_MATHS,
  PREMIERE_STMG,
  PREMIERE_GENERALE,
  TERMINALE_GENERALE,
  TERMINALE_SPE_MATHS,
  TERMINALE_STMG,
  MATHS_COMPLEMENTAIRES,
  MATHS_EXPERTES
];
const cp = makeGrade(CP, null);
const ce1 = makeGrade(CE1, cp);
const ce2 = makeGrade(CE2, ce1);
const cm1 = makeGrade(CM1, ce2);
const cm2 = makeGrade(CM2, cm1);
const sixieme = makeGrade(SIXIEME, cm2);
const cinquieme = makeGrade(CINQUIEME, sixieme);
const quatrieme = makeGrade(QUATRIEME, cinquieme);
const troisieme = makeGrade(TROISIEME, quatrieme);
const seconde = makeGrade(SECONDE, troisieme);
const premiereSpe = makeGrade(PREMIERE_SPE_MATHS, seconde);
const premiereSTMG = makeGrade(PREMIERE_STMG, seconde);
const premiereGenerale = makeGrade(PREMIERE_GENERALE, seconde);
const terminaleGenerale = makeGrade(TERMINALE_GENERALE, premiereGenerale);
const terminaleSTMG = makeGrade(TERMINALE_STMG, premiereSTMG);
const terminaleSpe = makeGrade(TERMINALE_SPE_MATHS, premiereSpe);
const mathsComplementaires = makeGrade(MATHS_COMPLEMENTAIRES, premiereSpe);
const mathsExpertes = makeGrade(MATHS_EXPERTES, terminaleSpe);
function gradeMatchesClass(gradeQuestion, gradeClass) {
  const grades2 = {
    [CP]: cp,
    [CE1]: ce1,
    [CE2]: ce2,
    [CM1]: cm1,
    [CM2]: cm2,
    [SIXIEME]: sixieme,
    [CINQUIEME]: cinquieme,
    [QUATRIEME]: quatrieme,
    [TROISIEME]: troisieme,
    [SECONDE]: seconde,
    [PREMIERE_GENERALE]: premiereGenerale,
    [PREMIERE_SPE_MATHS]: premiereSpe,
    [PREMIERE_STMG]: premiereSTMG,
    [TERMINALE_GENERALE]: terminaleGenerale,
    [TERMINALE_SPE_MATHS]: terminaleSpe,
    [TERMINALE_STMG]: terminaleSTMG,
    [MATHS_COMPLEMENTAIRES]: mathsComplementaires,
    [MATHS_EXPERTES]: mathsExpertes
  };
  let grade = grades2[gradeClass];
  while (grade && grade.name !== gradeQuestion) {
    grade = grade.father;
  }
  return !!grade;
}
const UNKNOWN = "a determiner";
const code = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const questions = {
  Entiers: {
    Apprivoiser: {
      Ecriture: [
        {
          description: "Conna\xEEtre la position d\xE9cimale",
          subdescription: "Jusqu'aux dizaines.",
          enounces: [
            "Dans le nombre $$&4$$,  quel est le chiffre des dizaines ?",
            "Dans le nombre $$&4$$, quel est le chiffre des unit\xE9s ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]\\{&1}",
              "&4": "[_&1*10+&2_]"
            }
          ],
          solutions: [["&1"], ["&2"]],
          correctionFormat: [
            {
              correct: ["Le chiffre des dizaines est &answer."]
            },
            {
              correct: ["Le chiffre des unit\xE9s est &answer."]
            }
          ],
          options: [
            "require-no-extraneaous-zeros",
            "require-no-extraneaous-brackets",
            "require-no-extraneaous-signs"
          ],
          type: "rewrite",
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Conna\xEEtre la position d\xE9cimale",
          subdescription: "Jusqu'aux centaines",
          enounces: [
            "Dans le nombre $$&4$$, quel est le chiffre des centaines ?",
            "Dans le nombre $$&4$$,  quel est le chiffre des dizaines ?",
            "Dans le nombre $$&4$$, quel est le chiffre des unit\xE9s ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]\\{&1}",
              "&3": "$e[0;9]\\{&1;&2}",
              "&4": "[_&1*100+&2*10+&3_]"
            }
          ],
          solutions: [["&1"], ["&2"], ["&3"]],
          correctionFormat: [
            {
              correct: [
                "Le chiffre des centaines est &answer."
              ]
            },
            {
              correct: [
                "Le chiffre des dizaines est &answer."
              ]
            },
            {
              correct: ["Le chiffre des unit\xE9s est &answer."]
            }
          ],
          type: "rewrite",
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Parit\xE9 d'un nombre entier",
          enounces: ["Quelle est la parit\xE9 de ce nombre ?"],
          expressions: ["&2", "&3"],
          variables: [
            {
              "&1": "$e[0;49]",
              "&2": "[_2*&1_]",
              "&3": "[_2*&1+1_]"
            }
          ],
          choices: [[{ text: "pair" }, { text: "impair" }]],
          correctionDetails: [
            [
              {
                text: "&expression est &solution car il se termine par 0, 2, 4, 6, ou 8."
              }
            ],
            [
              {
                text: "&expression est &solution car il se termine par 1, 3, 5, 7, ou 9."
              }
            ]
          ],
          solutions: [[0], [1]],
          options: ["no-shuffle-choices"],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Conna\xEEtre la position d\xE9cimale",
          subdescription: "Jusqu'aux milliers",
          enounces: [
            "Dans le nombre $$[_&5_]$$, quel est le chiffre des milliers ?",
            "Dans le nombre $$[_&5_]$$, quel est le chiffre des centaines ?",
            "Dans le nombre $$[_&5_]$$,  quel est le chiffre des dizaines ?",
            "Dans le nombre $$[_&5_]$$, quel est le chiffre des unit\xE9s ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]\\{&1}",
              "&3": "$e[0;9]\\{&1;&2}",
              "&4": "$e[0;9]\\{&1;&2;&3}",
              "&5": "&1*1000+&2*100+&3*10+&4"
            }
          ],
          solutions: [["&1"], ["&2"], ["&3"], ["&4"]],
          correctionFormat: [
            {
              correct: ["Le chiffre des milliers est &answer."]
            },
            {
              correct: [
                "Le chiffre des centaines est &answer."
              ]
            },
            {
              correct: ["Le chiffre des dizaines est &answer."]
            },
            {
              correct: ["Le chiffre des unit\xE9s est &answer."]
            }
          ],
          type: "rewrite",
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Ecrire un grand nombre entier avec des espaces",
          subdescription: "Nombre \xE0 4 chiffres",
          enounces: [
            "R\xE9\xE9cris ce nombre entier en ajoutant un espace pour s\xE9parer le chiffre des milliers."
          ],
          expressions: ["&1"],
          variables: [{ "&1": "$e{4;4}" }],
          options: ["exp-no-spaces", "require-correct-spaces"],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Ecrire un grand nombre entier avec des espaces",
          subdescription: "Jusqu'\xE0 7 chiffres",
          enounces: [
            "R\xE9\xE9cris ce nombre entier en rajoutant des espaces pour former des groupes de 3 chiffres."
          ],
          expressions: ["&2"],
          variables: [{ "&1": "$e[4;7]", "&2": "$e{&1;&1}" }],
          options: ["exp-no-spaces", "require-correct-spaces"],
          defaultDelay: 30,
          grade: CM1
        },
        {
          description: "Ecrire un grand nombre entier sans les z\xE9ros inutiles",
          enounces: [
            "R\xE9\xE9cris ce nombre entier en enlevant les z\xE9ros inutiles."
          ],
          expressions: [
            "00&1&2&3&4",
            "00&1&2&3&40",
            "00&1&2&3&400",
            "0&1&2&3&4",
            "0&1&2&3&40",
            "0&1&2&3&400"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$l{0;$e[1;9]}",
              "&3": "$l{0;$e[1;9]}",
              "&4": "$e[1;9]"
            }
          ],
          options: ["exp-allow-unecessary-zeros"],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Ecrire un grand nombre entier avec des espaces",
          subdescription: "Jusqu'\xE0 10 chiffres",
          enounces: [
            "R\xE9\xE9cris ce nombre entier en rajoutant des espaces pour former des groupes de 3 chiffres."
          ],
          expressions: ["&2"],
          variables: [{ "&1": "$e[4;10]", "&2": "$e{&1;&1}" }],
          options: ["exp-no-spaces", "require-correct-spaces"],
          defaultDelay: 30,
          grade: CM2
        },
        {
          description: "Enigme pour trouver un nombre",
          enounces: [
            "Je suis un nombre \xE0 3 chiffres. Mon <b>chiffre des unit\xE9s</b> est $$&1$$. Le <b>nombre</b> de mes dizaines est le double du chiffre des unit\xE9s. Qui suis-je ?",
            "Je suis un nombre \xE0 3 chiffres. Mon <b>chiffre des unit\xE9s</b> est $$&1$$. Le <b>nombre</b> de mes dizaines est le triple du chiffre des unit\xE9s. Qui suis-je ?"
          ],
          solutions: [["[_&1*21_]"], ["[_&1*31_]"]],
          variables: [{ "&1": "$e[5;9]" }],
          correctionFormat: [
            {
              correct: ["Je suis &answer."]
            }
          ],
          defaultDelay: 30,
          grade: CM2
        }
      ],
      D\u00E9composition: [
        {
          description: "D\xE9composer l'\xE9criture d\xE9cimale un nombre",
          subdescription: "En dizaines et unit\xE9s",
          enounces: ["D\xE9compose ce nombre en dizaines et unit\xE9s."],
          expressions: ["[_&1*10+&2_]"],
          solutions: [["[_&1*10_]+&2"]],
          variables: [{ "&1": "$e[1;9]", "&2": "$e[1;9]" }],
          defaultDelay: 20,
          grade: CP
        },
        {
          description: "D\xE9composition d\xE9cimale -> nombre entier (jusqu'aux centaines)",
          enounces: [
            "R\xE9\xE9cris cette expression sous la forme d'un nombre entier."
          ],
          expressions: ["(&1*100) +  (&2*10) + &3"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]"
            }
          ],
          options: ["remove-null-terms"],
          type: "result",
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "D\xE9composer l'\xE9criture d\xE9cimale un nombre",
          subdescription: "En centaines, dizaines et unit\xE9s",
          enounces: ["D\xE9compose ce nombre en centaines, dizaines et unit\xE9s."],
          expressions: ["[_&1*100+&2*10+&3_]"],
          solutions: [["[_&1*100_]+[_&2*10_]+&3"]],
          variables: [{ "&1": "$e[1;9]", "&2": "$e[0;9]", "&3": "$e[0;9]" }],
          options: [
            "no-penalty-for-extraneous-brackets",
            "no-penalty-for-factor-one",
            "no-penalty-for-factor-zero"
          ],
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "D\xE9composer l'\xE9criture d\xE9cimale un nombre",
          subdescription: "En centaines, dizaines et unit\xE9s, \xE0 l'aide de produits",
          enounces: [
            "D\xE9compose ce nombre comme dans cet exemple : $$345 = (3 \\times 100) +(4 \\times 10) + 5$$."
          ],
          expressions: [
            "[_&1*100 + &2*10 + &3_]"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]"
            }
          ],
          solutions: [["(&1*100) + (&2*10) + &3"]],
          options: [
            "no-penalty-for-extraneous-brackets",
            "no-penalty-for-factor-one"
          ],
          defaultDelay: 30,
          grade: CE1
        },
        {
          description: "D\xE9composition d\xE9cimale -> nombre entier (jusqu'aux milliers)",
          enounces: [
            "R\xE9\xE9cris cette expression sous la forme d'un nombre entier."
          ],
          expressions: ["(&1*1000) +  (&2*100) + (&3*10) + &4"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]"
            }
          ],
          options: ["remove-null-terms"],
          type: "result",
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "D\xE9composer l'\xE9criture d\xE9cimale un nombre",
          subdescription: "En milliers, centaines, dizaines et unit\xE9s",
          enounces: [
            "D\xE9compose ce nombre comme dans cet exemple : $$345 = 300 + 40 + 5$$."
          ],
          expressions: ["[_&1*1000+&2*100+&3*10+&4_]"],
          solutions: [["[_&1*1000_]+[_&2*100_]+[_&3*10_]+&4"]],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;9]"
            }
          ],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "D\xE9composer l'\xE9criture d\xE9cimale un nombre",
          subdescription: "En milliers, centaines, dizaines et unit\xE9s, \xE0 l'aide de produits",
          enounces: [
            "D\xE9compose ce nombre comme dans cet exemple : $$2\\,345 = (2 \\times 1\\,000) + (3 \\times 100) +(4 \\times 10) + 5$$."
          ],
          expressions: [
            "[_&1*1000 + &2*100 + &3*10+&4_]"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;9]"
            }
          ],
          solutions: [["(&1*1000) + (&2*100) + (&3*10)+&4"]],
          options: [
            "no-penalty-for-extraneous-brackets",
            "no-penalty-for-factor-one"
          ],
          defaultDelay: 40,
          grade: CE2
        },
        {
          description: "D\xE9composition d\xE9cimale -> nombre entier",
          enounces: [
            "R\xE9\xE9cris cette expression sous la forme d'un nombre entier."
          ],
          expressions: ["(&1*10000) +  (&2*1000) + (&3*100) + (&4*10) + &5"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[0;9]"
            }
          ],
          options: ["remove-null-terms"],
          type: "result",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "D\xE9composition d\xE9cimale -> nombre entier",
          subdescription: "Termes m\xE9lang\xE9s",
          enounces: [
            "R\xE9\xE9cris cette expression sous la forme d'un nombre entier."
          ],
          expressions: ["(&1*10000) +  (&2*1000) + (&3*100) + (&4*10) + &5"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[0;9]"
            }
          ],
          options: ["remove-null-terms", "shuffle-terms"],
          type: "rewrite",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "D\xE9composer l'\xE9criture d\xE9cimale un nombre",
          subdescription: "En dizaines de milliers, milliers, centaines, dizaines et unit\xE9s",
          enounces: [
            "D\xE9compose ce nombre en dizaines de milliers, milliers, centaines, dizaines et unit\xE9s, comme dans cet exemple : $$23\\,456 = 20\\,000 + 3\\,000 + 400 + 50 + 6$$."
          ],
          expressions: ["[_&1*10000+&2*1000+&3*100+&4*10+&5_]"],
          solutions: [["[_&1*10000_]+[_&2*1000_]+[_&3*100_]+[_&4*10_]+&5"]],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;9]",
              "&5": "$e[1;9]"
            }
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "D\xE9composer l'\xE9criture d\xE9cimale un nombre",
          subdescription: "En dizaines de milliers, milliers, centaines, dizaines et unit\xE9s, \xE0 l'aide de produits",
          enounces: [
            "D\xE9compose ce nombre comme dans cet exemple : $$12\\,345 = (1 \\times 10\\,000) +(2 \\times 1\\,000) + (3 \\times 100) +(4 \\times 10) + 5$$."
          ],
          expressions: [
            "[_&1*10000 + &2*1000 + &3*100+&4*10+&5_]"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;9]",
              "&5": "$e[1;9]"
            }
          ],
          solutions: [["(&1*10000) + (&2*1000) + (&3*100)+(&4*10)+&5"]],
          options: [
            "no-penalty-for-extraneous-brackets",
            "no-penalty-for-factor-one"
          ],
          defaultDelay: 50,
          grade: CM1
        }
      ],
      Rep\u00E9rage: [
        {
          description: "Rep\xE9rer sur une demi-droite gradu\xE9e.",
          enounces: ["Quel est ce nombre ?"],
          images: [
            "entiers/reperage/droite_graduee-10_en_10-0-600.png",
            "entiers/reperage/droite_graduee-10_en_10-1-600.png",
            "entiers/reperage/droite_graduee-10_en_10-2-600.png",
            "entiers/reperage/droite_graduee-10_en_10-3-600.png",
            "entiers/reperage/droite_graduee-10_en_10-4-600.png",
            "entiers/reperage/droite_graduee-10_en_10-5-600.png",
            "entiers/reperage/droite_graduee-10_en_10-6-600.png",
            "entiers/reperage/droite_graduee-10_en_10-7-600.png",
            "entiers/reperage/droite_graduee-10_en_10-8-600.png",
            "entiers/reperage/droite_graduee-10_en_10-9-600.png",
            "entiers/reperage/droite_graduee-10_en_10-10-600.png",
            "entiers/reperage/droite_graduee-10_en_10-11-600.png",
            "entiers/reperage/droite_graduee-10_en_10-12-600.png",
            "entiers/reperage/droite_graduee-10_en_10-13-600.png",
            "entiers/reperage/droite_graduee-10_en_10-14-600.png",
            "entiers/reperage/droite_graduee-10_en_10-15-600.png",
            "entiers/reperage/droite_graduee-10_en_10-16-600.png",
            "entiers/reperage/droite_graduee-10_en_10-17-600.png",
            "entiers/reperage/droite_graduee-10_en_10-18-600.png",
            "entiers/reperage/droite_graduee-10_en_10-19-600.png"
          ],
          type: "rewrite",
          solutions: [["560"]],
          correctionFormat: [
            {
              correct: ["Le nombre est &answer"]
            }
          ],
          defaultDelay: 20,
          grade: CP
        }
      ],
      Comparer: [
        {
          description: "Comparer deux nombres entiers",
          subdescription: "Nombres inf\xE9rieurs \xE0 100",
          enounces: ["Quel est le plus petit de ces 2 nombres ?"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "[_&1*10+&2_]",
              "&6": "[_&3*10+&4_]"
            }
          ],
          conditions: ["&5!=&6"],
          choices: [[{ text: "$$[._&5_]$$" }, { text: "$$[._&6_]$$" }]],
          solutions: [["&5<&6 ?? 0 :: 1"]],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Comparer deux nombres entiers",
          subdescription: "Nombres inf\xE9rieurs \xE0 1000",
          enounces: ["Quel est le plus petit de ces 2 nombres ?"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[1;9]",
              "&4": "$e[0;9]",
              "&5": "$e[0;9]",
              "&6": "$e[1;9]",
              "&7": "[_&1*100+&2*10+&3_]",
              "&8": "[_&4*100+&5*10+&6_]"
            }
          ],
          conditions: ["&7!=&8"],
          choices: [[{ text: "$$[._&7_]$$" }, { text: "$$[._&8_]$$" }]],
          correctionFormat: [
            {
              correct: [
                "Entre $$[._&7_]$$ et $$[._&8_]$$ le plus petit est &answer"
              ],
              answer: "Le plus petit est &answer"
            }
          ],
          solutions: [["&7<&8 ?? 0 :: 1"]],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Comparer deux nombres entiers",
          subdescription: "Nombres inf\xE9rieurs \xE0 10000",
          enounces: ["Quel est le plus petit de ces 2 nombres ?"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[0;9]",
              "&6": "$e[0;9]",
              "&7": "&1*1000+&2*100+&3*10+$e[0;9]",
              "&8": "&4*1000+&5*100+&6*10+$e[0;9]"
            }
          ],
          conditions: ["[_&7_]!=[_&8_]"],
          choices: [[{ text: "$$[._&7_]$$" }, { text: "$$[._&8_]$$" }]],
          correctionFormat: [
            {
              correct: [
                "Entre $$[._&7_]$$ et $$[._&8_]$$ le plus petit est &answer"
              ],
              answer: "Le plus petit est &answer"
            }
          ],
          solutions: [["&7<&8 ?? 0 :: 1"]],
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Comparer deux nombres entiers",
          subdescription: "Jusqu'au million",
          enounces: ["Quel est le plus petit de ces 2 nombres ?"],
          variables: [
            {
              "&1": "$e[0;4]",
              "&2": "$e[4-&1;7-&1]",
              "&3": "$e{&1;&1}",
              "&4": "$e{&2;&2}",
              "&5": "$e{&2;&2}",
              "&6": "[_&4+&3*10^&2_]",
              "&7": "[_&5+&3*10^&2_]"
            }
          ],
          conditions: ["&6!=&7"],
          choices: [[{ text: "$$[._&6_]$$" }, { text: "$$[._&7_]$$" }]],
          correctionFormat: [
            {
              correct: [
                "Entre $$[._&6_]$$ et $$[._&7_]$$ le plus petit est &answer"
              ],
              answer: "Le plus petit est &answer"
            }
          ],
          solutions: [["&6<&7 ?? 0 :: 1"]],
          defaultDelay: 20,
          grade: CM1
        }
      ]
    },
    Additionner: {
      Tables: [
        {
          description: "Table d'addition'",
          subdescription: "de 1",
          enounces: ["Calcule."],
          expressions: ["&1+1"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Table d'addition'",
          subdescription: "de 2",
          enounces: ["Calcule."],
          expressions: ["&1+2"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Table d'addition'",
          subdescription: "de 3",
          enounces: ["Calcule."],
          expressions: ["&1+3"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Table d'addition'",
          subdescription: "de 4",
          enounces: ["Calcule."],
          expressions: ["&1+4"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Table d'addition'",
          subdescription: "de 5",
          enounces: ["Calcule."],
          expressions: ["&1+5"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Table d'addition'",
          subdescription: "de 6",
          enounces: ["Calcule."],
          expressions: ["&1+6"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Table d'addition'",
          subdescription: "de 7",
          enounces: ["Calcule."],
          expressions: ["&1+7"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Table d'addition'",
          subdescription: "de 8",
          enounces: ["Calcule."],
          expressions: ["&1+8"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Table d'addition'",
          subdescription: "de 9",
          enounces: ["Calcule."],
          expressions: ["&1+9"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 15,
          grade: CP
        }
      ],
      Somme: [
        {
          description: "Calculer une somme",
          subdescription: "Somme \xE9gale \xE0 10",
          enounces: ["Calcule."],
          expressions: ["&1 + [_10-&1_]"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres \xE0 1 chiffre. Nombre plus grand en premier. Somme inf\xE9rieure ou \xE9gale \xE0 10",
          enounces: ["Calculer."],
          expressions: ["&1 + &2"],
          variables: [
            {
              "&1": "$e[3;8]",
              "&2": "$e[2;[_mini(10-&1;&1-1)_]]"
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres entiers \xE0 1 chiffre. Somme inf\xE9rieure \xE0 10.",
          enounces: ["Calcule."],
          expressions: ["&1 + &2", "&1 + &2"],
          variables: [
            { "&1": "$e[5;7]", "&2": "$e[2;9-&1]" },
            { "&1": "$e[2;4]", "&2": "$e[2;9-&1]" }
          ],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres \xE0 1 chiffre. Nombre plus grand en premier.",
          enounces: ["Calculer."],
          expressions: ["&1 + &2"],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[1;&1-1]"
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Calculer une somme",
          subdescription: "Somme sans retenue. Au moins un nombre \xE0 2 chiffres.",
          enounces: ["Calcule."],
          expressions: [
            "[_&1*10 + &2_] + [_&3*10 + &4_]",
            "[_&1*10 + &2_] + [_&3*10 + &4_]",
            "[_&1*10 + &2_] + [_&3*10 + &4_]",
            "[_&1*10 + &2_] + [_&3*10 + &4_]",
            "[_&1*10 + &2_] + &4",
            "[_&1*10 + &2_] + &4",
            "[_&1*10 + &2_] + &4",
            "[_&1*10 + &2_] + &4"
          ],
          variables: [
            {
              "&1": "$e[5;7]",
              "&3": "$e[1;9-&1]",
              "&2": "$e[5;7]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[2;4]",
              "&3": "$e[1;9-&1]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[5;7]",
              "&3": "$e[1;9-&1]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[2;4]",
              "&3": "$e[1;9-&1]",
              "&2": "$e[5;7]]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[5;7]",
              "&2": "$e[5;7]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[2;4]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[5;7]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[2;4]",
              "&2": "$e[5;7]]",
              "&4": "$e[2;9-&2]"
            }
          ],
          defaultDelay: 20,
          grade: CP
        },
        {
          description: "Calculer une somme",
          subdescription: "Somme d\u2019un nombre \xE0 deux chiffres et d\u2019un nombre \xE0 un chiffre, avec franchissement de la dizaine",
          enounces: ["Calcule."],
          expressions: ["[_&1*10 + &2_] + &3"],
          variables: [
            {
              "&1": "$e[2;8]",
              "&2": "$e[2;9]",
              "&3": "$e[11-&2;9]"
            }
          ],
          defaultDelay: 20,
          grade: CP
        },
        {
          description: "Calculer une somme",
          subdescription: "sommes d\u2019un nombre \xE0 deux chiffres et de dizaines enti\xE8res",
          enounces: ["Calcule."],
          expressions: ["[_&1*10 + &2_] + [_&3*10_]"],
          variables: [
            {
              "&1": "$e[2;8]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9-&1]"
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres entiers \xE0 1 chiffre",
          enounces: ["Calcule."],
          expressions: ["&1 + &2"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[11-&1;9]" }],
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres entiers \xE0 2 chiffres (sans retenue entre les unit\xE9s et les dizaines)",
          enounces: ["Calcule."],
          expressions: ["[_&1*10 + &2_] +[_&3*10+&4_]"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&3": "$e[1;9]",
              "&2": "$e[1;8]",
              "&4": "$e[1;9-&2]"
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Calculer une somme",
          subdescription: "Somme d\u2019un nombre ayant au plus trois chiffres et d\u2019un nombre ayant un seul chiffre non nul",
          enounces: ["Calcule."],
          expressions: ["[_&1*100 + &2*10+&3_] +[_&5*10^&4_]"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[1;9]",
              "&4": "$e[0;2]",
              "&5": "$e[1;9]"
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres entiers \xE0 2 chiffres dont la somme vaut 100",
          enounces: ["Calcule."],
          expressions: ["[_&2_]+[_100-&2_]"],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[12;&1*10-12]"
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres entiers \xE0 2 chiffres qui se marrient bien",
          enounces: ["Calcule."],
          expressions: ["[_&2_] +[_&1*10-&2_]"],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[12;&1*10-12]"
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Calculer une somme",
          subdescription: "somme de deux termes dont le r\xE9sultat est inf\xE9rieur \xE0 100",
          enounces: ["Calcule."],
          expressions: ["&1 + &2", "&1 + &2"],
          variables: [{ "&1": "$e[1;98]", "&2": "$e[1;99-&1]" }],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Calculer une somme",
          subdescription: "Somme d\u2019un nombre ayant au plus 4 chiffres et d\u2019un nombre ayant un seul chiffre non nul",
          enounces: ["Calcule."],
          expressions: ["[_&1*1000 + &2*100+&3*10+&4_] +[_&6*10^&5_]"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[1;9]",
              "&5": "$e[0;3]",
              "&6": "$e[1;9]"
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres entiers \xE0 2 chiffres (avec retenue)",
          enounces: ["Calcule."],
          expressions: ["[_&1*10 + &2_] +[_&3*10+&4_]"],
          variables: [
            {
              "&1": "$e[1;7]",
              "&3": "$e[1;8-&1]",
              "&2": "$e[2;9]",
              "&4": "$e[11-&2;9]"
            }
          ],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres entiers \xE0 3 chiffres (sans retenue)",
          enounces: ["Calcule."],
          expressions: ["[_&1*100 + &2*10 + &3_] + [_&4*100 + &5*10 + &6_]"],
          variables: [
            {
              "&1": "$e[1;8]",
              "&4": "$e[1;9-&1]",
              "&2": "$e[1;8]",
              "&5": "$e[1;9-&2]",
              "&3": "$e[1;8]",
              "&6": "$e[1;9-&3]"
            }
          ],
          defaultDelay: 30,
          grade: CM2
        },
        {
          description: "Calculer une somme",
          subdescription: "Nombres entiers \xE0 3 chiffres (avec retenue)",
          enounces: ["Calcule."],
          expressions: ["[_&1*100 + &2*10 + &3_] +[_&4*100+&5*10+&6_]"],
          variables: [
            {
              "&1": "$e[1;7]",
              "&4": "$e[1;8-&1]",
              "&2": "$e[1;7]",
              "&5": "$e[1;8-&2]",
              "&3": "$e[2;9]",
              "&6": "$e[11-&3;9]"
            }
          ],
          defaultDelay: 15,
          grade: CM2
        }
      ],
      Compl\u00E9ment: [
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "Compl\xE9ment \xE0 10",
          enounces: ["Compl\xE8te."],
          expressions: ["?+&1=10", "&1+?=10"],
          solutions: [["[_10-&1_]"]],
          variables: [{ "&1": "$e[1;9]" }],
          type: "trou",
          defaultDelay: 20,
          grade: CP
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "A la dizaine sup\xE9rieure",
          enounces: ["Compl\xE8te."],
          expressions: ["?+[_&3-&2_]=&3", "[_&3-&2_]+?=&3"],
          solutions: [["&2"]],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[1;9]", "&3": "[_&1*10_]" }],
          type: "trou",
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "Compl\xE9ment \xE0 un multiple de 10",
          enounces: ["Compl\xE8te."],
          expressions: ["?+&2=[_&1*10_]", "&2+?=[_&1*10_]"],
          solutions: [["[_&1*10-&2_]"]],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;&1*10-2]" }],
          type: "trou",
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "Compl\xE9ment \xE0 100 des dizaines enti\xE8res",
          enounces: ["Compl\xE8te."],
          expressions: ["?+&2=100", "&2+?=100"],
          solutions: [["[_100-&2_]"]],
          variables: [{ "&1": "$e[1;9]", "&2": "[_10*&1_]" }],
          type: "trou",
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "A la centaine sup\xE9rieure",
          enounces: ["Compl\xE8te."],
          expressions: ["?+[_&4-&3_]=&4", "[_&4-&3_]+?=&4"],
          solutions: [["&3"]],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;99]",
              "&4": "[_&1*100_]"
            }
          ],
          type: "trou",
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "Compl\xE9ment \xE0 100",
          enounces: ["Compl\xE8te."],
          expressions: ["?+&1=100", "&1+?=100"],
          solutions: [["[_100-&1_]"]],
          variables: [{ "&1": "$e[1;99]" }],
          type: "trou",
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "Compl\xE9ment \xE0 1000",
          enounces: ["Compl\xE8te."],
          expressions: ["?+&1=1000", "&1+?=1000"],
          solutions: [["[_1000-&1_]"]],
          variables: [{ "&1": "$e[1;999]" }],
          type: "trou",
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "Au millier sup\xE9rieure",
          enounces: ["Compl\xE8te."],
          expressions: ["?+[_&4-&3_]=&4", "[_&4-&3_]+?=&4"],
          solutions: [["&3"]],
          variables: [
            { "&1": "$e[2;9]", "&3": "$e[1;999]", "&4": "[_&1*1000_]" }
          ],
          type: "trou",
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "Compl\xE9ment \xE0 10 000 - a trou",
          enounces: ["Compl\xE8te."],
          expressions: ["?+[_10000-(&3)_]=10000", "[_10000-(&3)_]+?=10000"],
          solutions: [["[_&3_]"]],
          variables: [
            { "&1": "$e[1;9]", "&2": "$e[1;9]", "&3": "&1*1000+&2*100" }
          ],
          type: "trou",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Trouver le compl\xE9ment",
          subdescription: "Compl\xE9ment \xE0 10 000 - description",
          enounces: [
            "Combien faut-il ajouter \xE0 $$[_10000-(&3)_]$$ pour obtenir $$10\\,000$$ ?"
          ],
          solutions: [["[_&3_]"]],
          variables: [
            { "&1": "$e[1;9]", "&2": "$e[1;9]", "&3": "&1*1000+&2*100" }
          ],
          correctionFormat: [
            {
              correct: ["Il faut ajouter &answer."]
            }
          ],
          type: "rewrite",
          defaultDelay: 20,
          grade: CM1
        }
      ],
      D\u00E9composition: [],
      "A trou": [
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Nombres \xE0 1 chiffre. Nombre plus grand en premier. Somme inf\xE9rieure ou \xE9gale \xE0 10",
          enounces: ["Compl\xE8te."],
          expressions: ["&1 + ? = [_&2+&1_]"],
          variables: [
            {
              "&1": "$e[3;8]",
              "&2": "$e[2;[_mini(10-&1;&1-1)_]]"
            }
          ],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 5,
          grade: CP
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Nombres entiers \xE0 1 chiffre. Somme inf\xE9rieure \xE0 10.",
          enounces: ["Compl\xE8te."],
          expressions: [
            "&1+? = [_&1+&2_]",
            "&1+?= [_&1+&2_]",
            "?+&1= [_&1+&2_]",
            "?+&1= [_&1+&2_]"
          ],
          variables: [
            { "&1": "$e[5;7]", "&2": "$e[2;9-&1]" },
            { "&1": "$e[2;4]", "&2": "$e[2;9-&1]" },
            { "&1": "$e[5;7]", "&2": "$e[2;9-&1]" },
            { "&1": "$e[2;4]", "&2": "$e[2;9-&1]" }
          ],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 15,
          grade: CP
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Nombres \xE0 1 chiffre. Nombre plus grand en premier.",
          enounces: ["Compl\xE8te."],
          expressions: ["&1 + ? = [_&1+&2_]"],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[1;&1-1]"
            }
          ],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Somme sans retenue. Au moins un nombre \xE0 2 chiffres.",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10 + &4_]",
            "[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10 + &4_]",
            "[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10 + &4_]",
            "[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10 + &4_]",
            "[_&1*10 + &2_] + ? = [_&1*10 + &2 + &4_]",
            "[_&1*10 + &2_] + ? = [_&1*10 + &2 + &4_]",
            "[_&1*10 + &2_] + ? = [_&1*10 + &2 + &4_]",
            "[_&1*10 + &2_] + ? = [_&1*10 + &2 + &4_]"
          ],
          variables: [
            {
              "&1": "$e[5;7]",
              "&3": "$e[1;9-&1]",
              "&2": "$e[5;7]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[2;4]",
              "&3": "$e[1;9-&1]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[5;7]",
              "&3": "$e[1;9-&1]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[2;4]",
              "&3": "$e[1;9-&1]",
              "&2": "$e[5;7]]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[5;7]",
              "&2": "$e[5;7]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[2;4]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[5;7]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]"
            },
            {
              "&1": "$e[2;4]",
              "&2": "$e[5;7]]",
              "&4": "$e[2;9-&2]"
            }
          ],
          type: "trou",
          solutions: [
            ["[_&3*10 + &4_]"],
            ["[_&3*10 + &4_]"],
            ["[_&3*10 + &4_]"],
            ["[_&3*10 + &4_]"],
            ["&4"],
            ["&4"],
            ["&4"],
            ["&4"]
          ],
          defaultDelay: 20,
          grade: CP
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Somme d\u2019un nombre \xE0 deux chiffres et d\u2019un nombre \xE0 un chiffre, avec franchissement de la dizaine",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3_]"],
          variables: [
            {
              "&1": "$e[2;8]",
              "&2": "$e[2;9]",
              "&3": "$e[11-&2;9]"
            }
          ],
          type: "trou",
          solutions: [["&3"]],
          defaultDelay: 20,
          grade: CP
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "sommes d\u2019un nombre \xE0 deux chiffres et de dizaines enti\xE8res",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10_]"],
          variables: [
            {
              "&1": "$e[2;8]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9-&1]"
            }
          ],
          type: "trou",
          solutions: [["[_&3*10_]"]],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Nombres entiers \xE0 1 chiffre.",
          enounces: ["Compl\xE8te."],
          expressions: ["&1+? = [_&1+&2_]", "?+&1 = [_&1+&2_]"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou.",
          subdescription: "Nombres entiers \xE0 2 chiffres (sans retenue entre les unit\xE9s et les dizaines)",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10+&4_]"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&3": "$e[1;9]",
              "&2": "$e[1;8]",
              "&4": "$e[1;9-&2]"
            }
          ],
          type: "trou",
          solutions: [["[_&3*10+&4_]"]],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Somme d\u2019un nombre ayant au plus trois chiffres et d\u2019un nombre ayant un seul chiffre non nul",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_&1*100 + &2*10+&3_] + ? = [_&1*100 + &2*10+&3 + &5*10^&4_]"
          ],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[1;9]",
              "&4": "$e[0;2]",
              "&5": "$e[1;9]"
            }
          ],
          type: "trou",
          solutions: [["[_&5*10^&4_]"]],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "somme de deux termes dont le r\xE9sultat est inf\xE9rieur \xE0 100",
          enounces: ["Compl\xE8te."],
          expressions: ["&1 + ? =  [_&2+&1_]", "? + &2 = [_&2+&1_]"],
          variables: [{ "&1": "$e[1;98]", "&2": "$e[1;99-&1]" }],
          type: "trou",
          solutions: [["&2"], ["&1"]],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Somme d\u2019un nombre ayant au plus 4 chiffres et d\u2019un nombre ayant un seul chiffre non nul",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_&1*1000 + &2*100+&3*10+&4_] + ? = [_&1*1000 + &2*100+&3*10+&4 + &6*10^&5_]"
          ],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[1;9]",
              "&5": "$e[0;3]",
              "&6": "$e[1;9]"
            }
          ],
          type: "trou",
          solutions: [["[_&6*10^&5_]"]],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une addition",
          subdescription: "Nombres entiers \xE0 2 chiffres (avec retenue)",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10+&4_]"],
          variables: [
            {
              "&1": "$e[1;7]",
              "&3": "$e[1;8-&1]",
              "&2": "$e[2;9]",
              "&4": "$e[11-&2;9]"
            }
          ],
          type: "trou",
          solutions: [["[_&3*10+&4_]"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Nombres entiers \xE0 3 chiffres (sans retenue)",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_&1*100 + &2*10 + &3_] + ? = [_&1*100 + &2*10 + &3 + &4*100 + &5*10 + &6_]"
          ],
          variables: [
            {
              "&1": "$e[1;8]",
              "&4": "$e[1;9-&1]",
              "&2": "$e[1;8]",
              "&5": "$e[1;9-&2]",
              "&3": "$e[1;8]",
              "&6": "$e[1;9-&3]"
            }
          ],
          type: "trou",
          solutions: [["[_&4*100 + &5*10 + &6_]"]],
          defaultDelay: 30,
          grade: CM2
        },
        {
          description: "Compl\xE9ter une \xE9galit\xE9",
          subdescription: "Nombres entiers \xE0 2 chiffres (sans retenue)",
          enounces: ["Quel est le terme manquant dans cette \xE9galit\xE9 ?"],
          expressions: [
            "[_&5_]+?=[_&5+&6_]",
            "[_&5_]+?=[_&5+&6_]",
            "?+[_&5_]=[_&5+&6_]",
            "?+[_&5_]=[_&5+&6_]"
          ],
          variables: [
            {
              "&1": "$e[5;7]",
              "&3": "$e[2;9-&1]",
              "&2": "$e[5;7]",
              "&4": "$e[2;9-&2]",
              "&5": "&1*10 + &2",
              "&6": "&3*10 + &4"
            },
            {
              "&1": "$e[2;4]",
              "&3": "$e[2;9-&1]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]",
              "&5": "&1*10 + &2",
              "&6": "&3*10 + &4"
            },
            {
              "&1": "$e[5;7]",
              "&3": "$e[2;9-&1]",
              "&2": "$e[2;4]",
              "&4": "$e[2;9-&2]",
              "&5": "&1*10 + &2",
              "&6": "&3*10 + &4"
            },
            {
              "&1": "$e[2;4]",
              "&3": "$e[2;9-&1]",
              "&2": "$e[5;7]]",
              "&4": "$e[2;9-&2]",
              "&5": "&1*10 + &2",
              "&6": "&3*10 + &4"
            }
          ],
          type: "trou",
          solutions: [["[_&6_]"]],
          defaultDelay: 20,
          grade: UNKNOWN
        },
        {
          description: "Compl\xE9ter une \xE9galit\xE9",
          subdescription: "Nombres entiers \xE0 3 chiffres (sans retenue)",
          enounces: ["Quel est le terme manquant dans cette \xE9galit\xE9 ?"],
          expressions: ["[_&7_] + ? = [_&7+&8_]", "? + [_&7_] = [_&7+&8_]"],
          variables: [
            {
              "&1": "$e[1;8]",
              "&4": "$e[1;9-&1]",
              "&2": "$e[1;8]",
              "&5": "$e[1;9-&2]",
              "&3": "$e[1;8]",
              "&6": "$e[1;9-&3]",
              "&7": "&1*100 + &2*10 + &3",
              "&8": "&4*100 + &5*10 + &6"
            },
            {
              "&1": "$e[1;8]",
              "&4": "$e[1;9-&1]",
              "&2": "$e[1;8]",
              "&5": "$e[1;9-&2]",
              "&3": "$e[1;8]",
              "&6": "$e[1;9-&3]",
              "&7": "&1*100 + &2*10 + &3",
              "&8": "&4*100 + &5*10 + &6"
            }
          ],
          solutions: [["[_&8_]"]],
          type: "trou",
          defaultDelay: 20,
          grade: UNKNOWN
        },
        {
          description: "Compl\xE9ter une \xE9galit\xE9",
          subdescription: "Nombres \xE0 1 chiffre",
          enounces: ["Quel est le terme manquant dans cette \xE9galit\xE9 ?"],
          expressions: ["?+&1 = &2", "&1+? = &2"],
          solutions: [["[_&2-&1_]"]],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[11;&1+9]" }],
          type: "trou",
          defaultDelay: 20,
          grade: UNKNOWN
        },
        {
          description: "Compl\xE9ter une \xE9galit\xE9",
          subdescription: "Nombres \xE0 2 chiffres",
          enounces: ["Quel est le terme manquant dans cette \xE9galit\xE9 ?"],
          expressions: ["?+&1 = &2", "&1+? = &2"],
          solutions: [["[_&2-&1_]"]],
          variables: [{ "&1": "$e{2;2}", "&2": "$e[&1+12;&1+99]" }],
          type: "trou",
          defaultDelay: 20,
          grade: UNKNOWN
        },
        {
          description: "Compl\xE9ter une  \xE9galit\xE9",
          subdescription: "Nombres \xE0 3 chiffres",
          enounces: ["Quel est le terme manquant dans cette \xE9galit\xE9 ?"],
          expressions: ["?+&1 = &2", "&1+? = &2"],
          solutions: [["[_&2-&1_]", "[_&2-&1_]"]],
          variables: [{ "&1": "$e[101;897]", "&2": "$e[&1+102;999]" }],
          type: "trou",
          defaultDelay: 30,
          grade: UNKNOWN
        }
      ],
      "Double et moiti\xE9": [
        {
          description: "Trouver le double",
          subdescription: "Nombre inf\xE9rieur \xE0 10",
          enounces: [
            "Quel est le double de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$&1+&1$$ ?"
          ],
          solutions: [["[_2*&1_]"]],
          variables: [{ "&1": "$e[0;9]" }],
          correctionFormat: [
            {
              correct: ["Le double de $$&1$$ est &answer."]
            },
            {
              correct: ["$$&1+&1=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Trouver le double",
          subdescription: "Dizaines enti\xE8res (jusqu'\xE0 50)",
          enounces: [
            "Quel est le double de $$&2$$ ?",
            "Quel est le r\xE9sultat de $$&2+&2$$ ?"
          ],
          solutions: [["[_2*&2_]"]],
          variables: [
            {
              "&1": "$e[1;5]*10",
              "&2": "[_&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le double de $$&2$$ est &answer."]
            },
            {
              correct: ["$$&2+&2=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Trouver la moiti\xE9",
          subdescription: "Nombre pair inf\xE9rieur \xE0 20",
          enounces: ["Quelle est la moiti\xE9 de $$[_2*&1_]$$ ?"],
          solutions: [["&1"]],
          variables: [{ "&1": "$e[0;10]" }],
          correctionFormat: [
            {
              correct: ["La moiti\xE9 de $$[_2*&1_]$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La moiti\xE9 de $$[_2*&1_]$$ est &solution car $$&1+&1=[_2*&1_]$$"
              }
            ]
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Trouver le double",
          subdescription: "Nombres de 1 \xE0 15, 25, 30, 40, 50 et 100",
          enounces: [
            "Quel est le double de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$&1+&1$$ ?"
          ],
          solutions: [["[_2*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];25;30;40;50;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le double de $$&1$$ est &answer."]
            },
            {
              correct: ["$$&1+&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Trouver la moiti\xE9",
          subdescription: "Nombres pairs de 1 \xE0 30, 40, 50 et 100",
          enounces: ["Quelle est la moiti\xE9 de $$&2$$ ?"],
          solutions: [["[_&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];20;25;50}",
              "&2": "[_2*&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["La moiti\xE9 de $$&2$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La moiti\xE9 de $$[_2*&1_]$$ est &solution car $$&1 + &1=[_2*&1_]$$"
              }
            ]
          ],
          type: "rewrite",
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Trouver le double",
          subdescription: "Nombres de 1 \xE0 20, 25, 30, 40, 50, 60 et 100",
          enounces: [
            "Quel est le double de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$&1+&1$$ ?"
          ],
          solutions: [["[_2*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le double de $$&1$$ est &answer."]
            },
            {
              correct: ["$$&1+&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Trouver la moiti\xE9",
          subdescription: "Nombres pairs de 1 \xE0 40, 50, 60 et 100",
          enounces: ["Quelle est la moiti\xE9 de $$&2$$ ?"],
          solutions: [["[_&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];$e[16;20];25;30;50}",
              "&2": "[_2*&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["La moiti\xE9 de $$&2$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La moiti\xE9 de $$[_2*&1_]$$ est &solution car $$&1+&1=[_2*&1_]$$"
              }
            ]
          ],
          type: "rewrite",
          defaultDelay: 15,
          grade: CE2
        }
      ],
      "Triple et tiers": [
        {
          description: "Trouver le triple",
          subdescription: "Nombre inf\xE9rieur \xE0 10",
          enounces: [
            "Quel est le triple de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$&1+&1+&1$$ ?"
          ],
          solutions: [["[_3*&1_]"]],
          variables: [{ "&1": "$e[0;9]" }],
          correctionFormat: [
            {
              correct: ["Le triple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$&1+&1+&1=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Trouver le triple",
          subdescription: "Dizaines enti\xE8res (jusqu'\xE0 50)",
          enounces: [
            "Quel est le triple de $$&2$$ ?",
            "Quel est le r\xE9sultat de $$&2+&2+&2$$ ?"
          ],
          solutions: [["[_3*&2_]"]],
          variables: [
            {
              "&1": "$e[1;5]*10",
              "&2": "[_&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le triple de $$&2$$ est &answer."]
            },
            {
              correct: ["$$&2+&2+&2=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Trouver le tiers",
          subdescription: "Multiples de 3 inf\xE9rieurs \xE0 30",
          enounces: ["Quelle est le tiers de $$[_3*&1_]$$ ?"],
          solutions: [["&1"]],
          variables: [{ "&1": "$e[0;10]" }],
          correctionFormat: [
            {
              correct: ["Le tiers de $$[_3*&1_]$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le tiers de $$[_3*&1_]$$ est &solution car $$&1 + &1 + &1=[_3*&1_]$$"
              }
            ]
          ],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Trouver le triple",
          subdescription: "Nombres de 1 \xE0 15, 25, 30, 40, 50 et 100",
          enounces: [
            "Quel est le triple de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$&1+&1+&1$$ ?"
          ],
          solutions: [["[_3*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];25;30;40;50;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le triple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$&1+&1+&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Trouver le triple",
          subdescription: "Nombres de 1 \xE0 20, 25, 30, 40, 50, 60 et 100",
          enounces: [
            "Quel est le triple de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$&1+&1+&1$$ ?"
          ],
          solutions: [["[_3*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le triple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$&1+&1+&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CE2
        }
      ],
      "Somme astucieuse": [
        {
          description: "Ajouter 9",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&3+9", "9+&3"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &3+\\bold{\\textcolor{${color1}}{9}} &= &3+\\bold{\\textcolor{${color1}}{10-1}} \\\\ &= [_&3+10_]-1 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{9}} + &3 &= \\bold{\\textcolor{${color1}}{10-1}} + &3\\\\ &= &3 + 10-1 \\\\ &= [_&3+10_]-1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          variables: [
            {
              "&1": "$e[1;7]",
              "&2": "$e[2;9]",
              "&3": "[_&1*10+&2_]"
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Additionner par regroupements",
          subdescription: "Regrouper pour obtenir 10. 3 nombres \xE0 un chiffre.",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&2+&1+[_10-&1_]", "&1+&2+[_10-&1_]"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &2+\\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{10}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &2 + \\bold{\\textcolor{${color1}}{[_10-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{10}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          variables: [{ "&1": "$e{1}", "&2": "$e[7;9]\\{&1}" }],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Ajouter 19, 29, 39, ....",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&4+&5", "&5+&4"],
          variables: [
            {
              "&1": "$e[1;7]",
              "&2": "$e[1;8-&1]",
              "&3": "$e[1;8]",
              "&4": "[_&2*10+&3_]",
              "&5": "[_&1*10+9_]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &4+\\bold{\\textcolor{${color1}}{&5}} &= &4+\\bold{\\textcolor{${color1}}{[_&5+1_]-1}} \\\\ &= [_&4+&5+1_]-1 \\\\ &= &sol\\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&5}} + &4 &= \\bold{\\textcolor{${color1}}{[_&5+1_]-1}} + &4\\\\ &= &4 + [_&5+1_]-1 \\\\ &= [_&4+&5+1_]-1 \\\\ &= &sol\\end{align}$$`
              }
            ]
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Additionner par regroupements",
          subdescription: "Regrouper pour obtenir 10. 2 nombres \xE0 un chiffre et un \xE0 2 chiffres.",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&2+&1+[_10-&1_]", "&1+&2+[_10-&1_]"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &2+\\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{10}} \\\\ &=  &sol\\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &2 + \\bold{\\textcolor{${color1}}{[_10-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{10}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          variables: [{ "&1": "$e{1}", "&2": "$e[19;99]" }],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Additionner par regroupements",
          subdescription: "5 Nombres \xE0 1 chiffre",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: [
            "&1+[_10-&1_]+&2+[_10-&2_]+&3",
            "&1+[_10-&1_]+&2+&3+[_10-&2_]",
            "&1+[_10-&1_]+&3+&2+[_10-&2_]",
            "&1+&3+[_10-&1_]+&2+[_10-&2_]",
            "&3+&1+[_10-&1_]+&2+[_10-&2_]"
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}}+\\bold{\\textcolor{yellow}{&2}}+\\bold{\\textcolor{yellow}{[_10-&2_]}}+&3 &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}}+\\bold{\\textcolor{yellow}{&2}}+ &3 + \\bold{\\textcolor{yellow}{[_10-&2_]}} &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}}+ &3 + \\bold{\\textcolor{yellow}{&2}}+\\bold{\\textcolor{yellow}{[_10-&2_]}} &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &3 + \\bold{\\textcolor{${color1}}{[_10-&1_]}}+\\bold{\\textcolor{yellow}{&2}}+\\bold{\\textcolor{yellow}{[_10-&2_]}} &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 + \\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}}+\\bold{\\textcolor{yellow}{&2}}+\\bold{\\textcolor{yellow}{[_10-&2_]}} &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          variables: [
            {
              "&1": "$e{1}",
              "&2": "$e{1}\\{&1;[_10-&1_]}",
              "&3": "$e{1}\\{&1;[_10-&1_];&2;[_10-&2_]}"
            }
          ],
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "Additionner par regroupements",
          subdescription: "3 Nombres \xE0 2 chiffres. Regrouper pour obtenir 100",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&2+&1+[_100-&1_]", "&1+&2+[_100-&1_]"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &2+\\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_100-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{100}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &2 + \\bold{\\textcolor{${color1}}{[_100-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{100}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          variables: [{ "&1": "$e{2;2}", "&2": "$e[19;99]" }],
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "Additionner par regroupements",
          subdescription: "3 Nombres \xE0 2 chiffres.",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: [
            "&6+[_&1*10-&6_]+&7",
            "&6+&7+[_&1*10-&6_]",
            "&7+&6+[_&1*10-&6_]"
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&6}}+\\bold{\\textcolor{${color1}}{[_&1*10-&6_]}} + &7 &= \\bold{\\textcolor{${color1}}{[_&1*10_]}} + &7\\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&6}}+ &7 + \\bold{\\textcolor{${color1}}{[_&1*10-&6_]}} &= &7+\\bold{\\textcolor{${color1}}{[_&1*10_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &7+\\bold{\\textcolor{${color1}}{&6}}+\\bold{\\textcolor{${color1}}{[_&1*10-&6_]}} &= &7+\\bold{\\textcolor{${color1}}{[_&1*10_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[1;&1-2]",
              "&3": "$e{1}",
              "&4": "$e{1}",
              "&5": "$e{1}\\{&3}",
              "&6": "[_&2*10+&3_]",
              "&7": "[_&4*10+&5_]"
            }
          ],
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "Additionner par regroupements",
          subdescription: "4 Nombres \xE0 2 chiffres.",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&4+[_&1*10-&4_]+&8+[_&5*10-&8_]"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								\\bold{\\textcolor{${color1}}{&4}}+\\bold{\\textcolor{${color1}}{[_&1*10-&4_]}} + \\bold{\\textcolor{${color2}}{&8}}+\\bold{\\textcolor{${color2}}{[_&5*10-&8_]}} 								 &= \\bold{\\textcolor{${color1}}{[_&1*10_]}} + \\bold{\\textcolor{${color2}}{[_&5*10_]}} \\\\  								 &=  &sol 								 \\end{align}$$`
              }
            ]
          ],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[1;&1-2]",
              "&3": "$e{1}",
              "&4": "[_&2*10+&3_]",
              "&5": "$e[3;9]",
              "&6": "$e[1;&5-2]",
              "&7": "$e{1}",
              "&8": "[_&6*10+&7_]"
            }
          ],
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "Calculer une somme",
          subdescription: "Somme d\u2019un nombre ayant au plus quatre chiffres et de 9 ou 19",
          enounces: ["Calcule."],
          expressions: ["&5+9", "&5+19"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[1;9]",
              "&5": "[_&1*1000+&2*100+&3*10+&4_]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &5+\\bold{\\textcolor{${color1}}{9}} &= &5+\\bold{\\textcolor{${color1}}{10-1}} \\\\ &= [_&5+10_]-1 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &5+\\bold{\\textcolor{${color1}}{19}} &= &5+\\bold{\\textcolor{${color1}}{20-1}} \\\\ &= [_&5+20_]-1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Additionner par regroupements",
          subdescription: "Nombres \xE0 3 chiffres. Regrouper pour faire 1000",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&2+&1+[_1000-&1_]", "&1+&2+[_1000-&1_]"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &2+\\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_1000-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{1000}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &2 + \\bold{\\textcolor{${color1}}{[_1000-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{1000}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          variables: [{ "&1": "$e{3;3}", "&2": "$e{3;3}" }],
          defaultDelay: 20,
          grade: CE2
        }
      ]
    },
    Soustraire: {
      Diff\u00E9rence: [
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Nombres \xE0 1 chiffre",
          enounces: ["Calcule."],
          expressions: ["&1-&2"],
          variables: [{ "&1": "$e[5;9]", "&2": "$e[1;&1-1]" }],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Soustraire un nombre \xE0 un chiffre \xE0 un nombre \xE0 deux chiffres, sans franchissement de la dizaine",
          enounces: ["Calcule."],
          expressions: ["[_&1*10+&3_]-&2"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;8]",
              "&3": "$e[&2+1;9]"
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Soustraire des dizaines enti\xE8res \xE0 un nombre.",
          enounces: ["Calcule."],
          expressions: ["[_&2*10+&3_]-[_&1*10_]"],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[&1+1;9]",
              "&3": "$e[0;9]"
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Une dizaine et un nombre \xE0 un chiffre (avec franchissement de la dizaine)",
          enounces: ["Calcule."],
          expressions: ["[_&1+&2_] - &1"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[11-&1;9]"
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Soustraire un nombre \xE0 un chiffre \xE0 un nombre \xE0 deux chiffres, avec franchissement de la dizaine",
          enounces: ["Calcule."],
          expressions: ["[_&1*10+&2_]-&3"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;8]",
              "&3": "$e[&2+1;9]"
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: " Soustraire un nombre \xE0 deux chiffres \xE0 un nombre \xE0 3 chiffres, sans retenue",
          enounces: ["Calcule."],
          expressions: ["[_ &1*100 + &2*10 + &3 _] - [_ &4*10 + &5 _]"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[1;&2-1]",
              "&5": "$e[1;&3-1]"
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "  Soustraire des centaines enti\xE8res \xE0 un nombre",
          enounces: ["Calcule."],
          expressions: ["[_ &1*100 + &2*10 + &3 _] - [_&4*100_]"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;&1-1]"
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Soustraire un nombre d'au plus 3 chiffres \xE0 un nombre \xE0 4 chiffres, sans retenue",
          enounces: ["Calcule."],
          expressions: [
            "[_ &1*1000 + &2*100 + &3*10+&4_]-[_ &5*100 + &6*10+&7 _]"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]",
              "&5": "$e[0;&2-1]",
              "&6": "$e[0;&3-1]",
              "&7": "$e[1;&4-1]"
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Soustraire des dizaines enti\xE8res, des centaines enti\xE8res ou des milliers entiers \xE0 un nombre",
          enounces: ["Calcule."],
          expressions: [
            "[_ &1*100 + &2*10 + &3 _] - [_&5*100_]",
            "[_ &1*100 + &2*10 + &3 _] - [_&5*10_]",
            "[_ &1*1000 + &2*100 + &3*10 + &4 _] - [_&5*1000_]",
            "[_ &1*1000 + &2*100 + &3*10 + &4 _] - [_&5*100_]",
            "[_ &1*1000 + &2*100 + &3*10 + &4 _] - [_&5*10_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&5": "$e[1;&1-1]"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&5": "$e[1;9]"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[1;&1-1]"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[1;9]"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[1;9]"
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Nombres \xE0 2 chiffres (avec retenue)",
          enounces: ["Calcule."],
          expressions: ["[_ &1*10 + &4 _] - [_ &3*10 + &2 _]"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[1;&1-1]",
              "&4": "$e[1;&2-1]"
            }
          ],
          solutions: [["[_ &1*10 + &4 -( &3*10 + &2 )_]"]],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Calculer une diff\xE9rence (r\xE9sultat positif)",
          subdescription: "Nombres \xE0 3 chiffres (avec retenue)",
          enounces: ["Calcule."],
          expressions: [
            "[_ &1*100 + &5*10 + &6 _] - [_ &4*100 + &2*10 + &3 _]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[1;&1-1]",
              "&5": "$e[1;&2-1]",
              "&6": "$e[1;&3-1]"
            }
          ],
          solutions: [["[_ &1*100 + &5*10 + &6 -( &4*100 + &2*10 + &3 )_]"]],
          defaultDelay: 20,
          grade: CM1
        }
      ],
      "A trou": [
        {
          description: "Compl\xE9ter une soustraction \xE0 trou (r\xE9sultat positif)",
          subdescription: "Nombres \xE0 1 chiffre",
          enounces: ["Compl\xE8te"],
          expressions: ["?-&1=&2", "&1-?=&2"],
          variables: [
            { "&1": "$e[2;8]", "&2": "$e[1;9-&1]" },
            { "&1": "$e[2;9]", "&2": "$e[1;&1-1]" }
          ],
          solutions: [["[_&1+&2_]"], ["[_&1-&2_]"]],
          type: "trou",
          defaultDelay: 20,
          grade: CP
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou",
          subdescription: "Soustraire un nombre \xE0 un chiffre \xE0 un nombre \xE0 deux chiffres, sans franchissement de la dizaine",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&1*10+&3_] - ? = [_&1*10+&3-&2_]"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;8]",
              "&3": "$e[&2+1;9]"
            }
          ],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou",
          subdescription: "Soustraire des dizaines enti\xE8res \xE0 un nombre.",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&2*10+&3_] - ? = [_&2*10+&3 - &1*10_]"],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[&1+1;9]",
              "&3": "$e[0;9]"
            }
          ],
          type: "trou",
          solutions: [["[_&1*10_]"]],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou",
          subdescription: "Une dizaine et un nombre \xE0 un chiffre (avec franchissement de la dizaine)",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&1+&2_] - ? = &2"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[11-&1;9]"
            }
          ],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou",
          subdescription: "Soustraire un nombre \xE0 un chiffre \xE0 un nombre \xE0 deux chiffres, avec franchissement de la dizaine",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&1*10+&2_] - ? = [_&1*10+&2-&3_]"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;8]",
              "&3": "$e[&2+1;9]"
            }
          ],
          type: "trou",
          solutions: [["&3"]],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou",
          subdescription: " Soustraire un nombre \xE0 deux chiffres \xE0 un nombre \xE0 3 chiffres, sans retenue",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_ &1*100 + &2*10 + &3 _] - ? =  [_ &1*100 + &2*10 + &3 - (&4*10 + &5) _]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[1;&2-1]",
              "&5": "$e[0;&3-1]"
            }
          ],
          type: "trou",
          solutions: [["[_ &4*10 + &5 _]"]],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou",
          subdescription: "  Soustraire des centaines enti\xE8res \xE0 un nombre",
          enounces: ["COmpl\xE8te."],
          expressions: [
            "[_ &1*100 + &2*10 + &3 _] - ? =  [_&1*100 + &2*10 + &3 - &4*100_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;&1-1]"
            }
          ],
          type: "trou",
          solutions: [["[_&4*100_]"]],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou",
          subdescription: "Soustraire un nombre d'au plus 3 chiffres \xE0 un nombre \xE0 4 chiffres, sans retenue",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_ &1*1000 + &2*100 + &3*10+&4_]- ? = [_&1*1000 + &2*100 + &3*10+&4-(&5*100 + &6*10+&7) _]"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]",
              "&5": "$e[0;&2-1]",
              "&6": "$e[0;&3-1]",
              "&7": "$e[1;&4-1]"
            }
          ],
          type: "trou",
          solutions: [["[_ &5*100 + &6*10+&7 _]"]],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou",
          subdescription: "Soustraire des dizaines enti\xE8res, des centaines enti\xE8res ou des milliers entiers \xE0 un nombre",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_ &1*100 + &2*10 + &3 _] - ? = [_&1*100 + &2*10 + &3 - &5*100_]",
            "[_ &1*100 + &2*10 + &3 _] - ? = [_&1*100 + &2*10 + &3 - &5*10_]",
            "[_ &1*1000 + &2*100 + &3*10 + &4 _] - ? = [_&1*1000 + &2*100 + &3*10 + &4 - &5*1000_]",
            "[_ &1*1000 + &2*100 + &3*10 + &4 _] - ? = [_&1*1000 + &2*100 + &3*10 + &4 - &5*100_]",
            "[_ &1*1000 + &2*100 + &3*10 + &4 _] - ? = [_&1*1000 + &2*100 + &3*10 + &4 - &5*10_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&5": "$e[1;&1-1]"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&5": "$e[1;9]"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[1;&1-1]"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[1;9]"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]",
              "&3": "$e[0;9]",
              "&4": "$e[0;9]",
              "&5": "$e[1;9]"
            }
          ],
          type: "trou",
          solutions: [
            ["[_&5*100_]"],
            ["[_&5*10_]"],
            ["[_&5*1000_]"],
            ["[_&5*100_]"],
            ["[_&5*10_]"]
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou (r\xE9sultat positif)",
          subdescription: "Nombres \xE0 2 chiffres sans retenue.",
          enounces: ["Quel est le nombre manquant dans cette \xE9galit\xE9 ?"],
          expressions: [
            "[_ &1*10 + &2 _] - ? =  [_ &3*10 + &4 _]",
            "? - [_ &1*10 + &2 _] =  [_ &3*10 + &4 _]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[1;&1-1]",
              "&4": "$e[1;&2-1]"
            },
            {
              "&1": "$e[2;8]",
              "&2": "$e[2;8]",
              "&3": "$e[1;9-&1]",
              "&4": "$e[1;9-&2]"
            }
          ],
          solutions: [
            ["[_ &1*10 + &2 -  ( &3*10 + &4) _]"],
            ["[_ &1*10 + &2 + &3*10 + &4 _]"]
          ],
          type: "trou",
          defaultDelay: 15,
          grade: UNKNOWN
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou (r\xE9sultat positif)",
          subdescription: "Nombres \xE0 3 chiffres (sans retenue)",
          enounces: ["Quel est le nombre manquant dans cette \xE9galit\xE9 ?"],
          expressions: [
            "[_ &1*100 + &2*10 + &3 _] - ? = [_ &4*100 + &5*10 + &6 _]",
            "? - [_ &1*100 + &2*10 + &3 _] = [_ &4*100 + &5*10 + &6 _]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[1;&1-1]",
              "&5": "$e[1;&2-1]",
              "&6": "$e[1;&3-1]"
            },
            {
              "&1": "$e[2;8]",
              "&2": "$e[2;8]",
              "&3": "$e[2;8]",
              "&4": "$e[1;9-&1]",
              "&5": "$e[1;9-&2]",
              "&6": "$e[1;9-&3]"
            }
          ],
          solutions: [
            ["[_ &1*100 + &2*10 + &3 - (&4*100 + &5*10 + &6) _]"],
            ["[_ &1*100 + &2*10 + &3 + &4*100 + &5*10 + &6 _]"]
          ],
          type: "trou",
          defaultDelay: 20,
          grade: UNKNOWN
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou (r\xE9sultat positif)",
          subdescription: "2 nombres \xE0 1 chiffres (avec retenue)",
          enounces: ["Quel est le nombre manquant dans cette \xE9galit\xE9 ?"],
          expressions: ["[_&1+&2_] - ?= &2", "?-&1= &2"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[11-&1;9]"
            }
          ],
          solutions: [["&1"], ["[_&1+&2_]"]],
          type: "trou",
          defaultDelay: 15,
          grade: UNKNOWN
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou (r\xE9sultat positif)",
          subdescription: "Nombres \xE0 2 chiffres (avec retenue)",
          enounces: ["Quel est le nombre manquant dans cette \xE9galit\xE9 ?"],
          expressions: [
            "[_ &1*10 + &4 _] - ? =  [_ &3*10 + &2 _]",
            "? - [_ &1*10 + &2 _] =  [_ &3*10 + &4 _]"
          ],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[2;9]",
              "&3": "$e[1;&1-2]",
              "&4": "$e[1;&2-1]"
            },
            {
              "&1": "$e[1;7]",
              "&2": "$e[1;9]",
              "&3": "$e[1;8-&1]",
              "&4": "$e[9-&2+1;9]"
            }
          ],
          solutions: [
            ["[_ &1*10 + &4 - (&3*10 + &2 )_]"],
            ["[_ &1*10 + &2 + &3*10 + &4 _]"]
          ],
          type: "trou",
          defaultDelay: 15,
          grade: UNKNOWN
        },
        {
          description: "Compl\xE9ter une soustraction \xE0 trou (r\xE9sultat positif)",
          subdescription: "Nombres \xE0 3 chiffres (avec retenue)",
          enounces: ["Quel est le nombre manquant dans cette \xE9galit\xE9 ?"],
          expressions: [
            "[_ &1*100 + &5*10 + &6 _] - ? =  [_ &4*100 + &2*10 + &3 _]",
            "? - [_ &1*100 + &2*10 + &3 _] =  [_ &4*100 + &5*10 + &6_]"
          ],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[1;&1-2]",
              "&5": "$e[1;&2-1]",
              "&6": "$e[1;&3-1]"
            },
            {
              "&1": "$e[1;7]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;8-&1]",
              "&5": "$e[9-&2+1;9]",
              "&6": "$e[9-&3+1;9]"
            }
          ],
          solutions: [
            ["[_ &1*100 + &5*10 + &6 - (&4*100 + &2*10 + &3) _]"],
            ["[_&1*100 + &2*10 + &3 + &4*100 + &5*10 + &6_]"]
          ],
          type: "trou",
          defaultDelay: 20,
          grade: UNKNOWN
        }
      ],
      "Diff\xE9rence astucieuse": [
        {
          description: "Soustraire 9.",
          expressions: ["&3-9"],
          enounces: ["Calcule de mani\xE8re astucieuse."],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &3-\\bold{\\textcolor{${color1}}{9}} &= &3\\bold{\\textcolor{${color1}}{-10+1}} \\\\ &= [_&3-10_]+1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[1;9]",
              "&3": "[_&2*10+&1_]"
            }
          ],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Soustraire 19, 29, ....",
          expressions: ["&4-&5"],
          enounces: ["Calcule de mani\xE8re astucieuse."],
          variables: [
            {
              "&1": "$e[0;8]",
              "&2": "$e[&1+1;9]",
              "&3": "$e[1;8]",
              "&4": "[_&2*10+&3_]",
              "&5": "[_&1*10+9_]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &4-\\bold{\\textcolor{${color1}}{&5}} &= &4\\bold{\\textcolor{${color1}}{-[_&5+1_]+1}} \\\\ &= [_&4-&5-1_]+1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE2
        }
      ]
    },
    Multiplier: {
      Tables: [
        {
          description: "Table de multiplication",
          subdescription: "Par 1",
          enounces: ["Calcule."],
          expressions: ["1*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE1
        },
        {
          description: "Table de multiplication",
          subdescription: "Par 2",
          enounces: ["Calcule."],
          expressions: ["2*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE1
        },
        {
          description: "Table de multiplication",
          subdescription: "Par 3",
          enounces: ["Calcule."],
          expressions: ["3*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE1
        },
        {
          description: "Table de multiplication",
          subdescription: "Par 4",
          enounces: ["Calcule."],
          expressions: ["4*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE1
        },
        {
          description: "Table de multiplication",
          subdescription: "Par 5",
          enounces: ["Calcule."],
          expressions: ["5*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE1
        },
        {
          description: "Table de multiplication",
          subdescription: "Par 6",
          enounces: ["Calcule."],
          expressions: ["6*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE2
        },
        {
          description: "Table de multiplication",
          subdescription: "Par 7",
          enounces: ["Calcule."],
          expressions: ["7*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE2
        },
        {
          description: "Table de multiplication",
          subdescription: "Par 8",
          enounces: ["Calcule."],
          expressions: ["8*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE2
        },
        {
          description: "Table de multiplication",
          subdescription: "Par 9",
          enounces: ["Calcule."],
          expressions: ["9*&1"],
          variables: [{ "&1": "$e[2;12]" }],
          defaultDelay: 6,
          grade: CE2
        }
      ],
      Produit: [
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Nombres \xE0 1 chiffre",
          enounces: ["Calcule."],
          expressions: ["&1*&2"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Multiplier par 20",
          subdescription: "Nombre \xE0 1 chiffre",
          enounces: ["Calcule."],
          expressions: ["&1*20", "20*&1"],
          variables: [{ "&1": "$e[0;9]" }],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Multiplier par 20",
          subdescription: "Nombre \xE0 2 chiffres",
          enounces: ["Calcule."],
          expressions: ["&1*20", "20*&1"],
          variables: [{ "&1": "$l{$e[11;15];$e[15;20];25;30;40;50}" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &1 \\times \\bold{\\textcolor{${color1}}{20}} &= &1 \\times \\bold{\\textcolor{${color1}}{2 \\times 10}}  \\\\ &= [_&1*2_] \\times 10 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{20}} \\times &1 &=  \\bold{\\textcolor{${color1}}{10 \\times 2}} \\times &1 \\\\ &= 10 \\times [_&1*2_]  \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Multiplier par 30, 40, 50, 60, 70, 80, 90",
          subdescription: "Nombre \xE0 1 chiffres",
          enounces: ["Calcule."],
          expressions: ["[_&1*10_]*&2", "&2*[_&1*10_]"],
          variables: [{ "&1": "$e[3;9]", "&2": "$e[2;9]" }],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Multiplier deux multiples de 10",
          enounces: ["Calcule."],
          expressions: ["&3*&4"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "[_&1*10_]",
              "&4": "[_&2*10_]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&3}} \\times \\bold{\\textcolor{yellow}{&4}} &= \\bold{\\textcolor{${color1}}{&1 \\times 10}} \\times \\bold{\\textcolor{yellow}{&2 \\times 10}} \\\\ &= &1 \\times &2 \\times 10 \\times 10 \\\\ &= [_&1*&2_] \\times 100 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Les 2 facteurs sont des multiples de 10, 100 ou 1000",
          enounces: ["Calcule."],
          expressions: ["&5*&6"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;3]",
              "&3": "$e[2;9]",
              "&4": "$e[1;3]",
              "&5": "[_&1*10^&2_]",
              "&6": "[_&3*10^&4_]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&5}} \\times \\bold{\\textcolor{yellow}{&6}} &= \\bold{\\textcolor{${color1}}{&1 \\times [_10^&2_]}} \\times \\bold{\\textcolor{yellow}{&3 \\times [_10^&4_]}} \\\\ &= &1 \\times &3 \\times [_10^&2_] \\times [_10^&4_] \\\\ &= [_&1*&3_] \\times [_10^(&2+&4)_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Un facteur \xE0 2 chiffres",
          enounces: ["Calcule."],
          expressions: ["&1*&2", "&2*&1"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[12;99]" }],
          defaultDelay: 30,
          grade: CM2
        },
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Un facteur \xE0 3 chiffres",
          enounces: ["Calcule."],
          expressions: ["&1*&2", "&2*&1"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[102;999]" }],
          defaultDelay: 30,
          grade: SIXIEME
        },
        {
          description: "Chiffre des unit\xE9s d'un produit",
          enounces: [
            "Quel est le chiffre des unit\xE9s du produit de $$&1$$ par $$&2$$ ?"
          ],
          variables: [
            {
              "&1": "$e[11;99]",
              "&2": "$e[102;999]",
              "&3": "&2*&1"
            }
          ],
          solutions: [["[_(&3:10-floor(&3:10))*10_]"]],
          correctionFormat: [
            {
              correct: [
                "Le chiffre des unit\xE9s de $$&1 \\times &2$$ est &answer."
              ],
              answer: "Le chiffre des unit\xE9s est &answer."
            }
          ],
          type: "rewrite",
          defaultDelay: 30,
          grade: SIXIEME
        }
      ],
      "Double et moiti\xE9": [
        {
          description: "Trouver le double",
          subdescription: "Nombre inf\xE9rieur \xE0 10",
          enounces: [
            "Quel est le double de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$2*&1$$ ?"
          ],
          solutions: [["[_2*&1_]"]],
          variables: [{ "&1": "$e[0;9]" }],
          correctionFormat: [
            {
              correct: ["Le double de $$&1$$ est &answer."]
            },
            {
              correct: ["$$2*&1=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Trouver le double",
          subdescription: "Dizaines enti\xE8res (jusqu'\xE0 50)",
          enounces: [
            "Quel est le double de $$&2$$ ?",
            "Quel est le r\xE9sultat de $$2*&2$$ ?"
          ],
          solutions: [["[_2*&2_]"]],
          variables: [
            {
              "&1": "$e[1;5]*10",
              "&2": "[_&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le double de $$&2$$ est &answer."]
            },
            {
              correct: ["$$2*&2=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Trouver la moiti\xE9",
          subdescription: "Nombre pair inf\xE9rieur \xE0 20",
          enounces: ["Quelle est la moiti\xE9 de $$[_2*&1_]$$ ?"],
          solutions: [["[_&1_]"]],
          variables: [{ "&1": "$e[0;10]" }],
          correctionFormat: [
            {
              correct: ["La moiti\xE9 de $$[_2*&1_]$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La moiti\xE9 de $$[_2*&1_]$$ est &solution car $$2*&1=[_2*&1_]$$"
              }
            ]
          ],
          defaultDelay: 10,
          grade: CP
        },
        {
          description: "Trouver le double",
          subdescription: "Nombres de 1 \xE0 15, 25, 30, 40, 50 et 100",
          enounces: [
            "Quel est le double de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$2*&1$$ ?"
          ],
          solutions: [["[_2*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];25;30;40;50;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le double de $$&1$$ est &answer."]
            },
            {
              correct: ["$$2*&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Trouver la moiti\xE9",
          subdescription: "Nombres pairs de 1 \xE0 30, 40, 50 et 100",
          enounces: ["Quelle est la moiti\xE9 de $$&2$$ ?"],
          solutions: [["[_&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];20;25;50}",
              "&2": "[_2*&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["La moiti\xE9 de $$&2$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le moiti\xE9 de $$[_2*&1_]$$ est &solution car $$2*&1=[_2*&1_]$$"
              }
            ]
          ],
          type: "rewrite",
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Trouver le double",
          subdescription: "Nombres de 1 \xE0 20, 25, 30, 40, 50, 60 et 100",
          enounces: [
            "Quel est le double de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$2*&1$$ ?"
          ],
          solutions: [["[_2*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le double de $$&1$$ est &answer."]
            },
            {
              correct: ["$$2*&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Trouver la moiti\xE9",
          subdescription: "Nombres pairs de 1 \xE0 40, 50, 60 et 100",
          enounces: ["Quelle est la moiti\xE9 de $$&2$$ ?"],
          solutions: [["[_&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];$e[16;20];25;30;50}",
              "&2": "[_2*&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["La moiti\xE9 de $$&2$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le moiti\xE9 de $$[_2*&1_]$$ est &solution car $$2*&1=[_2*&1_]$$"
              }
            ]
          ],
          type: "rewrite",
          defaultDelay: 15,
          grade: CE2
        }
      ],
      "Triple et tiers": [
        {
          description: "Trouver le triple",
          subdescription: "Nombre inf\xE9rieur \xE0 10",
          enounces: [
            "Quel est le triple de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$3*&1$$ ?"
          ],
          solutions: [["[_3*&1_]"]],
          variables: [{ "&1": "$e[0;9]" }],
          correctionFormat: [
            {
              correct: ["Le triple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$3*&1=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Trouver le triple",
          subdescription: "Dizaines enti\xE8res (jusqu'\xE0 50)",
          enounces: [
            "Quel est le triple de $$&2$$ ?",
            "Quel est le r\xE9sultat de $$3*&2$$ ?"
          ],
          solutions: [["[_3*&2_]"]],
          variables: [
            {
              "&1": "$e[1;5]*10",
              "&2": "[_&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le triple de $$&2$$ est &answer."]
            },
            {
              correct: ["$$3*&2=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Trouver le tiers",
          subdescription: "Multiples de 3 inf\xE9rieurs \xE0 30",
          enounces: ["Quelle est le tiers de $$[_3*&1_]$$ ?"],
          solutions: [["[_&1_]"]],
          variables: [{ "&1": "$e[0;10]" }],
          correctionFormat: [
            {
              correct: ["Le tiers de $$[_3*&1_]$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le tiers de $$[_3*&1_]$$ est &solution car $$3*&1=[_3*&1_]$$"
              }
            ]
          ],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Trouver le triple",
          subdescription: "Nombres de 1 \xE0 15, 25, 30, 40, 50 et 100",
          enounces: [
            "Quel est le triple de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$3*&1$$ ?"
          ],
          solutions: [["[_3*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];25;30;40;50;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le triple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$3*&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Trouver le triple",
          subdescription: "Nombres de 1 \xE0 20, 25, 30, 40, 50, 60 et 100",
          enounces: [
            "Quel est le triple de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$3*&1$$ ?"
          ],
          solutions: [["[_3*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le triple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$3*&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CE2
        }
      ],
      "Quadruple et quart": [
        {
          description: "Trouver le quadruple",
          subdescription: "Nombre inf\xE9rieur \xE0 10",
          enounces: [
            "Quel est le quadruple de $$[\xB0&1\xB0]$$ ?",
            "Quel est le r\xE9sultat de $$[\xB04*&1\xB0]$$ ?"
          ],
          solutions: [["[_4*&1_]"]],
          variables: [{ "&1": "$e[0;9]" }],
          correctionFormat: [
            {
              correct: ["Le quadruple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$4*&1=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Trouver le quadruple",
          subdescription: "Dizaines enti\xE8res (jusqu'\xE0 50)",
          enounces: [
            "Quel est le quadruple de $$[\xB0&2\xB0]$$ ?",
            "Quel est le r\xE9sultat de $$[\xB04*&2\xB0]$$ ?"
          ],
          solutions: [["[_4*&2_]"]],
          variables: [
            {
              "&1": "$e[1;5]*10",
              "&2": "[_&1_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le quadruple de $$&2$$ est &answer."]
            },
            {
              correct: ["$$4*&2=$$&answer"]
            }
          ],
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Trouver le quart",
          subdescription: "Multiples de 4 inf\xE9rieurs \xE0 40",
          enounces: ["Quelle est le quart de $$[_4*&1_]$$ ?"],
          solutions: [["[_&1_]"]],
          variables: [{ "&1": "$e[0;10]" }],
          correctionFormat: [
            {
              correct: ["Le quart de $$[_4*&1_]$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le quart de $$[_4*&1_]$$ est &solution car $$4*&1=[_4*&1_]$$"
              }
            ]
          ],
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Trouver le quadruple",
          subdescription: "Nombres de 1 \xE0 15, 25, 30, 40, 50 et 100",
          enounces: [
            "Quel est le quadruple de $$[\xB0&1\xB0]$$ ?",
            "Quel est le r\xE9sultat de $$[\xB04*&1\xB0]$$ ?"
          ],
          solutions: [["[_4*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;9];$e[11;15];25;30;40;50;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le quadruple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$4*&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Trouver le quadruple",
          subdescription: "Nombres de 1 \xE0 20, 25, 30, 40, 50, 60 et 100",
          enounces: [
            "Quel est le quadruple de $$&1$$ ?",
            "Quel est le r\xE9sultat de $$[\xB04*&1\xB0]$$ ?"
          ],
          solutions: [["[_4*&1_]"]],
          variables: [
            {
              "&1": "$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le quadruple de $$&1$$ est &answer."]
            },
            {
              correct: ["$$4*&1=$$&answer"]
            }
          ],
          defaultDelay: 15,
          grade: CM1
        }
      ],
      "Produits particuliers": [
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Premiers multiples de 25 et 50",
          enounces: ["Calcule."],
          expressions: ["&1*50", "&1*25"],
          variables: [{ "&1": "$e[0;4]" }],
          defaultDelay: 10,
          grade: CM1
        },
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Produits \xE0 conna\xEEtre par coeur",
          enounces: ["Calcule."],
          options: ["exhaust"],
          expressions: [
            "4*25",
            "2*50",
            "5*12",
            "4*15",
            "4*20",
            "5*14",
            "5*18",
            "6*15",
            "6*20",
            "8*15"
          ],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Multiplication par 50",
          enounces: ["Calcule."],
          expressions: ["[_&1*2+1_]*50", "[_&1*2_]*50"],
          variables: [{ "&1": "$e[2;10]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[_&1*2+1_]}} \\times 50 &= \\bold{\\textcolor{${color1}}{(&1 \\times 2 + 1)}} \\times 50 \\\\ &= &1 \\times 2 \\times 50  + 50 \\\\ &= &1 \\times 100  + 50 \\\\ &=  [_&1*100_]  + 50 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[_&1*2_]}} \\times 50 &= \\bold{\\textcolor{${color1}}{(&1 \\times 2)}} \\times 50 \\\\ &= &1 \\times 2 \\times 50 \\\\ &= &1 \\times 100 \\\\ &=  [_&1*100_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Multiplication par 25",
          enounces: ["Calcule."],
          expressions: ["[_&1*4+&2_]*25", "[_&1*4_]*25"],
          variables: [
            {
              "&1": "$e[2;5]",
              "&2": "$e[1;3]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[_&1*4+&2_]}} \\times 25 &= \\bold{\\textcolor{${color1}}{(&1 \\times 4 + &2)}} \\times 25 \\\\ &= &1 \\times \\bold{\\textcolor{yellow}{4 \\times 25}}  + &2 \\times 25 \\\\ &= &1 \\times \\bold{\\textcolor{yellow}{100}} + [_&2*25_] \\\\ &=  [_&1*100_]  + [_&2*25_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[_&1*4_]}} \\times 25 &= \\bold{\\textcolor{${color1}}{(&1 \\times 4)}} \\times 25 \\\\ &= &1 \\times \\bold{\\textcolor{yellow}{4 \\times 25}} \\\\ &= &1 \\times \\bold{\\textcolor{yellow}{100}} \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM2
        }
      ],
      "Puissances de 10": [
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Multiplication par 10 d'un nombre inf\xE9rieur \xE0 100",
          enounces: ["Calcule."],
          expressions: ["&1*10", "10*&1"],
          variables: [{ "&1": "$e[1;99]" }],
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Multiplication par 100 d'un nombre inf\xE9rieur \xE0 100",
          enounces: ["Calcule."],
          expressions: ["&1*100", "100*&1"],
          variables: [{ "&1": "$e[1;99]" }],
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Calculer un produit d'entiers",
          subdescription: "Multiplication par 10, 100 ou 1000",
          enounces: ["Calcule."],
          expressions: ["&1*[_10^&2_]"],
          variables: [{ "&1": "$e[2;99]", "&2": "$e[1;3]" }],
          defaultDelay: 20,
          grade: CM1
        }
      ],
      "A trou": [
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 2",
          enounces: ["Compl\xE8te."],
          expressions: ["?*2=[_&1*2_]", "2*?=[_&1*2_]"],
          variables: [{ "&1": "$e[2;9]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 3",
          enounces: ["Compl\xE8te."],
          expressions: ["?*3=[_&1*3_]", "3*?=[_&1*3_]"],
          variables: [{ "&1": "$e[2;9]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 4",
          enounces: ["Compl\xE8te."],
          expressions: ["?*4=[_&1*4_]", "4*?=[_&1*4_]"],
          variables: [{ "&1": "$e[2;9]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 5",
          enounces: ["Compl\xE8te."],
          expressions: ["?*5=[_&1*5_]", "5*?=[_&1*5_]"],
          variables: [{ "&1": "$e[2;9]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CE1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 6",
          enounces: ["Compl\xE8te."],
          expressions: ["?*6=[_&1*6_]", "6*?=[_&1*6_]"],
          variables: [{ "&1": "$e[2;9]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 7",
          enounces: ["Compl\xE8te."],
          expressions: ["?*7=[_&1*7_]", "7*?=[_&1*7_]"],
          variables: [{ "&1": "$e[2;9]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 8",
          enounces: ["Compl\xE8te."],
          expressions: ["?*8=[_&1*8_]", "8*?=[_&1*8_]"],
          variables: [{ "&1": "$e[2;9]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 9",
          enounces: ["Compl\xE8te."],
          expressions: ["?*9=[_&1*9_]", "9*?=[_&1*9_]"],
          variables: [{ "&1": "$e[2;9]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Facteurs \xE0 1 chiffre",
          enounces: ["Compl\xE8te."],
          expressions: ["?*&1=[_&1*&2_]", "&1*?=[_&1*&2_]"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[3;9]" }],
          solutions: [["&2"]],
          type: "trou",
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 20. Nombre \xE0 1 chiffre",
          enounces: ["Compl\xE8te."],
          expressions: ["?*20=[_&1*20_]", "20*?=[_20*&1_]"],
          variables: [{ "&1": "$e[0;9]" }],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 20.Nombre \xE0 2 chiffres",
          enounces: ["Compl\xE8te."],
          expressions: ["?*20=[_&1*20_]", "20*?=[_20*&1_]"],
          variables: [{ "&1": "$l{$e[11;15];$e[15;20];25;30;40;50}" }],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou.",
          subdescription: "Multiplier par 30, 40, 50, 60, 70, 80, 90. Nombre \xE0 1 chiffres",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_&1*10_]*? = [_&1*10*&2_]",
            "?*[_&1*10_] = [_&2*&1*10_]"
          ],
          variables: [{ "&1": "$e[3;9]", "&2": "$e[2;9]" }],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou.",
          subdescription: "Multiplier par 30, 40, 50, 60, 70, 80, 90. Nombre \xE0 1 chiffres",
          enounces: ["Compl\xE8te."],
          expressions: ["?*&2 = [_&1*10*&2_]", "&2*? = [_&2*&1*10_]"],
          variables: [{ "&1": "$e[3;9]", "&2": "$e[2;9]" }],
          type: "trou",
          solutions: [["[_&1*10_]"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Combien de fois ... dans ....",
          subdescription: "Multiplier par 30, 40, 50, 60, 70, 80, 90. Nombre \xE0 1 chiffres",
          enounces: ["Dans $$[_&1*10*&2_]$$ combien de fois $$&2$$ ?"],
          variables: [{ "&1": "$e[3;9]", "&2": "$e[2;9]" }],
          type: "rewrite",
          solutions: [["[_&1*10_]"]],
          correctionFormat: [
            {
              correct: ["On peut mettre &answer fois $$&2$$."]
            }
          ],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier deux multiples de 10",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_&1*10_]* ?= [_&1*10*&2*10_]",
            "?*[_&1*10_]=[_&2*10*&1*10_]"
          ],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          type: "trou",
          solutions: [["[_&2*10_]"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou.",
          subdescription: "Premiers multiples de 25 et 50",
          enounces: ["Compl\xE8te."],
          expressions: ["?*50=[_&1*50_]", "?*25=[_&1*25_]"],
          type: "trou",
          solutions: [["&1"]],
          variables: [{ "&1": "$e[0;4]" }],
          defaultDelay: 10,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Les 2 facteurs sont des multiples de 10, 100 ou 1000",
          enounces: ["Compl\xE8te."],
          expressions: [
            "[_&1*10^&2_]*?= [_&1*10^&2*&3*10^&4_]",
            "?*[_&1*10^&2_]= [_&1*10^&2*&3*10^&4_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;3]",
              "&3": "$e[2;9]",
              "&4": "$e[1;3]"
            }
          ],
          solutions: [["[_&3*10^&4_]"]],
          type: "trou",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Produits classiques",
          enounces: ["Compl\xE8te."],
          expressions: [
            "?*4=100",
            "?*5=100",
            "?*2=100",
            "?*5=60",
            "?*4=60",
            "?*5=70",
            "?*5=90",
            "?*6=90",
            "?*25=100",
            "?*20=100",
            "?*50=100",
            "?*12=60",
            "?*15=60",
            "?*14=70",
            "?*18=90",
            "?*15=90"
          ],
          solutions: [
            ["25"],
            ["20"],
            ["50"],
            ["12"],
            ["15"],
            ["14"],
            ["18"],
            ["15"],
            ["4"],
            ["5"],
            ["2"],
            ["5"],
            ["4"],
            ["5"],
            ["5"],
            ["6"]
          ],
          options: ["exhaust"],
          type: "trou",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 50",
          enounces: ["Compl\xE8te."],
          expressions: ["?*50=[_(&1*2+1)*50_]", "?*50 = [_&1*2*50_]"],
          type: "trou",
          solutions: [["[_&1*2+1_]"], ["[_&1*2_]"]],
          variables: [{ "&1": "$e[1;6]" }],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 25",
          enounces: ["Compl\xE8te."],
          expressions: ["?*25=[_(&1*4+&2)*25_]", "?*25=[_&1*4*25_]"],
          type: "trou",
          solutions: [["[_&1*4+&2_]"], ["[_&1*4_]"]],
          variables: [{ "&1": "$e[2;5]", "&2": "$e[1;3]" }],
          defaultDelay: 20,
          grade: CM2
        }
      ],
      Carr\u00E9s: [
        {
          description: "Calculer un carr\xE9",
          subdescription: "Entier de 1 \xE0 12",
          enounces: ["Calcule."],
          expressions: ["&1^2"],
          variables: [{ "&1": "$e[1;12]" }],
          defaultDelay: 10,
          grade: CINQUIEME
        }
      ],
      "Produits astucieux": [
        {
          description: "Calculer astucieusement un produit",
          subdescription: "Utiiser 2 facteurs dont le produit est 10",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["2*&1*5", "5*&1*2", "&1*5*2", "&1*2*5"],
          variables: [{ "&1": "$e[19;40]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{2}} \\times &1 \\times  \\bold{\\textcolor{${color1}}{5}} &= \\bold{\\textcolor{${color1}}{10}} \\times &1 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{5}} \\times &1 \\times  \\bold{\\textcolor{${color1}}{2}} &= \\bold{\\textcolor{${color1}}{10}} \\times &1 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &1 \\times \\bold{\\textcolor{${color1}}{2}} \\times  \\bold{\\textcolor{${color1}}{5}} &= &1 \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &1 \\times \\bold{\\textcolor{${color1}}{5}} \\times  \\bold{\\textcolor{${color1}}{2}} &=   &1 \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 15,
          grade: CE1
        },
        {
          description: "Calculer astucieusement un produit",
          subdescription: "Utiiser 2 facteurs dont le produit est 100",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: [
            "&1*&2*&3",
            "&2*&1*&3",
            "&2*&3*&1",
            "&1*&3*&2",
            "&3*&2*&1",
            "&3*&1*&2"
          ],
          variables: [
            { "&1": "$l{20;25;50}", "&2": "[_100:&1_]", "&3": "$e[11;99]" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}  \\times  \\bold{\\textcolor{${color1}}{&2}} \\times &3 &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  \\bold{\\textcolor{${color1}}{&1}} \\times &3 &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&1}} &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&2}} &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&2}} \\times \\bold{\\textcolor{${color1}}{&1}} &= &3 \\times \\bold{\\textcolor{${color1}}{100}} \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&1}} \\times \\bold{\\textcolor{${color1}}{&2}} &= &3 \\times \\bold{\\textcolor{${color1}}{100}} \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE2
        }
      ],
      Distributivit\u00E9: [
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 chiffre par 12",
          enounces: ["Calculer."],
          expressions: ["12*&1"],
          variables: [{ "&1": "$e[0;9]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 12 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE1
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 chiffre par 13",
          enounces: ["Calculer."],
          expressions: ["13*&1"],
          variables: [{ "&1": "$e[0;9]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 13 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} + 3 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] + [_3*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 chiffre par 21",
          enounces: ["Calculer."],
          expressions: ["21*&1"],
          variables: [{ "&1": "$e[0;9]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 21 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} +  \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] + &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 chiffre par 22",
          enounces: ["Calculer."],
          expressions: ["22*&1"],
          variables: [{ "&1": "$e[0;9]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 22 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 chiffre par 19",
          enounces: ["Calculer."],
          expressions: ["19*&1"],
          variables: [{ "&1": "$e[0;9]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 19 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} - \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] - &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 chiffre par 18",
          enounces: ["Calculer."],
          expressions: ["18*&1"],
          variables: [{ "&1": "$e[0;9]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 18 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} - 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] - [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 2 chiffres par 11",
          enounces: ["Calculer."],
          expressions: ["11*&1"],
          variables: [{ "&1": "$e[13;45]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 11 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] + &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 2 chiffres par  12",
          enounces: ["Calculer."],
          expressions: ["12*&1"],
          variables: [{ "&1": "$l{13;14;15;23;24;25;33;34;35;45}" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 12 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 ou 2 chiffres par  21",
          enounces: ["Calculer."],
          expressions: ["21*&1"],
          variables: [{ "&1": "$l{5;6;7;8;9;13;14;15;23;24;25;35;45}]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 21 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} +  \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] + &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 ou 2 chiffres par  22",
          enounces: ["Calculer."],
          expressions: ["22*&1"],
          variables: [{ "&1": "$l{5;6;7;8;9;13;14;15;23;24;25;35;45}]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 22 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 2 chiffres par  9",
          enounces: ["Calculer."],
          expressions: ["9*&1"],
          variables: [{ "&1": "$e[12;19]" }, { "&1": "$e[23;29]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 9 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} - \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] - &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 ou 2 chiffres par  19",
          enounces: ["Calculer."],
          expressions: ["19*&1"],
          variables: [{ "&1": "$e[13;19]" }, { "&1": "$e[5;9]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 19 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} - \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] - &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication d'un nombre \xE0 1 ou 2 chiffres par  18",
          enounces: ["Calculer."],
          expressions: ["18*&1"],
          variables: [{ "&1": "$e[4;9]" }, { "&1": "$l{13;14;15;25}" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 18 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} - 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] - [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication par 101",
          enounces: ["Calculer"],
          expressions: ["101*&1"],
          variables: [{ "&1": "$e[15;40]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 101 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 100 \\times \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_100*&1_] + &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication par 102",
          enounces: ["Calculer"],
          expressions: ["102*&1"],
          variables: [{ "&1": "$e[15;49]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 102 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 100 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_100*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Multiplication par 99",
          enounces: ["Calculer"],
          expressions: ["99*&1"],
          variables: [{ "&1": "$e[15;40]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 99 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 100 \\times \\bold{\\textcolor{${color1}}{&1}} - \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_100*&1_] - &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Utiliser la distributivit\xE9",
          enounces: ["Calculer"],
          subdescription: "Multiplication par 98",
          expressions: ["98*&1"],
          variables: [{ "&1": "$e[15;40]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 98 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 100 \\times \\bold{\\textcolor{${color1}}{&1}} - 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_100*&1_] - [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "99 fois plus 1 fois",
          enounces: ["Calcule."],
          expressions: ["99*&1+&1", "&1+99*&1", "&1*99+&1", "&1+&1*99"],
          variables: [{ "&1": "$e[50;85]" }],
          correctionDetails: [
            [
              {
                text: `$$&exp = 100 \\times &1=$$ &solution`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Factorisation pour un facteur 10",
          enounces: ["Calcule."],
          expressions: [
            "&2*&1+[_10-&2_]*&1",
            "&1*&2+[_10-&2_]*&1",
            "&2*&1+&1*[_10-&2_]",
            "&1*&2+&1*[_10-&2_]"
          ],
          variables: [{ "&1": "$e[23;99]", "&2": "$e[2;8]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &2 \\times \\bold{\\textcolor{${color1}}{&1}} + [_10-&2_] \\times \\bold{\\textcolor{${color1}}{&1}} &=  10 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}} \\times &2 + [_10-&2_] \\times \\bold{\\textcolor{${color1}}{&1}} &=  10 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &2 \\times \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\times [_10-&2_] &=  10 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  \\bold{\\textcolor{${color1}}{&1}} \\times &2+ \\bold{\\textcolor{${color1}}{&1}} \\times [_10-&2_] &=  10 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Factorisation pour un facteur 100",
          enounces: ["Calculer"],
          expressions: [
            "&2*&1+[_100-&2_]*&1",
            "&1*&2+[_100-&2_]*&1",
            "&2*&1+&1*[_100-&2_]",
            "&1*&2+&1*[_100-&2_]"
          ],
          variables: [{ "&1": "$e[21;99]", "&2": "$e[2;98]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &2 \\times \\bold{\\textcolor{${color1}}{&1}} + [_100-&2_] \\times \\bold{\\textcolor{${color1}}{&1}} &=  100 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}} \\times &2 + [_100-&2_] \\times \\bold{\\textcolor{${color1}}{&1}} &=  100 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &2 \\times \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\times [_100-&2_] &=  100 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  \\bold{\\textcolor{${color1}}{&1}} \\times &2+ \\bold{\\textcolor{${color1}}{&1}} \\times [_100-&2_] &=  100 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      D\u00E9composition: [
        {
          description: "D\xE9composer un entier en produit",
          subdescription: "Produit de deux nombres entiers",
          enounces: [
            "D\xE9compose ce nombre en un produit de 2 facteurs (1 n'est pas un facteur autoris\xE9)."
          ],
          expressions: [
            "[_&1*&2_]",
            "[_&1*4_]",
            "[_&1*8_]",
            "[_&1*6_]",
            "[_&1*9_]",
            "32",
            "36",
            "48",
            "54",
            "64",
            "72",
            "81"
          ],
          variables: [
            { "&1": "$l{2;3;5;7}", "&2": "$l{2;3;5;7}" },
            { "&1": "$l{2;3;5;7}" },
            { "&1": "$l{2;3;5;7}" },
            { "&1": "$l{2;3;5;7}" },
            { "&1": "$l{2;3;5;7}" },
            {},
            {},
            {},
            {},
            {},
            {},
            {}
          ],
          solutions: [
            ["&1*&2"],
            ["2*[_2*&1_]", "4*&1"],
            ["2*[_4*&1_]", "4*[_2*&1_]", "8*&1"],
            ["2*[_3*&1_]", "3*[_2*&1_]", "6*&1"],
            ["3*[_3*&1_]", "9*&1"],
            ["2*16", "4*8"],
            ["2*18", "4*9", "6*6"],
            ["2*24", "3*16", "4*12", "6*8"],
            ["2*27", "3*18", "6*9"],
            ["2*32", "4*16", "8*8"],
            ["2*36", "3*24", "4*18", "6*12", "8*9"],
            ["3*27", "9*9"]
          ],
          options: ["multiples"],
          format: "$e[2;9]*$e[2;9]",
          defaultDelay: 20,
          grade: CM1
        }
      ]
    },
    Diviser: {
      Quotient: [
        {
          description: "Calculer un quotient entier",
          subdescription: "Quotients associ\xE9s aux tables de multiplication",
          enounces: ["Calcule."],
          expressions: ["[_&1*&2_]:&2"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Calculer un quotient entier",
          subdescription: "Le dividende est un nombre de dizaines (simple)",
          enounces: ["Calcule."],
          expressions: ["[_&1*&2*10_]:&2"],
          variables: [{ "&1": "$e[3;6]", "&2": "$e[3;5]" }],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Calculer un quotient entier",
          subdescription: "Le dividende est un nombre de dizaines",
          enounces: ["Calcule."],
          expressions: ["[_&1*&2*10_]:&2"],
          variables: [{ "&1": "$e[3;9]", "&2": "$e[3;9]" }],
          defaultDelay: 20,
          grade: CM1
        }
      ],
      "A trou": [
        {
          description: "Compl\xE9ter une division \xE0 trou ",
          subdescription: "Trouver le dividende",
          enounces: ["Compl\xE8te."],
          expressions: ["?:&2=&1"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          solutions: [["[_&1*&2_]"]],
          type: "trou",
          defaultDelay: 20,
          grade: CE2
        },
        {
          description: "Compl\xE9ter une division \xE0 trou ",
          subdescription: "Trouver le diviseur",
          enounces: ["Compl\xE8te."],
          expressions: ["[_&1*&2_]:?=&1"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          solutions: [["&2"]],
          type: "trou",
          defaultDelay: 20,
          grade: CE2
        }
      ],
      Divisibilit\u00E9: [
        {
          description: "Trouver un diviseur",
          subdescription: "Une d\xE9composition est donn\xE9e",
          enounces: [
            "Trouve un diviseur de $$[_&1*&2_]$$ (autre que $$1$$ et $$[_&1*&2_]$$), sachant que :"
          ],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]\\{&1}" }],
          expressions: ["[_&1*&2_]=&1*&2"],
          testAnswers: [
            "&answer!=1 && &answer!=[_&1*&2_] && mod([_&1*&2_]; &answer)=0"
          ],
          type: "rewrite",
          correctionFormat: [
            {
              correct: ["&answer est un diviseur de $$[_&1*&2_]$$"],
              uncorrect: [
                '<span style="color:green;">$$&1$$</span> et <span style="color:green;">$$&2$$</span> sont des diviseurs de $$[_&1*&2_]$$'
              ]
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Trouver un diviseur",
          enounces: [
            "Trouve un diviseur de $$[_&1*&2_]$$ (autre que $$1$$ et $$[_&1*&2_]$$)."
          ],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]\\{&1}" }],
          testAnswers: [
            "&answer!=1 && &answer!=[_&1*&2_] && mod([_&1*&2_]; &answer)=0"
          ],
          type: "rewrite",
          correctionFormat: [
            {
              correct: ["&answer est un diviseur de $$[_&1*&2_]$$"],
              uncorrect: [
                '<span style="color:green;">$$&1$$</span> et <span style="color:green;">$$&2$$</span> sont des diviseurs de $$[_&1*&2_]$$'
              ]
            }
          ],
          defaultDelay: 15,
          grade: CE2
        },
        {
          description: "Utiliser un crit\xE8re de divisibilit\xE9",
          subdescription: "Par 2",
          enounces: ["Le nombre $$[_&1_]$$ est-il divisible par 2 ?"],
          variables: [{ "&1": "2*$e{3}" }, { "&1": "2*$e{3}+1" }],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          solutions: [["mod(&1;2)=0 ?? 0 :: 1"]],
          correctionFormat: [
            {
              correct: ["$$2$$ est un diviseur de $$[_&1_]$$ ? &answer"],
              answer: " &answer"
            }
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 10,
          grade: CM1
        },
        {
          description: "Utiliser un crit\xE8re de divisibilit\xE9",
          subdescription: "Par 5",
          enounces: ["Le nombre $$[_&1_]$$ est-il divisible par 5 ?"],
          variables: [{ "&1": "5*$e{3}" }, { "&1": "5*$e{5}+$e[1;4]" }],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          solutions: [["mod(&1;5)=0 ?? 0 :: 1"]],
          correctionFormat: [
            {
              correct: ["$$5$$ est un diviseur de $$[_&1_]$$ ? &answer"],
              answer: " &answer"
            }
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 10,
          grade: CM1
        },
        {
          description: "Utiliser un crit\xE8re de divisibilit\xE9",
          subdescription: "Par 10",
          enounces: ["Le nombre $$[_&1_]$$ est-il divisible par 10 ?"],
          variables: [{ "&1": "10*$e{3}" }, { "&1": "10*$e{5}+$e[1;9]" }],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          solutions: [["mod(&1;10)=0 ?? 0 :: 1"]],
          correctionFormat: [
            {
              correct: ["$$10$$ est un diviseur de $$[_&1_]$$ ? &answer"],
              answer: " &answer"
            }
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 30,
          grade: CM1
        },
        {
          description: "Utiliser un crit\xE8re de divisibilit\xE9",
          subdescription: "Par 3",
          enounces: ["Le nombre $$[_&1_]$$ est-il divisible par 3 ?"],
          variables: [
            { "&1": "3*$e[21;333]" },
            { "&1": "3*$e[21;332]+$e[1;2]" }
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          solutions: [["mod(&1;3)=0 ?? 0 :: 1"]],
          correctionFormat: [
            {
              correct: ["$$3$$ est un diviseur de $$[_&1_]$$ ? &answer"],
              answer: " &answer"
            }
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 15,
          grade: CM2
        },
        {
          description: "Utiliser un crit\xE8re de divisibilit\xE9",
          subdescription: "Par 9",
          enounces: ["Le nombre $$[_&1_]$$ est-il divisible par 3 ?"],
          variables: [
            { "&1": "9*$e[21;333]" },
            { "&1": "9*$e[21;110]+$e[1;8]" }
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          solutions: [["mod(&1;9)=0 ?? 0 :: 1"]],
          correctionFormat: [
            {
              correct: ["$$9$$ est un diviseur de $$[_&1_]$$ ? &answer"],
              answer: " &answer"
            }
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 15,
          grade: CM2
        }
      ],
      "Division euclidienne": [
        {
          description: "Reconna\xEEtre un quotient et un reste dans une division euclidienne ",
          enounces: [
            "En regardant l'\xE9galit\xE9 ci-dessous, quel est le <b>quotient</b> de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ ?",
            "En regardant l'\xE9galit\xE9 ci-dessous, quel est le <b>reste</b> de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ ?"
          ],
          enounces2: ["$$[_&1*&2+&3_]=(&1 \\times &2)+&3$$"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;10]\\{&1}",
              "&3": "$e[1;&1-1]\\{&2}"
            }
          ],
          solutions: [["&2"], ["&3"]],
          correctionFormat: [
            {
              correct: ["Le quotient est &answer."]
            },
            {
              correct: ["Le reste est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: `Le quotient est &solution car $$[_&1*&2+&3_]=(&1 \\times &sol) + &3$$`
              }
            ],
            [
              {
                text: `Le reste est &solution car $$[_&1*&2+&3_]=(&1 \\times &2) + &sol$$ et $$&3 \\le &1$$`
              }
            ]
          ],
          type: "rewrite",
          defaultDelay: 30,
          grade: CE2
        },
        {
          description: "Est-ce bien un reste de division eudlienne ? ",
          enounces: [
            "En regardant l'\xE9galit\xE9 ci-dessous, peut-on dire que $$&3$$ est le reste de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ ?",
            "En regardant l'\xE9galit\xE9 ci-dessous, peut-on dire que $$[_&3+&1_]$$ est le reste de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ ?"
          ],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[2;10]\\{&1}",
              "&3": "$e[1;&1-1]\\{&2}"
            }
          ],
          expressions: [
            "[_&1*&2+&3_]=(&1* &2) + &3",
            "[_&1*&2+&3_]=(&1* [_&2-1_]) + [_&3+&1_]"
          ],
          solutions: [[0], [1]],
          choices: [[{ text: "oui" }, { text: "non" }]],
          correctionDetails: [
            [
              {
                text: "&solution, $$&3$$ est le reste de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$, car dans l'\xE9galit\xE9 $$[_&1*&2+&3_]=(&1 \\times &2) + &3$$, on a bien $$&3<&1$$."
              }
            ],
            [
              {
                text: "&solution, $$[_&3+&1_]$$ n'est pas le reste de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$, car dans l'\xE9galit\xE9 $$[_&1*&2+&3_]=(&1 \\times [_&2-1_]) + [_&3+&1_]$$, on n'a <b>pas</b>  $$[_&3+&1_]<&1$$."
              }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 30,
          grade: CE2
        },
        {
          description: "Compl\xE9ter l'\xE9galit\xE9 d'une division euclidienne",
          enounces: [
            "Compl\xE8te l'\xE9galit\xE9 de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ :"
          ],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;10]", "&3": "$e[1;&1-1]" }
          ],
          answerFields: ["$$[_&1*&2+&3_]=(&1\\times ?) + ?$$"],
          solutions: [["&2", "&3"]],
          defaultDelay: 30,
          correctionFormat: [
            {
              correct: ["$$[_&1*&2+&3_]=(&1\\times &ans1) + &ans2$$"]
            }
          ],
          grade: CE2
        },
        {
          description: "Effectuer une division euclidienne ",
          enounces: [
            "Ecris l'\xE9galit\xE9 correspondant \xE0 la division euclidienne de $$[_&1*&2+&3_]$$ par $$&2$$."
          ],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;10]", "&3": "$e[1;&2-1]" }
          ],
          expressions: ["[_&1*&2+&3_]"],
          solutions: [["(&1*&2)+&3"]],
          options: ["no-penalty-for-extraneous-brackets"],
          type: "rewrite",
          defaultDelay: 30,
          grade: CE2
        }
      ]
    },
    "Priorit\xE9s op\xE9ratoires": {
      "Avec parenth\xE8ses": [
        {
          description: "Calculer une expression avec parenth\xE8ses",
          subdescription: "Un niveau de parenth\xE8se",
          enounces: ["Calcule."],
          expressions: [
            "(&1+&2)*&3",
            "&3*(&1+&2)",
            "(&1-&2)*&3",
            "&3*(&1-&2)",
            "([_&1*&3_]+[_&2*&3_]):&3",
            "([_&1*&3_]-[_&2*&3_]):&3",
            "[_(&1+&2)*&3_]:(&1+&2)",
            "[_&1+&2+&3_]-(&1+&2)"
          ],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;11-&1]", "&3": "$e[2;9]" },
            { "&1": "$e[2;9]", "&2": "$e[2;11-&1]", "&3": "$e[2;9]" },
            { "&1": "$e[4;9]", "&2": "$e[2;&1-2]", "&3": "$e[2;9]" },
            { "&1": "$e[4;9]", "&2": "$e[2;&1-2]", "&3": "$e[2;9]" },
            { "&1": "$e[1;9]", "&2": "$e[1;10-&1]", "&3": "$e[2;9]" },
            { "&1": "$e[3;9]", "&2": "$e[1;&1-2]", "&3": "$e[2;9]" },
            { "&1": "$e[1;8]", "&2": "$e[1;9-&1]", "&3": "$e[2;9]" },
            { "&1": "$e[1;9]", "&2": "$e[1;9]", "&3": "$e[1;9]" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\left( &1 \\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right) \\times &3  &=  [_&1+&2_] \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 \\times \\left( &1 \\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right) &=  &3 \\times [_&1+&2_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\left( &1 \\bold{\\textcolor{${color1}}{\\large{-}}} &2 \\right) \\times &3  &=  [_&1-&2_] \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 \\times \\left( &1 \\bold{\\textcolor{${color1}}{\\large{-}}} &2 \\right) &=  &3 \\times [_&1-&2_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\left( [_&1*&3_] \\bold{\\textcolor{${color1}}{\\large{+}}} [_&2*&3_] \\right) \\div &3  &=  [_(&1+&2)*&3_] \\div &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\left( [_&1*&3_] \\bold{\\textcolor{${color1}}{\\large{-}}} [_&2*&3_] \\right) \\div &3  &=  [_(&1-&2)*&3_] \\div &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  [_(&1+&2)*&3_] \\div \\left( &1 \\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right) &= [_(&1+&2)*&3_] \\div [_&1+&2_]   \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} [_&1+&2+&3_] - \\left( &1\\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right)  &= [_&1+&2+&3_] - [_&1+&2_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer une expression avec parenth\xE8ses",
          subdescription: "2 expressions parenth\xE8s\xE9es (imbriqu\xE9es ou non)",
          enounces: ["Calcule."],
          expressions: [
            "(&1+&2)*(&3+&4)",
            "(&1-&2)*(&3+&4)",
            "&4*(([_&1*&3_]+[_&2*&3_]):&3)"
          ],
          variables: [
            {
              "&1": "$e[2;7]",
              "&2": "$e[2;9-&1]",
              "&3": "$e[2;7]",
              "&4": "$e[2;9-&3]"
            },
            {
              "&1": "$e[4;9]",
              "&2": "$e[2;&1-2]",
              "&3": "$e[2;7]",
              "&4": "$e[2;9-&3]"
            },
            {
              "&1": "$e[2;7]",
              "&2": "$e[2;9-&1]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\left( &1 \\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right) \\times \\left( &3 \\bold{\\textcolor{${color1}}{\\large{+}}} &4 \\right) &=  [_&1+&2_] \\times [_&3+&4_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\left( &1 \\bold{\\textcolor{${color1}}{\\large{-}}} &2 \\right) \\times \\left( &3 \\bold{\\textcolor{${color1}}{\\large{+}}} &4 \\right) &=  [_&1-&2_] \\times [_&3+&4_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}   &4 \\times \\left( \\left([_&1*&3_] \\bold{\\textcolor{${color1}}{\\large{+}}} [_&2*&3_] \\right) \\div &3 \\right)  &= &4 \\times \\left( [_&1*&3+&2*&3_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &3 \\right)   \\\\ &=  &4 \\times [_&1+&2_]  \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Sans parenth\xE8ses": [
        {
          description: "Calculer une expression sans parenth\xE8ses",
          subdescription: "Priorit\xE9 de la multiplication et de la division sur l'addition et la soustraction",
          enounces: ["Calcule."],
          expressions: [
            "&1+&2*&3",
            "&2*&3+&1",
            "[_&1*&2+&3_]-&1*&2",
            "[_&2+&4_]-[_&2*&3_]:&3",
            "&1+[_&2*&3_]:&3",
            "[_&2*&3_]:&3+&1"
          ],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]" },
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]" },
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]" },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]"
            },
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]" },
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align}  &1 +  &2 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &3 &=  &1 +  [_&2*&3_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  &2 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &3 + &1 &=   [_&2*&3_] + &1 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  [_&1*&2+&3_] - &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 &=  [_&1*&2+&3_] - [_&1*&2_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  [_&2+&4_] - [_&2*&3_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &3 &=  [_&2+&4_] - &2 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  &1+ [_&2*&3_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &3 &=  &1 + &2 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}   [_&2*&3_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &3 + &1 &=  &2 + &1 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Calculer une expression sans parenth\xE8ses",
          subdescription: "M\xEAme priorit\xE9",
          enounces: ["Calcule."],
          expressions: ["[_&1*&2_]:&1*&3", "&3-&1+&2"],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]" },
            { "&1": "$e[2;8]", "&2": "$e[2;9]", "&3": "$e[&1+1;9]" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align}  [_&1*&2_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &1 \\times &3 &=  &2 \\times &3\\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  &3 \\bold{\\textcolor{${color1}}{\\large{-}}} &1 + &2  &=  [_&3-&1_] + &2 \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Calculer une expression sans parenth\xE8ses",
          subdescription: "Cas g\xE9n\xE9ral",
          enounces: ["Calcule."],
          expressions: [
            "&1*&2+&3*&4",
            "&1*&2+[_&3*&4_]:&4",
            "[_&3*&4_]:&4+&1*&2",
            "[_&3*&4_]:&4+[_&1*&2_]:&2",
            "[_&1+1_]*[_&2+1_]-&1*&2"
          ],
          variables: [
            {
              "&1": "$e[2;5]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]"
            },
            {
              "&1": "$e[2;5]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]"
            },
            {
              "&1": "$e[2;5]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align}  &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 + &3 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &4 &=  [_&1*&2_] + [_&3*&4_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 + [_&3*&4_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &4 &= [_&1*&2_]+&3\\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  [_&3*&4_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &4 + &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 &= &3+[_&1*&2_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  [_&3*&4_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &4 + [_&1*&2_]\\bold{\\textcolor{${color1}}{\\large{\\div}}} &2 &= &3+&1 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  [_&1+1_] \\bold{\\textcolor{${color1}}{\\large{\\times}}} [_&2+1_] - &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 &= [_(&1+1)*(&2+1)_]-[_&1*&2_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ]
    },
    Vocabulaire: {
      Traduire: [
        {
          description: "Traduire une phrase en expression math\xE9matique",
          enounces: [
            "Traduis cette phrase par une expression math\xE9matique : la somme de $$&1$$ et de $$&2$$",
            "Traduis cette phrase par une expression math\xE9matique : le produit de $$&1$$ par $$&2$$",
            "Traduis cette phrase par une expression math\xE9matique : la diff\xE9rence entre $$&1$$ et $$&2$$",
            "Traduis cette phrase par une expression math\xE9matique : le quotient de $$&1$$ par de $$&2$$"
          ],
          options: ["no-exp"],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[2;&1-1]\\{&1}"
            }
          ],
          expressions: ["&1+&2", "&1*&2", "&1-&2", "&1:&2"],
          solutions: [["&1+&2"], ["&1*&2"], ["&1-&2"], ["&1:&2 ;; &1/&2"]],
          correctionFormat: [
            {
              correct: ["La somme de $$&1$$ et de $$&2$$ s'\xE9crit &answer"],
              answer: "L'expression est &answer."
            },
            {
              correct: ["Le produit de $$&1$$ par $$&2$$ s'\xE9crit &answer"],
              answer: "L'expression est &answer."
            },
            {
              correct: ["La diff\xE9rence entre $$&1$$ et $$&2$$ s'\xE9crit &answer"],
              answer: "L'expression est &answer."
            },
            {
              correct: ["Le quotient de $$&1$$ par $$&2$$ s'\xE9crit &answer"],
              answer: "L'expression est &answer."
            }
          ],
          type: "enonce",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Traduire une phrase en expression math\xE9matique",
          enounces: [
            "Traduis cette phrase par une expression math\xE9matique : la somme du produit de $$&1$$ par $$&3$$ et de $$&2$$",
            "Traduis cette phrase par une expression math\xE9matique : le produit de $$&1$$ par la diff\xE9rence  entre $$&2$$ et $$&3$$",
            "Traduis cette phrase par une expression math\xE9matique : la diff\xE9rence entre $$&1$$ et le quotient de $$&2$$ par $$&3$$",
            "Traduis cette phrase par une expression math\xE9matique : le quotient de la somme $$&1$$ et de $$&3$$ par $$&2$$"
          ],
          options: ["no-exp"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{&1}",
              "&3": "$e[2;&2-1]\\{&1}"
            }
          ],
          expressions: ["&1*&3+&2", "&1*(&2-&3)", "&1-&2:&3", "(&1+&3):&2"],
          solutions: [
            ["&1*&3+&2"],
            ["&1*(&2-&3)"],
            ["&1-&2:&3"],
            ["(&1+&3):&2"]
          ],
          correctionFormat: [
            {
              correct: [
                "La somme du produit de $$&1$$ par $$&3$$ et de $$&2$$ s'\xE9crit &answer"
              ],
              answer: "L'expression est &answer."
            },
            {
              correct: [
                "Le produit de $$&1$$ par la diff\xE9rence  entre $$&2$$ et $$&3$$ s'\xE9crit &answer"
              ],
              answer: "L'expression est &answer."
            },
            {
              correct: [
                "La diff\xE9rence entre $$&1$$ et le quotient de $$&2$$ par $$&3$$ s'\xE9crit &answer"
              ],
              answer: "L'expression est &answer."
            },
            {
              correct: [
                "Le quotient de la somme $$&1$$ et de $$&3$$ par $$&2$$ s'\xE9crit &answer"
              ],
              answer: "L'expression est &answer."
            }
          ],
          type: "enonce",
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ]
    }
  },
  D\u00E9cimaux: {
    Apprivoiser: {
      Ecriture: [
        {
          description: "Conna\xEEtre la position d\xE9cimale",
          subdescription: "Des unit\xE9s jusqu'aux centi\xE8mes",
          enounces: [
            "Quel est le chiffre des <b>centi\xE8mes</b> dans le nombre $$[._&4_]$$ ?",
            "Quel est le chiffre des <b>dizi\xE8mes</b> dans le nombre $$[._&4_]$$ ?",
            "Quel est le chiffre des <b>unit\xE9s</b> dans le nombre $$[._&4_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]\\{&1}",
              "&3": "$e[0;9]\\{&1;&2}",
              "&4": "[._&1*0,01+&2*0,1+&3_]"
            }
          ],
          solutions: [["&1"], ["&2"], ["&3"]],
          correctionFormat: [
            {
              correct: [
                "Dans $$[._&4_]$$ le chiffre des centi\xE8mes est &answer."
              ],
              answer: "Le chiffre des centi\xE8mes est &answer."
            },
            {
              correct: [
                "Dans $$[._&4_]$$ le chiffre des dizi\xE8mes est &answer."
              ],
              answer: "Le chiffre des dizi\xE8mes est &answer."
            },
            {
              correct: ["Dans $$[._&4_]$$ le chiffre des unit\xE9s est &answer."],
              answer: "Le chiffre des unit\xE9s est &answer."
            }
          ],
          type: "rewrite",
          defaultDelay: 10,
          grade: CM1
        },
        {
          description: "Conna\xEEtre la position d\xE9cimale",
          subdescription: "Des centaines jusqu'aux centi\xE8mes",
          enounces: [
            "Quel est le chiffre des <b>centi\xE8mes</b> dans le nombre $$[._&6_]$$ ?",
            "Quel est le chiffre des <b>dizi\xE8mes</b> dans le nombre $$[._&6_]$$ ?",
            "Quel est le chiffre des <b>unit\xE9s</b> dans le nombre $$[._&6_]$$ ?",
            "Quel est le chiffre des <b>dizaines</b> dans le nombre $$[._&6_]$$ ?",
            "Quel est le chiffre des <b>centaines</b> dans le nombre $$[._&6_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]\\{&1}",
              "&3": "$e[0;9]\\{&1;&2}",
              "&4": "$e[0;9]\\{&1;&2;&3}",
              "&5": "$e[0;9]\\{&1;&2;&3;&4}",
              "&6": "[._&1*0,01+&2*0,1+&3+&4*10+&5*100_]"
            }
          ],
          solutions: [["&1"], ["&2"], ["&3"], ["&4"], ["&5"]],
          correctionFormat: [
            {
              correct: [
                "Dans $$[._&6_]$$ le chiffre des centi\xE8mes est &answer."
              ],
              answer: "Le chiffre des centi\xE8mes est &answer."
            },
            {
              correct: [
                "Dans $$[._&6_]$$ le chiffre des dizi\xE8mes est &answer."
              ],
              answer: "Le chiffre des dizi\xE8mes est &answer."
            },
            {
              correct: ["Dans $$[._&6_]$$ le chiffre des unit\xE9s est &answer."],
              answer: "Le chiffre des unit\xE9s est &answer."
            },
            {
              correct: [
                "Dans $$[._&6_]$$ le chiffre des dizaines est &answer."
              ],
              answer: "Le chiffre des dizaines est &answer."
            },
            {
              correct: [
                "Dans $$[._&6_]$$ le chiffre des centaines est &answer."
              ],
              answer: "Le chiffre des centaines est &answer."
            }
          ],
          type: "rewrite",
          defaultDelay: 10,
          grade: CM1
        },
        {
          description: "D\xE9finition \xE0 l'aide de fractions d\xE9cimales",
          subdescription: "Jusqu'au centi\xE8mes",
          enounces: [
            "Quel est le nombre d\xE9cimal repr\xE9sent\xE9 par cette expression ?"
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "0",
              "&3": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "0"
            }
          ],
          expressions: ["&1+&2/10+&3/100"],
          options: ["remove-null-terms"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "D\xE9finition \xE0 l'aide de fractions d\xE9cimales",
          subdescription: "Jusqu'au centi\xE8mes (m\xE9lang\xE9e)",
          enounces: [
            "Quel est le nombre d\xE9cimal repr\xE9sent\xE9 par cette expression ?"
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "0",
              "&3": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "0"
            }
          ],
          expressions: ["&1+&2/10+&3/100"],
          options: ["remove-null-terms", "shuffle-terms"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "D\xE9finition \xE0 l'aide de fractions d\xE9cimales (2)",
          subdescription: "Jusqu'au centi\xE8mes",
          enounces: [
            "Quel est le nombre d\xE9cimal repr\xE9sent\xE9 par cette expression ?"
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e[1;2]",
              "&3": "$e{&2;&2}",
              "&4": "&1+&3/100"
            }
          ],
          expressions: ["&4"],
          "result-type": "decimal",
          defaultDelay: 10,
          grade: CM1
        },
        {
          description: "Conna\xEEtre la position d\xE9cimale",
          subdescription: "Des unit\xE9s jusqu'aux milli\xE8mes",
          enounces: [
            "Quel est le chiffre des <b>milli\xE8mes</b> dans le nombre $$[._&5_]$$ ?",
            "Quel est le chiffre des <b>centi\xE8mes</b> dans le nombre $$[._&5_]$$ ?",
            "Quel est le chiffre des <b>dizi\xE8mes</b> dans le nombre $$[._&5_]$$ ?",
            "Quel est le chiffre des <b>unit\xE9s</b> dans le nombre $$[._&5_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]\\{&1}",
              "&3": "$e[0;9]\\{&1;&2}",
              "&4": "$e[0;9]\\{&1;&2;&3}",
              "&5": "[._&1*0,001+&2*0,01+&3*0,1+&4_]"
            }
          ],
          solutions: [["&1"], ["&2"], ["&3"], ["&4"]],
          correctionFormat: [
            {
              correct: [
                "Dans $$[._&5_]$$ le chiffre des milli\xE8mes est &answer."
              ],
              answer: "Le chiffre des milli\xE8mes est &answer."
            },
            {
              correct: [
                "Dans $$[._&5_]$$ le chiffre des centi\xE8mes est &answer."
              ],
              answer: "Le chiffre des centi\xE8mes est &answer."
            },
            {
              correct: [
                "Dans $$[._&5_]$$ le chiffre des dizi\xE8mes est &answer."
              ],
              answer: "Le chiffre des dizi\xE8mes est &answer."
            },
            {
              correct: ["Dans $$[._&5_]$$ le chiffre des unit\xE9s est &answer."],
              answer: "Le chiffre des unit\xE9s est &answer."
            }
          ],
          type: "rewrite",
          defaultDelay: 10,
          grade: CM2
        },
        {
          description: "Conna\xEEtre la position d\xE9cimale",
          subdescription: "Des milliers jusqu'aux milli\xE8mes",
          enounces: [
            "Quel est le chiffre des <b>milli\xE8mes</b> dans le nombre $$[._&8_]$$ ?",
            "Quel est le chiffre des <b>centi\xE8mes</b> dans le nombre $$[._&8_]$$ ?",
            "Quel est le chiffre des <b>dizi\xE8mes</b> dans le nombre $$[._&8_]$$ ?",
            "Quel est le chiffre des <b>unit\xE9s</b> dans le nombre $$[._&8_]$$ ?",
            "Quel est le chiffre des <b>dizaines</b> dans le nombre $$[._&8_]$$ ?",
            "Quel est le chiffre des <b>centaines</b> dans le nombre $$[._&8_]$$ ?",
            "Quel est le chiffre des <b>milliers</b> dans le nombre $$[._&8_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[0;9]\\{&1}",
              "&3": "$e[0;9]\\{&1;&2}",
              "&4": "$e[0;9]\\{&1;&2;&3}",
              "&5": "$e[0;9]\\{&1;&2;&3;&4}",
              "&6": "$e[0;9]\\{&1;&2;&3;&4;&5}",
              "&7": "$e[0;9]\\{&1;&2;&3;&4;&5;&6}",
              "&8": "[._&1*0,001+&2*0,01+&3*0,1+&4+&5*10+&6*100+&7*1000_]"
            }
          ],
          solutions: [["&1"], ["&2"], ["&3"], ["&4"], ["&5"], ["&6"], ["&7"]],
          correctionFormat: [
            {
              correct: [
                "Dans $$[._&8_]$$ le chiffre des milli\xE8mes est &answer."
              ],
              answer: "Le chiffre des milli\xE8mes est &answer."
            },
            {
              correct: [
                "Dans $$[._&8_]$$ le chiffre des centi\xE8mes est &answer."
              ],
              answer: "Le chiffre des centi\xE8mes est &answer."
            },
            {
              correct: [
                "Dans $$[._&8_]$$ le chiffre des dizi\xE8mes est &answer."
              ],
              answer: "Le chiffre des dizi\xE8mes est &answer."
            },
            {
              correct: ["Dans $$[._&8_]$$ le chiffre des unit\xE9s est &answer."],
              answer: "Le chiffre des unit\xE9s est &answer."
            },
            {
              correct: [
                "Dans $$[._&8_]$$ le chiffre des dizaines est &answer."
              ],
              answer: "Le chiffre des dizaines est &answer."
            },
            {
              correct: [
                "Dans $$[._&8_]$$ le chiffre des centaines est &answer."
              ],
              answer: "Le chiffre des centaines est &answer."
            },
            {
              correct: [
                "Dans $$[._&8_]$$ le chiffre des milliers est &answer."
              ],
              answer: "Le chiffre des milliers est &answer."
            }
          ],
          type: "rewrite",
          defaultDelay: 10,
          grade: CM2
        },
        {
          description: "D\xE9finition \xE0 l'aide de fractions d\xE9cimales",
          subdescription: "Jusqu'aux milli\xE8mes",
          enounces: [
            "Quel est le nombre d\xE9cimal repr\xE9sent\xE9 par cette expression ?"
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "$e{1;1}",
              "&4": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "0",
              "&3": "$e{1;1}",
              "&4": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "0",
              "&4": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "0",
              "&3": "0",
              "&4": "$e{1;1}"
            }
          ],
          expressions: ["&1+&2/10+&3/100+&4/1000"],
          options: ["remove-null-terms"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "D\xE9finition \xE0 l'aide de fractions d\xE9cimales",
          subdescription: "Jusqu'aux milli\xE8mes (m\xE9lang\xE9e)",
          enounces: [
            "Quel est le nombre d\xE9cimal repr\xE9sent\xE9 par cette expression ?"
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "$e{1;1}",
              "&4": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "0",
              "&3": "$e{1;1}",
              "&4": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "0",
              "&4": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "0",
              "&3": "0",
              "&4": "$e{1;1}"
            }
          ],
          expressions: ["&1+&2/10+&3/100+&4/1000"],
          options: ["remove-null-terms", "shuffle-terms"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "D\xE9finition \xE0 l'aide de fractions d\xE9cimales (2)",
          subdescription: "Jusqu'aux milli\xE8mes",
          enounces: [
            "Quel est le nombre d\xE9cimal repr\xE9sent\xE9 par cette expression ?"
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e[1;3]",
              "&3": "$e{&2;&2}",
              "&4": "&1+&3/1000"
            }
          ],
          expressions: ["&4"],
          "result-type": "decimal",
          defaultDelay: 10,
          grade: CM2
        }
      ],
      D\u00E9composition: [
        {
          description: "D\xE9composer en unit\xE9s, dixi\xE8mes, centi\xE8mes",
          subdescription: "avec d\xE9cimaux",
          enounces: ["D\xE9compose comme dans cet exemple : $$5,34=5+0,3+0,04$$."],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "$e{1;1}"
            }
          ],
          expressions: ["[._&1+&2/10+&3/100_]"],
          solutions: [["&1+[._&2*0,1_]+[._&3*0,01_]"]],
          options: ["no-penalty-for-null-terms"],
          defaultDelay: 25,
          grade: CM1
        },
        {
          description: "D\xE9composer en unit\xE9s, dixi\xE8mes, centi\xE8mes",
          subdescription: "avec fractions d\xE9cimales",
          enounces: [
            "D\xE9composer comme dans cet exemple : $$5,34=5+\\dfrac{3}{10}+\\dfrac{4}{100}$$."
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "0",
              "&3": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "0"
            }
          ],
          expressions: ["[._&1+&2/10+&3/100_]"],
          solutions: [["&1+&2/10+&3/100"]],
          options: [
            "no-penalty-for-null-terms",
            "no-penalty-for-extraneous-brackets",
            "no-penalty-for-factor-zero",
            "no-penalty-for-factor-one"
          ],
          defaultDelay: 25,
          grade: CM1
        },
        {
          description: "D\xE9composer en unit\xE9s, dixi\xE8mes, centi\xE8mes, milli\xE8mes",
          subdescription: "avec d\xE9cimaux",
          enounces: [
            "D\xE9compose comme dans cet exemple : $$5,346=5+0,3+0,04+0,006$$."
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "$e{1;1}",
              "&4": "$e{1;1}"
            }
          ],
          expressions: ["[._&1+&2/10+&3/100+&4/1000_]"],
          solutions: [["&1+[._&2*0,1_]+[._&3*0,01_]+[._&4*0,001_]"]],
          options: ["no-penalty-for-null-terms"],
          defaultDelay: 30,
          grade: CM2
        },
        {
          description: "D\xE9composer en unit\xE9s, dixi\xE8mes, centi\xE8mes, milli\xE8mes",
          subdescription: "avec des fractions d\xE9cimales",
          enounces: [
            "D\xE9composer comme dans cet exemple : $$5,346=5+\\dfrac{3}{10}+\\dfrac{4}{100}+\\dfrac{6}{1000}$$."
          ],
          variables: [
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "$e{1;1}",
              "&4": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "0",
              "&3": "$e{1;1}",
              "&4": "$e{1;1}"
            },
            {
              "&1": "$e{1;1}",
              "&2": "$e{1;1}",
              "&3": "0",
              "&4": "$e{1;1}"
            }
          ],
          expressions: ["[._&1+&2/10+&3/100+&4/1000_]"],
          solutions: [["&1+&2/10+&3/100+&4/1000"]],
          options: [
            "no-penalty-for-null-terms",
            "no-penalty-for-extraneous-brackets",
            "no-penalty-for-factor-zero",
            "no-penalty-for-factor-one"
          ],
          defaultDelay: 30,
          grade: CM2
        }
      ],
      "Forme fractionnaire": [
        {
          description: "D\xE9terminer une forme fractionnaire",
          enounces: ["R\xE9\xE9cris ce nombre d\xE9cimal sous forme fractionnaire."],
          expressions: ["[._&2/&1_]"],
          variables: [{ "&1": "$l{2;4;5;10}", "&2": "$e[1;&1-1]" }],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      Comparer: [
        {
          description: "Trouver le plus petit entier sup\xE9rieur",
          enounces: ["Quel est le plus petit entier sup\xE9rieur \xE0 $$[._&3_]$$ ?"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "&1+&2*0,1"
            }
          ],
          solutions: [["[_&1+1_]"]],
          correctionFormat: [
            {
              correct: [
                "Le plus petit entier sup\xE9rieur \xE0 $$[._&3_]$$ est &answer"
              ],
              answer: "Le plus petit entier est &answer"
            }
          ],
          type: "rewrite",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Comparer deux nombres entiers",
          enounces: ["Quel est le plus petit de ces 2 nombres ?"],
          variables: [
            {
              "&1": "$e[1;2]",
              "&2": "$e[1;2]",
              "&3": "$e{&1;&1}",
              "&4": "$e{&2;&2}",
              "&5": "$e{&2;&2}",
              "&7": "[._(&4+&3*10^&2)/10^&2_]",
              "&8": "[._(&5+&3*10^&2)/10^&2_]"
            },
            {
              "&1": "$e[1;2]",
              "&2": "$e{&1;&1}",
              "&3": "$e{1;1}",
              "&4": "$e{2;2}",
              "&7": "[._(&3+&2*10)/10_]",
              "&8": "[._(&4+&2*100)/100_]"
            }
          ],
          conditions: ["&7!=&8"],
          choices: [[{ text: "$$[._&7_]$$" }, { text: "$$[._&8_]$$" }]],
          correctionFormat: [
            {
              correct: [
                "Entre $$[._&7_]$$ et $$[._&8_]$$ le plus petit est &answer"
              ],
              answer: "Le plus petit est &answer"
            }
          ],
          solutions: [["&7<&8 ?? 0 :: 1"]],
          defaultDelay: 20,
          grade: CM1
        }
      ],
      Encadrer: [
        {
          description: "Encadrer un nombre d\xE9cimal par deux entiers cons\xE9cutifs",
          enounces: ["Encadre ce nombre d\xE9cimal par deux entiers cons\xE9cutifs."],
          expressions: ["?<[._&3_]<?"],
          variables: [
            {
              "&1": "$e[0;9]",
              "&2": "$e[1;9]",
              "&3": "&1+&2*0,1"
            }
          ],
          solutions: [["&1", "[_&1+1_]"]],
          correctionFormat: [
            {
              correct: ["$$&ans1<[._&3_]<&ans2$$"],
              answer: "$$&ans1<[._&3_]<&ans2$$"
            }
          ],
          type: "rewrite",
          defaultDelay: 20,
          grade: CM1
        }
      ]
    },
    Additionner: {
      Somme: [
        {
          description: "Calculer une somme ",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (pas de retenue)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[1;8]",
              "&3": "&1.&2",
              "&4": "$e[1;9-&1]",
              "&5": "$e[1;9-&2]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+&6"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Calculer une somme ",
          subdescription: "Parties d\xE9cimales \xE0 1 et 2 chiffres (pas de retenue)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[1;8]",
              "&3": "&1.&2",
              "&4": "$e[1;9-&1]",
              "&5": "$e[1;9-&2]",
              "&6": "$e[1;9-&2]",
              "&7": "&4.&5&6"
            }
          ],
          expressions: ["&3+&7", "&7+&3"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Calculer une somme ",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (avec retenue pour la partie decimale)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;7]",
              "&2": "$e[2;9]",
              "&3": "&1.&2",
              "&4": "$e[1;8-&1]",
              "&5": "$e[10-&2;9]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+&6"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Calculer une somme ",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (avec retenues)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "&1.&2",
              "&4": "$e[10-&1;9]",
              "&5": "$e[10-&2;9]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+&6"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        }
      ],
      "A trou": [
        {
          description: "Trouver le compl\xE9ment ",
          subdescription: "A l'entier sup\xE9rieur",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$d{0;$e[1;2]}"
            }
          ],
          expressions: ["?+[._&1-&2_]=&1", "[._&1-&2_]+?=&1"],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou ",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (pas de retenue)",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[1;8]",
              "&3": "&1.&2",
              "&4": "$e[1;9-&1]",
              "&5": "$e[1;9-&2]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+?=[._&3+&6_]", "?+&3=[._&3+&6_]"],
          type: "trou",
          solutions: [["&6"]],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Parties d\xE9cimales \xE0 1 et 2 chiffres (pas de retenue)",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[1;8]",
              "&3": "&1.&2",
              "&4": "$e[1;9-&1]",
              "&5": "$e[1;9-&2]",
              "&6": "$e[1;9-&2]",
              "&7": "&4.&5&6"
            }
          ],
          expressions: ["&3+?=[._&7+&3_]", "?+&3=[._&7+&3_]"],
          solutions: [["&7"]],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (avec retenue pour la partie decimale)",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;7]",
              "&2": "$e[2;9]",
              "&3": "&1.&2",
              "&4": "$e[1;8-&1]",
              "&5": "$e[10-&2;9]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+?=[._&6+&3_]", "?+&3=[._&6+&3_]"],
          type: "trou",
          solutions: [["&6"]],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (avec retenues)",
          enounces: ["Compl\xE8te"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "&1.&2",
              "&4": "$e[10-&1;9]",
              "&5": "$e[10-&2;9]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+?=[._&6+&3_]", "?+&3=[._&6+&3_]"],
          solutions: [["&6"]],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        }
      ],
      "Somme astucieuse": [
        {
          description: "Additionner par regroupements",
          subdescription: "Regrouper pour obtenir un nombre entier. 3 nombres \xE0 une d\xE9cimale.",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&5+&8+&6", "&8+&5+&6"],
          variables: [
            {
              "&1": "$e{1}",
              "&2": "10-&1",
              "&3": "$e[0;9]",
              "&4": "$e[0;9-&3]",
              "&5": "[._&3+&1/10_]",
              "&6": "[._&4+(&2)/10_]",
              "&7": "$e{1}+($e[1;9]\\{&1;[_&2_]})/10",
              "&8": "[._&7_]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} [._&8_] +\\bold{\\textcolor{${color1}}{[._&5_]}} + \\bold{\\textcolor{${color1}}{[._&6_]}} &= [._&8_] + \\bold{\\textcolor{${color1}}{[._&5+&6_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._&5_]}}+ [._&8_] + \\bold{\\textcolor{${color1}}{[._&6_]}} &= [._&8_] + \\bold{\\textcolor{${color1}}{[._&5+&6_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Additionner par regroupements",
          subdescription: "Regrouper pour obtenir un nombre entier. 4 nombres \xE0 une d\xE9cimale.",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: [
            "[._&3_]+[._&4_]+[._&5_]+[._&6_]",
            "[._&3_]+[._&5_]+[._&4_]+[._&6_]",
            "[._&3_]+[._&5_]+[._&6_]+[._&4_]"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1;10-&1}",
              "&3": "$e[1;9]+&1*0,1",
              "&4": "$e[1;9]+(10-&1)*0,1",
              "&5": "$e[1;9]+&2*0,1",
              "&6": "$e[1;9]+(10-&2)*0,1"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{[._&3_]}} + \\bold{\\textcolor{${color1}}{[._&4_]}} + \\bold{\\textcolor{${color2}}{[._&5_]}} + \\bold{\\textcolor{${color2}}{[._&6_]}}               &=  \\bold{\\textcolor{${color1}}{[._&3+&4_]}} + \\bold{\\textcolor{${color2}}{[._&5+&6_]}} \\\\               &=  &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{[._&3_]}} + \\bold{\\textcolor{${color2}}{[._&5_]}} + \\bold{\\textcolor{${color1}}{[._&4_]}} + \\bold{\\textcolor{${color2}}{[._&6_]}}               &=  \\bold{\\textcolor{${color1}}{[._&3+&4_]}} + \\bold{\\textcolor{${color2}}{[._&5+&6_]}} \\\\               &=  &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{[._&3_]}} + \\bold{\\textcolor{${color2}}{[._&5_]}} + \\bold{\\textcolor{${color2}}{[._&6_]}} + \\bold{\\textcolor{${color1}}{[._&4_]}}               &=  \\bold{\\textcolor{${color1}}{[._&3+&4_]}} + \\bold{\\textcolor{${color2}}{[._&5+&6_]}} \\\\               &=  &sol                \\end{align}$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        }
      ],
      Moiti\u00E9: [
        {
          description: "Trouver la moiti\xE9",
          subdescription: "Nombres de 1 \xE0 20",
          enounces: ["Quel est la moiti\xE9 du nombre $$[._&1_]$$ ?"],
          expressions: ["&2"],
          options: ["no-exp"],
          variables: [
            {
              "&1": "$e[0;14]*2+1",
              "&2": "[._(&1)/2_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["La moiti\xE9 de $$[._&1_]$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La moiti\xE9 de $$[._&1_]$$ est &solution car $$2 \\times &sol = [_&1_]$$"
              }
            ]
          ],
          type: "rewrite",
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        }
      ]
    },
    Soustraire: {
      Diff\u00E9rence: [
        {
          description: "Calculer une diff\xE9rence ",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (pas de retenue)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[2;8]",
              "&2": "$e[2;8]",
              "&3": "&1.&2",
              "&4": "$e[1;&1-1]",
              "&5": "$e[1;&2-1]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3-&6"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Calculer une diff\xE9rence ",
          subdescription: "Partie enti\xE8re \xE0 2 chiffres et partie enti\xE8re \xE0 1 (retenue sur la partie enti\xE8re)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[2;9]",
              "&3": "1&1.&2",
              "&4": "$e[&1+1;9]",
              "&5": "$e[1;&2-1]",
              "&7": "&4.&5"
            }
          ],
          expressions: ["&3-&7"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Calculer une diff\xE9rence ",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (avec retenue)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[0;8]",
              "&3": "&1.&2",
              "&4": "$e[1;&1-1]",
              "&5": "$e[&2+1;9]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3-&6"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Calculer une somme ",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (avec retenues)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "&1.&2",
              "&4": "$e[10-&1;9]",
              "&5": "$e[10-&2;9]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+&6"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        }
      ],
      "A trou": [
        {
          description: "Trouver le compl\xE9ment ",
          subdescription: "A l'entier sup\xE9rieur",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$d{0;$e[1;2]}"
            }
          ],
          expressions: ["?+[._&1-&2_]=&1", "[._&1-&2_]+?=&1"],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou ",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (pas de retenue)",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[1;8]",
              "&3": "&1.&2",
              "&4": "$e[1;9-&1]",
              "&5": "$e[1;9-&2]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+?=[._&3+&6_]", "?+&3=[._&3+&6_]"],
          type: "trou",
          solutions: [["&6"]],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Parties d\xE9cimales \xE0 1 et 2 chiffres (pas de retenue)",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[1;8]",
              "&3": "&1.&2",
              "&4": "$e[1;9-&1]",
              "&5": "$e[1;9-&2]",
              "&6": "$e[1;9-&2]",
              "&7": "&4.&5&6"
            }
          ],
          expressions: ["&3+?=[._&7+&3_]", "?+&3=[._&7+&3_]"],
          solutions: [["&7"]],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (avec retenue pour la partie decimale)",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;7]",
              "&2": "$e[2;9]",
              "&3": "&1.&2",
              "&4": "$e[1;8-&1]",
              "&5": "$e[10-&2;9]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+?=[._&6+&3_]", "?+&3=[._&6+&3_]"],
          type: "trou",
          solutions: [["&6"]],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une addition \xE0 trou",
          subdescription: "Partie enti\xE8re et partie d\xE9cimale \xE0 1 chiffre (avec retenues)",
          enounces: ["Compl\xE8te"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "&1.&2",
              "&4": "$e[10-&1;9]",
              "&5": "$e[10-&2;9]",
              "&6": "&4.&5"
            }
          ],
          expressions: ["&3+?=[._&6+&3_]", "?+&3=[._&6+&3_]"],
          solutions: [["&6"]],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        }
      ],
      "Somme astucieuse": [
        {
          description: "Additionner par regroupements",
          subdescription: "Regrouper pour obtenir un nombre entier. 2 nombres \xE0 une d\xE9cimale.",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: ["&5+&8+&6", "&8+&5+&6"],
          variables: [
            {
              "&1": "$e{1}",
              "&2": "10-&1",
              "&3": "$e[0;9]",
              "&4": "$e[0;9-&3]",
              "&5": "[._&3+&1/10_]",
              "&6": "[._&4+(&2)/10_]",
              "&7": "$e{1}+($e[1;9]\\{&1;[_&2_]})/10",
              "&8": "[._&7_]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} [._&8_] +\\bold{\\textcolor{${color1}}{[._&5_]}} + \\bold{\\textcolor{${color1}}{[._&6_]}} &= [._&8_] + \\bold{\\textcolor{${color1}}{[._&5+&6_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._&5_]}}+ [._&8_] + \\bold{\\textcolor{${color1}}{[._&6_]}} &= [._&8_] + \\bold{\\textcolor{${color1}}{[._&5+&6_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        }
      ],
      Moiti\u00E9: [
        {
          description: "Trouver la moiti\xE9",
          subdescription: "Nombres de 1 \xE0 20",
          enounces: ["Quel est la moiti\xE9 du nombre $$[._&1_]$$ ?"],
          expressions: ["&2"],
          options: ["no-exp"],
          variables: [
            {
              "&1": "$e[0;14]*2+1",
              "&2": "[._(&1)/2_]"
            }
          ],
          correctionFormat: [
            {
              correct: ["La moiti\xE9 de $$[._&1_]$$ est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le moiti\xE9 de $$[._&1_]$$ est &solution car $$2 \\times &sol = [_&1_]$$"
              }
            ]
          ],
          type: "rewrite",
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        }
      ]
    },
    Multiplier: {
      Produit: [
        {
          description: "Calculer un produit",
          subdescription: "Un entier par un d\xE9cimal inf\xE9rieur \xE0 1",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "0.&2"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "0.0&2"
            }
          ],
          expressions: ["&1*&3"],
          conditions: ["mod(&1*&2;10)!=0"],
          correctionDetails: [
            [
              {
                text: `$$&1\\times &2=[_&1*&2_]$$ donc $$&1\\times 0,\\textcolor{${color1}}{&2}=&sol$$ ($$\\textcolor{${color1}}{1\\text{ d\xE9cimale}} $$).`
              }
            ],
            [
              {
                text: `$$&1\\times &2=[_&1*&2_]$$ donc $$&1\\times 0,\\textcolor{${color1}}{0&2}=&sol$$ ($$\\textcolor{${color1}}{2\\text{ d\xE9cimales}} $$).`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Placer la virgule dans le produit",
          enounces: [
            "La virgule a \xE9t\xE9 oubli\xE9e dans le produit. R\xE9\xE9cris le produit en rajoutant la virgule."
          ],
          variables: [
            {
              "&1": "$e[2;4]",
              "&2": "$e[2;4]",
              "&3": "$e{&1;&1}\\{m10}",
              "&4": "$e{&2;&2}\\{m10}"
            }
          ],
          expressions: ["[._&3:10^(&1-1)_]*[._&4:10^(&2-1)_]=[_&3*&4_]"],
          conditions: ["mod(&3*&4;10)!=0"],
          solutions: [["[._&3*&4:10^(&1+&2-2)_]"]],
          correctionDetails: [
            [
              {
                text: `Il y a $$\\textcolor{${color1}}{[_&1-1_]\\text{ d\xE9cimale(s)}}$$ dans $$[._&3:10^(&1-1)_]$$  et $$\\textcolor{${color1}}{[_&2-1_]\\text{  d\xE9cimale(s)}}$$ dans $$[._&4:10^(&2-1)_]$$, donc il y a en tout $$\\textcolor{${color1}}{[_&1+&2-2_] \\text{ d\xE9cimales}}$$  dans &solution.`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer un produit",
          subdescription: "Multiplier deux nombres d\xE9cimaux inf\xE9rieurs \xE0 1",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;2]",
              "&3": "$e[2;9]",
              "&4": "$e[1;2]"
            }
          ],
          conditions: ["mod(&1*&3;10)!=0"],
          expressions: ["[._&1*10^(-&2)_]*[._&3*10^(-&4)_]"],
          correctionDetails: [
            [
              {
                text: `$$&1\\times &3=[_&1*&3_]$$ donc $$[._&1*10^(-&2)_] \\times [._&3*10^(-&4)_]=&sol$$ ($$\\textcolor{${color1}}{&2+&4=[_&2+&4_]\\text{ d\xE9cimales}} $$).`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer un produit",
          subdescription: "Un des facteurs est un entier",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$d{1;1}"
            }
          ],
          expressions: ["&1*&2", "&2*&1"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Calculer un produit",
          subdescription: "Determiner un produit \xE0 partir d'un autre",
          enounces: [
            "Sachant que $$[._&1_] \\times [._&2_]=[._&1*&2_]$$ combien vaut $$[._&1*&3_] \\times [._&2_]$$ ?",
            "Sachant que $$[._&2_] \\times [._&1_]=[._&1*&2_]$$ combien vaut $$[._&2_] \\times [._&1*&3_]$$ ?"
          ],
          variables: [
            {
              "&1": "$d{$e[1;2];$e[0;2]}",
              "&2": "$d{2;1}",
              "&3": "$l{10;100;1000}"
            }
          ],
          options: ["no-exp"],
          expressions: ["[._&1*&3_]* &2", "&2*[._&1*&3_]"],
          correctionDetails: [
            [
              {
                text: `$$[._&1*&3_]$$ est $$\\textcolor{${color1}}{[_&3_]\\text{ fois}}$$ plus grand que $$[._&1_]$$, donc le r\xE9sultat de $$[._&1*&3_] \\times [._&2_]$$ est  $$\\textcolor{${color1}}{[_&3_]\\text{ fois}}$$ plus grand que celui de $$[._&1_]\\times[._&2_]$$, c'est-\xE0-dire $$\\textcolor{${color1}}{[_&3_]\\times} [._&1*&2_] = &sol$$`
              }
            ],
            [
              {
                text: `$$[._&1*&3_]$$ est $$\\textcolor{${color1}}{[_&3_]\\text{ fois}}$$ plus grand que $$[._&1_]$$, donc le r\xE9sultat de $$[._&2_] \\times [._&1*&3_] $$ est  $$\\textcolor{${color1}}{[_&3_]\\text{ fois}}$$ plus grand que celui de $$[._&2_] \\times [._&1_]$$, c'est-\xE0-dire $$\\textcolor{${color1}}{[_&3_]\\times} [._&1*&2_] = &sol$$`
              }
            ]
          ],
          solutions: [["[._&1*&3*&2_]"]],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Produit particulier": [
        {
          description: "Multiplier par 0,5",
          subdescription: "Un entier",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;20]"
            }
          ],
          expressions: ["&1*0,5", "0,5*&1"],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} &1 \\times 0,5 &= &1 \\div 2 \\\\ &=  &sol \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} 0,5 \\times &1 &= &1 \\div 2 \\\\ &=  &sol \\end{align}$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Multiplier par 0,5",
          subdescription: "Un nombre d\xE9cimal",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$l{2;4;6;8}",
              "&2": "$e{1}",
              "&3": "[._&1+&2/10_]"
            }
          ],
          expressions: ["&3*0,5", "0,5*&3"],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} [._&3_] \\times 0,5 &= [._&3_] \\div 2 \\\\ &=  &sol \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} 0,5 \\times [._&3_] &= [._&3_] \\div 2 \\\\ &=  &sol \\end{align}$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Multiplier par 1,5",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[2;20]"
            }
          ],
          expressions: ["&1*1,5", "1,5*&1"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}} \\times 1,5 &= \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\times 0,5 \\\\ &= &1 + [._0,5*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} 1,5 \\times \\bold{\\textcolor{${color1}}{&1}} &= \\bold{\\textcolor{${color1}}{&1}} + 0,5 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= &1 + [._0,5*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Multiplier par 2,5",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[2;20]"
            }
          ],
          expressions: ["&1*2,5", "2,5*&1"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}} \\times 2,5 &= \\bold{\\textcolor{${color1}}{&1}} \\times 2 + \\bold{\\textcolor{${color1}}{&1}} \\times 0,5 \\\\ &= [_&1*2_] + [._0,5*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} 2,5 \\times \\bold{\\textcolor{${color1}}{&1}} &= 2 \\times \\bold{\\textcolor{${color1}}{&1}} + 0,5 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_&1*2_] + [._0,5*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Puissances de 10": [
        {
          description: "Calculer un produit",
          subdescription: "Multiplier par 10",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$d{$e[0;2];$e[0;2]}"
            }
          ],
          expressions: ["&1*10"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Calculer un produit",
          subdescription: "Multiplier par 100",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$d{$e[0;2];$e[0;2]}"
            }
          ],
          expressions: ["&1*100"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Calculer un produit",
          subdescription: "Multiplier par 1000",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$d{$e[0;2];$e[0;2]}"
            }
          ],
          expressions: ["&1*1000"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Calculer un produit",
          subdescription: "Multiplier par 10, 100 ou 1000",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;3]",
              "&2": "$d{$e[0;4-&1];$e[0;4]}"
            }
          ],
          expressions: ["[_10^&1_]*&2", "&2*[_10^&1_]"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Multiplier par 0,1",
          subdescription: "Nombre entier",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;3]",
              "&2": "$e{&1;&1}"
            }
          ],
          expressions: ["&2*0,1", "0,1*&2"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &1 \\bold{\\textcolor{${color1}}{\\times 0,1}} &= &1 \\bold{\\textcolor{${color1}}{\\div 10}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{0,1 \\times}} &1 &= &1 \\bold{\\textcolor{${color1}}{\\div 10}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Multiplier par 0,1",
          subdescription: "Nombre d\xE9cimal",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[0;3]",
              "&2": "$e[1;2]",
              "&3": "$d{&1;&2}"
            }
          ],
          expressions: ["&3*0,1", "0,1*&3"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} [._&3_] \\bold{\\textcolor{${color1}}{\\times 0,1}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 10}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{0,1 \\times}} [._&3_] &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 10}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Multiplier par 0,01",
          subdescription: "Nombre entier ou d\xE9cimal",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[0;3]",
              "&2": "$e[0;2]",
              "&3": "$d{&1;&2}"
            }
          ],
          expressions: ["&3*0,01", "0,01*&3"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} [._&3_] \\bold{\\textcolor{${color1}}{\\times 0,01}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 100}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{0,01 \\times}} [._&3_] &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 100}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Multiplier par 0,001",
          subdescription: "Nombre entier ou d\xE9cimal",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[0;3]",
              "&2": "$e[0;1]",
              "&3": "$d{&1;&2}"
            }
          ],
          expressions: ["&3*0,001", "0,001*&3"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} [._&3_] \\bold{\\textcolor{${color1}}{\\times 0,001}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 1000}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} 0,001 \\bold{\\textcolor{${color1}}{\\times [._&3_]}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 1000}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Calculer un produit",
          subdescription: "Multiplier par 0,1 ; 0,01 ou 0,001",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;3]",
              "&2": "$d{$e[1;3];$e[0;4-&1]}"
            }
          ],
          expressions: ["[._10^(-&1)_]*[._&2_]", "[._&2_]*[._10^(-&1)_]"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._10^(-&1)_]}} \\times [._&2_] &= [._&2_] \\bold{\\textcolor{${color1}}{\\div [._10^&1_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} [._&2_] \\bold{\\textcolor{${color1}}{\\times [._10^(-&1)_]}} &= [._&2_] \\bold{\\textcolor{${color1}}{\\div [._10^&1_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Produits astucieux": [
        {
          description: "Calculer astucieusement un produit",
          subdescription: "Utiiser 2 facteurs dont le produit est 100",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: [
            "&1*[_&2_]*&3",
            "[_&2_]*&1*&3",
            "[_&2_]*&3*&1",
            "&1*&3*[_&2_]",
            "&3*&1*[_&2_]",
            "&3*[_&2_]*&1"
          ],
          variables: [
            {
              "&1": "$l{20;25;50}",
              "&2": "[_100:&1_]",
              "&3": "$d{$e[1;2];$e[1;3]}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}  \\times  \\bold{\\textcolor{${color1}}{&2}} \\times &3 &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  \\bold{\\textcolor{${color1}}{&1}} \\times &3 &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&1}} &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&2}} &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&2}} \\times \\bold{\\textcolor{${color1}}{&1}} &= &3 \\times \\bold{\\textcolor{${color1}}{100}} \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&1}} \\times \\bold{\\textcolor{${color1}}{&2}} &= &3 \\times \\bold{\\textcolor{${color1}}{100}} \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Calculer astucieusement un produit",
          subdescription: "Utiiser 2 facteurs dont le produit est 10 (avec 0,5)",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: [
            "20*[_2*&1_]*0,5",
            "0,5*[_2*&1_]*20",
            "[_2*&1_]*0,5*20",
            "[_2*&1_]*20*0,5"
          ],
          variables: [{ "&1": "$e[3;19]" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{20}} \\times [_2*&1_] \\times  \\bold{\\textcolor{${color1}}{0,5}} &= \\bold{\\textcolor{${color1}}{10}} \\times [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{0,5}} \\times [_2*&1_] \\times  \\bold{\\textcolor{${color1}}{20}} &= \\bold{\\textcolor{${color1}}{10}} \\times [_2*&1_] \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} [_2*&1_] \\times \\bold{\\textcolor{${color1}}{20}} \\times  \\bold{\\textcolor{${color1}}{0,5}} &= [_2*&1_] \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} [_2*&1_] \\times \\bold{\\textcolor{${color1}}{0,5}} \\times  \\bold{\\textcolor{${color1}}{20}} &=   [_2*&1_] \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 15,
          grade: CM2
        },
        {
          description: "Calculer astucieusement un produit",
          subdescription: "Utiiser 2 facteurs dont le produit est 10 (avec 0,2 ; 0,25 ; 0,5)",
          enounces: ["Calcule de mani\xE8re astucieuse."],
          expressions: [
            "&1*&2*&3",
            "&2*&1*&3",
            "&2*&3*&1",
            "&1*&3*&2",
            "&3*&2*&1",
            "&3*&1*&2"
          ],
          variables: [
            { "&1": "$l{0,2;0,25;0,5}", "&2": "[_10:&1_]", "&3": "$e[3;19]" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._&1_]}}  \\times  \\bold{\\textcolor{${color1}}{&2}} \\times &3 &= \\bold{\\textcolor{${color1}}{10}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  \\bold{\\textcolor{${color1}}{[._&1_]}} \\times &3 &= \\bold{\\textcolor{${color1}}{10}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} &= \\bold{\\textcolor{${color1}}{10}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._&1_]}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&2}} &= \\bold{\\textcolor{${color1}}{10}} \\times &3 \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&2}} \\times \\bold{\\textcolor{${color1}}{[._&1_]}} &= &3 \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} \\times \\bold{\\textcolor{${color1}}{&2}} &= &3 \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM2
        }
      ],
      Distributivit\u00E9: [
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Factorisation pour obternir un facteur \xE9gal \xE0 10",
          enounces: ["Calcule."],
          expressions: [
            "&2*&1+[_10-&2_]*&1",
            "&1*&2+[_10-&2_]*&1",
            "&2*&1+&1*[_10-&2_]",
            "&1*&2+&1*[_10-&2_]"
          ],
          variables: [{ "&1": "$d{1;1}", "&2": "$e[2;8]" }],
          correctionDetails: [
            [
              {
                text: `$$								\\begin{align} 									&2 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} + [_10-&2_] \\times \\bold{\\textcolor{${color1}}{[._&1_]}} 									&=  \\left( &2 + [_10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&=  10 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&= &sol 								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$								\\begin{align} 									\\bold{\\textcolor{${color1}}{[._&1_]}} \\times &2 + [_10-&2_] \\times \\bold{\\textcolor{${color1}}{[._&1_]}} 									&=  \\left( &2 + [_10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&=  10 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&= &sol 								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} 									&2 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} + \\bold{\\textcolor{${color1}}{[._&1_]}} \\times [_10-&2_] 									&=  \\left( &2 + [_10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&=  10 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&= &sol 								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}  									\\bold{\\textcolor{${color1}}{[._&1_]}} \\times &2+ \\bold{\\textcolor{${color1}}{[._&1_]}} \\times [_10-&2_] 									&= \\bold{\\textcolor{${color1}}{[._&1_]}} \\times \\left( &2 + [_10-&2_] \\right)\\\\  									&= \\bold{\\textcolor{${color1}}{[._&1_]}} \\times 10 \\\\  									&= &sol 								\\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Factorisation pour obternir un facteur \xE9gal \xE0 10 (2)",
          enounces: ["Calcule."],
          expressions: [
            "&2*&1+[._10-&2_]*&1",
            "&1*&2+[._10-&2_]*&1",
            "&2*&1+&1*[._10-&2_]",
            "&1*&2+&1*[._10-&2_]"
          ],
          variables: [{ "&1": "$e[2;8]", "&2": "$d{1;1}" }],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								  [\xB0&2\xB0] \\times \\bold{\\textcolor{${color1}}{[_&1_]}} + [._10-&2_] \\times \\bold{\\textcolor{${color1}}{[_&1_]}} 								  &=  \\left( [\xB0&2\xB0] + [._10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\  								  &=  10 \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\  								  &= &sol 								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} 									\\bold{\\textcolor{${color1}}{[_&1_]}} \\times [\xB0&2\xB0] + [._10-&2_] \\times \\bold{\\textcolor{${color1}}{[_&1_]}} 									&=  \\left( [\xB0&2\xB0] + [._10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\ 									&=  10 \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\ 									&= &sol								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} 									[\xB0&2\xB0] \\times \\bold{\\textcolor{${color1}}{[_&1_]}} + \\bold{\\textcolor{${color1}}{[_&1_]}} \\times [._10-&2_] 									&=  \\left( [\xB0&2\xB0] + [._10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\ 									&=  10 \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\ 									&= &sol 								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} 									\\bold{\\textcolor{${color1}}{[_&1_]}} \\times [\xB0&2\xB0]+ \\bold{\\textcolor{${color1}}{[_&1_]}} \\times [._10-&2_] 									&= \\bold{\\textcolor{${color1}}{[_&1_]}} \\times \\left( [\xB0&2\xB0] + [._10-&2_] \\right) \\\\ 									&= \\bold{\\textcolor{${color1}}{[_&1_]}} \\times 10\\\\ 									&= &sol 								\\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Utiliser la distributivit\xE9",
          subdescription: "Factorisation pour obtenir un facteur \xE9gal \xE0 100",
          enounces: ["Calculer"],
          expressions: [
            "&2*&1+[_100-&2_]*&1",
            "&1*&2+[_100-&2_]*&1",
            "&2*&1+&1*[_100-&2_]",
            "&1*&2+&1*[_100-&2_]"
          ],
          variables: [{ "&1": "$d{$e[1;2];$e[1;2]}", "&2": "$e[2;98]" }],
          correctionDetails: [
            [
              {
                text: `$$								\\begin{align} 									&2 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} + [_100-&2_] \\times \\bold{\\textcolor{${color1}}{[._&1_]}} 									&=  \\left( &2 + [_100-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&=  100 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&= &sol 								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$								\\begin{align}									\\bold{\\textcolor{${color1}}{[._&1_]}} \\times &2 + [_100-&2_] \\times \\bold{\\textcolor{${color1}}{[._&1_]}} 									&=  \\left( &2 + [_100-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&=  100 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&= &sol 								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$								\\begin{align} 									&2 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} + \\bold{\\textcolor{${color1}}{[._&1_]}} \\times [_100-&2_] 									&=  \\left( &2 + [_100-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&=  100 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  									&= &sol 								\\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align}									\\bold{\\textcolor{${color1}}{[._&1_]}} \\times &2+ \\bold{\\textcolor{${color1}}{[._&1_]}} \\times [_100-&2_] 										&=  \\bold{\\textcolor{${color1}}{[._&1_]}} \\times \\left( &2 + [_100-&2_] \\right) \\\\ 										&=  \\bold{\\textcolor{${color1}}{[._&1_]}} \\times 100 \\\\ 										&= &sol 									\\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "A trou": [
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplication par 0,5",
          enounces: ["Compl\xE8te"],
          variables: [
            {
              "&1": "$e[1;20]"
            }
          ],
          expressions: ["?*0,5=[._&1*0,5_]", "0,5*?=[._0,5*&1_]"],
          correctionDetails: [
            [
              {
                text: `$$\\textcolor{${correct_color}}{&1} \\times 0,5 = [._&1*0,5_]$$ car  $$[._&1*0,5_] \\times 2 = &sol$$`
              }
            ],
            [
              {
                text: `$$ 0,5 \\times \\textcolor{${correct_color}}{&1} = [._&1*0,5_]$$ car  $$[._&1*0,5_] \\times 2 = &sol$$`
              }
            ]
          ],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 0,5 un nombre d\xE9cimal",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$l{2;4;6;8}",
              "&2": "$e{1}",
              "&3": "[._&1+&2/10_]"
            }
          ],
          expressions: ["?*0,5 = [._&3*0,5_]", "?*0,5 = [._0,5*&3_]"],
          correctionDetails: [
            [
              {
                text: "$$&sol \\times 0,5 = [._&3*0,5_]$$ car  $$[._&3*0,5_] \\times 2 = &sol$$"
              }
            ],
            [
              {
                text: "$$0,5 \\times &sol  = [._&3*0,5_]$$ car  $$[._&3*0,5_] \\times 2 = &sol$$"
              }
            ]
          ],
          type: "trou",
          solutions: [["&3"]],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 10",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$d{$e[0;2];$e[1;2]}"
            }
          ],
          expressions: ["?*10=[._&1*10_]", "10*?=[._&1*10_]"],
          correctionDetails: [
            [
              {
                text: "$$&sol \\times 10 = [._&1*10_]$$ car  $$[._&1*10_] \\div 10 = &sol$$"
              }
            ],
            [
              {
                text: "$$10 \\times &sol = [._&1*10_]$$ car  $$[._&1*10_] \\div 10 = &sol$$"
              }
            ]
          ],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 100",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$d{$e[0;2];$e[1;2]}"
            }
          ],
          expressions: ["?*100 = [._&1*100_]", "100*? = [._&1*100_]"],
          correctionDetails: [
            [
              {
                text: `$$\\textcolor{${correct_color}}{[._&1_]} \\times 100 = [._&1*100_]$$ car  $$[._&1*100_] \\div 100 = &sol$$`
              }
            ],
            [
              {
                text: `$$100 \\times \\textcolor{${correct_color}}{[._&1_]} = [._&1*100_]$$ car  $$[._&1*100_] \\div 100 = &sol$$`
              }
            ]
          ],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 1000",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$d{$e[0;2];$e[1;2]}"
            }
          ],
          expressions: ["?*1000 = [._&1*1000_]", "1000*? = [._&1*1000_]"],
          correctionDetails: [
            [
              {
                text: "$$&sol \\times 1000 = [._&1*1000_]$$ car  $$[._&1*1000_] \\div 1000 = &sol$$"
              }
            ],
            [
              {
                text: "$$1000 \\times &sol = [._&1*1000_]$$ car  $$[._&1*1000_] \\div 1000 = &sol$$"
              }
            ]
          ],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 10, 100 ou 1000",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;3]",
              "&2": "$d{$e[0;4-&1];$e[1;4]}"
            }
          ],
          expressions: [
            "?*[_10^&1_] = [._10^&1*&2_]",
            "[_10^&1_]*? = [._10^&1*&2_]"
          ],
          correctionDetails: [
            [
              {
                text: `$$\\textcolor{${correct_color}}{[._&2_]} \\times [_10^&1_] = [._&2*10^&1_]$$ car  $$[._&2*10^&1_] \\div [_10^&1_] = &sol$$`
              }
            ],
            [
              {
                text: `$$[_10^&1_] \\times \\textcolor{${correct_color}}{[._&2_]} = [._&2*10^&1_]$$ car  $$[._&2*10^&1_] \\div [_10^&1_] = &sol$$`
              }
            ]
          ],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 0,1 un nombre d\xE9cimal",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[0;3]",
              "&2": "$e[1;2]",
              "&3": "$d{&1;&2}"
            }
          ],
          expressions: ["?*0,1 = [._&3*0,1_]", "0,1*? = [._0,1*&3_]"],
          type: "trou",
          solutions: [["&3"]],
          correctionDetails: [
            [
              {
                text: `$$\\textcolor{${correct_color}}{[._&3_]} \\times 0,1 = [._&3*0,1_]$$ car  $$[._&3*0,1_] \\times 10 = &sol$$`
              }
            ],
            [
              {
                text: `$$0,1 \\times \\textcolor{${correct_color}}{[._&3_]} = [._&3*0,1_]$$ car  $$[._&3*0,1_] \\times 10 = &sol$$`
              }
            ]
          ],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 0,01 un nombre d\xE9cimal",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[0;3]",
              "&2": "$e[1;2]",
              "&3": "$d{&1;&2}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\textcolor{${correct_color}}{[._&3_]} \\times 0,01 = [._&3*0,01_]$$ car  $$[._&3*0,01_] \\times 100 = &sol$$`
              }
            ],
            [
              {
                text: `$$0,01 \\times \\textcolor{${correct_color}}{[._&3_]} = [._&3*0,01_]$$ car  $$[._&3*0,01_] \\times 100 = &sol$$`
              }
            ]
          ],
          expressions: ["?*0,01 = [._&3*0,01_]", "0,01*? = [._0,01*&3_]"],
          type: "trou",
          solutions: [["&3"]],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 0,001 un nombre d\xE9cimal",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[0;3]",
              "&2": "$e[1;1]",
              "&3": "$d{&1;&2}"
            }
          ],
          expressions: ["?*0,001 = [._&3*0,001_]", "0,001*?=[._0,001*&3_]"],
          correctionDetails: [
            [
              {
                text: `$$\\textcolor{${correct_color}}{[._&3_]} \\times 0,001 = [._&3*0,001_]$$ car  $$[._&3*0,001_] \\times 1\\,000 = &sol$$`
              }
            ],
            [
              {
                text: `$$0,001 \\times \\textcolor{${correct_color}}{[._&3_]} = [._&3*0,001_]$$ car  $$[._&3*0,001_] \\times 1\\,000 = &sol$$`
              }
            ]
          ],
          type: "trou",
          solutions: [["&3"]],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Multiplier par 0,1 ; 0,01 ou 0,001",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;3]",
              "&2": "$d{$e[1;3];$e[1;4-&1]}"
            }
          ],
          expressions: [
            "[._10^(-&1)_]*? = [._10^(-&1)*&2_]",
            "?*[._10^(-&1)_] = [._&2*10^(-&1)_]"
          ],
          correctionDetails: [
            [
              {
                text: `$$[._10^(-&1)_] \\times &sol = [._&2*10^(-&1)_]$$ car  $$[._&2*10^(-&1)_] \\times [_10^&1_] = &sol$$`
              }
            ],
            [
              {
                text: `$$ &sol \\times [._10^(-&1)_] = [._&2*10^(-&1)_]$$ car  $$[._&2*10^(-&1)_] \\times [_10^&1_] = &sol$$`
              }
            ]
          ],
          solutions: [["&2"]],
          type: "trou",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    },
    Diviser: {
      Quotient: [
        {
          description: "Calculer un quotient",
          subdescription: "Diviser par 10",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$d{$e[0;3];$e[0;1]}"
            }
          ],
          expressions: ["&1:10"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Calculer un quotient",
          subdescription: "Diviser par 100",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$d{$e[0;3];$e[0;1]}"
            }
          ],
          expressions: ["&1:100"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM2
        },
        {
          description: "Calculer un quotient",
          subdescription: "Diviser par 1000",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[0;4]",
              "&2": "$e{&1;&1}"
            }
          ],
          expressions: ["&2:1000"],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM2
        },
        {
          description: "Calculer un quotient",
          subdescription: "Diviser par 10, 100 ou 1000",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;3]",
              "&2": "$d{$e[0;4];$e[0;4-&1]}"
            }
          ],
          expressions: ["&2:[_10^&1_]"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Calculer un quotient",
          subdescription: "Un nombre d\xE9cimal par un entier",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "[._&1*&2/10_]:&2"
            }
          ],
          expressions: ["&3"],
          correctionDetails: [
            [
              {
                text: "$$[._&1*&2/10_] \\div &2 = &sol $$ car $$ [._&3_] \\times &2 = [._&1*&2/10_]$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 15,
          grade: CM2
        },
        {
          description: "Calculer un quotient",
          subdescription: "Diviser par 0,1 ; 0,01 ou 0,001",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$d{$e[1;2];$e[0;3]}",
              "&2": "$l{0.1;0.01;0.001}",
              "&3": "$l{$e[1;9];$e[11;99];$e[101;999]}:1000"
            }
          ],
          expressions: ["[._&3_]:&2", "&1:&2"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} [._&3_] \\bold{\\textcolor{${color1}}{\\div [._&2_]}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\times [._1:&2_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} [._&1_] \\bold{\\textcolor{${color1}}{\\div [._&2_]}} &= [._&1_] \\bold{\\textcolor{${color1}}{\\times [._1:&2_]}} \\\\ &=  &sol \\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer un quotient",
          enounces: ["Calcule."],
          subdescription: "Deux nombres d\xE9cimaux",
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$l{0.1;0.01}"
            }
          ],
          expressions: ["[._&1*&2*&3_]:[._&1*&3_]"],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} [._&1*&2*&3_] \\div [._&1*&3_] &= [._&1*&2_] \\div [._&1_] \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "A trou": [
        {
          description: "Compl\xE9ter une division a trou",
          subdescription: "Diviser par 10",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$d{$e[0;3];$e[0;1]}"
            }
          ],
          expressions: ["?:10 = [._&1:10_]"],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 15,
          grade: CM1
        },
        {
          description: "Compl\xE9ter une division a trou",
          subdescription: "Diviser par 100",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$d{$e[0;3];$e[0;1]}"
            }
          ],
          expressions: ["?:100 = [._&1:100_]"],
          type: "trou",
          solutions: [["&1"]],
          defaultDelay: 15,
          grade: CM2
        },
        {
          description: "Compl\xE9ter une division a trou",
          subdescription: "Diviser par 1000",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[0;4]",
              "&2": "$e{&1;&1}"
            }
          ],
          expressions: ["?:1000 = [._&2:1000_]"],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 15,
          grade: CM2
        },
        {
          description: "Compl\xE9ter une division a trou",
          subdescription: "Diviser par 10, 100 ou 1000",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$e[1;3]",
              "&2": "$d{$e[0;4];$e[0;4-&1]}"
            }
          ],
          expressions: ["?:[_10^&1_]=[._&2:10^&1_]"],
          type: "trou",
          solutions: [["&2"]],
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Compl\xE9ter une division a trou",
          subdescription: "Diviser par 0,1 ; 0,01 ou 0,001",
          enounces: ["Compl\xE8te."],
          variables: [
            {
              "&1": "$d{$e[1;2];$e[0;3]}",
              "&2": "$l{0.1;0.01;0.001}",
              "&3": "$l{$e[1;9];$e[11;99];$e[101;999]}:1000"
            }
          ],
          expressions: ["?:[._&2_] = [._&3:&2_]", "?:[._&2_] = [._&1:&2_]"],
          type: "trou",
          solutions: [["[._&3_]"], ["&1"]],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    }
  },
  Relatifs: {
    Apprivoiser: {
      "La d\xE9finition d'un nombre n\xE9gatif": [
        {
          description: "Une soustraction enfin possible",
          enounces: ["Comment \xE9crit-on le r\xE9sultat de : "],
          expressions: ["0-&1"],
          variables: [{ "&1": "$e[2;20]" }],
          options: ["require-no-null-terms"],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Nombre n\xE9gatif d\xE9fini par une soustraction",
          enounces: [
            "Quelle est la soustraction d\xE9finissant le nombre $$-&1$$ ?"
          ],
          options: ["no-penalty-for-null-terms"],
          variables: [{ "&1": "$e[2;20]" }],
          solutions: [["0-&1"]],
          correctionFormat: [
            {
              correct: ["$$-&1$$ est d\xE9fini par la soustraction &answer."]
            }
          ],
          type: "rewrite",
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Trouver l'oppos\xE9 d'un nombre",
          enounces: [
            "Quel est l'oppos\xE9 du nombre $$&1$$ ?",
            "Quel est l'oppos\xE9 du nombre $$-&1$$ ?"
          ],
          variables: [{ "&1": "$e[1;20]" }],
          solutions: [["-&1"], ["&1"]],
          correctionFormat: [
            {
              correct: ["L'oppos\xE9 est &answer"]
            }
          ],
          type: "rewrite",
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ],
      Comparer: [
        {
          description: "Comparer deux nombres relatifs.",
          subdescription: "Valeurs enti\xE8res.",
          enounces: ["Quel est le plus petit de ces 2 nombres ?"],
          variables: [{ "&1": "$e[1;19]", "&2": "$e[&1+1;20]" }],
          choices: [
            [{ text: "$$&1$$" }, { text: "$$-&2$$" }],
            [{ text: "$$-&1$$" }, { text: "$$-&2$$" }],
            [{ text: "$$-&2$$" }, { text: "$$-&1$$" }]
          ],
          solutions: [[1], [1], [0]],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Comparer deux nombres relatifs.",
          subdescription: "Valeurs d\xE9cimales.",
          enounces: ["Quel est le plus petit de ces 2 nombres ?"],
          variables: [
            {
              "&1": "$e{1}",
              "&2": "$e[1;2]",
              "&3": "$e{&2;&2}\\{m(10)}",
              "&4": "$e{1;1}\\{&3}",
              "&6": "[._-&1,&3_]",
              "&7": "[._-&1,&4_]"
            },
            {
              "&1": "$er{1}",
              "&2": "$er{1}",
              "&3": "$e[1;2]",
              "&4": "$e{&3;&3}\\{m(10)}",
              "&5": "$e{1}\\{&4}",
              "&6": "[._&1,&4_]",
              "&7": "[._&2,&5_]"
            }
          ],
          choices: [[{ text: "$$[._&6_]$$" }, { text: "$$[._&7_]$$" }]],
          solutions: [["&6<&7 ?? 0 :: 1"]],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ]
    },
    "Additionner et soustraire": {
      "Sur la droite gradu\xE9e": [
        {
          description: "Calculer une somme ou une diff\xE9rence",
          subdescription: "A l'aide de la droite gradu\xE9e, entre $$-4$$ et $$4$$.",
          enounces: ["Calcule en t'aidant de la droite gradu\xE9e."],
          expressions: ["(-&1)+&2", "(-&1)-&2", "&1-&2"],
          variables: [
            { "&1": "$e[1;4]", "&2": "$e[1;4]" },
            { "&1": "$e[1;3]", "&2": "$e[1;4-&1]" },
            { "&1": "$e[1;3]", "&2": "$e[&1+1;4]" }
          ],
          images: [
            "relatifs/droite-graduee-operations/droite-graduee--4-4-600.png"
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Calculer une somme ou une diff\xE9rence",
          subdescription: "A l'aide de la droite gradu\xE9e, entre $$-7$$ et $$7$$.",
          enounces: ["Calcule en t'aidant de la droite gradu\xE9e."],
          expressions: ["(-&1)+&2", "(-&1)-&2", "&1-&2"],
          variables: [
            { "&1": "$e[1;7]", "&2": "$e[1;8]" },
            { "&1": "$e[1;6]", "&2": "$e[1;7-&1]" },
            { "&1": "$e[1;7]", "&2": "$e[&1+1;8]" }
          ],
          images: [
            "relatifs/droite-graduee-operations/droite-graduee--7-7-600.png"
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Compl\xE9ter une adition \xE0 trou",
          subdescription: "Relatifs entre $$-4$$ et $$4$$. A l'aide de la droite gradu\xE9e.",
          enounces: ["Compl\xE8te en t'aidant de la droite gradu\xE9e."],
          expressions: [
            "(-&1)+? = [_(-&1)+&2_]",
            "(-&1)-? = [_(-&1)-&2_]",
            "&1-? = [_&1-&2_]"
          ],
          variables: [
            { "&1": "$e[1;4]", "&2": "$e[1;4]" },
            { "&1": "$e[1;3]", "&2": "$e[1;4-&1]" },
            { "&1": "$e[1;3]", "&2": "$e[&1+1;4]" }
          ],
          images: [
            "relatifs/droite-graduee-operations/droite-graduee--4-4-600.png"
          ],
          type: "trou",
          solutions: [["&2"]],
          options: [
            "no-penalty-for-extraneous-brackets-in-first-negative-term"
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Compl\xE9ter une adition \xE0 trou",
          subdescription: "Relatifs entre $$-7$$ et $$7$$. A l'aide de la droite gradu\xE9e.",
          enounces: ["Compl\xE8te en t'aidant de la droite gradu\xE9e."],
          expressions: [
            "(-&1)+?= [_(-&1)+&2_]",
            "(-&1)-?=[_(-&1)-&2_]",
            "&1-?=[_&1-&2_]"
          ],
          variables: [
            { "&1": "$e[1;7]", "&2": "$e[1;8]" },
            { "&1": "$e[1;6]", "&2": "$e[1;7-&1]" },
            { "&1": "$e[1;7]", "&2": "$e[&1+1;8]" }
          ],
          images: [
            "relatifs/droite-graduee-operations/droite-graduee--7-7-600.png"
          ],
          type: "trou",
          solutions: [["&2"]],
          options: [
            "no-penalty-for-extraneous-brackets-in-first-negative-term"
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ],
      "Sommes": [
        {
          description: "Ajouter 1 ou 2 \xE0 un nombre n\xE9gatif",
          expressions: ["(-&1)+1", "(-&1)+2"],
          enounces: ["Calcule."],
          variables: [{ "&1": "$e[3;9]" }],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Ajouter 2 nombres oppos\xE9s",
          expressions: ["(-&1)+&1", "&1+(-&1)"],
          enounces: ["Calcule."],
          variables: [{ "&1": "$e[1;15]" }],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Ajouter un nombre positif \xE0 un nombre n\xE9gatif en d\xE9passant 0",
          expressions: ["(-&1)+[_&1+&2_]"],
          enounces: ["Calcule."],
          variables: [{ "&1": "$e[1;8]", "&2": "$e[1;9-&1]" }],
          correctionDetails: [
            [
              {
                text: `$$(-&1)+\\bold{\\textcolor{${color1}}{[_&1+&2_]}}=(-&1)+\\textcolor{${color1}}{&1+&2}=0+&2=&2$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Ajouter deux nombres n\xE9gatifs",
          expressions: ["(-&1)+(-&2)"],
          enounces: ["Calcule."],
          variables: [{ "&1": "$e[1;9]", "&2": "$e[1;9]" }],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "D\xE9terminer le signe d'une somme",
          expressions: [
            "(-&1)+&2",
            "(-&2)+&1",
            "(-&1)+(-&2)",
            "&1+(-&2)",
            "&2+(-&1)"
          ],
          enounces: ["Quel est le signe de cette somme ?"],
          variables: [
            { "&1": "$e[30;99]", "&2": "$e[1;&1-1]" },
            { "&1": "$e[30;99]", "&2": "$e[1;&1-1]" },
            { "&1": "$e[30;99]", "&2": "$e[30;99]" },
            { "&1": "$e[30;99]", "&2": "$e[1;&1-1]" },
            { "&1": "$e[30;99]", "&2": "$e[1;&1-1]" }
          ],
          choices: [[{ text: "positif" }, { text: "n\xE9gatif" }]],
          solutions: [[1], [0], [1], [0], [1]],
          correctionDetails: [
            [
              {
                text: `$$&1>&2$$ donc le r\xE9sultat de &expression est du signe de $$-&1$$ c'est-\xE0-dire &solution`
              }
            ],
            [
              {
                text: `$$&1>&2$$ donc le r\xE9sultat de &expression est du signe de $$&1$$ c'est-\xE0-dire &solution`
              }
            ],
            [
              {
                text: `$$&1>&2$$ donc le r\xE9sultat de &expression est du signe de $$-&1$$ c'est-\xE0-dire &solution`
              }
            ],
            [
              {
                text: `$$&1>&2$$ donc le r\xE9sultat de &expression est du signe de $$&1$$ c'est-\xE0-dire &solution`
              }
            ],
            [
              {
                text: `$$&1>&2$$ donc le r\xE9sultat de &expression est du signe de $$-&1$$ c'est-\xE0-dire &solution`
              }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Calculer une somme",
          subdescription: "Cas g\xE9n\xE9ral",
          enounces: ["Calcule."],
          expressions: ["(-&1)+&2", "(-&1)+(-&2)", "&1+(-&2)"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Compl\xE9ter une somme",
          subdescription: "Cas g\xE9n\xE9ral",
          enounces: ["Compl\xE8te l'\xE9galit\xE9 avec le nombre manquant."],
          expressions: [
            "(-&1)+?=[_(-&1)+&2_]",
            "(-&1)+?=[_(-&1)+(-&2)_]",
            "&1+?=[_&1+(-&2)_]",
            "?+(-&1)=[_(-&1)+&2_]",
            "?+(-&1)=[_(-&1)+(-&2)_]",
            "?+&1=[_&1+(-&2)_]"
          ],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          solutions: [
            ["&2"],
            ["(-&2)"],
            ["(-&2)"],
            ["&2"],
            ["(-&2)"],
            ["(-&2)"]
          ],
          type: "trou",
          options: [
            "no-penalty-for-extraneous-brackets-in-first-negative-term"
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ],
      "Diff\xE9rences": [
        {
          description: "Enlever 1 ou 2 \xE0 un nombre n\xE9gatif",
          expressions: ["(-&1)-1", "(-&1)-2"],
          enounces: ["Calcule."],
          variables: [{ "&1": "$e[1;7]" }],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Enlever un nombre positif \xE0 un nombre positif en d\xE9passant 0",
          expressions: ["&1-[_&1+&2_]"],
          enounces: ["Calcule."],
          variables: [{ "&1": "$e[1;8]", "&2": "$e[1;9-&1]" }],
          correctionDetails: [
            [
              {
                text: `$$&1\\bold{\\textcolor{${color1}}{-[_&1+&2_]}}=&1\\textcolor{${color1}}{-&1-&2}=0-&2=-&2$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Transformer une soustraction en addition",
          enounces: ["R\xE9\xE9cris cette soustraction en une addition \xE9quivalente."],
          expressions: ["(-&1)-(-&2)", "&1-(-&2)", "&1-&2", "(-&1)-&2"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          solutions: [["-&1+&2"], ["&1+&2"], ["&1+(-&2)"], ["-&1+(-&2)"]],
          options: ["no-penalty-for-extraneous-signs"],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Soustraire (cas g\xE9n\xE9ral)",
          enounces: ["Calcule."],
          expressions: ["(-&1)-(-&2)", "&1-(-&2)", "&1-&2", "(-&1)-&2"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ],
      "Sommes alg\xE9briques": [
        {
          description: "Simplifier l'\xE9criture",
          enounces: ["Simplifie les doubles signes de cette expression."],
          expressions: ["-&1+(-&2)", "&1+(-&2)", "-&1-(-&2)", "&1-(-&2)"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          solutions: [["-&1-&2"], ["&1-&2"], ["-&1+&2"], ["&1+&2"]],
          options: ["require-no-extraneaous-signs"],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Calculer",
          subdescription: "Avec \xE9criture simplifi\xE9e",
          enounces: ["Calcule."],
          expressions: ["-&1+&2", "-&1-&2", "&3-&1"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[1;&1-1]" }],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Compl\xE9ter une \xE9galit\xE9",
          subdescription: "Avec \xE9criture simplifi\xE9e",
          enounces: ["Compl\xE8te."],
          expressions: [
            "-&1+?= [_-&1+&2_]",
            "-&1-?= [_-&1-&2_]",
            "&3-? = [_&3-&1_]"
          ],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[1;&1-1]" }],
          type: "trou",
          solutions: [["&2"], ["&2"], ["&1"]],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Calculer une somme alg\xE9brique",
          subdescription: "Avec \xE9criture simplifi\xE9e",
          enounces: ["Calcule."],
          expressions: [
            "[_&1_][+_&2_][+_&3_][+_&4_]"
          ],
          variables: [{ "&1": "$er[2;9]", "&2": "$er[2;9]", "&3": "$er[2;9]", "&4": "$er[2;9]" }],
          conditions: ["abs(&1)/(&1)+abs(&2)/(&2)+abs(&3)/(&3)+abs(&4)/(&4)>-4 && abs(&1)/(&1)+abs(&2)/(&2)+abs(&3)/(&3)+abs(&4)/(&4)<4 "],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ]
    },
    "Multiplier et Diviser": {
      Produit: [
        {
          description: "D\xE9terminer le signe d'un produit",
          subdescription: "2 facteurs",
          enounces: ["Quel est le signe de ce produit ?"],
          expressions: ["(&1)*(&2)"],
          conditions: ["&1<=0 || &2<=0"],
          variables: [{ "&1": "$er[30;99]", "&2": "$er[30;99]" }],
          choices: [[{ text: "positif" }, { text: "n\xE9gatif" }]],
          correctionFormat: [
            {
              correct: ["Le produit est &answer"]
            }
          ],
          solutions: [["(&1)*(&2) >0 ?? 0 :: 1"]],
          options: ["no-shuffle-choices", "exp-remove-unecessary-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "D\xE9terminer le signe d'un facteur",
          enounces: ["Quel est le signe du facteur manquant ?"],
          expressions: [
            "(-&1)*?=&2",
            "(-&1)*?=-&2",
            "&1*?=-&2",
            "&1*?=&2",
            "?*(-&1)=&2",
            "?*(-&1)=-&2",
            "?*&1=-&2",
            "?*&1=&2"
          ],
          variables: [{ "&1": "$e[30;99]", "&2": "$e[30;99]" }],
          choices: [[{ text: "positif" }, { text: "n\xE9gatif" }]],
          corrections: [
            "Dans l'\xE9galit\xE9 $$(-&1) \\times \\ldots=&2$$, le facteur manquant est ",
            "Dans l'\xE9galit\xE9 $$(-&1) \\times \\ldots=-&2$$, le facteur manquant est ",
            "Dans l'\xE9galit\xE9 $$&1 \\times \\ldots=-&2$$, le facteur manquant est ",
            "Dans l'\xE9galit\xE9 $$&1 \\times \\ldots=&2$$, le facteur manquant est ",
            "Dans l'\xE9galit\xE9 $$\\ldots \\times (-&1)  = &2$$, le facteur manquant est ",
            "Dans l'\xE9galit\xE9 $$\\ldots \\times (-&1) = -&2$$, le facteur manquant est ",
            "Dans l'\xE9galit\xE9 $$\\ldots \\times &1 = -&2$$, le facteur manquant est ",
            "Dans l'\xE9galit\xE9 $$\\ldots \\times &1 = &2$$, le facteur manquant est "
          ],
          solutions: [[1], [0], [1], [0], [1], [0], [1], [0]],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "D\xE9terminer le signe d'un produit",
          subdescription: "3 facteurs",
          enounces: ["Quel est le signe de ce produit ?"],
          expressions: ["(&1)*(&2)*(&3)"],
          variables: [
            { "&1": "$er[30;99]", "&2": "$er[30;99]", "&3": "$er[30;99]" }
          ],
          choices: [[{ text: "positif" }, { text: "n\xE9gatif" }]],
          correctionFormat: [
            {
              correct: ["Le produit est &answer"]
            }
          ],
          solutions: [["(&1)*(&2)*(&3) >0 ?? 0 :: 1"]],
          options: ["no-shuffle-choices", "exp-remove-unecessary-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "D\xE9terminer le signe d'un produit",
          subdescription: "4 facteurs",
          enounces: ["Quel est le signe de ce produit ?"],
          expressions: ["(&1)*(&2)*(&3)*(&4)"],
          variables: [
            {
              "&1": "$er[30;99]",
              "&2": "$er[30;99]",
              "&3": "$er[30;99]",
              "&4": "$er[30;99]"
            }
          ],
          choices: [[{ text: "positif" }, { text: "n\xE9gatif" }]],
          correctionFormat: [
            {
              correct: ["Le produit est &answer"]
            }
          ],
          solutions: [["(&1)*(&2)*(&3)*(&4) >0 ?? 0 :: 1"]],
          options: ["no-shuffle-choices", "exp-remove-unecessary-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer un produit",
          expressions: ["(-&1)*&2", "(-&1)*(-&2)", "&1*(-&2)"],
          enounces: ["Calcule."],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          enounces: ["Compl\xE8te."],
          expressions: [
            "(-&1)*?=[_-&1*&2_]",
            "(-&1)*?=[_(-&1)*(-&2)_]",
            "&1*?=[_&1*(-&2)_]",
            "?*(-&1)=[_-&1*&2_]",
            "?*(-&1)=[_(-&1)*(-&2)_]",
            "?*&1=[_&1*(-&2)_]"
          ],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          solutions: [
            ["&2"],
            ["(-&2)"],
            ["(-&2)"],
            ["&2"],
            ["(-&2)"],
            ["(-&2)"]
          ],
          type: "trou",
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ],
      Carr\u00E9: [
        {
          description: "Carr\xE9 et oppos\xE9 d'un carr\xE9",
          enounces: ["Calcule."],
          expressions: ["(&1)^2", "-&1^2"],
          variables: [{ "&1": "-$e[1;9]" }, { "&1": "$e[1;9]" }],
          correctionDetails: [
            [{ text: "$$(&1)^2=(&1)\\times(&1)=&sol$$" }],
            [
              {
                text: "$$-&1^2=-&1 \\times &1=&sol$$"
              }
            ]
          ],
          defaultDelay: 15,
          grade: QUATRIEME
        }
      ],
      Quotient: [
        {
          description: "D\xE9terminer le signe d'un quotient",
          enounces: ["Quel est le signe de ce quotient ?"],
          expressions: ["(&1):(&2)"],
          variables: [{ "&1": "$er[30;99]", "&2": "$er[30;99]" }],
          conditions: ["&1<=0 || &2<0"],
          choices: [[{ text: "positif" }, { text: "n\xE9gatif" }]],
          correctionFormat: [
            {
              correct: ["Le produit est &answer"]
            }
          ],
          solutions: [["(&1):(&2)>0 ?? 0 :: 1"]],
          options: ["no-shuffle-choices", "exp-remove-unecessary-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "D\xE9terminer le signe dans un quotient",
          enounces: ["Quel est le signe du nombre manquant ?"],
          expressions: ["(&1):?=(&2)", "?:(&1)=(&2)"],
          variables: [{ "&1": "$er[30;99]", "&2": "$er[30;99]" }],
          conditions: ["&1<=0 || &2<0"],
          choices: [[{ text: "positif" }, { text: "n\xE9gatif" }]],
          correctionFormat: [
            {
              correct: ["Le facteur manquant est &answer"]
            }
          ],
          solutions: [["(&1)*(&2)>0 ?? 0 :: 1"]],
          options: ["no-shuffle-choices", "exp-remove-unecessary-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Diviser",
          enounces: ["Calcule."],
          expressions: [
            "(-[_&1*&2_]):&2",
            "(-[_&1*&2_]):(-&2)",
            "[_&1*&2_]:(-&2)"
          ],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Compl\xE9ter une division \xE0 trou",
          subdescription: "Nombres relatifs",
          enounces: ["Compl\xE8te."],
          expressions: [
            "(-[_&1*&2_]):? = -&1 ",
            "(-[_&1*&2_]):?= &1",
            "[_&1*&2_]:? = -&1",
            "?:&2 = -&1 ",
            "?:(-&2)= &1",
            "?:(-&2) = -&1"
          ],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          type: "trou",
          solutions: [
            ["&2"],
            ["(-&2)"],
            ["(-&2)"],
            ["(-[_&1*&2_])"],
            ["(-[_&1*&2_])"],
            ["[_&1*&2_]"]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ]
    }
  },
  Fractions: {
    Apprivoiser: {
      D\u00E9finition: [
        {
          description: "D\xE9finition par quotient",
          enounces: ["D\xE9termine le facteur manquant."],
          expressions: ["&2*?=&1", "?*&2=&1"],
          variables: [{ "&1": "$e[2;19]", "&2": "$e[2;19]\\{cd(&1)}" }],
          solutions: [["&1/&2"]],
          type: "trou",
          correctionDetails: [
            [
              {
                text: "Dans $$&2 \\times \\cdots = &1$$, le nombre cherch\xE9 est le r\xE9sultat de $$&1 \\div &2$$ qui s'\xE9crit $$&sol $$ car on ne peut pas le mettre sous forme d\xE9cimale."
              }
            ],
            [
              {
                text: "Dans $$ \\cdots \\times &2 = &1$$, le nombre cherch\xE9 est le r\xE9sultat de $$&1 \\div &2$$ qui s'\xE9crit $$&sol $$ car on ne peut pas le mettre sous forme d\xE9cimale."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "D\xE9finition par quotient",
          subdescription: "$$a/b*a=a$$",
          enounces: ["Calculer."],
          expressions: ["{&2/&1}*&1", "&1*{&2/&1}"],
          variables: [
            { "&1": "$l{3;6;7;9;11;12;13}", "&2": "$e[2;10]\\{cd(&1)}" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\textcolor{${color1}}{\\dfrac{&2}{&1}} \\times &1=&sol $$ d\xE9signe le r\xE9sultat de la division $$\\textcolor{${color1}}{&2 \\div &1}$$ et $$\\textcolor{${color1}}{&2 \\div &1} \\times &1 = &2$$.`
              }
            ],
            [
              {
                text: `$$&1 \\times \\textcolor{${color1}}{\\dfrac{&2}{&1}} =&sol $$ d\xE9signe le r\xE9sultat de la division $$\\textcolor{${color1}}{&2 \\div &1}$$ et $$&1 \\times \\textcolor{${color1}}{&2 \\div &1} = &2$$.`
              }
            ]
          ],
          defaultDelay: 10,
          grade: SIXIEME
        }
      ],
      D\u00E9composition: [
        {
          description: "D\xE9composer une fraction",
          subdescription: "Une fraction d\xE9cimale (jusqu'aux centi\xE8mes) en une somme d'un entier et d'une fraction d\xE9cimale inf\xE9rieure \xE0 1",
          enounces: [
            "D\xE9composer cette fraction en une somme d'un entier et d'une fraction d\xE9cimale inf\xE9rieure \xE0 1, comme dans l'exemple : $$\\dfrac{345}{100} = 3 + \\dfrac{45}{100}$$. "
          ],
          expressions: ["[_&1*&2+&3_]/&1"],
          variables: [
            { "&1": "$l{10;100}", "&2": "$e[2;9]", "&3": "$e[1;&1-1]" }
          ],
          solutions: [["&2+&3/&1"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\dfrac{[_&1*&2+&3_]}{&1} &= \\dfrac{[_&1*&2_]}{&1} + \\dfrac{&3}{&1} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-non-reduced-fractions"],
          defaultDelay: 30,
          grade: CM1
        },
        {
          description: "D\xE9composer une fraction",
          subdescription: "Une fraction d\xE9cimale (jusqu'aux milli\xE8mes) en une somme d'un entier et d'une fraction d\xE9cimale inf\xE9rieure \xE0 1",
          enounces: [
            "D\xE9composer cette fraction en une somme d'un entier et d'une fraction d\xE9cimale inf\xE9rieure \xE0 1, comme dans l'exemple : $$\\dfrac{3456}{1000} = 3 + \\dfrac{456}{1000}$$."
          ],
          expressions: ["[_&1*&2+&3_]/&1"],
          variables: [
            { "&1": "$l{10;100;1000}", "&2": "$e[2;9]", "&3": "$e[1;&1-1]" }
          ],
          solutions: [["&2+&3/&1"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\dfrac{[_&1*&2+&3_]}{&1} &= \\dfrac{[_&1*&2_]}{&1} + \\dfrac{&3}{&1} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-non-reduced-fractions"],
          defaultDelay: 30,
          grade: CM2
        },
        {
          description: "D\xE9composer une fraction",
          subdescription: "Une fraction  en une somme d'un entier et d'une fraction inf\xE9rieure \xE0 1",
          enounces: [
            "D\xE9composer cette fraction en une somme d'un entier et d'une fraction inf\xE9rieure \xE0 1, comme dans l'exemple : $$\\dfrac{14}{3} = 4 + \\dfrac{2}{3}$$"
          ],
          expressions: ["[_&1*&2+&3_]/&1"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[1;&1-1]" }],
          solutions: [["&2+&3/&1"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\dfrac{[_&1*&2+&3_]}{&1} &= \\dfrac{[_&1*&2_]}{&1} + \\dfrac{&3}{&1} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-non-reduced-fractions"],
          defaultDelay: 30,
          grade: CM2
        }
      ],
      "Forme d\xE9cimale": [
        {
          description: "Forme d\xE9cimale d'une fraction",
          subdescription: "Dixi\xE8mes",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["&1/10"],
          variables: [{ "&1": "$e[0;9]" }],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Forme d\xE9cimale d'une fraction",
          subdescription: "Centi\xE8mes",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["&1/100"],
          variables: [{ "&1": "$e[0;9]" }],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Forme d\xE9cimale d'une fraction",
          subdescription: "Centi\xE8mes (2)",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["[_&1_]/100"],
          variables: [{ "&1": "$e[1;9]*10+$e[1;9]" }],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Forme d\xE9cimale d'une fraction",
          subdescription: "Fraction d\xE9cimale jusqu'au centi\xE8me",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["&2/[_&3_]"],
          variables: [
            {
              "&1": "$e[2;4]",
              "&2": "$e{&1;&1}",
              "&3": "10^$e[1;2]"
            }
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "D\xE9terminer la forme d\xE9cimale d'une fraction",
          subdescription: "Cas \xE0 conna\xEEtre par coeur",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["&1"],
          variables: [
            { "&1": "$l{1/2;1/4;1/10;2/10;3/2;5/2;1/100;2/1000;7/2;9/2}" }
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Forme d\xE9cimale d'une fraction",
          subdescription: "Milli\xE8mes",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["&1/1000"],
          variables: [{ "&1": "$e[0;9]" }],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Forme d\xE9cimale d'une fraction",
          subdescription: "Milli\xE8mes (2)",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["[_&1_]/1000"],
          variables: [{ "&1": "$e[1;9]*100+$e[0;9]*10+$e[1;9]" }],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "Forme d\xE9cimale d'une fraction",
          subdescription: "Fraction d\xE9cimale jusqu'au milli\xE8me",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["&2/[_&3_]"],
          variables: [
            {
              "&1": "$e[2;4]",
              "&2": "$e{&1;&1}",
              "&3": "10^$e[1;3]"
            }
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "D\xE9terminer la forme d\xE9cimale d'une fraction",
          subdescription: "Cas \xE0 conna\xEEtre par coeur",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["&1"],
          variables: [
            { "&1": "$l{1/2;1/4;3/1000;2/10;3/2;5/2;3/4;1/5;7/2;9/2}" }
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: CM2
        },
        {
          description: "D\xE9terminer la forme d\xE9cimale d'une fraction",
          subdescription: "La forme d\xE9cimale est un entier",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["[_&2*&1_]/&1"],
          variables: [{ "&1": "$e[2;9]", "&2": "$e[2;9]" }],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\dfrac{[_&2*&1_]}{&1} &= [_&2*&1_] \\div &1 \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "D\xE9terminer la forme d\xE9cimale d'une fraction",
          subdescription: "La forme d\xE9cimale n'est pas enti\xE8re",
          enounces: ["Ecris la forme d\xE9cimale de la fraction"],
          expressions: ["&2/&1"],
          variables: [{ "&1": "$l{2;4;5;10}", "&2": "$e[1;&1+1]\\{&1}" }],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\dfrac{&2}{&1} &= &2 \\div &1 \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "D\xE9terminer une forme fractionnaire",
          enounces: [
            "R\xE9\xE9cris ce nombre d\xE9cimal sous forme fractionnaire la plus simple."
          ],
          expressions: ["[._&2/&1_]"],
          variables: [{ "&1": "$l{2;4;5;10}", "&2": "$e[1;&1-1]" }],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Egalit\xE9 de fractions": [
        {
          description: "Compl\xE9ter une \xE9galit\xE9 de fractions",
          subdescription: "Multiplier num\xE9rateur et d\xE9nominateur par le m\xEAme nombre",
          enounces: ["Compl\xE8te avec le nombre manquant."],
          expressions: [
            "&2/&1=?/[_&1*&3_]",
            "&2/&1=[_&2*&3_]/?",
            "?/[_&1*&3_]=&2/&1",
            "[_&2*&3_]/?=&2/&1"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [
            ["[_&2*&3_]"],
            ["[_&1*&3_]"],
            ["[_&2*&3_]"],
            ["[_&1*&3_]"]
          ],
          correctionDetails: [
            [
              {
                text: `$$\\dfrac{&2}{&1} = \\dfrac{&sol}{[_&1*&3_]}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$\\dfrac{&2}{&1} = \\dfrac{[_&2*&3_]}{&sol}$$ car $$&2 \\textcolor{${color1}}{\\times &3} = [_&2*&3_]$$ et $$&1 \\textcolor{${color1}}{\\times &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$\\dfrac{&sol}{[_&1*&3_]} = \\dfrac{&2}{&1}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$\\dfrac{[_&2*&3_]}{&sol}  = \\dfrac{&2}{&1}$$ car $$&2 \\textcolor{${color1}}{\\times &3} = [_&2*&3_]$$ et $$&1 \\textcolor{${color1}}{\\times &3} = &sol $$`
              }
            ]
          ],
          type: "trou",
          defaultDelay: 12e3,
          grade: SIXIEME,
          help: `<section>
          <h3 class="${color2}-text">Compl\xE9ter une \xE9galit\xE9 de fractions</h3>
          <div class="r-stretch d-flex flex-column justify-center">
            $$\\dfrac{5}{4}=\\dfrac{\\ldots}{12}$$
          </div>
          <p>Pour passer de 4 \xE0 12, je multiplie par 3</p>
        </section>
        <section>
          <h3 class="${color2}-text">Compl\xE9ter une \xE9galit\xE9 de fractions</h3>
          <div class="r-stretch d-flex flex-column justify-center">
            $$\\dfrac{5}{4}=\\dfrac{\\textcolor{green}{15}}{12}$$
          </div>
          <p>Donc je multiplie \xE9galement 5 par 4</p>
        </section>`
        },
        {
          description: "Compl\xE9ter une \xE9galit\xE9 de fractions",
          subdescription: "Diviser num\xE9rateur et d\xE9nominateur par le m\xEAme nombre",
          enounces: ["Compl\xE8te avec le  nombre manquant."],
          expressions: [
            "[_&2*&3_]/[_&1*&3_]=?/&1",
            "[_&2*&3_]/[_&1*&3_]=&2/?",
            "?/&1=[_&2*&3_]/[_&1*&3_]",
            "&2/?=[_&2*&3_]/[_&1*&3_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [["&2"], ["&1"], ["&2"], ["&1"]],
          correctionDetails: [
            [
              {
                text: `$$\\dfrac{[_&2*&3_]}{[_&1*&3_]} = \\dfrac{&sol}{&1}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$\\dfrac{[_&2*&3_]}{[_&1*&3_]} = \\dfrac{&2}{&sol}$$ car $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &2$$ et $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$\\dfrac{&sol}{&1}  = \\dfrac{[_&2*&3_]}{[_&1*&3_]}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$\\dfrac{&2}{&sol}  = \\dfrac{[_&2*&3_]}{[_&1*&3_]}$$ car $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &2$$ et $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`
              }
            ]
          ],
          type: "trou",
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Compl\xE9ter une \xE9galit\xE9 de fractions",
          subdescription: "En utilisant le coefficient de proportionnalit\xE9",
          enounces: ["Compl\xE8te avec le  nombre manquant."],
          expressions: [
            "&1/[_&1*&3_]=&2/?",
            "[_&1*&3_]/&1=?/&2",
            "&2/?=&1/[_&1*&3_]",
            "?/&2=[_&1*&3_]/&1"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [["[_&2*&3_]"]],
          correctionDetails: [
            [
              {
                text: `$$\\dfrac{&1}{[_&1*&3_]} = \\dfrac{&2}{&sol}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$ \\dfrac{[_&1*&3_]}{&1}  = \\dfrac{&sol}{&2}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$\\dfrac{&2}{&sol}  = \\dfrac{&1}{[_&1*&3_]}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$ \\dfrac{&sol}{&2} = \\dfrac{[_&1*&3_]}{&1}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`
              }
            ]
          ],
          type: "trou",
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Compl\xE9ter une \xE9galit\xE9 de fractions",
          subdescription: "En utilisant le coefficient de proportionnalit\xE9 (2)",
          enounces: ["Compl\xE8te avec le  nombre manquant."],
          expressions: [
            "&1/[_&1*&3_]=?/[_&2*&3_]",
            "[_&1*&3_]/&1=[_&2*&3_]/?",
            "?/[_&2*&3_]=&1/[_&1*&3_]",
            "[_&2*&3_]/?=[_&1*&3_]/&1"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [["&2"]],
          correctionDetails: [
            [
              {
                text: `$$\\dfrac{&1}{[_&1*&3_]} = \\dfrac{&sol}{[_&2*&3_]}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$ \\dfrac{[_&1*&3_]}{&1}  = \\dfrac{[_&2*&3_]}{&sol}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$\\dfrac{&sol}{[_&2*&3_]}  = \\dfrac{&1}{[_&1*&3_]}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`
              }
            ],
            [
              {
                text: `$$ \\dfrac{[_&2*&3_]}{&sol}  = \\dfrac{[_&1*&3_]}{&1}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`
              }
            ]
          ],
          type: "trou",
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ],
      Simplification: [
        {
          description: "Simplifier une fraction",
          subdescription: "Simplifier par 10; 100; 1000",
          enounces: ["Simplifie le plus possible cette fraction."],
          expressions: ["[_&1*&3_]/[_&2*&4_]"],
          variables: [
            {
              "&1": "$l{10;100;1000}",
              "&2": "$l{10;100;1000}",
              "&3": "$e[1;9]\\{cd&2}",
              "&4": "$e[2;9]\\{cd&1;cd&3}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{[_&1*&3_]}{[_&2*&4_]} &= \\dfrac{[_&1*&3_] \\textcolor{${color1}}{\\div [_mini(&1;&2)_]}}{[_&2*&4_] \\textcolor{${color1}}{\\div [_mini(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Simplifier une fraction",
          subdescription: "Simplifier par 2 ; 3 ou 5",
          enounces: ["Simplifie cette fraction par 2 ; 3 ou 5."],
          expressions: ["[_&1*&2_]/[_&1*&3_]"],
          variables: [
            {
              "&1": "$l{2;3;5}",
              "&2": "$e[1;9]\\{cd&1}",
              "&3": "$e[2;9]\\{cd&1;cd&2}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{[_&1*&2_]}{[_&1*&3_]} &= \\dfrac{[_&1*&2_] \\textcolor{${color1}}{\\div &1}}{[_&1*&3_] \\textcolor{${color1}}{\\div &1}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Simplifier une fraction",
          subdescription: "simplification par 2 ; 3 ; 5 ; 7 ; 11",
          enounces: ["Simplifie cette fraction."],
          expressions: ["[_&1*&2_]/[_&1*&3_]"],
          variables: [
            {
              "&1": "$l{2;3;5;7;11}",
              "&2": "$e[1;9]\\{cd&1}",
              "&3": "$e[2;9]\\{cd&1;cd&2}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{[_&1*&2_]}{[_&1*&3_]} &= \\dfrac{[_&1*&2_] \\textcolor{${color1}}{\\div &1}}{[_&1*&3_] \\textcolor{${color1}}{\\div &1}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Simplifier une fraction",
          subdescription: "La simplification peut se faire en plusieurs \xE9tapes",
          enounces: ["Simplifie le plus possible."],
          expressions: ["[_&2*&3_]/[_&1*&3_]"],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[1;9]\\{&1}", "&3": "$e[2;9]" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{[_&2*&3_]}{[_&1*&3_]} &= \\dfrac{[_&2*&3_] \\textcolor{${color1}}{\\div [_&3*pgcd(&1;&2)_]}}{[_&1*&3_] \\textcolor{${color1}}{\\div  [_&3*pgcd(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Simplifier une fraction",
          enounces: ["Simplifie les signes."],
          expressions: ["(-&1)/&2", "&1/(-&2)", "(-&1)/(-&2)"],
          variables: [{ "&1": "$e[1;9]", "&2": "$e[2;9]\\{cd&1}" }],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Simplifier une fraction",
          subdescription: "Simplifier le plus possible (avec signes)",
          enounces: ["Simplifie le plus possible."],
          expressions: [
            "(-[_&2*&3_])/[_&1*&3_]",
            "[_&2*&3_]/(-[_&1*&3_])",
            "(-[_&2*&3_])/(-[_&1*&3_])"
          ],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[1;9]\\{&1}", "&3": "$e[2;9]" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{-[_&2*&3_]}{[_&1*&3_]} &= -\\dfrac{[_&2*&3_] \\textcolor{${color1}}{\\div [_&3*pgcd(&1;&2)_]}}{[_&1*&3_] \\textcolor{${color1}}{\\div  [_&3*pgcd(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{[_&2*&3_]}{-[_&1*&3_]} &= -\\dfrac{[_&2*&3_] \\textcolor{${color1}}{\\div [_&3*pgcd(&1;&2)_]}}{[_&1*&3_] \\textcolor{${color1}}{\\div  [_&3*pgcd(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{-[_&2*&3_]}{-[_&1*&3_]} &= \\dfrac{[_&2*&3_] \\textcolor{${color1}}{\\div [_&3*pgcd(&1;&2)_]}}{[_&1*&3_] \\textcolor{${color1}}{\\div  [_&3*pgcd(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ],
      Comparer: [
        {
          description: "Comparer deux fractions",
          subdescription: "Fractions de m\xEAme d\xE9nominateur",
          enounces: ["Quelle est la plus petite de ces 2 fractions ?"],
          variables: [
            {
              "&1": "$e[8;19]",
              "&2": "$e[1;&1-1]\\{&1}",
              "&3": "$e[1;&1-1]\\{&1;&2}",
              "&4": "&2/&1",
              "&5": "&3/&1"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[&1+1;3*&1-1]\\{&1}",
              "&3": "$e[&1+1;3*&1-1]\\{&1;&2}",
              "&4": "&2/&1",
              "&5": "&3/&1"
            }
          ],
          choices: [
            [{ text: "$$\\dfrac{&2}{&1}$$" }, { text: "$$\\dfrac{&3}{&1}$$" }]
          ],
          correctionFormat: [
            {
              correct: [
                "Entre $$\\dfrac{&2}{&1}$$ et $$\\dfrac{&3}{&1}$$ la plus petite fraction est &answer"
              ],
              answer: "La plus petite fraction est &answer"
            }
          ],
          correctionDetails: [
            [
              {
                text: "&solution est plus petite que $$\\dfrac{[_maxi(&2;&3)_]}{&1}$$ car les deux fractions ont <b>m\xEAme d\xE9nominateur</b> et $$[_mini(&2;&3)_]<[_maxi(&2;&3)_]$$"
              }
            ]
          ],
          solutions: [["&4<&5 ?? 0 :: 1"]],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Comparer deux fractions",
          subdescription: "Fractions de m\xEAme num\xE9rateur",
          enounces: ["Quelle est la plus petite de ces 2 fractions ?"],
          variables: [
            {
              "&1": "$e[8;19]",
              "&2": "$e[2;&1-1]\\{&1}",
              "&3": "$e[2;&1-1]\\{&1;&2}",
              "&4": "&1/&2",
              "&5": "&1/&3"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[&1+1;3*&1-1]\\{&1}",
              "&3": "$e[&1+1;3*&1-1]\\{&1;&2}",
              "&4": "&1/&2",
              "&5": "&1/&3"
            }
          ],
          choices: [
            [{ text: "$$\\dfrac{&1}{&2}$$" }, { text: "$$\\dfrac{&1}{&3}$$" }]
          ],
          correctionFormat: [
            {
              correct: [
                "Entre $$\\dfrac{&1}{&2}$$ et $$\\dfrac{&1}{&3}$$ la plus petite fraction est &answer"
              ],
              answer: "La plus petite fraction est &answer"
            }
          ],
          correctionDetails: [
            [
              {
                text: "&solution est plus petite que $$\\dfrac{&1}{[_mini(&2;&3)_]}$$ car les deux fractions ont <b>m\xEAme num\xE9rateur</b> et $$[_maxi(&2;&3)_]>[_mini(&2;&3)_]$$"
              }
            ]
          ],
          solutions: [["&4<&5 ?? 0 :: 1"]],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Comparer deux fractions",
          subdescription: "En comparant \xE0 1",
          enounces: ["Quelle est la plus petite de ces 2 fractions ?"],
          variables: [
            {
              "&1": "$e[8;19]",
              "&2": "$e[1;&1-1]",
              "&3": "$e[8;19]\\{&1}",
              "&4": "$e[&3+1;2*&3-1]\\{&2}",
              "&5": "&2/&1",
              "&6": "&4/&3"
            }
          ],
          choices: [
            [{ text: "$$\\dfrac{&2}{&1}$$" }, { text: "$$\\dfrac{&4}{&3}$$" }],
            [{ text: "$$\\dfrac{&4}{&3}$$" }, { text: "$$\\dfrac{&2}{&1}$$" }]
          ],
          correctionFormat: [
            {
              correct: [
                "Entre $$\\dfrac{&2}{&1}$$ et $$\\dfrac{&4}{&3}$$ la plus petite fraction est &answer"
              ],
              answer: "La plus petite fraction est &answer"
            }
          ],
          solutions: [["&5<&6 ?? 0 :: 1"], ["&6<&5 ?? 0 :: 1"]],
          correctionDetails: [
            [
              {
                text: "&solution est plus petite que $$[_maxi(&2/&1;&4/&3)_]$$ car $$[_mini(&2/&1;&4/&3)_]<1$$ et $$[_maxi(&2/&1;&4/&3)_]>1$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Comparer deux fractions",
          subdescription: "Fractions de d\xE9nominateurs multiples l'un de l'autre",
          enounces: ["Quelle est la plus petite de ces 2 fractions ?"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;8]",
              "&3": "$e[&2+1;9]\\{d(&2);m(&2)}",
              "&4": "$e[&2*2;&3*&1-1]\\{&2*&1;d(&3*&1);m(&3*&1)}",
              "&5": "&2/&3",
              "&6": "&4/(&3*&1)"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;8]",
              "&3": "$e[&2+1;9]\\{d(&2);m(&2)}",
              "&4": "$e[&2*&1+1;80]\\{&3*&1;d(&2*&1);m(&2*&1)}",
              "&5": "&3/&2",
              "&6": "&4/(&2*&1)"
            }
          ],
          choices: [
            [
              { text: "$$\\dfrac{&2}{&3}$$" },
              { text: "$$\\dfrac{[_&4_]}{[_&3*&1_]}$$" }
            ],
            [
              { text: "$$\\dfrac{&3}{&2}$$" },
              { text: "$$\\dfrac{[_&4_]}{[_&2*&1_]}$$" }
            ]
          ],
          correctionFormat: [
            {
              correct: [
                "Entre $$\\dfrac{&2}{&3}$$ et $$\\dfrac{[_&4_]}{[_&3*&1_]}$$ la plus petite fraction est &answer"
              ],
              answer: "La plus petite fraction est &answer"
            },
            {
              correct: [
                "Entre $$\\dfrac{&3}{&2}$$ et $$\\dfrac{[_&4_]}{[_&2*&1_]}$$ la plus petite fraction est &answer"
              ],
              answer: "La plus petite fraction est &answer"
            }
          ],
          correctionDetails: [
            [
              {
                text: "@@ &5<&6 ?? $$\\frac{&2}{&3} = \\frac{&2 \\textcolor{${color1}}{\\times &1}}{&3 \\textcolor{${color1}}{\\times &1}} = \\frac{[_&2*&1_]}{[_&3*&1_]}$$ et $$\\frac{[_&2*&1_]}{[_&3*&1_]}<\\frac{&4}{[_&3*&1_]}$$, donc $$&sol <\\frac{&4}{[_&3*&1_]$$@@               @@ &5>&6 ?? $$\\frac{&2}{&3} = \\frac{&2 \\textcolor{${color1}}{\\times &1}}{&3 \\textcolor{${color1}}{\\times &1}} = \\frac{[_&2*&1_]}{[_&3*&1_]}$$ et $$\\frac{[_&2*&1_]}{[_&3*&1_]}>\\frac{&4}{[_&3*&1_]}$$, donc $$\\frac{&2}{&3}>&sol $$@@"
              }
            ],
            [
              {
                text: "@@ &5<&6 ?? $$\\frac{&3}{&2} = \\frac{&3 \\textcolor{${color1}}{\\times &1}}{&2 \\textcolor{${color1}}{\\times &1}} = \\frac{[_&3*&1_]}{[_&2*&1_]}$$ et $$\\frac{[_&3*&1_]}{[_&2*&1_]}<\\frac{&4}{[_&2*&1_]}$$, donc $$&sol <\\frac{&4}{[_&2*&1_]$$@@               @@ &5>&6 ?? $$\\frac{&3}{&2} = \\frac{&3 \\textcolor{${color1}}{\\times &1}}{&2 \\textcolor{${color1}}{\\times &1}} = \\frac{[_&3*&1_]}{[_&2*&1_]}$$ et $$\\frac{[_&3*&1_]}{[_&2*&1_]}>\\frac{&4}{[_&2*&1_]}$$, donc $$\\frac{&3}{&2}>&sol $$@@"
              }
            ]
          ],
          solutions: [["&5<&6 ?? 0 :: 1"]],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ]
    },
    "A trou": {
      "Addition - Soustraction": [
        {
          description: "Compl\xE9ter une addition ou soustraction \xE0 trou",
          subdescription: "Avec des quotients.",
          enounces: ["Compl\xE8te."],
          expressions: [
            "?/&3+&2/&3=[_&1+&2_]/&3",
            "&1/?+&2/&3=[_&1+&2_]/&3",
            "&1/&3+?/&3=[_&1+&2_]/&3",
            "&1/&3-&2/?=[_&1-&2_]/&3",
            "?/&3-&2/&3=[_&1-&2_]/&3",
            "&1/&3-?/&3=[_&1-&2_]/&3"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;19]\\{cd(&1);cd(&2)}"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;19]\\{cd(&1);cd(&2)}"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;19]\\{cd(&1);cd(&2)}"
            },
            {
              "&1": "$e[3;9]",
              "&2": "$e[2;&1-1]",
              "&3": "$e[2;19]\\{cd(&1);cd(&2)}"
            },
            {
              "&1": "$e[3;9]",
              "&2": "$e[2;&1-1]",
              "&3": "$e[2;19]\\{cd(&1);cd(&2)}"
            },
            {
              "&1": "$e[3;9]",
              "&2": "$e[2;&1-1]",
              "&3": "$e[2;19]\\{cd(&1);cd(&2)}"
            }
          ],
          solutions: [["&1"], ["&3"], ["&2"], ["&3"], ["&1"], ["&2"]],
          type: "trou",
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Compl\xE9ter une addition ou soustraction \xE0 trou",
          subdescription: "Quotients avec nombres relatifs",
          enounces: ["Compl\xE8te cette \xE9galit\xE9 avec le  nombre manquant."],
          expressions: [
            "?/&3+{&2}/&3=[_&1+(&2)_]/&3",
            "{&1}/?+{&2}/&3=[_&1+(&2)_]/&3",
            "{&1}/&3+?/&3=[_&1+(&2)_]/&3",
            "{&1}/&3-{&2}/?=[_&1-(&2)_]/&3",
            "?/&3-{&2}/&3=[_&1-(&2)_]/&3",
            "{&1}/&3-?/&3=[_&1-(&2)_]/&3"
          ],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[2;9]",
              "&3": "$e[2;19]\\{cd(&1);cd(&2)}"
            }
          ],
          solutions: [["&1"], ["&3"], ["&2"], ["&3"], ["&1"], ["&2"]],
          type: "trou",
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ],
      Multiplication: [
        {
          description: "Compl\xE9ter une \xE9galit\xE9 une multiplication \xE0 trou",
          subdescription: "Avec des quotients. Nombres positifs.",
          enounces: ["Compl\xE8te."],
          expressions: [
            "(?/&3)*(&2/&4)=[_&1*&2_]/[_&3*&4_]",
            "(&1/?)*(&2/&4)=[_&1*&2_]/[_&3*&4_]",
            "(&1/&3)*(?/&4)=[_&1*&2_]/[_&3*&4_]",
            "(&1/&3)*(&2/?)=[_&1*&2_]/[_&3*&4_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{&1;&2}",
              "&4": "$e[2;9]\\{&1;&2}"
            }
          ],
          solutions: [["&1"], ["&3"], ["&2"], ["&4"]],
          type: "trou",
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Compl\xE9ter une multiplication \xE0 trou",
          subdescription: "Quotients avec nombres relatifs",
          enounces: ["Compl\xE8te."],
          expressions: [
            "(?/(&3))*((&2)/(&4))=[_(&1*(&2))/(&3*(&4))_]",
            "((&1)/?)*((&2)/(&4))=[_&1*(&2)/(&3*(&4))_]",
            "((&1)/(&3))*(?/(&4))=[_&1*(&2)/(&3*(&4))_]",
            "((&1)/(&3))*((&2)/?)=[_&1*(&2)/(&3*(&4))_]"
          ],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[2;9]",
              "&3": "$er[2;9]\\{cd(&1);cd(&2)}",
              "&4": "$er[2;9]\\{cd(&1);cd(&2)}"
            }
          ],
          solutions: [["&1"], ["&3"], ["&2"], ["&4"]],
          type: "trou",
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ]
    },
    Calculer: {
      "Addition et Soustraction": [
        {
          description: "Additionner des fractions",
          subdescription: "Fractions d\xE9cimales.",
          enounces: ["Calcule."],
          expressions: ["&1/10+&2/10", "&1/10+&2/10+&3/10", "&1/100+&2/100"],
          variables: [
            {
              "&1": "$e[2;13]",
              "&2": "$e[2;13]"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]"
            },
            {
              "&1": "$e[1;80]",
              "&2": "$e[1;50]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{10}}+\\dfrac{&2}{\\textcolor{${color1}}{10}} &= \\dfrac{&1+&2}{\\textcolor{${color1}}{10}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{10}}+\\dfrac{&2}{\\textcolor{${color1}}{10}}+\\dfrac{&3}{\\textcolor{${color1}}{10}} &= \\dfrac{&1+&2+&3}{\\textcolor{${color1}}{10}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{100}}+\\dfrac{&2}{\\textcolor{${color1}}{100}} &= \\dfrac{&1+&2}{\\textcolor{${color1}}{100}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: CM1
        },
        {
          description: "Additionner des fractions",
          subdescription: "Fractions de m\xEAme d\xE9nominateur, nombres positifs, sans simplification",
          enounces: ["Calcule."],
          expressions: ["&1/&3+&2/&3"],
          variables: [
            {
              "&1": "$e[2;13]",
              "&2": "$e[2;13]",
              "&3": "$e[2;25]\\{cd(&1);cd(&2);cd(&2+&1)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{&3}}+\\dfrac{&2}{\\textcolor{${color1}}{&3}} &= \\dfrac{&1+&2}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: SIXIEME
        },
        {
          description: "Additionner ou soustraire des fractions",
          subdescription: "Fractions de m\xEAme d\xE9nominateur, nombres positifs, sans simplification",
          enounces: ["Calcule."],
          expressions: ["&1/&3+&2/&3", "&1/&3-&2/&3"],
          variables: [
            {
              "&1": "$e[2;13]",
              "&2": "$e[2;13]",
              "&3": "$e[2;25]\\{cd(&1);cd(&2);cd(&2+&1)}"
            },
            {
              "&1": "$e[3;13]",
              "&2": "$e[2;&1-1]",
              "&3": "$e[2;25]\\{cd(&1);cd(&2);cd(&1-&2)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{&3}}+\\dfrac{&2}{\\textcolor{${color1}}{&3}} &= \\dfrac{&1+&2}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{&3}}-\\dfrac{&2}{\\textcolor{${color1}}{&3}} &= \\dfrac{&1-&2}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Additionner ou soustraire",
          subdescription: "D\xE9nominateur multiple de l'autre, nombres positifs, sans simplification",
          enounces: ["Calcule."],
          expressions: [
            "&1/&3+&2/[_&3*&4_]",
            "&2/[_&3*&4_]+&1/&3",
            "&1/&3-&2/[_&3*&4_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&1);cd(&2)}",
              "&4": "$e[2;9]\\{cd(&2)}"
            }
          ],
          conditions: [
            "pgcd(&1*&4+&2;&3*&4)=1",
            "pgcd(&1*&4+&2;&3*&4)=1",
            "&1*&4>&2 && pgcd(&1*&4-&2;&3*&4)=1"
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{&3} + \\dfrac{&2}{[_&3*&4_]} &= \\dfrac{&1\\textcolor{${color2}}{\\times &4}}{&3\\textcolor{${color2}}{\\times &4}} + \\dfrac{&2}{[_&3*&4_]} \\\\ &= \\dfrac{[_&1*&4_]}{\\textcolor{${color1}}{[_&3*&4_]}} + \\dfrac{&2}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= \\dfrac{[_&1*&4_]+&2}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{&2}{[_&3*&4_]} + \\dfrac{&1}{&3} &= \\dfrac{&2}{[_&3*&4_]} + \\dfrac{&1\\textcolor{${color2}}{\\times &4}}{&3\\textcolor{${color2}}{\\times &4}} \\\\ &= \\dfrac{&2}{\\textcolor{${color1}}{[_&3*&4_]}} + \\dfrac{[_&1*&4_]}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= \\dfrac{&2+[_&1*&4_]}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{&3} - \\dfrac{&2}{[_&3*&4_]} &= \\dfrac{&1\\textcolor{${color2}}{\\times &4}}{&3\\textcolor{${color2}}{\\times &4}} - \\dfrac{&2}{[_&3*&4_]} \\\\ &= \\dfrac{[_&1*&4_]}{\\textcolor{${color1}}{[_&3*&4_]}} - \\dfrac{&2}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= \\dfrac{[_&1*&4_]-&2}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Additionner ou soustraire",
          subdescription: "D\xE9nominateur multiple de l'autre, nombres positifs, simplification initiale",
          enounces: ["Calcule en simplifiant d'abord une des 2 fractions"],
          expressions: [
            "&1/&3+[_&2*&4_]/[_&3*&4_]",
            "[_&2*&4_]/[_&3*&4_]+&1/&3"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&1);cd(&2)}",
              "&4": "$e[2;9]\\{cd(&2);cd(&3)}"
            }
          ],
          conditions: ["pgcd(&1+&2;&3)=1"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{&3} + \\dfrac{[_&2*&4_]}{[_&3*&4_]} &= \\dfrac{&1}{&3} + \\dfrac{[_&2*&4_]\\textcolor{${color2}}{\\div &4}}{[_&3*&4_]\\textcolor{${color2}}{\\div &4}} \\\\ &= \\dfrac{&1}{\\textcolor{${color1}}{&3}} + \\dfrac{&2}{\\textcolor{${color1}}{&3}} \\\\ &= \\dfrac{&1+&2}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{[_&2*&4_]}{[_&3*&4_]} + \\dfrac{&1}{&3} &= \\dfrac{[_&2*&4_]\\textcolor{${color2}}{\\div &4}}{[_&3*&4_]\\textcolor{${color2}}{\\div &4}} + \\dfrac{&1}{&3} \\\\ &= \\dfrac{&2}{\\textcolor{${color1}}{&3}} + \\dfrac{&1}{\\textcolor{${color1}}{&3}} \\\\ &= \\dfrac{&2+&1}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Additionner ou soustraire",
          subdescription: "Un entier et une fraction",
          enounces: ["Calcule."],
          expressions: ["&2/&1+&3", "&3+&2/&1"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{cd&1}",
              "&3": "$e[2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{&2}{&1} + &3 &= \\dfrac{&2}{&1} + \\dfrac{&3\\textcolor{${color2}}{\\times &1}}{\\textcolor{${color2}}{&1}} \\\\ &= \\dfrac{&2}{\\textcolor{${color1}}{&1}} + \\dfrac{[_&3*&1_]}{\\textcolor{${color1}}{&1}} \\\\ &= \\dfrac{&2+[_&3*&1_]}{\\textcolor{${color1}}{[_&1_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 + \\dfrac{&2}{&1} &= \\dfrac{&3\\textcolor{${color2}}{\\times &1}}{\\textcolor{${color2}}{&1}} + \\dfrac{&2}{&1} \\\\ &= \\dfrac{[_&3*&1_]}{\\textcolor{${color1}}{&1}} + \\dfrac{&2}{\\textcolor{${color1}}{&1}} \\\\ &= \\dfrac{[_&3*&1_]+&2}{\\textcolor{${color1}}{[_&1_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Additionner ou soustraire",
          subdescription: "Fractions de m\xEAme d\xE9nominateur, nombres positifs, simplification intermediaire possible, simplification finale",
          enounces: ["Calcule."],
          expressions: [
            "[_&2*&4_]/[_&1*&3_]+[_(&1-&2)*&4_]/[_&1*&3_]",
            "[_&1*&4_]/[_&2*&3_]-[_(&1-&2)*&4_]/[_&2*&3_]"
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{[_&2*&4_]}{\\textcolor{${color1}}{[_&1*&3_]}} + \\dfrac{[_(&1-&2)*&4_]}{\\textcolor{${color1}}{[_&1*&3_]}} &= \\dfrac{[_&2*&4_]+[_(&1-&2)*&4_]}{\\textcolor{${color1}}{[_&1*&3_]}} \\\\ &= \\dfrac{[_&1*&4_]}{[_&1*&3_]} \\\\ &=  \\dfrac{[_&1*&4_]\\textcolor{${color2}}{\\div [_pgcd(&1*&3;&1*&4)_]}}{[_&1*&3_]\\textcolor{${color2}}{\\div [_pgcd(&1*&3;&1*&4)_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\dfrac{[_&1*&4_]}{\\textcolor{${color1}}{[_&2*&3_]}} - \\dfrac{[_(&1-&2)*&4_]}{\\textcolor{${color1}}{[_&2*&3_]}} &= \\dfrac{[_&1*&4_]-[_(&1-&2)*&4_]}{\\textcolor{${color1}}{[_&2*&3_]}} \\\\ &= \\dfrac{[_&2*&4_]}{[_&2*&3_]} \\\\ &=  \\dfrac{[_&2*&4_]\\textcolor{${color2}}{\\div [_pgcd(&2*&3;&2*&4)_]}}{[_&2*&3_]\\textcolor{${color2}}{\\div [_pgcd(&2*&3;&2*&4)_]}} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          variables: [
            {
              "&1": "$e[3;9]",
              "&2": "$e[2;&1-1]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]\\{&3}"
            }
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ],
      "Fraction d'une quantit\xE9": [
        {
          description: "Calculer une fraction d'une quantit\xE9",
          enounces: ["Calculer $$\\dfrac{&2}{&3}$$ de $$[_&1*&3_]$$"],
          solutions: [["[_&1*&2_]"]],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]\\{cd(&2)}" }
          ],
          correctionFormat: [
            {
              correct: [
                "$$\\dfrac{&2}{&3}$$ de $$[_&1*&3_]$$ est \xE9gal \xE0 &answer"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{\\textcolor{${color1}}{&2}}{\\textcolor{${color2}}{&3}} \\text{ de } [_&1*&3_] &= [_&1*&3_]\\textcolor{${color2}}{\\div &3} \\textcolor{${color1}}{\\times &2} \\\\ &= &1 \\times &2 \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Calculer une fraction d'une quantit\xE9",
          subdescription: "Dans les 2 sens",
          expressions: ["(&2/&3)*[_&1*&3_]", "[_&1*&3_]*(&2/&3)"],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]\\{cd(&2)}" }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{\\textcolor{${color1}}{&2}}{\\textcolor{${color2}}{&3}} \\times [_&1*&3_] &= [_&1*&3_]\\textcolor{${color2}}{\\div &3} \\textcolor{${color1}}{\\times &2} \\\\ &= &1 \\textcolor{${color1}}{\\times &2} \\\\ &= &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} [_&1*&3_] \\times \\dfrac{\\textcolor{${color1}}{&2}}{\\textcolor{${color2}}{&3}}  &= [_&1*&3_]\\textcolor{${color2}}{\\div &3} \\textcolor{${color1}}{\\times &2} \\\\ &= &1 \\textcolor{${color1}}{\\times &2} \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        },
        {
          description: "Calculer une fraction d'une quantit\xE9",
          subdescription: "En prenant la forme d\xE9cimale de la fraction",
          enounces: ["Calcule."],
          expressions: ["{[_&2*&3_]/&3}*&1}", "&1*{[_&2*&3_]/&3}"],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;9]", "&3": "$e[2;9]\\{cd(&1)}" }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\dfrac{[_&2*&3_]}{&3} \\times &1 &= [_&2*&3_] \\div &3 \\times &1 \\\\ &= &2 \\times &1 \\\\ &= &sol  \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} &1 \\times \\dfrac{[_&2*&3_]}{&3} &= &1 \\times \\left([_&2*&3_] \\div &3 \\right) \\\\ &= &1 \\times &2 \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: CINQUIEME
        }
      ],
      Multiplication: [
        {
          description: "Calculer un produit",
          subdescription: "un entier par un quotient de num\xE9rateur 1",
          expressions: ["&1*{1/&2}", "{1/&2}*&1"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;10]\\{cd(&1)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} &1 \\times \\dfrac{1}{&2} &= \\dfrac{&1 \\times 1}{&2} \\\\ &= &sol  \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} \\dfrac{1}{&2} \\times &1 &= \\dfrac{1 \\times &1}{&2} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Calculer un produit",
          subdescription: "un entier par un quotient",
          expressions: ["&1*{&3/&2}", "{&3/&2}*&1}"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;10]\\{cd(&1)}",
              "&3": "$e[2;9]\\{cd(&2)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} &1 \\times \\dfrac{&3}{&2} &= \\dfrac{&1 \\times &3}{&2} \\\\ &= &sol  \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} \\dfrac{&3}{&2} \\times &1 &= \\dfrac{&3 \\times &1}{&2} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: CM1
        },
        {
          description: "Calculer un produit",
          subdescription: "Pas de simplification",
          expressions: ["{&1/&3}*{&2/&4}"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&2);cd(&1)}",
              "&4": "$e[2;9]\\{cd(&2);cd(&1)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\dfrac{&1}{&3} \\times \\dfrac{&2}{&4} &= \\dfrac{&1 \\times &2}{&3 \\times &4} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer un produit",
          subdescription: "avec simplification simple",
          enounces: ["Calcule en remarquant la simplification."],
          expressions: ["{&1/&3}*{&2/&1}", "{&3/&1}*{&1/&2}"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{&1}",
              "&3": "$e[2;9]\\{&1;cd&2}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\dfrac{&1}{&3} \\times \\dfrac{&2}{&1} &= \\dfrac{&sol  \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} \\dfrac{&3}{&1} \\times \\dfrac{&1}{&2} &= \\dfrac{&3}{&sol  \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer un produit",
          subdescription: "avec peut-\xEAtre une simplification simple",
          enounces: [""],
          expressions: ["(&1/&3)*(&2/&4)}"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]",
              "&5": "pgcd(&1*&2;&3*&4)"
            }
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer un produit",
          subdescription: "Nombres, relatifs, pas de simplification",
          expressions: [
            "(&1/&3)*(&2/&4)",
            "((-&1)/&3)*(&2/&4)",
            "(&1/(-&3))*(&2/&4)",
            "(&1/&3)*((-&2)/&4)",
            "(&1/&3)*(&2/(-&4))",
            "((-&1)/(-&3))*((-&2)/(-&4))",
            "((-&1)/(-&3))*(&2/&4)",
            "(&1/&3)*((-&2)/(-&4))",
            "((-&1)/&3)*((-&2)/&4)",
            "(&1/(-&3))*(&2/(-&4))",
            "((-&1)/&3)*(&2/(-&4))",
            "(&1/(-&3))*((-&2)/&4)",
            "(&1/(-&3))*((-&2)/(-&4))",
            "((-&1)/(-&3))*(&2/(-&4))",
            "((-&1)/&3)*((-&2)/(-&4))",
            "((-&1)/(-&3))*((-&2)/&4)"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&2);cd(&1)}",
              "&4": "$e[2;9]\\{cd(&2);cd(&1)}"
            }
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ],
      Inverse: [
        {
          description: "Calculer l'inverse d'un nombre",
          enounces: [
            "Quel est l'inverse de $$&1$$",
            "Quel est l'inverse de $$\\dfrac{1}{&1}$$",
            "Quel est l'inverse de $$\\dfrac{&1}{&2}$$"
          ],
          options: ["no-exp"],
          expressions: ["&1", "1/&1", "&1/&2"],
          variables: [{ "&1": "$e[2;19]", "&2": "$e[2;19]\\{cd(&1)}" }],
          solutions: [["1/&1"], ["&1"], ["&2/&1"]],
          correctionFormat: [
            {
              correct: ["L'inverse de &expression est &answer"]
            }
          ],
          type: "rewrite",
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer l'inverse d'un nombre",
          subdescription: "Avec la notation puissance",
          expressions: ["&1^(-1)", "(1/&1)^(-1)", "(&1/&2)^(-1)"],
          variables: [{ "&1": "$e[2;19]", "&2": "$e[2;19]\\{cd(&1)}" }],
          solutions: [["1/&1"], ["&1"], ["&2/&1"]],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ],
      Division: [
        {
          description: "Calculer un quotient",
          subdescription: "Pas de simplification, avec le symbole de la division",
          expressions: ["{&1/&3}:{&4/&2}"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&2);cd(&1)}",
              "&4": "$e[2;9]\\{cd(&2);cd(&1)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{&3} \\textcolor{${color1}}{\\div \\dfrac{&4}{&2}} &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\times \\dfrac{&2}{&4}} \\\\ &= \\dfrac{&1 \\times &2}{&3 \\times &4}  \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer un quotient",
          subdescription: "Division par un entier, avec le symbole de la division",
          expressions: ["{&1/&3}:&2"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$e[2;9]\\{cd(&1)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{&1}{&3} \\textcolor{${color1}}{\\div &2} &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\div \\dfrac{&2}{1}} \\\\ &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\times \\dfrac{1}{&2}} \\\\&= \\dfrac{&1 \\times 1}{&3 \\times &2}  \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer un quotient",
          subdescription: "Pas de simplification",
          expressions: ["{&1/&3}/{&4/&2}"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&2);cd(&1)}",
              "&4": "$e[2;9]\\{cd(&2);cd(&1)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{\\dfrac{&1}{&3}}{\\textcolor{${color1}}{\\dfrac{&4}{&2}}} &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\times \\dfrac{&2}{&4}} \\\\ &= \\dfrac{&1 \\times &2}{&3 \\times &4}  \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer un quotient",
          subdescription: "Division par un entier, avec fraction",
          expressions: ["{&1/&3}/&2"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$e[2;9]\\{cd(&1)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} \\dfrac{\\dfrac{&1}{&3}}{\\textcolor{${color1}}{&2}} &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\div \\dfrac{&2}{1}} \\\\ &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\times \\dfrac{1}{&2}} \\\\ &= \\dfrac{&1 \\times 1}{&3 \\times &2}  \\\\ &= &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ]
    }
  },
  Puissances: {
    Apprivoiser: {
      D\u00E9finition: [
        {
          description: "Traduire un produit en puissance",
          enounces: ["R\xE9\xE9cris cette expression \xE0 l'aide d'une puissance"],
          expressions: [
            "&1*&1",
            "&1*&1*&1",
            "&1*&1*&1*&1",
            "&1*&1*&1*&1*&1",
            "&1*&1*&1*&1*&1*&1",
            "&1*&1*&1*&1*&1*&1*&1"
          ],
          variables: [{ "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}" }],
          solutions: [
            ["&1^2"],
            ["&1^3"],
            ["&1^4"],
            ["&1^5"],
            ["&1^6"],
            ["&1^7"]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Traduire une puissance en produit",
          enounces: ["R\xE9\xE9cris cette expression \xE0 l'aide d'un produit"],
          expressions: ["&1^2", "&1^3", "&1^4", "&1^5", "&1^6", "&1^7"],
          variables: [{ "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}" }],
          solutions: [
            ["&1*&1"],
            ["&1*&1*&1"],
            ["&1*&1*&1*&1"],
            ["&1*&1*&1*&1*&1"],
            ["&1*&1*&1*&1*&1*&1"],
            ["&1*&1*&1*&1*&1*&1*&1"]
          ],
          options: ["no-penalty-for-explicit-products"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "D\xE9finition d'une puissance \xE0 exposant n\xE9gatif",
          enounces: ["Ecris la d\xE9finition de cette puissance."],
          expressions: ["&1^(-&2)"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}",
              "&2": "$e[2;9]"
            }
          ],
          solutions: [["1/(&1^&2)"]],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Puissances de 10",
          enounces: ["Ecris cette puissance sous forme d\xE9cimale."],
          expressions: ["10^{&1}"],
          variables: [
            {
              "&1": "$er[0;5]"
            }
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ],
      "Puissances de 10": [
        {
          description: "Ecrire un nombre entier \xE0 l'aide d'une puissance de 10",
          subdescription: "de la forme avec puissances de 10 \xE0 la forme d\xE9cimale.",
          enounces: ["Ecris ce nombre sous la forme d'un seul nombre entier."],
          expressions: ["&2*10^{&1}"],
          variables: [
            {
              "&1": "$e[0;5]",
              "&2": "$e[2;9]"
            }
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Ecrire un nombre entier \xE0 l'aide d'une puissance de 10",
          subdescription: "De la forme d\xE9cimale \xE0 la forme avec puissances de 10.",
          enounces: ["Ecris ce nombre \xE0 l'aide d'une puissance de 10."],
          enounces2: ["Exemple : $$400 = 4\\times 10^2$$"],
          expressions: ["[_&2*10^{&1}_]"],
          solutions: [["&2*10^{&1}"]],
          variables: [
            {
              "&1": "$e[1;5]",
              "&2": "$e[2;9]"
            }
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ],
      "Notation scientifique": [
        {
          description: "Ecrire un nombre d\xE9cimal \xE0 l'aide de la notation scientifique",
          enounces: ["Ecris ce nombre en notation scientifique."],
          expressions: ["[._&1,&3*10^{&4}_]"],
          solutions: [["&1,&3*10^{&4}"]],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;3]",
              "&3": "$e{&2;&2}",
              "&4": "$er[2;4]"
            }
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Ecrire un nombre \xE9crit avec une puissance de 10 \xE0 l'aide de la notation scientifique",
          enounces: ["Ecris ce nombre en notation scientifique."],
          expressions: ["[._&1,&3*10^{&4}_]*10^{&5}"],
          solutions: [["&1,&3*10^{[_&4+(&5)_]}"]],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;3]",
              "&3": "$e{&2;&2}\\{m(10)}",
              "&4": "$er[2;4]",
              "&5": "$er[2;4]\\{-(&4)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[._&1,&3*10^{&4}_] \\times 10^{&5}=&1,&3 \\times 10^{&4} \\times 10^{&5}=$$ &solution"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ]
    },
    Calculer: {
      Multiplier: [
        {
          description: "Multiplier 2 puissances de 10.",
          subdescription: "Exposants positifs",
          enounces: [
            "Simplifie en \xE9crivant sous la forme d'une seule puissance de 10."
          ],
          expressions: ["10^&2*10^&3"],
          variables: [
            {
              "&2": "$e[1;9]",
              "&3": "$e[1;9]"
            }
          ],
          solutions: [["10^[_&2+&3_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} 10^&2 \\times 10^&3 &= 10^{&2+&3} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Multiplier 2 puissances d'un m\xEAme nombre.",
          subdescription: "Exposants positifs",
          enounces: [
            "Calcule en \xE9crivant le r\xE9sultat sous la forme d'une puissance."
          ],
          expressions: ["&1^&2*&1^&3"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}",
              "&2": "$e[2;5]",
              "&3": "$e[2;5]"
            }
          ],
          solutions: [["&1^[_&2+&3_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} &1^&2 \\times &1^&3 &= &1^{&2+&3} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Multiplier 2 puissances de 10",
          subdescription: "Exposants relatifs",
          enounces: ["Ecris sous la forme d'une seule puissance de 10."],
          expressions: ["10^{&1}*10^{&2}"],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[2;5]"
            }
          ],
          solutions: [["10^{[_&1+(&2)_]}"]],
          conditions: ["abs(&1+(&2))>1"],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} 10^{&1} \\times 10^{&2} &= 10^{&1[+_&2_]} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Multiplier 2 puissances d'un m\xEAme nombre.",
          subdescription: "Exposants relatifs",
          enounces: [
            "Calcule en \xE9crivant le r\xE9sultat sous la forme d'une puissance."
          ],
          expressions: ["&1^{&2}*&1^{&3}"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}",
              "&2": "$er[2;5]",
              "&3": "$er[2;5]\\{-(&2)}"
            }
          ],
          conditions: ["abs(&2+(&3))>1"],
          solutions: [["&1^{[_&2+(&3)_]}"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} &1^{&2} \\times &1^{&3} &= &1^{&2[+_&3_]} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 60,
          grade: QUATRIEME
        }
      ],
      Diviser: [
        {
          description: "Diviser 2 puissances de 10.",
          subdescription: "Exposants positifs",
          enounces: ["R\xE9\xE9cris sous la forme d'une seule puissance de 10."],
          expressions: ["{10^&1}/{10^&2}"],
          variables: [
            {
              "&1": "$e[4;10]",
              "&2": "$e[2;&1-2]"
            }
          ],
          solutions: [["10^[_&1-&2_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\frac{10^{&1}}{10^{&2}} &= 10^{&1[+_-&2_]} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Diviser 2 puissances d'un m\xEAme nombre.",
          subdescription: "Exposants positifs",
          enounces: [
            "Calcule en \xE9crivant le r\xE9sultat sous la forme d'une puissance."
          ],
          expressions: ["{&1^&2}/{&1^&3}"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}",
              "&2": "$e[4;10]",
              "&3": "$e[2;&2-2]"
            }
          ],
          solutions: [["&1^[_&2-&3_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\frac{&1^{&2}}{&1^{&3}} &= &1^{&2[+_-&3_]} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: TROISIEME
        },
        {
          description: "Diviser 2 puissances de 10.",
          subdescription: "Exposants relatifs",
          enounces: ["R\xE9\xE9cris sous la forme d'une seule puissance de 10."],
          expressions: ["{10^{&1}}/{10^{&2}}"],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[2;5]"
            }
          ],
          conditions: ["abs(&1-(&2))>1"],
          solutions: [["10^{[_&1-(&2)_]}"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\frac{10^{&1}}{10^{&2}} &= 10^{&1[+_-(&2)_]} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Diviser 2 puissances d'un m\xEAme nombre.",
          subdescription: "Exposants relatifs",
          enounces: [
            "Calcule en \xE9crivant le r\xE9sultat sous la forme d'une puissance."
          ],
          expressions: ["{&1^{&2}}/{&1^{&3}}"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}",
              "&2": "$er[2;5]",
              "&3": "$er[2;5]"
            }
          ],
          conditions: ["abs(&2-(&3))>1"],
          solutions: [["&1^{[_&2-(&3)_]}"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\frac{&1^{&2}}{&1^{&3}} &= &1^{&2[+_-(&3)_]} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: TROISIEME
        }
      ],
      "Puissance de puissance": [
        {
          description: "Puissance d'une puissance de 10",
          subdescription: "Exposants positifs",
          enounces: ["R\xE9\xE9cris sous la forme d'une seule puissance de 10."],
          expressions: ["(10^&1)^&2"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]"
            }
          ],
          solutions: [["10^{[_&1*&2_]}"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\left(10^&1\\right)^&2 &= 10^{&1 \\times &2} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Puissance d'une puissance",
          subdescription: "Exposants positifs",
          enounces: [
            "Calcule en \xE9crivant le r\xE9sultat sous la forme d'une puissance."
          ],
          expressions: ["(&1^&2)^&3"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [["&1^{[_&2*&3_]}"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\left(&1^&2\\right)^&3 &= &1^{&2 \\times &3} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Puissance d'une puissance de 10",
          subdescription: "Exposants relatifs",
          enounces: ["R\xE9\xE9cris sous la forme d'une seule puissance de 10."],
          expressions: ["(10^{&1})^{&2}"],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$e[2;9]"
            },
            {
              "&1": "$er[2;9]",
              "&2": "-$e[2;9]"
            }
          ],
          solutions: [["10^{[_&1*(&2)_]}"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\left(10^{&1}\\right)^{&2} &= 10^{&1 \\times &2} \\\\ &= &sol  \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} \\left(10^{&1}\\right)^{&2} &= 10^{&1 \\times (&2)} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Puissance d'une puissance",
          subdescription: "Exposants relatifs",
          enounces: [
            "Calcule en \xE9crivant le r\xE9sultat sous la forme d'une puissance."
          ],
          expressions: ["(&1^{&2})^{&3}"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}",
              "&2": "$er[2;9]",
              "&3": "$e[2;9]"
            },
            {
              "&1": "$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}",
              "&2": "$er[2;9]",
              "&3": "-$e[2;9]"
            }
          ],
          solutions: [["&1^{[_&2*(&3)_]}"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\left(&1^{&2}\\right)^{&3} &= &1^{&2 \\times &3} \\\\ &= &sol  \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} \\left(&1^{&2}\\right)^{&3} &= &1^{&2 \\times (&3)} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-brackets"],
          defaultDelay: 20,
          grade: TROISIEME
        }
      ],
      "Mixer tout \xE7a": [
        {
          description: "Multiplier et diviser des puissances de 10.",
          subdescription: "Exposants positifs",
          enounces: ["R\xE9\xE9cris sous la forme d'une seule puissance de 10."],
          expressions: ["{10^&1*10^&2}/{10^&3}", "{10^&3}/{10^&1*10^&2}"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;&1+&2-2]"
            },
            {
              "&1": "$e[2;4]",
              "&2": "$e[2;3]",
              "&3": "$e[&1+&2+2;9]"
            }
          ],
          solutions: [["10^[_&1+&2-&3_]"], ["10^[_&3-&1-&2_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\frac{10^{&1}\\times 10^{&2}}{10^{&3}} &= 10^{&1+&2-&3} \\\\ &= &sol  \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align} \\frac{10^{&3}}{10^{&1} \\times 10^{&2}} &= 10^{&3-(&1+&2)} \\\\ &= &sol  \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ]
    }
  },
  Grandeurs: {
    Unit\u00E9s: {
      "Unit\xE9s simples": [
        {
          description: "Convertir dans une autre unit\xE9",
          subdescription: "Conversion vers l'unit\xE9 de r\xE9f\xE9rence",
          enounces: ["Convertis dans l'unit\xE9 demand\xE9e."],
          variables: [
            {
              "&1": "$e[1;9]"
            }
          ],
          expressions: [
            "&1 km = ? m",
            "&1 hm = ? m",
            "&1 dam = ? m",
            "&1 dm = ? m",
            "&1 cm = ? m",
            "&1 mm = ? m",
            "&1 kL = ? L",
            "&1 hL = ? L",
            "&1 daL = ? L",
            "&1 dL = ? L",
            "&1 cL = ? L",
            "&1 mL = ? L",
            "&1 kg = ? g",
            "&1 hg = ? g",
            "&1 dag = ? g",
            "&1 dg = ? g",
            "&1 cg = ? g",
            "&1 mg = ? g"
          ],
          solutions: [
            ["[._&1*1000_]"],
            ["[._&1*100_]"],
            ["[._&1*10_]"],
            ["[._&1*0.1_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.001_]"],
            ["[._&1*1000_]"],
            ["[._&1*100_]"],
            ["[._&1*10_]"],
            ["[._&1*0.1_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.001_]"],
            ["[._&1*1000_]"],
            ["[._&1*100_]"],
            ["[._&1*10_]"],
            ["[._&1*0.1_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.001_]"]
          ],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir dans une autre unit\xE9",
          subdescription: "Autres conversions",
          enounces: ["Convertis dans l'unit\xE9 demand\xE9e."],
          variables: [
            {
              "&1": "$e[1;9]"
            }
          ],
          expressions: [
            "&1 km = ? mm",
            "&1 km = ? cm",
            "&1 km = ? dm",
            "&1 km = ? m",
            "&1 km = ? dam",
            "&1 km = ? hm",
            "&1 hm = ? mm",
            "&1 hm = ? cm",
            "&1 hm = ? dm",
            "&1 hm = ? m",
            "&1 hm = ? dam",
            "&1 dam = ? mm",
            "&1 dam = ? cm",
            "&1 dam = ? dm",
            "&1 dam = ? m",
            "&1 m = ? mm",
            "&1 m = ? cm",
            "&1 m = ? dm",
            "&1 dm = ? mm",
            "&1 dm = ? cm",
            "&1 cm = ? mm",
            "&1 mm = ? km",
            "&1 cm = ? km ",
            "&1 dm = ? km",
            "&1 m = ? km",
            "&1 dam = ? km",
            "&1 hm = ? km",
            "&1 mm = ? hm",
            "&1 cm = ? hm",
            "&1 dm = ? hm",
            "&1 m = ? hm",
            "&1 dam = ? hm",
            "&1 mm = ? dam",
            "&1 cm = ? dam",
            "&1 dm = ? dam",
            "&1 m = ? dam",
            "&1 mm = ? m",
            "&1 cm = ? m",
            "&1 dm = ? m",
            "&1 mm = ? dm",
            "&1 cm = ? dm",
            "&1 mm = ? cm",
            "&1 kg = ? mg",
            "&1 kg = ? cg",
            "&1 kg = ? dg",
            "&1 kg = ? g",
            "&1 kg = ? dag",
            "&1 kg = ? hg",
            "&1 hg = ? mg",
            "&1 hg = ? cg",
            "&1 hg = ? dg",
            "&1 hg = ? g",
            "&1 hg = ? dag",
            "&1 dag = ? mg",
            "&1 dag = ? cg",
            "&1 dag = ? dg",
            "&1 dag = ? g",
            "&1 g = ? mg",
            "&1 g = ? cg",
            "&1 g = ? dg",
            "&1 dg = ? mg",
            "&1 dg = ? cg",
            "&1 cg = ? mg",
            "&1 mg = ? kg",
            "&1 cg = ? kg ",
            "&1 dg = ? kg",
            "&1 g = ? kg",
            "&1 dag = ? kg",
            "&1 hg = ? kg",
            "&1 mg = ? hg",
            "&1 cg = ? hg",
            "&1 dg = ? hg",
            "&1 g = ? hg",
            "&1 dag = ? hg",
            "&1 mg = ? dag",
            "&1 cg = ? dag",
            "&1 dg = ? dag",
            "&1 g = ? dag",
            "&1 mg = ? g",
            "&1 cg = ? g",
            "&1 dg = ? g",
            "&1 mg = ? dg",
            "&1 cg = ? dg",
            "&1 mg = ? cg",
            "&1 kL = ? mL",
            "&1 kL = ? cL",
            "&1 kL = ? dL",
            "&1 kL = ? L",
            "&1 kL = ? daL",
            "&1 kL = ? hL",
            "&1 hL = ? mL",
            "&1 hL = ? cL",
            "&1 hL = ? dL",
            "&1 hL = ? L",
            "&1 hL = ? daL",
            "&1 daL = ? mL",
            "&1 daL = ? cL",
            "&1 daL = ? dL",
            "&1 daL = ? L",
            "&1 L = ? mL",
            "&1 L = ? cL",
            "&1 L = ? dL",
            "&1 dL = ? mL",
            "&1 dL = ? cL",
            "&1 cL = ? mL",
            "&1 mL = ? kL",
            "&1 cL = ? kL ",
            "&1 dL = ? kL",
            "&1 L = ? kL",
            "&1 daL = ? kL",
            "&1 hL = ? kL",
            "&1 mL = ? hL",
            "&1 cL = ? hL",
            "&1 dL = ? hL",
            "&1 L = ? hL",
            "&1 daL = ? hL",
            "&1 mL = ? daL",
            "&1 cL = ? daL",
            "&1 dL = ? daL",
            "&1 L = ? daL",
            "&1 mL = ? L",
            "&1 cL = ? L",
            "&1 dL = ? L",
            "&1 mL = ? dL",
            "&1 cL = ? dL",
            "&1 mL = ? cL"
          ],
          solutions: [
            ["[_&1*1000000_]"],
            ["[_&1*100000_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*100000_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*10_]"],
            ["[._&1:1000000_]"],
            ["[._&1:100000_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:100000_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:10_]"],
            ["[_&1*1000000_]"],
            ["[_&1*100000_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*100000_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*10_]"],
            ["[._&1:1000000_]"],
            ["[._&1:100000_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:100000_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:10_]"],
            ["[_&1*1000000_]"],
            ["[_&1*100000_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*100000_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*10000_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*1000_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*100_]"],
            ["[_&1*10_]"],
            ["[_&1*10_]"],
            ["[._&1:1000000_]"],
            ["[._&1:100000_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:100000_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:10000_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:1000_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:100_]"],
            ["[._&1:10_]"],
            ["[._&1:10_]"]
          ],
          type: "trou",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer avec des unit\xE9s",
          subdescription: "",
          enounces: [
            " Calcule et donne le r\xE9sutat en m\xE8tres (m)",
            " Calcule et donne le r\xE9sutat en grammes (g)",
            " Calcule et donne le r\xE9sutat en litres (L)"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$l{&1 km; &1 hm ; &1 dam ; &1 dm ; &1 cm ; &1 mm}",
              "&4": "$l{&2 m}"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$l{&1 kg; &1 hg ; &1 dag ; &1 dg ; &1 cg ; &1 mg}",
              "&4": "$l{&2 g}"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$l{&1 kL; &1 hL ; &1 daL ; &1 dL ; &1 cL ; &1 mL}",
              "&4": "$l{&2 L}"
            }
          ],
          answerFields: [
            "$$&3 + &4 = ? m$$",
            "$$&3 + &4 = ? g$$",
            "$$&3 + &4 = ? L$$"
          ],
          solutions: [
            ["[_(&3+&4)/(1 m)_]"],
            ["[_(&3+&4)/(1 g)_]"],
            ["[_(&3+&4)/(1 L)_]"]
          ],
          correctionFormat: [
            {
              correct: ["$$&3+&4=$$&answer m"]
            },
            {
              correct: ["$$&3+&4=$$&answer g"]
            },
            {
              correct: ["$$&3+&4=$$&answer L"]
            }
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer avec des unit\xE9s",
          subdescription: "L'unit\xE9 est choisie par l'utilisateur",
          enounces: [
            " Calcule (Tu peux choisir l'unit\xE9 que tu veux mais tu ne dois pas oublier de la mettre au r\xE9sultat.)"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$l{&1 km; &1 hm ; &1 dam ; &1 dm ; &1 cm ; &1 mm}",
              "&4": "$l{&2 m}"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$l{&1 kg; &1 hg ; &1 dag ; &1 dg ; &1 cg ; &1 mg}",
              "&4": "$l{&2 g}"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$l{&1 kL; &1 hL ; &1 daL ; &1 dL ; &1 cL ; &1 mL}",
              "&4": "$l{&2 L}"
            }
          ],
          expressions: ["&3 + &4"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Unit\xE9s compos\xE9es": [
        {
          description: "Convertir dans une autre unit\xE9",
          subdescription: "Unit\xE9s d'aire",
          enounces: ["Convertis dans l'unit\xE9 demand\xE9e."],
          variables: [
            {
              "&1": "$e[1;9]"
            }
          ],
          expressions: [
            "&1 km^2 = ? m^2",
            "&1 hm^2 = ? m^2",
            "&1 dam^2 = ? m^2",
            "&1 dm^2 = ? m^2",
            "&1 cm^2 = ? m^2",
            "&1 mm^2 = ? m^2",
            "&1 km^2 = ? hm^2",
            "&1 hm^2 = ? dam^2",
            "&1 m^2 = ? dm^2",
            "&1 dm^2 = ? cm^2",
            "&1 cm^2 = ? mm^2",
            "&1 mm^2 = ? cm^2",
            "&1 cm^2 = ? dm^2",
            "&1 dm^2 = ? m^2",
            "&1 m^2 = ? dam^2",
            "&1 dam^2 = ? hm^2",
            "&1 hm^2 = ? km^2"
          ],
          solutions: [
            ["[._&1*1000000_]"],
            ["[._&1*10000_]"],
            ["[._&1*100_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.0001_]"],
            ["[._&1*0.000001_]"],
            ["[._&1*100_]"],
            ["[._&1*100_]"],
            ["[._&1*100_]"],
            ["[._&1*100_]"],
            ["[._&1*100_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.01_]"],
            ["[._&1*0.01_]"]
          ],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir dans une autre unit\xE9",
          subdescription: "Unit\xE9s de volume",
          enounces: ["Convertis dans l'unit\xE9 demand\xE9e."],
          variables: [
            {
              "&1": "$e[1;9]"
            }
          ],
          expressions: [
            "&1 hm^3 = ? m^3",
            "&1 dam^3 = ? m^3",
            "&1 dm^3 = ? m^3",
            "&1 cm^3 = ? m^3",
            "&1 km^3 = ? hm^3",
            "&1 hm^3 = ? dam^3",
            "&1 m^3 = ? dm^3",
            "&1 dm^3 = ? cm^3",
            "&1 cm^3 = ? mm^3",
            "&1 mm^3 = ? cm^3",
            "&1 cm^3 = ? dm^3",
            "&1 dm^3 = ? m^3",
            "&1 m^3 = ? dam^3",
            "&1 dam^3 = ? hm^3",
            "&1 hm^3 = ? km^3"
          ],
          solutions: [
            ["[._&1*1000000_]"],
            ["[._&1*1000_]"],
            ["[._&1*0.001_]"],
            ["[._&1*0.000001_]"],
            ["[._&1*1000_]"],
            ["[._&1*1000_]"],
            ["[._&1*1000_]"],
            ["[._&1*1000_]"],
            ["[._&1*1000_]"],
            ["[._&1*0.001_]"],
            ["[._&1*0.001_]"],
            ["[._&1*0.001_]"],
            ["[._&1*0.001_]"],
            ["[._&1*0.001_]"],
            ["[._&1*0.001_]"]
          ],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    },
    P\u00E9rim\u00E8tres: {
      "P\xE9rim\xE8tre d'un carr\xE9": [
        {
          description: "Calcul du p\xE9rim\xE8tre d'un carr\xE9.",
          subdescription: "A partir d'une description",
          enounces: [
            "Quel est le p\xE9rim\xE8tre d'un <b>carr\xE9</b> de c\xF4t\xE9 $$[\xB0&1\xB0]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11] mm"
            },
            {
              "&1": "$e[1;11] cm"
            },
            {
              "&1": "$e[1;11] dm"
            },
            {
              "&1": "$e[1;11] m"
            },
            {
              "&1": "$e[1;11] dam"
            },
            {
              "&1": "$e[1;11] hm"
            },
            {
              "&1": "$e[1;11] km"
            }
          ],
          solutions: [
            ["[_4*&1_mm_]"],
            ["[_4*&1_cm_]"],
            ["[_4*&1_dm_]"],
            ["[_4*&1_m_]"],
            ["[_4*&1_dam_]"],
            ["[_4*&1_hm_]"],
            ["[_4*&1_km_]"]
          ],
          options: ["no-exp"],
          correctionFormat: [
            {
              correct: ["Le p\xE9rim\xE8tre du carr\xE9 est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le p\xE9rim\xE8tre d'un carr\xE9 de c\xF4t\xE9 $$[\xB0&1\xB0]$$  est $$[\xB0&1*4\xB0] =$$ &solution."
              }
            ]
          ],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Trouver le c\xF4t\xE9 d'un carr\xE9 connaissant son p\xE9rim\xE8tre.",
          subdescription: "A partir d'une description.",
          enounces: [
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> de p\xE9rim\xE8tre $$[_4*&1_mm_]$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> de p\xE9rim\xE8tre $$[_4*&1_cm_]$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> de p\xE9rim\xE8tre $$[_4*&1_dm_]$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> de p\xE9rim\xE8tre $$[_4*&1_m_]$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> de p\xE9rim\xE8tre $$[_4*&1_dam_]$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> de p\xE9rim\xE8tre $$[_4*&1_hm_]$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> de p\xE9rim\xE8tre $$[_4*&1_km_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11] mm"
            },
            {
              "&1": "$e[1;11] cm"
            },
            {
              "&1": "$e[1;11] dm"
            },
            {
              "&1": "$e[1;11] m"
            },
            {
              "&1": "$e[1;11] dam"
            },
            {
              "&1": "$e[1;11] hm"
            },
            {
              "&1": "$e[1;11] km"
            }
          ],
          solutions: [["&1"]],
          correctionFormat: [
            {
              correct: ["La longueur du c\xF4t\xE9 est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 de p\xE9rim\xE8tre $$[_4*&1_mm_]$$ est $$[_4*&1_mm_] \\div 4 =$$ &solution."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 de p\xE9rim\xE8tre $$[_4*&1_cm_]$$ est $$[_4*&1_cm_] \\div 4 =$$ &solution."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 de p\xE9rim\xE8tre $$[_4*&1_dm_]$$ est $$[_4*&1_dm_] \\div 4 =$$ &solution."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 de p\xE9rim\xE8tre $$[_4*&1_m_]$$ est $$[_4*&1_m_] \\div 4 =$$ &solution."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 de p\xE9rim\xE8tre $$[_4*&1_dam_]$$ est $$[_4*&1_dam_] \\div 4 =$$ &solution."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 de p\xE9rim\xE8tre $$[_4*&1_hm_]$$ est $$[_4*&1_hm_] \\div 4 =$$ &solution."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 de p\xE9rim\xE8tre $$[_4*&1_km_]$$ est $$[_4*&1_km_] \\div 4 =$$ &solution."
              }
            ]
          ],
          defaultDelay: 15,
          grade: SIXIEME
        }
      ],
      "P\xE9rim\xE8tre d'un rectangle": [
        {
          description: "Calcul du p\xE9rim\xE8tre d'un rectangle.",
          subdescription: "A partir d'une description",
          enounces: [
            "Quel est le p\xE9rim\xE8tre d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et de largeur $$[\xB0&4\xB0]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            }
          ],
          solutions: [
            ["[_(&3+&4)*2_mm_]"],
            ["[_(&3+&4)*2_cm_]"],
            ["[_(&3+&4)*2_dm_]"],
            ["[_(&3+&4)*2_m_]"],
            ["[_(&3+&4)*2_dam_]"],
            ["[_(&3+&4)*2_hm_]"],
            ["[_(&3+&4)*2_km_]"]
          ],
          options: ["no-exp"],
          correctionFormat: [
            {
              correct: ["Le p\xE9rim\xE8tre du rectangle est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le p\xE9rim\xE8tre d'un rectangle de longueur $$[\xB0&3\xB0]$$ et de largeur $$[\xB0&4\xB0]$$ est $$[\xB0(&3+&4)*2\xB0] =$$ &solution."
              }
            ]
          ],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Trouver la largeur d'un rectangle.",
          subdescription: "A partir de son aire et de sa longueur.",
          enounces: [
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_mm^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_cm^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_dm^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_m^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_dam^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_hm^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_km^2_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [["&4"]],
          correctionFormat: [
            {
              correct: ["La largeur est de &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_mm^2_]$$  est &solution car $$[\xB0&3\xB0] \\times &sol = [_&3*&4_mm^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_cm^2_]$$  est &solution car $$[\xB0&3\xB0] \\times &sol = [_&3*&4_cm^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_dm^2_]$$  est &solution car $$[\xB0&3\xB0] \\times &sol = [_&3*&4_dm^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_m^2_]$$  est &solution car $$[\xB0&3\xB0] \\times &sol = [_&3*&4_m^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_dam^2_]$$  est &solution car $$[\xB0&3\xB0] \\times &sol = [_&3*&4_dam^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_hm^2_]$$  est &solution car $$[\xB0&3\xB0] \\times &sol = [_&3*&4_hm^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_km^2_]$$  est &solution car $$[\xB0&3\xB0] \\times &sol = [_&3*&4_km^2_]$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    },
    Aires: {
      "Aire d'un carr\xE9": [
        {
          description: "Calcul de l'aire d'un carr\xE9.",
          subdescription: "A partir d'une description",
          enounces: [
            "Quelle est l'aire d'un <b>carr\xE9</b> de c\xF4t\xE9 $$[\xB0&1\xB0]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11] mm"
            },
            {
              "&1": "$e[1;11] cm"
            },
            {
              "&1": "$e[1;11] dm"
            },
            {
              "&1": "$e[1;11] m"
            },
            {
              "&1": "$e[1;11] dam"
            },
            {
              "&1": "$e[1;11] hm"
            },
            {
              "&1": "$e[1;11] km"
            }
          ],
          solutions: [
            ["[_&1*&1_mm^2_] "],
            ["[_&1*&1_cm^2_]"],
            ["[_&1*&1_dm^2_]"],
            ["[_&1*&1_m^2_]"],
            ["[_&1*&1_dam^2_] "],
            ["[_&1*&1_hm^2_]"],
            ["[_&1*&1_km^2_]"]
          ],
          correctionFormat: [
            {
              correct: ["L'aire du carr\xE9 est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "L'aire d'un carr\xE9 de c\xF4t\xE9 $$[\xB0&1\xB0]$$  est $$[\xB0&1\xB0] \\times [\xB0&1\xB0] =$$ &solution."
              }
            ]
          ],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Trouver le c\xF4t\xE9 d'un carr\xE9 connaissant son aire.",
          subdescription: "A partir d'une description.",
          enounces: [
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> d'aire $$[._&1*&1_]\\,mm^2$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> d'aire $$[._&1*&1_]\\, cm^2$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> d'aire $$[._&1*&1_]\\, dm^2$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> d'aire $$[._&1*&1_]\\, m^2$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> d'aire $$[._&1*&1_]\\, dam^2$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> d'aire $$[._&1*&1_]\\, hm^2$$ ?",
            "Quelle est la longueur du c\xF4t\xE9 d'un <b>carr\xE9</b> d'aire $$[._&1*&1_]\\, km^2$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]"
            }
          ],
          solutions: [
            ["&1 mm"],
            ["&1 cm"],
            ["&1 dm"],
            ["&1 m"],
            ["&1 dam"],
            ["&1 hm"],
            ["&1 km"]
          ],
          correctionFormat: [
            {
              correct: ["La longueur du c\xF4t\xE9 est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 d'aire $$[._&1*&1_]\\,mm^2$$ est &solution car $$&1\\,mm \\times &1\\,mm = [_&1*&1_]\\,mm^2$$."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 d'aire $$[._&1*&1_]\\,cm^2$$ est &solution car $$&1\\,cm \\times &1\\,cm = [_&1*&1_]\\,cm^2$$."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 d'aire $$[._&1*&1_]\\,dm^2$$ est &solution car $$&1\\,dm \\times &1\\,dm = [_&1*&1_]\\,dm^2$$."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 d'aire $$[._&1*&1_]\\,m^2$$ est &solution car $$&1\\,m \\times &1\\,m = [_&1*&1_]\\,m^2$$."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 d'aire $$[._&1*&1_]\\,dam^2$$ est &solution car $$&1\\,dam \\times &1\\,dam = [_&1*&1_]\\,dam^2$$."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 d'aire $$[._&1*&1_]\\,hm^2$$ est &solution car $$&1\\,hm \\times &1\\,hm = [_&1*&1_]\\,hm^2$$."
              }
            ],
            [
              {
                text: "La longueur du c\xF4t\xE9 d'un carr\xE9 d'aire $$[._&1*&1_]\\,km^2$$ est &solution car $$&1\\,km \\times &1\\,km = [_&1*&1_]\\,km^2$$."
              }
            ]
          ],
          defaultDelay: 15,
          grade: SIXIEME
        }
      ],
      "Aire d'un rectangle": [
        {
          description: "Calcul de l'aire d'un rectangle.",
          subdescription: "A partir d'une description",
          enounces: [
            "Quelle est l'aire d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et de largeur $$[\xB0&4\xB0]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [
            ["[_&3*&4_mm^2_]"],
            ["[_&3*&4_cm^2_]"],
            ["[_&3*&4_dm^2_]"],
            ["[_&3*&4_m^2_]"],
            ["[_&3*&4_dam^2_]"],
            ["[_&3*&4_hm^2_]"],
            ["[_&3*&4_km^2_]"]
          ],
          correctionFormat: [
            {
              correct: ["L'aire du rectangle est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "L'aire d'un rectangle de longueur $$[\xB0&3\xB0]$$ et de largeur $$[\xB0&4\xB0]$$  est $$[\xB0&3\xB0] \\times [\xB0&4\xB0] =$$ &solution."
              }
            ]
          ],
          defaultDelay: 15,
          grade: SIXIEME
        },
        {
          description: "Trouver la largeur d'un rectangle.",
          subdescription: "A partir de son aire et de sa longueur.",
          enounces: [
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_mm^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_cm^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_dm^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_m^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_dam^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_hm^2_]$$ ?",
            "Quelle est la largeur d'un <b>rectangle</b> de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_km^2_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [["&4"]],
          correctionFormat: [
            {
              correct: ["La largeur du rectangle est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_mm^2_]$$  est &solution car   $$[\xB0&3\xB0] \\times &sol = [_&3*&4_mm^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_cm^2_]$$  est &solution car   $$[\xB0&3\xB0] \\times &sol = [_&3*&4_cm^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_dm^2_]$$  est &solution car   $$[\xB0&3\xB0] \\times &sol = [_&3*&4_dm^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_m^2_]$$  est &solution car   $$[\xB0&3\xB0] \\times &sol = [_&3*&4_m^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_dam^2_]$$  est &solution car   $$[\xB0&3\xB0] \\times &sol = [_&3*&4_dam^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_hm^2_]$$  est &solution car   $$[\xB0&3\xB0] \\times &sol = [_&3*&4_hm^2_]$$."
              }
            ],
            [
              {
                text: "La largeur d'un rectangle de longueur $$[\xB0&3\xB0]$$ et d'aire $$[_&3*&4_km^2_]$$  est &solution car   $$[\xB0&3\xB0] \\times &sol = [_&3*&4_km^2_]$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Aire d'un triangle rectangle": [
        {
          description: "Calcul de l'aire d'un triangle rectangle.",
          subdescription: "A partir d'une description",
          enounces: [
            "Quelle est l'aire d'un <b>triangle rectangle</b> de longueur $$[\xB0&3\xB0]$$ et de largeur $$[\xB0&4\xB0]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [
            ["[._&3*&4/2_mm^2_]"],
            ["[._&3*&4/2_cm^2_]"],
            ["[._&3*&4/2_dm^2_]"],
            ["[._&3*&4/2_m^2_]"],
            ["[._&3*&4/2_dam^2_]"],
            ["[._&3*&4/2_hm^2_]"],
            ["[._&3*&4/2_km^2_]"]
          ],
          correctionFormat: [
            {
              correct: ["L'aire du triangle rectangle est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "L'aire d'un triangle rectangle de longueur $$[\xB0&3\xB0]$$ et de largeur $$[\xB0&4\xB0]$$  est $$[\xB0{&3*&4}/2\xB0] =$$ &solution."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Trouver le deuxi\xE8me c\xF4t\xE9 de l'angle droit.",
          subdescription: "A partir de son aire et du premier c\xF4t\xE9 de l'angle droit.",
          enounces: [
            "Quelle est la longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un <b>triangle rectangle</b> dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_mm^2_]$$ ?",
            "Quelle est la longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un <b>triangle rectangle</b> dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_cm^2_]$$ ?",
            "Quelle est la longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un <b>triangle rectangle</b> dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dm^2_]$$ ?",
            "Quelle est la longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un <b>triangle rectangle</b> dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_m^2_]$$ ?",
            "Quelle est la longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un <b>triangle rectangle</b> dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dam^2_]$$ ?",
            "Quelle est la longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un <b>triangle rectangle</b> dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_hm^2_]$$ ?",
            "Quelle est la longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un <b>triangle rectangle</b> dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_km^2_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [["&4"]],
          correctionFormat: [
            {
              correct: ["La longueur du 2\xE8me c\xF4t\xE9 est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un triangle rectangle dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_mm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_mm^2_]$$."
              }
            ],
            [
              {
                text: "La longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un triangle rectangle dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_cm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_cm^2_]$$."
              }
            ],
            [
              {
                text: "La longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un triangle rectangle dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_dm^2_]$$."
              }
            ],
            [
              {
                text: "La longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un triangle rectangle dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_m^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_m^2_]$$."
              }
            ],
            [
              {
                text: "La longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un triangle rectangle dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dam^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_dam^2_]$$."
              }
            ],
            [
              {
                text: "La longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un triangle rectangle dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_hm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_hm^2_]$$."
              }
            ],
            [
              {
                text: "La longueur du 2\xE8me c\xF4t\xE9 de l'angle droit d'un triangle rectangle dont le premier c\xF4t\xE9 de l'angle droit mesure $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_km^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_km^2_]$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Aire d'un triangle quelconque": [
        {
          description: "Calcul de l'aire d'un triangle quelconque.",
          subdescription: "A partir d'une description",
          enounces: [
            "Quelle est l'aire d'un <b>triangle</b> de base $$[\xB0&3\xB0]$$ et de hauteur associ\xE9e $$[\xB0&4\xB0]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [
            ["[._&3*&4/2_mm^2_] "],
            ["[._&3*&4/2_cm^2_] "],
            ["[._&3*&4/2_dm^2_] "],
            ["[._&3*&4/2_m^2_] "],
            ["[._&3*&4/2_dam^2_] "],
            ["[._&3*&4/2_hm^2_] "],
            ["[._&3*&4/2_km^2_] "]
          ],
          correctionFormat: [
            {
              correct: ["L'aire du triangle est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "L'aire d'un triangle de base $$[\xB0&3\xB0]$$ et de hauteur $$[\xB0&4\xB0]$$  est $$[\xB0{&3*&4}/2\xB0] =$$ &solution."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Trouver la base d'un triangle quelconque.",
          subdescription: "A partir de son aire et de la hauteur associ\xE9e.",
          enounces: [
            "Quelle est la base d'un <b>triangle</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_mm^2_]$$ ?",
            "Quelle est la base d'un <b>triangle</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_cm^2_]$$ ?",
            "Quelle est la base d'un <b>triangle</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dm^2_]$$ ?",
            "Quelle est la base d'un <b>triangle</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_m^2_]$$ ?",
            "Quelle est la base d'un <b>triangle</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dam^2_]$$ ?",
            "Quelle est la base d'un <b>triangle</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_hm^2_]$$ ?",
            "Quelle est la base d'un <b>triangle</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_km^2_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [["&4"]],
          correctionFormat: [
            {
              correct: ["La base mesure &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La base d'un triangle de hauteur asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_mm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_mm^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un triangle de hauteur asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_cm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_cm^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un triangle de hauteur asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_dm^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un triangle de hauteur asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_m^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_m^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un triangle de hauteur asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dam^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_dam^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un triangle de hauteur asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_hm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_hm^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un triangle de hauteur asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_km^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_km^2_]$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Trouver la hauteur d'un triangle quelconque.",
          subdescription: "A partir de son aire et de la base associ\xE9e.",
          enounces: [
            "Quelle est la hauteur d'un <b>triangle</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_mm^2_]$$ ?",
            "Quelle est la hauteur d'un <b>triangle</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_cm^2_]$$ ?",
            "Quelle est la hauteur d'un <b>triangle</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dm^2_]$$ ?",
            "Quelle est la hauteur d'un <b>triangle</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_m^2_]$$ ?",
            "Quelle est la hauteur d'un <b>triangle</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dam^2_]$$ ?",
            "Quelle est la hauteur d'un <b>triangle</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_hm^2_]$$ ?",
            "Quelle est la hauteur d'un <b>triangle</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_km^2_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [["&4"]],
          correctionFormat: [
            {
              correct: ["La hauteur mesure &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La hauteur d'un triangle de base asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_mm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_mm^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un triangle de base asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_cm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_cm^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un triangle de base asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_dm^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un triangle de base asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_m^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_m^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un triangle de base asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_dam^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_dam^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un triangle de base asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_hm^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_hm^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un triangle de base asoci\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4:2_km^2_]$$  est &solution car   $$\\frac{[\xB0&3\xB0] \\times &sol}{2} = [._&3*&4:2_km^2_]$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Aire d'un parall\xE9logramme": [
        {
          description: "Calcul de l'aire d'un parall\xE9logramme.",
          subdescription: "A partir d'une description",
          enounces: [
            "Quelle est l'aire d'un <b>parall\xE9logramme</b> de base $$[\xB0&3\xB0]$$ et de hauteur $$[\xB0&4\xB0]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [
            ["[_&3*&4_mm^2_]"],
            ["[_&3*&4_cm^2_]"],
            ["[_&3*&4_dm^2_]"],
            ["[_&3*&4_m^2_]"],
            ["[_&3*&4_dam^2_]"],
            ["[_&3*&4_hm^2_]"],
            ["[_&3*&4_km^2_]"]
          ],
          correctionFormat: [
            {
              correct: ["L'aire du parall\xE9logramme est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "L'aire d'un parall\xE9logramme de base $$[\xB0&3\xB0]$$ et de hauteur $$[\xB0&4\xB0]$$  est $$[\xB0&3*&4\xB0] =$$ &solution."
              }
            ]
          ],
          defaultDelay: 15,
          grade: CINQUIEME
        },
        {
          description: "Trouver la base d'un parall\xE9logramme.",
          subdescription: "A partir de son aire et de la hauteur associ\xE9e .",
          enounces: [
            "Quelle est la base d'un <b>parall\xE9logramme</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_mm^2_]$$ ?",
            "Quelle est la base d'un <b>parall\xE9logramme</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_cm^2_]$$ ?",
            "Quelle est la base d'un <b>parall\xE9logramme</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_dm^2_]$$ ?",
            "Quelle est la base d'un <b>parall\xE9logramme</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_m^2_]$$ ?",
            "Quelle est la base d'un <b>parall\xE9logramme</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_dam^2_]$$ ?",
            "Quelle est la base d'un <b>parall\xE9logramme</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_hm^2_]$$ ?",
            "Quelle est la base d'un <b>parall\xE9logramme</b> de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_km^2_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [["&4"]],
          correctionFormat: [
            {
              correct: ["La base mesure &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La base d'un parall\xE9logramme de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_mm^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_mm^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un parall\xE9logramme de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_cm^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_cm^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un parall\xE9logramme de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_dm^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_dm^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un parall\xE9logramme de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_m^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_m^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un parall\xE9logramme de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_dam^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_dam^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un parall\xE9logramme de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_hm^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_hm^2_]$$."
              }
            ],
            [
              {
                text: "La base d'un parall\xE9logramme de hauteur associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_km^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_km^2_]$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Trouver la hauteur d'un parall\xE9logramme.",
          subdescription: "A partir de son aire et de la base associ\xE9e.",
          enounces: [
            "Quelle est la hauteur d'un <b>parall\xE9logramme</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_mm^2_]$$ ?",
            "Quelle est la hauteur d'un <b>parall\xE9logramme</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_cm^2_]$$ ?",
            "Quelle est la hauteur d'un <b>parall\xE9logramme</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_dm^2_]$$ ?",
            "Quelle est la hauteur d'un <b>parall\xE9logramme</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_m^2_]$$ ?",
            "Quelle est la hauteur d'un <b>parall\xE9logramme</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_dam^2_]$$ ?",
            "Quelle est la hauteur d'un <b>parall\xE9logramme</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_hm^2_]$$ ?",
            "Quelle est la hauteur d'un <b>parall\xE9logramme</b> de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_km^2_]$$ ?"
          ],
          variables: [
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 mm",
              "&4": "&2 mm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 cm",
              "&4": "&2 cm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dm",
              "&4": "&2 dm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 m",
              "&4": "&2 m"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 dam",
              "&4": "&2 dam"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 hm",
              "&4": "&2 hm"
            },
            {
              "&1": "$e[1;11]",
              "&2": "$e[1;11]\\{&1}",
              "&3": "&1 km",
              "&4": "&2 km"
            }
          ],
          solutions: [["&4"]],
          correctionFormat: [
            {
              correct: ["La hauteur mesure &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La hauteur d'un parall\xE9logramme de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_mm^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_mm^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un parall\xE9logramme de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_cm^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_cm^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un parall\xE9logramme de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_dm^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_dm^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un parall\xE9logramme de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_m^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_m^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un parall\xE9logramme de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_dam^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_dam^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un parall\xE9logramme de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_hm^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_hm^2_]$$."
              }
            ],
            [
              {
                text: "La hauteur d'un parall\xE9logramme de base associ\xE9e $$[\xB0&3\xB0]$$ et d'aire $$[._&3*&4_km^2_]$$ est &solution car $$[\xB0&3\xB0] \\times &sol = [._&3*&4_km^2_]$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    },
    Volumes: {
      conversions: [
        {
          description: "Convertir dans une autre unit\xE9",
          subdescription: "Unit\xE9s de volume et de contenance",
          enounces: ["Convertis dans l'unit\xE9 demand\xE9e."],
          variables: [
            {
              "&1": "$e[1;9]"
            }
          ],
          expressions: [
            "&1 m^3 = ? L",
            "&1 L = ? m^3",
            "&1 dm^3 = ? L",
            "&1 L = ? dm^3",
            "&1 cm^3 = ? mL",
            "&1 mL = ? cm^3",
            "&1 cm^3 = ? L",
            "&1 L = ? cm^3"
          ],
          solutions: [
            ["[._&1*1000_]"],
            ["[._&1:1000_]"],
            ["[._&1_]"],
            ["[._&1_]"],
            ["[._&1_]"],
            ["[._&1_]"],
            ["[._&1:1000_]"],
            ["[._&1*1000_]"]
          ],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    },
    Dur\u00E9es: {
      Convertir: [
        {
          description: "Convertir des dur\xE9es",
          subdescription: "heures en minutes",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;10]",
              "&2": "[_&1 h_min_]"
            }
          ],
          answerFields: ["$$&1\\,h = ?\\,min$$"],
          solutions: [["[_&2/(1 min)_]"]],
          correctionFormat: [
            {
              correct: ["$$&1\\,h =$$&answer $$min$$"]
            }
          ],
          correctionDetails: [
            [{ text: "$$&1\\,h = &1 \\times 60\\,min=$$&solution $$min$$" }]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "minutes en heures",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;10]"
            }
          ],
          answerFields: ["$$[_&1*60_]\\,min= ? h$$"],
          solutions: [["&1"]],
          correctionFormat: [
            {
              correct: ["$$[_&1*60_]\\,min =$$&answer $$h$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&1*60_]\\,min = &1 \\times 60\\,min =$$&solution $$h$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "minutes en secondes",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;10]",
              "&2": "[_&1 min_s_]"
            }
          ],
          answerFields: ["$$&1\\,min = ?\\,s$$"],
          solutions: [["[_&2/(1 s)_]"]],
          correctionFormat: [
            {
              correct: ["$$&1\\,min =$$&answer $$s$$"]
            }
          ],
          correctionDetails: [
            [{ text: "$$&1\\,min = &1 \\times 60\\,s=$$&solution $$s$$" }]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "secondes en minutes",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;10]"
            }
          ],
          answerFields: ["$$[_&1*60_]\\,s= ? min$$"],
          solutions: [["&1"]],
          correctionFormat: [
            {
              correct: ["$$[_&1*60_]\\,s =$$&answer $$min$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&1*60_]\\,s = &1 \\times 60\\,s =$$&solution $$min$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "HMS en minutes",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;2]",
              "&2": "$e[1;5]*10",
              "&3": "&1 h [_&2_] min",
              "&4": "[_&3_min_]"
            }
          ],
          answerFields: ["$$&1\\,h\\,[_&2_]\\,min = ?\\,min$$"],
          solutions: [["[_&4/(1 min)_]"]],
          correctionFormat: [
            {
              correct: ["$$&1\\,h\\,[_&2_]\\,min  =$$&answer $$min$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$&1\\,h\\,[_&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min =$$&solution $$min$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "HMS en minutes (2)",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;2]",
              "&2": "$e[1;59]",
              "&3": "&1 h [_&2_] min",
              "&4": "[_&3_min_]"
            }
          ],
          answerFields: ["$$&1\\,h\\,[_&2_]\\,min = ?\\,min$$"],
          solutions: [["[_&4/(1 min)_]"]],
          correctionFormat: [
            {
              correct: ["$$&1\\,h\\,[_&2_]\\,min  =$$&answer $$min$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$&1\\,h\\,[_&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min =$$&solution $$min$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "minutes en HMS",
          enounces: ["Convertis"],
          variables: [
            {
              "&1": "$e[1;2]",
              "&2": "$e[1;5]*10"
            }
          ],
          answerFields: ["$$[_&1*60+&2_]\\,min= ?\\,h\\,?\\,min$$"],
          solutions: [["&1", "[_&2_]"]],
          correctionFormat: [
            {
              correct: [
                "$$[_&1*60+&2_]\\,min=$$ &answer1 $$h$$ &answer2 $$min$$"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&1*60+&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min =$$ &solution1 $$h$$ &solution2 $$min$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "minutes en HMS (2)",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;2]",
              "&2": "$e[1;59]"
            }
          ],
          answerFields: ["$$[_&1*60+&2_]\\,min= ?\\,h\\,?\\,min$$"],
          solutions: [["&1", "&2"]],
          correctionFormat: [
            {
              correct: [
                "$$[_&1*60+&2_]\\,min=$$ &answer1 $$h$$ &answer2 $$min$$"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&1*60+&2_]\\,min = &1\\times 60\\,min+&2\\,min =$$ &solution1 $$h$$ &solution2 $$min$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "heures en HMS, heures d\xE9cimales",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;5]",
              "&2": "$l{1;5;25}"
            }
          ],
          answerFields: ["$$&1{,}&2\\,h= ?\\,h\\,?\\,min$$"],
          solutions: [["&1", "[_0,&2*60_]"]],
          correctionFormat: [
            {
              correct: ["$$&1{,}&2\\,h=$$ &answer1 $$h$$ &answer2 $$min$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$&1{,}&2\\,h = &1\\,h + \\, 0,&2 \\, h = &1\\,h \\, + \\, [_0,&2*60_] \\, min =$$ &solution1 $$h$$ &solution2 $$min$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "heures en minutes, heures d\xE9cimales",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;5]",
              "&2": "$l{1;5;25}",
              "&3": "&1,&2"
            }
          ],
          answerFields: ["$$[\xB0&3\xB0]\\,h= ?\\,min$$"],
          solutions: [["[_&3*60_]"]],
          correctionFormat: [
            {
              correct: ["$$[\xB0&3\xB0]\\,h=$$ &answer $$min$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[\xB0&3\xB0]\\,h = &1\\,h +  0,&2\\,h = [_&1 h_min_] + [_0,&2 h_min_] =$$ &solution $$min$$"
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "heures en HMS, heures d\xE9cimales (2)",
          enounces: ["Convertis."],
          variables: [
            {
              "&1": "$e[1;2]",
              "&2": "$e[1;9]"
            }
          ],
          answerFields: ["$$&1{,}&2\\,h= ?\\,h\\,?\\,min$$"],
          solutions: [["&1", "[_0,&2*60_]"]],
          correctionFormat: [
            {
              correct: ["$$&1{,}&2 \\, h=$$ &answer1 $$h$$ &answer2 $$min$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								&1{,}&2 \\, h &= &1\\,h + \\, 0{,}&2 \\, h \\\\ 								&= &1\\,h \\, + \\, &2 \\times 0,1h \\\\ 								&= &1\\,h \\, + \\, &2 \\times 6 \\, min\\\\ 								&= &1\\,h \\, + \\, [_0,&2*60_] \\, min \\\\ 								&= &sol1 \\, h \\, &sol2 \\, min								\\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Convertir des dur\xE9es",
          subdescription: "heures en minutes, heures d\xE9cimales (2)",
          enounces: ["Convertis en minutes (n'oublie pas l'unit\xE9 <i>min</i>)."],
          variables: [
            {
              "&1": "$e[1;2]",
              "&2": "$e[1;9]"
            }
          ],
          answerFields: ["$$&1{,}&2\\,h= ?\\,min$$"],
          solutions: [["[_&1,&2*60_]"]],
          correctionFormat: [
            {
              correct: ["$$&1,&2 \\, h=$$ &answer $$min$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								&1{,}&2 \\, h &= &1\\,h + \\, 0{,}&2 \\, h \\\\ 								&= &1 \\times 60 \\, min \\, + \\, &2 \\times 0,1h \\\\ 								&= [_&1*60_] \\, min \\, + \\, &2 \\times 6 \\, min\\\\ 								&= [_&1*60_] \\, min \\, + \\, [_0,&2*60_] \\, min \\\\ 								&= &sol \\, min								\\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      Calculer: [
        {
          description: "Ajouter des dur\xE9es",
          subdescription: "en HMS",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;4]",
              "&2": "$e[1;59]",
              "&3": "$e[1;59]"
            }
          ],
          answerFields: [
            "$$[\xB0&1\xB0] \\, h \\, [\xB0&2\xB0] \\, min \\, + \\, [\xB0&3\xB0] \\, min = ? \\, h \\, ? \\, min$$"
          ],
          solutions: [
            [
              "&2+&3>59 ?? [_&1+1_] :: &1 ",
              "&2+&3>59 ?? [_&2+&3-60_] :: [_&2+&3_] "
            ]
          ],
          correctionFormat: [
            {
              correct: [
                "$$&1 \\, h \\, &2 \\, min \\, + \\, &3 \\, min=$$ &solution1 h &solution2 min"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								&1\\,h\\, &2\\,min + &3\\,min           			@@ &2+&3>=60 ?? &= &1 \\, h \\, + \\, &2 \\, min \\, + \\, &3 \\,min \\\\@@            			@@ &2+&3>=60 ?? &= &1 \\, h \\, + \\, 60 \\, min \\, + \\, [_&3+&2-60_] \\,min \\\\ @@            			@@ &2+&3>=60 ?? &= &1\\,h + \\, 1 \\, h \\, + \\, [_&2+&3-60_]\\,min \\\\ @@  					  &= &sol1 \\, h \\, &sol2 \\, min 					\\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Ajouter des dur\xE9es",
          subdescription: "unit\xE9 choisie par l'utilisateur",
          enounces: ["Calcule et \xE9cris la r\xE9ponse sous la forme que tu veux."],
          variables: [
            {
              "&1": "$e[1;4]",
              "&2": "$e[1;59]",
              "&3": "$e[1;59]"
            }
          ],
          expressions: ["&1 h &2 min + &3 min"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								&1\\,h\\, &2\\,min + &3\\,min           			@@ &2+&3>=60 ?? &= &1 \\, h \\, + \\, &2 \\, min \\, + \\, &3 \\,min \\\\@@            			@@ &2+&3>=60 ?? &= &1 \\, h \\, + \\, 60 \\, min \\, + \\, [_&3+&2-60_] \\,min \\\\ @@            			@@ &2+&3>=60 ?? &= &1\\,h + \\, 1 \\, h \\, + \\, [_&2+&3-60_]\\,min \\\\ @@  					  &= &sol 					\\end{align}$$`
              }
            ]
          ],
          units: ["HMS"],
          options: [
            "no-penalty-for-extraneous-zeros",
            "no-penalty-for-not-respected-unit"
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Ajouter des dur\xE9es (2)",
          subdescription: "en HMS (2)",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;4]",
              "&2": "$e[1;4]",
              "&3": "$e[1;5]",
              "&4": "($e[1;5]\\{6-&3})"
            }
          ],
          answerFields: [
            "$$&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min=? \\, h \\, ? \\, min$$"
          ],
          solutions: [
            [
              "(&4+&3)*10>59 ?? [_&1+&2+1_] :: [_&1+&2_] ",
              "(&4+&3)*10>59 ?? [_(&4+&3)*10-60_] :: [_(&4+&3)*10_] "
            ]
          ],
          correctionFormat: [
            {
              correct: [
                "$$&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min=$$ &solution1 $$h$$ &solution2 $$min$$"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min           			@@ (&4+&3)*10>=60 ?? &= &1 \\, h \\, + \\, &2 \\, h \\, + \\, [_&3*10_] \\, min \\, + \\, [_&4*10_] \\,min \\\\@@            			@@ (&4+&3)*10>=60 ?? &= [_&1+&2_] \\, h \\, + \\, 60 \\, min \\, + \\, [_(&3+&4)*10-60_] \\,min \\\\ @@            			@@ (&4+&3)*10>=60 ?? &= [_&1+&2_] \\,h + \\, 1 \\, h \\, + \\, [_(&4+&3)*10-60_]\\,min \\\\ @@  					  &= &sol1 \\, h \\, &sol2 \\, min 					\\end{align}$$`
              }
            ]
          ],
          options: ["no-penalty-for-extraneous-zeros"],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Ajouter des dur\xE9es (2)",
          subdescription: "L'utilisateur choisit l'unit\xE9.",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;4]",
              "&2": "$e[1;4]",
              "&3": "$e[1;5]",
              "&4": "($e[1;5]\\{6-&3})"
            }
          ],
          expressions: ["&1 h [_&3*10_] min + &2 h [_&4*10_] min"],
          correctionFormat: [
            {
              correct: [
                "$$&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min=$$ &solution"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min           			@@ (&4+&3)*10>=60 ?? &= &1 \\, h \\, + \\, &2 \\, h \\, + \\, [_&3*10_] \\, min \\, + \\, [_&4*10_] \\,min \\\\@@            			@@ (&4+&3)*10>=60 ?? &= [_&1+&2_] \\, h \\, + \\, 60 \\, min \\, + \\, [_(&3+&4)*10-60_] \\,min \\\\ @@            			@@ (&4+&3)*10>=60 ?? &= [_&1+&2_] \\,h + \\, 1 \\, h \\, + \\, [_(&4+&3)*10-60_]\\,min \\\\ @@  					  &= &sol 					\\end{align}$$`
              }
            ]
          ],
          units: ["HMS"],
          options: [
            "no-penalty-for-extraneous-zeros",
            "no-penalty-for-not-respected-unit"
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Ajouter des dur\xE9es (3)",
          subdescription: "en HMS",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;4]",
              "&2": "$e[1;4]",
              "&3": "$e[1;59]",
              "&4": "$e[1;59]\\{60-&3}"
            }
          ],
          answerFields: [
            "$$&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min=? \\, h \\, ? \\, min$$"
          ],
          solutions: [
            [
              "&4+&3>59 ?? [_&1+&2+1_] :: [_&1+&2_] ",
              "&4+&3>59 ?? [_&4+&3-60_] :: [_&4+&3_] "
            ]
          ],
          correctionFormat: [
            {
              correct: [
                "$$&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min=$$ &solution1 $$h$$ &solution2 $$min$$"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min           			@@ &4+&3>=60 ?? &= &1 \\, h \\, + \\, &2 \\, h \\, + \\, &3 \\, min \\, + \\, &4 \\,min \\\\@@            			@@ &4+&3>=60 ?? &= [_&1+&2_] \\, h \\, + \\, 60 \\, min \\, + \\, [_&3+&4-60_] \\,min \\\\ @@            			@@ &4+&3>=60 ?? &= [_&1+&2_] \\,h + \\, 1 \\, h \\, + \\, [_&4+&3-60_]\\,min \\\\ @@  					  &= &sol1 \\, h \\, &sol2 \\, min 					\\end{align}$$`
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Ajouter des dur\xE9es (3)",
          subdescription: "L'utilisateur choisit l'unit\xE9",
          enounces: ["Calcule."],
          variables: [
            {
              "&1": "$e[1;4]",
              "&2": "$e[1;4]",
              "&3": "$e[1;59]",
              "&4": "$e[1;59]\\{60-&3}"
            }
          ],
          expressions: ["&1 h &3 min + &2 h &4 min"],
          correctionFormat: [
            {
              correct: [
                "$$&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min=$$ &solution"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min           			@@ &4+&3>=60 ?? &= &1 \\, h \\, + \\, &2 \\, h \\, + \\, &3 \\, min \\, + \\, &4 \\,min \\\\@@            			@@ &4+&3>=60 ?? &= [_&1+&2_] \\, h \\, + \\, 60 \\, min \\, + \\, [_&3+&4-60_] \\,min \\\\ @@            			@@ &4+&3>=60 ?? &= [_&1+&2_] \\,h + \\, 1 \\, h \\, + \\, [_&4+&3-60_]\\,min \\\\ @@  					  &= &sol 					\\end{align}$$`
              }
            ]
          ],
          units: ["HMS"],
          "result-type": "decimal",
          options: [
            "no-penalty-for-extraneous-zeros",
            "no-penalty-for-not-respected-unit"
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Soustraire des dur\xE9es",
          subdescription: "en HMS",
          enounces: [
            "J'ai commenc\xE9 \xE0 regarder un \xE9pisode d'une s\xE9rie \xE0 $$[\xB0&1 h &2 min\xB0]$$, et je l'ai termin\xE9 \xE0 $$[_&1 h &2 min + &3 min_HMS_]$$. Quelle \xE9tait la dur\xE9e de cet \xE9pisode ? (n'oublie pas l'unit\xE9)"
          ],
          variables: [
            {
              "&1": "$e[1;4]",
              "&2": "$e[1;59]",
              "&3": "$e[1;59]"
            }
          ],
          solutions: [["&3 min"]],
          units: ["min"],
          "result-type": "decimal",
          correctionFormat: [
            {
              correct: ["La dur\xE9e de l'\xE9pisode est de &answer."],
              answer: "La dur\xE9e est de &answer."
            }
          ],
          correctionDetails: [
            [
              {
                text: "@@&2+&3<60 ?? $$[_&1 h &2 min_HMS_] + &sol = [_&1 h &2 min + &3 min_HMS_]$$ @@              @@&2+&3>59 ?? $$\\begin{align}[_&1 h &2 min + &3 min_HMS_] &= [_&1 h &2 min_HMS_] + [_60-&2_]\\,min + [_&3+&2-60_]\\,min\\\\                  &= [_&1 h &2 min_HMS_] + &sol\\end{align}$$ @@"
              }
            ]
          ],
          options: [
            "no-penalty-for-extraneous-zeros",
            "no-penalty-for-not-respected-unit"
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Soustraire des dur\xE9es (2)",
          subdescription: "en HMS",
          enounces: [
            "J'ai commenc\xE9 \xE0 regarder un film  \xE0 $$[\xB0&1 h &3 min\xB0]$$, et je l'ai termin\xE9 \xE0 $$[_&1 h &3 min + &2 h &4 min_HMS_]$$. Quelle \xE9tait la dur\xE9e de ce film ? (n'oublie pas l'unit\xE9)"
          ],
          variables: [
            {
              "&1": "$e[1;4]",
              "&2": "$e[1;2]",
              "&3": "$e[1;59]",
              "&4": "$e[1;59]\\{60-&3}"
            }
          ],
          solutions: [["&2 h &4 min"]],
          correctionFormat: [
            {
              correct: ["La dur\xE9e de l'\xE9pisode est de &answer."],
              answer: "La dur\xE9e est de &answer."
            }
          ],
          correctionDetails: [
            [
              {
                text: "@@&3+&4<60 ?? $$[_&1 h &3 min_HMS_] + &sol = [_&1 h &3 min + &2 h &4 min_HMS_]$$ @@              @@&3+&4>59 ?? $$\\begin{align}[_&1 h &3 min + &2 h &4 min_HMS_] &= [_&1 h &3 min_HMS_] + [_60-&3_]\\,min + [_&2_]\\,h + [_&3+&4-60_]\\,min \\\\                  &= [_&1 h &3 min_HMS_] + &sol\\end{align}$$ @@"
              }
            ]
          ],
          units: ["HMS"],
          "result-type": "decimal",
          options: [
            "no-penalty-for-extraneous-zeros",
            "no-penalty-for-not-respected-unit"
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    },
    Vitesses: {
      Convertir: [
        {
          description: "Convertir des vitesses",
          enounces: ["Conpl\xE8te."],
          variables: [
            {
              "&1": "$e[1;9]"
            },
            {
              "&1": "$l{3600;7200}"
            },
            {
              "&1": "$e[1;9]*1000"
            },
            {
              "&1": "$e[1;2]"
            },
            {
              "&1": "$e[1;9]*1000"
            },
            {
              "&1": "$e[1;9]"
            }
          ],
          expressions: [
            "&1 km.h^{-1}= ? m.h^{-1}",
            "&1 km.h^{-1}= ? km.s^{-1}",
            "[_&1_] m.s^{-1}= ? km.s^{-1}",
            "&1 m.s^{-1}= ? m.h^{-1}",
            "[_&1_] m.s^{-1}= ? m.ms^{-1}",
            "&1 m.ms^{-1}= ? m.s^{-1}"
          ],
          solutions: [
            ["[._&1*1000_]"],
            ["[._&1:3600_]"],
            ["[._&1:1000_]"],
            ["[._&1*3600_]"],
            ["[._&1:1000_]"],
            ["[._&1*1000_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&1_] \\, km.h^{-1} = \\frac{[_&1_]\\,km}{1\\,h} = \\frac{[_&1*1000_]\\,m}{1\\,h} =$$ &solution $$m.h^{-1}$$"
              }
            ],
            [
              {
                text: "$$[_&1_] \\, km.h^{-1} = \\frac{[_&1_]\\,km}{1\\,h} = \\frac{[_&1_]\\,km}{3\\,600\\,s} =$$ &solution $$km.s^{-1}$$"
              }
            ],
            [
              {
                text: "$$[_&1_] \\, m.s^{-1} = \\frac{[_&1_]\\,m}{1\\,s} = \\frac{[_&1:1000_]\\,km}{1\\,s} =$$ &solution $$km.s^{-1}$$"
              }
            ],
            [
              {
                text: "$$[_&1_] \\, m.s^{-1} = \\frac{[_&1_]\\,m}{1\\,s} = \\frac{[_&1_]\\,m}{\\frac{1}{3\\,600}\\,h} = \\frac{[_&1_] \\times 3\\,600\\,m}{1\\,h}=$$ &solution $$m.h^{-1}$$"
              }
            ],
            [
              {
                text: "$$[_&1_] \\, m.s^{-1} = \\frac{[_&1_]\\,m}{1\\,s} = \\frac{[_&1_]\\,m}{1\\,000\\,ms} =$$ &solution $$m.ms^{-1}$$"
              }
            ],
            [
              {
                text: "$$[_&1_] \\, m.ms^{-1} = \\frac{[_&1_]\\,m}{1\\,ms} = \\frac{[_&1_]\\,m}{0,001\\,s} =$$ &solution $$m.s^{-1}$$"
              }
            ]
          ],
          type: "trou",
          "result-type": "decimal",
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ],
      Calculer: [
        {
          description: "Calculer une vitesse moyenne.",
          enounces: [
            "Quelle est la vitesse moyenne d'une voiture parcourant $$[_{&2}*{&3}_km_]$$ en $$[\xB0&3\xB0]$$ ? (n'oublie pas l'unit\xE9)"
          ],
          variables: [
            {
              "&1": "$e[2;9]*10 ",
              "&2": "[_&1_] km.h^{-1}",
              "&3": "$e[2;9] h"
            }
          ],
          solutions: [["[_&2_km.h^{-1}_]"]],
          correctionFormat: [
            {
              correct: ["La vitesse est de &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La vitesse d'une voiture parcourant $$[_{&2}*{&3}_km_]$$ en $$[\xB0&3\xB0]$$ est de $$\\frac{[_{&2}*{&3}_km_]}{[_&3_h_]}$$=&solution."
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ]
    }
  },
  "Racines carr\xE9": {
    Apprivoiser: {
      D\u00E9finition: [
        {
          description: "Trouver un nombre de carr\xE9 donn\xE9",
          subdescription: "Entier de 1 \xE0 12",
          enounces: ["Compl\xE8te."],
          expressions: ["?^2=[_&1^2_]"],
          variables: [{ "&1": "$e[1;15]" }],
          solutions: [["&1"]],
          type: "trou",
          defaultDelay: 10,
          grade: CINQUIEME
        },
        {
          description: "Trouver une racine carr\xE9",
          subdescription: "Entier de 1 \xE0 12",
          enounces: ["Calcule."],
          expressions: ["sqrt([_&1*&1_])"],
          variables: [{ "&1": "$e[1;15]" }],
          solutions: [["&1"]],
          correctionDetails: [
            [{ text: "$$&exp=$$&solution car $$&1 \\times &1 = [_&1^2_]$$." }]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Existence d'une racine carr\xE9",
          enounces: ["Est-ce que ce nombre existe ?"],
          expressions: [
            "sqrt([_&1^2_])",
            "sqrt([._&1^2_])",
            "sqrt(&1)",
            "sqrt(-[_&1^2_])",
            "sqrt(-[._&1^2_])",
            "sqrt(-&1)",
            "sqrt(&1)",
            "sqrt(-&1)"
          ],
          variables: [
            { "&1": "$e[2;15]" },
            { "&1": "$d{1;1}" },
            { "&1": "$l{2;3;5;7;10;11;13}" },
            { "&1": "$e[2;15]" },
            { "&1": "$d{1;1}" },
            { "&1": "$l{2;3;5;7;10;11;13}" },
            { "&1": "pi" },
            { "&1": "pi" }
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          correctionDetails: [
            [
              {
                text: "&solution, &expression existe car $$[_&1^2_]$$ est positif."
              },
              { text: "$$&exp=&1$$ car $$&1 \\times &1 = [_&1^2_]$$." }
            ],
            [
              {
                text: "&solution, &expression existe car $$[._&1^2_]$$ est positif."
              },
              {
                text: "$$&exp=[._&1_]$$ car $$[._&1_] \\times [._&1_] = [._&1^2_]$$."
              }
            ],
            [
              { text: "&solution, &expression existe car $$&1$$ est positif." },
              {
                text: "On ne peut pas mettre &expression sous la forme d'un nombre d\xE9cimal."
              },
              {
                text: "On peut seulement \xE9crire que $$&exp \\times &exp=[_&1_]$$, et trouver une <b>valeur approch\xE9e</b> \xE0 la calculatrice : $$&exp \\simeq [._sqrt(&1)_]$$."
              }
            ],
            [
              {
                text: "&solution, &expression n'existe pas car $$-[_&1^2_]$$ est n\xE9gatif."
              }
            ],
            [
              {
                text: "&solution, &expression n'existe pas car $$-[._&1^2_]$$ est n\xE9gatif."
              }
            ],
            [
              {
                text: "&solution, &expression n'existe pas car $$-&1$$ est n\xE9gatif."
              }
            ],
            [
              { text: "&solution, &expression existe car $$\\pi$$ est positif." },
              {
                text: "On ne peut pas mettre &expression sous la forme d'un nombre d\xE9cimal."
              },
              {
                text: "On peut seulement \xE9crire que $$&exp \\times &exp=\\pi$$, et trouver une <b>valeur approch\xE9e</b> \xE0 la calculatrice : $$&exp \\simeq [._sqrt(&1)_]$$."
              }
            ],
            [
              {
                text: "&solution, &expression n'existe pas car $$-\\pi$$ est n\xE9gatif."
              }
            ]
          ],
          solutions: [[0], [0], [0], [1], [1], [1], [0], [1]],
          options: ["no-shuffle-choices"],
          defaultDelay: 10,
          grade: QUATRIEME
        },
        {
          description: "Carr\xE9 d'une racine",
          enounces: ["Calcule."],
          expressions: ["(sqrt(&1))^2", "sqrt(&1)*sqrt(&1)"],
          correctionDetails: [
            [
              { text: "$$&exp =$$ &solution, car par d\xE9finition," },
              {
                text: "$$\\sqrt{&1}$$ est le nombre positif dont le carr\xE9 est $$[_(sqrt(&1))^2_]$$."
              }
            ]
          ],
          variables: [{ "&1": "$e{2}" }],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ]
    },
    Manipuler: {
      Propri\u00E9t\u00E9s: [
        {
          description: "Vrai ou Faux : racines et op\xE9rations",
          enounces: ["Vrai ou Faux ?"],
          expressions: [
            "sqrt(&1)+sqrt(&2)=sqrt([_&1+&2_])",
            "sqrt(&1)*sqrt(&2)=sqrt([_&1*&2_])"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]"
            }
          ],
          choices: [[{ text: "Vrai" }, { text: "Faux" }]],
          correctionFormat: [
            {
              correct: [
                "&answer, $$\\sqrt{&1}+\\sqrt{&2} \\textcolor{${correct_color}}{\\ne} \\sqrt{[_&1+&2_]}$$"
              ],
              answer: "$$\\sqrt{&1}+\\sqrt{&2} \\textcolor{red}{=} \\sqrt{[_&1+&2_]}$$"
            },
            {
              correct: [
                "&answer, $$\\sqrt{&1} \\times \\sqrt{&2} \\textcolor{${correct_color}}{=} \\sqrt{[_&1*&2_]}$$"
              ],
              answer: "$$\\sqrt{&1} \\times \\sqrt{&2} \\textcolor{red}{\\ne} \\sqrt{[_&1*&2_]}$$"
            }
          ],
          correctionDetails: [
            [
              {
                text: "&solution, $$\\sqrt{&1} + \\sqrt{&2} \\gt \\sqrt{&1 + &2}$$ "
              },
              {
                text: "En effet, on peut comparer les carr\xE9s des 2 membres de l'in\xE9galit\xE9 :"
              },
              {
                text: `$$\\begin{align} \\left(\\sqrt{&1} + \\sqrt{&2}\\right)^2 &= \\left(\\sqrt{&1}\\right)^2 +\\left(\\sqrt{&2}\\right)^2 + 2\\sqrt{&1}\\sqrt{&2} \\\\ &= &1 +&2\\textcolor{${color2}}{+2\\sqrt{[_&1*&2_]}} \\\\ \\left(\\sqrt{&1+&2}\\right)^2 &= &1+&2\\end{align}$$`
              }
            ],
            [
              { text: "&solution" },
              {
                text: "$$\\begin{align} \\sqrt{&1} \\times \\sqrt{&2} &=  \\sqrt{&1 \\times &2} \\\\ &= \\sqrt{[_&1*&2_]} \\\\ \\end{align}$$"
              }
            ]
          ],
          solutions: [[1], [0]],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: SECONDE
        }
      ],
      R\u00E9duire: [
        {
          description: "R\xE9duire une racine carr\xE9",
          enounces: ["R\xE9duis sous la forme $$a\\sqrt{b}$$"],
          expressions: ["sqrt([_&1*&1*&2_])"],
          variables: [
            {
              "&1": "$l{2;3;5;10}",
              "&2": "$l{2;3;5}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\sqrt{[_&1*&1*&2_]} &= \\sqrt{[_&1*&1_] \\times &2} \\\\ &= \\sqrt{[_&1*&1_]} \\times \\sqrt{&2} \\\\  &= &1 \\times \\sqrt{&2} \\\\  &= &sol  \\\\ \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "R\xE9duire une expression avec des racines carr\xE9",
          enounces: [
            "R\xE9duis sous la forme $$a\\sqrt{b}$$, avec $$b$$ le plus petit possible."
          ],
          expressions: ["sqrt([_&1*&1*&3_])+sqrt([_&2*&2*&3_])"],
          variables: [
            {
              "&1": "$l{2;3;5;10}",
              "&2": "$l{2;3;5;10}\\{&1}",
              "&3": "$l{2;3;5}"
            }
          ],
          solutions: [["[_&1+&2_]sqrt(&3)"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               \\sqrt{[_&1*&1*&3_]} + \\sqrt{[_&2*&2*&3_]} &= \\sqrt{[_&1*&1_]} \\times \\sqrt{&3} + \\sqrt{[_&2*&2_]} \\times \\sqrt{&3} \\\\               &= &1 \\times \\textcolor{${color1}}{\\sqrt{&3}} + &2 \\times \\textcolor{${color1}}{\\sqrt{&3}} \\\\               &= &1 \\textcolor{${color1}}{\\sqrt{&3}} + &2 \\textcolor{${color1}}{\\sqrt{&3}} \\\\               &= &sol  \\\\               \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 40,
          grade: SECONDE
        }
      ],
      Egalit\u00E9: [
        {
          description: "V\xE9rifier l'\xE9galit\xE9 de deux expressions comportant des racines carr\xE9es",
          enounces: ["Ces 2 expressions sont-elles \xE9gales ?"],
          expressions: ["sqrt([_&1*&1*&2_])", "sqrt([_&1*&1*&2_])"],
          expressions2: ["&1sqrt(&2)", "&1sqrt([_&2+(&3)_])"],
          variables: [
            {
              "&1": "$e[2;5]",
              "&2": "$e[2;4]",
              "&3": "$er[1;1]}"
            }
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          conditions: ["true", "&2+(&3) !=1"],
          solutions: [[0], [1]],
          options: ["no-shuffle-choices"],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align} \\sqrt{[_&1*&1*&2_]} &= \\sqrt{[_&1*&1_] \\times &2} \\\\ &= \\sqrt{[_&1*&1_]} \\times \\sqrt{&2} \\\\  &= &1 \\times \\sqrt{&2} \\\\  &= &sol  \\\\ \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: SECONDE
        }
      ],
      Calculer: [
        {
          description: "Carr\xE9 et racine carr\xE9",
          enounces: ["Calcule."],
          expressions: [
            "(sqrt(&1))^2",
            "sqrt(&1^2)",
            "sqrt((-&1)^2)",
            "sqrt(&1)*sqrt(&1)"
          ],
          variables: [{ "&1": "$e[2;50]" }],
          defaultDelay: 20,
          grade: QUATRIEME
        },
        {
          description: "Calculer avec des racines",
          enounces: ["Calcule."],
          expressions: ["(&2sqrt(&1))^2", "sqrt(&1)*&2*sqrt(&1)"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$l{2;3}"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               \\left(&2\\sqrt{&1}\\right)^2 &= &2^2 \\times \\left(\\sqrt{&1}\\right)^2 \\\\                &= [_&2^2_] \\times &1 \\\\               &= &sol  \\\\               \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\left(&2\\sqrt{&1}\\right)^2 &= &2^2 \\times \\left(\\sqrt{&1}\\right)^2 \\\\                &= [_&2^2_] \\times &1 \\\\               &= &sol  \\\\               \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: QUATRIEME
        }
      ]
    }
  },
  Proportionnalit\u00E9: {
    "Tableaux de proportionnalit\xE9": {
      Reconna\u00EEtre: [
        {
          description: "Reconna\xEEtre si un tableau est un tableau de proportionnalit\xE9",
          subdescription: "En regardant les colonnes",
          enounces: ["Ce tableau est-il un tableau de proportionnalit\xE9 ?"],
          enounces2: [
            "$$\\begin{array}{c|c}           					&1  &   [_&1*&3_] \\\\           					&2  &   [_&2*&3_]         				\\end{array}$$",
            "$$\\begin{array}{c|c}         					&1  &   [_&1*&3_] \\\\        						&2  &   [_&2*(&3+1)_]       					\\end{array}$$"
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [[0], [1]],
          correctionFormat: [
            {
              correct: ["&answer, c'est un tableau de proportionnalit\xE9."],
              answer: "&answer, ce n'est pas un tableau de proportionnalit\xE9."
            },
            {
              correct: [
                "&answer, ce n'est pas un tableau de proportionnalit\xE9."
              ],
              answer: "&answer, c'est un tableau de proportionnalit\xE9."
            }
          ],
          correctionDetails: [
            [
              {
                text: `&solution, $$\\begin{array}{c|c}               &1  &   [_&1*&3_] \\\\               &2  &   [_&2*&3_]             \\end{array}$$ est un tableau de proportionnalit\xE9, car $$ &1 \\textcolor{${color1}}{\\times &3}=[_&1*&3_]$$ et $$ &2 \\textcolor{${color1}}{\\times &3}=[_&2*&3_] $$`
              },
              {
                text: "On a multiplit\xE9 par le m\xEAme nombre entre les 2 colonnes."
              }
            ],
            [
              {
                text: `&solution, $$\\begin{array}{c|c}               &1  &   [_&1*&3_] \\\\               &2  &   [_&2*(&3+1)_]             \\end{array}$$ n'est pas un tableau de proportionnalit\xE9, car $$ &1 \\textcolor{${color1}}{\\times &3}=[_&1*&3_]$$ et $$ &2 \\textcolor{${color2}}{\\times [_&3+1_]}=[_&2*(&3+1)_]$$.`
              },
              {
                text: "On n'a <b>pas</b> multipli\xE9 par le m\xEAme nombre entre les 2 colonnes."
              }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Reconna\xEEtre si un tableau est un tableau de proportionnalit\xE9",
          subdescription: "En regardant les lignes",
          enounces: ["Ce tableau est-il un tableau de proportionnalit\xE9 ?"],
          enounces2: [
            "$$\\begin{array}{c|c}           &1        &   &2 \\\\           [_&1*&3_]  &  [_&2*&3_]         \\end{array}$$",
            "$$\\begin{array}{c|c}         &1  &  &2  \\\\         [_&1*&3_]  &   [_&2*(&3+1)_]       \\end{array}$$"
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [[0], [1]],
          correctionFormat: [
            {
              correct: ["&answer, c'est un tableau de proportionnalit\xE9."],
              answer: "&answer, ce n'est pas un tableau de proportionnalit\xE9."
            },
            {
              correct: [
                "&answer, ce n'est pas un tableau de proportionnalit\xE9."
              ],
              answer: "&answer, c'est un tableau de proportionnalit\xE9."
            }
          ],
          correctionDetails: [
            [
              {
                text: `&solution, $$\\begin{array}{c|c}               &1        &   &2 \\\\               [_&1*&3_]  &  [_&2*&3_]             \\end{array}$$ est un tableau de proportionnalit\xE9, car $$ &1 \\textcolor{${color1}}{\\times &3}=[_&1*&3_]$$ et $$ &2 \\textcolor{${color1}}{\\times &3}=[_&2*&3_] $$`
              },
              {
                text: "On a multipli\xE9 par le m\xEAme nombre entre les 2 colonnes."
              }
            ],
            [
              {
                text: `&solution, $$\\begin{array}{c|c}               &1  &  &2  \\\\         [_&1*&3_]  &   [_&2*(&3+1)_]             \\end{array}$$ n'est pas un tableau de proportionnalit\xE9, car $$ &1 \\textcolor{${color1}}{\\times &3}=[_&1*&3_]$$ et $$ &2 \\textcolor{${color2}}{\\times [_&3+1_]}=[_&2*(&3+1)_]$$.`
              },
              {
                text: "On n'a <b>pas</b> multipli\xE9 par le m\xEAme nombre entre les 2 lignes."
              }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "D\xE9terminer le coefficent de proportionnalit\xE9",
          subdescription: "Valeur enti\xE8re",
          enounces: [
            "Quel est le coefficient de proportionnalit\xE9 de ce tableau ?"
          ],
          enounces2: [
            "$$\\begin{array}{c|c}           &1        &   &2 \\\\           [_&1*&3_]  &  [_&2*&3_]         \\end{array}$$"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [["&3"]],
          correctionFormat: [
            {
              correct: ["Le coefficient de proportionnalit\xE9 est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le coefficient de proportionnalit\xE9 du tableau  $$\\begin{array}{c|c}               &1        &   &2 \\\\               [_&1*&3_]  &  [_&2*&3_]           \\end{array}$$ est &solution car $$[_&1*&3_] \\div &1 = [_&2*&3_] \\div &2 = &sol$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "D\xE9terminer le coefficent de proportionnalit\xE9",
          subdescription: "Valeur fractionnaire",
          enounces: [
            "Quel est le coefficient de proportionnalit\xE9 de ce tableau ?"
          ],
          enounces2: [
            "$$\\begin{array}{c|c}           &1  &  [_&1*&3_] \\\\           &2  &  [_&2*&3_]         \\end{array}$$"
          ],
          variables: [
            { "&1": "$e[2;9]", "&2": "$e[2;9]\\{m(&1)}", "&3": "$e[2;9]" }
          ],
          solutions: [["&2/&1"]],
          correctionFormat: [
            {
              correct: ["Le coefficient de proportionnalit\xE9 est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le coefficient de proportionnalit\xE9 du tableau  $$\\begin{array}{c|c}               &1  &   [_&1*&3_] \\\\               &2  &  [_&2*&3_]           \\end{array}$$ est &solution car $$&2 \\div &1 = [_&2*&3_] \\div [_&1*&3_] = &sol$$."
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      "Calculer une quatri\xE8me proportionnelle": [
        {
          description: "Calculer une quatri\xE8me proportionnelle",
          subdescription: "En travaillant sur les colonnes",
          enounces: [
            "Ce tableau est un tableau de proportionnalit\xE9. D\xE9termine le nombre manquant."
          ],
          enounces2: [
            "$$\\begin{array}{c|c}                       &1  &  ?  \\\\                       &2  &   [_&2*&3_]                       \\end{array}$$",
            "$$\\begin{array}{c|c}                       &1  &   [_&1*&3_] \\\\                       &2  &  ?                        \\end{array}$$",
            "$$\\begin{array}{c|c}                       &1  &   [_&1*&3_] \\\\                       ?  &   [_&2*&3_]                       \\end{array}$$",
            "$$\\begin{array}{c|c}                        ?  &   [_&1*&3_] \\\\                       &2  &   [_&2*&3_]                       \\end{array}$$"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]\\{&1;&2}"
            }
          ],
          solutions: [["[_&1*&3_]"], ["[_&2*&3_]"], ["&2"], ["&1"]],
          correctionFormat: [
            {
              correct: [
                "$$\\begin{array}{c|c}             &1  &   &ans \\\\             &2  &   [_&2*&3_]           \\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}             &1  &   [_&1*&3_] \\\\             &2  &   &ans           \\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}               &1  &   [_&1*&3_] \\\\                 &ans  &  [_&2*&3_]            \\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}               &ans  &   [_&1*&3_] \\\\             &2  &  [_&2*&3_]            \\end{array}$$"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{array}{c|c}                 &1  &   &sol \\\\                 &2  &   [_&2*&3_]               \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times &3} = [_&2*&3_]$$ et $$&1 \\textcolor{${color1}}{\\times &3} = &sol$$`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                 &1  &   [_&1*&3_] \\\\                 &2  &   &sol               \\end{array}$$ car $$&1\\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol$$`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                 &1  &  [_&1*&3_]  \\\\                 &sol  &   [_&2*&3_]               \\end{array}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol$$`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                 &sol  &  [_&1*&3_]  \\\\                  &2 &   [_&2*&3_]               \\end{array}$$ car $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &2$$ et $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &sol$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer une quatri\xE8me proportionnelle",
          subdescription: "En utilisant le coefficient de proportionnalit\xE9",
          enounces: [
            "Ce tableau est un tableau de proportionnalit\xE9. D\xE9termine le nombre manquant."
          ],
          enounces2: [
            "$$\\begin{array}{c|c}                       &1  &  &2  \\\\                        ?  &   [_&2*&3_]                       \\end{array}$$",
            "$$\\begin{array}{c|c}                       &1  &  &2  \\\\                       [_&1*&3_]  &  ?                        \\end{array}$$",
            "$$\\begin{array}{c|c}                       &1  &   ? \\\\                       [_&1*&3_]  &   [_&2*&3_]                       \\end{array}$$",
            "$$\\begin{array}{c|c}                        ?  &   &2 \\\\                        [_&1*&3_]  &   [_&2*&3_]                       \\end{array}$$"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{m(&1);d(&1)}",
              "&3": "$e[2;9]\\{&1;&2}"
            }
          ],
          solutions: [["[_&1*&3_]"], ["[_&2*&3_]"], ["&2"], ["&1"]],
          correctionFormat: [
            {
              correct: [
                "$$\\begin{array}{c|c}             						&1  &  &2  \\\\             						&ans  &   [_&2*&3_]           						\\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}             						&1  &  &2  \\\\             						[_&1*&3_]  &  &ans           						\\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}               						&1  &  &ans  \\\\               						[_&1*&3_]   &  [_&2*&3_]            						\\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}               						&ans  &   &2 \\\\               						[_&1*&3_]  &  [_&2*&3_]            					\\end{array}$$"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{array}{c|c}                 &1  &  &2  \\\\                 &sol  &   [_&2*&3_]               \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times &3} = [_&2*&3_]$$ et $$&1 \\textcolor{${color1}}{\\times &3} = &sol$$`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                 &1  &   &2 \\\\                 [_&1*&3_] & &sol               \\end{array}$$ car $$&1\\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol$$`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                 &1  &  &sol \\\\                 [_&1*&3_]  &   [_&2*&3_]               \\end{array}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol$$`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                 &sol  &  &2  \\\\                 [_&1*&3_] &   [_&2*&3_]               \\end{array}$$ car $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &2$$ et $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &sol$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer une quatri\xE8me proportionnelle",
          subdescription: "En utilisant le coefficient de proportionnalit\xE9 qui est fractionnaire",
          enounces: [
            "Ce tableau est un tableau de proportionnalit\xE9. D\xE9termine le nombre manquant."
          ],
          enounces2: [
            "$$\\begin{array}{c|c}                       &1  &  &2  \\\\                        ?  &  &3                       \\end{array}$$",
            "$$\\begin{array}{c|c}                       &2  &  &1  \\\\                       &3  &  ?                        \\end{array}$$",
            "$$\\begin{array}{c|c}                       &2  &   ? \\\\                       &3  &  [_&1*&3/&2_]                       \\end{array}$$",
            "$$\\begin{array}{c|c}                        ?  &   &2 \\\\                        [_&1*&3/&2_]  &   &3                       \\end{array}$$"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$e[2;9]\\{cd(&2); &1}"
            }
          ],
          solutions: [["[_&1*&3/&2_]"], ["[_&1*&3/&2_]"], ["&1"], ["&1"]],
          correctionFormat: [
            {
              correct: [
                "$$\\begin{array}{c|c}             &1  &  &2  \\\\             &ans  &   &3           \\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}             &2  &  &1  \\\\             &3 & &ans           \\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}               &2  &  &ans  \\\\               &3 & [_&1*&3/&2_]             \\end{array}$$"
              ]
            },
            {
              correct: [
                "$$\\begin{array}{c|c}               &ans  &  &2  \\\\               [_&1*&3/&2_] &  &3             \\end{array}$$"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{array}{c|c}                 &1  &  &2  \\\\                 &sol  &   &3               \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = &3$$ et $$&1 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} =$$ &solution.`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                 &2 & &1  \\\\                 &3 & &sol               \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = &3$$ et $$&1 \\textcolor{${color1}}{\\times \\frac{&3}{&2}}} =$ &solution.`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                 &2 &  &sol \\\\                 &3 & [_&1*&3/&2_]               \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = &3$$ et $$&sol \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = [_&1*&3/&2_]$$`
              }
            ],
            [
              {
                text: `$$\\begin{array}{c|c}                  &sol & &2 \\\\                 [_&1*&3/&2_] & &3 				\\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = &3$$ et $$&sol \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = [_&1*&3/&2_]$$`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ],
      Appliquer: [
        {
          description: "R\xE9soudre un petit exercice de proportionnalit\xE9",
          subdescription: "petits nombres",
          enounces: [
            "$$&2$$ shawarmas co\xFBtent $$[_&2*&1_]\\,\u20AC$$. Combien co\xFBtent $$[_&3*&2_]$$ shawarmas ?",
            "$$&2$$ shawarmas co\xFBtent $$[_&2*&1_]\\,\u20AC$$. Combien puis-je acheter de shawarmas avec $$[_&3*&2*&1_]\\,\u20AC$$ ?",
            "$$&2\\,kg$$ de tomates co\xFBtent $$[_&2*&1_]\\,\u20AC$$. Combien co\xFBtent $$[_&3*&2_]\\,kg$$ de tomates ?",
            "$$&2\\,kg$$ de tomates co\xFBtent $$[_&2*&1_]\\,\u20AC$$. Combien puis-je acheter de tomates avec $$[_&3*&2*&1_]\\,\u20AC$$ ?",
            "Une fuite d'eau laisse s'\xE9chapper $$[_&2*&1_]\\,L$$ d'eau en $$&2\\,h$$. Combien de litres d'eau s'\xE9chappent en $$[_&3*&2_]\\,h$$ ?",
            "Une fuite d'eau laisse s'\xE9chapper $$[_&2*&1_]\\,L$$ d'eau en $$&2\\,h$$. En combien de temps s'\xE9chappe-t-il $$[_&3*&2*&1_]\\,L$$ d'eau ?"
          ],
          variables: [
            { "&1": "$l{2,5;3,5}", "&2": "$l{2;4;6}}", "&3": "$e[2;5]" }
          ],
          solutions: [
            ["[_&1*&2*&3_] \u20AC"],
            ["[_&2*&3_]"],
            ["[_&1*&2*&3_] \u20AC"],
            ["[_&2*&3_] kg"],
            ["[_&1*&2*&3_] L"],
            ["[_&2*&3_] h"]
          ],
          units: ["\u20AC", "", "\u20AC", "kg", "L", "h"],
          correctionFormat: [
            {
              correct: ["$$[_&3*&2_]$$ shawarmas co\xFBtent &answer."]
            },
            {
              correct: [
                "Je peux acheter &answer shawarmas pour $$[_&1*&2*&3_]\\,\u20AC$$."
              ],
              answer: "Je peux acheter &answer shawarmas."
            },
            {
              correct: ["$$[_&3*&2_]\\,kg$$ de tomates co\xFBtent &answer."]
            },
            {
              correct: [
                "Je peux acheter &answer de tomates pour $$[_&3*&2*&1_]\\,\u20AC$$."
              ]
            },
            {
              correct: ["Il s'\xE9chappe &answer d'eau en $$[_&3*&2_]\\,h$$."],
              answer: "Il s'\xE9chappe &answer d'eau."
            },
            {
              correct: ["Il s'\xE9chappe $$[_&3*&2*&1_]\\,L$$ d'eau en &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$[_&3*&2_]$$ shawarmas, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$&2$$ shawarmas \xE0 $$[_&1*&2 \u20AC_]$$, donc le prix de $$[_&3*&2_]$$ shawarmas est $$[_&1*&2 \u20AC_]\\textcolor{${color1}}{\\times &3} = &sol$$.`
              }
            ],
            [
              {
                text: `$$[_&3*&2*&1 \u20AC_]$$, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$[_&2*&1 \u20AC_]$$ pour $$&2$$ shawarmas, donc je peux acheter $$&2\\textcolor{${color1}}{\\times &3} = &sol$$ shawarmas.`
              }
            ],
            [
              {
                text: `$$[_&3*&2_]\\,kg$$ de tomates, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$&2\\,kg$$  \xE0 $$[_&1*&2\u20AC_]$$, donc le prix de $$[_&3*&2_]\\,kg$$ de tomates est $$[_&1*&2 \u20AC_]\\textcolor{${color1}}{\\times &3} = &sol$$.`
              }
            ],
            [
              {
                text: `$$[_&3*&2*&1 \u20AC_]$$, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$[_&2*&1\u20AC_]$$ pour $$&2\\,kg$$ de tomates, donc je peux acheter $$&2\\,kg\\textcolor{${color1}}{\\times &3} = &sol$$ de tomates.`
              }
            ],
            [
              {
                text: `$$[_&3*&2_]\\,h$$, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$&2\\,h$$ pour $$[_&1*&2_]\\,L$$, donc il s'\xE9chappe  $$[_&1*&2_]\\,L\\textcolor{${color1}}{\\times &3} = &sol$$ d'eau en $$[_&3*&2_]\\,h$$.`
              }
            ],
            [
              {
                text: `$$[_&3*&2*&1_]\\,L$$, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$[_&2*&1_]\\,L$$ en $$&2\\,h$$, donc il faut $$&2\\,h \\textcolor{${color1}}{\\times &3} = &sol$$ pour perdre $$[_&1*&2*&3_]\\,L$$ d'eau.`
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    },
    Pourcentages: {
      D\u00E9finition: [
        {
          description: "D\xE9finition d'un pourcentage",
          subdescription: "Convertir un pourcentage en une fraction de d\xE9nominateur 100.",
          enounces: ["Quelle est la fraction correspondant \xE0 :"],
          expressions: ["&1%"],
          variables: [{ "&1": "$e[1;100]" }],
          solutions: [["&1/100"]],
          options: ["no-penalty-for-non-reduced-fractions"],
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "D\xE9finition d'un pourcentage",
          subdescription: "convertir une fraction de d\xE9nominateur 100 en pourcentage.",
          enounces: ["Quelle est pourcentage correspondant \xE0 la fraction :"],
          expressions: ["&1/100"],
          variables: [{ "&1": "$e[1;100]" }],
          solutions: [["&1%"]],
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "D\xE9finition d'un pourcentage",
          subdescription: "Convertir un pourcentage en une fraction simplifi\xE9e.",
          enounces: ["Quelle est la fraction simplifi\xE9e correspondant \xE0 :"],
          expressions: ["&1%"],
          variables: [
            {
              "&1": "$l{10;20;30;40;50;60;70;80;90;100;25;75;200;300;400}",
              "&2": "pgcd(&1;100)"
            }
          ],
          correctionDetails: [
            [
              {
                text: `@@ &2 = 1 ?? $$ &1\\%=&sol $$ @@                 @@ &2 != 1 ?? $$\\begin{align} @@                 @@ &2 != 1 ?? &1\\% &= \\frac{&1}{100}  \\\\ @@                 @@ &2 != 1 ?? &= \\frac{&1 \\textcolor{${color1}}{\\div [_&2_]}}{100 \\textcolor{${color1}}{\\div [_&2_]}} \\\\ @@                @@ &2 != 1 && 100/&2 = 1 ?? &= \\frac{[_&1/&2_]}{1} \\\\  @@                 @@ &2 != 1 ?? &= &sol \\\\ @@                 @@ &2 != 1 ?? \\end{align}$$ @@`
              }
            ]
          ],
          defaultDelay: 10,
          grade: SIXIEME
        }
      ],
      Proportions: [],
      Calculer: [
        {
          description: "Calculer le pourcentage d'une quantit\xE9",
          subdescription: "50%",
          enounces: ["Calcule $$50\\%$$ de $$[_&1*2_]$$."],
          solutions: [["&1"]],
          variables: [{ "&1": "$e[1;50]" }],
          correctionFormat: [
            {
              correct: ["$$50\\%$$ de $$[_&1*2_]$$ est \xE9gal \xE0 &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$50\\%$$ signifie la moiti\xE9 donc $$50\\%$$ de $$[_&1*2_]$$ est \xE9gal \xE0 $$[_&1*2_] \\div 2=$$&solution. "
              }
            ]
          ],
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "Calculer le pourcentage d'une quantit\xE9",
          subdescription: "10% d'un multiple de 10",
          enounces: ["Calcule $$10\\%$$ de $$[_&1*10_]$$."],
          solutions: [["&1"]],
          variables: [{ "&1": "$e[1;50]" }],
          correctionFormat: [
            {
              correct: ["$$10\\%$$ de $$[_&1*10_]$$ est \xE9gal \xE0 &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$10\\%$$ signifie $$\\frac{1}{10}$$ donc $$10\\%$$ de $$[_&1*10_]$$ est \xE9gal \xE0 $$[_&1*10_] \\div 10=$$&solution. "
              }
            ]
          ],
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "Calculer le pourcentage d'une quantit\xE9",
          subdescription: "10% d'un nombre non multiple de 10",
          enounces: ["Calcule $$10\\%$$ de $$[_&1_]$$."],
          solutions: [["[._10%*&1_]"]],
          variables: [{ "&1": "$e[1;100]\\{m10}" }],
          correctionFormat: [
            {
              correct: ["$$10\\%$$ de $$&1$$ est \xE9gal \xE0 &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$10\\%$$ signifie $$\\frac{1}{10}$$ donc $$10\\%$$ de $$&1$$ est \xE9gal \xE0 $$&1 \\div 10=$$&solution. "
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "Calculer le pourcentage d'une quantit\xE9",
          subdescription: "20%-40% d'un multiple de 10",
          enounces: ["Calcule $$&1\\%$$ de $$[_&2*10_]$$."],
          solutions: [["[_&1%*&2*10_]"]],
          variables: [{ "&1": "$l{20;30;40}", "&2": "$e[1;40]" }],
          correctionFormat: [
            {
              correct: ["$$&1\\%$$ de $$[_&2*10_]$$ est \xE9gal \xE0 &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$10\\%$$ de $$[_&2*10_]$$ repr\xE9sente $$&2$$ donc $$&1\\%$$ repr\xE9sente $$[_&1:10_] \\times &2 =$$ &solution. "
              }
            ]
          ],
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "Calculer le pourcentage d'une quantit\xE9",
          subdescription: "25%",
          enounces: ["Calcule $$25\\%$$ de $$[_&1*4_]$$."],
          solutions: [["&1"]],
          variables: [{ "&1": "$e[1;15]" }],
          correctionFormat: [
            {
              correct: ["$$25\\%$$ de $$[_&1*4_]$$ est \xE9gal \xE0 &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$25\\%$$ signifie $$\\frac{1}{4}$$ donc $$25\\%$$ de $$[_&1*4_]$$ est \xE9gal \xE0 $$[_&1*4_] \\div 4=$$&solution. "
              }
            ]
          ],
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "Calculer le pourcentage d'une quantit\xE9",
          subdescription: "75%",
          enounces: ["Calcule $$75\\%$$ de $$[_&1*4_]$$."],
          solutions: [["[_75%*&1*4_]"]],
          variables: [{ "&1": "$e[1;12]" }],
          correctionFormat: [
            {
              correct: ["$$75\\%$$ de $$[_&1*4_]$$ est \xE9gal \xE0 &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$25\\%$$ signifie $$\\frac{3}{4}$$ donc $$25\\%$$ de $$[_&1*4_]$$ est \xE9gal \xE0 $$\\left([_&1*4_] \\div 4 \\right) \\times 3=$$&solution. "
              }
            ]
          ],
          defaultDelay: 10,
          grade: SIXIEME
        }
      ],
      Variations: [
        {
          description: "Augmentation",
          enounces: [
            "Un article qui co\xFBtait initialement $$[_&1_]$$ Qr voit son prix augmenter de $$&2\\%$$. Quel est son nouveau prix?"
          ],
          solutions: [["[_&1*(1+&2/100)_]"]],
          variables: [{ "&1": "$e[2;20]*10", "&2": "$l{10;20;50;100;200}" }],
          correctionFormat: [
            {
              correct: ["Le nouveau prix est de &answer Qr."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "L'augmentation est de $$&2\\% \\times [_&1_] = [_&2%*&1_]$$ Qr. Le nouveau prix est donc $$[_&1_] + [_&2%*&1_] =$$ &solution Qr. "
              }
            ]
          ],
          defaultDelay: 30,
          grade: SIXIEME
        },
        {
          description: "Diminution",
          enounces: [
            "Un article qui co\xFBtait initialement $$[_&1_]$$ Qr voit son prix diminuer de $$&2\\%$$. Quel est son nouveau prix?"
          ],
          solutions: [["[_&1*(1-&2/100)_]"]],
          variables: [{ "&1": "$e[2;20]*10", "&2": "$l{10;20;30;50;100}" }],
          correctionFormat: [
            {
              correct: ["Le nouveau prix est de &answer Qr."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "La diminution est de $$&2\\% \\times [_&1_] = [_&2%*&1_]$$ Qr. Le nouveau prix est donc $$[_&1_] - [_&2%*&1_] =$$ &solution Qr. "
              }
            ]
          ],
          defaultDelay: 30,
          grade: SIXIEME
        },
        {
          description: "Trouver le coefficient multiplicateur",
          subdescription: "Augmentation",
          enounces: [
            "Quel est le coefficient multiplicateur correspondant \xE0 une augmentation de $$&1\\%$$?"
          ],
          solutions: [["[._1+&1/100_]"]],
          variables: [{ "&1": "$l{$e[1;30];100;200;50}" }],
          correctionFormat: [
            {
              correct: ["Le coefficient multiplicateur est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le coefficient multiplicateur est $$1+\\frac{&1}{100}=$$ &solution."
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "Trouver le coefficient multiplicateur",
          subdescription: "Diminution",
          enounces: [
            "Quel est le coefficient multiplicateur correspondant \xE0 une diminution de $$&1\\%$$?"
          ],
          solutions: [["[._1-&1/100_]"]],
          variables: [{ "&1": "$e[1;100]" }],
          correctionFormat: [
            {
              correct: ["Le coefficient multiplicateur est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Le coefficient multiplicateur est $$1-\\frac{&1}{100}=1-[._&1:100_]=$$ &solution."
              }
            ]
          ],
          "result-type": "decimal",
          defaultDelay: 10,
          grade: SECONDE
        },
        {
          description: "Trouver le pourcentage d'augmentation",
          enounces: [
            "Quel est le pourcentage d'augmentation correspondant \xE0 un coefficient multiplicateur de $$[._1+&1/100_]$$?"
          ],
          solutions: [["&1%"]],
          variables: [
            { "&1": "$l{$e[1;30];$e[31;49];$e[51;70];$e[71;90];100;50;200}" }
          ],
          correctionFormat: [
            {
              correct: ["Le pourcentage d'augmentation est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[._1+&1/100_]=1+\\frac{&1}{100}$$ donc le pourcentage d'augmentation est &solution."
              }
            ]
          ],
          defaultDelay: 10,
          grade: SECONDE
        },
        {
          description: "Trouver le pourcentage de diminution",
          enounces: [
            "Quel est le pourcentage de diminution correspondant \xE0 un coefficient multiplicateur de $$[._1-&1/100_]$$?"
          ],
          variables: [
            { "&1": "$l{$e[1;30];$e[31;49];$e[51;70];$e[71;90];100;50}" }
          ],
          type: "rewrite",
          correctionFormat: [
            {
              correct: ["Le pourcentage de diminution est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[._1-&1/100_]=1-\\frac{&1}{100}$$ donc le pourcentage de diminution est &solution."
              }
            ]
          ],
          solutions: [["&1%"]],
          defaultDelay: 10,
          grade: SECONDE
        }
      ]
    },
    "Echelle d'une carte": {
      "Trouver l'\xE9chelle": [
        {
          description: "Trouver l'\xE9chelle d'une carte",
          subdescription: "M\xEAmes unit\xE9s.",
          enounces: [
            "Quelle est l'\xE9chelle d'une carte o\xF9 $$[\xB0&3\xB0]$$ sur la carte correspond \xE0 $$1\\,cm$$ en r\xE9alit\xE9 ?"
          ],
          solutions: [["[_(1 cm)/&3_]"]],
          variables: [
            { "&1": "$e[1;9]", "&2": "10^$e[1;6]", "&3": "[_&1*&2_] cm" }
          ],
          correctionFormat: [
            {
              correct: ["L'\xE9chelle est &answer."]
            }
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Trouver l'\xE9chelle d'une carte",
          subdescription: "Unit\xE9s diff\xE9rentes.",
          enounces: [
            "Quelle est l'\xE9chelle d'une carte o\xF9 $$[\xB0&1\xB0]$$ sur la carte correspond \xE0 $$1\\,cm$$ en r\xE9alit\xE9 ?"
          ],
          solutions: [["[_(1 cm)/&1_]"]],
          variables: [
            { "&1": "$e[2;9] dm" },
            { "&1": "$e[2;9] m" },
            { "&1": "$e[2;9] dam" },
            { "&1": "$e[2;9] hm" },
            { "&1": "$e[2;9] km" }
          ],
          correctionFormat: [
            {
              correct: ["L'\xE9chelle est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\frac{1\\,cm}{[\xB0&1\xB0]}=\\frac{1\\,cm}{[_&1_cm_]}=&sol$$"
              }
            ]
          ],
          options: ["no-exp"],
          defaultDelay: 10,
          grade: SIXIEME
        }
      ],
      "Utiliser l'\xE9chelle": [
        {
          description: "Calculer la longueur sur une carte",
          enounces: [
            "Sur une carte \xE0 l'\xE9chelle $$[_&4_]$$, je veux repr\xE9senter une longueur de $$[\xB0&3\xB0]$$. Quelle est, en $$cm$$, la longueur sur la carte ?"
          ],
          answerFields: ["$$? cm$$"],
          solutions: [["[_&5/(&1 cm)_]"]],
          variables: [
            { "&1": "10", "&2": "$e[1;9]*10", "&3": "[_&2_] dm", "&4": "1/&1" },
            {
              "&1": "100",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] dm",
              "&4": "1/&1",
              "&5": "[_&3_cm_]"
            },
            {
              "&1": "100",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] m",
              "&4": "1/&1",
              "&5": "[_&3_cm_]"
            },
            {
              "&1": "1000",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] m",
              "&4": "1/&1",
              "&5": "[_&3_cm_]"
            },
            {
              "&1": "100000",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] km",
              "&4": "1/&1",
              "&5": "[_&3_cm_]"
            },
            {
              "&1": "1000000",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] km",
              "&4": "1/&1",
              "&5": "[_&3_cm_]"
            }
          ],
          units: ["cm"],
          correctionFormat: [
            {
              correct: ["Sur la carte, la longueur est de &answer $$cm$$."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:10_]\\,dm}= \\frac{&sol cm}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:10_]\\,dm}= \\frac{&sol cm}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100_]\\,m}= \\frac{&sol cm}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100_]\\,m}= \\frac{&sol cm}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100000_]\\,km}= \\frac{&sol cm}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100000_]\\,km}= \\frac{&sol cm}{[\xB0&3\xB0]}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        },
        {
          description: "Calculer la longueur r\xE9elle",
          enounces: [
            "Sur une carte \xE0 l'\xE9chelle $$[_&4_]$$, je mesure une longueur de $$[\xB0&3\xB0]$$. Quelle est la longueur r\xE9elle ?"
          ],
          solutions: [
            ["[_(&3)*&1_dm_]"],
            ["[_(&3)*&1_m_]"],
            ["[_(&3)*&1_m_]"],
            ["[_(&3)*&1_dam_]"],
            ["[_(&3)*&1_km_]"],
            ["[_(&3)*&1_km_]"]
          ],
          variables: [
            {
              "&1": "10",
              "&2": "$e[2;9]*10^$e[0;1]",
              "&3": "[_&2_] cm",
              "&4": "1/&1"
            },
            { "&1": "100", "&2": "$e[2;9]", "&3": "&2 cm", "&4": "1/&1" },
            {
              "&1": "100",
              "&2": "$e[2;9]*10^$e[0;1]",
              "&3": "[_&2_] cm",
              "&4": "1/&1"
            },
            { "&1": "1000", "&2": "$e[2;9]", "&3": "&2 cm", "&4": "1/&1" },
            {
              "&1": "100000",
              "&2": "$e[2;9]*10^$e[0;1]",
              "&3": "[_&2_] cm",
              "&4": "1/&1"
            },
            { "&1": "1000000", "&2": "$e[2;9]", "&3": "&2 cm", "&4": "1/&1" }
          ],
          units: ["dm", "dm", "m", "m", "km", "km"],
          options: ["no-penalty-for-not-respected-unit"],
          correctionFormat: [
            {
              correct: ["La longueur r\xE9elle est de &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:10)_]\\,dm}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:10)_]\\,dm}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:100)_]\\,m}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:100)_]\\,m}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:100000)_]\\,km}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:100000)_]\\,km}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: SIXIEME
        }
      ]
    },
    "Vitesse uniforme": {
      "D\xE9terminer une vitesse": [
        {
          description: "D\xE9terminer une vitesse moyenne",
          enounces: [
            "Une voiture parcourt $$&1$$ en Quelle est l'\xE9chelle d'une carte o\xF9 $$[\xB0&3\xB0]$$ sur la carte correspond \xE0 $$1\\,cm$$ en r\xE9alit\xE9 ?"
          ],
          expressions: ["(1 cm)/&3"],
          variables: [
            { "&1": "$e[1;9]", "&2": "10^$e[1;6]", "&3": "[_&1*&2_] cm" }
          ],
          options: ["no-exp"],
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "Trouver l'\xE9chelle d'une carte",
          subdescription: "Unit\xE9s diff\xE9rentes.",
          enounces: [
            "Quelle est l'\xE9chelle d'une carte o\xF9 $$[\xB0&1\xB0]$$ sur la carte correspond \xE0 $$1\\,cm$$ en r\xE9alit\xE9 ?"
          ],
          expressions: ["(1 cm)/&1"],
          variables: [
            { "&1": "$e[2;9] dm" },
            { "&1": "$e[2;9] m" },
            { "&1": "$e[2;9] dam" },
            { "&1": "$e[2;9] hm" },
            { "&1": "$e[2;9] km" }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\frac{1\\,cm}{[\xB0&1\xB0]}=\\frac{1\\,cm}{[_&1;cm_]}=&sol$$"
              }
            ]
          ],
          options: ["no-exp"],
          defaultDelay: 10,
          grade: SIXIEME
        }
      ],
      "Utiliser l'\xE9chelle": [
        {
          description: "Calculer la longueur sur une carte",
          enounces: [
            "Sur une carte \xE0 l'\xE9chelle $$[_&4_]$$, je veux repr\xE9senter une longueur de $$[\xB0&3\xB0]$$. Quelle est, en $$cm$$, la longueur sur la carte ?"
          ],
          expressions: ["(&3)/&1"],
          variables: [
            { "&1": "10", "&2": "$e[1;9]*10", "&3": "[_&2_] dm", "&4": "1/&1" },
            {
              "&1": "100",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] dm",
              "&4": "1/&1"
            },
            { "&1": "100", "&2": "$e[1;9]*10", "&3": "[_&2_] m", "&4": "1/&1" },
            {
              "&1": "1000",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] m",
              "&4": "1/&1"
            },
            {
              "&1": "100000",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] km",
              "&4": "1/&1"
            },
            {
              "&1": "1000000",
              "&2": "$e[1;9]*10",
              "&3": "[_&2_] km",
              "&4": "1/&1"
            }
          ],
          units: ["cm"],
          options: ["no-exp"],
          correctionFormat: [
            {
              correct: [
                "Avec une \xE9chelle de $$[_&4_]$$, $$[\xB0&3\xB0]$$ est repr\xE9sent\xE9 par &answer."
              ],
              answer: "$$[\xB0&3\xB0]$$ est repr\xE9sent\xE9 par &answer."
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:10_]\\,dm}= \\frac{&sol}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:10_]\\,dm}= \\frac{&sol}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100_]\\,m}= \\frac{&sol}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100_]\\,m}= \\frac{&sol}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100000_]\\,km}= \\frac{&sol}{[\xB0&3\xB0]}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100000_]\\,km}= \\frac{&sol}{[\xB0&3\xB0]}$$"
              }
            ]
          ],
          defaultDelay: 10,
          grade: SIXIEME
        },
        {
          description: "Calculer la longueur r\xE9elle",
          enounces: [
            "Sur une carte \xE0 l'\xE9chelle $$[_&4_]$$, je mesure une longueur de $$[\xB0&3\xB0]$$. Quelle est, en $$dm$$, la longueur r\xE9elle ?"
          ],
          expressions: ["(&3)*&1"],
          variables: [
            {
              "&1": "10",
              "&2": "$e[2;9]*10^$e[0;1]",
              "&3": "[_&2_] cm",
              "&4": "1/&1"
            },
            { "&1": "100", "&2": "$e[2;9]", "&3": "&2 cm", "&4": "1/&1" },
            {
              "&1": "100",
              "&2": "$e[2;9]*10^$e[0;1]",
              "&3": "[_&2_] cm",
              "&4": "1/&1"
            },
            { "&1": "1000", "&2": "$e[2;9]", "&3": "&2 cm", "&4": "1/&1" },
            {
              "&1": "100000",
              "&2": "$e[2;9]*10^$e[0;1]",
              "&3": "[_&2_] cm",
              "&4": "1/&1"
            },
            { "&1": "1000000", "&2": "$e[2;9]", "&3": "&2 cm", "&4": "1/&1" }
          ],
          units: ["dm", "dm", "m", "m", "km", "km"],
          correctionFormat: [
            {
              correct: [
                "A une \xE9chelle de $$[_&4_]$$, $$[\xB0&3\xB0]$$ sur la carte correspond \xE0 une longueur r\xE9elle de &answer."
              ],
              answer: "La longueur r\xE9elle est de &answer."
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:10)_]\\,dm}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:10)_]\\,dm}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:100)_]\\,m}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:100)_]\\,m}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:100000)_]\\,km}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ],
            [
              {
                text: "$$[_&4_]=\\frac{1\\,cm}{[\xB0&1 cm\xB0]}= \\frac{1\\,cm}{[_(&1:100000)_]\\,km}= \\frac{[\xB0&3\xB0]}{&sol}$$"
              }
            ]
          ],
          options: ["no-exp"],
          defaultDelay: 10,
          grade: SIXIEME
        }
      ]
    }
  },
  "Calcul litt\xE9ral": {
    Calculs: {
      "Par substitution": [
        {
          description: "Calculer en substituant les variables",
          subdescription: "Expressions simples. Pas de simplification de la multiplication.",
          enounces: [
            "Calculer $$&3 \\times &1$$ avec $$&1=&2$$",
            "Calculer $$&1 \\times &3$$ avec $$&1=&2$$",
            "Calculer $$&3 + &1$$ avec $$&1=&2$$",
            "Calculer $$&1 + &3$$ avec $$&1=&2$$"
          ],
          expressions: ["&3*&1", "&1*&3", "&3+&1", "&1+&3"],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]"
            }
          ],
          letters: [
            {
              "&1": "&2"
            }
          ],
          options: ["no-exp"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &3 \\times \\textcolor{${color1}}{&1} &= &3 \\times \\textcolor{${color1}}{&2} \\\\ &=  &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\textcolor{${color1}}{&1} \\times &3 &= \\textcolor{${color1}}{&2} \\times &3 \\\\ &=  &sol  \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 + \\textcolor{${color1}}{&1} &= &3 + \\textcolor{${color1}}{&2} \\\\ &=  &sol   \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} \\textcolor{${color1}}{&1} + &3 &= \\textcolor{${color1}}{&2} + &3 \\\\ &=  &sol  \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Calculer en substituant les variables",
          subdescription: "Expressions simples. Simplification de la multiplication.",
          enounces: [
            "Calculer $$&3&1$$ avec $$&1=&2$$",
            "Calculer $$&3 + &1$$ avec $$&1=&2$$"
          ],
          expressions: ["&3&1", "&3+&1"],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]"
            }
          ],
          letters: [
            {
              "&1": "&2"
            }
          ],
          options: ["no-exp"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &3 \\textcolor{${color1}}{&1} &= &3 \\times \\textcolor{${color1}}{&2} \\\\ &=  &sol  \\\\ \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &3 + \\textcolor{${color1}}{&1} &= &3 + \\textcolor{${color1}}{&2} \\\\ &=  &sol  \\\\ \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Calculer en substituant les variables",
          subdescription: "Entiers naturels",
          enounces: [
            "Calculer $$&3&1+&4$$ avec $$&1=&2$$",
            "Calculer $$&4+&3&1$$ avec $$&1=&2$$",
            "Calculer $$&4&5+&3&1$$ avec $$&1=&2$$ et $$&5=&6$$"
          ],
          expressions: ["&3&1+&4", "&4+&3&1", "&4&5+&3&1"],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$e[2;9]",
              "&5": "$l{a;b;c}\\{&1}",
              "&6": "$e[2;9]"
            }
          ],
          letters: [
            {
              "&1": "&2",
              "&5": "&6"
            }
          ],
          options: ["no-exp"],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} &3 \\textcolor{${color1}}{&1} + &4 &= &3 \\times \\textcolor{${color1}}{&2} + &4 \\\\ &= [_&3*&2_] + &4  \\\\ &=  &sol  \\\\ \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &4 + &3 \\textcolor{${color1}}{&1} &= &4 + &3 \\times \\textcolor{${color1}}{&2} \\\\ &= &4 + [_&3*&2_]  \\\\ &=  &sol  \\\\ \\end{align}$$`
              }
            ],
            [
              {
                text: `$$\\begin{align} &4 \\textcolor{${color2}}{&5} + &3 \\textcolor{${color1}}{&1} &= &4 \\times \\textcolor{${color2}}{&6} + &3 \\times \\textcolor{${color1}}{&2} \\\\ &= [_&4*&6_] + [_&3*&2_]  \\\\ &=  &sol  \\\\ \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Calculer en substituant les variables",
          subdescription: "Entiers relatifs",
          enounces: [
            "Calculer $$&3&1[+_&4_]$$ avec $$&1=&2$$",
            "Calculer $$&3&1[+_&4_]$$ avec $$&1=&2$$",
            "Calculer $$&4[+_&3_]&1$$ avec $$&1=&2$$",
            "Calculer $$&4[+_&3_]&1$$ avec $$&1=&2$$",
            "Calculer $$&4&5[+_&3_]&1$$ avec $$&1=&2$$ et $$&5=&6$$"
          ],
          expressions: [
            "&3&1[+_&4_]",
            "&3&1[+_&4_]",
            "&4[+_&3_]&1",
            "&4[+_&3_]&1",
            "&4&5[+_&3_]&1"
          ],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[2;5]",
              "&3": "$er[2;5]",
              "&4": "$er[2;9]",
              "&5": "$l{a;b;c}\\{&1}",
              "&6": "$er[2;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "-$e[2;5]",
              "&3": "$er[2;5]",
              "&4": "$er[2;9]",
              "&5": "$l{a;b;c}\\{&1}",
              "&6": "$er[2;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[2;5]",
              "&3": "$er[2;5]",
              "&4": "$er[2;9]",
              "&5": "$l{a;b;c}\\{&1}",
              "&6": "$er[2;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "-$e[2;5]",
              "&3": "$er[2;5]",
              "&4": "$er[2;9]",
              "&5": "$l{a;b;c}\\{&1}",
              "&6": "$er[2;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[2;5]",
              "&3": "$er[2;5]",
              "&4": "$er[2;9]",
              "&5": "$l{a;b;c}\\{&1}",
              "&6": "$e[2;9]"
            }
          ],
          letters: [
            {
              "&1": "&2",
              "&5": "&6"
            }
          ],
          options: ["no-exp"],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               &3 \\textcolor{${color1}}{&1} [+_&4_]               &= &3 \\times \\textcolor{${color1}}{&2} [+_&4_] \\\\               &= [_&3*(&2)_] [+_&4_]  \\\\               &=  &sol  \\\\               \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &3 \\textcolor{${color1}}{&1} [+_&4_]               &= &3 \\times  \\textcolor{${color1}}{\\left( &2 \\right) } [+_&4_] \\\\               &= [_&3*(&2)_] [+_&4_]  \\\\               &=  &sol  \\\\               \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &4 [+_&3_] \\textcolor{${color1}}{&1}               &= &4 [+_&3_] \\times \\textcolor{${color1}}{&2} \\\\               &= &4  [+_&3*&2_]  \\\\               &=  &sol  \\\\ \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &4 [+_&3_] \\textcolor{${color1}}{&1}               &= &4 [+_&3_] \\times  \\textcolor{${color1}}{\\left( &2 \\right)}  \\\\               &= &4 [+_&3*(&2)_]  \\\\               &=  &sol  \\\\ \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &4 \\textcolor{${color2}}{&5}  [+_&3_] \\textcolor{${color1}}{&1}               &= &4 \\times \\textcolor{${color2}}{&6} [+_&3_] \\times \\textcolor{${color1}}{&2} \\\\               &= [_&4*&6_] [+_&3*&2_]  \\\\               &=  &sol  \\\\               \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        }
      ]
    },
    Transformation: {
      "Simplification d'\xE9criture": [
        {
          description: "Simplifier le symbole de multiplication",
          subdescription: "Devant une lettre",
          enounces: ["R\xE9\xE9cris l'expression en la simplifiant."],
          expressions: ["&2*&1", "&1*&2"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y}",
              "&2": "$e[2;9]"
            }
          ],
          options: [
            "require-implicit-products",
            "disallow-factors-permutation"
          ],
          solutions: [["&2&1"]],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Simplifier le symbole de multiplication",
          subdescription: "Devant une parenth\xE8se",
          enounces: ["Simplifie l'\xE9criture de cette expression."],
          expressions: [
            "&3*(&1+&2)",
            "&3*(&1+&4)",
            "&5*(&1+&2)",
            "&5*(&1+&4)",
            "(&1+&2)*&5",
            "(&1+&4)*&5"
          ],
          variables: [
            {
              "&1": "$l{a;b;c;x;y}",
              "&2": "$l{a;b;c;x;y}\\{&1}",
              "&3": "$l{a;b;c;x;y}",
              "&4": "$e[2;9]",
              "&5": "$e[2;9]"
            }
          ],
          options: [
            "require-implicit-products",
            "disallow-factors-permutation"
          ],
          solutions: [
            ["&3(&1+&2)"],
            ["&3(&1+&4)"],
            ["&5(&1+&2)"],
            ["&5(&1+&4)"],
            ["&5(&1+&2)"],
            ["&5(&1+&4)"]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Simplifier un produit par 0 ou 1",
          enounces: ["Ecris plus simplement cette expression litt\xE9rale :"],
          expressions: ["1&1", "0&1"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y}"
            }
          ],
          options: ["require-no-factor-one", "require-no-factor-zero"],
          solutions: [["&1"], ["0"]],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Simplifier \xE0 l'aide d'un carr\xE9 ou d'un cube",
          enounces: ["Simlifie l'\xE9criture de cette expression litt\xE9rale :"],
          expressions: ["&1*&1", "&1*&1*&1"],
          variables: [
            {
              "&1": "$l{a;b;c;x;y}"
            }
          ],
          solutions: [["&1^2"], ["&1^3"]],
          type: "rewrite",
          defaultDelay: 30,
          grade: CINQUIEME
        }
      ],
      R\u00E9duction: [
        {
          description: "R\xE9duire une somme",
          subdescription: "Coefficients positifs, 2 m\xEAme litt\xE9raux",
          enounces: ["R\xE9duire :"],
          expressions: ["[_&2&1_]+[_&3&1_]", "[_&3&1_]-[_&2&1_]"],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[1;8]",
              "&3": "$e[&2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               [_&2&1_]+[_&3&1_]               &= (&2+&3) \\times &1 \\\\               &= [_&2+&3_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&3&1_]-[_&2&1_]               &= (&3-&2) \\times &1 \\\\               &= [_&3-&2_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "R\xE9duire une somme",
          subdescription: "Coefficients positifs, deux m\xEAme litt\xE9raux + un entier",
          enounces: ["R\xE9duire :"],
          expressions: [
            "&4+[_&2&1_]+[_&3&1_]",
            "[_&2&1_]+&4+[_&3&1_]",
            "[_&2&1_]+[_&3&1_]+&4",
            "&4+[_&3&1_]-[_&2&1_]",
            "[_&3&1_]+&4-[_&2&1_]",
            "[_&3&1_]-[_&2&1_]+&4"
          ],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]",
              "&4": "$e[1;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[1;8]",
              "&3": "$e[&2;9]",
              "&4": "$e[1;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[1;8]",
              "&3": "$e[&2;9]",
              "&4": "$e[1;9]"
            },
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[1;8]",
              "&3": "$e[&2;9]",
              "&4": "$e[1;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               &4+[_&2&1_]+[_&3&1_]               &= &4 + (&2+&3) \\times &1 \\\\               &= &4 + [_&2+&3_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&2&1_]+&4+[_&3&1_]               &= &4 + (&2+&3) \\times &1 \\\\               &= &4 + [_&2+&3_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&2&1_]+[_&3&1_] + &4              &= (&2+&3) \\times &1 + &4\\\\               &= [_&2+&3_] \\times &1  + &4 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &4+[_&3&1_]-[_&2&1_]               &= &4 + (&3-&2) \\times &1 \\\\               &= &4 + [_&3-&2_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&3&1_] + &4 -[_&2&1_]               &= &4 + (&3-&2) \\times &1 \\\\               &= &4 + [_&3-&2_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&3&1_]-[_&2&1_] + &4              &= (&3-&2) \\times &1  + &4 \\\\               &= [_&3-&2_] \\times &1  + &4 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "R\xE9duire une expression",
          subdescription: "Coefficients positifs",
          enounces: ["R\xE9duire :"],
          expressions: [
            "&2&1+&3&1+&5&4+&6&4",
            "&2&1+&5&4+&3&1+&6&4",
            "&2&1+&5&4+&6&4+&3&1"
          ],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]",
              "&4": "$l{a;b;c}\\{&1}",
              "&5": "$e[2;9]",
              "&6": "$e[2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               &2\\textcolor{${color1}}{&1}+&3\\textcolor{${color1}}{&1}+&5\\textcolor{${color2}}{&4}+&6\\textcolor{${color2}}{&4}               &= (&2+&3) \\times \\textcolor{${color1}}{&1} + (&5+&6) \\times \\textcolor{${color2}}{&4} \\\\               &= [_&2+&3_] \\times \\textcolor{${color1}}{&1} + [_&5+&6_] \\times \\textcolor{${color2}}{&4} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2\\textcolor{${color1}}{&1} + &5\\textcolor{${color2}}{&4} + &3\\textcolor{${color1}}{&1}+&6\\textcolor{${color2}}{&4}               &= (&2+&3) \\times \\textcolor{${color1}}{&1} + (&5+&6) \\times \\textcolor{${color2}}{&4} \\\\               &= [_&2+&3_] \\times \\textcolor{${color1}}{&1} + [_&5+&6_] \\times \\textcolor{${color2}}{&4} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2\\textcolor{${color1}}{&1} + &5\\textcolor{${color2}}{&4} + &6\\textcolor{${color2}}{&4} + &3\\textcolor{${color1}}{&1}               &= (&2+&3) \\times \\textcolor{${color1}}{&1} + (&5+&6) \\times \\textcolor{${color2}}{&4} \\\\               &= [_&2+&3_] \\times \\textcolor{${color1}}{&1} + [_&5+&6_] \\times \\textcolor{${color2}}{&4} \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "R\xE9duire un produit",
          subdescription: "Coefficients positifs",
          enounces: ["R\xE9duire :"],
          expressions: [
            "&1*&2*&3",
            "&2*&1*&3",
            "&3*&2*&1",
            "&1*&2*&1",
            "&1*&1*&2",
            "&2*&1*&1"
          ],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;z}",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               &1 \\times &2 \\times &3               &= &1 \\times [_&2*&3_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2 \\times &1 \\times &3               &= &2 \\times &3 \\times &1 \\\\               &= [_&3*&2_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &3 \\times &2 \\times &1               &= [_&3*&2_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &1 \\times &2 \\times &1               &= &2 \\times &1 \\times &1 \\\\               &= &2 \\times &1^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &1 \\times &1 \\times &2               &= &1^2 \\times &2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2 \\times &1 \\times &1               &= &2 \\times &1^2 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "R\xE9duire une somme",
          subdescription: "Coefficients relatifs",
          enounces: ["R\xE9duire :"],
          expressions: ["[_&2&1_][+_&3&1_]"],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$er[1;9]",
              "&3": "$ers[1;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               [_&2&1_][+_&3&1_]               &= (&2[+_&3_]) \\times &1 \\\\               &= [_&2+(&3)_] \\times &1 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: TROISIEME
        },
        {
          description: "R\xE9duire une somme",
          subdescription: "Coefficients relatifs",
          enounces: ["R\xE9duire :"],
          expressions: [
            "[_&2&1_][+_&3&1_][+_&5&4_][+_&6&4_]",
            "[_&2&1_][+_&3&4_][+_&5&1_][+_&6&4_]",
            "[_&2&1_][+_&3&4_][+_&5&4_][+_&6&1_]"
          ],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$er[1;9]",
              "&3": "$er[1;9]",
              "&4": "$l{a;b;c}\\{&1}",
              "&5": "$er[1;9]",
              "&6": "$er[1;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               [_&2&1_][+_&3&1_][+_&5&4_][+_&6&4_]               &= (&2[+_&3_]) \\times &1 + (&5[+_&6_]) \\times &4 \\\\\xA0              &= [_&2+(&3)_] \\times &1 [+_&5+(&6)_] \\times &4 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&2&1_][+_&3&4_][+_&5&1_][+_&6&4_]               &= (&2[+_&5_]) \\times &1 + (&3[+_&6_]) \\times &4 \\\\\xA0              &= [_&2+(&5)_] \\times &1 [+_&3+(&6)_] \\times &4 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&2&1_][+_&3&4_][+_&5&4_][+_&6&1_]               &= (&2[+_&6_]) \\times &1 + (&3[+_&5_]) \\times &4 \\\\\xA0              &= [_&2+(&6)_] \\times &1 [+_&3+(&5)_] \\times &4 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: TROISIEME
        },
        {
          description: "R\xE9duire un produit",
          subdescription: "Coefficients relatifs",
          enounces: ["R\xE9duire :"],
          expressions: [
            "&1*(-&2)*&3",
            "(-&2)*&1*&3",
            "&3*(-&2)*&1",
            "&1*&2*(-&3)",
            "&2*&1*(-&3)",
            "(-&3)*&2*&1",
            "&1*(-&2)*(-&3)",
            "(-&2)*&1*(-&3)",
            "(-&3)*(-&2)*&1",
            "(-&1)*(-&2)*&3",
            "(-&2)*(-&1)*&3",
            "&3*(-&2)*(-&1)",
            "(-&1)*&2*(-&3)",
            "&2*(-&1)*(-&3)",
            "(-&3)*&2*(-&1)",
            "(-&1)*(-&2)*(-&3)",
            "(-&2)*(-&1)*(-&3)",
            "(-&3)*(-&2)*(-&1)"
          ],
          variables: [
            {
              "&1": "$l{a;b;c;x;y;z}",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               &1 \\times \\bold{\\textcolor{${color1}}{(-&2) \\times &3}}               &= &1 \\times \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (-&2) \\times &1 \\times &3               &= \\bold{\\textcolor{${color1}}{(-&2) \\times &3}} \\times &1 \\\\               &=  \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\times &1 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{&3 \\times (-&2)}} \\times &1               &=  \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\times &1 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &1 \\times \\bold{\\textcolor{${color1}}{&2 \\times (-&3)}}               &= &1 \\times \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2 \\times &1 \\times (-&3)               &= \\bold{\\textcolor{${color1}}{&2 \\times (-&3)}} \\times &1 \\\\               &=  \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\times &1 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{(-&3) \\times &2}} \\times &1               &=  \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\times &1 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &1 \\times \\bold{\\textcolor{${color1}}{(-&2) \\times (-&3)}}               &= &1 \\times \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (-&2) \\times &1 \\times (-&3)               &=  \\bold{\\textcolor{${color1}}{(-&2) \\times (-&3)}} \\times &1 \\\\\xA0              &=  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\times &1 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{(-&3) \\times (-&2)}} \\times &1               &=  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\times &1 \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (-&1) \\times \\bold{\\textcolor{${color1}}{(-&2) \\times &3}}               &=  (-&1) \\times \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (-&2) \\times (-&1) \\times &3               &=  \\bold{\\textcolor{${color1}}{(-&2) \\times &3}} \\times (-&1) \\\\\xA0              &=  \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\times (-&1) \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{&3 \\times (-&2)}} \\times (-&1)               &=  \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\times (-&1) \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (-&1) \\times \\bold{\\textcolor{${color1}}{&2 \\times (-&3)}}               &=  (-&1) \\times \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2 \\times (-&1) \\times (-&3)               &=  \\bold{\\textcolor{${color1}}{&2 \\times (-&3)}} \\times (-&1) \\\\\xA0              &=  \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\times (-&1) \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{(-&3) \\times &2}} \\times (-&1)               &=  \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\times (-&1) \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (-&1) \\times \\bold{\\textcolor{${color1}}{(-&2) \\times (-&3)}}               &=  (-&1) \\times  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (-&2) \\times (-&1) \\times (-&3)               &=  \\bold{\\textcolor{${color1}}{(-&2) \\times (-&3)}} \\times (-&1) \\\\\xA0              &=  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\times (-&1) \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\bold{\\textcolor{${color1}}{(-&3) \\times (-&2)}} \\times (-&1)               &=  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\times (-&1) \\\\\xA0              &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: TROISIEME
        },
        {
          description: "R\xE9duire une expression",
          subdescription: "Coefficients relatifs, expression du second degr\xE9",
          enounces: ["R\xE9duire :"],
          expressions: [
            "[_&2&1^2_][+_&3&1_][+_&4_][+_&5&1^2_][+_&6&1_][+_&7_]",
            "[_&2&1_][+_&3&1^2_][+_&4_][+_&5&1^2_][+_&6&1_][+_&7_]",
            "[_&2&1_][+_&3_][+_&4^2_][+_&5&1^2_][+_&6&1_][+_&7_]"
          ],
          variables: [
            {
              "&1": "$l{a;b;c}",
              "&2": "$er[1;9]",
              "&3": "$er[1;9]",
              "&4": "$er[1;9]",
              "&5": "$er[1;9]",
              "&6": "$er[1;9]",
              "&7": "$er[1;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               [_&2&1^2_][+_&3&1_][+_&4_][+_&5&1^2_][+_&6&1_][+_&7_]               &= (&2[+_&5_]) \\times &1^2 + (&3[+_&6_]) \\times &1 [+_&4_] [+_&7_] \\\\               &= [_&2+(&5)_] \\times &1^2  [+_&3+(&6)_] \\times &1 [+_&4+(&7)_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&2&1_][+_&3&1^2_][+_&4_][+_&5&1^2_][+_&6&1_][+_&7_]               &= (&3[+_&5_]) \\times &1^2 + (&2[+_&6_]) \\times &1 [+_&4_] [+_&7_] \\\\               &= [_&3+(&5)_] \\times &1^2  [+_&2+(&6)_] \\times &1 [+_&4+(&7)_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               [_&2&1_][+_&3_][+_&4^2_][+_&5&1^2_][+_&6&1_][+_&7_]               &= (&4[+_&5_]) \\times &1^2 + (&2[+_&6_]) \\times &1 [+_&3_] [+_&7_] \\\\               &= [_&4+(&5)_] \\times &1^2  [+_&2+(&6)_] \\times &1 [+_&3+(&7)_] \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: SECONDE
        }
      ],
      "Oppos\xE9 d'une expression": [
        {
          description: "D\xE9terminer l'oppos\xE9 d'une expression",
          subdescription: "Expression simple",
          enounces: ["Quel est l'oppos\xE9 de cette expression ?"],
          expressions: ["[_&1&2_]"],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$l{a;b;x;y}"
            }
          ],
          type: "rewrite",
          solutions: [["[_-(&1)&2_]"]],
          options: ["penalty-for-factors-permutation"],
          correctionFormat: [
            {
              correct: ["L'oppos\xE9 de &expression est &answer"]
            }
          ],
          defaultDelay: 30,
          grade: TROISIEME
        },
        {
          description: "D\xE9terminer l'oppos\xE9 d'une expression",
          subdescription: "oppos\xE9 d'une somme alg\xE9brique",
          enounces: ["Quel est l'oppos\xE9 de cette expression ?"],
          expressions: ["[_&1&3_][+_&2_]"],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$er[1;9]",
              "&3": "$l{a;b;x;y}"
            }
          ],
          type: "rewrite",
          solutions: [["[_-(&1)&3_][+_-(&2)_]"]],
          options: ["penalty-for-factors-permutation"],
          correctionFormat: [
            {
              correct: ["L'oppos\xE9 de &expression est &answer"]
            }
          ],
          defaultDelay: 30,
          grade: TROISIEME
        },
        {
          description: "Enlever les parenth\xE8ses",
          enounces: ["R\xE9\xE9cris l'expression en enlevant les parenth\xE8ses."],
          expressions: ["[_&1&2_]+([_&3&4_]&5)", "[_&1&2_]-([_&3&4_]&5)"],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$l{a;b;c}",
              "&3": "$er[1;9]",
              "&4": "$l{a;b;c}\\{&2}",
              "&5": "$ers[1;9]"
            }
          ],
          solutions: [
            ["[_&1&2_][+_&3&4_]&5"],
            ["[_&1&2_][+_-(&3&4)_][+_-(&5)_]"]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: TROISIEME
        }
      ],
      D\u00E9veloppement: [
        {
          description: "D\xE9velopper",
          subdescription: "Simple - Coefficients positifs",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: [
            "&1(&2+&3)",
            "&1(&3+&2)",
            "(&2+&3)*&1",
            "(&3+&2)*&1",
            "&1(&2-&3)",
            "&1(&3-&2)",
            "(&2-&3)*&1",
            "(&3-&2)*&1"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{&1}",
              "&3": "$l{a;b;c;x;y;z}"
            }
          ],
          solutions: [
            ["[_&1*&2_]+&1&3"],
            ["&1&3+[_&1*&2_]"],
            ["[_&2*&1_]+&1&3"],
            ["&1&3+[_&1*&2_]"],
            ["[_&2*&1_]-&1&3"],
            ["&1&3-[_&2*&1_]"],
            ["[_&2*&1_]-&1&3"],
            ["&1&3-[_&2*&1_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}(&2+&3)               &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} \\times &3 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}(&3+&2)               &= \\textcolor{${color1}}{&1} \\times &3 + \\textcolor{${color1}}{&1} \\times &2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2+&3) \\times \\textcolor{${color1}}{&1}               &= &2 \\times \\textcolor{${color1}}{&1} + &3 \\times \\textcolor{${color1}}{&1} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&3+&2) \\times \\textcolor{${color1}}{&1}               &= &3 \\times \\textcolor{${color1}}{&1} + &2 \\times \\textcolor{${color1}}{&1} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}(&2-&3)               &= \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times &3 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}(&3-&2)               &= \\textcolor{${color1}}{&1} \\times &3 - \\textcolor{${color1}}{&1} \\times &2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2-&3) \\times \\textcolor{${color1}}{&1}               &= &2 \\times \\textcolor{${color1}}{&1} - &3 \\times \\textcolor{${color1}}{&1} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&3-&2) \\times \\textcolor{${color1}}{&1}               &= &3 \\times \\textcolor{${color1}}{&1} - &2 \\times \\textcolor{${color1}}{&1} \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "D\xE9velopper",
          subdescription: "Coefficients positifs",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: [
            "&1(&2+[_&3&4_])",
            "&1([_&3&4_]+&2)",
            "(&2+[_&3&4_])*&1",
            "([_&3&4_]+&2)*&1",
            "&4(&2+[_&3&4_])",
            "&4([_&3&4_]+&2)",
            "(&2+[_&3&4_])&4",
            "([_&3&4_]+&2)&4",
            "&1(&2-[_&3&4_])",
            "&1([_&3&4_]-&2)",
            "(&2-[_&3&4_])*&1",
            "([_&3&4_]-&2)*&1",
            "&4(&2-[_&3&4_])",
            "&4([_&3&4_]-&2)",
            "(&2-[_&3&4_])&4",
            "([_&3&4_]-&2)&4"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$e[1;9]\\{&1;&2}",
              "&4": "$l{a;b;c;x;y;z}"
            }
          ],
          solutions: [
            ["[_&1*&2_]+[_&1*&3&4_]"],
            ["[_&1*&3&4_]+[_&1*&2_]"],
            ["[_&1*&2_]+[_&1*&3&4_]"],
            ["[_&1*&3&4_]+[_&1*&2_]"],
            ["[_&2&4_]+[_&3&4^2_]"],
            ["[_&3&4^2_]+[_&2&4_]"],
            ["[_&2&4_]+[_&3&4^2_]"],
            ["[_&3&4^2_]+[_&2&4_]"],
            ["[_&1*&2_]-[_&1*&3&4_])"],
            ["[_&1*&3&4_]-[_&1*&2_]"],
            ["[_&1*&2_]-[_&1*&3&4_]"],
            ["[_&1*&3&4_]-[_&1*&2_]"],
            ["[_&2&4_]-[_&3&4^2_]"],
            ["[_&3&4^2_]-[_&2&4_]"],
            ["[_&2&4_]-[_&3&4^2_]"],
            ["[_&3*&4^2_]-[_&2&4_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}(&2+[_&3&4_])               &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} \\times [_&3&4_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}([_&3&4_]+&2)               &= \\textcolor{${color1}}{&1} \\times [_&3&4_] + \\textcolor{${color1}}{&1} \\times &2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2+[_&3&4_]) \\times \\textcolor{${color1}}{&1}               &=   &2 \\times \\textcolor{${color1}}{&1} +[_&3&4_] \\times \\textcolor{${color1}}{&1} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&3&4_]+&2) \\times \\textcolor{${color1}}{&1}               &=  [_&3&4_] \\times \\textcolor{${color1}}{&1} + &2 \\times \\textcolor{${color1}}{&1}  \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&4}(&2+[_&3&4_])               &= \\textcolor{${color1}}{&4} \\times &2 + \\textcolor{${color1}}{&4} \\times [_&3&4_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&4}([_&3&4_]+&2)               &= \\textcolor{${color1}}{&4} \\times [_&3&4_] + \\textcolor{${color1}}{&4} \\times &2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2+[_&3&4_]) \\times \\textcolor{${color1}}{&4}               &=   &2 \\times \\textcolor{${color1}}{&4} +[_&3&4_] \\times \\textcolor{${color1}}{&4} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&3&4_]+&2) \\times \\textcolor{${color1}}{&4}               &=  [_&3&4_] \\times \\textcolor{${color1}}{&4} + &2 \\times \\textcolor{${color1}}{&4}  \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}(&2 - [_&3&4_])               &= \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times [_&3&4_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}([_&3&4_]-&2)               &= \\textcolor{${color1}}{&1} \\times [_&3&4_] - \\textcolor{${color1}}{&1} \\times &2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2-[_&3&4_]) \\times \\textcolor{${color1}}{&1}               &=   &2 \\times \\textcolor{${color1}}{&1} - [_&3&4_] \\times \\textcolor{${color1}}{&1} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&3&4_] - &2) \\times \\textcolor{${color1}}{&1}               &=  [_&3&4_] \\times \\textcolor{${color1}}{&1} - &2 \\times \\textcolor{${color1}}{&1}  \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&4}(&2 - [_&3&4_])               &= \\textcolor{${color1}}{&4} \\times &2 - \\textcolor{${color1}}{&4} \\times [_&3&4_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&4}([_&3&4_] - &2)               &= \\textcolor{${color1}}{&4} \\times [_&3&4_] - \\textcolor{${color1}}{&4} \\times &2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2-[_&3&4_]) \\times \\textcolor{${color1}}{&4}               &=   &2 \\times \\textcolor{${color1}}{&4} - [_&3&4_] \\times \\textcolor{${color1}}{&4} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&3&4_]+&2) \\times \\textcolor{${color1}}{&4}               &=  [_&3&4_] \\times \\textcolor{${color1}}{&4} - &2 \\times \\textcolor{${color1}}{&4}  \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["penalty-for-factors-permutation"],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "D\xE9velopper",
          subdescription: "Coefficients relatifs",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: [
            "&1(&2[+_&3&4_])",
            "&1([_&3&4_][+_&2_])",
            "-&1(&2[+_&3&4_])",
            "-&1([_&3&4_][+_&2_])",
            "(&2[+_&3&4_])*&1",
            "([_&3&4_][+_&2_])*&1",
            "(&2[+_&3&4_])*(-&1)",
            "([_&3&4_][+_&2_])*(-&1)",
            "&4(&2[+_&3&4_])",
            "&4([_&3&4_][+_&2_])",
            "(&2[+_&3&4_])&4",
            "([_&3&4_][+_&2_])&4",
            "-&4(&2[+_&3&4_])",
            "-&4([_&3&4_][+_&2_])",
            "(&2[+_&3&4_])*(-&4)",
            "([_&3&4_][+_&2_])*(-&4)"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$er[1;9]\\{&1;-(&1)}",
              "&3": "$er[1;9]\\{&1;-(&1);&2;-(&2)}",
              "&4": "$l{a;b;c;x;y;z}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}(&2[+_&3&4_])               &=   &2 \\times \\textcolor{${color1}}{&1} [+_&3&4_] \\times \\textcolor{${color1}}{&1} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1}([_&3&4_][+_&2_])               &=    [_&3&4_] \\times \\textcolor{${color1}}{&1}  [+_&2_] \\times \\textcolor{${color1}}{&1}\\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{-&1}(&2[+_&3&4_])               &=   &2 \\times \\textcolor{${color1}}{(-&1)} [+_&3&4_] \\times \\textcolor{${color1}}{(-&1)} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{-&1}([_&3&4_][+_&2_])               &=    [_&3&4_] \\times \\textcolor{${color1}}{(-&1)}  [+_&2_] \\times \\textcolor{${color1}}{(-&1)}\\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2[+_&3&4_]) \\times \\textcolor{${color1}}{&1}               &=   &2 \\times \\textcolor{${color1}}{&1} [+_&3&4_] \\times \\textcolor{${color1}}{&1} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&3&4_][+_&2_]) \\times \\textcolor{${color1}}{&1}               &=    [_&3&4_] \\times \\textcolor{${color1}}{&1}  [+_&2_] \\times \\textcolor{${color1}}{&1}\\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2[+_&3&4_]) \\times \\textcolor{${color1}}{(-&1)}               &=   &2 \\times \\textcolor{${color1}}{(-&1)} [+_&3&4_] \\times \\textcolor{${color1}}{(-&1)} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&3&4_][+_&2_]) \\times \\textcolor{${color1}}{(-&1)}               &=    [_&3&4_] \\times \\textcolor{${color1}}{(-&1)}  [+_&2_] \\times \\textcolor{${color1}}{(-&1)}\\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&4}(&2[+_&3&4_])               &=   &2 \\times \\textcolor{${color1}}{&4} [+_&3&4_] \\times \\textcolor{${color1}}{&4} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&4}([_&3&4_][+_&2_])               &=    [_&3&4_] \\times \\textcolor{${color1}}{&4}  [+_&2_] \\times \\textcolor{${color1}}{&4}\\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2[+_&3&4_]) \\times \\textcolor{${color1}}{&4}               &=   &2 \\times \\textcolor{${color1}}{&4} [+_&3&4_] \\times \\textcolor{${color1}}{&4} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&3&4_][+_&2_]) \\times \\textcolor{${color1}}{&4}               &=    [_&3&4_] \\times \\textcolor{${color1}}{&4}  [+_&2_] \\times \\textcolor{${color1}}{&4}\\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{-&4}(&2[+_&3&4_])               &=   &2 \\times \\textcolor{${color1}}{(-&4)} [+_&3&4_] \\times \\textcolor{${color1}}{(-&4)} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{-&4}([_&3&4_][+_&2_])               &=    [_&3&4_] \\times \\textcolor{${color1}}{(-&4)}  [+_&2_] \\times \\textcolor{${color1}}{(-&4)}\\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&2[+_&3&4_]) \\times \\textcolor{${color1}}{(-&4)}               &=   &2 \\times \\textcolor{${color1}}{(-&4)} [+_&3&4_] \\times \\textcolor{${color1}}{(-&4)} \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&3&4_][+_&2_]) \\times \\textcolor{${color1}}{(-&4)}               &=    [_&3&4_] \\times \\textcolor{${color1}}{(-&4)}  [+_&2_] \\times \\textcolor{${color1}}{(-&4)}\\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          solutions: [
            ["[_&2*&1_][+_&3&4*&1_]"],
            ["[_&3&4*&1_][+_&2*&1_]"],
            ["[_&2*(-&1)_][+_&3&4*(-&1)_]"],
            ["[_&3&4*(-&1)_][+_&2*(-&1)_]"],
            ["[_&2*&1_][+_&3&4*&1_]"],
            ["[_&3&4*&1_][+_&2*&1_]"],
            ["[_&2*(-&1)_][+_&3&4*(-&1)_]"],
            ["[_&3&4*(-&1)_][+_&2*(-&1)_]"],
            ["[_&2&4_][+_&3&4^2_]"],
            ["[_&3&4^2_][+_&2&4_]"],
            ["[_&2&4_][+_&3&4^2_]"],
            ["[_&3&4^2_][+_&2&4_]"],
            ["[_&2*(-&4)_][+_-(&3)&4^2_]"],
            ["[_-(&3)&4^2_][+_&2*(-&4)_]"],
            ["[_&2*(-&4)_][+_-(&3)&4^2_]"],
            ["[_-(&3)&4^2_][+_&2*(-&4)_]"]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: TROISIEME
        },
        {
          description: "D\xE9velopper un double produit",
          subdescription: "Coefficients positifs",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: [
            "(&1+[_&2&3_])(&4+[_&5&3_])",
            "([_&2&3_]+&1)(&4+[_&5&3_])",
            "(&1+[_&2&3_])([_&5&3_]+&4)",
            "([_&2&3_]+&1)([_&5&3_]+&4)"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$l{a;b;c;x;y;z}",
              "&4": "$e[1;9]\\{&1;&2}",
              "&5": "$e[1;9]\\{&1;&2;&3}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               (\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{[_&2&3_]})(&4+[_&5&3_])               &= \\textcolor{${color1}}{&1} \\times &4 + \\textcolor{${color1}}{&1} \\times [_&5&3_] + \\textcolor{${color2}}{[_&2&3_]} \\times &4 + \\textcolor{${color2}}{[_&2&3_]} \\times [_&5&3_] \\\\               &= [_&1*&4_] +   [_&5*&1&3_] + [_&2*&4&3_] + [_&2&3*&5&3_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (\\textcolor{${color2}}{[_&2&3_]} + \\textcolor{${color1}}{&1})(&4+[_&5&3_])               &= \\textcolor{${color2}}{[_&2&3_]} \\times &4 + \\textcolor{${color2}}{[_&2&3_]} \\times [_&5&3_] + \\textcolor{${color1}}{&1} \\times &4 + \\textcolor{${color1}}{&1} \\times [_&5&3_]  \\\\               &= [_&2*&4&3_] + [_&2&3*&5&3_] + [_&1*&4_] +   [_&5*&1&3_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{[_&2&3_]})([_&5&3_]+&4)               &= \\textcolor{${color1}}{&1} \\times [_&5&3_] + \\textcolor{${color1}}{&1} \\times &4 + \\textcolor{${color2}}{[_&2&3_]} \\times [_&5&3_] + \\textcolor{${color2}}{[_&2&3_]} \\times &4 \\\\               &= [_&5*&1&3_] + [_&1*&4_] + [_&2&3*&5&3_]  + [_&2*&4&3_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (\\textcolor{${color2}}{[_&2&3_]} + \\textcolor{${color1}}{&1})([_&5&3_]+&4)               &= \\textcolor{${color2}}{[_&2&3_]} \\times [_&5&3_] + \\textcolor{${color2}}{[_&2&3_]} \\times &4 + \\textcolor{${color1}}{&1} \\times [_&5&3_] + \\textcolor{${color1}}{&1} \\times &4  \\\\               &= [_&2&3*&5&3_] + [_&2*&4&3_] +  [_&5*&1&3_] + [_&1*&4_]  \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: TROISIEME
        },
        {
          description: "D\xE9velopper un double produit",
          subdescription: "Coefficients relatifs",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: [
            "(&1[+_&2&3_])(&4[+_&5&3_])",
            "([_&2&3_][+_&1_])(&4[+_&5&3_])",
            "([_&2&3_][+_&1_])([_&5&3_][+_&4_])",
            "(&1[+_&2&3_])([_&5&3_][+_&4_])"
          ],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$er[1;9]\\{&1;-(&1)}",
              "&3": "$l{a;b;c;x;y;z}",
              "&4": "$er[1;9]\\{&1;-(&1);&2;-(&2)}",
              "&5": "$er[1;9]\\{&1;-(&1);&2;-(&2);&4;-(&4)}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               (&1[+_&2&3_])(&4[+_&5&3_])               &= [_&1*(&4)_] [+_&1*(&5)*&3_] [+_&2&3*(&4)_] [+_&2&3*(&5)*&3_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&2&3_][+_&1_])(&4[+_&5&3_])               &= [_&2&3*(&4)_] [+_&2&3*(&5)*&3_] [+_&1*(&4)_] [+_&1*(&5)*&3_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               ([_&2&3_][+_&1_])([_&5&3_][+_&4_])               &=  [_&2&3*(&5)*&3_] [+_&2&3*(&4)_] [+_&1*(&5)*&3_] [+_&1*(&4)_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               (&1[+_&2&3_])([_&5&3_][+_&4_])               &=  [_&1*(&5)*&3_] [+_&1*(&4)_] [+_&2&3*(&5)*&3_] [+_&2&3*(&4)_] \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 40,
          options: ["penalty-for-factors-permutation"],
          grade: TROISIEME
        }
      ],
      Factorisation: [
        {
          description: "Trouver un facteur commun",
          subdescription: "Facteur commun num\xE9rique apparent ",
          enounces: ["Trouve un facteur commun."],
          expressions: [
            "&1*&2+&1*&3",
            "&2*&1+&1*&3",
            "&1*&2+&3*&1",
            "&2*&1+&3*&1",
            "&1*&2-&1*&3",
            "&2*&1-&1*&3",
            "&1*&2-&3*&1",
            "&2*&1-&3*&1"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{&1}",
              "&3": "$e[2;9]\\{&1;cd(&2)}"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Un facteur commun est &answer."
              ]
            }
          ],
          solutions: [["&1"]],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Factoriser",
          subdescription: "Facteur commun apparent",
          enounces: ["Factorise."],
          expressions: [
            "&1*&2+&1*&3",
            "&2*&1+&1*&3",
            "&1*&2+&3*&1",
            "&2*&1+&3*&1",
            "&1*&2-&1*&3",
            "&2*&1-&1*&3",
            "&1*&2-&3*&1",
            "&2*&1-&3*&1"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{&1}",
              "&3": "$e[2;9]\\{&1;cd(&2)}"
            }
          ],
          solutions: [
            ["&1(&2+&3)"],
            ["&1(&2+&3)"],
            ["&1(&2+&3)"],
            ["&1(&2+&3)"],
            ["&1(&2-&3)"],
            ["&1(&2-&3)"],
            ["&1(&2-&3)"],
            ["&1(&2-&3)"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1} \\times &2+\\textcolor{${color1}}{&1} \\times &3               &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2 \\times \\textcolor{${color1}}{&1}+\\textcolor{${color1}}{&1} \\times &3               &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1} \\times &2 +  &3 \\times \\textcolor{${color1}}{&1}               &= \\textcolor{${color1}}{&1} \\times &2 +  \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2 \\times \\textcolor{${color1}}{&1} + &3 \\times \\textcolor{${color1}}{&1}               &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times &3               &= \\textcolor{${color1}}{&1} \\times (&2 - &3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2 \\times \\textcolor{${color1}}{&1} - \\textcolor{${color1}}{&1} \\times &3               &= \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2 - &3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1} \\times &2 -  &3 \\times \\textcolor{${color1}}{&1}               &= \\textcolor{${color1}}{&1} \\times &2 -  \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2 - &3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &2 \\times \\textcolor{${color1}}{&1} + &3 \\times \\textcolor{${color1}}{&1}               &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1}  \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2 - &3) \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          options: ["no-penalty-for-explicit-products"],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Trouver un facteur commun",
          subdescription: "Facteur commun apparent - litt\xE9ral",
          enounces: ["Trouve un facteur commun."],
          expressions: [
            "&1*&2+&1&3",
            "&1&3+&1*&2",
            "&1&3+&1&4",
            "&1&3-&1&4",
            "&1*&2-&1&3",
            "&1&3-&1*&2",
            "&1&3+&2&3",
            "&1&3-&2&3",
            "&4&3+&1&3",
            "&3&4+&1&3",
            "&4&3-&1&3",
            "&3&4-&1&3"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$l{x;y;z}",
              "&4": "$l{x;y;z}\\{&3}"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Un facteur commun est &answer,"
              ]
            }
          ],
          solutions: [
            ["&1"],
            ["&1"],
            ["&1"],
            ["&1"],
            ["&1"],
            ["&1"],
            ["&3"],
            ["&3"],
            ["&3"],
            ["&3"],
            ["&3"],
            ["&3"]
          ],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Factoriser",
          subdescription: "Facteur commun apparent - litt\xE9ral",
          enounces: ["Factorise."],
          expressions: [
            "&1*&2+&1&3",
            "&1&3+&1*&2",
            "&1&3+&1&4",
            "&1&3-&1&4",
            "&1*&2-&1&3",
            "&1&3-&1*&2",
            "&1&3+&2&3",
            "&1&3-&2&3",
            "&4&3+&1&3",
            "&3&4+&1&3",
            "&4&3-&1&3",
            "&3&4-&1&3"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$l{x;y;z}",
              "&4": "$l{x;y;z}\\{&3}"
            }
          ],
          solutions: [
            ["&1(&2+&3)"],
            ["&1(&3+&2)"],
            ["&1(&3+&4)"],
            ["&1(&3-&4)"],
            ["&1(&2-&3)"],
            ["&1(&3-&2)"],
            ["(&1+&2)&3"],
            ["(&1-&2)&3"],
            ["&3(&4+&1)"],
            ["&3(&4+&1)"],
            ["&3(&4-&1)"],
            ["&3(&4-&1)"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} &3               &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1}  \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\textcolor{${color1}}{&1} &3 + \\textcolor{${color1}}{&1} \\times &2                &= \\textcolor{${color1}}{&1}  \\times &3 + \\textcolor{${color1}}{&1} \\times &2 \\\\               &= \\textcolor{${color1}}{&1} \\times (&3+&2) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\textcolor{${color1}}{&1} &3 + \\textcolor{${color1}}{&1}&4                &= \\textcolor{${color1}}{&1} \\times &3 + \\textcolor{${color1}}{&1} \\times &4 \\\\               &= \\textcolor{${color1}}{&1} \\times (&3+&4) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\textcolor{${color1}}{&1} &3 - \\textcolor{${color1}}{&1}&4               &=  \\textcolor{${color1}}{&1} \\times &3 - \\textcolor{${color1}}{&1} \\times &4 \\\\               &= \\textcolor{${color1}}{&1} \\times (&3-&4) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} &3               &= \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2-&3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\textcolor{${color1}}{&1} &3 - \\textcolor{${color1}}{&1} \\times &2               &= \\textcolor{${color1}}{&1} \\times &3 - \\textcolor{${color1}}{&1} \\times &2 \\\\               &= \\textcolor{${color1}}{&1} \\times (&3-&2) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &1\\textcolor{${color1}}{&3} + &2\\textcolor{${color1}}{&3}               &= &1 \\times \\textcolor{${color1}}{&3} + &2 \\times \\textcolor{${color1}}{&3} \\\\               &= (&1+&2)\\times \\textcolor{${color1}}{&3}  \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &1\\textcolor{${color1}}{&3} - &2\\textcolor{${color1}}{&3}               &= &1  \\times \\textcolor{${color1}}{&3} - &2 \\times \\textcolor{${color1}}{&3} \\\\               &= (&1-&2)\\times \\textcolor{${color1}}{&3}  \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &4\\textcolor{${color1}}{&3} + &1\\textcolor{${color1}}{&3}               &= \\textcolor{${color1}}{&3}  \\times &4 + \\textcolor{${color1}}{&3}  \\times &1 \\\\               &= \\textcolor{${color1}}{&3} \\times (&4+&1)  \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&3}&4 + &1\\textcolor{${color1}}{&3}               &= \\textcolor{${color1}}{&3} \\times &4 + \\textcolor{${color1}}{&3} \\times &1 \\\\               &= \\textcolor{${color1}}{&3}  \\times (&4+&1) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &4\\textcolor{${color1}}{&3} - &1\\textcolor{${color1}}{&3}               &= \\textcolor{${color1}}{&3}  \\times &4 - \\textcolor{${color1}}{&3} \\times &1 \\\\               &= \\textcolor{${color1}}{&3} \\times (&4-&1)  \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&3}&4 - &1\\textcolor{${color1}}{&3}               &= \\textcolor{${color1}}{&3} \\times &4 - \\textcolor{${color1}}{&3} \\times &1 \\\\               &= \\textcolor{${color1}}{&3}  \\times (&4-&1) \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Trouver le plus grand facteur commun ",
          subdescription: "Le facteur commun est apparent dans un seul des produits",
          enounces: ["Trouve le plus grand facteur commun."],
          expressions: [
            "&1&3+[_&1*&2_]&4",
            "&1&3-[_&1*&2_]&4",
            "[_&1*&2_]&4+&1&3",
            "[_&1*&2_]&4-&1&3"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$l{x;y;z}",
              "&4": "$l{x;y;z}\\{&3}"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Le plus grand facteur commun est &answer."
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Dans l'expression &expression le plus grand facteur commun aux 2 produits est &solution,"
              },
              {
                text: "car $$&1&3=&sol\\times{&3}$$ et $$[_&1*&2_]&4=&sol\\times{&2&4}$$"
              }
            ]
          ],
          solutions: [["&1"]],
          type: "rewrite",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Factoriser",
          subdescription: "Le facteur commun est apparent dans un seul des produits",
          enounces: ["Factorise."],
          expressions: [
            "&1&3+[_&1*&2_]&4",
            "[_&1*&2_]&4+&1&3",
            "&1&3-[_&1*&2_]&4",
            "[_&1*&2_]&4-&1&3"
          ],
          variables: [
            {
              "&1": "$l{2;3;5;7}",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$l{x;y;z}",
              "&4": "$l{x;y;z}\\{&3}"
            }
          ],
          solutions: [
            ["&1(&3+&2&4)"],
            ["&1(&2&4+&3)"],
            ["&1(&3-&2&4)"],
            ["&1(&2&4-&3)"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 &1&3+[_&1*&2_]&4               &= \\textcolor{${color1}}{&1} \\times &3+\\textcolor{${color1}}{&1} \\times &2&4 \\\\               &= \\textcolor{${color1}}{&1} \\times (&3 + &2&4) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]&4 + &1&3              &= \\textcolor{${color1}}{&1} \\times &2&4 + \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2&4 + &3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 &1&3 - [_&1*&2_]&4               &= \\textcolor{${color1}}{&1} \\times &3 - \\textcolor{${color1}}{&1} \\times &2&4 \\\\               &= \\textcolor{${color1}}{&1} \\times (&3 - &2&4) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]&4 - &1&3              &= \\textcolor{${color1}}{&1} \\times &2&4 - \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2&4 - &3) \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Trouver le plus grand facteur commun",
          subdescription: "Le plus grand facteur commun n'est pas apparent",
          enounces: [
            "Quel est le plus grand facteur commun dans ces 2 produits ?"
          ],
          expressions: ["[_&1*&2_]&5+[_&1*&3_]&4", "[_&1*&2_]&5-[_&1*&3_]&4"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&2)}",
              "&4": "$l{x;y;z}",
              "&5": "$l{x;y;z}\\{&4}"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Le plus grand facteur commun est &answer,"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: "Dans l'expression &expression le plus grand facteur commun aux 2 produits est &solution,"
              },
              {
                text: "car $$[_&1*&2_]&5=&sol\\times{&2&5}$$ et $$[_&1*&3_]&4=&sol\\times{&3&4}$$"
              }
            ]
          ],
          solutions: [["&1"]],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Factoriser",
          subdescription: "Le plus grand facteur commun n'est pas apparent",
          enounces: ["Factorise le plus possible :"],
          expressions: [
            "[_&1*&2_]&5+[_&1*&3_]&4",
            "[_&1*&2_]&5-[_&1*&3_]&4",
            "[_&1*&2_]&5+[_&1*&3_]",
            "[_&1*&2_]&5-[_&1*&3_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&2)}",
              "&4": "$l{x;y;z}",
              "&5": "$l{x;y;z}\\{&4}"
            }
          ],
          solutions: [
            ["&1(&2&5+&3&4)"],
            ["&1(&2&5-&3&4)"],
            ["&1(&2&5+&3)"],
            ["&1(&2&5-&3)"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]&5+[_&1*&3_]&4               &= \\textcolor{${color1}}{&1} \\times &2&5 + \\textcolor{${color1}}{&1} \\times &3&4 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2&5 + &3&4) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]&5 - [_&1*&3_]&4               &= \\textcolor{${color1}}{&1} \\times &2&5 - \\textcolor{${color1}}{&1} \\times &3&4 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2&5 - &3&4) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]&5+[_&1*&3_]               &= \\textcolor{${color1}}{&1} \\times &2&5 + \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2&5 + &3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]&5-[_&1*&3_]               &= \\textcolor{${color1}}{&1} \\times &2&5 - \\textcolor{${color1}}{&1} \\times &3 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2&5 - &3) \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Factoriser",
          subdescription: "Cas particulier",
          enounces: ["Factoriser le plus possible:"],
          expressions: [
            "&1+[_&1*&2_]&3",
            "[_&1*&2_]&3+&1",
            "&1-[_&1*&2_]&3",
            "[_&1*&2_]&3-&1"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$l{x;y;z}"
            }
          ],
          solutions: [
            ["&1(1+&2&3)"],
            ["&1(&2&3+1)"],
            ["&1(1-&2&3)"],
            ["&1(&2&3-1)"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 &1+[_&1*&2_]&3               &= \\textcolor{${color1}}{&1} \\times 1 + \\textcolor{${color1}}{&1} \\times &2&3 \\\\               &= \\textcolor{${color1}}{&1} \\times (1 + &2&3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]&3 + &1               &= \\textcolor{${color1}}{&1} \\times &2&3 + \\textcolor{${color1}}{&1} \\times 1 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2&3 + 1) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 &1 - [_&1*&2_]&3               &= \\textcolor{${color1}}{&1} \\times 1 - \\textcolor{${color1}}{&1} \\times &2&3 \\\\               &= \\textcolor{${color1}}{&1} \\times (1 - &2&3) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]&3 - &1               &= \\textcolor{${color1}}{&1} \\times &2&3 - \\textcolor{${color1}}{&1} \\times 1 \\\\               &= \\textcolor{${color1}}{&1} \\times (&2&3 - 1) \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Factoriser",
          subdescription: "Cas g\xE9n\xE9ral - avec des carr\xE9s",
          enounces: ["Factoriser le plus possible."],
          expressions: [
            "[_&1*&2*&4^2_]+[_&1*&3*&4_]",
            "[_&1*&2*&4_]+[_&1*&3*&4^2_]",
            "[_&1*&2*&4^2_]-[_&1*&3*&4_]",
            "[_&1*&2*&4_]-[_&1*&3*&4^2_]",
            "[_&1*&2*&4^2_]+[_&1*&3_]",
            "[_&1*&2_]+[_&1*&3*&4^2_]",
            "[_&1*&2*&4^2_]-[_&1*&3_]",
            "[_&1*&2_]-[_&1*&3*&4^2_]"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]",
              "&3": "$e[1;9]\\{&2}",
              "&4": "$l{x;y;z}",
              "&5": "pgcd(&1*&3;&1*&2)",
              "&6": "&1*&2:&5",
              "&7": "&1*&3:&5"
            }
          ],
          solutions: [
            ["[_&5&4_]([_&6*&4_]+[_&7_])"],
            ["[_&5&4_]([_&6_]+[_&7*&4_])"],
            ["[_&5&4_]([_&6*&4_]-[_&7_])"],
            ["[_&5&4_]([_&6_]-[_&7*&4_])"],
            ["[_&5_]([_&6*&4^2_]+[_&7_])"],
            ["[_&5_]([_&6_]+[_&7*&4^2_])"],
            ["[_&5_]([_&6*&4^2_]-[_&7_])"],
            ["[_&5_]([_&6_]-[_&7*&4^2_])"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 [_&1*&2*&4^2_]+[_&1*&3*&4_]               &= \\textcolor{${color1}}{[_&5_]&4} \\times [_&6*&4_] + \\textcolor{${color1}}{[_&5_]&4} \\times [_&7_] \\\\               &= \\textcolor{${color1}}{[_&5_]&4} \\times ([_&6*&4_] + [_&7_]) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2*&4_]+[_&1*&3*&4^2_]               &= \\textcolor{${color1}}{[_&5_]&4} \\times [_&6_] + \\textcolor{${color1}}{[_&5_]&4} \\times [_&7*&4_] \\\\               &= \\textcolor{${color1}}{[_&5_]&4} \\times ([_&6_] + [_&7*&4_]) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2*&4^2_] - [_&1*&3*&4_]               &= \\textcolor{${color1}}{[_&5_]&4} \\times [_&6*&4_] - \\textcolor{${color1}}{[_&5_]&4} \\times [_&7_] \\\\               &= \\textcolor{${color1}}{[_&5_]&4} \\times ([_&6*&4_] - [_&7_]) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2*&4_] - [_&1*&3*&4^2_]               &= \\textcolor{${color1}}{[_&5_]&4} \\times [_&6_] - \\textcolor{${color1}}{[_&5_]&4} \\times [_&7*&4_] \\\\               &= \\textcolor{${color1}}{[_&5_]&4} \\times ([_&6_] - [_&7*&4_]) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2*&4^2_]+[_&1*&3_]               &= \\textcolor{${color1}}{[_&5_]} \\times [_&6*&4^2_] + \\textcolor{${color1}}{[_&5_]} \\times [_&7_] \\\\               &= \\textcolor{${color1}}{[_&5_]} \\times ([_&6*&4^2_] + [_&7_]) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_]+[_&1*&3*&4^2_]               &= \\textcolor{${color1}}{[_&5_]} \\times [_&6_] + \\textcolor{${color1}}{[_&5_]} \\times [_&7*&4^2_] \\\\               &= \\textcolor{${color1}}{[_&5_]} \\times ([_&6_] + [_&7*&4^2_]) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2*&4^2_] - [_&1*&3_]               &= \\textcolor{${color1}}{[_&5_]} \\times [_&6*&4^2_] - \\textcolor{${color1}}{[_&5_]} \\times [_&7_] \\\\               &= \\textcolor{${color1}}{[_&5_]} \\times ([_&6*&4^2_] - [_&7_]) \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1*&2_] - [_&1*&3*&4^2_]               &= \\textcolor{${color1}}{[_&5_]} \\times [_&6_] - \\textcolor{${color1}}{[_&5_]} \\times [_&7*&4^2_] \\\\               &= \\textcolor{${color1}}{[_&5_]} \\times ([_&6_] - [_&7*&4^2_]) \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: QUATRIEME
        }
      ],
      "Identit\xE9s remarquables": [
        {
          description: "D\xE9velopper $$(a+b)(a-b)$$",
          subdescription: "Coefficients positifs",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: [
            "(&1+&2)(&1-&2)",
            "(&1-&2)(&1+&2)",
            "(&2+&1)(&2-&1)",
            "(&2-&1)(&2+&1)"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$l{a;b;c;x;y;z}"
            }
          ],
          solutions: [
            ["[_&1^2_]-&2^2"],
            ["[_&1^2_]-&2^2"],
            ["&2^2-[_&1^2_]"],
            ["&2^2-[_&1^2_]"]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: TROISIEME
        },
        {
          description: "D\xE9velopper $$(a+b)(a-b)$$",
          subdescription: "Coefficients positifs",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: [
            "(&1+[_&2&3_])(&1-[_&2&3_])",
            "(&1-[_&2&3_])(&1+[_&2&3_])",
            "([_&2&3_]+&1)([_&2&3_]-&1)",
            "([_&2&3_]-&1)([_&2&3_]+&1)"
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$l{a;b;c;x;y;z}"
            }
          ],
          solutions: [
            ["[_&1^2_]-[_(&2&3)^2_]"],
            ["[_&1^2_]-[_(&2&3)^2_]"],
            ["[_(&2&3)^2_]-[_&1^2_]"],
            ["[_(&2&3)^2_]-[_&1^2_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{[_&2&3_]})(\\textcolor{${color1}}{&1}-\\textcolor{${color2}}{[_&2&3_]})               &= \\textcolor{${color1}}{&1}^2 -(\\textcolor{${color2}}{[_&2&3_]})^2 \\\\               &= [_&1^2_] -&2^2 \\times &3^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{&1}-\\textcolor{${color2}}{[_&2&3_]})(\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{[_&2&3_]})               &= \\textcolor{${color1}}{&1}^2 -(\\textcolor{${color2}}{[_&2&3_]})^2 \\\\               &= [_&1^2_] -&2^2 \\times &3^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{[_&2&3_]} + \\textcolor{${color2}}{&1})(\\textcolor{${color1}}{[_&2&3_]} - \\textcolor{${color2}}{&1})               &=  (\\textcolor{${color1}}{[_&2&3_]})^2 - \\textcolor{${color2}}{&1}^2 \\\\               &= &2^2 \\times &3^2 - [_&1^2_] \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{[_&2&3_]} - \\textcolor{${color2}}{&1})(\\textcolor{${color1}}{[_&2&3_]} - \\textcolor{${color2}}{&1})               &= (\\textcolor{${color1}}{[_&2&3_]})^2 - \\textcolor{${color2}}{&1}^2 \\\\               &=  &2^2 \\times &3^2 - [_&1^2_] \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: TROISIEME
        },
        {
          description: "Factoriser $$a^2-b^2$$",
          enounces: ["Factoriser :"],
          expressions: ["[_&1^2_]-&3^2", "&3^2-[_&1^2_]"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]",
              "&3": "$l{x;y;z}"
            }
          ],
          solutions: [["(&1+&3)(&1-&3)"], ["(&3+&1)(&3-&1)"]],
          defaultDelay: 30,
          grade: TROISIEME
        },
        {
          description: "Factoriser $$a^2-b^2$$",
          enounces: ["Factoriser :"],
          expressions: ["[_&1^2_]-[_(&2&3)^2_]", "[_(&2&3)^2_]-[_&1^2_]"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$l{x;y;z}"
            }
          ],
          solutions: [
            ["(&1+[_&2&3_])(&1-[_&2&3_])"],
            ["([_&2&3_]+&1)([_&2&3_]-&1)"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 [_&1^2_]-[_(&2&3)^2_]               &=  &1^2-([_&2&3_])^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_(&2&3)^2_] - [_&1^2_]               &=  ([_&2&3_])^2 - &1^2 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: TROISIEME
        },
        {
          description: "D\xE9velopper $$(a+b)^2$$",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: ["(&1+&2)^2", "(&2+&1)^2"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$l{a;b;c;x;y;z}"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{&2})^2               &=  \\textcolor{${color1}}{&1}^2 + 2 \\times \\textcolor{${color1}}{&1} \\times \\textcolor{${color2}}{&2} + \\textcolor{${color2}}{&2}^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{&2}+\\textcolor{${color2}}{&1})^2               &=  \\textcolor{${color1}}{&2}^2 + 2 \\times \\textcolor{${color1}}{&2} \\times \\textcolor{${color2}}{&1} + \\textcolor{${color2}}{&1}^2 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          solutions: [
            ["[_&1^2_]+[_2*&1*&2_]+&2^2"],
            ["&2^2+[_2*&1*&2_]+[_&1^2_]"]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: SECONDE
        },
        {
          description: "D\xE9velopper $$(a-b)^2$$",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: ["(&1-&2)^2", "(&2-&1)^2"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$l{a;b;c;x;y;z}"
            }
          ],
          solutions: [
            ["[_&1^2_]-[_2*&1*&2_]+&2^2"],
            ["&2^2-[_2*&1*&2_]+[_&1^2_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{&1}-\\textcolor{${color2}}{&2})^2               &=  \\textcolor{${color1}}{&1}^2 - 2 \\times \\textcolor{${color1}}{&1} \\times \\textcolor{${color2}}{&2} + \\textcolor{${color2}}{&2}^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{&2} - \\textcolor{${color2}}{&1})^2               &=  \\textcolor{${color1}}{&2}^2 - 2 \\times \\textcolor{${color1}}{&2} \\times \\textcolor{${color2}}{&1} + \\textcolor{${color2}}{&1}^2 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: SECONDE
        },
        {
          description: "D\xE9velopper $$(a+b)^2$$",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: ["(&1+[_&2&3_])^2", "([_&2&3_]+&1)^2"],
          variables: [
            {
              "&1": "$e[1;7]",
              "&2": "$e[1;7]\\{&1}",
              "&3": "$l{a;b;c;x;y;z}"
            }
          ],
          solutions: [
            ["[_&1^2_]+[_2*&1*&2&3_]+[_(&2&3)^2_]"],
            ["[_(&2&3)^2_]+[_2*&1*&2&3_]+[_&1^2_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{&1} + \\textcolor{${color2}}{[_&2&3_]})^2               &=  \\textcolor{${color1}}{&1}^2 + 2 \\times \\textcolor{${color1}}{&1} \\times \\textcolor{${color2}}{[_&2&3_]} + (\\textcolor{${color2}}{[_&2&3_]})^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{[_&2&3_]}+\\textcolor{${color2}}{&1})^2               &=  (\\textcolor{${color1}}{[_&2&3_]})^2 + 2 \\times \\textcolor{${color1}}{[_&2&3_]} \\times \\textcolor{${color2}}{&1} + \\textcolor{${color2}}{&1}^2 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: SECONDE
        },
        {
          description: "D\xE9velopper $$(a-b)^2$$",
          enounces: ["D\xE9velopper et r\xE9duire :"],
          expressions: ["(&1-[_&2&3_])^2", "([_&2&3_]-&1)^2"],
          variables: [
            {
              "&1": "$e[1;7]",
              "&2": "$e[1;7]\\{&1}",
              "&3": "$l{a;b;c;x;y;z}"
            }
          ],
          solutions: [
            ["[_&1^2_]-[_2*&1*&2&3_]+[_(&2&3)^2_]"],
            ["[_(&2&3)^2_]-[_2*&1*&2&3_]+[_&1^2_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{&1} - \\textcolor{${color2}}{[_&2&3_]})^2               &=  \\textcolor{${color1}}{&1}^2 - 2 \\times \\textcolor{${color1}}{&1} \\times \\textcolor{${color2}}{[_&2&3_]} + (\\textcolor{${color2}}{[_&2&3_]})^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 (\\textcolor{${color1}}{[_&2&3_]} - \\textcolor{${color2}}{&1})^2               &=  (\\textcolor{${color1}}{[_&2&3_]})^2 - 2 \\times \\textcolor{${color1}}{[_&2&3_]} \\times \\textcolor{${color2}}{&1} + \\textcolor{${color2}}{&1}^2 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          options: ["penalty-for-factors-permutation"],
          grade: SECONDE
        },
        {
          description: "Factoriser une expression du second degr\xE9",
          enounces: ["Factoriser :"],
          expressions: ["&3^2-[_2*&1_]&3+[_&1^2_]", "&3^2+[_2*&1_]&3+[_&1^2_]"],
          variables: [
            {
              "&1": "$e[1;9]",
              "&3": "$l{x;y;z}"
            }
          ],
          solutions: [["(&3-&1)^2"], ["(&3+&1)^2"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 &3^2 - [_2*&1_]&3 + [_&1^2_]               &= &3^2 - 2 \\times &3 \\times &1 + &1^2 \\\\               &= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 &3^2 + [_2*&1_]&3 + [_&1^2_]               &= &3^2 + 2 \\times &3 \\times &1 + &1^2 \\\\               &= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: SECONDE
        }
      ]
    },
    Equations: {
      "Dans $$\\N$$": [
        {
          description: "Addition $$a+x=b$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["x+&1=[_&1+&2_]", "&1+x=[_&1+&2_]"],
          answerFields: ["$$x=?$$"],
          variables: [
            {
              "&1": "$e[5;9]",
              "&2": "$e[2;9]"
            }
          ],
          solutions: [["&2"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 x+&1=[_&1+&2_]                & \\quad \\lrArr \\quad x=[_&1+&2_]-&1 \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Soustraction  $$x-a=b$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["x-&1=&2"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[5;9]",
              "&2": "$e[2;9]"
            }
          ],
          solutions: [["[_&1+&2_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 x-&1=&2                & \\quad \\lrArr \\quad x=&1+&2\\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Soustraction (2)  $$a-x=b$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["[_&1+&2_]-x=&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[5;9]",
              "&2": "$e[2;9]"
            }
          ],
          solutions: [["&2"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 [_&1+&2_]-x=&1                & \\quad \\lrArr \\quad x=[_&1+&2_]-&1\\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Multiplication $$a \\times x=b$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["&1x=[_&1*&2_]", "x*&1=[_&1*&2_]"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 &1x=[_&1*&2_]                & \\quad \\lrArr \\quad x=\\frac{[_&1*&2_]}{&1}\\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 x \\times &1=[_&1*&2_]                & \\quad \\lrArr \\quad x=\\frac{[_&1*&2_]}{&1}\\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          solutions: [["&2"]],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Division $$x \\div a=b$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["x/&1=&2"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]"
            }
          ],
          solutions: [["[_&1*&2_]"]],
          type: "equation",
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 \\frac{x}{&1}=&2                & \\quad \\lrArr \\quad x=&2 \\times &1 \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Division (2) $$a \\div = b$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["[_&1*&2_]/x=&2"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]"
            }
          ],
          solutions: [["&1"]],
          correctionDetails: [
            [
              {
                text: "Pour $$x \\neq 0$$, "
              },
              {
                text: "$$\\begin{align}                 \\frac{[_&1*&2_]}{x}=&2                & \\quad \\lrArr \\quad [_&1*&2_] = &2 \\times x \\\\               & \\quad \\lrArr \\quad x= \\frac {[_&1*&2_]}{&2} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        }
      ],
      "Dans $$\\Z$$": [
        {
          description: "Oppos\xE9 $$-x=a$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["-x=&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$er[1;9]"
            }
          ],
          solutions: [["[_-(&1)_]"]],
          correctionDetails: [
            [
              {
                text: "Pour $$x \\neq 0$$, "
              },
              {
                text: "$$\\begin{align}                 -x=&1 \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Addition",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: [
            "x+&1=[_&1+(&2)_]",
            "&1+x=[_&1+(&2)_]",
            "x+(&1)=[_&1+(&2)_]"
          ],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$er[2;9]"
            },
            {
              "&1": "$er[2;9]",
              "&2": "$er[2;9]"
            },
            {
              "&1": "-$e[2;9]",
              "&2": "$er[2;9]"
            }
          ],
          solutions: [["&2"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 x+&1=[_&1+(&2)_]                & \\quad \\lrArr \\quad x=[_&1+(&2)_]-&1 \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 &1+x=[_&1+(&2)_]                & \\quad \\lrArr \\quad x=[_&1+(&2)_]-&1 \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 x+(&1)=[_&1+(&2)_]                & \\quad \\lrArr \\quad x=[_&1+(&2)_]-(&1) \\\\               & \\quad \\lrArr \\quad x=[_&1+(&2)_] + [_-(&1)_] \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Soustraction $$x-a=b$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["x-&1=&2"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "-$e[2;9]"
            }
          ],
          solutions: [["[_&1+(&2)_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 x-&1=&2                & \\quad \\lrArr \\quad x=&2+&1 \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Soustraction (2) $$a-x=b$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["[_&1+(&2)_]-x=&1", "[_&1+(&2)_]-x=&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$er[2;9]"
            },
            {
              "&1": "-$e[2;9]",
              "&2": "$er[2;9]"
            }
          ],
          solutions: [["&2"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 [_&1+(&2)_]-x=&1                & \\quad \\lrArr \\quad x=[_&2+(&1)_]-&1 \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 [_&1+(&2)_]-x=&1                & \\quad \\lrArr \\quad x=[_&2+(&1)_]-(&1) \\\\               & \\quad \\lrArr \\quad x=[_&2+(&1)_]+[_-(&1)_] \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Multiplication",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: [
            "&1x=[_&1*(&2)_]",
            "&1x=[_&1*(&2)_]",
            "x*&1=[_&1*(&2)_]",
            "x*(&1)=[_&1*(&2)_]"
          ],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[2;9]"
            },
            {
              "&1": "$er[2;9]",
              "&2": "$er[2;9]"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$er[2;9]"
            },
            {
              "&1": "-$e[2;9]",
              "&2": "$er[2;9]"
            }
          ],
          solutions: [["&2"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 &1x=[_&1*(&2)_]                & \\quad \\lrArr \\quad x=\\frac{[_&2*(&1)_]}{&1} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 &1x=[_&1*(&2)_]                & \\quad \\lrArr \\quad x=\\frac{[_&2*(&1)_]}{&1} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 x \\times &1=[_&1*(&2)_]                & \\quad \\lrArr \\quad x=\\frac{[_&2*(&1)_]}{&1} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 x \\times (&1)=[_&1*(&2)_]                & \\quad \\lrArr \\quad x=\\frac{[_&2*(&1)_]}{&1} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Division",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["x/{&1}=&2"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$er[2;9]"
            },
            {
              "&1": "-$e[2;9]",
              "&2": "$er[2;9]"
            }
          ],
          solutions: [["[_&1*(&2)_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 \\frac{x}{&1}=&2                & \\quad \\lrArr \\quad x=&2 \\times &1 \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\frac{x}{&1}=&2                & \\quad \\lrArr \\quad x=&2 \\times (&1) \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Division (2) $$a/x=b",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["{[_&1*(&2)_]}/x=&2"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[2;9]"
            }
          ],
          solutions: [["&1"]],
          correctionFormat: [
            {
              correct: ["La solution de l'\xE9quation est &answer."],
              answer: "La solution est &answer."
            }
          ],
          correctionDetails: [
            [
              {
                text: "Pour $$x \\neq 0$$, "
              },
              {
                text: "$$\\begin{align}                 \\frac{[_&1*(&2)_]}{x}=&2                & \\quad \\lrArr \\quad [_&1*(&2)_] = &2 \\times x \\\\               & \\quad \\lrArr \\quad x= \\frac {[_&1*(&2)_]}{&2} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        }
      ],
      "Dans $$\\Q$$": [
        {
          description: "Addition",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["x+&2/&1=[_&2+&3_]/&1", "&2/&1+x=[_&3+&2_]/&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[5;9]\\{&1}",
              "&3": "$e[2;9]\\{&1}"
            }
          ],
          solutions: [["[_&3/&1_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 x+\\frac{&2}{&1}=\\frac{[_&2+&3_]}{&1}               & \\quad \\lrArr \\quad x=\\frac{[_&2+&3_]}{&1}-\\frac{&2}{&1} \\\\               @@ pgcd(&3;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&3;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&3}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@               \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\frac{&2}{&1} + x = \\frac{[_&2+&3_]}{&1}               & \\quad \\lrArr \\quad x=\\frac{[_&2+&3_]}{&1}-\\frac{&2}{&1} \\\\               @@ pgcd(&3;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&3;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&3}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@               \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Soustraction",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["x-&2/&1=&3/&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[5;9]\\{&1}",
              "&3": "$e[2;9]\\{&1}"
            }
          ],
          solutions: [["[_(&2+&3)/&1_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 x - \\frac{&2}{&1}=\\frac{&3}{&1}               & \\quad \\lrArr \\quad x=\\frac{&3}{&1}+\\frac{&2}{&1} \\\\               @@ pgcd(&3+&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&3+&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&3+&2_]}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@               \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Soustraction (2)",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["[_&2+&3_]/&1-x=&2/&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[5;9]\\{&1}",
              "&3": "$e[2;9]\\{&1}"
            }
          ],
          solutions: [["[_&3/&1_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 \\frac{[_&2+&3_]}{&1} - x = \\frac{&2}{&1}               & \\quad \\lrArr \\quad x = \\frac{[_&2+&3_]}{&1}-\\frac{&2}{&1} \\\\               @@ pgcd(&3;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&3;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&3}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@               \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: CINQUIEME
        },
        {
          description: "Multiplication",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: [
            "&2x=[_&2*&3_]/&1",
            "x*&2=[_&2*&3_]/&1",
            "&2x=&1/&3",
            "x*&2=&1/&3",
            "x*&1=&2",
            "&1x=&2"
          ],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&1)}"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&1)}"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$e[2;9]\\{cd(&1)}"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$e[2;9]\\{cd(&1)}"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]"
            }
          ],
          solutions: [
            ["[_&3/&1_]"],
            ["[_&3/&1_]"],
            ["[_&1/(&2*&3)_]"],
            ["[_&1/(&2*&3)_]"],
            ["[_&2/&1_]"],
            ["[_&2/&1_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 \\textcolor{${color1}}{&2}x = \\frac{[_&2*&3_]}{&1}               & \\quad \\lrArr \\quad x = \\frac{[_&2*&3_]}{&1} \\textcolor{${color1}}{\\div &2} \\\\               & \\quad \\lrArr \\quad x = \\frac{[_&2*&3_] \\div &2 }{&1} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 x \\textcolor{${color1}}{\\times &2} = \\frac{[_&2*&3_]}{&1}               & \\quad \\lrArr \\quad x = \\frac{[_&2*&3_]}{&1} \\textcolor{${color1}}{\\div &2} \\\\               & \\quad \\lrArr \\quad x = \\frac{[_&2*&3_] \\div &2 }{&1} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\textcolor{${color1}}{&2}x=\\frac{&1}{&3}               & \\quad \\lrArr \\quad x = \\frac{&1}{&3} \\textcolor{${color1}}{\\times \\frac{1}{&2}} \\\\               & \\quad \\lrArr \\quad x = \\frac{&1}{&3 \\times &2} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 x \\textcolor{${color1}}{\\times &2} = \\frac{&1}{&3}               & \\quad \\lrArr \\quad x = \\frac{&1}{&3} \\textcolor{${color1}}{\\times \\frac{1}{&2}} \\\\               & \\quad \\lrArr \\quad x = \\frac{&1}{&3 \\times &2} \\\\               & \\quad \\lrArr \\quad  x= &sol                \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 x \\textcolor{${color1}}{\\times &1} = &2                @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@                 @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{\\textcolor{${color1}}{&1}} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@                 \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\textcolor{${color1}}{&1}x = &2                @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@                 @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{\\textcolor{${color1}}{&1}} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@                 \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Division",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["x/&2=&3/&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{&1}"
            }
          ],
          solutions: [["[_&2*&3/&1_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 \\frac{x}{\\textcolor{${color1}}{&2}}=\\frac{&3}{&1}               & \\quad \\lrArr \\quad x = \\frac{&3}{&1} \\textcolor{${color1}}{\\times &2} \\\\               & \\quad \\lrArr \\quad x = \\frac{&3 \\times &2}{&1} \\\\               @@ pgcd(&2*&3;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&2*&3;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&2*&3_]}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@               \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Division (2)",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["&2/x=&3/&1", "&2/x=&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]",
              "&3": "$e[2;9]\\{cd(&1);&2}"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[2;9]\\{&1}"
            }
          ],
          solutions: [["[_&2*&1/&3_]"], ["[_&2/&1_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 \\frac{&2}{x}=\\frac{&3}{&1}               & \\quad \\lrArr \\quad \\frac{x}{\\textcolor{${color1}}{&2}} = \\frac{&1}{&3} \\\\               & \\quad \\lrArr \\quad x = \\frac{&1}{&3} \\times \\textcolor{${color1}}{&2} \\\\               & \\quad \\lrArr \\quad x = \\frac{&1 \\times &2}{&3} \\\\               @@ pgcd(&2*&1;&3) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&2*&1;&3) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&2*&1_]}{&3} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@              \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\frac{&2}{x}=&1               & \\quad \\lrArr \\quad \\frac{x}{\\textcolor{${color1}}{&2}} = \\frac{1}{&1} \\\\               & \\quad \\lrArr \\quad x = \\frac{1}{&1} \\times \\textcolor{${color1}}{&2} \\\\               @@ pgcd(&1;&2) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&1;&2) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@              \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        }
      ],
      "Lin\xE9aire du premier degr\xE9": [
        {
          description: "Equation lin\xE9aire du premier degr\xE9",
          subdescription: "Coefficients positifs - Second Membre nul",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["&1x+&2=0", "&2+&1x=0"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]\\{&1}"
            }
          ],
          solutions: [["[_-&2/&1_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 &1x\\textcolor{${color1}}{+&2}=0               & \\quad \\lrArr \\quad \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{-&2}\\\\               & \\quad \\lrArr \\quad x = \\frac{-&2}{\\textcolor{${color2}}{&1}}\\\\               @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@              \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}                 \\textcolor{${color1}}{&2+}&1x=0               & \\quad \\lrArr \\quad \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{-&2}\\\\               & \\quad \\lrArr \\quad x = \\frac{-&2}{\\textcolor{${color2}}{&1}}\\\\               @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@              \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Equation lin\xE9aire du premier degr\xE9",
          subdescription: "Coefficients relatifs - Second membre nul",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: [
            "&1x+&2=0",
            "&2+&1x=0",
            "&1x-&2=0",
            "-&2+&1x=0",
            "-&1x+&2=0",
            "&2-&1x=0",
            "-&1x-&2=0",
            "-&2-&1x=0"
          ],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]\\{&1}"
            }
          ],
          solutions: [
            ["[_-&2/&1_]"],
            ["[_-&2/&1_]"],
            ["[_&2/&1_]"],
            ["[_&2/&1_]"],
            ["[_&2/&1_]"],
            ["[_&2/&1_]"],
            ["[_-&2/&1_]"],
            ["[_-&2/&1_]"]
          ],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               &1x\\textcolor{${color1}}{+&2}=0               & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{-&2} \\\\               & \\quad \\lrArr \\quad  x = \\frac{-&2}{\\textcolor{${color2}}{&1}} \\\\               @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@            \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}             \\textcolor{${color1}}{&2}+&1x=0             & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{-&2} \\\\             & \\quad \\lrArr \\quad  x = \\frac{-&2}{\\textcolor{${color2}}{&1}} \\\\             @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@           @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@          \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               &1x\\textcolor{${color1}}{-&2}=0               & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{&2} \\\\               @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@            \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}             \\textcolor{${color1}}{-&2}+&1x=0             & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{&2} \\\\             @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@           @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@          \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               -&1x\\textcolor{${color1}}{+&2}=0               & \\quad \\lrArr \\quad  \\textcolor{${color2}}{-&1}x = \\textcolor{${color1}}{-&2} \\\\               & \\quad \\lrArr \\quad  x = \\frac{-&2}{\\textcolor{${color2}}{-&1}} \\\\               @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@            \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}             \\textcolor{${color1}}{&2}-&1x=0             & \\quad \\lrArr \\quad  \\textcolor{${color2}}{-&1}x = \\textcolor{${color1}}{-&2} \\\\             & \\quad \\lrArr \\quad  x = \\frac{-&2}{\\textcolor{${color2}}{-&1}} \\\\             @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@           @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@          \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               -&1x\\textcolor{${color1}}{-&2}=0               & \\quad \\lrArr \\quad  \\textcolor{${color2}}{-&1}x = \\textcolor{${color1}}{&2} \\\\               & \\quad \\lrArr \\quad  x = \\frac{&2}{\\textcolor{${color2}}{-&1}} \\\\               @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@            \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{-&2}-&1x=0               & \\quad \\lrArr \\quad  \\textcolor{${color2}}{-&1}x = \\textcolor{${color1}}{&2} \\\\               & \\quad \\lrArr \\quad  x = \\frac{&2}{\\textcolor{${color2}}{-&1}} \\\\               @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@            \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Equation lin\xE9aire du premier degr\xE9",
          subdescription: "Coefficients positifs  $$ax+b=c$$",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["&3x+&2=&1", "&2+&3x=&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;&1-1]",
              "&3": "$e[2;9]"
            }
          ],
          solutions: [["[_(&1-&2)/&3_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 &3x\\textcolor{${color1}}{+&2}=&1               & \\quad \\lrArr \\quad &3x = &1\\textcolor{${color1}}{-&2} \\\\               & \\quad \\lrArr \\quad \\textcolor{${color2}}{&3}x = [_&1-&2_] \\\\               @@ pgcd(&1-&2;&3) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&1-&2;&3) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&1-&2_]}{\\textcolor{${color2}}{&3}} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@              \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Equation lin\xE9aire du premier degr\xE9",
          subdescription: "Coefficients relatifs",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["&1x[+_&2_]=&3", "&2[+_&1_]x=&3"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[1;9]\\{&1}",
              "&3": "$er[1;9]\\{&2;-(&2)}"
            }
          ],
          solutions: [["[_(&3-(&2))/(&1)_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}               &1x\\textcolor{${color1}}{[+_&2_]}=&3               & \\quad \\lrArr \\quad  &1x = &3\\textcolor{${color1}}{[+_-(&2)_]} \\\\                & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = [_&3-(&2)_] \\\\               & \\quad \\lrArr \\quad  x = \\frac{[_&3-(&2)_]}{\\textcolor{${color2}}{&1}} \\\\               @@ pgcd(abs(&3-(&2));&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(abs(&3-(&2));&1) != 1 && (&3-(&2))*(&1)>0  ?? & \\quad \\lrArr \\quad  x= \\frac{[_abs(&3-(&2))_]}{[_abs(&1)_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(abs(&3-(&2));&1) != 1 && (&3-(&2))*(&1)<0  ?? & \\quad \\lrArr \\quad  x= -\\frac{[_abs(&3-(&2))_]}{[_abs(&1)_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@            \\end{align}$$"
              }
            ],
            [
              {
                text: "$$\\begin{align}               \\textcolor{${color1}}{&2}[+_&1_]x=&3               & \\quad \\lrArr \\quad  &1x = &3\\textcolor{${color1}}{[+_-(&2)_]} \\\\                & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = [_&3-(&2)_] \\\\               & \\quad \\lrArr \\quad  x = \\frac{[_&3-(&2)_]}{\\textcolor{${color2}}{&1}} \\\\               @@ pgcd(abs(&3-(&2));&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(abs(&3-(&2));&1) != 1 && (&3-(&2))*(&1)>0  ?? & \\quad \\lrArr \\quad  x= \\frac{[_abs(&3-(&2))_]}{[_abs(&1)_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(abs(&3-(&2));&1) != 1 && (&3-(&2))*(&1)<0  ?? & \\quad \\lrArr \\quad  x= -\\frac{[_abs(&3-(&2))_]}{[_abs(&1)_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@            \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Equation lin\xE9aire du premier degr\xE9",
          subdescription: "Coefficients positifs - Avec second membre",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["&3x+&2=&4x+&1"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;&1-1]",
              "&3": "$e[3;9]",
              "&4": "$e[1;&3-2]"
            }
          ],
          solutions: [["[_(&1-&2)/(&3-&4)_]"]],
          correctionDetails: [
            [
              {
                text: "$$\\begin{align}                 &3x\\textcolor{${color1}}{+&2}=\\textcolor{${color2}}{[_&4x_]}+&1               & \\quad \\lrArr \\quad &3x \\textcolor{${color2}}{-[_&4x_]} = &1\\textcolor{${color1}}{-&2} \\\\               & \\quad \\lrArr \\quad \\textcolor{violet}{[_&3-&4_]}x = [_&1-&2_] \\\\               @@ pgcd(&3-&4;&1-&2) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@               @@ pgcd(&3-&4;&1-&2) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&1-&2_]}{\\textcolor{violet}{[_&3-&4_]}} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@              \\end{align}$$"
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        },
        {
          description: "Equation lin\xE9aire du premier degr\xE9",
          subdescription: "Coefficients relatifs - Avec second membre",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["&3x[+_&2_]=&4x[+_&1_]"],
          expressions2: ["x"],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$er[1;9]\\{&1}",
              "&3": "$er[2;9]",
              "&4": "$er[2;9]\\{&3}"
            }
          ],
          solutions: [["[_(&1-(&2))/(&3-(&4))_]"]],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align}               &3x\\textcolor{${color1}}{[+_&2_]}=\\textcolor{${color2}}{&4x}[+_&1_]               & \\quad \\lrArr \\quad &3x \\textcolor{${color2}}{[+_-(&4)x_]} = &1\\textcolor{${color1}}{[+_-(&2)_]} \\\\               & \\quad \\lrArr \\quad  \\textcolor{${color3}}{[_(&3-(&4))x_]} = [_&1-(&2)_] \\\\                & \\quad \\lrArr \\quad  x = \\frac{[_&1-(&2)_]}{\\textcolor{${color3}}{[_&3-(&4)_]}} \\\\               @@ pgcd(abs(&1-(&2));abs(&3-(&4))) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(abs(&1-(&2));abs(&3-(&4))) != 1 && (&1-(&2))*(&3-(&4))>0  ?? & \\quad \\lrArr \\quad  x= \\frac{[_abs(&1-(&2))_]}{[_abs(&3-(&4))_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@             @@ pgcd(abs(&1-(&2));abs(&3-(&4))) != 1 && (&1-(&2))*(&3-(&4))<0  ?? & \\quad \\lrArr \\quad  x= -\\frac{[_abs(&1-(&2))_]}{[_abs(&3-(&4))_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@            \\end{align}$$`
              }
            ]
          ],
          type: "equation",
          defaultDelay: 30,
          grade: QUATRIEME
        }
      ]
    }
  },
  Fonctions: {
    "Fonctions affines": {
      Apprivoiser: [
        {
          description: "Reconna\xEEtre une fonction affine",
          subdescription: "A partir de l'expression alg\xE9brique",
          enounces: ["Cette fonction est-elle une fonction affine ?"],
          expressions: [
            "f(x)=[_&1x_][+_&2_]",
            "f(x)=&2[+_&1x_]",
            "f(x)={[_&1/&3_]}x[+_&2/&4_]",
            "f(x)=[_&2/&4_]+{[_abs(&1)/&3_]}x",
            "f(x)=[_&1x_]",
            "f(x)=&2",
            "f(x)=[_&1x^2_][+_&2_]",
            "f(x)=&2[+_&1x^3_]",
            "f(x)=&1/x[+_&2_]"
          ],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$er[1;9]",
              "&3": "$e[2;9]\\{cd(&1)}",
              "&4": "$e[2;9]\\{cd(&2)}"
            }
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          correctionDetails: [
            [
              {
                text: "&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=&1$$ et $$b=&2$$."
              }
            ],
            [
              {
                text: "&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=&1$$ et $$b=&2$$."
              }
            ],
            [
              {
                text: "&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=[_&1/&3_]$$ et $$b=[_&2/&4_]$$."
              }
            ],
            [
              {
                text: "&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=[_abs(&1)/&3_]$$ et $$b=[_&2/&4_]$$."
              }
            ],
            [
              {
                text: "&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=&1$$ et $$b=0$$."
              }
            ],
            [
              {
                text: "&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=0$$ et $$b=&2$$."
              }
            ],
            [
              {
                text: "&solution, $$f$$ n'est pas une fonction affine car son expression n'est pas de la forme $$ax+b$$."
              }
            ],
            [
              {
                text: "&solution, $$f$$ n'est pas une fonction affine car son expression n'est pas de la forme $$ax+b$$."
              }
            ],
            [
              {
                text: "&solution, $$f$$ n'est pas une fonction affine car son expression n'est pas de la forme $$ax+b$$."
              }
            ]
          ],
          solutions: [[0], [0], [0], [0], [0], [0], [1], [1], [1]],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: TROISIEME
        },
        {
          description: "Reconna\xEEtre une fonction affine",
          subdescription: "A partir de la repr\xE9sentation graphique",
          enounces: ["Cette courbe repr\xE9sente-t-elle une fonction affine ?"],
          images: [
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-0-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-1-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-2-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-3-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-4-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-5-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-6-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-7-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-8-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-9-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-10-600.png",
            "fonctions-affines/reconnaitre/reconnaitre_fonction_affine-11-600.png"
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          solutions: [
            [0],
            [0],
            [0],
            [0],
            [0],
            [0],
            [1],
            [1],
            [1],
            [1],
            [1],
            [1]
          ],
          correctionDetails: [
            [
              {
                text: "&solution, cette courbe repr\xE9sente une fonction affine car c'est une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe repr\xE9sente une fonction affine car c'est une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe repr\xE9sente une fonction affine car c'est une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe repr\xE9sente une fonction affine car c'est une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe repr\xE9sente une fonction affine car c'est une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe repr\xE9sente une fonction affine car c'est une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe ne repr\xE9sente pas une fonction affine car ce n'est pas une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe ne repr\xE9sente pas une fonction affine car ce n'est pas une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe ne repr\xE9sente pas une fonction affine car ce n'est pas une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe ne repr\xE9sente pas une fonction affine car ce n'est pas une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe ne repr\xE9sente pas une fonction affine car ce n'est pas une droite."
              }
            ],
            [
              {
                text: "&solution, cette courbe ne repr\xE9sente pas une fonction affine car ce n'est pas une droite."
              }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: TROISIEME
        },
        {
          description: "Vocabulaire des fonctions affines",
          enounces: [
            "Dans la fonction affine $$f(x)=&1x[+_&2_]$$, le nombre $$&1$$ s'appelle ...",
            "Dans la fonction affine $$f(x)=&1x[+_&2_]$$, le nombre $$&2$$ s'appelle ...",
            "Dans la fonction affine $$f(x)=&2[+_&1_]x$$, le nombre $$&1$$ s'appelle ...",
            "Dans la fonction affine $$f(x)=&2[+_&1_]x$$, le nombre $$&2$$ s'appelle ..."
          ],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$e[1;9]\\{&1;-(&1)}"
            }
          ],
          choices: [
            [
              { text: "le coefficient directeur" },
              { text: "l'ordonn\xE9e \xE0 l'origine " }
            ]
          ],
          options: ["no-shuffle-choices"],
          solutions: [[0], [1], [0], [1]],
          defaultDelay: 10,
          grade: TROISIEME
        },
        {
          description: "D\xE9terminer l'ordonn\xE9e \xE0 l'origine",
          subdescription: "Graphiquement",
          enounces: [
            "Quelle est l'ordonn\xE9e \xE0 l'origine de cette fonction affine ?"
          ],
          images: [
            "fonctions-affines/exemples/fonction_affine-0-600.png",
            "fonctions-affines/exemples/fonction_affine-1-600.png",
            "fonctions-affines/exemples/fonction_affine-2-600.png",
            "fonctions-affines/exemples/fonction_affine-3-600.png",
            "fonctions-affines/exemples/fonction_affine-4-600.png",
            "fonctions-affines/exemples/fonction_affine-5-600.png",
            "fonctions-affines/exemples/fonction_affine-6-600.png",
            "fonctions-affines/exemples/fonction_affine-7-600.png",
            "fonctions-affines/exemples/fonction_affine-8-600.png",
            "fonctions-affines/exemples/fonction_affine-9-600.png",
            "fonctions-affines/exemples/fonction_affine-10-600.png",
            "fonctions-affines/exemples/fonction_affine-11-600.png",
            "fonctions-affines/exemples/fonction_affine-12-600.png",
            "fonctions-affines/exemples/fonction_affine-13-600.png",
            "fonctions-affines/exemples/fonction_affine-14-600.png",
            "fonctions-affines/exemples/fonction_affine-15-600.png",
            "fonctions-affines/exemples/fonction_affine-16-600.png",
            "fonctions-affines/exemples/fonction_affine-17-600.png",
            "fonctions-affines/exemples/fonction_affine-18-600.png",
            "fonctions-affines/exemples/fonction_affine-19-600.png",
            "fonctions-affines/exemples/fonction_affine-20-600.png",
            "fonctions-affines/exemples/fonction_affine-21-600.png",
            "fonctions-affines/exemples/fonction_affine-22-600.png",
            "fonctions-affines/exemples/fonction_affine-23-600.png",
            "fonctions-affines/exemples/fonction_affine-24-600.png",
            "fonctions-affines/exemples/fonction_affine-25-600.png",
            "fonctions-affines/exemples/fonction_affine-26-600.png",
            "fonctions-affines/exemples/fonction_affine-27-600.png",
            "fonctions-affines/exemples/fonction_affine-28-600.png",
            "fonctions-affines/exemples/fonction_affine-29-600.png"
          ],
          imagesCorrection: [
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-0-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-1-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-2-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-3-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-4-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-5-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-6-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-7-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-8-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-9-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-10-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-11-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-12-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-13-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-14-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-15-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-16-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-17-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-18-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-19-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-20-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-21-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-22-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-23-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-24-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-25-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-26-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-27-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-28-600.png",
            "fonctions-affines/ordonnee-origine/correction_ordonnee_origine-29-600.png"
          ],
          solutions: [
            ["0"],
            ["2"],
            ["0"],
            ["2"],
            ["-2"],
            ["-1"],
            ["0"],
            ["1"],
            ["0"],
            ["1"],
            ["-2"],
            ["0"],
            ["2"],
            ["1"],
            ["-2"],
            ["1"],
            ["2"],
            ["0"],
            ["-2"],
            ["-2"],
            ["1"],
            ["-2"],
            ["1"],
            ["0"],
            ["0"],
            ["-1"],
            ["0"],
            ["2"],
            ["0"],
            ["0"]
          ],
          correctionFormat: [
            {
              correct: ["L'ordonn\xE9e \xE0 l'origine est &answer."]
            }
          ],
          options: ["no-exp"],
          defaultDelay: 10,
          grade: SECONDE
        },
        {
          description: "D\xE9terminer le coefficient directeur",
          subdescription: "Graphiquement",
          enounces: [
            "Quel est le coefficient directeur de cette fonction affine ?"
          ],
          images: [
            "fonctions-affines/exemples/fonction_affine-0-600.png",
            "fonctions-affines/exemples/fonction_affine-1-600.png",
            "fonctions-affines/exemples/fonction_affine-2-600.png",
            "fonctions-affines/exemples/fonction_affine-3-600.png",
            "fonctions-affines/exemples/fonction_affine-4-600.png",
            "fonctions-affines/exemples/fonction_affine-5-600.png",
            "fonctions-affines/exemples/fonction_affine-6-600.png",
            "fonctions-affines/exemples/fonction_affine-7-600.png",
            "fonctions-affines/exemples/fonction_affine-8-600.png",
            "fonctions-affines/exemples/fonction_affine-9-600.png",
            "fonctions-affines/exemples/fonction_affine-10-600.png",
            "fonctions-affines/exemples/fonction_affine-11-600.png",
            "fonctions-affines/exemples/fonction_affine-12-600.png",
            "fonctions-affines/exemples/fonction_affine-13-600.png",
            "fonctions-affines/exemples/fonction_affine-14-600.png",
            "fonctions-affines/exemples/fonction_affine-15-600.png",
            "fonctions-affines/exemples/fonction_affine-16-600.png",
            "fonctions-affines/exemples/fonction_affine-17-600.png",
            "fonctions-affines/exemples/fonction_affine-18-600.png",
            "fonctions-affines/exemples/fonction_affine-19-600.png",
            "fonctions-affines/exemples/fonction_affine-20-600.png",
            "fonctions-affines/exemples/fonction_affine-21-600.png",
            "fonctions-affines/exemples/fonction_affine-22-600.png",
            "fonctions-affines/exemples/fonction_affine-23-600.png",
            "fonctions-affines/exemples/fonction_affine-24-600.png",
            "fonctions-affines/exemples/fonction_affine-25-600.png",
            "fonctions-affines/exemples/fonction_affine-26-600.png",
            "fonctions-affines/exemples/fonction_affine-27-600.png",
            "fonctions-affines/exemples/fonction_affine-28-600.png",
            "fonctions-affines/exemples/fonction_affine-29-600.png"
          ],
          imagesCorrection: [
            "fonctions-affines/coef-directeur/correction_coef_directeur-0-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-1-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-2-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-3-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-4-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-5-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-6-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-7-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-8-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-9-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-10-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-11-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-12-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-13-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-14-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-15-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-16-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-17-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-18-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-19-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-20-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-21-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-22-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-23-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-24-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-25-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-26-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-27-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-28-600.png",
            "fonctions-affines/coef-directeur/correction_coef_directeur-29-600.png"
          ],
          solutions: [
            ["-3"],
            ["3"],
            ["-2"],
            ["-2"],
            ["-4"],
            ["2"],
            ["4"],
            ["4"],
            ["-4"],
            ["2"],
            ["-1"],
            ["3"],
            ["2"],
            ["-2"],
            ["-3"],
            ["1/2"],
            ["-3/2"],
            ["-4/3"],
            ["4/3"],
            ["2/3"],
            ["-4/3"],
            ["-2/3"],
            ["2/3"],
            ["-3/2"],
            ["-1/3"],
            ["-1/2"],
            ["-1/2"],
            ["3/4"],
            ["-3/4"],
            ["2/3"]
          ],
          correctionFormat: [
            {
              correct: ["Le coefficent directeur est &answer."]
            }
          ],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "D\xE9terminer une image par une fonction affine",
          enounces: ["Quelle est l'image de $$&3$$ par la fonction affine :"],
          expressions: ["f(x)=&1x[+_&2_]"],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[1;9]",
              "&3": "$er[0;9]",
              "&4": "&1*(&3)+(&2)"
            }
          ],
          type: "rewrite",
          answerFields: ["$$f(&3)=?$$"],
          solutions: [["[_&4_]"]],
          correctionFormat: [
            {
              correct: ["L'image de $$&3$$ est &answer."]
            }
          ],
          correctionDetails: [
            [{ text: "$$f(&3)=&1 \\times [(_&3_][+_&2_]=$$&solution." }]
          ],
          defaultDelay: 20,
          grade: TROISIEME
        },
        {
          description: "D\xE9terminer si un point appartient \xE0 la courbe repr\xE9sentative d'un fonction affine",
          enounces: [
            "Le point $$A(&3;[_&4_])$$ appartient-il \xE0 la courbe repr\xE9sentative de la fonction affine :"
          ],
          expressions: [
            "f(x)=&1x[+_&2_]",
            "f(x)=&1x[+_&2_]"
          ],
          variables: [
            {
              "&1": "$er[2;6]",
              "&2": "$er[1;9]",
              "&3": "$er[0;5]",
              "&4": "&1*(&3)+(&2)"
            },
            {
              "&1": "$er[2;6]",
              "&2": "$er[1;9]",
              "&3": "$er[0;5]",
              "&4": "&1*(&3)+(&2)+($er[1;3])"
            }
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          options: ["no-shuffle-choices"],
          correctionDetails: [
            [
              {
                text: `$$f(\\bold{\\textcolor{${color1}}{&3}})=&1 \\times \\bold{\\textcolor{${color1}}{[(_&3)_]}} [+_&2_]= \\bold{\\textcolor{${color2}}{[_&4_]}}$$ donc le point $$A(\\bold{\\textcolor{${color1}}{&3}};\\bold{\\textcolor{${color2}}{[_&4_]}})$$ appartient \xE0 la courbe repr\xE9sentative de la fonction affine &expression.`
              }
            ],
            [
              {
                text: `$$f(\\bold{\\textcolor{${color1}}{&3}})=&1 \\times \\bold{\\textcolor{${color1}}{[(_&3)_]}} [+_&2_]= [_&1*(&3)+(&2)_] \\bold{\\textcolor{red}{\\ne}} \\bold{\\textcolor{${color2}}{[_&4_]}}$$ donc le point $$A(\\bold{\\textcolor{${color1}}{&3}};\\bold{\\textcolor{${color2}}{[_&4_]}})$$ n'appartient pas \xE0 la courbe repr\xE9sentative de la fonction affine &expression.`
              }
            ]
          ],
          solutions: [[0], [1]],
          defaultDelay: 20,
          grade: TROISIEME
        }
      ],
      "Variations-Signe": [
        {
          description: "D\xE9terminer le sens de variation d'une fonction affine",
          enounces: ["Quel est le sens de variation de cette fonction?"],
          expressions: [
            "f(x)=&1x[+_&4_]",
            "f(x)=-&1x[+_&4_]",
            "f(x)=[_&4_]+&1x",
            "f(x)=[_&4_]-&1x",
            "f(x)={&3}x[+_&7_]",
            "f(x)={-&3}x[+_&7_]",
            "f(x)=[_&7_]+{&3}x",
            "f(x)=[_&7_]-{&3}x"
          ],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$l{-1;1}",
              "&4": "&2*(&3)"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$l{-1;1}",
              "&4": "&2*(&3)"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$l{-1;1}",
              "&4": "&2*(&3)"
            },
            {
              "&1": "$e[2;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$l{-1;1}",
              "&4": "&2*(&3)"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "&1/&2",
              "&4": "$e[1;9]",
              "&5": "$e[2;9]\\{cd(&4)}",
              "&6": "$l{-1;1}",
              "&7": "&6*&4/&5"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "&1/&2",
              "&4": "$e[1;9]",
              "&5": "$e[2;9]\\{cd(&4)}",
              "&6": "$l{-1;1}",
              "&7": "&6*&4/&5"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "&1/&2",
              "&4": "$e[1;9]",
              "&5": "$e[2;9]\\{cd(&4)}",
              "&6": "$l{-1;1}",
              "&7": "&6*&4/&5"
            },
            {
              "&1": "$e[1;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "&1/&2",
              "&4": "$e[1;9]",
              "&5": "$e[2;9]\\{cd(&4)}",
              "&6": "$l{-1;1}",
              "&7": "&6*&4/&5"
            }
          ],
          choices: [[{ text: "croissante" }, { text: "d\xE9croissante" }]],
          correctionDetails: [
            [
              {
                text: "La fonction &expression est &solution car $$&1$$ est positif."
              }
            ],
            [
              {
                text: "La fonction &expression est &solution car $$-&1$$ est n\xE9gatif."
              }
            ],
            [
              {
                text: "La fonction &expression est &solution car $$&1$$ est positif."
              }
            ],
            [
              {
                text: "La fonction &expression est &solution car $$-&1$$ est n\xE9gatif."
              }
            ],
            [
              {
                text: "La fonction &expression est &solution car $$[\xB0&3\xB0]$$ est positif."
              }
            ],
            [
              {
                text: "La fonction &expression est &solution car $$-[\xB0&3\xB0]$$ est n\xE9gatif."
              }
            ],
            [
              {
                text: "La fonction &expression est &solution car $$[\xB0&3\xB0]$$ est positif."
              }
            ],
            [
              {
                text: "La fonction &expression est &solution car $$-[\xB0&3$\xB0]$$ est n\xE9gatif."
              }
            ]
          ],
          solutions: [[0], [1], [0], [1], [0], [1], [0], [1]],
          options: ["no-shuffle-choices"],
          defaultDelay: 10,
          grade: TROISIEME
        },
        {
          description: "D\xE9terminer si deux fonctions affines ont des droites repr\xE9sentatives parall\xE8les",
          enounces: [
            "Les droites repr\xE9sentatives de ces 2 fonctions affines sont-elles parall\xE8les?"
          ],
          expressions: ["f(x)=&1x[+_&2_]"],
          expressions2: [
            "g(x)=&1x[+_&3_]",
            "g(x)=&3[+_&1_]x",
            "g(x)=&3x[+_&2_]",
            "g(x)=&2[+_&3_]x",
            "g(x)=[_-(&1)_]x[+_&3_]",
            "g(x)=&3[+_-(&1)_]x"
          ],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$e[1;9]\\{&1}",
              "&3": "$er[2;9]"
            }
          ],
          choices: [
            [{ text: "parall\xE8les" }, { text: "<b>non</b> parall\xE8les" }]
          ],
          options: ["no-shuffle-choices"],
          correctionDetails: [
            [
              {
                text: "Les droites repr\xE9sentatives des fonctions &expression et &expression2 sont &solution car elles ont le m\xEAme coefficient directeur $$&1$$."
              }
            ],
            [
              {
                text: "Les droites repr\xE9sentatives des fonctions &expression et &expression2 sont &solution car elles ont le m\xEAme coefficient directeur $$&1$$."
              }
            ],
            [
              {
                text: "Les droites repr\xE9sentatives des fonctions &expression et &expression2 sont &solution car elles n'ont pas le m\xEAme coefficient directeur."
              }
            ],
            [
              {
                text: "Les droites repr\xE9sentatives des fonctions &expression et &expression2 sont &solution car elles n'ont pas le m\xEAme coefficient directeur."
              }
            ],
            [
              {
                text: "Les droites repr\xE9sentatives des fonctions &expression et &expression2 sont &solution car elles n'ont pas le m\xEAme coefficient directeur."
              }
            ],
            [
              {
                text: "Les droites repr\xE9sentatives des fonctions &expression et &expression2 sont &solution car elles n'ont pas le m\xEAme coefficient directeur."
              }
            ]
          ],
          solutions: [[0], [0], [1], [1], [1], [1]],
          defaultDelay: 10,
          grade: TROISIEME
        },
        {
          description: "Reconna\xEEtre le tableau de signe d'une fonction affine",
          enounces: [
            "Quel est le tableau de signe correspondant \xE0 la fonction affine:"
          ],
          expressions: [
            "f(x)=-6x+7",
            "f(x)=-9x-1",
            "f(x)=-5x+9",
            "f(x)=3x+3",
            "f(x)=7x-8",
            "f(x)=-2x-4",
            "f(x)=6x+8",
            "f(x)=4x+9",
            "f(x)=-7x+2",
            "f(x)=2x+5",
            "f(x)=8x-1",
            "f(x)=-4x",
            "f(x)=-5x-1",
            "f(x)=-x+7",
            "f(x)=x-8",
            "f(x)=-7x+6",
            "f(x)=x",
            "f(x)=-3x+4",
            "f(x)=-5x-5",
            "f(x)=5x-7"
          ],
          choices: [
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-0-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-0-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-1-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-1-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-2-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-2-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-3-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-3-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-4-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-4-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-5-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-5-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-6-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-6-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-7-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-7-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-8-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-8-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-9-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-9-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-10-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-10-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-11-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-11-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-12-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-12-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-13-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-13-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-14-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-14-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-15-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-15-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-16-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-16-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-17-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-17-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-18-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-18-600.png"
              }
            ],
            [
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-19-600.png"
              },
              {
                image: "fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-19-600.png"
              }
            ]
          ],
          solutions: [[0]],
          defaultDelay: 20,
          grade: TROISIEME
        }
      ],
      Equations: [
        {
          description: "Racine d'une fonction affine",
          enounces: [
            "Pour quelle valeur de $$x$$ la fonction $$f$$ s'annulle-t-elle?"
          ],
          expressions: ["f(x)=&1x[+_&2_]", "f(x)=&2[+_&1_]x"],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[1;9]"
            }
          ],
          type: "rewrite",
          correctionFormat: [
            {
              correct: ["La fonction s'annule en &answer"]
            }
          ],
          solutions: [["[_-(&2)/(&1)_]"]],
          defaultDelay: 20,
          grade: TROISIEME
        },
        {
          description: "R\xE9soudre l'\xE9quation $$f(x)=k$$",
          subdescription: "Graphiquement",
          enounces: ["R\xE9soudre graphiquement l'\xE9quation $$f(x)=&1$$"],
          variables: [
            {
              "&1": "-3"
            },
            {
              "&1": "-1"
            },
            {
              "&1": "2"
            },
            {
              "&1": "-4"
            },
            {
              "&1": "2"
            },
            {
              "&1": "-1"
            },
            {
              "&1": "4"
            },
            {
              "&1": "-3"
            },
            {
              "&1": "4"
            },
            {
              "&1": "1"
            },
            {
              "&1": "1"
            },
            {
              "&1": "3"
            },
            {
              "&1": "-4"
            },
            {
              "&1": "-1"
            },
            {
              "&1": "-2"
            },
            {
              "&1": "2"
            },
            {
              "&1": "-1"
            },
            {
              "&1": "0"
            },
            {
              "&1": "2"
            },
            {
              "&1": "0"
            },
            {
              "&1": "-3"
            },
            {
              "&1": "-2"
            },
            {
              "&1": "1"
            },
            {
              "&1": "0"
            },
            {
              "&1": "0"
            },
            {
              "&1": "0"
            },
            {
              "&1": "-2"
            },
            {
              "&1": "2"
            },
            {
              "&1": "0"
            },
            {
              "&1": "2"
            }
          ],
          images: [
            "fonctions-affines/exemples/fonction_affine-0-600.png",
            "fonctions-affines/exemples/fonction_affine-1-600.png",
            "fonctions-affines/exemples/fonction_affine-2-600.png",
            "fonctions-affines/exemples/fonction_affine-3-600.png",
            "fonctions-affines/exemples/fonction_affine-4-600.png",
            "fonctions-affines/exemples/fonction_affine-5-600.png",
            "fonctions-affines/exemples/fonction_affine-6-600.png",
            "fonctions-affines/exemples/fonction_affine-7-600.png",
            "fonctions-affines/exemples/fonction_affine-8-600.png",
            "fonctions-affines/exemples/fonction_affine-9-600.png",
            "fonctions-affines/exemples/fonction_affine-10-600.png",
            "fonctions-affines/exemples/fonction_affine-11-600.png",
            "fonctions-affines/exemples/fonction_affine-12-600.png",
            "fonctions-affines/exemples/fonction_affine-13-600.png",
            "fonctions-affines/exemples/fonction_affine-14-600.png",
            "fonctions-affines/exemples/fonction_affine-15-600.png",
            "fonctions-affines/exemples/fonction_affine-16-600.png",
            "fonctions-affines/exemples/fonction_affine-17-600.png",
            "fonctions-affines/exemples/fonction_affine-18-600.png",
            "fonctions-affines/exemples/fonction_affine-19-600.png",
            "fonctions-affines/exemples/fonction_affine-20-600.png",
            "fonctions-affines/exemples/fonction_affine-21-600.png",
            "fonctions-affines/exemples/fonction_affine-22-600.png",
            "fonctions-affines/exemples/fonction_affine-23-600.png",
            "fonctions-affines/exemples/fonction_affine-24-600.png",
            "fonctions-affines/exemples/fonction_affine-25-600.png",
            "fonctions-affines/exemples/fonction_affine-26-600.png",
            "fonctions-affines/exemples/fonction_affine-27-600.png",
            "fonctions-affines/exemples/fonction_affine-28-600.png",
            "fonctions-affines/exemples/fonction_affine-29-600.png"
          ],
          imagesCorrection: [
            "fonctions-affines/equation/correction_equation-0-600.png",
            "fonctions-affines/equation/correction_equation-1-600.png",
            "fonctions-affines/equation/correction_equation-2-600.png",
            "fonctions-affines/equation/correction_equation-3-600.png",
            "fonctions-affines/equation/correction_equation-4-600.png",
            "fonctions-affines/equation/correction_equation-5-600.png",
            "fonctions-affines/equation/correction_equation-6-600.png",
            "fonctions-affines/equation/correction_equation-7-600.png",
            "fonctions-affines/equation/correction_equation-8-600.png",
            "fonctions-affines/equation/correction_equation-9-600.png",
            "fonctions-affines/equation/correction_equation-10-600.png",
            "fonctions-affines/equation/correction_equation-11-600.png",
            "fonctions-affines/equation/correction_equation-12-600.png",
            "fonctions-affines/equation/correction_equation-13-600.png",
            "fonctions-affines/equation/correction_equation-14-600.png",
            "fonctions-affines/equation/correction_equation-15-600.png",
            "fonctions-affines/equation/correction_equation-16-600.png",
            "fonctions-affines/equation/correction_equation-17-600.png",
            "fonctions-affines/equation/correction_equation-18-600.png",
            "fonctions-affines/equation/correction_equation-19-600.png",
            "fonctions-affines/equation/correction_equation-20-600.png",
            "fonctions-affines/equation/correction_equation-21-600.png",
            "fonctions-affines/equation/correction_equation-22-600.png",
            "fonctions-affines/equation/correction_equation-23-600.png",
            "fonctions-affines/equation/correction_equation-24-600.png",
            "fonctions-affines/equation/correction_equation-25-600.png",
            "fonctions-affines/equation/correction_equation-26-600.png",
            "fonctions-affines/equation/correction_equation-27-600.png",
            "fonctions-affines/equation/correction_equation-28-600.png",
            "fonctions-affines/equation/correction_equation-29-600.png"
          ],
          solutions: [
            ["1"],
            ["-1"],
            ["-1"],
            ["3"],
            ["-1"],
            ["0"],
            ["1"],
            ["-1"],
            ["-1"],
            ["0"],
            ["-3"],
            ["1"],
            ["-3"],
            ["1"],
            ["0"],
            ["2"],
            ["2"],
            ["0"],
            ["3"],
            ["0"],
            ["3"],
            ["0"],
            ["0"],
            ["0"],
            ["0"],
            ["-2"],
            ["4"],
            ["0"],
            ["0"],
            ["3"]
          ],
          correctionFormat: [
            {
              correct: ["La solution de l'\xE9quation est &answer."]
            }
          ],
          defaultDelay: 20,
          grade: SECONDE
        }
      ]
    },
    "Valeur absolue": {
      Apprivoiser: [
        {
          description: "Oppos\xE9 d'une expression",
          enounces: ["Quel est l'oppos\xE9 de l'expression :"],
          expressions: ["[_&1x_]", "x[+_&2_]", "&2-x"],
          answerFields: ["L'oppos\xE9 est $$?$$"],
          variables: [
            {
              "&1": "$er[1;2]",
              "&2": "$er[1;9]"
            }
          ],
          solutions: [["[_-(&1)x_]"], ["-x[+_-(&2)_]"], ["[_-(&2)_]+x"]],
          correctionFormat: [
            {
              correct: ["L'oppos\xE9 est &answer."]
            }
          ],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "Signe d'une expression",
          subdescription: "Signe d'une expression simple avec $$x$$ positif",
          enounces: [
            "Si $$x$$ est <b>positif</b>, quel est le signe de cette expression :"
          ],
          expressions: ["[_&1x_]", "[_(&2)x_]", "x+&1", "x&2"],
          variables: [
            {
              "&1": "$e[2;4]",
              "&2": "-$e[1;3]"
            }
          ],
          choices: [
            [
              { text: "positive" },
              { text: "n\xE9gative" },
              { text: "On ne peut pas savoir." }
            ]
          ],
          solutions: [[0], [1], [0], [2]],
          correctionDetails: [
            [
              {
                text: "Si $$x$$ est <b>positif</b>, quand je le multiplie par $$&1$$ qui est positif, j'obtiens une expression &solution."
              }
            ],
            [
              {
                text: "Si $$x$$ est <b>positif</b>, quand je le multiplie par $$&2$$ qui est n\xE9gatif, j'obtiens une expression &solution."
              }
            ],
            [
              {
                text: "Si $$x$$ est <b>positif</b>, quand je lui ajoute le nombre $$&1$$ qui est positif, j'obtiens une expression &solution."
              }
            ],
            [
              {
                text: "Si $$x$$ est <b>positif</b>, quand je lui soustrais $$[_-(&2)_]$$, le r\xE9sultat peut \xEAtre positif ou n\xE9gatif, suivant la valeur de $$x$$."
              },
              { text: "Si $$x \\ge [_-(&2)_]$$ , &expression est positif." },
              { text: "Si $$x \\le [_-(&2)_]$$ , &expression est n\xE9gatif." },
              { text: "&solution" }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "Signe d'une expression",
          subdescription: "Signe d'une expression simple avec $$x$$ n\xE9gatif",
          enounces: [
            "Si $$x$$ est <b>n\xE9gatif</b>, quel est le signe de cette expression :"
          ],
          expressions: ["[_&1x_]", "[_(&2)x_]", "x+&1", "x&2"],
          variables: [
            {
              "&1": "$e[2;4]",
              "&2": "-$e[1;3]"
            }
          ],
          choices: [
            [
              { text: "positive" },
              { text: "n\xE9gative" },
              { text: "On ne peut pas savoir." }
            ]
          ],
          solutions: [[1], [0], [2], [1]],
          correctionDetails: [
            [
              {
                text: "Si $$x$$ est <b>n\xE9gatif</b>, quand je le multiplie par $$&1$$ qui est positif, j'obtiens une expression &solution."
              }
            ],
            [
              {
                text: "Si $$x$$ est <b>n\xE9gatif</b>, quand je le multiplie par $$&2$$ qui est n\xE9gatif, j'obtiens une expression &solution."
              }
            ],
            [
              {
                text: "Si $$x$$ est <b>n\xE9gatif</b>, quand je lui ajoute $$&1$$, le r\xE9sultat peut \xEAtre positif ou n\xE9gatif, suivant la valeur de $$x$$."
              },
              { text: "Si $$x \\ge -&1$$ , &expression est positif." },
              { text: "Si $$x \\le -&1$$ , &expression est n\xE9gatif." },
              { text: "&solution" }
            ],
            [
              {
                text: "Si $$x$$ est <b>n\xE9gatif</b>, quand je lui soustrais le nombre $$[_-(&2)_]$$, j'obtiens une expression &solution."
              }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "Calculer la valeur d'une valeur absolue",
          subdescription: "Nombres entiers",
          enounces: ["Calcule."],
          expressions: ["abs(&1)"],
          variables: [
            {
              "&1": "$er[0;9]"
            }
          ],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "Calculer la valeur d'une valeur absolue",
          subdescription: "Nombres vari\xE9s",
          enounces: ["Calcule."],
          expressions: [
            "abs(&1/&2)",
            "abs(-&1/&2)",
            "abs(sqrt(&3))",
            "abs(-sqrt(&3))",
            "abs(&4)",
            "abs(-&4)"
          ],
          solutions: [
            ["[_abs(&1/&2)_]"],
            ["[_abs(-&1/&2)_]"],
            ["[_abs(sqrt(&3))_]"],
            ["[_abs(-sqrt(&3))_]"],
            ["[._abs(&4)_]"],
            ["[._abs(-&4)_]"]
          ],
          variables: [
            {
              "&1": "$e[1;9]",
              "&2": "$e[2;9]\\{cd(&1)}",
              "&3": "$l{2;3;5;7}",
              "&4": "$d{1;1}"
            }
          ],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "Calculer la valeur d'une valeur absolue",
          subdescription: "D'une expression simple \xE0 calculer",
          enounces: ["Calcule."],
          expressions: ["abs(&1[+_&2_])", "abs(&1*[(_&2_])"],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$er[1;9]"
            }
          ],
          correctionDetails: [
            [
              {
                text: "&expression$$=\\left\\lvert [_&1+(&2)_] \\right\\rvert=$$&solution"
              }
            ],
            [
              {
                text: "&expression$$=\\left\\lvert [_&1*(&2)_] \\right\\rvert=$$&solution"
              }
            ]
          ],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "Calculer la valeur d'une valeur absolue",
          subdescription: "D'une expression dont il faut \xE9tudier le signe",
          enounces: ["Calcule."],
          expressions: ["abs(sqrt(&1)-&2)"],
          variables: [
            {
              "&1": "$l{2;3;5;7}",
              "&2": "$e[1;3]"
            }
          ],
          solutions: [["&1>&2^2 ?? sqrt(&1)-&2 :: &2-sqrt(&1)"]],
          correctionDetails: [
            [
              {
                text: "@@ &1>&2^2 ?? $$\\sqrt{&1} \\gt &2$$ donc $$\\sqrt{&1}-&2 \\gt 0$$ et &expression$$=$$&solution @@"
              },
              {
                text: "@@ &1<&2^2 ?? $$\\sqrt{&1} \\lt &2$$ donc $$\\sqrt{&1}-&2 \\lt 0$$ et &expression$$=$$&solution @@"
              }
            ]
          ],
          defaultDelay: 20,
          grade: SECONDE
        },
        {
          description: "Calculer une valeur absolue",
          subdescription: "Valeur absolue d'une expression litt\xE9rale dont il faut \xE9tudier le signe",
          enounces: [
            "Calculer cette expression si $$x \\ge 0$$.",
            "Calculer cette expression si $$x \\le 0$$.",
            "Calculer cette expression si $$x \\ge 0$$.",
            "Calculer cette expression si $$x \\le 0$$.",
            "Calculer cette expression si $$x \\ge -&1$$.",
            "Calculer cette expression si $$x \\le -&1$$.",
            "Calculer cette expression si $$x \\ge [_-(&2)_]$$.",
            "Calculer cette expression si $$x \\le [_-(&2)_]$$."
          ],
          expressions: [
            "abs([_&1x_])",
            "abs([_&1x_])",
            "abs([_(&2)x_])",
            "abs([_(&2)x_])",
            "abs(x+&1)",
            "abs(x+&1)",
            "abs(x&2)",
            "abs(x&2)"
          ],
          variables: [
            {
              "&1": "$e[1;3]",
              "&2": "-$e[1;3]"
            }
          ],
          solutions: [
            ["[_&1x_]"],
            ["[_-&1x_]"],
            ["[_-(&2)x_]"],
            ["[_&2x_]"],
            ["x+&1"],
            ["-x-&1"],
            ["x&2"],
            ["[_-(&2)_]-x"]
          ],
          correctionDetails: [
            [
              {
                text: "@@ &1=1 ?? $$x \\ge 0$$ donc $$\\left \\lvert x \\right \\rvert =$$&solution @@"
              },
              {
                text: "@@ &1!=1 ?? $$x \\ge 0$$ donc $$&1x \\ge 0$$ et $$\\left \\lvert &1x \\right \\rvert =$$&solution @@"
              }
            ],
            [
              {
                text: "@@ &1=1 ?? $$x \\le 0$$ donc $$\\left \\lvert x \\right \\rvert =$$&solution @@"
              },
              {
                text: "@@ &1!=1 ?? $$x \\le 0$$ donc $$&1x \\le 0$$ et $$\\left \\lvert &1x \\right \\rvert =$$&solution @@"
              }
            ],
            [
              {
                text: "@@ &2=1 ?? $$x \\ge 0$$ donc $$\\left \\lvert -x \\right \\rvert =$$&solution @@"
              },
              {
                text: "@@ &2!=1 ?? $$x \\ge 0$$ donc $$&2x \\le 0$$ et $$\\left \\lvert &2x \\right \\rvert =$$&solution @@"
              }
            ],
            [
              {
                text: "@@ &2=-1 ?? $$x \\le 0$$ donc $$\\left \\lvert -x \\right \\rvert =$$&solution @@"
              },
              {
                text: "@@ &2!=-1 ?? $$x \\le 0$$ donc $$&2x \\ge 0$$ et $$\\left \\lvert &2x \\right \\rvert =$$&solution @@"
              }
            ],
            [
              {
                text: " $$x \\ge -&1$$ donc $$x+&1 \\ge 0$$ et $$\\left \\lvert x+&1 \\right \\rvert =$$&solution"
              }
            ],
            [
              {
                text: " $$x \\le -&1$$ donc $$x+&1 \\le 0$$ et $$\\left \\lvert x+&1 \\right \\rvert =$$&solution"
              }
            ],
            [
              {
                text: " $$x \\ge [_-(&2)_]$$ donc $$x&2 \\ge 0$$ et $$\\left \\lvert x&2 \\right \\rvert =$$&solution"
              }
            ],
            [
              {
                text: " $$x \\le [_-(&2)_]$$ donc $$x&2 \\le 0$$ et $$\\left \\lvert x&2 \\right \\rvert =$$&solution"
              }
            ]
          ],
          defaultDelay: 20,
          grade: SECONDE
        }
      ],
      Equations: [
        {
          description: "R\xE9soudre une \xE9quation avec une valeur absolue",
          enounces: ["R\xE9souds cette \xE9quation."],
          expressions: ["abs(x[+_-(&1)_])=&2"],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$e[1;9]"
            }
          ],
          conditions: ["abs(&1) != abs(&2)"],
          solutions: [["[_&1+&2_]", "[_&1-&2_]"]],
          answerFields: ["$$x=\\ldots$$ ou $$x=\\ldots$$"],
          correctionFormat: [
            {
              correct: [
                "Les solutions sont $$x=$$&answer1 et $$x=$$&answer2"
              ]
            }
          ],
          correctionDetails: [
            [
              {
                text: `$$\\begin{align} 								\\left\\lvert x[+_-(&1)_] \\right\\rvert=&2 								& \\quad \\lrArr \\quad 								    \\begin{cases} 								       x[+_-(&1)_]= &2 \\\\ 									   \\text{ou} \\\\ 								       x[+_-(&1)_]= -&2  							        \\end{cases} \\\\ 								& \\quad \\lrArr \\quad 								    \\begin{cases} 								       x= &2[+_&1_] \\\\ 									   \\text{ou} \\\\ 								       x= -&2[+_&1_]  							        \\end{cases} \\\\ 								& \\quad \\lrArr \\quad 								    \\begin{cases} 								       x= &sol1 \\\\ 									   \\text{ou} \\\\ 								       x= &sol2  							        \\end{cases} \\\\ 							 \\end{align}$$`
              }
            ]
          ],
          defaultDelay: 20,
          options: ["solutions-order-not-important"],
          grade: SECONDE
        }
      ]
    },
    "Polyn\xF4me du second degr\xE9": {
      Apprivoiser: [
        {
          description: "Reconna\xEEtre un polyn\xF4me du second degr\xE9",
          enounces: [
            "Cette expression est-elle celle d'un polyn\xF4me du second degr\xE9 ?"
          ],
          expressions: [
            "[_&1x^3_][+_&2x^2_][+_&3x_][+_&4_]",
            "[_&1x^2_][+_&2x_][+_&3_]",
            "[_&1x^2_][+_&2x_][+_&4sqrt(x)_][+_&3_]",
            "&1(x[+_&2_])(x[+_&3_])",
            "&1(x[+_&2_])^2[+_&3_]",
            "{[_&1x^2_][+_&2x_][+_&3_]}/{x[+_&4_]}"
          ],
          variables: [
            {
              "&1": "$er[1;5]",
              "&2": "$er[0;5]",
              "&3": "$er[0;5]",
              "&4": "$er[0;5]"
            },
            {
              "&1": "$er[1;5]",
              "&2": "$er[0;5]",
              "&3": "$er[0;5]"
            },
            {
              "&1": "$er[1;5]",
              "&2": "$er[0;5]",
              "&3": "$er[0;5]",
              "&4": "$er[1;5]"
            },
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]\\{&2}"
            },
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]"
            },
            {
              "&1": "$er[1;5]",
              "&2": "$er[0;5]",
              "&3": "$er[0;5]",
              "&4": "$er[1;5]"
            }
          ],
          choices: [
            [
              { text: "Oui" },
              { text: "Non" }
            ]
          ],
          solutions: [[1], [0], [1], [0], [0], [1]],
          correctionDetails: [
            [
              {
                text: "&solution,  dans l'expression &expression, le terme $$[_&1x^3_]$$ fait que c'est un polyn\xF4me du 3\xE8me degr\xE9 et non du second degr\xE9."
              }
            ],
            [
              {
                text: "&solution, l'expression &expression est bien de la forme $$ax^2+bx+c$$ avec $$a=&1$$, $$b=&2$$, et $$c=&3$$."
              }
            ],
            [
              {
                text: "&solution, dans l'expression &expression, le terme $$[_&4sqrt(x)_]$$ fait que ce n'est pas un polyn\xF4me."
              }
            ],
            [
              {
                text: "&solution, si on d\xE9veloppe l'expression &expression, on trouve bien une expression de la forme $$ax^2+bx+c$$."
              }
            ],
            [
              {
                text: "&solution, si on d\xE9veloppe l'expression &expression, on trouve bien une expression de la forme $$ax^2+bx+c$$."
              }
            ],
            [
              {
                text: "&solution, l'expression &expression est une fraction entre un polyn\xF4me du second degr\xE9 et l'expression d'une fonction affine, ce n'est pas un polyn\xF4me."
              }
            ]
          ],
          options: ["no-shuffle-choices", "remove-null-terms"],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "Reconna\xEEtre la forme d'une expression du second degr\xE9",
          enounces: [
            "Quelle est la forme de cette expression du second degr\xE9 ?"
          ],
          expressions: [
            "[_&1x^2_][+_&2x_][+_&3_]",
            "&1(x[+_&2_])(x[+_&3_])",
            "&1(x[+_&2_])^2[+_&3_]"
          ],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]\\{&2}"
            }
          ],
          choices: [
            [
              { text: "d\xE9velopp\xE9e" },
              { text: "factoris\xE9e" },
              { text: "canonique" }
            ]
          ],
          solutions: [[0], [1], [2]],
          correctionDetails: [
            [
              {
                text: "C'est la forme &solution $$ax^2+bx+c$$ avec $$a=&1$$, $$b=&2$$ et $$c=&3$$"
              }
            ],
            [
              {
                text: "C'est la forme &solution $$a(x-x_1)(x-x_2)$$ avec $$a=&1$$, $$x_1=[_-(&2)_]$$,  et $$x_2=[_-(&3)_]$$"
              }
            ],
            [
              {
                text: "C'est la forme &solution $$a(x-\\alpha)^2+\\beta$$ avec $$a=&1$$, $$\\alpha=[_-(&2)_]$$,et $$\\beta=&3$$"
              }
            ]
          ],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "",
          enounces: [
            "Quel est le coefficient du terme de degr\xE9 2 dans cette expression  ?"
          ],
          expressions: [
            "[_&1x^2_][+_&2x_][+_&3_]",
            "&1(x[+_&2_])(x[+_&3_])",
            "&1(x[+_&2_])^2[+_&3_]",
            "([_&4x_][+_&2_])([_&5x_][+_&3_])",
            "&1([_&4x_][+_&2_])([_&5x_][+_&3_])"
          ],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]",
              "&4": "$er[1;5]",
              "&5": "$er[1;5]"
            }
          ],
          correctionFormat: [
            {
              correct: ["Le coefficient est &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: `L'expression est sous la forme d\xE9velopp\xE9e. Le coefficient du terme de degr\xE9 2 se lit directement dans $$\\bold{\\textcolor{${color1}}{&1}}x^2[+_&2x_][+_&3_]$$. C'est donc &solution`
              }
            ],
            [
              {
                text: `L'expression est sous la forme factoris\xE9e. Le coefficient du terme de degr\xE9 2 se lit directement dans $$\\bold{\\textcolor{${color1}}{&1}}(x[+_&2_])(x[+_&3_])$$. C'est donc &solution`
              }
            ],
            [
              {
                text: `L'expression est sous la forme canonique. Le coefficient du terme de degr\xE9 2 se lit directement dans $$\\bold{\\textcolor{${color1}}{&1}}(x[+_&2_])^2[+_&3_]$$. C'est donc &solution`
              }
            ],
            [
              {
                text: `Attention, l'expression n'est pas compl\xE8tement sous la forme factoris\xE9e. `
              },
              {
                text: `Le coefficient du terme de degr\xE9 2 s'obtient en multipliant les coefficients des termes de degr\xE9 1 dans l'expression $$(\\bold{\\textcolor{${color1}}{[_&4x_]}[+_&2_])(\\bold{\\textcolor{${color1}}{[_&5x_]}[+_&3_])$$.`
              },
              {
                text: "C'est donc $$&4 \\times [(_&5_]=$$&solution"
              }
            ],
            [
              {
                text: `Attention, l'expression n'est pas compl\xE8tement sous la forme factoris\xE9e. `
              },
              {
                text: `Le coefficient du terme de degr\xE9 2 s'obtient en multipliant le coefficient devant la parenth\xE8se et les coefficients des termes de degr\xE9 1 dans l'expression $$\\bold{\\textcolor{${color1}}{&1}}(\\bold{\\textcolor{${color1}}{[_&4x_]}}[+_&2_])(\\bold{\\textcolor{${color1}}{[_&5x_]}}[+_&3_])$$.`
              },
              {
                text: "C'est donc $$&1 \\times [(_&4_] \\times [(_&5_]=$$&solution"
              }
            ]
          ],
          conditions: ["abs(&1) != abs(&2) && abs(&1) != abs(&3)"],
          answerFields: ["Le coefficient est $$?$$"],
          solutions: [
            ["&1"],
            ["&1"],
            ["&1"],
            ["[_&4*(&5)_]"],
            ["[_&1*(&4)*(&5)_]"]
          ],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer la nature de l'extremum",
          enounces: [
            "Quelle est la nature de l'extremum de cette expression du second degr\xE9 ?"
          ],
          expressions: [
            "[_&1x^2_][+_&2x_][+_&3_]",
            "&1(x[+_&2_])(x[+_&3_])",
            "&1(x[+_&2_])^2[+_&3_]",
            "([_&4x_][+_&2_])([_&5x_][+_&3_])",
            "&1([_&4x_][+_&2_])([_&5x_][+_&3_])"
          ],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]",
              "&4": "$er[1;5]",
              "&5": "$er[1;5]"
            }
          ],
          solutions: [
            ["&1>0 ?? 0 :: 1"],
            ["&1>0 ?? 0 :: 1"],
            ["&1>0 ?? 0 :: 1"],
            ["[_&4*(&5)_] >0 ?? 0 :: 1"],
            ["[_&1*(&4)*(&5)_] >0 ?? 0 :: 1"]
          ],
          choices: [[{ text: "un minimum" }, { text: "un maximum" }]],
          correctionDetails: [
            [
              {
                text: `@@ &1>0 ??  Le coefficient du terme de degr\xE9 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est positif. @@`
              },
              {
                text: `@@ &1<0 ??  Le coefficient du terme de degr\xE9 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est n\xE9gatif. @@`
              },
              {
                text: "Le polyn\xF4me admet donc &solution."
              }
            ],
            [
              {
                text: `@@ &1>0 ??  Le coefficient du terme de degr\xE9 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est positif. @@`
              },
              {
                text: `@@ &1<0 ??  Le coefficient du terme de degr\xE9 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est n\xE9gatif. @@`
              },
              {
                text: "Le polyn\xF4me admet donc &solution."
              }
            ],
            [
              {
                text: `@@ &1>0 ??  Le coefficient du terme de degr\xE9 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est positif. @@`
              },
              {
                text: `@@ &1<0 ??  Le coefficient du terme de degr\xE9 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est n\xE9gatif. @@`
              },
              {
                text: "Le polyn\xF4me admet donc &solution."
              }
            ],
            [
              {
                text: `@@ &4*(&5) >0 ?? Le coefficient du terme de degr\xE9 2 est $$&4 \\times [(_&5_]$$ qui est positif. @@`
              },
              {
                text: `@@ &4*(&5) <0 ?? Le coefficient du terme de degr\xE9 2 est $$&4 \\times [(_&5_]$$ qui est n\xE9gatif. @@`
              },
              {
                text: "Le polyn\xF4me admet donc &solution."
              }
            ],
            [
              {
                text: `@@ &1*(&4)*(&5) >0 ?? Le coefficient du terme de degr\xE9 2 est $$&1 \\times [(_&4_] \\times [(_&5_]$$ qui est positif. @@`
              },
              {
                text: `@@ &1*(&4)*(&5) <0 ?? Le coefficient du terme de degr\xE9 2 est $$&1 \\times [(_&4_]\\times [(_&5_]$$ qui est n\xE9gatif. @@`
              },
              {
                text: "Le polyn\xF4me admet donc &solution."
              }
            ]
          ],
          conditions: ["abs(&1) != abs(&2) && abs(&1) != abs(&3)"],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer les coordonn\xE9es du sommet",
          enounces: [
            "Quelles sont les coordonn\xE9es du sommet S de la courbe repr\xE9sentative de ce polyn\xF4me du second degr\xE9 ?"
          ],
          expressions: [
            "&1(x[+_&2_])^2[+_&3_]"
          ],
          answerFields: ["$$S\\left( \\, ? \\, ; \\, ? \\, \\right)$$"],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]"
            }
          ],
          solutions: [
            ["[_-(&2)_]", "&3"]
          ],
          correctionFormat: [
            {
              correct: ["Les coordonn\xE9es sont $$\\left( \\, &ans1 \\, ; \\, &ans2 \\, \\right)$$."]
            }
          ],
          correctionDetails: [
            [
              {
                text: `								@@ &2 <0 ?? L'expression $$&1(x-\\textcolor{${color1}}{[_-(&2)_]})^2\\textcolor{${color1}}{[+_&3_]}$$ est d\xE9j\xE0 sous forme canonique, ce qui nous donne directement les coordonn\xE9es du sommet $$S\\left( \\, &sol1 \\, ; \\, &sol2 \\, \\right)$$ @@								@@ &2 >0 ?? L'expression &expression se met sous la forme canonique $$&1(x-\\textcolor{${color1}}{[(_-(&2)_]})^2\\textcolor{${color1}}{[+_&3_]}$$ , ce qui nous donne  les coordonn\xE9es du sommet $$S\\left( \\, &sol1 \\, ; \\, &sol2 \\, \\right)$$ @@ 								`
              }
            ]
          ],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer l'\xE9quation de l'axe de sym\xE9trie de la parabole",
          enounces: [
            "Quelle est l'\xE9quation de l'axe de sym\xE9trie de la courbe repr\xE9sentative de ce polyn\xF4me du second degr\xE9 ?"
          ],
          expressions: [
            "&1(x[+_&2_])^2[+_&3_]"
          ],
          answerFields: ["L'\xE9quation est $$?$$"],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]"
            }
          ],
          solutions: [
            ["x=[_-(&2)_]"]
          ],
          correctionFormat: [
            {
              correct: ["L'\xE9quation est  &answer."]
            }
          ],
          correctionDetails: [
            [
              {
                text: `								@@ &2 <0 ?? L'expression $$&1(x-\\textcolor{${color1}}{[_-(&2)_]})^2[+_&3_]$$ est d\xE9j\xE0 sous forme canonique, ce qui nous donne directement l'\xE9quation &solution @@								@@ &2 >0 ?? L'expression &expression se met sous la forme canonique $$&1(x-\\textcolor{${color1}}{[(_-(&2)_]})^2[+_&3_]$$ , ce qui nous donne l'\xE9quation &solution @@ 								`
              }
            ]
          ],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer les racines d'un polyn\xF4me du second degr\xE9.",
          subdescription: "Graphiquement",
          enounces: [
            "Quelles sont les racines du polyn\xF4me repr\xE9sent\xE9 par cette parabole ?"
          ],
          images: [
            "polynome-second-degre/trouver-racines/trouver_racines-0-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-1-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-2-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-3-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-4-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-5-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-6-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-7-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-8-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-9-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-10-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-11-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-12-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-13-600.png",
            "polynome-second-degre/trouver-racines/trouver_racines-14-600.png"
          ],
          imagesCorrection: [
            "polynome-second-degre/trouver-racines/correction_trouver_racines-0-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-1-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-2-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-3-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-4-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-5-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-6-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-7-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-8-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-9-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-10-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-11-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-12-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-13-600.png",
            "polynome-second-degre/trouver-racines/correction_trouver_racines-14-600.png"
          ],
          answerFields: ["Les racines sont $$?$$ et $$?$$"],
          solutions: [["-3", "1"], ["-3", "-1"], ["1", "3"], ["-2", "0"], ["1", "2"], ["0", "2"], ["-1", "2"], ["2", "3"], ["0", "3"], ["0", "1"], ["-2", "1"], ["-1", "0"], ["-1", "1"], ["-1", "3"], ["-2", "-1"]],
          correctionFormat: [
            {
              correct: ["Les racines sont &answer1 et &answer2."]
            }
          ],
          defaultDelay: 15,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer le signe d'une expression du second degr\xE9",
          enounces: [
            "Quel est le signe de cette expression ?"
          ],
          expressions: [
            "&1(x[+_&2_])^2[+_&3_]"
          ],
          variables: [
            {
              "&1": "$e[2;5]",
              "&2": "$er[1;5]",
              "&3": "$e[1;5]"
            },
            {
              "&1": "-$e[2;5]",
              "&2": "$er[1;5]",
              "&3": "-$e[1;5]"
            },
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "-{abs(&1)/(&1)}*$e[1;5]"
            }
          ],
          solutions: [
            [0],
            [1],
            [2]
          ],
          choices: [[{ text: "positif" }, { text: "n\xE9gatif" }, { text: "son signe d\xE9pend de la valeur de $$x$$" }]],
          correctionDetails: [
            [
              {
                text: "&solution, car $$&1(x[+_&2_])^2 \\ge 0$$ et donc $$&1(x[+_&2_])^2[+_&3_] \\ge 0$$"
              }
            ],
            [
              {
                text: "&solution, car $$&1(x[+_&2_])^2 \\le 0$$ et donc $$&1(x[+_&2_])^2[+_&3_] \\le 0$$"
              }
            ],
            [
              {
                text: "L'expression &expression est une somme d'un nombre positif et d'un nombre n\xE9gatif, &solution."
              }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer la forme canonique.",
          subdescription: "Graphiquement",
          enounces: [
            "Quelle est la forme canonique du polyn\xF4me repr\xE9sent\xE9 par cette parabole ?"
          ],
          images: [
            "polynome-second-degre/forme-canonique/forme-canonique-0-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-1-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-2-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-3-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-4-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-5-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-6-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-7-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-8-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-9-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-10-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-11-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-12-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-13-600.png",
            "polynome-second-degre/forme-canonique/forme-canonique-14-600.png"
          ],
          imagesCorrection: [
            "polynome-second-degre/forme-canonique/correction-forme-canonique-0-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-1-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-2-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-3-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-4-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-5-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-6-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-7-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-8-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-9-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-10-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-11-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-12-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-13-600.png",
            "polynome-second-degre/forme-canonique/correction-forme-canonique-14-600.png"
          ],
          answerFields: ["La forme canonique est $$?$$"],
          solutions: [["{[_-1/2_]}(x[+_-(-2)_])^2[+_-1_]"], ["{[_3/4_]}(x[+_-(-2)_])^2[+_-1_]"], ["-(x[+_-(-1)_])^2[+_3_]"], ["{[_3_]}(x[+_-(-1)_])^2[+_-2_]"], ["{[_-5_]}(x[+_-(-1)_])^2[+_2_]"], ["{[_4_]}(x[+_-(1)_])^2[+_-1_]"], ["{[_1/4_]}(x[+_-(-2)_])^2[+_-2_]"], ["{[_-3_]}(x[+_-(-1)_])^2[+_1_]"], ["{[_-3/4_]}(x[+_-(-2)_])^2[+_2_]"], ["-(x[+_-(2)_])^2[+_3_]"], ["{[_4_]}(x[+_-(-1)_])^2[+_-2_]"], ["{[_-3/4_]}(x[+_-(2)_])^2[+_1_]"], ["-(x[+_-(-1)_])^2[+_2_]"], ["(x[+_-(1)_])^2[+_-3_]"], ["{[_-1/2_]}(x[+_-(2)_])^2[+_-1_]"]],
          correctionFormat: [
            {
              correct: ["La forme caconique est &answer."]
            }
          ],
          defaultDelay: 40,
          grade: PREMIERE_SPE_MATHS
        }
      ],
      Racines: [
        {
          description: "V\xE9rifier si un nombre est racine d'un polyn\xF4me",
          enounces: ["Est-ce que $$&3$$ est racine de ce polyn\xF4me ?"],
          expressions: ["x^2[+_-(&1+(&2))x_][+_(&1)*(&2)_]"],
          variables: [
            {
              "&1": "$er[1;3]",
              "&2": "$er[1;3]\\{&1}",
              "&3": "$er[1;3]\\{&1;&2}"
            },
            {
              "&1": "$er[1;3]",
              "&2": "$er[1;3]\\{&1}",
              "&3": "$l{&1;&2}"
            }
          ],
          choices: [[{ text: "Oui" }, { text: "Non" }]],
          solutions: [[1], [0]],
          correctionDetails: [
            [
              {
                text: "&solution, $$&3$$ n'est pas une racine du polyn\xF4me &expression car :"
              },
              {
                text: `$$  \\textcolor{${color1}}{[(_&3_]}^2 								@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))_] \\times \\textcolor{${color1}}{[(_&3_]} @@ 								@@   &2 + (&1) = 1 ?? -\\textcolor{${color1}}{[(_&3_]} @@ 								@@   &2 + (&1) = -1 ?? +\\textcolor{${color1}}{[(_&3_]} @@ 								[+_(&1)*(&2)_] = 								[_(&3)^2_]								@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))*(&3)_]  @@ 									@@   &2 + (&1) = 1 ?? [+_-(&3)_] @@ 									@@   &2 + (&1) = -1 ?? [+_&3_] @@ 								[+_&1*(&2)_] = [_(&3)^2-(&1+(&2))*(&3)+(&1)*(&2)_] \\textcolor{red}{\\ne} 0$$`
              }
            ],
            [
              {
                text: "&solution, $$&3$$ est une racine du polyn\xF4me  &expression car :"
              },
              {
                text: `$$\\textcolor{${color1}}{[(_&3_]}^2 									@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))_] \\times \\textcolor{${color1}}{[(_&3_]} @@ 										@@   &2 + (&1) = 1 ?? -\\textcolor{${color1}}{[(_&3_]} @@ 										@@   &2 + (&1) = -1 ?? +\\textcolor{${color1}}{[(_&3_]} @@ 									[+_(&1)*(&2)_] = 									[_(&3)^2_]									@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))*(&3)_]  @@ 									@@   &2 + (&1) = 1 ?? [+_-(&3)_] @@ 									@@   &2 + (&1) = -1 ?? [+_&3_] @@ 									[+_&1*(&2)_] = [_(&3)^2-(&1+(&2))*(&3)+(&1)*(&2)_]$$`
              }
            ]
          ],
          options: ["remove-null-terms"],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "Trouver une racine \xE9vidente d'un polyn\xF4me",
          enounces: ["Trouve une racine \xE9vidente de ce polyn\xF4me :"],
          expressions: ["x^2[+_-(&1+(&2))x_][+_(&1)*(&2)_]"],
          answerFields: ["Une racine \xE9vidente est $$?$$"],
          solutions: [["&1"]],
          variables: [
            {
              "&1": "$er[1;3]",
              "&2": "$er[1;3]\\{&1}"
            }
          ],
          testAnswers: [["(&answer)^2-(&1+(&2))*(&answer)+(&1)*(&2)=0"]],
          correctionFormat: [
            {
              correct: ["&answer est une racine \xE9vidente."]
            }
          ],
          correctionDetails: [
            [
              {
                text: "&solution est une racine \xE9vidente du polyn\xF4me &expression car :"
              },
              {
                text: `$$  \\textcolor{${color1}}{[(_&1_]}^2 								@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))_] \\times \\textcolor{${color1}}{[(_&1_]} @@ 								@@   &2 + (&1) = 1 ?? -\\textcolor{${color1}}{[(_&1_]} @@ 								@@   &2 + (&1) = -1 ?? +\\textcolor{${color1}}{[(_&1_]} @@ 								[+_(&1)*(&2)_] = 								[_(&1)^2_]								@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))*(&1)_]  @@ 									@@   &2 + (&1) = 1 ?? [+_-(&1)_] @@ 									@@   &2 + (&1) = -1 ?? [+_&1_] @@ 								[+_&1*(&2)_] = [_(&1)^2-(&1+(&2))*(&1)+(&1)*(&2)_] $$`
              }
            ]
          ],
          options: ["remove-null-terms"],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer les racines d'un polyn\xF4me du second degr\xE9",
          subdescription: "A l'aide de la forme factoris\xE9e",
          enounces: [
            "Quelles sont les racines de ce polyn\xF4me du second degr\xE9 ?"
          ],
          expressions: ["&1(x[+_&2_])(x[+_&3_])"],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]"
            }
          ],
          conditions: ["abs(&2) != abs(&3)"],
          answerFields: ["Las racines sont $$?$$ et $$?$$."],
          solutions: [["[_-(&2)_]", "[_-(&3)_]"]],
          correctionFormat: [
            {
              correct: [
                "Le polyn\xF4me est sous forme factoris\xE9e, les racines sont &answer1 et &answer2"
              ]
            }
          ],
          options: ["solutions-order-not-important"],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer les racines d'un polyn\xF4me du second degr\xE9",
          subdescription: "Le polyn\xF4me n'est pas compl\xE8tement factoris\xE9",
          enounces: [
            "Quelles sont les racines de ce polyn\xF4me du second degr\xE9 ?"
          ],
          expressions: [
            "(&1x[+_&1*(&2)_])(x[+_&3_])",
            "(x[+_&2_])(&1x[+_&1*(&3)_])"
          ],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[1;5]",
              "&3": "$er[1;5]"
            }
          ],
          conditions: ["abs(&2) != abs(&3)"],
          answerFields: ["Las racines sont $$?$$ et $$?$$."],
          solutions: [["[_-(&2)_]", "[_-(&3)_]"]],
          correctionFormat: [
            {
              correct: ["Les racines sont &answer1 et &answer2"]
            }
          ],
          correctionDetails: [
            [
              { text: "Le polyn\xF4me n'est <b>pas</b> sous forme factoris\xE9e. " },
              {
                text: "La forme factoris\xE9e est $$&1(x[+_&2_])(x[+_&3_])$$, les racines sont donc &solution1 et &solution2"
              }
            ]
          ],
          options: ["solutions-order-not-important"],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        }
      ],
      "Vrai ou Faux": [
        {
          description: "Vrai ou Faux sur les polyn\xF4mes du second degr\xE9",
          enounces: [
            "La courbe repr\xE9sentative d'un polyn\xF4me du second degr\xE9 est une droite.",
            "Un polyn\xF4me du second degr\xE9 peut ne pas avoir de racine.",
            "Un polyn\xF4me du second degr\xE9 peut n'avoir qu'une seule racine.",
            "Un polyn\xF4me du second degr\xE9 a au maximum deux racines.",
            "La forme factoris\xE9e permet de trouver les racines du polyn\xF4me.",
            "La forme canonique permet de trouver les coordonn\xE9es du sommet de la parabole.",
            "La courbe repr\xE9sentative d'un polyn\xF4me du second degr\xE9 admet un axe de sym\xE9trie."
          ],
          variables: [],
          choices: [[{ text: "Vrai" }, { text: "Faux" }]],
          solutions: [[1], [0], [0], [0], [0], [0], [0]],
          correctionDetails: [
            [
              {
                text: "&solution, la courbe repr\xE9sentative d'un polyn\xF4me du second degr\xE9 est une parabole."
              }
            ],
            [
              {
                text: "&solution, c'est le cas lorsque la courbe repr\xE9sentative ne coupe ni ne touche l'axe des abscisses. Le discriminant est alors n\xE9gatif."
              }
            ],
            [
              {
                text: "&solution, c'est le cas lorsque la courbe repr\xE9sentative touche l'axe des abscisses sans le traverser. Le discriminant est alors nul."
              }
            ],
            [
              {
                text: "&solution, c'est le nombre de fois maximum o\xF9 la courbe repr\xE9sentative peut couper l'axe des abscisses. Le discriminant est alors positif."
              }
            ],
            [
              {
                text: "&solution, dans la forme factoris\xE9e $$a(x-x_1)(x-x_2)$$, les racines sont $$x_1$$ et $$x_2$$."
              }
            ],
            [
              {
                text: "&solution, dans la forme canonique $$a(x-\\alpha)^2+\\beta$$, les coordonn\xE9es du sommet de la parabole sont $$(\\alpha; \\beta)$$."
              }
            ],
            [
              {
                text: "&solution, la courbe repr\xE9sentative admet un axe de sym\xE9trie passant par le sommet de la parabole."
              }
            ]
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 20,
          grade: PREMIERE_SPE_MATHS
        }
      ]
    }
  },
  Suites: {
    Apprivoiser: {
      "Calculer un terme": [
        {
          description: "Calculer un terme",
          subdescription: "A l'aide d'une formule explicite",
          enounces: [
            "Calculer $$u_&1$$ pour la suite $$(u_n)$$ d\xE9finie par $$u_n=&2n[+_&3_]$$ pour $$n \\ge 0$$",
            "Calculer $$u_&1$$ pour la suite $$(u_n)$$ d\xE9finie par $$u_n=&2n^2$$ pour $$n \\ge 0$$",
            "Calculer $$u_&1$$ pour la suite $$(u_n)$$ d\xE9finie par $$u_n=(-1)^n$$ pour $$n  \\ge 0$$"
          ],
          solutions: [["[_&2*&1+(&3)_]"], ["[_&2*&1^2_]"], ["[_(-1)^&1_]"]],
          variables: [
            {
              "&1": "$e[2;9]",
              "&2": "$er[2;9]",
              "&3": "$er[2;9]"
            },
            {
              "&1": "$e[3;7]",
              "&2": "$l{2;-2}"
            },
            {
              "&1": "$e[2;9]"
            }
          ],
          correctionFormat: [
            {
              correct: ["$$u_&1=&ans$$"]
            }
          ],
          correctionDetails: [
            [
              {
                text: `Avec $$u_n=&2n[+_&3_]$$, $$u_\\textcolor{${color1}}{&1}=&2 \\times \\textcolor{${color1}}{&1} [+_&3_]=&sol$$`
              }
            ],
            [
              {
                text: `Avec $$u_n=&2n^2$$, $$u_\\textcolor{${color1}}{&1}=&2 \\times \\textcolor{${color1}}{&1}^2=&sol$$`
              }
            ],
            [
              {
                text: `Avec $$u_n=(-1)^&1$$, $$u_\\textcolor{${color1}}{&1}=(-1)^\\textcolor{${color1}}{&1}=&sol$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "Calculer un terme",
          subdescription: "A l'aide d'une formule de r\xE9currence",
          enounces: [
            "Calculer $$u_2$$ pour la suite $$(u_n)$$ d\xE9finie par $$u_0=&1$$ et $$u_{n+1}=&2u_n[+_&3_]$$"
          ],
          expressions: ["&5"],
          variables: [
            {
              "&1": "$er[2;5]",
              "&2": "$er[2;3]",
              "&3": "$er[1;3]",
              "&4": "[_&2*(&1)+(&3)_]",
              "&5": "[_&2*(&4)+(&3)_]"
            }
          ],
          options: ["no-exp"],
          correctionFormat: [
            {
              correct: [
                `Avec $$u_0=&1$$ et $$u_{n+1}=&2u_n[+_&3_]$$, $$u_2=&ans$$`
              ],
              answer: "$$u_2=&ans$$"
            }
          ],
          correctionDetails: [
            [
              {
                text: `Avec $$u_0=&1$$ et $$u_{n+1}=&2u_n[+_&3_]$$`
              },
              {
                text: `$$u_1=&2u_0[+_&3_]= &2 \\times &1 [+_&3_]=&4$$`
              },
              {
                text: `$$u_2=&2u_1[+_&3_]= &2 \\times &4 [+_&3_]=&sol$$`
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        }
      ],
      "Deviner le terme g\xE9n\xE9ral": [
        {
          description: "Deviner le terme g\xE9n\xE9ral \xE0 partir d'une liste des premiers termes",
          subdescription: "Suite arithm\xE9tique",
          enounces: [
            "Quel semble \xEAtre le terme g\xE9n\xE9ral de la suite dont les premiers termes sont:"
          ],
          enounces2: ["$$&3 \\quad &4 \\quad &5 \\quad &6 \\quad &7$$"],
          solutions: [["&1[+_&2_]n"]],
          answerFields: ["$$u_n=\\ldots$$"],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[2;9]",
              "&3": "[_&1_]",
              "&4": "[_&1+(&2)_]",
              "&5": "[_&1+(&2)*2_]",
              "&6": "[_&1+(&2)*3_]",
              "&7": "[_&1+(&2)*4_]"
            }
          ],
          correctionFormat: [
            {
              correct: [
                `La suite de termes $$&3 \\quad &4 \\quad &5 \\quad &6 \\quad &7$$ peut \xEAtre repr\xE9sent\xE9e par la suite arithm\xE9tique de terme g\xE9n\xE9ral $$u_n=$$&answer `
              ],
              answer: "Le terme g\xE9n\xE9ral est $$u_n=&ans$$"
            }
          ],
          correctionDetails: [
            [
              {
                text: `@@ &2>=0 ?? Le premier terme de la suite est $$u_0=&3$$ et on ajoute &2 entre chaque terme, donc $$u_n=$$&solution.@@ 								@@ &2<0 ?? Le premier terme de la suite est $$u_0=&3$$ et on enl\xE8ve [_-(&2)_] entre chaque terme, donc $$u_n=$$&solution.@@`
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "Deviner le terme g\xE9n\xE9ral \xE0 partir d'une liste des premiers termes",
          subdescription: "Suite g\xE9om\xE9trique",
          enounces: [
            "Quel semble \xEAtre le terme g\xE9n\xE9ral de la suite dont les premiers termes sont:"
          ],
          enounces2: ["$$&3 \\quad &4 \\quad &5 \\quad &6 \\quad &7$$"],
          solutions: [["[_&1*(&2)^n_]"]],
          answerFields: ["$$u_n=\\ldots$$"],
          variables: [
            {
              "&1": "$er[1;4]",
              "&2": "$er[2;3]",
              "&3": "[_&1_]",
              "&4": "[_&1*(&2)_]",
              "&5": "[_&1*(&2)^2_]",
              "&6": "[_&1*(&2)^3_]",
              "&7": "[_&1*(&2)^4_]"
            }
          ],
          conditions: ["abs(&1) != abs(&2)"],
          correctionFormat: [
            {
              correct: [
                `La suite de termes $$&3 \\quad &4 \\quad &5 \\quad &6 \\quad &7$$ peut \xEAtre repr\xE9sent\xE9e par la suite g\xE9om\xE9trique de terme g\xE9n\xE9ral $$u_n=$$&answer `
              ],
              answer: "Le terme g\xE9n\xE9ral est $$u_n=&ans$$"
            }
          ],
          correctionDetails: [
            [
              {
                text: `Le premier terme de la suite est $$u_0=&3$$ et on multiplie par &2 entre chaque terme, donc $$u_n=$$&solution.`
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "Deviner le terme g\xE9n\xE9ral \xE0 partir d'une liste des premiers termes",
          subdescription: "Suite g\xE9om\xE9trique - raison fractionnaire",
          enounces: [
            "Quel semble \xEAtre le terme g\xE9n\xE9ral de la suite dont les premiers termes sont:"
          ],
          enounces2: [
            "$$[\xB0&4\xB0] \\quad [\xB0&5\xB0] \\quad [\xB0&6\xB0] \\quad [\xB0&7\xB0] \\quad [\xB0&8\xB0]$$"
          ],
          solutions: [["&1*(&3)^n"]],
          answerFields: ["$$u_n=\\ldots$$"],
          variables: [
            {
              "&1": "$er[2;9]",
              "&2": "$er[2;5]\\{cd(&1)}",
              "&3": "[_1/(&2)_]",
              "&4": "[_&1_]",
              "&5": "[_&1*(&3)_]",
              "&6": "[_&1*(&3)^2_]",
              "&7": "[_&1*(&3)^3_]",
              "&8": "[_&1*(&3)^4_]"
            }
          ],
          correctionFormat: [
            {
              correct: [
                `La suite de termes $$&4 \\quad &5 \\quad &6 \\quad &7 \\quad &8$$ peut \xEAtre repr\xE9sent\xE9e par la suite g\xE9om\xE9trique de terme g\xE9n\xE9ral $$u_n=$$&answer `
              ],
              answer: "Le terme g\xE9n\xE9ral est $$u_n=&ans$$"
            }
          ],
          correctionDetails: [
            [
              {
                text: `Le premier terme de la suite est $$u_0=&4$$ et on multiplie par $$[\xB0&3\xB0]$$ entre chaque terme, donc $$u_n=$$&solution.`
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        }
      ]
    },
    Limites: {
      "Determiner une limite": [
        {
          description: "D\xE9terminer la limite d'une suite",
          subdescription: "Suites usuelles",
          enounces: [
            "Quelle est la limite de la suite dont le terme g\xE9n\xE9ral est :"
          ],
          expressions: [
            "(-1)^n",
            "&1",
            "n",
            "n^&4",
            "sqrt(n)",
            "1/n",
            "1/n^&4",
            "[(_&2_]^n",
            "([_1/(&2)_])^n",
            "&3^n"
          ],
          choices: [
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$-1$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$&1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$1$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Cette suite n'a pas de limite"
              }
            ]
          ],
          solutions: [
            [4],
            [2],
            [0],
            [0],
            [0],
            [3],
            [3],
            ["&2>0 ?? 0 :: 4"],
            [3],
            [3]
          ],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$er[2;9]",
              "&3": "$d{0;1}",
              "&4": "$e[2;9]"
            }
          ],
          correctionFormat: [
            {
              correct: ["&answer"],
              answer: "&answer"
            },
            {
              correct: ["La limite est &answer"],
              answer: "&answer"
            },
            {
              correct: ["La limite est &answer"],
              answer: "&answer"
            },
            {
              correct: ["La limite est &answer"],
              answer: "&answer"
            },
            {
              correct: ["La limite est &answer"],
              answer: "&answer"
            },
            {
              correct: ["La limite est &answer"],
              answer: "&answer"
            },
            {
              correct: ["La limite est &answer"],
              answer: "&answer"
            },
            {
              correct: [
                "@@ &2>0 ?? La limite est &answer @@",
                "@@ &2<0 ?? &answer @@"
              ],
              answer: "&answer"
            },
            {
              correct: ["La limite est &answer"],
              answer: "&answer"
            },
            {
              correct: ["La limite est &answer"],
              answer: "&answer"
            }
          ],
          correctionDetails: [
            [
              {
                text: "La suite de terme g\xE9n\xE9ral &expression oscille entre les valeurs $$1$$ et $$-1$$ : &solution."
              }
            ],
            [
              {
                text: "La suite de terme g\xE9n\xE9ral &expression est constante donc sa limite est &solution."
              }
            ],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer la limite d'une suite",
          subdescription: "En utilisant les r\xE8gles de calcul sur les limites",
          enounces: ["Quelle est la limite obtenue ?"],
          enounces2: [
            "$$\\frac{\\infin}{\\infin}$$",
            "$$\\frac{0}{\\infin}$$",
            "$$\\frac{+\\infin}{\\O^+}$$",
            "$$\\frac{-\\infin}{\\O^+}$$",
            "$$\\frac{+\\infin}{\\O^-}$$",
            "$$\\frac{-\\infin}{\\O^-}$$",
            "$$\\frac{&1}{+\\infin}$$",
            "$$\\frac{-&1}{+\\infin}$$",
            "$$\\frac{&1}{-\\infin}$$",
            "$$\\frac{-&1}{-\\infin}$$",
            "$$\\frac{+\\infin}{&1}$$",
            "$$\\frac{+\\infin}{-&1}$$",
            "$$\\frac{-\\infin}{&1}$$",
            "$$\\frac{-\\infin}{-&1}$$",
            "$$\\infini\\times 0$$",
            "$$+\\infini \\times \\left( +\\infini  \\right)$$",
            "$$+\\infini \\times \\left( -\\infini \\right)$$",
            "$$-\\infini \\times \\left( -\\infini \\right)$$",
            "$$-\\infini \\times \\left( +\\infini \\right)$$",
            "$$&1 \\times \\left( +\\infini  \\right)$$",
            "$$&1 \\times \\left( -\\infini \\right)$$",
            "$$-&1 \\times \\left( -\\infini \\right)$$",
            "$$-&1 \\times \\left( +\\infini \\right)$$",
            "$$+\\infini + \\left( +\\infini \\right)$$",
            "$$+\\infini + \\left( -\\infini \\right)$$",
            "$$-\\infini + \\left( -\\infini \\right)$$",
            "$$-\\infini + \\left( +\\infini \\right)$$",
            "$$+\\infini - \\left( +\\infini \\right)$$",
            "$$+\\infini - \\left( -\\infini \\right)$$",
            "$$-\\infini - \\left( -\\infini \\right)$$",
            "$$-\\infini - \\left( +\\infini \\right)$$",
            "$$+\\infini[+_&1_]$$",
            "$$+\\infini[+_&1_]$$",
            "$$-\\infini[+_&1_]$$",
            "$$-\\infini[+_&1_]$$"
          ],
          choices: [
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Forme ind\xE9termin\xE9e"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Forme ind\xE9termin\xE9e"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Forme ind\xE9termin\xE9e"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Forme ind\xE9termin\xE9e"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Forme ind\xE9termin\xE9e"
              }
            ],
            [
              {
                text: "$$+\\infin$$"
              },
              {
                text: "$$-\\infin$$"
              },
              {
                text: "$$0$$"
              },
              {
                text: "Forme ind\xE9termin\xE9e"
              }
            ]
          ],
          solutions: [[3]],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$e[2;9]"
            }
          ],
          correctionFormat: [
            {
              correct: ["&answer"],
              answer: "&answer"
            }
          ],
          options: ["no-shuffle-choices"],
          defaultDelay: 30,
          grade: TERMINALE_SPE_MATHS
        }
      ]
    },
    "Suites arithm\xE9tiques": {
      "Calculer un terme": [
        {
          description: "Calculer un terme d'une suite arithm\xE9tique",
          subdescription: "Calculer le terme suivant",
          enounces: [
            "Pour une suite arithm\xE9tique de raison &1, quel est le terme suivant &2 ?"
          ],
          solutions: [["[_&1+(&2)_]"]],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$er[2;9]"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Si la raison est $$&1$$, le terme suivant &2 est &answer"
              ],
              answer: "Le terme suivant est &answer"
            }
          ],
          correctionDetails: [
            [
              {
                text: "Si la raison est $$&1$$, le terme suivant est $$&2[+_&1_]=$$&solution"
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "Calculer un terme d'une suite arithm\xE9tique",
          subdescription: "Calculer le terme pr\xE9c\xE9dent",
          enounces: [
            "Pour une suite arithm\xE9tique de raison &1, quel est le terme pr\xE9c\xE9dant &2 ?"
          ],
          solutions: [["[_&2-(&1)_]"]],
          variables: [
            {
              "&1": "$er[1;9]",
              "&2": "$er[2;9]"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Si la raison est $$&1$$, le terme pr\xE9c\xE9dant &2 est &answer"
              ],
              answer: "Le terme pr\xE9c\xE9dent est &answer"
            }
          ],
          correctionDetails: [
            [
              {
                text: "Si la raison est $$&1$$, le terme pr\xE9c\xE9dent est $$&2[+_-(&1)_]=$$&solution"
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "Calculer un terme d'une suite arithm\xE9tique",
          subdescription: "Calculer un terme \xE0 partir d'un autre",
          enounces: [
            "Pour une suite $$(u_n)$$ arithm\xE9tique de raison $$&3$$, que vaut $$u_&2$$ si $$u_&1=[_&1*(&3)_]$$ ?"
          ],
          solutions: [["[_&2*(&3)_]"]],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[&1+1;9]",
              "&3": "$er[2;9]\\{&1}"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Si la raison est $$&3$$ et $$u_&1=[_&1*(&3)_]$$, alors $$u_&2=$$&answer"
              ],
              answer: "$$u_&2=$$&answer"
            }
          ],
          correctionDetails: [
            [
              {
                text: `Si la raison est $$\\textcolor{${color1}}{&3}$$ et $$u_&1=[_&1*(&3)_]$$, alors $$u_&2=u_&1\\textcolor{${color1}}{[+_&3_]} \\times [_&2-&1_]=u_&1[+_(&2-&1)*(&3)_]=$$&solution`
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "Calculer un terme d'une suite arithm\xE9tique",
          subdescription: "Calculer un terme \xE0 partir d'un autre",
          enounces: [
            "Pour une suite $$(u_n)$$ arithm\xE9tique de raison $$&3$$, que vaut $$u_&2$$ si $$u_&1=[_&1*(&3)_]$$ ?"
          ],
          solutions: [["[_&2*(&3)_]"]],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "$e[&1+1;9]",
              "&3": "$er[2;9]\\{&1}"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Si la raison est $$&3$$ et $$u_&1=[_&1*(&3)_]$$, alors $$u_&2=$$&answer"
              ],
              answer: "$$u_&2=$$&answer"
            }
          ],
          correctionDetails: [
            [
              {
                text: `Si la raison est $$\\textcolor{${color1}}{&3}$$ et $$u_&1=[_&1*(&3)_]$$, alors $$u_&2=u_&1\\textcolor{${color1}}{[+_&3_]} \\times [_&2-&1_]=u_&1[+_(&2-&1)*(&3)_]=$$&solution`
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        }
      ],
      "Determiner la raison": [
        {
          description: "D\xE9terminer la raison d'une suite arithm\xE9tique",
          subdescription: "A partir de deux termes cons\xE9cutifs",
          enounces: [
            "Quelle est la raison d'une suite arithm\xE9tique o\xF9 $$u_&1=&3$$ et $$u_&2=[_&3+(&4)_]$$ ?"
          ],
          solutions: [["&4"]],
          variables: [
            {
              "&1": "$e[1;8]",
              "&2": "[_&1+1_]",
              "&3": "$er[2;9]",
              "&4": "$er[2;9]"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Si $$u_&1=&3$$ et $$u_&2=[_&3+(&4)_]$$, alors la raison est &answer."
              ],
              answer: "La raison est &answer."
            }
          ],
          correctionDetails: [
            [
              {
                text: "Si $$u_&1=&3$$ et $$u_&2=[_&3+(&4)_]$$, alors la raison est $$[_&3+(&4)_]-[(_&3_]$$=&solution."
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        },
        {
          description: "D\xE9terminer la raison d'une suite arithm\xE9tique",
          subdescription: "A partir de deux termes",
          enounces: [
            "Quelle est la raison d'une suite arithm\xE9tique o\xF9 $$u_&1=&3$$ et $$u_&2=[_&3+(&2-&1)*(&4)_]$$ ?"
          ],
          solutions: [["&4"]],
          variables: [
            {
              "&1": "$e[1;5]",
              "&2": "$e[&1+2;9]",
              "&3": "$er[2;9]",
              "&4": "$er[2;9]"
            }
          ],
          correctionFormat: [
            {
              correct: [
                "Si $$u_&1=&3$$ et $$u_&2=[_&3+(&2-&1)*(&4)_]$$, alors la raison est &answer."
              ],
              answer: "La raison est &answer."
            }
          ],
          correctionDetails: [
            [
              {
                text: "Si $$u_&1=&3$$ et $$u_&2=[_&3+(&2-&1)*(&4)_]$$, alors la raison est $$\\frac{[_&3+(&2-&1)*(&4)_]-[(_&3_]}{[_&2-&1_]}$$=&solution."
              }
            ]
          ],
          defaultDelay: 30,
          grade: PREMIERE_SPE_MATHS
        }
      ]
    }
  }
};
const questionsWithID = {};
const ids = {};
const themes = Object.getOwnPropertyNames(questions);
themes.forEach((theme, t_id) => {
  questionsWithID[theme] = {};
  let domains = Object.getOwnPropertyNames(questions[theme]);
  domains.forEach((domain, d_id) => {
    questionsWithID[theme][domain] = {};
    let subdomains = Object.getOwnPropertyNames(questions[theme][domain]);
    subdomains.forEach((subdomain, s_id) => {
      questionsWithID[theme][domain][subdomain] = [];
      let qs = questions[theme][domain][subdomain];
      qs.forEach((q, q_id) => {
        const id = code[t_id] + code[d_id] + code[s_id] + code[q_id + 1];
        const newq = { ...q, id };
        questionsWithID[theme][domain][subdomain].push(newq);
        ids[id] = { theme, domain, subdomain, level: q_id + 1 };
      });
    });
  });
});
function getQuestion(theme, domain, subdomain, level) {
  return {
    ...questionsWithID[theme][domain][subdomain].find(
      (q) => questionsWithID[theme][domain][subdomain].indexOf(q) + 1 === parseInt(level, 10)
    )
  };
}
const datas = { questions: questionsWithID, ids };
const emptyQuestion = {
  name: "Nouvelle question",
  delay: 0,
  defaultDelay: 0,
  description: "",
  enounce: "",
  expressions: [],
  variables: {},
  answer: "",
  grade: "6\xE8me",
  level: 1
};
let { warn, trace } = getLogger("generateQuestion", "info");
function generateQuestion(question, generateds = [], nbquestions = 1, offset = 0) {
  let expression;
  let expression2;
  let solutions;
  let variables = {};
  let correctionDetails;
  let correctionFormat;
  let choices;
  let i;
  let enounce;
  let enounce2;
  let letters;
  let testAnswer;
  let image;
  let imageCorrection;
  let unit;
  let tests;
  let answerFields;
  let type;
  type = type || question.choices ? "choice" : "result";
  const { options = [] } = question;
  const generatedExpressions = generateds ? generateds.map((g) => g.expression) : [];
  const generatedEnounces = generateds ? generateds.map((g) => g.enounce) : [];
  const generatedEnounces2 = generateds ? generateds.map((g) => g.enounce2) : [];
  const generatedImages = generateds ? generateds.map((g) => g.image) : [];
  const regexEval = /\[([.+(]*)_([^_]*?)(_([^_]*))??_\]/g;
  const regexLatex = /\[°(.*?)°\]/g;
  const replace = (matched, p1, p2, p3, p4) => {
    const modifiers = p1;
    let e = math(p2);
    const unit2 = p4;
    const params = {};
    if (e.string === "Error") {
      throw new Error("Error while replacing", matched, p1, p2, p3, p4);
    }
    if (unit2) {
      params.unit = unit2.trim();
    }
    if (modifiers.includes(".")) {
      params.decimal = true;
    }
    e = e.eval(params);
    if (modifiers.includes("+") && !e.isOpposite()) {
      e = e.positive();
    }
    if (modifiers.includes("(") && (e.isOpposite() || e.isPositive())) {
      e = e.bracket();
    }
    return e;
  };
  const replaceEval = (matched, p1, p2, p3, p4) => {
    const e = replace(matched, p1, p2, p3, p4);
    return e.toString({ implicit: true });
  };
  const replaceEvalLatex = (matched, p1, p2, p3, p4) => {
    const e = replace(matched, p1, p2, p3, p4);
    return e.toLatex({ implicit: true });
  };
  const replaceLatex = (matched, p1) => {
    const e = math(p1);
    if (e.string === "Error") {
      throw new Error("Error while replacing", matched, p1);
    }
    return e.toLatex();
  };
  function generateVariables() {
    const variables2 = question.variables ? { ...getSelectedElement("variables") } : {};
    Object.getOwnPropertyNames(variables2).sort(lexicoSort).forEach((name, i2) => {
      let generated2 = variables2[name];
      for (let j = 1; j < i2 + 1; j++) {
        const precedentName = `&${j}`;
        const regex = new RegExp(precedentName, "g");
        generated2 = generated2.replace(regex, variables2[precedentName]);
      }
      generated2 = generated2.replace(regexEval, replaceEval);
      generated2 = math(generated2).generate().string;
      variables2[name] = generated2;
    });
    return variables2;
  }
  function replacement(_, p1, p2) {
    const tests2 = p1.split("&&");
    let text;
    if (tests2.every((t) => math(t).eval().string === "true")) {
      text = p2;
    } else {
      text = "";
    }
    return text;
  }
  function replaceVariables(o) {
    function replace2(s) {
      let result = s;
      Object.getOwnPropertyNames(variables).forEach((name) => {
        const regex = new RegExp(name, "g");
        result = result.replace(regex, variables[name]);
      });
      return result;
    }
    return typeof o === "string" ? replace2(o) : Array.isArray(o) ? o.map(
      (s) => s.text ? { ...s, text: replace2(s.text) } : typeof s === "string" ? replace2(s) : s
    ) : o;
  }
  function getSelectedElement(field) {
    if (!question[field])
      return null;
    const length = question[field].length;
    return question[field][length === 1 ? 0 : i];
  }
  function toLatex(o) {
    return typeof o === "string" ? o.replace(regexLatex, replaceLatex) : Array.isArray(o) ? o.map(
      (s) => s.text ? { ...s, text: s.text.replace(regexLatex, replaceLatex) } : typeof s === "string" ? s.replace(regexLatex, replaceLatex) : s
    ) : o;
  }
  function evaluateToLatex(o) {
    return typeof o === "string" ? o.replace(regexEval, replaceEvalLatex) : Array.isArray(o) ? o.map(
      (s) => s.text ? { ...s, text: s.text.replace(regexEval, replaceEvalLatex) } : typeof s === "string" ? s.replace(regexEval, replaceEvalLatex) : s
    ) : o;
  }
  function evaluate(o) {
    return typeof o === "string" ? o.replace(regexEval, replaceEval) : Array.isArray(o) ? o.map(
      (s) => typeof s === "string" ? s.replace(regexEval, replaceEval) : s
    ) : o;
  }
  function checkDuplicate() {
    let repeat2;
    if (expression && enounce && enounce2 && choices) {
      repeat2 = generateds.some(
        (g) => g.enounce === enounce && g.enounce2 === enounce2 && JSON.stringify(g.choices) === JSON.stringify(choices) && g.expression === expression
      );
      if (repeat2)
        warn(
          "m\xEAme \xE9nonc\xE9 ET m\xEAme \xE9nonc\xE92 ET choix ET image",
          enounce,
          enounce2,
          JSON.stringify(choices),
          expression
        );
    } else if (image && enounce && enounce2 && choices) {
      repeat2 = generateds.some(
        (g) => g.enounce === enounce && g.enounce2 === enounce2 && JSON.stringify(g.choices) === JSON.stringify(choices) && g.image === image
      );
      if (repeat2)
        warn(
          "m\xEAme \xE9nonc\xE9 ET m\xEAme enonc\xE92 ET choix ET image",
          enounce,
          enounce2,
          JSON.stringify(choices),
          image
        );
    } else if (expression && enounce && enounce2) {
      repeat2 = generateds.some(
        (g) => g.expression === expression && g.enounce === enounce && g.enounce2 === enounce2
      );
      if (repeat2)
        warn(
          "m\xEAme \xE9nonc\xE9 ET m\xEAme \xE9nonc\xE92 ET expression: ",
          enounce,
          enounce2,
          expression
        );
    } else if (enounce && enounce2 && choices) {
      repeat2 = generateds.some(
        (g) => g.enounce === enounce && g.enounce2 === enounce2 && JSON.stringify(g.choices) === JSON.stringify(choices)
      );
      if (repeat2)
        warn(
          "m\xEAme \xE9nonc\xE9 ET m\xEAme enonc\xE92 ET choix ",
          enounce,
          enounce2,
          JSON.stringify(choices)
        );
    } else if (enounce && enounce2 && image) {
      repeat2 = generateds.some(
        (g) => g.enounce === enounce && g.enounce2 === enounce2 && g.image === image
      );
      if (repeat2)
        warn("m\xEAme \xE9nonc\xE9 ET m\xEAme \xE9nonc\xE92 ET image", enounce, enounce, image);
    } else if (expression && enounce && choices) {
      repeat2 = generateds.some(
        (g) => g.enounce === enounce && JSON.stringify(g.choices) === JSON.stringify(choices) && g.expression === expression
      );
      if (repeat2)
        warn(
          "m\xEAme \xE9nonc\xE9 ET choix ET image",
          enounce,
          JSON.stringify(choices),
          expression
        );
    } else if (image && enounce && choices) {
      repeat2 = generateds.some(
        (g) => g.enounce === enounce && JSON.stringify(g.choices) === JSON.stringify(choices) && g.image === image
      );
      if (repeat2)
        warn(
          "m\xEAme \xE9nonc\xE9 ET choix ET image",
          enounce,
          JSON.stringify(choices),
          image
        );
    } else if (expression && enounce) {
      repeat2 = generateds.some(
        (g) => g.expression === expression && g.enounce === enounce
      );
      if (repeat2)
        warn("m\xEAme \xE9nonc\xE9 ET expression: ", enounce, expression);
    } else if (enounce && choices) {
      repeat2 = generateds.some(
        (g) => g.enounce === enounce && JSON.stringify(g.choices) === JSON.stringify(choices)
      );
      if (repeat2)
        warn("m\xEAme \xE9nonc\xE9 ET choix ", enounce, JSON.stringify(choices));
    } else if (enounce && image) {
      repeat2 = generateds.some(
        (g) => g.enounce === enounce && g.image === image
      );
      if (repeat2)
        warn("m\xEAme \xE9nonc\xE9 ET image", enounce, image);
    } else if (expression && !options.includes("allow-same-expression")) {
      repeat2 = generatedExpressions.includes(expression);
      if (repeat2)
        warn("m\xEAme image expression", expression);
    } else if (enounce && enounce2 && !options.includes("allow-same-enounce")) {
      repeat2 = generatedEnounces.includes(enounce) && generatedEnounces2.includes(enounce2);
      if (repeat2)
        warn("m\xEAme \xE9nonc\xE9 ET m\xEAme \xE9nonc\xE92", enounce, enounce2);
    } else if (enounce && !options.includes("allow-same-enounce")) {
      repeat2 = generatedEnounces.includes(enounce);
      if (repeat2)
        warn("m\xEAme \xE9nonc\xE9", enounce);
    } else if (image) {
      const test = generatedImages.includes(image);
      if (test)
        warn("m\xEAme image pour la question", image);
      repeat2 = repeat2 || test;
    }
    return repeat2;
  }
  if (!question)
    return emptyQuestion;
  question.num = question.num ? question.num + 1 : offset + 1;
  let count = 0;
  let repeat = false;
  let availables = [];
  const n = Math.max(
    question.choices && question.choices.length || 0,
    question.expressions && question.expressions.length || 0,
    question.expressions2 && question.expressions2.length || 0,
    question.enounces && question.enounces.length || 0,
    question.enounces2 && question.enounces2.length || 0,
    question.variables && question.variables.length || 0,
    question.images && question.images.length || 0
  );
  if (!question.limits && nbquestions !== 1) {
    question.limits = { limits: [] };
    let nbuniques = 0;
    for (let i2 = 0; i2 < n; i2++) {
      question.limits.limits[i2] = {};
      question.limits.limits[i2].count = 0;
      if (question.options && question.options.includes("exhaust")) {
        nbuniques += 1;
        question.limits.limits[i2].limit = 1;
      }
    }
    question.limits.nbuniques = nbuniques;
    const nbrandoms = n - nbuniques;
    question.limits.nbrandoms = nbrandoms;
  }
  if (question.limits) {
    question.limits.nbmax = 0;
    question.limits.reached = 0;
    for (let i2 = 0; i2 < n; i2++) {
      if (question.limits.limits[i2].limit && question.limits.limits[i2].limit !== 1 && question.limits.limits[i2].limit === question.limits.limits[i2].count) {
        question.limits.nbmax += 1;
        question.limits.reached += question.limits.limits[i2].limit;
      }
    }
    for (let i2 = 0; i2 < n; i2++) {
      let limit = question.limits.limits[i2].limit;
      if (!limit) {
        limit = Math.ceil(1 / question.limits.nbrandoms * nbquestions);
      } else if (limit !== 1 && limit !== question.limits.limits[i2].count) {
        limit = Math.ceil(
          1 / (question.limits.nbrandoms - question.limits.nbmax) * (nbquestions - question.limits.nbuniques - question.limits.reached)
        );
      }
      question.limits.limits[i2].limit = limit;
      if (question.limits.limits[i2].count !== limit) {
        availables.push(i2);
      }
    }
  }
  do {
    count++;
    repeat = false;
    if (question.limits) {
      i = availables[Math.floor(availables.length * Math.random())];
    } else {
      i = Math.floor(n * Math.random());
    }
    variables = generateVariables();
    image = getSelectedElement("images");
    expression = getSelectedElement("expressions");
    expression2 = getSelectedElement("expressions2");
    enounce = getSelectedElement("enounces");
    enounce2 = getSelectedElement("enounces2");
    choices = getSelectedElement("choices");
    tests = getSelectedElement("conditions");
    expression = replaceVariables(expression);
    expression2 = replaceVariables(expression2);
    enounce = replaceVariables(enounce);
    enounce2 = replaceVariables(enounce2);
    choices = replaceVariables(choices);
    tests = replaceVariables(tests);
    expression = evaluate(expression);
    expression2 = evaluate(expression2);
    enounce = evaluateToLatex(enounce);
    enounce = toLatex(enounce);
    enounce2 = evaluateToLatex(enounce2);
    enounce2 = toLatex(enounce2);
    choices = evaluateToLatex(choices);
    choices = toLatex(choices);
    tests = evaluate(tests);
    if (expression) {
      if (options.includes("remove-null-terms")) {
        expression = math(expression).removeNullTerms().string;
      }
      if (options.includes("shuffle-terms-and-factors")) {
        expression = math(expression).shuffleTermsAndFactors().string;
      } else if (options.includes("shuffle-terms")) {
        expression = math(expression).shuffleTerms().string;
      } else if (options.includes("shuffle-factors")) {
        expression = math(expression).shuffleFactors().string;
      } else if (options.includes("shallow-shuffle-terms")) {
        expression = math(expression).shallowShuffleTerms().string;
      } else if (options.includes("shallow-shuffle-factors")) {
        expression = math(expression).shallowShuffleFactors().string;
      }
      if (options.includes("exp-remove-unecessary-brackets")) {
        expression = math(expression).removeUnecessaryBrackets().string;
      }
    }
    repeat = checkDuplicate();
    if (!repeat && tests) {
      if (tests.includes("||")) {
        tests = tests.split("||");
        repeat = !tests.some((test) => math(test).eval().string === "true");
      } else {
        tests = tests.split("&&");
        repeat = !tests.every((test) => math(test).eval().string === "true");
      }
      if (repeat)
        trace("tests non pass\xE9", tests);
    }
  } while (repeat && count < 100);
  if (count >= 100) {
    warn("can't generate a different question from others");
  }
  if (question.limits) {
    question.limits.limits[i].count += 1;
  }
  solutions = getSelectedElement("solutions");
  testAnswer = getSelectedElement("testAnswers");
  console.log("testAnswer generated", testAnswer);
  letters = getSelectedElement("letters");
  imageCorrection = getSelectedElement("imagesCorrection");
  correctionDetails = getSelectedElement("correctionDetails");
  correctionFormat = getSelectedElement("correctionFormat");
  unit = getSelectedElement("units");
  answerFields = getSelectedElement("answerFields");
  let correct, uncorrect, answer;
  if (correctionFormat) {
    correct = correctionFormat.correct;
    uncorrect = correctionFormat.uncorrect;
    answer = correctionFormat.answer;
  }
  solutions = replaceVariables(solutions);
  testAnswer = replaceVariables(testAnswer);
  console.log("testAnswer generated", testAnswer);
  correctionDetails = replaceVariables(correctionDetails);
  correct = replaceVariables(correct);
  uncorrect = replaceVariables(uncorrect);
  answer = replaceVariables(answer);
  answerFields = replaceVariables(answerFields);
  solutions = evaluate(solutions);
  testAnswer = evaluate(testAnswer);
  console.log("testAnswer generated", testAnswer);
  correctionDetails = toLatex(correctionDetails);
  correctionDetails = evaluateToLatex(correctionDetails);
  correct = toLatex(correct);
  correct = evaluateToLatex(correct);
  uncorrect = toLatex(uncorrect);
  uncorrect = evaluateToLatex(uncorrect);
  answer = toLatex(answer);
  answer = evaluateToLatex(answer);
  answerFields = toLatex(answerFields);
  answerFields = evaluateToLatex(answerFields);
  if (correctionFormat) {
    const regex = /@@(.*?)\?\?(.*?)@@/g;
    correctionFormat = {
      correct: correct.map((c) => c.replace(regex, replacement)),
      uncorrect: uncorrect ? uncorrect.map((u) => u.replace(regex, replacement)) : correct.map(
        (c) => c.replace(regex, replacement).replace(/&answer/g, "&solution").replace(/&ans/g, "&sol")
      ),
      answer: answer || correct.map((c) => c.replace(regex, replacement)).filter((m) => !!m)[0]
    };
  }
  if (solutions) {
    solutions = solutions.map((solution) => {
      if (typeof solution === "string") {
        const regex = /(.*)\?\?(.*)::(.*)/;
        const found = solution.match(regex);
        if (found) {
          const test = math(found[1]).eval();
          let success = math(replaceVariables(found[2]));
          let failure = math(replaceVariables(found[3]));
          if (type === "choices" || type === "choice") {
            success = success.value.toNumber();
            failure = failure.value.toNumber();
          } else {
            success = success.string;
            failure = failure.string;
          }
          return test.isTrue() ? success : failure;
        }
      }
      return solution;
    });
  } else if (expression) {
    let params = { decimal: question["result-type"] === "decimal" };
    if (letters) {
      Object.getOwnPropertyNames(letters).forEach((letter) => {
        if (letter.startsWith("&")) {
          const value = letters[letter];
          letters[variables[letter]] = value.startsWith("&") ? variables[value] : value;
        } else if (letters[letter].startsWith("&")) {
          letters[letter] = variables[letters[letter]];
        }
      });
      params = { ...params, ...letters };
    }
    if (unit) {
      params.unit = unit;
    }
    solutions = [
      math(expression).eval(params).removeMultOperator().removeFactorsOne().string
    ];
  }
  if (choices) {
    if (!options.includes("no-shuffle-choices")) {
      const a = [];
      for (let i2 = 0; i2 < choices.length; i2++) {
        a[i2] = i2;
      }
      shuffle(a);
      choices = choices.map((_, i2) => choices[a[i2]]);
      if (solutions) {
        solutions = solutions.map(
          (solution) => typeof solution === "number" ? a.indexOf(solution) : solution
        );
        if (type === "choices") {
          solutions.sort();
        }
      }
    }
  }
  if (correctionDetails) {
    correctionDetails = correctionDetails.reduce((acc, d) => {
      const regex = /@@(.*?)\?\?(.*?)@@/g;
      if (d.text) {
        acc.push({ text: d.text.replace(regex, replacement) });
      } else {
        acc.push(d);
      }
      return acc;
    }, []);
  }
  let expression_latex;
  if (expression) {
    expression_latex = math(expression).toLatex({
      addSpaces: !(question.options && question.options.includes("exp-no-spaces")),
      keepUnecessaryZeros: question.options && question.options.includes("exp-allow-unecessary-zeros")
    });
  }
  let expression2_latex;
  if (expression2) {
    expression2_latex = math(expression2).toLatex({
      addSpaces: !(question.options && question.options.includes("exp-no-spaces")),
      keepUnecessaryZeros: question.options && question.options.includes("exp-allow-unecessary-zeros")
    });
  }
  const generated = {
    points: 1,
    type,
    ...question,
    order_elements: question.order_elements || [
      "enounce",
      "enounce2",
      "enounce-image",
      "expression",
      "choices"
    ]
  };
  if (choices)
    generated.choices = choices;
  if (solutions)
    generated.solutions = solutions;
  if (unit)
    generated.unit = unit;
  if (expression)
    generated.expression = expression;
  if (expression_latex)
    generated.expression_latex = expression_latex;
  if (expression2_latex)
    generated.expression2_latex = expression2_latex;
  if (enounce)
    generated.enounce = enounce;
  if (enounce2)
    generated.enounce2 = enounce2;
  if (correctionFormat)
    generated.correctionFormat = correctionFormat;
  if (correctionDetails)
    generated.correctionDetails = correctionDetails;
  if (expression2)
    generated.expression2 = expression2;
  if (testAnswer)
    generated.testAnswer = testAnswer;
  if (answerFields)
    generated.answerFields = answerFields;
  if (image) {
    generated.image = image;
  }
  if (imageCorrection) {
    generated.imageCorrection = imageCorrection;
  }
  return generated;
}
const virtualKeyboard = {
  customVirtualKeyboardLayers: {
    college: {
      styles: "",
      rows: [
        [
          {
            class: "keycap tex",
            label: "<i>a</i>"
          },
          {
            class: "keycap tex",
            label: "<i>x</i>"
          },
          {
            class: "separator w5"
          },
          {
            class: "keycap",
            latex: "7"
          },
          {
            class: "keycap",
            latex: "8"
          },
          {
            class: "keycap",
            latex: "9"
          },
          {
            class: "keycap",
            latex: "\\div "
          },
          {
            class: "separator w5"
          },
          {
            class: "keycap tex",
            insert: "$$#@^{2}$$",
            latex: "$${#0}^{2}$$"
          },
          {
            class: "keycap tex",
            insert: "$$#@^{#0}$$",
            latex: "x^\\placeholder"
          },
          {
            class: "keycap tex small",
            insert: "$$\\sqrt{#0}$$",
            latex: "\\sqrt{#0}"
          }
        ],
        [
          {
            class: "keycap tex",
            label: "<i>b</i>"
          },
          {
            class: "keycap tex",
            label: "<i>y</i>"
          },
          {
            class: "separator w5"
          },
          {
            class: "keycap",
            latex: "4"
          },
          {
            class: "keycap",
            latex: "5"
          },
          {
            class: "keycap",
            latex: "6"
          },
          {
            class: "keycap",
            latex: "\\times "
          },
          {
            class: "separator w5"
          },
          {
            class: "keycap",
            latex: "\\frac{#0}{#0}"
          },
          {
            class: "separator w6"
          },
          {
            class: "separator w6"
          }
        ],
        [
          {
            class: "keycap tex",
            label: "<i>c</i>"
          },
          {
            class: "keycap tex",
            label: "<i>z</i>"
          },
          {
            class: "separator w5"
          },
          {
            class: "keycap",
            latex: "1"
          },
          {
            class: "keycap",
            latex: "2"
          },
          {
            class: "keycap",
            latex: "3"
          },
          {
            class: "keycap",
            latex: "-"
          },
          {
            class: "separator w5"
          },
          {
            class: "latex",
            label: "<b>\u2423</b>",
            insert: "\\,"
          },
          {
            command: ["performWithFeedback", "deleteBackward"],
            class: "action svg-glyph",
            label: "<svg><use xlink:href='#svg-delete-backward' /></svg>"
          },
          {
            class: "separator w6"
          }
        ],
        [
          {
            class: "keycap tex",
            label: "("
          },
          {
            class: "keycap tex",
            label: ")"
          },
          {
            class: "separator w5"
          },
          {
            class: "keycap",
            latex: "0"
          },
          {
            class: "keycap",
            latex: ","
          },
          {
            class: "keycap tex",
            latex: "\\pi"
          },
          {
            class: "keycap",
            latex: "+"
          },
          {
            class: "separator w5"
          },
          {
            class: "action svg-glyph",
            command: ["performWithFeedback", "moveToPreviousChar"],
            label: "<svg><use xlink:href='#svg-arrow-left' /></svg>"
          },
          {
            class: "action svg-glyph",
            command: ["performWithFeedback", "moveToNextChar"],
            label: "<svg><use xlink:href='#svg-arrow-right' /></svg>"
          },
          {
            class: "action svg-glyph",
            label: "<svg><use xlink:href='#svg-commit' /></svg>",
            command: ["performWithFeedback", "commit"]
          }
        ]
      ]
    }
  },
  customVirtualKeyboards: {
    college: {
      label: "college",
      tooltip: "college keyboard",
      layer: "college"
    }
  },
  virtualKeyboards: "college"
};
const { Object: Object_1 } = globals;
const Button = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let actionProp;
  let defaultProp;
  let secondaryProp;
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "style",
    "ripple",
    "color",
    "variant",
    "touch",
    "href",
    "action",
    "defaultAction",
    "secondary",
    "component",
    "tag",
    "getElement"
  ]);
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { ripple = true } = $$props;
  let { color = "primary" } = $$props;
  let { variant = "text" } = $$props;
  let { touch = false } = $$props;
  let { href = void 0 } = $$props;
  let { action = "close" } = $$props;
  let { defaultAction = false } = $$props;
  let { secondary = false } = $$props;
  let element;
  let internalClasses = {};
  let internalStyles = {};
  let context = getContext("SMUI:button:context");
  let { component = SmuiElement } = $$props;
  let { tag = component === SmuiElement ? href == null ? "button" : "a" : void 0 } = $$props;
  let previousDisabled = $$restProps.disabled;
  setContext("SMUI:label:context", "button");
  setContext("SMUI:icon:context", "button");
  function addClass(className2) {
    if (!internalClasses[className2]) {
      internalClasses[className2] = true;
    }
  }
  function removeClass(className2) {
    if (!(className2 in internalClasses) || internalClasses[className2]) {
      internalClasses[className2] = false;
    }
  }
  function addStyle(name, value) {
    if (internalStyles[name] != value) {
      if (value === "" || value == null) {
        delete internalStyles[name];
        internalStyles = internalStyles;
      } else {
        internalStyles[name] = value;
      }
    }
  }
  function getElement() {
    return element.getElement();
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.ripple === void 0 && $$bindings.ripple && ripple !== void 0)
    $$bindings.ripple(ripple);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.touch === void 0 && $$bindings.touch && touch !== void 0)
    $$bindings.touch(touch);
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.action === void 0 && $$bindings.action && action !== void 0)
    $$bindings.action(action);
  if ($$props.defaultAction === void 0 && $$bindings.defaultAction && defaultAction !== void 0)
    $$bindings.defaultAction(defaultAction);
  if ($$props.secondary === void 0 && $$bindings.secondary && secondary !== void 0)
    $$bindings.secondary(secondary);
  if ($$props.component === void 0 && $$bindings.component && component !== void 0)
    $$bindings.component(component);
  if ($$props.tag === void 0 && $$bindings.tag && tag !== void 0)
    $$bindings.tag(tag);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    actionProp = context === "dialog:action" && action != null ? { "data-mdc-dialog-action": action } : { action: $$props.action };
    defaultProp = context === "dialog:action" && defaultAction ? { "data-mdc-dialog-button-default": "" } : { default: $$props.default };
    secondaryProp = context === "banner" ? {} : { secondary: $$props.secondary };
    {
      if (previousDisabled !== $$restProps.disabled) {
        const el = getElement();
        if ("blur" in el) {
          el.blur();
        }
        previousDisabled = $$restProps.disabled;
      }
    }
    $$rendered = `${validate_component(component || missing_component, "svelte:component").$$render(
      $$result,
      Object_1.assign(
        { tag },
        {
          use: [
            [
              Ripple,
              {
                ripple,
                unbounded: false,
                color,
                disabled: !!$$restProps.disabled,
                addClass,
                removeClass,
                addStyle
              }
            ],
            forwardEvents,
            ...use
          ]
        },
        {
          class: classMap({
            [className]: true,
            "mdc-button": true,
            "mdc-button--raised": variant === "raised",
            "mdc-button--unelevated": variant === "unelevated",
            "mdc-button--outlined": variant === "outlined",
            "smui-button--color-secondary": color === "secondary",
            "mdc-button--touch": touch,
            "mdc-card__action": context === "card:action",
            "mdc-card__action--button": context === "card:action",
            "mdc-dialog__button": context === "dialog:action",
            "mdc-top-app-bar__navigation-icon": context === "top-app-bar:navigation",
            "mdc-top-app-bar__action-item": context === "top-app-bar:action",
            "mdc-snackbar__action": context === "snackbar:actions",
            "mdc-banner__secondary-action": context === "banner" && secondary,
            "mdc-banner__primary-action": context === "banner" && !secondary,
            "mdc-tooltip__action": context === "tooltip:rich-actions",
            ...internalClasses
          })
        },
        {
          style: Object.entries(internalStyles).map(([name, value]) => `${name}: ${value};`).concat([style]).join(" ")
        },
        actionProp,
        defaultProp,
        secondaryProp,
        { href },
        $$restProps,
        { this: element }
      ),
      {
        this: ($$value) => {
          element = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `<div class="${"mdc-button__ripple"}"></div>
  ${slots.default ? slots.default({}) : ``}${touch ? `<div class="${"mdc-button__touch"}"></div>` : ``}`;
        }
      }
    )}`;
  } while (!$$settled);
  return $$rendered;
});
const STATUS_EMPTY = "empty";
const STATUS_CORRECT = "correct";
const STATUS_INCORRECT = "incorrect";
const STATUS_UNOPTIMAL_FORM = "unoptimal form";
const STATUS_BAD_FORM = "bad form";
const STATUS_BAD_UNIT = "bad unit";
getLogger("correction", "info");
const EMPTY_ANSWER = "Tu n'as rien r\xE9pondu.";
const EMPTY_MULTIPLE_ANSWERS = "Tu n'as pas tout compl\xE9t\xE9.";
const ZEROS = "<span style='color:_COLORANSWER_'>Ta r\xE9ponse</span> contient un ou des z\xE9ros inutiles.";
const ZEROS_MULTIPLE_ANSWERS = "Il y a un ou des z\xE9ros inutiles dans tes r\xE9ponses :";
const FACTORE_ONE = "Dans <span style='color:_COLORANSWER_'>ta r\xE9ponse</span>, tu peux simplifier le ou les facteurs 1.";
const FACTORE_ONE_MULTIPLE_ANSWERS = "Il y a un ou des facteurs 1 inutiles dans tes r\xE9ponses :";
const FACTORE_ZERO = "Tu peux simplifier <span style='color:_COLORANSWER_'>ta r\xE9ponse</span> qui contient un ou des facteurs nuls.";
const FACTORE_ZERO_MULTIPLE_ANSWERS = "Dans tes r\xE9ponses, tu peux simplifier un ou des facteurs nuls.";
const NULL_TERMS = "<span style='color:_COLORANSWER_'>Ta r\xE9ponse</span> contient un terme nul que tu peux enlever.";
const NULL_TERMS_MULTIPLE_ANSWERS = "Il y a un ou des termes nuls que tu peux enlever dans tes r\xE9ponses.";
const BRACKETS = "<span style='color:_COLORANSWER_'>Ta r\xE9ponse</span> contient des parenth\xE8ses inutiles.";
const BRACKETS_MULTIPLE_ANSWERS = "il y a des parenth\xE8ses inutiles dans tes r\xE9ponses.";
const SPACES = "Les chiffres sont mal espac\xE9s dans <span style='color:_COLORANSWER_'>ta r\xE9ponse</span>.";
const SPACES_MULTIPLE_ANSWERS = "Les chiffres sont mal espac\xE9s dans tes r\xE9ponses";
const SIGNS = "Tu peux faire des simplifications de signes dans <span style='color:_COLORANSWER_'>ta r\xE9ponse</span>.";
const SIGNS_MULTIPLE_ANSWERS = "Tu peux faire des simplifications de signes dans tes r\xE9ponses.";
const MATH_INCORRECT = "<span style='color:_COLORANSWER_'>Ta r\xE9ponse</span> n'est pas \xE9crite correctement.";
const MATH_INCORRECT_MULTIPLE_ANSWERS = "Une ou plusieurs de tes r\xE9ponses ne sont pas \xE9crites correctement:";
const MATH_GLOBALLY_INCORRECT = "L'expression obtenue n'est pas math\xE9matiquement correcte.";
const PRODUCTS = "Tu peux simplifier certains symboles de multiplication dans <span style='color:_COLORANSWER_'>ta r\xE9ponse</span>.";
const PRODUCTS_MULTIPLE_ANSWERS = "Tu peux simplifier certains symboles de multiplication dans tes r\xE9ponses>.";
const FRACTIONS = "<span style='color:_COLORANSWER_'>Ta r\xE9ponse</span> contient une ou des fractions non simplifi\xE9es.";
const FRACTIONS_MULTIPLE_ANSWERS = "Il y a une ou des fractions non simplifi\xE9es dans tes r\xE9ponses.";
const BAD_FORM = "<span style='color:_COLORANSWER_'>Ta r\xE9ponse</span> n'est pas \xE9crite sous la forme demand\xE9e.";
const BAD_FORM_MULTIPLE_ANSWERS = "La forme demand\xE9e n'est pas respect\xE9e dans tes r\xE9ponses.";
const BAD_UNIT = "<span style='color:_COLORANSWER_'>Ta r\xE9ponse</span> n'est pas \xE9crite avec l'unit\xE9 demand\xE9e.";
const BAD_UNIT_MULTIPLE_ANSWERS = "Tes r\xE9ponses n'utilisent pas l'unit\xE9 demand\xE9e.";
const TERMS_PERMUTATION = "Dans <span style='color:_COLORANSWER_'>ta r\xE9ponse</span> les termes doivent \xEAtre \xE9crits dans un certain ordre.";
const TERMS_PERMUTATION_MULTIPLE_ANSWERS = "Les termes doivent \xEAtre \xE9crits dans un certain ordre dans tes r\xE9ponses.";
const FACTORS_PERMUTATION = "Dans <span style='color:_COLORANSWER_'>ta r\xE9ponse</span> les facteurs doivent \xEAtre \xE9crits dans un certain ordre.";
const FACTORS_PERMUTATION_MULTIPLE_ANSWERS = "Les facteurs doivent \xEAtre \xE9crits dans un certain ordre dans tes r\xE9ponses.";
const TERMS_FACTORS_PERMUTATION = "Dans <span style='color:_COLORANSWER_'>ta r\xE9ponse</span> les termes et facteurs doivent \xEAtre \xE9crits dans un certain ordre.";
const TERMS_FACTORS_PERMUTATION_MULTIPLE_ANSWERS = "Les termes et facteurs doivent \xEAtre \xE9crits dans un certain ordre dans tes r\xE9ponses.";
const INCOMPLETE_CHOICES = "Tu n'as pas choisi toutes les bonnes r\xE9ponses.";
function checkConstraints(item) {
  const checks = [
    {
      option: ["no-penalty-for-incorrect-spaces", "require-correct-spaces"],
      function: checkSpaces,
      com: SPACES,
      comMultipleAnswers: SPACES_MULTIPLE_ANSWERS,
      text: "spaces"
    },
    {
      option: ["no-penalty-for-explicit-products", "require-implicit-products"],
      function: checkProducts,
      com: PRODUCTS,
      comMultipleAnswers: PRODUCTS_MULTIPLE_ANSWERS,
      text: "implicits products"
    },
    {
      option: [
        "no-penalty-for-extraneous-brackets",
        "require-no-extraneaous-brackets"
      ],
      function: checkBrackets,
      com: BRACKETS,
      comMultipleAnswers: BRACKETS_MULTIPLE_ANSWERS,
      text: "extraneous brackets"
    },
    {
      option: [
        "no-penalty-for-extraneous-zeros",
        "require-no-extraneaous-zeros"
      ],
      function: checkZeros,
      com: ZEROS,
      comMultipleAnswers: ZEROS_MULTIPLE_ANSWERS,
      text: "extraneous zeros"
    },
    {
      option: [
        "no-penalty-for-extraneous-signs",
        "require-no-extraneaous-signs"
      ],
      function: checkSigns,
      com: SIGNS,
      comMultipleAnswers: SIGNS_MULTIPLE_ANSWERS,
      text: "extraneous signs"
    },
    {
      option: ["no-penalty-for-factor-one", "require-no-factor-one"],
      function: checkFactorsOne,
      com: FACTORE_ONE,
      comMultipleAnswers: FACTORE_ONE_MULTIPLE_ANSWERS,
      text: "factor one"
    },
    {
      option: ["no-penalty-for-factor-zero", "require-no-factor-zero"],
      function: checkFactorsZero,
      com: FACTORE_ZERO,
      comMultipleAnswers: FACTORE_ZERO_MULTIPLE_ANSWERS,
      text: "factor zero"
    },
    {
      option: ["no-penalty-for-null-terms", "require-no-null-terms"],
      function: checkNullTerms,
      com: NULL_TERMS,
      comMultipleAnswers: NULL_TERMS_MULTIPLE_ANSWERS,
      text: "null term"
    },
    {
      option: [
        "no-penalty-for-non-reduced-fractions",
        "require-reduced-fractions"
      ],
      function: checkFractions,
      com: FRACTIONS,
      comMultipleAnswers: FRACTIONS_MULTIPLE_ANSWERS,
      text: "non reduced fraction"
    },
    {
      option: ["no-penalty-for-not-respected-unit", "require-specific-unit"],
      function: checkUnits,
      com: BAD_UNIT,
      comMultipleAnswers: BAD_UNIT_MULTIPLE_ANSWERS,
      text: "bad unit"
    }
  ];
  checks.forEach((check) => {
    if (!item.options.includes(check.option[0])) {
      const problematicAnswers = check.function(item);
      if (problematicAnswers.length) {
        item.unoptimals.push(check.text);
        item.coms.push(
          item.answers.length === 1 ? check.com : check.comMultipleAnswers
        );
        problematicAnswers.forEach((i) => {
          item.statuss[i] = !item.options.includes(check.option[1]) && item.statuss[i] !== STATUS_BAD_FORM ? STATUS_UNOPTIMAL_FORM : STATUS_BAD_FORM;
        });
      }
    }
  });
}
function checkTermsAndFactors(item) {
  if (item.solutions) {
    let sols = item.solutions.map((solution) => math(solution));
    sols = sols.map(
      (solution) => solution.removeZerosAndSpaces().reduceFractions().simplifyNullProducts().removeNullTerms().removeFactorsOne().removeSigns().removeUnecessaryBrackets().removeMultOperator()
    );
    item.answers.forEach((answer, i) => {
      if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
        let e = math(answer);
        e = e.removeZerosAndSpaces().reduceFractions().simplifyNullProducts().removeNullTerms().removeFactorsOne().removeSigns().removeUnecessaryBrackets().removeMultOperator();
        if (item.options.includes("disallow-terms-and-factors-permutation") || item.options.includes("penalty-for-terms-and-factors-permutation")) {
          if (!sols[i].strictlyEquals(e)) {
            if (item.options.includes(
              "penalty-for-terms-and-factors-permutation"
            ) && item.statuss[i] !== STATUS_BAD_FORM && item.statuss[i] !== STATUS_BAD_UNIT) {
              item.unoptimals.push("terms and factors unordered");
              item.statuss[i] = STATUS_UNOPTIMAL_FORM;
              item.coms.push(
                item.answers.length === 1 ? TERMS_FACTORS_PERMUTATION : TERMS_FACTORS_PERMUTATION_MULTIPLE_ANSWERS
              );
            } else {
              item.statuss[i] = STATUS_BAD_FORM;
              item.coms.push(
                item.answers.length === 1 ? BAD_FORM : BAD_FORM_MULTIPLE_ANSWERS
              );
            }
          }
        } else if (item.options.includes("disallow-terms-permutation") || item.options.includes("penalty-for-terms-permutation")) {
          e = e.sortFactors();
          sols = sols.map((solution) => solution.sortFactors());
          if (!sols[i].strictlyEquals(e)) {
            if (item.options.includes("penalty-for-terms-permutation") && item.statuss[i] !== STATUS_BAD_FORM && item.statuss[i] !== STATUS_BAD_UNIT) {
              item.unoptimals.push("terms unordered");
              item.statuss[i] = STATUS_UNOPTIMAL_FORM;
              item.coms.push(
                item.answers.length === 1 ? TERMS_PERMUTATION : TERMS_PERMUTATION_MULTIPLE_ANSWERS
              );
            } else {
              item.statuss[i] = STATUS_BAD_FORM;
              item.coms.push(
                item.answers.length === 1 ? BAD_FORM : BAD_FORM_MULTIPLE_ANSWERS
              );
            }
          }
        } else if (item.options.includes("disallow-factors-permutation") || item.options.includes("penalty-for-factors-permutation")) {
          e = e.sortTerms();
          sols = sols.map((solution) => solution.sortTerms());
          if (!sols[i].strictlyEquals(e)) {
            if (item.options.includes("penalty-for-factors-permutation") && item.statuss[i] !== STATUS_BAD_FORM && item.statuss[i] !== STATUS_BAD_UNIT) {
              item.unoptimals.push("factors unordered");
              item.statuss[i] = STATUS_UNOPTIMAL_FORM;
              item.coms.push(
                item.answers.length === 1 ? FACTORS_PERMUTATION : FACTORS_PERMUTATION_MULTIPLE_ANSWERS
              );
            } else {
              item.statuss[i] = STATUS_BAD_FORM;
              item.coms.push(
                item.answers.length === 1 ? BAD_FORM : BAD_FORM_MULTIPLE_ANSWERS
              );
            }
          }
        }
      }
    });
  }
}
function checkUnits(item) {
  const result = [];
  if (item.unit) {
    item.answers.forEach((answer, i) => {
      if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
        const e = math(answer);
        if (item.unit === "HMS" && !e.isTime() || item.unit !== "HMS" && !e.unit || item.unit !== "HMS" && e.unit.string !== item.unit)
          result.push(i);
      }
    });
  }
  return result;
}
function checkProducts(item) {
  const result = [];
  item.answers.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const e = math(answer);
      if (e.removeMultOperator().string !== e.string)
        result.push(i);
    }
  });
  return result;
}
function checkFractions(item) {
  const result = [];
  item.answers.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const e = math(answer);
      if (e.reduceFractions().string !== e.string)
        result.push(i);
    }
  });
  return result;
}
function checkNullTerms(item) {
  const result = [];
  item.answers.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const e = math(answer);
      if (e.removeNullTerms().string !== e.string)
        result.push(i);
    }
  });
  return result;
}
function checkBrackets(item) {
  const result = [];
  const allowBracketsInFirstNegativeTerm = item.options.includes(
    "no-penalty-for-extraneous-brackets-in-first-negative-term"
  );
  item.answers.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const e = math(answer);
      if (e.removeUnecessaryBrackets(allowBracketsInFirstNegativeTerm).string !== e.string) {
        result.push(i);
      }
    }
  });
  return result;
}
function checkSigns(item) {
  const result = [];
  item.answers.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const e1 = math(answer).reduceFractions().simplifyNullProducts().removeNullTerms().removeFactorsOne().removeUnecessaryBrackets().removeMultOperator().removeSigns();
      const e2 = math(answer).reduceFractions().simplifyNullProducts().removeNullTerms().removeFactorsOne().removeUnecessaryBrackets().removeMultOperator();
      if (e1.string !== e2.string)
        result.push(i);
    }
  });
  return result;
}
function checkFactorsOne(item) {
  const result = [];
  item.answers.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const e = math(answer);
      if (e.removeFactorsOne().string !== e.string)
        result.push(i);
    }
  });
  return result;
}
function checkFactorsZero(item) {
  const result = [];
  item.answers.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const e = math(answer);
      if (e.simplifyNullProducts().string !== e.string)
        result.push(i);
    }
  });
  return result;
}
function checkSpaces(item) {
  const result = [];
  item.answers_latex.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const a = answer.replace(/\\,/g, " ").replace("{,}", ".").trim();
      const regex = /\d+[\d\s]*(\.[\d\s]*\d+)?/g;
      const matches = a.match(regex);
      const regexsInt = [
        /\d{4}/,
        /\s$/,
        /\s\d{2}$/,
        /\s\d{2}\s/,
        /\s\d$/,
        /\s\d\s/
      ];
      const regexsDec = [
        /\d{4}/,
        /^\s/,
        /^\d{2}\s/,
        /\s\d{2}\s/,
        /^\d\s/,
        /\s\d\s/
      ];
      const findIncorrectSpace = (s) => {
        let [int, dec] = s.split(".");
        int = int.trim();
        if (regexsInt.some((regex2) => int.match(regex2)) || dec && regexsDec.some((regex2) => dec.match(regex2))) {
          return true;
        }
        return false;
      };
      if (matches && matches.some(findIncorrectSpace)) {
        result.push(i);
      }
    }
  });
  return result;
}
function checkZeros(item) {
  const result = [];
  item.answers.forEach((answer, i) => {
    if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
      const e = math(answer);
      if (e.searchUnecessaryZeros())
        result.push(i);
    }
  });
  return result;
}
function checkForm(item) {
  if (!item.testAnswer && item.solutions) {
    item.answers.forEach((answer, i) => {
      var _a;
      if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
        let e = math(answer).removeZerosAndSpaces().reduceFractions().simplifyNullProducts();
        if (!item.options.includes("no-penalty-for-null-terms")) {
          e = e.removeNullTerms();
        }
        e = e.removeFactorsOne().removeSigns().removeUnecessaryBrackets().removeMultOperator().sortTermsAndFactors();
        const indexSolution = ((_a = item.options) == null ? void 0 : _a.includes(
          "solutions-order-not-important"
        )) ? item.solutionsIndexs[i] : i;
        let solution = math(item.solutions[indexSolution]);
        console.log("answer & solution", e.string, solution.string);
        if (!e.unit && !e.strictlyEquals(solution)) {
          item.statuss[i] = STATUS_BAD_FORM;
          item.coms.push(
            item.answers.length === 1 ? BAD_FORM : BAD_FORM_MULTIPLE_ANSWERS
          );
        }
      }
    });
  }
}
function assessItem(item) {
  if (!item.answers_latex && item.answers) {
    item.answers_latex = item.answers.map(
      (answer) => math(answer).toLatex({ addSpaces: false })
    );
  }
  item.options = item.options || [];
  item.coms = [];
  item.unoptimals = [];
  item.status = STATUS_CORRECT;
  if (!item.answers) {
    item.statuss = [STATUS_EMPTY];
    item.status = STATUS_EMPTY;
  } else {
    item.statuss = item.answers.map(
      (answer) => (item.type === "choice" || item.type === "choices") && answer !== "" && answer >= 0 || answer ? STATUS_CORRECT : STATUS_EMPTY
    );
    if (item.statuss.every((status) => status === STATUS_EMPTY)) {
      if (item.answers)
        item.coms.push(EMPTY_ANSWER);
      item.status = STATUS_EMPTY;
    } else if (item.type === "choice" && item.solutions.toString() !== item.answers.toString()) {
      item.statuss = [STATUS_INCORRECT];
      item.status = STATUS_INCORRECT;
    } else if (item.type === "choices" && item.solutions.toString() !== item.answers.toString()) {
      item.answers.forEach((answer, i) => {
        if (!item.solutions.includes(answer)) {
          item.statuss[i] = STATUS_INCORRECT;
          item.status = STATUS_INCORRECT;
        }
      });
      if (item.status !== STATUS_INCORRECT) {
        item.status = STATUS_UNOPTIMAL_FORM;
        item.coms.push(INCOMPLETE_CHOICES);
      }
    } else {
      if (item.statuss.some((status) => status === STATUS_EMPTY)) {
        item.coms.push(EMPTY_MULTIPLE_ANSWERS);
      }
      let incorrectForm = false;
      item.answers.forEach((answer, i) => {
        console.log("math(answer)", math(answer).string);
        if (item.statuss[i] !== STATUS_EMPTY && math(answer).isIncorrect()) {
          console.log("incorrect");
          item.statuss[i] = STATUS_INCORRECT;
          item.status = STATUS_INCORRECT;
          incorrectForm = true;
        }
      });
      if (incorrectForm && item.answers.length === 1) {
        item.coms.push(MATH_INCORRECT);
      } else if (incorrectForm) {
        item.coms.push(MATH_INCORRECT_MULTIPLE_ANSWERS);
      }
      if (item.type === "trou") {
        const putAnswers = (() => {
          let count = 0;
          return () => item.answers[count++];
        })();
        const globallyIncorrectForm = math(
          item.expression.replace(/\?/g, putAnswers)
        ).isIncorrect();
        if (globallyIncorrectForm) {
          item.status = STATUS_INCORRECT;
          if (!incorrectForm)
            item.coms.push(MATH_GLOBALLY_INCORRECT);
        }
      }
      if (!item.statuss.every(
        (status) => status === STATUS_INCORRECT || status === STATUS_EMPTY
      )) {
        if (item.testAnswer) {
          console.log("correction with testAnswer");
          item.answers.forEach((answer, i) => {
            if (item.testAnswer[i] && item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT || item.statuss[0] !== STATUS_EMPTY && item.statuss[0] !== STATUS_INCORRECT) {
              const t = item.testAnswer[i] || item.testAnswer[0];
              const tests = t.replace(/&answer/g, answer).replace(/,/g, ".").split("&&");
              const failed = tests.some((test) => !math(test).isIncorrect() && math(test).eval().isFalse());
              if (failed) {
                item.statuss[i] = STATUS_INCORRECT;
                item.status = STATUS_INCORRECT;
              }
            }
          });
        } else {
          item.answers.forEach((answer, i) => {
            var _a;
            if (item.statuss[i] !== STATUS_EMPTY && item.statuss[i] !== STATUS_INCORRECT) {
              if ((_a = item.options) == null ? void 0 : _a.includes("solutions-order-not-important")) {
                if (!item.solutionsUsed) {
                  item.solutionsUsed = [];
                }
                if (!item.solutionsIndexs) {
                  item.solutionsIndexs = {};
                }
                const index = item.solutions.findIndex(
                  (solution, j) => !item.solutionsUsed.includes(j) && math(answer).equals(math(solution))
                );
                if (index === -1) {
                  item.statuss[i] = STATUS_INCORRECT;
                  item.status = STATUS_INCORRECT;
                } else {
                  item.solutionsUsed.push(index);
                  item.solutionsIndexs[i] = index;
                }
              } else if (!math(answer).equals(math(item.solutions[i]))) {
                item.statuss[i] = STATUS_INCORRECT;
                item.status = STATUS_INCORRECT;
              }
            }
          });
        }
        checkConstraints(item);
        checkTermsAndFactors(item);
        checkForm(item);
        if (item.status !== STATUS_EMPTY && item.status !== STATUS_INCORRECT) {
          if (item.statuss.some((status) => status === STATUS_BAD_FORM)) {
            item.status = STATUS_BAD_FORM;
          } else if (item.statuss.some((status) => status === STATUS_UNOPTIMAL_FORM) || item.statuss.filter((status) => status === STATUS_EMPTY).length > 0 && item.statuss.filter((status) => status === STATUS_EMPTY).length <= item.statuss.length / 2) {
            item.status = STATUS_UNOPTIMAL_FORM;
          } else if (item.statuss.filter((status) => status === STATUS_EMPTY).length > 0) {
            item.status = STATUS_INCORRECT;
          } else if (item.type === "choices" && item.answers && item.answers.length && item.answers.length >= item.solutions.length / 2 && item.answers.length < item.solutions.length) {
            item.status = STATUS_UNOPTIMAL_FORM;
          }
        }
      }
    }
  }
  console.log("assessed item", item);
  createCorrection(item);
}
function createSolutionsLatex(item) {
  return item.solutions ? item.solutions.map((solution) => {
    if (item.type === "choice") {
      return item.choices[solution];
    } else {
      console.log("solution", solution);
      const e = math(solution);
      return e.type === "!! Error !!" ? solution : e.toLatex();
    }
  }) : null;
}
function createCorrection(item) {
  const {
    expression_latex,
    solutions,
    answers,
    answers_latex = [],
    correctionFormat,
    status = STATUS_EMPTY,
    choices
  } = item;
  if (!solutions && !item.testAnswer)
    return;
  let line;
  let lines = [];
  let coms = item.coms || [];
  let answerColor = correct_color;
  if (status === STATUS_BAD_FORM || status === STATUS_INCORRECT || status === STATUS_BAD_UNIT) {
    answerColor = incorrect_color;
  } else if (status === STATUS_UNOPTIMAL_FORM) {
    answerColor = unoptimal_color;
  }
  let solutions_latex = createSolutionsLatex(item);
  const regexExpression = /&expression/g;
  function replaceExpression() {
    return get_store_value(toMarkup)("$$" + item.expression_latex + "$$");
  }
  const regexExpression2 = /&expression2/g;
  function replaceExpression2() {
    return get_store_value(toMarkup)("$$" + item.expression2_latex + "$$");
  }
  const regexExp = /&exp/g;
  function replaceExp() {
    return item.expression_latex;
  }
  const regexExp2 = /&exp/g;
  function replaceExp2() {
    return item.expression2_latex;
  }
  const regexAnswer = /&answer([1-9]?)/g;
  function replaceAnswerCorrect(match, p1) {
    return `<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px;  margin:2px; padding:5px;display:inline-block">` + (item.type === "choice" ? get_store_value(formatLatex)(item.choices[item.answers[p1 ? p1 - 1 : 0]].text) : get_store_value(toMarkup)("$$" + answers_latex[p1 ? p1 - 1 : 0] + "$$")) + "</span>";
  }
  const regexAns = /&ans([1-9]?)/g;
  function replaceAnsCorrect(match, p1) {
    return `\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{` + answers_latex[p1 ? p1 - 1 : 0] + "}}";
  }
  const regexSolution = /&solution([1-9]?)/g;
  function replaceSolution(match, p1) {
    return `<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px; margin:2px;padding:5px;display:inline-block">` + (item.type === "choice" ? get_store_value(formatLatex)(item.choices[solutions[p1 ? p1 - 1 : 0]].text) : get_store_value(toMarkup)(solutions_latex[p1 ? p1 - 1 : 0])) + "</span>";
  }
  const regexSol = /&sol([1-9]?)/g;
  function replaceSol(match, p1) {
    return item.type === "choice" ? item.choices[solutions[p1 ? p1 - 1 : 0]].text : `\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{` + solutions_latex[p1 ? p1 - 1 : 0] + "}}";
  }
  function replaceAnswerUncorrect(match, p1) {
    console.log("answers", item.answers);
    return `<span style="color:${item.statuss[p1 ? p1 - 1 : 0] === STATUS_UNOPTIMAL_FORM ? unoptimal_color : item.statuss[p1 ? p1 - 1 : 0] === STATUS_CORRECT ? correct_color : incorrect_color};display:inline-block">` + (item.type === "choice" ? get_store_value(formatLatex)(item.choices[item.answers[p1 ? p1 - 1 : 0]].text) : get_store_value(toMarkup)("$$" + answers_latex[p1 ? p1 - 1 : 0] + "$$")) + "</span>";
  }
  function replaceAnsUncorrect(match, p1) {
    return `\\textcolor{${item.statuss[p1 ? p1 - 1 : 0] === STATUS_UNOPTIMAL_FORM ? unoptimal_color : item.statuss[p1 ? p1 - 1 : 0] === STATUS_CORRECT ? correct_color : incorrect_color}}{` + answers_latex[p1 ? p1 - 1 : 0] + "}";
  }
  if (correctionFormat) {
    if (status === STATUS_CORRECT) {
      correctionFormat.correct.forEach((format) => {
        if (format === "image") {
          let img = choices[solutions[0]].imageBase64;
          line = `<img src='${img}' style="max-width:400px;max-height:40vh;" alt='toto'>`;
        } else {
          line = format.replace(regexExpression2, replaceExpression2).replace(regexExpression, replaceExpression).replace(regexExp2, replaceExp2).replace(regexExp, replaceExp).replace(regexAnswer, replaceAnswerCorrect).replace(regexAns, replaceAnsCorrect);
        }
        lines.push({ html: line });
      });
    } else {
      correctionFormat.uncorrect.forEach((format) => {
        if (format === "image") {
          let img = choices[solutions[0]].imageBase64;
          line = `<img style="max-width:400px;max-height:40vh;" src='${img}' alt='toto'>`;
        } else {
          line = format.replace(regexExpression2, replaceExpression2).replace(regexExpression, replaceExpression).replace(regexExp2, replaceExp2).replace(regexExp, replaceExp).replace(regexSolution, replaceSolution).replace(regexSol, replaceSol);
        }
        lines.push({ html: line });
      });
      if (status !== STATUS_EMPTY && item.answers) {
        if (correctionFormat.answer === "image") {
          let img = choices[answer_choice].imageBase64;
          coms.unshift(
            `<img src='${img}' style="padding:2px; border: 2px solid ${incorrect_color} ;max-width:400px;max-height:40vh;" alt='toto'>`
          );
          coms.unshift("Ta r\xE9ponse:");
        } else {
          coms.unshift(
            "Ta r\xE9ponse : " + correctionFormat.answer.replace(regexExpression2, replaceExpression2).replace(regexExpression, replaceExpression).replace(regexExp2, replaceExp2).replace(regexExp, replaceExp).replace(regexAnswer, replaceAnswerUncorrect).replace(regexAns, replaceAnsUncorrect)
          );
        }
      }
    }
  } else {
    switch (item.type) {
      case "result":
      case "rewrite": {
        line = `$$\\begin{align*}  ${expression_latex}`;
        if (status === STATUS_INCORRECT) {
          line += `&= \\enclose{updiagonalstrike}[3px solid ${incorrect_color}]{${answers_latex[0]}} \\\\`;
        } else if (status === STATUS_BAD_FORM || status === STATUS_BAD_UNIT) {
          line += `&= \\textcolor{${incorrect_color}}{${answers_latex[0]}} \\\\`;
        } else if (status === STATUS_UNOPTIMAL_FORM) {
          line += `&= \\textcolor{${unoptimal_color}}{${answers_latex[0]}} \\\\`;
        }
        line += `&=\\enclose{roundedbox}[2px solid ${correct_color}]{\\textcolor{${correct_color}}{${status === STATUS_CORRECT ? answers_latex[0] : solutions_latex[0]}}}`;
        line += "\\end{align*}$$";
        lines.push({ html: line });
        break;
      }
      case "equation": {
        line = `$$\\begin{align*}  x`;
        if (status === STATUS_EMPTY) {
          line += `=\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}\\end{align*}$$`;
        } else if (status === STATUS_INCORRECT) {
          line += `&= \\enclose{updiagonalstrike}[6px solid rgba(205, 0, 11, .4)]{\\textcolor{${incorrect_color}}{${answers_latex[0]}}}\\\\&= \\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}\\end{align*}$$`;
        } else if (status === STATUS_BAD_FORM || status === STATUS_UNOPTIMAL_FORM) {
          line += `&= \\textcolor{${unoptimal_color}}{${answers_latex[0]}}\\\\&= \\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}\\end{align*}$$`;
        } else {
          line += `=\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${answers_latex[0]}}}\\end{align*}$$`;
        }
        lines.push({ html: line });
        break;
      }
      case "choice":
      case "choices": {
        let choices2 = [];
        console.log("item.choices", item.choices);
        item.choices.forEach((choice, i) => {
          console.log("choice", choice);
          const c = {};
          if (solutions.includes(i)) {
            c.solution = true;
            if (answers && answers.includes(i)) {
              c.badge = "correct";
            }
          } else if (answers && answers.includes(i)) {
            c.badge = "incorrect";
          }
          if (choice.image) {
            c.image = choice.base64;
          } else {
            c.text = choice.text;
          }
          if (answers || c.solution) {
            choices2.push(c);
          }
        });
        console.log("choices", choices2);
        lines.push({ choices: choices2 });
        break;
      }
      case "trou":
        if (status === STATUS_CORRECT) {
          line = "$$" + expression_latex.replace(
            /\\ldots/,
            `\\enclose{roundedbox}[2px solid ${correct_color}]{\\textcolor{${correct_color}}{${answers_latex[0]}}}`
          ) + "$$";
        } else {
          line = "$$" + expression_latex.replace(
            /\\ldots/,
            `\\enclose{roundedbox}[2px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}`
          ) + "$$";
          if (status === STATUS_INCORRECT) {
            coms.unshift(
              "Ta r\xE9ponse : $$" + expression_latex.replace(
                /\\ldots/,
                `\\textcolor{${incorrect_color}}{${answers_latex[0]}}`
              ) + "$$"
            );
          } else if (status === STATUS_BAD_FORM || status === STATUS_UNOPTIMAL_FORM) {
            coms.unshift(
              "Ta r\xE9ponse : $$" + expression_latex.replace(
                /\\ldots/,
                `\\textcolor{${unoptimal_color}}{${answers_latex[0]}}`
              ) + "$$"
            );
          }
        }
        lines.push({ html: line });
    }
  }
  lines = lines.map((line2) => {
    if (line2.html) {
      return { html: get_store_value(formatLatex)(line2.html) };
    } else if (line2.choices) {
      return {
        choices: line2.choices.map((choice) => ({
          ...choice,
          html: get_store_value(formatLatex)(choice.text)
        }))
      };
    }
  });
  if (item.answers) {
    coms = coms.map(
      (com) => get_store_value(formatLatex)(com).replace(/_COLORANSWER_/g, answerColor)
    );
  }
  item.coms = coms;
  item.simpleCorrection = lines;
}
function createDetailedCorrection(item) {
  const { solutions, correctionDetails } = item;
  let lines = [];
  let line;
  let solutions_latex = createSolutionsLatex(item);
  const regexExpression = /&expression/g;
  function replaceExpression() {
    return get_store_value(toMarkup)("$$" + item.expression_latex + "$$");
  }
  const regexExpression2 = /&expression2/g;
  function replaceExpression2() {
    return get_store_value(toMarkup)("$$" + item.expression2_latex + "$$");
  }
  const regexExp = /&exp/g;
  function replaceExp() {
    return item.expression_latex;
  }
  const regexExp2 = /&exp/g;
  function replaceExp2() {
    return item.expression2_latex;
  }
  const regexSolution = /&solution([1-9]?)/g;
  function replaceSolution(match, p1) {
    return `<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px; margin:2px;padding:5px;display:inline-block">` + (item.type === "choice" ? get_store_value(formatLatex)(item.choices[solutions[p1 ? p1 - 1 : 0]].text) : get_store_value(toMarkup)(solutions_latex[p1 ? p1 - 1 : 0])) + "</span>";
  }
  const regexSol = /&sol([1-9]?)/g;
  function replaceSol(match, p1) {
    return item.type === "choice" ? item.choices[solutions[p1 ? p1 - 1 : 0]].text : `\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{` + solutions_latex[p1 ? p1 - 1 : 0] + "}}";
  }
  correctionDetails.forEach((detail) => {
    if (detail.type === "image") {
      let img = detail.base64;
      line = `<img src='${img}' style="max-width:400px;max-height:40vh;" alt='toto'>`;
    } else {
      line = detail.text.replace(regexExpression2, replaceExpression2).replace(regexExpression, replaceExpression).replace(regexExp2, replaceExp2).replace(regexExp, replaceExp).replace(regexSolution, replaceSolution).replace(regexSol, replaceSol).replace(
        "&solution",
        () => `<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px;  margin:2px; padding:5px;display:inline-block">` + (item.type === "choice" ? get_store_value(formatLatex)(item.choices[solutions[0]].text) : get_store_value(toMarkup)(solutions_latex[0])) + "</span>"
      ).replace(
        new RegExp("&sol", "g"),
        item.type === "choice" ? item.choices[solutions[0]].text : `\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{` + solutions_latex[0] + "}}"
      );
    }
    lines.push(line);
  });
  lines = lines.map(get_store_value(formatLatex));
  return lines;
}
const CorrectionLine = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { line } = $$props;
  if (line && line.choices) {
    console.log("choices", line.choices);
  }
  if ($$props.line === void 0 && $$bindings.line && line !== void 0)
    $$bindings.line(line);
  return `${line ? `${line.html ? `<span style="${"word-break:break-word;white-space:normal;"}"><!-- HTML_TAG_START -->${line.html}<!-- HTML_TAG_END --></span>` : `${line.choices ? `${each(line.choices, (choice, i) => {
    return `${choice.solution ? `<span class="${"rounded-lg m-2 p-2"}"${add_attribute("style", `display:inline-block;text-align: center;min-width:2em;position:relative; border: 6px solid ${correct_color}`, 0)}>${choice.html ? `<!-- HTML_TAG_START -->${choice.html}<!-- HTML_TAG_END -->` : `${choice.image ? `<img class="${"white"}"${add_attribute("src", choice.image, 0)} style="${"max-width:min(400px,80%);max-height:40vh;"}"${add_attribute("alt", `choice ${i}`, 0)}>` : ``}`}
					${choice.badge ? `${validate_component(Badge, "Badge").$$render(
      $$result,
      {
        pos: "middle",
        color: choice.badge === "correct" ? "custom-correct" : "custom-incorrect",
        "aria-label": `choice ${i}`,
        style: "min-height: 1.5rem; min-width: 1.5rem; padding: 0;"
      },
      {},
      {}
    )}` : ``}
				</span>` : `<span class="${"rounded-lg m-2 p-2"}" style="${"display:inline-block;text-align:center;min-width:2em;position:relative; border:4px solid grey"}">${choice.html ? `<!-- HTML_TAG_START -->${choice.html}<!-- HTML_TAG_END -->` : `${choice.image ? `<img class="${"white"}"${add_attribute("src", choice.image, 0)} style="${"max-width:min(400px,80%);max-height:40vh;"}"${add_attribute("alt", `choice ${i}`, 0)}>` : ``}`}
					${choice.badge ? `${validate_component(Badge, "Badge").$$render(
      $$result,
      {
        color: "custom-incorrect",
        "aria-label": `choice ${i}`,
        style: "min-height: 1.5rem; min-width: 1.5rem; padding: 0;"
      },
      {},
      {}
    )}` : ``}
				</span>`}`;
  })}` : `<span style="${"display:inline-block;word-break:break-word;white-space:normal;"}"><!-- HTML_TAG_START -->${line}<!-- HTML_TAG_END --></span>`}`}` : ``}`;
});
const Question = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $MathfieldElement, $$unsubscribe_MathfieldElement;
  let $toMarkup, $$unsubscribe_toMarkup;
  let $formatLatex, $$unsubscribe_formatLatex;
  let $virtualKeyboardMode, $$unsubscribe_virtualKeyboardMode;
  $$unsubscribe_MathfieldElement = subscribe(MathfieldElement, (value) => $MathfieldElement = value);
  $$unsubscribe_toMarkup = subscribe(toMarkup, (value) => $toMarkup = value);
  $$unsubscribe_formatLatex = subscribe(formatLatex, (value) => $formatLatex = value);
  $$unsubscribe_virtualKeyboardMode = subscribe(virtualKeyboardMode, (value) => $virtualKeyboardMode = value);
  let { question } = $$props;
  let { interactive = false } = $$props;
  let { masked = false } = $$props;
  let { magnify = 1 } = $$props;
  let { correction = false } = $$props;
  let { simpleCorrection = [] } = $$props;
  let { detailedCorrection = null } = $$props;
  let { commit } = $$props;
  let { immediateCommit } = $$props;
  getLogger("correction", "trace");
  let enounce;
  let enounce2;
  let expression;
  let expression2;
  let mfs = [];
  let nmfs = 0;
  let answers;
  let answers_latex;
  let answerFields;
  let keyListeners = [];
  let inputListeners = [];
  let changeListeners = [];
  let fieldsNb = 0;
  let coms;
  function recordAnswer(i) {
    answers_latex[i] = mfs[i].getValue().replace(/(\\,){2,}/g, "\\,").trim();
    answers[i] = mfs[i].getValue("ascii-math").replace(/÷/g, ":").replace(/\((\d+(,\d+)*)\)\//g, (_, p1) => p1 + "/").replace(/\(([a-z])\)\//g, (_, p1) => p1 + "/").replace(/\/\((\d+(,\d+)*)\)/g, (_, p1) => "/" + p1).replace(/\/\(([a-z])\)/g, (_, p1) => "/" + p1).trim();
  }
  function removeListeners() {
    if (mfs) {
      mfs.forEach((mf) => {
        if (mf.hasFocus()) {
          mf.blur();
        }
      });
    }
    keyListeners.forEach((listener, i) => mfs[i].removeEventListener("key", listener));
    inputListeners.forEach((listener, i) => mfs[i].removeEventListener("input", listener));
    changeListeners.forEach((listener, i) => mfs[i].removeEventListener("change", listener));
    keyListeners = [];
    inputListeners = [];
    changeListeners = [];
  }
  function onChange(ev, i) {
    if (mfs[i].hasFocus()) {
      if (mfs.length === 1 && immediateCommit) {
        removeListeners();
        commit.exec();
      }
    }
  }
  function onInput(ev, i) {
    recordAnswer(i);
  }
  function onKeystroke(ev, i) {
    const mf = mfs[i];
    const key_allowed = "azertyuiopsdfghjklmwxcvbn0123456789,.=<>/*-+()^%\u20ACL";
    const key_allowed2 = ["Backspace", "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"];
    const keystroke_allowed = ["Enter", "NumpadEnter"];
    const keystroke = ev.code;
    const key = ev.key;
    if (keystroke === "Space") {
      mfs[i].insert("2\\,3");
    } else if (key === "%") {
      ev.preventDefault();
      mf.insert("\\%");
    } else if (key === "r") {
      ev.preventDefault();
      mf.insert("\\sqrt");
    } else if (key === "*") {
      ev.preventDefault();
      mf.insert("\\times ");
    } else if (key === ":") {
      ev.preventDefault();
      mf.insert("\\div ");
    } else if (!key_allowed.includes(key) && !key_allowed2.includes(key) && !keystroke_allowed.includes(keystroke)) {
      ev.preventDefault();
    }
  }
  function addMathfield() {
    let id = `mf-${question.num}-${nmfs}`;
    if (masked)
      id = id + "-masked";
    nmfs++;
    return `<span id='${id}'}/>`;
  }
  function manageFocus() {
    mfs.forEach((mfe) => {
      mfe.virtualKeyboardState = mfe.hasFocus() && $virtualKeyboardMode ? "visible" : "hidden";
    });
  }
  function initQuestion(question2) {
    if (!masked)
      console.log("init question");
    removeListeners();
    mfs = [];
    nmfs = 0;
    const q = question2;
    if (!question2.detailedCorrection && question2.correctionDetails) {
      q.detailedCorrection = createDetailedCorrection(question2);
    }
    detailedCorrection = question2.detailedCorrection;
    answers = question2.answers;
    answers_latex = question2.answers_latex;
    enounce = question2.enounce ? $formatLatex(question2.enounce) : null;
    enounce2 = question2.enounce2 ? $formatLatex(question2.enounce2) : null;
  }
  function makeCorrection(answers2) {
    if (!masked)
      console.log("makeCorrection");
    if (interactive) {
      const item = { ...question, answers: answers2, answers_latex };
      assessItem(item);
      if (!masked)
        console.log("assess item", item);
      coms = item.coms;
      simpleCorrection = item.simpleCorrection;
    } else if (question.simpleCorrection) {
      simpleCorrection = question.simpleCorrection;
    } else {
      const q = question;
      assessItem(q);
      if (!masked)
        console.log("assess item", q);
      simpleCorrection = q.simpleCorrection;
      detailedCorrection = q.detailedCorrection;
    }
  }
  function commitAnswers() {
    const q = question;
    q.answers = answers;
    q.answers_latex = answers_latex;
    assessItem(q);
    if (!masked)
      console.log("assess item", q);
  }
  async function prepareInteractive() {
    if (!masked)
      console.log("prepare interactive");
    mfs = [];
    nmfs = 0;
    expression = question.expression_latex;
    expression2 = question.expression2_latex;
    if (expression && (question.type === "result" || question.type === "rewrite") && !question.answerFields) {
      expression += "=\\ldots";
    }
    answerFields = question.answerFields;
    if (!answerFields && !expression && question.type !== "choice" && question.type !== "choices") {
      answerFields = "$$?$$";
    }
    if (answerFields) {
      answerFields = $formatLatex(answerFields.replace(/\?/g, "\\ldots")).replace(/…/g, addMathfield);
    }
    if (expression) {
      expression = $toMarkup(expression).replace(/…/g, addMathfield);
    }
    if (expression2) {
      expression2 = $toMarkup(expression2);
    }
    possiblyResetAnswers();
    if (!masked)
      console.log("tick");
    await tick();
    if (!masked)
      console.log("ticked");
    insertMathFields();
  }
  function stopInteractive() {
    if (!masked)
      console.log("stop interactive");
    removeListeners();
    mfs = null;
    expression = question.expression_latex;
    expression2 = question.expression2_latex;
    answerFields = question.answerFields;
    if (answerFields) {
      answerFields = $formatLatex(answerFields.replace(/\?/g, "\\ldots"));
    }
    if (expression) {
      expression = $toMarkup(expression);
    }
    if (expression2) {
      expression2 = $toMarkup(expression2);
    }
    possiblyResetAnswers();
  }
  function possiblyResetAnswers() {
    if (!interactive) {
      answers = null;
      answers_latex = null;
    } else {
      if (!answers)
        answers = question.solutions.map((s) => "");
      if (!answers_latex)
        answers_latex = question.solutions.map((s) => "");
    }
  }
  onDestroy(() => {
    removeListeners();
  });
  function insertMathFields() {
    if (!masked)
      console.log("insertathFields", answers, answers_latex);
    const elements = [];
    if (answerFields) {
      for (let i of document.querySelector(`#answerFields-${question.num}${masked ? "-masked" : ""}`).querySelectorAll("*")) {
        if (/^mf/g.test(i.id)) {
          elements.push(i);
        }
      }
    } else if (expression) {
      const expressionElements = document.querySelector(`#expression-${question.num}${masked ? "-masked" : ""}`);
      if (expressionElements) {
        for (let i of expressionElements.querySelectorAll("*")) {
          if (/^mf/g.test(i.id)) {
            elements.push(i);
          }
        }
      }
      if (expression2) {
        const expression2Elements = document.querySelector(`#expression2-${question.num}${masked ? "-masked" : ""}`);
        for (let i of expression2Elements.querySelectorAll("*")) {
          if (/^mf/g.test(i.id)) {
            elements.push(i);
          }
        }
      }
    }
    let added;
    elements.forEach((elt, i) => {
      if (!elt.hasChildNodes()) {
        const mfe = new $MathfieldElement();
        mfe.setOptions({
          soundsDirectory: "/sounds",
          virtualKeyboardMode: "off",
          decimalSeparator: ",",
          ...virtualKeyboard,
          inlineShortcuts: { xx: {} },
          keypressSound: null,
          keypressVibration: false,
          removeExtraneousParentheses: false,
          smartFence: false,
          superscript: false,
          mathModeSpace: "\\,"
        });
        if (answers_latex[i]) {
          mfe.value = answers_latex[i];
        }
        mfs.push(mfe);
        elt.appendChild(mfe);
        elt.style.display = "inline-block";
        elt.style.minWidth = "2em";
        mfe.style.overflow = "unset";
        mfe.style.paddingLeft = "2px";
        mfe.style.paddingRight = "2px";
        elt.style.border = "2px dashed grey";
        elt.style.borderRadius = "5px";
        if (!masked) {
          const keyListener = (ev) => onKeystroke(ev, i);
          const inputListener = (ev) => onInput(ev, i);
          const changeListener = (ev) => onChange(ev, i);
          keyListeners.push(keyListener);
          inputListeners.push(inputListener);
          changeListeners.push(changeListener);
          mfe.addEventListener("keydown", keyListener);
          mfe.addEventListener("input", inputListener);
          mfe.addEventListener("change", changeListener);
          mfe.addEventListener("focus", manageFocus);
          mfe.addEventListener("blur", manageFocus);
        }
        added = true;
      }
    });
    if (added && !masked) {
      if (!mfs[0].hasFocus()) {
        mfs[0].focus();
      }
    }
    fieldsNb = (mfs == null ? void 0 : mfs.length) || 0;
  }
  if (commit) {
    commit.hook = commitAnswers;
  } else {
    commit = { exec: commitAnswers };
  }
  if ($$props.question === void 0 && $$bindings.question && question !== void 0)
    $$bindings.question(question);
  if ($$props.interactive === void 0 && $$bindings.interactive && interactive !== void 0)
    $$bindings.interactive(interactive);
  if ($$props.masked === void 0 && $$bindings.masked && masked !== void 0)
    $$bindings.masked(masked);
  if ($$props.magnify === void 0 && $$bindings.magnify && magnify !== void 0)
    $$bindings.magnify(magnify);
  if ($$props.correction === void 0 && $$bindings.correction && correction !== void 0)
    $$bindings.correction(correction);
  if ($$props.simpleCorrection === void 0 && $$bindings.simpleCorrection && simpleCorrection !== void 0)
    $$bindings.simpleCorrection(simpleCorrection);
  if ($$props.detailedCorrection === void 0 && $$bindings.detailedCorrection && detailedCorrection !== void 0)
    $$bindings.detailedCorrection(detailedCorrection);
  if ($$props.commit === void 0 && $$bindings.commit && commit !== void 0)
    $$bindings.commit(commit);
  if ($$props.immediateCommit === void 0 && $$bindings.immediateCommit && immediateCommit !== void 0)
    $$bindings.immediateCommit(immediateCommit);
  {
    initQuestion(question);
  }
  {
    if (question && !correction && interactive) {
      prepareInteractive();
    } else {
      stopInteractive();
    }
  }
  {
    makeCorrection(answers);
  }
  $$unsubscribe_MathfieldElement();
  $$unsubscribe_toMarkup();
  $$unsubscribe_formatLatex();
  $$unsubscribe_virtualKeyboardMode();
  return `<div class="${"flex flex-col items-center justify-around"}">${each(question.order_elements, (element) => {
    return `${element === "enounce" && enounce ? `<div id="${"enounce"}"${add_attribute("class", (correction ? "mb-1" : "my-3") + " text-center max-w-4xl leading-normal", 0)}${add_attribute("style", `font-size:${correction ? 1 : magnify}rem;` + (correction ? "color:" + mdc_colors["grey-600"] : ""), 0)}><!-- HTML_TAG_START -->${enounce}<!-- HTML_TAG_END -->
			</div>` : `${element === "enounce2" && enounce2 ? `<div id="${"enounce2"}"${add_attribute("class", (correction ? "my-1" : "my-3") + " text-center max-w-4xl", 0)}${add_attribute("style", `font-size:${correction ? 1 : magnify}rem` + (correction ? "color:" + mdc_colors["grey-600"] : ""), 0)}><!-- HTML_TAG_START -->${enounce2}<!-- HTML_TAG_END -->
			</div>` : `${element === "enounce-image" && question.image ? `${correction && question.imageCorrection ? `${function(__value) {
      if (is_promise(__value)) {
        __value.then(null, noop);
        return `
					loading image
				`;
      }
      return function(base64) {
        return `
					<div style="${"display:inline-block;background-color:white;"}"><img${add_attribute("src", base64, 0)} class="${"my-3 w-full max-w-lg"}" style="${"max-height:40vh; object-fit: contain;"}" alt="${"Alright Buddy!"}"></div>
				`;
      }(__value);
    }(question.imageCorrectionBase64P)}` : `${function(__value) {
      if (is_promise(__value)) {
        __value.then(null, noop);
        return `
					loading image
				`;
      }
      return function(base64) {
        return `
					<div style="${"display:inline-block;background-color:white;"}"><img${add_attribute("src", base64, 0)} class="${"my-3 w-full max-w-lg"}" style="${"max-height:40vh; object-fit: contain;"}" alt="${"Alright Buddy!"}"></div>
				`;
      }(__value);
    }(question.imageBase64P)}`}` : `${element === "expression" && expression && (!correction || question.answerFields || question.type !== "result" && question.type !== "trou" && question.type !== "rewrite") ? `<div id="${"expressions"}" class="${"flex flex-col items-center justify-center"}"${add_attribute("style", `max-width:100%;font-size:${correction ? 1 : magnify * 1.5}rem;` + (correction ? "color:" + mdc_colors["grey-600"] : ""), 0)}><div${add_attribute("id", `expression-${question.num}${masked ? "-masked" : ""}`, 0)}${add_attribute("class", correction ? "my-1" : "my-3", 0)} style="${"display:flex; align-items: baseline;max-width:100%"}"><!-- HTML_TAG_START -->${expression}<!-- HTML_TAG_END --></div>
				${expression2 && !(!interactive && question.type === "equation") ? `<div${add_attribute("id", `expression2-${question.num}${masked ? "-masked" : ""}`, 0)}${add_attribute("class", correction ? "my-1" : "my-3", 0)}><!-- HTML_TAG_START -->${expression2}<!-- HTML_TAG_END -->
					</div>` : ``}
			</div>` : `${!correction && element === "choices" && question.choices ? `<div class="${"mt-3 flex flex-wrap justify-around"}"${add_attribute("style", `font-size:${magnify}rem`, 0)}>${each(question.choices, (choice, i) => {
      return `<button class="${"rounded-lg m-2 p-2"}"${add_attribute(
        "style",
        `font-size:1em; min-width:2em;border: 4px solid ${interactive && answers.includes(i) ? "var(--mdc-theme-primary)" : "var(--mdc-theme-secondary)"};`,
        0
      )}>${choice.image ? `${function(__value) {
        if (is_promise(__value)) {
          __value.then(null, noop);
          return `
								loading image
							`;
        }
        return function(base64) {
          return `
								<img class="${"white"}"${add_attribute("src", base64, 0)} style="${"max-width:min(400px,80%);max-height:40vh;"}"${add_attribute("alt", `choice ${i}`, 0)}>
							`;
        }(__value);
      }(choice.imageBase64P)}` : ``}
						${choice.text ? `<div><!-- HTML_TAG_START -->${$formatLatex(choice.text)}<!-- HTML_TAG_END -->
							</div>` : ``}
					</button>`;
    })}
			</div>` : ``}`}`}`}`}`;
  })}
	${!correction && question.answerFields && question.type === "trou" || !correction && answerFields && interactive ? `<div${add_attribute("id", `answerFields-${question.num}${masked ? "-masked" : ""}`, 0)} class="${"my-3 flex flex-col items-center justify-center"}"><div${add_attribute("id", `answerFields-${question.num}${masked ? "-masked" : ""}`, 0)} class="${"my-3"}"${add_attribute("style", `font-size:${magnify}rem`, 0)}><!-- HTML_TAG_START -->${answerFields}<!-- HTML_TAG_END --></div></div>` : ``}
	${!correction && interactive && (question.type === "choices" || fieldsNb > 1) && immediateCommit ? `${validate_component(Button, "Button").$$render($$result, { class: "mt-3 p-1", variant: "raised" }, {}, {
    default: () => {
      return `${validate_component(CommonLabel, "Label").$$render($$result, {}, {}, {
        default: () => {
          return `Valider 2`;
        }
      })}`;
    }
  })}` : ``}

	${correction ? `<div class="${"mt-3"}">${each(simpleCorrection, (line) => {
    return `<div class="${"my-1 z-0 relative"}"${add_attribute("style", `word-break: break-word ;white-space: normal;font-size:${magnify === 1 ? 1.2 : magnify}rem`, 0)}>${validate_component(CorrectionLine, "CorrectionLine").$$render($$result, { line }, {}, {})}
				</div>`;
  })}</div>

		${coms && interactive ? `<div>${each(coms, (com) => {
    return `<!-- HTML_TAG_START -->${com}<!-- HTML_TAG_END -->`;
  })}</div>` : ``}` : ``}
</div>`;
});
const BackCard_svelte_svelte_type_style_lang = "";
const css$2 = {
  code: ".correction-line.svelte-1tafg4s{margin-top:9px;margin-bottom:9px}.correction-line.svelte-1tafg4s:first-child{margin-top:0px;margin-bottom:9px}.correction-line.svelte-1tafg4s:last-child{margin-top:9px;margin-bottom:0px}.correction-title.svelte-1tafg4s{transform:rotate(-45deg)}",
  map: null
};
const BackCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let solution;
  let details;
  let $formatLatex, $$unsubscribe_formatLatex;
  $$unsubscribe_formatLatex = subscribe(formatLatex, (value) => $formatLatex = value);
  let { card } = $$props;
  let { toggleFlip = () => {
  } } = $$props;
  let { h = 0 } = $$props;
  let { w = 0 } = $$props;
  let { height = 0 } = $$props;
  let { width = 0 } = $$props;
  let { magnify } = $$props;
  let { correction } = $$props;
  let { detailedCorrection = null } = $$props;
  let { simpleCorrection = null } = $$props;
  function getSolution(card2) {
    let nSol = -1;
    let s;
    function replaceSol() {
      nSol += 1;
      return math(card2.solutions[nSol]).latex;
    }
    if (card2.choices) {
      if (card2.type === "choices") {
        s = '<div class="flex flex-wrap justify-start">';
        card2.choices.forEach((choice, i) => {
          let color = "grey";
          if (card2.solutions.includes(i)) {
            color = correct_color;
          }
          s += `<span
					class="rounded-lg  m-2 p-1"
					style="border: 4px solid ${color}"
				>`;
          if (choice.image) {
            s += `<img src="${choice.base64}" style="max-width:min(400px,80%);max-height:40vh;" alt="choice ${i}"/>`;
          } else {
            s += `<div class="text-base " style="{font-size:1rem}">`;
            s += choice.text;
            s += "</div>";
          }
          s += "</span>";
        });
        s += "</div>";
      } else {
        s = card2.solutions[0];
        s = card2.choices[s];
        if (s.text) {
          s = s.text;
        } else if (s.image) {
          s = `<img src=${s.image}>`;
        }
      }
    } else {
      if (card2.answerFields && card2.type !== "equation") {
        s = $formatLatex(card2.answerFields.replace(/\?/g, replaceSol));
      } else {
        s = card2.solutions[0];
        s = "$$" + math(s).latex + "$$";
      }
    }
    return s;
  }
  if ($$props.card === void 0 && $$bindings.card && card !== void 0)
    $$bindings.card(card);
  if ($$props.toggleFlip === void 0 && $$bindings.toggleFlip && toggleFlip !== void 0)
    $$bindings.toggleFlip(toggleFlip);
  if ($$props.h === void 0 && $$bindings.h && h !== void 0)
    $$bindings.h(h);
  if ($$props.w === void 0 && $$bindings.w && w !== void 0)
    $$bindings.w(w);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.magnify === void 0 && $$bindings.magnify && magnify !== void 0)
    $$bindings.magnify(magnify);
  if ($$props.correction === void 0 && $$bindings.correction && correction !== void 0)
    $$bindings.correction(correction);
  if ($$props.detailedCorrection === void 0 && $$bindings.detailedCorrection && detailedCorrection !== void 0)
    $$bindings.detailedCorrection(detailedCorrection);
  if ($$props.simpleCorrection === void 0 && $$bindings.simpleCorrection && simpleCorrection !== void 0)
    $$bindings.simpleCorrection(simpleCorrection);
  $$result.css.add(css$2);
  solution = $formatLatex(getSolution(card));
  details = detailedCorrection ? detailedCorrection : [];
  $$unsubscribe_formatLatex();
  return `<div>${validate_component(Paper, "Paper").$$render(
    $$result,
    {
      elevation: 12,
      style: height ? `height:${height}px;` : "" + width ? `width:${width - 48}px;` : ""
    },
    {},
    {
      default: () => {
        return `<div class="${"h-full flex flex-col items-center justify-between"}">

			
			${correction ? `<div class="${"correction-title svelte-1tafg4s"}"${add_attribute("style", ` color:${mdc_colors["lime-500"]};  position:absolute;top:1em; left:0px`, 0)}>D\xE9tails
				</div>
				<div class="${"z-0 relative"}"${add_attribute("style", `font-size:${magnify}rem`, 0)}>
					${each(details, (line) => {
          return `<div class="${"correction-line z-0 svelte-1tafg4s"}">${validate_component(CorrectionLine, "CorrectionLine").$$render($$result, { line }, {}, {})}
						</div>`;
        })}</div>

				<div class="${"w-full flex justify-end"}">${validate_component(Fab, "Fab").$$render($$result, { color: "secondary", mini: true }, {}, {
          default: () => {
            return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
              default: () => {
                return `<path fill="${"currentColor"}"${add_attribute("d", mdiOrbitVariant, 0)}></path>`;
              }
            })}`;
          }
        })}</div>` : `
				<div${add_attribute("style", ` color:${mdc_colors["lime-500"]}; font-size:${magnify}rem`, 0)}>R\xE9ponse :
				</div>
				<div class="${"my-5 z-O relative"}"${add_attribute("style", `font-size:${2 * magnify}rem`, 0)}><!-- HTML_TAG_START -->${solution}<!-- HTML_TAG_END --></div>
				${card.imageCorrection ? `${function(__value) {
          if (is_promise(__value)) {
            __value.then(null, noop);
            return `
						loading image
					`;
          }
          return function(base64) {
            return `
						<div style="${"display:inline-block;background-color:white;"}"><img${add_attribute("src", base64, 0)} class="${"my-3 w-full max-w-lg"}" style="${"max-height:40vh; object-fit: contain;"}" alt="${"Alright Buddy!"}"></div>
					`;
          }(__value);
        }(card.imageCorrectionBase64P)}` : ``}
				${details ? `<div class="${"my-2 z-0 relative"}"${add_attribute("style", `font-size:${magnify}rem`, 0)}>
						${each(details, (line) => {
          return `<div class="${"correction-line z-0 svelte-1tafg4s"}">${validate_component(CorrectionLine, "CorrectionLine").$$render($$result, { line }, {}, {})}
							</div>`;
        })}</div>` : ``}
				<div class="${"mt-3 w-full flex justify-end"}">${validate_component(Fab, "Fab").$$render($$result, { color: "secondary", mini: true }, {}, {
          default: () => {
            return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
              default: () => {
                return `<path fill="${"currentColor"}"${add_attribute("d", mdiOrbitVariant, 0)}></path>`;
              }
            })}`;
          }
        })}</div>`}</div>`;
      }
    }
  )}</div>

`;
});
const FrontCard_svelte_svelte_type_style_lang = "";
const css$1 = {
  code: ".correction-title.svelte-1q0t2nf{transform:rotate(-45deg)}",
  map: null
};
const FrontCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let description;
  let subdescription;
  let $formatLatex, $$unsubscribe_formatLatex;
  $$unsubscribe_formatLatex = subscribe(formatLatex, (value) => $formatLatex = value);
  let { toggleFlip = () => {
  } } = $$props;
  let { card } = $$props;
  let { showDescription } = $$props;
  let { height = 0 } = $$props;
  let { width = 0 } = $$props;
  let { h = 0 } = $$props;
  let { w = 0 } = $$props;
  let { masked = false } = $$props;
  let { interactive } = $$props;
  let { commit = null } = $$props;
  let { magnify } = $$props;
  let { correction } = $$props;
  let { simpleCorrection = null } = $$props;
  let { detailedCorrection = null } = $$props;
  let { immediateCommit = false } = $$props;
  let { flashcard } = $$props;
  if ($$props.toggleFlip === void 0 && $$bindings.toggleFlip && toggleFlip !== void 0)
    $$bindings.toggleFlip(toggleFlip);
  if ($$props.card === void 0 && $$bindings.card && card !== void 0)
    $$bindings.card(card);
  if ($$props.showDescription === void 0 && $$bindings.showDescription && showDescription !== void 0)
    $$bindings.showDescription(showDescription);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.h === void 0 && $$bindings.h && h !== void 0)
    $$bindings.h(h);
  if ($$props.w === void 0 && $$bindings.w && w !== void 0)
    $$bindings.w(w);
  if ($$props.masked === void 0 && $$bindings.masked && masked !== void 0)
    $$bindings.masked(masked);
  if ($$props.interactive === void 0 && $$bindings.interactive && interactive !== void 0)
    $$bindings.interactive(interactive);
  if ($$props.commit === void 0 && $$bindings.commit && commit !== void 0)
    $$bindings.commit(commit);
  if ($$props.magnify === void 0 && $$bindings.magnify && magnify !== void 0)
    $$bindings.magnify(magnify);
  if ($$props.correction === void 0 && $$bindings.correction && correction !== void 0)
    $$bindings.correction(correction);
  if ($$props.simpleCorrection === void 0 && $$bindings.simpleCorrection && simpleCorrection !== void 0)
    $$bindings.simpleCorrection(simpleCorrection);
  if ($$props.detailedCorrection === void 0 && $$bindings.detailedCorrection && detailedCorrection !== void 0)
    $$bindings.detailedCorrection(detailedCorrection);
  if ($$props.immediateCommit === void 0 && $$bindings.immediateCommit && immediateCommit !== void 0)
    $$bindings.immediateCommit(immediateCommit);
  if ($$props.flashcard === void 0 && $$bindings.flashcard && flashcard !== void 0)
    $$bindings.flashcard(flashcard);
  $$result.css.add(css$1);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    description = $formatLatex(card.description);
    subdescription = $formatLatex(card.subdescription);
    $$rendered = `<div>${validate_component(Paper, "Paper").$$render($$result, { elevation: 12 }, {}, {
      default: () => {
        return `<div class="${"flex flex-col justify-between"}"${add_attribute(
          "style",
          height ? `height:${height - 48}px;` : "" + width ? `width:${width - 48}px;` : "",
          0
        )}>${showDescription ? `<div><div class="${"flex items-center justify-between"}"><div class="${"flex justify-left items-center"}"><div style="${"margin-left:3rem"}">${validate_component(Title, "Title").$$render($$result, {}, {}, {
          default: () => {
            return `<span class="${"z-0 relative"}"${add_attribute("style", "color:var(--mdc-theme-primary", 0)}><!-- HTML_TAG_START -->${$formatLatex(description)}<!-- HTML_TAG_END --></span>`;
          }
        })}
								${subdescription ? `${validate_component(Subtitle, "Subtitle").$$render($$result, {}, {}, {
          default: () => {
            return `<span class="${"z-0 relative"}"${add_attribute("style", "color:var(--mdc-theme-on-surface", 0)}><!-- HTML_TAG_START -->${$formatLatex(subdescription)}<!-- HTML_TAG_END --></span>`;
          }
        })}` : ``}</div>
							${validate_component(Button, "Button").$$render(
          $$result,
          {
            color: correction ? "primary" : "secondary",
            class: "ml-3",
            variant: "raised"
          },
          {},
          {
            default: () => {
              return `${validate_component(CommonLabel, "Label").$$render($$result, {}, {}, {
                default: () => {
                  return `C`;
                }
              })}`;
            }
          }
        )}
							${validate_component(Button, "Button").$$render(
          $$result,
          {
            color: interactive ? "primary" : "secondary",
            class: "ml-3",
            variant: "raised"
          },
          {},
          {
            default: () => {
              return `${validate_component(CommonLabel, "Label").$$render($$result, {}, {}, {
                default: () => {
                  return `I`;
                }
              })}`;
            }
          }
        )}</div>
						<span>${escape(card.id)}</span></div>
					<hr class="${"my-3 mx-0"}"></div>` : ``}
			${correction ? `<div class="${"correction-title svelte-1q0t2nf"}"${add_attribute("style", ` color:${mdc_colors["lime-500"]}; font-size:1rem; position:absolute;top:1.5em;left:-6px`, 0)}>Correction
				</div>` : ``}
			${validate_component(Content, "Content").$$render($$result, {}, {}, {
          default: () => {
            return `${validate_component(Question, "Question").$$render(
              $$result,
              {
                question: card,
                masked,
                magnify,
                correction,
                interactive,
                commit,
                immediateCommit,
                simpleCorrection,
                detailedCorrection
              },
              {
                simpleCorrection: ($$value) => {
                  simpleCorrection = $$value;
                  $$settled = false;
                },
                detailedCorrection: ($$value) => {
                  detailedCorrection = $$value;
                  $$settled = false;
                }
              },
              {}
            )}`;
          }
        })}
			${flashcard ? `<div class="${"flex justify-end"}">${validate_component(Fab, "Fab").$$render($$result, { color: "secondary", mini: true }, {}, {
          default: () => {
            return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
              default: () => {
                return `<path fill="${"currentColor"}"${add_attribute("d", mdiOrbitVariant, 0)}></path>`;
              }
            })}`;
          }
        })}</div>` : ``}</div>`;
      }
    })}
</div>`;
  } while (!$$settled);
  $$unsubscribe_formatLatex();
  return $$rendered;
});
const QuestionCard_svelte_svelte_type_style_lang = "";
const css = {
  code: ".card.svelte-1hw1ta0{width:100%;height:100%;perspective:1000px}.flip.svelte-1hw1ta0{transform:rotateY(180deg)}.flipper.svelte-1hw1ta0{transition:0.6s;transform-style:preserve-3d;height:100%;position:relative;width:100%}.front.svelte-1hw1ta0,.back.svelte-1hw1ta0{-webkit-backface-visibility:hidden;backface-visibility:hidden;height:100%;width:100%;position:absolute;top:0;left:0}.front.svelte-1hw1ta0{z-index:2;transform:rotateY(0deg)}.back.svelte-1hw1ta0{transform:rotateY(180deg)}",
  map: null
};
const QuestionCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $fontSize, $$unsubscribe_fontSize;
  $$unsubscribe_fontSize = subscribe(fontSize, (value) => $fontSize = value);
  let { card } = $$props;
  let { interactive = false } = $$props;
  let { flashcard = null } = $$props;
  let { showDescription = false } = $$props;
  let { commit = null } = $$props;
  let { magnify = 1 } = $$props;
  let { correction = false } = $$props;
  let { immediateCommit = false } = $$props;
  let updatedFlashCard;
  let flip = false;
  const toggleFlip = () => flip = !flip;
  let hfront_masked = 0;
  let hback_masked = 0;
  let height;
  let width = 0;
  let simpleCorrection = null;
  let detailedCorrection = null;
  async function updateHeight() {
    height = Math.max(hfront_masked, hback_masked);
  }
  if ($$props.card === void 0 && $$bindings.card && card !== void 0)
    $$bindings.card(card);
  if ($$props.interactive === void 0 && $$bindings.interactive && interactive !== void 0)
    $$bindings.interactive(interactive);
  if ($$props.flashcard === void 0 && $$bindings.flashcard && flashcard !== void 0)
    $$bindings.flashcard(flashcard);
  if ($$props.showDescription === void 0 && $$bindings.showDescription && showDescription !== void 0)
    $$bindings.showDescription(showDescription);
  if ($$props.commit === void 0 && $$bindings.commit && commit !== void 0)
    $$bindings.commit(commit);
  if ($$props.magnify === void 0 && $$bindings.magnify && magnify !== void 0)
    $$bindings.magnify(magnify);
  if ($$props.correction === void 0 && $$bindings.correction && correction !== void 0)
    $$bindings.correction(correction);
  if ($$props.immediateCommit === void 0 && $$bindings.immediateCommit && immediateCommit !== void 0)
    $$bindings.immediateCommit(immediateCommit);
  $$result.css.add(css);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    {
      if (card) {
        updatedFlashCard = flashcard === null ? correction && !!card.correctionDetails && !!card.correctionDetails.length || !interactive && !correction : flashcard;
      }
    }
    {
      if (card) {
        flip = false;
      }
    }
    {
      if (hfront_masked || hback_masked) {
        updateHeight();
      }
    }
    {
      if ($fontSize) {
        height = 0;
      }
    }
    $$rendered = `<div class="${"card svelte-1hw1ta0"}"${add_attribute("style", height ? `height:${height}px;` : "", 0)}><div class="${["flipper svelte-1hw1ta0", flip ? "flip" : ""].join(" ").trim()}"${add_attribute("style", height ? "height:100%;" : "", 0)}><div class="${"front svelte-1hw1ta0"}"${add_attribute("style", height ? "height:100%" : "", 0)}>${validate_component(FrontCard, "FrontCard").$$render(
      $$result,
      {
        card,
        toggleFlip,
        flashcard: updatedFlashCard,
        showDescription,
        height,
        commit,
        magnify,
        immediateCommit,
        interactive,
        correction,
        w: width,
        simpleCorrection,
        detailedCorrection
      },
      {
        interactive: ($$value) => {
          interactive = $$value;
          $$settled = false;
        },
        correction: ($$value) => {
          correction = $$value;
          $$settled = false;
        },
        w: ($$value) => {
          width = $$value;
          $$settled = false;
        },
        simpleCorrection: ($$value) => {
          simpleCorrection = $$value;
          $$settled = false;
        },
        detailedCorrection: ($$value) => {
          detailedCorrection = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div>
		${updatedFlashCard ? `<div class="${"back svelte-1hw1ta0"}"${add_attribute("style", height ? "height:100%;" : "", 0)}>${validate_component(BackCard, "BackCard").$$render(
      $$result,
      {
        card,
        toggleFlip,
        height,
        magnify,
        correction,
        simpleCorrection,
        detailedCorrection
      },
      {},
      {}
    )}</div>` : ``}</div></div>

<div class="${"absolute"}"${add_attribute("style", (width ? `width:${width}px;` : "") + "top:-100%;left:-100000%;", 0)}>
	${validate_component(FrontCard, "FrontCard").$$render(
      $$result,
      {
        card,
        flashcard: updatedFlashCard,
        showDescription,
        masked: true,
        interactive,
        magnify,
        correction,
        immediateCommit,
        h: hfront_masked
      },
      {
        h: ($$value) => {
          hfront_masked = $$value;
          $$settled = false;
        }
      },
      {}
    )}

	${updatedFlashCard ? `${validate_component(BackCard, "BackCard").$$render(
      $$result,
      {
        card,
        magnify,
        correction,
        simpleCorrection,
        detailedCorrection,
        h: hback_masked
      },
      {
        h: ($$value) => {
          hback_masked = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : ``}
</div>`;
  } while (!$$settled);
  $$unsubscribe_fontSize();
  return $$rendered;
});
console.log("env", env);
createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);
getLogger("images", "info");
async function fetchImage(name) {
  let base64;
  {
    console.log("fetch called on server");
  }
  return Promise.resolve(base64);
}
export {
  Badge as B,
  Content as C,
  Fab as F,
  Paper as P,
  Question as Q,
  Subtitle as S,
  Title as T,
  generateQuestion as a,
  grades as b,
  gradeMatchesClass as c,
  datas as d,
  exclude as e,
  fetchImage as f,
  getQuestion as g,
  CommonLabel as h,
  QuestionCard as i,
  STATUS_CORRECT as j,
  STATUS_UNOPTIMAL_FORM as k,
  Button as l,
  prefixFilter as p
};
