
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
  CSSPR, CSSPRElement, CSSPRRect, CSSPRStyleSheet
} from "./mod.js";

EXPONENT_CSS_BODY_STYLES.mount(document.head);
EXPONENT_CSS_STYLES.mount(document.head);

async function main() {
  const container = new Panel()
    .setId("container")
    .mount(document.body);

  const random = {
    byte() {
      return Math.floor(Math.random() * 255);
    },
    rgb() {
      return `rgb(${random.byte()},${random.byte()},${random.byte()})`;
    }
  };

  let doc = {
    body: new CSSPRElement("BODY")
      .setStyles({
        "flex-direction": "column"
      })
      .addChildren(
        new CSSPRElement("DIV")
          .setStyles({
            "background-color": random.rgb()
          })
          .addChildren(
            new CSSPRElement("DIV")
              .setStyles({
                "background-color": "red"
              }),
            new CSSPRElement("DIV")
              .setStyles({
                "background-color": "blue"
              })
          ),
        new CSSPRElement("DIV")
          .setStyles({
            "background-color": random.rgb(),
            "flex": "0.5"
          }),
        new CSSPRElement("DIV")
          .setStyles({
            "background-color": random.rgb(),
            "flex": "2"
          })
      )
  };

  console.log(doc);

  function drawBBOX(ctx: CanvasRenderingContext2D, e: CSSPRElement) {
    let r = e.rect;
    ctx.fillStyle = e.styles["background-color"] || "white";
    ctx.fillRect(
      r.x, r.y,
      r.width, r.height
    );
  }

  function drawElement(ctx: CanvasRenderingContext2D, e: CSSPRElement) {
    drawBBOX(ctx, e);

    if (e.children) {
      for (let child of e.children) {
        ctx.save();
        ctx.translate(e.rect.x, e.rect.y);

        drawElement(ctx, child);

        ctx.restore();
      }
    }
  }

  let canvas = new Drawing({ desynchronized: true })
    // .setHandlesResize(true)
    .setId("canvas")
    .addRenderPass(async (ctx) => {

      //render the CSS rects

      await CSSPR.render({
        bounds: {
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height
        },
        root: doc.body,
        invalidRecursion: {
          method: "prune"
        }
      });

      //perform a custom render based on them
      drawElement(ctx, doc.body);

    })
    .mount(container);

  window.addEventListener("resize", (evt) => {
    canvas.setSize(canvas.rect.width, canvas.rect.height);
    canvas.setNeedsRedraw(true);
  });

  let result: CSSPRStyleSheet;
  try {
    result = await CSSPR.load("./index.css");
  } catch (ex) {
    console.error(ex);
  }
  console.log("Lexed CSS", result, JSON.stringify(result, undefined, 2));

  setInterval(() => {
    canvas.setNeedsRedraw(true);
  }, 1000 / 5);
}

main();
