import recast from "recast";
import types from "ast-types";
import { get, isNumber } from "lodash";

import { COMMANDS } from "./commands";

const Builders = recast.types.builders;
const isCommand = key => COMMANDS[key] !== undefined;

export const addMeta = code => {
  const ast = recast.parse(code);

  types.visit(ast, {
    visitExpressionStatement: function(path) {
      if (get(path, "value.expression.callee.name") === "sketch") {
        this.traverse(path);
      } else {
        return false;
      }
    },

    visitProperty: function(path) {
      if (path.value.key.name === "draw") {
        this.traverse(path);
      } else {
        return false;
      }
    },

    visitReturnStatement: function(path) {
      this.traverse(path);
    },

    visitArrayExpression: function(path) {
      const elements = path.value.elements || [];
      const maybeCommand = elements[0];

      if (isCommand(get(maybeCommand, "value"))) {
        let loc = maybeCommand.loc;
        let searchPath = path;

        while (searchPath) {
          if (
            get(searchPath, ["value", "body", "type"]) === "ArrayExpression" ||
            get(searchPath, ["value", "type"]) === "ArrayExpression"
          ) {
            loc = {
              start: get(searchPath, ["value", "loc", "start"]),
              end: get(searchPath, ["value", "loc", "end"])
            };

            searchPath = undefined;
          } else {
            searchPath = get(searchPath, "parentPath");
          }
        }

        if (elements[1].type === "ObjectExpression") {
          return Builders.arrayExpression([
            elements[0],
            Builders.objectExpression([
              ...elements[1].properties,
              Builders.property(
                "init",
                Builders.identifier("__meta"),
                Builders.objectExpression([
                  Builders.property(
                    "init",
                    Builders.identifier("lineStart"),
                    Builders.literal(loc.start.line)
                  ),
                  Builders.property(
                    "init",
                    Builders.identifier("lineEnd"),
                    Builders.literal(loc.end.line)
                  )
                ])
              )
            ])
          ]);
        }

        return false;
      } else {
        this.traverse(path);
      }
    }
  });

  const { code: finalCode } = recast.print(ast);

  return finalCode;
};

export const processRequire = code => {
  const ast = recast.parse(code);

  const requires = [];

  types.visit(ast, {
    visitIdentifier: function(path) {
      if (path.value.name === "require") {
        const arg = path.parentPath.value.arguments[0].value;
        const name = path.parentPath.parentPath.value.id.name;
        const loc = path.parentPath.parentPath.parentPath.value[0].loc;

        requires.push({
          start: loc.start.line - 1,
          end: loc.end.line - 1,
          arg,
          name
        });

        return false;
      }

      this.traverse(path);
    }
  });

  if (!requires.length) {
    return code;
  }

  // TODO: this should be done with recast as well, but I'm lazy
  const codeWithoutRequire = code
    .split("\n")
    .map((line, i) => {
      const shouldBeBlank = requires.some(
        ({ start, end }) => i >= start && i <= end
      );

      if (shouldBeBlank) {
        return "";
      }

      return line;
    })
    .join("\n");

  const finalCode = `
    ${requires
      .map(({ name, arg }) => `window.require("${arg}").then(${name} => {`)
      .join("\n")}

    ${codeWithoutRequire}

    ${requires
      // TODO: set error from here
      .map(({ name, arg }) => `}).catch(e => console.warn(e));`)
      .join("\n")}
  `;

  return finalCode;
};

export const replaceConstants = (code, constants) => {
  let idx = 0;

  const ast = recast.parse(code);

  types.visit(ast, {
    visitLiteral: function(path) {
      if (isNumber(path.value.value)) {
        let searchPath = path;
        let isInsideDraw = false;

        while (searchPath) {
          if (get(searchPath, ["value", "key", "name"]) === "draw") {
            searchPath = null;
            isInsideDraw = true;
          }
          searchPath = get(searchPath, "parentPath");
        }

        if (!isInsideDraw) {
          this.traverse(path);
          return;
        }

        if (constants && constants[idx]) {
          const number = constants[idx];

          path.value.value = number;
          path.value.raw = `${number}`;

          idx++;
        }
      }

      this.traverse(path);
    }
  });

  return recast.print(ast).code;
};

export const pullOutConstants = code => {
  const ast = recast.parse(code);

  let idx = 0;
  const pulledConstants = [];

  types.visit(ast, {
    visitArrowFunctionExpression: function(path) {
      if (get(path, "parentPath.value.key.name") === "draw") {
        return Builders.arrowFunctionExpression(
          [Builders.identifier("state"), Builders.identifier("__constants")],
          path.value.body
        );
      }

      this.traverse(path);
    },

    visitFunctionExpression: function(path) {
      if (get(path, "parentPath.value.key.name") === "draw") {
        return Builders.functionExpression(
          null,
          [Builders.identifier("state"), Builders.identifier("__constants")],
          path.value.body
        );
      }

      this.traverse(path);
    },

    visitLiteral: function(path) {
      if (isNumber(path.value.value)) {
        // protect from recursively updating in place
        if (
          get(path, ["parentPath", "value", "object", "name"]) === "__constants"
        ) {
          return false;
        }

        let searchPath = path;
        let isInsideDraw = false;

        while (searchPath) {
          if (get(searchPath, ["value", "key", "name"]) === "draw") {
            searchPath = null;
            isInsideDraw = true;
          }
          searchPath = get(searchPath, "parentPath");
        }

        if (!isInsideDraw) {
          this.traverse(path);
          return;
        }

        pulledConstants.push(path.value.value);

        return Builders.memberExpression(
          Builders.identifier("__constants"),
          Builders.literal(idx++)
        );
      }

      this.traverse(path);
    }
  });

  return {
    code: recast.print(ast).code,
    constants: pulledConstants
  };
};
