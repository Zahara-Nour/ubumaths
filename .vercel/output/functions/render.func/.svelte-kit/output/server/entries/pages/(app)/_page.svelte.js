import { c as create_ssr_component, b as subscribe } from "../../../chunks/index.js";
import { a as toMarkup } from "../../../chunks/stores.js";
const math = "3+\\frac{4}{5}";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $toMarkup, $$unsubscribe_toMarkup;
  $$unsubscribe_toMarkup = subscribe(toMarkup, (value) => $toMarkup = value);
  $$unsubscribe_toMarkup();
  return `<h1>Hello</h1>
<!-- HTML_TAG_START -->${$toMarkup(math)}<!-- HTML_TAG_END -->`;
});
export {
  Page as default
};
