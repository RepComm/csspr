
/**Development test for csspr
 * 
 */

/**Dev Dependency, does not ship with library*/
import {
  Drawing,
  EXPONENT_CSS_BODY_STYLES,
  EXPONENT_CSS_STYLES,
  Panel
} from "../node_modules/@repcomm/exponent-ts/docs/mod.js";

import {
  CSSPR, CSSPRStyleSheet
} from "./mod.js";

EXPONENT_CSS_BODY_STYLES.mount(document.head);
EXPONENT_CSS_STYLES.mount(document.head);

async function main() {
  const container = new Panel()
  .setId("container")
  .mount(document.body);

  let canvas = new Drawing({desynchronized: true})
  .setHandlesResize(true)
  .setId("canvas")
  .addRenderPass((ctx)=>{

  })
  .mount(container);

  let result: CSSPRStyleSheet;
  try {
    result = await CSSPR.load("./index.css");
  } catch (ex) {
    console.error(ex);
  }
  console.log("Lexed CSS", result, JSON.stringify(result, undefined, 2));

  setInterval(()=>{
    canvas.setNeedsRedraw(true);
  }, 1000/10);
}

main();
