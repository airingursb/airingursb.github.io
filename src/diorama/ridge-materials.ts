import { createGameWoodGrain, gameColors as colors, gameMatte } from './game-style';

export const ridgeColors = {
  canopy: colors.leaf, leafLight: colors.leafLight, leafShade: colors.leafShade, timber: colors.wood,
  grain: colors.woodShade, earth: colors.grass, stone: colors.stone, bird: colors.charcoal,
  bark: colors.woodShade, barkLight: colors.wood, woodLight: colors.woodLight, woodShade: colors.wood,
  moss: colors.grassLight, soil: colors.earth, dryLeaf: colors.flowerGold, metal: colors.charcoal,
} as const;

export function createRidgeMaterials() {
  const m = {
    canopy: gameMatte(ridgeColors.canopy), leafLight: gameMatte(ridgeColors.leafLight), leafShade: gameMatte(ridgeColors.leafShade),
    timber: gameMatte(ridgeColors.timber), grain: gameMatte(ridgeColors.grain), earth: gameMatte(ridgeColors.earth),
    stone: gameMatte(ridgeColors.stone), bird: gameMatte(ridgeColors.bird), woodLight: gameMatte(ridgeColors.woodLight),
    woodShade: gameMatte(ridgeColors.woodShade), metal: gameMatte(ridgeColors.metal),
  };
  const grain = createGameWoodGrain();
  for (const wood of [m.timber, m.woodLight, m.woodShade]) wood.map = grain;
  return {m, dispose() { grain.dispose(); Object.values(m).forEach(material => material.dispose()); }};
}
