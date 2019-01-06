import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import "tachyons";

const USE_CREATE_ROOT = true;

if (USE_CREATE_ROOT) {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
} else {
  ReactDOM.render(<App />, document.getElementById("root"));
}
