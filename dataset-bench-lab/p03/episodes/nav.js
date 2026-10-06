// Navigation episode player (30 rooms): an overhead camera follows a drawn robot that tows a six-slot tote cart along
// the corridor and into each room; the robot's own camera (what a model gets) is drawn in the corner. Data: nav.json
// from bench/spbench/nav.py (metres, z up), shown in three.js's y-up frame: (x, y, z) -> (x, z, -y); yaw about +z ->
// rotation about +y; tilt about the north axis (+ lifts the west side) -> rotation about three's z by -tilt. A pose is
// [x, y, z, yaw, tilt, visible]. Models: NVIDIA SimReady warehouse assets (CC BY 4.0) converted to glTF; the robot, its
// cart, the walls and the plain shapes are drawn. Browser drawings, not Isaac Sim renders.
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {MeshoptDecoder} from "three/addons/libs/meshopt_decoder.module.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

const FILES = {shelf3: "SM_Rack_F04_01.glb", box: "FlatBox_A05_26x26x11cm_PR_NVD_01.glb", steel_case: "SM_Case_A01_Glossy_B_01.glb",
               cardbox: "Cardbox_A1.glb", load: "sm_largecardboardboxe_a02_01.glb", forklift: "SM_Forklift_C01_Blue_01.glb",
               pallet: "Pallet_A1.glb", bin: "SM_Container_C04_Gray_01.glb"};
const YAW_OFFSET = {forklift: Math.PI / 2};   // the forklift model's front is its +z; the layout's front is +x
const L = {OPAQUE: 3, SEE: 4, ROBOT: 5};      // walls solid for the robot, see-through from above; the robot's body
const NEAR = 32;                              // objects farther than this along the corridor are not drawn
const D2R = Math.PI / 180;
const P = (p) => new THREE.Vector3(p[0], p[2] || 0, -p[1]);
const S = {};

export async function init(opts) {
  S.D = opts.data; S.base = opts.base; S.status = opts.onStatus || (() => {});
  S.loader = new GLTFLoader(); S.loader.setMeshoptDecoder(MeshoptDecoder);
  S.R = renderer(opts.main); S.RI = renderer(opts.inset);
  S.scene = new THREE.Scene(); S.scene.background = new THREE.Color(0xdfe3e8);
  S.scene.add(new THREE.HemisphereLight(0xffffff, 0x50555c, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(10, 20, 6); S.scene.add(sun);
  const len = S.D.floor_len || 300;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(len + 60, 40), new THREE.MeshStandardMaterial({color: 0xa7abb0, roughness: 0.9}));
  floor.rotation.x = -Math.PI / 2; floor.position.set(len / 2, 0, -4.5); S.scene.add(floor);
  const corr = new THREE.Mesh(new THREE.PlaneGeometry(len + 20, 4), new THREE.MeshStandardMaterial({color: 0x8f969c, roughness: 0.9}));
  corr.rotation.x = -Math.PI / 2; corr.position.set(len / 2, 0.002, 0); S.scene.add(corr);
  S.cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);          // the overhead follow camera
  [0, L.SEE, L.ROBOT].forEach(l => S.cam.layers.enable(l));
  S.rcam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 300);         // the robot's own camera
  [0, L.OPAQUE].forEach(l => S.rcam.layers.enable(l));
  S.ctl = new OrbitControls(S.cam, S.R.domElement); S.ctl.enableDamping = true; S.ctl.maxPolarAngle = Math.PI * 0.48;
  S.ctl.addEventListener("start", () => { S.free = true; });
  S.status("placing the rooms");
  S.items = []; S.dyn = {};
  await build();
  S.robot = robotBody(); S.cart = cartBody(); S.robot.add(S.cart); S.scene.add(S.robot);
  S.k = 0; S.anim = null; S.cullAt = null;
  jump(0);
  if (opts.still) { fit(); S.status(""); return; }   // render on request only (snap), for the agent-walk harness
  new ResizeObserver(fit).observe(opts.main); new ResizeObserver(fit).observe(opts.inset); fit();
  S.status(""); loop();
}

