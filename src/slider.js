import React, { useEffect, useState, useRef } from "react";
import useComponentSize from "@rehooks/component-size";

import { clamp, scale } from "./math";

export const Slider = ({
  disabled = false,
  position = 0.0,
  onChange = () => {},
  height = 10
}) => {
  const ref = useRef(null);
  const bbox = useRef(null);
  const size = useComponentSize(ref);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!ref) {
      return;
    }

    if (disabled) {
      return;
    }

    bbox.current = ref.current.getBoundingClientRect();

    const onMouseMove = e => {
      e.preventDefault();

      if (e.clientX === 0) {
        return;
      }

      const value = (e.clientX - bbox.current.left) / size.width;
      onChange(clamp(value, 0, 1));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      setIsDragging(false);
    };

    if (isDragging !== false) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  const left = clamp(
    scale(position, 0, 1, 2, size.width - 1 - height),
    2,
    size.width - 1 - height
  );

  return (
    <div
      ref={ref}
      className="w-100 bg-gray relative br3"
      style={{ height }}
      onClick={e => {
        const value = (e.clientX - bbox.current.left) / size.width;
        onChange(clamp(value, 0, 1));
      }}
    >
      <div
        className="bg-custom-dark br-pill absolute dim"
        style={{
          height: height - 2,
          width: height - 2,
          top: 1,
          left: `${left}px`,
          cursor: "ew-resize"
        }}
        onMouseDown={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
      />
    </div>
  );
};
