import { Color, Mesh, MeshPhongMaterial, SphereGeometry, Texture } from "three"
import { ColorsHexadecimal } from "#src/utils"
import { Stage } from "#src/stage"
import { Config } from "#src/config"

export const createGlobe = (stage: Stage, options: { map: Texture, bumpMap: Texture }) => {
  const geometry = new SphereGeometry(Config.globe.radius, 64, 64)
  const material = new MeshPhongMaterial({ 
    map: options.map,
    // bumpMap: options.bumpMap,
    // bumpScale: 1,
    specular: new Color(ColorsHexadecimal.Secondary).multiplyScalar(0.5),
    shininess: 5
  })

  const mesh = new Mesh(geometry, material)

  const dispose = () => {
    stage.group.remove(mesh)
    stage.events.removeEventListener("dispose", dispose)
    
    material.dispose()
    geometry.dispose()
  }
  
  stage.group.add(mesh)
  stage.events.addEventListener("dispose", dispose)

  // return { mesh, geometry }
}