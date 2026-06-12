import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

function Blob({ position, color, scale, distort, speed }) {
  const mesh = useRef();
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.x = t * 0.15 * speed;
    mesh.current.rotation.y = t * 0.2 * speed;
  });
  return (
    <Float speed={speed * 1.4} rotationIntensity={0.8} floatIntensity={1.6}>
      <mesh ref={mesh} position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={1.6}
          roughness={0.18}
          metalness={0.25}
          emissive={color}
          emissiveIntensity={0.35}
        />
      </mesh>
    </Float>
  );
}

export default function Hero3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 5]} intensity={1.4} />
      <pointLight position={[-5, -2, 2]} intensity={0.8} color="#ff8a4d" />

      <Blob position={[-2.4, 0.3, 0]} color="#ff6a3d" scale={1.15} distort={0.45} speed={1.1} />
      <Blob position={[2.6, -0.4, -1.5]} color="#1f8a1f" scale={1.5} distort={0.35} speed={0.85} />
      <Blob position={[0.6, 1.3, -2.5]} color="#0972d3" scale={0.8} distort={0.5} speed={1.4} />

      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.4} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
