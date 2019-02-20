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
});`,

  events: `sketch({
  size: [600, 600],

  initialState: {
    mousePos: [0, 0],
    mouseClicked: false
  },

  update: (state, events) => {
    events.forEach(event => {
      if (event.source == "mousemove") {
        state.mousePos = event.pos;
      }

      if (event.source == "mousedown") {
        state.mouseClicked = true;
      }

      if (event.source == "mouseup") {
        state.mouseClicked = false;
      }
    });

    return state;
  },

  draw: state => {
    return [
      ["background", { fill: state.mouseClicked ? "#d2d2d2" : "#a2a2a2" }],
      ["line", {
        a: state.mousePos,
        b: [300, 300]
        stroke: "#050505"
      }]
    ];
  }
});`,

  "particle system": `// adapted from https://p5js.org/examples/simulate-particle-system.htmlconst

const vec2 = require("gl-vec2"); // require works

const rand = (min, max) => Math.random() * (max - min) + min;

const makeParticle = position => ({
  acceleration: [0, 0.05],
  position: position.slice(0),
  velocity: [rand(-1, 1), rand(-1, 0)],
  lifespan: 255
});

const updateParticle = particle => {
  const velocity = vec2.create();
  const position = vec2.create();

  vec2.add(velocity, particle.velocity, particle.acceleration);
  vec2.add(position, particle.position, velocity);

  return {
    lifespan: particle.lifespan - 2,
    acceleration: particle.acceleration,
    velocity,
    position
  };
};

const renderParticle = particle => [
  "ellipse",
  {
    pos: particle.position,
    size: [12, 12],
    stroke: \`rgba(255, 255, 255, \${particle.lifespan})\`,
    fill: \`rgba(127, 127, 127, \${particle.lifespan})\`
  }
];

sketch({
  size: [600, 600],

  initialState: {
    particles: []
  },

  update: state => {
    state.particles.push(makeParticle([300, 50]));

    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i] = updateParticle(state.particles[i]);

      if (state.particles[i].lifespan < 0) {
        state.particles.splice(i, 1);
      }
    }

    return state;
  },

  draw: state => {
    return [
      ["background", { fill: "#333333" }],
      ...state.particles.map(renderParticle)
    ];
  }
});`
};
