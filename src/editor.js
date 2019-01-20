import React, { useState } from "react";
import { Controlled as CodeMirror } from "react-codemirror2";

import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

const Picker = ({ type, coords, value, onChange }) => {
  if (type !== "number") {
    return null;
  }

  const [tmpValue, setTmpValue] = useState(value);

  // TODO: smarter min/max/step
  const min = value - value * 2;
  const max = value + value * 2;
  const step = 0.001;

  return (
    <div
      className="absolute pa1 bg-light-gray"
      style={{ top: coords.top - 30, left: coords.left, zIndex: 10 }}
    >
      <input
        type="range"
        value={tmpValue}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          setTmpValue(e.target.value);
          onChange(`${e.target.value}`);
        }}
      />
    </div>
  );
};

export const Editor = ({ code, highlightMarker, onChange, evalError }) => {
  const [picker, setPicker] = useState(null);
  const [tmpLength, setTmpLength] = useState(0);
  const [tmpCode, setTmpCode] = useState(code);

  return (
    <div className="relative">
      <CodeMirror
        className="h-100"
        value={tmpCode}
        onBeforeChange={(editor, data, value) => {
          setTmpCode(value);
        }}
        onChange={(editor, data, value) => {
          onChange(value);
        }}
        onCursor={e => {
          const cursor = e.getCursor();
          const token = e.getTokenAt(cursor);
          const coords = e.cursorCoords(true, "local");

          if (!token.type) {
            return;
          }

          setTmpLength(token.string.length);

          setPicker({
            key: `${token.type}-${token.string}`,
            type: token.type,
            value:
              token.type === "number" ? Number(token.string) : token.string,
            coords,
            text: {
              line: cursor.line,
              start: token.start
            }
          });
        }}
        options={{ autofocus: true }}
      />

      {picker && (
        <Picker
          key={picker.key}
          type={picker.type}
          coords={picker.coords}
          value={picker.value}
          onChange={value => {
            const { start, line } = picker.text;

            const newCode = code
              .split("\n")
              .map((codeLine, i) => {
                if (i !== line) {
                  return codeLine;
                }

                return (
                  codeLine.substr(0, start) +
                  value +
                  codeLine.substr(start + tmpLength)
                );
              })
              .join("\n");

            setTmpLength(`${value}`.length);
            setTmpCode(newCode);
          }}
        />
      )}
    </div>
  );
};
