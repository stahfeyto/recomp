"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Mesh, Points } from "three";

export type SceneVariant = "login" | "orb";

/** Inclinação do telemóvel (giroscópio), normalizada para −1…1. Sem pedido de permissão. */
function useTilt() {
  const tilt = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tilt.current.x = Math.max(-1, Math.min(1, e.gamma / 30));
      tilt.current.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);
  return tilt;
}

/** Nó em cromado: gira devagar e inclina-se para o rato / para a inclinação do telemóvel. */
function ChromeKnot({ scale }: { scale: number }) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const tilt = useTilt();

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 30);
    if (mesh.current) {
      mesh.current.rotation.x += d * 0.12;
      mesh.current.rotation.y += d * 0.18;
    }
    if (group.current) {
      const tx = (state.pointer.y + tilt.current.y) * 0.35;
      const ty = (state.pointer.x + tilt.current.x) * 0.5;
      group.current.rotation.x += (tx - group.current.rotation.x) * Math.min(1, d * 3);
      group.current.rotation.y += (ty - group.current.rotation.y) * Math.min(1, d * 3);
    }
  });

  return (
    <group ref={group} scale={scale}>
      <mesh ref={mesh}>
        <torusKnotGeometry args={[1, 0.3, 220, 36]} />
        <meshPhysicalMaterial
          color="#dfe6ff"
          metalness={1}
          roughness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

/** Anel fino de luz azul, inclinado, a rodar devagar. */
function LightRing() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += Math.min(dt, 1 / 30) * 0.08;
  });
  return (
    <mesh ref={ref} rotation={[1.2, 0.2, 0]}>
      <torusGeometry args={[2.7, 0.012, 16, 240]} />
      <meshBasicMaterial color="#4B63FF" toneMapped={false} />
    </mesh>
  );
}

/** Partículas subtis numa casca esférica à volta da cena. */
function Particles({ count }: { count: number }) {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    // Pseudo-aleatório determinístico (a cena é sempre igual).
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3 + rand() * 3.5;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      arr[i * 3 + 2] = r * Math.cos(phi) - 2;
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += Math.min(dt, 1 / 30) * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#9FB3E8" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/**
 * Cena 3D do RECOMP. "login": nó em cromado + anel de luz + partículas, ecrã
 * inteiro. "orb": só o nó, pequeno (topo do Painel). DPR limitado a 1,5 e pausa
 * quando o separador não está visível ou a cena sai do ecrã.
 */
export default function RecompScene({ variant }: { variant: SceneVariant }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    let onScreen = true;
    const update = () => setActive(onScreen && document.visibilityState === "visible");
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    if (el) io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const login = variant === "login";

  return (
    <div ref={wrapRef} className={login ? "scene scene--login" : "scene scene--orb"} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        // Login: câmara afastada para o nó ficar por trás do cartão, sem tapar o wordmark.
        camera={{ position: [0, 0, login ? 9.5 : 6], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={active ? "always" : "never"}
      >
        <Environment resolution={256} frames={1}>
          <Lightformer form="ring" intensity={4} color="#4B63FF" scale={6} position={[0, 0, -6]} />
          <Lightformer form="rect" intensity={5} color="#DCE6FF" scale={[12, 2, 1]} position={[0, 5, -1]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={2.5} color="#1B2CFF" scale={[10, 10, 1]} position={[-6, 0, 0]} rotation-y={Math.PI / 2} />
          <Lightformer form="rect" intensity={1.5} color="#9FB3E8" scale={[10, 10, 1]} position={[6, -1, 1]} rotation-y={-Math.PI / 2} />
        </Environment>
        {/* Login: o topo do nó fica atrás do cartão (o wordmark e o subtítulo leem-se). */}
        <group position={login ? [0, -0.85, 0] : [0, 0, 0]}>
          <ChromeKnot scale={login ? 1.45 : 1} />
        </group>
        {login && <LightRing />}
        {login && <Particles count={420} />}
      </Canvas>
    </div>
  );
}
