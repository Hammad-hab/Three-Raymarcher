precision highp float;

uniform sampler2D tDiffuse;

#define MAX_STEPS 1000.0
#define MAX_DIST 100000.0
#define EPS 0.0001
#define SHADOW_RES 1024
#define WORLD_AMBIENT_INTENSITY 0.5
#define TRUE 1.0
#define FALSE 0.0

varying vec2 vUv;
uniform float uTime;
uniform vec2 iResolution;
uniform vec3 cpos;
uniform vec3 cdir;
uniform mat4 matrixWorld;
varying vec3 fragPosition;


$import sdf.glsl $
$import material.glsl $

vec2 smin(vec2 a, vec2 b, float k) {
    float h = max(k - abs(a.x - b.x), 0.0) / k;
    float dist = min(a.x, b.x) - h * h * k * 0.25;
    float matID = (a.x < b.x) ? a.y : b.y;
    return vec2(dist, matID);
}

vec2 scene(vec3 p) {
  float box = sdBox(p-vec3(0.0, 2.0*sin(uTime*0.5), 0.0), vec3(1.0, 1.0, 1.0));
  float plane = sdBox(p+vec3(0.0, 2.25, 0.0), vec3(100.0, 1.0, 100.0));
  float sphere = sdfSphere(p-vec3(0.0, 3.0*sin(uTime*0.1), 0.0), 1.2);
  // Return closest object with its material ID
  vec2 res = vec2(box, 1.0);  // Start with box
  
  if (plane < res.x) {
    res = vec2(plane, 2.0);  // Only update if plane is closer
  }

  if (sphere < res.x) {
    res = vec2(sphere, 1.0);  // Only update if plane is closer
  }
  return smin(smin(vec2(plane, 2.0),vec2(sphere, 1.0), 1.0),vec2(box, 1.0), 1.0);
}

// Wrapper for shadow/normal calculations that only need distance
float sceneDistance(vec3 p) {
  return scene(p).x;
}

$import shadow.glsl $


vec2 raymarch(vec3 origin, vec3 dir) {
  float travelled = 0.0;
  float matID = -1.0;

  for (float i = 0.0; i < MAX_STEPS; i+=1.0) {
    vec3 p = origin + dir*travelled;
    vec2 res = scene(p);
    float dist = res.x*0.9;
    travelled += max(dist, 0.001); 

    if (travelled > MAX_DIST || dist < 0.001) {
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

  float shd = softshadow(p + normal*0.01, ldir, 0.01, length(vec3(1.0, 0.5, 0.0)-p), 1.0);

  vec3 sky = vec3(0.74, 0.9, 1.0);
  Material color = Material(sky, 1.0, TRUE, 1.0);

  Material red = Material(vec3(1.0, 0.0, 0.0), 1.0, FALSE, 5.0);
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
  vec3 finalColor = (color.color)*(color.ignoreLighting == 1.0 ? vec3(1.0) : (WORLD_AMBIENT_INTENSITY + vec3(diff) + specular));


  float totalColorContent = smoothstep(0.0, 1.0, finalColor.r + finalColor.g + finalColor.b); 
  
  gl_FragColor =vec4(finalColor, 1.0);
}