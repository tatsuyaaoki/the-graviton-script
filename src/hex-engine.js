/**
 * Module: Hex Disintegration Engine
 * Description: Manages the WebGL canvas, Three.js InstancedMesh generation,
 * custom shaders, and the html2canvas viewport capturing mechanic.
 * Updated: Implemented Predictive Texture Caching & Downscaling for CPU optimization.
 */

// Debug Logger
const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname.includes('webflow.io');
const devLog = (...args) => { if (IS_DEV) console.log(...args); };

export const HEX_CONFIG = {
    HEX_DURATION: 0.5,
    HEX_DELAY_CASCADE: 0.4,
    HEX_JITTER: 0.0
};

let hexScene, hexCamera, hexRenderer, hexMesh, hexMaterial;
let currentHexQuantity = getResponsiveHexQuantity();
let _hexRenderActive = false;

// --- NEW: Global Texture Cache ---
export let cachedTexture = null;

export async function prefetchViewportTexture() {
    if (cachedTexture) return; // Prevent double-fetching if user hovers multiple times
    devLog('[GRV:HEX] Prefetching viewport texture on hover...');
    cachedTexture = await getViewportTexture();
}
// ---------------------------------

function getResponsiveHexQuantity() {
    const w = window.innerWidth;
    if (w > 1023) return 14;
    if (w > 767) return 8;
    return 6; // Mobile fallback
}

function _hexRenderLoop() {
    if (hexRenderer && hexScene && hexCamera) {
        hexRenderer.render(hexScene, hexCamera);
    }
}

function startHexRender() {
    if (_hexRenderActive) return;
    _hexRenderActive = true;
    gsap.ticker.add(_hexRenderLoop); // Bind to GSAP's central requestAnimationFrame ticker
}

function stopHexRender() {
    gsap.ticker.remove(_hexRenderLoop);
    _hexRenderActive = false;
}

export function initHexEngine(canvas) {
    if (!canvas) return;
    const cw = window.innerWidth;
    const ch = window.innerHeight;

    hexScene = new THREE.Scene();
    hexCamera = new THREE.OrthographicCamera(0, cw, ch, 0, -1000, 1000);
    hexCamera.position.z = 10;

    hexRenderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
    });
    hexRenderer.setSize(cw, ch);

    buildHexGrid();
    hexRenderer.render(hexScene, hexCamera);
    devLog('[GRV:HEX] initHexEngine complete');
}

function buildHexGrid() {
    const cw = window.innerWidth;
    const ch = window.innerHeight;

    if (hexMesh) {
        hexScene.remove(hexMesh);
        hexMesh.geometry.dispose();
        if (hexMesh.material) hexMesh.material.dispose();
    }

    const hexWidth = cw / currentHexQuantity;
    const s = hexWidth / Math.sqrt(3);
    const hexHeight = 2 * s;
    const verticalSpacing = 0.75 * hexHeight;
    const sampleSize = hexWidth * 3;
    const uvDiameter = hexWidth * 3;
    const tileUVRadius = (uvDiameter / 2) / cw;
    const innerUVRadius = (hexWidth * 1.0) / cw;

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(7 * 3);
    positions.set([0, 0, 0]);
    const angles = [
        Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6,
        (7 * Math.PI) / 6, (3 * Math.PI) / 2, (11 * Math.PI) / 6
    ];
    for (let i = 0; i < 6; i++) {
        positions[(i + 1) * 3] = s * Math.cos(angles[i]);
        positions[(i + 1) * 3 + 1] = s * Math.sin(angles[i]);
        positions[(i + 1) * 3 + 2] = 0;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1]);

    hexMaterial = new THREE.ShaderMaterial({
        uniforms: {
            map: { value: null },
            containerSize: { value: new THREE.Vector2(cw, ch) },
            uInnerRadius: { value: innerUVRadius },
            uOuterRadius: { value: tileUVRadius },
            uTime: { value: 0 },
            uDuration: { value: HEX_CONFIG.HEX_DURATION },
            uGlobalAlpha: { value: 1.0 },
            uNextColor: { value: new THREE.Color('#000000') }
        },
        vertexShader: `
            attribute vec2 instanceTargetOffset;
            attribute vec2 instanceUVCenter;
            attribute float instanceDelay;
            varying vec2 vUv;
            varying vec2 vCenterUV;
            varying float vProgress;
            uniform vec2 containerSize;
            uniform float uTime;
            uniform float uDuration;

            void main() {
                vec4 worldPos4 = instanceMatrix * vec4(position, 1.0);
                float t = clamp((uTime - instanceDelay) / uDuration, 0.0, 1.0);
                vProgress = t;
                float eased = t * t * t;
                vec2 uvOffset = (instanceTargetOffset * eased) / containerSize;
                vec2 normPos = worldPos4.xy / containerSize;
                vUv = normPos + uvOffset;
                vCenterUV = instanceUVCenter;
                gl_Position = projectionMatrix * modelViewMatrix * worldPos4;
            }
        `,
        fragmentShader: `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vCenterUV;
            varying float vProgress;
            uniform sampler2D map;
            uniform float uInnerRadius;
            uniform float uOuterRadius;
            uniform float uGlobalAlpha;
            uniform vec3 uNextColor;
            uniform vec2 containerSize;

            void main() {
                vec4 baseColor = texture2D(map, vUv);
                if (baseColor.a < 0.01) { discard; }
                vec2 aspect = vec2(1.0, containerSize.y / containerSize.x);
                float dist = distance(vUv * aspect, vCenterUV * aspect);
                float t = smoothstep(uInnerRadius, uOuterRadius, dist);
                vec3 finalColor = mix(baseColor.rgb, uNextColor, t);
                float tileAlpha = 1.0 - (vProgress * vProgress);
                gl_FragColor = vec4(finalColor, baseColor.a * tileAlpha * uGlobalAlpha);
            }
        `,
        transparent: true
    });

    const rows = Math.ceil(ch / verticalSpacing) + 1;
    const cols = Math.ceil(cw / hexWidth) + 1;
    const count = rows * cols;

    hexMesh = new THREE.InstancedMesh(geom, hexMaterial, count);

    const offsets = new Float32Array(count * 2);
    const centers = new Float32Array(count * 2);
    const delays = new Float32Array(count);
    const dummy = new THREE.Object3D();
    const containerCenter = new THREE.Vector2(cw / 2, ch / 2);
    const maxDist = containerCenter.length();

    let idx = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const ox = (r % 2) ? hexWidth / 2 : 0;
            const x = c * hexWidth + ox;
            const y = r * verticalSpacing;

            dummy.position.set(x, y, 0);
            dummy.updateMatrix();
            hexMesh.setMatrixAt(idx, dummy.matrix);

            centers[idx * 2] = x / cw;
            centers[idx * 2 + 1] = y / ch;

            const cellPos = new THREE.Vector2(x, y);
            let dir = cellPos.clone().sub(containerCenter);
            const d = dir.length();
            if (d === 0) dir.set(1, 0); else dir.normalize();

            offsets[idx * 2] = -dir.x * sampleSize;
            offsets[idx * 2 + 1] = -dir.y * sampleSize;

            const distRatio = d / maxDist;
            delays[idx] = (distRatio * HEX_CONFIG.HEX_DELAY_CASCADE) + (Math.random() * HEX_CONFIG.HEX_JITTER);
            idx++;
        }
    }

    hexMesh.geometry.setAttribute('instanceTargetOffset', new THREE.InstancedBufferAttribute(offsets, 2));
    hexMesh.geometry.setAttribute('instanceUVCenter', new THREE.InstancedBufferAttribute(centers, 2));
    hexMesh.geometry.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(delays, 1));
    hexScene.add(hexMesh);
}

