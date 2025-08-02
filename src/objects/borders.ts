import { BufferGeometry, Line, LineBasicMaterial, Vector3, Group, Raycaster, Vector2 } from "three"
import { Stage } from "#src/stage"
import Config from "#src/config"

export const createCountryBorders = async (stage: Stage) => {
  const response = await fetch("https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson")
  const geoData = await response.json()
  
  const borderGroup = new Group()
  const countryMeshes = new Map()
  const lineMaterial = new LineBasicMaterial({ 
    color: 0xff0000,
    transparent: true,
    opacity: 0.6
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
    const countryLines = new Group()
    
    const processCoordinates = (coords: number[][]) => {
      const points = coords.map(([lon, lat]) => lonLatToVector3(lon, lat))
      const lineGeometry = new BufferGeometry().setFromPoints(points)
      const line = new Line(lineGeometry, lineMaterial)
      countryLines.add(line)
    }
    
    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach(processCoordinates)
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach(processCoordinates)
      })
    }
    
    countryLines.userData = {
      name: feature.properties.name,
      iso3: feature.properties.iso_a3
    }

    countryMeshes.set(feature.properties.iso_a3, countryLines)
    borderGroup.add(countryLines)
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

  // Add after borderGroup creation
  const raycaster = new Raycaster()
  const mouse = new Vector2()

  // Add after countryMeshes setup
  const onMouseMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, stage.camera)
    const intersects = raycaster.intersectObjects(borderGroup.children, false)

    if (intersects.length > 0) {
      const country = intersects[0].object.parent
      if (country?.userData.iso3) {
        highlight(country.userData.iso3)
      }
    } else {
      highlight("")
    }
  }

  window.addEventListener("mousemove", onMouseMove)

  const dispose = () => {
    window.removeEventListener("mousemove", onMouseMove)
    stage.group.remove(borderGroup)
    stage.events.removeEventListener("dispose", dispose)
  }

  stage.group.add(borderGroup)
  stage.events.addEventListener("dispose", dispose)
}
