import React, { useEffect, useState } from "react";
import { debounce } from "lodash";
import { require } from "d3-require";

import Panel from "./panel";
import { Editor } from "./editor";
import { Sketch } from "./sketch";
import {
  addMeta,
  processRequire,
  pullOutConstants,
  replaceConstants
} from "./ast-transforms";

import "tachyons";
import "./style.css";

const TEST_SKETCH = `const _ = require("lodash");

sketch({
  size: [600, 600],

  initialState: {
    c: 0
  },

  update: state => {
    state.c += 0.01;

    return state;
  },

  draw: state => {
    const n = 20;

    const points = _.range(n).map((_, i) => [
      Math.sin(i / n * Math.PI * 2.0) * 200 + 300,
      Math.cos(i / n * Math.PI * 2.0) * 200 + 300
    ]);

    const r = 10;

    return [
      [
        "background",
        { fill: "#481212" }
      ],
      ...points.map(p => [
        "ellipse",
        { pos: p, size: [r, r], fill: "#d09191" }
      ]),
    ];
  }
});`;

const COMPILE_DEBOUNCE_TIME = 16;

export const App = () => {
  const [code, setCode] = useState(TEST_SKETCH);
  const [codeConstants, setCodeConstants] = useState(null);
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
          setSketch(sketch);

          // let isExecuting = true;

          // try {
          //   sketch.draw(sketch.update(sketch.initialState || {}, []));
          // } catch (e) {
          //   console.warn(e);

          //   isExecuting = false;
          //   setEvalError({ msg: e.toString() });
          // }

          // if (isExecuting) {
          //   setSketch(sketch);
          // }
        };
      }

      let codeConstants;

      try {
        const {
          code: codeWithoutConstants,
          constants: pulledOutConstants
        } = pullOutConstants(code);

        const codeWithMeta = addMeta(codeWithoutConstants);
        const codeWithRequires = processRequire(codeWithMeta);

        codeConstants = pulledOutConstants;

        eval(`
          const sketch = window.sketch;

          ${codeWithRequires}
        `);
      } catch (e) {
        console.warn(e);

        const { line, column } = e;
        setEvalError({ msg: e.toString(), line, column });
      }

      setCodeConstants(codeConstants);

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
    <div className="sans-serif vh-100 bg-dark-gray near-white">
      <Panel.Parent>
        <Panel.Child>
          <div className="w-100">
            {sketch && (
              <Sketch
                sketch={sketch}
                constants={codeConstants}
                setConstants={newConstants => {
                  setCode(replaceConstants(code, newConstants));
                }}
                setHighlight={setHighlight}
              />
            )}
          </div>
        </Panel.Child>

        <Panel.Child>
          <div className="w-100">
            <Editor
              code={code}
              onChange={e => setCode(e)}
              evalError={evalError}
              highlight={highlight}
            />
          </div>
        </Panel.Child>
      </Panel.Parent>
    </div>
  );
};
