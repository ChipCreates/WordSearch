import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve("docs/screenshots");
await mkdir(outputDir, { recursive: true });

createServer(async (request, response) => {
  const name = new URL(request.url, "http://127.0.0.1").searchParams.get("name");
  if (request.method !== "POST" || !/^capture-mobile-(play|garden|levels)\.png$/.test(name ?? "")) {
    response.writeHead(400).end("invalid request");
    return;
  }
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  await writeFile(resolve(outputDir, name), bytes);
  response.writeHead(200).end(`${name}:${bytes.length}`);
}).listen(17654, "127.0.0.1", () => console.log("screenshot receiver ready"));
