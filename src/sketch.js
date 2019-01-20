import React, { useEffect, useState, useRef } from "react";
import { get } from "lodash";

import { COMMANDS } from "./commands";
import { Inspector } from "./inspector";
import { useImmer } from "./utils";

const MAX_HISTORY_LEN = 1000;

export const Sketch = ({ sketch, setHighlightMarker }) => {
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
