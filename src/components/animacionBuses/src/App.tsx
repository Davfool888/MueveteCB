import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { MainScene } from './components/scene/MainScene'
import { CAMERA } from './lib/layout'
import './styles/global.css'

/**
 * App: solo la escena 3D a pantalla completa.
 * Sin navbar, panel de busqueda, inputs, botones ni texto de interfaz.
 */
function App() {
  return (
    <div className="stage">
      <Canvas
        shadows="variance"
        dpr={[1, 1.5]}
        orthographic
        camera={{
          position: CAMERA.position,
          zoom: 40,
          near: -200,
          far: 400,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.04,
        }}
      >
        <MainScene />
      </Canvas>
    </div>
  )
}

export default App