// The robot camera's picture for any pose: the world as it stands after step k (moved objects, the cart's totes), the
// robot (and its towed cart) at `robot` = [x, y, yaw], the camera at cam.pos looking at cam.look. Returns a JPEG data URL
// at the inset's size (1280 x 720 in the harness). Used by bench/agentwalk/walk.mjs when the agent steers.
export function snap(k, robot, cam, quality, show) {
  jump(k); shown(show || []);
  S.pose = [...robot]; placeRobot(S.pose); aimRobot(cam.pos, cam.look); cull(robot[0]);
  S.RI.render(S.scene, S.rcam);
  return S.RI.domElement.toDataURL("image/jpeg", quality || 0.88);
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

// ------------------------------------------------------------------------------------------------ building the world
const cache = {}, MATS = {};
async function model(kind) {
  if (!FILES[kind]) return null;
  if (!cache[kind]) cache[kind] = S.loader.loadAsync(S.base + FILES[kind]).then(g => g.scene).catch(() => null);
  const src = await cache[kind];
  return src ? src.clone(true) : null;
}

function mat(color, opacity) {
  const o = opacity == null ? 1 : opacity, key = color.join(",") + "|" + o;
  if (!MATS[key]) MATS[key] = new THREE.MeshStandardMaterial({color: new THREE.Color(`rgb(${color.map(Math.round).join(",")})`),
    roughness: 0.65, transparent: o < 1, opacity: o, depthWrite: o >= 1});
  return MATS[key];
}

function shape(x) {   // a drawn box or cylinder; its origin is the bottom centre, or the centre when x.center
  const [sx, sy, sz] = x.size;
  let geo;
  if (x.shape === "cyl" && x.axis === "x") { geo = new THREE.CylinderGeometry(sy / 2, sy / 2, sx, 24); geo.rotateZ(Math.PI / 2); }
  else if (x.shape === "cyl" && x.axis === "y") { geo = new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 24); geo.rotateX(Math.PI / 2); }
  else if (x.shape === "cyl") geo = new THREE.CylinderGeometry(sx / 2, sx / 2, sz, 24);
  else geo = new THREE.BoxGeometry(sx, sz, sy);
  const m = new THREE.Mesh(geo, mat(x.color || [128, 128, 128], x.opacity));
  m.position.y = x.center ? 0 : sz / 2;
  return m;
}

function amrBody(x) {   // another robot in a room: a low body, a yellow band and a green nose at its front (+x)
  const [sx, sy, sz] = x.size, g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sz, sy), mat(x.color)); b.position.y = sz / 2; g.add(b);
  const band = new THREE.Mesh(new THREE.BoxGeometry(sx * 1.02, 0.04, sy * 1.02), mat([242, 183, 5])); band.position.y = sz * 0.8; g.add(band);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(sy * 0.22, 0.2, 12), mat([25, 224, 122])); nose.rotation.z = -Math.PI / 2;
  nose.position.set(sx / 2 + 0.08, sz * 0.6, 0); g.add(nose);
  return g;
}

async function thing(x) {
  const g = new THREE.Group();
  if (x.kind === "wall") {
    const geo = new THREE.BoxGeometry(x.size[0], x.size[2], x.size[1]);
    const solid = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: 0xd6d6d0, roughness: 0.95}));
    solid.layers.set(L.OPAQUE); g.add(solid);
    const see = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: 0xbfc4c9, transparent: true, opacity: 0.22, depthWrite: false}));
    see.layers.set(L.SEE); g.add(see);
    [solid, see].forEach(m => m.position.y = x.size[2] / 2);
  } else if (x.kind === "prim") g.add(shape(x));
  else if (x.kind === "amr") g.add(amrBody(x));
  else {
    const m = await model(x.kind);
    if (m) { if (x.scale) m.scale.setScalar(x.scale); m.rotation.y = YAW_OFFSET[x.kind] || 0; g.add(m); }
    else g.add(shape({...x, shape: "box"}));
  }
  return g;
}

