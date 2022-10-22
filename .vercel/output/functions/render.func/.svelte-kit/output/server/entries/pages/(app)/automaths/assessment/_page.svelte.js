import { c as create_ssr_component, d as compute_rest_props, f as get_current_component, g as getContext, o as onDestroy, h as spread, i as escape_attribute_value, j as escape_object, k as add_attribute, l as each, e as escape, C as null_to_empty, v as validate_component, b as subscribe, s as setContext } from "../../../../../chunks/index.js";
import { e as exclude, p as prefixFilter, i as QuestionCard, j as STATUS_CORRECT, k as STATUS_UNOPTIMAL_FORM, F as Fab, g as getQuestion, a as generateQuestion, f as fetchImage, l as Button, h as CommonLabel, d as datas } from "../../../../../chunks/images.js";
import { f as forwardEventsBuilder, c as classMap, g as correct_color, u as unoptimal_color, i as incorrect_color, C as CommonIcon, b as Svg } from "../../../../../chunks/Ripple.js";
import { TickMark } from "@material/slider";
import { g as getLogger, s as shuffle } from "../../../../../chunks/utils.js";
import { p as page } from "../../../../../chunks/stores2.js";
import { v as virtualKeyboardMode, t as touchDevice, m as mathliveReady } from "../../../../../chunks/stores.js";
import { mdiScanHelper, mdiReload, mdiHome, mdiRestart, mdiRocketLaunchOutline, mdiKeyboard } from "@mdi/js";
import math from "tinycas";
const Slider = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "use",
    "class",
    "disabled",
    "range",
    "discrete",
    "tickMarks",
    "step",
    "min",
    "max",
    "minRange",
    "value",
    "start",
    "end",
    "valueToAriaValueTextFn",
    "hideFocusStylesForPointerEvents",
    "input$class",
    "layout",
    "getId",
    "getElement"
  ]);
  var _a;
  forwardEventsBuilder(get_current_component());
  let { use = [] } = $$props;
  let { class: className = "" } = $$props;
  let { disabled = false } = $$props;
  let { range = false } = $$props;
  let { discrete = false } = $$props;
  let { tickMarks = false } = $$props;
  let { step = 1 } = $$props;
  let { min: min2 = 0 } = $$props;
  let { max: max2 = 100 } = $$props;
  let { minRange = 0 } = $$props;
  let { value = void 0 } = $$props;
  let { start = void 0 } = $$props;
  let { end = void 0 } = $$props;
  let { valueToAriaValueTextFn = (value2) => `${value2}` } = $$props;
  let { hideFocusStylesForPointerEvents = false } = $$props;
  let { input$class = "" } = $$props;
  let element;
  let instance;
  let input;
  let inputStart = void 0;
  let thumbEl;
  let thumbStart = void 0;
  let thumbKnob;
  let thumbKnobStart = void 0;
  let internalClasses = {};
  let thumbStartClasses = {};
  let thumbClasses = {};
  let inputAttrs = {};
  let inputStartAttrs = {};
  let trackActiveStyles = {};
  let thumbStyles = {};
  let thumbStartStyles = {};
  let currentTickMarks;
  let inputProps = (_a = getContext("SMUI:generic:input:props")) !== null && _a !== void 0 ? _a : {};
  let addLayoutListener = getContext("SMUI:addLayoutListener");
  let removeLayoutListener;
  if (tickMarks && step > 0) {
    const absMax = max2 + Math.abs(min2);
    if (range && typeof start === "number" && typeof end === "number") {
      const absStart = start + Math.abs(min2);
      const absEnd = end + Math.abs(min2);
      currentTickMarks = [
        ...Array(absStart / step).map(() => TickMark.INACTIVE),
        ...Array(absMax / step - absStart / step - (absMax - absEnd) / step + 1).map(() => TickMark.ACTIVE),
        ...Array((absMax - absEnd) / step).map(() => TickMark.INACTIVE)
      ];
    } else if (typeof value === "number") {
      const absValue = value + Math.abs(min2);
      currentTickMarks = [
        ...Array(absValue / step + 1).map(() => TickMark.ACTIVE),
        ...Array((absMax - absValue) / step).map(() => TickMark.INACTIVE)
      ];
    }
  }
  if (range && typeof start === "number" && typeof end === "number") {
    const percent = (end - start) / (max2 - min2);
    const percentStart = start / (max2 - min2);
    const percentEnd = end / (max2 - min2);
    trackActiveStyles.transform = `scaleX(${percent})`;
    thumbStyles.left = `calc(${percentEnd * 100}% -24px)`;
    thumbStartStyles.left = `calc(${percentStart * 100}% -24px)`;
  } else if (typeof value === "number") {
    const percent = value / (max2 - min2);
    trackActiveStyles.transform = `scaleX(${percent})`;
    thumbStyles.left = `calc(${percent * 100}% -24px)`;
  }
  if (addLayoutListener) {
    removeLayoutListener = addLayoutListener(layout);
  }
  onDestroy(() => {
    if (removeLayoutListener) {
      removeLayoutListener();
    }
  });
  function layout() {
    return instance.layout();
  }
  function getId() {
    return inputProps && inputProps.id;
  }
  function getElement() {
    return element;
  }
  if ($$props.use === void 0 && $$bindings.use && use !== void 0)
    $$bindings.use(use);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.range === void 0 && $$bindings.range && range !== void 0)
    $$bindings.range(range);
  if ($$props.discrete === void 0 && $$bindings.discrete && discrete !== void 0)
    $$bindings.discrete(discrete);
  if ($$props.tickMarks === void 0 && $$bindings.tickMarks && tickMarks !== void 0)
    $$bindings.tickMarks(tickMarks);
  if ($$props.step === void 0 && $$bindings.step && step !== void 0)
    $$bindings.step(step);
  if ($$props.min === void 0 && $$bindings.min && min2 !== void 0)
    $$bindings.min(min2);
  if ($$props.max === void 0 && $$bindings.max && max2 !== void 0)
    $$bindings.max(max2);
  if ($$props.minRange === void 0 && $$bindings.minRange && minRange !== void 0)
    $$bindings.minRange(minRange);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.start === void 0 && $$bindings.start && start !== void 0)
    $$bindings.start(start);
  if ($$props.end === void 0 && $$bindings.end && end !== void 0)
    $$bindings.end(end);
  if ($$props.valueToAriaValueTextFn === void 0 && $$bindings.valueToAriaValueTextFn && valueToAriaValueTextFn !== void 0)
    $$bindings.valueToAriaValueTextFn(valueToAriaValueTextFn);
  if ($$props.hideFocusStylesForPointerEvents === void 0 && $$bindings.hideFocusStylesForPointerEvents && hideFocusStylesForPointerEvents !== void 0)
    $$bindings.hideFocusStylesForPointerEvents(hideFocusStylesForPointerEvents);
  if ($$props.input$class === void 0 && $$bindings.input$class && input$class !== void 0)
    $$bindings.input$class(input$class);
  if ($$props.layout === void 0 && $$bindings.layout && layout !== void 0)
    $$bindings.layout(layout);
  if ($$props.getId === void 0 && $$bindings.getId && getId !== void 0)
    $$bindings.getId(getId);
  if ($$props.getElement === void 0 && $$bindings.getElement && getElement !== void 0)
    $$bindings.getElement(getElement);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(Object.entries({
          [className]: true,
          "mdc-slider": true,
          "mdc-slider--range": range,
          "mdc-slider--discrete": discrete,
          "mdc-slider--tick-marks": discrete && tickMarks,
          "mdc-slider--disabled": disabled,
          ...internalClasses
        }).filter(([name, value2]) => name !== "" && value2).map(([name]) => name).join(" "))
      },
      escape_object(range ? { "data-min-range": `${minRange}` } : {}),
      escape_object(exclude($$restProps, ["input$"]))
    ],
    {}
  )}${add_attribute("this", element, 0)}>${range ? `<input${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [input$class]: true,
          "mdc-slider__input": true
        }))
      },
      { type: "range" },
      { disabled: disabled || null },
      { step: escape_attribute_value(step) },
      { min: escape_attribute_value(min2) },
      { max: escape_attribute_value(end) },
      escape_object(inputStartAttrs),
      escape_object(prefixFilter($$restProps, "input$"))
    ],
    {}
  )}${add_attribute("this", inputStart, 0)}${add_attribute("value", start, 0)}>
    <input${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [input$class]: true,
          "mdc-slider__input": true
        }))
      },
      { type: "range" },
      { disabled: disabled || null },
      { step: escape_attribute_value(step) },
      { min: escape_attribute_value(start) },
      { max: escape_attribute_value(max2) },
      escape_object(inputProps),
      escape_object(inputAttrs),
      escape_object(prefixFilter($$restProps, "input$"))
    ],
    {}
  )}${add_attribute("this", input, 0)}${add_attribute("value", end, 0)}>` : `<input${spread(
    [
      {
        class: escape_attribute_value(classMap({
          [input$class]: true,
          "mdc-slider__input": true
        }))
      },
      { type: "range" },
      { disabled: disabled || null },
      { step: escape_attribute_value(step) },
      { min: escape_attribute_value(min2) },
      { max: escape_attribute_value(max2) },
      escape_object(inputProps),
      escape_object(inputAttrs),
      escape_object(prefixFilter($$restProps, "input$"))
    ],
    {}
  )}${add_attribute("this", input, 0)}${add_attribute("value", value, 0)}>`}

  <div class="${"mdc-slider__track"}"><div class="${"mdc-slider__track--inactive"}"></div>
    <div class="${"mdc-slider__track--active"}"><div class="${"mdc-slider__track--active_fill"}"${add_attribute("style", Object.entries(trackActiveStyles).map(([name, value2]) => `${name}: ${value2};`).join(" "), 0)}></div></div>
    ${discrete && tickMarks && step > 0 ? `<div class="${"mdc-slider__tick-marks"}">${each(currentTickMarks, (tickMark) => {
    return `<div${add_attribute(
      "class",
      tickMark === TickMark.ACTIVE ? "mdc-slider__tick-mark--active" : "mdc-slider__tick-mark--inactive",
      0
    )}></div>`;
  })}</div>` : ``}</div>
  ${range ? `<div${add_attribute(
    "class",
    classMap({
      "mdc-slider__thumb": true,
      ...thumbStartClasses
    }),
    0
  )}${add_attribute("style", Object.entries(thumbStartStyles).map(([name, value2]) => `${name}: ${value2};`).join(" "), 0)}${add_attribute("this", thumbStart, 0)}>${discrete ? `<div class="${"mdc-slider__value-indicator-container"}" aria-hidden="${"true"}"><div class="${"mdc-slider__value-indicator"}"><span class="${"mdc-slider__value-indicator-text"}">${escape(start)}</span></div></div>` : ``}
      <div class="${"mdc-slider__thumb-knob"}"${add_attribute("this", thumbKnobStart, 0)}></div></div>
    <div${add_attribute(
    "class",
    classMap({
      "mdc-slider__thumb": true,
      ...thumbClasses
    }),
    0
  )}${add_attribute("style", Object.entries(thumbStyles).map(([name, value2]) => `${name}: ${value2};`).join(" "), 0)}${add_attribute("this", thumbEl, 0)}>${discrete ? `<div class="${"mdc-slider__value-indicator-container"}" aria-hidden="${"true"}"><div class="${"mdc-slider__value-indicator"}"><span class="${"mdc-slider__value-indicator-text"}">${escape(end)}</span></div></div>` : ``}
      <div class="${"mdc-slider__thumb-knob"}"${add_attribute("this", thumbKnob, 0)}></div></div>` : `<div${add_attribute(
    "class",
    classMap({
      "mdc-slider__thumb": true,
      ...thumbClasses
    }),
    0
  )}${add_attribute("style", Object.entries(thumbStyles).map(([name, value2]) => `${name}: ${value2};`).join(" "), 0)}${add_attribute("this", thumbEl, 0)}>${discrete ? `<div class="${"mdc-slider__value-indicator-container"}" aria-hidden="${"true"}"><div class="${"mdc-slider__value-indicator"}"><span class="${"mdc-slider__value-indicator-text"}">${escape(value)}</span></div></div>` : ``}
      <div class="${"mdc-slider__thumb-knob"}"${add_attribute("this", thumbKnob, 0)}></div></div>`}
