import React from "react";

export const Errors = ({ errors }) => {
  return (
    <div>
      {(errors || []).map(text => (
        <div key={text}>{text}</div>
      ))}
    </div>
  );
};
