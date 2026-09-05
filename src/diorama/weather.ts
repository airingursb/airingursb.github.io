import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Group, InstancedMesh, TorusGeometry, Object3D, MeshBasicMaterial, DynamicDrawUsage } from 'three';
import type { Materials } from './palette';

const storm = { drops: 620, runoff: 22, impacts: 32, height: 4.4, speed: 4.3 };
const canopy = { left: -2.72, right: .72, back: -1.14, front: .82, height: 2.86 };
const covered = (x: number, z: number) => x > canopy.left && x < canopy.right && z > canopy.back && z < canopy.front;

export function createWeather(parent: Group, m: Materials) {
  const count = storm.drops + storm.runoff + storm.impacts * 3;
  const positions = new Float32Array(count * 6);
  const colors = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const bright = i % 4 === 0;
    for (let end = 0; end < 2; end++) {
      const j = i * 6 + end * 3;
      colors[j] = bright ? .75 : .27;
      colors[j + 1] = bright ? .85 : .43;
      colors[j + 2] = bright ? .90 : .50;
    }
  }
  const geometry = new BufferGeometry();
  const attribute = new Float32BufferAttribute(positions, 3).setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = new LineBasicMaterial({vertexColors: true, transparent: true, opacity: .34, depthWrite: false});
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying float stormHeight;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nstormHeight = position.y;');
    shader.fragmentShader = 'varying float stormHeight;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= 1.0 - smoothstep(3.4, 4.9, stormHeight);');
  };
  const rain = new LineSegments(geometry, material);
  rain.name = 'Storm · slanted rain, roof runoff and impact splashes';
  rain.frustumCulled = false;
  parent.add(rain);
  const rippleGeometry = new TorusGeometry(.12, .005, 4, 24);
  const rippleMaterial = new MeshBasicMaterial({color: m.foam.color, transparent: true, opacity: .32, depthWrite: false});
  const ripples = new InstancedMesh(rippleGeometry, rippleMaterial, storm.impacts);
  ripples.instanceMatrix.setUsage(DynamicDrawUsage);
  ripples.frustumCulled = false;
  ripples.name = 'Storm · expanding impact rings';
  parent.add(ripples);
  const transform = new Object3D();
  transform.rotation.x = -Math.PI / 2;
  function update(time: number) {
    for (let i = 0; i < storm.drops; i++) {
      const phase = (time * (storm.speed + (i % 5) * .35) + i * .137) % storm.height;
      const y = storm.height - phase + .14;
      const x = -3.46 + ((i * 1.717 + phase * .17) % 6.92);
      const z = -2.58 + ((i * .973 + phase * .035) % 5.1);
      const length = .10 + (i % 7) * .022;
      const hidden = covered(x, z) && y < canopy.height;
      const j = i * 6;
      positions[j] = x; positions[j + 1] = hidden ? -1 : y; positions[j + 2] = z;
      positions[j + 3] = x - length * .17;
      positions[j + 4] = hidden ? -1 : y + length;
      positions[j + 5] = z - length * .035;
    }
    for (let i = 0; i < storm.runoff; i++) {
      const phase = (time * 3.9 + i * .151) % 2.50;
      const j = (storm.drops + i) * 6;
      const x = -2.67 + i / (storm.runoff - 1) * 3.34;
      positions[j] = x; positions[j + 1] = 2.65 - phase; positions[j + 2] = .86 + phase * .025;
      positions[j + 3] = x - .015; positions[j + 4] = Math.min(2.65, 2.75 - phase); positions[j + 5] = positions[j + 2];
    }
    for (let i = 0; i < storm.impacts; i++) {
      let x = -3.35 + (i * .713) % 6.7;
      const z = -2.5 + (i * 1.433) % 5;
      if (covered(x, z)) x = .93 + (i % 9) * .26;
      const phase = (time * 1.8 + i * .173) % 1;
      const y = z < -.98 ? .119 : .146;
      transform.position.set(x, y, z);
      transform.scale.setScalar(.10 + phase * 1.25);
      transform.updateMatrix();
      ripples.setMatrixAt(i, transform.matrix);
      for (let ray = 0; ray < 3; ray++) {
        const j = (storm.drops + storm.runoff + i * 3 + ray) * 6;
        const angle = ray * Math.PI * 2 / 3 + i;
        const rise = Math.sin(Math.min(1, phase * 2) * Math.PI) * .065;
        positions[j] = x + Math.cos(angle) * phase * .10; positions[j + 1] = y + rise; positions[j + 2] = z + Math.sin(angle) * phase * .10;
        positions[j + 3] = positions[j] + Math.cos(angle) * rise * .3;
        positions[j + 4] = y + rise * .45; positions[j + 5] = positions[j + 2] + Math.sin(angle) * rise * .3;
      }
    }
    attribute.array.set(positions);
    attribute.needsUpdate = true;
    ripples.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return {update, dispose() {geometry.dispose(); material.dispose(); ripples.dispose(); rippleGeometry.dispose(); rippleMaterial.dispose();}};
}

export function createRainAudio() {
  let context: AudioContext | undefined;
  let source: AudioBufferSourceNode | undefined;
  return {
    async setPlaying(playing: boolean) {
      if(!playing) { if(context) await context.suspend(); return; }
      if(!context) {
        context=new AudioContext();
        const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
        const channel=buffer.getChannelData(0);
        let previous=0;
        for(let i=0;i<channel.length;i++) {
          previous=(previous+Math.random()*.04-.02)/1.02;
          channel[i]=previous*3.5;
        }
        source=context.createBufferSource(); source.buffer=buffer; source.loop=true;
        const filter=context.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=1400;
        const gain=context.createGain(); gain.gain.value=.36;
        source.connect(filter); filter.connect(gain); gain.connect(context.destination); source.start();
      }
      await context.resume();
    },
    dispose() { source?.stop(); if(context) void context.close(); },
  };
}
