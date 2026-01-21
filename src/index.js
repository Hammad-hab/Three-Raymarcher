import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";

import sdfShaderFunctions from "./shaders/sdf.glsl"
import materialShaderFunctions from "./shaders/material.glsl"
import shadowShaderFunction from "./shaders/shadow.glsl"
import fragmentShader from "./shaders/fragment.glsl"
import allowGLSLImports from "./shaders";


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const stats = new Stats()
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement);
document.body.appendChild(stats.domElement);

scene.add(new THREE.Mesh(new THREE.BoxGeometry, new THREE.MeshBasicMaterial))
const effectComposer = new EffectComposer(renderer);
effectComposer.setSize(window.innerWidth, window.innerHeight);
effectComposer.setPixelRatio(window.devicePixelRatio);
effectComposer.addPass(new RenderPass(scene, camera));



const shaderPass = new ShaderPass(new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 60.0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    cpos: { value: camera.position },
    cdir: { value: new THREE.Vector3() },
    matrixWorld: { value: camera.matrixWorld }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 fragPosition;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        fragPosition=vec3( modelMatrix*vec4(position, 1.0));
    }
    `,
    fragmentShader: allowGLSLImports({
      "sdf": sdfShaderFunctions,
      "material": materialShaderFunctions,
      "shadow": shadowShaderFunction
    }, fragmentShader),
}))
effectComposer.addPass(shaderPass);

camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement)


function animate() {
  requestAnimationFrame(animate);
  stats.begin()
  effectComposer.render();
  shaderPass.uniforms.uTime.value += 0.1;
  controls.update(0.01)
  camera.getWorldPosition(shaderPass.uniforms.cpos.value)
  camera.getWorldDirection(shaderPass.uniforms.cdir.value);
  camera.matrixAutoUpdate = true
  stats.end()

}

animate();