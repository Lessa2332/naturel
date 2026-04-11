import * as THREE from 'three';
import jsQR from 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';

// ---------- КОНФІГУРАЦІЯ ----------
const FLOWERS = [
  { id: 1, name: 'Шафран Гейфелів', img: 'flower_1.png' }, { id: 2, name: 'Нарцис', img: 'flower_2.png' },
  { id: 3, name: 'Тюльпан', img: 'flower_3.png' }, { id: 4, name: 'Горицвіт', img: 'flower_4.png' },
  { id: 5, name: 'Півники', img: 'flower_5.png' }, { id: 6, name: 'Сон-трава', img: 'flower_6.png' },
  { id: 7, name: 'Дзвоники', img: 'flower_7.png' }, { id: 8, name: 'Тирлич', img: 'flower_8.png' },
  { id: 9, name: 'Айстра', img: 'flower_9.png' }, { id: 10, name: 'Фіалка', img: 'flower_10.png' },
  { id: 11, name: 'Підсніжник', img: 'flower_11.png' }, { id: 12, name: 'Черевички', img: 'flower_12.png' },
  { id: 13, name: 'Лілія', img: 'flower_13.png' }, { id: 14, name: 'Едельвейс', img: 'flower_14.png' },
  { id: 15, name: 'Червона рута', img: 'flower_15.png' }
];
const QR_MAP = {
  "SMARTLESSA_FLOWER_1":1,"SMARTLESSA_FLOWER_2":2,"SMARTLESSA_FLOWER_3":3,"SMARTLESSA_FLOWER_4":4,
  "SMARTLESSA_FLOWER_5":5,"SMARTLESSA_FLOWER_6":6,"SMARTLESSA_FLOWER_7":7,"SMARTLESSA_FLOWER_8":8,
  "SMARTLESSA_FLOWER_9":9,"SMARTLESSA_FLOWER_10":10,"SMARTLESSA_FLOWER_11":11,"SMARTLESSA_FLOWER_12":12
};
let foundFlowers = [];
let wreathFlowers = [];
let deviceId = null;
let supabase = null;

// Supabase налаштування (опціонально)
const USE_SUPABASE = false; // зміни на true, якщо налаштував
const SUPABASE_URL = 'https://твій-проект.supabase.co';
const SUPABASE_ANON_KEY = 'твій-аннон-ключ';

if (USE_SUPABASE) {
  import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.js').then(async ({ createClient }) => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error } = await supabase.auth.signInAnonymously();
    if (!error && user) deviceId = user.id;
    await loadFromCloud();
    updateUI();
  });
} else {
  loadFromLocal();
  updateUI();
}

// Функції роботи з даними
function loadFromLocal() {
  const stored = localStorage.getItem('smartlessa_found');
  foundFlowers = stored ? JSON.parse(stored) : [];
  const wreath = localStorage.getItem('smartlessa_wreath');
  wreathFlowers = wreath ? JSON.parse(wreath) : [];
}
function saveToLocal() {
  localStorage.setItem('smartlessa_found', JSON.stringify(foundFlowers));
  localStorage.setItem('smartlessa_wreath', JSON.stringify(wreathFlowers));
}
async function loadFromCloud() {
  if (!supabase) return;
  const { data, error } = await supabase.from('users').select('found, wreath').eq('id', deviceId).single();
  if (data) {
    foundFlowers = data.found || [];
    wreathFlowers = data.wreath || [];
  } else {
    foundFlowers = [];
    wreathFlowers = [];
  }
  updateUI();
}
async function saveToCloud() {
  if (!supabase) return;
  await supabase.from('users').upsert({ id: deviceId, found: foundFlowers, wreath: wreathFlowers });
  const { data } = await supabase.from('users').select('id, found').order('found', { ascending: false }).limit(10);
  if (data) {
    const leaderDiv = document.getElementById('leaderboard');
    leaderDiv.innerHTML = '<span>🏆 Лідерборд (топ-10)</span><br>' + data.map((u,i)=>`${i+1}. ${u.id.slice(0,6)} — ${u.found.length} квітів`).join('<br>');
  }
}

