// Navigation episode player: an overhead camera follows a drawn robot as it walks the corridor and goes through the
// doors into the rooms; the robot's own camera (what a model gets) is drawn in the corner. Data: nav.json from
// bench/spbench/nav.py (metres, z up), shown in three.js's y-up frame: (x, y, z) -> (x, z, -y), yaw about +z ->
// rotation about +y. Models: NVIDIA SimReady warehouse assets (CC BY 4.0) converted to glTF; the robot, the walls and
// the coloured boxes are drawn. Browser drawings, not Isaac Sim renders.
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {MeshoptDecoder} from "three/addons/libs/meshopt_decoder.module.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

const FILES = {shelf3: "SM_Rack_F04_01.glb", box: "FlatBox_A05_26x26x11cm_PR_NVD_01.glb", steel_case: "SM_Case_A01_Glossy_B_01.glb",
               cardbox: "Cardbox_A1.glb", load: "sm_largecardboardboxe_a02_01.glb"};
const L = {OPAQUE: 3, SEE: 4, ROBOT: 5};      // walls solid for the robot, see-through from above; the robot's body
const P = (p) => new THREE.Vector3(p[0], p[2] || 0, -p[1]);
const S = {};

export async function init(opts) {
  S.D = opts.data; S.base = opts.base; S.status = opts.onStatus || (() => {});
  S.loader = new GLTFLoader(); S.loader.setMeshoptDecoder(MeshoptDecoder);
  S.R = renderer(opts.main); S.RI = renderer(opts.inset);
  S.scene = new THREE.Scene(); S.scene.background = new THREE.Color(0xdfe3e8);
  S.scene.add(new THREE.HemisphereLight(0xffffff, 0x50555c, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(10, 20, 6); S.scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({color: 0xa7abb0, roughness: 0.9}));
  floor.rotation.x = -Math.PI / 2; floor.position.x = 15; S.scene.add(floor);
  const corr = new THREE.Mesh(new THREE.PlaneGeometry(40, 4), new THREE.MeshStandardMaterial({color: 0x8f969c, roughness: 0.9}));
  corr.rotation.x = -Math.PI / 2; corr.position.set(15, 0.002, 0); S.scene.add(corr);
  S.cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);          // the overhead follow camera
  [0, L.SEE, L.ROBOT].forEach(l => S.cam.layers.enable(l));
  S.rcam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 300);         // the robot's own camera
  [0, L.OPAQUE].forEach(l => S.rcam.layers.enable(l));
  S.ctl = new OrbitControls(S.cam, S.R.domElement); S.ctl.enableDamping = true; S.ctl.maxPolarAngle = Math.PI * 0.48;
  S.ctl.addEventListener("start", () => { S.free = true; });
  S.status("placing the rooms");
  await build();
  S.robot = robotBody(); S.scene.add(S.robot);
  S.k = 0; S.anim = null; S.pose = [...S.D.start.robot]; S.look = S.D.start.camera.look; S.boxIdx = 0;
  placeRobot(S.pose); aimRobot(S.pose, S.look);
  const t = followTarget(S.pose); S.cam.position.copy(t.pos); S.ctl.target.copy(t.at);
  new ResizeObserver(fit).observe(opts.main); new ResizeObserver(fit).observe(opts.inset); fit();
  S.status(""); loop();
}

function renderer(el) {
  const r = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; el.appendChild(r.domElement); r.el = el; return r;
}

function fit() {
  for (const [r, c] of [[S.R, S.cam], [S.RI, S.rcam]]) {
    const w = r.el.clientWidth || 640, h = r.el.clientHeight || Math.round(w * 9 / 16);
    r.setSize(w, h, false); c.aspect = w / h; c.updateProjectionMatrix();
  }
  S.rcam.fov = 2 * Math.atan(Math.tan(68 * Math.PI / 360) / S.rcam.aspect) * 180 / Math.PI; S.rcam.updateProjectionMatrix();
}

