import peerDepsExternal from "rollup-plugin-peer-deps-external";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default [
  {
    input: "src/browser/index.js",
    output: [
      {
        file: "dist/index.js",
        format: "esm"
      }
    ],
    plugins: [
      peerDepsExternal(),
      nodeResolve({
        extensions: [".js", ".jsx"]
      }),
      commonjs()
    ]
  }
];
