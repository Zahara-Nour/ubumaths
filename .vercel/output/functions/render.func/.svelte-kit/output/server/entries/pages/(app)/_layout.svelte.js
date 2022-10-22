import { c as create_ssr_component, d as compute_rest_props, f as get_current_component, h as spread, i as escape_attribute_value, j as escape_object, k as add_attribute, s as setContext, o as onDestroy, v as validate_component, m as missing_component, b as subscribe, l as each, e as escape } from "../../../chunks/index.js";
import { f as forwardEventsBuilder, c as classMap, a as classAdderBuilder, S as SmuiElement, b as Svg, C as CommonIcon, m as mdc_colors } from "../../../chunks/Ripple.js";
import { MDCTopAppBarBaseFoundation, MDCShortTopAppBarFoundation, MDCFixedTopAppBarFoundation, MDCTopAppBarFoundation } from "@material/top-app-bar";
import { r as readable } from "../../../chunks/index2.js";
import { d as dispatch, L as List, I as Item, T as Text, a as IconButton } from "../../../chunks/Subheader.js";
import { MDCDismissibleDrawerFoundation, MDCModalDrawerFoundation } from "@material/drawer";
import { mdiFormatFontSizeDecrease, mdiFormatFontSizeIncrease } from "@mdi/js";
import { d as darkmode } from "../../../chunks/stores.js";
import { g as getLogger } from "../../../chunks/utils.js";
const links = [
  { text: "AutoMaths", url: "/automaths", tooltip: "Travailler les automatismes" },
  { text: "Blog", url: "/blog", tooltip: "" }
];
const TopAppBar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "style",
    "variant",
    "color",
    "collapsed",
    "prominent",
    "dense",
    "scrollTarget",
    "getPropStore",
    "getElement"
  ]);
  forwardEventsBuilder(get_current_component());
  let uninitializedValue = () => {
  };
  function isUninitializedValue(value) {
    return value === uninitializedValue;
  }
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { style = "" } = $$props;
  let { variant = "standard" } = $$props;
  let { color = "primary" } = $$props;
  let { collapsed = uninitializedValue } = $$props;
  const alwaysCollapsed = !isUninitializedValue(collapsed) && !!collapsed;
  if (isUninitializedValue(collapsed)) {
    collapsed = false;
  }
  let { prominent: prominent2 = false } = $$props;
  let { dense: dense2 = false } = $$props;
  let { scrollTarget = void 0 } = $$props;
  let element;
  let instance;
  let internalClasses = {};
  let internalStyles = {};
  let propStoreSet;
  let propStore = readable({ variant, prominent: prominent2, dense: dense2 }, (set) => {
    propStoreSet = set;
  });
  let oldScrollTarget = void 0;
  let oldVariant = variant;
  function getInstance() {
    const Foundation = {
      static: MDCTopAppBarBaseFoundation,
      short: MDCShortTopAppBarFoundation,
      fixed: MDCFixedTopAppBarFoundation,
      standard: MDCTopAppBarFoundation
    }[variant] || MDCTopAppBarFoundation;
    return new Foundation({
      hasClass,
      addClass,
      removeClass,
      setStyle: addStyle,
      getTopAppBarHeight: () => element.clientHeight,
      notifyNavigationIconClicked: () => dispatch(element, "SMUITopAppBar:nav", void 0, void 0, true),
      getViewportScrollY: () => scrollTarget == null ? window.pageYOffset : scrollTarget.scrollTop,
      getTotalActionItems: () => element.querySelectorAll(".mdc-top-app-bar__action-item").length
    });
  }
  function hasClass(className2) {
    return className2 in internalClasses ? internalClasses[className2] : getElement().classList.contains(className2);
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
  function handleTargetScroll() {
    if (instance) {
      instance.handleTargetScroll();
      if (variant === "short") {
        collapsed = "isCollapsed" in instance && instance.isCollapsed;
      }
    }
  }
  function getPropStore() {
    return propStore;
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
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0)
    $$bindings.color(color);
  if ($$props.collapsed === void 0 && $$bindings.collapsed && collapsed !== void 0)
    $$bindings.collapsed(collapsed);
  if ($$props.prominent === void 0 && $$bindings.prominent && prominent2 !== void 0)
    $$bindings.prominent(prominent2);
  if ($$props.dense === void 0 && $$bindings.dense && dense2 !== void 0)
    $$bindings.dense(dense2);
  if ($$props.scrollTarget === void 0 && $$bindings.scrollTarget && scrollTarget !== void 0)
    $$bindings.scrollTarget(scrollTarget);
  if ($$props.getPropStore === void 0 && $$bindings.getPropStore && getPropStore !== void 0)
    $$bindings.getPropStore(getPropStore);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  {
    if (propStoreSet) {
      propStoreSet({ variant, prominent: prominent2, dense: dense2 });
    }
  }
  {
    if (oldVariant !== variant && instance) {
      oldVariant = variant;
      instance.destroy();
      internalClasses = {};
      internalStyles = {};
      instance = getInstance();
      instance.init();
    }
  }
  {
    if (instance && variant === "short" && "setAlwaysCollapsed" in instance) {
      instance.setAlwaysCollapsed(alwaysCollapsed);
    }
  }
  {
    if (oldScrollTarget !== scrollTarget) {
      if (oldScrollTarget) {
        oldScrollTarget.removeEventListener("scroll", handleTargetScroll);
      }
      if (scrollTarget) {
        scrollTarget.addEventListener("scroll", handleTargetScroll);
      }
      oldScrollTarget = scrollTarget;
    }
  }
  return `

<header${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-top-app-bar": true,
          "mdc-top-app-bar--short": variant === "short",
          "mdc-top-app-bar--short-collapsed": collapsed,
          "mdc-top-app-bar--fixed": variant === "fixed",
          "smui-top-app-bar--static": variant === "static",
          "smui-top-app-bar--color-secondary": color === "secondary",
          "mdc-top-app-bar--prominent": prominent2,
          "mdc-top-app-bar--dense": dense2,
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
</header>`;
});
const Row = classAdderBuilder({
  class: "mdc-top-app-bar__row",
  tag: "div"
});
const Section = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "align", "toolbar", "getElement"]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { align = "start" } = $$props;
  let { toolbar = false } = $$props;
  let element;
  setContext("SMUI:icon-button:context", toolbar ? "top-app-bar:action" : "top-app-bar:navigation");
  setContext("SMUI:button:context", toolbar ? "top-app-bar:action" : "top-app-bar:navigation");
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.align === void 0 && $$bindings.align && align !== void 0)
    $$bindings.align(align);
  if ($$props.toolbar === void 0 && $$bindings.toolbar && toolbar !== void 0)
    $$bindings.toolbar(toolbar);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<section${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-top-app-bar__section": true,
          "mdc-top-app-bar__section--align-start": align === "start",
          "mdc-top-app-bar__section--align-end": align === "end"
        }))
      },
      escape_object(toolbar ? { role: "toolbar" } : {}),
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}
</section>`;
});
const TitleBar = classAdderBuilder({
  class: "mdc-top-app-bar__title",
  tag: "span"
});
const Drawer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "variant", "open", "fixed", "setOpen", "isOpen", "getElement"]);
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { variant = void 0 } = $$props;
  let { open = false } = $$props;
  let { fixed = true } = $$props;
  let element;
  let instance = void 0;
  let internalClasses = {};
  let previousFocus = null;
  let focusTrap;
  let scrim = false;
  setContext("SMUI:list:nav", true);
  setContext("SMUI:list:item:nav", true);
  setContext("SMUI:list:wrapFocus", true);
  let oldVariant = variant;
  onDestroy(() => {
    instance && instance.destroy();
    scrim && scrim.removeEventListener("SMUIDrawerScrim:click", handleScrimClick);
  });
  function getInstance() {
    var _a, _b;
    if (scrim) {
      scrim.removeEventListener("SMUIDrawerScrim:click", handleScrimClick);
    }
    if (variant === "modal") {
      scrim = (_b = (_a = element.parentNode) === null || _a === void 0 ? void 0 : _a.querySelector(".mdc-drawer-scrim")) !== null && _b !== void 0 ? _b : false;
      if (scrim) {
        scrim.addEventListener("SMUIDrawerScrim:click", handleScrimClick);
      }
    }
    const Foundation = variant === "dismissible" ? MDCDismissibleDrawerFoundation : variant === "modal" ? MDCModalDrawerFoundation : void 0;
    return Foundation ? new Foundation({
      addClass,
      removeClass,
      hasClass,
      elementHasClass: (element2, className2) => element2.classList.contains(className2),
      saveFocus: () => previousFocus = document.activeElement,
      restoreFocus: () => {
        if (previousFocus && "focus" in previousFocus && element.contains(document.activeElement)) {
          previousFocus.focus();
        }
      },
      focusActiveNavigationItem: () => {
        const activeNavItemEl = element.querySelector(".mdc-list-item--activated,.mdc-deprecated-list-item--activated");
        if (activeNavItemEl) {
          activeNavItemEl.focus();
        }
      },
      notifyClose: () => {
        open = false;
        dispatch(element, "SMUIDrawer:closed", void 0, void 0, true);
      },
      notifyOpen: () => {
        open = true;
        dispatch(element, "SMUIDrawer:opened", void 0, void 0, true);
      },
      trapFocus: () => focusTrap.trapFocus(),
      releaseFocus: () => focusTrap.releaseFocus()
    }) : void 0;
  }
  function hasClass(className2) {
    return className2 in internalClasses ? internalClasses[className2] : getElement().classList.contains(className2);
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
  function handleScrimClick() {
    instance && "handleScrimClick" in instance && instance.handleScrimClick();
  }
  function setOpen(value) {
    open = value;
  }
  function isOpen() {
    return open;
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.fixed === void 0 && $$bindings.fixed && fixed !== void 0)
    $$bindings.fixed(fixed);
  if ($$props.setOpen === void 0 && $$bindings.setOpen && setOpen !== void 0)
    $$bindings.setOpen(setOpen);
  if ($$props.isOpen === void 0 && $$bindings.isOpen && isOpen !== void 0)
    $$bindings.isOpen(isOpen);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  {
    if (oldVariant !== variant) {
      oldVariant = variant;
      instance && instance.destroy();
      internalClasses = {};
      instance = getInstance();
      instance && instance.init();
    }
  }
  {
    if (instance && instance.isOpen() !== open) {
      if (open) {
        instance.open();
      } else {
        instance.close();
      }
    }
  }
  return `<aside${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [className]: true,
          "mdc-drawer": true,
          "mdc-drawer--dismissible": variant === "dismissible",
          "mdc-drawer--modal": variant === "modal",
          "smui-drawer__absolute": variant === "modal" && !fixed,
          ...internalClasses
        }))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}>${slots.default ? slots.default({}) : ``}
