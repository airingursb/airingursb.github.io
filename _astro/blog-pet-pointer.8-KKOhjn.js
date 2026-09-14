function d(o){const e=o.clientX-o.originX,n=o.clientY-o.originY,t=Math.hypot(e,n),c=o.deadZone??12;return{dx:e,dy:n,inDeadZone:t<c}}export{d as c};
