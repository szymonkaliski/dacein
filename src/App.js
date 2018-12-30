import React, { useEffect, useState, useRef } from "react";
import lodash, { get } from "lodash";
import Immutable, { Map } from "immutable";

// expose to sketch once it's eval()-ed
window.Immutable = Immutable;
window.lodash = lodash;

const sketch = {
  setup: {
    canvas: [800, 400]
  },

  initialState: Map({ c: 0 }),

  update: state => {
    return state.update("c", c => c + 0.1);
  },

  draw: state => {
    return [
      ["background", { fill: "#eee" }],
      ...lodash.range(40).map(i => {
        return [
          "circle",
          {
            x: Math.sin((state.get("c") + i) * 0.1) * 330 + 400,
            y: Math.cos((state.get("c") + i) * 0.5) * 100 + 200,
            r: 4,
            fill: "#333"
          }
        ];
      })
    ];
  }
};

const COMMANDS = {
  background: (ctx, { fill }, { width, height }) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
  },

  circle: (ctx, { x, y, r, fill, stroke }) => {
    if (fill) {
      ctx.fillStyle = fill;
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
    }

    ctx.beginPath();
    ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);

    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }
};

const Sketch = ({ sketch }) => {
  const [state, updateState] = useState(sketch.initialState || Map());
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
      const newState = sketch.update(state);

      for (const operation of sketch.draw(newState)) {
        const [command, args] = operation;

        if (COMMANDS[command]) {
          COMMANDS[command](ctx, args, globals);
        }
      }

      updateState(newState, () => {
        frameId = requestAnimationFrame(step);
      });
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
