precision highp float;

uniform sampler2D tDiffuse;

#define MAX_STEPS 256.0
#define MAX_DIST 300.0
#define EPS 0.0001
#define SHADOW_RES 256
#define WORLD_AMBIENT_INTENSITY 0.5
#define TRUE 1.0
#define FALSE 0.0
#define MAX_SPHERES 32
#define PI 3.1415926535

varying vec2 vUv;
uniform float uTime;

/* ---- CHANGED (same name, now array) ---- */
uniform int uSphereCount;
uniform vec3 uSpherePos[MAX_SPHERES];

uniform vec2 iResolution;
uniform vec3 cpos;
uniform vec3 cdir;
uniform mat4 matrixWorld;
varying vec3 fragPosition;
varying mat3 vNormalMat;
uniform sampler2D img;
uniform sampler2D tDepth;

$import sdf.glsl $
$import material.glsl $


vec2 smin(vec2 a, vec2 b, float k) {
    float h = max(k - abs(a.x - b.x), 0.0) / k;
    float dist = min(a.x, b.x) - h * h * k * 0.25;
    float matID = (a.x < b.x) ? a.y : b.y;
    return vec2(dist, matID);
}

/* ---------- SCENE ---------- */
vec2 scene(vec3 p) {
  vec2 res = vec2(1.0, 2.0);

  $ scene.glsl $
  return res;
}

/* Wrapper for shadow/normal calculations */
float sceneDistance(vec3 p) {
  return scene(p).x;
}

$import shadow.glsl $

vec2 raymarch(vec3 origin, vec3 dir) {
  float travelled = 0.0;
 float matID = -1.0;

  for (float i = 0.0; i < MAX_STEPS; i += 1.0) {
    vec3 p = origin + dir * travelled;
    vec2 res = scene(p);
    float dist = res.x * 0.9;
    travelled += max(dist, 0.001);

    if (travelled > MAX_DIST || dist < 0.01) {
      matID = res.y;
      break;
    }
  }

 return vec2(travelled, matID);
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= iResolution.x/iResolution.y;

  vec3 dir = (matrixWorld * vec4(vec3(uv, -1.0), 0.0)).xyz;
  vec3 origin = cpos + 1.0*dir;
  
  vec2 result = raymarch(origin, dir);
  float dist = result.x;
  float matID = result.y;
  
  vec3 p = origin + dir*dist;
  vec3 normal = normalize(vec3(
    sceneDistance(p + vec3(EPS,0,0)) - sceneDistance(p - vec3(EPS,0,0)),
    sceneDistance(p + vec3(0,EPS,0)) - sceneDistance(p - vec3(0,EPS,0)),
    sceneDistance(p + vec3(0,0,EPS)) - sceneDistance(p - vec3(0,0,EPS))
  ));

  vec3 ldir = normalize(vec3(1.0, 0.5, 0.0));

  float shd = softshadow(p + normal*0.01, ldir, 0.01, length(vec3(1.0, 0.5, 0.0)-p), 1.0) - 0.5;

  vec3 sky = vec3(0.74, 0.9, 1.0);
  Material color = Material(sky, 1.0, TRUE, 1.0);

  Material red = Material(vec3(1.0), 1.0, FALSE, 5.0);
  registerMaterial(red, 1);

  Material white = Material((step(fract(0.1*vec3(p.x)), vec3(0.9)) - step(fract(0.1*vec3(p.z)), vec3(0.1))), 1.0, FALSE, 0.0);
  registerMaterial(white, 2);

  Material nrml = Material(normal, 1.0, FALSE, 1.0);
  registerMaterial(nrml, 3);

  if (dist < MAX_DIST) {
    color = getMaterial(int(matID));
  }

    vec3 viewDir = normalize(origin - fragPosition);
    vec3 reflectDir = reflect(-ldir, normal);  
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 4.0);
    vec3 specular = color.specularStrength * spec * color.color;  
  float diff = max(dot(ldir, normal), 0.0)*shd*color.lightMultiplier;
  vec3 finalColor = (color.color)*(color.ignoreLighting == 1.0 ? vec3(1.0) : (WORLD_AMBIENT_INTENSITY + vec3(diff)));


  float totalColorContent = smoothstep(0.0, 1.0, finalColor.r + finalColor.g + finalColor.b); 
  
  gl_FragColor =vec4(finalColor, 1.0);
}