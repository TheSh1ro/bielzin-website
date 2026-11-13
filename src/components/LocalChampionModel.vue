<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const props = defineProps<{ source: string; champion: string }>()
const host = ref<HTMLDivElement>()
const status = ref('Carregando modelo…')
const animations = ref<string[]>([])
const selected = ref('')
const paused = ref(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
let disposed = false
let renderer: THREE.WebGLRenderer | undefined
let controls: OrbitControls | undefined
let mixer: THREE.AnimationMixer | undefined
let model: THREE.Group | undefined
let clips: THREE.AnimationClip[] = []
let observer: ResizeObserver | undefined

function play() {
  if (!mixer) return
  mixer.stopAllAction()
  const clip = clips.find((clip) => clip.name === selected.value)
  if (clip) mixer.clipAction(clip).reset().play()
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
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x829585, 2.5))
    const light = new THREE.DirectionalLight(0xffffff, 2)
    light.position.set(3, 5, 4)
    scene.add(light)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    const resize = () => {
      const { width, height } = element.getBoundingClientRect()
      renderer?.setSize(width, height)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
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
    clips = gltf.animations
    animations.value = clips.map((clip) => clip.name)
    selected.value = clips.find((clip) => /idle1/i.test(clip.name))?.name ?? clips[0]?.name ?? ''
    mixer = new THREE.AnimationMixer(model)
    play()
    mixer.update(0)
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    model.position.sub(center)
    const distance =
      (Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)))) *
      1.25
    camera.far = distance * 20
    camera.position.set(0, size.y * 0.08, distance)
    camera.updateProjectionMatrix()
    controls.target.set(0, 0, 0)
    controls.minDistance = distance * 0.45
    controls.maxDistance = distance * 2
    controls.update()
    status.value = ''
    let lastTime = performance.now()
    renderer.setAnimationLoop((time) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time
      if (document.hidden) return
      if (!paused.value) mixer?.update(delta)
      controls?.update()
      renderer?.render(scene, camera)
    })
  } catch {
    if (!disposed) status.value = 'O modelo 3D está indisponível.'
  }
})
onUnmounted(() => {
  disposed = true
  observer?.disconnect()
  renderer?.setAnimationLoop(null)
  controls?.dispose()
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
  <div class="local-model">
    <div ref="host" class="canvas-host" />
    <p v-if="status" class="model-status" role="status">{{ status }}</p>
    <div v-if="animations.length" class="model-controls">
      <label
        ><span class="sr-only">Animação de {{ champion }}</span>
        <select v-model="selected" @change="play">
          <option v-for="name in animations" :key="name" :value="name">
            {{ name.replace(/\.anm$/i, '').replace(/^fiora_/i, '') }}
          </option>
        </select>
      </label>
      <button type="button" :aria-pressed="paused" @click="paused = !paused">
        {{ paused ? 'Reproduzir' : 'Pausar' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.local-model {
  position: relative;
}
.canvas-host {
  width: 100%;
  height: 480px;
  touch-action: none;
}
.canvas-host :deep(canvas) {
  display: block;
}
.model-status {
  position: absolute;
  inset: 45% 0 auto;
  text-align: center;
  color: var(--riven-muted);
}
.model-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  font-size: 0.75rem;
}
select {
  max-width: 220px;
  padding: 6px;
  color: var(--riven-green);
  background: #101512;
  border: 1px solid var(--riven-line);
}
button {
  color: var(--riven-green);
}
@media (max-width: 740px) {
  .canvas-host {
    height: 380px;
  }
}
</style>