</aside>`;
});
const AppContent = classAdderBuilder({
  class: "mdc-drawer-app-content",
  tag: "div"
});
const Content = classAdderBuilder({
  class: "mdc-drawer__content",
  tag: "div"
});
const Header = classAdderBuilder({
  class: "mdc-drawer__header",
  tag: "div"
});
classAdderBuilder({
  class: "mdc-drawer__title",
  tag: "h1"
});
const Subtitle = classAdderBuilder({
  class: "mdc-drawer__subtitle",
  tag: "h2"
});
const Scrim = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["use", "class", "fixed", "component", "tag", "getElement"]);
  const forwardEvents = forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { fixed = true } = $$props;
  let element;
  let { component = SmuiElement } = $$props;
  let { tag = component === SmuiElement ? "div" : void 0 } = $$props;
  function getElement() {
    return element.getElement();
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.fixed === void 0 && $$bindings.fixed && fixed !== void 0)
    $$bindings.fixed(fixed);
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
            "mdc-drawer-scrim": true,
            "smui-drawer-scrim__absolute": !fixed
          })
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
  return $$rendered;
});
let prominent = false;
let dense = false;
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $darkmode, $$unsubscribe_darkmode;
  $$unsubscribe_darkmode = subscribe(darkmode, (value) => $darkmode = value);
  getLogger("Layout", "info");
  let active = links[0].text;
  let showDrawer = false;
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `

