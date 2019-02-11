import React, { useRef, useState, useEffect } from "react";
import useComponentSize from "@rehooks/component-size";

export const DIRECTION = {
  HORIZONTAL: "HORIZONTAL",
  VERTICAL: "VERTICAL"
};

export const Panel = ({
  children,
  direction = DIRECTION.HORIZONTAL,
  defaultDivide = 0.5
}) => {
  const ref = useRef(null);
  const size = useComponentSize(ref);
  const [isDragging, setIsDragging] = useState(false);
  const [divider, setDivider] = useState(defaultDivide);

  useEffect(
    () => {
      if (!ref) {
        return;
      }

      const bbox = ref.current.getBoundingClientRect();

      const onMouseMove = e => {
        e.preventDefault();

        if (direction === DIRECTION.HORIZONTAL) {
          if (e.clientX === 0) {
            return;
          }

          setDivider((e.clientX - bbox.left) / size.width);
        } else {
          if (e.clientY === 0) {
            return;
          }

          setDivider((e.clientY - bbox.top) / size.height);
        }
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
    },
    [isDragging, direction, ref]
  );

  console.log({ divider });

  const dividerSize = 10;
  const handleSize = 1;

  const styles =
    direction === DIRECTION.HORIZONTAL
      ? [
          { width: size.width * divider - dividerSize / 2 },
          { width: size.width * (1 - divider) - dividerSize / 2 }
        ]
      : [
          { height: size.height * divider - dividerSize / 2 },
          { height: size.height * (1 - divider) - dividerSize / 2 }
        ];

  const handleWrapperStyle =
    direction === DIRECTION.HORIZONTAL
      ? { width: dividerSize, cursor: "ew-resize" }
      : { height: dividerSize, cursor: "ns-resize" };

  const handleStyle =
    direction === DIRECTION.HORIZONTAL
      ? { width: handleSize, marginLeft: (dividerSize - handleSize) / 2 }
      : { height: handleSize, marginTop: (dividerSize - handleSize) / 2 };

  const wrapperClassName =
    direction === DIRECTION.HORIZONTAL ? "flex" : "flex flex-column";

  return (
    <div className={`h-100 ${wrapperClassName}`} ref={ref}>
      <div style={styles[0]} className="overflow-hidden">
        {children[0]}
      </div>

      <div
        className="h-100"
        onMouseDown={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        style={handleWrapperStyle}
      >
        <div className="h-100 bg-gray" style={handleStyle} />
      </div>

      <div style={styles[1]} className="overflow-hidden">
        {children[1]}
      </div>
    </div>
  );
};
