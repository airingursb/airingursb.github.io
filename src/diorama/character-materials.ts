import { Color, DataTexture, MeshPhysicalMaterial, MeshStandardMaterial, RGBAFormat, RepeatWrapping } from 'three';

export const characterColors = {
  ivory: '#f3ecdc', charcoal: '#252b2b', innerEar: '#414443', eye: '#151c1e', iris: '#493b31',
  nose: '#20282b', paw: '#555453', porcelain: '#a7d2dc', porcelainLight: '#d8edf0',
  heart: '#e6a6a2', heartEdge: '#b77778', blush: '#e1aaa6', mouth: '#765657',
} as const;

export function createCharacterMaterials() {
  const size=256, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const grain=Math.sin(x*127.1+y*311.7)*43758.5453;
    const strand=Math.sin(x*.8+Math.sin(y*.12)*1.9);
    const value=Math.round(125+strand*42+(grain-Math.floor(grain))*55);
    const i=(y*size+x)*4;
    pixels[i]=value; pixels[i+1]=value; pixels[i+2]=value; pixels[i+3]=255;
  }
  const furTexture=new DataTexture(pixels,size,size,RGBAFormat);
  furTexture.wrapS=furTexture.wrapT=RepeatWrapping; furTexture.repeat.set(5,4); furTexture.needsUpdate=true;
  const fur=(color:string)=>new MeshStandardMaterial({color,roughness:.94,bumpMap:furTexture,bumpScale:.009});
  return {
    furIvory:fur(characterColors.ivory), furCharcoal:fur(characterColors.charcoal),
    furBody:new MeshStandardMaterial({vertexColors:true,roughness:.94,bumpMap:furTexture,bumpScale:.009}),
    innerEar:new MeshStandardMaterial({color:characterColors.innerEar,roughness:.98}),
    eye:new MeshPhysicalMaterial({color:characterColors.eye,roughness:.11,clearcoat:1,clearcoatRoughness:.08}),
    iris:new MeshPhysicalMaterial({color:characterColors.iris,roughness:.19,clearcoat:1}),
    nose:new MeshPhysicalMaterial({color:characterColors.nose,roughness:.3,clearcoat:.25}),
    paw:new MeshStandardMaterial({color:characterColors.paw,roughness:.88}),
    porcelain:new MeshPhysicalMaterial({vertexColors:true,roughness:.35,clearcoat:.3,clearcoatRoughness:.3,sheen:.4,sheenColor:new Color(characterColors.porcelainLight)}),
    porcelainLimb:new MeshPhysicalMaterial({color:characterColors.porcelain,roughness:.38,clearcoat:.25}),
    heart:new MeshPhysicalMaterial({color:characterColors.heart,roughness:.4,clearcoat:.2}),
    heartEdge:new MeshStandardMaterial({color:characterColors.heartEdge,roughness:.7}),
    cheek:new MeshStandardMaterial({color:characterColors.blush,roughness:.85,transparent:true,opacity:.62}),
    smile:new MeshStandardMaterial({color:characterColors.eye,roughness:.9}),
    mouth:new MeshStandardMaterial({color:characterColors.mouth,roughness:.9}),
  };
}
