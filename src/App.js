import React, { useEffect, useState } from "react";
import recast from "recast";
import types from "ast-types";
import { get, debounce } from "lodash";

import { COMMANDS } from "./commands";
import { Sketch } from "./sketch";
import { Editor } from "./editor";

import "tachyons";
import "./style.css";

const TEST_SKETCH = `
sketch({
  setup: {
    canvas: [600, 600]
  },

  initialState: {
    c: 0
  },

  update: state => {
    state.c += 1;

    return state;
  },

  draw: state => {
    const points = Array.from({ length: 60 }).map((_, i) => [
      Math.sin((state.c + i * 0.8) * 0.1) * 200 + 300,
      Math.cos((state.c + i * 0.8) * 0.3) * 200 + 300
    ]);

    return [
      ["background", { fill: "#eee" }],
      ["rect", { pos: [0, 0], size: [10, 10], fill: "black" }],
      ...points.map(p => ["ellipse", { pos: p, size: [8, 8], fill: "#333" }])
    ];
  }
})
`;

const COMPILE_DEBOUNCE_TIME = 16;
const Builders = recast.types.builders;
const isCommand = key => COMMANDS[key] !== undefined;

const addCodeMeta = code => {
  const ast = recast.parse(code);

  types.visit(ast, {
    visitExpressionStatement: function(path) {
      if (path.value.expression.callee.name === "sketch") {
        this.traverse(path);
      } else {
        return false;
      }
    },

    visitProperty: function(path) {
      if (path.value.key.name === "draw") {
        this.traverse(path);
      } else {
        return false;
      }
    },

    visitReturnStatement: function(path) {
      this.traverse(path);
    },

    visitArrayExpression: function(path) {
      const elements = path.value.elements || [];
      const maybeCommand = elements[0];

      // TODO: traverse up to parent ArrayExpression
      if (isCommand(get(maybeCommand, "value"))) {
        if (elements[1].type === "ObjectExpression") {
          return Builders.arrayExpression([
            elements[0],
            Builders.objectExpression([
              ...elements[1].properties,
              Builders.property(
                "init",
                Builders.identifier("__meta"),
                Builders.objectExpression([
                  Builders.property(
                    "init",
                    Builders.identifier("lineStart"),
                    Builders.literal(maybeCommand.loc.start.line)
                  ),
                  Builders.property(
                    "init",
                    Builders.identifier("lineEnd"),
                    Builders.literal(maybeCommand.loc.end.line)
                  )
                ])
              )
            ])
          ]);
        }

        return false;
      } else {
        this.traverse(path);
      }
    }
  });

  const { code: finalCode } = recast.print(ast);

  return finalCode;
};

export const App = () => {
  const [code, setCode] = useState(TEST_SKETCH);
  const [sketch, setSketch] = useState(null);
  const [evalError, setEvalError] = useState(null);
  const [highlightMarker, setHighlightMarker] = useState({});

  useEffect(
    debounce(() => {
      if (!window.sketch) {
        window.sketch = sketch => {
          let isExecuting = true;

          try {
            sketch.draw(sketch.update(sketch.initialState || {}));
          } catch (e) {
            isExecuting = false;
            setEvalError({ msg: e.toString() });
          }

          if (isExecuting) {
            setSketch(sketch);
          }
        };
      }

      try {
        const codeWithMeta = addCodeMeta(code);

        eval(`
          const sketch = window.sketch;

          ${codeWithMeta}
        `);
      } catch (e) {
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
    <div className="sans-serif pa2 flex">
      {sketch && (
        <Sketch sketch={sketch} setHighlightMarker={setHighlightMarker} />
      )}

      <div className="ml2 ba b--light-gray">
        <Editor
          code={code}
          onChange={e => setCode(e)}
          evalError={evalError}
          highlightMarker={highlightMarker}
        />
      </div>
    </div>
  );
};
