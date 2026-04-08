// ─── ELEMENTS ─────────────────────────────────────────────
const video        = document.getElementById('input_video');
const canvas       = document.getElementById('output_canvas');
const arCanvas     = document.getElementById('ar_canvas');
const ctx          = canvas.getContext('2d');
const arCtx        = arCanvas.getContext('2d');
const statusPill   = document.getElementById('statusPill');
const statusText   = document.querySelector('.status-text');
const faceEl       = document.getElementById('face-status');
const handLEl      = document.getElementById('handL-status');
const handREl      = document.getElementById('handR-status');
const drawLabel    = document.getElementById('drawModeLabel');
const overlay      = document.getElementById('loadingOverlay');
const btnFace      = document.getElementById('toggleFaceTracking');
const btnHand      = document.getElementById('toggleHandTracking');
const btnFlip      = document.getElementById('flipCamera');
const btnRec       = document.getElementById('toggleRecord');
const btnARDraw    = document.getElementById('toggleARDraw');
const recIndicator = document.getElementById('recIndicator');
const recTimer     = document.getElementById('recTimer');
const pinchHint    = document.getElementById('pinchHint');
const themeDrawer  = document.getElementById('themeDrawer');
const clearARBtn   = document.getElementById('clearARBtn');
const themeBtns    = document.querySelectorAll('.theme-btn');

// ─── STATE ────────────────────────────────────────────────
let faceOn      = true;
let handOn      = true;
let arDrawOn    = false;
let facing      = 'user';
let stream      = null;
let arTheme     = 'mystic';

// recording
let mediaRecorder = null;
let recChunks     = [];
let recInterval   = null;
let recSeconds    = 0;

// EMA buffers — alpha = proportion of NEW position used each frame (0.82 = very responsive)
const EMA = 0.82; // blending factor toward new position; 0.18 = laggy, 0.82 = responsive
let sF=null, sL=null, sR=null;

function lerp(prev, cur) {
  if (!cur) return null;
  if (!prev || prev.length !== cur.length) return cur.map(p=>({...p}));
  return prev.map((p,i)=>{
    const c=cur[i]; if(!c) return p;
    // EMA: move prev toward cur by EMA each frame
    return { x:p.x+(c.x-p.x)*EMA, y:p.y+(c.y-p.y)*EMA, z:p.z+(c.z-p.z)*EMA };
  });
}

// ─── PARTICLE SYSTEM ──────────────────────────────────────
const THEMES = {
  mystic: {
    colors: ['#00e5ff','#ff00ff','#00ffff','#eb00ff'],
    size: ()=> 8 + Math.random()*10,
    life: ()=> 40 + Math.random()*30,
    speed: ()=>({ vx:(Math.random()-.5)*1, vy:-1.5-Math.random()*2 }),
    shape: 'rune', trail: true, sparkCount: 2
  },
  plasma: {
    colors: ['#8800ff','#00ffff','#ff0088','#ffffff'],
    size: ()=> 2 + Math.random()*4,
    life: ()=> 18 + Math.random()*10,
    speed: ()=>({ vx:(Math.random()-.5)*15, vy:(Math.random()-.5)*15 }),
    shape: 'lightning', trail: true, sparkCount: 12
  },
  hex: {
    colors: ['#00ff88','#00cc44','#00e5ff'],
    size: ()=> 6 + Math.random()*8,
    life: ()=> 35 + Math.random()*20,
    speed: ()=>({ vx:(Math.random()-.5)*2, vy:(Math.random()-.5)*2 }),
    shape: 'hexagon', trail: false, sparkCount: 2
  },
  dragon: {
    colors: ['#ff4400','#ff8800','#ffcc00','#ff2200','#ff6600'],
    size: ()=> 4 + Math.random()*8,
    life: ()=> 35 + Math.random()*30,
    speed: ()=>({ vx:(Math.random()-.5)*3, vy:-1-Math.random()*3 }),
    shape: 'flame', trail: true, sparkCount: 6
  },
  galaxy: {
    colors: ['#aa00ff','#00ccff','#ff00cc','#6600ff','#00ffcc','#ffffff'],
    size: ()=> 2 + Math.random()*4,
    life: ()=> 60 + Math.random()*50,
    speed: ()=>({ vx:(Math.random()-.5)*1.5, vy:(Math.random()-.5)*1.5 }),
    shape: 'star', trail: true, sparkCount: 10
  },
  ocean: {
    colors: ['#00aaff','#00ddff','#0055ff','#00ffee','#0088cc','#aaffff'],
    size: ()=> 3 + Math.random()*6,
    life: ()=> 55 + Math.random()*45,
    speed: ()=>({ vx:(Math.random()-.5)*2.5, vy:(Math.random()-.5)*.8 }),
    shape: 'wave', trail: false, sparkCount: 7
  }
};

