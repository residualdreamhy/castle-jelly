import * as T from 'three/webgpu';
const $=s=>document.querySelector(s), canvas=$('#scene'), panel=$('.panel');
const PI=Math.PI,TAU=2*PI,V=(x,y,z)=>new T.Vector3(x,y,z),clamp=T.MathUtils.clamp;
const icons={crown:'M2 6l4 4 3-6 3 6 4-4-2 9H4z M5 17h8',sliders:'M2 5h7m4 0h3M2 13h2m4 0h8 M9 3v4 M5 11v4',fire:'M9 2v4m0 6v4M2 9h4m6 0h4M4 4l3 3m4 4 3 3M4 14l3-3m4-4 3-3',bridge:'M2 14h14M3 14V5m12 9V5M3 6q6 8 12 0M6 10v4m6-4v4',salute:'M2 10l11-5 2 3-11 5z M7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0',coin:'M15 9A6 6 0 1 1 3 9a6 6 0 0 1 12 0z M9 5l2 4-2 4-2-4z'};
const icon=k=>'<svg aria-hidden="true" viewBox="0 0 18 18"><path d="'+icons[k]+'"/></svg>';
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const cfg={firm:.55,flow:.72,damp:.36,day:0},flavours={Glacier:['#8ed6c7','#4fbaad','#b9f5e5'],Rose:['#e9a8b5','#d97698','#ffd6df'],Lilac:['#c4a5df','#a088c8','#eee4ff']};
let flavour='Glacier',clock=0,seed=842,flash=0,bridgeTarget=0,bridgeAngle=0,lit=true,nightTimer=4,waveTime=0;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let msgTimer;function notice(s){const n=$('.notice');n.textContent=s;n.hidden=false;clearTimeout(msgTimer);msgTimer=setTimeout(()=>n.hidden=true,2000)}
$('.sheet').onclick=e=>{let open=panel.classList.toggle('open');e.target.textContent=open?'收起 ▾':'展开 ▴';e.target.setAttribute('aria-expanded',open)};
for(const [key,label] of Object.entries({firm:'凝胶硬度',flow:'瀑布流量',damp:'波浪阻尼',day:'昼夜'})){let el=document.createElement('label');el.className='sl';el.innerHTML='<div><span>'+label+'</span><output></output></div><input type="range" min="0" max="100" value="'+Math.round(cfg[key]*100)+'" aria-label="'+label+'">';$('#sliders').append(el);let input=el.querySelector('input');input.oninput=()=>{cfg[key]=input.value/100;el.querySelector('output').textContent=key==='day'?(cfg.day<.35?'正午':cfg.day<.72?'黄昏':'夜晚'):input.value+'%';document.body.classList.toggle('night',cfg.day>.72)};input.oninput()}
function button(parent,label,html,fn){let b=document.createElement('button');b.innerHTML=html;b.setAttribute('aria-label',label);b.onclick=fn;$(parent).append(b);return b}
for(let [k,c] of Object.entries(flavours)){let label={Glacier:'冰川',Rose:'玫瑰',Lilac:'丁香'}[k];let b=button('.flavours',label,'<i class="dot" style="--c:'+c[0]+'"></i>'+label,()=>{flavour=k;updateFlavour();document.querySelectorAll('.flavours button').forEach(x=>x.setAttribute('aria-pressed',x===b))});b.setAttribute('aria-pressed',k===flavour)}
const scene=new T.Scene(),root=new T.Group();scene.add(root);
const camera=new T.OrthographicCamera(-8,8,6,-6,.1,100);camera.position.set(9,8,13);camera.lookAt(0,1.72,0);
const renderer=new T.WebGPURenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
try{await renderer.init()}catch(e){$('.notice').hidden=false;$('.notice').textContent='请开启浏览器硬件加速以查看微景观。';throw e}
canvas.dataset.renderer=renderer.backend.isWebGPUBackend?'WebGPU':'WebGL2';
const hemi=new T.HemisphereLight(0xfff8ec,0xd7c2bb,2.25);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff2d4,3);sun.position.set(-5,10,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7});sun.shadow.normalBias=.018;sun.shadow.bias=-.0003;scene.add(sun);
const rim=new T.DirectionalLight(0xc4edff,1.25);rim.position.set(3,5,-6);scene.add(rim);
const glow=new T.PointLight(0xff88ae,0,15);scene.add(glow);
const mats=new Map();function mat(c){if(typeof c!=='string')return c;if(!mats.has(c))mats.set(c,new T.MeshPhysicalMaterial({color:c,roughness:.34,clearcoat:.24,clearcoatRoughness:.2}));return mats.get(c)}
const cream='#fff0ce',gold='#dba94a',pink='#e888ae',lav='#a597da',blue='#83b8d3',green='#73ae81',ivory='#fff9df',wood='#af7855';
function mesh(g,c,x=0,y=0,z=0,p=root){let m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m}
const unitBox=new T.BoxGeometry(),sphere=new T.SphereGeometry(1,14,10),cylinders=new Map();
function box(x,y,z,w,h,d,c,p){let m=mesh(unitBox,c,x,y,z,p);m.scale.set(w,h,d);return m}
function ball(x,y,z,a,b,d,c,p){let m=mesh(sphere,c,x,y,z,p);m.scale.set(a,b,d);return m}
function cyl(x,y,z,top,bottom,h,c,p,n=28){let key=[top,bottom,h,n].join();if(!cylinders.has(key))cylinders.set(key,new T.CylinderGeometry(top,bottom,h,n));return mesh(cylinders.get(key),c,x,y,z,p)}
function rod(a,b,r,c,p){let dir=b.clone().sub(a),m=cyl(0,0,0,r,r,dir.length(),c,p,8);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return m}
function line(points,r,c,p=root){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(10,points.length*2),r,5,false),c,0,0,0,p)}
function slab(size,y,h,r,c){
  // 圆角直边也要有顶点，才能在按压点局部变形。
  const positions=[],indices=[],outline=[],a=size/2-r;
  for(let side=0;side<4;side++){
    const angle=side*PI/2,cs=Math.cos(angle),sn=Math.sin(angle);
    for(let j=0;j<32;j++){
      const t=-a+2*a*j/32;
      outline.push([cs*a-sn*t,sn*a+cs*t,cs,sn]);
    }
    for(let j=0;j<8;j++){
      const b=angle+j*PI/16;
      outline.push([a*(cs-sn),a*(cs+sn),Math.cos(b),Math.sin(b)]);
    }
  }
  const n=outline.length,levels=[[-.044,0],[-.031,.032],[0,.045],[h*.5,.045],[h,.045],[h+.031,.032],[h+.044,0]];
  for(let row=0;row<levels.length;row++){
    const [height,bevel]=levels[row];
    for(let i=0;i<n;i++){
      const [cx,cz,nx,nz]=outline[i];positions.push(cx+(r+bevel)*nx,height,cz+(r+bevel)*nz);
      if(row){const lo=(row-1)*n+i,next=(row-1)*n+(i+1)%n;indices.push(lo,lo+n,next+n,lo,next+n,next);}
    }
  }
  for(const row of [0,levels.length-1]){
    const center=positions.length/3;positions.push(0,levels[row][0],0);
    for(let i=0;i<n;i++){const v=row*n+i,w=row*n+(i+1)%n;if(row)indices.push(center,w,v);else indices.push(center,v,w);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  return mesh(g,c,0,y,0);
}

const strata=['#dbaca7','#f3d0b5','#cb9fae','#fff0cd','#d3b2c8','#d99f96','#efc3a5'];
const draggableLayers=strata.slice(0,5).map((c,i)=>slab(5.94+i*.009,-.99+i*.105,.09,.23,c));
const jelly=new T.MeshPhysicalMaterial({color:0x87d4c1,transparent:true,opacity:.46,roughness:.14,metalness:.05,clearcoat:1,depthWrite:false});
const cut=slab(5.98,-.48,.518,.21,jelly);cut.castShadow=false;cut.renderOrder=2;
const floor=box(0,-1.19,0,200,.22,200,new T.MeshLambertMaterial({color:0xd3d0c7}),scene);
function footprint(x,z){let dx=Math.abs(x+.72)-1.99,dz=Math.abs(z+1.03)-1.63;return Math.hypot(Math.max(dx,0),Math.max(dz,0))+Math.min(Math.max(dx,dz),0)-.12}
function sdf(x,y,z){const erosion=.058*Math.sin(5*x+2*z)+.038*Math.sin(11*z-x)+.025*Math.sin(10*y+x*3);return Math.max(footprint(x,z)+erosion-Math.max(0,.25-y)*.48,y-1.33+.025*Math.sin(x*4+z),-.54-y)}
// Surface nets: place one vertex at the average edge crossing of each mixed cell,
// then stitch the four cells sharing each sign-changing lattice edge.
function cliff(){const step=.145,nx=46,ny=17,nz=45,points=[],indices=[],ids=new Int32Array(nx*ny*nz).fill(-1),values=new Float32Array(ids.length);
const at=(x,y,z)=>x+nx*(y+ny*z),base=V(-3.35,-.78,-3.28),stride=[1,nx,nx*ny],offs=[0,1,nx,nx+1,nx*ny,nx*ny+1,nx*ny+nx,nx*ny+nx+1];
for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)values[at(x,y,z)]=sdf(base.x+x*step,base.y+y*step,base.z+z*step);
for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){let i=at(x,y,z),v=offs.map(o=>values[i+o]);if(v.every(a=>a>=0)||v.every(a=>a<0))continue;let sum=[0,0,0],n=0;for(let k=0;k<8;k++)for(let d=0;d<3;d++){let bit=1<<d;if(k&bit)continue;let end=k+bit;if((v[k]<0)===(v[end]<0))continue;let t=v[k]/(v[k]-v[end]);for(let j=0;j<3;j++)sum[j]+=((k>>j)&1)+(d===j?t:0);n++}
ids[i]=points.length/3;points.push(base.x+step*(x+sum[0]/n),base.y+step*(y+sum[1]/n),base.z+step*(z+sum[2]/n));
for(let d=0;d<3;d++){if((v[0]<0)===(v[1<<d]<0))continue;let a=stride[(d+1)%3],b=stride[(d+2)%3],q=[ids[i],ids[i-a],ids[i-a-b],ids[i-b]];if(q.some(j=>j<0))continue;if(v[0]>=0)q.reverse();indices.push(q[0],q[1],q[2],q[0],q[2],q[3])}}
let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();
// A generated gradient texture follows elevation across every triangle.
let tex=document.createElement('canvas');tex.width=4;tex.height=512;let ctx=tex.getContext('2d');for(let j=0;j<512;j++){let h=2-j/512*3;ctx.fillStyle=h>1.22?'#a4c786':strata[((Math.floor((h+.99)/.14)%7)+7)%7];ctx.fillRect(0,j,4,1)}
let uv=[];for(let i=0;i<points.length;i+=3)uv.push(.5,(points[i+1]+1+.042*Math.sin(points[i]*3+points[i+2]))/3);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));let map=new T.CanvasTexture(tex);map.colorSpace=T.SRGBColorSpace;mesh(g,new T.MeshStandardMaterial({map,roughness:.82,side:T.DoubleSide}))}cliff();
const waterMat=new T.MeshPhysicalMaterial({transparent:true,opacity:.36,roughness:.13,clearcoat:1,depthWrite:false,side:T.DoubleSide});
const N=49,size=5.96,waterGeo=new T.PlaneGeometry(size,size,N-1,N-1);waterGeo.rotateX(-PI/2);let water=mesh(waterGeo,waterMat,0,.092,0);water.castShadow=false;water.renderOrder=3;
let heights=new Float32Array(N*N),speed=new Float32Array(N*N);
// 倾斜与水面晃动均在固定时间步更新。目标角在按住切面时持续有效。
const tilt=new T.Vector2(), tiltVelocity=new T.Vector2(), tiltTarget=new T.Vector2();
const slosh=new T.Vector2(), sloshVelocity=new T.Vector2();
const maxTilt=.21,pressPoint=V(0,0,0),pressNormal=V(0,0,1);
const dent={core:0,speed:0,shoulder:0,shoulderSpeed:0};
let pressedOnce=false;
const pressMeshes=[...draggableLayers,cut,water].map(m=>{
  const pos=m.geometry.attributes.position;
  return {m,pos,rest:pos.array.slice(),core:new Float32Array(pos.count),shoulder:new Float32Array(pos.count)};
});
const touchGlint=mesh(new T.TorusGeometry(.13,.011,6,36),new T.MeshBasicMaterial({color:'#fff4c8',transparent:true,depthWrite:false}));
touchGlint.castShadow=false;touchGlint.visible=false;touchGlint.renderOrder=7;
function startPress(point,normal){
  pressPoint.copy(point);pressNormal.set(normal.x,0,normal.z).normalize();pressedOnce=true;
  for(const {m,pos,rest,core,shoulder} of pressMeshes){
    for(let i=0;i<pos.count;i++){
      const dx=rest[3*i]-point.x,dy=rest[3*i+1]+m.position.y-point.y,dz=rest[3*i+2]-point.z;
      const d=dx*dx+dz*dz+dy*dy*.82;
      core[i]=Math.exp(-d/.13);shoulder[i]=Math.exp(-d/.47)-core[i];
    }
  }
  touchGlint.quaternion.setFromUnitVectors(V(0,0,1),pressNormal);
  touchGlint.visible=true;touchGlint.material.opacity=.98;touchGlint.position.copy(point).addScaledVector(pressNormal,.012);
}
function stepDent(dt){
  const load=heldEdge ? .045+.19*(1-cfg.firm):0;
  dent.speed+=((load-dent.core)*(100+60*cfg.firm)-dent.speed*(9+4*cfg.firm))*dt;
  dent.core+=dent.speed*dt;
  dent.shoulderSpeed+=((dent.core-dent.shoulder)*54-dent.shoulderSpeed*9)*dt;
  dent.shoulder+=dent.shoulderSpeed*dt;
}
function deformJelly(){
  for(const {m,pos,rest,core,shoulder} of pressMeshes){
    if(m!==water&&m!==cut&&!pressedOnce)continue;
    for(let i=0;i<pos.count;i++){
      const x=rest[3*i],y=rest[3*i+1],z=rest[3*i+2];
      const depth=core[i]*dent.core+shoulder[i]*dent.shoulder;
      const px=x-pressNormal.x*depth,pz=z-pressNormal.z*depth;
      let py=y;
      if(m===cut)py+=clamp(y/.518,0,1)*liquidSlope(px,pz);
      if(m===water)py=liquidSlope(px,pz)+heights[i]+.012*Math.sin(px*3+clock*1.5)*Math.cos(pz*3-clock);
      pos.setXYZ(i,px,py,pz);
    }
    pos.needsUpdate=true;m.geometry.computeVertexNormals();
  }
  if(pressedOnce){
    touchGlint.position.copy(pressPoint).addScaledVector(pressNormal,.017-dent.core);
    touchGlint.material.opacity=heldEdge ? .92:clamp(Math.abs(dent.core)*5,0,.8);
    touchGlint.visible=touchGlint.material.opacity>.03;
    if(!heldEdge&&Math.abs(dent.speed)+Math.abs(dent.core)+Math.abs(dent.shoulderSpeed)+Math.abs(dent.shoulder)<.00008){
      Object.assign(dent,{core:0,speed:0,shoulder:0,shoulderSpeed:0});
      for(const {m,pos,rest} of pressMeshes)if(m!==water&&m!==cut){pos.array.set(rest);pos.needsUpdate=true;m.geometry.computeVertexNormals();}
      pressedOnce=false;
    }
  }
}
const rippleMarks=Array.from({length:9},()=>{
  const m=mesh(new T.RingGeometry(.91,1,48),new T.MeshBasicMaterial({color:'#ecfff2',transparent:true,depthWrite:false,side:T.DoubleSide}));
  m.rotation.x=-PI/2;m.castShadow=false;m.visible=false;m.renderOrder=6;return m;
});
let rippleIndex=0;
function waterTouch(p,strength){
  disturb(p.x,p.z,strength);
  alarmFish(p.x,p.z,strength);
  const ring=rippleMarks[rippleIndex++%rippleMarks.length];
  ring.userData.born=clock;ring.userData.strength=strength;ring.scale.setScalar(.07);
  ring.position.set(p.x,lakeHeight(p.x,p.z)+.014,p.z);ring.material.opacity=.85;ring.visible=true;
}
function animateRipples(){
  for(const r of rippleMarks)if(r.visible){
    const t=(clock-r.userData.born)/.78;
    if(t>=1){r.visible=false;continue;}
    r.position.y=lakeHeight(r.position.x,r.position.z)+.015;
    r.scale.setScalar(.07+t*(.23+.11*r.userData.strength));r.material.opacity=.86*(1-t)*(1-t);
  }
}

