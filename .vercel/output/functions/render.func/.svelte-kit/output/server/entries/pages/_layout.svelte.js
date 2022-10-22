import { c as create_ssr_component, b as subscribe } from "../../chunks/index.js";
import { t as touchDevice } from "../../chunks/stores.js";
import { g as getLogger } from "../../chunks/utils.js";
const app = "";
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $touchDevice, $$unsubscribe_touchDevice;
  $$unsubscribe_touchDevice = subscribe(touchDevice, (value) => $touchDevice = value);
  let { info, fail, warn } = getLogger("Global layout", "info");
  info("-- Initialization --");
  {
    console.log("touchDevice :", $touchDevice);
  }
  $$unsubscribe_touchDevice();
  return `${$$result.head += `<!-- HEAD_svelte-t4zcaf_START -->${$$result.title = `<title>UbuMaths - Les maths de la chandelle verte</title>`, ""}<!-- HEAD_svelte-t4zcaf_END -->`, ""}

${slots.default ? slots.default({}) : ``}`;
});
export {
  Layout as default
};