let particles = [];

class Particle {
  constructor(x, y, theme) {
    const T = THEMES[theme];
    this.x  = x; this.y = y;
    const s = T.speed();
    this.vx = s.vx; this.vy = s.vy;
    this.ax = 0; this.ay = theme === 'earth' ? 0.02 : (theme==='ocean'?0.01:0);
    this.life    = T.life();
    this.maxLife = this.life;
    this.size    = T.size();
    this.color   = T.colors[Math.floor(Math.random()*T.colors.length)];
    this.shape   = T.shape;
    this.theme   = theme;
    this.angle   = Math.random()*Math.PI*2;
    this.spin    = (Math.random()-.5)*.2;
    this.rune    = ['✧','✦','⚝','✶','✷','✺','❂','⎈','⚚','☥','⛤','⟡'][Math.floor(Math.random()*12)];
  }

  update() {
    this.vx += this.ax; this.vy += this.ay;
    // slight drag
    this.vx *= 0.97; this.vy *= 0.97;
    this.x += this.vx; this.y += this.vy;
    this.angle += this.spin;
    this.life--;
  }

  draw(c) {
    const alpha = this.life / this.maxLife;
    const sz    = this.size * alpha;
    c.save();
    c.globalAlpha = alpha * 0.9;
    c.translate(this.x, this.y);
    c.rotate(this.angle);

    if (this.shape === 'star') {
      drawStar(c, 0, 0, sz*0.4, sz, 5, this.color);
    } else if (this.shape === 'rune') {
      c.font = `${sz}px monospace`;
      c.fillStyle = this.color;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = this.color;
      c.shadowBlur = sz/2;
      c.fillText(this.rune, 0, 0);
    } else if (this.shape === 'hexagon') {
      c.beginPath();
      for (let i=0; i<6; i++) {
        const a = (i/6)*Math.PI*2;
        i===0 ? c.moveTo(Math.cos(a)*sz, Math.sin(a)*sz) : c.lineTo(Math.cos(a)*sz, Math.sin(a)*sz);
      }
      c.closePath();
      c.strokeStyle = this.color;
      c.lineWidth = 1.5;
      c.stroke();
      if (this.life%12 < 3) {
        c.fillStyle = this.color;
        c.fill();
      }
    } else if (this.shape === 'lightning') {
      const segments = Math.floor(sz/2);
      c.beginPath(); c.moveTo(0,0);
      let cx=0, cy=0;
      for(let i=0; i<segments; i++){
        cx += (Math.random()-.5)*sz;
        cy += (Math.random()-.5)*sz;
        c.lineTo(cx, cy);
      }
      c.strokeStyle = this.color;
      c.lineWidth = 1.5;
      c.stroke();
    } else if (this.shape === 'flame') {
      const g = c.createRadialGradient(0,-sz*.3, sz*.1, 0, 0, sz);
      g.addColorStop(0,'#ffffff');
      g.addColorStop(0.4, this.color);
      g.addColorStop(1,'transparent');
      c.beginPath();
      c.ellipse(0, 0, sz*.5, sz, 0, 0, Math.PI*2);
      c.fillStyle = g;
      c.fill();
    } else if (this.shape === 'wave') {
      c.beginPath();
      c.arc(0, 0, sz, 0, Math.PI*2);
      c.strokeStyle = this.color;
      c.lineWidth = 1.5;
      c.stroke();
    } else {
      const g = c.createRadialGradient(0,0,0,0,0,sz);
      g.addColorStop(0,'#ffffff');
      g.addColorStop(0.5, this.color);
      g.addColorStop(1,'transparent');
      c.beginPath();
      c.arc(0, 0, sz, 0, Math.PI*2);
      c.fillStyle = g;
      c.fill();
    }
    c.restore();
  }
}

