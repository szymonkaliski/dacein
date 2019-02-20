import JSON from "react-json-view";
import React, { useEffect, useState } from "react";
import { get } from "lodash";

import { Panel, DIRECTION } from "./panel";
import { SketchContainer } from "./sketch-container";
import { Slider } from "./slider";
import { clamp } from "./math";
import { optimise } from "./optimise";
import { useImmer } from "./hooks";

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
  constants,
  code,
  setConstants,
  setHighlight
}) => {
  const [isPlaying, setIsPlaying] = useState(DEFAULT_IS_PLAYING);
  const [optimiser, setOptimiser] = useState(false);

  const [
    { stateHistory, eventsHistory, idx: historyIdx },
    setHistory
  ] = useImmer({
    stateHistory: [sketch.initialState || {}],
    eventsHistory: [[]],
    idx: 0
  });

  const [width, height] = get(sketch, "size", [800, 600]);
  const globals = { width, height };

  useEffect(() => {
    if (!optimiser) {
      return;
    }

    const state = stateHistory[historyIdx];

    const newConstants = optimise({
      ...optimiser,
      sketch,
      state,
      globals,
      constants
    });

    if (newConstants) {
      setConstants(newConstants);
    }
  }, [optimiser]);

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
            <SketchContainer
              width={width}
              height={height}
              sketch={sketch}
              code={code}
              isPlaying={isPlaying}
              historyIdx={historyIdx}
              stateHistory={stateHistory}
              eventsHistory={eventsHistory}
              constants={constants}
              globals={globals}
              optimiser={optimiser}
              setHistory={setHistory}
              setOptimiser={setOptimiser}
              setHighlight={setHighlight}
            />
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
            collapsed={1}
            theme="grayscale"
          />
        </div>
      </Panel>
    </div>
  );
};
