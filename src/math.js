export const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export const scale = (val, inputMin, inputMax, outputMin, outputMax) => {
  return (
    (outputMax - outputMin) * ((val - inputMin) / (inputMax - inputMin)) +
    outputMin
  );
};

export const dist = ([ax, ay], [bx, by]) => Math.hypot(bx - ax, by - ay);

export const add = ([ax, ay], [bx, by]) => [ax + bx, ay + by];
