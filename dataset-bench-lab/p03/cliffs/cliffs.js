// State-change cliffs: 3D scenes for the five task families, drawn from bench/spbench/cliffs.py's output (scenes.json).
// The page's classic script imports this module, calls init() once, then show(family, step) and knob(family, index).
// Assets: NVIDIA SimReady warehouse models (CC BY 4.0) converted to glTF, Poly Haven lighting and floor (CC0), public
// domain sticker symbols; arms, AGV, tool chest, bins, painted boxes and wrap are drawn here.
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {HDRLoader} from "three/addons/loaders/HDRLoader.js";
import {MeshoptDecoder} from "three/addons/libs/meshopt_decoder.module.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {CSS2DRenderer, CSS2DObject} from "three/addons/renderers/CSS2DRenderer.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";

const BASE = new URL("./assets/", import.meta.url).href;
const S = {gen: 0, fam: null, tw: [], built: {}, ready: false, tmp: []};
let R, RC, CSS, scene, cam, ctl, mcam, root, sun, D, O;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const lerp = (a, b, k) => a + (b - a) * k;
const alive = g => g === S.gen;

// ------------------------------------------------------------------------------------------------ engine

export async function init(opts) {
  O = opts; D = opts.data;
  R = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.25;
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
  O.main.appendChild(R.domElement);
  RC = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  RC.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  RC.toneMapping = THREE.ACESFilmicToneMapping; RC.toneMappingExposure = 1.25; RC.outputColorSpace = THREE.SRGBColorSpace;
  RC.shadowMap.enabled = true; RC.shadowMap.type = THREE.PCFShadowMap;
  O.cam.appendChild(RC.domElement);
  CSS = new CSS2DRenderer(); CSS.domElement.className = "cl-css"; O.main.appendChild(CSS.domElement);
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 200); cam.layers.enable(1);   // layer 1: camera icons, seen only from outside
  mcam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 200);
  ctl = new OrbitControls(cam, R.domElement); ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * 0.49;
  status("loading the warehouse lighting");
  const pm = new THREE.PMREMGenerator(R);
  const hdr = await new HDRLoader().loadAsync(BASE + "empty_warehouse_01_1k.hdr");
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = pm.fromEquirectangular(hdr).texture; scene.environmentIntensity = 1.1;
  scene.background = hdr; scene.backgroundBlurriness = 0.55; scene.backgroundIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 0.35));
  sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(6, 12, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, {left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40});
  scene.add(sun); scene.add(sun.target);
  await floor();
  await stickers();
  new ResizeObserver(resize).observe(O.main); new ResizeObserver(resize).observe(O.cam); resize();
  S.ready = true; loop();
}

function status(t) { if (O && O.onStatus) O.onStatus(t); }

function resize() {
  const w = O.main.clientWidth || 800, h = Math.round(w * 9 / 16);
  R.setSize(w, h); CSS.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
  const w2 = O.cam.clientWidth || 400, h2 = Math.round(w2 * 9 / 16);
  RC.setSize(w2, h2); mcam.aspect = 16 / 9; mcam.updateProjectionMatrix();
}

function loop() {
  requestAnimationFrame(loop);
  const t = performance.now();
  S.tw = S.tw.filter(w => {
    if (w.g !== S.gen) { w.res(); return false; }
    const k = Math.min(1, (t - w.t0) / w.dur); w.fn(w.ease(k));
    if (k >= 1) { w.res(); return false; }
    return true;
  });
  if (!O.main.offsetParent) return;          // tab hidden: animate state but skip drawing
  ctl.update();
  R.render(scene, cam); CSS.render(scene, cam); if (!S.freeze) RC.render(scene, mcam);
}

// the model's picture: frozen while a "what if" plays or between the pictures the model actually receives
function freezeModel() { RC.render(scene, mcam); S.freeze = true; }

function tween(sec, fn, g, e = ease) {
  return new Promise(res => S.tw.push({t0: performance.now(), dur: Math.max(1, sec * 1000), fn, ease: e, res, g}));
}
const wait = (sec, g) => tween(sec, () => {}, g, k => k);

function flyTo(pos, target, sec, g) {
  const p0 = cam.position.clone(), t0 = ctl.target.clone(), p1 = V3(...pos), t1 = V3(...target);
  if (!sec) { cam.position.copy(p1); ctl.target.copy(t1); return Promise.resolve(); }
  return tween(sec, k => { cam.position.lerpVectors(p0, p1, k); ctl.target.lerpVectors(t0, t1, k); }, g);
}

function setModelCam(c) {
  mcam.position.set(...c.pos); mcam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(c.hfov) / 2) / (16 / 9)));
  mcam.updateProjectionMatrix(); mcam.lookAt(V3(...c.look));
}

function lerpCam(a, b, k) {
  const p = a.pos.map((v, i) => lerp(v, b.pos[i], k)), l = a.look.map((v, i) => lerp(v, b.look[i], k));
  return {pos: p, look: l, hfov: lerp(a.hfov, b.hfov, k)};
}

// ------------------------------------------------------------------------------------------------ assets and materials

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const cache = {};
async function asset(file) {
  if (!cache[file]) cache[file] = loader.loadAsync(BASE + file).then(g => {
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g.scene;
  });
  return cache[file];
}
async function inst(kind) {
  const a = D.assets[kind];
  const s = await asset(a.file);
  return s.clone(true);
}

function own(m) { m.userData.own = true; m.castShadow = true; m.receiveShadow = true; return m; }
function mat(color, rough = 0.6, metal = 0.0, extra = {}) { return new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal, ...extra}); }

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

async function floor() {
  const tl = new THREE.TextureLoader();
  const [m, n, r] = await Promise.all(["diff", "nor_gl", "rough"].map(k => tl.loadAsync(BASE + `concrete_floor_painted_${k}.webp`)));
  m.colorSpace = THREE.SRGBColorSpace;
  for (const t of [m, n, r]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(22, 22); t.anisotropy = 8; }
  const f = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), new THREE.MeshStandardMaterial({normalMap: n, normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: r, color: 0x8f969c, roughness: 0.85}));
  f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
}

const IMG = {};
async function stickers() {
  const files = {hazard: "sticker_hazard_ghs07.svg", fragile: "sticker_fragile_iso7000_0621.svg",
                 keep_dry: "sticker_keepdry_iso7000_0626.svg", this_way_up: "sticker_thiswayup_iso7000_0623.svg"};
  await Promise.all(Object.entries(files).map(([k, f]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = BASE + f;
  })));
}

function drawSticker(ctx, kind, cx, cy, s) {
  if (kind === "none" || !IMG[kind]) return;
  ctx.save();
  if (kind === "hazard") {                       // GHS diamond: the pictogram is its own label
    ctx.drawImage(IMG.hazard, cx - s / 2, cy - s / 2, s, s);
  } else {
    ctx.fillStyle = "#fbfbf7"; ctx.strokeStyle = "#1b1b1b"; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.06); ctx.fill(); ctx.stroke();
    ctx.drawImage(IMG[kind], cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84);
  }
  ctx.restore();
}

const COL = {red: "#b8262b", blue: "#1f5aa6"};
function paintBoard(ctx, w, h, base, seed) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < 160; i++) {                // board grain and scuffs
    ctx.globalAlpha = 0.04 + r() * 0.05; ctx.fillStyle = r() < 0.5 ? "#000" : "#fff";
    ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 6 + r() * 30);
  }
  ctx.globalAlpha = 0.18; ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.globalAlpha = 1;
}

const faceCache = {};
function stickerBoxMaterials(p, seed) {
  const side = (front) => {
    const key = [p.base, p.stripe, p.stripe_y, front ? p.sticker + p.sticker_dx + p.sticker_dy : "-"].join("|");
    if (!faceCache[key]) faceCache[key] = new THREE.MeshStandardMaterial({roughness: 0.78, map: canvasTex(256, 256, (c, w, h) => {
      paintBoard(c, w, h, COL[p.base], seed);
      const sy = h * (1 - p.stripe_y);
      c.fillStyle = COL[p.stripe]; c.fillRect(0, sy - h * 0.08, w, h * 0.16);
      if (front) drawSticker(c, p.sticker, w / 2 + (p.sticker_dx / 0.3) * w, h / 2 - (p.sticker_dy / 0.3) * h, w * 0.4);
    })});
    return faceCache[key];
  };
  const topKey = "top|" + p.base;
  if (!faceCache[topKey]) faceCache[topKey] = new THREE.MeshStandardMaterial({roughness: 0.8, map: canvasTex(128, 128, (c, w, h) => {
    paintBoard(c, w, h, COL[p.base], 7); c.fillStyle = "rgba(230,220,190,0.75)"; c.fillRect(w * 0.42, 0, w * 0.16, h);
  })});
  return [side(false), side(false), faceCache[topKey], faceCache[topKey], side(true), side(false)];
}

