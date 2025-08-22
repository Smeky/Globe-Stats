import { BufferGeometry, Line, LineBasicMaterial, Vector3, Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, DoubleSide, Vector2 } from "three"
import { Stage } from "#src/stage"
import { Country, CountryMap, MultiPolygonCoords, PolygonCoords } from "#src/countries/utils"
import { Config } from "#src/config"
import { CSS2DObject } from "three/examples/jsm/Addons.js"
import { lonLatToVector3 } from "#src/math"

type ExtendedCountry = Country & {
  group: Group,
  lines: Line[],
  shapes: Mesh[],
  label: CSS2DObject,
}

// const getCountryCenter = (country: Country): Vector3 => {
//   const getPolygonArea = (coords: PolygonCoords): number => {
//     let area = 0
//     for (let i = 0; i < coords.length - 1; i++) {
//       area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1]
//     }
//     return Math.abs(area / 2)
//   }

//   const getCentroid = (coords: PolygonCoords): [number, number] => {
//     let cx = 0, cy = 0, area = 0
//     for (let i = 0; i < coords.length - 1; i++) {
//       const cross = coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1]
//       cx += (coords[i][0] + coords[i + 1][0]) * cross
//       cy += (coords[i][1] + coords[i + 1][1]) * cross
//       area += cross
//     }
//     area /= 2
//     return [cx / (6 * area), cy / (6 * area)]
//   }

//   let largestPolygon: PolygonCoords | null = null
//   let largestArea = 0

//   if (country.geometry.type === "Polygon") {
//     country.geometry.coordinates.forEach(ring => {
//       const area = getPolygonArea(ring)
//       if (area > largestArea) {
//         largestArea = area
//         largestPolygon = ring
//       }
//     })
//   } else {
//     country.geometry.coordinates.forEach(polygon => {
//       polygon.forEach(ring => {
//         const area = getPolygonArea(ring)
//         if (area > largestArea) {
//           largestArea = area
//           largestPolygon = ring
//         }
//       })
//     })
//   }

//   if (!largestPolygon) {
//     // Fallback to simple average if something goes wrong
//     const firstCoords = country.geometry.type === "Polygon" 
//       ? country.geometry.coordinates[0]
//       : country.geometry.coordinates[0][0]
//     const mid = Math.floor(firstCoords.length / 2)
//     const coord = firstCoords[mid]
//     let lon: number, lat: number
//     if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === "number" && typeof coord[1] === "number") {
//       lon = coord[0]
//       lat = coord[1]
//     } else {
//       lon = 0
//       lat = 0
//     }
//     return lonLatToVector3(lon, lat)
//   }

//   const [lon, lat] = getCentroid(largestPolygon)
//   return lonLatToVector3(lon, lat)
// }

const createCountryLabel = (country: Country): CSS2DObject => {
  const labelDiv = document.createElement("div")
  labelDiv.textContent = country.name
  labelDiv.style.color = "white"
  labelDiv.style.fontSize = "22px"
  labelDiv.style.fontFamily = "sans-serif"
  labelDiv.style.padding = "4px 8px"
  labelDiv.style.background = "rgba(0, 0, 0, 0.5)"
  labelDiv.style.borderRadius = "4px"
  labelDiv.style.whiteSpace = "nowrap"

  const label = new CSS2DObject(labelDiv)
  label.position.copy(country.center)
  label.visible = false

  return label
}

const createBorderLine = (points: Vector3[], material: LineBasicMaterial) => {
  const geometry = new BufferGeometry().setFromPoints(points)
  return new Line(geometry, material.clone())
}

const createInvisibleShape = (points: Vector3[], iso3: string) => {
  const shape = new Shape()
  const projectedPoints = points.map(p => {
    const projected = p.clone().normalize().multiplyScalar(Config.globe.radius)
    return new Vector2(
      Math.atan2(projected.z, projected.x),
      Math.asin(projected.y / Config.globe.radius)
    )
  })

  projectedPoints.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, p.y)
    else shape.lineTo(p.x, p.y)
  })
  shape.closePath()

  const geometry = new ShapeGeometry(shape)
  const positions = geometry.attributes.position

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const theta = x
    const phi = Math.PI / 2 - y
    const radius = Config.globe.radius * 1.001

    positions.setXYZ(
      i,
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    )
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()

  const mesh = new Mesh(geometry, new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: DoubleSide
  }))
  mesh.userData = { iso3 }

  return mesh
}

const highlightCountry = (country: ExtendedCountry | null, previousCountry: ExtendedCountry | null) => {
  if (previousCountry) {
    previousCountry.label.visible = false
    previousCountry.lines.forEach(line => {
      const material = line.material as LineBasicMaterial
      material.color.set(0xff0000)
      material.opacity = 0.6
      material.depthTest = true
      line.renderOrder = 0
    })
  }

  if (country) {
    country.label.visible = true
    country.lines.forEach(line => {
      const material = line.material as LineBasicMaterial
      material.color.set(0xffffff)
      material.opacity = 1
      material.depthTest = false
      line.renderOrder = 100
    })
  }
}

export const createCountryShapes = async (stage: Stage, countries: CountryMap) => {
  const borderGroup = new Group()
  const extendedCountries = new Map<string, ExtendedCountry>()
  let currentHighlight: ExtendedCountry | null = null

  const lineMaterial = new LineBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.6
  })

  countries.forEach((country: Country) => {
    const group = new Group()
    const lines: Line[] = []
    const shapes: Mesh[] = []

    const processCoords = (coords: PolygonCoords | MultiPolygonCoords) => {
      const points = coords.map(([lon, lat]) => lonLatToVector3(lon, lat, Config.globe.radius * 1.001))

      const line = createBorderLine(points, lineMaterial)
      lines.push(line)
      group.add(line)

      const shape = createInvisibleShape(points, country.iso3)
      shapes.push(shape)
      group.add(shape)
    }

    if (country.geometry.type === "Polygon") {
      country.geometry.coordinates.forEach(processCoords)
    } else if (country.geometry.type === "MultiPolygon") {
      country.geometry.coordinates.forEach(polygon =>
        polygon.forEach(processCoords)
      )
    }

    const label = createCountryLabel(country)
    group.add(label)

    group.userData = { iso3: country.iso3 }
    borderGroup.add(group)

    extendedCountries.set(country.iso3, {
      ...country,
      group,
      lines,
      shapes,
      label,
    })
  })

  const checkIntersections = () => {
    const allShapes: Mesh[] = []
    extendedCountries.forEach(country => allShapes.push(...country.shapes))

    const intersects = stage.raycaster.intersectObjects(allShapes, false)

    if (intersects.length > 0) {
      const iso3 = intersects[0].object.userData.iso3
      const newHighlight = extendedCountries.get(iso3) || null

      if (newHighlight !== currentHighlight) {
        highlightCountry(newHighlight, currentHighlight)
        currentHighlight = newHighlight
      }
    } else if (currentHighlight) {
      highlightCountry(null, currentHighlight)
      currentHighlight = null
    }
  }

  const onPointerMove = () => checkIntersections()

  const dispose = () => {
    stage.events.removeEventListener("pointermove", onPointerMove)
    stage.group.remove(borderGroup)
    stage.events.removeEventListener("dispose", dispose)
  }

  stage.group.add(borderGroup)
  stage.events.addEventListener("pointermove", onPointerMove)
  stage.events.addEventListener("dispose", dispose)
}
