// Episodes sub-tab: the built chain episodes (bench/spbench/chain.py) drawn in 3D, one question and its flip and keep
// twins side by side. Poses come from frames.json (bench/spbench/episodes_export.py, from layout.py: Isaac's frame,
// metres, z up), shown here in three.js's y-up frame: (x, y, z) -> (x, z, -y), yaw about +z -> rotation about +y.
// Models: NVIDIA SimReady warehouse assets (CC BY 4.0) converted to glTF for the cliff tabs; the robots and carts are
// drawn boxes (no SimReady model of them here). These are browser drawings, not Isaac Sim renders.
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {MeshoptDecoder} from "three/addons/libs/meshopt_decoder.module.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

const FILES = {shelf3: "SM_Rack_F04_01.glb", box: "FlatBox_A05_26x26x11cm_PR_NVD_01.glb", bin: "SM_Container_C04_Gray_01.glb",
               pallet: "Pallet_A1.glb", forklift: "SM_Forklift_C01_Blue_01.glb", rack_long: "RackLongEmpty_A1.glb",
               package: "Cardbox_A1.glb"};
const YAW_OFFSET = {forklift: Math.PI / 2};   // the forklift model's front is its +z; the layout's front is +x
const TINT = {blue: 0x2f6bd8, red: 0xc8382e};
const S = {base: "", data: null, panes: [], cache: {}, key: null, loader: null};

const P = (p) => new THREE.Vector3(p[0], p[2], -p[1]);   // Isaac (x, y, z) -> three (x, z, -y)

export async function init(opts) {
  S.base = opts.base; S.onStatus = opts.onStatus || (() => {});
  S.loader = new GLTFLoader(); S.loader.setMeshoptDecoder(MeshoptDecoder);
  S.onStatus("loading the episode poses");
  S.data = await (await fetch(opts.framesUrl)).json();
  S.panes = opts.panes.map(makePane);
  S.onStatus("");
}

function makePane(el) {
  const R = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.15;
  el.appendChild(R.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe3e8);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50555c, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(6, 14, 9); scene.add(sun);
  // one floor under all three roaming scenes (x from -10 to 50 m), wide enough that its edge never shows
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({color: 0xa3a8ad, roughness: 0.9}));
  floor.rotation.x = -Math.PI / 2; floor.position.x = 18; scene.add(floor);
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);
  const ctl = new OrbitControls(cam, R.domElement); ctl.enableDamping = false; ctl.maxPolarAngle = Math.PI * 0.49;
  const pane = {el, R, scene, cam, ctl, world: new THREE.Group(), objs: {}, home: null};
  scene.add(pane.world);
  ctl.addEventListener("change", () => draw(pane));
  new ResizeObserver(() => { fit(pane); draw(pane); }).observe(el);
  fit(pane);
  return pane;
}

function fit(p) {
  const w = p.el.clientWidth || 480, h = p.el.clientHeight || Math.round(w * 9 / 16);
  p.R.setSize(w, h, false); p.cam.aspect = w / h;
  if (p.home) p.cam.fov = vfov(p.home.hfov, p.cam.aspect);
  p.cam.updateProjectionMatrix();
}

const vfov = (hfov, aspect) => 2 * Math.atan(Math.tan(hfov * Math.PI / 360) / aspect) * 180 / Math.PI;
const draw = (p) => p.R.render(p.scene, p.cam);

async function model(kind) {
  if (!FILES[kind]) return null;
  if (!S.cache[kind]) S.cache[kind] = S.loader.loadAsync(S.base + FILES[kind]).then(g => g.scene);
  return S.cache[kind];
}

function drawnBody(kind, size) {   // robots and carts: no SimReady model here, a plain body with a front marker
  const [sx, sy, sz] = size, g = new THREE.Group();
  const col = kind === "cart" ? 0xe08a1e : 0x3a3f46;
  const body = new THREE.Mesh(new THREE.BoxGeometry(sx, sz, sy), new THREE.MeshStandardMaterial({color: col, roughness: 0.5}));
  body.position.y = sz / 2; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, sz * 0.5, sy * 0.6), new THREE.MeshStandardMaterial({color: 0x19e07a}));
  nose.position.set(sx / 2, sz * 0.6, 0); g.add(nose);   // front = +x, the layout's heading
  return g;
}

function plate(size, color, lift) {   // a coloured label on top, so "blue-label" and "red-label" look different
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0] * 0.75, size[1] * 0.75),
                           new THREE.MeshStandardMaterial({color, roughness: 0.6}));
  m.rotation.x = -Math.PI / 2; m.position.y = size[2] + lift; return m;
}

function labelMesh(lab) {
  const text = lab.text, hpx = 96, c = document.createElement("canvas");
  const ctx = c.getContext("2d"); ctx.font = `bold ${hpx}px sans-serif`;
  const wpx = Math.ceil(ctx.measureText(text).width + hpx * 0.6);
  c.width = wpx; c.height = Math.round(hpx * 1.35);
  const g = c.getContext("2d"); g.fillStyle = "#f4f1e6"; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#15181c"; g.font = `bold ${hpx}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const h = lab.height_m * 1.35, w = h * c.width / c.height;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex}));
  m.position.copy(P(lab.pos));
  if (lab.normal[2] === 1) { m.rotation.x = -Math.PI / 2; m.position.y += 0.003; }   // painted on the floor, read from the front
  return m;
}