function stickerBox(o) {
  const g = new RoundedBoxGeometry(o.size[0], o.size[1], o.size[2], 2, 0.008);
  const m = own(new THREE.Mesh(g, stickerBoxMaterials(o.props, o.id.charCodeAt(4) * 31 + o.id.charCodeAt(3))));
  m.position.set(o.pos[0], o.pos[1] + o.size[1] / 2, o.pos[2]);
  m.userData.id = o.id; m.userData.props = o.props;
  return m;
}

// labels
function lbl(text, cls, pos, parent) {
  const d = document.createElement("div"); d.className = "cl-lbl " + (cls || ""); d.textContent = text;
  const o = new CSS2DObject(d); o.position.copy(pos); (parent || root).add(o); return o;
}

function anno(o) { o.traverse(x => x.layers.set(1)); return o; }   // help drawings: shown in the 3D view, never in the model's picture
function tmpLbl(text, cls, pos, parent) { const o = lbl(text, cls, pos, parent); S.tmp.push(o); return o; }
function outline(obj, color) {
  const box = new THREE.Box3().setFromObject(obj), sz = box.getSize(V3(0, 0, 0)), c = box.getCenter(V3(0, 0, 0));
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sz.x + 0.03, sz.y + 0.03, sz.z + 0.03)), new THREE.LineBasicMaterial({color, linewidth: 2}));
  e.userData.own = true; e.position.copy(c); anno(e); root.add(e); S.tmp.push(e); return e;
}
function clearTmp() {
  for (const o of S.tmp) { if (o.isCSS2DObject && o.element.parentNode) o.element.parentNode.removeChild(o.element); if (o.parent) o.parent.remove(o); if (o.geometry) o.geometry.dispose(); }
  S.tmp = [];
}
function flyToCam(c, sec, g) {           // stand just in front of the camera icon, looking where it looks
  const p = V3(...c.pos), l = V3(...c.look), d = l.clone().sub(p).normalize().multiplyScalar(0.35);
  return flyTo(p.add(d).toArray(), c.look, sec, g);
}

function clearRoot() {
  if (root) {
    root.traverse(o => {
      if (o.isCSS2DObject && o.element.parentNode) o.element.parentNode.removeChild(o.element);
      if (o.userData.own) { if (o.geometry) o.geometry.dispose(); }
    });
    scene.remove(root);
  }
  root = new THREE.Group(); scene.add(root);
}

function sunOver(x, z, span) {
  sun.position.set(x + 6, 12, z + 8); sun.target.position.set(x, 0, z);
  Object.assign(sun.shadow.camera, {left: -span, right: span, top: span, bottom: -span}); sun.shadow.camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------------------------------------ drawn objects

function cameraRig(c, label, color) {
  const g = new THREE.Group();
  const body = own(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.28), mat(0x24272d, 0.4, 0.3)));
  const lens = own(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 20), mat(0x0d0e10, 0.2, 0.6)));
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.17; g.add(body, lens);
  const L = 0.9, a = Math.tan(THREE.MathUtils.degToRad(c.hfov) / 2) * L, b = a * 9 / 16;
  const pts = [[0, 0, 0], [a, b, L], [0, 0, 0], [-a, b, L], [0, 0, 0], [a, -b, L], [0, 0, 0], [-a, -b, L],
               [a, b, L], [-a, b, L], [-a, b, L], [-a, -b, L], [-a, -b, L], [a, -b, L], [a, -b, L], [a, b, L]].map(p => V3(...p));
  const fr = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color, transparent: true, opacity: 0.85}));
  fr.userData.own = true; g.add(fr);
  g.position.set(...c.pos); g.lookAt(V3(...c.look));
  g.traverse(o => o.layers.set(1));
  if (label) lbl(label, "key", V3(0, 0.22, 0), g);
  return g;
}

function makeArm(spec) {
  const big = spec.style === "palletizer";
  const M = mat(big ? 0xe0820f : 0xdde1e6, 0.32, 0.15), MC = mat(big ? 0x2a2d33 : 0x2c66b0, 0.38, 0.25), MS = mat(0x5b626c, 0.45, 0.6);
  const L1 = spec.upper, L2 = spec.fore, ped = spec.pedestal, r1 = big ? 0.12 : 0.058, r2 = big ? 0.095 : 0.05, j = big ? 0.16 : 0.08;
  const rootA = new THREE.Group(); rootA.position.set(...spec.base);
  const pd = own(new THREE.Mesh(new THREE.BoxGeometry(big ? 0.8 : 0.34, ped, big ? 0.8 : 0.34), MS)); pd.position.y = ped / 2; rootA.add(pd);
  const yawJ = new THREE.Group(); yawJ.position.y = ped; rootA.add(yawJ);
  const bm = own(new THREE.Mesh(new THREE.CylinderGeometry(j * 1.3, j * 1.5, 0.16, 40), MC)); bm.position.y = 0.08; yawJ.add(bm);
  const sh = new THREE.Group(); sh.position.y = 0.2; yawJ.add(sh);
  const cyl = (r, l, m) => own(new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 36), m));
  const shM = cyl(j, j * 2.2, MC); shM.rotation.z = Math.PI / 2; sh.add(shM);
  const up = cyl(r1, L1, M); up.position.y = L1 / 2; sh.add(up);
  if (big) { const cw = own(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.42), MC)); cw.position.set(0, -0.05, -0.32); sh.add(cw); }
  const el = new THREE.Group(); el.position.y = L1; sh.add(el);
  const elM = cyl(j * 0.85, j * 1.9, MC); elM.rotation.z = Math.PI / 2; el.add(elM);
  const fo = cyl(r2, L2, M); fo.position.y = L2 / 2; el.add(fo);
  const wr = new THREE.Group(); wr.position.y = L2; el.add(wr);
  const wrM = cyl(j * 0.7, j * 1.6, MC); wrM.rotation.z = Math.PI / 2; wr.add(wrM);
  const tool = new THREE.Group(); wr.add(tool);
  const toolLen = big ? 0.42 : 0.2;
  const fl = cyl(j * 0.6, 0.05, MS); fl.position.y = 0.06; tool.add(fl);
  const fingers = [];
  if (big) {                                     // side clamp: two paddles that squeeze the box sides
    const bar = own(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), MS)); bar.position.y = 0.12; tool.add(bar);
    for (const s of [-1, 1]) {
      const f = new THREE.Group(); f.position.set(s * 0.42, 0.12, 0); tool.add(f);
      const pdl = own(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.36), mat(0x9aa3ad, 0.5, 0.5))); pdl.position.y = 0.25; f.add(pdl);
      f.userData.s = s; fingers.push(f);
    }
  } else {
    const body = own(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), MS)); body.position.y = 0.11; tool.add(body);
    for (const s of [-1, 1]) {
      const f = new THREE.Group(); f.position.set(s * 0.04, 0.15, 0); tool.add(f);
      const fm = own(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.03), mat(0x30343a, 0.4, 0.5))); fm.position.y = 0.035; f.add(fm);
      f.userData.s = s; fingers.push(f);
    }
  }
  const A = {root: rootA, yawJ, sh, el, wr, tool, fingers, L1, L2, ped, toolLen, big, q: [0, 0, 0, 0],
    setQ(q) { this.q = q; yawJ.rotation.y = q[0]; sh.rotation.x = q[1]; el.rotation.x = q[2]; wr.rotation.x = q[3]; },
    grip(open) { for (const f of fingers) f.position.x = f.userData.s * (big ? (open ? 0.46 : spec.clamp || 0.36) : (open ? 0.05 : 0.026)); }};
  A.grip(true);
  return A;
}

function shoulderOf(A) { const b = A.root.position; return V3(b.x, b.y + A.ped + 0.2, b.z); }