</div>`;
});
const CircularProgress_svelte_svelte_type_style_lang = "";
const css$3 = {
  code: ".circle-progress.svelte-17xuc5m{transform:rotate(-90deg);transform-origin:50% 50%;stroke-linecap:round;stroke-linejoin:round}.nopulse.svelte-17xuc5m{fill:none;opacity:0}.pulse.svelte-17xuc5m{fill:red;animation:svelte-17xuc5m-pulse 1.5s infinite cubic-bezier(0.66, 0, 0, 1);transform-origin:50% 50%}@keyframes svelte-17xuc5m-pulse{from{fill-opacity:1;transform:scale(1)}to{fill-opacity:0;transform:scale(1.8)}}",
  map: null
};
const CircularProgress = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let strokeWidth;
  let { number } = $$props;
  let { fontSize } = $$props;
  let { percentage } = $$props;
  let { pulse } = $$props;
  let sqSize;
  let radius;
  let dashArray;
  let dashOffset;
  let gradient = [
    "#71db3f",
    "#79d837",
    "#81d52e",
    "#88d225",
    "#8ecf1b",
    "#95cc0d",
    "#9ac900",
    "#a0c600",
    "#a5c300",
    "#abbf00",
    "#b0bc00",
    "#b4b900",
    "#b9b500",
    "#bdb200",
    "#c2ae00",
    "#c6ab00",
    "#caa700",
    "#cea300",
    "#d19f00",
    "#d59c00",
    "#d89800",
    "#db9400",
    "#de9000",
    "#e18c00",
    "#e48700",
    "#e68300",
    "#e87f00",
    "#eb7b00",
    "#ed7601",
    "#ee720c",
    "#f06d15",
    "#f2691c",
    "#f36422",
    "#f46027",
    "#f55b2c",
    "#f55631",
    "#f65236",
    "#f64d3a",
    "#f6483f",
    "#f64343"
  ];
  let color = gradient[0];
  if ($$props.number === void 0 && $$bindings.number && number !== void 0)
    $$bindings.number(number);
  if ($$props.fontSize === void 0 && $$bindings.fontSize && fontSize !== void 0)
    $$bindings.fontSize(fontSize);
  if ($$props.percentage === void 0 && $$bindings.percentage && percentage !== void 0)
    $$bindings.percentage(percentage);
  if ($$props.pulse === void 0 && $$bindings.pulse && pulse !== void 0)
    $$bindings.pulse(pulse);
  $$result.css.add(css$3);
  sqSize = fontSize * 3;
  strokeWidth = fontSize / 4 + 2;
  radius = sqSize / 3.6;
  dashArray = radius * Math.PI * 2;
  dashOffset = dashArray - dashArray * percentage / 100;
  color = gradient[Math.floor((100 - percentage) / 100 * 40)];
  return `<div style="${"--theme-color: " + escape(color, true) + ";position: relative;display: inline-block;text-align: center;color:black;"}"><svg${add_attribute("width", sqSize, 0)}${add_attribute("height", sqSize, 0)}><circle class="${escape(null_to_empty(pulse ? "pulse" : "nopulse"), true) + " svelte-17xuc5m"}" cx="${"50%"}" cy="${"50%"}"${add_attribute("r", radius, 0)}></circle><circle cx="${"50%"}" cy="${"50%"}"${add_attribute("r", radius, 0)} stroke="${"#ddd"}" fill="${"white"}"${add_attribute("stroke-width", `${strokeWidth}px`, 0)}></circle><circle class="${"circle-progress svelte-17xuc5m"}" cx="${"50%"}" cy="${"50%"}"${add_attribute("r", radius, 0)} fill="${"none"}"${add_attribute("stroke", color, 0)}${add_attribute("stroke-width", `${strokeWidth}px`, 0)}${add_attribute("stroke-dasharray", dashArray, 0)}${add_attribute("stroke-dashoffset", dashOffset, 0)}></circle></svg>
  <div${add_attribute("style", `font-size: ${fontSize}px;position: absolute;left: 50%;top: 48%;transform: translate(-50%, -70%);font-family:'pacifico'`, 0)}>${escape(number)}</div>
