import { Euler, Vector2, Vector3 } from "three"

class RMGeometry {
    static union(...gn) {
        let smin = "smin($in"
        let depth = 1
        if (gn.length === 1) {
            return gn[0]
        }
        
        for (const g of gn) {
           const cmpiled = g
           if (smin.endsWith("$in")) {
              smin = smin.replace('$in', cmpiled)
              continue;
           }
           const index = gn.indexOf(g)
           if (index === gn.length-1) {
            smin += `,${cmpiled}`
            break
           }
           smin += `,smin(${cmpiled}`
           depth += 1
        }
        
        smin += ",1.0)".repeat(depth)
        return smin
    }
    constructor(name="") {
        this._glslfuncname = name
        this.position = new Vector3()
        this.rotation = new Vector3()
        this.materialIndex = 1.0
    }
    
    compile(...args) {
        let processedArgs = []
        for (const arg of args) {
            if (typeof arg === "number") {
                processedArgs.push(arg.toPrecision(2))
            }
            if (arg instanceof Vector3) {
                processedArgs.push(`vec3(${arg.x}, ${arg.y}, ${arg.z})`)
                continue
            }
            if (arg instanceof Vector2) {
                processedArgs.push(`vec2(${arg.x}, ${arg.y})`)
                continue
            }
        }
        return `vec2(${this._glslfuncname}((p - vec3(${this.position.x.toPrecision(2)}, ${this.position.y.toPrecision(2)}, ${this.position.z.toPrecision(2)}))*rotation3dX(${this.rotation.x.toPrecision(10.0)})*rotation3dY(${this.rotation.y.toPrecision(10.0)})*rotation3dZ(${this.rotation.z.toPrecision(10.0)}) ${processedArgs.length > 0 ? ',' + processedArgs.join(",") : ""}), ${this.materialIndex.toPrecision(2)})`
    }
}

class RMSphere extends RMGeometry {
    constructor() {
      super("sdfSphere");
    }
  }
  
class RMBox extends RMGeometry {
    constructor() {
      super("sdfBox");
    }
}
  
class RMCylinderCapped extends RMGeometry {
    constructor() {
      super("sdCappedCylinder");
    }
}

export default RMGeometry
export {
    RMBox,
    RMSphere,
    RMCylinderCapped
}