function ik(A, p, mode) {
  const s = shoulderOf(A), dx = p.x - s.x, dz = p.z - s.z, dy = p.y - s.y;
  const yaw = Math.atan2(dx, dz); let r = Math.hypot(dx, dz), h = dy, want;
  if (mode === "down") { h += A.toolLen; want = Math.PI; }
  else if (mode === "tilt") { r -= A.toolLen * Math.SQRT1_2; h += A.toolLen * Math.SQRT1_2; want = Math.PI * 0.75; }
  else { r -= A.toolLen; want = Math.PI / 2; }
  const L1 = A.L1, L2 = A.L2;
  let Dd = Math.hypot(r, h); Dd = Math.min(Math.max(Dd, Math.abs(L1 - L2) + 1e-3), L1 + L2 - 1e-3);
  const al = Math.atan2(r, h), be = Math.acos((L1 * L1 + Dd * Dd - L2 * L2) / (2 * L1 * Dd)), ga = Math.acos((L1 * L1 + L2 * L2 - Dd * Dd) / (2 * L1 * L2));
  const t1 = al - be, t2 = Math.PI - ga;
  return [yaw, t1, t2, want - t1 - t2];
}

function tcpWorld(A) { const p = V3(0, A.toolLen, 0); A.tool.localToWorld(p); return p; }

// move the tool tip through world points, interpolating in cylinder coordinates around the arm base; carried objects
// keep their world rotation and follow the tip
async function armPath(A, pts, mode, sec, g, carry) {
  const b = A.root.position;
  const cy = p => ({r: Math.hypot(p.x - b.x, p.z - b.z), a: Math.atan2(p.x - b.x, p.z - b.z), y: p.y});
  let cur = tcpWorld(A);
  const segs = [];
  let tot = 0;
  for (const p of pts) { const d = cur.distanceTo(p) + 0.15; segs.push([cur.clone(), p.clone(), d]); tot += d; cur = p; }
  for (const [p0, p1, d] of segs) {
    const c0 = cy(p0), c1 = cy(p1);
    let da = c1.a - c0.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    await tween(sec * d / tot, k => {
      const r = lerp(c0.r, c1.r, k), a = c0.a + da * k, y = lerp(c0.y, c1.y, k);
      const p = V3(b.x + r * Math.sin(a), y, b.z + r * Math.cos(a));
      A.setQ(ik(A, p, mode));
      if (carry) for (const [o, off, turn] of carry) { o.position.copy(p).add(off); if (turn) o.rotation.y = a - turn; }
    }, g, k => k);
    if (!alive(g)) return;
  }
}

async function armHome(A, sec, g) {
  const q0 = A.q.slice(), q1 = A.home;
  let da = q1[0] - q0[0]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  await tween(sec, k => A.setQ([q0[0] + da * k, lerp(q0[1], q1[1], k), lerp(q0[2], q1[2], k), lerp(q0[3], q1[3], k)]), g);
}

function makeAGV() {
  const g = new THREE.Group();
  const body = own(new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.24, 1.2, 4, 0.05), mat(0x2b2f36, 0.45, 0.35))); body.position.y = 0.16; g.add(body);
  const band = own(new THREE.Mesh(new THREE.BoxGeometry(0.862, 0.035, 1.212), mat(0xf2b705, 0.4, 0.2))); band.position.y = 0.21; g.add(band);
  const top = own(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.025, 1.04), mat(0x8f969e, 0.35, 0.7))); top.position.y = 0.29; g.add(top);
  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({transparent: true, map: canvasTex(256, 360, (c, w, h) => {
    c.fillStyle = "#e9eef3"; c.beginPath(); c.moveTo(w / 2, 10); c.lineTo(w - 20, h * 0.45); c.lineTo(w * 0.64, h * 0.45); c.lineTo(w * 0.64, h - 10);
    c.lineTo(w * 0.36, h - 10); c.lineTo(w * 0.36, h * 0.45); c.lineTo(20, h * 0.45); c.closePath(); c.fill();
    c.fillStyle = "#1b1f24"; c.font = "bold 44px sans-serif"; c.textAlign = "center"; c.fillText("FRONT", w / 2, h * 0.7);
  })}));
  arrow.userData.own = true; arrow.rotation.x = -Math.PI / 2; arrow.position.set(0, 0.304, 0.05); g.add(arrow);
  const led = (z, col) => { const m = own(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.012), new THREE.MeshStandardMaterial({color: col, emissive: col, emissiveIntensity: 2.2}))); m.position.set(0, 0.17, z); g.add(m); };
  led(0.607, 0x19e07a); led(-0.607, 0xff3b30);
  for (const [x, z] of [[0.33, 0.5], [-0.33, -0.5]]) { const l = own(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 24), mat(0x101215, 0.3, 0.5))); l.position.set(x, 0.33, z); g.add(l); }
  for (const [x, z] of [[0.36, 0.45], [-0.36, 0.45], [0.36, -0.45], [-0.36, -0.45]]) {
    const w = own(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 20), mat(0x111111, 0.8))); w.rotation.z = Math.PI / 2; w.position.set(x, 0.05, z); g.add(w);
  }
  return g;
}

function makeToolChest() {
  const g = new THREE.Group(), red = mat(0xb5141b, 0.32, 0.35), dark = mat(0x1d1f22, 0.5, 0.4), chrome = mat(0xd6d9dd, 0.15, 1.0);
  const cab = own(new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.74, 0.46, 3, 0.012), red)); cab.position.y = 0.11 + 0.37; g.add(cab);
  const topc = own(new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.17, 0.44, 3, 0.012), red)); topc.position.y = 0.11 + 0.74 + 0.085; g.add(topc);
  const rows = [0.18, 0.31, 0.42, 0.53, 0.63, 0.72, 0.94];
  rows.forEach((y, i) => {
    const gap = own(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.006, 0.01), dark)); gap.position.set(0, 0.11 + y - 0.045, 0.232); g.add(gap);
    const hd = own(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 12), chrome)); hd.rotation.z = Math.PI / 2; hd.position.set(0, 0.11 + y, 0.245); g.add(hd);
  });
  for (const [x, z] of [[0.3, 0.18], [-0.3, 0.18], [0.3, -0.18], [-0.3, -0.18]]) {
    const w = own(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 18), dark)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.05, z); g.add(w);
  }
  return g;
}

function makeBin(id) {                            // solid-walled small-load carrier, 600 x 400 x 170 mm
  const [w, h, d] = D.memory.episode.bin_size, t = 0.012, g = new THREE.Group(), pl = mat(0x40688f, 0.5, 0.05);
  const part = (sx, sy, sz, x, y, z) => { const m = own(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), pl)); m.position.set(x, y, z); g.add(m); };
  part(w, t, d, 0, t / 2, 0); part(w, h, t, 0, h / 2, d / 2 - t / 2); part(w, h, t, 0, h / 2, -d / 2 + t / 2);
  part(t, h, d, w / 2 - t / 2, h / 2, 0); part(t, h, d, -w / 2 + t / 2, h / 2, 0);
  part(w + 0.012, 0.012, 0.016, 0, h - 0.006, d / 2); part(w + 0.012, 0.012, 0.016, 0, h - 0.006, -d / 2);
  for (const x of [-0.25, -0.16, 0.16, 0.25]) part(0.012, h * 0.8, 0.008, x, h * 0.45, d / 2 + 0.004);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), new THREE.MeshStandardMaterial({roughness: 0.6, map: canvasTex(256, 128, (c, W2, H2) => {
    c.fillStyle = "#f6f6f2"; c.fillRect(0, 0, W2, H2); c.strokeStyle = "#222"; c.lineWidth = 6; c.strokeRect(3, 3, W2 - 6, H2 - 6);
    c.fillStyle = "#111"; c.font = "bold 92px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(id, W2 / 2, H2 / 2 + 4);
  })}));
  tag.userData.own = true; tag.position.set(0, h * 0.52, d / 2 + 0.009); g.add(tag);
  return g;
}

const BAR = {blue: "#1e56c8", red: "#c62828", green: "#1f8a3b", black: "#151515", orange: "#e46c0a", purple: "#6a35a3"};
async function makeItem(color) {
  const g = new THREE.Group(), m = await inst("item_box"); g.add(m);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.075), new THREE.MeshStandardMaterial({roughness: 0.55, map: canvasTex(340, 150, (c, w, h) => {
    c.fillStyle = "#fbfbf8"; c.fillRect(0, 0, w, h);
    const r = rng(color.length * 97 + 13); let x = 16;
    c.fillStyle = BAR[color];
    while (x < w - 18) { const bw = 2 + Math.floor(r() * 5); if (r() > 0.35) c.fillRect(x, 10, bw, h - 46); x += bw + 2 + Math.floor(r() * 3); }
    c.font = "bold 26px monospace"; c.textAlign = "center"; c.fillText("40 0638 1" + (color.length * 7 % 10) + "3 39", w / 2, h - 12);
  })}));
  lab.userData.own = true; lab.position.set(0, 0.058, 0.1325); g.add(lab);
  g.userData.color = color;
  return g;
}