let heldEdge=false,releaseDelay=0;
function stepTilt(dt) {
  releaseDelay=Math.max(0,releaseDelay-dt);
  const tracking=heldEdge||releaseDelay>0;
  if(!tracking)tiltTarget.set(0,0);
  const stiffness=tracking?58:1.85+cfg.firm*.7, damping=tracking?14:2.38;
  for(const axis of ['x','y']) {
    const acceleration=stiffness*(tiltTarget[axis]-tilt[axis])-damping*tiltVelocity[axis];
    tiltVelocity[axis]+=acceleration*dt;
    tilt[axis]+=tiltVelocity[axis]*dt;
    const lag=-.12*tilt[axis]-.11*tiltVelocity[axis];
    sloshVelocity[axis]+=(14*(lag-slosh[axis])-(2+cfg.damp*2)*sloshVelocity[axis])*dt;
    slosh[axis]+=sloshVelocity[axis]*dt;
  }
  root.rotation.set(tilt.x,0,tilt.y);
  root.updateMatrix();
  const m=root.matrix.elements;
  // 让最低的底角继续接触桌面。
  root.position.y=3.03*(Math.abs(m[1])+Math.abs(m[9]))+1.034*(m[5]-1);
  root.updateWorldMatrix(true,false);
}
function liquidSlope(x,z){return slosh.y*x-slosh.x*z}
function lakeHeight(x,z) {
  const gx=clamp((x/size+.5)*(N-1),0,N-1),gz=clamp((z/size+.5)*(N-1),0,N-1);
  const i=Math.min(Math.floor(gx),N-2),j=Math.min(Math.floor(gz),N-2),k=j*N+i;
  const ax=gx-i,az=gz-j;
  const h=T.MathUtils.lerp(T.MathUtils.lerp(heights[k],heights[k+1],ax),T.MathUtils.lerp(heights[k+N],heights[k+N+1],ax),az);
  return water.position.y+liquidSlope(x,z)+h+.012*Math.sin(x*3+clock*1.5)*Math.cos(z*3-clock);
}
function disturb(x,z,amp){let i=Math.round((x/size+.5)*(N-1)),j=Math.round((z/size+.5)*(N-1));for(let v=-2;v<=2;v++)for(let u=-2;u<=2;u++){if(i+u>0&&i+u<N-1&&j+v>0&&j+v<N-1)speed[(j+v)*N+i+u]+=amp*Math.exp(-(u*u+v*v)*.65)}}
function updateFlavour(){jelly.color.set(flavours[flavour][1]);waterMat.color.set(flavours[flavour][0])}updateFlavour();
const lawn=1.34,towers=[],flags=[],pines=[],windows=[],hits=[];function target(obj,fn){hits.push(obj);obj.userData.act=fn}
const glass=new T.MeshStandardMaterial({color:'#435d69',emissive:'#ffbd53',emissiveIntensity:0});
function arch(x,y,z,w,h,c,p=root,angle=0){let s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,PI,false);s.closePath();let m=mesh(new T.ExtrudeGeometry(s,{depth:.014,bevelEnabled:false}),c,x,y,z,p);m.rotation.y=angle;return m}
function flag(x,y,z,c,p=root){cyl(x,y+.17,z,.014,.017,.4,gold,p,8);ball(x,y+.39,z,.035,.045,.035,gold,p);
let g=new T.PlaneGeometry(.39,.17,7,2);g.translate(.195,0,0);let pos=g.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)*(1-pos.getX(i)/.43));let m=mesh(g,new T.MeshStandardMaterial({color:c,side:T.DoubleSide}),x,y+.26,z,p);flags.push(m);return m}
function tower(x,z,r,h,roof,rh){let body=cyl(x,lawn+h/2,z,r*.94,r,h,cream);let top=lawn+h;
for(let [yy,rr,hh] of [[lawn+.08,r*1.13,.16],[top-.22,r*1.04,.06],[top-.12,r*1.12,.11],[top-.025,r*1.16,.07]])cyl(x,yy,z,rr,rr*.99,hh,'#f3d8ac');
for(let a of [0,PI/2,-PI/3]){let wx=x+Math.sin(a)*r*.97,wz=z+Math.cos(a)*r*.97;arch(wx,top-.64,wz,.15,.36,'#dfc298',root,a);arch(wx+.014*Math.sin(a),top-.61,wz+.014*Math.cos(a),.102,.29,glass,root,a)}
let cone=cyl(x,top+rh/2,z,.025,r*1.28,rh,roof,root,40);cyl(x,top+.015,z,r*1.2,r*1.31,.082,roof);for(let j=1;j<4;j++){let t=j/4,rr=r*1.28*(1-t)+.026*t;cyl(x,top+t*rh,z,rr,rr+.032,.045,roof)}
ball(x,top+rh+.025,z,.062,.08,.062,gold);flag(x,top+rh+.08,z,roof===pink?'#c9587a':'#e4ae55');let origin=V(x,top+rh+.48,z);towers.push(origin);for(let o of [body,cone])target(o,()=>rocket(origin));}
tower(-1.55,-1.72,.45,1.62,lav,1.12);tower(-.56,-1.53,.48,2.04,pink,1.34);tower(.53,-1.55,.38,1.40,blue,1.00);tower(-1.87,-.53,.32,1.15,pink,.86);
box(-.55,lawn+.52,-1.08,1.65,1.04,.9,cream);let hallRoof=cyl(-.55,lawn+1.2,-1.08,0,.85,.57,lav,root,4);hallRoof.scale.set(1.52,1,.82);hallRoof.rotation.y=PI/4;
function wall(x,z,w,angle=0){let p=new T.Group();p.position.set(x,lawn,z);p.rotation.y=angle;root.add(p);box(0,.31,0,w,.62,.18,cream,p);box(0,.61,0,w,.08,.21,'#f5deba',p);let n=Math.ceil(w/.23);for(let i=0;i<n;i++)box(-w/2+(i+.5)*w/n,.72,0,.12,.18,.19,cream,p)}
wall(-1.38,-.26,.96);wall(.5,-.57,.73,PI/2);wall(-1.98,-1.05,1.32,PI/2);
const gateX=-.53,gateZ=-.16;let gate=box(gateX,lawn+.45,gateZ,.89,.9,.45,cream);let door=arch(gateX,lawn,gateZ+.231,.49,.72,'#7a6659');for(let i=-2;i<=2;i++)box(gateX+i*.082,lawn+.25,gateZ+.255,.012,.49,.015,wood);
for(let k of [-1,1])tower(gateX+k*.52,-.22,.222,.93,k===1?blue:lav,.59);
const bridge=new T.Group();root.add(bridge);bridge.position.set(gateX,lawn+.035,.09);for(let i=0;i<8;i++)box(0,0,(i+.5)*.08,.47,.055,.075,wood,bridge);for(let side of [-1,1])rod(V(side*.22,.37,0),V(side*.22,.04,.59),.014,gold,bridge);
const toggleBridge=()=>{bridgeTarget=bridgeTarget?0:-1.19;bridgeBtn.lastChild.textContent=bridgeTarget?'放下吊桥':'升起吊桥'};target(gate,toggleBridge);target(door,toggleBridge);
const brazier= cyl(.25,lawn+.20,.17,.11,.07,.4,gold);let flame=ball(.25,lawn+.48,.17,.08,.15,.08,'#ffad4b');flame.material.emissive.set('#ff842e');flame.material.emissiveIntensity=1;target(brazier,()=>{lit=!lit});target(flame,()=>{lit=!lit});
function pine(x,z,h){let p=new T.Group();p.position.set(x,lawn,z);root.add(p);pines.push(p);cyl(0,h*.21,0,.045,.069,h*.42,wood,p);for(let i=0;i<3;i++){let m=cyl(0,h*(.42+i*.21),0,.008,h*(.29-.064*i),h*(.61-.08*i),['#73ab89','#86bc97','#a6cf9d'][i],p,14);target(m,()=>p.userData.bend=.46)}return p}
[[-2.53,-2.17,1.1],[-2.56,-1.43,.81],[-2.41,-.57,.69],[1.02,-2.34,1],[.98,-1.92,.7],[-1.94,-2.45,.7],[.97,-.8,.53]].forEach(a=>pine(...a));
for(let i=0;i<48;i++){let x=-2.65+random()*3.7,z=.09+random()*.43;if(Math.abs(x-gateX)<.63)continue;let r=.055+random()*.105;ball(x,lawn+.044,z,r,r*.75,r,random()<.45?'#95ba85':'#70a87e');for(let j=0;j<3;j++)ball(x+(random()-.5)*r,lawn+r*.76,z+(random()-.5)*r,.034,.031,.034,j%2?pink:'#ffe4a2')}

