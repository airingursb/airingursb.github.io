import{b2 as E,g as F,ae as R,C as u,u as S,aK as _,s as w,V as O,aI as V,o as k,b8 as I}from"./index.D4M2RmH_.js";import{r}from"./index.CZnHPpcR.js";class T extends k{constructor(){super({uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`
        uniform float pixelRatio;
        uniform float time;
        attribute float size;  
        attribute float speed;  
        attribute float opacity;
        attribute vec3 noise;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          modelPosition.y += sin(time * speed + modelPosition.x * noise.x * 100.0) * 0.2;
          modelPosition.z += cos(time * speed + modelPosition.x * noise.y * 100.0) * 0.2;
          modelPosition.x += cos(time * speed + modelPosition.x * noise.z * 100.0) * 0.2;
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectionPostion = projectionMatrix * viewPosition;
          gl_Position = projectionPostion;
          gl_PointSize = size * 25. * pixelRatio;
          gl_PointSize *= (1.0 / - viewPosition.z);
          vColor = color;
          vOpacity = opacity;
        }
      `,fragmentShader:`
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float strength = 0.05 / distanceToCenter - 0.1;
          gl_FragColor = vec4(vColor, strength * vOpacity);
          #include <tonemapping_fragment>
          #include <${I>=154?"colorspace_fragment":"encodings_fragment"}>
        }
      `})}get time(){return this.uniforms.time.value}set time(t){this.uniforms.time.value=t}get pixelRatio(){return this.uniforms.pixelRatio.value}set pixelRatio(t){this.uniforms.pixelRatio.value=t}}const d=e=>e&&e.constructor===Float32Array,j=e=>[e.r,e.g,e.b],p=e=>e instanceof w||e instanceof O||e instanceof V,g=e=>Array.isArray(e)?e:p(e)?e.toArray():[e,e,e];function o(e,t,n){return r.useMemo(()=>{if(t!==void 0){if(d(t))return t;if(t instanceof u){const i=Array.from({length:e*3},()=>j(t)).flat();return Float32Array.from(i)}else if(p(t)||Array.isArray(t)){const i=Array.from({length:e*3},()=>g(t)).flat();return Float32Array.from(i)}return Float32Array.from({length:e},()=>t)}return Float32Array.from({length:e},n)},[t])}const H=r.forwardRef(({noise:e=1,count:t=100,speed:n=1,opacity:i=1,scale:c=1,size:y,color:s,children:m,...b},v)=>{r.useMemo(()=>E({SparklesImplMaterial:T}),[]);const a=r.useRef(null),A=F(l=>l.viewport.dpr),f=g(c),h=r.useMemo(()=>Float32Array.from(Array.from({length:t},()=>f.map(R.randFloatSpread)).flat()),[t,...f]),x=o(t,y,Math.random),P=o(t,i),C=o(t,n),M=o(t*3,e),z=o(s===void 0?t*3:t,d(s)?s:new u(s),()=>1);return S(l=>{a.current&&a.current.material&&(a.current.material.time=l.clock.elapsedTime)}),r.useImperativeHandle(v,()=>a.current,[]),r.createElement("points",_({key:`particle-${t}-${JSON.stringify(c)}`},b,{ref:a}),r.createElement("bufferGeometry",null,r.createElement("bufferAttribute",{attach:"attributes-position",args:[h,3]}),r.createElement("bufferAttribute",{attach:"attributes-size",args:[x,1]}),r.createElement("bufferAttribute",{attach:"attributes-opacity",args:[P,1]}),r.createElement("bufferAttribute",{attach:"attributes-speed",args:[C,1]}),r.createElement("bufferAttribute",{attach:"attributes-color",args:[z,3]}),r.createElement("bufferAttribute",{attach:"attributes-noise",args:[M,3]})),m||r.createElement("sparklesImplMaterial",{transparent:!0,pixelRatio:A,depthWrite:!1}))});export{H as S};