const cache = {};
async function model(kind) {
  if (!FILES[kind]) return null;
  if (!cache[kind]) cache[kind] = S.loader.loadAsync(S.base + FILES[kind]).then(g => g.scene);
  return (await cache[kind]).clone(true);
}

function label(l) {
  const hpx = 96, c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = `bold ${hpx}px sans-serif`;
  c.width = Math.ceil(g.measureText(l.text).width + hpx * 0.6); c.height = Math.round(hpx * 1.35);
  const x = c.getContext("2d"); x.fillStyle = "#f4f1e6"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#15181c"; x.font = `bold ${hpx}px sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(l.text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const h = l.height_m * 1.35, m = new THREE.Mesh(new THREE.PlaneGeometry(h * c.width / c.height, h), new THREE.MeshBasicMaterial({map: tex}));
  m.position.copy(P(l.pos));
  if (l.normal[2] === 1) { m.rotation.x = -Math.PI / 2; m.position.y += 0.003; }
  return m;
}

async function thing(x) {
  let g;
  if (x.kind === "wall") {
    const geo = new THREE.BoxGeometry(x.size[0], x.size[2], x.size[1]);
    g = new THREE.Group();
    const solid = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: 0xd6d6d0, roughness: 0.95}));
    solid.layers.set(L.OPAQUE); g.add(solid);
    const see = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: 0xbfc4c9, transparent: true, opacity: 0.22, depthWrite: false}));
    see.layers.set(L.SEE); g.add(see);
    [solid, see].forEach(m => m.position.y = x.size[2] / 2);
  } else if (x.kind === "cbox") {
    g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(x.size[0], x.size[2], x.size[1]),
                             new THREE.MeshStandardMaterial({color: new THREE.Color(...x.color.map(v => v / 255)), roughness: 0.6}));
    b.position.y = x.size[2] / 2; g.add(b);
  } else {
    g = new THREE.Group(); const m = await model(x.kind); if (m) g.add(m);
  }
  g.position.copy(P(x.pos)); g.rotation.y = (x.yaw || 0) * Math.PI / 180;
  return g;
}

async function build() {
  S.box = {};
  for (const x of S.D.static) S.scene.add(await thing(x));
  for (const l of S.D.labels) S.scene.add(label(l));
  for (const b of S.D.boxes[0]) { const g = await thing(b); S.box[b.id] = g; S.scene.add(g); }
}

function robotBody() {
  const g = new THREE.Group(), m = (c) => new THREE.MeshStandardMaterial({color: c, roughness: 0.5});
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.55), m(0x2b2f36)); base.position.y = 0.22; g.add(base);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.57), m(0xf2b705)); band.position.y = 0.3; g.add(band);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 12), m(0x9aa1a8)); mast.position.y = 0.95; g.add(mast);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.16), m(0x1c1f24)); head.position.set(0.04, 1.5, 0); g.add(head);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), m(0x3a7bd5)); lens.rotation.z = Math.PI / 2;
  lens.position.set(0.17, 1.5, 0); g.add(lens);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 12), m(0x19e07a)); nose.rotation.z = -Math.PI / 2;
  nose.position.set(0.48, 0.25, 0); g.add(nose);
  g.traverse(o => o.layers.set(L.ROBOT));
  return g;
}