const fallX=.19,hitZ=1.18;
const channel=new T.CatmullRomCurve3([V(.95,1.36,-1.17),V(.83,1.37,-.36),V(.30,1.372,.12),V(-.42,1.375,.39),V(-.24,1.37,.56),V(fallX,1.367,.66),V(fallX,1.367,.805)]);
function ribbon(curve,width,color){let points=[],indices=[];for(let i=0;i<=56;i++){let t=i/56,p=curve.getPoint(t),d=curve.getTangent(t);let n=V(d.z,0,-d.x).normalize().multiplyScalar(width*(.88+.12*Math.sin(t*5)));for(let s of [-1,1])points.push(p.x+s*n.x,p.y,p.z+s*n.z);if(i){let a=i*2;indices.push(a-2,a-1,a,a-1,a+1,a)}}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,new T.MeshPhysicalMaterial({color,side:T.DoubleSide,clearcoat:1,roughness:.18}))}
ribbon(channel,.164,'#72c8bb');ball(.95,1.374,-1.17,.24,.055,.26,'#9bd9c9');
for(let i=0;i<7;i++){let t=i/7,p=channel.getPoint(t);ball(p.x,1.395,p.z,.077,.012,.033,'#c9f2dc')}
// 同一条抛物线驱动水幕、流动亮纹和离开水幕边缘的水滴。
const falls = new T.Group();
root.add(falls);
const lipZ=.805, lipY=1.367;
let impactY=water.position.y;
const fallRows=40, fallCols=14;
function watercourse(u,t,phase,flow,out) {
  const ripple=Math.sin(7*u+9*t-4*phase)*.012+Math.sin(17*u+16*t-6*phase)*.005;
  const turbulent=t*t*(.013*Math.sin(17*t+11*u-4*phase)+.012*Math.sin(9*u+phase*3));
  const width=(.082+.094*flow)*(1-.14*Math.sin(PI*t)+.35*t*t);
  return out.set(fallX+u*width+turbulent,lipY-(lipY-impactY)*t*t,
    lipZ+(hitZ-lipZ)*t+ripple*Math.sin(t*PI)+turbulent*t);
}
function stripGeometry(rows,cols,colored=false) {
  const g=new T.BufferGeometry(),count=(rows+1)*(cols+1),indices=[];
  g.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage));
  if(colored)g.setAttribute('color',new T.BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage));
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*(cols+1)+c;
    indices.push(i,i+cols+1,i+1,i+1,i+cols+1,i+cols+2);
  }
  g.setIndex(indices);return g;
}
const sheetGeo=stripGeometry(fallRows,fallCols,true);
const waterfall=mesh(sheetGeo,new T.MeshPhysicalMaterial({vertexColors:true,side:T.DoubleSide,
  transparent:true,opacity:.88,roughness:.19,clearcoat:.85,depthWrite:false}),0,0,0,falls);
waterfall.castShadow=false;waterfall.renderOrder=4;waterfall.frustumCulled=false;
const glints=[],glintMaterial=new T.MeshBasicMaterial({color:'#defaee',side:T.DoubleSide,
  transparent:true,opacity:.76,depthWrite:false});
for(let i=0;i<16;i++){
  const g=stripGeometry(6,1),r=mesh(g,glintMaterial,0,0,0,falls);
  r.castShadow=false;r.frustumCulled=false;r.renderOrder=5;glints.push(g);
}
const drops=new T.InstancedMesh(sphere,new T.MeshStandardMaterial({color:'#b3e9dd',roughness:.19}),30);
drops.frustumCulled=false;falls.add(drops);
const streamPoint=V(0,0,0),deepWater=new T.Color('#589fa9'),lightWater=new T.Color('#c2efe2'),streamColor=new T.Color();
function animateFalls() {
  impactY=lakeHeight(fallX,hitZ);
  const flow=cfg.flow, phase=waveTime;
  if(flow<=.001)return;
  const positions=sheetGeo.attributes.position,colors=sheetGeo.attributes.color;
  for(let r=0;r<=fallRows;r++)for(let c=0;c<=fallCols;c++){
    const t=r/fallRows,u=2*c/fallCols-1,i=r*(fallCols+1)+c;
    watercourse(u,t,phase,flow,streamPoint);positions.setXYZ(i,streamPoint.x,streamPoint.y,streamPoint.z);
    const rib=.5+.5*Math.sin(12*u+1.2*Math.sin(10*t-phase*4)+t*3);
    const shimmer=.5+.5*Math.cos(15*t-phase*6+5*u);
    streamColor.copy(deepWater).lerp(lightWater,.16+rib*.47+shimmer*.20+.14*t);
    colors.setXYZ(i,streamColor.r,streamColor.g,streamColor.b);
  }
  positions.needsUpdate=colors.needsUpdate=true;sheetGeo.computeVertexNormals();
  glints.forEach((g,i)=>{
    const tip=(phase*(.66+.055*(i%5))+i*.618034)%1.22;
    const lane=.89*Math.sin(i*2.4),attr=g.attributes.position;
    for(let r=0;r<=6;r++){
      const v=r/6,t=clamp(tip-.19*v,0,1);
      const w=.026*Math.sin(PI*v);
      for(let c=0;c<2;c++){
        watercourse(lane+(c?1:-1)*w,t,phase,flow,streamPoint);
        attr.setXYZ(2*r+c,streamPoint.x,streamPoint.y+.002,streamPoint.z+.004);
      }
    }
    attr.needsUpdate=true;
  });
  for(let i=0;i<drops.count;i++){
    const t=(phase*(.77+.043*(i%6))+i*.618034)%1,u=i%2?1:-1;
    watercourse(u,t,phase,flow,streamPoint);
    const spread=(.028+.041*(i%4))*t*t, radius=(.008+.003*(i%3))*Math.sin(PI*t);
    instance(drops,i,streamPoint.x+u*spread,streamPoint.y,streamPoint.z+spread*.54,radius,radius*(1+2*t),radius);
  }
  drops.instanceMatrix.needsUpdate=true;
}

