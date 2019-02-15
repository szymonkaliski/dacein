import { uncmin } from "numeric";
import { get } from "lodash";

const dist = ([ax, ay], [bx, by]) => Math.hypot(bx - ax, by - ay);
const add = ([ax, ay], [bx, by]) => [ax + bx, ay + by];

export const optimise = ({ constants, sketch, state, id, target, delta }) => {
  const x0 = constants;

  let minimised;

  try {
    minimised = uncmin(x => {
      const drawCalls = sketch.draw(state, x);
      const pos = get(drawCalls, [id, 1, "pos"]);

      if (pos !== undefined) {
        return dist(add(pos, delta), target);
      }

      return 0;
    }, x0);
  } catch (e) {
    console.warn(e);
  }

  if (minimised && minimised.solution) {
    return minimised.solution;
  }
};