function cardboardTex() {
  if (!faceCache.card) faceCache.card = canvasTex(256, 256, (c, w, h) => {
    paintBoard(c, w, h, "#c39b68", 11);
    c.fillStyle = "rgba(210,190,150,0.85)"; c.fillRect(0, h * 0.44, w, h * 0.12);
    c.fillStyle = "#3a2c1c"; c.globalAlpha = 0.55; c.font = "bold 18px sans-serif"; c.fillText("THIS SIDE UP  ↑↑", 18, 30); c.globalAlpha = 1;
  });
  return faceCache.card;
}

// a cardboard box that can lose height and bulge: subdivided so the sides can bow outward
function softBox(size, loss, bulge, tint) {
  const [w, h, d] = size;
  const geo = new THREE.BoxGeometry(w, h, d, 8, 10, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + h / 2) / h, b = bulge * Math.sin(Math.PI * t);
    x += Math.sign(x) * b * Math.pow(Math.abs(x) / (w / 2), 2.0);
    z += Math.sign(z) * b * Math.pow(Math.abs(z) / (d / 2), 2.0);
    if (loss > 0.04) { x += 0.004 * Math.sin(t * 40) * Math.abs(x) / (w / 2); z += 0.004 * Math.cos(t * 40) * Math.abs(z) / (d / 2); }
    y = t * h * (1 - loss);
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const m = own(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({map: cardboardTex(), roughness: 0.85, color: tint || 0xffffff})));
  return m;
}