// 一条参数曲线从崖口延伸到湖底。脉冲使用同一相位穿过水面。
const subGroup=new T.Group();root.add(subGroup);
const streamLanes=15,streamSteps=68,streamGeo=new T.BufferGeometry();
const streamPositions=new T.BufferAttribute(new Float32Array(streamLanes*(streamSteps+1)*6),3).setUsage(T.DynamicDrawUsage);
const streamColors=new T.BufferAttribute(new Float32Array(streamLanes*(streamSteps+1)*8),4).setUsage(T.DynamicDrawUsage);
const streamIndices=[];
for(let lane=0;lane<streamLanes;lane++)for(let j=0;j<streamSteps;j++){
  const i=2*(lane*(streamSteps+1)+j);streamIndices.push(i,i+1,i+2,i+1,i+3,i+2);
}
streamGeo.setAttribute('position',streamPositions);streamGeo.setAttribute('color',streamColors);streamGeo.setIndex(streamIndices);
const streamRibbon=mesh(streamGeo,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false}),0,0,0,subGroup);
streamRibbon.frustumCulled=false;streamRibbon.castShadow=false;streamRibbon.renderOrder=5;
const landing=V(0,0,0),tracer=V(0,0,0);
function currentPoint(lane,s,flow,phase,out){
  const u=2*lane/(streamLanes-1)-1,exit=.30,bend=.60;
  if(s<exit){watercourse(u*.89,s/exit,phase,flow,out);out.z+=.009;return out;}
  watercourse(u*.89,1,phase,flow,landing);landing.z+=.009;
  const bottom=-.414,elbow=-.12-.275*flow,angle=u*1.25;
  const dx=Math.sin(angle),dz=Math.cos(angle);
  const spread=.09+.21*flow;
  if(s<bend){
    const t=(s-exit)/(bend-exit),w=t*t;
    return out.set(landing.x+dx*spread*w+.025*Math.sin(t*7+lane+phase)*Math.sin(PI*t),
      landing.y+(elbow-landing.y)*(1-(1-t)*(1-t)),landing.z+dz*spread*w);
  }
  const t=(s-bend)/(1-bend),distance=spread+t*(.35+1.10*flow);
  const meander=.05*Math.sin(t*8+phase*1.7+lane)*t;
  return out.set(landing.x+dx*distance+dz*meander,elbow+(bottom-elbow)*Math.min(1,t*2)+.009*Math.sin(t*8+lane)*t,
    landing.z+dz*distance-dx*meander);
}
function animateCurrent(){
  if(!subGroup.visible)return;
  for(let lane=0;lane<streamLanes;lane++){
    const angle=(2*lane/(streamLanes-1)-1)*1.25;
    for(let j=0;j<=streamSteps;j++){
      const s=j/streamSteps;currentPoint(lane,s,cfg.flow,waveTime,tracer);
      const crest=Math.pow(.5+.5*Math.cos(TAU*(s*2.3-waveTime*.86+lane*.17)),6);
      const width=(.005+.020*crest)*(.55+.55*cfg.flow);
      const fade=Math.min(1,s*24,Math.max(0,(1-s)*5));
      const base=2*(lane*(streamSteps+1)+j);
      for(let k=0;k<2;k++){
        const side=k?width:-width;
        streamPositions.setXYZ(base+k,tracer.x+side*Math.cos(angle),tracer.y,tracer.z-side*Math.sin(angle));
        streamColors.setXYZW(base+k,.30+.66*crest,.77+.22*crest,.68+.23*crest,fade*(.20+.77*crest));
      }
    }
  }
  streamPositions.needsUpdate=streamColors.needsUpdate=true;
}

for(let i=0;i<34;i++){let x=-2.6+random()*5,z=.83+random()*.37;ball(x,-.37,z,.09+random()*.18,.07+random()*.2,.12,strata[i%7])}
for(let i=0;i<25;i++){let x=1.4+random()*.34,z=-1.6+random()*2;rod(V(x,.015,z),V(x+.07,.19+random()*.21,z+.04),.012,'#97aa68')}
// 船首朝局部 +X。横剖面同时定义船壳、甲板和舷边，转向时各部件共用一条龙骨。
const ship = new T.Group();
root.add(ship);
ship.scale.setScalar(.89);
const navy = '#284d73', bulwark = '#477e9c', trim = '#efc262', deck = '#c99261';
const stations = [
  // 纵向位置、半船宽、舷缘高度、龙骨高度
  [-.62,.153,.37,.08], [-.54,.222,.35,-.015], [-.36,.258,.293,-.092],
  [-.10,.271,.275,-.117], [.17,.259,.277,-.113], [.38,.218,.296,-.074],
  [.54,.135,.329,.008], [.65,.053,.365,.116], [.69,.008,.395,.227]
];
function plankHull() {
  const vertices = [], colors = [], triangles = [];
  const paint = [bulwark, navy, navy, '#203f60', navy, navy, bulwark, deck];
  const rings = stations.map(([x,w,h,k]) => [
    V(x,h,-w), V(x,h-.056,-w*1.015), V(x,k+(h-k)*.46,-w*.92),
    V(x,k+.035,-w*.38), V(x,k,0), V(x,k+.035,w*.38),
    V(x,k+(h-k)*.46,w*.92), V(x,h-.056,w*1.015), V(x,h,w)
  ]);
  function face(a,b,c,d,color) {
    const start = vertices.length/3, tint = new T.Color(color);
    for (const p of [a,b,c,d]) { vertices.push(p.x,p.y,p.z); colors.push(tint.r,tint.g,tint.b); }
    triangles.push(start,start+2,start+1,start,start+3,start+2);
  }
  for (let i=1; i<rings.length; i++) {
    const aft=rings[i-1], fore=rings[i];
    for (let j=0; j<8; j++) face(aft[j],aft[j+1],fore[j+1],fore[j],paint[Math.min(j,7-j)]);
    face(aft[8],aft[0],fore[0],fore[8],deck);
  }
  for (const end of [rings[0],rings.at(-1)]) {
    for (let j=0;j<4;j++) face(end[j],end[8-j],end[7-j],end[j+1],navy);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  g.setIndex(triangles);g.computeVertexNormals();
  mesh(g,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.51}),0,0,0,ship);
  for (const side of [-1,1]) {
    for (const offset of [.008,-.065]) line(stations.map(([x,w,h])=>V(x,h+offset,side*w*1.023)),.012,trim,ship);
    for (const x of [-.29,-.085,.12]) {
      const portWidth=x<-.2?.265:.275;
      box(x,.219,side*portWidth,.085,.077,.018,'#172f48',ship);
      rod(V(x,.225,side*portWidth),V(x,.235,side*(portWidth+.047)),.022,'#58636a',ship);
    }
  }
}
plankHull();
// Raised stern gallery and glazed transom.
box(-.48,.37,0,.285,.138,.392,navy,ship);
box(-.48,.45,0,.326,.034,.429,trim,ship);
box(-.48,.472,0,.308,.019,.409,deck,ship);
for (const z of [-.132,-.044,.044,.132]) {
  box(-.628,.377,z,.016,.077,.073,trim,ship);
  box(-.638,.377,z,.01,.05,.051,'#9fd6d1',ship);
}
for (const side of [-1,1]) {
  for (const x of [-.62,-.49,-.345]) rod(V(x,.479,side*.198),V(x,.544,side*.198),.011,trim,ship);
  rod(V(-.63,.548,side*.198),V(-.336,.548,side*.198),.013,trim,ship);
}
const spar='#895735', cord='#716052';
rod(V(.48,.327,0),V(.833,.47,0),.023,spar,ship);
rod(V(.63,.255,0),V(.824,.46,0),.008,cord,ship);
const canvasCloth = new T.MeshStandardMaterial({color:'#fff4d9',side:T.DoubleSide,roughness:.91});
function squareSail(x, top, width, height) {
  const rows=8, cols=14, points=[],indices=[];
  // The yard, scalloped foot and seams follow the same billowed cloth surface.
  function clothPoint(u,v) {
    const halfSpan=(.5-.078*v)*width;
    return V(x+.135*Math.sin(PI*v)*Math.sin(PI*u)+.12*(u-.5),
      top-height*v+.036*Math.sin(PI*u)*v, (u*2-1)*halfSpan);
  }
  for(let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) {
    const p=clothPoint(i/cols,j/rows);points.push(p.x,p.y,p.z);
    if(i&&j){const k=j*(cols+1)+i;indices.push(k-cols-2,k-1,k,k-cols-2,k,k-cols-1);}
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();
  mesh(g,canvasCloth,0,0,0,ship);
  rod(clothPoint(-.055,0),clothPoint(1.055,0),.014,spar,ship);
  for(const u of [0,.33,.67,1]) {
    const seam=Array.from({length:7},(_,j)=>clothPoint(u,j/6).add(V(.003,0,0)));
    line(seam,.004,'#dcc99e',ship);
  }
}
for(const [x,peak] of [[-.18,1.39],[.325,1.105]]) {
  rod(V(x,.28,0),V(x,peak,0),.023,spar,ship);
  for(const side of [-1,1]) rod(V(x-.12,.293,side*.216),V(x,peak-.21,0),.0065,cord,ship);
}
squareSail(-.18,1.03,.81,.37);
squareSail(-.18,1.325,.59,.24);
squareSail(.325,1.045,.59,.34);
rod(V(.325,1.11,0),V(.825,.471,0),.007,cord,ship);
const jib=new T.BufferGeometry();
jib.setAttribute('position',new T.Float32BufferAttribute([.376,1.006,0,.779,.48,0,.432,.57,.016,.508,.68,.052],3));
jib.setIndex([0,1,3,1,2,3,2,0,3]);jib.computeVertexNormals();mesh(jib,canvasCloth,0,0,0,ship);
// The crown is painted on the moving standard, including its reverse face.
const heraldry=document.createElement('canvas');heraldry.width=128;heraldry.height=64;
const ink=heraldry.getContext('2d');ink.fillStyle=navy;ink.fillRect(0,0,128,64);
ink.strokeStyle=trim;ink.lineWidth=5;ink.strokeRect(2,2,124,60);ink.fillStyle=trim;
ink.beginPath();ink.moveTo(36,19);ink.lineTo(53,29);ink.lineTo(64,12);ink.lineTo(75,29);ink.lineTo(92,19);ink.lineTo(84,43);ink.lineTo(44,43);ink.closePath();ink.fill();ink.fillRect(45,47,38,4);
const bannerTexture=new T.CanvasTexture(heraldry);bannerTexture.colorSpace=T.SRGBColorSpace;
const bannerGeo=new T.PlaneGeometry(.314,.156,12,3);bannerGeo.translate(-.157,0,0);
const standard=mesh(bannerGeo,new T.MeshStandardMaterial({map:bannerTexture,side:T.DoubleSide}),-.18,1.425,0,ship);
flags.push(standard);
rod(V(-.18,1.35,0),V(-.18,1.52,0),.012,trim,ship);
ball(-.18,1.535,0,.021,.026,.021,trim,ship);
// 尾流保留发出时的坐标和船舷方向，转弯后旧波纹仍沿原航迹扩散。
const wakeCount=64,wakeHistory=Array.from({length:wakeCount},()=>({x:0,z:0,nx:0,nz:0,born:-20}));
let wakeCursor=0,wakeUsed=0,nextWake=0;
const wakeGeo=new T.BufferGeometry(),wakePos=[],wakeTint=[],wakeIndex=[];
for(let side=0;side<2;side++)for(let j=0;j<wakeCount;j++){
  wakePos.push(0,0,0,0,0,0);wakeTint.push(1,1,1,0,1,1,1,0);
  const k=2*(side*wakeCount+j);if(j)wakeIndex.push(k-2,k-1,k,k-1,k+1,k);
}
wakeGeo.setAttribute('position',new T.Float32BufferAttribute(wakePos,3).setUsage(T.DynamicDrawUsage));
wakeGeo.setAttribute('color',new T.Float32BufferAttribute(wakeTint,4).setUsage(T.DynamicDrawUsage));
wakeGeo.setIndex(wakeIndex);
const wake=mesh(wakeGeo,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false}));
wake.frustumCulled=false;wake.castShadow=false;wake.renderOrder=6;
function recordWake(){
  if(clock<nextWake)return;
  nextWake=clock+.075;
  const s=wakeHistory[wakeCursor],d=heading;
  s.x=ship.position.x+.24*d.x;s.z=ship.position.z+.24*d.z;s.nx=-d.z;s.nz=d.x;s.born=clock;
  wakeCursor=(wakeCursor+1)%wakeCount;wakeUsed=Math.min(wakeCount,wakeUsed+1);
  for(const sign of [-1,1])disturb(s.x+sign*s.nx*.12,s.z+sign*s.nz*.12,.038);
}
const lamps=[];
const lampGlass=new T.MeshStandardMaterial({color:'#ffe4a0',emissive:'#ffb94c',emissiveIntensity:.08});
for(const sign of [-1,1]){
  const z=sign*.197;
  rod(V(-.584,.485,z),V(-.584,.668,z),.013,trim,ship);
  cyl(-.584,.613,z,.04,.036,.083,lampGlass,ship,8);
  cyl(-.584,.669,z,.014,.053,.037,trim,ship,8);
  const light=new T.PointLight('#ffbc61',0,1.9,1.4);light.position.set(-.584,.588,z);ship.add(light);
  lamps.push(light);
}
const echoes=new T.InstancedMesh(sphere,new T.MeshBasicMaterial({color:'#ffd17a',transparent:true,opacity:.55,depthWrite:false}),24);
echoes.frustumCulled=false;echoes.renderOrder=6;root.add(echoes);
const lampPoint=V(0,0,0);
function renderSailing(){
  const pos=wakeGeo.attributes.position,c=wakeGeo.attributes.color;
  for(let bank=0;bank<2;bank++)for(let j=0;j<wakeCount;j++){
    const s=wakeHistory[(wakeCursor+wakeCount-1-Math.min(j,Math.max(0,wakeUsed-1)))%wakeCount],age=clamp(clock-s.born,0,5.2),side=bank?1:-1;
    const width=.075+Math.min(age,.95)*.135+.059*age;
    const fade=Math.max(0,1-age/5.1)*Math.min(1,(wakeCount-1-j)/5);
    for(let k=0;k<2;k++){
      const distance=side*(width+(k?1:-1)*(.012+.013*age));
      const x=s.x+s.nx*distance,z=s.z+s.nz*distance,idx=bank*2*wakeCount+2*j+k;
      const shore=clamp((2.94-Math.max(Math.abs(x),Math.abs(z)))*12,0,1);
      pos.setXYZ(idx,x,lakeHeight(x,z)+.02,z);c.setXYZW(idx,.70,.96,.88,fade*shore*(k?.61:.24));
    }
  }
  pos.needsUpdate=c.needsUpdate=true;
  const dusk=T.MathUtils.smoothstep(cfg.day,.36,.86);
  lampGlass.emissiveIntensity=.08+3.3*dusk;echoes.visible=dusk>.001;echoes.material.opacity=.64*dusk;
  lamps.forEach((lamp,i)=>{
    lamp.intensity=dusk*1.8;
    lampPoint.copy(lamp.position).multiply(ship.scale).applyQuaternion(ship.quaternion).add(ship.position);
    for(let j=0;j<12;j++){
      const t=(j+.5)/12,phase=clock*2.8+j*.92+i;
      const x=lampPoint.x+.17*t+.024*Math.sin(phase),z=lampPoint.z+.38*t;
      const y=lakeHeight(x,z),flicker=.5+.5*Math.cos(phase+y*32);
      const edge=clamp((2.96-Math.max(Math.abs(x),Math.abs(z)))*16,0,1);
      instance(echoes,i*12+j,x,y+.023,z,(.031+.048*flicker)*(1-.63*t)*edge,.0025,.008+.007*flicker);
    }
  });echoes.instanceMatrix.needsUpdate=true;
}

