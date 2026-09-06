import type { Group } from 'three';
import { createBusan } from './busan';
import { createRidge } from './ridge';
import { createSauna } from './sauna';
import type { CompanionSeat } from './plush-companions';
import type { SceneKind } from './stories';

export const companionSeats: Partial<Record<SceneKind, readonly CompanionSeat[]>> = {
  ridge: [
    {file:'panda-ridge-game',x:-.15,z:.25,angle:-.14,floor:1.005,scale:.72,centerDepth:true},
    {file:'moflow-ridge-game',x:-.3,z:.63,angle:.25,tilt:.65,floor:2.013,scale:.31,centerDepth:true},
  ],
  sauna: [
    {file:'panda-sauna-game',x:-.7,z:-1.3,angle:.18,floor:1.045,scale:.53,centerDepth:true},
    {file:'moflow-sauna-game',x:.45,z:1.55,angle:.6,floor:.11,scale:.53,centerDepth:true},
  ],
};
export function createSceneSetting(root: Group, kind: SceneKind) {
  switch(kind) {
    case 'marina': return null;
    case 'busan': return createBusan(root);
    case 'ridge': return createRidge(root);
    case 'sauna': return createSauna(root);
  }
}
export const sceneNames: Record<SceneKind,string> = {
  marina:'雨里的滨海湾',busan:'釜山生日夜海',ridge:'南部山脊仰望天空',sauna:'回家路上的桑拿房',
};
