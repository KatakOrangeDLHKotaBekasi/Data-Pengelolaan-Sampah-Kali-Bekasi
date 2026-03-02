/* ============================================
   THREE.JS 3D BACKGROUND - Pasukan Katak Orange
   Animated particle system with floating elements
   ============================================ */

function initThreeBackground() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Create particles
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const speeds = [];

    const greenColor = new THREE.Color(0x4CAF50);
    const orangeColor = new THREE.Color(0xFF9800);
    const lightGreen = new THREE.Color(0x81C784);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 60;
        positions[i3 + 1] = (Math.random() - 0.5) * 60;
        positions[i3 + 2] = (Math.random() - 0.5) * 40;

        // 70% green, 20% light green, 10% orange
        const rand = Math.random();
        let color;
        if (rand < 0.1) {
            color = orangeColor;
        } else if (rand < 0.3) {
            color = lightGreen;
        } else {
            color = greenColor;
        }

        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        sizes[i] = Math.random() * 3 + 0.5;
        speeds.push({
            x: (Math.random() - 0.5) * 0.02,
            y: Math.random() * 0.02 + 0.005,
            z: (Math.random() - 0.5) * 0.01,
            rotSpeed: Math.random() * 0.01
        });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material for soft glowing particles
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 }
        },
        vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uTime;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float dist = length(mvPosition.xyz);
        vAlpha = smoothstep(50.0, 5.0, dist) * 0.6;
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
        fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Add floating geometric shapes
    const shapes = [];
    const shapeMaterial = new THREE.MeshBasicMaterial({
        color: 0x4CAF50,
        wireframe: true,
        transparent: true,
        opacity: 0.08
    });

    // Octahedron
    const octa = new THREE.Mesh(new THREE.OctahedronGeometry(2, 0), shapeMaterial);
    octa.position.set(-15, 10, -10);
    scene.add(octa);
    shapes.push(octa);

    // Icosahedron
    const ico = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.5, 0),
        new THREE.MeshBasicMaterial({ color: 0xFF9800, wireframe: true, transparent: true, opacity: 0.06 })
    );
    ico.position.set(18, -8, -15);
    scene.add(ico);
    shapes.push(ico);

    // Torus
    const torus = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.5, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0x66BB6A, wireframe: true, transparent: true, opacity: 0.05 })
    );
    torus.position.set(0, -15, -20);
    scene.add(torus);
    shapes.push(torus);

    // Mouse interaction
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Animation loop
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;

        // Update particle positions
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            pos[i3] += speeds[i].x;
            pos[i3 + 1] += speeds[i].y;
            pos[i3 + 2] += speeds[i].z;

            // Wrap around
            if (pos[i3 + 1] > 30) {
                pos[i3 + 1] = -30;
                pos[i3] = (Math.random() - 0.5) * 60;
            }
            if (pos[i3] > 30) pos[i3] = -30;
            if (pos[i3] < -30) pos[i3] = 30;
        }
        geometry.attributes.position.needsUpdate = true;

        material.uniforms.uTime.value = time;

        // Rotate shapes
        shapes.forEach((shape, i) => {
            shape.rotation.x += 0.003 * (i + 1);
            shape.rotation.y += 0.002 * (i + 1);
            shape.position.y += Math.sin(time * 2 + i) * 0.01;
        });

        // Camera follows mouse slightly
        camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initThreeBackground);