ship.traverse(part=>{if(part.isMesh)target(part,salute);});

// Arc-length sampling keeps the ship at cruising speed through both turns.
const sailingLane=new T.CatmullRomCurve3([
  [2,1.86],[1.59,2.32],[.70,2.37],[-1.10,2.37],[-1.77,2.30],[-2.05,1.86],
  [-1.67,1.58],[-1.22,1.65],[-.61,2.14],[.20,2.21],[.86,2.17],[1.48,1.68],[1.85,1.66]
].map(([x,z])=>V(x,0,z)),true);
sailingLane.arcLengthDivisions=1024;
const lapLength=sailingLane.getLength(), heading=V(0,0,0);
function positionShip(time) {
  const progress=(time*.325/lapLength+.16)%1;
  sailingLane.getPointAt(progress,ship.position);
  sailingLane.getTangentAt(progress,heading);
  ship.position.y=lakeHeight(ship.position.x,ship.position.z)+.009*Math.sin(time*2.4);
  ship.rotation.order='YXZ';
  ship.rotation.set(.018*Math.sin(time*1.83),-Math.atan2(heading.z,heading.x),.021*Math.sin(time*2.12));
}
positionShip(0);

const puffMat=new T.MeshBasicMaterial({color:'#f1fff4',transparent:true,opacity:.76,depthWrite:false}),foam=new T.InstancedMesh(sphere,puffMat,95),bubbles=new T.InstancedMesh(sphere,new T.MeshPhysicalMaterial({color:'#dbfff1',clearcoat:1,transparent:true,opacity:.68,depthWrite:false}),65);root.add(foam,bubbles);foam.renderOrder=5;bubbles.renderOrder=4;const dummy=new T.Object3D();
function instance(m,i,x,y,z,a,b,c){dummy.position.set(x,y,z);dummy.scale.set(a,b,c);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)}
const particles=[];function spawn(kind,p,v,color,r,life){if(particles.length>420)return;let m=ball(p.x,p.y,p.z,r,r,r,color);m.castShadow=false;m.renderOrder=6;if(kind==='coin')m.scale.z*=.25;particles.push({kind,m,v,life})}
function rocket(p=towers[Math.floor(random()*towers.length)]){spawn('rocket',p,V((random()-.5)*.6,2.7+random(),(random()-.5)*.6),'#ffe2a1',.046,.44+random()*.3)}
function burst(p){let col=[pink,'#8ee1d2','#ffcb65','#bd94ed'][Math.floor(random()*4)];glow.position.copy(p);glow.color.set(col);flash=1;for(let i=0;i<42;i++){let y=random()*2-1,a=random()*TAU,s=Math.sqrt(1-y*y),n=1+random()*1.35;spawn('spark',p,V(Math.cos(a)*s*n,y*n,Math.sin(a)*s*n),col,.028+random()*.021,.6+random()*.55)}}
function salute() {
  const dir=V(0,0,1).applyQuaternion(ship.quaternion);
  const side=dir.dot(ship.position)>0?-1:1;
  const muzzle=V(-.085,.235,side*.322).multiplyScalar(ship.scale.x).applyQuaternion(ship.quaternion).add(ship.position);
  spawn('shot',muzzle,dir.multiplyScalar(side*1.48).add(V(0,1.64,0)),'#546675',.045,3);
  notice('皇家礼炮');
}
function wish(x=fallX,z=hitZ){spawn('coin',V(x-.55,1.57,z+.49),V(.73,.95,-.65),gold,.073,3)}
function toss(x,z){spawn('ball',V(x-.3,1.28,z+.38),V(.5,1.5,-.5),pink,.11,3)}
button('.actions','塔顶烟花',icon('fire')+'塔顶烟花',()=>{rocket();setTimeout(()=>rocket(),240);setTimeout(()=>rocket(),460)});
const bridgeBtn=button('.actions','升降吊桥',icon('bridge')+'升起吊桥',toggleBridge);
button('.actions','皇家礼炮',icon('salute')+'皇家礼炮',salute);button('.actions','投许愿币',icon('coin')+'投许愿币',()=>wish());
const stars=new T.Group();scene.add(stars);let starGeo=new T.BufferGeometry(),starPts=[];for(let i=0;i<420;i++)starPts.push((random()-.5)*40,3+random()*13,-4-random()*16);starGeo.setAttribute('position',new T.Float32BufferAttribute(starPts,3));stars.add(new T.Points(starGeo,new T.PointsMaterial({color:'#ffefcf',size:.044,transparent:true})));
const daylight=new T.Color('#f6f2e9'),sunset=new T.Color('#f3c3a7'),night=new T.Color('#29364c'),sky=new T.Color();
function physics(dt){clock+=dt;waveTime+=dt*cfg.flow;let d=cfg.day;
stepTilt(dt);stepDent(dt);bridgeAngle+=(bridgeTarget-bridgeAngle)*.073;bridge.rotation.x=bridgeAngle;
for(let p of pines){p.userData.bend=(p.userData.bend||0)*.965;p.rotation.z=Math.sin(clock*2+p.position.x)*.022+p.userData.bend}
positionShip(clock);recordWake();driftSugar();assignFeeders();swim(clock);
if(cfg.flow>0)disturb(fallX,hitZ,(.045+.033*Math.sin(clock*19))*cfg.flow);
let force=42+cfg.firm*62,drag=Math.exp(-(1+cfg.damp*4)*dt);for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){let k=j*N+i;speed[k]=(speed[k]+(heights[k-1]+heights[k+1]+heights[k-N]+heights[k+N]-4*heights[k])*force*dt)*drag}
for(let k=0;k<heights.length;k++)heights[k]+=speed[k]*dt;
for(let i=particles.length-1;i>=0;i--){let q=particles[i],p=q.m.position;q.life-=dt;p.addScaledVector(q.v,dt);q.v.y-=(q.kind==='spark'?1.5:q.kind==='rocket'?.45:6)*dt;if(q.kind==='coin')q.m.rotation.y+=dt*9;if(q.kind==='spark')q.m.scale.multiplyScalar(.987);
const surface=lakeHeight(p.x,p.z)+.018;
if(q.life<=0||p.y<surface){if(q.kind==='rocket')burst(p);else if(p.y<surface&&['coin','shot','ball'].includes(q.kind)){waterTouch(p,1.65);for(let j=0;j<12;j++)spawn('drop',p,V(random()-.5,.6+random(),random()-.5),'#d9fff0',.032,.65)}root.remove(q.m);particles.splice(i,1)}}
flash*=.946;if(d>.73){nightTimer-=dt;if(nightTimer<0){rocket();nightTimer=2+random()*2}}}
function render(){causticTex.offset.set(.018*waveTime,.013*waveTime);drift();let d=cfg.day;sky.copy(daylight).lerp(sunset,Math.min(1,d*2)).lerp(night,Math.max(0,d*2-1));scene.background=sky;floor.material.color.copy(sky).multiplyScalar(.63+cfg.day*.42);hemi.intensity=2.05-d*1.57;sun.intensity=2.9-d*2.34;sun.color.set(d<.45?'#fff0d9':'#ffc895');rim.intensity=1.05+d*.4;glass.emissiveIntensity=Math.max(0,(d-.45)*3.2);stars.visible=d>.62;stars.children[0].material.opacity=clamp((d-.62)*3,0,1);glow.intensity=flash*55;
flame.visible=lit;flame.scale.y=.145+.022*Math.sin(clock*18);falls.visible=subGroup.visible=foam.visible=bubbles.visible=cfg.flow>.001;animateFalls();animateCurrent();animateRipples();
for(let m of flags){let pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){let x=pos.getX(i);pos.setZ(i,x*.24*Math.sin(clock*5+x*14+m.position.x))}pos.needsUpdate=true}
deformJelly();
for(const g of surfaceGlints){const {x,z}=g.userData;g.position.y=lakeHeight(x,z)-water.position.y;}
for(let i=0;i<95;i++){let t=(waveTime*(.58+(i%7)*.07)+i*.618)%1,a=i*2.399,r=(.04+.41*t)*(.65+cfg.flow*.45),s=(1-t)*(.018+.025*(i%4)/3)*cfg.flow;instance(foam,i,fallX+Math.cos(a)*r,lakeHeight(fallX+Math.cos(a)*r,hitZ+Math.sin(a)*r)+.038+(i%3===0?.33*Math.sin(PI*t):.03),hitZ+Math.sin(a)*r,s*1.6,s,s*1.3)}
for(let i=0;i<65;i++){let t=(waveTime*.45+i*.618)%1,a=i*2.399,r=.035+t*.43,s=.013+.013*(i%4)/3;instance(bubbles,i,fallX+r*Math.cos(a),.065-.45*Math.sin(t*PI),hitZ+r*Math.sin(a)+t*.32,s,s,s)}
foam.instanceMatrix.needsUpdate=bubbles.instanceMatrix.needsUpdate=true;renderSailing();renderer.render(scene,sceneCamera())}
function resize(){const w=innerWidth,h=innerHeight,mobile=w<=760;renderer.setSize(w,h,false);let span=mobile?Math.max(6.7,8.6*h/w):Math.max(9.6,16.3*h/w);let asp=w/h;camera.left=-span*asp/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;let dx=mobile?0:span*asp*.060,dy=mobile?.02*span:.0;camera.left+=dx;camera.right+=dx;camera.top+=dy;camera.bottom+=dy;camera.updateProjectionMatrix()}resize();addEventListener('resize',resize);
const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(),waterPlane=new T.Plane(V(0,1,0),-water.position.y);
const last=V(0,0,0),edgeMeshes=[cut,...draggableLayers];
let drag=null,priorTap=0;
function pick(e){
  const bounds=canvas.getBoundingClientRect();
  pointer.set((e.clientX-bounds.left)/bounds.width*2-1,1-(e.clientY-bounds.top)/bounds.height*2);
  ray.setFromCamera(pointer,camera);
  plane.copy(waterPlane).applyMatrix4(root.matrixWorld);
  const p=ray.ray.intersectPlane(plane,V(0,0,0));
  return p?root.worldToLocal(p):V(99,0,99);
}
canvas.onpointerdown=e=>{
  if(drag||e.button!==0)return;
  if(watchFish){watchTap(e);return;}
  if(feedArmed){
    const spot=pick(e),first=ray.intersectObjects([...hits,...edgeMeshes,water],false)[0];
    if(Math.abs(spot.x)<2.97&&Math.abs(spot.z)<2.97&&sdf(spot.x,spot.y,spot.z)>.015&&(!first||first.object===water||first.object===cut&&root.worldToLocal(first.point.clone()).y>.04)){
      scatterSugar(spot);armFeed(false);
    }else notice('请点城堡外的湖面');
    return;
  }
  const p=pick(e),hit=ray.intersectObjects(hits,false)[0],edge=ray.intersectObjects(edgeMeshes,false)[0];
  const onEdge=edge&&(!hit||edge.distance<hit.distance)&&root.worldToLocal(edge.point.clone()).y<water.position.y-.025;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,hit:onEdge?null:hit?.object,edge:!!onEdge,angle:tilt.clone(),wet:!onEdge&&!hit&&Math.abs(p.x)<2.98&&Math.abs(p.z)<2.98&&sdf(p.x,p.y,p.z)>.04,lastWake:clock};
  if(drag.wet)waterTouch(p,.72);
  if(onEdge){startPress(root.worldToLocal(edge.point.clone()),edge.face.normal);heldEdge=true;releaseDelay=0;tiltTarget.copy(tilt);canvas.style.cursor='grabbing';}
  last.copy(p);canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const p=pick(e),dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(drag.moved||Math.hypot(dx,dy)>4){
    drag.moved=true;
    if(drag.edge){
      const gain=maxTilt/Math.max(56,Math.min(innerWidth,innerHeight)*.18);
      const yaw=Math.atan2(camera.position.x,camera.position.z);
      tiltTarget.set(drag.angle.x+gain*(dy*Math.cos(yaw)-dx*Math.sin(yaw)),
        drag.angle.y-gain*(dx*Math.cos(yaw)+dy*Math.sin(yaw))).clampLength(0,maxTilt);
    }else if(pines.includes(drag.hit?.parent))drag.hit.parent.userData.bend=clamp(dx*.012,-.62,.62);
    else if(drag.wet && Math.abs(p.x)<2.98 && Math.abs(p.z)<2.98 && sdf(p.x,p.y,p.z)>.04){
      const amp=clamp(p.distanceTo(last)*4,.12,1.15);
      if(clock-drag.lastWake>.12){waterTouch(p,Math.max(.55,amp));drag.lastWake=clock;}
      else disturb(p.x,p.z,amp);
    }
  }
  last.copy(p);
};
function endDrag(e){
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.edge){heldEdge=false;releaseDelay=drag.moved ? .85 : 0;canvas.style.cursor='';}
  else if(e.type==='pointerup'&&!drag.moved){
    const p=pick(e);
    if(drag.hit)drag.hit.userData.act();
    else if(drag.wet){if(performance.now()-priorTap<360)toss(p.x,p.z);priorTap=performance.now();}
  }
  drag=null;
}
canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=endDrag;

