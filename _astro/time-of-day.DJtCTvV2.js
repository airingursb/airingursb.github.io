import{b2 as F,g as O,ae as _,C as g,u as z,aK as I,t as k,V as T,aI as V,p as L,bc as U}from"./index.DF7zwiOd.js";import{r}from"./index.CZnHPpcR.js";class j extends L{constructor(){super({uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`
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
          #include <${U>=154?"colorspace_fragment":"encodings_fragment"}>
        }
      `})}get time(){return this.uniforms.time.value}set time(t){this.uniforms.time.value=t}get pixelRatio(){return this.uniforms.pixelRatio.value}set pixelRatio(t){this.uniforms.pixelRatio.value=t}}const y=e=>e&&e.constructor===Float32Array,D=e=>[e.r,e.g,e.b],v=e=>e instanceof k||e instanceof T||e instanceof V,b=e=>Array.isArray(e)?e:v(e)?e.toArray():[e,e,e];function c(e,t,a){return r.useMemo(()=>{if(t!==void 0){if(y(t))return t;if(t instanceof g){const n=Array.from({length:e*3},()=>D(t)).flat();return Float32Array.from(n)}else if(v(t)||Array.isArray(t)){const n=Array.from({length:e*3},()=>b(t)).flat();return Float32Array.from(n)}return Float32Array.from({length:e},()=>t)}return Float32Array.from({length:e},a)},[t])}const J=r.forwardRef(({noise:e=1,count:t=100,speed:a=1,opacity:n=1,scale:o=1,size:i,color:s,children:f,...w},A)=>{r.useMemo(()=>F({SparklesImplMaterial:j}),[]);const l=r.useRef(null),x=O(u=>u.viewport.dpr),m=b(o),P=r.useMemo(()=>Float32Array.from(Array.from({length:t},()=>m.map(_.randFloatSpread)).flat()),[t,...m]),S=c(t,i,Math.random),E=c(t,n),M=c(t,a),C=c(t*3,e),R=c(s===void 0?t*3:t,y(s)?s:new g(s),()=>1);return z(u=>{l.current&&l.current.material&&(l.current.material.time=u.clock.elapsedTime)}),r.useImperativeHandle(A,()=>l.current,[]),r.createElement("points",I({key:`particle-${t}-${JSON.stringify(o)}`},w,{ref:l}),r.createElement("bufferGeometry",null,r.createElement("bufferAttribute",{attach:"attributes-position",args:[P,3]}),r.createElement("bufferAttribute",{attach:"attributes-size",args:[S,1]}),r.createElement("bufferAttribute",{attach:"attributes-opacity",args:[E,1]}),r.createElement("bufferAttribute",{attach:"attributes-speed",args:[M,1]}),r.createElement("bufferAttribute",{attach:"attributes-color",args:[R,3]}),r.createElement("bufferAttribute",{attach:"attributes-noise",args:[C,3]})),f||r.createElement("sparklesImplMaterial",{transparent:!0,pixelRatio:x,depthWrite:!1}))}),d="world-time-override",H=[{phase:"dawn",start:300,end:450},{phase:"day",start:450,end:1020},{phase:"dusk",start:1020,end:1170}];function $(e){for(const o of H)if(e>=o.start&&e<o.end){const i=(e-o.start)/(o.end-o.start);return{phase:o.phase,blend:i}}const t=1170,a=300;let n;return e>=t?n=(e-t)/(1440-t+a):n=(1440-t+e)/(1440-t+a),{phase:"night",blend:n}}function G(){if(typeof window>"u")return null;try{const e=new URLSearchParams(window.location.search).get("time");if(e==="dawn"||e==="day"||e==="dusk"||e==="night")return e}catch{}return null}function K(){if(typeof window>"u")return null;try{const e=localStorage.getItem(d);if(e==="day"||e==="dusk")return e}catch{}return null}function W(e){if(!(typeof window>"u")){try{e===null?localStorage.removeItem(d):localStorage.setItem(d,e)}catch{}window.dispatchEvent(new CustomEvent("world-time-changed"))}}function h(e){return e==="day"||e==="dawn"?"day":"dusk"}function p(){const e=G();if(e)return{phase:e,blend:.5,theme:h(e),source:"url"};const t=K();if(t)return{phase:t,blend:.5,theme:t,source:"manual"};const a=new Date,n=a.getHours()*60+a.getMinutes(),{phase:o,blend:i}=$(n);return{phase:o,blend:i,theme:h(o),source:"real"}}function Y(){const[e,t]=r.useState(p);return r.useEffect(()=>{function a(){t(p())}window.addEventListener("world-time-changed",a);const n=window.setInterval(a,60*1e3);return()=>{window.removeEventListener("world-time-changed",a),clearInterval(n)}},[]),e}export{J as S,p as g,W as s,Y as u};
