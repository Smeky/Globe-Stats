import { Color, Mesh, MeshPhongMaterial, SphereGeometry, Texture } from "three"
import { ColorsHexadecimal } from "#src/utils"

export const createGlobe = (earthTexture: Texture, earthBump: Texture) => {
  const geometry = new SphereGeometry(1, 64, 64)
  const material = new MeshPhongMaterial({ 
    map: earthTexture,
    // bumpMap: earthBump,
    // bumpScale: 1,
    specular: new Color(ColorsHexadecimal.Secondary).multiplyScalar(0.5),
    shininess: 5
  })

  const mesh = new Mesh(geometry, material)

  const dispose= () => {
    material.dispose()
    geometry.dispose()
  }

  return { mesh, geometry,dispose }
}