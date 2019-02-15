import React from "react";
import ReactDOM from "react-dom";

import { App } from "./app";

const USE_CREATE_ROOT = false;

if (USE_CREATE_ROOT) {
  ReactDOM.unstable_createRoot(document.getElementById("root")).render(<App />);
} else {
  ReactDOM.render(<App />, document.getElementById("root"));
}
