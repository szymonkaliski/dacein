import { useState } from "react";
import immer from "immer";

export const useImmer = initialValue => {
  const [val, updateValue] = useState(initialValue);
  return [val, updater => updateValue(immer(updater))];
};