function drawStar(c, cx, cy, r1, r2, pts, color) {
  c.beginPath();
  for (let i=0;i<pts*2;i++) {
    const r   = i%2===0 ? r2 : r1;
    const ang = (i/(pts*2))*Math.PI*2 - Math.PI/2;
    i===0 ? c.moveTo(cx+Math.cos(ang)*r, cy+Math.sin(ang)*r)
          : c.lineTo(cx+Math.cos(ang)*r, cy+Math.sin(ang)*r);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

// Spawn particles at (x,y) in screen coords
function spawnParticles(x, y) {
  const T = THEMES[arTheme];
  for (let i=0; i<T.sparkCount; i++) {
    particles.push(new Particle(x, y, arTheme));
  }
}

// AR render loop (continuous, separate from holistic)
let arTrailBuf = { x:-1, y:-1 };
function arLoop() {
  if (arDrawOn && particles.length > 0) {
    // Fade existing content for persistent trail only when drawing
    arCtx.save();
    arCtx.globalAlpha = 0.06;
    arCtx.fillStyle = '#030509';
    arCtx.fillRect(0, 0, arCanvas.width, arCanvas.height);
    arCtx.restore();
  } else if (!arDrawOn && particles.length === 0) {
    // Clear canvas fully when draw mode is off and no particles remain
    arCtx.clearRect(0, 0, arCanvas.width, arCanvas.height);
  }

  // Update & draw particles
  arCtx.save();
  for (let i = particles.length-1; i>=0; i--) {
    particles[i].update();
    particles[i].draw(arCtx);
    if (particles[i].life <= 0) particles.splice(i,1);
  }
  arCtx.restore();

  requestAnimationFrame(arLoop);
}

// ─── PINCH DETECTION ──────────────────────────────────────
const PINCH_THRESHOLD = 0.06; // in normalized coords

function dist(a, b) {
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
}

function processHandForAR(hand) {
  if (!hand || !arDrawOn) return;
  const thumb = hand[4];  // thumb tip
  const index = hand[8];  // index finger tip
  if (!thumb || !index) return;

  const d = Math.sqrt((thumb.x-index.x)**2 + (thumb.y-index.y)**2);
  if (d < PINCH_THRESHOLD) {
    const w = arCanvas.width  || window.innerWidth;
    const h = arCanvas.height || window.innerHeight;
    // Both canvas and arCanvas have CSS scaleX(-1), so drawing x directly is matched to holistic x
    const sx = index.x * w;
    const sy = index.y * h;
    spawnParticles(sx, sy);
  }
}

// ─── MEDIAPIPE ────────────────────────────────────────────
const holistic = new Holistic({ locateFile: f =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${f}` });

holistic.setOptions({
  modelComplexity: 0, smoothLandmarks: true,
  enableSegmentation: false, refineFaceLandmarks: true,
  minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
});

holistic.onResults(results => {
  sF = lerp(sF, results.faceLandmarks);
  sL = lerp(sL, results.leftHandLandmarks);
  sR = lerp(sR, results.rightHandLandmarks);

  const anyActive = sF || sL || sR;
  statusPill.classList.toggle('active', !!anyActive);
  statusText.textContent = anyActive ? 'ACTIVE' : 'WAITING';

  setStatVal(faceEl,  !!(sF && faceOn));
  setStatVal(handLEl, !!(sL && handOn));
  setStatVal(handREl, !!(sR && handOn));

  // AR Drawing via pinch — evaluate for BOTH hands
  if (sL || results.leftHandLandmarks) processHandForAR(sL || results.leftHandLandmarks);
  if (sR || results.rightHandLandmarks) processHandForAR(sR || results.rightHandLandmarks);

  // Resize canvases
  [canvas, arCanvas].forEach(c => {
    if (c.width  !== video.videoWidth)  c.width  = video.videoWidth  || window.innerWidth;
    if (c.height !== video.videoHeight) c.height = video.videoHeight || window.innerHeight;
  });

  ctx.save();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.globalCompositeOperation = 'screen';

  if (sF && faceOn) {
    drawConnectors(ctx, sF, FACEMESH_TESSELATION,   {color:'rgba(0,255,120,.2)', lineWidth:.5});
    drawConnectors(ctx, sF, FACEMESH_FACE_OVAL,     {color:'#00ffaa', lineWidth:1.5});
    drawConnectors(ctx, sF, FACEMESH_LEFT_EYE,      {color:'#00ffaa', lineWidth:1.5});
    drawConnectors(ctx, sF, FACEMESH_RIGHT_EYE,     {color:'#00ffaa', lineWidth:1.5});
    drawConnectors(ctx, sF, FACEMESH_LEFT_EYEBROW,  {color:'#00ffaa', lineWidth:1.5});
    drawConnectors(ctx, sF, FACEMESH_RIGHT_EYEBROW, {color:'#00ffaa', lineWidth:1.5});
    drawConnectors(ctx, sF, FACEMESH_LEFT_IRIS,     {color:'#00e5ff', lineWidth:2});
    drawConnectors(ctx, sF, FACEMESH_RIGHT_IRIS,    {color:'#00e5ff', lineWidth:2});
    drawConnectors(ctx, sF, FACEMESH_LIPS,          {color:'#00ffaa', lineWidth:1.5});
  }
  if (handOn) {
    if (sL) {
      drawConnectors(ctx, sL, HAND_CONNECTIONS, {color:'#00ff88', lineWidth:3});
      drawLandmarks(ctx, sL, {color:'#00e5ff', lineWidth:0, radius:2.5});
    }
    if (sR) {
      drawConnectors(ctx, sR, HAND_CONNECTIONS, {color:'#00ff88', lineWidth:3});
      drawLandmarks(ctx, sR, {color:'#00e5ff', lineWidth:0, radius:2.5});
    }
  }
  ctx.restore();
});

function setStatVal(el, on) {
  el.textContent = on ? 'ON' : '——';
  el.classList.toggle('on', on);
}

// ─── MAIN TRACKING RENDER LOOP ────────────────────────────
let lastTime = -1;
function loop() {
  if (video.readyState >= 2 && video.currentTime !== lastTime) {
    lastTime = video.currentTime;
    holistic.send({image: video}).then(()=> requestAnimationFrame(loop));
    return;
  }
  requestAnimationFrame(loop);
}

// ─── CAMERA INIT ──────────────────────────────────────────
async function startCamera() {
  if (stream) stream.getTracks().forEach(t=>t.stop());
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width:{ideal:1280}, height:{ideal:720}, frameRate:{ideal:60,max:120} },
      audio: false
    });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      [canvas, arCanvas].forEach(c => {
        c.width  = video.videoWidth  || window.innerWidth;
        c.height = video.videoHeight || window.innerHeight;
      });
      video.play();
      overlay.classList.add('hidden');
      loop();
    };
  } catch(e) { statusText.textContent = 'CAM ERROR'; console.error(e); }
}

// ─── RECORDING ────────────────────────────────────────────
function formatTime(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

// Composite video for recording: merge video + ar canvas
function buildRecordingStream() {
  // Create an offscreen canvas that composites everything
  const offscreen = document.createElement('canvas');
  offscreen.width  = canvas.width;
  offscreen.height = canvas.height;
  const off = offscreen.getContext('2d');

  function drawFrame() {
    off.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    off.drawImage(canvas, 0, 0);
    off.drawImage(arCanvas, 0, 0);
    requestAnimationFrame(drawFrame);
  }
  drawFrame();
  return offscreen.captureStream(60);
}

function startRecording() {
  const recStream = buildRecordingStream();
  const mimeType = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4']
    .find(t => MediaRecorder.isTypeSupported(t)) || '';
  mediaRecorder = new MediaRecorder(recStream, mimeType ? {mimeType} : undefined);
  recChunks = [];
  mediaRecorder.ondataavailable = e => { if(e.data.size>0) recChunks.push(e.data); };
  mediaRecorder.onstop = saveRecording;
  mediaRecorder.start(100);
  recSeconds = 0; recTimer.textContent = '00:00';
  recIndicator.classList.remove('hidden');
  btnRec.classList.add('recording');
  btnRec.querySelector('span').textContent = 'STOP';
  recInterval = setInterval(()=>{ recSeconds++; recTimer.textContent = formatTime(recSeconds); }, 1000);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  clearInterval(recInterval);
  recIndicator.classList.add('hidden');
  btnRec.classList.remove('recording');
  btnRec.querySelector('span').textContent = 'REC';
}

function saveRecording() {
  const blob = new Blob(recChunks, {type: recChunks[0]?.type || 'video/webm'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `yuva-tracking-${Date.now()}.${blob.type.includes('mp4')?'mp4':'webm'}`;
  a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 5000);
}

// ─── CONTROLS ─────────────────────────────────────────────
btnFace.addEventListener('click', () => {
  faceOn = !faceOn;
  btnFace.classList.toggle('active', faceOn);
});
btnHand.addEventListener('click', () => {
  handOn = !handOn;
  btnHand.classList.toggle('active', handOn);
});
btnFlip.addEventListener('click', () => {
  // Stop recording first — flipping camera kills the stream the recorder depends on
  if (mediaRecorder && mediaRecorder.state !== 'inactive') stopRecording();
  facing = facing === 'user' ? 'environment' : 'user';
  const mirror = facing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
  video.style.transform    = mirror;
  canvas.style.transform   = mirror;
  arCanvas.style.transform = mirror;
  startCamera();
});
btnRec.addEventListener('click', () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') startRecording();
  else stopRecording();
});

// AR DRAW toggle
btnARDraw.addEventListener('click', () => {
  arDrawOn = !arDrawOn;
  btnARDraw.classList.toggle('draw-on', arDrawOn);
  pinchHint.classList.toggle('hidden', !arDrawOn);
  themeDrawer.classList.toggle('hidden', !arDrawOn);

  if (arDrawOn) {
    drawLabel.textContent = arTheme.toUpperCase();
    drawLabel.classList.add('draw');
  } else {
    drawLabel.textContent = '——';
    drawLabel.classList.remove('draw');
  }
});

// Theme selection
themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    themeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    arTheme = btn.dataset.theme;
    drawLabel.textContent = arTheme.toUpperCase();
  });
});

clearARBtn.addEventListener('click', () => {
  particles = [];
  arCtx.clearRect(0, 0, arCanvas.width, arCanvas.height);
});

// ─── BOOT ──────────────────────────────────────────────────
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('portrait').catch(()=>{});
}
startCamera();
arLoop(); // start AR particle loop independently
