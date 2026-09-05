import { BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, LatheGeometry, Mesh, SphereGeometry, TubeGeometry, Vector2, Vector3 } from 'three';
import type { Material } from 'three';
import type { XYZ } from './primitives';
import { characterColors } from './character-materials';

export function sculptedOval(size:XYZ,material:Material) {
  const geometry=new SphereGeometry(1,48,32);
  const mesh=new Mesh(geometry,material); mesh.scale.set(...size);
  mesh.castShadow=true; mesh.receiveShadow=true; return mesh;
}

export function pandaBody(material:Material) {
  const geometry=new SphereGeometry(1,56,40), positions=geometry.getAttribute('position');
  const colors:number[]=[], light=new Color(characterColors.ivory), dark=new Color(characterColors.charcoal);
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    positions.setXYZ(i,x*(1-.13*y),y,z);
    const belly=Math.max(0,Math.min(1,(z-.34)*7))*Math.max(0,Math.min(1,(.63-y)*9));
    const color=dark.clone().lerp(light,belly); colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3)); geometry.computeVertexNormals();
  const mesh=new Mesh(geometry,material); mesh.scale.set(.365,.35,.29); mesh.castShadow=true; mesh.receiveShadow=true; return mesh;
}

export function appendage(points:readonly XYZ[],style:{readonly radius:number;readonly material:Material;readonly taper?:number}) {
  const curve=new CatmullRomCurve3(points.map(p=>new Vector3(...p)));
  const frames=curve.computeFrenetFrames(28,false), vertices:number[]=[],indices:number[]=[],uvs:number[]=[];
  for(let i=0;i<=28;i++) {
    const t=i/28,center=curve.getPointAt(t),cap=Math.pow(Math.sin(Math.PI*t),.32);
    const radius=style.radius*cap*(1-(style.taper??.12)*t);
    for(let j=0;j<=16;j++) {
      const angle=j*Math.PI*2/16;
      const normal=frames.normals[i],binormal=frames.binormals[i];
      if(!normal||!binormal) continue;
      const point=center.clone().addScaledVector(normal,Math.cos(angle)*radius).addScaledVector(binormal,Math.sin(angle)*radius);
      vertices.push(point.x,point.y,point.z); uvs.push(j/16,t);
      if(i<28&&j<16) {const a=i*17+j,b=a+17;indices.push(a,a+1,b,b,a+1,b+1);}
    }
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new Mesh(geometry,style.material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

export function facialPatch(spec:{readonly center:readonly[number,number];readonly size:readonly[number,number];readonly angle:number;readonly head:XYZ},material:Material) {
  const vertices:number[]=[],indices:number[]=[];
  for(let r=0;r<=10;r++) for(let j=0;j<=40;j++) {
    const angle=j*Math.PI*2/40, radius=r/10;
    const u=Math.cos(angle)*radius*spec.size[0],v=Math.sin(angle)*radius*spec.size[1];
    const x=spec.center[0]+u*Math.cos(spec.angle)-v*Math.sin(spec.angle);
    const y=spec.center[1]+u*Math.sin(spec.angle)+v*Math.cos(spec.angle);
    const z=spec.head[2]*Math.sqrt(Math.max(.02,1-(x/spec.head[0])**2-(y/spec.head[1])**2))+.004;
    vertices.push(x,y,z);
    if(r<10&&j<40){const a=r*41+j,b=a+41;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return new Mesh(geometry,material);
}

export function line(points:readonly XYZ[],style:{readonly radius:number;readonly material:Material}) {
  return new Mesh(new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),24,style.radius,8,false),style.material);
}

export function dropBody(material:Material) {
  const profile=new CatmullRomCurve3([
    [0,0,0],[.18,.035,0],[.3,.14,0],[.355,.29,0],[.354,.44,0],[.31,.62,0],
    [.23,.78,0],[.12,.88,0],[.058,.94,0],[.035,1.015,0],[0,1.065,0],
  ].map(p=>new Vector3(...p)));
  const points=profile.getPoints(80).map(p=>new Vector2(Math.max(0,p.x),p.y));
  const geometry=new LatheGeometry(points,80), positions=geometry.getAttribute('position'),colors:number[]=[];
  const base=new Color(characterColors.porcelain),top=new Color(characterColors.porcelainLight);
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const bend=Math.max(0,(y-.83)/.235);
    positions.setXYZ(i,x+bend*bend*.082,y,z*.8-.015*bend);
    const shade=Math.min(.78,Math.max(0,(y-.12)*.57+z*.3));
    const color=base.clone().lerp(top,shade);colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const mesh=new Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
