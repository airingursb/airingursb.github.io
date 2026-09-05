import { Group } from 'three';
import { marina } from './marina';
import type { Materials } from './palette';
import { box, ball, cylinder, ring, rod, place, group } from './primitives';

function palm(m: Materials) {
  const root=new Group();
  for(let i=0;i<13;i++) place(root,cylinder([.064-i*.0015,.073-i*.0015,.135],m.wood),[i*.014,.2+i*.125,0]);
  for(let i=0;i<9;i++) {
    const angle=i*Math.PI*2/9;
    const branch=group(root,[.17,1.86,0]);
    branch.rotation.y=angle;
    const leaf=place(branch,ball([.13,.035,.63],i%2?m.leaf:m.leafLight),[0,.08,.43]);
    leaf.rotation.x=.3;
    for(let j=0;j<5;j++) {
      for(const side of [-1,1]) {
        const frond=place(branch,ball([.045,.024,.22],m.leaf),[side*(.11+j*.018),.08-j*.024,.19+j*.12]);
        frond.rotation.y=side*.65;
        frond.rotation.x=.22;
      }
    }
  }
  return root;
}

export function landscape(parent: Group,m: Materials) {
  place(parent,box([7.25,.4,5.55],m.edge,.19),[0,-.21,0]);
  place(parent,box([7.12,.1,5.43],m.chalk,.12),[0,.015,0]);
  place(parent,box([7,.045,1.7],m.water,.08),[0,.09,-1.84]);
  place(parent,box([7.02,.1,.11],m.stone),[0,.14,-.93]);
  for(let x=0;x<12;x++) for(let z=0;z<6;z++) {
    const tile=place(parent,box([.565,.047,.53],(x+z)%4===0?m.paving:m.stone,.008),[-3.2+x*.583,.093,-.59+z*.555]);
    tile.receiveShadow=true;
  }
  for(let x=0;x<18;x++) place(parent,box([.36,.08,.21],m.chalk),[-3.25+x*.382,.16,2.57]);
  const skyline=place(parent,marina(m),[1.55,.07,-2.12]);
  skyline.scale.setScalar(.93);
  for(let i=0;i<5;i++) {
    const height=.45+(i%3)*.2;
    place(parent,box([.24,height,.28],m.skyline),[-2.9+i*.31,height*.5+.1,-2.4]);
  }
  for(const x of [-3.2,-2.65,-2.1,-1.55,-1,-.45,.1,.65,1.2,1.75,2.3,2.85,3.3]) {
    place(parent,cylinder([.013,.013,.49],m.olive),[x,.38,-.94]);
  }
  for(const y of [.39,.61]) parent.add(rod([-3.3,y,-.94],[3.3,y,-.94],{radius:.013,material:m.olive}));
  for(const p of [[-3.0,0,-.24]] as const) {
    place(parent,cylinder([.31,.24,.28],m.chalk),[p[0],.23,p[2]]);
    place(parent,cylinder([.27,.27,.025],m.wood),[p[0],.38,p[2]]);
    place(parent,palm(m),[p[0],.32,p[2]]);
  }
  for(let i=0;i<10;i++) {
    const leaf=place(parent,ball([.1,.065,.24],i%2?m.leaf:m.leafLight),[2.87+(i%3)*.14,.22,1.4+Math.floor(i/3)*.24]);
    leaf.rotation.y=i*.9;
  }
  for(const [x,z,s] of [[-2.45,1.87,.38],[.8,1.94,.5],[2.1,.17,.42],[-.6,2.27,.24]]) {
    place(parent,ball([s,.012,s*.47],m.puddle),[x,.129,z]);
  }
  for(let i=0;i<14;i++) {
    const ripple=place(parent,ring(.1+(i%4)*.04,.006,m.foam),[-3.1+(i*.79)%6.1,.12,-2.49+(i%4)*.32]);
    ripple.rotation.x=-Math.PI/2;
    ripple.scale.y=.4;
  }
  const plaque=place(parent,box([1.6,.2,.017],m.gold),[.05,-.2,2.785]);
  plaque.receiveShadow=false;
  return parent;
}
