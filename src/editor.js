import OutsideClickHandler from "react-outside-click-handler";
import React, { useState, useEffect, useRef } from "react";
import { ChromePicker } from "react-color";
import { Controlled as CodeMirror } from "react-codemirror2";

import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

import "./codemirror-base16-grayscale-dark.css";
import { Slider } from "./slider";
import { scale } from "./math";

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
  const [draftValue, setDraftValue] = useState(value);

  const exp = Math.round(Math.log10(Math.abs(value)));
  const min = 0;
  const max = Math.pow(10, exp + 1);

  return (
    <div
      className="absolute"
      style={{
        top: coords.top > 30 ? coords.top - 12 : coords.top + 16,
        left: coords.left - 10,
        zIndex: 10,
        width: 120
      }}
    >
      <Slider
        position={scale(draftValue, min, max, 0, 1)}
        onChange={value => {
          const out = scale(value, 0, 1, min, max);
          setDraftValue(out);
          onChange(`${out}`);
        }}
      />
    </div>
  );
};

const ColorPicker = ({ value, coords, onChange }) => {
  const [draftValue, setDraftValue] = useState(value.replace(/"/g, ""));

  const format = getColorFormat(value);

  return (
    <div
      className="absolute bg-light-gray br3"
      style={{
        top: coords.top > 300 ? coords.top - 250 : coords.top + 20,
        left: coords.left - 40,
        zIndex: 10
      }}
    >
      <ChromePicker
        color={draftValue}
        onChange={e => {
          setDraftValue(e[format]);
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

export const Editor = ({ code, highlight, onChange }) => {
  const [picker, setPicker] = useState(null);
  const [editorCode, setEditorCode] = useState(null);

  const instance = useRef(null);
  const tokenLength = useRef(null);
  const highlightMarker = useRef(null);

  // FIXME
  useEffect(() => {
    if (code !== editorCode) {
      setEditorCode(code);
    }
  }, [code]);

  useEffect(() => {
    if (!instance.current) {
      return;
    }

    const clearMarker = () => {
      if (highlightMarker.current) {
        highlightMarker.current.clear();
        highlightMarker.current = null;
      }
    };

    clearMarker();

    if (highlight) {
      highlightMarker.current = instance.current.markText(
        { line: highlight.start },
        { line: highlight.end },
        { className: "inspector-highlight" }
      );
    }

    return clearMarker;
  }, [instance, highlight]);

  return (
    <div className="relative h-100 overflow-scroll">
      <CodeMirror
        editorDidMount={e => (instance.current = e)}
        value={editorCode}
        onBeforeChange={(editor, data, value) => setEditorCode(value)}
        onChange={(editor, data, value) => onChange(value)}
        onCursor={e => {
          const cursor = e.getCursor();
          const token = e.getTokenAt(cursor);
          const coords = e.charCoords(
            { line: cursor.line, ch: token.start },
            "local"
          );

          if (!token.type) {
            return;
          }

          tokenLength.current = token.string.length;

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
        options={{
          theme: "base16-grayscale-dark"
        }}
      />

      {picker && (
        <OutsideClickHandler onOutsideClick={() => setPicker(null)}>
          <Picker
            key={picker.key}
            type={picker.type}
            coords={picker.coords}
            value={picker.value}
            onChange={value => {
              const { start, line } = picker.text;

              const newCode = editorCode
                .split("\n")
                .map((codeLine, i) => {
                  if (i !== line) {
                    return codeLine;
                  }

                  return (
                    codeLine.substr(0, start) +
                    value +
                    codeLine.substr(start + tokenLength.current)
                  );
                })
                .join("\n");

              tokenLength.current = `${value}`.length;
              setEditorCode(newCode);
            }}
          />
        </OutsideClickHandler>
      )}
    </div>
  );
};
