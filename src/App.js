import React, { useEffect, useState } from "react";
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

export const App = () => {
  const [code, setCode] = useState(TEST_SKETCH);
  const [constants, setConstants] = useState(null);
  const [sketch, setSketch] = useState(null);
  const [errors, setErrors] = useState(null);
  const [highlight, setHighlight] = useState(null);

  useEffect(
    () => {
      window.require = require;
      window.sketch = sketch => setSketch(sketch);

      let pulledConstants, finalCode, hasErrors;

      // ast
      try {
        const {
          code: codeWithoutConstants,
          constants: pulledOutConstants
        } = pullOutConstants(code);

        const codeWithMeta = addMeta(codeWithoutConstants);
        const codeWithRequires = processRequire(codeWithMeta);

        pulledConstants = pulledOutConstants;
        finalCode = codeWithRequires;
      } catch (e) {
        console.warn(e);

        hasErrors = true;
        const { line, column } = e;
        setErrors([...errors, { msg: e.toString(), line, column }]);
      }

      if (!finalCode) {
        return;
      }

      // eval
      try {
        eval(`
          const sketch = window.sketch;
          ${finalCode}
        `);
      } catch (e) {
        console.warn(e);

        hasErrors = true;
        const { line, column } = e;
        setErrors([...errors, { msg: e.toString(), line, column }]);
      }

      if (!hasErrors) {
        setErrors([]);
      }

      setConstants(pulledConstants);

      return () => {
        delete window.sketch;
        delete window.require;
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
                constants={constants}
                setConstants={newConstants =>
                  setCode(replaceConstants(code, newConstants))
                }
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
              highlight={highlight}
            />
          </div>
        </Panel.Child>
      </Panel.Parent>
    </div>
  );
};
