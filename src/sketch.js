import JSON from "react-json-view";
import React, { useEffect, useState, useRef } from "react";
import { get, cloneDeep } from "lodash";

import { COMMANDS } from "./commands";
import { Panel, DIRECTION } from "./panel";
import { makeInspector } from "./inspector";
import { optimise } from "./optimise";
import { useImmer } from "./hooks";
import { Slider } from "./slider";
import { clamp } from "./math";

const MAX_HISTORY_LEN = 1000;
const DEFAULT_IS_PLAYING = true;

const RoundButton = ({ onClick, children }) => (
  <div className="dib">
    <button
      className="mr2 custom-dark bg-gray br-pill bn lh-solid dt dim pointer"
      style={{ height: 26, width: 26 }}
      onClick={onClick}
    >
      <div className="dtc v-mid tc" style={{ fontSize: 12, width: 26 }}>
        {children}
      </div>
    </button>
  </div>
);

const SketchControls = ({
  isPlaying,
  historyIdx,
  stateHistory,
  setIsPlaying,
  setHistory,
  onReset
}) => (
  <div className="pa2 flex items-center">
    <RoundButton
      onClick={() => {
        if (!isPlaying) {
          setHistory(draft => {
            draft.stateHistory = draft.stateHistory.slice(0, draft.idx + 1);
          });
        }

        setIsPlaying(!isPlaying);
      }}
    >
      {isPlaying ? "❚❚" : "▶︎"}
    </RoundButton>

    <RoundButton onClick={onReset}>
      <span style={{ fontSize: 14 }}>◼</span>
    </RoundButton>

    <div className="ml2 w-100">
      <Slider
        disabled={isPlaying}
        position={
          stateHistory.length > 1
            ? Math.max(0, historyIdx / (stateHistory.length - 1))
            : 0
        }
        onChange={v =>
          setHistory(draft => {
            draft.idx = clamp(
              Math.floor(v * stateHistory.length),
              0,
              stateHistory.length - 1
            );
          })
        }
      />
    </div>
  </div>
);

export const Sketch = ({
  sketch,
  code,
  constants,
  setConstants,
  setHighlight
}) => {
  const [{ stateHistory, idx: historyIdx }, setHistory] = useImmer({
    stateHistory: [sketch.initialState || {}],
    eventsHistory: [[]],
    idx: 0
  });

  const [isPlaying, setIsPlaying] = useState(DEFAULT_IS_PLAYING);
  const [isOptimising, setIsOptimising] = useState(false);
  const [prevCode, setPrevCode] = useState(null);
  const [isSingleStep, setSingleStep] = useState(false);
  const canvasRef = useRef(null);

  const [width, height] = get(sketch, "size", [800, 600]);

  const globals = { width, height };

  useEffect(() => {
    if (!isPlaying && code !== prevCode) {
      setSingleStep(true);
      setPrevCode(code);
    }
  }, [code, prevCode, isPlaying]);

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

    const ctx = canvasRef.current.getContext("2d");

    const draw = state => {
      for (const operation of sketch.draw(state, constants)) {
        const [command, args] = operation;

        if (COMMANDS[command]) {
          COMMANDS[command](ctx, args, globals);
        }
      }
    };

    if (isPlaying || isSingleStep) {
      setHistory(draft => {
        const state = sketch.update(
          Object.assign(
            {},
            cloneDeep(sketch.initialState),
            draft.stateHistory[draft.idx]
          ),
          draft.eventsHistory[draft.idx]
        );

        draft.stateHistory.push(state);
        draft.eventsHistory.push(events);

        while (draft.stateHistory.length > MAX_HISTORY_LEN + 1) {
          draft.stateHistory.shift();
          draft.eventsHistory.shift();
        }

        draft.idx = Math.min(MAX_HISTORY_LEN, draft.idx + 1);

        draw(state);
      });
    } else {
      draw(stateHistory[historyIdx]);
    }

    if (isSingleStep) {
      setSingleStep(false);
    }

    return () => {
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

    if (isPlaying || isSingleStep) {
      return;
    }

    const state = stateHistory[historyIdx];
    const inspector = makeInspector({ sketch, globals, constants });

    inspector.setState(state);
    inspector.draw();

    const bbox = canvasRef.current.getBoundingClientRect();

    const onMouseDown = e => {
      const [mx, my] = [
        Math.floor(e.clientX - bbox.left),
        Math.floor(e.clientY - bbox.top)
      ];

      const id = inspector.onHover(mx, my);
      const [command, args] = inspector.getMetaForId(id);
      const delta = args.pos ? [mx - args.pos[0], my - args.pos[1]] : [0, 0];

      const optimiseArgs = {
        id,
        command,
        args,
        delta,
        target: [mx, my]
      };

      setIsOptimising(optimiseArgs);
    };

    const onMouseUp = () => {
      setIsOptimising(false);
    };

    const onMouseMove = e => {
      const [mx, my] = [
        Math.floor(e.clientX - bbox.left),
        Math.floor(e.clientY - bbox.top)
      ];

      if (isOptimising) {
        setIsOptimising({ ...isOptimising, target: [mx, my] });
      } else {
        const id = inspector.onHover(mx, my);
        const args = inspector.getMetaForId(id)[1];
        const meta = args.__meta;

        setHighlight(
          meta ? { start: meta.lineStart - 2, end: meta.lineEnd - 1 } : null
        );
      }
    };

    const onMouseOut = () => setHighlight(null);

    canvasRef.current.addEventListener("mousemove", onMouseMove);
    canvasRef.current.addEventListener("mousedown", onMouseDown);
    canvasRef.current.addEventListener("mouseout", onMouseOut);

    window.addEventListener("mouseup", onMouseUp);

    return () => {
      canvasRef.current.removeEventListener("mousemove", onMouseMove);
      canvasRef.current.removeEventListener("mousedown", onMouseDown);
      canvasRef.current.removeEventListener("mouseout", onMouseOut);

      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  useEffect(() => {
    if (!isOptimising) {
      return;
    }

    const state = stateHistory[historyIdx];

    const newConstants = optimise({
      ...isOptimising,
      sketch,
      state,
      globals,
      constants
    });

    if (newConstants) {
      setConstants(newConstants);
    }
  }, [isOptimising]);

  return (
    <div className="w-100 h-100">
      <Panel direction={DIRECTION.VERTICAL} defaultDivide={0.85}>
        <div className="flex flex-column h-100">
          <div className="mb2">
            <SketchControls
              setHistory={setHistory}
              historyIdx={historyIdx}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              stateHistory={stateHistory}
              onReset={() => {
                setHistory(draft => {
                  draft.stateHistory = [sketch.initialState || {}];
                  draft.eventsHistory = [[]];
                  draft.idx = 0;
                });

                setIsPlaying(false);
              }}
            />
          </div>

          <div className="flex justify-center items-center relative h-100 overflow-hidden">
            <canvas width={width} height={height} ref={canvasRef} />
          </div>
        </div>

        <div className="pa2 overflow-scroll h-100">
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
      </Panel>
    </div>
  );
};
