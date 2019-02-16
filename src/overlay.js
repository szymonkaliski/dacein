import React from "react";
import useWindowSize from "@rehooks/window-size";

export const Overlay = ({ width, height, children, onClose }) => {
  const { innerWidth, innerHeight } = useWindowSize();

  return (
    <>
      <div
        className="absolute absolute--fill"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 10
        }}
        onClick={() => {
          if (onClose) {
            onClose();
          }
        }}
      />

      <div
        className="overlfow-scroll absolute bg-custom-dark ba bg-gray"
        style={{
          top: (innerHeight - height) / 2,
          left: (innerWidth - width) / 2,
          width,
          height,
          zIndex: 20
        }}
      >
        {children}
      </div>
    </>
  );
};
