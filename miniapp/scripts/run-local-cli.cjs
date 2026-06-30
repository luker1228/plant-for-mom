#!/usr/bin/env node

const { existsSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const miniappRoot = process.cwd();
const mode = process.argv[2];
const args = process.argv.slice(3);

if (!mode || (mode !== "uni" && mode !== "codegen")) {
  console.error("Usage: node ./scripts/run-local-cli.cjs <uni|codegen> [...args]");
  process.exit(1);
}

const candidateNodes = unique(
  [
    process.execPath,
    process.env.NVM_BIN ? path.join(process.env.NVM_BIN, "node") : null,
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
  ].filter(Boolean),
).filter(existsSync);

const inspectedNodes = candidateNodes
  .map((nodePath) => ({
    nodePath,
    info: inspectNode(nodePath),
  }))
  .filter((entry) => entry.info);

const selectedNode =
  mode === "codegen" ? pickCodegenNode(inspectedNodes) : pickUniNode(inspectedNodes);

if (!selectedNode) {
  console.error(`Unable to find a compatible Node runtime for ${mode}.`);
  process.exit(1);
}

const cliPath =
  mode === "codegen"
    ? path.join(miniappRoot, "node_modules/@graphql-codegen/cli/esm/bin.js")
    : path.join(miniappRoot, "node_modules/@dcloudio/vite-plugin-uni/bin/uni.js");

const result = spawnSync(selectedNode.nodePath, [cliPath, ...args], {
  cwd: miniappRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: buildPathWithSelectedNode(selectedNode.nodePath),
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

function unique(values) {
  return [...new Set(values)];
}

function inspectNode(nodePath) {
  const result = spawnSync(
    nodePath,
    [
      "-p",
      'JSON.stringify({arch:process.arch,platform:process.platform,version:process.versions.node})',
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(result.stdout.trim());
    const [major, minor] = parsed.version.split(".").map(Number);
    return { ...parsed, major, minor };
  } catch {
    return null;
  }
}

function pickCodegenNode(nodes) {
  return (
    nodes.find(({ info }) => info.major > 22 || (info.major === 22 && info.minor >= 12)) ||
    nodes.find(({ info }) => info.major >= 20) ||
    nodes[0]
  );
}

function pickUniNode(nodes) {
  const preferred = nodes.find(({ info }) => hasMatchingRollupBinary(info.platform, info.arch));
  return preferred || nodes[0];
}

function hasMatchingRollupBinary(platform, arch) {
  if (platform !== "darwin") {
    return true;
  }

  return existsSync(path.join(miniappRoot, `node_modules/@rollup/rollup-darwin-${arch}`));
}

function buildPathWithSelectedNode(nodePath) {
  const nodeDir = path.dirname(nodePath);
  const currentPath = process.env.PATH || "";
  return unique([nodeDir, ...currentPath.split(path.delimiter).filter(Boolean)]).join(path.delimiter);
}
