import React, { useRef, useState, useEffect } from "react";
import useComponentSize from "@rehooks/component-size";

const Parent = ({ children }) => {
  const ref = useRef(null);
  const size = useComponentSize(ref);
  const [isDragging, setIsDragging] = useState(false);
  const [divider, setDivider] = useState(0.5);

  useEffect(
    () => {
      if (!ref) {
        return;
      }

      const bbox = ref.current.getBoundingClientRect();

      const onMouseMove = e => {
        e.preventDefault();

        if (e.clientX === 0) {
          return;
        }

        setDivider((e.clientX - bbox.left) / size.width);
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
    [isDragging]
  );

  const dividerSize = 10;
  const handleSize = 1;

  return (
    <div className="h-100 flex" ref={ref}>
      <div style={{ width: size.width * divider - dividerSize / 2 }}>
        {children[0]}
      </div>

      <div
        className="h-100"
        onMouseDown={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        style={{
          width: dividerSize,
          cursor: "ew-resize"
        }}
      >
        <div
          className="bg-gray h-100"
          style={{
            width: handleSize,
            marginLeft: (dividerSize - handleSize) / 2
          }}
        />
      </div>

      <div style={{ width: size.width * (1 - divider) - dividerSize / 2 }}>
        {children[1]}
      </div>
    </div>
  );
};

const Child = ({ children }) => (
  <div className="overflow-hidden">{children}</div>
);

export default { Parent, Child };
