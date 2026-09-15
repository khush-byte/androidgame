(function(){
  window.addEventListener('load', init);

  function init(){
    if(typeof THREE === 'undefined'){
      document.getElementById('loadingScreen').innerHTML='<p>Не удалось загрузить 3D-движок.<br>Проверьте подключение к интернету.</p>';
      return;
    }
    document.getElementById('loadingScreen').style.display='none';
    startEngine();
  }

  function startEngine(){
    const container=document.getElementById('scene-container');
    const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.12;
    renderer.setClearColor(0x02050a,1);
    container.appendChild(renderer.domElement);

    const scene=new THREE.Scene();
    scene.fog=new THREE.Fog(0x050b14,35,210);

    const BASE_FOV=58,BOOST_FOV=70;
    const camera=new THREE.PerspectiveCamera(BASE_FOV,window.innerWidth/window.innerHeight,.1,500);
    camera.position.set(0,4.6,7.6);

    function resize(){
      renderer.setSize(window.innerWidth,window.innerHeight);
      camera.aspect=window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize',resize); resize();

    // ---------------- CINEMATIC LIGHTING ----------------
    scene.add(new THREE.HemisphereLight(0x8ccfff,0x050812,.72));
    const moon=new THREE.DirectionalLight(0xb9dcff,1.45);
    moon.position.set(-18,28,10); moon.castShadow=true;
    moon.shadow.mapSize.set(2048,2048);
    moon.shadow.camera.left=-20; moon.shadow.camera.right=20; moon.shadow.camera.top=30; moon.shadow.camera.bottom=-12;
    moon.shadow.camera.near=1; moon.shadow.camera.far=80;
    scene.add(moon);
    const cyanFill=new THREE.PointLight(0x21cfff,2.1,24); cyanFill.position.set(-6,4,2); scene.add(cyanFill);
    const redFill=new THREE.PointLight(0xff284e,1.6,20); redFill.position.set(7,3,-5); scene.add(redFill);

    // ---------------- WORLD ----------------
    const LANE_WIDTH=2.6;
    const ROAD_WIDTH=LANE_WIDTH*3.45;

    const roadMat=new THREE.MeshStandardMaterial({color:0x10151b,roughness:.88,metalness:.05});
    const road=new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH,300),roadMat);
    road.rotation.x=-Math.PI/2; road.position.set(0,-.015,-115); road.receiveShadow=true; scene.add(road);

    const shoulderMat=new THREE.MeshStandardMaterial({color:0x242c31,roughness:.95});
    for(const x of [-ROAD_WIDTH/2-.8,ROAD_WIDTH/2+.8]){
      const shoulder=new THREE.Mesh(new THREE.PlaneGeometry(1.6,300),shoulderMat);
      shoulder.rotation.x=-Math.PI/2; shoulder.position.set(x,-.005,-115); shoulder.receiveShadow=true; scene.add(shoulder);
    }

    // lane lines + road edge reflectors
    const dashLinesX=[-LANE_WIDTH/2,LANE_WIDTH/2];
    const DASH_SPACING=4.2;
    const dashGeo=new THREE.BoxGeometry(.095,.025,1.65);
    const dashMat=new THREE.MeshStandardMaterial({color:0xd8e6e8,emissive:0x496c72,emissiveIntensity:.25,roughness:.6});
    let dashes=[];
    function spawnDashRow(z){
      const zPos=z!==undefined?z:-232;
      for(const x of dashLinesX){const m=new THREE.Mesh(dashGeo,dashMat);m.position.set(x,.025,zPos);scene.add(m);dashes.push(m);}
    }
    const edgeGeo=new THREE.BoxGeometry(.12,.035,2.0);
    const edgeMat=new THREE.MeshStandardMaterial({color:0xffe8a0,emissive:0x7b5d22,emissiveIntensity:.4});
    let reflectors=[];
    function spawnReflector(z){
      for(const x of [-ROAD_WIDTH/2+.22,ROAD_WIDTH/2-.22]){
        const m=new THREE.Mesh(edgeGeo,edgeMat);m.position.set(x,.03,z);scene.add(m);reflectors.push(m);
      }
    }

    // ---------------- SKY / DISTANT MOUNTAINS ----------------
    const skyCanvas=document.createElement('canvas'); skyCanvas.width=2; skyCanvas.height=512;
    const sg=skyCanvas.getContext('2d');
    const grad=sg.createLinearGradient(0,0,0,512);
    grad.addColorStop(0,'#02050d'); grad.addColorStop(.48,'#07182a'); grad.addColorStop(1,'#162c36');
    sg.fillStyle=grad;sg.fillRect(0,0,2,512);
    const skyTex=new THREE.CanvasTexture(skyCanvas);
    const sky=new THREE.Mesh(new THREE.SphereGeometry(230,32,16),new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide}));
    scene.add(sky);

    let scenery=[];
    function addMountain(side,z){
      const pts=[]; for(let i=0;i<8;i++) pts.push(new THREE.Vector2(i*2.8,Math.max(2,Math.sin(i*.9+Math.random())*7+Math.random()*4)));
      const shape=new THREE.Shape(); shape.moveTo(0,0); pts.forEach(p=>shape.lineTo(p.x,p.y)); shape.lineTo(19.6,0); shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:false}); geo.translate(-10,0,-1.5);
      const mat=new THREE.MeshStandardMaterial({color:0x17262d,roughness:1});
      const m=new THREE.Mesh(geo,mat);m.position.set(side*(12+Math.random()*7),0,z);m.scale.set(1,1.1,1.6);scene.add(m);scenery.push(m);
    }
    // for(let z=-210;z<15;z+=24){addMountain(-1,z);addMountain(1,z+10);}

    // ---------------- CITY / STREET LIGHTS ----------------
    let buildings=[];
    function windowTexture(){
      const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');
      g.fillStyle='#101922';g.fillRect(0,0,128,256);
      for(let y=10;y<245;y+=20) for(let x=8;x<120;x+=24){
        if(Math.random()<.56){g.fillStyle=Math.random()<.78?'#d7ad55':'#69bde0';g.globalAlpha=.7+Math.random()*.3;g.fillRect(x,y,10,7);}
      }
      g.globalAlpha=1;return new THREE.CanvasTexture(c);
    }
    const buildingTex=windowTexture();
    function spawnBuilding(z){
      const zPos=z!==undefined?z:-232,side=Math.random()<.5?-1:1;
      const h=9+Math.random()*24,w=3.8+Math.random()*4,d=3.5+Math.random()*5;
      const mat=new THREE.MeshStandardMaterial({map:buildingTex,color:0x52616b,roughness:.86,metalness:.05});
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      b.position.set(side*(9.5+Math.random()*8),h/2,zPos);b.castShadow=true;b.receiveShadow=true;scene.add(b);buildings.push(b);
    }
    let lamps=[];
    const lampMat=new THREE.MeshStandardMaterial({color:0x202a31,metalness:.8,roughness:.28});
    const lampGlow=new THREE.MeshStandardMaterial({color:0xffe2a0,emissive:0xffa928,emissiveIntensity:2.5});
    function spawnLamp(z){
      for(const side of [-1,1]){
        const g=new THREE.Group();
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,4.2,8),lampMat);pole.position.y=2.1;g.add(pole);
        const arm=new THREE.Mesh(new THREE.BoxGeometry(.6,.04,.04),lampMat);arm.position.set(side*.28,4.15,0);g.add(arm);
        const bulb=new THREE.Mesh(new THREE.SphereGeometry(.08,10,8),lampGlow);bulb.position.set(side*.55,4.12,0);g.add(bulb);
        g.position.set(side*(ROAD_WIDTH/2+1.0),0,z);scene.add(g);lamps.push(g);
      }
    }

    // ---------------- VEHICLE MATERIALS ----------------
    function mat(color,rough=.4,metal=.3,em=0,ei=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive:em,emissiveIntensity:ei});}
    const rubber=mat(0x090b0d,.92,.03), rim=mat(0x7d858b,.24,.85), dark=mat(0x11171c,.3,.65);
    const glass=mat(0x07111a,.12,.82,0x061827,.25);
    const chrome=mat(0xaeb9bf,.18,.92), black=mat(0x080a0c,.32,.55);
    const head=mat(0xf6fbff,.18,.45,0xa9eaff,2.5), tail=mat(0xff182f,.2,.35,0xff1020,2.2);

    function addWheel(group,x,y,z,r=.25,width=.20){
      const tire=new THREE.Mesh(new THREE.CylinderGeometry(r,r,width,20),rubber);tire.rotation.z=Math.PI/2;tire.position.set(x,y,z);tire.castShadow=true;group.add(tire);
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.48,r*.48,width+.01,16),rim);hub.rotation.z=Math.PI/2;hub.position.set(x,y,z);group.add(hub);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(r*.16,r*.16,width+.02,12),dark);cap.rotation.z=Math.PI/2;cap.position.set(x,y,z);group.add(cap);
      return tire;
    }
    function addLights(group,w,frontZ,rearZ,bodyY){
      const frontGeo=new THREE.BoxGeometry(w*.18,.055,.035);
      for(const x of [-w*.28,w*.28]){
        const h=new THREE.Mesh(frontGeo,head);h.position.set(x,bodyY,frontZ);group.add(h);
        const t=new THREE.Mesh(frontGeo,tail);t.position.set(x,bodyY,rearZ);group.add(t);
      }
    }
    function addMirrors(group,w,y,z){
      const mg=new THREE.BoxGeometry(.09,.07,.16);
      for(const x of [-w*.52,w*.52]){const m=new THREE.Mesh(mg,black);m.position.set(x,y,z);m.rotation.y=x>0?-.18:.18;group.add(m);}
    }
    function addGrille(group,w,y,z){
      const g=new THREE.Mesh(new THREE.BoxGeometry(w*.48,.10,.025),chrome);g.position.set(0,y,z);group.add(g);
      for(let i=-3;i<=3;i++){const sl=new THREE.Mesh(new THREE.BoxGeometry(.018,.07,.03),black);sl.position.set(i*w*.06,y,z-.018);group.add(sl);}
    }

    function buildPlayerCar(){
      const car=new THREE.Group(), wheels=[];
      const red=mat(0xb90f24,.23,.65);
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.12,.38,2.18),red);body.position.y=.34;body.castShadow=true;body.receiveShadow=true;car.add(body);
      const hood=new THREE.Mesh(new THREE.BoxGeometry(1.02,.16,.66),red);hood.position.set(0,.54,-.62);hood.rotation.x=.02;car.add(hood);
      const rear=new THREE.Mesh(new THREE.BoxGeometry(1.05,.22,.55),red);rear.position.set(0,.49,.78);car.add(rear);
      const cabin=new THREE.Mesh(new THREE.BoxGeometry(.70,.34,.92),glass);cabin.position.set(0,.69,.05);cabin.rotation.x=-.03;car.add(cabin);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(.52,.05,.68),dark);roof.position.set(0,.88,.05);car.add(roof);
      const splitter=new THREE.Mesh(new THREE.BoxGeometry(1.05,.07,.12),black);splitter.position.set(0,.17,-1.12);car.add(splitter);
      const wing=new THREE.Mesh(new THREE.BoxGeometry(1.02,.055,.25),red);wing.position.set(0,.69,.98);car.add(wing);
      addMirrors(car,.95,.62,.03);addGrille(car,1,.32,-1.10);addLights(car,1,-1.10,1.03,.42);
      for(const p of [[-.57,.25,-.68],[.57,.25,-.68],[-.57,.25,.66],[.57,.25,.66]])wheels.push(addWheel(car,...p,.27,.22));
      const flameMat=new THREE.MeshStandardMaterial({color:0x58eaff,emissive:0x20bfff,emissiveIntensity:3,transparent:true,opacity:.1});
      const flames=[-1,1].map(s=>{const f=new THREE.Mesh(new THREE.ConeGeometry(.075,.45,12),flameMat.clone());f.rotation.x=-Math.PI/2;f.position.set(s*.25,.25,1.12);f.scale.z=.2;car.add(f);return f;});
      return {group:car,wheels,flames};
    }

    function standardCar(color,scale=1){
      const g=new THREE.Group(),wheels=[],bodyMat=mat(color,.28,.58);
      const body=new THREE.Mesh(new THREE.BoxGeometry(.98,.34,1.9),bodyMat);body.position.y=.32;body.castShadow=true;body.receiveShadow=true;g.add(body);
      const hood=new THREE.Mesh(new THREE.BoxGeometry(.88,.13,.55),bodyMat);hood.position.set(0,.51,-.62);g.add(hood);
      const cabin=new THREE.Mesh(new THREE.BoxGeometry(.62,.29,.82),glass);cabin.position.set(0,.62,.04);g.add(cabin);
      const bumper=new THREE.Mesh(new THREE.BoxGeometry(.91,.09,.08),chrome);bumper.position.set(0,.22,-.99);g.add(bumper);
      addMirrors(g,.86,.58,.04);addGrille(g,.9,.32,-.98);addLights(g,.88,-.96,.95,.40);
      for(const p of [[-.5,.23,-.58],[.5,.23,-.58],[-.5,.23,.60],[.5,.23,.60]])wheels.push(addWheel(g,...p,.245,.20));
      g.scale.setScalar(scale);return g;
    }
    function buildSedan(){return standardCar(0x9da8b0);}
    function buildSUV(){
      const g=standardCar(0x304b38,1.08);g.children.find(c=>c.geometry&&c.geometry.parameters&&c.geometry.parameters.height===.29)?.scale.set(1,1.2,1);return g;
    }
    function buildPickup(){
      const g=new THREE.Group(),m=mat(0xa94e2d,.4,.45),wheels=[];
      const cab=new THREE.Mesh(new THREE.BoxGeometry(.96,.52,.92),m);cab.position.set(0,.42,-.48);cab.castShadow=true;g.add(cab);
      const cabGlass=new THREE.Mesh(new THREE.BoxGeometry(.65,.27,.48),glass);cabGlass.position.set(0,.70,-.51);g.add(cabGlass);
      const bed=new THREE.Mesh(new THREE.BoxGeometry(.92,.11,1.05),m);bed.position.set(0,.33,.54);g.add(bed);
      for(const x of [-.45,.45]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.07,.28,1.08),m);rail.position.set(x,.48,.54);g.add(rail);}
      const tailgate=new THREE.Mesh(new THREE.BoxGeometry(.92,.28,.07),m);tailgate.position.set(0,.48,1.08);g.add(tailgate);
      addLights(g,.9,-.96,1.1,.45);addMirrors(g,.9,.67,-.50);
      for(const p of [[-.51,.25,-.58],[.51,.25,-.58],[-.51,.25,.67],[.51,.25,.67]])wheels.push(addWheel(g,...p,.26,.21));return g;
    }
    function buildVan(){
      const g=new THREE.Group(),wheels=[],m=mat(0xd8dde0,.42,.25);
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.02,.92,2.1),m);body.position.y=.57;body.castShadow=true;g.add(body);
      const windshield=new THREE.Mesh(new THREE.BoxGeometry(.76,.34,.055),glass);windshield.position.set(0,.80,-1.055);g.add(windshield);
      const belt=new THREE.Mesh(new THREE.BoxGeometry(1.025,.075,2.12),mat(0x246ac0,.4,.35));belt.position.y=.55;g.add(belt);
      addLights(g,.92,-1.07,1.07,.48);
      for(const p of [[-.55,.27,-.63],[.55,.27,-.63],[-.55,.27,.70],[.55,.27,.70]])wheels.push(addWheel(g,...p,.26,.21));return g;
    }
    function buildBoxTruck(){
      const g=new THREE.Group(),wheels=[],cabm=mat(0x283b4c,.42,.5),boxm=mat(0x8e9ba4,.65,.25);
      const cab=new THREE.Mesh(new THREE.BoxGeometry(1,.67,.88),cabm);cab.position.set(0,.61,-.83);cab.castShadow=true;g.add(cab);
      const windshield=new THREE.Mesh(new THREE.BoxGeometry(.70,.29,.055),glass);windshield.position.set(0,.79,-1.275);g.add(windshield);
      const box=new THREE.Mesh(new THREE.BoxGeometry(1.10,1.35,1.65),boxm);box.position.set(0,.98,.43);box.castShadow=true;g.add(box);
      const rearDoor=new THREE.Mesh(new THREE.BoxGeometry(.86,.9,.035),mat(0x64737d,.7,.2));rearDoor.position.set(0,1.02,1.27);g.add(rearDoor);
      addLights(g,.9,-1.28,1.30,.44);
      for(const p of [[-.55,.32,-.82],[.55,.32,-.82],[-.55,.32,.35],[.55,.32,.35],[-.55,.32,.93],[.55,.32,.93]])wheels.push(addWheel(g,...p,.27,.22));return g;
    }
    function buildBus(){
      const g=new THREE.Group(),wheels=[],m=mat(0xd6a923,.45,.3);
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.10,1.18,3.35),m);body.position.y=.70;body.castShadow=true;g.add(body);
      const windows=new THREE.Mesh(new THREE.BoxGeometry(1.115,.43,2.75),mat(0x172330,.2,.6));windows.position.set(0,1.02,-.12);g.add(windows);
      const bumper=new THREE.Mesh(new THREE.BoxGeometry(1.02,.10,.10),chrome);bumper.position.set(0,.22,-1.69);g.add(bumper);
      addLights(g,.98,-1.70,1.70,.54);
      for(const p of [[-.58,.34,-1.18],[.58,.34,-1.18],[-.58,.34,.05],[.58,.34,.05],[-.58,.34,1.20],[.58,.34,1.20]])wheels.push(addWheel(g,...p,.29,.22));return g;
    }
    function buildMotorcycle(){
      const g=new THREE.Group(),wheels=[];
      const m=mat(0x14171a,.22,.72),frame=mat(0x555e64,.3,.8);
      const tank=new THREE.Mesh(new THREE.SphereGeometry(.27,16,10),m);tank.scale.set(1,.62,1.5);tank.position.set(0,.62,-.05);g.add(tank);
      const seat=new THREE.Mesh(new THREE.BoxGeometry(.23,.09,.48),black);seat.position.set(0,.70,.38);g.add(seat);
      const fork=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.65,8),frame);fork.rotation.x=.16;fork.position.set(0,.48,-.46);g.add(fork);
      const bar=new THREE.Mesh(new THREE.BoxGeometry(.42,.035,.035),frame);bar.position.set(0,.84,-.42);g.add(bar);
      addLights(g,.28,-.61,.62,.54);
      wheels.push(addWheel(g,0,.29,-.52,.29,.11),addWheel(g,0,.29,.55,.29,.11));return g;
    }
    function buildRivalSportsCar(){const g=standardCar(0x165fbd,.98);const wing=new THREE.Mesh(new THREE.BoxGeometry(.92,.045,.20),mat(0x0d4d9c,.25,.7));wing.position.set(0,.68,.96);g.add(wing);return g;}
    function buildTaxi(){const g=standardCar(0xe9bb20,1);const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.0,.075,1.72),black);stripe.position.y=.37;g.add(stripe);const sign=new THREE.Mesh(new THREE.BoxGeometry(.25,.09,.16),mat(0xffd35a,.25,.2,0xffa000,2));sign.position.y=.85;g.add(sign);return g;}
    function buildTanker(){
      const g=new THREE.Group(),wheels=[],cabm=mat(0x2d3e4e,.4,.55);
      const cab=new THREE.Mesh(new THREE.BoxGeometry(1,.67,.88),cabm);cab.position.set(0,.61,-.92);g.add(cab);
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(.57,.57,1.95,24),mat(0xc4ced3,.25,.82));tank.rotation.x=Math.PI/2;tank.position.set(0,.76,.35);tank.castShadow=true;g.add(tank);
      for(let z=-.35;z<1;z+=.45){const band=new THREE.Mesh(new THREE.TorusGeometry(.58,.025,8,24),chrome);band.rotation.y=Math.PI/2;band.position.set(0,.76,z);g.add(band);}
      addLights(g,.9,-1.38,1.34,.45);
      for(const p of [[-.55,.32,-.95],[.55,.32,-.95],[-.55,.32,.10],[.55,.32,.10],[-.55,.32,.82],[.55,.32,.82]])wheels.push(addWheel(g,...p,.27,.22));return g;
    }
    function buildPoliceCar(){
      const g=standardCar(0xe5e9ed,1), stripe=new THREE.Mesh(new THREE.BoxGeometry(1.0,.11,.72),black);stripe.position.y=.40;g.add(stripe);
      const barL=new THREE.Mesh(new THREE.BoxGeometry(.20,.075,.15),mat(0xff2539,.2,.3,0xff1420,3));barL.position.set(-.14,.86,.03);g.add(barL);
      const barR=new THREE.Mesh(new THREE.BoxGeometry(.20,.075,.15),mat(0x2b75ff,.2,.3,0x194dff,3));barR.position.set(.14,.86,.03);g.add(barR);return g;
    }

    const VEHICLE_BUILDERS=[buildSedan,buildSUV,buildPickup,buildVan,buildBoxTruck,buildBus,buildMotorcycle,buildRivalSportsCar,buildTaxi,buildTanker,buildPoliceCar];

    // ---------------- GAME STATE: LOGIC PRESERVED ----------------
    let state='start',distance=0;
    let best=parseInt(localStorage.getItem('overdriveRunBest')||'0',10);
    document.getElementById('bestVal').textContent=best;
    let baseSpeed=13;
    const SPEED_MAX=30,SPEED_RAMP=.09,BOOST_MULT=1.7;
    let boostAmount=0;
    const player={lane:0,currentX:0};
    let obstacles=[],dashAccum=0,buildingAccum=0,lampAccum=0,reflectorAccum=0;
    let nextBuildingAt=8,nextObstacleAt=22,nextLampAt=10,nextReflectorAt=2;

    const playerData=buildPlayerCar(),carRig=playerData.group,carWheels=playerData.wheels,carFlames=playerData.flames;
    scene.add(carRig);

    function spawnObstacle(z){
      const zPos=z!==undefined?z:-232;
      const laneIdx=Math.floor(Math.random()*3)-1;
      const builder=VEHICLE_BUILDERS[Math.floor(Math.random()*VEHICLE_BUILDERS.length)];
      const mesh=builder();mesh.position.set(laneIdx*LANE_WIDTH,0,zPos);
      mesh.userData.seed=Math.random()*10;mesh.userData.type=builder;
      scene.add(mesh);obstacles.push({mesh,lane:laneIdx,passed:false,dead:false,phase:Math.random()*Math.PI*2});
    }

    function clearWorld(){
      for(const o of obstacles)scene.remove(o.mesh);obstacles=[];
      for(const d of dashes)scene.remove(d);dashes=[];
      for(const r of reflectors)scene.remove(r);reflectors=[];
      for(const b of buildings)scene.remove(b);buildings=[];
      for(const l of lamps)scene.remove(l);lamps=[];
    }
    function prefillWorld(){
      for(let z=-232;z<8;z+=DASH_SPACING){spawnDashRow(z);spawnReflector(z);}
      let bz=-232;while(bz<8){spawnBuilding(bz);bz+=9+Math.random()*9;}
      for(let z=-232;z<8;z+=12)spawnLamp(z);
    }
    function resetGame(){
      clearWorld();distance=0;baseSpeed=13;boostAmount=0;player.lane=0;player.currentX=0;
      obstacleAccum=0;nextObstacleAt=22;dashAccum=0;buildingAccum=0;nextBuildingAt=8;
      lampAccum=0;nextLampAt=10;reflectorAccum=0;nextReflectorAt=2;prefillWorld();updateHud();
    }
    function updateHud(){
      document.getElementById('scoreVal').textContent=Math.floor(distance);
      document.getElementById('nitroFill').style.width=(boostAmount*100)+'%';
    }

    const keys={};
    window.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW'].includes(e.code))e.preventDefault();
      if(keys[e.code])return;keys[e.code]=true;
      if(state!=='playing')return;
      if(e.code==='ArrowLeft'||e.code==='KeyA')player.lane=Math.max(-1,player.lane-1);
      if(e.code==='ArrowRight'||e.code==='KeyD')player.lane=Math.min(1,player.lane+1);
    });
    window.addEventListener('keyup',e=>keys[e.code]=false);
    document.getElementById('startBtn').addEventListener('click',startGame);
    document.getElementById('retryBtn').addEventListener('click',startGame);

    function startGame(){
      resetGame();document.getElementById('startScreen').style.display='none';document.getElementById('gameOverScreen').style.display='none';
      state='playing';lastTime=performance.now();requestAnimationFrame(loop);
    }
    function endGame(){
      if(state==='over')return;state='over';
      if(distance>best){best=Math.floor(distance);localStorage.setItem('overdriveRunBest',String(best));}
      document.getElementById('bestVal').textContent=best;
      document.getElementById('finalScore').textContent='Дистанция: '+Math.floor(distance)+' м';
      document.getElementById('gameOverScreen').style.display='flex';
    }
    function currentSpeed(){return baseSpeed*(1+boostAmount*(BOOST_MULT-1));}

    function updatePlayer(dt,speed){
      const targetX=player.lane*LANE_WIDTH,lateral=targetX-player.currentX;
      player.currentX+=lateral*Math.min(1,dt*9);
      const boosting=keys.Space||keys.ArrowUp||keys.KeyW;
      boostAmount+=((boosting?1:0)-boostAmount)*Math.min(1,dt*3.5);
      carRig.position.x=player.currentX;
      const t=performance.now()/1000;
      carRig.position.y=Math.sin(t*22)*.004*(speed/13);
      carRig.rotation.x=-boostAmount*.045;
      for(const w of carWheels)w.rotation.x-=dt*speed*2.4;
      const steer=Math.max(-1,Math.min(1,lateral/LANE_WIDTH));
      carRig.rotation.y=-steer*.25;carRig.rotation.z=steer*.09;
      for(const f of carFlames){f.scale.z=.15+boostAmount*1.9;f.material.emissiveIntensity=.8+boostAmount*3.5;f.material.opacity=.08+boostAmount*.88;}
      camera.fov=BASE_FOV+(BOOST_FOV-BASE_FOV)*boostAmount;camera.updateProjectionMatrix();
      document.getElementById('speedLines').style.opacity=(boostAmount*.6).toFixed(2);
    }

    function animateTraffic(ob,dt,speed){
      const m=ob.mesh,t=performance.now()/1000+ob.phase;
      m.position.y=Math.sin(t*4.2)*.008;
      if(m.userData.type===buildMotorcycle)m.rotation.z=Math.sin(t*2.7)*.035;
      else m.rotation.z=Math.sin(t*1.7)*.008;
      // rotate every wheel-like mesh on local X: believable rolling animation
      m.traverse(o=>{if(o.geometry&&o.geometry.type==='CylinderGeometry'&&o.rotation.z>1)o.rotation.x-=dt*speed*2.1;});
    }

    function updateObstacles(dt,speed){
      const moveZ=speed*dt;obstacleAccum+=moveZ;
      if(obstacleAccum>=nextObstacleAt){spawnObstacle();obstacleAccum=0;nextObstacleAt=16+Math.random()*14;}
      for(const ob of obstacles){
        if(ob.dead)continue;
        ob.mesh.position.z+=moveZ;animateTraffic(ob,dt,speed);
        const z=ob.mesh.position.z,laneMatch=Math.abs(player.currentX-ob.lane*LANE_WIDTH)<LANE_WIDTH*.55;
        if(!ob.passed&&z>-1.5&&z<.5&&laneMatch){endGame();}
        if(!ob.passed&&z>=.5){ob.passed=true;distance+=3;}
        if(z>16)ob.dead=true;
      }
      for(let i=obstacles.length-1;i>=0;i--)if(obstacles[i].dead){scene.remove(obstacles[i].mesh);obstacles.splice(i,1);}
    }

    function updateWorld(dt,speed){
      const moveZ=speed*dt;
      for(const d of dashes)d.position.z+=moveZ;
      dashes=dashes.filter(d=>{if(d.position.z>10){scene.remove(d);return false}return true});
      for(const r of reflectors)r.position.z+=moveZ;
      reflectors=reflectors.filter(r=>{if(r.position.z>12){scene.remove(r);return false}return true});
      for(const b of buildings)b.position.z+=moveZ;
      buildings=buildings.filter(b=>{if(b.position.z>20){scene.remove(b);return false}return true});
      for(const l of lamps)l.position.z+=moveZ;
      lamps=lamps.filter(l=>{if(l.position.z>22){scene.remove(l);return false}return true});

      dashAccum+=moveZ;while(dashAccum>=DASH_SPACING){spawnDashRow();dashAccum-=DASH_SPACING;}
      reflectorAccum+=moveZ;while(reflectorAccum>=2){spawnReflector();reflectorAccum-=2;}
      buildingAccum+=moveZ;if(buildingAccum>=nextBuildingAt){spawnBuilding();buildingAccum=0;nextBuildingAt=7+Math.random()*10;}
      lampAccum+=moveZ;if(lampAccum>=nextLampAt){spawnLamp();lampAccum=0;nextLampAt=9+Math.random()*5;}
    }

    function updateCamera(dt){
      const camTargetX=player.currentX*.55;
      camera.position.x+=(camTargetX-camera.position.x)*Math.min(1,dt*4);
      camera.position.y=4.65+boostAmount*.10;
      camera.position.z=7.65-boostAmount*.8;
      camera.lookAt(player.currentX*.7,1.15,-14);
    }

    let lastTime=0;
    function loop(now){
      const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
      if(state==='playing'){
        baseSpeed=Math.min(SPEED_MAX,baseSpeed+SPEED_RAMP*dt*10);
        const speed=currentSpeed();distance+=speed*dt;
        updatePlayer(dt,speed);updateObstacles(dt,speed);updateWorld(dt,speed);updateHud();
      }else for(const w of carWheels)w.rotation.x-=dt*4;
      updateCamera(dt);renderer.render(scene,camera);
      if(state==='playing'||state==='over')requestAnimationFrame(loop);
    }

    function idleLoop(){
      if(state!=='start')return;
      for(const w of carWheels)w.rotation.x-=.016*4;
      const t=performance.now()/1000;carRig.rotation.y=Math.sin(t*.7)*.015;
      updateCamera(.016);renderer.render(scene,camera);requestAnimationFrame(idleLoop);
    }

    resetGame();requestAnimationFrame(idleLoop);
  }
})();
