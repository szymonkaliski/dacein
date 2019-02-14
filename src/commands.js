export const COMMANDS = {
  background: (ctx, { fill }, { width, height }) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
  },

  line: (ctx, { a, b, stroke }) => {
    if (!stroke) {
      return;
    }

    ctx.strokeStyle = stroke;

    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  },

  path: (ctx, { points, stroke, fill }) => {
    if (stroke) {
      ctx.strokeStyle = stroke;
    }
    if (fill) {
      ctx.fillStyle = fill;
    }

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const point of points) {
      ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();

    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  },

  ellipse: (ctx, { pos, size, fill, stroke }) => {
    if (fill) {
      ctx.fillStyle = fill;
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
    }

    const [x, y] = pos || [0, 0];
    const [w, h] = size || [0, 0];

    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);

    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  },

  rect: (ctx, { pos, size, fill, stroke }) => {
    if (fill) {
      ctx.fillStyle = fill;
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
    }

    const [x, y] = pos || [0, 0];
    const [w, h] = size || [0, 0];

    ctx.beginPath();
    ctx.rect(x, y, w, h);

    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }
};
