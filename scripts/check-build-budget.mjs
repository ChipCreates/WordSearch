import fs from "node:fs";
import path from "node:path";

const root = path.resolve("dist-web");
const limits = {
  javascriptBytes: 500 * 1024,
  precacheBytes: 20 * 1024 * 1024,
};

if (!fs.existsSync(root)) {
  console.error("Build budget check: dist-web does not exist. Run npm run build:web first.");
  process.exit(1);
}

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

const files = filesUnder(root);
const jsEntries = files
  .filter((file) => file.includes(`${path.sep}assets${path.sep}`) && file.endsWith(".js"))
  .map((file) => ({ file, bytes: fs.statSync(file).size }))
  .filter(({ bytes }) => bytes > 10 * 1024);
const largestEntry = jsEntries.reduce((largest, current) => current.bytes > largest.bytes ? current : largest, { file: "", bytes: 0 });
const sw = path.join(root, "sw.js");
const precachedUrls = fs.readFileSync(sw, "utf8").match(/url:"([^"]+)"/g)?.map((entry) => entry.slice(5, -1)) ?? [];
const precacheBytes = precachedUrls.reduce((sum, relativeUrl) => {
  const file = path.join(root, relativeUrl.replaceAll("/", path.sep));
  return fs.existsSync(file) ? sum + fs.statSync(file).size : sum;
}, 0);
const jsBytes = largestEntry.bytes;

const format = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
console.log(`Build budget: largest JavaScript entry ${format(jsBytes)} / ${format(limits.javascriptBytes)}`);
console.log(`Build budget: precached install payload ${format(precacheBytes)} / ${format(limits.precacheBytes)}`);

const violations = [];
if (jsBytes > limits.javascriptBytes) violations.push(`JavaScript exceeds ${format(limits.javascriptBytes)}`);
if (precacheBytes > limits.precacheBytes) violations.push(`install payload exceeds ${format(limits.precacheBytes)}`);

if (violations.length) {
  console.error(`Build budget failed: ${violations.join("; ")}.`);
  process.exit(1);
}
