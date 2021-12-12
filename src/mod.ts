
export type CSSPRRule = {
  [key in KnownCSSKey]?: string;
};

export interface CSSPRStyleSheet {
  [key: string]: CSSPRRule;
}

export interface StyleSheetParseResult {
  stylesheet: CSSPRStyleSheet;
}

export interface scan_state {
  src: string;
  offset: number;
  readLines: number;
}

export interface scan_result {
  success: boolean;
  data: string;
  read: number;
  readLines: number;
  offset: number;
}

const SCAN_TYPE = {
  NEWLINE: "\n\r",
  WHITESPACE: " \n\r",

  CSSRULE: {
    TYPE: "#.",
    MODIFIER: ">",
    NAME: /[a-zA-Z]/,
    KEY: /[a-zA-Z-]/,
    VALUE: /[a-zA-Z0-9(),]/
  }
}

export type KnownCSSKey = (
  "background" |
  "background-color" |
  "border" |

  "color" |

  "display" |

  "flex" |
  "flex-basis" |
  "flex-direction" |
  "flex-grow" |
  "flex-shrink" |

  "font" |
  "font-size" |
  "font-family" |

  "position" |

  "text-align" |
  "text-indent" |

  "width" |
  "height"
);

export type KnownCSSTagName = (
  "A"|
  "BODY"|
  "BUTTON"|
  "CANVAS"|
  "DIV"|
  "HEAD"|
  "IFRAME"|
  "INPUT"|
  "SCRIPT"|

  ""
);

export interface CSSPRRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CSSPRElement {
  parent?: CSSPRElement;
  children?: Array<CSSPRElement>;

  /**precedence 0*/
  classList?: Array<string>;
  /**precedence 1*/
  className?: string;

  id?: string;

  tagName?: KnownCSSTagName;

  styles?: CSSPRRule;

  /**
   * output rect, the render result*/
  rect: CSSPRRect;
}

export interface CSSRPRenderCallback {
  (element: CSSPRElement, rect: CSSPRRect): void;
}

export interface CSSPRInvalidRecursionCallback {
  (offender: CSSPRRect): void;
}

export interface RenderOptions {
  /**
   * For each element, the output rect can be stored on the element 'rect' field, sent to callback, or both.
   * 
   * callback is only fired when it is provided
   * properties are only set when outputRectProperty is true
   * 
   * if neither is selected, an exception is thrown since you probably didn't want to render for nothing
   */
  outputRectProperty?: boolean;
  callback?: CSSRPRenderCallback;

  /**The root element to iterate down
   * Does not have to be the document.body
   * 
   * Useful when you only need to re-render a portion of the DOM
   */
  root: CSSPRElement;

  /**Max width and height of root element*/
  bounds: CSSPRRect;

  invalidRecursion?: {
    /**what to do if there is an invalid tree recursion loop
     * 
     * this happens when a child is also its own ancestor Alabama style (this literally isn't possible, stfu and don't virtue signal me)
     * 
     * ignore - NOT suggested. Infinite loops.. everywhere
     * 
     * throw - logically consistent, kind of annoying sometimes
     * prune - auto-remove younger child and use as ancestor instead (cheap and functional)
     */
    method?: "ignore" | "throw" | "prune";
    callback?: CSSPRInvalidRecursionCallback;
  };

  /**
   * CSS rules are cached to save render time
   * set this value to true if element id, className, classList, or tree relationships change
   */
  appliedStylesNeedUpdate?: boolean;
}

