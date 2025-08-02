import { createCountryBorders } from "#src/objects/borders"
import { createGlobe } from "#src/objects/globe"
import { createHexagonMesh } from "#src/objects/hexagons"
import { createStage } from "#src/stage"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { TextureLoader } from "three"

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

    let animationId: number

    const textureLoader = new TextureLoader()
    const earthTexture = textureLoader.load('/assets/earth.jpg')
    const earthBump = textureLoader.load('/assets/earth-topology.png')

    const stage = createStage(containerRef.current)
    const globe = createGlobe(earthTexture, earthBump)
    
    createCountryBorders(globe.geometry.parameters.radius * 1.001)
      .then(({ group: bordersGroup, countries }) => {
        stage.scene.add(bordersGroup)
        bordersGroup.userData.countries = countries
        bordersGroup.children.forEach(country => {
          country.userData.radius = globe.geometry.parameters.radius * 1.001
        })
        bordersGroup.children.forEach(country => {
          country.children.forEach(line => {
            line.userData.radius = globe.geometry.parameters.radius * 1.001
          })
        })
      })
    // const hexagons = createHexagonMesh(globe.geometry, 50000)
    // hexagons.setData(hexagons.generateMockPopulationData())

    stage.scene.add(globe.mesh)
    // stage.scene.add(hexagons.mesh)

    const update = () => {
      // globe.mesh.rotation.y += 0.0005
      // hexagons.mesh.rotation.y += 0.0005

      stage.update()

      animationId = requestAnimationFrame(update)
    }

    window.addEventListener("resize", stage.resize)

    stage.resize()
    update()

    return () => {
      window.removeEventListener("resize", stage.resize)

      cancelAnimationFrame(animationId)

      globe.dispose()
      // hexagons.dispose()
      stage.dispose()
      
      earthTexture.dispose()
      earthBump.dispose()
    }
  }, [hmrKey])

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
  )
}