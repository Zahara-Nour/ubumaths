import { d as darkmode } from "./stores.js";
import { p as listen, q as bubble, r as prevent_default, t as stop_propagation, c as create_ssr_component, d as compute_rest_props, f as get_current_component, g as getContext, v as validate_component, m as missing_component, h as spread, j as escape_object, k as add_attribute, u as is_void, s as setContext, o as onDestroy, w as globals } from "./index.js";
import { MDCRippleFoundation, util } from "@material/ripple";
import { events, ponyfill } from "@material/dom";
const mdc_colors = {
  "red-50": "#ffebee",
  "red-100": "#ffcdd2",
  "red-200": "#ef9a9a",
  "red-300": "#e57373",
  "red-400": "#ef5350",
  "red-500": "#f44336",
  "red-600": "#e53935",
  "red-700": "#d32f2f",
  "red-800": "#c62828",
  "red-900": "#b71c1c",
  "red-a100": "#ff8a80",
  "red-a200": "#ff5252",
  "red-a400": "#ff1744",
  "red-a700": "#d50000",
  "pink-50": "#fce4ec",
  "pink-100": "#f8bbd0",
  "pink-200": "#f48fb1",
  "pink-300": "#f06292",
  "pink-400": "#ec407a",
  "pink-500": "#e91e63",
  "pink-600": "#d81b60",
  "pink-700": "#c2185b",
  "pink-800": "#ad1457",
  "pink-900": "#880e4f",
  "pink-a100": "#ff80ab",
  "pink-a200": "#ff4081",
  "pink-a400": "#f50057",
  "pink-a700": "#c51162",
  "purple-50": "#f3e5f5",
  "purple-100": "#e1bee7",
  "purple-200": "#ce93d8",
  "purple-300": "#ba68c8",
  "purple-400": "#ab47bc",
  "purple-500": "#9c27b0",
  "purple-600": "#8e24aa",
  "purple-700": "#7b1fa2",
  "purple-800": "#6a1b9a",
  "purple-900": "#4a148c",
  "purple-a100": "#ea80fc",
  "purple-a200": "#e040fb",
  "purple-a400": "#d500f9",
  "purple-a700": "#a0f",
  "deep-purple-50": "#ede7f6",
  "deep-purple-100": "#d1c4e9",
  "deep-purple-200": "#b39ddb",
  "deep-purple-300": "#9575cd",
  "deep-purple-400": "#7e57c2",
  "deep-purple-500": "#673ab7",
  "deep-purple-600": "#5e35b1",
  "deep-purple-700": "#512da8",
  "deep-purple-800": "#4527a0",
  "deep-purple-900": "#311b92",
  "deep-purple-a100": "#b388ff",
  "deep-purple-a200": "#7c4dff",
  "deep-purple-a400": "#651fff",
  "deep-purple-a700": "#6200ea",
  "indigo-50": "#e8eaf6",
  "indigo-100": "#c5cae9",
  "indigo-200": "#9fa8da",
  "indigo-300": "#7986cb",
  "indigo-400": "#5c6bc0",
  "indigo-500": "#3f51b5",
  "indigo-600": "#3949ab",
  "indigo-700": "#303f9f",
  "indigo-800": "#283593",
  "indigo-900": "#1a237e",
  "indigo-a100": "#8c9eff",
  "indigo-a200": "#536dfe",
  "indigo-a400": "#3d5afe",
  "indigo-a700": "#304ffe",
  "blue-50": "#e3f2fd",
  "blue-100": "#bbdefb",
  "blue-200": "#90caf9",
  "blue-300": "#64b5f6",
  "blue-400": "#42a5f5",
  "blue-500": "#2196f3",
  "blue-600": "#1e88e5",
  "blue-700": "#1976d2",
  "blue-800": "#1565c0",
  "blue-900": "#0d47a1",
  "blue-a100": "#82b1ff",
  "blue-a200": "#448aff",
  "blue-a400": "#2979ff",
  "blue-a700": "#2962ff",
  "light-blue-50": "#e1f5fe",
  "light-blue-100": "#b3e5fc",
  "light-blue-200": "#81d4fa",
  "light-blue-300": "#4fc3f7",
  "light-blue-400": "#29b6f6",
  "light-blue-500": "#03a9f4",
  "light-blue-600": "#039be5",
  "light-blue-700": "#0288d1",
  "light-blue-800": "#0277bd",
  "light-blue-900": "#01579b",
  "light-blue-a100": "#80d8ff",
  "light-blue-a200": "#40c4ff",
  "light-blue-a400": "#00b0ff",
  "light-blue-a700": "#0091ea",
  "cyan-50": "#e0f7fa",
  "cyan-100": "#b2ebf2",
  "cyan-200": "#80deea",
  "cyan-300": "#4dd0e1",
  "cyan-400": "#26c6da",
  "cyan-500": "#00bcd4",
  "cyan-600": "#00acc1",
  "cyan-700": "#0097a7",
  "cyan-800": "#00838f",
  "cyan-900": "#006064",
  "cyan-a100": "#84ffff",
  "cyan-a200": "#18ffff",
  "cyan-a400": "#00e5ff",
  "cyan-a700": "#00b8d4",
  "teal-50": "#e0f2f1",
  "teal-100": "#b2dfdb",
  "teal-200": "#80cbc4",
  "teal-300": "#4db6ac",
  "teal-400": "#26a69a",
  "teal-500": "#009688",
  "teal-600": "#00897b",
  "teal-700": "#00796b",
  "teal-800": "#00695c",
  "teal-900": "#004d40",
  "teal-a100": "#a7ffeb",
  "teal-a200": "#64ffda",
  "teal-a400": "#1de9b6",
  "teal-a700": "#00bfa5",
  "green-50": "#e8f5e9",
  "green-100": "#c8e6c9",
  "green-200": "#a5d6a7",
  "green-300": "#81c784",
  "green-400": "#66bb6a",
  "green-500": "#4caf50",
  "green-600": "#43a047",
  "green-700": "#388e3c",
  "green-800": "#2e7d32",
  "green-900": "#1b5e20",
  "green-a100": "#b9f6ca",
  "green-a200": "#69f0ae",
  "green-a400": "#00e676",
  "green-a700": "#00c853",
  "light-green-50": "#f1f8e9",
  "light-green-100": "#dcedc8",
  "light-green-200": "#c5e1a5",
  "light-green-300": "#aed581",
  "light-green-400": "#9ccc65",
  "light-green-500": "#8bc34a",
  "light-green-600": "#7cb342",
  "light-green-700": "#689f38",
  "light-green-800": "#558b2f",
  "light-green-900": "#33691e",
  "light-green-a100": "#ccff90",
  "light-green-a200": "#b2ff59",
  "light-green-a400": "#76ff03",
  "light-green-a700": "#64dd17",
  "lime-50": "#f9fbe7",
  "lime-100": "#f0f4c3",
  "lime-200": "#e6ee9c",
  "lime-300": "#dce775",
  "lime-400": "#d4e157",
  "lime-500": "#cddc39",
  "lime-600": "#c0ca33",
  "lime-700": "#afb42b",
  "lime-800": "#9e9d24",
  "lime-900": "#827717",
  "lime-a100": "#f4ff81",
  "lime-a200": "#eeff41",
  "lime-a400": "#c6ff00",
  "lime-a700": "#aeea00",
  "yellow-50": "#fffde7",
  "yellow-100": "#fff9c4",
  "yellow-200": "#fff59d",
  "yellow-300": "#fff176",
  "yellow-400": "#ffee58",
  "yellow-500": "#ffeb3b",
  "yellow-600": "#fdd835",
  "yellow-700": "#fbc02d",
  "yellow-800": "#f9a825",
  "yellow-900": "#f57f17",
  "yellow-a100": "#ffff8d",
  "yellow-a200": "#ff0",
  "yellow-a400": "#ffea00",
  "yellow-a700": "#ffd600",
  "amber-50": "#fff8e1",
  "amber-100": "#ffecb3",
  "amber-200": "#ffe082",
  "amber-300": "#ffd54f",
  "amber-400": "#ffca28",
  "amber-500": "#ffc107",
  "amber-600": "#ffb300",
  "amber-700": "#ffa000",
  "amber-800": "#ff8f00",
  "amber-900": "#ff6f00",
  "amber-a100": "#ffe57f",
  "amber-a200": "#ffd740",
  "amber-a400": "#ffc400",
  "amber-a700": "#ffab00",
  "orange-50": "#fff3e0",
  "orange-100": "#ffe0b2",
  "orange-200": "#ffcc80",
  "orange-300": "#ffb74d",
  "orange-400": "#ffa726",
  "orange-500": "#ff9800",
  "orange-600": "#fb8c00",
  "orange-700": "#f57c00",
  "orange-800": "#ef6c00",
  "orange-900": "#e65100",
  "orange-a100": "#ffd180",
  "orange-a200": "#ffab40",
  "orange-a400": "#ff9100",
  "orange-a700": "#ff6d00",
  "deep-orange-50": "#fbe9e7",
  "deep-orange-100": "#ffccbc",
  "deep-orange-200": "#ffab91",
  "deep-orange-300": "#ff8a65",
  "deep-orange-400": "#ff7043",
  "deep-orange-500": "#ff5722",
  "deep-orange-600": "#f4511e",
  "deep-orange-700": "#e64a19",
  "deep-orange-800": "#d84315",
  "deep-orange-900": "#bf360c",
  "deep-orange-a100": "#ff9e80",
  "deep-orange-a200": "#ff6e40",
  "deep-orange-a400": "#ff3d00",
  "deep-orange-a700": "#dd2c00",
  "brown-50": "#efebe9",
  "brown-100": "#d7ccc8",
  "brown-200": "#bcaaa4",
  "brown-300": "#a1887f",
  "brown-400": "#8d6e63",
  "brown-500": "#795548",
  "brown-600": "#6d4c41",
  "brown-700": "#5d4037",
  "brown-800": "#4e342e",
  "brown-900": "#3e2723",
  "grey-50": "#fafafa",
  "grey-100": "#f5f5f5",
  "grey-200": "#eee",
  "grey-300": "#e0e0e0",
  "grey-400": "#bdbdbd",
  "grey-500": "#9e9e9e",
  "grey-600": "#757575",
  "grey-700": "#616161",
  "grey-800": "#424242",
  "grey-900": "#212121",
  "blue-grey-50": "#eceff1",
  "blue-grey-100": "#cfd8dc",
  "blue-grey-200": "#b0bec5",
  "blue-grey-300": "#90a4ae",
  "blue-grey-400": "#78909c",
  "blue-grey-500": "#607d8b",
  "blue-grey-600": "#546e7a",
  "blue-grey-700": "#455a64",
  "blue-grey-800": "#37474f",
  "blue-grey-900": "#263238"
};
let correct_color;
let unoptimal_color;
let incorrect_color;
let color1;
let color2;
let color3;
darkmode.subscribe((dark) => {
  if (dark) {
    correct_color = mdc_colors["lime-500"];
    unoptimal_color = mdc_colors["amber-300"];
    incorrect_color = mdc_colors["red-400"];
    color1 = mdc_colors["red-500"];
    color2 = mdc_colors["red-500"];
    color3 = mdc_colors["red-500"];
  } else {
    correct_color = mdc_colors["green-500"];
    unoptimal_color = mdc_colors["amber-400"];
    incorrect_color = mdc_colors["red-400"];
    color1 = mdc_colors["orange-300"];
    color2 = mdc_colors["teal-400"];
    color3 = mdc_colors["pink-300"];
  }
});
function classMap(classObj) {
  return Object.entries(classObj).filter(([name, value]) => name !== "" && value).map(([name]) => name).join(" ");
}
const oldModifierRegex = /^[a-z]+(?::(?:preventDefault|stopPropagation|passive|nonpassive|capture|once|self))+$/;
const newModifierRegex = /^[^$]+(?:\$(?:preventDefault|stopPropagation|passive|nonpassive|capture|once|self))+$/;
function forwardEventsBuilder(component) {
  let $on;
  let events2 = [];
  component.$on = (fullEventType, callback) => {
    let eventType = fullEventType;
    let destructor = () => {
    };
    if ($on) {
      destructor = $on(eventType, callback);
    } else {
      events2.push([eventType, callback]);
    }
    const oldModifierMatch = eventType.match(oldModifierRegex);
    if (oldModifierMatch && console) {
      console.warn('Event modifiers in SMUI now use "$" instead of ":", so that all events can be bound with modifiers. Please update your event binding: ', eventType);
    }
    return () => {
      destructor();
    };
  };
  function forward(e) {
    bubble(component, e);
  }
  return (node) => {
    const destructors = [];
    const forwardDestructors = {};
    $on = (fullEventType, callback) => {
      let eventType = fullEventType;
      let handler = callback;
      let options = false;
      const oldModifierMatch = eventType.match(oldModifierRegex);
      const newModifierMatch = eventType.match(newModifierRegex);
      const modifierMatch = oldModifierMatch || newModifierMatch;
      if (eventType.match(/^SMUI:\w+:/)) {
        const newEventTypeParts = eventType.split(":");
        let newEventType = "";
        for (let i = 0; i < newEventTypeParts.length; i++) {
          newEventType += i === newEventTypeParts.length - 1 ? ":" + newEventTypeParts[i] : newEventTypeParts[i].split("-").map((value) => value.slice(0, 1).toUpperCase() + value.slice(1)).join("");
        }
        console.warn(`The event ${eventType.split("$")[0]} has been renamed to ${newEventType.split("$")[0]}.`);
        eventType = newEventType;
      }
      if (modifierMatch) {
        const parts = eventType.split(oldModifierMatch ? ":" : "$");
        eventType = parts[0];
        const eventOptions = parts.slice(1).reduce((obj, mod) => {
          obj[mod] = true;
          return obj;
        }, {});
        if (eventOptions.passive) {
          options = options || {};
          options.passive = true;
        }
        if (eventOptions.nonpassive) {
          options = options || {};
          options.passive = false;
        }
        if (eventOptions.capture) {
          options = options || {};
          options.capture = true;
        }
        if (eventOptions.once) {
          options = options || {};
          options.once = true;
        }
        if (eventOptions.preventDefault) {
          handler = prevent_default(handler);
        }
        if (eventOptions.stopPropagation) {
          handler = stop_propagation(handler);
        }
      }
      const off = listen(node, eventType, handler, options);
      const destructor = () => {
        off();
        const idx = destructors.indexOf(destructor);
        if (idx > -1) {
          destructors.splice(idx, 1);
        }
      };
      destructors.push(destructor);
      if (!(eventType in forwardDestructors)) {
        forwardDestructors[eventType] = listen(node, eventType, forward);
      }
      return destructor;
    };
    for (let i = 0; i < events2.length; i++) {
      $on(events2[i][0], events2[i][1]);
    }
    return {
      destroy: () => {
        for (let i = 0; i < destructors.length; i++) {
          destructors[i]();
        }
        for (let entry of Object.entries(forwardDestructors)) {
          entry[1]();
        }
      }
    };
  };
}
const CommonIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "on", "component", "tag", "getElement"]);
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { on = false } = $$props;
  let element;
  let { component = SmuiElement } = $$props;
  let { tag = component === SmuiElement ? "i" : void 0 } = $$props;
  const svg = component === Svg;
  const context = getContext("SMUI:icon:context");
  function getElement() {
    return element.getElement();
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.on === void 0 && $$bindings.on && on !== void 0)
    $$bindings.on(on);
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
            "mdc-button__icon": context === "button",
            "mdc-fab__icon": context === "fab",
            "mdc-icon-button__icon": context === "icon-button",
            "mdc-icon-button__icon--on": context === "icon-button" && on,
            "mdc-tab__icon": context === "tab",
            "mdc-banner__icon": context === "banner",
            "mdc-segmented-button__icon": context === "segmented-button"
          })
        },
        { "aria-hidden": "true" },
        svg ? { focusable: "false", tabindex: "-1" } : {},
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
const SmuiElement = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let selfClosing;
  let $$restProps = compute_rest_props($$props, ["use", "tag", "getElement"]);
  let { use = [] } = $$props;
  let { tag } = $$props;
  forwardEventsBuilder(get_current_component());
  let element;
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.tag === void 0 && $$bindings.tag && tag !== void 0)
    $$bindings.tag(tag);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  selfClosing = [
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
  ].indexOf(tag) > -1;
  return `${selfClosing ? `${((tag$1) => {
    return tag$1 ? `<${tag}${spread([escape_object($$restProps)], {})}${add_attribute("this", element, 0)}>${is_void(tag$1) ? "" : ``}${is_void(tag$1) ? "" : `</${tag$1}>`}` : "";
  })(tag)}` : `${((tag$1) => {
    return tag$1 ? `<${tag}${spread([escape_object($$restProps)], {})}${add_attribute("this", element, 0)}>${is_void(tag$1) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag$1) ? "" : `</${tag$1}>`}` : "";
  })(tag)}`}`;
});
const Svg = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "getElement"]);
  let { use = [] } = $$props;
  forwardEventsBuilder(get_current_component());
  let element;
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<svg${spread([escape_object($$restProps)], {})}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}</svg>`;
});
const { Object: Object_1 } = globals;
const internals = {
  component: SmuiElement,
  tag: "div",
  class: "",
  classMap: {},
  contexts: {},
  props: {}
};
const ClassAdder = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "component", "tag", "getElement"]);
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let element;
  const smuiClass = internals.class;
  const smuiClassMap = {};
  const smuiClassUnsubscribes = [];
  const contexts = internals.contexts;
  const props = internals.props;
  let { component = internals.component } = $$props;
  let { tag = component === SmuiElement ? internals.tag : void 0 } = $$props;
  Object.entries(internals.classMap).forEach(([name, context]) => {
    const store = getContext(context);
    if (store && "subscribe" in store) {
      smuiClassUnsubscribes.push(store.subscribe((value) => {
        smuiClassMap[name] = value;
      }));
    }
  });
  const forwardEvents = forwardEventsBuilder(get_current_component());
  for (let context in contexts) {
    if (contexts.hasOwnProperty(context)) {
      setContext(context, contexts[context]);
    }
  }
  onDestroy(() => {
    for (const unsubscribe of smuiClassUnsubscribes) {
      unsubscribe();
    }
  });
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
      Object_1.assign(
        { tag },
        { use: [forwardEvents, ...use] },
        {
          class: classMap({
            [className]: true,
            [smuiClass]: true,
            ...smuiClassMap
          })
        },
        props,
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
const defaults = Object.assign({}, internals);
function classAdderBuilder(props) {
  return new Proxy(ClassAdder, {
    construct: function(target, args) {
      Object.assign(internals, defaults, props);
      return new target(...args);
    },
    get: function(target, prop) {
      Object.assign(internals, defaults, props);
      return target[prop];
    }
  });
}
const { applyPassive } = events;
const { matches } = ponyfill;
function Ripple(node, { ripple = true, surface = false, unbounded = false, disabled = false, color, active, rippleElement, eventTarget, activeTarget, addClass = (className) => node.classList.add(className), removeClass = (className) => node.classList.remove(className), addStyle = (name, value) => node.style.setProperty(name, value), initPromise = Promise.resolve() } = {}) {
  let instance;
  let addLayoutListener = getContext("SMUI:addLayoutListener");
  let removeLayoutListener;
  let oldActive = active;
  let oldEventTarget = eventTarget;
  let oldActiveTarget = activeTarget;
  function handleProps() {
    if (surface) {
      addClass("mdc-ripple-surface");
      if (color === "primary") {
        addClass("smui-ripple-surface--primary");
        removeClass("smui-ripple-surface--secondary");
      } else if (color === "secondary") {
        removeClass("smui-ripple-surface--primary");
        addClass("smui-ripple-surface--secondary");
      } else {
        removeClass("smui-ripple-surface--primary");
        removeClass("smui-ripple-surface--secondary");
      }
    } else {
      removeClass("mdc-ripple-surface");
      removeClass("smui-ripple-surface--primary");
      removeClass("smui-ripple-surface--secondary");
    }
    if (instance && oldActive !== active) {
      oldActive = active;
      if (active) {
        instance.activate();
      } else if (active === false) {
        instance.deactivate();
      }
    }
    if (ripple && !instance) {
      instance = new MDCRippleFoundation({
        addClass,
        browserSupportsCssVars: () => util.supportsCssVariables(window),
        computeBoundingRect: () => (rippleElement || node).getBoundingClientRect(),
        containsEventTarget: (target) => node.contains(target),
        deregisterDocumentInteractionHandler: (evtType, handler) => document.documentElement.removeEventListener(evtType, handler, applyPassive()),
        deregisterInteractionHandler: (evtType, handler) => (eventTarget || node).removeEventListener(evtType, handler, applyPassive()),
        deregisterResizeHandler: (handler) => window.removeEventListener("resize", handler),
        getWindowPageOffset: () => ({
          x: window.pageXOffset,
          y: window.pageYOffset
        }),
        isSurfaceActive: () => active == null ? matches(activeTarget || node, ":active") : active,
        isSurfaceDisabled: () => !!disabled,
        isUnbounded: () => !!unbounded,
        registerDocumentInteractionHandler: (evtType, handler) => document.documentElement.addEventListener(evtType, handler, applyPassive()),
        registerInteractionHandler: (evtType, handler) => (eventTarget || node).addEventListener(evtType, handler, applyPassive()),
        registerResizeHandler: (handler) => window.addEventListener("resize", handler),
        removeClass,
        updateCssVariable: addStyle
      });
      initPromise.then(() => {
        if (instance) {
          instance.init();
          instance.setUnbounded(unbounded);
        }
      });
    } else if (instance && !ripple) {
      initPromise.then(() => {
        if (instance) {
          instance.destroy();
          instance = void 0;
        }
      });
    }
    if (instance && (oldEventTarget !== eventTarget || oldActiveTarget !== activeTarget)) {
      oldEventTarget = eventTarget;
      oldActiveTarget = activeTarget;
      instance.destroy();
      requestAnimationFrame(() => {
        if (instance) {
          instance.init();
          instance.setUnbounded(unbounded);
        }
      });
    }
    if (!ripple && unbounded) {
      addClass("mdc-ripple-upgraded--unbounded");
    }
  }
  handleProps();
  if (addLayoutListener) {
    removeLayoutListener = addLayoutListener(layout);
  }
  function layout() {
    if (instance) {
      instance.layout();
    }
  }
  return {
    update(props) {
      ({
        ripple,
        surface,
        unbounded,
        disabled,
        color,
        active,
        rippleElement,
        eventTarget,
        activeTarget,
        addClass,
        removeClass,
        addStyle,
        initPromise
      } = Object.assign({ ripple: true, surface: false, unbounded: false, disabled: false, color: void 0, active: void 0, rippleElement: void 0, eventTarget: void 0, activeTarget: void 0, addClass: (className) => node.classList.add(className), removeClass: (className) => node.classList.remove(className), addStyle: (name, value) => node.style.setProperty(name, value), initPromise: Promise.resolve() }, props));
      handleProps();
    },
    destroy() {
      if (instance) {
        instance.destroy();
        instance = void 0;
        removeClass("mdc-ripple-surface");
        removeClass("smui-ripple-surface--primary");
        removeClass("smui-ripple-surface--secondary");
      }
      if (removeLayoutListener) {
        removeLayoutListener();
      }
    }
  };
}
export {
  CommonIcon as C,
  Ripple as R,
  SmuiElement as S,
  classAdderBuilder as a,
  Svg as b,
  classMap as c,
  color1 as d,
  color2 as e,
  forwardEventsBuilder as f,
  correct_color as g,
  color3 as h,
  incorrect_color as i,
  mdc_colors as m,
  unoptimal_color as u
};