function addFlower(flowerId) {
  if (!foundFlowers.includes(flowerId)) {
    foundFlowers.push(flowerId);
    if (USE_SUPABASE) saveToCloud(); else saveToLocal();
    updateUI();
    const flower = FLOWERS.find(f => f.id === flowerId);
    showPopup(`🌼 ${flower.name} знайдено!`, 2500);
    playSound();
    if (navigator.vibrate) navigator.vibrate(50);
    const herbItem = document.querySelector(`.herb-item[data-id='${flowerId}']`);
    if (herbItem) herbItem.classList.add('found');
  }
}

function updateUI() {
  document.getElementById('flowerCounter').textContent = `${foundFlowers.length}/12`;
  const grid = document.getElementById('herbariumGrid');
  grid.innerHTML = '';
  FLOWERS.forEach(f => {
    const div = document.createElement('div');
    div.className = `herb-item ${foundFlowers.includes(f.id) ? 'found' : ''}`;
    div.setAttribute('data-id', f.id);
    div.innerHTML = `<img src="${f.img}" onerror="this.src='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23c9a23d%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2255%22%20text-anchor%3D%22middle%22%20fill%3D%22black%22%3E${f.name[0]}%3C%2Ftext%3E%3C%2Fsvg%3E'"><span>${f.name.split(' ')[0]}</span>`;
    grid.appendChild(div);
  });
  updateWreath3D();
}

// Three.js сцена та вінок
const renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '15';
renderer.domElement.style.pointerEvents = 'none';
document.querySelector('.ar-viewport').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera3D.position.z = 5;
const wreathGroup = new THREE.Group();
scene.add(wreathGroup);

function updateWreath3D() {
  while(wreathGroup.children.length) wreathGroup.remove(wreathGroup.children[0]);
  const count = wreathFlowers.length;
  if (count === 0) return;
  wreathFlowers.forEach((id, i) => {
    const flower = FLOWERS.find(f => f.id === id);
    if (!flower) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c9a23d';
    ctx.fillRect(0,0,128,128);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Inter';
    ctx.fillText(flower.name[0], 50, 70);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.8;
    sprite.position.set(Math.cos(angle) * radius, Math.sin(angle) * 0.4, 0);
    sprite.scale.set(0.5, 0.5, 1);
    wreathGroup.add(sprite);
  });
}

function animate3D() {
  requestAnimationFrame(animate3D);
  renderer.render(scene, camera3D);
}
animate3D();