function canvasText(text, hpx, bg, fg) {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = `bold ${hpx}px sans-serif`;
  c.width = Math.ceil(g.measureText(text).width + hpx * 0.6); c.height = Math.round(hpx * 1.35);
  const x = c.getContext("2d"); x.fillStyle = bg || "#f4f1e6"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = fg || "#15181c"; x.font = `bold ${hpx}px sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return {tex, aspect: c.width / c.height};
}

function textPlane(text, height, bg, fg) {   // height = the letters' height in metres
  const {tex, aspect} = canvasText(text, 96, bg, fg), h = height * 1.35;
  return new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshBasicMaterial({map: tex}));
}

function compassDecal(l) {   // a floor compass: a disc, an arrow toward l.compass degrees (0 = east, 90 = north), the letter at its tip
  const N = 512, c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d");
  g.fillStyle = "#f4f1e6"; g.beginPath(); g.arc(N / 2, N / 2, N * 0.48, 0, 2 * Math.PI); g.fill();
  g.strokeStyle = "#15181c"; g.lineWidth = N * 0.02; g.stroke();
  g.fillStyle = "#9aa1a8"; g.fillRect(N * 0.47, N * 0.5, N * 0.06, N * 0.36);               // the tail
  g.fillStyle = "#c62828"; g.fillRect(N * 0.465, N * 0.36, N * 0.07, N * 0.16);               // the shaft
  g.beginPath(); g.moveTo(N * 0.5, N * 0.2); g.lineTo(N * 0.39, N * 0.38); g.lineTo(N * 0.61, N * 0.38); g.closePath(); g.fill();
  g.fillStyle = "#15181c"; g.font = `bold ${Math.round(N * 0.13)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(l.text, N / 2, N * 0.11);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const d = l.disc || l.height_m / 0.13;   // the letter's height is 0.13 of the disc
  const m = new THREE.Mesh(new THREE.PlaneGeometry(d, d), new THREE.MeshBasicMaterial({map: tex, transparent: true}));
  m.position.copy(P(l.pos)); m.position.y += 0.003;
  m.rotation.order = "YXZ"; m.rotation.x = -Math.PI / 2; m.rotation.y = (l.compass - 90) * D2R;
  return m;
}

function labelMesh(l) {
  if (l.compass != null) return compassDecal(l);
  const m = textPlane(l.text, l.height_m, l.bg, l.fg), n = l.normal;
  m.position.copy(P(l.pos));
  if (n[2] === 1) { m.rotation.x = -Math.PI / 2; m.position.y += 0.003; }   // painted on the floor, read from the south
  else { const d = P(n); m.position.addScaledVector(d, 0.004); m.lookAt(m.position.clone().add(d)); }
  return m;
}

function track(g, x, always) { const it = {g, x, vis: true, near: true, always}; S.items.push(it); return it; }

async function build() {
  for (const x of S.D.static) {
    const g = await thing(x); g.position.copy(P(x.pos)); g.rotation.set(0, (x.yaw || 0) * D2R, -(x.tilt || 0) * D2R, "ZYX");
    S.scene.add(g); const it = track(g, x.pos[0], x.size[0] > 30); it.vis = x.vis !== 0;
  }
  S.only = [];                                 // labels shown only at one moment (a gate's screen while the cart is inside)
  for (const l of S.D.labels) {
    const m = labelMesh(l); S.scene.add(m); const it = track(m, l.pos[0], false);
    if (l.show_only) { it.vis = false; it.id = l.id; S.only.push(it); }
  }
  for (const x of S.D.dyn) {
    const g = await thing(x); S.scene.add(g);
    const it = track(g, x.pos[0], false); it.p0 = [...x.pos, x.yaw || 0, x.tilt || 0, x.vis === 0 ? 0 : 1];
    S.dyn[x.id] = it; setPose(it, it.p0);
  }
}

function setPose(it, p) {
  it.p = [...p]; it.x = p[0]; it.vis = p[5] !== 0;
  it.g.position.copy(P(p)); it.g.rotation.set(0, p[3] * D2R, -p[4] * D2R, "ZYX"); it.g.visible = it.vis && it.near;
}

function shown(ids) { for (const it of S.only) { it.vis = ids.includes(it.id); it.g.visible = it.vis && it.near; } }
function cull(x) {   // draw only what is near the robot: 30 rooms of shapes would slow the page
  S.cullAt = x;
  for (const it of S.items) { it.near = it.always || Math.abs(it.x - x) < NEAR; it.g.visible = it.vis && it.near; }
}

// ------------------------------------------------------------------------------------------------ the robot and its cart
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
  g.traverse(o => o.layers.set(L.ROBOT));   // the robot's own camera does not see its body; it does see the cart
  return g;
}

