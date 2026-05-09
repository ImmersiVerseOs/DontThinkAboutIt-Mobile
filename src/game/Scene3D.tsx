// 3D Scene — renders the dark room and entities using expo-gl + three.js
// Ported from web GameScene.tsx, adapted for mobile rendering

import React, { useRef, useEffect } from 'react';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import type { GameState, Entity } from './state';

interface Scene3DProps {
  state: GameState;
  width: number;
  height: number;
}

export function Scene3D({ state, width, height }: Scene3DProps) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const entityMeshes = useRef<Map<string, THREE.Object3D>>(new Map());
  const lightRef = useRef<THREE.PointLight | null>(null);
  const frameRef = useRef<number>(0);

  const onContextCreate = (gl: any) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 15);
    sceneRef.current = scene;

    // Camera — first person
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 0);
    cameraRef.current = camera;

    // Lighting — barely visible
    const ambient = new THREE.AmbientLight(0x111133, 0.02);
    scene.add(ambient);

    const point = new THREE.PointLight(0xffeecc, 0.3, 20);
    point.position.set(0, 5, 0);
    scene.add(point);
    lightRef.current = point;

    // Dark Room
    buildRoom(scene);

    // Start render loop
    const render = () => {
      frameRef.current = requestAnimationFrame(render);
      updateScene(state);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  // Update scene based on game state
  const updateScene = (gameState: GameState) => {
    if (!sceneRef.current || !cameraRef.current || !lightRef.current) return;

    // Camera rotation from touch/gyroscope
    cameraRef.current.rotation.y = -gameState.cameraRotation.y;
    cameraRef.current.rotation.x = Math.max(-0.5, Math.min(0.5, -gameState.cameraRotation.x));

    // Flickering light based on fear
    if (Math.random() < gameState.fear / 200) {
      lightRef.current.intensity = 0.1;
    } else {
      lightRef.current.intensity = 0.3 - gameState.fear * 0.002;
    }

    // Flashlight
    if (gameState.flashlightActive) {
      lightRef.current.intensity = 2.0;
    }

    // Update entities
    updateEntities(gameState);
  };

  const updateEntities = (gameState: GameState) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove inactive entities
    for (const [id, mesh] of entityMeshes.current) {
      const entity = gameState.entities.find((e) => e.id === id);
      if (!entity || !entity.active) {
        scene.remove(mesh);
        entityMeshes.current.delete(id);
      }
    }

    // Add/update entities
    for (const entity of gameState.entities) {
      if (!entity.active) continue;

      let mesh = entityMeshes.current.get(entity.id);

      if (!mesh) {
        mesh = createEntityMesh(entity);
        scene.add(mesh);
        entityMeshes.current.set(entity.id, mesh);
      }

      // Update mesh based on entity state
      updateEntityMesh(mesh, entity, gameState);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <GLView
      style={{ width, height }}
      onContextCreate={onContextCreate}
    />
  );
}

// ─── Room Building ───────────────────────────────────────────

function buildRoom(scene: THREE.Scene) {
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x050505 });

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshLambertMaterial({ color: 0x030303 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4;
  scene.add(ceiling);

  // Walls
  const wallGeo = new THREE.PlaneGeometry(20, 4);
  const walls = [
    { pos: [0, 2, -10], rot: [0, 0, 0] },
    { pos: [0, 2, 10], rot: [0, Math.PI, 0] },
    { pos: [-10, 2, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [10, 2, 0], rot: [0, -Math.PI / 2, 0] },
  ];

  for (const w of walls) {
    const wall = new THREE.Mesh(wallGeo, darkMat);
    wall.position.set(w.pos[0], w.pos[1], w.pos[2]);
    wall.rotation.set(w.rot[0], w.rot[1], w.rot[2]);
    scene.add(wall);
  }
}

// ─── Entity Mesh Creation ────────────────────────────────────

function createEntityMesh(entity: Entity): THREE.Object3D {
  switch (entity.type) {
    case 'shadow': {
      const geo = new THREE.SphereGeometry(0.8, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(entity.position.x, entity.position.y + 1, entity.position.z);
      return mesh;
    }

    case 'figure': {
      const group = new THREE.Group();
      // Body
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 1.2, 4, 8),
        new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0 }),
      );
      body.position.y = 1;
      group.add(body);
      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0 }),
      );
      head.position.y = 1.9;
      group.add(head);
      group.position.set(entity.position.x, 0, entity.position.z);
      return group;
    }

    case 'eyes': {
      const group = new THREE.Group();
      const eyeMat = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0,
      });
      const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
      leftEye.position.x = -0.08;
      const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat.clone());
      rightEye.position.x = 0.08;
      group.add(leftEye, rightEye);
      group.position.set(entity.position.x, entity.position.y, entity.position.z);
      return group;
    }

    case 'crawler': {
      const geo = new THREE.CapsuleGeometry(0.2, 1.5, 4, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x1a0000,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2; // Horizontal
      mesh.position.set(entity.position.x, 0.3, entity.position.z);
      return mesh;
    }

    default: {
      const geo = new THREE.SphereGeometry(0.5, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(entity.position.x, entity.position.y + 1, entity.position.z);
      return mesh;
    }
  }
}

// ─── Entity Mesh Update ─────────────────────────────────────

function updateEntityMesh(mesh: THREE.Object3D, entity: Entity, state: GameState) {
  const opacity = entity.visibility * 0.9;

  // Update materials recursively
  mesh.traverse((child) => {
    if ((child as THREE.Mesh).material) {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;

      // Red glow when dangerous
      if (entity.dangerous && entity.visibility > 0.7) {
        mat.color.setHex(0x330000);
      }
    }
  });

  // Pulsing scale for shadows
  if (entity.type === 'shadow') {
    const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.1 * entity.visibility;
    mesh.scale.setScalar(pulse);
  }

  // Figure slowly rotates toward camera
  if (entity.type === 'figure' && entity.visibility > 0.3) {
    const targetY = Math.atan2(-entity.position.x, -entity.position.z);
    mesh.rotation.y += (targetY - mesh.rotation.y) * 0.02;
  }

  // Eyes blink
  if (entity.type === 'eyes') {
    const blink = Math.sin(Date.now() * 0.005) > 0.9 ? 0 : 1;
    mesh.traverse((child) => {
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = opacity * blink;
      }
    });
  }
}