// Функції UI
function showPopup(msg, duration=2000) {
  const popup = document.getElementById('flowerNamePopup');
  document.getElementById('popupText').textContent = msg;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), duration);
}
function playSound() {
  const audio = document.getElementById('addSound');
  audio.play().catch(e=>console.log('audio play blocked'));
}
function showInfo(msg) {
  const toast = document.getElementById('infoToast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3000);
}
function showError(msg) {
  const toast = document.getElementById('errorToast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 4000);
}

// AR та MediaPipe
const video = document.getElementById('videoElement');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');
let frameCount = 0;
let faceMesh = null;

async function startAR() {
  const faceMeshLib = await import('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
  const cameraLib = await import('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
  faceMesh = new faceMeshLib.FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });
  faceMesh.setOptions({ refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
  faceMesh.onResults(onResults);
  const camera = new cameraLib.Camera(video, {
    onFrame: async () => {
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        await faceMesh.send({ image: video });
      }
    },
    width: 640, height: 480
  });
  camera.start();
}

function onResults(results) {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  
  frameCount++;
  if (frameCount % 10 === 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);
    if (code && QR_MAP[code.data]) {
      addFlower(QR_MAP[code.data]);
    }
  }
  
  if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
    const lm = results.multiFaceLandmarks[0];
    const centerX = (lm[234].x + lm[454].x) / 2;
    const centerY = (lm[10].y + lm[168].y) / 2 - 0.02;
    wreathGroup.position.set((centerX - 0.5) * 5, -(centerY - 0.5) * 5, -lm[1].z * 5);
    wreathGroup.rotation.z = Math.atan2(lm[454].y - lm[234].y, lm[454].x - lm[234].x);
  }
  ctx.restore();
}

// Ініціалізація UI елементів
const scroll = document.getElementById('flowerScroll');
FLOWERS.forEach(f => {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.innerHTML = `<img src="${f.img}" onerror="this.src='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22%23c9a23d%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2265%22%20text-anchor%3D%22middle%22%20fill%3D%22black%22%20font-size%3D%2240%22%3E${f.name[0]}%3C%2Ftext%3E%3C%2Fsvg%3E'">`;
  card.onclick = () => {
    if (!wreathFlowers.includes(f.id)) {
      wreathFlowers.push(f.id);
      if (USE_SUPABASE) saveToCloud(); else saveToLocal();
      updateWreath3D();
      showPopup(`🌺 ${f.name} додано до вінка`, 1500);
      playSound();
    } else {
      showPopup(`🌸 ${f.name} вже у вінку`, 1000);
    }
  };
  scroll.appendChild(card);
});

document.getElementById('resetWreathBtn').onclick = () => {
  wreathFlowers = [];
  if (USE_SUPABASE) saveToCloud(); else saveToLocal();
  updateWreath3D();
  showInfo('Вінок очищено');
};
document.getElementById('captureBtn').onclick = () => {
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvas.width; finalCanvas.height = canvas.height;
  const fCtx = finalCanvas.getContext('2d');
  fCtx.drawImage(canvas, 0, 0);
  fCtx.drawImage(renderer.domElement, 0, 0);
  const link = document.createElement('a');
  link.download = `lessa-${Date.now()}.png`;
  link.href = finalCanvas.toDataURL('image/png');
  link.click();
};
document.getElementById('shareBtn').onclick = async () => {
  document.getElementById('captureBtn').click();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Мій гербарій', text: `Я знайшов ${foundFlowers.length} квітів!` });
    } catch(e) {}
  }
};
document.getElementById('toggleHerbarium').onclick = () => document.getElementById('herbariumPanel').classList.add('show');
document.getElementById('closeHerbarium').onclick = () => document.getElementById('herbariumPanel').classList.remove('show');
document.getElementById('useHerbariumBtn').onclick = () => {
  if (foundFlowers.length === 0) { showError('Спочатку знайди квіти через QR!'); return; }
  wreathFlowers = [...foundFlowers];
  if (USE_SUPABASE) saveToCloud(); else saveToLocal();
  updateWreath3D();
  document.getElementById('herbariumPanel').classList.remove('show');
  showInfo(`Вінок зібрано з ${wreathFlowers.length} квітів!`);
};
document.getElementById('resetProgressBtn').onclick = () => {
  if (confirm('Скинути весь прогрес? Всі знайдені квіти зникнуть.')) {
    foundFlowers = [];
    wreathFlowers = [];
    if (USE_SUPABASE) saveToCloud(); else saveToLocal();
    updateUI();
    updateWreath3D();
    showInfo('Прогрес скинуто');
  }
};

// Старт камери
document.getElementById('startBtn').onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    video.srcObject = stream;
    await new Promise(r => video.onloadedmetadata = r);
    document.getElementById('welcome').classList.add('hidden');
    startAR();
  } catch (err) {
    showError('Помилка доступу до камери. Перевір дозволи.');
    console.error(err);
  }
};

window.addEventListener('resize', () => {
  camera3D.aspect = window.innerWidth / window.innerHeight;
  camera3D.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