async function place(kind, look, size) {
  let o;
  const src = await model(kind);
  if (src) o = src.clone(true); else o = drawnBody(kind, size);
  const g = new THREE.Group(); g.add(o);
  const tint = Object.keys(TINT).find(k => (look || "").includes(k));
  if (tint) g.add(plate(size, TINT[tint], 0.004));
  if (kind === "bin") {   // the lid that hides what is inside a bin (nested); shown or not per picture
    const lid = new THREE.Mesh(new THREE.BoxGeometry(size[0] * 0.98, 0.02, size[1] * 0.98),
                               new THREE.MeshStandardMaterial({color: 0x5d636b, roughness: 0.6}));
    lid.position.y = size[2] + 0.01; lid.name = "lid"; g.add(lid);
  }
  return g;
}

function pose(g, kind, p) {   // p = [x, y, z, yaw degrees, lid]
  g.position.copy(P(p));
  g.rotation.set(0, p[3] * Math.PI / 180 + (YAW_OFFSET[kind] || 0), 0);
  const lid = g.getObjectByName("lid"); if (lid) lid.visible = !!p[4];
}

async function build(pane, key, role) {
  const fam = key.split("|")[0], F = S.data.families[fam], ep = S.data.cells[key][role];
  pane.world.clear(); pane.objs = {};
  for (const f of F.fixtures) { const g = await place(f.asset, "", f.size); pose(g, f.asset, [...f.pos, f.yaw, 0]); pane.world.add(g); }
  for (const lab of F.labels) pane.world.add(labelMesh(lab));
  for (let i = 0; i < ep.ids.length; i++) {
    const [kind, look, size] = ep.objs[i], g = await place(kind, look, size);
    pane.objs[ep.ids[i]] = {g, kind}; pane.world.add(g);
  }
  const c = F.camera; pane.home = c;
  pane.cam.position.copy(P(c.pos)); pane.ctl.target.copy(P(c.look)); fit(pane); pane.ctl.update();
}

export async function show(key, step) {
  if (!S.data) return;
  const roles = ["question", "flip", "keep"];
  if (key !== S.key) {
    S.onStatus("placing the warehouse models");
    S.key = key;
    await Promise.all(S.panes.map((p, k) => build(p, key, roles[k])));
    S.onStatus("");
    if (key !== S.key) return;   // another cell was picked meanwhile
  }
  S.panes.forEach((p, k) => {
    const ep = S.data.cells[key][roles[k]], f = ep.frames[Math.min(step, ep.frames.length - 1)];
    ep.ids.forEach((id, i) => pose(p.objs[id].g, p.objs[id].kind, f[i]));
    draw(p);
  });
}

export function home() {   // back to the model's camera
  S.panes.forEach(p => { if (!p.home) return; p.cam.position.copy(P(p.home.pos)); p.ctl.target.copy(P(p.home.look)); p.ctl.update(); draw(p); });
}

// ------------------------------------------------------------------------------------------------ roaming episode
// roam.json (bench/spbench/roam.py): one episode over three scenes, its flip and keep twins; per picture the objects
// (null = not there) and the robot's own camera. The panes always show the robot's view of the current picture.
export async function initRoam(opts) {
  S.base = opts.base; S.onStatus = opts.onStatus || (() => {});
  S.loader = new GLTFLoader(); S.loader.setMeshoptDecoder(MeshoptDecoder);
  S.onStatus("loading the roaming episode");
  S.roam = await (await fetch(opts.url)).json();
  S.panes = opts.panes.map(makePane);
  S.onStatus("placing the warehouse models");
  await Promise.all(S.panes.map((p, k) => buildRoam(p, ["question", "flip", "keep"][k])));
  S.onStatus("");
}

async function buildRoam(pane, role) {
  const R = S.roam, ep = R.episodes[role];
  pane.world.clear(); pane.objs = {};
  for (const f of R.fixtures) { const g = await place(f.asset, "", f.size); pose(g, f.asset, [...f.pos, f.yaw, 0]); pane.world.add(g); }
  for (const lab of R.labels) pane.world.add(labelMesh(lab));
  for (let i = 0; i < ep.ids.length; i++) {
    const [kind, look, size] = ep.objs[i], g = await place(kind, look, size);
    g.visible = false; pane.objs[ep.ids[i]] = {g, kind}; pane.world.add(g);
  }
}

export function showRoam(step) {
  if (!S.roam) return;
  S.panes.forEach((p, k) => {
    const ep = S.roam.episodes[["question", "flip", "keep"][k]], f = ep.frames[Math.min(step, ep.frames.length - 1)];
    ep.ids.forEach((id, i) => { const o = p.objs[id]; if (!o) return; o.g.visible = !!f[i]; if (f[i]) pose(o.g, o.kind, f[i]); });
    const c = ep.cams[Math.min(step, ep.cams.length - 1)];
    p.home = c; p.cam.position.copy(P(c.pos)); p.ctl.target.copy(P(c.look)); fit(p); p.ctl.update(); draw(p);
  });
}