function cartBody() {   // towed behind the robot (robot-local metres): deck, wheels, tow bar, the slot map board, six totes
  const C = S.D.cart, g = new THREE.Group(), [dl, dw, dh] = C.deck, cx = C.offset;
  const add = (size, color, at, center) => { const m = shape({size, color, center}); m.position.add(P(at)); g.add(m); return m; };
  add([dl, dw, 0.06], [70, 72, 78], [cx, 0, dh - 0.06]);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    add([0.04, 0.04, dh - 0.12], [120, 124, 130], [cx + sx * (dl / 2 - 0.06), sy * (dw / 2 - 0.06), 0.1]);
    add([0.12, 0.05, 0.12], [30, 30, 32], [cx + sx * (dl / 2 - 0.06), sy * (dw / 2 - 0.06), 0.0]);
  }
  add([Math.abs(cx + dl / 2 - -0.33), 0.05, 0.05], [120, 124, 130], [(cx + dl / 2 + -0.33) / 2, 0, 0.28]);   // tow bar
  const [z0, z1] = C.board.z;
  add([0.02, dw, z1 - z0], [240, 238, 228], [C.board.x - 0.01, 0, z0]);
  for (const sy of [-1, 1]) add([0.03, 0.03, z0 - dh + 0.01], [120, 124, 130], [C.board.x - 0.01, sy * (dw / 2 - 0.03), dh - 0.01]);
  for (const l of C.labels) {   // the slot numbers face the robot (+x)
    const m = textPlane(l.text, l.height_m || 0.075); m.position.copy(P(l.at)); m.rotation.y = Math.PI / 2; g.add(m);
  }
  const [hx, hy, hz] = C.held, top = hz + C.tote[2];   // the station arm's hook above a lifted tote
  S.hook = add([0.02, 0.02, 1.25 - top], [60, 64, 70], [hx, hy, top]);
  S.hook.add(shape({size: [C.tote[0] * 0.9, 0.03, 0.02], color: [60, 64, 70]}));
  S.tote = {};
  for (const t of S.D.totes) {
    const tg = new THREE.Group(), [tx, ty, tz] = C.tote;
    tg.add(shape({size: [tx, ty, tz], color: [70, 110, 165]}));
    const rim = shape({size: [tx * 0.84, ty * 0.8, 0.006], color: [44, 70, 108]}); rim.position.y = tz + 0.001; tg.add(rim);
    S.tote[t] = tg; g.add(tg);
  }
  return g;
}

function toteSpots(i) {   // where each tote sits in cart state i (robot-local)
  const st = S.D.cart_states[i], C = S.D.cart, out = {};
  st.slots.forEach((t, k) => { if (t) out[t] = [C.slots[k][0], C.slots[k][1], C.deck[2]]; });
  if (st.held) out[st.held] = [...C.held];
  return out;
}
function setTotes(i) {
  S.cartIdx = i; const sp = toteSpots(i); for (const t in sp) S.tote[t].position.copy(P(sp[t]));
  S.hook.visible = !!S.D.cart_states[i].held;
}

function placeRobot(p) { S.robot.position.copy(P([p[0], p[1], 0])); S.robot.rotation.y = p[2] * D2R; }
function aimRobot(pos, look) { S.rcam.position.copy(P(pos)); S.rcam.lookAt(P(look)); }
function followTarget(p) {
  const a = p[2] * D2R, back = 5.2, up = 6.8;
  return {pos: P([p[0] - back * Math.cos(a), p[1] - back * Math.sin(a), up]), at: P([p[0] + 1.5 * Math.cos(a), p[1] + 1.5 * Math.sin(a), 0.8])};
}

// ------------------------------------------------------------------------------------------------ playing the steps
function loop() {
  requestAnimationFrame(loop);
  if (S.anim) tick(performance.now());
  if (S.cullAt == null || Math.abs(S.pose[0] - S.cullAt) > 2) cull(S.pose[0]);
  if (!S.free) {   // follow the robot smoothly unless the viewer dragged the camera
    const t = followTarget(S.pose);
    S.cam.position.lerp(t.pos, 0.06); S.ctl.target.lerp(t.at, 0.08);
  }
  S.ctl.update();
  S.R.render(S.scene, S.cam); S.RI.render(S.scene, S.rcam);
}

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const turn = (a, b) => ((b - a) % 360 + 540) % 360 - 180;

