import React, { useEffect, useState } from "react";
import { require } from "d3-require";

import { EXAMPLES } from "./examples";
import { Editor } from "./editor";
import { Errors } from "./errors";
import { Panel, DIRECTION } from "./panel";
import { Sketch } from "./sketch";
import { Topbar } from "./topbar";

import {
  addMeta,
  processRequire,
  pullOutConstants,
  replaceConstants
} from "./ast-transforms";

import "tachyons";
import "./style.css";

export const App = () => {
  const [code, setCode] = useState(EXAMPLES["animated rectangle"]);
  const [constants, setConstants] = useState(null);
  const [sketch, setSketch] = useState(null);
  const [errors, setErrors] = useState(null);
  const [highlight, setHighlight] = useState(null);

  useEffect(() => {
    let tmpErrors = [];
    let pulledConstants = null;
    let finalCode = null;

    window.require = require;

    window.sketch = sketch => {
      try {
        if (sketch.update) {
          sketch.update(sketch.initialState || {});
        }

        if (sketch.draw) {
          sketch.draw(sketch.initialState || {}, pulledConstants || []);
        }
      } catch (e) {
        console.warn(e);
        tmpErrors.push(e.description);
      }

      if (tmpErrors.length > 0) {
        setErrors(tmpErrors);
      } else {
        setSketch({
          initialState: {},
          update: () => {},
          draw: () => [],
          ...sketch
        });
      }
    };

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
      tmpErrors.push(e.description);
    }

    if (pulledConstants) {
      setConstants(pulledConstants);
    }

    // eval only if we have something worth evaling
    if (finalCode) {
      try {
        eval(`
            const sketch = window.sketch;
            ${finalCode}
          `);
      } catch (e) {
        console.warn(e);
        tmpErrors.push(e.description);
      }
    }

    setErrors(tmpErrors);

    return () => {
      delete window.sketch;
      delete window.require;
    };
  }, [code]);

  return (
    <div className="code vh-100 bg-custom-dark near-white flex flex-column">
      <div>
        <Topbar setCode={setCode} code={code} />
      </div>

      <Panel>
        <div className="h-100">
          {sketch && (
            <Sketch
              sketch={sketch}
              code={code}
              constants={constants}
              setConstants={newConstants =>
                setCode(replaceConstants(code, newConstants))
              }
              setHighlight={setHighlight}
            />
          )}
        </div>

        <div className="h-100">
          <Panel direction={DIRECTION.VERTICAL} defaultDivide={0.85}>
            <div>
              <Editor
                code={code}
                onChange={e => setCode(e)}
                highlight={highlight}
              />
            </div>

            <div>
              <Errors errors={errors} />
            </div>
          </Panel>
        </div>
      </Panel>
    </div>
  );
};
