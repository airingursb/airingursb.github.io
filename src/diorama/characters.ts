import { Group, Shape, ExtrudeGeometry, Mesh } from 'three';
import type { Materials } from './palette';
import { place, group } from './primitives';
import { appendage, dropBody, facialPatch, line, pandaBody, sculptedOval } from './sculpt';

function panda(m: Materials) {
  const root=new Group();
  place(root,pandaBody(m.furBody),[0,.43,0]);
  for(const side of [-1,1]) {
    root.add(appendage([[side*.22,.28,-.03],[side*.27,.17,.16],[side*.23,.12,.4]],{radius:.165,material:m.furCharcoal,taper:0}));
    const paw=place(root,sculptedOval([.135,.13,.16],m.furCharcoal),[side*.25,.12,.31]);
    paw.rotation.x=-.16;
    place(root,sculptedOval([.07,.066,.013],m.paw),[side*.25,.085,.458]);
    for(let toe=0;toe<3;toe++) place(root,sculptedOval([.022,.027,.01],m.paw),[side*.25+(toe-1)*.04,.172,.452]);
    root.add(appendage([[side*.29,.73,-.01],[side*.385,.57,.14],[side*.26,.38,.3]],{radius:.145,material:m.furCharcoal,taper:.16}));
    place(root,sculptedOval([.13,.105,.125],m.furCharcoal),[side*.26,.39,.285]);
  }
  const head=group(root,[0,1.0,.045]);head.rotation.z=-.055;head.rotation.y=.055;
  const headSize=[.43,.36,.345] as const;
  place(head,sculptedOval(headSize,m.furIvory),[0,0,0]);
  for(const side of [-1,1]) {
    const ear=group(head,[side*.306,.272,-.025]);ear.rotation.z=-side*.22;
    place(ear,sculptedOval([.132,.14,.093],m.furCharcoal),[0,0,0]);
    place(ear,sculptedOval([.082,.087,.024],m.innerEar),[0,.01,.079]);
    head.add(facialPatch({center:[side*.167,.012],size:[.11,.14],angle:-side*.34,head:headSize},m.furCharcoal));
    const eye=group(head,[side*.156,.034,.313]);eye.rotation.y=side*.24;
    place(eye,sculptedOval([.055,.065,.028],m.eye),[0,0,0]);
    place(eye,sculptedOval([.032,.039,.012],m.iris),[.008,-.005,.024]);
    place(eye,sculptedOval([.023,.03,.01],m.eye),[.01,-.003,.034]);
    place(eye,sculptedOval([.014,.017,.006],m.white),[-.012,.023,.033]);
    place(eye,sculptedOval([.006,.007,.003],m.white),[.024,-.02,.037]);
    head.add(facialPatch({center:[side*.261,-.09],size:[.048,.027],angle:side*.17,head:headSize},m.cheek));
    place(head,sculptedOval([.105,.076,.052],m.furIvory),[side*.064,-.116,.32]);
  }
  const noseShape=new Shape();noseShape.moveTo(-.068,.018);noseShape.bezierCurveTo(-.063,.055,.063,.055,.068,.018);noseShape.bezierCurveTo(.063,-.006,.023,-.044,0,-.048);noseShape.bezierCurveTo(-.023,-.044,-.063,-.006,-.068,.018);
  const nose=new Mesh(new ExtrudeGeometry(noseShape,{depth:.018,bevelEnabled:true,bevelSize:.009,bevelThickness:.01,bevelSegments:3,steps:1,curveSegments:16}),m.nose);
  place(head,nose,[0,-.097,.375]);
  place(head,sculptedOval([.068,.051,.011],m.mouth),[0,-.207,.312]);
  place(head,sculptedOval([.041,.055,.013],m.heart),[0,-.224,.327]);
  head.add(line([[0,-.145,.373],[0,-.176,.354],[-.044,-.194,.334],[-.085,-.17,.332]],{radius:.008,material:m.smile}));
  head.add(line([[0,-.176,.354],[.038,-.195,.336],[.079,-.176,.334]],{radius:.008,material:m.smile}));
  head.add(line([[0,-.217,.341],[0,-.246,.339]],{radius:.0025,material:m.heartEdge}));
  return root;
}

function moflow(m: Materials) {
  const root=new Group();
  place(root,dropBody(m.porcelain),[0,0,0]);
  for(const side of [-1,1]) {
    const eye=group(root,[side*.128,.579,.226]);eye.rotation.y=side*.26;
    place(eye,sculptedOval([.049,.06,.029],m.eye),[0,0,0]);
    place(eye,sculptedOval([.015,.019,.008],m.white),[-.012,.022,.027]);
    place(eye,sculptedOval([.006,.008,.004],m.white),[.017,-.02,.028]);
    const cheek=place(root,sculptedOval([.048,.026,.005],m.cheek),[side*.23,.485,.214]);cheek.rotation.y=side*.6;
    root.add(appendage([[side*.3,.39,.04],[side*.287,.288,.199],[side*.14,.26,.291]],{radius:.067,material:m.porcelainLimb,taper:.12}));
  }
  root.add(line([[-.06,.492,.274],[-.044,.467,.278],[0,.456,.284],[.044,.47,.278],[.06,.494,.271]],{radius:.009,material:m.smile}));
  const shape=new Shape();shape.moveTo(0,-.153);shape.bezierCurveTo(-.285,.01,-.158,.231,0,.105);shape.bezierCurveTo(.158,.231,.285,.01,0,-.153);
  const geometry=new ExtrudeGeometry(shape,{depth:.06,bevelEnabled:true,bevelSize:.023,bevelThickness:.027,bevelSegments:5,steps:1,curveSegments:24});
  const heart=new Mesh(geometry,m.heart);heart.castShadow=true;heart.receiveShadow=true;
  place(root,heart,[0,.253,.268]);
  for(const side of [-1,1]) for(let finger=0;finger<2;finger++) {
    const hand=place(root,sculptedOval([.039,.028,.029],m.porcelainLimb),[side*(.149-finger*.005),.269+finger*.043,.354]);hand.rotation.z=side*.3;
  }
  return root;
}

export function companions(parent: Group,m: Materials) {
  const seats=group(parent,[-1.08,.64,.12]);
  const bear=place(seats,panda(m),[-.42,0,0]);bear.rotation.y=.19;
  const companion=place(seats,moflow(m),[.5,.01,.045]);companion.rotation.y=.07;
}
