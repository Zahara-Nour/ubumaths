import { c as create_ssr_component, d as compute_rest_props, f as get_current_component, g as getContext, h as spread, i as escape_attribute_value, j as escape_object, k as add_attribute, s as setContext, v as validate_component, m as missing_component, w as globals, l as each, b as subscribe, x as set_store_value, y as compute_slots, o as onDestroy, e as escape } from "../../../../chunks/index.js";
import { f as forwardEventsBuilder, c as classMap, R as Ripple, S as SmuiElement, a as classAdderBuilder, C as CommonIcon, b as Svg } from "../../../../chunks/Ripple.js";
import { e as exclude, p as prefixFilter, P as Paper, F as Fab, B as Badge, g as getQuestion, T as Title, S as Subtitle, C as Content, Q as Question, a as generateQuestion, d as datas, b as grades, f as fetchImage, c as gradeMatchesClass, h as CommonLabel, i as QuestionCard } from "../../../../chunks/images.js";
import { MDCFadingTabIndicatorFoundation, MDCSlidingTabIndicatorFoundation } from "@material/tab-indicator";
import { w as writable } from "../../../../chunks/index2.js";
import { d as dispatch, L as List, I as Item, a as IconButton } from "../../../../chunks/Subheader.js";
import { mdiLink, mdiNewspaperVariantOutline, mdiRunFast, mdiProjectorScreen, mdiFlash, mdiHelp, mdiBasketPlus, mdiTrashCanOutline, mdiBasket, mdiRocketLaunchOutline, mdiMinus, mdiPlus } from "@mdi/js";
import { g as getLogger } from "../../../../chunks/utils.js";
import { f as formatLatex, d as darkmode } from "../../../../chunks/stores.js";
import { p as page } from "../../../../chunks/stores2.js";
const Graphic = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "getElement"]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let element;
  let menuSelectionGroup = getContext("SMUI:list:graphic:menu-selection-group");
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<span${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-deprecated-list-item__graphic": true,
          "mdc-menu__selection-group-icon": menuSelectionGroup
        }))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}</span>`;
});
function guard(name) {
  return () => {
    throw new Error(`Cannot call ${name}(...) on the server`);
  };
}
const goto = guard("goto");
const TabIndicator = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "active",
    "type",
    "transition",
    "content$use",
    "content$class",
    "activate",
    "deactivate",
    "computeContentClientRect",
    "getElement"
  ]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { active = false } = $$props;
  let { type = "underline" } = $$props;
  let { transition = "slide" } = $$props;
  let { content$use = [] } = $$props;
  let { content$class = "" } = $$props;
  let element;
  let instance;
  let content;
  let internalClasses = {};
  let contentStyles = {};
  let changeSets = [];
  let oldTransition = transition;
  function getInstance() {
    const Foundation = {
      fade: MDCFadingTabIndicatorFoundation,
      slide: MDCSlidingTabIndicatorFoundation
    }[transition] || MDCSlidingTabIndicatorFoundation;
    return new Foundation({
      addClass: (...props) => doChange(() => addClass(...props)),
      removeClass: (...props) => doChange(() => removeClass(...props)),
      computeContentClientRect,
      setContentStyleProperty: (...props) => doChange(() => addContentStyle(...props))
    });
  }
  function doChange(fn) {
    if (changeSets.length) {
      changeSets[changeSets.length - 1].push(fn);
    } else {
      fn();
    }
  }
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
  function addContentStyle(name, value) {
    if (contentStyles[name] != value) {
      if (value === "" || value == null) {
        delete contentStyles[name];
        contentStyles = contentStyles;
      } else {
        contentStyles[name] = value;
      }
    }
  }
  function activate(previousIndicatorClientRect) {
    active = true;
    instance.activate(previousIndicatorClientRect);
  }
  function deactivate() {
    active = false;
    instance.deactivate();
  }
  function computeContentClientRect() {
    changeSets.push([]);
    changeSets = changeSets;
    return content.getBoundingClientRect();
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.active === void 0 && $$bindings.active && active !== void 0)
    $$bindings.active(active);
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.content$use === void 0 && $$bindings.content$use && content$use !== void 0)
    $$bindings.content$use(content$use);
  if ($$props.content$class === void 0 && $$bindings.content$class && content$class !== void 0)
    $$bindings.content$class(content$class);
  if ($$props.activate === void 0 && $$bindings.activate && activate !== void 0)
    $$bindings.activate(activate);
  if ($$props.deactivate === void 0 && $$bindings.deactivate && deactivate !== void 0)
    $$bindings.deactivate(deactivate);
  if ($$props.computeContentClientRect === void 0 && $$bindings.computeContentClientRect && computeContentClientRect !== void 0)
    $$bindings.computeContentClientRect(computeContentClientRect);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  {
    if (oldTransition !== transition) {
      oldTransition = transition;
      instance && instance.destroy();
      internalClasses = {};
      contentStyles = {};
      instance = getInstance();
      instance.init();
    }
  }
  {
    if (changeSets.length) {
      requestAnimationFrame(() => {
        var _a;
        const changeSet = (_a = changeSets.shift()) !== null && _a !== void 0 ? _a : [];
        changeSets = changeSets;
        for (const fn of changeSet) {
          fn();
        }
      });
    }
  }
  return `<span${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-tab-indicator": true,
          "mdc-tab-indicator--active": active,
          "mdc-tab-indicator--fade": transition === "fade",
          ...internalClasses
        }))
      },
      escape_object(exclude($$restProps, ["content$"]))
    ],
    {}
  )}${add_attribute("this", element, 0)}><span${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [content$class]: true,
          "mdc-tab-indicator__content": true,
          "mdc-tab-indicator__content--underline": type === "underline",
          "mdc-tab-indicator__content--icon": type === "icon"
        }))
      },
      {
        style: escape_attribute_value(Object.entries(contentStyles).map(([name, value]) => `${name}: ${value};`).join(" "))
      },
      {
        "aria-hidden": escape_attribute_value(type === "icon" ? "true" : void 0)
      },
      escape_object(prefixFilter($$restProps, "content$"))
    ],
    {}
  )}${add_attribute("this", content, 0)}>${slots.default ? slots.default({}) : ``}</span>
