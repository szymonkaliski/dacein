import AceEditor from "react-ace";
import immer, { setAutoFreeze } from "immer";
import React, { useEffect, useState, useRef } from "react";
import { get, debounce } from "lodash";
import recast from "recast";
import types from "ast-types";

import "brace/mode/javascript";
import "brace/theme/github";

import "./style.css";

import { COMMANDS } from "./lang";
import { INSPECTORS } from "./inspector";

const COMPILE_DEBOUNCE_TIME = 500;
const MAX_HISTORY_LEN = 1000;

setAutoFreeze(false); // TODO: disable for prod only -> https://github.com/mweststrate/immer#auto-freezing

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

const Inspector = ({ sketch, state, onHover }) => {
  return (
    <div className="absolute" style={{ top: 0, left: 0 }}>
      {sketch.draw(state).map(([command, args], i) => {
        if (!command || !args) {
          return null;
        }

        if (!INSPECTORS[command]) {
          return null;
        }

        return (
          <div
            key={`${i}-${command}`}
            onMouseOver={() => onHover(args.__meta)}
            onMouseOut={e => onHover()}
          >
            {INSPECTORS[command](args)}
          </div>
        );
      })}
    </div>
  );
};

const useImmer = initialValue => {
  const [val, updateValue] = useState(initialValue);
  return [val, updater => updateValue(immer(updater))];
};

const Sketch = ({ sketch, setHighlightMarker }) => {
  const [{ history, idx: historyIdx }, updateHistory] = useImmer({
    history: [sketch.initialState || {}],
    idx: 0
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const canvasRef = useRef(null);
  const [width, height] = get(sketch, ["setup", "canvas"], [800, 600]);

  useEffect(() => {
    window.dumpHistory = () => history;

    return () => {
      delete window.dumpHistory();
    };
  });

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    let frameId = null;

    const ctx = canvasRef.current.getContext("2d");
    const globals = { width, height };

    const step = () => {
      for (const operation of sketch.draw(history[historyIdx])) {
        const [command, args] = operation;

        if (COMMANDS[command]) {
          COMMANDS[command](ctx, args, globals);
        }
      }

      if (isPlaying) {
        updateHistory(
          draft => {
            const newState = sketch.update(draft.history[draft.idx]);

            draft.history.push(newState);

            while (draft.history.length > MAX_HISTORY_LEN + 1) {
              draft.history.pop();
            }

            draft.idx = Math.min(MAX_HISTORY_LEN, draft.idx + 1);
          },
          () => {
            frameId = requestAnimationFrame(step);
          }
        );
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
              updateHistory(draft => {
                draft.history = draft.history.slice(0, draft.idx + 1);
              });
            }

            setIsPlaying(!isPlaying);
          }}
        >
          {isPlaying ? "pause" : "play"}
        </button>

        <span className="f7 mr2 dib tc" style={{ width: 100 }}>
          {historyIdx} / {history.length - 1}
        </span>

        <button
          className="f7 mr2"
          onClick={() =>
            updateHistory(draft => {
              draft.idx = Math.max(draft.idx - 1, 0);
            })
          }
        >
          {"<<"}
        </button>

        <input
          className="mr2"
          type="range"
          min={0}
          max={history.length - 1}
          step={1}
          value={historyIdx}
          onChange={e => {
            const { value } = e.target;

            updateHistory(draft => {
              draft.idx = parseInt(value, 10);
            });
          }}
        />

        <button
          className="f7 mr2"
          onClick={() =>
            updateHistory(draft => {
              draft.idx = Math.min(draft.idx + 1, draft.history.length - 1);
            })
          }
        >
          {">>"}
        </button>
      </div>

      <div className="relative ba b--silver">
        <canvas width={width} height={height} ref={canvasRef} />

        {!isPlaying && (
          <Inspector
            state={history[historyIdx]}
            sketch={sketch}
            onHover={e =>
              setHighlightMarker(
                e
                  ? {
                      startRow: e.lineStart - 1,
                      endRow: e.lineStart,
                      className: "highlight-marker",
                      type: "background"
                    }
                  : {}
              )
            }
          />
        )}
      </div>
    </div>
  );
};

const Editor = ({ sketch, highlightMarker, onChange, evalError }) => {
  return (
    <AceEditor
      mode="javascript"
      theme="github"
      value={sketch}
      width="800px"
      showGutter={true}
      showPrintMargin={false}
      onChange={e => onChange(e)}
      markers={[highlightMarker]}
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
            console.log("eval err", e.toString());
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

  return (
    <div className="sans-serif pa2 flex">
      {sketch && (
        <Sketch sketch={sketch} setHighlightMarker={setHighlightMarker} />
      )}

      <div className="ml2 ba b--light-gray">
        <Editor
          sketch={code}
          onChange={e => setCode(e)}
          evalError={evalError}
          highlightMarker={highlightMarker}
        />
      </div>
    </div>
  );
};
