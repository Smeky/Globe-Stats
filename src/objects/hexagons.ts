import { CylinderGeometry, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshPhongMaterial, Vector3 } from "three"
import { Stage } from "#src/stage"

export const createHexagonMesh = (stage: Stage, options: { positions: Vector3[] }) => {
  const hexGeometry = new CylinderGeometry(0.002, 0.002, 1, 6)
  hexGeometry.rotateX(Math.PI / 2)

  const material = new MeshPhongMaterial({
    vertexColors: true,
    // @ts-expect-error - this is correct but types seem outdated / incorrect
    onBeforeCompile: (shader) => {
      /**
       * Modify default shader to skip rendering of hexagons. The visibility
       * is set depending on the
       */
      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_pars_vertex>',
        `#include <color_pars_vertex>
        attribute float visibility;
        varying float vVisibility;`
      )
      
      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_vertex>',
        `#include <color_vertex>
        vVisibility = visibility;`
      )
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_pars_fragment>',
        `#include <color_pars_fragment>
        varying float vVisibility;`
      )
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `if (vVisibility < 1.0) discard;
        #include <color_fragment>`
      )
    }
  })

  const mesh = new InstancedMesh(hexGeometry, material, options.positions.length)
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)
  mesh.instanceMatrix.needsUpdate = true

  const matrix = new Matrix4()

  // Initialize with provided positions
  for (let i = 0; i < options.positions.length; i++) {
    const pos = options.positions[i]
    const dummy = pos.clone().multiplyScalar(1.01)
    matrix.lookAt(dummy, new Vector3(0, 0, 0), new Vector3(0, 1, 0))
    matrix.setPosition(dummy)
    mesh.setMatrixAt(i, matrix)
  }
  
  const setData = (data: number[]) => {
    const colorArray = new Float32Array(options.positions.length * 3)
    const visibilityArray = new Float32Array(options.positions.length)
    const baseColor = { r: 1, g: 1, b: 180 / 255 }
    // const baseColor = { r: 0, g: 0, b: 0 }

    data.forEach((value, i) => {
      if (i >= options.positions.length) return
      if (isNaN(value)) value = 0

      visibilityArray[i] = value > 0 ? 1 : 0

      matrix.lookAt(options.positions[i], new Vector3(0, 0, 0), new Vector3(0, 1, 0))
      matrix.setPosition(options.positions[i])

      const scale = new Vector3(1, 1, value * 0.35)
      matrix.scale(scale)

      mesh.setMatrixAt(i, matrix)

      const t = Math.pow(Math.min(value, 1) * 1.8, 0.5)
      colorArray[i * 3] = baseColor.r + (1 - baseColor.r) * t
      colorArray[i * 3 + 1] = baseColor.g * (1 - t)
      colorArray[i * 3 + 2] = baseColor.b * (1 - t)
    })

    mesh.instanceMatrix.needsUpdate = true
    mesh.geometry.setAttribute("color", new InstancedBufferAttribute(colorArray, 3))
    mesh.geometry.setAttribute("visibility", new InstancedBufferAttribute(visibilityArray, 1))
  }

  const dispose = () => {
    stage.group.remove(mesh)
    stage.events.removeEventListener("dispose", dispose)

    hexGeometry.dispose()
    material.dispose()
  }

  stage.group.add(mesh)
  stage.events.addEventListener("dispose", dispose)

  return { setData }
}