function placeRobot(p) { S.robot.position.copy(P([p[0], p[1], 0])); S.robot.rotation.y = p[2] * Math.PI / 180; }
function aimRobot(p, look) { S.rcam.position.copy(P([p[0], p[1], 1.5])); S.rcam.lookAt(P(look)); }
function followTarget(p) {
  const a = p[2] * Math.PI / 180, back = 5.2, up = 6.8;
  return {pos: P([p[0] - back * Math.cos(a), p[1] - back * Math.sin(a), up]), at: P([p[0] + 1.5 * Math.cos(a), p[1] + 1.5 * Math.sin(a), 0.8])};
}

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  if (S.anim) tick(now);
  if (!S.free) {   // follow the robot smoothly unless the viewer dragged the camera
    const t = followTarget(S.pose);
    S.cam.position.lerp(t.pos, 0.06); S.ctl.target.lerp(t.at, 0.08);
  }
  S.ctl.update();
  S.R.render(S.scene, S.cam); S.RI.render(S.scene, S.rcam);
}

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function tick(now) {
  const A = S.anim, t = Math.min(1, (now - A.t0) / A.ms);
  if (A.walk) {   // walk along the waypoints: each leg takes its share of the time by length
    let d = t * A.total, i = 0;
    while (i < A.legs.length - 1 && d > A.legs[i]) { d -= A.legs[i]; i++; }
    const a = A.path[i], b = A.path[i + 1], f = A.legs[i] ? Math.min(1, d / A.legs[i]) : 1;
    const yawTarget = A.legs[i] > 0.01 ? Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI : b[2];
    const goal = t < 1 ? yawTarget : A.end[2], diff = ((goal - S.pose[2]) % 360 + 540) % 360 - 180;
    S.pose = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), S.pose[2] + diff * 0.25];   // turn smoothly toward the way it walks
    placeRobot(S.pose);
    aimRobot(S.pose, A.look);   // the camera head points where the walk ends, not at the wall it passes
  }
  if (A.moves) {  // the arm carries each moved box over an arc
    const f = ease(t);
    for (const mv of A.moves) {
      const p = [lerp(mv.from[0], mv.to[0], f), lerp(mv.from[1], mv.to[1], f), lerp(mv.from[2], mv.to[2], f) + Math.sin(Math.PI * f) * 0.45];
      S.box[mv.id].position.copy(P(p));
    }
  }
  if (t >= 1) {
    S.anim = null; S.pose = [...A.end]; placeRobot(S.pose); aimRobot(S.pose, A.look);
  }
}

function setBoxes(idx) { for (const b of S.D.boxes[idx]) S.box[b.id].position.copy(P(b.pos)); S.boxIdx = idx; }
function boxesAt(k) { let b = 0; for (const s of S.D.steps.slice(0, k)) if (s.boxes != null) b = s.boxes; return b; }

export function go(k) {
  if (!S.D) return;
  const N = S.D.steps.length; k = Math.max(0, Math.min(N, k));
  S.free = false;
  if (k === S.k + 1) {          // one step forward: animate it
    const st = S.D.steps[k - 1], A = {t0: performance.now(), end: st.robot, look: st.camera.look};
    if (st.path.length > 1 && JSON.stringify(st.path[0]) !== JSON.stringify(st.path[st.path.length - 1])) {
      A.walk = true; A.path = st.path;
      A.legs = st.path.slice(1).map((b, i) => Math.hypot(b[0] - st.path[i][0], b[1] - st.path[i][1]));
      A.total = A.legs.reduce((s, x) => s + x, 0) || 1;
    }
    const nb = boxesAt(k);
    if (nb !== S.boxIdx) {
      const prev = S.D.boxes[S.boxIdx], next = S.D.boxes[nb];
      A.moves = next.map((b, i) => ({id: b.id, from: prev[i].pos, to: b.pos})).filter(m => JSON.stringify(m.from) !== JSON.stringify(m.to));
      S.boxIdx = nb;
    }
    A.ms = A.walk ? Math.max(900, A.total / 2.2 * 1000) : 1100;
    if (!A.walk && !A.moves) A.ms = 300;
    S.anim = A;
  } else {                      // a jump: place everything at once
    S.anim = null;
    const p = k === 0 ? S.D.start.robot : S.D.steps[k - 1].robot, look = k === 0 ? S.D.start.camera.look : S.D.steps[k - 1].camera.look;
    S.pose = [...p]; placeRobot(p); aimRobot(p, look); setBoxes(boxesAt(k));
    const t = followTarget(S.pose); S.cam.position.copy(t.pos); S.ctl.target.copy(t.at);
  }
  S.k = k;
}

export function follow() { S.free = false; }
