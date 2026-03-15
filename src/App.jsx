import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const WORLD_LOCATIONS = [
  { name: 'Park Miejski, PL', lat: 50.81, lon: 19.11 },
  { name: 'Central Park, USA', lat: 40.78, lon: -73.96 },
  { name: 'Hyde Park, UK', lat: 51.50, lon: -0.16 },
  { name: 'Ogród Saski, PL', lat: 52.24, lon: 21.00 }
];

const ANIMALS_MAMMALS = [
    { name: 'Lis', file: 'Fox.glb', color: 0xd35400 },
    { name: 'Kuna', file: 'kuna.glb', color: 0x8e44ad },
    { name: 'Wiewiórka', file: 'wiewiorka.glb', color: 0xe67e22 },
    { name: 'Nietoperz', file: 'Bat.glb', color: 0x2c3e50 },
    { name: 'Ryjówka', file: 'ryjowka.glb', color: 0x7f8c8d },
    { name: 'Gryzoń', file: 'gryzon.glb', color: 0x95a5a6 },
    { name: 'Fretka', file: 'Ferret.glb', color: 0xaa8866 },
    { name: 'Szczur drzewny', file: 'Woodrat.glb', color: 0x555555 }
];

const ANIMALS_BIRDS = [
    { name: 'Płomykówka', file: 'Barn Owl.glb', color: 0xffddaa },
    { name: 'Jer', file: 'Bird.glb', color: 0x888888 },
    { name: 'Ptak', file: 'bird1.glb', color: 0xaaaaaa },
    { name: 'Sójka', file: 'bluejay.glb', color: 0x2980b9 },
    { name: 'Jaskółka', file: 'Cliffswallow.glb', color: 0x334455 },
    { name: 'Puchacz', file: 'Great horned owl.glb', color: 0x5c4033 },
    { name: 'Koliber', file: 'hummingbird.glb', color: 0x2ecc71 },
    { name: 'Puszczyk', file: 'owl.glb', color: 0x5c4033 },
    { name: 'Kruk', file: 'raven.glb', color: 0x222222 },
    { name: 'Wrona', file: 'row.glb', color: 0x333333 },
    { name: 'Wróbel', file: 'sparrow.glb', color: 0xa0522d },
    { name: 'Błękitnik', file: 'Western bluebird.glb', color: 0x4444ff }
];

const ENV_MODELS = [
    'Fern.glb', 'Small Plant.glb', 'zoledzie.glb', 'Leaf.glb', 
    'Tree frog.glb', 'rzekotka.glb', 'mech.glb', 'detritus.glb', 
    'alga.glb', 'Park.glb', 'Big Tree.glb', 'Dead Trees.glb'
];

const getAnimalType = (name) => {
    if (['Gryzoń', 'Ryjówka', 'Szczur drzewny'].includes(name)) return 'MOUSE';
    if (['Lis', 'Kuna', 'Fretka'].includes(name)) return 'PREDATOR';
    if (name === 'Wiewiórka') return 'SQUIRREL';
    if (name === 'Rzekotka') return 'FROG';
    if (ANIMALS_BIRDS.find(b => b.name === name) || name === 'Nietoperz') return 'BIRD';
    return 'MAMMAL';
};

const EcosystemShader = {
  uniforms: { "tDiffuse": { value: null }, "time": { value: 0.0 }, "toxicity": { value: 0.0 }, "hypoxia": { value: 0.0 }, "stirIntensity": { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float toxicity; uniform float hypoxia; uniform float stirIntensity;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      uv.x += sin(uv.y * 30.0 + time * 15.0) * (0.003 * stirIntensity);
      float wave = sin(uv.y * 10.0 + time * 2.0) * (0.02 * toxicity);
      uv.x += wave;
      float shift = 0.01 * toxicity + (0.005 * stirIntensity);
      vec4 color = vec4(0.0);
      color.r = texture2D(tDiffuse, vec2(uv.x + shift, uv.y)).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, vec2(uv.x - shift, uv.y)).b;
      color.a = 1.0;
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = smoothstep(1.0 - (hypoxia * 0.5), 0.3, dist);
      color.rgb *= vignette;
      color.r += dist * hypoxia * 0.5;
      color.g += dist * toxicity * 0.3;
      gl_FragColor = color;
    }
  `
};

function createWoodTexture() {
    const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 1024; const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#5c4033"; ctx.fillRect(0, 0, 1024, 1024);
    for(let i=0; i<3000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(40, 25, 15, ${Math.random() * 0.6})` : `rgba(100, 70, 50, ${Math.random() * 0.4})`;
        ctx.fillRect(Math.random()*1024, Math.random()*1024, 2 + Math.random()*6, 40 + Math.random()*150);
    }
    return new THREE.CanvasTexture(canvas);
}

function createLeafTexture() {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext("2d");
    ctx.fillStyle = `rgba(80, 50, 30, ${Math.random() * 0.4})`; ctx.fillRect(0, 0, 512, 512);
    for(let i=0; i<1000; i++) {
        ctx.fillStyle = `rgba(${Math.floor(40 + Math.random()*40)}, ${Math.floor(20 + Math.random()*20)}, 10, ${Math.random() * 0.5})`;
        ctx.fillRect(Math.random()*512, Math.random()*512, 1 + Math.random()*3, 10 + Math.random()*40);
    }
    return new THREE.CanvasTexture(canvas);
}

// NOWA, OSTRA TEKSTURA NAPISU HD
function makeTextSprite(text, color) {
    const canvas = document.createElement('canvas'); 
    canvas.width = 512; // Zwiększona rozdzielczość by uniknąć rozmycia
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 56px "Courier New"'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; 
    ctx.strokeStyle = '#000'; 
    ctx.strokeText(text, 256, 64);
    ctx.fillStyle = color; 
    ctx.fillText(text, 256, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // Wyłączenie mipmap dla ostrości
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial); 
    sprite.scale.set(4.5, 1.125, 1); // Odpowiednie przeskalowanie
    return sprite;
}

// NOWY OKRĄGŁY DESZCZ
function createRoundRainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

function createProceduralAnimal(type, colorHex) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9 });
    if (type === 'BIRD') { 
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.4, 8, 16), mat); body.rotation.x = Math.PI / 2; group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), mat); head.position.set(0, 0.2, 0.35); group.add(head);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xf1c40f })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.2, 0.6); group.add(beak);
    } else if (type === 'PREDATOR' || type === 'MOUSE' || type === 'SQUIRREL' || type === 'MAMMAL') {
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 8, 16), mat); body.rotation.x = Math.PI / 2; group.add(body);
        const snout = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x222222 })); snout.rotation.x = Math.PI / 2; snout.position.set(0, 0.1, 0.6); group.add(snout);
    } else if (type === 'FROG') {
        const frogMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), frogMat); body.scale.set(1.2, 0.6, 1.1); group.add(body);
    }
    group.scale.set(0.8, 0.8, 0.8);
    return group;
}

