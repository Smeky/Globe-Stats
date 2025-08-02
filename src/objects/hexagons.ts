import { Stage } from "#src/stage"
import { Color, CylinderGeometry, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshPhongMaterial, Vector3 } from "three"
import Config from "#src/config"

export const createHexagonMesh = (stage: Stage, options: { count: number }) => {
  const hexGeometry = new CylinderGeometry(0.002, 0.002, 1, 6)
  hexGeometry.rotateX(Math.PI / 2)

  const material = new MeshPhongMaterial({
    vertexColors: true
  })

  const mesh = new InstancedMesh(hexGeometry, material, options.count)
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)
  mesh.instanceMatrix.needsUpdate = true

  const matrix = new Matrix4()
  const positions: Vector3[] = []
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  const angleIncrement = Math.PI * 2 * goldenRatio

  // Initialize with even distribution
  for (let i = 0; i < options.count; i++) {
    const t = i / options.count
    const inclination = Math.acos(1 - 2 * t)
    const azimuth = angleIncrement * i

    const x = Math.sin(inclination) * Math.cos(azimuth)
    const y = Math.sin(inclination) * Math.sin(azimuth)
    const z = Math.cos(inclination)

    const pos = new Vector3(x, y, z).multiplyScalar(Config.globe.radius)
    positions.push(pos)

    const dummy = pos.clone().multiplyScalar(1.01)
    matrix.lookAt(dummy, new Vector3(0, 0, 0), new Vector3(0, 1, 0))
    matrix.setPosition(dummy)

    mesh.setMatrixAt(i, matrix)
  }

  const setData = (data: number[]) => {
    const colorArray = new Float32Array(options.count * 3)

    data.forEach((value, i) => {
      if (i >= options.count) return

      matrix.lookAt(positions[i], new Vector3(0, 0, 0), new Vector3(0, 1, 0))
      matrix.setPosition(positions[i])

      const scale = new Vector3(1, 1, value)
      matrix.scale(scale)

      mesh.setMatrixAt(i, matrix)

      const hue = value * 0.3
      const color = new Color().setHSL(hue, 0.8, 0.5)
      colorArray[i * 3] = color.r
      colorArray[i * 3 + 1] = color.g
      colorArray[i * 3 + 2] = color.b
    })

    mesh.instanceMatrix.needsUpdate = true
    mesh.geometry.setAttribute('color', new InstancedBufferAttribute(colorArray, 3))
  }

  const generateMockPopulationData = (): number[] => {
    const data = new Array(options.count).fill(0)

    // Define population centers (lat, lon in radians)
    const centers = [
      { lat: 0.87, lon: 0.35, intensity: 0.9 },  // Europe
      { lat: 0.65, lon: 1.75, intensity: 0.85 }, // East Asia
      { lat: 0.55, lon: -1.4, intensity: 0.8 },  // North America East
      { lat: 0.35, lon: 1.3, intensity: 0.75 },  // South Asia
      { lat: -0.4, lon: -1.0, intensity: 0.7 },  // South America
      { lat: -0.5, lon: 2.5, intensity: 0.65 },  // Southeast Asia
      { lat: 0.0, lon: 0.6, intensity: 0.6 },    // Africa
    ]

    for (let i = 0; i < options.count; i++) {
      const pos = positions[i]
      
      // Convert to spherical coordinates
      const lat = Math.asin(pos.y)
      const lon = Math.atan2(pos.x, pos.z)
      
      let maxInfluence = 0
      
      for (const center of centers) {
        // Calculate great circle distance
        const dLat = lat - center.lat
        const dLon = lon - center.lon
        const a = Math.sin(dLat/2) ** 2 + Math.cos(lat) * Math.cos(center.lat) * Math.sin(dLon/2) ** 2
        const distance = 3 * Math.asin(Math.sqrt(a))
        
        // Gaussian falloff
        const influence = center.intensity * Math.exp(-distance * distance * 20)
        maxInfluence = Math.max(maxInfluence, influence)
      }
      
      // Add small random variation
      data[i] = maxInfluence
    }
    
    return data
  }

  const dispose = () => {
    stage.group.remove(mesh)
    stage.events.removeEventListener("dispose", dispose)

    hexGeometry.dispose()
    material.dispose()
  }

  stage.group.add(mesh)
  stage.events.addEventListener("dispose", dispose)

  return { setData, generateMockPopulationData}
}
