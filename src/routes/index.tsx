import { loadCountries } from "#src/countries/utils"
import { createCountryShapes } from "#src/countries/object"
import { createGlobe } from "#src/objects/globe"
import { createStage } from "#src/stage"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { TextureLoader, Vector3 } from "three"
import { Config } from "#src/config"
import { createHexagonMesh } from "#src/objects/hexagons"
import { loadPopulationData } from "#src/data/population"

const generateGoldenSpiralPositions = (count: number, radius: number): Vector3[] => {
 const positions: Vector3[] = []
 const goldenRatio = (1 + Math.sqrt(5)) / 2
 const angleIncrement = Math.PI * 2 * goldenRatio

 for (let i = 0; i < count; i++) {
   const t = i / count
   const inclination = Math.acos(1 - 2 * t)
   const azimuth = angleIncrement * i

   const x = Math.sin(inclination) * Math.cos(azimuth)
   const y = Math.sin(inclination) * Math.sin(azimuth)
   const z = Math.cos(inclination)

   positions.push(new Vector3(x, y, z).multiplyScalar(radius))
 }
 
 return positions
}

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hmrKey, setHmrKey] = useState(0)

  useEffect(() => {
    if (import.meta.env.DEV && import.meta.hot) {
      import.meta.hot.accept(() => {
        setHmrKey(prev => prev + 1)
      })
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const textureLoader = new TextureLoader()
    const earthTexture = textureLoader.load("/assets/earth.jpg")
    const earthBump = textureLoader.load("/assets/earth-topology.png")

    const stage = createStage(containerRef.current)
    stage.camera.zoom = 2.0
    // stage.controls.autoRotate = true
    // stage.controls.autoRotateSpeed = 1.5

    const pointCount = 200000
    const countries = loadCountries()
    const positions = generateGoldenSpiralPositions(pointCount, 1.001 * Config.globe.radius)
    const hexagons = createHexagonMesh(stage, { positions })

    loadPopulationData("/data/pop_aggregated_2020.tif", positions, Config.globe.radius)
      .then(data => hexagons.setData(data))
    
    createGlobe(stage, { map: earthTexture, bumpMap: earthBump })
    createCountryShapes(stage, countries)

    let animationId: number

    const update = () => {
      stage.update()
      animationId = requestAnimationFrame(update)
    }

    window.addEventListener("resize", stage.resize)

    stage.resize()
    update()

    return () => {
      window.removeEventListener("resize", stage.resize)

      cancelAnimationFrame(animationId)

      stage.dispose()
      
      earthTexture.dispose()
      earthBump.dispose()
    }
  }, [hmrKey])

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
  )
}