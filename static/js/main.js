import * as THREE from 'three';

// ---- Three.js Immersive Background ----
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 2000;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i += 3) {
    posArray[i] = (Math.random() - 0.5) * 50;
    posArray[i+1] = (Math.random() - 0.5) * 30;
    posArray[i+2] = (Math.random() - 0.5) * 40;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({ size: 0.07, color: 0xffffff, transparent: true, opacity: 0.5 });
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Core object
const geometry = new THREE.IcosahedronGeometry(1.3, 0);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true, emissive: 0x111111 });
const wireframeObj = new THREE.Mesh(geometry, material);
scene.add(wireframeObj);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(1, 2, 3);
scene.add(dirLight);
const backLight = new THREE.PointLight(0x4466ff, 0.4);
backLight.position.set(-2, 1, -4);
scene.add(backLight);

let time = 0;
function animateBackground() {
    requestAnimationFrame(animateBackground);
    time += 0.005;
    particlesMesh.rotation.y = time * 0.05;
    particlesMesh.rotation.x = time * 0.02;
    wireframeObj.rotation.x = time * 0.2;
    wireframeObj.rotation.y = time * 0.3;
    camera.position.z = 15 + Math.sin(time * 0.2) * 0.2;
    renderer.render(scene, camera);
}
animateBackground();
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- GSAP Scroll Animations ----
gsap.registerPlugin(ScrollTrigger);
gsap.from('.hero h1', { duration: 1.2, y: 50, opacity: 0, ease: 'power3.out' });
gsap.from('.hero p', { duration: 1, y: 30, opacity: 0, delay: 0.3 });
gsap.from('.cta-button', { duration: 0.8, scale: 0.8, opacity: 0, delay: 0.6 });
gsap.utils.toArray('section').forEach(section => {
    gsap.from(section, {
        scrollTrigger: { trigger: section, start: 'top 80%', toggleActions: 'play none none reverse' },
        opacity: 0,
        y: 50,
        duration: 0.8
    });
});

// ---- API calls ----
const API_BASE = '';

async function loadPublicData() {
    try {
        const [works, models, writings, fonts] = await Promise.all([
            fetch('/api/works').then(r => r.json()),
            fetch('/api/models').then(r => r.json()),
            fetch('/api/writings').then(r => r.json()),
            fetch('/api/fonts').then(r => r.json())
        ]);
        renderWorks(works);
        renderModels(models);
        renderWritings(writings);
        renderFonts(fonts);
    } catch(e) { console.error(e); }
}

function renderWorks(works) {
    const grid = document.getElementById('work-grid');
    if(!grid) return;
    grid.innerHTML = works.map(w => `
        <div class="work-card">
            <div class="work-img"><img src="${w.image_url}" alt="${w.title}"></div>
            <div class="work-info"><h3>${w.title}</h3><p>${w.description}</p></div>
        </div>
    `).join('');
}
function renderModels(models) {
    const grid = document.getElementById('models-grid');
    if(!grid) return;
    grid.innerHTML = models.map(m => `
        <div class="model-card">
            <div class="model-viewer"><i class="fas ${m.icon || 'fa-cube'} fa-4x"></i></div>
            <div class="model-info"><h3>${m.title}</h3><p>${m.description}</p><a href="${m.model_url}" target="_blank" style="color:#aaa;">View Model</a></div>
        </div>
    `).join('');
}
function renderWritings(writings) {
    const grid = document.getElementById('writing-grid');
    if(!grid) return;
    grid.innerHTML = writings.map(w => `
        <div class="writing-card">
            <i class="fas ${w.icon || 'fa-pen-nib'} fa-2x"></i>
            <h3>${w.title}</h3>
            <p>${w.excerpt || w.content.substring(0,120)}...</p>
        </div>
    `).join('');
}
function renderFonts(fonts) {
    const cont = document.getElementById('fonts-showcase');
    if(!cont) return;
    cont.innerHTML = fonts.map(f => `
        <div class="font-card">
            <i class="fas ${f.icon || 'fa-font'} fa-3x"></i>
            <h3>${f.name}</h3>
            <p>${f.description}</p>
        </div>
    `).join('');
}

// ---- Admin Auth & Uploads ----
let adminToken = false; // using session cookie, but we just check if logged in via session
function checkAdminStatus() { /* not needed, session handled by cookie */ }

document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('admin-email').value;
    const pwd = document.getElementById('admin-password').value;
    const res = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd })
    });
    const data = await res.json();
    if(data.success) {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
    } else {
        document.getElementById('login-error').innerText = 'Invalid credentials';
    }
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await fetch('/admin/logout', { method: 'POST' });
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
});

// Work upload
document.getElementById('work-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch('/admin/works', { method: 'POST', body: formData });
    if(res.ok) { alert('Work uploaded!'); loadPublicData(); e.target.reset(); }
});
// Model upload
document.getElementById('model-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch('/admin/models', { method: 'POST', body: formData });
    if(res.ok) { alert('3D Model added!'); loadPublicData(); e.target.reset(); }
});
// Writing upload (JSON)
document.getElementById('writing-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        title: document.getElementById('writing-title').value,
        content: document.getElementById('writing-content').value,
        excerpt: document.getElementById('writing-excerpt').value,
        icon: document.getElementById('writing-icon').value
    };
    const res = await fetch('/admin/writings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if(res.ok) { alert('Writing added!'); loadPublicData(); e.target.reset(); }
});
// Font upload
document.getElementById('font-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch('/admin/fonts', { method: 'POST', body: formData });
    if(res.ok) { alert('Font added!'); loadPublicData(); e.target.reset(); }
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// Mobile menu
document.querySelector('.menu-btn')?.addEventListener('click', () => {
    const nav = document.querySelector('.nav-links');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
});

// Loader hide
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if(loader) loader.style.opacity = '0';
        setTimeout(() => loader?.remove(), 500);
    }, 800);
    loadPublicData();
});
