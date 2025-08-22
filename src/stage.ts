import { AmbientLight, Color, DirectionalLight, EventDispatcher, Group, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js"

export type Stage = ReturnType<typeof createStage>
export type StageEvents<T extends string = string> = {
  [K in T]: { type: K, data?: any }
}

export const createStage = (containerEl: HTMLDivElement) => {
  const scene = new Scene()
  scene.background = new Color(0x0a0a0a)

  const camera = new PerspectiveCamera()
  camera.position.z = 5

  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  containerEl.appendChild(renderer.domElement)

  const cssRenderer = new CSS2DRenderer()
  cssRenderer.setSize(window.innerWidth, window.innerHeight)
  cssRenderer.domElement.style.position = "absolute"
  cssRenderer.domElement.style.top = "0"
  cssRenderer.domElement.style.pointerEvents = "none"
  containerEl.appendChild(cssRenderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  const lights = {
    ambient: new AmbientLight(0xffffff, 0.6),
    directional: new DirectionalLight(0xffffff, 0.8),
  }

  lights.directional.position.set(5, 5, 5)
  scene.add(lights.ambient)
  scene.add(lights.directional)

  const events = new EventDispatcher<StageEvents>()

  const group = new Group()
  scene.add(group)

  const raycaster = new Raycaster()
  const mouse = new Vector2()

  const handlePointerMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)

    events.dispatchEvent({ type: "pointermove", data: event })
  }

  window.addEventListener("pointermove", handlePointerMove)

  const update = () => {
    controls.update()
    renderer.render(scene, camera)
    cssRenderer.render(scene, camera)
  }

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    cssRenderer.setSize(window.innerWidth, window.innerHeight)
  }

  const dispose = () => {
    window.removeEventListener("pointermove", handlePointerMove)
    containerEl.removeChild(renderer.domElement)
    containerEl.removeChild(cssRenderer.domElement)

    events.dispatchEvent({ type: "dispose" })

    controls.dispose()
    renderer.dispose()
  }

  return { scene, camera, renderer, cssRenderer, controls, events, lights, group, raycaster, update, resize, dispose }
}