</div>`;
});
function createTimer(delay, tick, timeout) {
  let ticker;
  let status = "done";
  let days;
  let hours;
  let minutes;
  let seconds;
  let remaining = delay;
  calculate(remaining);
  function calculate(remaining2) {
    days = Math.floor(remaining2 * 1e3 / (1e3 * 60 * 60 * 24));
    hours = Math.floor(
      remaining2 * 1e3 % (1e3 * 60 * 60 * 24) / (1e3 * 60 * 60)
    );
    minutes = Math.floor(remaining2 * 1e3 % (1e3 * 60 * 60) / (1e3 * 60));
    seconds = Math.floor(remaining2 * 1e3 % (1e3 * 60) / 1e3);
  }
  const callback = () => {
    remaining -= 1;
    calculate(remaining);
    tick();
    if (remaining <= 0) {
      clearInterval(ticker);
      timeout();
    }
  };
  const timer = {
    status() {
      return status;
    },
    start() {
      remaining = delay;
      calculate(remaining);
      if (ticker)
        clearInterval(ticker);
      ticker = setInterval(callback, 1e3);
      status = "running";
    },
    pause() {
      if (status === "running") {
        status = "paused";
        clearInterval(ticker);
        ticker = null;
      }
    },
    stop() {
      if (status === "running") {
        clearInterval(ticker);
        ticker = null;
        status = "done";
      }
    },
    resume() {
      if (status === "paused") {
        ticker = setInterval(callback, 1e3);
        status = "running";
      }
    },
    getTime() {
      return { days, hours, minutes, seconds };
    }
  };
  return timer;
}
const CorrectionItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { item } = $$props;
  const { simpleCorrection: correction, coms } = item;
  let { magnify } = $$props;
  if ($$props.item === void 0 && $$bindings.item && item !== void 0)
    $$bindings.item(item);
  if ($$props.magnify === void 0 && $$bindings.magnify && magnify !== void 0)
    $$bindings.magnify(magnify);
  return `${correction ? `<div class="${"ml-3 grow flex flex-wrap "}"><div class="${"mr-3 mb-4 w-full"}" style="${"word-break: break-word ;min-width: 100px;w-full; white-space: normal;"}">${validate_component(QuestionCard, "QuestionCard").$$render(
    $$result,
    {
      card: item,
      correction: true,
      flashcard: !!item.correctionDetails,
      magnify
    },
    {},
    {}
  )}</div>
		<div>${coms.length ? `${each(coms, (com) => {
    return `<div class="${"mb-1 z-0 relative"}" style="${"font-family: 'Handlee', cursive;"}"><!-- HTML_TAG_START -->${com}<!-- HTML_TAG_END -->
					</div>`;
  })}` : ``}</div></div>
	` : ``}`;
});
const CorrectionListItems = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { items } = $$props;
  let { magnify = 1 } = $$props;
  if ($$props.items === void 0 && $$bindings.items && items !== void 0)
    $$bindings.items(items);
  if ($$props.magnify === void 0 && $$bindings.magnify && magnify !== void 0)
    $$bindings.magnify(magnify);
  return `${each(items, (item) => {
    let color = item.status === STATUS_CORRECT ? correct_color : item.status === STATUS_UNOPTIMAL_FORM ? unoptimal_color : incorrect_color;
    return `
	<div class="${"w-full flex justify-start items-start mb-5"}"><div class="${"relative mr-0"}"${add_attribute("style", `font-size:${magnify * 1.5}rem;font-family:'pacifico';color:white;background:${color}; border-radius: 50%;width:4.5rem; height:4.5rem`, 0)}><span class="${"absolute"}" style="${"display:inline-block; top: 50%;left: 50%;transform: translate(-50%, -70%);margin: 0;"}">${escape(item.num)}
			</span></div>
		${validate_component(CorrectionItem, "CorrectionItem").$$render($$result, { item, magnify }, {}, {})}
	</div>`;
  })}`;
});
const Confetti_svelte_svelte_type_style_lang = "";
const css$2 = {
  code: ".confetti-holder.svelte-1jmtwvj.svelte-1jmtwvj{position:relative}@keyframes svelte-1jmtwvj-rotate{0%{transform:skew(var(--skew)) rotate3d(var(--full-rotation))}100%{transform:skew(var(--skew)) rotate3d(var(--rotation-xyz), calc(var(--rotation-deg) + 360deg))}}@keyframes svelte-1jmtwvj-translate{0%{opacity:1}8%{transform:translateY(calc(var(--translate-y) * 0.95)) translateX(calc(var(--translate-x) * (var(--x-spread) * 0.9)));opacity:1}12%{transform:translateY(var(--translate-y)) translateX(calc(var(--translate-x) * (var(--x-spread) * 0.95)));opacity:1}16%{transform:translateY(var(--translate-y)) translateX(calc(var(--translate-x) * var(--x-spread)));opacity:1}100%{transform:translateY(calc(var(--translate-y) + var(--fall-distance))) translateX(var(--translate-x));opacity:0}}@keyframes svelte-1jmtwvj-no-gravity-translate{0%{opacity:1}100%{transform:translateY(var(--translate-y)) translateX(var(--translate-x));opacity:0}}.confetti.svelte-1jmtwvj.svelte-1jmtwvj{--translate-y:calc(-200px * var(--translate-y-multiplier));--translate-x:calc(200px * var(--translate-x-multiplier));position:absolute;height:calc(var(--size) * var(--scale));width:calc(var(--size) * var(--scale));animation:svelte-1jmtwvj-translate var(--transition-duration) var(--transition-delay) var(--transition-iteration-count) linear;opacity:0;pointer-events:none}.confetti.svelte-1jmtwvj.svelte-1jmtwvj::before{--full-rotation:var(--rotation-xyz), var(--rotation-deg);content:'';display:block;width:100%;height:100%;background:var(--color);background-size:contain;transform:skew(var(--skew)) rotate3d(var(--full-rotation));animation:svelte-1jmtwvj-rotate var(--transition-duration) var(--transition-delay) var(--transition-iteration-count) linear}.rounded.svelte-1jmtwvj .confetti.svelte-1jmtwvj::before{border-radius:50%}.cone.svelte-1jmtwvj .confetti.svelte-1jmtwvj{--translate-x:calc(200px * var(--translate-y-multiplier) * var(--translate-x-multiplier))}.no-gravity.svelte-1jmtwvj .confetti.svelte-1jmtwvj{animation-name:svelte-1jmtwvj-no-gravity-translate;animation-timing-function:ease-out}@media(prefers-reduced-motion){.confetti.svelte-1jmtwvj.svelte-1jmtwvj,.confetti.svelte-1jmtwvj.svelte-1jmtwvj::before{animation:none}}",
  map: null
};
function randomBetween(min2, max2) {
  return Math.random() * (max2 - min2) + min2;
}
const Confetti = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { size = 10 } = $$props;
  let { x = [-0.5, 0.5] } = $$props;
  let { y = [0.25, 1] } = $$props;
  let { duration = 2e3 } = $$props;
  let { infinite = false } = $$props;
  let { delay = [0, 50] } = $$props;
  let { colorRange = [0, 360] } = $$props;
  let { colorArray = [] } = $$props;
  let { amount = 50 } = $$props;
  let { iterationCount = 1 } = $$props;
  let { fallDistance = "100px" } = $$props;
  let { rounded = false } = $$props;
  let { cone = false } = $$props;
  let { noGravity = false } = $$props;
  let { xSpread = 0.15 } = $$props;
  let { destroyOnComplete = true } = $$props;
  function getColor() {
    if (colorArray.length)
      return colorArray[Math.round(Math.random() * (colorArray.length - 1))];
    else
      return `hsl(${Math.round(randomBetween(colorRange[0], colorRange[1]))}, 75%, 50%`;
  }
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0)
    $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0)
    $$bindings.y(y);
  if ($$props.duration === void 0 && $$bindings.duration && duration !== void 0)
    $$bindings.duration(duration);
  if ($$props.infinite === void 0 && $$bindings.infinite && infinite !== void 0)
    $$bindings.infinite(infinite);
  if ($$props.delay === void 0 && $$bindings.delay && delay !== void 0)
    $$bindings.delay(delay);
  if ($$props.colorRange === void 0 && $$bindings.colorRange && colorRange !== void 0)
    $$bindings.colorRange(colorRange);
  if ($$props.colorArray === void 0 && $$bindings.colorArray && colorArray !== void 0)
    $$bindings.colorArray(colorArray);
  if ($$props.amount === void 0 && $$bindings.amount && amount !== void 0)
    $$bindings.amount(amount);
  if ($$props.iterationCount === void 0 && $$bindings.iterationCount && iterationCount !== void 0)
    $$bindings.iterationCount(iterationCount);
  if ($$props.fallDistance === void 0 && $$bindings.fallDistance && fallDistance !== void 0)
    $$bindings.fallDistance(fallDistance);
  if ($$props.rounded === void 0 && $$bindings.rounded && rounded !== void 0)
    $$bindings.rounded(rounded);
  if ($$props.cone === void 0 && $$bindings.cone && cone !== void 0)
    $$bindings.cone(cone);
  if ($$props.noGravity === void 0 && $$bindings.noGravity && noGravity !== void 0)
    $$bindings.noGravity(noGravity);
  if ($$props.xSpread === void 0 && $$bindings.xSpread && xSpread !== void 0)
    $$bindings.xSpread(xSpread);
  if ($$props.destroyOnComplete === void 0 && $$bindings.destroyOnComplete && destroyOnComplete !== void 0)
    $$bindings.destroyOnComplete(destroyOnComplete);
  $$result.css.add(css$2);
  return `${`<div class="${[
    "confetti-holder svelte-1jmtwvj",
    (rounded ? "rounded" : "") + " " + (cone ? "cone" : "") + " " + (noGravity ? "no-gravity" : "")
  ].join(" ").trim()}">${each({ length: amount }, (_) => {
    return `<div class="${"confetti svelte-1jmtwvj"}" style="${"--fall-distance: " + escape(fallDistance, true) + "; --size: " + escape(size, true) + "px; --color: " + escape(getColor(), true) + "; --skew: " + escape(randomBetween(-45, 45), true) + "deg," + escape(randomBetween(-45, 45), true) + "deg; --rotation-xyz: " + escape(randomBetween(-10, 10), true) + ", " + escape(randomBetween(-10, 10), true) + ", " + escape(randomBetween(-10, 10), true) + "; --rotation-deg: " + escape(randomBetween(0, 360), true) + "deg; --translate-y-multiplier: " + escape(randomBetween(y[0], y[1]), true) + "; --translate-x-multiplier: " + escape(randomBetween(x[0], x[1]), true) + "; --scale: " + escape(0.1 * randomBetween(2, 10), true) + "; --transition-duration: " + escape(
      infinite ? `calc(${duration}ms * var(--scale))` : `${duration}ms`,
      true
    ) + "; --transition-delay: " + escape(randomBetween(delay[0], delay[1]), true) + "ms; --transition-iteration-count: " + escape(infinite ? "infinite" : iterationCount, true) + "; --x-spread: " + escape(1 - xSpread, true)}"></div>`;
  })}</div>`}`;
});
const Correction = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { items } = $$props;
  let { restart } = $$props;
  let { query } = $$props;
  let { classroom } = $$props;
  getLogger("Correction", "info");
  let displayDetails = false;
  let colorResult;
  let messageResult;
  let total = 0;
  let score = 0;
  items.forEach((item) => {
    total += item.points;
    score += item.status == STATUS_CORRECT ? item.points : item.status == STATUS_UNOPTIMAL_FORM ? item.points / 2 : 0;
  });
  if ($$props.items === void 0 && $$bindings.items && items !== void 0)
    $$bindings.items(items);
  if ($$props.restart === void 0 && $$bindings.restart && restart !== void 0)
    $$bindings.restart(restart);
  if ($$props.query === void 0 && $$bindings.query && query !== void 0)
    $$bindings.query(query);
  if ($$props.classroom === void 0 && $$bindings.classroom && classroom !== void 0)
    $$bindings.classroom(classroom);
  return `<div>${score === total ? `<div style="${"position: fixed; top: -50px; left: 0; height: 100vh; width: 100vw; display: flex; justify-content: center; overflow: hidden; pointer-events: none; z-index:100"}">${validate_component(Confetti, "Confetti").$$render(
    $$result,
    {
      x: [-5, 5],
      y: [0, 0.1],
      delay: [500, 2e3],
      infinite: true,
      size: "15",
      duration: "5000",
      amount: "300",
      fallDistance: "100vh"
    },
    {},
    {}
  )}</div>` : ``}
	<div class="${"my-3 flex justify-end"}">${validate_component(Fab, "Fab").$$render(
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
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiScanHelper, 0)}></path>`;
          }
        })}`;
      }
    }
  )}</div>

	${classroom ? `<div class="${"flex justify-around w-full"}" style="${"overflow-x:auto;"}"><div class="${"w-full"}">${validate_component(CorrectionListItems, "CorrectionListItems").$$render(
    $$result,
    {
      items: items.filter((_, i) => i % 2 === 0),
      displayDetails,
      magnify: classroom ? 2.5 : 1
    },
    {},
    {}
  )}</div>
			<div class="${"ml-12 w-full"}">${validate_component(CorrectionListItems, "CorrectionListItems").$$render(
    $$result,
    {
      items: items.filter((_, i) => i % 2 === 1),
      displayDetails,
      magnify: classroom ? 2.5 : 1
    },
    {},
    {}
  )}</div></div>` : `<div class="${"flex w-full justify-center"}"><div style="${"width:650px"}">${validate_component(CorrectionListItems, "CorrectionListItems").$$render(
    $$result,
    {
      items,
      displayDetails,
      magnify: classroom ? 2.5 : 1
    },
    {},
    {}
  )}</div></div>`}

	${!classroom ? `<div${add_attribute("class", "p-2 flex items-center  justify-around", 0)}${add_attribute("style", `background:${colorResult}`, 0)}><div class="${"flex flex-col items-center justify-around h-full"}">${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1 my-3",
      color: classroom ? "primary" : "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiReload, 0)}></path>`;
          }
        })}`;
      }
    }
  )}
				${validate_component(Fab, "Fab").$$render(
    $$result,
    {
      class: "mx-1 my-3",
      color: classroom ? "primary" : "secondary",
      mini: true
    },
    {},
    {
      default: () => {
        return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
          default: () => {
            return `<path fill="${"currentColor"}"${add_attribute("d", mdiHome, 0)}></path>`;
          }
        })}`;
      }
    }
  )}</div>
			<div class="${"flex flex-col items-center"}" style="${"color:white"}"><div class="${"my-2"}" style="${"font-size:2em; font-family:'pacifico'"}">${escape(messageResult)}</div>
				<div class="${"my-2"}">Score : <span style="${"font-size:1.5em;font-family:'pacifico'"}">${escape(math(score).toString({ comma: true }))}</span> <span style="${"font-size:1.5em;"}">/ </span><span style="${"font-size:1.5em; font-family:'pacifico'"}">${escape(total)}</span></div></div>
			${`${`${`<img alt="${"Try again!"}" src="${"/images/try-again-150.png"}">`}`}`}</div>` : ``}
</div>`;
});
const Circle_svelte_svelte_type_style_lang = "";
const Circle2_svelte_svelte_type_style_lang = "";
const Circle3_svelte_svelte_type_style_lang = "";
const css$1 = {
  code: ".wrapper.svelte-8rbowp{width:var(--size);height:var(--size);display:flex;justify-content:center;align-items:center;line-height:0;box-sizing:border-box}.inner.svelte-8rbowp{transform:scale(calc(var(--floatSize) / 52))}.ball-container.svelte-8rbowp{animation:svelte-8rbowp-ballTwo var(--duration) infinite;width:44px;height:44px;flex-shrink:0;position:relative}.single-ball.svelte-8rbowp{width:44px;height:44px;position:absolute}.ball.svelte-8rbowp{width:20px;height:20px;border-radius:50%;position:absolute;animation:svelte-8rbowp-ballOne var(--duration) infinite ease}.pause-animation.svelte-8rbowp{animation-play-state:paused}.ball-top-left.svelte-8rbowp{background-color:var(--ballTopLeftColor);top:0;left:0}.ball-top-right.svelte-8rbowp{background-color:var(--ballTopRightColor);top:0;left:24px}.ball-bottom-left.svelte-8rbowp{background-color:var(--ballBottomLeftColor);top:24px;left:0}.ball-bottom-right.svelte-8rbowp{background-color:var(--ballBottomRightColor);top:24px;left:24px}@keyframes svelte-8rbowp-ballOne{0%{position:absolute}50%{top:12px;left:12px;position:absolute;opacity:0.5}100%{position:absolute}}@keyframes svelte-8rbowp-ballTwo{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(360deg) scale(1.3)}100%{transform:rotate(720deg) scale(1)}}",
  map: null
};
const Circle3 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { size = "60" } = $$props;
  let { unit = "px" } = $$props;
  let { pause = false } = $$props;
  let { ballTopLeft = "#FF3E00" } = $$props;
  let { ballTopRight = "#F8B334" } = $$props;
  let { ballBottomLeft = "#40B3FF" } = $$props;
  let { ballBottomRight = "#676778" } = $$props;
  let { duration = "1.5s" } = $$props;
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.unit === void 0 && $$bindings.unit && unit !== void 0)
    $$bindings.unit(unit);
  if ($$props.pause === void 0 && $$bindings.pause && pause !== void 0)
    $$bindings.pause(pause);
  if ($$props.ballTopLeft === void 0 && $$bindings.ballTopLeft && ballTopLeft !== void 0)
    $$bindings.ballTopLeft(ballTopLeft);
  if ($$props.ballTopRight === void 0 && $$bindings.ballTopRight && ballTopRight !== void 0)
    $$bindings.ballTopRight(ballTopRight);
  if ($$props.ballBottomLeft === void 0 && $$bindings.ballBottomLeft && ballBottomLeft !== void 0)
    $$bindings.ballBottomLeft(ballBottomLeft);
  if ($$props.ballBottomRight === void 0 && $$bindings.ballBottomRight && ballBottomRight !== void 0)
    $$bindings.ballBottomRight(ballBottomRight);
  if ($$props.duration === void 0 && $$bindings.duration && duration !== void 0)
    $$bindings.duration(duration);
  $$result.css.add(css$1);
  return `<div class="${"wrapper svelte-8rbowp"}" style="${"--size: " + escape(size, true) + escape(unit, true) + "; --floatSize: " + escape(size, true) + "; --ballTopLeftColor: " + escape(ballTopLeft, true) + "; --ballTopRightColor: " + escape(ballTopRight, true) + "; --ballBottomLeftColor: " + escape(ballBottomLeft, true) + "; --ballBottomRightColor: " + escape(ballBottomRight, true) + "; --duration: " + escape(duration, true) + ";"}"><div class="${"inner svelte-8rbowp"}"><div class="${["ball-container svelte-8rbowp", pause ? "pause-animation" : ""].join(" ").trim()}"><div class="${"single-ball svelte-8rbowp"}"><div class="${["ball ball-top-left svelte-8rbowp", pause ? "pause-animation" : ""].join(" ").trim()}">\xA0</div></div>
			<div class="${"contener_mixte"}"><div class="${["ball ball-top-right svelte-8rbowp", pause ? "pause-animation" : ""].join(" ").trim()}">\xA0</div></div>
			<div class="${"contener_mixte"}"><div class="${["ball ball-bottom-left svelte-8rbowp", pause ? "pause-animation" : ""].join(" ").trim()}">\xA0</div></div>
			<div class="${"contener_mixte"}"><div class="${["ball ball-bottom-right svelte-8rbowp", pause ? "pause-animation" : ""].join(" ").trim()}">\xA0</div></div></div></div>
</div>`;
});
const DoubleBounce_svelte_svelte_type_style_lang = "";
const GoogleSpin_svelte_svelte_type_style_lang = "";
const ScaleOut_svelte_svelte_type_style_lang = "";
const SpinLine_svelte_svelte_type_style_lang = "";
const Stretch_svelte_svelte_type_style_lang = "";
const BarLoader_svelte_svelte_type_style_lang = "";
const Jumper_svelte_svelte_type_style_lang = "";
const RingLoader_svelte_svelte_type_style_lang = "";
const SyncLoader_svelte_svelte_type_style_lang = "";
const Rainbow_svelte_svelte_type_style_lang = "";
const Firework_svelte_svelte_type_style_lang = "";
const Pulse_svelte_svelte_type_style_lang = "";
const Jellyfish_svelte_svelte_type_style_lang = "";
const Chasing_svelte_svelte_type_style_lang = "";
const Square_svelte_svelte_type_style_lang = "";
const Shadow_svelte_svelte_type_style_lang = "";
const Moon_svelte_svelte_type_style_lang = "";
const Plane_svelte_svelte_type_style_lang = "";
const Diamonds_svelte_svelte_type_style_lang = "";
const Clock_svelte_svelte_type_style_lang = "";
const Wave_svelte_svelte_type_style_lang = "";
const Puff_svelte_svelte_type_style_lang = "";
const ArrowDown_svelte_svelte_type_style_lang = "";
const ArrowUp_svelte_svelte_type_style_lang = "";
const Spinner = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Circle3, "Circle3").$$render(
    $$result,
    {
      size: "60",
      unit: "px",
      ballTopLeft: "#FF3E00",
      ballTopRight: "#F8B334",
      ballBottomLeft: "#40B3FF",
      ballBottomRight: "#676778"
    },
    {},
    {}
  )}`;
});
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: "#cards-container.svelte-1m5cssn{margin-top:20px;margin-bottom:20px;position:relative}",
  map: null
};
let min = 5, max = 60;
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $touchDevice, $$unsubscribe_touchDevice;
  let $page, $$unsubscribe_page;
  let $mathliveReady, $$unsubscribe_mathliveReady;
  let $virtualKeyboardMode, $$unsubscribe_virtualKeyboardMode;
  $$unsubscribe_touchDevice = subscribe(touchDevice, (value) => $touchDevice = value);
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_mathliveReady = subscribe(mathliveReady, (value) => $mathliveReady = value);
  $$unsubscribe_virtualKeyboardMode = subscribe(virtualKeyboardMode, (value) => $virtualKeyboardMode = value);
  const ids = datas.ids;
  let { info, fail, trace } = getLogger("Assessment", "trace");
  let current;
  let delay;
  let elapsed;
  let start;
  let percentage;
  let timer;
  let finish = false;
  let subdomain;
  let domain;
  let theme;
  let level;
  let restart = false;
  let classroom;
  let flash;
  let courseAuxNombres;
  let previous;
  let showExemple = false;
  let showCorrection = false;
  let alert;
  let slider = 0;
  let cards, card;
  let generatedExemple;
  let basket;
  let go = false;
  const testParams = {};
  let commit;
  let ref;
  let fontSize;
  let remaining;
  let query;
  setContext("test-params", testParams);
  function countDown() {
    {
      elapsed = Date.now() - start + previous;
      if (delay >= elapsed) {
        percentage = (delay - elapsed) * 100 / delay;
        alert = delay - elapsed < 5e3;
      } else {
        commit.exec();
      }
    }
  }
  onDestroy(() => {
    if (timer) {
      if (timer.stop) {
        timer.stop();
      } else {
        clearInterval(timer);
      }
    }
  });
  function initTest() {
    info("init test");
    current = -1;
    restart = false;
    finish = false;
    go = false;
    cards = [];
    classroom = JSON.parse(decodeURI($page.url.searchParams.get("classroom")));
    flash = JSON.parse(decodeURI($page.url.searchParams.get("flash")));
    courseAuxNombres = JSON.parse(decodeURI($page.url.searchParams.get("courseAuxNombres")));
    testParams.courseAuxNombres = courseAuxNombres;
    testParams.classroom = classroom;
    testParams.flash = flash;
    console.log("go", go);
    basket = JSON.parse(decodeURI($page.url.searchParams.get("questions")));
    showCorrection = !classroom;
    let offset = 0;
    basket.forEach((q) => {
      const { theme: theme2, domain: domain2, subdomain: subdomain2, level: level2 } = ids[q.id];
      const question = getQuestion(theme2, domain2, subdomain2, level2);
      question.delay = q.delay || question.delay || question.defaultDelay;
      const rest = question.delay % 5;
      question.delay = question.delay + 5 - rest;
      console.log("delay:", question.delay);
      for (let i = 0; i < q.count; i++) {
        const generated = generateQuestion(question, cards, q.count, offset);
        cards.push(generated);
      }
      offset += q.count;
    });
    if (basket.length === 1) {
      ({ theme, domain, subdomain, level } = ids[basket[0].id]);
      query = encodeURI(`?theme=${theme}&domain=${domain}&subdomain=${subdomain}&level=${level}`);
    }
    shuffle(cards);
    cards.forEach((q, i) => {
      q.results = {};
      q.num = i + 1;
      if (q.image) {
        q.imageBase64P = fetchImage(q.image);
      }
      if (q.imageCorrection) {
        q.imageCorrectionBase64P = fetchImage(q.imageCorrection);
      }
      if (q.choices) {
        q.choices.forEach((choice) => {
          if (choice.image) {
            choice.imageBase64P = fetchImage(choice.image);
            choice.imageBase64P.then((base64) => {
              choice.base64 = base64;
            });
          }
        });
      }
    });
    if (classroom && basket.length === 1) {
      showExemple = true;
      generateExemple();
    }
    info("Begining test with questions :", cards);
    if (flash) {
      beginTest();
    }
  }
  function generateExemple() {
    const { theme: theme2, domain: domain2, subdomain: subdomain2, level: level2 } = ids[basket[0].id];
    const question = getQuestion(theme2, domain2, subdomain2, level2);
    generatedExemple = generateQuestion(question);
  }
  function beginTest() {
    showExemple = false;
    go = true;
    if (courseAuxNombres) {
      const tick = () => {
        remaining = timer.getTime();
      };
      if (timer && timer.stop) {
        timer.stop();
      }
      timer = createTimer(7 * 60, tick, commit);
      remaining = timer.getTime();
      timer.start();
    } else {
      change();
    }
  }
  async function change() {
    if (timer)
      clearInterval(timer);
    if (current < cards.length - 1) {
      current++;
      card = cards[current];
      if (!flash) {
        let time = Math.min(Math.round(elapsed / 1e3), delay);
        if (time === 0)
          time = 1;
        card.time = time;
        if (slider && basket.length === 1) {
          delay = slider * 1e3;
        } else {
          delay = card.delay ? card.delay * 1e3 : card.defaultDelay ? card.defaultDelay * 1e3 : 2e4;
          slider = delay / 1e3;
        }
        slider = Math.max(5, slider);
        percentage = 0;
        alert = false;
        start = Date.now();
        previous = 0;
        timer = setInterval(countDown, 10);
      }
    } else if (!flash) {
      finish = true;
    }
  }
  initTest();
  commit = {
    exec() {
      if (this.hook) {
        this.hook();
      }
      if (!courseAuxNombres) {
        change();
      }
    }
  };
  $$result.css.add(css);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    {
      if (restart) {
        initTest();
      }
    }
    {
      virtualKeyboardMode.set($touchDevice);
    }
    delay = slider * 1e3;
    $$rendered = `

