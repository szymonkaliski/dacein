import PanelGroup from "react-panelgroup";
import React, { useEffect, useState } from "react";
import { debounce } from "lodash";
import { require } from "d3-require";

import { Editor } from "./editor";
import { Sketch } from "./sketch";
import { addMeta, processRequire } from "./ast-transforms";

import "tachyons";
import "./style.css";

require("lodash").then(lodash => {
  require("d3").then(d3 => {
    console.log({ lodash, d3 });
  });
});

const TEST_SKETCH = `const _ = require("lodash");

sketch({
  setup: {
    size: [600, 600]
  },

  initialState: {
    c: 0
  },

  update: (state) => {
    state.c += 0.01;

    return state;
  },

  draw: state => {
    const points = _.range(40).map((_, i) => [
      Math.sin((state.c + i * 0.8) * 2.0) * 200 + 300,
      Math.sin((state.c + i * 0.8) * 3.0) * 200 + 300
    ]);

    const r = 8;

    return [
      ["background", { fill: "#481212" }],
      ...points.map(p => [ "ellipse", { pos: p, size: [r, r], fill: "#d09191" } ]),
    ];
  }
})`;

const COMPILE_DEBOUNCE_TIME = 16;

export const App = () => {
  const [code, setCode] = useState(TEST_SKETCH);
  const [sketch, setSketch] = useState(null);
  const [evalError, setEvalError] = useState(null);
  const [highlight, setHighlight] = useState(null);

  useEffect(
    debounce(() => {
      if (!window.require) {
        window.require = require;
      }

      if (!window.sketch) {
        window.sketch = sketch => {
          let isExecuting = true;

          try {
            sketch.draw(sketch.update(sketch.initialState || {}, []));
          } catch (e) {
            console.warn(e);

            isExecuting = false;
            setEvalError({ msg: e.toString() });
          }

          if (isExecuting) {
            setSketch(sketch);
          }
        };
      }

      try {
        const processedCode = processRequire(addMeta(code));

        eval(`
          const sketch = window.sketch;

          ${processedCode}
        `);
      } catch (e) {
        console.warn(e);

        const { line, column } = e;
        setEvalError({ msg: e.toString(), line, column });
      }

      return () => {
        delete window.sketch;
      };
    }, COMPILE_DEBOUNCE_TIME),
    [code]
  );

  useEffect(
    () => {
      window.dumpCode = () => console.log(code);

      return () => {
        delete window.dumpCode;
      };
    },
    [code]
  );

  return (
    <div className="sans-serif vh-100">
      <PanelGroup borderColor="black">
        <div className="w-100">
          {sketch && <Sketch sketch={sketch} setHighlight={setHighlight} />}
        </div>

        <div className="w-100">
          <Editor
            code={code}
            onChange={e => setCode(e)}
            evalError={evalError}
            highlight={highlight}
          />
        </div>
      </PanelGroup>
    </div>
  );
};
