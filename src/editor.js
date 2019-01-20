import React from "react";
import { Controlled as CodeMirror } from "react-codemirror2";

import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

export const Editor = ({ code, highlightMarker, onChange, evalError }) => {
  return (
    <CodeMirror
      className="h-100"
      value={code}
      onChange={e => onChange(e)}
      onCursor={e => {
        const cursor = e.getCursor();
        const token = e.getTokenAt(cursor);
        const coords = e.cursorCoords();

        // TODO: overlay slider!
        console.log(token.type, token.string, coords);
      }}
    />
  );
};