</span>`;
});
const { Object: Object_1$2 } = globals;
const Tab = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "style",
    "tab",
    "ripple",
    "stacked",
    "minWidth",
    "indicatorSpanOnlyContent",
    "href",
    "content$use",
    "content$class",
    "component",
    "tag",
    "activate",
    "deactivate",
    "focus",
    "getElement"
  ]);
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { tab: tabId } = $$props;
  let { ripple = true } = $$props;
  let { stacked = false } = $$props;
  let { minWidth = false } = $$props;
  let { indicatorSpanOnlyContent = false } = $$props;
  let { href = void 0 } = $$props;
  let { content$use = [] } = $$props;
  let { content$class = "" } = $$props;
  let element;
  let instance;
  let content;
  let tabIndicator;
  let internalClasses = {};
  let internalStyles = {};
  let internalAttrs = {};
  let focusOnActivate = getContext("SMUI:tab:focusOnActivate");
  let active = tabId === getContext("SMUI:tab:initialActive");
  let forceAccessible = false;
  let { component = SmuiElement } = $$props;
  let { tag = component === SmuiElement ? href == null ? "button" : "a" : void 0 } = $$props;
  setContext("SMUI:label:context", "tab");
  setContext("SMUI:icon:context", "tab");
  if (!tabId) {
    throw new Error("The tab property is required! It should be passed down from the TabBar to the Tab.");
  }
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
  function activate(previousIndicatorClientRect, skipFocus) {
    active = true;
    if (skipFocus) {
      instance.setFocusOnActivate(false);
    }
    instance.activate(previousIndicatorClientRect);
    if (skipFocus) {
      instance.setFocusOnActivate(focusOnActivate);
    }
  }
  function deactivate() {
    active = false;
    instance.deactivate();
  }
  function focus() {
    getElement().focus();
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
  if ($$props.tab === void 0 && $$bindings.tab && tabId !== void 0)
    $$bindings.tab(tabId);
  if ($$props.ripple === void 0 && $$bindings.ripple && ripple !== void 0)
    $$bindings.ripple(ripple);
  if ($$props.stacked === void 0 && $$bindings.stacked && stacked !== void 0)
    $$bindings.stacked(stacked);
  if ($$props.minWidth === void 0 && $$bindings.minWidth && minWidth !== void 0)
    $$bindings.minWidth(minWidth);
  if ($$props.indicatorSpanOnlyContent === void 0 && $$bindings.indicatorSpanOnlyContent && indicatorSpanOnlyContent !== void 0)
    $$bindings.indicatorSpanOnlyContent(indicatorSpanOnlyContent);
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.content$use === void 0 && $$bindings.content$use && content$use !== void 0)
    $$bindings.content$use(content$use);
  if ($$props.content$class === void 0 && $$bindings.content$class && content$class !== void 0)
    $$bindings.content$class(content$class);
  if ($$props.component === void 0 && $$bindings.component && component !== void 0)
    $$bindings.component(component);
  if ($$props.tag === void 0 && $$bindings.tag && tag !== void 0)
    $$bindings.tag(tag);
  if ($$props.activate === void 0 && $$bindings.activate && activate !== void 0)
    $$bindings.activate(activate);
  if ($$props.deactivate === void 0 && $$bindings.deactivate && deactivate !== void 0)
    $$bindings.deactivate(deactivate);
  if ($$props.focus === void 0 && $$bindings.focus && focus !== void 0)
    $$bindings.focus(focus);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${validate_component(component || missing_component, "svelte:component").$$render(
      $$result,
      Object_1$2.assign(
        { tag },
        {
          use: [
            [
              Ripple,
              {
                ripple,
                unbounded: false,
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
            "mdc-tab": true,
            "mdc-tab--active": active,
            "mdc-tab--stacked": stacked,
            "mdc-tab--min-width": minWidth,
            ...internalClasses
          })
        },
        {
          style: Object.entries(internalStyles).map(([name, value]) => `${name}: ${value};`).concat([style]).join(" ")
        },
        { role: "tab" },
        {
          "aria-selected": active ? "true" : "false"
        },
        {
          tabindex: active || forceAccessible ? "0" : "-1"
        },
        { href },
        internalAttrs,
        exclude($$restProps, ["content$", "tabIndicator$"]),
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
          return `<span${spread(
            [
              {
                class: escape_attribute_value(classMap({
                  [content$class]: true,
                  "mdc-tab__content": true
                }))
              },
              escape_object(prefixFilter($$restProps, "content$"))
            ],
            {}
          )}${add_attribute("this", content, 0)}>${slots.default ? slots.default({}) : ``}
    ${indicatorSpanOnlyContent ? `${validate_component(TabIndicator, "TabIndicator").$$render(
            $$result,
            Object_1$2.assign({ active }, prefixFilter($$restProps, "tabIndicator$"), { this: tabIndicator }),
            {
              this: ($$value) => {
                tabIndicator = $$value;
                $$settled = false;
              }
            },
            {
              default: () => {
                return `${slots["tab-indicator"] ? slots["tab-indicator"]({}) : ``}`;
              }
            }
          )}` : ``}</span>
  ${!indicatorSpanOnlyContent ? `${validate_component(TabIndicator, "TabIndicator").$$render(
            $$result,
            Object_1$2.assign({ active }, prefixFilter($$restProps, "tabIndicator$"), { this: tabIndicator }),
            {
              this: ($$value) => {
                tabIndicator = $$value;
                $$settled = false;
              }
            },
            {
              default: () => {
                return `${slots["tab-indicator"] ? slots["tab-indicator"]({}) : ``}`;
              }
            }
          )}` : ``}
  <span class="${"mdc-tab__ripple"}"></span>`;
        }
      }
    )}`;
  } while (!$$settled);
  return $$rendered;
});
const TabScroller = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "align",
    "scrollArea$use",
    "scrollArea$class",
    "scrollContent$use",
    "scrollContent$class",
    "getScrollPosition",
    "getScrollContentWidth",
    "incrementScroll",
    "scrollTo",
    "getElement"
  ]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { align = void 0 } = $$props;
  let { scrollArea$use = [] } = $$props;
  let { scrollArea$class = "" } = $$props;
  let { scrollContent$use = [] } = $$props;
  let { scrollContent$class = "" } = $$props;
  let element;
  let instance;
  let scrollArea;
  let scrollContent;
  let internalClasses = {};
  let scrollAreaClasses = {};
  let scrollAreaStyles = {};
  let scrollContentStyles = {};
  function getScrollPosition() {
    return instance.getScrollPosition();
  }
  function getScrollContentWidth() {
    return scrollContent.offsetWidth;
  }
  function incrementScroll(scrollXIncrement) {
    instance.incrementScroll(scrollXIncrement);
  }
  function scrollTo(scrollX) {
    instance.scrollTo(scrollX);
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.align === void 0 && $$bindings.align && align !== void 0)
    $$bindings.align(align);
  if ($$props.scrollArea$use === void 0 && $$bindings.scrollArea$use && scrollArea$use !== void 0)
    $$bindings.scrollArea$use(scrollArea$use);
  if ($$props.scrollArea$class === void 0 && $$bindings.scrollArea$class && scrollArea$class !== void 0)
    $$bindings.scrollArea$class(scrollArea$class);
  if ($$props.scrollContent$use === void 0 && $$bindings.scrollContent$use && scrollContent$use !== void 0)
    $$bindings.scrollContent$use(scrollContent$use);
  if ($$props.scrollContent$class === void 0 && $$bindings.scrollContent$class && scrollContent$class !== void 0)
    $$bindings.scrollContent$class(scrollContent$class);
  if ($$props.getScrollPosition === void 0 && $$bindings.getScrollPosition && getScrollPosition !== void 0)
    $$bindings.getScrollPosition(getScrollPosition);
  if ($$props.getScrollContentWidth === void 0 && $$bindings.getScrollContentWidth && getScrollContentWidth !== void 0)
    $$bindings.getScrollContentWidth(getScrollContentWidth);
  if ($$props.incrementScroll === void 0 && $$bindings.incrementScroll && incrementScroll !== void 0)
    $$bindings.incrementScroll(incrementScroll);
  if ($$props.scrollTo === void 0 && $$bindings.scrollTo && scrollTo !== void 0)
    $$bindings.scrollTo(scrollTo);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-tab-scroller": true,
          "mdc-tab-scroller--align-start": align === "start",
          "mdc-tab-scroller--align-end": align === "end",
          "mdc-tab-scroller--align-center": align === "center",
          ...internalClasses
        }))
      },
      escape_object(exclude($$restProps, ["scrollArea$", "scrollContent$"]))
    ],
    {}
  )}${add_attribute("this", element, 0)}><div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [scrollArea$class]: true,
          "mdc-tab-scroller__scroll-area": true,
          ...scrollAreaClasses
        }))
      },
      {
        style: escape_attribute_value(Object.entries(scrollAreaStyles).map(([name, value]) => `${name}: ${value};`).join(" "))
      },
      escape_object(prefixFilter($$restProps, "scrollArea$"))
    ],
    {}
  )}${add_attribute("this", scrollArea, 0)}><div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [scrollContent$class]: true,
          "mdc-tab-scroller__scroll-content": true
        }))
      },
      {
        style: escape_attribute_value(Object.entries(scrollContentStyles).map(([name, value]) => `${name}: ${value};`).join(" "))
      },
      escape_object(prefixFilter($$restProps, "scrollContent$"))
    ],
    {}
  )}${add_attribute("this", scrollContent, 0)}>${slots.default ? slots.default({}) : ``}</div></div>
</div>`;
});
const { Object: Object_1$1 } = globals;
const TabBar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "tabs",
    "key",
    "focusOnActivate",
    "focusOnProgrammatic",
    "useAutomaticActivation",
    "active",
    "scrollIntoView",
    "getElement"
  ]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { tabs = [] } = $$props;
  let { key = (tab) => tab } = $$props;
  let { focusOnActivate = true } = $$props;
  let { focusOnProgrammatic = false } = $$props;
  let { useAutomaticActivation = true } = $$props;
  let { active = void 0 } = $$props;
  let element;
  let instance;
  let tabScroller;
  let activeIndex = tabs.indexOf(active);
  let tabAccessorMap = {};
  let tabAccessorWeakMap = /* @__PURE__ */ new WeakMap();
  setContext("SMUI:tab:focusOnActivate", focusOnActivate);
  setContext("SMUI:tab:initialActive", active);
  function scrollIntoView(index) {
    instance.scrollIntoView(index);
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.tabs === void 0 && $$bindings.tabs && tabs !== void 0)
    $$bindings.tabs(tabs);
  if ($$props.key === void 0 && $$bindings.key && key !== void 0)
    $$bindings.key(key);
  if ($$props.focusOnActivate === void 0 && $$bindings.focusOnActivate && focusOnActivate !== void 0)
    $$bindings.focusOnActivate(focusOnActivate);
  if ($$props.focusOnProgrammatic === void 0 && $$bindings.focusOnProgrammatic && focusOnProgrammatic !== void 0)
    $$bindings.focusOnProgrammatic(focusOnProgrammatic);
  if ($$props.useAutomaticActivation === void 0 && $$bindings.useAutomaticActivation && useAutomaticActivation !== void 0)
    $$bindings.useAutomaticActivation(useAutomaticActivation);
  if ($$props.active === void 0 && $$bindings.active && active !== void 0)
    $$bindings.active(active);
  if ($$props.scrollIntoView === void 0 && $$bindings.scrollIntoView && scrollIntoView !== void 0)
    $$bindings.scrollIntoView(scrollIntoView);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    {
      if (active !== tabs[activeIndex]) {
        activeIndex = tabs.indexOf(active);
      }
    }
    {
      if (tabs.length) {
        const accessor = tabs[0] instanceof Object ? tabAccessorWeakMap.get(tabs[0]) : tabAccessorMap[tabs[0]];
        if (accessor) {
          accessor.forceAccessible(activeIndex === -1);
        }
      }
    }
    $$rendered = `<div${spread(
      [
        {
          class: escape_attribute_value(classMap({ [className]: true, "mdc-tab-bar": true }))
        },
        { role: "tablist" },
        escape_object(exclude($$restProps, ["tabScroller$"]))
      ],
      {}
    )}${add_attribute("this", element, 0)}>${validate_component(TabScroller, "TabScroller").$$render(
      $$result,
      Object_1$1.assign(prefixFilter($$restProps, "tabScroller$"), { this: tabScroller }),
      {
        this: ($$value) => {
          tabScroller = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${each(tabs, (tab) => {
            return `${slots.default ? slots.default({ tab }) : ``}`;
          })}`;
        }
      }
    )}
</div>`;
  } while (!$$settled);
  return $$rendered;
});
const Accordion = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "multiple", "getElement"]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { multiple = false } = $$props;
  let element;
  let withOpenDialog = false;
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.multiple === void 0 && $$bindings.multiple && multiple !== void 0)
    $$bindings.multiple(multiple);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "smui-accordion": true,
          "smui-accordion--multiple": multiple,
          "smui-accordion--with-open-dialog": withOpenDialog
        }))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}
