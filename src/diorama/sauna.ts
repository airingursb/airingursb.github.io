import { CanvasTexture, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, PointLight, Sprite, SpriteMaterial, Vector3 } from 'three';
import type { Group } from 'three';
import { ball, box, cylinder, group, place, ring, rod } from './primitives';
import { createGameWoodGrain, gameColors as colors, gameMatte as matte } from './game-style';

export function createSauna(parent: Group) {
  const m = {
    cedar:matte(colors.wood), light:matte(colors.woodLight), shade:matte(colors.woodShade), tile:matte(colors.teal),
    grout:matte(colors.stone), metal:matte(colors.charcoal), towel:matte(colors.cream), leaf:matte(colors.leaf),
    leafLight:matte(colors.leafLight), leafShade:matte(colors.leafShade), soil:matte(colors.earthShade),
    stone:matte(colors.stone), rim:matte(colors.cream), foundation:matte(colors.earthStone), pot:matte(colors.coral),
    lamp:new MeshStandardMaterial({color:colors.cream,emissive:colors.flowerGold,emissiveIntensity:.8,roughness:.45}),
    glass:new MeshPhysicalMaterial({color:colors.teal,transparent:true,opacity:.13,roughness:.12,metalness:.05,side:DoubleSide,depthWrite:false}),
  };
  const grain=createGameWoodGrain();
  for(const wood of [m.cedar,m.light,m.shade]) wood.map=grain;
  place(parent,box([7.95,.34,5.85],m.soil,.12),[0,-.48,0]);
  place(parent,box([8.3,.3,6.2],m.foundation,.12),[0,-.22,0]);
  for(let i=0;i<8;i++)place(parent,box([.96,.28,.12],m.foundation,.035),[-3.51+i*1.003,-.31,3.07]);
  for(let i=0;i<6;i++)place(parent,box([.12,.28,.96],m.foundation,.035),[4.12,-.31,-2.51+i*1.003]);
  place(parent,box([8.35,.13,6.25],m.rim,.07),[0,-.015,0]);
  for(let x=0;x<10;x++)for(let z=0;z<8;z++)place(parent,box([.765,.065,.715],(x+z)%3===0?m.rim:m.tile,.025),[-3.6+x*.8,.075,-2.625+z*.75]);
  const room=group(parent,[-.28,.1,-.35]);
  place(room,box([4.9,.16,4.45],m.shade,.035),[0,.08,0]);
  for(let i=0;i<14;i++)place(room,box([.328,.065,4.29],i%5===0?m.cedar:m.light,.022),[-2.236+i*.344,.185,0]);
  // Rear and left walls expose the interior from the shared front-right camera.
  for(let i=0;i<13;i++)place(room,box([.357,3.18,.18],i%5===0?m.cedar:m.light,.03),[-2.25+i*.375,1.79,-2.18]);
  for(let i=0;i<12;i++)place(room,box([.18,3.18,.349],i%5===0?m.cedar:m.light,.03),[-2.44,1.79,-2.013+i*.366]);
  for(const y of [.29,3.29]) {
    place(room,box([4.98,.19,.27],m.cedar,.035),[0,y,-2.17]);
    place(room,box([.27,.19,4.49],m.cedar,.035),[-2.43,y,0]);
  }
  for(const x of [-2.38,2.37])place(room,box([.23,3.3,.24],m.cedar,.035),[x,1.77,-2.13]);
  const bench=(z:number,y:number,depth:number)=>{
    for(let i=0;i<3;i++)place(room,box([3.45,.12,depth/3-.022],m.light,.034),[-.43,y-.015,z-depth/3+i*depth/3]);
    for(const x of [-1.9,.95])for(const dz of [-depth*.34,depth*.34])place(room,box([.18,y-.2,.18],m.cedar,.025),[x,(y+.2)*.5,z+dz]);
    place(room,box([3.49,.2,.12],m.light,.025),[-.43,y-.17,z+depth*.49]);
  };
  bench(-1.33,.92,1.08);bench(-.34,.5,.65);
  for(let i=0;i<3;i++)place(room,box([3.5,.2,.085],m.light,.025),[-.4,1.28+i*.3,-2.035]);
  // Folded linen keeps its soft rounded hems and layered silhouette.
  for(let i=0;i<3;i++)place(room,box([.65,.078,.49],i===1?m.tile:m.towel,.036),[-1.72,1.002+i*.078,-1.22]);
  const heater=group(room,[1.64,.19,-1.27]);
  place(heater,box([.75,.62,.73],m.metal,.045),[0,.34,0]);
  for(let i=0;i<7;i++)place(heater,box([.035,.7,.83],m.shade,.008),[-.44+i*.148,.38,0]);
  for(let i=0;i<7;i++)place(heater,box([.88,.045,.045],m.light,.008),[0,.14+i*.105,.43]);
  for(let i=0;i<15;i++) {
    const rock=place(heater,ball([.145+(i%3)*.015,.12,.135],i%3?m.stone:m.metal),[-.24+(i%3)*.24,.7+Math.floor(i/9)*.12,-.22+(Math.floor(i/3)%3)*.22]);
    rock.rotation.set(i*.7,i*.4,i*.2);
  }
  for(const x of [1.05,2.22])place(room,cylinder([.055,.055,.96],m.light),[x,.66,-.5]);
  place(room,box([1.26,.11,.11],m.light,.035),[1.63,1.13,-.5]);
  const bucket=group(parent,[1.8,.12,1.79]);
  place(bucket,cylinder([.29,.24,.36],m.shade),[0,.2,0]);
  place(bucket,cylinder([.252,.252,.023],m.soil),[0,.39,0]);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    const stave=place(bucket,box([.136,.38,.044],m.light,.013),[Math.sin(a)*.276,.23,Math.cos(a)*.276]);stave.rotation.y=a;
  }
  for(const y of [.1,.33]){const band=place(bucket,ring(.298,.02,m.metal),[0,y,0]);band.rotation.x=Math.PI/2;}
  bucket.add(rod([.08,.28,0],[.3,1.03,-.05],{radius:.03,material:m.cedar}));
  place(bucket,ball([.1,.036,.105],m.light),[.085,.3,0]);
  const door=group(parent,[2.2,.3,.9]);door.rotation.y=-.64;
  place(door,box([.095,2.57,1.14],m.glass,.01),[0,1.29,.52]);
  for(const z of [0,1.1])place(door,box([.16,2.65,.14],m.cedar,.03),[0,1.31,z]);
  for(const y of [.035,2.59])place(door,box([.16,.16,1.17],m.cedar,.03),[0,y,.55]);
  place(door,box([.13,.55,.11],m.light,.04),[.16,1.23,.82]);
  place(parent,box([1.12,.06,.62],m.towel,.06),[.86,.12,2.45]);
  for(const z of [2.23,2.29,2.61,2.67])place(parent,box([1.02,.012,.025],m.tile,.006),[.86,.158,z]);
  // Small shaded wall lamp, thermometer, and warm courtyard lantern.
  place(room,box([.36,.59,.18],m.lamp,.06),[-1.46,2.47,-2.01]);
  for(let i=0;i<6;i++)place(room,box([.4,.031,.22],m.shade,.006),[-1.46,2.25+i*.085,-1.91]);
  place(room,new PointLight(colors.flowerGold,1.8,5.5,2),[-1.4,2.37,-1.62]);
  place(room,box([.21,.6,.055],m.towel,.04),[.65,2.5,-2.07]);
  place(room,box([.027,.38,.018],m.shade,.004),[.65,2.5,-2.034]);
  place(room,ball([.035,.035,.017],m.cedar),[.65,2.28,-2.03]);
  for(let i=0;i<8;i++)place(room,box([.06,.009,.015],m.shade,.002),[.69,2.34+i*.05,-2.03]);
  const lantern=group(parent,[-2.47,.1,2.29]);
  place(lantern,box([.43,.58,.43],m.lamp,.02),[0,.36,0]);
  for(const x of [-.24,.24])for(const z of [-.24,.24])place(lantern,box([.045,.68,.045],m.metal,.009),[x,.36,z]);
  for(const y of [.06,.71])place(lantern,box([.55,.08,.55],m.metal,.025),[0,y,0]);
  place(lantern,ring(.12,.018,m.metal),[0,.87,0]);
  place(lantern,new PointLight(colors.flowerGold,.9,2.5,2),[0,.5,.25]);
  function plant(x:number,z:number,scale:number) {
    const plantRoot=group(parent,[x,.08,z]);plantRoot.scale.setScalar(scale);
    place(plantRoot,cylinder([.37,.28,.44],m.pot),[0,.25,0]);
    const lip=place(plantRoot,ring(.344,.053,m.pot),[0,.47,0]);lip.rotation.x=Math.PI/2;
    place(plantRoot,cylinder([.32,.32,.025],m.soil),[0,.46,0]);
    for(let i=0;i<12;i++) {
      const angle=i*2.4, upper=i>6, spread=upper?.24:.39, height=upper?1.08:.78;
      const tip: readonly [number,number,number]=[Math.cos(angle)*spread,height+(i%3)*.06,Math.sin(angle)*spread];
      plantRoot.add(rod([0,.45,0],tip,{radius:.028,material:m.leafShade}));
      const leaf=place(plantRoot,ball([.19,upper?.35:.31,.105],i%3?m.leaf:m.leafLight),tip);
      leaf.quaternion.setFromUnitVectors(new Vector3(0,1,0),new Vector3(Math.cos(angle)*.7,upper?1.2:.65,Math.sin(angle)*.7).normalize());
    }
  }
  plant(-3.5,1.13,.92);plant(-3.52,-1.14,1.08);plant(3.35,-1.72,1.3);plant(3.4,1.1,.8);
  const vaporCanvas=document.createElement('canvas');vaporCanvas.width=vaporCanvas.height=128;
  const context=vaporCanvas.getContext('2d');
  if(!context)throw new Error('Unable to create sauna steam texture');
  for(const [x,y,radius] of [[60,70,51],[43,54,34],[78,46,36],[85,77,30]]) {
    const glow=context.createRadialGradient(x,y,0,x,y,radius);
    glow.addColorStop(0,'rgba(255,255,255,.52)');glow.addColorStop(.4,'rgba(255,255,255,.25)');glow.addColorStop(1,'rgba(255,255,255,0)');
    context.fillStyle=glow;context.fillRect(0,0,128,128);
  }
  const vaporTexture=new CanvasTexture(vaporCanvas);
  const steam=Array.from({length:18},(_,i)=>{
    const material=new SpriteMaterial({map:vaporTexture,color:colors.cream,transparent:true,depthWrite:false,toneMapped:false});
    const puff=new Sprite(material);heater.add(puff);
    return {puff,material,offset:i/18,angle:i*2.4};
  });
  const runtime={
    companionRoot:parent,
    anchors:[new Vector3(-1.27,1.05,.12),new Vector3(1.47,1.02,-1.46),new Vector3(-2.48,.55,2.4)],
    update(time:number) {
      steam.forEach(({puff,material,offset,angle})=>{
        const phase=(time/6.5+offset)%1,spread=.09+phase*.31;
        puff.position.set(Math.cos(angle)*spread+Math.sin(time*.55+angle)*phase*.13, .85+phase*2.5, Math.sin(angle)*spread+phase*.25);
        const size=.38+phase*1.25;
        puff.scale.set(size,size*1.18,1);material.rotation=angle+time*.07;
        material.opacity=Math.sin(Math.PI*phase)**1.2*.38;
      });
    },
    dispose(){Object.values(m).forEach(material=>material.dispose());steam.forEach(({material})=>material.dispose());vaporTexture.dispose();grain.dispose();},
  };
  runtime.update(0);
  return runtime;
}
