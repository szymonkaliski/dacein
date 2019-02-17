import React, { useRef, useState } from "react";
import { saveAs } from "file-saver";

import { Help } from "./help";
import { EXAMPLES } from "./examples";

export const Topbar = ({ setCode, code }) => {
  const [isHelpVisible, setHelpVisible] = useState(false);
  const [isExamplesMenuVisible, setExamplesMenuVisible] = useState(false);

  const fileRef = useRef(null);

  return (
    <>
      <div className="bb b--gray flex f7" style={{ marginBottom: 5 }}>
        <span className="bg-gray custom-dark pv2 ph3 dib mr3">dacein</span>

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
            className="dib mr4 pointer dim"
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

          <div className="dib mr3 relative">
            <span
              className="pointer dim"
              onClick={() => setExamplesMenuVisible(!isExamplesMenuVisible)}
            >
              examples
            </span>

            {isExamplesMenuVisible && (
              <div
                className="absolute ba b--gray bg-custom-dark pa2 mt2"
                style={{ zIndex: 10, left: -10, width: 160 }}
              >
                <ol className="list pa0 ma0">
                  {Object.entries(EXAMPLES).map(([key, exampleCode]) => (
                    <li
                      className="pa1 dim pointer"
                      key={key}
                      onClick={() => {
                        setCode(exampleCode);
                        setExamplesMenuVisible(false);
                      }}
                    >
                      {key}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

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
