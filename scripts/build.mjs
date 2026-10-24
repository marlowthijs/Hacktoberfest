import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const workerPath = resolve(root, "worker/index.js");
const htmlPath = resolve(root, "src/index.html");
const stylePath = resolve(root, "src/styles.css");
const appPath = resolve(root, "src/app.js");
const dataPath = resolve(root, "data/events.json");
const manifestPath = resolve(root, ".openai/hosting.json");
const outWorker = resolve(root, "dist/server/index.js");
const outManifest = resolve(root, "dist/.openai/hosting.json");

const [workerTemplate, htmlTemplate, styles, appScript, dataText, manifestText] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(htmlPath, "utf8"),
  readFile(stylePath, "utf8"),
  readFile(appPath, "utf8"),
  readFile(dataPath, "utf8"),
  readFile(manifestPath, "utf8")
]);

const catalogue = JSON.parse(dataText);
const manifest = JSON.parse(manifestText);
if (!Array.isArray(catalogue.societies) || !Array.isArray(catalogue.events)) throw new Error("data/events.json needs societies and events arrays.");
if (!manifest.project_id) throw new Error(".openai/hosting.json needs a Site project_id.");

let html = htmlTemplate.replace("<!-- SOCIETY_STYLES -->", "<style>\n" + styles + "\n</style>");
html = html.replace("<!-- SOCIETY_SCRIPT -->", "<script>\n" + appScript.replace(/<\/script/gi, "<\\/script") + "\n</script>");
if (!html.includes("__EVENT_DATA__")) throw new Error("The HTML template is missing its event-data placeholder.");

let worker = workerTemplate.replace("__FALLBACK_CATALOGUE_JSON__", JSON.stringify(catalogue));
if (worker.includes("__FALLBACK_CATALOGUE_JSON__") || !worker.includes("__APP_HTML__")) throw new Error("A Worker build placeholder was not replaced.");
worker = worker.replace("__APP_HTML__", JSON.stringify(html));
if (worker.includes("__APP_HTML__")) throw new Error("The app shell placeholder was not replaced.");

await Promise.all([
  mkdir(dirname(outWorker), { recursive: true }),
  mkdir(dirname(outManifest), { recursive: true })
]);
await Promise.all([
  writeFile(outWorker, worker),
  writeFile(outManifest, JSON.stringify(manifest, null, 2) + "\n")
]);
console.log("Built Society Synth Worker and Site manifest.");