</div>`;
});
const Panel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let usePass;
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "variant",
    "color",
    "elevation",
    "open",
    "disabled",
    "nonInteractive",
    "extend",
    "extendedElevation",
    "isOpen",
    "setOpen",
    "getElement"
  ]);
  let $openStore, $$unsubscribe_openStore;
  let $nonInteractiveStore, $$unsubscribe_nonInteractiveStore;
  let $disabledStore, $$unsubscribe_disabledStore;
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { variant = "raised" } = $$props;
  let { color = "default" } = $$props;
  let { elevation = 1 } = $$props;
  let { open = false } = $$props;
  let { disabled = false } = $$props;
  let { nonInteractive = false } = $$props;
  let { extend = false } = $$props;
  let { extendedElevation = 3 } = $$props;
  let element;
  let accessor;
  let opened = open;
  const disabledStore = writable(disabled);
  $$unsubscribe_disabledStore = subscribe(disabledStore, (value) => $disabledStore = value);
  setContext("SMUI:accordion:panel:disabled", disabledStore);
  const nonInteractiveStore = writable(nonInteractive);
  $$unsubscribe_nonInteractiveStore = subscribe(nonInteractiveStore, (value) => $nonInteractiveStore = value);
  setContext("SMUI:accordion:panel:nonInteractive", nonInteractiveStore);
  const openStore = writable(open);
  $$unsubscribe_openStore = subscribe(openStore, (value) => $openStore = value);
  setContext("SMUI:accordion:panel:open", openStore);
  let previousOpen = open;
  function isOpen() {
    return open;
  }
  function setOpen(value) {
    open = value;
  }
  function getElement() {
    return element.getElement();
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.elevation === void 0 && $$bindings.elevation && elevation !== void 0)
    $$bindings.elevation(elevation);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.nonInteractive === void 0 && $$bindings.nonInteractive && nonInteractive !== void 0)
    $$bindings.nonInteractive(nonInteractive);
  if ($$props.extend === void 0 && $$bindings.extend && extend !== void 0)
    $$bindings.extend(extend);
  if ($$props.extendedElevation === void 0 && $$bindings.extendedElevation && extendedElevation !== void 0)
    $$bindings.extendedElevation(extendedElevation);
  if ($$props.isOpen === void 0 && $$bindings.isOpen && isOpen !== void 0)
    $$bindings.isOpen(isOpen);
  if ($$props.setOpen === void 0 && $$bindings.setOpen && setOpen !== void 0)
    $$bindings.setOpen(setOpen);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    usePass = [forwardEvents, ...use];
    set_store_value(disabledStore, $disabledStore = disabled, $disabledStore);
    set_store_value(nonInteractiveStore, $nonInteractiveStore = nonInteractive, $nonInteractiveStore);
    set_store_value(openStore, $openStore = open, $openStore);
    {
      if (previousOpen !== open) {
        previousOpen = open;
        Array.from(getElement().children).forEach((child) => {
          if (child.classList.contains("smui-paper__content")) {
            const content = child;
            if (open) {
              content.classList.add("smui-accordion__content--no-transition");
              content.classList.add("smui-accordion__content--force-open");
              const { height } = content.getBoundingClientRect();
              content.classList.remove("smui-accordion__content--force-open");
              content.getBoundingClientRect();
              content.classList.remove("smui-accordion__content--no-transition");
              content.style.height = height + "px";
              content.addEventListener(
                "transitionend",
                () => {
                  if (content) {
                    content.style.height = "";
                  }
                  opened = open;
                  dispatch(getElement(), "SMUIAccordionPanel:opened", { accessor });
                },
                { once: true }
              );
            } else {
              content.style.height = content.getBoundingClientRect().height + "px";
              content.getBoundingClientRect();
              requestAnimationFrame(() => {
                if (content) {
                  content.style.height = "";
                }
                dispatch(getElement(), "SMUIAccordionPanel:closed", { accessor });
              });
              opened = false;
            }
            content.setAttribute("aria-hidden", open ? "false" : "true");
          }
        });
        dispatch(
          getElement(),
          open ? "SMUIAccordionPanel:opening" : "SMUIAccordionPanel:closing",
          { accessor }
        );
      }
    }
    $$rendered = `${validate_component(Paper, "Paper").$$render(
      $$result,
      Object.assign(
        { use: usePass },
        {
          class: classMap({
            [className]: true,
            "smui-accordion__panel": true,
            "smui-accordion__panel--open": open,
            "smui-accordion__panel--opened": opened,
            "smui-accordion__panel--disabled": disabled,
            "smui-accordion__panel--non-interactive": nonInteractive,
            "smui-accordion__panel--raised": variant === "raised",
            "smui-accordion__panel--extend": extend,
            ["smui-accordion__panel--elevation-z" + (extend && open ? extendedElevation : elevation)]: elevation !== 0 && variant === "raised" || extendedElevation !== 0 && variant === "raised" && extend && open
          })
        },
        { color },
        {
          variant: variant === "raised" ? "unelevated" : variant
        },
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
  $$unsubscribe_openStore();
  $$unsubscribe_nonInteractiveStore();
  $$unsubscribe_disabledStore();
  return $$rendered;
});
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "style", "ripple", "getElement"]);
  let $$slots = compute_slots(slots);
  let $nonInteractive, $$unsubscribe_nonInteractive;
  let $$unsubscribe_disabled;
  let $open, $$unsubscribe_open;
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { ripple = true } = $$props;
  let element;
  let internalClasses = {};
  let internalStyles = {};
  const disabled = getContext("SMUI:accordion:panel:disabled");
  $$unsubscribe_disabled = subscribe(disabled, (value) => value);
  const nonInteractive = getContext("SMUI:accordion:panel:nonInteractive");
  $$unsubscribe_nonInteractive = subscribe(nonInteractive, (value) => $nonInteractive = value);
  const open = getContext("SMUI:accordion:panel:open");
  $$unsubscribe_open = subscribe(open, (value) => $open = value);
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.ripple === void 0 && $$bindings.ripple && ripple !== void 0)
    $$bindings.ripple(ripple);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  $$unsubscribe_nonInteractive();
  $$unsubscribe_disabled();
  $$unsubscribe_open();
  return `<div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "smui-accordion__header": true,
          ...internalClasses
        }))
      },
      {
        style: escape_attribute_value(Object.entries(internalStyles).map(([name, value]) => `${name}: ${value};`).concat([style]).join(" "))
      },
      { role: "button" },
      {
        tabindex: escape_attribute_value($nonInteractive ? -1 : 0)
      },
      {
        "aria-expanded": escape_attribute_value($open ? "true" : "false")
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${ripple ? `<div class="${"smui-accordion__header__ripple"}"></div>` : ``}
  <div${add_attribute(
    "class",
    classMap({
      "smui-accordion__header__title": true,
      "smui-accordion__header__title--with-description": $$slots.description
    }),
    0
  )}>${slots.default ? slots.default({}) : ``}</div>
  ${$$slots.description ? `<div class="${"smui-accordion__header__description"}">${slots.description ? slots.description({}) : ``}</div>` : ``}
  ${$$slots.icon ? `<div class="${"smui-accordion__header__icon"}">${slots.icon ? slots.icon({}) : ``}</div>` : ``}
</div>`;
});
const MenuSurface = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "style",
    "static",
    "anchor",
    "fixed",
    "open",
    "managed",
    "fullWidth",
    "quickOpen",
    "anchorElement",
    "anchorCorner",
    "anchorMargin",
    "maxHeight",
    "horizontallyCenteredOnViewport",
    "openBottomBias",
    "isOpen",
    "setOpen",
    "setAbsolutePosition",
    "setIsHoisted",
    "isFixed",
    "getElement"
  ]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { static: isStatic = false } = $$props;
  let { anchor = true } = $$props;
  let { fixed = false } = $$props;
  let { open = isStatic } = $$props;
  let { managed = false } = $$props;
  let { fullWidth = false } = $$props;
  let { quickOpen = false } = $$props;
  let { anchorElement = void 0 } = $$props;
  let { anchorCorner = void 0 } = $$props;
  let { anchorMargin = { top: 0, right: 0, bottom: 0, left: 0 } } = $$props;
  let { maxHeight = 0 } = $$props;
  let { horizontallyCenteredOnViewport = false } = $$props;
  let { openBottomBias = 0 } = $$props;
  let element;
  let instance;
  let internalClasses = {};
  let internalStyles = {};
  setContext("SMUI:list:role", "menu");
  setContext("SMUI:list:item:role", "menuitem");
  onDestroy(() => {
  });
  function isOpen() {
    return open;
  }
  function setOpen(value) {
    open = value;
  }
  function setAbsolutePosition(x, y) {
    return instance.setAbsolutePosition(x, y);
  }
  function setIsHoisted(isHoisted) {
    return instance.setIsHoisted(isHoisted);
  }
  function isFixed() {
    return instance.isFixed();
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.static === void 0 && $$bindings.static && isStatic !== void 0)
    $$bindings.static(isStatic);
  if ($$props.anchor === void 0 && $$bindings.anchor && anchor !== void 0)
    $$bindings.anchor(anchor);
  if ($$props.fixed === void 0 && $$bindings.fixed && fixed !== void 0)
    $$bindings.fixed(fixed);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.managed === void 0 && $$bindings.managed && managed !== void 0)
    $$bindings.managed(managed);
  if ($$props.fullWidth === void 0 && $$bindings.fullWidth && fullWidth !== void 0)
    $$bindings.fullWidth(fullWidth);
  if ($$props.quickOpen === void 0 && $$bindings.quickOpen && quickOpen !== void 0)
    $$bindings.quickOpen(quickOpen);
  if ($$props.anchorElement === void 0 && $$bindings.anchorElement && anchorElement !== void 0)
    $$bindings.anchorElement(anchorElement);
  if ($$props.anchorCorner === void 0 && $$bindings.anchorCorner && anchorCorner !== void 0)
    $$bindings.anchorCorner(anchorCorner);
  if ($$props.anchorMargin === void 0 && $$bindings.anchorMargin && anchorMargin !== void 0)
    $$bindings.anchorMargin(anchorMargin);
  if ($$props.maxHeight === void 0 && $$bindings.maxHeight && maxHeight !== void 0)
    $$bindings.maxHeight(maxHeight);
  if ($$props.horizontallyCenteredOnViewport === void 0 && $$bindings.horizontallyCenteredOnViewport && horizontallyCenteredOnViewport !== void 0)
    $$bindings.horizontallyCenteredOnViewport(horizontallyCenteredOnViewport);
  if ($$props.openBottomBias === void 0 && $$bindings.openBottomBias && openBottomBias !== void 0)
    $$bindings.openBottomBias(openBottomBias);
  if ($$props.isOpen === void 0 && $$bindings.isOpen && isOpen !== void 0)
    $$bindings.isOpen(isOpen);
  if ($$props.setOpen === void 0 && $$bindings.setOpen && setOpen !== void 0)
    $$bindings.setOpen(setOpen);
  if ($$props.setAbsolutePosition === void 0 && $$bindings.setAbsolutePosition && setAbsolutePosition !== void 0)
    $$bindings.setAbsolutePosition(setAbsolutePosition);
  if ($$props.setIsHoisted === void 0 && $$bindings.setIsHoisted && setIsHoisted !== void 0)
    $$bindings.setIsHoisted(setIsHoisted);
  if ($$props.isFixed === void 0 && $$bindings.isFixed && isFixed !== void 0)
    $$bindings.isFixed(isFixed);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `

<div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-menu-surface": true,
          "mdc-menu-surface--fixed": fixed,
          "mdc-menu-surface--open": isStatic,
          "smui-menu-surface--static": isStatic,
          "mdc-menu-surface--fullwidth": fullWidth,
          ...internalClasses
        }))
      },
      {
        style: escape_attribute_value(Object.entries(internalStyles).map(([name, value]) => `${name}: ${value};`).concat([style]).join(" "))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}
</div>`;
});
const Menu = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let usePass;
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "open",
    "isOpen",
    "setOpen",
    "setDefaultFocusState",
    "getSelectedIndex",
    "getMenuSurface",
    "getElement"
  ]);
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { open = false } = $$props;
  let element;
  let instance;
  function isOpen() {
    return open;
  }
  function setOpen(value) {
    open = value;
  }
  function setDefaultFocusState(focusState) {
    instance.setDefaultFocusState(focusState);
  }
  function getSelectedIndex() {
    return instance.getSelectedIndex();
  }
  function getMenuSurface() {
    return element;
  }
  function getElement() {
    return element.getElement();
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.isOpen === void 0 && $$bindings.isOpen && isOpen !== void 0)
    $$bindings.isOpen(isOpen);
  if ($$props.setOpen === void 0 && $$bindings.setOpen && setOpen !== void 0)
    $$bindings.setOpen(setOpen);
  if ($$props.setDefaultFocusState === void 0 && $$bindings.setDefaultFocusState && setDefaultFocusState !== void 0)
    $$bindings.setDefaultFocusState(setDefaultFocusState);
  if ($$props.getSelectedIndex === void 0 && $$bindings.getSelectedIndex && getSelectedIndex !== void 0)
    $$bindings.getSelectedIndex(getSelectedIndex);
  if ($$props.getMenuSurface === void 0 && $$bindings.getMenuSurface && getMenuSurface !== void 0)
    $$bindings.getMenuSurface(getMenuSurface);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    usePass = [forwardEvents, ...use];
    $$rendered = `${validate_component(MenuSurface, "MenuSurface").$$render(
      $$result,
      Object.assign(
        { use: usePass },
        {
          class: classMap({ [className]: true, "mdc-menu": true })
        },
        $$restProps,
        { this: element },
        { open }
      ),
      {
        this: ($$value) => {
          element = $$value;
          $$settled = false;
        },
        open: ($$value) => {
          open = $$value;
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
classAdderBuilder({
  class: "mdc-menu__selection-group-icon",
  component: Graphic
});
const FloatingLabel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "style",
    "for",
    "floatAbove",
    "required",
    "wrapped",
    "shake",
    "float",
    "setRequired",
    "getWidth",
    "getElement"
  ]);
  var _a;
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { for: forId = void 0 } = $$props;
  let { floatAbove = false } = $$props;
  let { required = false } = $$props;
  let { wrapped = false } = $$props;
  let element;
  let instance;
  let internalClasses = {};
  let internalStyles = {};
  let inputProps = (_a = getContext("SMUI:generic:input:props")) !== null && _a !== void 0 ? _a : {};
  function shake(shouldShake) {
    instance.shake(shouldShake);
  }
  function float(shouldFloat) {
    floatAbove = shouldFloat;
  }
  function setRequired(isRequired) {
    required = isRequired;
  }
  function getWidth() {
    return instance.getWidth();
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.for === void 0 && $$bindings.for && forId !== void 0)
    $$bindings.for(forId);
  if ($$props.floatAbove === void 0 && $$bindings.floatAbove && floatAbove !== void 0)
    $$bindings.floatAbove(floatAbove);
  if ($$props.required === void 0 && $$bindings.required && required !== void 0)
    $$bindings.required(required);
  if ($$props.wrapped === void 0 && $$bindings.wrapped && wrapped !== void 0)
    $$bindings.wrapped(wrapped);
  if ($$props.shake === void 0 && $$bindings.shake && shake !== void 0)
    $$bindings.shake(shake);
  if ($$props.float === void 0 && $$bindings.float && float !== void 0)
    $$bindings.float(float);
  if ($$props.setRequired === void 0 && $$bindings.setRequired && setRequired !== void 0)
    $$bindings.setRequired(setRequired);
  if ($$props.getWidth === void 0 && $$bindings.getWidth && getWidth !== void 0)
    $$bindings.getWidth(getWidth);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `${wrapped ? `<span${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-floating-label": true,
          "mdc-floating-label--float-above": floatAbove,
          "mdc-floating-label--required": required,
          ...internalClasses
        }))
      },
      {
        style: escape_attribute_value(Object.entries(internalStyles).map(([name, value]) => `${name}: ${value};`).concat([style]).join(" "))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}</span>` : `<label${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-floating-label": true,
          "mdc-floating-label--float-above": floatAbove,
          "mdc-floating-label--required": required,
          ...internalClasses
        }))
      },
      {
        style: escape_attribute_value(Object.entries(internalStyles).map(([name, value]) => `${name}: ${value};`).concat([style]).join(" "))
      },
      {
        for: escape_attribute_value(forId || (inputProps ? inputProps.id : void 0))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}</label>`}`;
});
const LineRipple = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "style",
    "active",
    "activate",
    "deactivate",
    "setRippleCenter",
    "getElement"
  ]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { active = false } = $$props;
  let element;
  let instance;
  let internalClasses = {};
  let internalStyles = {};
  function activate() {
    instance.activate();
  }
  function deactivate() {
    instance.deactivate();
  }
  function setRippleCenter(xCoordinate) {
    instance.setRippleCenter(xCoordinate);
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.active === void 0 && $$bindings.active && active !== void 0)
    $$bindings.active(active);
  if ($$props.activate === void 0 && $$bindings.activate && activate !== void 0)
    $$bindings.activate(activate);
  if ($$props.deactivate === void 0 && $$bindings.deactivate && deactivate !== void 0)
    $$bindings.deactivate(deactivate);
  if ($$props.setRippleCenter === void 0 && $$bindings.setRippleCenter && setRippleCenter !== void 0)
    $$bindings.setRippleCenter(setRippleCenter);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-line-ripple": true,
          "mdc-line-ripple--active": active,
          ...internalClasses
        }))
      },
      {
        style: escape_attribute_value(Object.entries(internalStyles).map(([name, value]) => `${name}: ${value};`).concat([style]).join(" "))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}></div>`;
});
const NotchedOutline = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "notched", "noLabel", "notch", "closeNotch", "getElement"]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { notched = false } = $$props;
  let { noLabel = false } = $$props;
  let element;
  let instance;
  let internalClasses = {};
  let notchStyles = {};
  function removeClass(className2) {
    if (!(className2 in internalClasses) || internalClasses[className2]) {
      internalClasses[className2] = false;
    }
  }
  function notch(notchWidth) {
    instance.notch(notchWidth);
  }
  function closeNotch() {
    instance.closeNotch();
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.notched === void 0 && $$bindings.notched && notched !== void 0)
    $$bindings.notched(notched);
  if ($$props.noLabel === void 0 && $$bindings.noLabel && noLabel !== void 0)
    $$bindings.noLabel(noLabel);
  if ($$props.notch === void 0 && $$bindings.notch && notch !== void 0)
    $$bindings.notch(notch);
  if ($$props.closeNotch === void 0 && $$bindings.closeNotch && closeNotch !== void 0)
    $$bindings.closeNotch(closeNotch);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  {
    {
      removeClass("mdc-notched-outline--upgraded");
    }
  }
  return `<div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-notched-outline": true,
          "mdc-notched-outline--notched": notched,
          "mdc-notched-outline--no-label": noLabel,
          ...internalClasses
        }))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}><div class="${"mdc-notched-outline__leading"}"></div>
  ${!noLabel ? `<div class="${"mdc-notched-outline__notch"}"${add_attribute("style", Object.entries(notchStyles).map(([name, value]) => `${name}: ${value};`).join(" "), 0)}>${slots.default ? slots.default({}) : ``}</div>` : ``}
  <div class="${"mdc-notched-outline__trailing"}"></div>
</div>`;
});
let counter$1 = 0;
const HelperText = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "id", "persistent", "validationMsg", "getElement"]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { id = "SMUI-select-helper-text-" + counter$1++ } = $$props;
  let { persistent = false } = $$props;
  let { validationMsg = false } = $$props;
  let element;
  let internalClasses = {};
  let internalAttrs = {};
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.persistent === void 0 && $$bindings.persistent && persistent !== void 0)
    $$bindings.persistent(persistent);
  if ($$props.validationMsg === void 0 && $$bindings.validationMsg && validationMsg !== void 0)
    $$bindings.validationMsg(validationMsg);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-select-helper-text": true,
          "mdc-select-helper-text--validation-msg": validationMsg,
          "mdc-select-helper-text--validation-msg-persistent": persistent,
          ...internalClasses
        }))
      },
      {
        "aria-hidden": escape_attribute_value(persistent ? void 0 : "true")
      },
      { id: escape_attribute_value(id) },
      escape_object(internalAttrs),
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${`${slots.default ? slots.default({}) : ``}`}
</div>`;
});
const { Object: Object_1 } = globals;
let counter = 0;
const Select = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "style",
    "ripple",
    "disabled",
    "variant",
    "noLabel",
    "label",
    "value",
    "key",
    "dirty",
    "invalid",
    "updateInvalid",
    "required",
    "inputId",
    "hiddenInput",
    "withLeadingIcon",
    "anchor$use",
    "anchor$class",
    "selectedTextContainer$use",
    "selectedTextContainer$class",
    "selectedText$use",
    "selectedText$class",
    "dropdownIcon$use",
    "dropdownIcon$class",
    "menu$class",
    "getUseDefaultValidation",
    "setUseDefaultValidation",
    "focus",
    "layout",
    "getElement"
  ]);
  let $$slots = compute_slots(slots);
  let $selectedTextStore, $$unsubscribe_selectedTextStore;
  let $valueStore, $$unsubscribe_valueStore;
  forwardEventsBuilder(get_current_component());
  let uninitializedValue = () => {
  };
  function isUninitializedValue(value2) {
    return value2 === uninitializedValue;
  }
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { ripple = true } = $$props;
  let { disabled = false } = $$props;
  let { variant = "standard" } = $$props;
  let { noLabel = false } = $$props;
  let { label = void 0 } = $$props;
  let { value = "" } = $$props;
  let { key = (item) => item } = $$props;
  let { dirty = false } = $$props;
  let { invalid = uninitializedValue } = $$props;
  let { updateInvalid = isUninitializedValue(invalid) } = $$props;
  if (isUninitializedValue(invalid)) {
    invalid = false;
  }
  let { required = false } = $$props;
  let { inputId = "SMUI-select-" + counter++ } = $$props;
  let { hiddenInput = false } = $$props;
  let { withLeadingIcon = uninitializedValue } = $$props;
  let { anchor$use = [] } = $$props;
  let { anchor$class = "" } = $$props;
  let { selectedTextContainer$use = [] } = $$props;
  let { selectedTextContainer$class = "" } = $$props;
  let { selectedText$use = [] } = $$props;
  let { selectedText$class = "" } = $$props;
  let { dropdownIcon$use = [] } = $$props;
  let { dropdownIcon$class = "" } = $$props;
  let { menu$class = "" } = $$props;
  let element;
  let instance;
  let internalClasses = {};
  let internalStyles = {};
  let selectAnchor;
  let selectAnchorAttrs = {};
  let selectedIndex = -1;
  let helperId = void 0;
  let addLayoutListener = getContext("SMUI:addLayoutListener");
  let removeLayoutListener;
  let menuOpen = false;
  let menuClasses = {};
  let anchorElement = void 0;
  let anchorCorner = void 0;
  let wrapFocus = false;
  let list;
  let context = getContext("SMUI:select:context");
  let floatingLabel = void 0;
  let lineRipple = void 0;
  let notchedOutline = void 0;
  setContext("SMUI:list:role", "");
  setContext("SMUI:list:nav", false);
  const selectedTextStore = writable("");
  $$unsubscribe_selectedTextStore = subscribe(selectedTextStore, (value2) => $selectedTextStore = value2);
  setContext("SMUI:select:selectedText", selectedTextStore);
  const valueStore = writable(value);
  $$unsubscribe_valueStore = subscribe(valueStore, (value2) => $valueStore = value2);
  setContext("SMUI:select:value", valueStore);
  let previousSelectedIndex = selectedIndex;
  if (addLayoutListener) {
    removeLayoutListener = addLayoutListener(layout);
  }
  onDestroy(() => {
    if (removeLayoutListener) {
      removeLayoutListener();
    }
  });
  function getMenuItemValues() {
    return list.getOrderedList().map((accessor) => accessor.getValue());
  }
  function getUseDefaultValidation() {
    return instance.getUseDefaultValidation();
  }
  function setUseDefaultValidation(useDefaultValidation) {
    instance.setUseDefaultValidation(useDefaultValidation);
  }
  function focus() {
    selectAnchor.focus();
  }
  function layout() {
    instance.layout();
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.ripple === void 0 && $$bindings.ripple && ripple !== void 0)
    $$bindings.ripple(ripple);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.noLabel === void 0 && $$bindings.noLabel && noLabel !== void 0)
    $$bindings.noLabel(noLabel);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.key === void 0 && $$bindings.key && key !== void 0)
    $$bindings.key(key);
  if ($$props.dirty === void 0 && $$bindings.dirty && dirty !== void 0)
    $$bindings.dirty(dirty);
  if ($$props.invalid === void 0 && $$bindings.invalid && invalid !== void 0)
    $$bindings.invalid(invalid);
  if ($$props.updateInvalid === void 0 && $$bindings.updateInvalid && updateInvalid !== void 0)
    $$bindings.updateInvalid(updateInvalid);
  if ($$props.required === void 0 && $$bindings.required && required !== void 0)
    $$bindings.required(required);
  if ($$props.inputId === void 0 && $$bindings.inputId && inputId !== void 0)
    $$bindings.inputId(inputId);
  if ($$props.hiddenInput === void 0 && $$bindings.hiddenInput && hiddenInput !== void 0)
    $$bindings.hiddenInput(hiddenInput);
  if ($$props.withLeadingIcon === void 0 && $$bindings.withLeadingIcon && withLeadingIcon !== void 0)
    $$bindings.withLeadingIcon(withLeadingIcon);
  if ($$props.anchor$use === void 0 && $$bindings.anchor$use && anchor$use !== void 0)
    $$bindings.anchor$use(anchor$use);
  if ($$props.anchor$class === void 0 && $$bindings.anchor$class && anchor$class !== void 0)
    $$bindings.anchor$class(anchor$class);
  if ($$props.selectedTextContainer$use === void 0 && $$bindings.selectedTextContainer$use && selectedTextContainer$use !== void 0)
    $$bindings.selectedTextContainer$use(selectedTextContainer$use);
  if ($$props.selectedTextContainer$class === void 0 && $$bindings.selectedTextContainer$class && selectedTextContainer$class !== void 0)
    $$bindings.selectedTextContainer$class(selectedTextContainer$class);
  if ($$props.selectedText$use === void 0 && $$bindings.selectedText$use && selectedText$use !== void 0)
    $$bindings.selectedText$use(selectedText$use);
  if ($$props.selectedText$class === void 0 && $$bindings.selectedText$class && selectedText$class !== void 0)
    $$bindings.selectedText$class(selectedText$class);
  if ($$props.dropdownIcon$use === void 0 && $$bindings.dropdownIcon$use && dropdownIcon$use !== void 0)
    $$bindings.dropdownIcon$use(dropdownIcon$use);
  if ($$props.dropdownIcon$class === void 0 && $$bindings.dropdownIcon$class && dropdownIcon$class !== void 0)
    $$bindings.dropdownIcon$class(dropdownIcon$class);
  if ($$props.menu$class === void 0 && $$bindings.menu$class && menu$class !== void 0)
    $$bindings.menu$class(menu$class);
  if ($$props.getUseDefaultValidation === void 0 && $$bindings.getUseDefaultValidation && getUseDefaultValidation !== void 0)
    $$bindings.getUseDefaultValidation(getUseDefaultValidation);
  if ($$props.setUseDefaultValidation === void 0 && $$bindings.setUseDefaultValidation && setUseDefaultValidation !== void 0)
    $$bindings.setUseDefaultValidation(setUseDefaultValidation);
  if ($$props.focus === void 0 && $$bindings.focus && focus !== void 0)
    $$bindings.focus(focus);
  if ($$props.layout === void 0 && $$bindings.layout && layout !== void 0)
    $$bindings.layout(layout);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    {
      if (previousSelectedIndex !== selectedIndex) {
        previousSelectedIndex = selectedIndex;
        {
          const values = getMenuItemValues();
          if (value !== values[selectedIndex]) {
            value = values[selectedIndex];
          }
        }
      }
    }
    set_store_value(valueStore, $valueStore = value, $valueStore);
    $$rendered = `<div${spread(
      [
        {
          class: escape_attribute_value(classMap({
            [className]: true,
            "mdc-select": true,
            "mdc-select--required": required,
            "mdc-select--disabled": disabled,
            "mdc-select--filled": variant === "filled",
            "mdc-select--outlined": variant === "outlined",
            "smui-select--standard": variant === "standard",
            "mdc-select--with-leading-icon": isUninitializedValue(withLeadingIcon) ? $$slots.leadingIcon : withLeadingIcon,
            "mdc-select--no-label": noLabel || label == null && !$$slots.label,
            "mdc-select--invalid": invalid,
            "mdc-select--activated": menuOpen,
            "mdc-data-table__pagination-rows-per-page-select": context === "data-table:pagination",
            ...internalClasses
          }))
        },
        {
          style: escape_attribute_value(Object.entries(internalStyles).map(([name, value2]) => `${name}: ${value2};`).concat([style]).join(" "))
        },
        escape_object(exclude($$restProps, [
          "input$",
          "anchor$",
          "label$",
          "outline$",
          "selectedTextContainer$",
          "selectedText$",
          "dropdownIcon$",
          "ripple$",
          "menu$",
          "list$",
          "helperText$"
        ]))
      ],
      {}
    )}${add_attribute("this", element, 0)}>${hiddenInput ? `<input${spread(
      [
        { type: "hidden" },
        { required: required || null },
        { disabled: disabled || null },
        { value: escape_attribute_value(value) },
        escape_object(prefixFilter($$restProps, "input$"))
      ],
      {}
    )}>` : ``}
  <div${spread(
      [
        {
          class: escape_attribute_value(classMap({
            [anchor$class]: true,
            "mdc-select__anchor": true
          }))
        },
        {
          "aria-required": escape_attribute_value(required ? "true" : void 0)
        },
        {
          "aria-disabled": escape_attribute_value(disabled ? "true" : void 0)
        },
        {
          "aria-controls": escape_attribute_value(helperId)
        },
        {
          "aria-describedby": escape_attribute_value(helperId)
        },
        escape_object(selectAnchorAttrs),
        escape_object(prefixFilter($$restProps, "anchor$"))
      ],
      {}
    )}${add_attribute("this", selectAnchor, 0)}>${variant === "filled" ? `<span class="${"mdc-select__ripple"}"></span>` : ``}
    ${variant !== "outlined" && !noLabel && (label != null || $$slots.label) ? `${validate_component(FloatingLabel, "FloatingLabel").$$render(
      $$result,
      Object_1.assign({ id: inputId + "-smui-label" }, { floatAbove: $selectedTextStore !== "" }, { required }, prefixFilter($$restProps, "label$"), { this: floatingLabel }),
      {
        this: ($$value) => {
          floatingLabel = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${escape(label == null ? "" : label)}${slots.label ? slots.label({}) : ``}`;
        }
      }
    )}` : ``}
    ${variant === "outlined" ? `${validate_component(NotchedOutline, "NotchedOutline").$$render(
      $$result,
      Object_1.assign(
        {
          noLabel: noLabel || label == null && !$$slots.label
        },
        prefixFilter($$restProps, "outline$"),
        { this: notchedOutline }
      ),
      {
        this: ($$value) => {
          notchedOutline = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${!noLabel && (label != null || $$slots.label) ? `${validate_component(FloatingLabel, "FloatingLabel").$$render(
            $$result,
            Object_1.assign({ id: inputId + "-smui-label" }, { floatAbove: $selectedTextStore !== "" }, { required }, prefixFilter($$restProps, "label$"), { this: floatingLabel }),
            {
              this: ($$value) => {
                floatingLabel = $$value;
                $$settled = false;
              }
            },
            {
              default: () => {
                return `${escape(label == null ? "" : label)}${slots.label ? slots.label({}) : ``}`;
              }
            }
          )}` : ``}`;
        }
      }
    )}` : ``}
    ${slots.leadingIcon ? slots.leadingIcon({}) : ``}
    <span${spread(
      [
        {
          class: escape_attribute_value(classMap({
            [selectedTextContainer$class]: true,
            "mdc-select__selected-text-container": true
          }))
        },
        escape_object(prefixFilter($$restProps, "selectedTextContainer$"))
      ],
      {}
    )}><span${spread(
      [
        {
          id: escape_attribute_value(inputId + "-smui-selected-text")
        },
        {
          class: escape_attribute_value(classMap({
            [selectedText$class]: true,
            "mdc-select__selected-text": true
          }))
        },
        { role: "button" },
        { "aria-haspopup": "listbox" },
        {
          "aria-labelledby": escape_attribute_value(inputId + "-smui-label")
        },
        escape_object(prefixFilter($$restProps, "selectedText$"))
      ],
      {}
    )}>${escape($selectedTextStore)}</span></span>
    <span${spread(
      [
        {
          class: escape_attribute_value(classMap({
            [dropdownIcon$class]: true,
            "mdc-select__dropdown-icon": true
          }))
        },
        escape_object(prefixFilter($$restProps, "dropdownIcon$"))
      ],
      {}
    )}><svg class="${"mdc-select__dropdown-icon-graphic"}" viewBox="${"7 10 10 5"}" focusable="${"false"}"><polygon class="${"mdc-select__dropdown-icon-inactive"}" stroke="${"none"}" fill-rule="${"evenodd"}" points="${"7 10 12 15 17 10"}"></polygon><polygon class="${"mdc-select__dropdown-icon-active"}" stroke="${"none"}" fill-rule="${"evenodd"}" points="${"7 15 12 10 17 15"}"></polygon></svg></span>
    ${variant !== "outlined" && ripple ? `${validate_component(LineRipple, "LineRipple").$$render(
      $$result,
      Object_1.assign(prefixFilter($$restProps, "ripple$"), { this: lineRipple }),
      {
        this: ($$value) => {
          lineRipple = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : ``}</div>

  ${validate_component(Menu, "Menu").$$render(
      $$result,
      Object_1.assign(
        {
          class: classMap({
            [menu$class]: true,
            "mdc-select__menu": true,
            ...menuClasses
          })
        },
        { fullWidth: true },
        { anchor: false },
        { anchorElement },
        { anchorCorner },
        prefixFilter($$restProps, "menu$"),
        { open: menuOpen }
      ),
      {
        open: ($$value) => {
          menuOpen = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${validate_component(List, "List").$$render(
            $$result,
            Object_1.assign({ role: "listbox" }, { wrapFocus }, prefixFilter($$restProps, "list$"), { selectedIndex }),
            {
              selectedIndex: ($$value) => {
                selectedIndex = $$value;
                $$settled = false;
              }
            },
            {
              default: () => {
                return `${slots.default ? slots.default({}) : ``}`;
              }
            }
          )}`;
        }
      }
    )}</div>
