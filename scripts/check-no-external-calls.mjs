// Static check: lists every web address written in the source code and fails if any is not this computer.
// This is a helpful check, not a proof. The real proof is the offline test in docs/DEMO.md.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const roots = ["server/src", "client/src"];
const allowed = [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, /^https?:\/\/\$\{/]; // second: a template such as http://${host}
const found = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if ([".ts", ".tsx", ".css", ".html"].includes(extname(p))) scan(p);
  }
}
function scan(file) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    for (const m of line.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
      if (!allowed.some((re) => re.test(m[0]))) found.push(`${file}:${i + 1}  ${m[0]}`);
    }
  });
}
roots.forEach(walk);

if (found.length) {
  console.log("Web addresses that are not this computer:\n" + found.join("\n"));
  process.exit(1);
}
console.log("OK: the source code contains no web address except this computer (localhost / 127.0.0.1).");