${!$mathliveReady ? `<div class="${"flex justify-center items-center"}" style="${"height:75vh"}">${validate_component(Spinner, "Spinner").$$render($$result, {}, {}, {})}</div>` : `${showExemple ? `<div class="${"flex flex-col justify-center items-center"}" style="${"min-height: calc(100vh - 146px);"}"><div style="${"width:900px"}">${validate_component(QuestionCard, "QuestionCard").$$render(
      $$result,
      {
        card: generatedExemple,
        flashcard: true,
        magnify: 2.5
      },
      {},
      {}
    )}</div>
		<div class="${"mt-2 flex justify-end"}">${validate_component(Fab, "Fab").$$render(
      $$result,
      {
        class: "m-2",
        color: "primary",
        mini: true
      },
      {},
      {
        default: () => {
          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
            default: () => {
              return `<path fill="${"currentColor"}"${add_attribute("d", mdiRestart, 0)}></path>`;
            }
          })}`;
        }
      }
    )}
			${validate_component(Fab, "Fab").$$render(
      $$result,
      {
        class: "m-2",
        color: "primary",
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
    )}</div></div>` : `${finish ? `${showCorrection ? `${validate_component(Correction, "Correction").$$render(
      $$result,
      { items: cards, query, classroom, restart },
      {
        restart: ($$value) => {
          restart = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : `<div style="${"height:90vh"}" class="${"flex justify-center items-center"}">${validate_component(Button, "Button").$$render($$result, { variant: "raised" }, {}, {
      default: () => {
        return `${validate_component(CommonLabel, "Label").$$render($$result, {}, {}, {
          default: () => {
            return `Afficher la correction`;
          }
        })}`;
      }
    })}</div>`}` : `${!go ? `<div style="${"height:90vh"}" class="${"flex justify-center items-center"}">${validate_component(Button, "Button").$$render($$result, { variant: "raised" }, {}, {
      default: () => {
        return `${validate_component(CommonLabel, "Label").$$render($$result, {}, {}, {
          default: () => {
            return `Let&#39;s go !`;
          }
        })}`;
      }
    })}</div>` : `${courseAuxNombres ? `Course aux nombres
	${remaining ? `${escape(`${remaining.minutes}:${remaining.seconds < 10 ? "0" : ""}${remaining.seconds}`)}` : ``}
	<div class="${"flex justify-center"}"><div id="${"cards-container"}"${add_attribute("style", `width:600px`, 0)} class="${"svelte-1m5cssn"}">${each(cards, (card2) => {
      return `<div class="${"card"}"><div class="${"p-2 elevation-" + escape(4, true) + " rounded-lg"}">${validate_component(QuestionCard, "QuestionCard").$$render(
        $$result,
        {
          card: card2,
          interactive: true,
          commit: (() => {
            const c = { ...commit };
            return c;
          })()
        },
        {},
        {}
      )}</div>
				</div>`;
    })}</div></div>
	<div class="${"flex justify-center items-center"}">${validate_component(Button, "Button").$$render($$result, { variant: "raised" }, {}, {
      default: () => {
        return `${validate_component(CommonLabel, "Label").$$render($$result, {}, {}, {
          default: () => {
            return `Valider`;
          }
        })}`;
      }
    })}</div>` : `${card ? `<div${add_attribute("this", ref, 0)}>${!flash ? `<div${add_attribute("class", " my-1 flex justify-start items-center", 0)}>${classroom ? `${validate_component(Slider, "Slider").$$render(
      $$result,
      {
        min,
        max,
        step: 5,
        discrete: true,
        tickMarks: true,
        "input$aria-label": "Discrete slider",
        style: "width:150px;",
        value: slider
      },
      {
        value: ($$value) => {
          slider = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : ``}
				${!classroom && card.type !== "choice" && card.type !== "choices" ? `${validate_component(Fab, "Fab").$$render(
      $$result,
      {
        class: "mx-1",
        color: $virtualKeyboardMode ? "primary" : "secondary",
        mini: true
      },
      {},
      {
        default: () => {
          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
            default: () => {
              return `<path fill="${"currentColor"}"${add_attribute("d", mdiKeyboard, 0)}></path>`;
            }
          })}`;
        }
      }
    )}` : ``}
				<div class="${"flex grow"}"></div>

				${validate_component(CircularProgress, "CircularProgress").$$render(
      $$result,
      {
        number: current + 1,
        fontSize: classroom ? 2.5 * fontSize : fontSize * 1.8,
        percentage,
        pulse: alert
      },
      {},
      {}
    )}</div>` : ``}

		<div class="${"flex justify-center"}"><div id="${"cards-container"}"${add_attribute("style", `width:${classroom ? 1e3 : 600}px`, 0)} class="${"svelte-1m5cssn"}">${each([cards[current]], (card2) => {
      return `${validate_component(QuestionCard, "QuestionCard").$$render(
        $$result,
        {
          card: card2,
          interactive: !classroom && !flash,
          commit,
          magnify: classroom ? 2.5 : 1,
          immediateCommit: true,
          flashcard: flash
        },
        {},
        {}
      )}`;
    })}</div></div>
		<div>${validate_component(Fab, "Fab").$$render(
      $$result,
      {
        class: "mx-1 my-3",
        color: classroom ? "primary" : "secondary",
        mini: true
      },
      {},
      {
        default: () => {
          return `${validate_component(CommonIcon, "Icon").$$render($$result, { component: Svg, viewBox: "2 2 20 20" }, {}, {
            default: () => {
              return `<path fill="${"currentColor"}"${add_attribute("d", mdiHome, 0)}></path>`;
            }
          })}`;
        }
      }
    )}</div></div>` : `Pas de questions`}`}`}`}`}`}`;
  } while (!$$settled);
  $$unsubscribe_touchDevice();
  $$unsubscribe_page();
  $$unsubscribe_mathliveReady();
  $$unsubscribe_virtualKeyboardMode();
  return $$rendered;
});
export {
  Page as default
};