function tick(now) {
  const A = S.anim, t = Math.min(1, (now - A.t0) / A.ms), f = ease(t);
  if (A.walk) {   // walk along the waypoints: each leg takes its share of the time by length
    let d = t * A.total, i = 0;
    while (i < A.legs.length - 1 && d > A.legs[i]) { d -= A.legs[i]; i++; }
    const a = A.path[i], b = A.path[i + 1], u = A.legs[i] ? Math.min(1, d / A.legs[i]) : 1;
    const heading = A.legs[i] > 0.01 ? Math.atan2(b[1] - a[1], b[0] - a[0]) / D2R : b[2];
    const goal = t < 1 ? heading : A.end[2];
    S.pose = [lerp(a[0], b[0], u), lerp(a[1], b[1], u), S.pose[2] + turn(S.pose[2], goal) * 0.25];   // turn smoothly
  } else if (A.turn != null) S.pose = [A.end[0], A.end[1], A.turn + turn(A.turn, A.end[2]) * f];
  placeRobot(S.pose);
  const look = [0, 1, 2].map(j => lerp(A.look0[j], A.look[j], f));
  aimRobot([S.pose[0], S.pose[1], A.camz], look);
  for (const mv of A.totes) {   // the station's arm carries a tote over a low arc
    const p = [0, 1, 2].map(j => lerp(mv.from[j], mv.to[j], f)); p[2] += Math.sin(Math.PI * f) * 0.18;
    S.tote[mv.id].position.copy(P(p));
  }
  for (const mv of A.dyn) {
    const a = mv.from, b = mv.to, p = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f),
                                      a[3] + turn(a[3], b[3]) * f, lerp(a[4], b[4], f), a[5] || b[5] ? 1 : 0];
    setPose(mv.it, p);
  }
  if (t >= 1) finish();
}

function finish() {   // put everything where the step ends
  const A = S.anim; if (!A) return;
  S.anim = null; S.pose = [...A.end]; placeRobot(S.pose); aimRobot(A.cam, A.look); S.lookCur = [...A.look];
  setTotes(A.cart);
  for (const mv of A.dyn) setPose(mv.it, mv.to);
}

function camAt(k) { return k === 0 ? S.D.start.camera : S.D.steps[k - 1].camera; }

function jump(k) {   // place everything at once: replay every moved object up to step k
  const p = k === 0 ? S.D.start.robot : S.D.steps[k - 1].robot, c = camAt(k);
  S.pose = [...p]; placeRobot(p); aimRobot(c.pos, c.look); S.lookCur = [...c.look];
  setTotes(k === 0 ? 0 : S.D.steps[k - 1].cart);
  shown(k > 0 && S.D.steps[k - 1].gate ? [S.D.steps[k - 1].gate] : []);
  const pose = {};
  for (const id in S.dyn) pose[id] = S.dyn[id].p0;
  for (const st of S.D.steps.slice(0, k)) for (const id in st.dyn || {}) pose[id] = st.dyn[id];
  for (const id in S.dyn) setPose(S.dyn[id], pose[id]);
  cull(S.pose[0]);
  const t = followTarget(S.pose); S.cam.position.copy(t.pos); S.ctl.target.copy(t.at);
}

export function go(k) {
  if (!S.D) return;
  const N = S.D.steps.length; k = Math.max(0, Math.min(N, k));
  S.free = false;
  finish();
  if (k === S.k) return;
  if (k === S.k + 1) {          // one step forward: animate it
    const st = S.D.steps[k - 1], c = st.camera;
    shown(st.gate ? [st.gate] : []);
    const A = {t0: performance.now(), end: st.robot, look0: S.lookCur, look: c.look, cam: c.pos, camz: c.pos[2], cart: st.cart,
               totes: [], dyn: []};
    const path = st.path && st.path.length ? st.path : [st.robot];
    A.legs = path.slice(1).map((b, i) => Math.hypot(b[0] - path[i][0], b[1] - path[i][1]));
    A.total = A.legs.reduce((s, x) => s + x, 0);
    if (A.total > 0.05) { A.walk = true; A.path = path; }
    else if (Math.abs(turn(S.pose[2], st.robot[2])) > 1) A.turn = S.pose[2];
    if (st.cart !== S.cartIdx) {
      const a = toteSpots(S.cartIdx), b = toteSpots(st.cart);
      S.hook.visible = !!(S.D.cart_states[S.cartIdx].held || S.D.cart_states[st.cart].held);
      for (const t in b) if (JSON.stringify(a[t]) !== JSON.stringify(b[t])) A.totes.push({id: t, from: a[t], to: b[t]});
    }
    for (const id in st.dyn || {}) { const it = S.dyn[id]; if (it) A.dyn.push({it, from: [...it.p], to: st.dyn[id]}); }
    A.ms = A.walk ? Math.min(3400, Math.max(900, A.total / 3.5 * 1000)) : (A.dyn.length || A.totes.length || A.turn != null ? 1300 : 400);
    S.anim = A;
  } else jump(k);
  S.k = k;
}

export function follow() { S.free = false; }
