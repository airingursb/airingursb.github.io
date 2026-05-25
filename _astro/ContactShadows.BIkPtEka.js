import{bf as Z,u as A,aK as G,z as j,g as W,aO as _,aH as q,M as K,aB as L,C as N,o as k}from"./index.D4M2RmH_.js";import{r as e}from"./index.CZnHPpcR.js";const ee=parseInt(Z.replace(/\D+/g,"")),X={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
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
  `},J={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
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
  `},re=e.forwardRef(function({children:d,follow:g=!0,lockX:v=!1,lockY:n=!1,lockZ:x=!1,...y},M){const r=e.useRef(null),u=e.useRef(null),f=new j;return A(({camera:h})=>{if(!g||!u.current)return;const c=r.current.rotation.clone();u.current.updateMatrix(),u.current.updateWorldMatrix(!1,!1),u.current.getWorldQuaternion(f),h.getWorldQuaternion(r.current.quaternion).premultiply(f.invert()),v&&(r.current.rotation.x=c.x),n&&(r.current.rotation.y=c.y),x&&(r.current.rotation.z=c.z)}),e.useImperativeHandle(M,()=>u.current,[]),e.createElement("group",G({ref:u},y),e.createElement("group",{ref:r},d))}),te=e.forwardRef(({scale:a=10,frames:d=1/0,opacity:g=1,width:v=1,height:n=1,blur:x=1,near:y=0,far:M=10,resolution:r=512,smooth:u=!0,color:f="#000000",depthWrite:h=!1,renderOrder:c,...H},O)=>{const D=e.useRef(null),i=W(t=>t.scene),o=W(t=>t.gl),m=e.useRef(null);v=v*(Array.isArray(a)?a[0]:a||1),n=n*(Array.isArray(a)?a[1]:a||1);const[p,V,F,s,B,R,S]=e.useMemo(()=>{const t=new _(r,r),I=new _(r,r);I.texture.generateMipmaps=t.texture.generateMipmaps=!1;const E=new q(v,n).rotateX(Math.PI/2),Q=new K(E),U=new L;U.depthTest=U.depthWrite=!1,U.onBeforeCompile=l=>{l.uniforms={...l.uniforms,ucolor:{value:new N(f)}},l.fragmentShader=l.fragmentShader.replace("void main() {",`uniform vec3 ucolor;
           void main() {
          `),l.fragmentShader=l.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );","vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );")};const P=new k(X),z=new k(J);return z.depthTest=P.depthTest=!1,[t,E,U,Q,P,z,I]},[r,v,n,a,f]),T=t=>{s.visible=!0,s.material=B,B.uniforms.tDiffuse.value=p.texture,B.uniforms.h.value=t*1/256,o.setRenderTarget(S),o.render(s,m.current),s.material=R,R.uniforms.tDiffuse.value=S.texture,R.uniforms.v.value=t*1/256,o.setRenderTarget(p),o.render(s,m.current),s.visible=!1};let b=0,C,w;return A(()=>{m.current&&(d===1/0||b<d)&&(b++,C=i.background,w=i.overrideMaterial,D.current.visible=!1,i.background=null,i.overrideMaterial=F,o.setRenderTarget(p),o.render(i,m.current),T(x),u&&T(x*.4),o.setRenderTarget(null),D.current.visible=!0,i.overrideMaterial=w,i.background=C)}),e.useImperativeHandle(O,()=>D.current,[]),e.createElement("group",G({"rotation-x":Math.PI/2},H,{ref:D}),e.createElement("mesh",{renderOrder:c,geometry:V,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},e.createElement("meshBasicMaterial",{transparent:!0,map:p.texture,opacity:g,depthWrite:h})),e.createElement("orthographicCamera",{ref:m,args:[-v/2,v/2,n/2,-n/2,y,M]}))});export{re as B,te as C,ee as v};
