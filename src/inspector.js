import React from "react";

export const INSPECTORS = {
  background: (_, { width, height }) => {
    return (
      <div className="absolute absolute--fill" style={{ width, height }} />
    );
  },

  ellipse: ({ pos, size, fill, stroke }) => {
    const [x, y] = pos;
    const [w, h] = size;

    return (
      <div
        style={{ left: x - w, top: y - h, width: w * 2, height: h * 2 }}
        className="absolute"
      />
    );
  },

  rect: ({ pos, size, fill, stroke }) => {
    const [x, y] = pos;
    const [w, h] = size;

    return (
      <div
        style={{ left: x, top: y, width: w, height: h }}
        className="absolute"
      />
    );
  }
};

export const Inspector = ({ sketch, state, globals, onHover }) => {
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
            {INSPECTORS[command](args, globals)}
          </div>
        );
      })}
    </div>
  );
};
