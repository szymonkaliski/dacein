import React from "react";
import { identity } from "lodash";

export const Errors = ({ errors }) => {
  return (
    <div>
      {(errors || []).filter(identity).map(text => (
        <div key={text}>{text}</div>
      ))}
    </div>
  );
};
