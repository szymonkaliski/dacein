import JSON from "react-json-view";
import React, { useEffect, useState, useRef } from "react";
import { get } from "lodash";

import Panel, { DIRECTION } from "./panel";
import { COMMANDS } from "./commands";
import { makeInspector } from "./inspector";
import { optimise } from "./optimise";
import { useImmer } from "./hooks";

const MAX_HISTORY_LEN = 100;

const SketchControls = ({
  isPlaying,
  historyIdx,
  stateHistory,
  setIsPlaying,
  setHistory,
  onReset
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

    <button className="f7 mr2" onClick={onReset}>
      reset
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

export const Sketch = ({ sketch, constants, setConstants, setHighlight }) => {
  const [{ stateHistory, idx: historyIdx }, setHistory] = useImmer({
    stateHistory: [sketch.initialState || {}],
    eventsHistory: [[]],
    idx: 0
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isOptimising, setIsOptimising] = useState(false);
  const canvasRef = useRef(null);

  const [width, height] = get(sketch, "size", [800, 600]);

  const globals = { width, height };

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
      for (const operation of sketch.draw(
        stateHistory[historyIdx],
        constants
      )) {
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

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    if (isPlaying) {
      return;
    }

    const state = stateHistory[historyIdx];

    // TODO: make inspector into a const ref!
    const inspector = makeInspector({ sketch, globals, constants });
    console.log("NEW INSPECTOR")

    inspector.setState(state);
    inspector.draw();

    const bbox = canvasRef.current.getBoundingClientRect();

    const onMouseDown = e => {
      const [mx, my] = [e.clientX - bbox.left, e.clientY - bbox.top];
      const id = inspector.onHover(mx, my);
      const [command, args] = inspector.getMetaForId(id);

      const optimiseArgs = {
        id,
        command,
        args
      };

      setIsOptimising(optimiseArgs);
    };

    const onMouseUp = () => {
      setIsOptimising(false);
    };

    const onMouseMove = e => {
      const [mx, my] = [e.clientX - bbox.left, e.clientY - bbox.top];

      if (!isOptimising) {
        const id = inspector.onHover(mx, my);
        const args = inspector.getMetaForId(id)[1];
        const meta = args.__meta;

        setHighlight(
          meta ? { start: meta.lineStart - 2, end: meta.lineEnd - 1 } : null
        );
      }

      if (isOptimising) {
        // console.log({
        //   ...isOptimising,
        //   sketch,
        //   state,
        //   globals,
        //   constants
        // });

        const newConstants = optimise({
          ...isOptimising,
          sketch,
          state,
          globals,
          constants,
          target: [mx, my]
        });

        if (newConstants) {
          setConstants(newConstants);
        }
      }
    };

    const onMouseOut = () => setHighlight(null);

    canvasRef.current.addEventListener("mousemove", onMouseMove);
    canvasRef.current.addEventListener("mousedown", onMouseDown);
    canvasRef.current.addEventListener("mouseup", onMouseUp);
    canvasRef.current.addEventListener("mouseout", onMouseOut);

    return () => {
      canvasRef.current.removeEventListener("mousemove", onMouseMove);
      canvasRef.current.removeEventListener("mousedown", onMouseDown);
      canvasRef.current.removeEventListener("mouseup", onMouseUp);
      canvasRef.current.removeEventListener("mouseout", onMouseOut);
    };
  });

  return (
    <div className="w-100 vh-100">
      <div className="mb2">
        <SketchControls
          setHistory={setHistory}
          historyIdx={historyIdx}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          stateHistory={stateHistory}
          onReset={() =>
            setHistory(draft => {
              draft.stateHistory = [sketch.initialState || {}];
              draft.eventsHistory = [[]];
              draft.idx = 0;
            })
          }
        />
      </div>

      <div className="h-100">
        <Panel.Parent direction={DIRECTION.VERTICAL} defaultDivide={0.8}>
          <Panel.Child className="flex justify-center items-center">
            <div className="relative">
              <canvas width={width} height={height} ref={canvasRef} />
            </div>
          </Panel.Child>

          <Panel.Child>
            <div className="pa2">
              <JSON
                src={stateHistory[historyIdx]}
                name="state"
                enableClipboard={false}
                displayDataTypes={false}
                displayObjectSize={false}
                indentWidth={2}
                theme="grayscale"
              />
            </div>
          </Panel.Child>
        </Panel.Parent>
      </div>
    </div>
  );
};
