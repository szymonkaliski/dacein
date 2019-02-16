import React from "react";

import { Overlay } from "./overlay";

const A = ({ href, children }) => (
  <a className="light-gray" href={href}>
    {children}
  </a>
);

const LANG = [
  ["background", ["fill"]],
  ["line", ["a", "b", "stroke"]],
  ["path", ["points", "stroke", "fill"]],
  ["ellipse", ["pos", "size", "fill", "stroke"]],
  ["rect", ["pos", "size", "fill", "stroke"]]
];

const CODE = `sketch({
  // sketch size
  size: [600, 600],

  // starting state
  initialState: { size: 10 },

  // update state into a new state, called before every draw
  update: state => {
    state.size += 10;
    return state;
  },

  draw: state => {
    // return an array objects to be placed on the sketch
    return [
      ["background", { fill: "#fff" }],
      ["ellipse", {
        pos: [ 300 ,300 ],
        size: [ state.size, state.size ]
      }]
    ];
  }
})
`;

export const Help = ({ onClose }) => (
  <Overlay width={600} height={600} onClose={onClose}>
    <div className="measure-wide lh-copy f7 pa3 light-gray overflow-scroll h-100">
      <p>
        <span className="gray">dacein</span> is an experimental IDE and library
        for creative coding made by{" "}
        <A href="https://szymonkaliski.com">Szymon Kaliski</A>.
      </p>

      <p>
        In addition to declarative canvas-based graphics library it provides{" "}
        <span className="i">time travel</span> through the sketch updates and{" "}
        <span className="i">direct manipulation</span> from canvas back into
        code.
      </p>

      <p>
        Both <span className="i">time travel</span> and{" "}
        <span className="i">direct manipulation</span> are only available when
        the sketch is paused.
      </p>

      <ol className="list pl3">
        <li style={{ listStyle: "disc" }}>
          to travel through time, use the slider near play/pause buttons
        </li>
        <li style={{ listStyle: "disc" }}>
          to manipulte the code, drag an <span className="gray">ellipse</span>{" "}
          or <span className="gray">rect</span>
        </li>
      </ol>

      <p>
        It is heavily inspired by <A href="http://processing.org">Processing</A>
        ,{" "}
        <A href="https://github.com/thi-ng/umbrella/tree/master/packages/hdom-canvas">
          @thi.ng/hdom-canvas
        </A>
        , and numerous other tools.
      </p>

      <p>
        The <span className="gray">sketch</span> library is a global function
        requiring an object with at least a <span className="gray">draw</span>{" "}
        property:
      </p>

      <pre className="gray">{CODE}</pre>

      <p>Commands available in the language:</p>

      <ol className="list pl3">
        {LANG.map(([command, args]) => (
          <li key={command} style={{ listStyle: "disc" }}>
            <span className="gray">{command}</span> ({"{"}{" "}
            {args.map((arg, i) => (
              <>
                <span className="gray" key={arg}>
                  {arg}
                </span>
                {i < args.length - 1 ? ", " : ""}
              </>
            ))}{" "}
            {"}"}})
          </li>
        ))}
      </ol>
    </div>
  </Overlay>
);
