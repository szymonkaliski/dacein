import React from "react";
import { identity } from "lodash";

export const Errors = ({ errors }) => {
  return (
    <div className="pa2 f7">
      {!errors || (!errors.length && <div className="gray">no errors</div>)}

      {(errors || []).filter(identity).map(text => (
        <div className="red" key={text}>{text}</div>
      ))}
    </div>
  );
};
