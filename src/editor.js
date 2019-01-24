import React, { useState, useEffect } from "react";
import { Controlled as CodeMirror } from "react-codemirror2";
import { ChromePicker } from "react-color";

import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

const getColorFormat = str => {
  const RE_HSL = new RegExp(
    /hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3}%)\s*,\s*(\d{1,3}%)\s*(?:\s*,\s*(\d+(?:\.\d+)?)\s*)?\)/g
  );
  const RE_RGB = new RegExp(/rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/g);
  const RE_HEX = new RegExp(/#[a-fA-F0-9]{3,6}/g);

  if (str.match(RE_HSL)) {
    return "hsl";
  }

  if (str.match(RE_RGB)) {
    return "rgb";
  }

  if (str.match(RE_HEX)) {
    return "hex";
  }

  return null;
};

const stringifyColorFormat = (v, format) => {
  if (format === "hex") {
    return `"${v.hex}"`;
  }

  if (format === "hsl") {
    return `"hsl(${v.hsl.h}, ${v.hsl.s}, ${v.hsl.l}, ${v.hsl.a})"`;
  }

  if (format === "rgb") {
    return `"rgb(${v.rgb.r}, ${v.rgb.g}, ${v.rgb.b}, ${v.rgb.a})"`;
  }

  return null;
};

const NumberPicker = ({ value, coords, onChange }) => {
  const [tmpValue, setTmpValue] = useState(value);

  const exp = Math.round(Math.log10(Math.abs(value)));

  const min = 0;
  const max = Math.pow(10, exp + 1);
  const step = exp <= 0 ? 1 / Math.pow(10, Math.abs(exp) + 2) : 1;

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

const ColorPicker = ({ value, coords, onChange }) => {
  const [tmpValue, setTmpValue] = useState(value.replace(/"/g, ""));
  const format = getColorFormat(value);

  return (
    <div
      className="absolute pa1 bg-light-gray"
      style={{ top: coords.top - 300, left: coords.left, zIndex: 10 }}
    >
      <ChromePicker
        color={tmpValue}
        onChange={e => {
          setTmpValue(e[format]);
          onChange(stringifyColorFormat(e, format));
        }}
      />
    </div>
  );
};

const Picker = ({ type, coords, value, onChange }) => {
  if (type === "number") {
    return <NumberPicker value={value} coords={coords} onChange={onChange} />;
  }

  if (getColorFormat(value) !== null) {
    return <ColorPicker value={value} coords={coords} onChange={onChange} />;
  }

  return null;
};

export const Editor = ({ code, highlight, onChange, evalError }) => {
  const [picker, setPicker] = useState(null);
  const [tmpLength, setTmpLength] = useState(0);
  const [tmpCode, setTmpCode] = useState(code);
  const [tmpMarker, setTmpMarker] = useState(null);
  const [instance, setInstance] = useState(null);

  useEffect(
    () => {
      if (!instance) {
        return;
      }

      if (tmpMarker) {
        tmpMarker.clear();
        setTmpMarker(null);
      }

      if (highlight) {
        setTmpMarker(
          instance.markText(
            { line: highlight.start },
            { line: highlight.end },
            { className: "inspector-highlight" }
          )
        );
      }

      return () => {
        if (tmpMarker) {
          tmpMarker.clear();
          setTmpMarker(null);
        }
      };
    },
    [instance, highlight]
  );

  return (
    <div className="relative">
      <CodeMirror
        className="h-100"
        editorDidMount={e => setInstance(e)}
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
