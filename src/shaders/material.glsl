#define MAX_MATERIALS 10

struct Material {
    vec3 color;
    float lightMultiplier;
    float ignoreLighting;
    float specularStrength;
};

Material mats[MAX_MATERIALS];


void registerMaterial(in Material m, int index) {
    mats[index] = m;
}

Material getMaterial(int matID) {
    Material m = mats[matID];
    return m;
}