${$$result.head += `<!-- HEAD_svelte-lk6c3x_START -->${$darkmode ? `
		
		
		<link rel="${"stylesheet"}" href="${"/site-dark.css"}">` : `
		
		
		<link rel="${"stylesheet"}" href="${"/site.css"}">`}<!-- HEAD_svelte-lk6c3x_END -->`, ""}

${validate_component(Drawer, "Drawer").$$render(
      $$result,
      { variant: "modal", open: showDrawer },
      {
        open: ($$value) => {
          showDrawer = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${validate_component(Header, "Header").$$render($$result, {}, {}, {
            default: () => {
              return `${validate_component(TitleBar, "TitleBar").$$render($$result, {}, {}, {
                default: () => {
                  return `Ubumaths`;
                }
              })}
		${validate_component(Subtitle, "Subtitle").$$render($$result, {}, {}, {
                default: () => {
                  return `Les maths de la chandelle verte`;
                }
              })}`;
            }
          })}
	${validate_component(Content, "Content").$$render($$result, {}, {}, {
            default: () => {
              return `${validate_component(List, "List").$$render($$result, {}, {}, {
                default: () => {
                  return `${each(links, (link) => {
                    return `${validate_component(Item, "Item").$$render(
                      $$result,
                      {
                        href: "javascript:void(0)",
                        activated: active === link.text
                      },
                      {},
                      {
                        default: () => {
                          return `${validate_component(Text, "Text").$$render($$result, {}, {}, {
                            default: () => {
                              return `${escape(link.text)}`;
                            }
                          })}
				`;
                        }
                      }
                    )}`;
                  })}`;
                }
              })}`;
            }
          })}`;
        }
      }
    )}

${validate_component(Scrim, "Scrim").$$render($$result, {}, {}, {})}
${validate_component(AppContent, "AppContent").$$render($$result, { class: "app-content" }, {}, {
      default: () => {
        return `${validate_component(TopAppBar, "TopAppBar").$$render(
          $$result,
          {
            variant: "static",
            prominent,
            dense,
            color: "primary"
          },
          {},
          {
            default: () => {
              return `${validate_component(Row, "Row").$$render($$result, {}, {}, {
                default: () => {
                  return `${validate_component(Section, "Section").$$render($$result, {}, {}, {
                    default: () => {
                      return `${validate_component(TitleBar, "TitleBar").$$render($$result, {}, {}, {
                        default: () => {
                          return `<a href="${"/"}">UbuMaths</a>`;
                        }
                      })}`;
                    }
                  })}
			${validate_component(Section, "Section").$$render($$result, {}, {}, {
                    default: () => {
                      return `${`<div>${each(links, (link) => {
                        return `<a class="${"mx-2"}"${add_attribute("href", link.url, 0)}>${escape(link.text)}</a>`;
                      })}</div>`}`;
                    }
                  })}
			${validate_component(Section, "Section").$$render($$result, { align: "end", toolbar: true }, {}, {
                    default: () => {
                      return `${validate_component(IconButton, "IconButton").$$render($$result, {}, {}, {
                        default: () => {
                          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "0 0 24 24" }, {}, {
                            default: () => {
                              return `<path fill="${"currentColor"}"${add_attribute("d", mdiFormatFontSizeDecrease, 0)}></path>`;
                            }
                          })}`;
                        }
                      })}
				${validate_component(IconButton, "IconButton").$$render($$result, {}, {}, {
                        default: () => {
                          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "0 0 24 24" }, {}, {
                            default: () => {
                              return `<path fill="${"currentColor"}"${add_attribute("d", mdiFormatFontSizeIncrease, 0)}></path>`;
                            }
                          })}`;
                        }
                      })}

				${$darkmode ? `${validate_component(IconButton, "IconButton").$$render(
                        $$result,
                        {
                          class: "material-icons",
                          "aria-label": "Switch to light mode"
                        },
                        {},
                        {
                          default: () => {
                            return `light_mode`;
                          }
                        }
                      )}` : `${validate_component(IconButton, "IconButton").$$render(
                        $$result,
                        {
                          class: "material-icons",
                          "aria-label": "switch to dark mode"
                        },
                        {},
                        {
                          default: () => {
                            return `dark_mode`;
                          }
                        }
                      )}`}
				
				${``}`;
                    }
                  })}`;
                }
              })}`;
            }
          }
        )}
	
	
	<div style="${"min-height: calc(100vh - 144px);"}">
		<div style="${"height:1px"}"></div>
		${slots.default ? slots.default({}) : ``}
		<div style="${"height:1px"}"></div></div>
	<div${add_attribute("style", `width:100vw;height:80px;background:${mdc_colors["grey-200"]}`, 0)}><div class="${"h-full p-2 flex items-center justify-between"}"><a rel="${"noreferrer"}" style="${"height:100%"}" target="${"_blank"}" href="${"https://www.lyceevoltaire.org/"}"><img height="${"100%"}" alt="${"logo lyc\xE9e voltaire"}" src="${"/images/logo-voltaire.png"}"></a>
			<span style="${"color:var(--mdc-theme-secondary)"}">D. Le Jolly</span></div></div>`;
      }
    })}`;
  } while (!$$settled);
  $$unsubscribe_darkmode();
  return $$rendered;
});
export {
  Layout as default
};
