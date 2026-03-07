'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getLocalProject, listLocalProjects, type LocalProject } from '@/lib/projects/localProjects'
import { listDeviceProjects } from '@/lib/projects/deviceProjects'
import { Capacitor } from '@capacitor/core'

function Demo3DContent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const searchParams = useSearchParams()
  const [projectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    let cancelled = false

    const resolveProject = async (): Promise<LocalProject | null> => {
      const id = searchParams.get('id') ?? ''
      const name = searchParams.get('name') ?? ''
      if (id) {
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          try {
            const dev = await Promise.race([listDeviceProjects(), new Promise<LocalProject[]>(r => setTimeout(() => r([]), 5000))])
            const found = dev.find((p) => p.id === id) ?? null
            if (found) return found
          } catch {}
        }
        const local = getLocalProject(id)
        return local
      }
      if (name) {
        const trimmed = name.trim()
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          try {
            const dev = await Promise.race([listDeviceProjects(), new Promise<LocalProject[]>(r => setTimeout(() => r([]), 5000))])
            const fromDevice = dev.find((p) => p.name.trim() === trimmed) ?? null
            if (fromDevice) return fromDevice
          } catch {}
        }
        const local = listLocalProjects().find((p) => p.name.trim() === trimmed) ?? null
        if (local) return local
      }
      return null
    }

    const init = async (project: LocalProject | null) => {
      if (cancelled || !containerRef.current) return
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x87ceeb)

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
      camera.position.set(8, 6, 8)
      camera.lookAt(0, 1.5, 0)

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.minDistance = 4
      controls.maxDistance = 25
      controls.target.set(0, 1.5, 0)

      const ambient = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambient)
      const sun = new THREE.DirectionalLight(0xfff5e6, 0.9)
      sun.position.set(10, 15, 10)
      sun.castShadow = true
      sun.shadow.mapSize.width = 1024
      sun.shadow.mapSize.height = 1024
      scene.add(sun)

      const concreteMat = new THREE.MeshStandardMaterial({
        color: 0x9e9e9e,
        roughness: 0.9,
        metalness: 0.05,
      })
      const brickCanvas = document.createElement('canvas')
      brickCanvas.width = 256
      brickCanvas.height = 128
      const ctx = brickCanvas.getContext('2d')!
      ctx.fillStyle = '#8b4513'
      ctx.fillRect(0, 0, 256, 128)
      ctx.strokeStyle = '#6b3410'
      ctx.lineWidth = 2
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 8; col++) {
          const x = col * 34 + (row % 2) * 17
          const y = row * 34
          ctx.strokeRect(x + 2, y + 2, 30, 30)
        }
      }
      const brickTex = new THREE.CanvasTexture(brickCanvas)
      brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping
      brickTex.repeat.set(3, 2)
      const brickMat = new THREE.MeshStandardMaterial({
        map: brickTex,
        roughness: 0.85,
        metalness: 0.05,
      })
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        roughness: 0.8,
        metalness: 0.1,
      })

      const data = project?.data as Record<string, unknown> | undefined
      const hasLeftBackRight = data && typeof data.left === 'number' && typeof data.back === 'number' && typeof data.right === 'number'
      const hasWidthLength = data && typeof data.width === 'number' && typeof data.length === 'number'
      const projectType: 'walls_2' | 'walls_3' | 'walls_4' | null =
        project?.type === 'walls_2' || project?.type === 'walls_3' || project?.type === 'walls_4'
          ? project.type
          : hasLeftBackRight
            ? 'walls_3'
            : hasWidthLength
              ? 'walls_4'
              : null
      const isWalls4 = projectType === 'walls_4'
      const isWalls2 = projectType === 'walls_2'
      const isWalls3 = projectType === 'walls_3'
      let FOUNDATION_H = 0.3
      let W = 5
      let L = 5
      let H = 2.7
      let WALL_T = 0.25
      let foundationW = W + 0.4
      let foundationL = L + 0.4
      let foundationX = 0
      let foundationZ = 0
      let back = 5
      let left = 5
      let right = 5

      if (isWalls4 && project) {
        const d = project.data as { width: number; length: number; height: number; thickness: number }
        W = Number(d.width) || 5
        L = Number(d.length) || 5
        H = Number(d.height) || 2.7
        WALL_T = Number(d.thickness) || 0.25
        const f = project.foundation as { width?: number; length?: number; height?: number; thickness?: number } | undefined
        if (f && Number(f.width) > 0 && Number(f.length) > 0 && Number(f.height) > 0) {
          foundationW = Number(f.width)
          foundationL = Number(f.length)
          FOUNDATION_H = Number(f.height)
        } else {
          foundationW = W + 2 * WALL_T + 0.2
          foundationL = L + 2 * WALL_T + 0.2
        }
      } else if (isWalls2 && project) {
        const d = project.data as { width: number; length: number; height: number; thickness: number }
        W = Number(d.width) || 5
        L = Number(d.length) || 5
        H = Number(d.height) || 2.7
        WALL_T = Number(d.thickness) || 0.25
        const f = project.foundation as { width?: number; length?: number; height?: number } | undefined
        if (f && Number(f.width) > 0 && Number(f.length) > 0 && Number(f.height) > 0) {
          foundationW = Number(f.width)
          foundationL = Number(f.length)
          FOUNDATION_H = Number(f.height)
        } else {
          foundationW = W + WALL_T
          foundationL = L + WALL_T
        }
        foundationX = foundationW / 2
        foundationZ = foundationL / 2
      } else if (isWalls3 && project) {
        const d = project.data as { left: number; back: number; right: number; height: number; thickness: number }
        left = Number(d.left) || 5
        back = Number(d.back) || 5
        right = Number(d.right) || 5
        H = Number(d.height) || 2.7
        WALL_T = Number(d.thickness) || 0.25
        const f = project.foundation as { left?: number; back?: number; right?: number; height?: number } | undefined
        if (f && Number(f.back) > 0 && Number(f.left) > 0 && Number(f.right) > 0 && Number(f.height) > 0) {
          foundationW = Number(f.back) + 2 * WALL_T
          foundationL = Math.max(Number(f.left), Number(f.right)) + 2 * WALL_T
          FOUNDATION_H = Number(f.height)
        } else {
          foundationW = back + 2 * WALL_T
          foundationL = Math.max(left, right) + 2 * WALL_T
        }
        foundationX = back / 2
        foundationZ = -foundationL / 2 + WALL_T
      }

      const foundationGeom = new THREE.BoxGeometry(foundationW, FOUNDATION_H, foundationL)
      const foundation = new THREE.Mesh(foundationGeom, concreteMat)
      foundation.position.set(foundationX, FOUNDATION_H / 2, foundationZ)
      foundation.receiveShadow = true
      scene.add(foundation)

      function addWall(x: number, z: number, w: number, d: number, h: number) {
        const geom = new THREE.BoxGeometry(w, h, d)
        const wall = new THREE.Mesh(geom, brickMat)
        wall.position.set(x, FOUNDATION_H + h / 2, z)
        wall.castShadow = true
        wall.receiveShadow = true
        scene.add(wall)
      }

      if (isWalls2) {
        addWall(W / 2, WALL_T / 2, W, WALL_T, H)
        addWall(W - WALL_T / 2, L / 2, WALL_T, L, H)
      } else if (isWalls3) {
        addWall(back / 2, WALL_T / 2, back, WALL_T, H)
        addWall(WALL_T / 2, -left / 2, WALL_T, left, H)
        addWall(back - WALL_T / 2, -right / 2, WALL_T, right, H)
      } else {
        addWall(0, L / 2 + WALL_T / 2, W + WALL_T * 2, WALL_T, H)
        addWall(0, -L / 2 - WALL_T / 2, W + WALL_T * 2, WALL_T, H)
        addWall(-W / 2 - WALL_T / 2, 0, WALL_T, L + WALL_T * 2, H)
        addWall(W / 2 + WALL_T / 2, 0, WALL_T, L + WALL_T * 2, H)
      }

      const roofData = project?.roof ? (project.roof as Record<string, number | string>) : null
      const roofType = isWalls4 && roofData?.type === 'gable' ? 'gable' : 'single'
      let roofW = W
      let roofL = L
      if (roofData) {
        if (isWalls2) {
          roofW = Number(roofData.width) > 0 ? Number(roofData.width) : W
          roofL = Number(roofData.length) > 0 ? Number(roofData.length) : L
        } else if (isWalls3) {
          roofW = Number(roofData.back) > 0 ? Number(roofData.back) : back
          roofL = Math.max(Number(roofData.left) || left, Number(roofData.right) || right)
        } else {
          roofW = Number(roofData.width) > 0 ? Number(roofData.width) : W
          roofL = Number(roofData.length) > 0 ? Number(roofData.length) : L
        }
      }
      const roofHeight = roofData && Number(roofData.height) >= 0 ? Number(roofData.height) : 0.5
      const overhang = roofData && Number(roofData.overhang) >= 0 ? Number(roofData.overhang) : 0.4
      const ridgeAlongLength = (roofData?.ridgeAlongLength as boolean | undefined) === false ? false : true

      const wallTopY = FOUNDATION_H + H
      const roofCenterX = isWalls2 ? W / 2 : isWalls3 ? foundationX : 0
      const roofCenterZ = isWalls2 ? L / 2 : isWalls3 ? foundationZ : 0
      if (roofType === 'gable') {
        const run = ridgeAlongLength ? roofW / 2 : roofL / 2
        const slopeLen = Math.sqrt(run * run + roofHeight * roofHeight)
        const slopeW = slopeLen + overhang
        const slopeL = ridgeAlongLength ? roofL + 2 * overhang : roofW + 2 * overhang
        const angle = Math.atan2(roofHeight, run)
        const slopeGeom = ridgeAlongLength
          ? new THREE.BoxGeometry(slopeW, 0.15, slopeL)
          : new THREE.BoxGeometry(slopeL, 0.15, slopeW)
        const slope1 = new THREE.Mesh(slopeGeom, roofMat)
        slope1.rotation.x = Math.PI / 2 - angle
        slope1.rotation.z = 0
        slope1.position.set(
          roofCenterX + (ridgeAlongLength ? -roofW / 4 : 0),
          wallTopY + roofHeight / 2,
          roofCenterZ + (ridgeAlongLength ? 0 : -roofL / 4)
        )
        slope1.castShadow = true
        slope1.receiveShadow = true
        scene.add(slope1)
        const slope2 = new THREE.Mesh(slopeGeom.clone(), roofMat)
        slope2.rotation.x = -Math.PI / 2 + angle
        slope2.rotation.z = 0
        slope2.position.set(
          roofCenterX + (ridgeAlongLength ? roofW / 4 : 0),
          wallTopY + roofHeight / 2,
          roofCenterZ + (ridgeAlongLength ? 0 : roofL / 4)
        )
        slope2.castShadow = true
        slope2.receiveShadow = true
        scene.add(slope2)
      } else {
        const slopeRun = roofW
        const angle = Math.atan2(roofHeight, slopeRun)
        const slopeL = roofL + 2 * overhang
        const slopeGeom = new THREE.BoxGeometry(roofW, 0.12, slopeL)
        const slope = new THREE.Mesh(slopeGeom, roofMat)
        slope.rotation.x = Math.PI / 2 - angle
        slope.position.set(roofCenterX, wallTopY + roofHeight / 2, roofCenterZ)
        slope.castShadow = true
        slope.receiveShadow = true
        scene.add(slope)
      }

      const groundGeom = new THREE.PlaneGeometry(30, 30)
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.95 })
      const ground = new THREE.Mesh(groundGeom, groundMat)
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      scene.add(ground)

      const centerY = FOUNDATION_H / 2 + H / 2
      const sceneCenterX = foundationX
      const sceneCenterZ = foundationZ
      const sceneSize = isWalls3 ? Math.max(back, left, right) : Math.max(W, L)
      controls.target.set(sceneCenterX, centerY, sceneCenterZ)
      camera.position.set(
        sceneCenterX + sceneSize * 0.8 + 4,
        centerY + 4,
        sceneCenterZ + sceneSize * 0.8 + 4
      )
      camera.lookAt(sceneCenterX, centerY, sceneCenterZ)

      let raf = 0
      function animate() {
        raf = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        if (!containerRef.current) return
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      return () => {
        window.removeEventListener('resize', onResize)
        cancelAnimationFrame(raf)
        renderer.dispose()
        brickTex.dispose()
        brickMat.dispose()
        concreteMat.dispose()
        roofMat.dispose()
        groundMat.dispose()
      }
    }

    ;(async () => {
      const project = await resolveProject()
      if (cancelled) return
      if (project) setProjectName(project.name)
      const cleanup = await init(project ?? null)
      if (cancelled) return
      cleanupRef.current = cleanup ?? null
    })()

    return () => {
      cancelled = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [searchParams])

  const subtitle = projectName
    ? `Проект «${projectName}»`
    : 'Демо 3D · 5×5 м, 2,7 м'

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-sm">
        <Link
          href="/project"
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
        >
          <ArrowLeft className="h-5 w-5" />
          Назад
        </Link>
        <span className="text-sm text-zinc-400">{subtitle}</span>
      </header>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  )
}

export default function Demo3DPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">Загрузка 3D…</div>}>
      <Demo3DContent />
    </Suspense>
  )
}
