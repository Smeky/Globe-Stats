import { createCountryBorders } from "#src/objects/borders"
import { createGlobe } from "#src/objects/globe"
// import { createHexagonMesh } from "#src/objects/hexagons"
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
    
    createGlobe(stage, { map: earthTexture, bumpMap: earthBump })
    createCountryBorders(stage)

    // const hexagons = createHexagonMesh(stage, { count: 100000 })
    // hexagons.setData(hexagons.generateMockPopulationData())

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