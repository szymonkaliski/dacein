import React, { useEffect, useState, useRef } from "react";
import lodash, { get } from "lodash";
import Immutable, { Map, List } from "immutable";

// expose to sketch once it's eval()-ed
window.Immutable = Immutable;
window.lodash = lodash;

const MAX_HISTORY_LEN = 1000;

const sketch = {
  setup: {
    canvas: [800, 400]
  },

  initialState: Map({ c: 0 }),

  update: state => {
    return state.update("c", c => c + 0.1);
  },

  draw: state => {
    const points = lodash
      .range(300)
      .map(i => [
        Math.sin((state.get("c") + i * 0.2) * 0.1) * 330 + 400,
        Math.cos((state.get("c") + i * 0.2) * 0.5) * 100 + 200
      ]);

    return [
      ["background", { fill: "#eee" }],
      ["path", { points, stroke: "#333" }]

      // ...lodash.range(40).map(i => {
      //   return [
      //     "rect",
      //     {
      //       pos: [
      //         Math.sin((state.get("c") + i) * 0.1) * 330 + 400,
      //         Math.cos((state.get("c") + i) * 0.5) * 100 + 200
      //       ],
      //       size: [40, 40],
      //       fill: "#ddd",
      //       stroke: "#333"
      //     }
      //   ];
      // }),

      // ...lodash.range(40).map(i => {
      //   return [
      //     "line",
      //     {
      //       a: [
      //         Math.sin((state.get("c") + i) * 0.1) * 330 + 400,
      //         Math.cos((state.get("c") + i) * 0.5) * 100 + 200
      //       ],
      //       b: [400, 200],
      //       stroke: "#333"
      //     }
      //   ];
      // }),

      // ...lodash.range(40).map(i => {
      //   return [
      //     "ellipse",
      //     {
      //       pos: [
      //         Math.sin((state.get("c") + i) * 0.1) * 330 + 400,
      //         Math.cos((state.get("c") + i) * 0.5) * 100 + 200
      //       ],
      //       size: [4, 4],
      //       fill: "#333"
      //     }
      //   ];
      // })
    ];
  }
};

const COMMANDS = {
  background: (ctx, { fill }, { width, height }) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
  },

  line: (ctx, { a, b, stroke }) => {
    if (!stroke) {
      return;
    }

    ctx.strokeStyle = stroke;

    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  },

  path: (ctx, { points, stroke, fill }) => {
    if (stroke) {
      ctx.strokeStyle = stroke;
    }
    if (fill) {
      ctx.fillStyle = fill;
    }

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const point of points) {
      ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();

    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  },

  ellipse: (ctx, { pos, size, fill, stroke }) => {
    if (fill) {
      ctx.fillStyle = fill;
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
    }

    const [x, y] = pos;
    const [w, h] = size;

    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);

    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  },

  rect: (ctx, { pos, size, fill, stroke }) => {
    if (fill) {
      ctx.fillStyle = fill;
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
    }

    const [x, y] = pos;
    const [w, h] = size;

    ctx.beginPath();
    ctx.rect(x, y, w, h);

    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }
};

const PLAYING = "PLAYING";
const PAUSED = "PAUSED";

const Sketch = ({ sketch }) => {
  const [[history, historyIdx], updateHistory] = useState([
    List([sketch.initialState || Map()]),
    0
  ]);

  const [playState, updatePlayState] = useState(PLAYING);

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
      const newState = sketch.update(history.get(historyIdx));

      for (const operation of sketch.draw(newState)) {
        const [command, args] = operation;

        if (COMMANDS[command]) {
          COMMANDS[command](ctx, args, globals);
        }
      }

      if (playState === PLAYING) {
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
            updatePlayState(PAUSED);
          }}
        >
          pause
        </button>

        <button
          className="f7 mr2"
          onClick={() => {
            updateHistory([history.slice(0, historyIdx + 1), historyIdx]);
            updatePlayState(PLAYING);
          }}
        >
          play
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
          onChange={e => updateHistory([history, e.target.value])}
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

      <canvas
        className="ba b--silver"
        width={width}
        height={height}
        ref={canvasRef}
      />

      {/* <pre className="code">{JSON.stringify(state, null, 2)}</pre> */}
    </div>
  );
};

export default () => (
  <div className="sans-serif pa2">
    <Sketch sketch={sketch} />
  </div>
);
