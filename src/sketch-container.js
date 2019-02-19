import React from "react";
import immer from "immer";
import { cloneDeep, xor, debounce, uniq } from "lodash";

import { COMMANDS } from "./commands";
import { makeInspector } from "./inspector";

const MAX_HISTORY_LEN = 1000;

export class SketchContainer extends React.Component {
  setupCanvas = props => {
    this.ref.width = (props || this.props).width;
    this.ref.height = (props || this.props).height;

    this.events = [];

    const makeOnMouse = type => e => {
      const bbox = this.ref.getBoundingClientRect();

      this.events.push({
        source: type,
        pos: [e.clientX - bbox.left, e.clientY - bbox.top]
      });
    };

    this.onMouseMove = makeOnMouse("mousemove");
    this.onMouseDown = makeOnMouse("mousedown");
    this.onMouseUp = makeOnMouse("mouseup");
    this.onMouseClick = makeOnMouse("mouseclick");

    this.onKeyDown = e => {
      this.events.push({
        source: "keydown",
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
    };

    this.onKeyUp = e => {
      this.events.push({
        source: "keydown",
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
    };

    this.ref.addEventListener("mousemove", this.onMouseMove);
    this.ref.addEventListener("mousedown", this.onMouseDown);
    this.ref.addEventListener("mouseup", this.onMouseUp);
    this.ref.addEventListener("click", this.onMouseClick);
    this.ref.addEventListener("keydown", this.onKeyDown);
    this.ref.addEventListener("keyup", this.onKeyUp);
  };

  removeCanvasEvents = () => {
    this.ref.removeEventListener("mousemove", this.onMouseMove);
    this.ref.removeEventListener("mousedown", this.onMouseDown);
    this.ref.removeEventListener("mouseup", this.onMouseUp);
    this.ref.removeEventListener("click", this.onMouseClick);
    this.ref.removeEventListener("keydown", this.onKeyDown);
    this.ref.removeEventListener("keyup", this.onKeyUp);
  };

  resetCanvas = () => {
    this.removeCanvasEvents();
    this.setupCanvas();
  };

  resetState = props => {
    this.currentState = cloneDeep((props || this.props).sketch.initialState);

    this.props.setHistory(draft => {
      draft.stateHistory = [this.currentState];
      draft.eventsHistory = [[]];

      draft.idx = 0;
    });
  };

  setupInspector = props => {
    if (this.props.isPlaying) {
      return;
    }

    this.inspector = makeInspector(props || this.props);

    this.onMouseDownInspector = e => {
      if (this.props.isPlaying) {
        console.warning("onMouseDownInspector while playing!");
      }

      const bbox = this.ref.getBoundingClientRect();

      const [mx, my] = [
        Math.floor(e.clientX - bbox.left),
        Math.floor(e.clientY - bbox.top)
      ];

      const id = this.inspector.onHover(mx, my);
      const [command, args] = this.inspector.getMetaForId(id);
      const delta = args.pos ? [mx - args.pos[0], my - args.pos[1]] : [0, 0];

      const optimiseArgs = {
        id,
        command,
        args,
        delta,
        target: [mx, my]
      };

      this.props.setOptimiser(optimiseArgs);
    };

    this.onMouseUpInspector = () => {
      if (this.props.isPlaying) {
        console.warning("onMouseUpInspector while playing!");
      }

      this.props.setOptimiser(false);
    };

    this.onMouseMoveInspector = e => {
      if (this.props.isPlaying) {
        console.warning("onMouseMoveInspector while playing!");
      }

      const bbox = this.ref.getBoundingClientRect();

      const [mx, my] = [
        Math.floor(e.clientX - bbox.left),
        Math.floor(e.clientY - bbox.top)
      ];

      if (this.props.optimiser) {
        this.props.setOptimiser({ ...this.props.optimiser, target: [mx, my] });
      } else {
        const id = this.inspector.onHover(mx, my);
        const metaForId = this.inspector.getMetaForId(id);

        if (!metaForId || metaForId.length <= 1) {
          return;
        }

        const args = metaForId[1];
        const meta = args.__meta;

        this.props.setHighlight(
          meta ? { start: meta.lineStart - 2, end: meta.lineEnd - 1 } : null
        );
      }
    };

    this.onMouseOutInspector = () => this.props.setHighlight(null);

    this.ref.addEventListener("mousemove", this.onMouseMoveInspector);
    this.ref.addEventListener("mousedown", this.onMouseDownInspector);
    this.ref.addEventListener("mouseout", this.onMouseOutInspector);

    window.addEventListener("mouseup", this.onMouseUpInspector);
  };

  removeInspector = () => {
    this.ref.removeEventListener("mousemove", this.onMouseMoveInspector);
    this.ref.removeEventListener("mousedown", this.onMouseDownInspector);
    this.ref.removeEventListener("mouseout", this.onMouseOutInspector);

    window.removeEventListener("mouseup", this.onMouseUpInspector);

    this.inspector = undefined;
  };

  resetInspector = () => {
    this.removeInspector();
    this.setupInspector();
  };

  runExecute = () => {
    if (this.toExecute.size === 0) {
      return;
    }

    if (this.toExecute.size > 0) {
      this.toExecute.forEach(key => this[key]());
      this.toExecute = new Set();
    }
  };

  tick = () => {
    if (this.toExecute.size > 0) {
      this.frame = requestAnimationFrame(this.tick.bind(this));
      return;
    }

    const { sketch, constants, globals, setHistory, isPlaying } = this.props;

    const ctx = this.ref.getContext("2d");

    if (isPlaying) {
      this.currentState = immer(this.currentState, draft =>
        sketch.update(draft, this.events)
      );

      setHistory(draft => {
        draft.stateHistory.push(this.currentState);
        draft.eventsHistory.push(this.events);

        while (draft.stateHistory.length > MAX_HISTORY_LEN + 1) {
          draft.stateHistory.shift();
          draft.eventsHistory.shift();
        }

        draft.idx = Math.min(MAX_HISTORY_LEN, draft.idx + 1);
      });
    }

    if (this.inspector) {
      this.inspector.draw(this.currentState, constants);
    }

    for (const operation of sketch.draw(this.currentState, constants)) {
      const [command, args] = operation;

      if (COMMANDS[command]) {
        COMMANDS[command](ctx, args, globals);
      }
    }

    this.events = [];

    this.frame = requestAnimationFrame(this.tick.bind(this));
  };

  componentDidMount() {
    this.toExecute = new Set();
    this.runExecute = debounce(this.runExecute, 16);

    this.setupCanvas(this.props);
    this.resetState(this.props);

    this.frame = requestAnimationFrame(this.tick);
  }

  componentWillUmount() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
    }

    this.removeCanvasEvents();
    this.removeInspector();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (
      xor(
        Object.keys(nextProps.sketch.initialState),
        Object.keys(this.currentState)
      ).length > 0
    ) {
      this.toExecute.add("resetState");
      this.toExecute.add("resetInspector");
    }

    if (
      nextProps.width !== this.props.width ||
      nextProps.height !== this.props.height
    ) {
      this.toExecute.add("resetCanvas");
      this.toExecute.add("resetInspector");
    }

    if (
      nextProps.historyIdx !== this.props.historyIdx &&
      !nextProps.isPlaying
    ) {
      this.currentState = nextProps.stateHistory[nextProps.historyIdx];
      this.currentEvents = nextProps.eventsHistory[nextProps.historyIdx];
    }

    if (nextProps.isPlaying && !this.props.isPlaying) {
      this.toExecute.add("removeInspector");
    }

    if (!nextProps.isPlaying && this.props.isPlaying) {
      this.toExecute.add("resetInspector");
    }

    this.runExecute();
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return <canvas ref={ref => (this.ref = ref)} />;
  }
}
