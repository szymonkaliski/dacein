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
});`,

  spring: `
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 200;

const M = 0.8; // mass
const K = 0.2; // spring constant
const D = 0.92; // damping
const R = 150; // rest position

const updateSpring = spring => {
  const f = -K * (spring.ps - R); // f=-ky
  const as = f / M; // set the acceleration, f=ma == a=f/m
  let vs = D * (spring.vs + as); // set the velocity
  const ps = spring.ps + vs; // updated position

  if (Math.abs(vs) < 0.1) {
    vs = 0.0;
  }

  return Object.assign(spring, { f, as, vs, ps });
};

sketch({
  size: [710, 400],

  initialState: {
    spring: {
      left: 710 / 2 - 100,
      width: 200,
      height: 50,
      ps: R, // position
      vs: 0, // velocity
      as: 0, // acceleration
      f: 0 // force
    },
    mousePos: [0, 0],
    isOver: false,
    isDragging: false
  },

  update: (state, events) => {
    if (!state.isDragging) {
      state.spring = updateSpring(state.spring);
    }

    events.forEach(e => {
      if (e.source === "mousemove") {
        state.mousePos = e.pos;
      }

      if (e.source === "mousedown") {
        state.isDragging = true;
      }

      if (e.source === "mouseup") {
        state.isDragging = false;
      }
    });

    if (
      state.mousePos[0] > state.spring.left &&
      state.mousePos[0] < state.spring.left + state.spring.width &&
      state.mousePos[1] > state.spring.ps &&
      state.mousePos[1] < state.spring.ps + state.spring.height
    ) {
      state.isOver = true;
    } else {
      state.isOver = false;
    }

    if (state.isDragging) {
      state.spring.ps = state.mousePos[1] - state.spring.height / 2;
      state.spring.ps = clamp(state.spring.ps, MIN_HEIGHT, MAX_HEIGHT);
    }
  },

  draw: state => {
    return [
      ["background", { fill: "#656565" }],
      [
        "rect",
        {
          pos: [state.spring.left, state.spring.ps],
          size: [state.spring.width, state.spring.height],
          fill: state.isOver ? "#ffffff" : "#cccccc"
        }
      ]
    ];
  }
});
`
};