// 鱼头统一朝局部 +X，尾柄在 -X。每种鱼共用两份实例网格。
const species=[
  // 名称、身长、半高、半宽、体色、花纹色、鳍色、尾长、分叉深度
  ['红白锦鲤',.32,.058,.055,'#fff1cb','#ec5933','#ef965b',.095,.40],
  ['琉金金鱼',.245,.080,.066,'#ef8b22','#ffd36a','#ee7833',.130,.58],
  ['霓虹灯鱼',.194,.032,.031,'#287888','#34e8ec','#de5854',.055,.48],
  ['斑马鱼',.224,.039,.035,'#f7d898','#325985','#dfb76e',.072,.53],
  ['孔雀鱼',.192,.038,.034,'#309c9c','#f4cc51','#e87072',.118,.10],
  ['神仙鱼',.181,.087,.037,'#f2deae','#454c66','#8a82ab',.076,.25],
  ['红樱桃鲃',.226,.051,.043,'#e86654','#883755','#d79750',.073,.46],
  ['柠檬灯鱼',.19,.046,.033,'#eed658','#8d983e','#eaa43a',.069,.51]
];
function fishModel(id){
  const [,length,h,w,base,pattern,fin,tailLength,fork]=species[id];
  const bodyColor=new T.Color(base),mark=new T.Color(pattern),finColor=new T.Color(fin);
  const pale=new T.Color('#fff1cc'),ink=new T.Color('#202d3b');
  function geometry(){return {p:[],c:[],index:[]};}
  function vertex(g,x,y,z,color){g.p.push(x,y,z);g.c.push(color.r,color.g,color.b);return g.p.length/3-1;}
  function finish(g){
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(g.p,3));
    geo.setAttribute('color',new T.Float32BufferAttribute(g.c,3));
    geo.setIndex(g.index);geo.computeVertexNormals();return geo;
  }
  function patch(g,points,c){const ids=points.map(p=>vertex(g,...p,c));for(let j=1;j+1<ids.length;j++)g.index.push(ids[0],ids[j],ids[j+1]);}
  const body=geometry(),tail=geometry(),rings=26,sides=18;
  for(let i=0;i<=rings;i++){
    const u=i/rings;
    const belly=.08*(1-u)+Math.pow(Math.sin(PI*u),.64)*(.72+.48*u);
    for(let j=0;j<=sides;j++){
      const a=TAU*j/sides,y=Math.cos(a),z=Math.sin(a);
      const motifs=[Math.sin(16*u+2.6*z+2*y)>.18, y>.28&&Math.sin(u*22)>0,
        Math.abs(y-.26)<.37,Math.cos(y*12+u*3)>.16,
        Math.sin(15*u+5*y)>0,Math.cos(19*u+2*y)>.18,Math.abs(y)<.28,u>.49&&u<.63&&y>.12];
      let color=bodyColor.clone().lerp(pale,Math.max(0,-y)*.42);
      if(motifs[id])color.lerp(mark,.92);
      if(id===2&&u<.54&&y<.05)color.set('#ea534f');
      vertex(body,(u-.5)*length,y*h*belly,z*w*belly,color);
      if(i&&j){const k=i*(sides+1)+j;body.index.push(k-sides-2,k-sides-1,k,k-sides-2,k,k-1);}
    }
  }
  const dorsal=id===5?1.52:1.19;
  patch(body,[[.15*length,.70*h,0],[-.06*length,dorsal*h,0],[-.34*length,.52*h,0]],finColor);
  for(const side of [-1,1]){
    patch(body,[[.13*length,-h*.13,side*w*.95],[-.16*length,-h*.34,side*w*1.68],[-.09*length,-h*.52,side*w*.87]],finColor);
    const eye=(radius,offset,color)=>{
      const pts=[];for(let j=0;j<12;j++){const a=TAU*j/12;pts.push([length*.306+radius*Math.cos(a),h*.16+radius*Math.sin(a),side*w*offset]);}
      patch(body,pts,color);
    };eye(h*.25,.79,pale);eye(h*.155,.80,ink);
  }
  // 扇尾和叉尾的外轮廓不同，鳍条随同一尾柄一起摆动。
  const fan=id===4?1.49:id===1?1.32:1.03;
  for(let j=0;j<10;j++){
    const rim=k=>{const v=k/5-1;return [-tailLength*(1-fork*(1-Math.abs(v))),v*h*fan,.10*tailLength*Math.cos(v*PI)];};
    patch(tail,[[.024,.003,0],rim(j),rim(j+1)],j%3===1?finColor.clone().lerp(pale,.28):finColor);
  }
  return [finish(body),finish(tail)];
}
// 两片可游水域分别沿前方湖岸和悬崖右岸展开，给水下碎石和切面留出净空。
const shoals=[
  [0,6,-1.28,2.03,.90,.26,.43,-.19], [1,7,1.70,2.13,.68,.28,-.54,-.22],
  [2,12,-.08,2.55,1.70,.14,.45,-.29], [3,10,2.29,-.47,.27,1.52,-.52,-.24],
  [4,8,-1.50,2.29,.80,.33,-.64,-.22], [5,5,2.39,-.62,.18,1.43,.38,-.22],
  [6,9,.64,1.90,.98,.23,-.49,-.30], [7,11,2.26,.11,.21,1.59,.63,-.15]
];
const fishMaterial=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.52});
const fishBatches=[],fish=[];
// Separate sequence so stocking the lake does not change castle or fireworks randomness.
let fishSeed=1847;function fishRand(){fishSeed=(Math.imul(fishSeed,1664525)+1013904223)>>>0;return fishSeed/4294967296;}
for(const [id,count,cx,cz,rx,rz,rate,depth] of shoals){
  const [body,tail]=fishModel(id).map(g=>{
    const batch=new T.InstancedMesh(g,fishMaterial,count);
    batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.frustumCulled=false;root.add(batch);return batch;
  });
  fishBatches.push([body,tail]);
  for(let i=0;i<count;i++){
    fish.push({id,i,cx,cz,rx:rx*(.82+.16*fishRand()),rz:rz*(.80+.17*fishRand()),
      phase:TAU*(i+.24*fishRand())/count+id*.67,rate:rate*(.96+.08*fishRand()),
      depth:depth+(fishRand()-.5)*.037,beat:5+fishRand()*4,scale:.86+.17*fishRand(),
      body,tail,foraging:false,approach:V(1,0,0),swimVelocity:V(0,0,0),offset:new T.Vector2(),escape:new T.Vector2(),escapeVelocity:new T.Vector2(),position:V(0,0,0),direction:V(1,0,0)});
  }
}
const fishUp=V(0,1,0),fishSide=V(0,0,1),fishNormal=V(0,1,0),nextFish=V(0,0,0);
const fishPose=new T.Matrix4(),tailPose=new T.Matrix4(),tailSwing=new T.Matrix4(),fishSize=V(1,1,1);
// 事件只影响落点附近的鱼。灯鱼急转，锦鲤缓转；受惊偏移逐渐衰减回原鱼群。
function alarmFish(x,z,strength){
  const radius=.91+.46*strength;
  for(const f of fish){
    const dx=f.position.x-x,dz=f.position.z-z,d=Math.hypot(dx,dz);
    if(d>=radius)continue;
    const fright=Math.pow(1-d/radius,.85)*Math.min(1.65,strength);
    const angle=d>.001?Math.atan2(dz,dx):f.phase;
    f.escape.x+=Math.cos(angle)*fright;f.escape.y+=Math.sin(angle)*fright;
    f.escape.clampLength(0,1.65);
  }
}
const agility=[.60,.76,1.65,1.19,1.32,.67,1.22,1.49];
function scatterStep(f){
  const agile=agility[f.id],dt=1/60;
  const spring=5.8*agile,drag=3.9*Math.sqrt(agile);
  f.escapeVelocity.x+=(f.escape.x*7.2*agile-spring*f.offset.x-drag*f.escapeVelocity.x)*dt;
  f.escapeVelocity.y+=(f.escape.y*7.2*agile-spring*f.offset.y-drag*f.escapeVelocity.y)*dt;
  f.offset.addScaledVector(f.escapeVelocity,dt);
  f.escape.multiplyScalar(Math.exp(-dt*(1.85+.4*agile)));
}
function swimPoint(f,t,out){
  const a=f.phase+t*f.rate;
  const bx=f.cx+f.rx*Math.cos(a),bz=f.cz+f.rz*Math.sin(a);
  // 随剩余净空平滑收紧避让位移，避免靠近切面时突然掉头。
  const rightBank=f.id===3||f.id===5||f.id===7;
  const xRoom=Math.max(.015,f.offset.x>=0?2.69-bx:bx-(rightBank?1.96:-2.69));
  const zRoom=Math.max(.015,f.offset.y>=0?2.72-bz:bz-(rightBank?-2.65:1.48));
  const x=bx+xRoom*Math.tanh(f.offset.x/xRoom),z=bz+zRoom*Math.tanh(f.offset.y/zRoom);
  const top=Math.min(-.105,lakeHeight(x,z)-.07)-species[f.id][2]*1.58*f.scale;
  return out.set(x,clamp(f.depth+.023*Math.sin(2*a+f.phase)+.28*liquidSlope(x,z),-.33,top),z);
}