${$$slots.helperText ? `${validate_component(HelperText, "HelperText").$$render($$result, Object_1.assign(prefixFilter($$restProps, "helperText$")), {}, {
      default: () => {
        return `${slots.helperText ? slots.helperText({}) : ``}`;
      }
    })}` : ``}`;
  } while (!$$settled);
  $$unsubscribe_selectedTextStore();
  $$unsubscribe_valueStore();
  return $$rendered;
});
const Option = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let usePass;
  let selected;
  let $$restProps = compute_rest_props($$props, ["use", "class", "value", "getElement"]);
  let $selectedText, $$unsubscribe_selectedText;
  let $selectedValue, $$unsubscribe_selectedValue;
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  const className = "";
  let { value = "" } = $$props;
  let element;
  const selectedText = getContext("SMUI:select:selectedText");
  $$unsubscribe_selectedText = subscribe(selectedText, (value2) => $selectedText = value2);
  const selectedValue = getContext("SMUI:select:value");
  $$unsubscribe_selectedValue = subscribe(selectedValue, (value2) => $selectedValue = value2);
  setContext("SMUI:list:item:role", "option");
  onDestroy(setSelectedText);
  function setSelectedText() {
    if (selected && element) {
      set_store_value(selectedText, $selectedText = element.getPrimaryText(), $selectedText);
    }
  }
  function getElement() {
    return element.getElement();
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    usePass = [forwardEvents, ...use];
    selected = value != null && value !== "" && $selectedValue === value;
    $$rendered = `${validate_component(Item, "Item").$$render(
      $$result,
      Object.assign({ use: usePass }, { "data-value": value }, { value }, { selected }, $$restProps, { this: element }),
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
  $$unsubscribe_selectedText();
  $$unsubscribe_selectedValue();
  return $$rendered;
});
const Buttons = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { showBasket } = $$props;
  let { basket } = $$props;
  let { copyLink } = $$props;
  let { fillBasket } = $$props;
  let { launchTest } = $$props;
  let { classroom } = $$props;
  let { flash } = $$props;
  let { displayExemple } = $$props;
  let { flushBasket } = $$props;
  let { courseAuxNombres } = $$props;
  let { generateExoLatex } = $$props;
  if ($$props.showBasket === void 0 && $$bindings.showBasket && showBasket !== void 0)
    $$bindings.showBasket(showBasket);
  if ($$props.basket === void 0 && $$bindings.basket && basket !== void 0)
    $$bindings.basket(basket);
  if ($$props.copyLink === void 0 && $$bindings.copyLink && copyLink !== void 0)
    $$bindings.copyLink(copyLink);
  if ($$props.fillBasket === void 0 && $$bindings.fillBasket && fillBasket !== void 0)
    $$bindings.fillBasket(fillBasket);
  if ($$props.launchTest === void 0 && $$bindings.launchTest && launchTest !== void 0)
    $$bindings.launchTest(launchTest);
  if ($$props.classroom === void 0 && $$bindings.classroom && classroom !== void 0)
    $$bindings.classroom(classroom);
  if ($$props.flash === void 0 && $$bindings.flash && flash !== void 0)
    $$bindings.flash(flash);
  if ($$props.displayExemple === void 0 && $$bindings.displayExemple && displayExemple !== void 0)
    $$bindings.displayExemple(displayExemple);
  if ($$props.flushBasket === void 0 && $$bindings.flushBasket && flushBasket !== void 0)
    $$bindings.flushBasket(flushBasket);
  if ($$props.courseAuxNombres === void 0 && $$bindings.courseAuxNombres && courseAuxNombres !== void 0)
    $$bindings.courseAuxNombres(courseAuxNombres);
  if ($$props.generateExoLatex === void 0 && $$bindings.generateExoLatex && generateExoLatex !== void 0)
    $$bindings.generateExoLatex(generateExoLatex);
  return `<div class="${"py-3 flex"}"${add_attribute("style", "position:sticky;top:0px;z-index:10; background:var(--mdc-theme-background)", 0)}><div class="${"grow"}"></div>

		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiLink, 0)}></path>`;
          }
        })}`;
      }
    }
  )}

		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiNewspaperVariantOutline, 0)}></path>`;
          }
        })}`;
      }
    }
  )}

		
		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: courseAuxNombres ? "primary" : "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiRunFast, 0)}></path>`;
          }
        })}`;
      }
    }
  )}

		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: classroom ? "primary" : "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiProjectorScreen, 0)}></path>`;
          }
        })}`;
      }
    }
  )}
		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: flash ? "primary" : "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiFlash, 0)}></path>`;
          }
        })}`;
      }
    }
  )}

		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: displayExemple ? "primary" : "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiHelp, 0)}></path>`;
          }
        })}`;
      }
    }
  )}

		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiBasketPlus, 0)}></path>`;
          }
        })}`;
      }
    }
  )}

		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiTrashCanOutline, 0)}></path>`;
          }
        })}`;
      }
    }
  )}

		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: showBasket ? "primary" : "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiBasket, 0)}></path>`;
          }
        })}
      ${basket.length ? `${validate_component(Badge, "Badge").$$render($$result, { "aria-label": "items number in basket" }, {}, {
          default: () => {
            return `${escape(basket.reduce((acc, item) => acc + item.count, 0))}`;
          }
        })}` : ``}`;
      }
    }
  )}

		${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1",
      color: "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiRocketLaunchOutline, 0)}></path>`;
          }
        })}`;
      }
    }
  )}</div>`;
});
const Basket = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const ids = datas.ids;
  let { basket } = $$props;
  let { courseAuxNombres } = $$props;
  if ($$props.basket === void 0 && $$bindings.basket && basket !== void 0)
    $$bindings.basket(basket);
  if ($$props.courseAuxNombres === void 0 && $$bindings.courseAuxNombres && courseAuxNombres !== void 0)
    $$bindings.courseAuxNombres(courseAuxNombres);
  return `

${basket.length ? `${each(basket, (item, i) => {
    let { theme, domain, subdomain, level } = ids[item.id], question = getQuestion(theme, domain, subdomain, level);
    return `
		
		<div class="${"my-4 flex flex-row"}">${validate_component(Paper, "Paper").$$render(
      $$result,
      {
        elevation: "6",
        style: "width:80%;max-width:500px"
      },
      {},
      {
        default: () => {
          return `${validate_component(Title, "Title").$$render($$result, {}, {}, {
            default: () => {
              return `${escape(question.description)}`;
            }
          })}

				${question.subdescription ? `${validate_component(Subtitle, "Subtitle").$$render($$result, {}, {}, {
            default: () => {
              return `<!-- HTML_TAG_START -->${question.subdescription}<!-- HTML_TAG_END -->`;
            }
          })}` : ``}

				${validate_component(Content, "Content").$$render($$result, {}, {}, {
            default: () => {
              return `${validate_component(Question, "Question").$$render($$result, { question: generateQuestion(question) }, {}, {})}
				`;
            }
          })}
			`;
        }
      }
    )}

			<div class="${"ma-2 flex flex-col"}">${!courseAuxNombres ? `<div class="${"flex flex-row justify-center"}"><div class="${"mt-2"}">r\xE9p\xE9tition: ${escape(basket[i].count)}</div>
					</div>` : ``}
				<div class="${"ml-2 flex flex-row justify-center"}">${validate_component(Fab, "Fab").$$render(
      $$result,
      {
        class: "m-2",
        color: "secondary",
        mini: true
      },
      {},
      {
        default: () => {
          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
            default: () => {
              return `<path fill="${"currentColor"}"${add_attribute("d", mdiMinus, 0)}></path>
						`;
            }
          })}
					`;
        }
      }
    )}
					${!courseAuxNombres ? `${validate_component(Fab, "Fab").$$render(
      $$result,
      {
        class: "m-2",
        color: "secondary",
        mini: true
      },
      {},
      {
        default: () => {
          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
            default: () => {
              return `<path fill="${"currentColor"}"${add_attribute("d", mdiPlus, 0)}></path>
							`;
            }
          })}
						`;
        }
      }
    )}` : ``}</div>

				${!courseAuxNombres ? `<div class="${"flex flex-row justify-center"}"><div class="${"mt-2"}">temps: ${escape(basket[i].delay)} s
						</div></div>
					<div class="${"ml-2 flex flex-row justify-center"}">${validate_component(Fab, "Fab").$$render(
      $$result,
      {
        class: "m-2",
        color: "secondary",
        mini: true
      },
      {},
      {
        default: () => {
          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
            default: () => {
              return `<path fill="${"currentColor"}"${add_attribute("d", mdiMinus, 0)}></path>
							`;
            }
          })}
						`;
        }
      }
    )}
						${validate_component(Fab, "Fab").$$render(
      $$result,
      {
        class: "m-2",
        color: "secondary",
        mini: true
      },
      {},
      {
        default: () => {
          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
            default: () => {
              return `<path fill="${"currentColor"}"${add_attribute("d", mdiPlus, 0)}></path>
							`;
            }
          })}
						`;
        }
      }
    )}
					</div>` : ``}</div>
		</div>`;
  })}` : `<div>Le panier est vide.</div>`}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  let $formatLatex, $$unsubscribe_formatLatex;
  let $darkmode, $$unsubscribe_darkmode;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_formatLatex = subscribe(formatLatex, (value) => $formatLatex = value);
  $$unsubscribe_darkmode = subscribe(darkmode, (value) => $darkmode = value);
  let { info, fail, warn } = getLogger("Automaths", "info");
  const questions = datas.questions;
  let domain;
  let subdomain;
  let level;
  let panelOpenStatus;
  let grade = grades[grades.length - 1];
  let availableLevels;
  let themes;
  let theme;
  let displayExemple = false;
  let generated;
  let showBasket = false;
  let classroom = false;
  let flash = false;
  let basket = [];
  let courseAuxNombres = false;
  let correction = false;
  let interactive = true;
  const ids = datas.ids;
  const first_theme = decodeURI($page.url.searchParams.get("theme"));
  const first_domain = decodeURI($page.url.searchParams.get("domain"));
  const first_subdomain = decodeURI($page.url.searchParams.get("subdomain"));
  const first_level = parseInt(decodeURI($page.url.searchParams.get("level")), 10);
  function generateExoLatex() {
    let questions2 = [];
    if (basket.length) {
      questions2 = basket;
    } else {
      const q = getQuestion(theme, domain, subdomain, level);
      questions2.push({ id: q.id, count: 10 });
    }
    let offset = 0;
    let latex = "\\begin{enumerate} \n";
    let generateds = [];
    questions2.forEach((q) => {
      const { theme: theme2, domain: domain2, subdomain: subdomain2, level: level2 } = ids[q.id];
      const question = getQuestion(theme2, domain2, subdomain2, level2);
      for (let i = 0; i < q.count; i++) {
        const generated2 = generateQuestion(question, generateds, q.count, offset);
        console.log("generated", generated2);
        latex += "\\item " + generated2.enounce.replace(/\$\$/g, "$") + "\n";
        generateds.push(generated2);
      }
      offset += q.count;
    });
    latex += "\\end{enumerate}\n";
    navigator.clipboard.writeText(latex).then(function() {
      info("latex to clipboard: ", latex);
    }).catch(function() {
      fail("failed to write exercice in latex to clipboard");
    });
  }
  function changeGrade(grade2) {
    availableLevels = getAvailablesLevels(grade2);
    themes = Object.keys(availableLevels);
    if (!theme && first_theme && themes.includes(first_theme)) {
      theme = first_theme;
    } else {
      theme = themes[0];
    }
  }
  function changeTheme(t) {
    const domains = Object.keys(availableLevels[t]);
    if (domains) {
      panelOpenStatus = {};
      domains.forEach((d2) => {
        panelOpenStatus[d2] = false;
      });
      const d = !domain && first_domain && domains.includes(first_domain) ? first_domain : domains[0];
      panelOpenStatus[d] = true;
      if (domains.length) {
        changeDomain(d);
      }
    }
  }
  function changeDomain(d) {
    domain = d;
    const subdomains = Object.keys(availableLevels[theme][domain]);
    if (subdomains && subdomains.length) {
      const subd = !subdomain && first_subdomain && subdomains.includes(first_subdomain) ? first_subdomain : subdomains[0];
      const levels = availableLevels[theme][domain][subd];
      if (levels) {
        const l = !level && first_level && levels.includes(first_level) ? first_level : levels[0];
        changeLevel(subd, l);
      }
    }
  }
  function changeLevel(subd, l) {
    subdomain = subd;
    level = l;
    generated = generateExemple(theme, domain, subdomain, level);
    if (generated.image) {
      generated.imageBase64P = fetchImage(generated.image);
    }
    if (generated.imageCorrection) {
      generated.imageCorrectionBase64P = fetchImage(generated.imageCorrection);
    }
    if (generated.choices) {
      generated.choices.forEach(async (choice) => {
        if (choice.image) {
          choice.imageBase64P = fetchImage(choice.image);
        }
      });
    }
  }
  function generateExemple(theme2, domain2, subdomain2, level2) {
    let qs = questions[theme2][domain2][subdomain2];
    const q = {
      ...qs.find((q2) => qs.indexOf(q2) + 1 === parseInt(level2, 10))
    };
    return generateQuestion(q);
  }
  function getAvailablesLevels(grade2) {
    const available = {};
    Object.keys(questions).forEach((theme2) => {
      available[theme2] = {};
      Object.keys(questions[theme2]).forEach((domain2) => {
        available[theme2][domain2] = {};
        Object.keys(questions[theme2][domain2]).forEach((subdomain2) => {
          available[theme2][domain2][subdomain2] = [];
          questions[theme2][domain2][subdomain2].forEach((q, i) => {
            if (gradeMatchesClass(q.grade, grade2)) {
              available[theme2][domain2][subdomain2].push(i + 1);
            }
          });
          if (!available[theme2][domain2][subdomain2].length) {
            delete available[theme2][domain2][subdomain2];
          }
        });
        if (!Object.keys(available[theme2][domain2]).length) {
          delete available[theme2][domain2];
        }
      });
      if (!Object.keys(available[theme2]).length) {
        delete available[theme2];
      }
    });
    return available;
  }
  function launchTest() {
    let questions2 = [];
    if (basket.length) {
      questions2 = basket;
    } else {
      const q = getQuestion(theme, domain, subdomain, level);
      questions2.push({ id: q.id, count: 10 });
    }
    let href = "/automaths/assessment/?questions=";
    href += encodeURI(JSON.stringify(questions2));
    if (classroom)
      href += "&classroom=true";
    if (flash)
      href += "&flash=true";
    if (courseAuxNombres)
      href += "&courseAuxNombres=true";
    goto(href);
  }
  function fillBasket() {
    addToBasket(theme, domain, subdomain, level, 1);
  }
  function flushBasket() {
    basket = [];
  }
  function copyLink() {
    let questions2 = [];
    if (basket.length) {
      questions2 = basket;
    } else {
      const q = getQuestion(theme, domain, subdomain, level);
      questions2.push({ id: q.id, count: 10 });
    }
    const base = dev ? "http://localhost:3000/" : "http://ubumaths.net/";
    let href = base + "automaths/assessment/?questions=";
    href += encodeURI(JSON.stringify(questions2));
    if (classroom)
      href += "&classroom=true";
    if (flash)
      href += "&flash=true";
    if (courseAuxNombres)
      href += "&courseAuxNombres=true";
    navigator.clipboard.writeText(href).then(function() {
      info("copy test url to clipboard: ", href);
    }).catch(function() {
      fail("failed to write exercice url to clipboard");
    });
  }
  function addToBasket(theme2, domain2, subdomain2, level2, count, delay) {
    let qs = questions[theme2][domain2][subdomain2];
    const q = qs.find((q2) => qs.indexOf(q2) + 1 === parseInt(level2, 10));
    if (!delay)
      delay = q.defaultDelay;
    const index = basket.findIndex((item) => item.id === q.id);
    if (index !== -1) {
      basket[index].count++;
    } else {
      basket = [...basket, { id: q.id, count, delay }];
    }
  }
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    {
      changeGrade(grade);
    }
    {
      changeTheme(theme);
    }
    {
      if (courseAuxNombres) {
        basket.forEach((item) => {
          item.count = 1;
        });
        basket = basket;
      }
    }
    $$rendered = `<h3>Les automaths !</h3>

