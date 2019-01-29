import JSON from "react-json-view";
import React, { useEffect, useState, useRef } from "react";
import { get } from "lodash";

import { COMMANDS } from "./commands";
import { Inspector } from "./inspector";
import { useImmer } from "./utils";

const MAX_HISTORY_LEN = 100;

const SketchControls = ({
  isPlaying,
  historyIdx,
  stateHistory,
  setIsPlaying,
  setHistory
}) => (
  <div>
    <button
      className="f7 mr2"
      onClick={() => {
        if (!isPlaying) {
          setHistory(draft => {
            draft.stateHistory = draft.stateHistory.slice(0, draft.idx + 1);
          });
        }

        setIsPlaying(!isPlaying);
      }}
    >
      {isPlaying ? "pause" : "play"}
    </button>

    <span className="f7 mr2 dib tc" style={{ width: 100 }}>
      {historyIdx} / {stateHistory.length - 1}
    </span>

    <button
      className="f7 mr2"
      onClick={() =>
        setHistory(draft => {
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
      max={stateHistory.length - 1}
      step={1}
      value={historyIdx}
      onChange={e => {
        const { value } = e.target;

        setHistory(draft => {
          draft.idx = parseInt(value, 10);
        });
      }}
    />

    <button
      className="f7 mr2"
      onClick={() =>
        setHistory(draft => {
          draft.idx = Math.min(draft.idx + 1, draft.stateHistory.length - 1);
        })
      }
    >
      {">>"}
    </button>
  </div>
);

export const Sketch = ({ sketch, setHighlight }) => {
  const [
    { stateHistory, eventsHistory, idx: historyIdx },
    setHistory
  ] = useImmer({
    stateHistory: [sketch.initialState || {}],
    eventsHistory: [[]],
    idx: 0
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const canvasRef = useRef(null);
  const [width, height] = get(sketch, ["setup", "size"], [800, 600]);

  const globals = { width, height };

  useEffect(() => {
    window.dumpHistory = () => ({ stateHistory, eventsHistory });

    return () => {
      delete window.dumpHistory();
    };
  });

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    // events

    const bbox = canvasRef.current.getBoundingClientRect();

    let events = [];

    const makeOnMouse = type => e => {
      events.push({
        source: type,
        x: e.clientX - bbox.left,
        y: e.clientY - bbox.top
      });
    };

    const onMouseMove = makeOnMouse("mousemove");
    const onMouseDown = makeOnMouse("mousedown");
    const onMouseUp = makeOnMouse("mouseup");
    const onMouseClick = makeOnMouse("mouseclick");

    const onKeyDown = e => {
      events.push({
        source: "keydown",
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
    };

    const onKeyUp = e => {
      events.push({
        source: "keydown",
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
    };

    canvasRef.current.addEventListener("mousemove", onMouseMove);
    canvasRef.current.addEventListener("mousedown", onMouseDown);
    canvasRef.current.addEventListener("mouseup", onMouseUp);
    canvasRef.current.addEventListener("click", onMouseClick);
    canvasRef.current.addEventListener("keydown", onKeyDown);
    canvasRef.current.addEventListener("keyup", onKeyUp);

    // play

    let frameId = null;

    const ctx = canvasRef.current.getContext("2d");

    const step = () => {
      for (const operation of sketch.draw(stateHistory[historyIdx])) {
        const [command, args] = operation;

        if (COMMANDS[command]) {
          COMMANDS[command](ctx, args, globals);
        }
      }

      if (isPlaying) {
        setHistory(
          draft => {
            const newState = sketch.update(
              Object.assign(
                {},
                sketch.initialState,
                draft.stateHistory[draft.idx]
              ),
              draft.eventsHistory[draft.idx],
              globals
            );

            draft.stateHistory.push(newState);
            draft.eventsHistory.push(events);

            while (draft.stateHistory.length > MAX_HISTORY_LEN + 1) {
              draft.stateHistory.shift();
              draft.eventsHistory.shift();
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

      canvasRef.current.removeEventListener("mousemove", onMouseMove);
      canvasRef.current.removeEventListener("mousedown", onMouseDown);
      canvasRef.current.removeEventListener("mouseup", onMouseUp);
      canvasRef.current.removeEventListener("click", onMouseClick);
      canvasRef.current.removeEventListener("keydown", onKeyDown);
      canvasRef.current.removeEventListener("keyup", onKeyUp);
    };
  });

  return (
    <div className="w-100 h-100">
      <div className="mb2">
        <SketchControls
          setHistory={setHistory}
          historyIdx={historyIdx}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          stateHistory={stateHistory}
        />
      </div>

      <div className="relative">
        <canvas width={width} height={height} ref={canvasRef} />

        {!isPlaying && (
          <Inspector
            state={stateHistory[historyIdx]}
            globals={globals}
            sketch={sketch}
            onHover={e =>
              setHighlight(
                e ? { start: e.lineStart - 2, end: e.lineEnd - 1 } : null
              )
            }
          />
        )}
      </div>

      <div>
        <JSON
          src={stateHistory[historyIdx]}
          enableClipboard={false}
          displayDataTypes={false}
          displayObjectSize={false}
          indentWidth={2}
          theme="grayscale"
        />
      </div>
    </div>
  );
};
