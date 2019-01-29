import React from "react";
import ReactDOM from "react-dom";

import { App } from "./app";

const USE_CREATE_ROOT = false;

if (USE_CREATE_ROOT) {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
} else {
  ReactDOM.render(<App />, document.getElementById("root"));
}
