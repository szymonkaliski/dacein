export const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export const scale = (val, inputMin, inputMax, outputMin, outputMax) => {
  return (
    (outputMax - outputMin) * ((val - inputMin) / (inputMax - inputMin)) +
    outputMin
  );
};
