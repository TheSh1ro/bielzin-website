<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{ source: string; champion: string }>()
const host = ref<HTMLDivElement>()
const loading = ref(true)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let disposed = false
let renderer: THREE.WebGLRenderer | undefined
let mixer: THREE.AnimationMixer | undefined
let model: THREE.Group | undefined
let observer: ResizeObserver | undefined
const championId = props.source.split('/').pop()?.replace('.glb', '') ?? ''
const framing: Record<string, { zoom: number; targetY: number }> = {
  kled: { zoom: 1.75, targetY: -0.18 },
  kayle: { zoom: 1.15, targetY: 0 },
}

// Prefer the resting loop, never an idle transition, spell or idle variation.
function idleClip(clips: THREE.AnimationClip[]) {
  const names = clips.map((clip) => ({
    clip,
    name: clip.name.replace(/\.anm$/i, '').toLowerCase(),
  }))
  return (
    names.find(({ name }) => /(^|_)idle_?0?1(?:_base|_raw)?$/.test(name)) ??
    names.find(({ name }) => /(^|_)idle(?:_base)?$/.test(name) || name === 'idlebase') ??
    names.find(({ name }) => name === 'idle0')
  )?.clip
}
function disposeModel(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>()
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value)
      }
      material.dispose()
    }
  })
  textures.forEach((texture) => {
    texture.dispose()
    if (texture.source.data instanceof ImageBitmap) texture.source.data.close()
  })
}
onMounted(async () => {
  try {
    const element = host.value!
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0, 0)
    renderer.domElement.setAttribute('aria-label', 'Modelo 3D animado de ' + props.champion)
    renderer.domElement.setAttribute('role', 'img')
    element.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100)
    const silhouette = new THREE.Vector3()
    const frame = () => {
      if (silhouette.y <= 0) return
      const { width, height } = element.getBoundingClientRect()
      const aspect = Math.max(width, 1) / Math.max(height, 1)
      // Identical silhouette margins, including broad champions and their weapons.
      const halfHeight =
        Math.max(silhouette.y / 0.84, silhouette.x / (aspect * 0.88)) /
        (2 * (framing[championId]?.zoom ?? 1))
      camera.left = -halfHeight * aspect
      camera.right = halfHeight * aspect
      camera.top = halfHeight
      camera.bottom = -halfHeight
      camera.updateProjectionMatrix()
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x829585, 2.5))
    const light = new THREE.DirectionalLight(0xffffff, 2)
    light.position.set(3, 5, 4)
    scene.add(light)
    const resize = () => {
      const { width, height } = element.getBoundingClientRect()
      renderer?.setSize(Math.max(width, 1), Math.max(height, 1))
      frame()
    }
    observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()
    const gltf = await new GLTFLoader().loadAsync(props.source)
    if (disposed) {
      disposeModel(gltf.scene)
      return
    }
    model = gltf.scene
    scene.add(model)
    const clip = idleClip(gltf.animations)
    mixer = new THREE.AnimationMixer(model)
    if (clip) mixer.clipAction(clip).play()
    // Some idle poses are authored facing sideways or away from the camera.
    const facing: Record<string, number> = {
      aatrox: 25,
      akali: 55,
      garen: 15,
      irelia: 25,
      jax: 30,
      nasus: 25,
      ryze: 30,
      sett: 35,
      shen: 35,
      tryndamere: 25,
      yone: 0,
      yorick: 20,
    }
    model.rotation.y = THREE.MathUtils.degToRad(facing[championId] ?? -15)

    // Fit the animated silhouette rather than the export's bind pose. Sampling
    // the full idle keeps breathing, weapons and tails inside the same frame.
    const bounds = new THREE.Box3()
    const vertex = new THREE.Vector3()
    const meshes: { mesh: THREE.Mesh; vertices: number[] }[] = []
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const geometry: THREE.BufferGeometry = object.geometry
      // Exports retain unused vertices from removed meshes. Including them
      // makes champions such as Akali and Gnar appear tiny and off-center.
      const vertices = geometry.index
        ? [...new Set(geometry.index.array)]
        : Array.from({ length: geometry.attributes.position!.count }, (_, index) => index)
      meshes.push({ mesh: object, vertices })
    })
    for (let sample = 0; sample < 16; sample++) {
      mixer.setTime(clip ? (clip.duration * sample) / 16 : 0)
      model.updateMatrixWorld(true)
      for (const { mesh, vertices } of meshes) {
        for (const index of vertices) {
          mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld)
          bounds.expandByPoint(vertex)
        }
      }
    }
    const center = bounds.getCenter(new THREE.Vector3())
    model.position.sub(center)
    bounds.getSize(silhouette)
    mixer.setTime(0)
    const distance = Math.max(silhouette.length() * 3, 1)
    camera.far = distance * 4
    const targetY = silhouette.y * (framing[championId]?.targetY ?? 0)
    camera.position.set(0, targetY, distance)
    camera.lookAt(0, targetY, 0)
    frame()
    loading.value = false
    let lastTime = performance.now()
    renderer.setAnimationLoop((time) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time
      if (document.hidden) return
      if (!reducedMotion) mixer?.update(delta)
      renderer?.render(scene, camera)
    })
  } catch {
    if (!disposed) loading.value = false
  }
})
onUnmounted(() => {
  disposed = true
  observer?.disconnect()
  renderer?.setAnimationLoop(null)
  mixer?.stopAllAction()
  if (model) {
    mixer?.uncacheRoot(model)
    disposeModel(model)
  }
  renderer?.dispose()
  renderer?.forceContextLoss()
})
</script>

<template>
  <div class="local-model" :aria-busy="loading">
    <div ref="host" class="canvas-host" />
  </div>
</template>

<style scoped>
.local-model {
  position: relative;
  pointer-events: none;
}
.canvas-host {
  width: 100%;
  height: 480px;
}
.canvas-host :deep(canvas) {
  display: block;
}
@media (max-width: 740px) {
  .canvas-host {
    height: 380px;
  }
}
</style>