export default function Dendrotelma3D() {
  const mountRef = useRef(null);
  const sceneGroups = useRef({ interact: null, visual: null, animals: null, intro: null, ecosystem: null }); 
  const modelsCache = useRef({}); 
  const introPlaced = useRef(false);
  
  // AUDIO REFS
  const bgmAudio = useRef(null);
  const menuAudio = useRef(null);
  const audioInitialized = useRef(false);

  const [gameState, setGameState] = useState('MENU'); 
  const [leaderboard, setLeaderboard] = useState(() => JSON.parse(localStorage.getItem('dendrotelma_scores')) || []);

  const [maxCapacity, setMaxCapacity] = useState(100); 
  const [water, setWater] = useState(60);
  const [oxygen, setOxygen] = useState(40);
  const [toxicity, setToxicity] = useState(0);
  const [detritus, setDetritus] = useState(0);
  
  const [day, setDay] = useState(1);
  const [cause, setCause] = useState('');
  const [score, setScore] = useState(0);
  const [algae, setAlgae] = useState(0);
  const [larvae, setLarvae] = useState(2);
  
  const [upgrades, setUpgrades] = useState({ moss: 0, fungi: 0, insects: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [binoculars, setBinoculars] = useState(false); 
  
  const [season, setSeason] = useState('Wiosna');
  const [gameTemp, setGameTemp] = useState(15);
  const [isRaining, setIsRaining] = useState(false);
  const [locationName, setLocationName] = useState('Wyszukiwanie...');
  const [cameraLogs, setCameraLogs] = useState([]);

  const engine = useRef({ 
      water, oxygen, toxicity, detritus, maxCapacity, algae, larvae, day, score, state: gameState,
      upgrades, stirring: false, stirIntensity: 0, leaves: [], visitors: [], isRaining, season, gameTemp
  });
  
  const binocRef = useRef(binoculars);

  useEffect(() => { binocRef.current = binoculars; }, [binoculars]);

  useEffect(() => {
      engine.current = { 
        ...engine.current, water, oxygen, toxicity, detritus, maxCapacity, algae, larvae, score, day, upgrades, state: gameState, isRaining, season, gameTemp
      };
  }, [water, oxygen, toxicity, detritus, maxCapacity, algae, larvae, score, day, upgrades, gameState, isRaining, season, gameTemp]);

  // INICJALIZACJA AUDIO
  useEffect(() => {
      bgmAudio.current = new Audio('/background.mp3');
      bgmAudio.current.loop = true;
      bgmAudio.current.volume = 0.4;

      menuAudio.current = new Audio('/menu.mp3');
      menuAudio.current.loop = true;
      menuAudio.current.volume = 0.4;

      const initAudio = () => {
          if (!audioInitialized.current) {
              menuAudio.current.play().catch(e => console.log("Zablokowano autoodtwarzanie"));
              audioInitialized.current = true;
          }
      };

      window.addEventListener('click', initAudio);

      return () => {
          window.removeEventListener('click', initAudio);
          if(bgmAudio.current) bgmAudio.current.pause();
          if(menuAudio.current) menuAudio.current.pause();
      };
  }, []);

  // PRZEŁĄCZANIE AUDIO ZALEŻNIE OD STANU GRY
  useEffect(() => {
      if (!bgmAudio.current || !menuAudio.current) return;
      
      if (gameState === 'PLAYING' || gameState === 'TRANSITION' || gameState === 'PAUSED') {
          menuAudio.current.pause();
          bgmAudio.current.play().catch(e=>e);
      } else {
          bgmAudio.current.pause();
          if(audioInitialized.current) menuAudio.current.play().catch(e=>e);
      }
  }, [gameState]);


  const addLog = (message, color = "#2ecc71") => {
      setCameraLogs(prev => [{ id: Date.now(), text: message, color }, ...prev].slice(0, 5));
  };

  const fetchWeather = () => {
    const loc = WORLD_LOCATIONS[Math.floor(Math.random() * WORLD_LOCATIONS.length)];
    setLocationName(loc.name);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current_weather=true`)
      .then(res => res.json())
      .then(data => {
        const wCode = data.current_weather.weathercode;
        setIsRaining((wCode >= 51 && wCode <= 69) || (wCode >= 80));
        setGameTemp(Math.round(data.current_weather.temperature));
      }).catch(() => { setIsRaining(false); setGameTemp(15); });
  };

  useEffect(() => {
      const loader = new GLTFLoader();
      const uniqueFiles = [...new Set(ENV_MODELS.concat(ANIMALS_BIRDS.map(b => b.file), ANIMALS_MAMMALS.map(m => m.file)))];

      uniqueFiles.forEach(file => {
          loader.load(
              `/models/${file}`, 
              (gltf) => {
                  const model = gltf.scene;
                  const box = new THREE.Box3().setFromObject(model);
                  const size = box.getSize(new THREE.Vector3()).length();
                  
                  let targetSize = 2.0; 
                  if (file === 'Fern.glb') targetSize = 4.5;
                  if (file === 'Small Plant.glb') targetSize = 3.5;
                  if (file === 'zoledzie.glb') targetSize = 0.8;
                  if (file === 'Leaf.glb') targetSize = 1.0;
                  if (file === 'mech.glb') targetSize = 2.5;
                  if (file === 'detritus.glb') targetSize = 1.5;
                  if (file === 'alga.glb') targetSize = 1.0;
                  
                  if (file === 'Tree frog.glb' || file === 'rzekotka.glb') targetSize = 1.5;
                  if (ANIMALS_BIRDS.find(b => b.file === file)) targetSize = 1.2;
                  if (['Fox.glb', 'kuna.glb', 'Ferret.glb'].includes(file)) targetSize = 2.8; 
                  if (['gryzon.glb', 'ryjowka.glb', 'Woodrat.glb', 'Bat.glb'].includes(file)) targetSize = 0.8; 
                  if (file === 'wiewiorka.glb') targetSize = 1.5;
                  
                  if (file === 'Park.glb') targetSize = 150.0;
                  if (file === 'Big Tree.glb') targetSize = 45.0;
                  if (file === 'Dead Trees.glb') targetSize = 40.0;

                  const scale = targetSize / (size || 1);
                  model.scale.setScalar(scale);

                  model.traverse((child) => { if (child.isMesh) { child.castShadow = true; } });
                  modelsCache.current[file] = { model: model, placed: false, originalScale: scale };
              },
              undefined,
              (err) => console.log(`Oczekuję na /models/${file}`)
          );
      });
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') return; 

    const gameTick = setInterval(() => {
      const state = engine.current;
      const seasonIndex = Math.floor(((state.day - 1) % 120) / 30);
      const seasons = ['Wiosna', 'Lato', 'Jesień', 'Zima'];
      const currentSeason = seasons[seasonIndex];
      setSeason(currentSeason);

      let tempTarget = 15;
      if(currentSeason === 'Lato') tempTarget = 30;
      if(currentSeason === 'Jesień') tempTarget = 8;
      if(currentSeason === 'Zima') tempTarget = -5;
      
      let newTemp = state.gameTemp + (tempTarget - state.gameTemp) * 0.1 + (Math.random() * 2 - 1);
      setGameTemp(newTemp);

      let rainChance = 0.1; let stopRainChance = 0.1;
      if(currentSeason === 'Lato') { rainChance = 0.02; stopRainChance = 0.3; }
      if(currentSeason === 'Jesień') { rainChance = 0.2; stopRainChance = 0.05; }
      if(currentSeason === 'Zima') { rainChance = 0.15; stopRainChance = 0.1; }
      
      if(state.isRaining && Math.random() < stopRainChance) setIsRaining(false);
      else if(!state.isRaining && Math.random() < rainChance) setIsRaining(true);

      let rainWaterBonus = (state.isRaining && currentSeason !== 'Zima') ? 3.0 : 0;
      let rainOxygenBonus = state.isRaining ? 1.0 : 0;
      
      let wMod = -1.0; 
      let oMod = (state.algae * 1.5) - (state.larvae * 1.0) - (state.leaves.length * 0.8);
      let tMod = (state.leaves.length * 1.2) - (state.larvae * 0.4); 

      wMod += state.upgrades.moss * 0.8; 
      tMod -= state.upgrades.fungi * 1.5; 
      oMod += state.upgrades.insects * 1.5; 

      if (currentSeason === 'Wiosna') oMod += 0.5;
      if (currentSeason === 'Lato') wMod -= 1.5; 
      if (currentSeason === 'Jesień') tMod += 1.0; 
      if (currentSeason === 'Zima') { wMod = 0; oMod -= 4.0; }

      const predators = state.visitors.filter(v => v.type === 'PREDATOR');
      const mice = state.visitors.filter(v => v.type === 'MOUSE');
      const squirrels = state.visitors.filter(v => v.type === 'SQUIRREL');

      if (mice.length > 0) {
          tMod -= 2; wMod -= 1;
      }

      predators.forEach(p => {
          const targetMouse = mice.find(m => m.timer > 0);
          if (targetMouse) {
               const dist = Math.hypot(p.x - targetMouse.x, p.z - targetMouse.z);
               if (dist < 3.0) {
                   targetMouse.timer = -1; 
                   addLog(`> ${p.name} ustrzelił gryzonia w dziupli!`, "#ff4444");
               }
          }
      });

      squirrels.forEach(s => {
           if (Math.random() < 0.2) {
                addLog(`> Wiewiórka zjadła żołędzia! Spada zgnilizna.`, "#ffaa00");
                tMod -= 4;
           }
      });

      if (Math.random() < 0.04) { 
          const eventType = Math.random();
          let visitorData = null;
          let vType, aData;
          const currentWaterY = -12 + (state.water / state.maxCapacity) * 18;
          let startX, startY, startZ, tX, tY, tZ;
          const angle = Math.random() * Math.PI * 2;

          if (eventType < 0.4) { 
              aData = ANIMALS_BIRDS[Math.floor(Math.random() * ANIMALS_BIRDS.length)];
              vType = 'BIRD';
              startX = Math.cos(angle) * 15; startZ = Math.sin(angle) * 15; startY = 30; 
              
              tX = (Math.random() - 0.5) * 6; tZ = (Math.random() - 0.5) * 6; 
              
              let targetHeight = currentWaterY + 0.3; 
              if (state.water < 20) {
                  targetHeight = -5; 
                  tX = Math.cos(angle) * 8; tZ = Math.sin(angle) * 8; 
              }

              tY = targetHeight;
              
              if (state.larvae > 0 && currentSeason !== 'Zima') {
                  setLarvae(l => Math.max(0, l - 1));
                  addLog(`> ${aData.name} pikuje i zjada larwę!`, "#ffaa00");
              } else if (currentSeason !== 'Zima') {
                  wMod -= 2; oMod += 5; engine.current.stirIntensity = 0.5;
                  addLog(`> ${aData.name} radośnie stąpa przy wodzie.`, "#00ffff");
              }
          } else if (eventType < 0.75 && currentSeason !== 'Zima') { 
              aData = ANIMALS_MAMMALS[Math.floor(Math.random() * ANIMALS_MAMMALS.length)];
              vType = getAnimalType(aData.name);
              startX = Math.cos(angle) * 12; startZ = Math.sin(angle) * 12; startY = 15; 
              
              if (vType === 'MOUSE') {
                  tX = Math.cos(angle) * 9; tZ = Math.sin(angle) * 9; tY = currentWaterY + 2; 
                  addLog(`> ${aData.name} wyjada resztki z kory.`, "#ffaa00");
              } else if (vType === 'SQUIRREL') {
                  tX = Math.cos(angle) * 8; tZ = Math.sin(angle) * 8; tY = currentWaterY + 3;
              } else { 
                  tX = Math.cos(angle) * 8; tZ = Math.sin(angle) * 8; tY = currentWaterY + 1;
                  addLog(`> ${aData.name} rozgląda się za zdobyczą.`, "#ff6666");
              }
          } else if (currentSeason === 'Lato' || currentSeason === 'Wiosna') { 
              if (state.toxicity < state.maxCapacity * 0.8) {
                  const frogs = ['Tree frog.glb', 'rzekotka.glb'];
                  const fFile = frogs[Math.floor(Math.random() * frogs.length)];
                  aData = { color: 0x2ecc71, name: 'Rzekotka', file: fFile };
                  vType = 'FROG';
                  startX = Math.cos(angle) * 10; startZ = Math.sin(angle) * 10; startY = currentWaterY + 4;
                  tX = Math.cos(angle) * 6; tZ = Math.sin(angle) * 6; tY = currentWaterY + 0.5;
                  addLog(`> Rzekotka wskakuje do dziupli.`, "#44ff44"); tMod -= 5;
              }
          }

          if (aData) {
              visitorData = { ...aData, type: vType, timer: 12, x: startX, y: startY, z: startZ, tx: tX, ty: tY, tz: tZ, action: 'ENTERING' };
              engine.current.visitors.push({ id: Date.now().toString(), ...visitorData });
          }
      }

      if (state.leaves.length > 0) setDetritus(prev => prev + state.leaves.length);

      const eatenLeaves = state.leaves.filter(l => l.userData.eaten);
      if (eatenLeaves.length > 0) {
          setDetritus(d => d + eatenLeaves.length * 8);
          state.leaves = state.leaves.filter(l => !l.userData.eaten); 
      }

      setOxygen(prev => Math.max(0, Math.min(state.maxCapacity, prev + oMod + rainOxygenBonus)));
      setToxicity(prev => Math.max(0, Math.min(state.maxCapacity, prev + tMod)));
      setWater(prev => Math.max(0, Math.min(state.maxCapacity, prev + wMod + rainWaterBonus)));
      setDay(d => d + 1);
      setScore(s => s + 10);

    }, 1000);
    return () => clearInterval(gameTick);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    let reason = '';
    if (water <= 0) reason = 'Dendrotelma wyschła na pieprz.';
    else if (oxygen <= 0 || isNaN(oxygen)) reason = 'Brak tlenu. Życie zamarło.';
    else if (toxicity >= maxCapacity) reason = 'Krytyczny poziom zgnilizny zatruł całą wodę.';

    if (reason) {
        setGameState('GAMEOVER'); setCause(reason); setBinoculars(false);
        const newScoreObj = { score, days: day, location: locationName, date: new Date().toLocaleDateString() };
        const newBoard = [...leaderboard, newScoreObj].sort((a, b) => b.score - a.score).slice(0, 5); 
        setLeaderboard(newBoard); localStorage.setItem('dendrotelma_scores', JSON.stringify(newBoard));
    }
  }, [water, oxygen, toxicity, gameState, day, score, locationName, leaderboard, maxCapacity]);

  const triggerStartSequence = () => {
      setGameState('TRANSITION');
      fetchWeather();
  };

  const feedLarvae = () => {
      if (detritus >= 10 && larvae > 0 && gameState === 'PLAYING') {
          setDetritus(d => d - 10);
          setToxicity(t => Math.max(0, t - 20)); 
          addLog("> Larwy nakarmione! Błyskawicznie trawią zgniliznę.", "#ffaa44");
      }
  };

  const buyAlgae = () => { if (water >= 20 && gameState === 'PLAYING') { setWater(w => w - 20); setAlgae(a => a + 1); } };
  const buyLarvae = () => { if (oxygen >= 30 && gameState === 'PLAYING') { setOxygen(o => o - 30); setLarvae(l => l + 1); } };
  const buyMoss = () => { if (detritus >= 80 && gameState === 'PLAYING') { setDetritus(d => d - 80); setUpgrades(u => ({...u, moss: u.moss + 1})); } };
  const buyFungi = () => { if (detritus >= 120 && gameState === 'PLAYING') { setDetritus(d => d - 120); setUpgrades(u => ({...u, fungi: u.fungi + 1})); } };
  const buyInsects = () => { if (detritus >= 200 && gameState === 'PLAYING') { setDetritus(d => d - 200); setUpgrades(u => ({...u, insects: u.insects + 1})); } };
  const buyCapacity = () => { if (detritus >= 250 && gameState === 'PLAYING') { setDetritus(d => d - 250); setMaxCapacity(m => m + 50); } };

  // --- THREE.JS ---
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; 
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    
    const bgTexture = new THREE.TextureLoader().load('/Background.png');
    bgTexture.colorSpace = THREE.SRGBColorSpace;

    const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.set(0, 40, 80); 
    camera.lookAt(0, 0, 0); 

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1; 
    controls.maxDistance = 25; 
    controls.maxPolarAngle = Math.PI / 2 - 0.1; 
    controls.target.set(0, 0, 0); 
    controls.enabled = false; 

    const composer = new EffectComposer(renderer); 
    composer.addPass(new RenderPass(scene, camera));
    
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), 0.03, 0.0, 0.9));
    const ecosystemPass = new ShaderPass(EcosystemShader); composer.addPass(ecosystemPass);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8)); 
    const dirLight = new THREE.DirectionalLight(0xeeddcc, 1.5); dirLight.position.set(5, 50, 20); scene.add(dirLight);
    
    const deepLight = new THREE.PointLight(0x22ff88, 10, 40); deepLight.position.set(0, -5, 0); scene.add(deepLight);

    const introGroup = new THREE.Group(); scene.add(introGroup); sceneGroups.current.intro = introGroup;
    const ecosystemGroup = new THREE.Group(); scene.add(ecosystemGroup); sceneGroups.current.ecosystem = ecosystemGroup;

    const woodMat = new THREE.MeshStandardMaterial({ map: createWoodTexture(), side: THREE.DoubleSide, roughness: 0.9, color: 0xcccccc });
    const trunkGeo = new THREE.CylinderGeometry(10, 12, 40, 32, 16, true);
    const posAttribute = trunkGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
        let x = posAttribute.getX(i), y = posAttribute.getY(i), z = posAttribute.getZ(i);
        let r = Math.sqrt(x*x + z*z) + Math.sin(Math.atan2(z, x) * 10) * 0.8 + Math.cos(y * 0.5) * 0.5;
        posAttribute.setX(i, Math.cos(Math.atan2(z, x)) * r); posAttribute.setZ(i, Math.sin(Math.atan2(z, x)) * r);
    }
    trunkGeo.computeVertexNormals(); ecosystemGroup.add(new THREE.Mesh(trunkGeo, woodMat));

    const waterGeo = new THREE.PlaneGeometry(26, 26, 64, 64);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x114422, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.6 });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat); waterMesh.rotation.x = -Math.PI / 2; ecosystemGroup.add(waterMesh);
    
    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({color: 0x051105}));
    bottom.rotation.x = -Math.PI / 2; bottom.position.y = -15; ecosystemGroup.add(bottom);

    const rainGeo = new THREE.BufferGeometry(); const rainCount = 800; const rainPos = new Float32Array(rainCount * 3);
    for(let i=0; i<rainCount*3; i++) { rainPos[i*3] = (Math.random() - 0.5)*20; rainPos[i*3+1] = Math.random()*20; rainPos[i*3+2] = (Math.random() - 0.5)*20; }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    
    const rainMat = new THREE.PointsMaterial({ 
        color: 0xaaaaaa, 
        size: 0.4, 
        transparent: true, 
        opacity: 0.5,
        map: createRoundRainTexture(),
        depthWrite: false, 
        blending: THREE.AdditiveBlending 
    }); 
    const rain = new THREE.Points(rainGeo, rainMat); ecosystemGroup.add(rain);

    const interactGroup = new THREE.Group(); ecosystemGroup.add(interactGroup); sceneGroups.current.interact = interactGroup;
    const visualGroup = new THREE.Group(); ecosystemGroup.add(visualGroup); sceneGroups.current.visual = visualGroup;
    const animalsGroup = new THREE.Group(); ecosystemGroup.add(animalsGroup); sceneGroups.current.animals = animalsGroup;

    const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
    let isDragging = false; let lastMouse = new THREE.Vector2();

    const onPointerDown = (event) => {
        if (engine.current.state !== 'PLAYING') return;
        if (binocRef.current) return; 

        isDragging = true;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        lastMouse.copy(mouse); raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObjects(interactGroup.children, true); 
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while(obj.parent && obj.parent !== interactGroup) { obj = obj.parent; }
            if (obj.parent === interactGroup) {
                interactGroup.remove(obj);
                engine.current.leaves = engine.current.leaves.filter(l => l.uuid !== obj.uuid);
                setToxicity(t => Math.max(0, t - 5)); setScore(s => s + 50); setDetritus(d => d + 10);
            }
        }
    };

    const onPointerMove = (event) => {
        if (engine.current.state !== 'PLAYING') return;
        if (binocRef.current) return; 

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        if (isDragging) {
            const dist = mouse.distanceTo(lastMouse);
            if (dist > 0.005) {
                engine.current.stirIntensity = Math.min(1.0, engine.current.stirIntensity + dist * 8); engine.current.stirring = true;
                setOxygen(o => Math.min(engine.current.maxCapacity, o + dist * 35)); 
                if (engine.current.season !== 'Zima') setWater(w => Math.max(0, w - dist * 1.5));
            }
            lastMouse.copy(mouse);
        }
    };
    const onPointerUp = () => { isDragging = false; engine.current.stirring = false; };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);

    let animationId; const clock = new THREE.Clock(); let leafSpawnTimer = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta(); const time = clock.getElapsedTime(); const state = engine.current;

      if (!introPlaced.current) {
          if (modelsCache.current['Park.glb'] && !modelsCache.current['Park.glb'].placed) {
              const pk = modelsCache.current['Park.glb'].model.clone();
              pk.position.set(0, -10, 0); 
              introGroup.add(pk);
              modelsCache.current['Park.glb'].placed = true;
          }
          if (modelsCache.current['Big Tree.glb'] && !modelsCache.current['Big Tree.glb'].placed) {
              const bt = modelsCache.current['Big Tree.glb'].model.clone();
              bt.position.set(-20, -5, -15); 
              introGroup.add(bt);
              modelsCache.current['Big Tree.glb'].placed = true;
          }
          if (modelsCache.current['Dead Trees.glb'] && !modelsCache.current['Dead Trees.glb'].placed) {
              const dt = modelsCache.current['Dead Trees.glb'].model.clone();
              dt.position.set(25, -10, -20); 
              introGroup.add(dt);
              modelsCache.current['Dead Trees.glb'].placed = true;
          }

          const setupFlora = (name, count, targetY, radiusOffset) => {
              if (modelsCache.current[name] && !modelsCache.current[name].placed) {
                  for(let i=0; i<count; i++) { 
                      const mesh = modelsCache.current[name].model.clone();
                      const a = Math.random() * Math.PI * 2;
                      mesh.position.set(Math.cos(a)*(9 + radiusOffset), targetY + Math.random()*8, Math.sin(a)*(9 + radiusOffset));
                      mesh.lookAt(0, mesh.position.y, 0); mesh.name = 'envFlora';
                      visualGroup.add(mesh);
                  }
                  modelsCache.current[name].placed = true;
              }
          };

          setupFlora('Fern.glb', 12, -4, 0.5);
          setupFlora('Small Plant.glb', 15, -8, 0);
          setupFlora('zoledzie.glb', 8, -12, -1);
          setupFlora('mech.glb', 15, -2, 0.5);
          
          if(modelsCache.current['Park.glb']?.placed) {
              introPlaced.current = true;
          }
      }

      ecosystemPass.uniforms.time.value = time; ecosystemPass.uniforms.toxicity.value = state.toxicity / state.maxCapacity;
      ecosystemPass.uniforms.hypoxia.value = Math.max(0, (40 - state.oxygen) / 40); ecosystemPass.uniforms.stirIntensity.value = state.stirIntensity;

      // KAMERA MENU & TRANSITION
      if (state.state === 'MENU' || state.state === 'LEADERBOARD' || state.state === 'GAMEOVER' || state.state === 'CREDITS') {
          controls.enabled = false;
          introGroup.visible = true;
          ecosystemGroup.visible = false;
          
          scene.background = bgTexture; 
          scene.fog = null; 
          
          camera.position.x = Math.sin(time * 0.1) * 70;
          camera.position.z = Math.cos(time * 0.1) * 70; 
          camera.position.y = 40 + Math.sin(time * 0.2) * 5;
          camera.lookAt(0, 5, 0); 

      } else if (state.state === 'TRANSITION') {
          controls.enabled = false;
          introGroup.visible = true;
          ecosystemGroup.visible = true; 
          
          scene.background = new THREE.Color(0x0a110a); 
          scene.fog = new THREE.FogExp2(0x0a110a, 0.015); 
          
          const targetPos = new THREE.Vector3(0, 8, 6); 
          camera.position.lerp(targetPos, 0.035);
          
          const targetLook = new THREE.Vector3(0, waterMesh.position.y, 0);
          const currentLook = new THREE.Vector3(0, 0, 0).lerp(targetLook, 1 - (camera.position.distanceTo(targetPos)/60));
          camera.lookAt(currentLook);

          const dist = camera.position.distanceTo(targetPos);
          if (dist > 25.0) {
              ecosystemGroup.visible = false; 
          } else {
              ecosystemGroup.visible = true;
          }

          if (dist < 1.0) {
              state.state = 'PLAYING_INIT'; 
              setTimeout(() => {
                  setMaxCapacity(100); setWater(60); setOxygen(40); setToxicity(0); setDetritus(0); setScore(0); setDay(1); setAlgae(0); setLarvae(2); setUpgrades({moss: 0, fungi: 0, insects: 0}); setCameraLogs([]);
                  if (sceneGroups.current.interact) { engine.current.leaves.forEach(l => sceneGroups.current.interact.remove(l)); engine.current.leaves = []; }
                  if (sceneGroups.current.animals) { [...sceneGroups.current.animals.children].forEach(c => sceneGroups.current.animals.remove(c)); engine.current.visitors = []; }
                  
                  setGameState('PLAYING');
                  addLog("> System połączony. Zapis włączony.", "#8fdf8f");
              }, 100);
          }
      } else if (state.state === 'PLAYING' || state.state === 'PAUSED') {
          scene.background = new THREE.Color(0x0a110a); 
          scene.fog = new THREE.FogExp2(0x0a110a, 0.015);
          
          if (binocRef.current) {
              controls.enabled = true;
              controls.target.set(0, waterMesh.position.y, 0);
              controls.update();
          } else {
              controls.enabled = false;
              const autoX = Math.sin(time * 0.1) * 6;
              const autoZ = Math.cos(time * 0.1) * 6;
              camera.position.lerp(new THREE.Vector3(autoX, 8, autoZ), 0.05);
              camera.lookAt(0, waterMesh.position.y - 1, 0);
          }

          introGroup.visible = false;
          ecosystemGroup.visible = true;

          if (state.season === 'Zima') { waterMat.color.lerp(new THREE.Color(0xaaddff), 0.02); waterMat.roughness = 0.8;
          } else { const toxColor = new THREE.Color().setHSL(0.35 - (Math.min(state.maxCapacity * 0.8, state.toxicity)/state.maxCapacity), 0.8, 0.2); waterMat.color.lerp(toxColor, 0.05); waterMat.roughness = 0.1; }

          const waveSpeed = state.season === 'Zima' ? 0.1 : 1.0; 
          const positions = waterGeo.attributes.position;
          for (let i = 0; i < positions.count; i++) {
              const x = positions.getX(i); const y = positions.getY(i);
              positions.setZ(i, Math.sin(x*1.0 + time*2*waveSpeed)*0.2 + Math.cos(y*1.0 + time*1.5*waveSpeed)*0.2 + Math.sin(x*8 + time*15)*state.stirIntensity*0.4);
          }
          positions.needsUpdate = true; waterGeo.computeVertexNormals();

          if (state.state === 'PLAYING') {
              if (!state.stirring) state.stirIntensity = Math.max(0, state.stirIntensity - delta * 0.8);
              const targetWaterY = -12 + (state.water / state.maxCapacity) * 18; waterMesh.position.y += (targetWaterY - waterMesh.position.y) * 0.05;

              rain.visible = state.isRaining;
              if (state.isRaining) {
                  const isSnow = state.season === 'Zima'; 
                  const rArr = rainGeo.attributes.position.array;
                  for(let i=0; i<rainCount; i++) {
                      // SPOWOLNIONY DESZCZ
                      rArr[i*3 + 1] -= delta * (isSnow ? 4 : 12);
                      if(isSnow) rArr[i*3] += Math.sin(time*2 + i)*0.03; 
                      if(rArr[i*3 + 1] < waterMesh.position.y) rArr[i*3 + 1] = 20;
                  }
                  rainGeo.attributes.position.needsUpdate = true;
              }

              leafSpawnTimer -= delta;
              const maxLeaves = state.season === 'Jesień' ? 12 : (state.season === 'Zima' ? 0 : 6);
              if (leafSpawnTimer <= 0 && state.leaves.length < maxLeaves) {
                  leafSpawnTimer = state.season === 'Jesień' ? 1 + Math.random()*2 : 3 + Math.random()*5;
                  
                  let leaf;
                  if (modelsCache.current['Leaf.glb']) {
                      leaf = new THREE.Group();
                      leaf.add(modelsCache.current['Leaf.glb'].model.clone());
                      leaf.userData = { is3D: true };
                  } else {
                      leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshStandardMaterial({ map: createLeafTexture(), roughness: 0.6, side: THREE.DoubleSide, transparent: true }));
                      leaf.userData = { is3D: false };
                  }
                  
                  const a = Math.random() * Math.PI * 2; const r = Math.random() * 6;
                  leaf.position.set(Math.cos(a)*r, 15, Math.sin(a)*r); leaf.rotation.set(Math.random(), Math.random(), Math.random());
                  leaf.userData.eaten = false; interactGroup.add(leaf); state.leaves.push(leaf);
              }

              interactGroup.children.forEach(leaf => {
                  if (leaf.position.y > waterMesh.position.y) { leaf.position.y -= delta * 5; leaf.rotation.x += delta * 2;
                  } else { 
                      leaf.position.y = waterMesh.position.y + 0.1; 
                      leaf.position.x += Math.sin(time + leaf.id) * 0.005; 
                      if(!leaf.userData.is3D) leaf.material.color.lerp(new THREE.Color(0x221100), 0.005); 
                  }
              });

              state.visitors.forEach((v, idx) => {
                  v.timer -= delta;
                  v.x += (v.tx - v.x) * delta * 2.0;
                  v.y += (v.ty - v.y) * delta * 2.0;
                  v.z += (v.tz - v.z) * delta * 2.0;

                  let animGroup = animalsGroup.children.find(c => c.name === v.id);
                  
                  if (!animGroup && v.timer > 0) {
                      if (v.file && modelsCache.current[v.file]) {
                          animGroup = new THREE.Group();
                          animGroup.add(modelsCache.current[v.file].model.clone());
                      } else {
                          animGroup = createProceduralAnimal(v.type, v.color);
                      }
                      
                      animGroup.name = v.id;
                      const label = makeTextSprite(v.name, '#fff');
                      label.position.y = 1.5; 
                      animGroup.add(label);

                      animGroup.position.set(v.x, v.y, v.z);
                      animalsGroup.add(animGroup);
                  } else if (animGroup && v.timer > 0) {
                      animGroup.position.set(v.x, v.y, v.z);
                      const label = animGroup.children.find(c => c.isSprite);
                      if (label) label.lookAt(camera.position); 

                      if (v.type === 'BIRD') {
                          animGroup.lookAt(camera.position.x, animGroup.position.y, camera.position.z);
                          if (Math.abs(v.y - v.ty) < 1.0) { 
                              animGroup.position.y += Math.abs(Math.sin(time * 8)) * 0.15;
                              if (Math.random() < 0.02) { v.tx = (Math.random() - 0.5)*6; v.tz = (Math.random() - 0.5)*6; }
                          }
                          const modelScene = animGroup.children[0];
                          if (modelScene && !modelScene.isSprite) {
                              modelScene.rotation.z = Math.sin(time * 15) * 0.05;
                          }
                      } else if (v.type === 'MOUSE') {
                          animGroup.lookAt(v.tx, v.y, v.tz);
                          animGroup.position.y += Math.abs(Math.sin(time * 15)) * 0.1;
                          if (Math.random() < 0.02) {
                               const a = Math.random() * Math.PI * 2;
                               v.tx = Math.cos(a) * 8; v.tz = Math.sin(a) * 8;
                          }
                      } else if (v.type === 'PREDATOR') {
                          animGroup.lookAt(v.tx, v.y, v.tz);
                      } else if (v.type === 'SQUIRREL') {
                          animGroup.lookAt(v.tx, v.y, v.tz);
                          animGroup.position.y += Math.abs(Math.sin(time * 12)) * 0.3; 
                          if (Math.random() < 0.02) {
                               const a = Math.random() * Math.PI * 2;
                               v.tx = Math.cos(a) * 8; v.tz = Math.sin(a) * 8;
                          }
                      } else {
                          animGroup.lookAt(0, v.y, 0);
                      }
                  } else if (animGroup && v.timer <= 0) {
                      animalsGroup.remove(animGroup); state.visitors.splice(idx, 1);
                  }
              });

              while(visualGroup.children.filter(c=>c.name==='algae').length < state.algae) {
                  let a;
                  if (modelsCache.current['alga.glb']) {
                      a = new THREE.Group();
                      a.add(modelsCache.current['alga.glb'].model.clone());
                  } else {
                      a = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x11aa11, emissiveIntensity: 0.15 }));
                  }
                  a.name = 'algae'; 
                  const label = makeTextSprite('🌿 Glon', '#44ff44'); label.position.y = 0.7; a.add(label);
                  a.userData = { offset: Math.random() * 10, radius: 1 + Math.random()*7 }; visualGroup.add(a);
              }

              const targetMoss = state.upgrades.moss;
              while(visualGroup.children.filter(c=>c.name==='moss_upgrade').length < targetMoss) {
                  let m;
                  if (modelsCache.current['mech.glb']) {
                      m = modelsCache.current['mech.glb'].model.clone();
                  } else {
                      m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({color: 0x228822}));
                  }
                  m.name = 'moss_upgrade';
                  const ang = Math.random() * Math.PI * 2;
                  m.position.set(Math.cos(ang)*9, -4 + Math.random()*10, Math.sin(ang)*9);
                  m.lookAt(0, m.position.y, 0); visualGroup.add(m);
              }

              const targetFungi = state.upgrades.fungi;
              while(visualGroup.children.filter(c=>c.name==='fungi_upgrade').length < targetFungi) {
                  let f;
                  if (modelsCache.current['detritus.glb']) {
                      f = modelsCache.current['detritus.glb'].model.clone();
                  } else {
                      f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({color: 0x88aa44}));
                  }
                  f.name = 'fungi_upgrade';
                  const ang = Math.random() * Math.PI * 2;
                  f.position.set(Math.cos(ang)*9.5, -5 + Math.random()*15, Math.sin(ang)*9.5);
                  f.lookAt(0, f.position.y, 0); 
                  f.rotation.x += Math.PI / 2;
                  visualGroup.add(f);
              }

              while(visualGroup.children.filter(c=>c.name==='larva').length < state.larvae) {
                  const lGroup = new THREE.Group(); lGroup.name = 'larva';
                  const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xdd6600, emissiveIntensity: 0.05 }));
                  l.rotation.x = Math.PI/2; lGroup.add(l); 
                  const label = makeTextSprite('🐛 Larwa', '#ffaa44'); label.position.y = 0.7; lGroup.add(label);
                  lGroup.userData = { tx: 0, tz: 0, timer: 0, targetLeaf: null }; visualGroup.add(lGroup);
              }
              
              visualGroup.children.forEach(obj => {
                  if (obj.name === 'algae') { 
                      obj.position.set(Math.sin(time*0.3 + obj.userData.offset)*obj.userData.radius, waterMesh.position.y - 0.5 + Math.sin(time*2 + obj.userData.offset)*0.2, Math.cos(time*0.3 + obj.userData.offset)*obj.userData.radius);
                      const label = obj.children.find(c=>c.isSprite); if(label) label.lookAt(camera.position);
                  } else if (obj.name === 'larva') {
                      obj.userData.timer -= delta;
                  if(obj.userData.timer <= 0) { 
                          let nearest = null; let minDist = 999;
                          state.leaves.forEach(l => { if (!l.userData.eaten) { let d = obj.position.distanceTo(l.position); if (d < minDist) { minDist = d; nearest = l; } } });
                          
                          if (nearest && minDist < 8) { obj.userData.targetLeaf = nearest; obj.userData.tx = nearest.position.x; obj.userData.tz = nearest.position.z;
                          } else { obj.userData.targetLeaf = null; obj.userData.tx = (Math.random()-0.5)*14; obj.userData.tz = (Math.random()-0.5)*14; }
                          obj.userData.timer = 1+Math.random()*2; 
                      }
                      
                      obj.position.x += (obj.userData.tx - obj.position.x) * 0.04; obj.position.z += (obj.userData.tz - obj.position.z) * 0.04;
                      obj.position.y = waterMesh.position.y - 1.5;
                      
                      const mesh = obj.children[0]; mesh.lookAt(obj.userData.tx, mesh.position.y, obj.userData.tz);
                      const label = obj.children.find(c=>c.isSprite); if(label) label.lookAt(camera.position);

                      if (obj.userData.targetLeaf && obj.position.distanceTo(obj.userData.targetLeaf.position) < 2.0 && !obj.userData.targetLeaf.userData.eaten) {
                          obj.userData.targetLeaf.scale.subScalar(delta * 0.15); 
                          mesh.rotation.z = Math.sin(time * 30) * 0.3; 
                          
                          if (obj.userData.targetLeaf.scale.x <= 0.1) {
                              obj.userData.targetLeaf.userData.eaten = true;
                              obj.userData.targetLeaf.visible = false;
                              obj.userData.targetLeaf = null;
                          }
                      }
                  }
              });
          }
      }
      composer.render();
    };
    animate();

    const onResize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); composer.setSize(mount.clientWidth, mount.clientHeight); };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationId); window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if(mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement); 
      controls.dispose(); renderer.dispose();
    };
  }, []);

  const barStyle = (val, color) => ({ width: `${Math.min(100, (val / maxCapacity) * 100)}%`, height: '10px', backgroundColor: color, transition: 'width 0.2s linear', boxShadow: `0 0 8px ${color}` });
  const btnStyle = { background: 'rgba(0,0,0,0.8)', border: '1px solid #2ecc71', color: '#2ecc71', padding: '10px 20px', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', display: 'block', width: '100%', marginBottom: '10px', pointerEvents: 'auto', fontFamily: "inherit", letterSpacing: '1px', transition: '0.2s' };
  const panelStyle = { background: 'rgba(0, 10, 0, 0.75)', padding: '15px', border: '1px solid #1a4a1a', pointerEvents: 'auto', fontFamily: "'Courier New', monospace", backdropFilter: 'blur(2px)' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', overflow: 'hidden', fontFamily: "'Consolas', 'Courier New', monospace", color: '#44ff44' }}>
      
      {(gameState === 'MENU' || gameState === 'LEADERBOARD' || gameState === 'GAMEOVER' || gameState === 'CREDITS') && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: "url('/Background.png')", backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      )}

      {/* THREE.js Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 1, touchAction: 'none' }} />

      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
                <button onClick={() => setBinoculars(!binoculars)} style={{...btnStyle, width: 'auto', padding: '10px 30px', borderColor: binoculars ? '#f1c40f' : '#3498db', color: binoculars ? '#f1c40f' : '#3498db' }}>
                    {binoculars ? '🔭 LORNETKA [WŁĄCZONA] - ZABLOKOWANO MIESZANIE' : '🔭 LORNETKA [WYŁĄCZONA] - SWOBODNA KAMERA I MIESZANIE'}
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '-30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
                    
                    <div style={{...panelStyle, borderLeft: '3px solid #2ecc71'}}>
                        <h1 style={{ margin: 0, color: '#2ecc71', letterSpacing: '2px', fontSize: '18px', textShadow: '0 0 5px #2ecc71' }}>[ DENDROTELMA_OS ]</h1>
                        <div style={{ margin: '10px 0', fontSize: '12px', color: '#88cc88' }}>
                            <div>WIEK: <span style={{color: '#fff'}}>{day} DNI</span></div>
                            <div>PUNKTY: <span style={{color: '#f1c40f'}}>{score}</span></div>
                            <div>SEZON: <span style={{color: season==='Zima'?'#3498db':season==='Lato'?'#f1c40f':season==='Jesień'?'#e67e22':'#2ecc71'}}>{season.toUpperCase()}</span></div>
                        </div>
                        
                        <div style={{ marginTop: '10px', fontSize: '11px', color: '#aaa', borderTop: '1px solid #1a4a1a', paddingTop: '10px' }}>
                            <div>GEO: {locationName.toUpperCase()}</div>
                            <div>TEMP: {Math.round(gameTemp)}°C | STAT: {isRaining ? (season==='Zima'?'ŚNIEG':'DESZCZ') : 'SUCHO'}</div>
                        </div>
                        <button onClick={() => setGameState('PAUSED')} style={{...btnStyle, padding: '5px', marginTop: '15px', fontSize: '10px', marginBottom: 0, borderColor: '#f1c40f', color: '#f1c40f'}}>⏸ PAUZA</button>
                    </div>

                    <div style={{...panelStyle, borderLeft: '3px solid #8fdf8f'}}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#8fdf8f' }}>CAM_LINK // LOGI</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {cameraLogs.length === 0 ? <span style={{fontSize: '10px', color: '#2a5a2a'}}>&gt; Oczekiwanie na ruch...</span> : cameraLogs.map(log => (
                                <div key={log.id} style={{ fontSize: '10px', color: log.color, borderLeft: `1px solid ${log.color}`, paddingLeft: '5px' }}>{log.text}</div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '280px' }}>
                    
                    <div style={{...panelStyle, borderRight: '3px solid #3498db'}}>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '10px', marginBottom: '3px', color: water<30?'#ff4444':'#aaa' }}>H2O ({Math.round(water)}/{maxCapacity})</div>
                            <div style={{ background: '#051005', height: '10px', border: '1px solid #1a4a1a' }}><div style={barStyle(water, '#3498db')} /></div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '10px', marginBottom: '3px', color: oxygen<30?'#ff4444':'#aaa' }}>O2 ({Math.round(oxygen)}/{maxCapacity})</div>
                            <div style={{ background: '#051005', height: '10px', border: '1px solid #1a4a1a' }}><div style={barStyle(oxygen, '#2ecc71')} /></div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', marginBottom: '3px', color: toxicity>maxCapacity*0.8?'#ff4444':'#aaa' }}>TOX ({Math.round(toxicity)}/{maxCapacity}) {toxicity>maxCapacity*0.8&&'!!'}</div>
                            <div style={{ background: '#051005', height: '10px', border: '1px solid #1a4a1a' }}><div style={barStyle(toxicity, toxicity > maxCapacity * 0.8 ? '#ff0000' : '#e74c3c')} /></div>
                        </div>
                    </div>

                    <div style={{...panelStyle, borderRight: '3px solid #ffaa44'}}>
                        <h3 style={{ margin: 0, fontSize: '12px', color: '#ffaa44' }}>MIKRO-ZARZĄDZANIE (LARWY)</h3>
                        <div style={{ fontSize: '10px', color: '#ccc', margin: '8px 0' }}>
                            POPULACJA: <strong style={{fontSize: '12px', color: '#fff'}}>{larvae}</strong><br/>
                            STATUS: {larvae === 0 ? <span style={{color: '#ff4444'}}>Wyginięcie (Zjedzone)</span> : (toxicity > maxCapacity * 0.8 ? <span style={{color: '#ff4444'}}>Zagrożone</span> : <span style={{color: '#2ecc71'}}>Aktywnie Żerują</span>)}
                        </div>
                        <button onClick={feedLarvae} style={detritus >= 10 && larvae > 0 ? {...btnStyle, borderColor: '#ffaa44', color: '#ffaa44', marginBottom: 0} : {...btnStyle, opacity: 0.2, borderColor: '#ffaa44', color: '#ffaa44', marginBottom: 0}}>
                            [ ZAKARM DETRYTUSEM (-10D) ]
                        </button>
                    </div>
                    
                    <div style={{...panelStyle, borderRight: '3px solid #e67e22', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '12px', color: '#e67e22' }}>AUTOMATYZACJA</h3>
                            <div onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} style={{ position: 'relative' }}>
                                <button style={{ background: 'transparent', border: '1px solid #e67e22', color: '#e67e22', width: '20px', height: '20px', fontSize: '10px', cursor: 'help', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>?</button>
                                {showTooltip && (
                                    <div style={{ position: 'absolute', top: '-110px', right: '0', background: 'rgba(0,10,0,0.95)', border: '1px solid #e67e22', padding: '10px', fontSize: '10px', width: '220px', zIndex: 100, color: '#aaa' }}>
                                        <strong style={{color: '#f1c40f'}}>DETRYTUS [D]</strong>: Martwa materia. Klikaj w liście lub czekaj aż zjedzą je larwy.<br/><br/>
                                        <strong style={{color: '#2ecc71'}}>GLONY</strong>: H2O -&gt; O2<br/>
                                        <strong style={{color: '#e74c3c'}}>LARWY</strong>: O2 -&gt; Usuwa TOX/Liście
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ fontSize: '10px', color: '#fff', marginBottom: '10px' }}>DETRYTUS: <strong style={{fontSize:'14px', color:'#f1c40f'}}>{detritus}</strong> D</div>
                        
                        <button onClick={buyCapacity} style={detritus >= 250 ? {...btnStyle, borderColor: '#f1c40f', color: '#f1c40f'} : {...btnStyle, opacity: 0.2, borderColor: '#f1c40f', color: '#f1c40f'}}>
                            [POJEMNOŚĆ +50] : 250D
                        </button>
                        <button onClick={buyMoss} style={detritus >= 80 ? btnStyle : {...btnStyle, opacity: 0.2}}>
                            [MCHY: {upgrades.moss}] : 80D
                        </button>
                        <button onClick={buyFungi} style={detritus >= 120 ? btnStyle : {...btnStyle, opacity: 0.2}}>
                            [GRZYBY: {upgrades.fungi}] : 120D
                        </button>
                        <button onClick={buyInsects} style={detritus >= 200 ? btnStyle : {...btnStyle, opacity: 0.2, marginBottom: 0}}>
                            [OCHOTKI: {upgrades.insects}] : 200D
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <button style={water >= 20 ? {...btnStyle, width: '200px', borderColor: '#3498db', color: '#3498db'} : {...btnStyle, width: '200px', opacity: 0.3, borderColor: '#3498db', color: '#3498db'}} onClick={buyAlgae}>
                    + DODAJ GLON (20 H2O)
                </button>
                <button style={oxygen >= 30 ? {...btnStyle, width: '200px', borderColor: '#e74c3c', color: '#e74c3c'} : {...btnStyle, width: '200px', opacity: 0.3, borderColor: '#e74c3c', color: '#e74c3c'}} onClick={buyLarvae}>
                    + DODAJ LARWĘ (30 O2)
                </button>
            </div>
        </div>
      )}

      {gameState !== 'PLAYING' && gameState !== 'TRANSITION' && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'transparent', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(0, 15, 5, 0.95)', padding: '40px', border: '2px solid #2ecc71', width: '380px', textAlign: 'center', boxShadow: '0 0 30px rgba(46, 204, 113, 0.4)', borderRadius: '8px' }}>
                {gameState === 'MENU' && (
                    <>
                        <h1 style={{ color: '#2ecc71', fontSize: '32px', margin: '0 0 5px 0', letterSpacing: '4px', textShadow: '0 0 10px #2ecc71' }}>DENDROTELMA</h1>
                        <p style={{ color: '#88cc88', marginBottom: '40px', fontSize: '12px', letterSpacing: '2px' }}>SYMULATOR EKOSYSTEMU V3.0</p>
                        <button style={{...btnStyle, padding: '15px 20px', fontSize: '14px'}} onClick={triggerStartSequence}>[ WEJDŹ DO DZIUPLI ]</button>
                        <button style={{...btnStyle, borderColor: '#555', color: '#aaa'}} onClick={() => setGameState('LEADERBOARD')}>[ BAZA WYNIKÓW ]</button>
                        <button style={{...btnStyle, borderColor: '#e67e22', color: '#e67e22'}} onClick={() => setGameState('CREDITS')}>[ TWÓRCY ]</button>
                    </>
                )}
                {gameState === 'CREDITS' && (
                    <>
                        <h2 style={{ color: '#e67e22', fontSize: '28px', marginBottom: '20px', letterSpacing: '2px' }}>TWÓRCY</h2>
                        <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '30px', lineHeight: '1.6', background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '5px' }}>
                            <p>Tutaj wkrótce pojawią się informacje o autorach projektu oraz podziękowania.</p>
                        </div>
                        <button style={btnStyle} onClick={() => setGameState('MENU')}>[ POWRÓT ]</button>
                    </>
                )}
                {gameState === 'PAUSED' && (
                    <>
                        <h2 style={{ color: '#f1c40f', fontSize: '24px', marginBottom: '30px', letterSpacing: '2px' }}>SYSTEM WSTRZYMANY</h2>
                        <button style={btnStyle} onClick={() => setGameState('PLAYING')}>[ WZNÓW ]</button>
                        <button style={{...btnStyle, borderColor: '#e74c3c', color: '#e74c3c'}} onClick={() => setGameState('MENU')}>[ PRZERWIJ ]</button>
                    </>
                )}
                {gameState === 'GAMEOVER' && (
                    <>
                        <h2 style={{ color: '#e74c3c', fontSize: '24px', margin: '0 0 10px 0', letterSpacing: '2px' }}>AWARIA SYSTEMU</h2>
                        <p style={{ fontSize: '12px', color: '#ffaaaa', marginBottom: '20px' }}>{cause}</p>
                        <div style={{ border: '1px dotted #e74c3c', padding: '15px', marginBottom: '25px', color: '#fff' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>CZAS TRWANIA: {day} DNI</p>
                            <p style={{ margin: 0, color: '#f1c40f', fontSize: '16px' }}>WYNIK KOŃCOWY: {score}</p>
                        </div>
                        <button style={btnStyle} onClick={triggerStartSequence}>[ RESTART ]</button>
                        <button style={{...btnStyle, borderColor: '#555', color: '#aaa'}} onClick={() => setGameState('LEADERBOARD')}>[ BAZA WYNIKÓW ]</button>
                    </>
                )}
                {gameState === 'LEADERBOARD' && (
                    <>
                        <h2 style={{ color: '#3498db', fontSize: '20px', marginBottom: '20px', letterSpacing: '2px' }}>NAJLEPSZE ZAPISY</h2>
                        {leaderboard.length === 0 ? <p style={{ color: '#555', marginBottom: '30px', fontSize: '12px' }}>Brak danych.</p> : (
                            <div style={{ textAlign: 'left', marginBottom: '25px', maxHeight: '200px', overflowY: 'auto' }}>
                                {leaderboard.map((entry, idx) => (
                                    <div key={idx} style={{ padding: '8px', marginBottom: '5px', borderBottom: '1px solid #1a4a1a', fontSize: '10px', background: 'rgba(0,0,0,0.5)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: idx===0?'#f1c40f':'#2ecc71', fontWeight: 'bold' }}>
                                            <span>#{idx + 1} PKT: {entry.score}</span><span style={{color: '#555'}}>{entry.date}</span>
                                        </div>
                                        <div style={{ color: '#888', marginTop: '3px' }}>DNI: {entry.days} | LOC: {entry.location.split(',')[0].toUpperCase()}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button style={btnStyle} onClick={() => setGameState('MENU')}>[ POWRÓT ]</button>
                    </>
                )}
            </div>
        </div>
      )}

      {gameState === 'TRANSITION' && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 30, color: '#fff', fontSize: '14px', letterSpacing: '3px', background: 'rgba(0,0,0,0.8)', padding: '15px 30px', border: '1px solid #fff' }}>
              ZBLIŻANIE OPTYKI...
          </div>
      )}
    </div>
  );
} 
