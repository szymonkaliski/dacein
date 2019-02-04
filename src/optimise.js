import { uncmin } from "numeric";

const dist = ([ax, ay], [bx, by]) => Math.hypot(bx - ax, by - ay);

export const optimise = ({ constants, sketch, state, id, target }) => {
  const x0 = constants;

  let minimised;

  try {
    minimised = uncmin(x => {
      const drawCalls = sketch.draw(state, x);
      const [command, args] = drawCalls[id];

      if (command === "ellipse") {
        return dist(args.pos, target);
      }
    }, x0);
  } catch (e) {
    console.warn(e);
  }

  if (minimised && minimised.solution) {
    return minimised.solution;
  }
};
