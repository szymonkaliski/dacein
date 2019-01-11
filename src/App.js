import AceEditor from "react-ace";
import Immutable, { Map, List } from "immutable";
import React, { useEffect, useState, useRef } from "react";
import lodash, { get } from "lodash";
import recast from "recast";
import types from "ast-types";

import "brace/mode/javascript";
import "brace/theme/github";

import { COMMANDS } from "./lang";
import { INSPECTORS } from "./inspector";

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

// expose to sketch once it's eval()-ed
window.Immutable = Immutable;
window.lodash = lodash;

const MAX_HISTORY_LEN = 1000;

const TEST_SKETCH = `const { Map } = Immutable;
const { range } = lodash;

sketch({
  setup: {
    canvas: [600, 600]
  },

  initialState: Map({ c: 0 }),

  update: state => {
    return state.update("c", c => c + 0.1);
  },

  draw: state => {
    const points = range(60).map(i => [
      Math.sin((state.get("c") + i * 0.8) * 0.1) * 200 + 300,
      Math.cos((state.get("c") + i * 0.8) * 0.3) * 200 + 300
    ]);

    return [
      ["background", { fill: "#eee" }],
      ["rect", { pos: [0, 0], size: [10, 10], fill: "black" }],
      ...points.map(p => ["ellipse", { pos: p, size: [8, 8], fill: "#333" }])
    ];
  }
})
`;

const Inspector = ({ sketch, state }) => {
  return (
    <div className="absolute" style={{ top: 0, left: 0 }}>
      {sketch.draw(state).map(([command, args], i) => {
        if (!INSPECTORS[command]) {
          return null;
        }

        return (
          <div
            key={`${i}-${command}`}
            onMouseOver={() => {
              // TODO: highlight in code editor
              console.log(command, args);
            }}
          >
            {INSPECTORS[command](args)}
          </div>
        );
      })}
    </div>
  );
};

const Sketch = ({ sketch }) => {
  const [[history, historyIdx], updateHistory] = useState([
    List([sketch.initialState || Map()]),
    0
  ]);

  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef(null);
  const [width, height] = get(sketch, ["setup", "canvas"], [800, 600]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    let frameId = null;

    const ctx = canvasRef.current.getContext("2d");
    const globals = { width, height };

    const step = () => {
      for (const operation of sketch.draw(history.get(historyIdx))) {
        const [command, args] = operation;

        if (COMMANDS[command]) {
          COMMANDS[command](ctx, args, globals);
        }
      }

      if (isPlaying) {
        const newState = sketch.update(history.get(historyIdx));

        const newHistory = (history.size > MAX_HISTORY_LEN
          ? history.skip(1)
          : history
        ).push(newState);

        const newHistoryIdx =
          history.size > MAX_HISTORY_LEN ? MAX_HISTORY_LEN : historyIdx + 1;

        updateHistory([newHistory, newHistoryIdx], () => {
          frameId = requestAnimationFrame(step);
        });
      } else {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  });

  return (
    <div>
      <div className="mb2">
        <button
          className="f7 mr2"
          onClick={() => {
            if (!isPlaying) {
              updateHistory([history.slice(0, historyIdx + 1), historyIdx]);
            }

            setIsPlaying(!isPlaying);
          }}
        >
          {isPlaying ? "pause" : "play"}
        </button>

        <span className="f7 mr2 dib tc" style={{ width: 100 }}>
          {historyIdx} / {history.size - 1}
        </span>

        <button
          className="f7 mr2"
          onClick={() => updateHistory([history, Math.max(historyIdx - 1, 0)])}
        >
          {"<<"}
        </button>

        <input
          className="mr2"
          type="range"
          min={0}
          max={history.size - 1}
          step={1}
          value={historyIdx}
          onChange={e => updateHistory([history, parseInt(e.target.value, 10)])}
        />

        <button
          className="f7 mr2"
          onClick={() =>
            updateHistory([history, Math.min(historyIdx + 1, history.size - 1)])
          }
        >
          {">>"}
        </button>
      </div>

      <div className="relative ba b--silver">
        <canvas width={width} height={height} ref={canvasRef} />

        {!isPlaying && (
          <Inspector state={history.get(historyIdx)} sketch={sketch} />
        )}
      </div>
    </div>
  );
};

const Editor = ({ sketch, onChange, evalError }) => {
  return (
    <AceEditor
      mode="javascript"
      theme="github"
      value={sketch}
      width="800px"
      showGutter={true}
      showPrintMargin={false}
      onChange={e => onChange(e)}
      annotations={
        evalError
          ? [
              {
                column: evalError.column,
                row: evalError.line,
                type: "error",
                text: evalError.msg
              }
            ]
          : []
      }
    />
  );
};

export default () => {
  const [code, setCode] = useState(TEST_SKETCH);
  const [sketch, setSketch] = useState(null);
  const [evalError, setEvalError] = useState(null);

  useEffect(
    () => {
      if (!window.sketch) {
        window.sketch = sketch => {
          setSketch(sketch);
        };
      }

      const codeWithMeta = addCodeMeta(code);

      try {
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
    },
    [code]
  );

  return (
    <div className="sans-serif pa2 flex">
      {sketch && <Sketch sketch={sketch} />}

      <div className="ml2 ba b--light-gray">
        <Editor
          sketch={code}
          onChange={e => setCode(e)}
          evalError={evalError}
        />
      </div>
    </div>
  );
};