const crumbs=[],sugarGeo=new T.IcosahedronGeometry(.032,0);
const sugarColors=['#ffbf78','#f3df9d','#f28a91'].map(color=>new T.MeshStandardMaterial({color,roughness:.78}));
function scatterSugar(p){
  if(crumbs.length+6>48){notice('湖里还有糖屑，等鱼儿吃完再投吧');return;}
  for(let i=0;i<6;i++){
    const a=TAU*(i+fishRand()*.44)/6,r=.07+.15*fishRand();
    let x=clamp(p.x+r*Math.cos(a),-2.72,2.72),z=clamp(p.z+r*Math.sin(a),-2.72,2.72);
    // 将靠岸的糖屑放在可供鱼嘴接近的一侧。
    for(let n=0;n<12&&sdf(x,-.24,z)<.24;n++){
      const gx=sdf(x+.02,-.24,z)-sdf(x-.02,-.24,z),gz=sdf(x,-.24,z+.02)-sdf(x,-.24,z-.02);
      const len=Math.hypot(gx,gz)||1;x=clamp(x+.075*gx/len,-2.72,2.72);z=clamp(z+.075*gz/len,-2.72,2.72);
    }
    const m=mesh(sugarGeo,sugarColors[i%3],x,lakeHeight(x,z)+.014,z);
    m.scale.set(1.12,.64,.82);m.rotation.set(a*.5,a,i);m.castShadow=false;
    crumbs.push({m,x,z,born:clock,pause:.82+.50*fishRand(),phase:a});
  }
  disturb(p.x,p.z,.11);
}
function assignFeeders(){
  // 一粒糖屑只引来一条鱼，优先让离它最近的鱼觅食。
  for(const f of fish)f.meal=null;
  for(const q of crumbs){
    let closest=null,range=1.54+Math.max(0,clock-q.born-6)*.24;
    for(const f of fish){
      if(f.meal||f.escape.lengthSq()>=.025)continue;
      const d=f.position.distanceTo(q.m.position);
      if(d<range){range=d;closest=f;}
    }
    if(closest)closest.meal=q;
  }
}
function driftSugar(){
  for(const q of crumbs){
    const age=clock-q.born,fall=Math.max(0,age-q.pause),p=q.m.position;
    p.x=q.x+.024*Math.sin(age*1.7+q.phase);p.z=q.z+.017*Math.sin(age*1.3+q.phase);
    p.y=Math.max(-.30,lakeHeight(p.x,p.z)+.013-fall*.063);
    q.m.rotation.z=.22*Math.sin(age*1.4+q.phase);
  }
}
const feedingTarget=V(0,0,0),steering=V(0,0,0),mouth=V(0,0,0);
function guideFish(f,home){
  const dt=1/60,p=f.position,snout=species[f.id][1]*.5*f.scale;
  const food=f.meal;
  if(!food&&!f.foraging)return;
  f.foraging=true;
  feedingTarget.copy(food?food.m.position:home);
  if(food){
    if(f.approachMeal!==food){
      f.approachMeal=food;f.approach.subVectors(food.m.position,p);f.approach.y=0;
      if(f.approach.lengthSq()<.001)f.approach.set(f.direction.x,0,f.direction.z);
      f.approach.normalize();f.reposition=false;
    }
    const offset=steering.subVectors(food.m.position,p).dot(f.approach);
    const waiting=food.m.position.y>-.075;
    if(!waiting&&offset<snout*.47)f.reposition=true;
    if(offset>snout+.14)f.reposition=false;
    if(waiting||f.reposition)feedingTarget.addScaledVector(f.approach,-snout-.19);
    const nearShip=Math.hypot(p.x-ship.position.x,p.z-ship.position.z)<.83;
    feedingTarget.y=Math.min(feedingTarget.y,lakeHeight(p.x,p.z)-species[f.id][2]*1.6,(nearShip?-.14:1));
  }
  // 绕过崖角，再向糖屑或原来的鱼群汇合。
  const crossBank=(p.x>1.56&&p.z<1.35&&feedingTarget.x<1.55)||(feedingTarget.x>1.56&&feedingTarget.z<1.35&&p.x<1.55);
  if(crossBank)feedingTarget.set(2.10,p.y,1.67);
  steering.subVectors(feedingTarget,p);
  const distance=steering.length(),speed=(food ? .40 : .82)*(.63+agility[f.id]*.53);
  if(distance>.0001)steering.multiplyScalar(Math.min(speed,distance*3.1)/distance);
  f.swimVelocity.lerp(steering,1-Math.exp(-dt*(2.8+agility[f.id]*4)));
  if(!food&&p.distanceTo(home)<.029){f.foraging=false;return;}
  home.copy(p).addScaledVector(f.swimVelocity,dt);
  home.x=clamp(home.x,-2.76,2.76);home.z=clamp(home.z,-2.76,2.76);
  if(sdf(home.x,home.y,home.z)<.17){
    const gx=sdf(home.x+.02,home.y,home.z)-sdf(home.x-.02,home.y,home.z);
    const gz=sdf(home.x,home.y,home.z+.02)-sdf(home.x,home.y,home.z-.02);
    const n=Math.hypot(gx,gz)||1;
    home.x+=gx/n*.014;home.z+=gz/n*.014;
  }
  steering.subVectors(home,p);
  if(steering.lengthSq()>1e-10)steering.normalize();else steering.copy(f.direction);
  mouth.copy(home).addScaledVector(steering,snout);
  if(food&&mouth.distanceToSquared(food.m.position)<.048**2){
    root.remove(food.m);crumbs.splice(crumbs.indexOf(food),1);f.meal=null;
  }
}

