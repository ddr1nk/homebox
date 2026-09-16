import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const script = readFileSync(new URL("../public/set-theme.js", import.meta.url), "utf8");

function bootstrap(stored) {
  const attributes = {};
  const classes = [];
  runInNewContext(script, {
    localStorage: { getItem: () => stored },
    document: {
      documentElement: {
        setAttribute: (key, value) => (attributes[key] = value),
        classList: { add: value => classes.push(value) },
      },
    },
    console: { error: () => {} },
  });
  return { attributes, classes };
}

test("new installations and older preferences retain the classic interface", () => {
  assert.equal(bootstrap(null).attributes["data-interface-theme"], "classic");
  const old = bootstrap(JSON.stringify({ theme: "night" }));
  assert.equal(old.attributes["data-interface-theme"], "classic");
  assert.deepEqual(old.classes, ["theme-night"]);
});

test("modern interface is restored before Vue loads without discarding the classic palette", () => {
  const modern = bootstrap(JSON.stringify({ interfaceTheme: "modern", theme: "night" }));
  assert.equal(modern.attributes["data-interface-theme"], "modern");
  assert.equal(modern.attributes["data-theme"], "night");
});

test("unknown interface choices fall back and corrupt storage does not block startup", () => {
  assert.equal(bootstrap(JSON.stringify({ interfaceTheme: "unknown" })).attributes["data-interface-theme"], "classic");
  assert.doesNotThrow(() => bootstrap("invalid JSON"));
});
