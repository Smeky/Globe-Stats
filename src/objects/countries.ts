import { BufferGeometry, Line, LineBasicMaterial, Vector3, Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, DoubleSide, Vector2 } from "three"
import { Stage } from "#src/stage"
import { Country, CountryMap, MultiPolygonCoords, PolygonCoords } from "#src/countries"
import Config from "#src/config"

type ExtendedCountry = Country & {
  group: Group,
  lines: Line[],
  shapes: Mesh[]
}

const lonLatToVector3 = (lon: number, lat: number) => {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  const radius = Config.globe.radius * 1.001

  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
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
    previousCountry.lines.forEach(line => {
      const material = line.material as LineBasicMaterial
      material.color.set(0xff0000)
      material.opacity = 0.6
    })
  }

  if (country) {
    country.lines.forEach(line => {
      const material = line.material as LineBasicMaterial
      material.color.set(0xffffff)
      material.opacity = 1
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
      const points = coords.map(([lon, lat]) => lonLatToVector3(lon, lat))

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

    group.userData = { iso3: country.iso3 }
    borderGroup.add(group)

    extendedCountries.set(country.iso3, {
      ...country,
      group,
      lines,
      shapes
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