function swim(t,initial=false){
  for(const f of fish){
    if(initial)swimPoint(f,t-1/60,f.position);else scatterStep(f);
    swimPoint(f,t,nextFish);if(!initial)guideFish(f,nextFish);
    if(nextFish.distanceToSquared(f.position)>1e-14)f.direction.subVectors(nextFish,f.position).normalize();f.position.copy(nextFish);
    fishSide.crossVectors(f.direction,fishUp).normalize();fishNormal.crossVectors(fishSide,f.direction);
    fishPose.makeBasis(f.direction,fishNormal,fishSide).scale(fishSize.setScalar(f.scale)).setPosition(f.position);
    f.body.setMatrixAt(f.i,fishPose);
    tailPose.makeTranslation(-species[f.id][1]*.5,0,0).multiply(tailSwing.makeRotationY(.40*Math.sin(t*f.beat+f.phase)));
    f.tail.setMatrixAt(f.i,tailPose.premultiply(fishPose));
  }
  for(const pair of fishBatches)for(const batch of pair)batch.instanceMatrix.needsUpdate=true;
}
swim(0,true);

let feedArmed=false,watchFish=null;
const lensButton=$('#lens'),watchBar=$('#watchbar'),fishLabel=$('#fishname');
const watchCam=new T.OrthographicCamera(-1,1,.6,-.6,.015,40);
const lakeHaze=new T.Fog(0xadd6c7,2.0,6.8);
const watchCenter=V(0,0,0),watchWorld=V(0,0,0),viewPoint=V(0,0,0);
const feedBtn=button('.actions','投喂糖屑',icon('coin')+'投喂糖屑',()=>armFeed(!feedArmed));
function armFeed(on){
  feedArmed=on;feedBtn.setAttribute('aria-pressed',String(on));canvas.style.cursor=on?'crosshair':'';
  if(on){
    if(innerWidth<=760&&panel.classList.contains('open'))$('.sheet').click();
    notice('点湖面撒一把糖屑');
  }
}
feedBtn.setAttribute('aria-pressed','false');
function observe(f){
  armFeed(false);watchFish=f;watchCenter.copy(f.position);document.body.classList.add('watching');
  lensButton.hidden=true;watchBar.hidden=false;fishLabel.textContent=species[f.id][0];
  $('#leavewatch').focus({preventScroll:true});
}
function leaveWatch(){
  watchFish=null;scene.fog=null;document.body.classList.remove('watching');cut.visible=true;
  lensButton.hidden=false;watchBar.hidden=true;lensButton.focus({preventScroll:true});
}
lensButton.onclick=()=>{
  // 投喂后优先跟随正在觅食的鱼，其他时候选一条前湖锦鲤。
  observe(fish.find(f=>f.meal)||fish.find(f=>f.foraging)||fish[0]);
};
$('#nextfish').onclick=()=>observe(fish.find(f=>f.id===(watchFish.id+1)%species.length));
$('#leavewatch').onclick=leaveWatch;
addEventListener('keydown',e=>{if(e.key==='Escape'){if(watchFish)leaveWatch();else armFeed(false);}});
function watchTap(e){
  let candidate=null,nearest=25**2;
  for(const f of fish){
    root.localToWorld(viewPoint.copy(f.position));viewPoint.project(watchCam);
    if(Math.abs(viewPoint.z)>1||Math.abs(viewPoint.x)>1||Math.abs(viewPoint.y)>1)continue;
    const d=((viewPoint.x+1)*innerWidth/2-e.clientX)**2+((1-viewPoint.y)*innerHeight/2-e.clientY)**2;
    if(d<nearest){nearest=d;candidate=f;}
  }
  if(candidate)observe(candidate);else leaveWatch();
}
function sceneCamera(){
  if(!watchFish){
    viewPoint.set(.33,-.55,3.04);root.localToWorld(viewPoint);viewPoint.project(camera);
    lensButton.style.left=(viewPoint.x+1)*50+'%';lensButton.style.top=(1-viewPoint.y)*50+'%';
    return camera;
  }
  cut.visible=false;scene.fog=lakeHaze;lakeHaze.color.set(0xadd6c7).lerp(night,cfg.day*.9);
  const aspect=innerWidth/innerHeight,halfHeight=Math.max(.51,.70/aspect);
  watchCam.left=-halfHeight*aspect;watchCam.right=halfHeight*aspect;watchCam.top=halfHeight;watchCam.bottom=-halfHeight;watchCam.updateProjectionMatrix();
  watchCenter.lerp(watchFish.position,.20);
  root.localToWorld(watchWorld.copy(watchCenter));
  const rightBank=clamp((watchCenter.x-1.2)/1.2,0,1);
  watchCam.position.copy(watchCenter).add(viewPoint.set(.34+rightBank*1.30,.055,1.65-rightBank*.96));
  root.localToWorld(watchCam.position);watchCam.up.set(0,1,0).applyQuaternion(root.quaternion);
  watchCam.lookAt(watchWorld);watchCam.updateMatrixWorld();
  return watchCam;
}

const causticCanvas=document.createElement('canvas');causticCanvas.width=causticCanvas.height=128;
const cx=causticCanvas.getContext('2d');for(let i=0;i<13;i++){cx.beginPath();for(let k=0;k<=40;k++){let x=128*k/40,y=i*11+5*Math.sin(x*TAU/128*2+i*.63)+3*Math.sin(x*TAU/128-i);if(k)cx.lineTo(x,y);else cx.moveTo(x,y)}cx.strokeStyle='rgba(240,255,211,.68)';cx.lineWidth=1.8;cx.stroke()}
const causticTex=new T.CanvasTexture(causticCanvas);causticTex.wrapS=causticTex.wrapT=T.RepeatWrapping;causticTex.repeat.set(2.3,2.2);
const caustic=mesh(new T.PlaneGeometry(5.73,5.73),new T.MeshBasicMaterial({map:causticTex,transparent:true,opacity:.37,depthWrite:false}),0,-.448,0);caustic.rotation.x=-PI/2;caustic.castShadow=false;
jelly.transmission=.26;jelly.thickness=.59;jelly.ior=1.34;
const shadowTex=document.createElement('canvas');shadowTex.width=shadowTex.height=128;const sx=shadowTex.getContext('2d'),grad=sx.createRadialGradient(64,64,12,64,64,65);grad.addColorStop(0,'rgba(90,67,64,.48)');grad.addColorStop(.68,'rgba(109,92,78,.24)');grad.addColorStop(1,'rgba(120,101,83,0)');sx.fillStyle=grad;sx.fillRect(0,0,128,128);
const shadow=mesh(new T.PlaneGeometry(10.3,9.1),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowTex),transparent:true,depthWrite:false}),.18,-1.07,.14,scene);shadow.rotation.x=-PI/2;shadow.castShadow=false;


const surfaceGlints=[];
const gleam=new T.MeshBasicMaterial({color:'#eaffef',transparent:true,opacity:.53,depthWrite:false});
for(let i=0;i<27;i++){let x=-2.7+random()*5.2,z=1.16+random()*1.69;let width=.035+random()*.16;let g=line([V(x-width,.111,z+.013),V(x,.118,z),V(x+width,.11,z-.015)],.006,gleam);g.userData={x,z};surfaceGlints.push(g);g.renderOrder=5;g.castShadow=false}
const mistTex=document.createElement('canvas');mistTex.width=mistTex.height=64;let mc=mistTex.getContext('2d'),mg=mc.createRadialGradient(32,32,0,32,32,32);mg.addColorStop(0,'rgba(245,255,248,.85)');mg.addColorStop(1,'rgba(235,255,250,0)');mc.fillStyle=mg;mc.fillRect(0,0,64,64);
const mist=new T.SpriteMaterial({map:new T.CanvasTexture(mistTex),transparent:true,depthWrite:false});const mists=[];for(let i=0;i<9;i++){let m=new T.Sprite(mist);root.add(m);m.renderOrder=7;mists.push(m)}
function drift(){mist.opacity=cfg.flow*.28;for(let i=0;i<mists.length;i++){let t=(waveTime*.48+i/9)%1,a=i*2.4,m=mists[i];m.position.set(fallX+Math.cos(a)*t*.36,lakeHeight(fallX,hitZ)+.038+.23*t,hitZ+Math.sin(a)*t*.23);m.scale.setScalar(.21+.27*Math.sin(PI*t))}}


let before=performance.now(),acc=0;renderer.setAnimationLoop(now=>{acc+=Math.min(.1,(now-before)/1000);before=now;while(acc>=1/60){physics(1/60);acc-=1/60}render()});
