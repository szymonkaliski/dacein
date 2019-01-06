import React from "react";

export const INSPECTORS = {
  ellipse: ({ pos, size, fill, stroke }) => {
    const [x, y] = pos;
    const [w, h] = size;

    return (
      <div
        style={{ left: x - w, top: y - h, width: w * 2, height: h * 2 }}
        className="absolute ba b--red"
      />
    );
  },

  rect: ({ pos, size, fill, stroke }) => {
    const [x, y] = pos;
    const [w, h] = size;

    return (
      <div
        style={{ left: x, top: y, width: w, height: h }}
        className="absolute ba b--red"
      />
    );
  }
};
