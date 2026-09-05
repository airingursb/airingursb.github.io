import { createCharacterMaterials } from './character-materials';
import { MeshStandardMaterial, MeshPhysicalMaterial, LineBasicMaterial } from 'three';

export const colors = {
  chalk: '#eee9dc', stone: '#c4c7bc', edge: '#ddd8c8', paving: '#b4bcb2', seam: '#9ea89e',
  olive: '#596a5b', roof: '#738375', wood: '#967957', woodLight: '#b49870', dark: '#303d3a',
  white: '#f4efdf', blue: '#a4ccd2', pink: '#dc9e96', blush: '#d1a2a0',
  water: '#83aca7', foam: '#c6d9cf', leaf: '#6d8965', leafLight: '#9bad7c',
  hotelGlass: '#526f78', gold: '#c2a779', skyline: '#bbc7c0', glass: '#96b0aa', amber: '#ffe3a0',
} as const;

export function createMaterials() {
  const matte = (color: string) => new MeshStandardMaterial({ color, roughness: .86 });
  return {
    ...createCharacterMaterials(),
    hotelRail: new LineBasicMaterial({color:colors.skyline, transparent:true, opacity:.75}),
    hotelGlass: new MeshStandardMaterial({color:colors.hotelGlass, roughness:.34, metalness:.25}),
    chalk: matte(colors.chalk), stone: matte(colors.stone), edge: matte(colors.edge), paving: matte(colors.paving), seam: matte(colors.seam),
    olive: matte(colors.olive), roof: matte(colors.roof), wood: matte(colors.wood), woodLight: matte(colors.woodLight),
    dark: matte(colors.dark), white: matte(colors.white), blue: matte(colors.blue), pink: matte(colors.pink), blush: matte(colors.blush),
    leaf: matte(colors.leaf), leafLight: matte(colors.leafLight), gold: matte(colors.gold), skyline: matte(colors.skyline),
    glass: new MeshPhysicalMaterial({color:colors.glass, roughness:.25, transparent:true, opacity:.6}),
    water: new MeshPhysicalMaterial({color:colors.water, roughness:.22, metalness:.16, clearcoat:1}),
    puddle: new MeshPhysicalMaterial({color:colors.glass, roughness:.05, transparent:true, opacity:.66, metalness:.22}),
    foam: new MeshStandardMaterial({color:colors.foam, transparent:true, opacity:.45, roughness:.8}),
    amber: new MeshStandardMaterial({color:colors.amber, emissive:colors.amber, emissiveIntensity:.5}),
  };
}
export type Materials = ReturnType<typeof createMaterials>;
