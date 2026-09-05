import { Group } from 'three';
import type { Materials } from './palette';
import { box, ball, cylinder, ring, rod, place, group } from './primitives';

export function bicycle(m: Materials) {
  const root=new Group();
  const frame={radius:.023,material:m.olive};
  for(const x of [-.55,.55]) {
    const wheel=group(root,[x,.36,0]);
    place(wheel,ring(.335,.036,m.dark),[0,0,0]);
    place(wheel,ring(.298,.009,m.gold),[0,0,0]);
    place(wheel,ball([.045,.045,.045],m.dark),[0,0,0]);
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;
      wheel.add(rod([0,0,0],[Math.cos(a)*.295,Math.sin(a)*.295,0],{radius:.005,material:m.stone}));
    }
  }
  const axle=[-.03,.34,0] as const, seat=[-.22,.89,0] as const, front=[.36,.92,0] as const;
  root.add(rod([-.55,.36,0],seat,frame),rod(seat,axle,frame),rod(axle,[-.55,.36,0],frame));
  root.add(rod(seat,front,frame),rod(front,axle,frame),rod(front,[.55,.36,0],frame));
  root.add(rod(seat,[-.25,1.0,0],frame),rod(front,[.36,1.08,0],frame));
  place(root,box([.24,.055,.15],m.dark),[-.25,1.01,0]);
  root.add(rod([.36,1.08,-.19],[.36,1.08,.19],{radius:.021,material:m.dark}));
  place(root,ring(.1,.015,m.dark),[-.03,.34,.025]);
  root.add(rod([-.03,.34,-.1],[.09,.25,.13],frame));
  place(root,box([.13,.035,.09],m.dark),[.09,.25,.15]);
  const basket=group(root,[.62,.91,0]);
  place(basket,box([.28,.025,.28],m.olive),[0,-.12,0]);
  for(const z of [-.14,.14]) {
    for(let i=0;i<5;i++) basket.add(rod([-.14+i*.07,-.12,z],[-.16+i*.08,.14,z],{radius:.006,material:m.dark}));
    basket.add(rod([-.16,.14,z],[.16,.14,z],{radius:.012,material:m.dark}));
  }
  for(const x of [-.15,.15]) basket.add(rod([x,.14,-.14],[x,.14,.14],{radius:.012,material:m.dark}));
  root.add(rod([-.15,.35,0],[-.29,.025,.2],{radius:.014,material:m.dark}));
  return root;
}

export function shelter(parent: Group,m: Materials) {
  const root=group(parent,[-1.0,0,-.15]);
  place(root,box([3.05,.15,1.66],m.stone),[0,.12,0]);
  for(const x of [-1.4,1.4]) {
    place(root,box([.09,2.5,.09],m.olive),[x,1.46,-.62]);
    place(root,box([.11,2.5,.11],m.olive),[x,1.46,.63]);
    place(root,box([.07,1.7,1.2],m.glass),[x,1.25,-.02]);
    place(root,box([.075,.055,1.24],m.olive),[x,1.7,0]);
  }
  place(root,box([2.82,1.8,.07],m.glass),[0,1.27,-.63]);
  for(const x of [-.7,.7]) place(root,box([.045,1.85,.06],m.olive),[x,1.27,-.585]);
  const roof=place(root,box([3.4,.16,1.93],m.roof,.05),[0,2.75,-.02]);
  roof.rotation.x=.035;
  place(root,box([3.4,.07,.07],m.olive),[0,2.64,.94]);
  for(let i=0;i<14;i++) place(root,box([.016,.026,1.85],m.olive,.005),[-1.6+i*.245,2.848,-.02]);
  place(root,box([1.8,.025,.045],m.amber),[0,2.645,.24]);
  for(const x of [-.91,.91]) place(root,box([.09,.42,.48],m.dark),[x,.39,.23]);
  for(let i=0;i<4;i++) place(root,box([2.35,.065,.125],m.wood),[0,.61,.02+i*.135]);
  for(let i=0;i<3;i++) place(root,box([2.35,.13,.06],m.woodLight),[0,.88+i*.15,-.21]);
  const sign=group(parent,[-2.8,0,1.1]);
  place(sign,cylinder([.03,.03,2.45],m.olive),[0,1.25,0]);
  place(sign,box([.44,.48,.055],m.chalk),[0,2.3,0]);
  place(sign,box([.29,.21,.018],m.olive),[0,2.34,.037]);
  for(const x of [-.1,.1]) place(sign,ball([.025,.025,.015],m.dark),[x,2.19,.044]);
  place(sign,box([.22,.045,.018],m.gold),[0,2.08,.039]);
}