${validate_component(Buttons, "Buttons").$$render(
      $$result,
      {
        basket,
        launchTest,
        fillBasket,
        copyLink,
        generateExoLatex,
        flushBasket,
        showBasket,
        classroom,
        flash,
        displayExemple,
        courseAuxNombres
      },
      {
        showBasket: ($$value) => {
          showBasket = $$value;
          $$settled = false;
        },
        classroom: ($$value) => {
          classroom = $$value;
          $$settled = false;
        },
        flash: ($$value) => {
          flash = $$value;
          $$settled = false;
        },
        displayExemple: ($$value) => {
          displayExemple = $$value;
          $$settled = false;
        },
        courseAuxNombres: ($$value) => {
          courseAuxNombres = $$value;
          $$settled = false;
        }
      },
      {}
    )}

${!showBasket ? `${validate_component(Select, "Select").$$render(
      $$result,
      {
        variant: "filled",
        label: "Niveau",
        value: grade
      },
      {
        value: ($$value) => {
          grade = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${validate_component(Option, "Option").$$render($$result, { value: "" }, {}, {})}
		${each(grades, (grade2) => {
            return `${validate_component(Option, "Option").$$render($$result, { value: grade2 }, {}, {
              default: () => {
                return `${escape(grade2)}`;
              }
            })}`;
          })}`;
        }
      }
    )}` : ``}

${showBasket ? `
	${validate_component(Basket, "Basket").$$render(
      $$result,
      { courseAuxNombres, addToBasket, basket },
      {
        basket: ($$value) => {
          basket = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : `${theme ? `${validate_component(TabBar, "TabBar").$$render(
      $$result,
      { tabs: themes, active: theme },
      {
        active: ($$value) => {
          theme = $$value;
          $$settled = false;
        }
      },
      {
        default: ({ tab }) => {
          return `
		${validate_component(Tab, "Tab").$$render($$result, { tab }, {}, {
            default: () => {
              return `${validate_component(CommonLabel, "Label").$$render($$result, {}, {}, {
                default: () => {
                  return `${escape(tab)}`;
                }
              })}`;
            }
          })}`;
        }
      }
    )}

	<div class="${"accordion-container"}">${validate_component(Accordion, "Accordion").$$render($$result, {}, {}, {
      default: () => {
        return `${each(Object.keys(availableLevels[theme]), (d) => {
          return `${validate_component(Panel, "Panel").$$render(
            $$result,
            { open: panelOpenStatus[d] },
            {
              open: ($$value) => {
                panelOpenStatus[d] = $$value;
                $$settled = false;
              }
            },
            {
              default: () => {
                return `${validate_component(Header, "Header").$$render($$result, {}, {}, {
                  icon: () => {
                    return `${validate_component(IconButton, "IconButton").$$render(
                      $$result,
                      {
                        slot: "icon",
                        toggle: true,
                        pressed: panelOpenStatus[d]
                      },
                      {},
                      {
                        default: () => {
                          return `${validate_component(CommonIcon, "Icon").$$render($$result, { class: "material-icons", on: true }, {}, {
                            default: () => {
                              return `expand_less`;
                            }
                          })}
							${validate_component(CommonIcon, "Icon").$$render($$result, { class: "material-icons" }, {}, {
                            default: () => {
                              return `expand_more`;
                            }
                          })}
						`;
                        }
                      }
                    )}`;
                  },
                  default: () => {
                    return `${escape(d)}
						
					`;
                  }
                })}
					${validate_component(Content, "Content").$$render($$result, {}, {}, {
                  default: () => {
                    return `<div class="${"pl-5"}">${each(Object.keys(availableLevels[theme][d]), (subd) => {
                      return `<div class="${"my-5 flex items-center"}"><span><!-- HTML_TAG_START -->${$formatLatex(subd)}<!-- HTML_TAG_END --></span>
									<div flex flex-wrap>${each(availableLevels[theme][d][subd], (i) => {
                        let q = questions[theme][d][subd][i - 1];
                        return `

											${validate_component(Fab, "Fab").$$render(
                          $$result,
                          {
                            class: "m-2",
                            style: "position: relative;",
                            color: domain === d && subdomain === subd && level === i ? "primary" : "secondary",
                            mini: true
                          },
                          {},
                          {
                            default: () => {
                              return `${escape(i)}
												${validate_component(Badge, "Badge").$$render(
                                $$result,
                                {
                                  color: "custom-green",
                                  "aria-label": "question grade"
                                },
                                {},
                                {
                                  default: () => {
                                    return `${escape(q.grade)}`;
                                  }
                                }
                              )}
											`;
                            }
                          }
                        )}`;
                      })}</div>
									<div style="${"flex-grow:1;"}"></div>
								</div>`;
                    })}</div>
					`;
                  }
                })}
				`;
              }
            }
          )}`;
        })}`;
      }
    })}</div>` : ``}`}

${displayExemple ? `
	<div class="${"flex items-center justify-center py-2"}"${add_attribute("style", `${$darkmode ? "border-radius:5px;background:#fff" : ""};position:sticky; bottom:0; z-index:2;`, 0)}><div${add_attribute("style", `width:95vw;max-width:600px;`, 0)}>${validate_component(QuestionCard, "QuestionCard").$$render(
      $$result,
      {
        card: generated,
        showDescription: true,
        immediateCommit: false,
        correction,
        interactive
      },
      {
        correction: ($$value) => {
          correction = $$value;
          $$settled = false;
        },
        interactive: ($$value) => {
          interactive = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div></div>` : ``}`;
  } while (!$$settled);
  $$unsubscribe_page();
  $$unsubscribe_formatLatex();
  $$unsubscribe_darkmode();
  return $$rendered;
});
export {
  Page as default
};
