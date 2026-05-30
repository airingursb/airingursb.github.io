import{bd as Z,u as R,aK as k,H as q,g as W,aO as H,aH as L,r as $,aB as K,C as G,s as B,be as N,V as X,bf as J,bc as Y}from"./index.c69zeyOY.js";import{r as e}from"./index.CZnHPpcR.js";const ie=parseInt(Z.replace(/\D+/g,"")),ee={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `},re={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,fragmentShader:`

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `},se=e.forwardRef(function({children:l,follow:u=!0,lockX:n=!1,lockY:o=!1,lockZ:p=!1,...U},h){const r=e.useRef(null),i=e.useRef(null),f=new q;return R(({camera:M})=>{if(!u||!i.current)return;const m=r.current.rotation.clone();i.current.updateMatrix(),i.current.updateWorldMatrix(!1,!1),i.current.getWorldQuaternion(f),M.getWorldQuaternion(r.current.quaternion).premultiply(f.invert()),n&&(r.current.rotation.x=m.x),o&&(r.current.rotation.y=m.y),p&&(r.current.rotation.z=m.z)}),e.useImperativeHandle(h,()=>i.current,[]),e.createElement("group",k({ref:i},U),e.createElement("group",{ref:r},l))}),ue=e.forwardRef(({scale:t=10,frames:l=1/0,opacity:u=1,width:n=1,height:o=1,blur:p=1,near:U=0,far:h=10,resolution:r=512,smooth:i=!0,color:f="#000000",depthWrite:M=!1,renderOrder:m,...g},b)=>{const x=e.useRef(null),a=W(v=>v.scene),s=W(v=>v.gl),d=e.useRef(null);n=n*(Array.isArray(t)?t[0]:t||1),o=o*(Array.isArray(t)?t[1]:t||1);const[c,j,O,y,w,C,P]=e.useMemo(()=>{const v=new H(r,r),_=new H(r,r);_.texture.generateMipmaps=v.texture.generateMipmaps=!1;const I=new L(n,o).rotateX(Math.PI/2),Q=new $(I),S=new K;S.depthTest=S.depthWrite=!1,S.onBeforeCompile=D=>{D.uniforms={...D.uniforms,ucolor:{value:new G(f)}},D.fragmentShader=D.fragmentShader.replace("void main() {",`uniform vec3 ucolor;
           void main() {
          `),D.fragmentShader=D.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );","vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );")};const F=new B(ee),V=new B(re);return V.depthTest=F.depthTest=!1,[v,I,S,Q,F,V,_]},[r,n,o,t,f]),T=v=>{y.visible=!0,y.material=w,w.uniforms.tDiffuse.value=c.texture,w.uniforms.h.value=v*1/256,s.setRenderTarget(P),s.render(y,d.current),y.material=C,C.uniforms.tDiffuse.value=P.texture,C.uniforms.v.value=v*1/256,s.setRenderTarget(c),s.render(y,d.current),y.visible=!1};let E=0,A,z;return R(()=>{d.current&&(l===1/0||E<l)&&(E++,A=a.background,z=a.overrideMaterial,x.current.visible=!1,a.background=null,a.overrideMaterial=O,s.setRenderTarget(c),s.render(a,d.current),T(p),i&&T(p*.4),s.setRenderTarget(null),x.current.visible=!0,a.overrideMaterial=z,a.background=A)}),e.useImperativeHandle(b,()=>x.current,[]),e.createElement("group",k({"rotation-x":Math.PI/2},g,{ref:x}),e.createElement("mesh",{renderOrder:m,geometry:j,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},e.createElement("meshBasicMaterial",{transparent:!0,map:c.texture,opacity:u,depthWrite:M})),e.createElement("orthographicCamera",{ref:d,args:[-n/2,n/2,o/2,-o/2,U,h]}))});class te extends B{constructor(){super({uniforms:{time:{value:0},fade:{value:1}},vertexShader:`
      uniform float time;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
        gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
        gl_Position = projectionMatrix * mvPosition;
      }`,fragmentShader:`
      uniform sampler2D pointTexture;
      uniform float fade;
      varying vec3 vColor;
      void main() {
        float opacity = 1.0;
        if (fade == 1.0) {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
        }
        gl_FragColor = vec4(vColor, opacity);

        #include <tonemapping_fragment>
	      #include <${Y>=154?"colorspace_fragment":"encodings_fragment"}>
      }`})}}const ae=t=>new X().setFromSpherical(new J(t,Math.acos(1-Math.random()*2),Math.random()*2*Math.PI)),ve=e.forwardRef(({radius:t=100,depth:l=50,count:u=5e3,saturation:n=0,factor:o=4,fade:p=!1,speed:U=1},h)=>{const r=e.useRef(null),[i,f,M]=e.useMemo(()=>{const g=[],b=[],x=Array.from({length:u},()=>(.5+.5*Math.random())*o),a=new G;let s=t+l;const d=l/u;for(let c=0;c<u;c++)s-=d*Math.random(),g.push(...ae(s).toArray()),a.setHSL(c/u,n,.9),b.push(a.r,a.g,a.b);return[new Float32Array(g),new Float32Array(b),new Float32Array(x)]},[u,l,o,t,n]);R(g=>r.current&&(r.current.uniforms.time.value=g.clock.elapsedTime*U));const[m]=e.useState(()=>new te);return e.createElement("points",{ref:h},e.createElement("bufferGeometry",null,e.createElement("bufferAttribute",{attach:"attributes-position",args:[i,3]}),e.createElement("bufferAttribute",{attach:"attributes-color",args:[f,3]}),e.createElement("bufferAttribute",{attach:"attributes-size",args:[M,1]})),e.createElement("primitive",{ref:r,object:m,attach:"material",blending:N,"uniforms-fade-value":p,depthWrite:!1,transparent:!0,vertexColors:!0}))});export{se as B,ue as C,ve as S,ie as v};
