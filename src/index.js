import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import sdfShaderFunctions from "./shaders/sdf.glsl";
import materialShaderFunctions from "./shaders/material.glsl";
import shadowShaderFunction from "./shaders/shadow.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import allowGLSLImports from "./shaders";

import { World, Vec3, Body, Box, Sphere } from "cannon-es";
import RMGeometry, { RMBox, RMCylinderCapped } from "./RaymarchedGeometry";

class RaymarchingScene {
  constructor() {
    this.MAX_SPHERES = 32;
    
    this.initPhysics();
    this.initThree();
    this.initPostProcessing();
    this.initEventListeners();
    this.animate();
  }

  /* ---------------- PHYSICS ---------------- */

  initPhysics() {
    this.world = new World({
      gravity: new Vec3(0, -9.81, 0),
    });

    const plane = new Body({
      shape: new Box(new Vec3(100, 0.5, 100)),
      type: Body.STATIC,
      position: new Vec3(0, -3, 0),
    });

    this.world.addBody(plane);
    this.balls = [];
  }

  spawnBall(pos) {
    if (this.balls.length >= this.MAX_SPHERES) return;

    const body = new Body({
      shape: new Sphere(4.0),
      mass: 1,
      position: new Vec3(pos.x, pos.y, pos.z),
    });

    this.world.addBody(body);
    this.balls.push(body);
  }

  /* ---------------- THREE ---------------- */

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    this.stats = new Stats();
    document.body.appendChild(this.stats.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  
  }

  /* ---------------- POST PROCESSING ---------------- */

  createRaymarchedGeometries() {
  
    const floor = new RMBox()
    floor.position.y = -2.25
    floor.materialIndex = 2
    const floorCompiled = floor.compile(new THREE.Vector3(100, 1.0, 100))


      
    const centre = new RMCylinderCapped()
    centre.position.y = 8
    centre.materialIndex = 1
    const centreCompiled = centre.compile(1.0, 9.0)
    
    const n_branches = 5.0

    const branchesCompiled = []
    for (let i = 0; i < n_branches; i+=1) {
      const cylinder2 = new RMCylinderCapped()
      const sign = [-1, 1][Math.floor(Math.random()*2.0)]
      cylinder2.position.y = 7+3*i
      cylinder2.position.x = -sign*4
      cylinder2.materialIndex = 1
      cylinder2.rotation.z = sign*Math.PI * 0.25

      const ig = Math.random()
      cylinder2.rotation.x = ig*sign*Math.PI * 0.25
      cylinder2.position.z = ig*sign*3
      const cylinderCompiled2 = cylinder2.compile(Math.abs(Math.random()-0.5)+0.2, 5.0)
      branchesCompiled.push(cylinderCompiled2)
    }



    const out = (RMGeometry.union(floorCompiled, centreCompiled, ...branchesCompiled))
    return out
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    const img = new THREE.TextureLoader().load(
      "/julien-riedel-alGtgU3MQu4-unsplash.jpg"
    );

    const sphereUniformArray = Array.from(
      { length: this.MAX_SPHERES },
      () => new THREE.Vector3()
    );


    this.shaderPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          iResolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
          },
          cpos: { value: new THREE.Vector3() },
          cdir: { value: new THREE.Vector3() },
          matrixWorld: { value: this.camera.matrixWorld },
          img: { value: img },

          uSphereCount: { value: 0 },
          uSpherePos: { value: sphereUniformArray },
        },

        vertexShader: `
          varying vec2 vUv;
          varying vec3 fragPosition;
          varying mat3 vNormalMat;

          void main() {
            vUv = uv;
            fragPosition = vec3(modelMatrix * vec4(position,1.0));
            vNormalMat = normalMatrix;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,

        fragmentShader:
          THREE.ShaderChunk["packing"] +
          "\n" +
          allowGLSLImports(
            {
              sdf: sdfShaderFunctions,
              material: materialShaderFunctions,
              shadow: shadowShaderFunction,
              scene: (() => {
                return `
                  res = ${this.createRaymarchedGeometries()};
                `;
              })(),
            },
            fragmentShader
          ),
      })
    );

    this.composer.addPass(this.shaderPass);
  }

  /* ---------------- EVENT LISTENERS ---------------- */

  initEventListeners() {
    window.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    window.addEventListener("resize", () => this.onWindowResize());
  }

  onPointerDown(e) {
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );

    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);

    const spawnPos = ray.ray.origin
      .clone()
      .add(ray.ray.direction.clone().multiplyScalar(10));

    this.spawnBall(spawnPos);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);

    this.shaderPass.uniforms.iResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
  }

  /* ---------------- ANIMATION LOOP ---------------- */

  animate() {
    requestAnimationFrame(() => this.animate());
    this.stats.begin();

    this.world.fixedStep();

    this.shaderPass.uniforms.uTime.value += 0.016;
    this.shaderPass.uniforms.uSphereCount.value = this.balls.length;

    for (let i = 0; i < this.balls.length; i++) {
      this.shaderPass.uniforms.uSpherePos.value[i].copy(this.balls[i].position);
    }

    this.camera.getWorldPosition(this.shaderPass.uniforms.cpos.value);
    this.camera.getWorldDirection(this.shaderPass.uniforms.cdir.value);

    this.controls.update();
    this.composer.render();

    this.stats.end();
  }

  /* ---------------- CLEANUP ---------------- */

  dispose() {
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("resize", this.onWindowResize);
    
    this.renderer.dispose();
    this.composer.dispose();
    this.controls.dispose();
    
    document.body.removeChild(this.renderer.domElement);
    document.body.removeChild(this.stats.domElement);
  }
}

// Initialize the scene
const scene = new RaymarchingScene();

export default RaymarchingScene;