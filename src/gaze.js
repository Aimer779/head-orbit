// Pointer-follow camera, ported from Active Theory's Hydra GazeCamera
// (~/ActiveTheory/Hydra/Modules/engine3d/camera/GazeCamera.js).
//
// group > inner > camera. The camera eases toward `position` + a pointer offset (moveXY) and keeps
// aiming at `lookAt`. `inner` carries the slow wobble and a roll kicked by fast horizontal pointer moves
// (deltaRotate, degrees). Lerp alphas are per 60Hz frame like Hydra's, scaled by dt so any refresh rate
// feels the same. orbit() / still() fade the whole effect in and out.

import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
// Hydra's Math.lerp(target, value, alpha): moves value toward target
const lerp = (target, value, alpha, hz) => value + (target - value) * clamp(alpha * hz, 0, 1);
// Hydra's Math.range(..., clamp = true)
const range = (v, a, b, c, d) => clamp(c + ((v - a) / (b - a)) * (d - c), Math.min(c, d), Math.max(c, d));
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export class GazeCamera {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.inner = new THREE.Group();
    this.inner.add(camera);
    this.group.add(this.inner);

    this.strength = 1;
    this.moveXY = new THREE.Vector2(4, 4);
    this.position = new THREE.Vector3();   // base position, the pointer offsets from here
    this.lerpSpeed = 0.05;
    this.lerpSpeed2 = 1;
    this.lookAt = new THREE.Vector3();
    this.deltaRotate = 0;
    this.deltaLerp = 1;
    this.wobbleSpeed = 1;
    this.wobbleStrength = 0;
    this.wobbleZ = 1;
    this.zoomOffset = 0;

    this._strength = 1;
    this._tween = null;
    this._time = 0;
    this._move = new THREE.Vector3();
    this._position = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._wobble = new THREE.Vector3();
    this._rotation = 0;
    this._wobbleAngle = THREE.MathUtils.degToRad(Math.random() * 360);
    this._m = new THREE.Matrix4();
    this._localLookAt = new THREE.Vector3();

    // Hydra's Mouse: starts centered, delta is the last move, cleared after 10 idle frames
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, dx: 0, idle: 0 };
    addEventListener('pointermove', (e) => {
      this.mouse.dx = e.clientX - this.mouse.x;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.idle = 0;
    });
  }

  // snap to a base position (Hydra: position.set / copy)
  setPosition(x, y, z, noCopy) {
    this.position.set(x, y, z);
    this._move.z = z;
    if (!noCopy) this.camera.position.copy(this._move);
    this._position.copy(this._move);
  }

  orbit(time = 1000) { return this._fade(1, time); }
  still(time = 300) { return this._fade(0, time); }
  get active() { return this._tween ? this._tween.to > 0 : this._strength > 0; }

  _fade(to, time) {
    this._tween = { from: this._strength, to, start: this._time, time };
  }

  update(dt) {
    const hz = dt * 60;
    const m = this.mouse;
    this._time += dt * 1000;
    if (m.idle++ > 10) m.dx = 0;

    if (this._tween) {
      const { from, to, start, time } = this._tween;
      const t = time > 0 ? clamp((this._time - start) / time, 0, 1) : 1;
      this._strength = from + (to - from) * easeInOutSine(t);
      if (t >= 1) this._tween = null;
    }

    const s = this._strength * this.strength;
    const W = innerWidth, H = innerHeight;
    this._move.x = this.position.x + range(m.x, 0, W, -1, 1) * s * this.moveXY.x;
    this._move.y = this.position.y + range(m.y, 0, H, -1, 1) * s * this.moveXY.y;
    this._move.z = this.position.z;

    const rotateStrength = range(Math.abs(m.dx) / W, 0, 0.02, 0, 1);
    this._rotation = lerp(THREE.MathUtils.degToRad(this.deltaRotate) * rotateStrength * Math.sign(m.dx), this._rotation, 0.02 * this.deltaLerp * this._strength, hz);
    this.inner.rotation.z = lerp(this._rotation, this.inner.rotation.z, 0.07 * this.deltaLerp, hz);

    this._position.lerp(this._move, clamp(this.lerpSpeed2 * hz, 0, 1));
    this._target.copy(this._position);
    this._target.z += this.zoomOffset;
    this.camera.position.lerp(this._target, clamp(this.lerpSpeed * hz, 0, 1));

    if (this.wobbleStrength > 0) {
      const t = this._time, a = this._wobbleAngle, sp = this.wobbleSpeed, w = this._wobble;
      w.x = Math.cos(a + t * (0.00075 * sp)) * (a + Math.sin(t * (0.00095 * sp)) * 200);
      w.y = Math.sin(Math.asin(Math.cos(a + t * (0.00085 * sp)))) * (Math.sin(a + t * (0.00075 * sp)) * 150);
      w.x *= Math.sin(a + t * (0.00075 * sp)) * 2;
      w.y *= Math.cos(a + t * (0.00065 * sp)) * 1.75;
      w.x *= Math.cos(a + t * (0.00075 * sp)) * 1.1;
      w.y *= Math.sin(a + t * (0.00025 * sp)) * 1.15;
      w.z = Math.sin(a + w.x * 0.0025) * (100 * this.wobbleZ);
      w.multiplyScalar(this.wobbleStrength * 0.001 * this._strength);
      this.inner.position.lerp(w, clamp(0.07 * hz, 0, 1));
    }

    // aim in inner's local space (Object3D.lookAt would undo the inner roll)
    this.group.updateMatrixWorld(true);
    this.inner.worldToLocal(this._localLookAt.copy(this.lookAt));
    this._m.lookAt(this.camera.position, this._localLookAt, this.camera.up);
    this.camera.quaternion.setFromRotationMatrix(this._m);
  }
}
