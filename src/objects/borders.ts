import { BufferGeometry, Line, LineBasicMaterial, Vector3, Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, DoubleSide, Vector2 } from "three"
import { Stage } from "#src/stage"
import Config from "#src/config"

import BorderData from "../../data/country-borders.json"

export const createCountryBorders = async (stage: Stage) => {
  const geoData = BorderData
  
  const borderGroup = new Group()
  const countryMeshes = new Map()
  const countryShapes = new Map()
  
  const lineMaterial = new LineBasicMaterial({ 
    color: 0xff0000,
    transparent: true,
    opacity: 0.6
  })
  
  const invisibleMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: DoubleSide
  })
  
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
  
  geoData.features.forEach((feature: any) => {
    const geometry = feature.geometry
    const countryGroup = new Group()
    const shapeGroup = new Group()
    
    const processCoordinates = (coords: number[][]) => {
      const points = coords.map(([lon, lat]) => lonLatToVector3(lon, lat))
      
      // Create line for border
      const lineGeometry = new BufferGeometry().setFromPoints(points)
      const line = new Line(lineGeometry, lineMaterial.clone())
      countryGroup.add(line)
      
      // Create invisible mesh for hover detection
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
      
      const shapeGeometry = new ShapeGeometry(shape)
      const positions = shapeGeometry.attributes.position
      
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
      shapeGeometry.computeVertexNormals()
      
      const shapeMesh = new Mesh(shapeGeometry, invisibleMaterial)
      shapeMesh.userData = {
        name: feature.properties.name,
        iso3: feature.properties.iso_a3
      }
      shapeGroup.add(shapeMesh)
    }
    
    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach(processCoordinates)
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach(processCoordinates)
      })
    }
    
    countryGroup.userData = {
      name: feature.properties.name,
      iso3: feature.properties.iso_a3
    }

    countryMeshes.set(feature.properties.iso_a3, countryGroup)
    countryShapes.set(feature.properties.iso_a3, shapeGroup)
    borderGroup.add(countryGroup)
    borderGroup.add(shapeGroup)
  })

  const highlight = (iso3: string) => {
    countryMeshes.forEach((country, key) => {
      country.children.forEach((line: Line) => {
        const material = line.material as LineBasicMaterial
        if (key === iso3) {
          material.color.set(0xffffff)
          material.opacity = 1
        } else {
          material.color.set(0xff0000)
          material.opacity = 0.6
        }
      })
    })
  }

  const checkIntersections = () => {
    const shapeMeshes: Mesh[] = []
    countryShapes.forEach(group => {
      group.children.forEach(child => {
        if (child instanceof Mesh) shapeMeshes.push(child)
      })
    })
    
    const intersects = stage.raycaster.intersectObjects(shapeMeshes, false)
    
    if (intersects.length > 0) {
      const hit = intersects[0].object
      if (hit.userData.iso3) {
        highlight(hit.userData.iso3)
      }
    } else {
      highlight("")
    }
  }

  const onPointerMove = () => checkIntersections()
  stage.events.addEventListener("pointermove", onPointerMove)

  const dispose = () => {
    stage.events.removeEventListener("pointermove", onPointerMove)
    stage.group.remove(borderGroup)
    stage.events.removeEventListener("dispose", dispose)
  }

  stage.group.add(borderGroup)
  stage.events.addEventListener("dispose", dispose)
}
