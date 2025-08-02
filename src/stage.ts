import { AmbientLight, Color, DirectionalLight, EventDispatcher, Group, PerspectiveCamera, Scene, WebGLRenderer } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

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

  const group = new Group() // Root group for objects (receives rotation, etc.)
  scene.add(group)

  const update = () => {
    // group.rotation.y += 0.001

    controls.update()
    renderer.render(scene, camera)
  }

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  const dispose = () => {
    containerEl.removeChild(renderer.domElement)

    events.dispatchEvent({ type: "dispose" })

    controls.dispose()
    renderer.dispose()
  }

  return { scene, camera, renderer, controls, events, lights, group, update, resize, dispose }
}