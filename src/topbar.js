import React, { useRef, useState } from "react";
import { saveAs } from "file-saver";

import { Overlay } from "./overlay";

const Help = ({ onClose }) => (
  <Overlay width={600} height={600} onClose={onClose}>
    <div>TODO</div>
  </Overlay>
);

export const Topbar = ({ setCode, code }) => {
  const [isHelpVisible, setHelpVisible] = useState(false);
  const fileRef = useRef(null);

  return (
    <>
      <div className="bb b--gray flex f7" style={{ marginBottom: 5 }}>
        <span className="bg-gray custom-dark pa2 dib mr3">dacein</span>

        <div className="pa2">
          <span
            className="dib mr3 pointer dim"
            onClick={() => {
              if (!fileRef.current) {
                return;
              }

              fileRef.current.click();
            }}
          >
            open
          </span>
          <span
            className="dib mr3 pointer dim"
            onClick={() => {
              saveAs(
                new Blob([code], {
                  type: "text/plain;charset=utf-8"
                }),
                "sketch.js"
              );
            }}
          >
            save
          </span>
          <span
            className="dib mr3 pointer dim"
            onClick={() => setHelpVisible(!isHelpVisible)}
          >
            help
          </span>
        </div>

        <input
          type="file"
          className="dn"
          ref={fileRef}
          onChange={e => {
            const [file] = e.target.files;

            if (!file) {
              return;
            }

            const reader = new FileReader();

            reader.onload = e => {
              const content = e.target.result;
              setCode(content);
            };

            reader.readAsText(file);
          }}
        />
      </div>

      {isHelpVisible && <Help onClose={() => setHelpVisible(false)} />}
    </>
  );
};