export function handleHexResize() {
    if (!hexRenderer) return;
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    hexRenderer.setSize(cw, ch);
    hexCamera.right = cw;
    hexCamera.top = ch;
    hexCamera.updateProjectionMatrix();
    const newQty = getResponsiveHexQuantity();
    if (newQty !== currentHexQuantity) {
        currentHexQuantity = newQty;
        buildHexGrid();
    } else if (hexMaterial) {
        hexMaterial.uniforms.containerSize.value.set(cw, ch);
    }
}

async function getViewportTexture() {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const sx = Math.round(window.scrollX);
    const sy = Math.round(window.scrollY);

    // PERFORMANCE TWEAK: Downscale texture resolution to 0.5 to prevent Intel Mac lagging
    const captured = await html2canvas(document.body, {
        backgroundColor: null,
        scale: 0.5, 
        useCORS: true,
        windowWidth: cw,
        windowHeight: ch,
        ignoreElements: (el) => el.id === 'hexCanvas' || el.classList.contains('wf-hud')
    });

    const viewport = document.createElement('canvas');
    viewport.width = cw;
    viewport.height = ch;

    // Explicit 9-arg crop to extract precise viewport limits mapping
    viewport.getContext('2d').drawImage(captured, sx, sy, cw, ch, 0, 0, cw, ch);

    const tex = new THREE.CanvasTexture(viewport);
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
}

export async function playHexTransition(canvas, nextBgColor, swapDOMCallback) {
    // Use the cached texture if available (from hover trigger), otherwise generate on the spot
    hexMaterial.uniforms.map.value = cachedTexture || await getViewportTexture();
    
    hexMaterial.uniforms.uNextColor.value.set(nextBgColor);
    hexMaterial.uniforms.uTime.value = 0;
    hexMaterial.uniforms.uGlobalAlpha.value = 1.0;

    gsap.set(canvas, { opacity: 1 });
    startHexRender();

    if (typeof swapDOMCallback === 'function') swapDOMCallback();

    const totalDuration = HEX_CONFIG.HEX_DURATION + HEX_CONFIG.HEX_DELAY_CASCADE + HEX_CONFIG.HEX_JITTER + 0.1;

    await gsap.to(hexMaterial.uniforms.uTime, {
        value: totalDuration,
        duration: totalDuration,
        ease: 'none'
    });

    await gsap.to(hexMaterial.uniforms.uGlobalAlpha, { value: 0, duration: 0.2 });
    gsap.set(canvas, { opacity: 0 });
    stopHexRender();

    // Flush memory cache after the transition completes
    if (cachedTexture) {
        cachedTexture.dispose();
        cachedTexture = null;
    }
}