import leftPad from "left-pad";
import { get } from "lodash";

import { COMMANDS } from "./commands";

const encodeInColor = num => {
  const hex = num.toString(16);
  return `#${leftPad(hex, 6, "0")}`;
};

const decodeFromColor = hex => {
  return parseInt(`0x${hex}`);
};

export const makeInspector = ({ sketch, globals, constants }) => {
  const canvas = document.createElement("canvas");

  canvas.width = globals.width;
  canvas.height = globals.height;

  const ctx = canvas.getContext("2d");

  let state;
  let memo;

  const setState = _ => (state = _);

  const draw = () => {
    let i = 0;

    memo = sketch.draw(state, constants);

    for (const operation of memo) {
      const [command, args] = operation;

      const argsModded = Object.assign(args, {
        fill: args.fill ? encodeInColor(i) : undefined,
        stroke: args.stroke ? encodeInColor(i) : undefined
      });

      if (COMMANDS[command]) {
        COMMANDS[command](ctx, argsModded, globals);
      }

      i++;
    }
  };

  const onHover = (x, y) => {
    const data = ctx.getImageData(x, y, 1, 1).data.slice(0, 3);
    const hex = data.map(n => n.toString(16)).join("");
    const id = decodeFromColor(hex);

    return id;
  };

  const getMetaForId = id => get(memo, id);

  return {
    setState,
    draw,
    onHover,
    getMetaForId
  };
};
