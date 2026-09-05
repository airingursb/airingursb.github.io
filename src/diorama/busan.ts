import { BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, ConeGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, SRGBColorSpace, Sprite, SpriteMaterial, TubeGeometry, Vector3 } from 'three';
import { ball, box, cylinder, group, place, ring, rod } from './primitives';
import type { XYZ } from './primitives';

const colors = {
  base: '#234653', sea: '#356e79', foam: '#9dc7cc', quay: '#c8baa3', tile: '#b1ac99',
  rock: '#687c80', brick: '#8e6e60', plaster: '#b5a48a', roof: '#536a6a', coral: '#be7763',
  cream: '#e4cd9c', red: '#a7463f', gold: '#ffd49b', wood: '#685347', metal: '#394e53',
  fish: '#a6c4c8', shell: '#e3cbae', leaf: '#567768', rope: '#baa487',
} as const;

export function createBusan(parent: Group) {
  const matte = (color: string) => new MeshStandardMaterial({color, roughness: .84});
  const m = {
    base: matte(colors.base), quay: matte(colors.quay), tile: matte(colors.tile), rock: matte(colors.rock),
    brick: matte(colors.brick), plaster: matte(colors.plaster), roof: matte(colors.roof), coral: matte(colors.coral),
    cream: matte(colors.cream), red: matte(colors.red), wood: matte(colors.wood), metal: matte(colors.metal),
    fish: new MeshStandardMaterial({color: colors.fish, metalness: .25, roughness: .36}),
    shell: matte(colors.shell), leaf: matte(colors.leaf), rope: matte(colors.rope),
    window: new MeshStandardMaterial({color: colors.gold, emissive: colors.gold, emissiveIntensity: .9, roughness: .4}),
    bulb: new MeshStandardMaterial({color: '#fff1c6', emissive: colors.gold, emissiveIntensity: 2.3}),
    lantern: new MeshStandardMaterial({color: '#ffb07c', emissive: '#ff804e', emissiveIntensity: .65}),
    sea: new MeshPhysicalMaterial({color: colors.sea, metalness: .32, roughness: .3, clearcoat: .8, flatShading: false}),
    foam: new LineBasicMaterial({color: colors.foam, transparent: true, opacity: .30}),
    crest: new MeshBasicMaterial({color: '#bedadd', vertexColors: true, transparent: true, opacity: .72, depthWrite: false}),
    glint: new MeshBasicMaterial({color: '#e9c186', transparent: true, opacity: .35, depthWrite: false}),
  };
  const textures: CanvasTexture[] = [];
  const signs: MeshBasicMaterial[] = [];
  function sign(text: string, width: number, height: number, color = '#e4cd9c', background = '#394e53') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = background; context.fillRect(0, 0, 512, 160);
      context.strokeStyle = color; context.lineWidth = 3; context.strokeRect(10, 10, 492, 140);
      context.fillStyle = color; context.font = '500 68px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText(text, 256, 84, 470);
    }
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; textures.push(texture);
    const material = new MeshBasicMaterial({map: texture}); signs.push(material);
    return new Mesh(new PlaneGeometry(width, height), material);
  }
  function cable(points: XYZ[], radius = .012, material = m.metal) {
    return new Mesh(new TubeGeometry(new CatmullRomCurve3(points.map(point => new Vector3(...point))), 32, radius, 6, false), material);
  }
  function crate(root: Group, x: number, y: number, z: number) {
    for (const dz of [-.18, .18]) for (let i = 0; i < 3; i++) place(root, box([.47,.065,.026],m.wood,.004), [x,y+.055+i*.09,z+dz]);
    for (const dx of [-.22,.22]) for (let i=0;i<3;i++) place(root,box([.026,.065,.38],m.wood,.004),[x+dx,y+.055+i*.09,z]);
    place(root,box([.44,.025,.34],m.wood,.004),[x,y+.01,z]);
  }
  function fish(root: Group, x: number, y: number, z: number, angle: number) {
    const body=group(root,[x,y,z]); body.rotation.y=angle;
    place(body,ball([.12,.033,.043],m.fish),[0,0,0]);
    const tail=place(body,new Mesh(new ConeGeometry(.05,.08,3),m.fish),[-.14,0,0]);tail.rotation.z=-Math.PI/2;
    place(body,ball([.009,.008,.007],m.metal),[.075,.027,.024]);
  }
  function crab(root: Group, x: number, y: number, z: number) {
    const body=group(root,[x,y,z]); place(body,ball([.095,.04,.07],m.coral),[0,0,0]);
    for(const side of [-1,1]) {
      for(let i=0;i<3;i++) body.add(rod([side*.07,0,-.05+i*.05],[side*.15,-.018,-.085+i*.07],{radius:.008,material:m.coral}));
      place(body,ball([.038,.02,.026],m.coral),[side*.13,.02,.09]);
    }
  }

  place(parent,box([8.6,.42,6.15],m.base,.2),[0,-.26,0]);
  const waterGeometry=new PlaneGeometry(8.42,5.98,90,64); waterGeometry.rotateX(-Math.PI/2);
  const water=place(parent,new Mesh(waterGeometry,m.sea),[0,-.015,0]);water.receiveShadow=true;
  place(parent,box([3.45,.25,5.9],m.quay,.06),[2.46,.09,0]);
  place(parent,box([4.8,.25,1.6],m.quay,.06),[1.76,.09,2.15]);
  for(let x=0;x<17;x++) for(let z=0;z<11;z++) {
    const px=-3.97+x*.49, pz=-2.7+z*.51;
    if(px<.85 && (pz<1.35 || px<-.6)) continue;
    place(parent,box([.472,.032,.486],(x+z)%4===0?m.tile:m.quay,.007),[px,.233,pz]);
  }
  for(let i=0;i<3;i++) place(parent,box([.46,.14,.23],m.quay,.02),[-.37+i*.46,.23,1.35]);
  for(let i=0;i<8;i++) place(parent,box([.22,.14,.52],m.quay,.02),[.79,.23,-2.55+i*.52]);
  const plaque=place(parent,box([1.4,.17,.018],m.cream),[-.7,-.23,3.083]);plaque.receiveShadow=false;
  place(parent,sign('BUSAN · 06.30',1.27,.13,'#354d54','#e4cd9c'),[-.7,-.23,3.096]);

  const jettyStart=new Vector3(.84,.13,-2.4),jettyEnd=new Vector3(-2.85,.13,-1.83);
  for(let i=0;i<20;i++) {
    const p=jettyStart.clone().lerp(jettyEnd,i/19);
    place(parent,box([.36,.22,.66],m.quay,.035),[p.x,p.y,p.z]);
    for(const side of [-1,1]) {
      const rock=place(parent,ball([.2,.16,.18],m.rock),[p.x+.035*Math.sin(i),.04,p.z+side*.39]);
      rock.rotation.set(i*.4,i*.7,.2);
    }
  }
  const tower=group(parent,[-2.83,.24,-1.83]);
  place(tower,cylinder([.58,.65,.18],m.rock),[0,.01,0]);
  place(tower,cylinder([.45,.51,.12],m.quay),[0,.13,0]);
  place(tower,cylinder([.23,.36,1.78],m.red),[0,1.05,0]);
  for(const y of [.38,.48,1.67]) place(tower,cylinder([.32-(y-.38)*.067,.32-(y-.38)*.067,.028],m.coral),[0,y,0]);
  place(tower,box([.15,.35,.027],m.cream,.018),[0,.5,.315]);
  place(tower,box([.026,.06,.013],m.metal),[.045,.48,.334]);
  place(tower,cylinder([.37,.36,.07],m.red),[0,1.96,0]);
  place(tower,cylinder([.22,.22,.37],m.window),[0,2.18,0]);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    place(tower,cylinder([.012,.012,.42],m.red),[Math.cos(a)*.235,2.18,Math.sin(a)*.235]);
    place(tower,cylinder([.012,.012,.24],m.cream),[Math.cos(a)*.355,2.10,Math.sin(a)*.355]);
  }
  const rail=place(tower,ring(.355,.012,m.cream),[0,2.21,0]);rail.rotation.x=Math.PI/2;
  place(tower,new Mesh(new ConeGeometry(.34,.19,24),m.red),[0,2.48,0]);
  place(tower,cylinder([.02,.02,.2],m.metal),[0,2.65,0]);
  const beacon=place(tower,ball([.055,.055,.055],m.lantern),[0,2.75,0]);
  const haloCanvas=document.createElement('canvas');haloCanvas.width=64;haloCanvas.height=64;
  const haloContext=haloCanvas.getContext('2d');
  if(haloContext) {
    const glow=haloContext.createRadialGradient(32,32,0,32,32,32);
    glow.addColorStop(0,'rgba(255,190,131,.7)');glow.addColorStop(.18,'rgba(255,137,83,.35)');glow.addColorStop(1,'rgba(255,118,70,0)');
    haloContext.fillStyle=glow;haloContext.fillRect(0,0,64,64);
  }
  const haloTexture=new CanvasTexture(haloCanvas);textures.push(haloTexture);
  const haloMaterial=new SpriteMaterial({map:haloTexture,transparent:true,depthWrite:false,toneMapped:false});
  const halo=place(tower,new Sprite(haloMaterial),[0,2.75,0]);halo.scale.set(.5,.5,1);
  place(tower,new PointLight('#ffad75',1.5,4,2),[0,2.18,.12]);

  function shop(x: number, z: number, width: number, height: number, name: string, awning: MeshStandardMaterial) {
    const root=group(parent,[x,.25,z]);
    place(root,box([width,height,1.18],m.brick,.035),[0,height*.5,0]);
    place(root,box([width+.11,.13,1.31],m.roof,.025),[0,height+.055,0]);
    for(let i=0;i<7;i++) place(root,box([.025,.025,1.25],m.metal,.005),[-width*.45+i*width*.15,height+.13,0]);
    place(root,box([width-.15,.83,.045],m.metal),[0,.52,.61]);
    place(root,box([width-.25,.7,.035],m.window),[0,.56,.644]);
    for(const dx of [-width*.25,0,width*.25]) place(root,box([.026,.77,.035],m.wood),[dx,.57,.67]);
    for(const y of [.44,.78]) place(root,box([width-.22,.022,.04],m.wood),[0,y,.67]);
    place(root,box([width+.02,.085,.25],m.wood),[0,.25,.74]);
    place(root,box([width-.08,.35,.045],m.cream),[0,1.27,.626]);
    place(root,sign(name,width-.12,.31),[0,1.27,.655]);
    for(let i=0;i<8;i++) {
      const stripe=place(root,box([width/8+.008,.047,.86],i%2?m.cream:awning,.008),[-width*.5+width/16+i*width/8,1.06,.9]);stripe.rotation.x=.23;
      place(root,box([width/8+.005,.15,.045],i%2?m.cream:awning,.008),[-width*.5+width/16+i*width/8,.89,1.30]);
    }
    for(const side of [-1,1]) root.add(rod([side*width*.48,.29,1.26],[side*width*.48,1.22,.64],{radius:.014,material:m.metal}));
    if(height>1.9) {
      for(const side of [-1,1]) {
        place(root,box([width*.29,.47,.028],m.window),[side*width*.235,height-.43,.615]);
        place(root,box([.022,.51,.04],m.wood),[side*width*.235,height-.43,.643]);
        place(root,box([width*.33,.055,.1],m.plaster),[side*width*.235,height-.69,.64]);
      }
    }
    place(root,new PointLight(colors.gold,1.4,3.1,2),[0,.84,1.01]);
    return root;
  }
  shop(1.23,-2.05,1.0,2.55,'부산',m.coral);
  shop(2.37,-1.97,1.08,2.15,'해산물',m.roof);
  shop(3.54,-1.78,1.06,1.83,'포차',m.coral);
  for(let i=0;i<3;i++) {
    const x=1.15+i*1.2;
    place(parent,cylinder([.021,.021,2.7],m.metal),[x,1.58,-.50]);
  }
  parent.add(cable([[.90,2.72,-.5],[2.0,2.46,-.45],[3.95,2.59,-.38]]));
  for(let i=0;i<13;i++) {
    const x=.92+i*.25,y=2.49+Math.pow((i-6)/6,2)*.16;
    parent.add(rod([x,y,-.45],[x,y-.09,-.45],{radius:.009,material:m.metal}));
    place(parent,ball([.036,.052,.036],m.bulb),[x,y-.11,-.45]);
  }

  const cart=group(parent,[3.28,.25,.78]);
  place(cart,box([1.04,.69,.65],m.roof),[0,.35,0]);
  for(let i=0;i<7;i++) place(cart,box([.023,.54,.019],m.wood),[-.46+i*.15,.33,.338]);
  for(const x of [-.41,.41]) {
    const wheel=place(cart,ring(.14,.034,m.metal),[x,.06,.22]);
    wheel.receiveShadow=true;
  }
  place(cart,box([1.15,.065,.79],m.wood),[0,.72,0]);
  for(const x of [-.34,.03,.37]) {
    place(cart,box([.32,.028,.52],m.metal,.015),[x,.77,0]);
    place(cart,box([.27,.025,.46],m.shell,.008),[x,.79,0]);
  }
  fish(cart,-.36,.82,-.09,.45);fish(cart,-.36,.84,.1,-.3);
  crab(cart,.03,.85,.02);
  for(let i=0;i<6;i++) place(cart,ball([.034,.017,.045],m.cream),[.3+(i%2)*.09,.835,-.14+Math.floor(i/2)*.12]);
  for(const x of [-.54,.54]) place(cart,cylinder([.017,.017,1.35],m.metal),[x,.96,-.27]);
  place(cart,sign('오늘의 메뉴',.81,.23,'#e4cd9c','#685347'),[0,1.43,-.24]);
  place(cart,cylinder([.075,.075,.16],m.lantern),[.54,1.3,-.05]);
  crate(parent,3.82,.26,1.57);crate(parent,3.86,.57,1.59);crate(parent,2.66,.26,.53);
  const board=group(parent,[2.2,.26,1.94]);board.rotation.y=-.22;
  place(board,box([.42,.58,.045],m.wood),[0,.34,0]);
  place(board,sign('어묵',.36,.4),[0,.35,.027]);
  for(const x of [-.17,.17]) board.add(rod([x,0,-.15],[x,.62,0],{radius:.02,material:m.wood}));

  place(parent,box([2.20,.15,.72],m.quay,.05),[.93,.315,1.2]);
  for(const x of [.04,1.83]) place(parent,box([.19,.17,.50],m.rock),[x,.23,1.18]);
  const companionRoot=group(parent,[2.0,-.259,1.15]);
  for(let i=0;i<5;i++) {
    const z=-1.1+i*.58;
    place(parent,cylinder([.025,.034,.55],m.metal),[.74,.52,z]);
    place(parent,ball([.039,.03,.039],m.cream),[.74,.81,z]);
    if(i<4) parent.add(cable([[.74,.68,z],[.74,.62,z+.29],[.74,.68,z+.58]],.012,m.rope));
  }
  for(let i=0;i<3;i++) {
    const z=1.58+i*.57;
    place(parent,cylinder([.027,.037,.58],m.metal),[-.51,.53,z]);
    if(i<2) parent.add(cable([[-.51,.7,z],[-.51,.64,z+.285],[-.51,.7,z+.57]],.012,m.rope));
  }
  place(parent,cylinder([.08,.1,.17],m.metal),[.89,.36,.63]);
  place(parent,box([.26,.06,.1],m.metal),[.89,.45,.63]);
  const boat=group(parent,[-1.62,.04,.2]);boat.rotation.y=-.33;
  place(boat,ball([.68,.17,.24],m.cream),[0,0,0]);
  place(boat,ball([.54,.035,.18],m.wood),[0,.145,0]);
  for(const x of [-.25,.17]) place(boat,box([.1,.055,.35],m.quay),[x,.2,0]);
  place(boat,box([.22,.24,.28],m.roof),[-.22,.29,0]);
  place(boat,box([.23,.1,.018],m.window),[-.22,.33,.152]);
  place(boat,cylinder([.012,.012,.83],m.wood),[.22,.57,0]);
  boat.add(cable([[.22,.99,0],[-.45,.3,0]],.007));
  for(const x of [-.43,-.12,.2]) place(boat,ball([.055,.072,.055],m.coral),[x,.1,.235]);
  parent.add(cable([[.89,.43,.63],[-.15,.14,.48],[-1.0,.19,.32]],.009,m.rope));

  const wave=(x: number,z: number,t: number)=>.085*Math.cos((x+4.1+.10*Math.sin(z*1.3))*Math.PI*2/1.6-t*Math.PI*2/4.5)+.018*Math.sin(z*3.2+x*1.2+t*.6);
  const crests=Array.from({length:3},()=>{
    const geometry=new BufferGeometry();
    const positions=new Float32Array(65*5*3),colors=new Float32Array(65*5*3),indices:number[]=[];
    const edge=new Color('#467985'),center=new Color('#eff9ef');
    for(let row=0;row<65;row++) for(let column=0;column<5;column++) {
      const color=edge.clone().lerp(center,Math.pow(1-Math.abs(column-2)/2,.6));
      const vertex=row*5+column;color.toArray(colors,vertex*3);
      if(row<64&&column<4) indices.push(vertex,vertex+5,vertex+1,vertex+1,vertex+5,vertex+6);
    }
    geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setIndex(indices);
    const material=m.crest.clone();const mesh=new Mesh(geometry,material);mesh.frustumCulled=false;parent.add(mesh);
    return {geometry,material,positions:geometry.getAttribute('position')};
  });
  const foamPositions: number[]=[];
  for(let i=0;i<38;i++) {
    const x=-3.9+(i*1.73)%4.4,z=-2.7+(i*.81)%5.5,length=.15+(i%5)*.07;
    for(let j=0;j<6;j++) for(const k of [j,j+1]) {
      const px=x+k*length/6,pz=z+.032*Math.sin(k*Math.PI/6);
      foamPositions.push(px,.06,pz);
    }
  }
  const foamGeometry=new BufferGeometry();foamGeometry.setAttribute('position',new Float32BufferAttribute(foamPositions,3));
  parent.add(new LineSegments(foamGeometry,m.foam));
  const reflections: Mesh[]=[];
  for(let i=0;i<15;i++) {
    const glint=place(parent,new Mesh(new PlaneGeometry(.09+(i%4)*.04,.016),m.glint),[-2.78+Math.sin(i*2)*.09,.065,-1.42+i*.13]);
    glint.rotation.x=-Math.PI/2;reflections.push(glint);
  }
  const waterPositions=waterGeometry.getAttribute('position'),foam=foamGeometry.getAttribute('position');
  const runtime = {
    companionRoot,
    anchors:[new Vector3(-.38,.6,1.79),new Vector3(-2.83,1.58,-1.83),new Vector3(3.08,.55,1.16)],
    update(time: number) {
      for(let i=0;i<waterPositions.count;i++) waterPositions.setY(i,wave(waterPositions.getX(i),waterPositions.getZ(i),time));
      waterPositions.needsUpdate=true;waterGeometry.computeVertexNormals();
      crests.forEach((crest,index)=>{
        const phase=(time/13.5+index/3)%1;
        const front=-4.1+phase*4.8;crest.material.opacity=.76*Math.pow(Math.sin(phase*Math.PI),.45);
        for(let row=0;row<65;row++) {
          const z=-2.7+row/64*5.5;
          const bend=.10*Math.sin(z*1.3);
          const limit=z>1.31?-.67:.69;
          const width=.11+.035*Math.sin(z*5.3+index);
          for(let column=0;column<5;column++) {
            const x=Math.max(-4.17,Math.min(limit,front-bend+(column-2)*width/4));
            crest.positions.setXYZ(row*5+column,x,wave(x,z,time)+.013,z);
          }
        }
        crest.positions.needsUpdate=true;
      });
      for(let i=0;i<foam.count;i++) foam.setY(i,.026+wave(foam.getX(i),foam.getZ(i),time));
      foam.needsUpdate=true;
      boat.position.y=.035+wave(boat.position.x,boat.position.z,time)*.65;boat.rotation.z=Math.sin(time*Math.PI*2/4.5)*.04;
      beacon.scale.setScalar(.055*(.96+Math.sin(time*.75)*.04));
      reflections.forEach((reflection,i)=>{reflection.scale.x=.85+.25*Math.sin(time*.9+i);reflection.position.y=.047+wave(reflection.position.x,reflection.position.z,time);});
    },
    dispose() { crests.forEach(crest=>crest.material.dispose()); haloMaterial.dispose(); Object.values(m).forEach(material=>material.dispose());signs.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose()); },
  };
  runtime.update(0);
  return runtime;
}
