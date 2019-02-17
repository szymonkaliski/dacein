//                  <li className="pa1">brownian motion</li>
//                  <li className="pa1">particle system</li>
//                  <li className="pa1">spring</li>
//                  <li className="pa1">chain</li>

export const EXAMPLES = {
  "animated rectangle": `sketch({
  size: [600, 600],

  initialState: {
    rectSize: 100,
    direction: 1
  },

  update: state => {
    state.rectSize = state.rectSize + state.direction;

    if (state.rectSize > 220) {
      state.direction = -1;
    }

    if (state.rectSize < 20) {
      state.direction = 1;
    }

    return state;
  },

  draw: state => {
    const pos = [
      300 - state.rectSize / 2,
      300 - state.rectSize / 2,
    ];

    const size = [
      state.rectSize,
      state.rectSize
    ];

    return [
      ["background", { fill: "#d2d2d2" }],
      ["rect", { fill: "#050505", pos, size }]
    ];
  }
});`,

  "brownian motion": `const MAX_STEPS = 1000;
const RANGE = 10;

const rand = (min, max) => Math.random() * (max - min) + min;

sketch({
  size: [600, 600],

  initialState: {
    path: [
      [300, 300]
    ]
  },

  update: state => {
    state.path.push([
      state.path[state.path.length - 1][0] + rand(-RANGE, RANGE),
      state.path[state.path.length - 1][1] + rand(-RANGE, RANGE)
    ]);

    if (state.path.length > MAX_STEPS) {
      state.path.shift();
    }

    return state;
  },

  draw: state => {
    return [
      ["background", { fill: "#d2d2d2" }],
      ...state.path.slice(1).map((pos, i) => [
        "line",
        {
          a: pos,
          b: state.path[i],
          stroke: "#050505"
        }
      ])
    ]
  }
});`
};