export const CSSPR = {
  scan: {
    reset_scan_result(result: scan_result) {
      result.data = undefined;
      result.offset = 0;
      result.read = 0;
      result.readLines = 0;
      result.success = false;
    },
    init_scan_result(state: scan_state, out: scan_result) {
      CSSPR.scan.reset_scan_result(out);
      out.offset = state.offset;
    },

    update_state(state: scan_state, result: scan_result) {
      state.offset += result.read;
      state.readLines += result.readLines;
    },
    whitespace(state: scan_state, out: scan_result) {
      CSSPR.scan.sequence(state, SCAN_TYPE.WHITESPACE, out);
    },
    sequence(state: scan_state, comparison: string | Array<string> | RegExp, out: scan_result) {
      CSSPR.scan.init_scan_result(state, out);

      let match: Function;
      if (Array.isArray(comparison) || typeof (comparison) === "string") {
        match = comparison.includes;
      } else {
        match = comparison.test;
      }

      let ch: string;
      let i = state.offset;
      for (; i < state.src.length; i++) {
        ch = state.src.charAt(i);
        if (match.call(comparison, ch)) {
        } else {
          break;
        }
      }
      let count = i - state.offset;
      if (count > 0) {
        out.read = count;
        out.data = state.src.substring(state.offset, i);
        out.success = true;
      }
    },
    occurances(toMatch: string, comparison: string | Array<string> | RegExp): number {
      let result = 0;
      let match: Function;
      if (Array.isArray(comparison) || typeof (comparison) === "string") {
        match = comparison.includes;
      } else {
        match = comparison.test;
      }

      for (let i = 0; i < toMatch.length; i++) {
        if (match.call(comparison, toMatch.charAt(i))) {
          result++;
        }
      }
      return result;
    },
    count_newlines(str: string): number {
      return CSSPR.scan.occurances(str, SCAN_TYPE.NEWLINE);
    },
    next_string_is(state: scan_state, test: string) {
      return state.src.startsWith(test, state.offset);
    },
    assert_next_string_is(state: scan_state, test: string) {
      let result = CSSPR.scan.next_string_is(state, test);
      if (!result) throw `Could not parse css: Expected ${test} at line ${state.readLines} char ${state.offset}`;
    },
    rule_name(state: scan_state, out: scan_result) {
      if (CSSPR.scan.next_string_is(state, "#")) {
        //type is id
        CSSPR.scan.consume(state, 1);
      } else if (CSSPR.scan.next_string_is(state, ".")) {
        //type is class
        CSSPR.scan.consume(state, 1);
      } else {
        //type is tagname
      }

      //TODO - parse children > chains

      CSSPR.scan.sequence(state, SCAN_TYPE.CSSRULE.NAME, out);
      out.readLines = CSSPR.scan.count_newlines(out.data);
    },
    rule_key(state: scan_state, out: scan_result) {
      CSSPR.scan.sequence(state, SCAN_TYPE.CSSRULE.KEY, out);

      //multiple lines not supported in keys
      // out.readLines = CSSPR.scan.count_newlines(out.data);
    },
    rule_value(state: scan_state, out: scan_result) {
      CSSPR.scan.sequence(state, SCAN_TYPE.CSSRULE.VALUE, out);

      //multiple lines not supported in values
      // out.readLines = CSSPR.scan.count_newlines(out.data);
    },
    /**See what the next char of the state is
     * without advancing the state
     * @param state 
     * @returns 
     */
    peak_char(state: scan_state): string {
      return state.src[state.offset];
    },
    /**Overlook a number of chars, advancing the state
     * Accounts for new lines
     */
    consume(state: scan_state, count: number) {
      state.readLines += CSSPR.scan.count_newlines(
        state.src.substring(
          state.offset, state.offset + count
        )
      );
      state.offset += count;
    }
  },
  stylesheet: {
    all: new Array<CSSPRStyleSheet>(),

    parseFromString(src: string): Promise<StyleSheetParseResult> {
      return new Promise(async (_resolve, _reject) => {

        let result: StyleSheetParseResult = {
          stylesheet: {}
        };

        //scan rule
        let out: scan_result = {
          read: 0,
          data: undefined,
          offset: 0,
          readLines: 0,
          success: false
        };
        let state: scan_state = {
          src,
          offset: 0,
          readLines: 0
        };

        let ruleAttempts = 0;
        let ruleMaxAttempts = 512;
        while (ruleAttempts < ruleMaxAttempts && state.offset < state.src.length - 1) {

          CSSPR.scan.whitespace(state, out);
          CSSPR.scan.update_state(state, out);

          CSSPR.scan.rule_name(state, out);
          let ruleName = out.data;
          CSSPR.scan.update_state(state, out);

          CSSPR.scan.whitespace(state, out);
          CSSPR.scan.update_state(state, out);

          try {
            CSSPR.scan.assert_next_string_is(state, "{");
          } catch (ex) {
            _reject(ex);
            return;
          }
          CSSPR.scan.consume(state, 1);

          //stops endless looping when something goes wrong
          let propAttempts = 0;
          let propMaxAttempts = 512;

          //rpi = rule property iteration, increments for each property in a rule
          while (propAttempts < propMaxAttempts) {
            propAttempts++;

            CSSPR.scan.whitespace(state, out);
            CSSPR.scan.update_state(state, out);

            //NOTE: technically this ends early in the event that } is inside a string literal
            if (CSSPR.scan.next_string_is(state, "}")) {
              break;
            }

            CSSPR.scan.rule_key(state, out);
            let key = out.data;
            CSSPR.scan.update_state(state, out);

            CSSPR.scan.whitespace(state, out);
            CSSPR.scan.update_state(state, out);

            CSSPR.scan.assert_next_string_is(state, ":");
            CSSPR.scan.consume(state, 1);

            CSSPR.scan.whitespace(state, out);
            CSSPR.scan.update_state(state, out);

            CSSPR.scan.rule_value(state, out);
            let value = out.data;
            CSSPR.scan.update_state(state, out);

            CSSPR.scan.whitespace(state, out);
            CSSPR.scan.update_state(state, out);

            CSSPR.scan.assert_next_string_is(state, ";");
            CSSPR.scan.consume(state, 1);

            CSSPR.scan.whitespace(state, out);
            CSSPR.scan.update_state(state, out);

            let rule = result.stylesheet[ruleName];

            if (rule === null || rule === undefined) {
              rule = result.stylesheet[ruleName] = {};
            }
            rule[key] = value;
          }

          // CSSPR.scan.whitespace(state, out);
          // CSSPR.scan.update_state(state, out);

          CSSPR.scan.assert_next_string_is(state, "}");
          CSSPR.scan.consume(state, 1);
        }

        CSSPR.stylesheet.all.push(result.stylesheet);

        _resolve(result);
      });
    },
    async parseFromURL(url: string): Promise<StyleSheetParseResult> {
      return new Promise(async (_resolve, _reject) => {
        let text: string;
        try {
          text = await (await fetch(url)).text();
        } catch (ex) {
          _reject(ex);
          return;
        }

        let result: StyleSheetParseResult;
        try {
          result = await CSSPR.stylesheet.parseFromString(text);
        } catch (ex) {
          _reject(ex);
          return;
        }
        _resolve(result);
        return;
      });
    }
  },
  load(url: string): Promise<CSSPRStyleSheet> {
    return new Promise(async (_resolve, _reject) => {
      let result: CSSPRStyleSheet;
      try {
        result = (await CSSPR.stylesheet.parseFromURL(url)).stylesheet;
      } catch (ex) {
        _reject(ex);
        return;
      }
      _resolve(result);
      return;
    });
  },
  cloneRect(r: CSSPRRect): CSSPRRect {
    return {
      width: r.width,
      height: r.height,
      x: r.x,
      y: r.y
    };
  },
  copyRect(from: CSSPRRect, to: CSSPRRect) {
    to.x = from.x;
    to.y = from.y;
    to.width = from.width;
    to.height = from.height;
  },
  renderElementChildren (e: CSSPRElement) {

    let totalFlex = 0;
    for (let child of e.children) {
      if (child.styles.flex) {
        totalFlex += parseFloat(child.styles.flex);
      } else {
        totalFlex += 1;
      }
    }

    let childFlex = 0;
    let usedFlexPixels = 0;

    for (let child of e.children) {
      childFlex = parseFloat(child.styles.flex) || 1;
      if (e.styles["flex-direction"] === "column") {
        child.rect.y = usedFlexPixels;
        child.rect.height = (childFlex / totalFlex) * e.rect.height;
        usedFlexPixels += child.rect.height;
        child.rect.width = e.rect.width;
      } else {
        child.rect.x = usedFlexPixels;
        child.rect.width = (childFlex / totalFlex) * e.rect.width;
        usedFlexPixels += child.rect.width;
        child.rect.height = e.rect.height;
      }
      if (child.children) {
        CSSPR.renderElementChildren(child);
      }
    }
  },
  render(options: RenderOptions): Promise<void> {
    return new Promise(async (_resolve, _reject) => {
      CSSPR.copyRect(options.bounds, options.root.rect);

      if (options.root.children) {
        CSSPR.renderElementChildren(options.root);
      }

      _resolve();
    });
  }
};