function wrapShell(w, h, d) {
  const tex = canvasTex(128, 256, (c, W2, H2) => {
    c.fillStyle = "rgba(255,255,255,0.25)"; c.fillRect(0, 0, W2, H2);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.15 + 0.3 * Math.random()})`; c.fillRect(0, Math.random() * H2, W2, 1 + Math.random() * 3); }
  });
  const m = own(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.02), new THREE.MeshPhysicalMaterial({
    color: 0xe4edf3, transparent: true, opacity: 0.55, roughness: 0.12, metalness: 0, clearcoat: 1, alphaMap: tex, depthWrite: false})));
  m.castShadow = false;
  return m;
}

function floorArrow(len, color, text) {
  const g = new THREE.Group(), shp = new THREE.Shape();
  shp.moveTo(0, -0.06); shp.lineTo(len - 0.22, -0.06); shp.lineTo(len - 0.22, -0.16); shp.lineTo(len, 0); shp.lineTo(len - 0.22, 0.16); shp.lineTo(len - 0.22, 0.06); shp.lineTo(0, 0.06); shp.closePath();
  const m = own(new THREE.Mesh(new THREE.ExtrudeGeometry(shp, {depth: 0.02, bevelEnabled: false}), new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4})));
  m.rotation.x = -Math.PI / 2; g.add(m);
  if (text) lbl(text, "", V3(len + 0.2, 0.3, 0), g).element.style.borderColor = "#" + new THREE.Color(color).getHexString();
  return g;
}

// ------------------------------------------------------------------------------------------------ public API

export async function show(fam, step) {
  if (!S.ready) return;
  const g = ++S.gen; clearTmp(); S.freeze = false;
  if (S.fam !== fam) { status("building the scene"); S.fam = null; await FAM[fam].build(g); if (!alive(g)) return; S.fam = fam; status(""); }
  await FAM[fam].steps[step](g);
}

export async function knob(fam, i) {
  if (!S.ready) return;
  const g = ++S.gen; clearTmp(); S.freeze = false;
  if (S.fam !== fam) { S.fam = null; await FAM[fam].build(g); if (!alive(g)) return; S.fam = fam; }
  await FAM[fam].knob(i, g);
}

export function stop() { S.gen++; }

// ------------------------------------------------------------------------------------------------ 1 binding

const B = {};
const FAM = {};
FAM.binding = {
  async build(g) {
    clearTmp(); clearRoot(); const d = D.binding, full = d.variants[d.variants.length - 1];
    for (const o of full.objects) if (o.kind === "shelf3") { const m = await inst("shelf3"); m.position.set(...o.pos); m.rotation.y = o.yaw; root.add(m); }
    B.boxes = {}; B.full = full;
    for (const o of full.objects) if (o.kind === "sticker_box") { const m = stickerBox(o); B.boxes[o.id] = m; root.add(m); }
    const [th, tf] = full.targets.map(id => full.objects.find(o => o.id === id));
    B.th = th; B.tf = tf;
    const sc = o => V3(o.pos[0] + o.props.sticker_dx, o.pos[1] + 0.15 + o.props.sticker_dy, o.pos[2] + 0.16);
    B.lh = lbl("hazard sticker", "bad", sc(th).add(V3(0, 0.2, 0))); B.lf = lbl("fragile sticker", "key", sc(tf).add(V3(0, 0.2, 0)));
    B.lmid = lbl("middle shelf", "muted", V3(-1.85, 1.3, 0.3));
    B.feat = [];
    for (const [o, words] of [[th, ["red box", "blue stripe", "hazard sticker", "middle shelf"]], [tf, ["blue box", "red stripe", "fragile sticker", "middle shelf"]]])
      words.forEach((w, i) => { const sx = o === th ? -1 : 1, l = lbl(w, "small", V3(o.pos[0] + sx * 0.42, o.pos[1] + 0.33 - i * 0.1, 0.2)); l.element.style.transform += ""; l.visible = false; B.feat.push(l); });
    B.cam = cameraRig(full.camera, "camera", 0x2563eb); root.add(B.cam);
    setModelCam(full.camera); sunOver(0, 0, 5);
    await flyTo([-2.4, 2.1, 4.8], [0, 1.15, 0], 0, g);
  },
  setN(n) {
    const keep = new Set(D.binding.variants.find(v => v.knob === n).objects.filter(o => o.kind === "sticker_box").map(o => o.id));
    for (const [id, m] of Object.entries(B.boxes)) { m.visible = keep.has(id); m.scale.setScalar(1); m.position.y = B.full.objects.find(o => o.id === id).pos[1] + 0.15; }
  },
  restore() {
    for (const o of B.full.objects) if (o.kind === "sticker_box") { const m = B.boxes[o.id]; m.position.set(o.pos[0], o.pos[1] + 0.15, o.pos[2]); m.material = stickerBoxMaterials(o.props, o.id.charCodeAt(4) * 31 + o.id.charCodeAt(3)); }
    B.feat.forEach(l => l.visible = false); B.lh.visible = B.lf.visible = B.lmid.visible = true;
    for (const m of Object.values(B.boxes)) if (m.material.forEach) m.material.forEach(x => x.emissive && x.emissive.setHex(0));
  },
  steps: [
    async g => { FAM.binding.restore(); FAM.binding.setN(2); await flyTo([-1.6, 1.9, 3.9], [0, 1.2, 0], 1.6, g); },
    async g => { FAM.binding.restore(); FAM.binding.setN(2); B.feat.forEach(l => l.visible = true); B.lh.visible = B.lf.visible = B.lmid.visible = false;
      await flyTo([(B.th.pos[0] + B.tf.pos[0]) / 2, 1.5, 3.1], [(B.th.pos[0] + B.tf.pos[0]) / 2, 1.28, 0], 1.6, g); },
    async g => {
      FAM.binding.restore(); FAM.binding.setN(2); await flyTo([-2.4, 2.1, 4.8], [0, 1.15, 0], 1.2, g);
      const ids = B.full.objects.filter(o => o.kind === "sticker_box" && !B.full.targets.includes(o.id)).map(o => o.id);
      for (const id of ids) {
        if (!alive(g)) return;
        const m = B.boxes[id], y = m.position.y; m.visible = true;
        tween(0.5, k => { m.position.y = y + 0.5 * (1 - k); }, g);
        await wait(0.16, g);
      }
      await wait(0.6, g);
    },
    async g => {
      FAM.binding.restore(); FAM.binding.setN(36);
      const swapped = B.full.objects.filter(o => o.kind === "sticker_box" && o.props.shelf !== "middle" &&
        ((o.props.base === "red" && o.props.sticker === "fragile") || (o.props.base === "blue" && o.props.sticker === "hazard")));
      await flyTo([-2.0, 1.8, 4.2], [0, 1.2, 0], 1.4, g);
      const lines = swapped.map(o => outline(B.boxes[o.id], 0xfacc15));
      tmpLbl(swapped.length + " boxes with the swapped combinations", "warn", V3(0, 2.15, 0.2));
      await tween(2.4, k => { const on = Math.sin(k * Math.PI * 8) > -0.3; lines.forEach(l => l.visible = on); }, g, k => k);
      lines.forEach(l => l.visible = true);
    },
    async g => {
      FAM.binding.restore(); FAM.binding.setN(36); await flyTo([-0.8, 1.7, 3.6], [0, 1.2, 0], 1.0, g);
      const a = B.boxes[B.th.id], b = B.boxes[B.tf.id], pa = a.position.clone(), pb = b.position.clone();
      const la = tmpLbl("flip twin: answer " + D.binding.twins.flip.answer, "bad", V3(0, 2.15, 0));
      await tween(0.6, k => { a.position.z = pa.z + 0.45 * k; b.position.z = pb.z + 0.45 * k; }, g);
      await tween(1.4, k => { a.position.x = lerp(pa.x, pb.x, k); b.position.x = lerp(pb.x, pa.x, k); }, g);
      await tween(0.6, k => { a.position.z = pa.z + 0.45 * (1 - k); b.position.z = pb.z + 0.45 * (1 - k); }, g);
      B.lh.position.x += pb.x - pa.x; B.lf.position.x += pa.x - pb.x;
      await wait(1.8, g); if (!alive(g)) return;
      a.position.copy(pa); b.position.copy(pb); B.lh.position.x -= pb.x - pa.x; B.lf.position.x -= pa.x - pb.x;
      la.element.textContent = "keep twin: other boxes restyled, answer " + D.binding.twins.keep.answer; la.element.className = "cl-lbl good";
      const keep = D.binding.twins.keep.objects;
      for (const o of keep) if (o.kind === "sticker_box" && B.boxes[o.id]) B.boxes[o.id].material = stickerBoxMaterials(o.props, o.id.charCodeAt(4) * 13 + 5);
      await wait(2.2, g);
    },
    async g => { FAM.binding.restore(); FAM.binding.setN(36); await flyToCam(B.full.camera, 1.6, g); },
  ],
  async knob(i, g) { FAM.binding.restore(); FAM.binding.setN(D.binding.knob.values[i]); },
};

// ------------------------------------------------------------------------------------------------ 2 occlusion

const Oc = {};
FAM.occlusion = {
  async build(g) {
    clearTmp(); clearRoot(); const v = D.occlusion.variants[0];
    Oc.v = v; Oc.obj = {};
    for (const o of v.objects) {
      const m = await inst(o.kind); m.position.set(...o.pos); m.rotation.y = o.yaw; root.add(m); Oc.obj[o.id] = m; Oc[o.id + "0"] = m.position.clone();
    }
    for (const [face, rot] of [[V3(-0.201, 0.25, 0), -Math.PI / 2], [V3(0, 0.25, 0.302), 0]]) {   // fragile stickers on the bin
      const t = canvasTex(256, 256, (c, w, h) => { drawSticker(c, "fragile", w / 2, h / 2, w * 0.9); });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshStandardMaterial({map: t, transparent: true, roughness: 0.6}));
      s.userData.own = true; s.position.copy(face); s.rotation.y = rot;
      const holder = new THREE.Group(); holder.add(s); holder.position.copy(Oc.obj.fragile_bin.position); root.add(holder); Oc.binStickers = (Oc.binStickers || []).concat([holder]);
    }
    const rear = v.rear_x;
    const path = own(new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.363), new THREE.MeshBasicMaterial({color: 0xdc2626, transparent: true, opacity: 0.22, depthWrite: false})));
    path.rotation.x = -Math.PI / 2; path.position.set(rear - 1.0, 0.012, 0); root.add(anno(path)); Oc.path = path;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.0, 1.363)), new THREE.LineDashedMaterial({color: 0xdc2626, dashSize: 0.08, gapSize: 0.05}));
    edge.computeLineDistances(); edge.rotation.x = -Math.PI / 2; edge.position.copy(path.position).add(V3(0, 0.002, 0)); edge.userData.own = true; root.add(anno(edge)); Oc.edge = edge;
    Oc.lpath = lbl("2 m back: the rear's path", "bad", V3(rear - 1.0, 0.05, 0.95));
    const binX = Oc.obj.fragile_bin.position.x;
    const dim = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(binX + 0.2, 0.5, -0.9), V3(rear, 0.5, -0.9)]), new THREE.LineBasicMaterial({color: 0xfacc15}));
    dim.userData.own = true; root.add(anno(dim)); Oc.dim = dim;
    Oc.ldim = lbl(v.gap_m + " m", "warn", V3((binX + 0.2 + rear) / 2, 0.62, -0.9));
    Oc.lf = lbl("forklift", "", V3(0, 2.4, 0)); Oc.lp = lbl("heavy pallet", "", V3(Oc.obj.heavy_pallet.position.x, 0.95, 0)); Oc.lb = lbl("fragile bin", "key", V3(binX, 0.7, 0.35));
    Oc.rigA = cameraRig(v.cameras.A, "View A", 0x16a34a); Oc.rigB = cameraRig(v.cameras.B, "View B", 0xdc2626); root.add(Oc.rigA, Oc.rigB);
    Oc.rigM = cameraRig(v.cameras.A, "", 0x2563eb); root.add(Oc.rigM);
    Oc.lhid = lbl("", "bad", V3(binX, 1.15, 0)); Oc.lhid.visible = false;
    setModelCam(v.cameras.A); sunOver(-2.5, 0, 7);
    await flyTo([0.4, 3.4, 6.2], [-2.7, 0.5, 0], 0, g);
  },
  reset(camKey) {
    const v = Oc.v;
    for (const o of v.objects) { Oc.obj[o.id].position.copy(Oc[o.id + "0"]); Oc.obj[o.id].scale.set(1, 1, 1); }
    for (const s of Oc.binStickers) { s.position.copy(Oc.obj.fragile_bin.position); s.scale.set(1, 1, 1); }
    Oc.path.visible = Oc.edge.visible = Oc.lpath.visible = false; Oc.lhid.visible = false;
    Oc.ldim.element.textContent = v.gap_m + " m";
    const c = v.cameras[camKey || "A"]; setModelCam(c); Oc.rigM.position.set(...c.pos); Oc.rigM.lookAt(V3(...c.look));
  },
  async swing(from, to, sec, g) {
    const sw = Oc.v.sweep.map(s => s.camera);           // phi 90 .. 0
    const i0 = from === "A" ? 0 : sw.length - 1, i1 = to === "A" ? 0 : sw.length - 1;
    await tween(sec, k => {
      const f = lerp(i0, i1, k), a = Math.floor(f), b = Math.min(sw.length - 1, a + 1);
      const c = lerpCam(sw[a], sw[b], f - a); setModelCam(c); Oc.rigM.position.set(...c.pos); Oc.rigM.lookAt(V3(...c.look));
    }, g);
  },
  steps: [
    async g => { FAM.occlusion.reset("A"); await flyTo([0.4, 3.4, 6.2], [-2.7, 0.5, 0], 1.6, g); },
    async g => {
      FAM.occlusion.reset("A"); freezeModel(); Oc.path.visible = Oc.edge.visible = Oc.lpath.visible = true;
      await flyTo([-0.2, 3.6, 6.6], [-2.6, 0.4, 0], 1.2, g);
      const f = Oc.obj.forklift, x0 = f.position.x, gap = Oc.v.gap_m, bin = Oc.obj.fragile_bin;
      await tween(2.4, k => {
        const back = 2.0 * k; f.position.x = x0 - back;
        if (back > gap) { const push = back - gap; bin.position.x = Oc.fragile_bin0.x - push; bin.scale.y = Math.max(0.35, 1 - push * 1.2);
          for (const s of Oc.binStickers) { s.position.x = bin.position.x; s.scale.y = bin.scale.y; } }
      }, g, k => k);
      Oc.lhid.element.textContent = "contact after " + gap + " m: crushed"; Oc.lhid.visible = true;
      await wait(2.0, g);
    },
    async g => { FAM.occlusion.reset("A"); await flyTo([-1.0, 6.0, 7.5], [-3.2, 0.6, 0], 1.0, g); await FAM.occlusion.swing("A", "B", 4.5, g); },
    async g => {
      FAM.occlusion.reset("B"); Oc.lhid.element.textContent = Math.round(100 * Oc.v.bin_hidden.B) + "% of the bin hidden from View B"; Oc.lhid.visible = true;
      await flyTo([-8.6, 3.2, 3.2], [-2.6, 0.6, 0], 1.6, g);
    },
    async g => {
      FAM.occlusion.reset("A"); await flyTo([-1.0, 6.0, 7.5], [-3.2, 0.6, 0], 1.0, g);
      for (let r = 0; r < 2 && alive(g); r++) {
        Oc.ldim.element.textContent = `${Oc.v.gap_m} m = ${Math.round(Oc.v.image_gap_px.A)} px in View A`; setModelCam(Oc.v.cameras.A); await wait(1.8, g);
        Oc.ldim.element.textContent = `${Oc.v.gap_m} m = ${Math.round(Oc.v.image_gap_px.B)} px in View B`; setModelCam(Oc.v.cameras.B); await wait(1.8, g);
      }
    },
    async g => {
      FAM.occlusion.reset("A"); Oc.path.visible = Oc.edge.visible = true; await flyTo([0.6, 4.6, 7.6], [-2.8, 0.5, 0], 1.0, g);
      const bin = Oc.obj.fragile_bin, x0 = bin.position.x, pal = Oc.obj.heavy_pallet, p0 = pal.position.x;
      Oc.lhid.visible = true; Oc.lhid.element.textContent = "flip twin: 2.6 m gap, answer " + D.occlusion.twins.flip.answer; Oc.lhid.element.className = "cl-lbl bad";
      await tween(1.2, k => { bin.position.x = x0 - 1.2 * k; pal.position.x = p0 - 1.2 * k; for (const s of Oc.binStickers) s.position.x = bin.position.x; }, g);
      await wait(1.8, g); if (!alive(g)) return;
      await tween(0.8, k => { bin.position.x = x0 - 1.2 * (1 - k); pal.position.x = p0 - 1.2 * (1 - k); for (const s of Oc.binStickers) s.position.x = bin.position.x; }, g);
      Oc.lhid.element.textContent = "keep twin: pallet 0.4 m back, answer " + D.occlusion.twins.keep.answer; Oc.lhid.element.className = "cl-lbl good";
      await tween(0.8, k => { pal.position.x = p0 - 0.4 * k; }, g);
      await wait(2.0, g);
    },
  ],
  async knob(i, g) {
    FAM.occlusion.reset("A"); const s = Oc.v.sweep[i];
    setModelCam(s.camera); Oc.rigM.position.set(...s.camera.pos); Oc.rigM.lookAt(V3(...s.camera.look));
    Oc.lhid.element.textContent = Math.round(100 * s.bin_hidden) + "% of the bin hidden"; Oc.lhid.visible = true;
  },
};

// ------------------------------------------------------------------------------------------------ 3 memory

const Me = {};
function slotPos(slot) { const sh = D.assets.shelf3.shelves; return V3(slot[1], sh[slot[0]], 0); }
FAM.memory = {
  async build(g) {
    clearTmp(); clearRoot(); const d = D.memory, ep = d.episode; Me.ep = ep;
    const sh = await inst("shelf3"); root.add(sh);
    const T = ep.table, top = own(new THREE.Mesh(new THREE.BoxGeometry(T.size[0], 0.035, T.size[2]), mat(0x9aa1a9, 0.35, 0.7)));
    top.position.set(T.pos[0], T.size[1] - 0.0175, T.pos[2]); root.add(top);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const l = own(new THREE.Mesh(new THREE.BoxGeometry(0.04, T.size[1], 0.04), mat(0x50565e, 0.4, 0.7))); l.position.set(T.pos[0] + dx * (T.size[0] / 2 - 0.04), T.size[1] / 2, T.pos[2] + dz * (T.size[2] / 2 - 0.04)); root.add(l); }
    Me.bins = {}; for (const b of Object.keys(ep.start_slots)) { const m = makeBin(b); Me.bins[b] = m; root.add(m); }
    Me.items = {}; for (const c of ["blue", "red", "green", "black", "orange", "purple"]) { const m = await makeItem(c); Me.items[c] = m; root.add(m); }
    Me.arm = makeArm(d.arm); root.add(Me.arm.root); Me.arm.home = ik(Me.arm, V3(1.3, 0.72, 1.35), "forward"); Me.arm.setQ(Me.arm.home);   // parked to the right, low, out of the camera's view of the bins and the table
    Me.rig = cameraRig(d.camera, "ceiling camera", 0x2563eb); root.add(Me.rig);
    Me.lblue = lbl("blue barcode item", "key", V3(0, 0, 0)); Me.lans = lbl("", "good", V3(0, 2.15, 0.2)); Me.lans.visible = false;
    setModelCam(d.camera); sunOver(0.3, 0.6, 4);
    FAM.memory.setState(0);
    await flyTo([2.6, 2.3, 3.6], [0.2, 1.1, 0.4], 0, g);
    Me.film = [];
    for (const L of [0, 2, 4, 6, 8, 10]) { FAM.memory.setState(L); RC.render(scene, mcam); Me.film.push(RC.domElement.toDataURL("image/jpeg", 0.8)); }
    if (O.film) O.film(Me.film);
    FAM.memory.setState(0);
  },
  itemPos(st, it) {
    const loc = st.items[it];
    if (loc[0] === "table") return V3(...Me.ep.table_spots[loc[1]]);
    const p = slotPos(st.bins[loc[1]]); p.y += Me.ep.bin_floor; return p;
  },
  setState(L) {
    const st = Me.ep.states[L];
    for (const [b, m] of Object.entries(Me.bins)) m.position.copy(slotPos(st.bins[b]));
    for (const [it, m] of Object.entries(Me.items)) { m.position.copy(FAM.memory.itemPos(st, it)); m.rotation.set(0, 0, 0); }
    Me.arm.setQ(Me.arm.home); Me.arm.grip(true);
    Me.lblue.position.copy(Me.items.blue.position).add(V3(0, 0.3, 0.15));
    Me.lblue.element.textContent = st.items.blue[0] === "table" ? "blue barcode item" : "blue item in " + st.items.blue[1] + " (label hidden)";
  },
  async act(a, g, fast) {
    const A = Me.arm, st0 = Me.ep.states[a.step - 1], st1 = Me.ep.states[a.step], sec = fast ? 0.55 : 0.9;
    const front = (slot, dy) => { const p = slotPos(slot); return V3(p.x, p.y + dy, 0.2); };
    if (a.do === "move") {
      const bin = Me.bins[a.bin], inside = Object.entries(st0.items).filter(([, v]) => v[0] === "bin" && v[1] === a.bin).map(([k]) => Me.items[k]);
      const from = front(a.from_slot, 0.13), to = front(a.to_slot, 0.13);
      await armPath(A, [from.clone().add(V3(0, 0, 0.35)), from], "forward", sec, g); if (!alive(g)) return; A.grip(false);
      const carry = [[bin, bin.position.clone().sub(from)], ...inside.map(m => [m, m.position.clone().sub(from)])];
      await armPath(A, [from.clone().add(V3(0, 0.02, 0.45)), to.clone().add(V3(0, 0.02, 0.45)), to.clone().add(V3(0, 0.02, 0)), to], "forward", sec * 2.4, g, carry);
      if (!alive(g)) return; A.grip(true);
      await armPath(A, [to.clone().add(V3(0, 0, 0.4))], "forward", sec * 0.6, g);
    } else {
      const m = Me.items[a.item], p0 = m.position.clone(), p1 = FAM.memory.itemPos(st1, a.item);
      const onTable = st0.items[a.item][0] === "table";
      const grab0 = p0.clone().add(V3(0, 0.11, 0)), mode0 = onTable ? "down" : "tilt";
      await armPath(A, [grab0.clone().add(V3(0, 0.22, onTable ? 0 : 0.18)), grab0], mode0, sec, g); if (!alive(g)) return; A.grip(false);
      const off = p0.clone().sub(grab0);
      const up0 = grab0.clone().add(V3(0, onTable ? 0.25 : 0.12, onTable ? 0 : 0.3));
      const grab1 = p1.clone().add(V3(0, 0.11, 0)), up1 = grab1.clone().add(V3(0, 0.14, 0.3));
      await armPath(A, [up0, up1, grab1.clone().add(V3(0, 0.08, 0)), grab1], "tilt", sec * 2.4, g, [[m, off]]);
      if (!alive(g)) return; A.grip(true); m.position.copy(p1);
      await armPath(A, [grab1.clone().add(V3(0, 0.1, 0.3))], "tilt", sec * 0.5, g);
    }
    if (!alive(g)) return;
    await armHome(A, fast ? 0.35 : 0.6, g);
    FAM.memory.setState(a.step);
  },
  async run(from, to, g, fast) {
    FAM.memory.setState(from); freezeModel();
    for (const a of Me.ep.actions.slice(from, to)) { await FAM.memory.act(a, g, fast); if (!alive(g)) return; }
    if (O.filmMark) O.filmMark(to / 2);
    freezeModel();                               // the new picture
    Me.rig.children[0].material.emissive && Me.rig.children[0].material.emissive.setRGB(0.6, 0.6, 0.6);
    await wait(0.35, g); Me.rig.children[0].material.emissive && Me.rig.children[0].material.emissive.setRGB(0, 0, 0);
  },
  steps: [
    async g => { FAM.memory.setState(0); Me.lans.visible = false; if (O.filmMark) O.filmMark(0); await flyTo([2.6, 2.3, 3.6], [0.2, 1.1, 0.4], 1.4, g); },
    async g => { Me.lans.visible = false; await flyTo([2.4, 2.0, 3.0], [0.1, 1.1, 0.3], 0.8, g); await FAM.memory.run(0, 2, g); },
    async g => { Me.lans.visible = false; await FAM.memory.run(2, 4, g); },
    async g => { Me.lans.visible = false; await FAM.memory.run(4, 6, g); },
    async g => { Me.lans.visible = false; await FAM.memory.run(6, 10, g, true); },
    async g => {
      FAM.memory.setState(10); await flyToCam(D.memory.camera, 1.4, g);
      Me.lans.element.textContent = "answer at step 10: " + Me.ep.answers["10"]; Me.lans.visible = true;
    },
  ],
  async knob(i, g) {
    const L = D.memory.knob.values[i]; FAM.memory.setState(L); if (O.filmMark) O.filmMark(L / 2);
    Me.lans.element.textContent = `after ${L} steps the blue item is in ${Me.ep.answers[String(L)]}`; Me.lans.visible = true;
  },
};

// ------------------------------------------------------------------------------------------------ 4 deform

const De = {};
FAM.deform = {
  async build(g) {
    clearTmp(); clearRoot(); const d = D.deform; De.d = d;
    const rack = await inst("rack_large"); rack.rotation.y = Math.PI / 2; root.add(rack);
    const sign = await inst("rack_sign"); sign.position.set(0.2, 0.62, 1.06); sign.scale.setScalar(0.55); root.add(sign);
    const plac = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshStandardMaterial({roughness: 0.5, map: canvasTex(320, 100, (c, w, h) => {
      c.fillStyle = "#ffd400"; c.fillRect(0, 0, w, h); c.fillStyle = "#111"; c.font = "bold 64px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("SHELF X", w / 2, h / 2 + 3);
    })}));
    plac.userData.own = true; plac.position.set(-0.95, 0.38, 1.07); root.add(plac);
    const gl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(-1.75, d.shelf.deck_y, 0.95), V3(-1.75, d.shelf.clear_to, 0.95)]), new THREE.LineDashedMaterial({color: 0xfacc15, dashSize: 0.06, gapSize: 0.04}));
    gl.computeLineDistances(); gl.userData.own = true; root.add(anno(gl));
    lbl(`${(d.shelf.clear_to - d.shelf.deck_y).toFixed(2)} m clear to the deck above`, "warn", V3(-1.75, (d.shelf.deck_y + d.shelf.clear_to) / 2, 0.95));
    De.arm = makeArm({...d.arm, clamp: 0.36}); root.add(De.arm.root); De.arm.home = ik(De.arm, V3(0.1, 1.45, 2.85), "forward"); De.arm.setQ(De.arm.home);
    const pal = await inst("pallet"); pal.position.set(0.75, 0, 2.55); pal.rotation.y = Math.PI / 2; root.add(pal); De.feed = V3(0.75, 0.2086, 2.55);
    const lamp = new THREE.PointLight(0xfff1dc, 9, 7, 1.6); lamp.position.set(-0.95, 2.05, 1.25); root.add(lamp);   // work light under the upper deck
    De.stack = new THREE.Group(); root.add(De.stack); De.moving = null;
    De.lq = lbl("", "good", V3(-0.95, 2.45, 0.6)); De.lmat = lbl("", "", V3(-0.95, 0.3, 1.25));
    setModelCam(d.camera); sunOver(-0.5, 0.5, 4);
    await flyTo([1.6, 2.2, 4.6], [-0.7, 1.0, 0.2], 0, g);
  },
  // draw a stack from the page model's numbers: each box at its height, offset, lost height and bulge
  async drawStack(c, which, extra, g) {   // built off-scene, swapped in only if this step is still the current one
    const grp = new THREE.Group();
    const at = De.d.shelf.stack_at, a = D.assets[c.asset].size, boxes = c[which].boxes.slice();
    let y = De.d.shelf.deck_y;
    for (const [i, b] of boxes.entries()) {
      let m, hh = b.h;
      const crush = extra && extra.crush && i === 0, loss = b.height_loss * (crush ? 1.7 : 1);
      if (c.asset === "steel_case") { m = await inst("steel_case"); if (!alive(g)) return false; }
      else { m = softBox([a[0], a[1], a[2]], loss, b.bulge_m * (crush ? 1.7 : 1), crush ? 0xffb4a8 : 0xffffff); hh = a[1] * (1 - loss); }
      m.position.set(at[0] + b.dx, y, at[2] + b.dz); m.rotation.z = -b.tilt * 0.5; grp.add(m); y += hh;   // each box rests on the one below
    }
    if (c.wrap) { const h = y - De.d.shelf.deck_y; const w = wrapShell(a[0] + 0.05, h + 0.02, a[2] + 0.05); w.position.set(at[0], De.d.shelf.deck_y + (h + 0.02) / 2 - 0.01, at[2]); grp.add(w); }
    if (!alive(g)) return false;
    root.remove(De.stack); De.stack = grp; root.add(grp);
    if (De.moving) { root.remove(De.moving); De.moving = null; }
    De.lmat.element.textContent = c.label + (c.asset === "steel_case" ? "" : ", 30 kg each");
    return true;
  },
  async place(c, g, outcome) {
    const A = De.arm, a = D.assets[c.asset].size, at = De.d.shelf.stack_at, top = c.now.top_y;
    const box = c.asset === "steel_case" ? await inst("steel_case") : softBox([a[0], a[1], a[2]], 0, 0);
    const b0 = A.root.position, ang = p => Math.atan2(p.x - b0.x, p.z - b0.z);
    const dst = V3(at[0], top + a[1] / 2 + 0.01, at[2]), aStack = ang(dst);
    box.position.copy(De.feed); box.rotation.y = ang(De.feed) - aStack; root.add(box); De.moving = box;   // turns with the arm, lands square
    const grab = box.position.clone().add(V3(0, a[1] / 2, 0)), off = V3(0, -a[1] / 2, 0);
    const toward = grab.clone().sub(b0).setY(0).normalize();
    await armPath(A, [grab.clone().sub(toward.clone().multiplyScalar(0.5)).add(V3(0, 0.1, 0)), grab], "forward", 0.9, g); if (!alive(g)) return; A.grip(false);
    await armPath(A, [grab.clone().sub(toward.clone().multiplyScalar(0.3)).add(V3(0, 0.45, 0)), dst.clone().add(V3(0.0, 0.05, 0.9)), dst.clone().add(V3(0, 0.05, 0)), dst], "forward", 2.6, g, [[box, off, aStack]]);
    if (!alive(g)) return; A.grip(true);
    await armPath(A, [dst.clone().add(V3(0, 0, 0.7))], "forward", 0.6, g);
    await armHome(A, 0.6, g);
    return box;
  },
  async run(ci, g, outcome) {
    const c = De.d.cases[ci]; De.lq.visible = false;
    if (!(await FAM.deform.drawStack(c, "now", null, g))) return;
    freezeModel();                               // the question's picture: the stack as it stands
    const box = await FAM.deform.place(c, g); if (!alive(g)) return;
    if (c.answer === "yes") { if (!(await FAM.deform.drawStack(c, "after", null, g))) return; }
    else if (!c.fits_under_deck) { De.moving = null; box.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(0xff6b6b); } }); De.moving = box; }
    else { if (!(await FAM.deform.drawStack(c, "after", {crush: true}, g))) return; }
    De.lq.element.textContent = "another box: " + c.answer + " (" + c.why + ")"; De.lq.element.className = "cl-lbl " + (c.answer === "yes" ? "good" : "bad"); De.lq.visible = true;
    await wait(2.5, g);
  },
  steps: [
    async g => { await flyTo([1.6, 2.2, 4.6], [-0.7, 1.0, 0.2], 1.2, g); await FAM.deform.run(0, g); },
    async g => { await flyTo([0.4, 1.9, 3.4], [-0.9, 1.4, 0.2], 1.0, g); await FAM.deform.run(1, g); },
    async g => { await flyTo([1.2, 1.6, 3.6], [-0.9, 0.9, 0.2], 1.0, g); await FAM.deform.run(2, g); },
    async g => { await flyTo([0.2, 1.2, 2.7], [-0.95, 0.8, 0.25], 1.0, g); await FAM.deform.run(4, g); },
    async g => { await flyTo([0.2, 1.2, 2.7], [-0.95, 0.8, 0.25], 1.0, g); await FAM.deform.run(5, g); },
    async g => { const c = De.d.cases[4]; De.lq.visible = false; if (!(await FAM.deform.drawStack(c, "now", null, g))) return; await flyToCam(De.d.camera, 1.4, g); },
  ],
  async knob(i, g) {
    const c = De.d.cases[i];
    if (!(await FAM.deform.drawStack(c, "now", null, g))) return;
    De.lq.element.textContent = "another box: " + c.answer + " (" + c.why + ")"; De.lq.element.className = "cl-lbl " + (c.answer === "yes" ? "good" : "bad"); De.lq.visible = true;
  },
};

// ------------------------------------------------------------------------------------------------ 5 frames

const Fr = {};
FAM.frames = {
  async build(g) {
    clearTmp(); clearRoot(); const d = D.frames, v = d.variants[0]; Fr.v = v; Fr.obj = {};
    const r = rng(29);
    for (const o of v.objects) {
      let m;
      if (o.kind === "agv") m = makeAGV(); else if (o.kind === "tool_chest") m = makeToolChest(); else m = await inst(o.kind);
      m.position.set(...o.pos); m.rotation.y = o.yaw; root.add(m); Fr.obj[o.id] = m;
      if (o.kind === "rack_long") {                // goods on the decks, for a working aisle
        for (const y of D.assets.rack_long.decks) for (const dx of [-1.25, 0, 1.25]) {
          if (r() < 0.25) continue;
          const p = await inst("pallet"); p.position.set(o.pos[0] + dx, y, o.pos[2]); root.add(p);
          const nb = 1 + Math.floor(r() * 2);
          for (let k = 0; k < nb; k++) { const b = await inst("cardbox"); b.position.set(o.pos[0] + dx + (k - (nb - 1) / 2) * 0.62, y + 0.2086, o.pos[2]); b.rotation.y = Math.PI / 2 * (r() < 0.5 ? 0 : 1); root.add(b); }
        }
      }
    }
    for (const z of [-1.62, 1.62]) { const ln = own(new THREE.Mesh(new THREE.PlaneGeometry(16, 0.08), new THREE.MeshStandardMaterial({color: 0xf2c200, roughness: 0.6}))); ln.rotation.x = -Math.PI / 2; ln.position.set(2, 0.011, z); root.add(ln); }
    Fr.lf = lbl("forklift", "", V3(0, 2.5, -0.9), Fr.obj.forklift); Fr.la = lbl("AGV", "", V3(0, 0.7, 0), Fr.obj.agv); Fr.lc = lbl("tool chest", "warn", V3(0, 1.3, 0), Fr.obj.tool_chest);
    const mk = (parent, y, r0, txtL, txtR, colL, colR) => {      // left and right arrows in the vehicle's own frame:
      const gL = anno(floorArrow(1.0, colL, txtL)); gL.position.set(r0, y, 0); parent.add(gL);               // forward is local +z, so
      const gR = anno(floorArrow(1.0, colR, txtR)); gR.rotation.y = Math.PI; gR.position.set(-r0, y, 0); parent.add(gR);   // left is local +x
      return [gL, gR];
    };
    Fr.farr = mk(Fr.obj.forklift, 0.03, 0.72, "forklift's left", "forklift's right", 0xf59e0b, 0x64748b);
    Fr.aarr = mk(Fr.obj.agv, 0.05, 0.46, "AGV's left", "AGV's right", 0x64748b, 0x16a34a);
    Fr.rig = cameraRig(v.camera, "camera", 0x2563eb); root.add(Fr.rig);
    Fr.lq = lbl("", "good", V3(1.2, 0.4, 1.3)); Fr.lq.visible = false;
    setModelCam(v.camera); sunOver(1, 0, 8);
    await flyTo([1.2, 9.5, 3.6], [1.2, 0, 0], 0, g);
  },
  reset(turned) {
    const v = Fr.v, ag = v.objects.find(o => o.id === "agv"), fk = v.objects.find(o => o.id === "forklift"), ch = v.objects.find(o => o.id === "tool_chest");
    Fr.obj.agv.position.set(...ag.pos); Fr.obj.agv.rotation.y = ag.yaw;
    if (turned) { freezeModel(); Fr.obj.agv.rotation.y = ag.props.yaw_after; }
    Fr.obj.forklift.position.set(...fk.pos); Fr.obj.forklift.rotation.y = fk.yaw;
    Fr.obj.tool_chest.position.set(...ch.pos); Fr.obj.tool_chest.rotation.y = ch.yaw;
    for (const a of [...Fr.farr, ...Fr.aarr]) a.visible = false; Fr.lq.visible = false;
  },
  say(t, cls) { Fr.lq.element.textContent = t; Fr.lq.element.className = "cl-lbl " + (cls || "good"); Fr.lq.visible = true; },
  steps: [
    async g => {
      FAM.frames.reset(false); const a = Fr.obj.agv, x1 = a.position.x;
      await flyTo([1.2, 9.5, 3.6], [1.2, 0, 0], 1.2, g);
      await tween(2.2, k => { a.position.x = x1 + 3 * (1 - k); }, g);
    },
    async g => { FAM.frames.reset(false); await flyToCam(Fr.v.camera, 1.6, g); FAM.frames.say("in the picture: the chest is " + Fr.v.answers.camera_frame + " of the forklift", "warn"); },
    async g => { FAM.frames.reset(false); Fr.farr.forEach(a => a.visible = true); await flyTo([-1.2, 6.8, 2.6], [-1.0, 0, -0.2], 1.6, g); FAM.frames.say("from the forklift's seat: the chest is on its left", "warn"); },
    async g => {
      FAM.frames.reset(false); Fr.aarr.forEach(a => a.visible = true); await flyTo([3.6, 6.4, 2.6], [3.0, 0, -0.2], 1.4, g);
      const ag = Fr.v.objects.find(o => o.id === "agv"), y0 = ag.yaw, y1 = ag.props.yaw_after;
      FAM.frames.say("before the turn: the chest is on the AGV's " + Fr.v.answers.agv_now, "warn"); freezeModel(); await wait(1.4, g);
      let dy = y1 - y0; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      await tween(3.0, k => { Fr.obj.agv.rotation.y = y0 + dy * k; }, g);
    },
    async g => { FAM.frames.reset(true); Fr.aarr.forEach(a => a.visible = true); Fr.farr.forEach(a => a.visible = true); await flyTo([1.2, 9.5, 3.6], [1.0, 0, -0.2], 1.6, g); FAM.frames.say("facing each other: the chest is on the AGV's " + Fr.v.answers.agv_after_turn + " (answer)"); },
    async g => {
      FAM.frames.reset(false); await flyTo([1.2, 9.5, 3.6], [1.2, 0, 0], 1.2, g);
      const fl = D.frames.twins.flip.objects, fk = fl.find(o => o.id === "forklift"), ch = fl.find(o => o.id === "tool_chest");
      const f = Fr.obj.forklift, c = Fr.obj.tool_chest, fy0 = f.rotation.y, c0 = c.position.clone();
      FAM.frames.say("flip twin: the forklift faces the other way, answer " + D.frames.twins.flip.answer, "bad");
      await tween(2.0, k => { f.rotation.y = fy0 + Math.PI * k; c.position.lerpVectors(c0, V3(...ch.pos), k); c.rotation.y = fy0 + Math.PI * k; }, g);
      await wait(1.8, g); if (!alive(g)) return;
      FAM.frames.reset(false);
      const kp = D.frames.twins.keep.objects.find(o => o.id === "agv"), a = Fr.obj.agv, a0 = a.position.clone();
      FAM.frames.say("keep twin: the AGV starts elsewhere, answer " + D.frames.twins.keep.answer);
      await tween(1.4, k => { a.position.lerpVectors(a0, V3(...kp.pos), k); }, g);
      await wait(1.6, g);
    },
  ],
  async knob(i, g) {
    const q = D.frames.questions[i]; FAM.frames.reset(i === 2);
    if (i >= 1) Fr.aarr.forEach(a => a.visible = true);
    FAM.frames.say(`${q.frames} frame change${q.frames === 1 ? "" : "s"}: answer ${q.answer}`, i === 2 ? "good" : "warn");
  },
};
