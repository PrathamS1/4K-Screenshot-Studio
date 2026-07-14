const canvas = document.getElementById('main-canvas');
let ctx = canvas.getContext('2d');
let originalImage = null;
let offscreenCanvas = document.createElement('canvas');
let offscreenCtx = offscreenCanvas.getContext('2d');

let drawHistory = [];
let currentTool = 'select';
let isDrawing = false;
let startX = 0, startY = 0;
let currentAnnotation = null;
let actionHistory = [];
let activeTextarea = null;
let isLayersExpanded = true;

let viewport = { zoom: 1, offsetX: 0, offsetY: 0, isPanning: false, lastX: 0, lastY: 0, initialized: false };

let state = {
  platform: 'default',
  transform: 'flat', // 'flat', 'left', 'right'
  bgCategory: 'gradients',
  bgIndex: 0,
  bgType: 'gradient',
  bgValue: { style: 'linear', colors: ['#f6d365', '#fda085'], angle: 135 },
  bgImageObj: null,
  frame: 'none',
  padding: 60,
  offsetX: 0,
  offsetY: 0,
  scaleImage: 100,
  radius: 16,
  shadow: 40,
  rotateImage: 0,
  color: '#000000',
  size: 4,
  fillColor: 'transparent',
  shapeRadius: 0,
  textLayers: [],
  selectedTextIndex: -1,
  selectedAnnotationIndex: -1,
  annotations: [],
  customGradient: {
    type: 'linear',
    angle: 135,
    color1: '#ff3366',
    color2: '#ffcc00'
  },
  custom3D: {
    perspective: 1000,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    shadowType: 'default',
    shadowX: -30,
    shadowY: 40,
    shadowBlur: 70,
    gloss: 0
  },
  exportFormat: 'image/png',
  exportQuality: 0.90,
  viewportHeightMode: 'auto',
  customViewportHeight: 800,
  webpageScrollOffset: 0
};

const shadowPresets = {
  'none': { blur: 0, x: 0, y: 0 },
  'subtle': { blur: 4, x: 2, y: 2 },
  'soft': { blur: 10, x: 0, y: 0 },
  'sharp': { blur: 0, x: 4, y: 4 },
  'floating': { blur: 15, x: 5, y: 10 },
  'hard': { blur: 1, x: 2, y: 2 },
  'deep': { blur: 20, x: 10, y: 15 },
  'retro': { blur: 0, x: -6, y: 6 },
  'double': { blur: 2, x: 4, y: -4 },
  'neon': { blur: 15, x: 0, y: 0 }
};

const patternCache = {};

const platforms = {
  'default': null,
  'linkedin': { width: 1200, height: 627 },
  'dribbble': { width: 1600, height: 1200 },
  'behance': { width: 1920, height: 1080 },
  'x': { width: 1200, height: 675 },
  'ig-square': { width: 1080, height: 1080 },
  'ig-portrait': { width: 1080, height: 1350 },
  'facebook': { width: 1200, height: 630 }
};

const bgCollections = {
  gradients: [
    { type: 'gradient', name: 'Dawn', value: { style: 'linear', colors: ['#f6d365', '#fda085'], angle: 135 } },
    { type: 'gradient', name: 'Aurora', value: { style: 'mesh', colors: ['#0f2027', '#ff0055', '#0055ff', '#00ff55'] } },
    { type: 'gradient', name: 'Cosmic', value: { style: 'radial', colors: ['#1a0b2e', '#4b1d52', '#e53935'] } },
    { type: 'gradient', name: 'Retro', value: { style: 'conic', colors: ['#f83600', '#f9d423', '#f83600'] } },
    { type: 'gradient', name: 'Ocean', value: { style: 'linear', colors: ['#4facfe', '#00f2fe'], angle: 135 } },
    { type: 'gradient', name: 'Pearl', value: { style: 'radial', colors: ['#fdfbfb', '#ebedee'] } },
    { type: 'gradient', name: 'Angular', value: { style: 'conic', colors: ['#30CFD0', '#330867', '#30CFD0'] } },
    { type: 'gradient', name: 'Candy', value: { style: 'mesh', colors: ['#ff9a9e', '#fecfef', '#a1c4fd', '#c2e9fb'] } },
    { type: 'gradient', name: 'Midnight', value: { style: 'radial', colors: ['#0f2027', '#2c5364'] } },
    { type: 'gradient', name: 'Inferno', value: { style: 'mesh', colors: ['#120A0A', '#FF4500', '#FF8C00', '#FFD700'] } },
    { type: 'gradient', name: 'Steel', value: { style: 'conic', colors: ['#8e9eab', '#eef2f3', '#8e9eab'] } },
    { type: 'gradient', name: 'Vapor', value: { style: 'linear', colors: ['#a18cd1', '#fbc2eb'], angle: 45 } },
    { type: 'gradient', name: 'Frost', value: { style: 'mesh', colors: ['#E0EAFC', '#CFDEF3', '#A1C4FD', '#C2E9FB'] } },
    { type: 'gradient', name: 'Sunrise', value: { style: 'radial', colors: ['#ff512f', '#f09819'] } },
    { type: 'gradient', name: 'Emerald', value: { style: 'linear', colors: ['#0ba360', '#3cba92'], angle: 135 } },
    { type: 'gradient', name: 'Neon', value: { style: 'linear', colors: ['#00F260', '#0575E6'], angle: 90 } },
    { type: 'gradient', name: 'Cherry', value: { style: 'radial', colors: ['#eb3349', '#f45c43'] } },
    { type: 'gradient', name: 'Lush', value: { style: 'mesh', colors: ['#56ab2f', '#a8e063', '#2b580c', '#fce205'] } },
    { type: 'gradient', name: 'Golden', value: { style: 'conic', colors: ['#ffd700', '#ff8c00', '#ffd700'] } },
    { type: 'gradient', name: 'Abyss', value: { style: 'linear', colors: ['#000000', '#434343'], angle: 180 } },
    { type: 'gradient', name: 'Flare', value: { style: 'mesh', colors: ['#f12711', '#f5af19', '#ffffff', '#ff4b1f'] } },
    { type: 'gradient', name: 'Muted', value: { style: 'radial', colors: ['#ECE9E6', '#FFFFFF'] } },
    { type: 'gradient', name: 'Tropical', value: { style: 'linear', colors: ['#11998e', '#38ef7d'], angle: 45 } },
    { type: 'gradient', name: 'Purple Rain', value: { style: 'conic', colors: ['#cc2b5e', '#753a88', '#cc2b5e'] } },
    { type: 'gradient', name: 'Peachy', value: { style: 'mesh', colors: ['#ed4264', '#ffedbc', '#ff9a9e', '#fecfef'] } },
    { type: 'gradient', name: 'Matrix', value: { style: 'linear', colors: ['#000000', '#0f9b0f'], angle: 135 } },
    { type: 'gradient', name: 'Silver', value: { style: 'radial', colors: ['#bdc3c7', '#2c3e50'] } },
    { type: 'gradient', name: 'Electric', value: { style: 'conic', colors: ['#4facfe', '#f093fb', '#4facfe'] } },
    { type: 'gradient', name: 'Sunset', value: { style: 'linear', colors: ['#fe8c00', '#f83600'], angle: 180 } },
    { type: 'gradient', name: 'Galaxy', value: { style: 'mesh', colors: ['#3A1C71', '#D76D77', '#FFAF7B', '#8E2DE2'] } },
    { type: 'gradient', name: 'Holographic', value: { style: 'mesh', colors: ['#fdfbfb', '#a1c4fd', '#fbc2eb', '#ffffff'] } },
    { type: 'gradient', name: 'Cyberpunk', value: { style: 'mesh', colors: ['#000000', '#ff0055', '#3300ff', '#00ffd5'] } },
    { type: 'gradient', name: 'Synthwave', value: { style: 'linear', colors: ['#2e026d', '#bc13fe', '#ff4545'], angle: 180 } },
    { type: 'gradient', name: 'Deep Sea', value: { style: 'radial', colors: ['#014f86', '#012a4a', '#89c2d9'] } },
    { type: 'gradient', name: 'Aurora 2', value: { style: 'mesh', colors: ['#000000', '#00ff55', '#0055ff', '#ff0055'] } },
    { type: 'gradient', name: 'Golden Hour', value: { style: 'conic', colors: ['#ff9966', '#ff5e62', '#ffd700'] } },
    { type: 'gradient', name: 'Magma', value: { style: 'mesh', colors: ['#121212', '#8b0000', '#ff4500', '#2d2d2d'] } },
    { type: 'gradient', name: 'Pastel Dream', value: { style: 'mesh', colors: ['#ff9a9e', '#fecfef', '#a1c4fd', '#e0f0ff'] } },
    { type: 'gradient', name: 'Midnight City', value: { style: 'linear', colors: ['#232526', '#414345', '#00d2ff'], angle: 45 } },
    { type: 'gradient', name: 'Black Hole', value: { style: 'radial', colors: ['#000000', '#1a1a1a', '#ff0000'] } },
    
    // NEW ADDITIONS
    { type: 'gradient', name: 'Sunset Shore', value: { style: 'mesh', colors: ['#ff9966', '#ff5e62', '#ffcc00', '#ff3366'] } },
    { type: 'gradient', name: 'Matcha Matcha', value: { style: 'linear', colors: ['#78ffd6', '#a8ff78'], angle: 135 } },
    { type: 'gradient', name: 'Lavender Mist', value: { style: 'mesh', colors: ['#fbc2eb', '#a6c1ee', '#f0f0f0', '#c2e9fb'] } },
    { type: 'gradient', name: 'Soft Clay', value: { style: 'radial', colors: ['#e6e9f0', '#eef1f5'] } },
    { type: 'gradient', name: 'Royal Velvet', value: { style: 'mesh', colors: ['#2980b9', '#8e44ad', '#2c3e50', '#000000'] } },
    { type: 'gradient', name: 'Tokyo Neon', value: { style: 'mesh', colors: ['#ff007f', '#00ffff', '#7f00ff', '#000000'] } },
    { type: 'gradient', name: 'Mojito', value: { style: 'linear', colors: ['#1d976c', '#93f9b9'], angle: 135 } },
    { type: 'gradient', name: 'Blue Lagoon', value: { style: 'linear', colors: ['#00c6ff', '#0072ff'], angle: 135 } },
    { type: 'gradient', name: 'Sherbet', value: { style: 'mesh', colors: ['#fe938c', '#e2f1af', '#a5ffd6', '#ffe1a8'] } },
    { type: 'gradient', name: 'Lilac Velvet', value: { style: 'linear', colors: ['#e0c3fc', '#8ec5fc'], angle: 135 } },
    { type: 'gradient', name: 'Crimson Glow', value: { style: 'mesh', colors: ['#1f1c2c', '#928dab', '#ff0000', '#000000'] } },
    { type: 'gradient', name: 'Forest Frost', value: { style: 'linear', colors: ['#134e5e', '#71b280'], angle: 135 } },
    { type: 'gradient', name: 'Warm Toast', value: { style: 'radial', colors: ['#f5f7fa', '#c3cfe2'] } },
    { type: 'gradient', name: 'Nordic Pine', value: { style: 'mesh', colors: ['#004d40', '#00796b', '#00bfa5', '#263238'] } },
    { type: 'gradient', name: 'Cyber Sunset', value: { style: 'mesh', colors: ['#f80759', '#bc4e9c', '#ff7300', '#000000'] } },
    { type: 'gradient', name: 'Golden Aura', value: { style: 'conic', colors: ['#f6d365', '#ffffff', '#f6d365'] } },
    { type: 'gradient', name: 'Ocean Pearl', value: { style: 'mesh', colors: ['#a1c4fd', '#c2e9fb', '#ffffff', '#e0f7fa'] } },
    { type: 'gradient', name: 'Mystic Violet', value: { style: 'radial', colors: ['#4b0082', '#000000'] } },
    { type: 'gradient', name: 'Neon Splash', value: { style: 'mesh', colors: ['#39ff14', '#ff007f', '#00ffff', '#7f00ff'] } },
    { type: 'gradient', name: 'Cotton Candy', value: { style: 'linear', colors: ['#ff9a9e', '#fecfef'], angle: 135 } },
    { type: 'gradient', name: 'Deep Emerald', value: { style: 'linear', colors: ['#0575e6', '#00f260'], angle: 45 } },
    { type: 'gradient', name: 'Peachy Keen', value: { style: 'radial', colors: ['#ff9a9e', '#fecfef'] } },
    { type: 'gradient', name: 'Glacial Freeze', value: { style: 'mesh', colors: ['#a1c4fd', '#c2e9fb', '#e0f7fa', '#00ffff'] } },
    { type: 'gradient', name: 'Space Dust', value: { style: 'mesh', colors: ['#2c3e50', '#fd746c', '#ff9068', '#000000'] } },
    { type: 'gradient', name: 'Ember', value: { style: 'linear', colors: ['#f12711', '#f5af19'], angle: 135 } },

    // NICHE GRADIENTS
    { type: 'gradient', name: 'Terracotta Soil', value: { style: 'linear', colors: ['#c36a59', '#b24a37', '#6e2c24'], angle: 135 } },
    { type: 'gradient', name: 'Matcha Moss', value: { style: 'mesh', colors: ['#8a9a86', '#c5ccb8', '#4e584a', '#2c352a'] } },
    { type: 'gradient', name: 'Sage Mint', value: { style: 'radial', colors: ['#9baf96', '#dfebd5'] } },
    { type: 'gradient', name: 'Mustard Ochre', value: { style: 'linear', colors: ['#d9a05b', '#5c633c'], angle: 135 } },
    { type: 'gradient', name: 'Plum Fig', value: { style: 'radial', colors: ['#421d31', '#63264a', '#8b3058'] } },
    { type: 'gradient', name: 'Eucalyptus Cedar', value: { style: 'mesh', colors: ['#5f7470', '#8c9a96', '#3b4846', '#1c2423'] } },
    { type: 'gradient', name: 'Peach Fuzz', value: { style: 'linear', colors: ['#ffbe98', '#ffe5d9'], angle: 45 } },
    { type: 'gradient', name: 'Dusty Rose', value: { style: 'radial', colors: ['#b88a87', '#e5c1c0'] } },
    { type: 'gradient', name: 'Sand Foam', value: { style: 'linear', colors: ['#dcd1c4', '#e2ebe9'], angle: 135 } },
    { type: 'gradient', name: 'Tuscan Olive', value: { style: 'mesh', colors: ['#606c38', '#283618', '#dda15e', '#fefae0'] } },
    { type: 'gradient', name: 'Brushed Copper', value: { style: 'conic', colors: ['#b15831', '#632c18', '#b15831'] } },
    { type: 'gradient', name: 'Misty Lavender', value: { style: 'linear', colors: ['#9980b1', '#c5b3d9'], angle: 45 } },
    { type: 'gradient', name: 'Charcoal Rust', value: { style: 'mesh', colors: ['#2c3531', '#d1e8e2', '#d9b08c', '#111715'] } },
    { type: 'gradient', name: 'Wabi-Sabi Sand', value: { style: 'radial', colors: ['#f5f2eb', '#d3c0ad'] } },
    { type: 'gradient', name: 'Slate Stone', value: { style: 'linear', colors: ['#475569', '#334155'], angle: 180 } },
    { type: 'gradient', name: 'Japanese Plum', value: { style: 'mesh', colors: ['#3c2f2f', '#be9b7b', '#854442', '#211515'] } },
    { type: 'gradient', name: 'Burnt Amber', value: { style: 'conic', colors: ['#d66834', '#3d2314', '#d66834'] } },
    { type: 'gradient', name: 'Vintage Mint', value: { style: 'radial', colors: ['#a3c9a8', '#84b59f'] } },
    { type: 'gradient', name: 'Smoky Quartz', value: { style: 'mesh', colors: ['#4e4f50', '#a39e9e', '#6c5c6f', '#1c1c1c'] } },
    { type: 'gradient', name: 'Nordic Sea', value: { style: 'linear', colors: ['#102a43', '#243b53', '#334e68'], angle: 135 } },
    { type: 'gradient', name: 'Muted Teal', value: { style: 'radial', colors: ['#0d3b4c', '#001a23'] } },
    { type: 'gradient', name: 'Warm Almond', value: { style: 'linear', colors: ['#ebe3db', '#c9c0b7'], angle: 135 } },
    { type: 'gradient', name: 'Dune Sand', value: { style: 'mesh', colors: ['#e6c29b', '#f3d9b1', '#b28e68', '#402e1b'] } },
    { type: 'gradient', name: 'Slate Teal', value: { style: 'linear', colors: ['#2e4f4f', '#0e2f2f'], angle: 45 } },
    { type: 'gradient', name: 'Vintage Brass', value: { style: 'conic', colors: ['#bca374', '#1a120b', '#bca374'] } }
  ],
  solid: [
    { type: 'transparent', name: 'Trans', value: [] },
    { type: 'solid', name: 'White', value: ['#ffffff'] },
    { type: 'solid', name: 'Alabaster', value: ['#fafafa'] },
    { type: 'solid', name: 'Space Gray', value: ['#1E1E1E'] },
    { type: 'solid', name: 'Obsidian', value: ['#0a0a0a'] },
    { type: 'solid', name: 'Slate Night', value: ['#0F172A'] },
    { type: 'solid', name: 'Midnight', value: ['#0A2540'] },
    { type: 'solid', name: 'Indigo', value: ['#3F0071'] },
    { type: 'solid', name: 'Plum Noir', value: ['#4A0E4E'] },
    { type: 'solid', name: 'Wine', value: ['#720026'] },
    { type: 'solid', name: 'Forest', value: ['#2D6A4F'] },
    { type: 'solid', name: 'Teal', value: ['#008080'] },
    { type: 'solid', name: 'Electric', value: ['#007BFF'] },
    { type: 'solid', name: 'Neon Pink', value: ['#FF007F'] },
    { type: 'solid', name: 'Terracotta', value: ['#E07A5F'] },
    { type: 'solid', name: 'Mustard', value: ['#F4A261'] },
    { type: 'solid', name: 'Pistachio', value: ['#81B29A'] },
    { type: 'solid', name: 'Mint Flow', value: ['#84DCC6'] },
    { type: 'solid', name: 'Pastel Blue', value: ['#BDE0FE'] },
    { type: 'solid', name: 'Lavender', value: ['#CDB4DB'] },
    { type: 'solid', name: 'Rose Gold', value: ['#FFC8DD'] },
    { type: 'solid', name: 'Soft Peach', value: ['#FFD6A5'] }
  ],
  patterns: [
    { type: 'pattern', name: 'Abstract Circles', value: 'assets/abstract-circles.png' },
    { type: 'pattern', name: 'Abstract Fluid', value: 'assets/abstract-fluid.jpg' },
    { type: 'pattern', name: 'Abstract Lines', value: 'assets/abstract-lines.jpg' },
    { type: 'pattern', name: 'Abstract Shapes', value: 'assets/abstract-shapes.jpg' },
    { type: 'pattern', name: 'Abstract', value: 'assets/abstract.png' },
    { type: 'pattern', name: 'Abstract 2', value: 'assets/abstract2.jpg' },
    { type: 'pattern', name: 'Black Abstract', value: 'assets/black-abstract.jpg' },
    { type: 'pattern', name: 'Black Abstract 2', value: 'assets/black-abstract2.jpg' },
    { type: 'pattern', name: 'Black Abstract 3', value: 'assets/black-abstract3.jpg' },
    { type: 'pattern', name: 'Black Rectangles', value: 'assets/black-rectangles.jpg' },
    { type: 'pattern', name: 'Black White 1', value: 'assets/black-white-1.png' },
    { type: 'pattern', name: 'Black White 2', value: 'assets/black-white-2.png' },
    { type: 'pattern', name: 'Blue Wave', value: 'assets/blue-wave.jpg' },
    { type: 'pattern', name: 'Circles', value: 'assets/circles.jpg' },
    { type: 'pattern', name: 'Colored Fluid', value: 'assets/colored-fluid.png' },
    { type: 'pattern', name: 'Dark Waves', value: 'assets/dark-waves.png' },
    { type: 'pattern', name: 'Mesh Lines', value: 'assets/mesh-lines.png' },
    { type: 'pattern', name: 'Orange Sheets', value: 'assets/orange-sheets.jpg' },
    { type: 'pattern', name: 'Shiny Glass', value: 'assets/shiny-glass.jpg' },
    { type: 'pattern', name: 'Silk Waves', value: 'assets/silk-waves.png' },
    { type: 'pattern', name: 'Waves 1', value: 'assets/waves1.jpg' },
    { type: 'pattern', name: 'Waves 2', value: 'assets/waves2.jpg' }
  ]
};

function initUI() {
  renderBackgroundPresets();

  document.getElementById('platform-select').addEventListener('change', (e) => {
    state.platform = e.target.value;
    render();
  });

  document.getElementById('bg-category-select').value = state.bgCategory;
  document.getElementById('bg-category-select').addEventListener('change', (e) => {
    state.bgCategory = e.target.value;
    const isImage = state.bgCategory === 'image';
    const isSolid = state.bgCategory === 'solid';
    const isCustomGrad = state.bgCategory === 'custom-gradient';

    document.getElementById('bg-presets').style.display = (isImage || isCustomGrad) ? 'none' : 'grid';
    document.getElementById('bg-upload-container').style.display = isImage ? 'block' : 'none';
    document.getElementById('solid-color-container').style.display = isSolid ? 'block' : 'none';
    document.getElementById('custom-gradient-container').style.display = isCustomGrad ? 'flex' : 'none';

    if (!isImage && !isCustomGrad) {
      state.bgIndex = 0;
      applyBackgroundSelection();
      renderBackgroundPresets();
    }
    render();
  });

  document.getElementById('bg-custom-grad-type').addEventListener('click', (e) => {
    if (e.target.classList.contains('segment-btn')) {
      document.querySelectorAll('#bg-custom-grad-type .segment-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.customGradient.type = e.target.dataset.value;
      document.getElementById('bg-custom-grad-angle-group').style.display = state.customGradient.type === 'linear' ? 'block' : 'none';
      render();
    }
  });

  document.getElementById('param-bgGradAngle').addEventListener('input', (e) => {
    state.customGradient.angle = parseInt(e.target.value);
    document.getElementById('val-bgGradAngle').textContent = state.customGradient.angle + '°';
    render();
  });

  document.getElementById('bg-custom-grad-color1').addEventListener('input', (e) => {
    state.customGradient.color1 = e.target.value;
    render();
  });

  document.getElementById('bg-custom-grad-color2').addEventListener('input', (e) => {
    state.customGradient.color2 = e.target.value;
    render();
  });

  document.getElementById('bg-custom-color').addEventListener('input', (e) => {
    state.bgType = 'solid';
    state.bgValue = [e.target.value];
    // Remove active state from presets
    document.querySelectorAll('.bg-preset').forEach(el => el.classList.remove('active'));
    render();
  });

  document.getElementById('btn-upload-bg').addEventListener('click', () => {
    document.getElementById('input-upload-bg').click();
  });

  document.getElementById('input-upload-bg').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          state.bgImageObj = img;
          state.bgType = 'image';
          render();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('transform-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.showcase-btn');
    if (btn) {
      document.querySelectorAll('#transform-toggle .showcase-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.transform = btn.dataset.value;
      const isCustom = state.transform === 'custom';
      document.getElementById('custom-3d-container').style.display = isCustom ? 'flex' : 'none';
      render();
    }
  });

  document.getElementById('param-customPerspective').addEventListener('input', (e) => {
    state.custom3D.perspective = parseInt(e.target.value);
    document.getElementById('val-customPerspective').textContent = e.target.value + 'px';
    render();
  });

  document.getElementById('param-customRotateX').addEventListener('input', (e) => {
    state.custom3D.rotateX = parseInt(e.target.value);
    document.getElementById('val-customRotateX').textContent = e.target.value + '°';
    render();
  });

  document.getElementById('param-customRotateY').addEventListener('input', (e) => {
    state.custom3D.rotateY = parseInt(e.target.value);
    document.getElementById('val-customRotateY').textContent = e.target.value + '°';
    render();
  });

  document.getElementById('param-customRotateZ').addEventListener('input', (e) => {
    state.custom3D.rotateZ = parseInt(e.target.value);
    document.getElementById('val-customRotateZ').textContent = e.target.value + '°';
    render();
  });

  document.getElementById('param-customShadowType').addEventListener('change', (e) => {
    state.custom3D.shadowType = e.target.value;
    const shadowControls = document.getElementById('custom-shadow-controls');
    if (shadowControls) {
      shadowControls.style.display = e.target.value === 'none' ? 'none' : 'flex';
    }
    
    // Smoothly snap custom shadow sliders to the preset default values
    const preset = e.target.value;
    if (preset === 'default') {
      state.custom3D.shadowX = -10;
      state.custom3D.shadowY = 15;
      state.custom3D.shadowBlur = 30;
    } else if (preset === 'floating') {
      state.custom3D.shadowX = -30;
      state.custom3D.shadowY = 40;
      state.custom3D.shadowBlur = 70;
    } else if (preset === 'soft') {
      state.custom3D.shadowX = 0;
      state.custom3D.shadowY = 30;
      state.custom3D.shadowBlur = 100;
    } else if (preset === 'sharp') {
      state.custom3D.shadowX = -15;
      state.custom3D.shadowY = 15;
      state.custom3D.shadowBlur = 0;
    } else if (preset === 'glow') {
      state.custom3D.shadowX = 0;
      state.custom3D.shadowY = 0;
      state.custom3D.shadowBlur = 60;
    }
    
    if (preset !== 'none') {
      document.getElementById('param-customShadowX').value = state.custom3D.shadowX;
      document.getElementById('param-customShadowY').value = state.custom3D.shadowY;
      document.getElementById('param-customShadowBlur').value = state.custom3D.shadowBlur;
      document.getElementById('val-customShadowX').textContent = state.custom3D.shadowX + 'px';
      document.getElementById('val-customShadowY').textContent = state.custom3D.shadowY + 'px';
      document.getElementById('val-customShadowBlur').textContent = state.custom3D.shadowBlur + 'px';
    }
    render();
  });

  document.getElementById('param-customShadowX').addEventListener('input', (e) => {
    state.custom3D.shadowX = parseInt(e.target.value);
    document.getElementById('val-customShadowX').textContent = e.target.value + 'px';
    render();
  });

  document.getElementById('param-customShadowY').addEventListener('input', (e) => {
    state.custom3D.shadowY = parseInt(e.target.value);
    document.getElementById('val-customShadowY').textContent = e.target.value + 'px';
    render();
  });

  document.getElementById('param-customShadowBlur').addEventListener('input', (e) => {
    state.custom3D.shadowBlur = parseInt(e.target.value);
    document.getElementById('val-customShadowBlur').textContent = e.target.value + 'px';
    render();
  });

  document.getElementById('param-customGloss').addEventListener('input', (e) => {
    state.custom3D.gloss = parseInt(e.target.value);
    document.getElementById('val-customGloss').textContent = e.target.value + '%';
    render();
  });

  document.getElementById('btn-reset-custom-3d').addEventListener('click', () => {
    state.custom3D.perspective = 1000;
    state.custom3D.rotateX = 0;
    state.custom3D.rotateY = 0;
    state.custom3D.rotateZ = 0;
    state.custom3D.shadowType = 'default';
    state.custom3D.shadowX = -10;
    state.custom3D.shadowY = 15;
    state.custom3D.shadowBlur = 30;
    state.custom3D.gloss = 0;

    // Update UI range inputs and dropdowns
    document.getElementById('param-customPerspective').value = 1000;
    document.getElementById('param-customRotateX').value = 0;
    document.getElementById('param-customRotateY').value = 0;
    document.getElementById('param-customRotateZ').value = 0;
    document.getElementById('param-customShadowType').value = 'default';
    document.getElementById('param-customShadowX').value = -10;
    document.getElementById('param-customShadowY').value = 15;
    document.getElementById('param-customShadowBlur').value = 30;
    document.getElementById('param-customGloss').value = 0;

    const shadowControls = document.getElementById('custom-shadow-controls');
    if (shadowControls) shadowControls.style.display = 'flex';

    // Update UI value labels
    document.getElementById('val-customPerspective').textContent = '1000px';
    document.getElementById('val-customRotateX').textContent = '0°';
    document.getElementById('val-customRotateY').textContent = '0°';
    document.getElementById('val-customRotateZ').textContent = '0°';
    document.getElementById('val-customShadowX').textContent = '-10px';
    document.getElementById('val-customShadowY').textContent = '15px';
    document.getElementById('val-customShadowBlur').textContent = '30px';
    document.getElementById('val-customGloss').textContent = '0%';

    render();
  });

  document.getElementById('frame-toggle').addEventListener('click', (e) => {
    if (e.target.classList.contains('segment-btn')) {
      document.querySelectorAll('#frame-toggle .segment-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.frame = e.target.dataset.value;
      render();
    }
  });

  document.getElementById('param-viewportHeightMode').addEventListener('click', (e) => {
    const btn = e.target.closest('.segment-btn');
    if (btn) {
      document.querySelectorAll('#param-viewportHeightMode .segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.viewportHeightMode = btn.dataset.value;
      document.getElementById('viewport-custom-settings').style.display = state.viewportHeightMode === 'custom' ? 'flex' : 'none';
      render();
    }
  });

  document.getElementById('param-customViewportHeight').addEventListener('input', (e) => {
    state.customViewportHeight = parseInt(e.target.value);
    document.getElementById('val-customViewportHeight').textContent = state.customViewportHeight + 'px';
    render();
  });

  document.getElementById('param-webpageScrollOffset').addEventListener('input', (e) => {
    state.webpageScrollOffset = parseInt(e.target.value);
    document.getElementById('val-webpageScrollOffset').textContent = state.webpageScrollOffset + '%';
    render();
  });

  ['padding', 'radius', 'shadow', 'offsetX', 'offsetY', 'rotateImage', 'scaleImage', 'textSize'].forEach(param => {
    const input = document.getElementById(`param-${param}`);
    if (!input) return;
    input.addEventListener('input', (e) => {
      state[param] = parseInt(e.target.value);
      let suffix = 'px';
      if (param === 'shadow' || param === 'offsetX' || param === 'offsetY' || param === 'scaleImage') suffix = '%';
      if (param === 'rotateImage') suffix = '°';
      if (param === 'textSize') suffix = 'px';

      const label = document.getElementById(`val-${param}`);
      if (label) label.textContent = state[param] + suffix;

      if (param === 'textSize') {
        const layer = state.textLayers[state.selectedTextIndex];
        if (layer) layer.size = state.textSize;
      }

      render();
    });
  });


  document.getElementById('param-text-color').addEventListener('input', (e) => {
    const layer = state.textLayers[state.selectedTextIndex];
    if (layer) { layer.color = e.target.value; render(); }
  });

  document.getElementById('param-text-shadow-grid').addEventListener('click', (e) => {
    if (e.target.classList.contains('shadow-item')) {
      const layer = state.textLayers[state.selectedTextIndex];
      if (layer) {
        layer.shadowType = e.target.dataset.value;
        syncTextUI();
        render();
      }
    }
  });

  document.getElementById('param-text-shadow-color').addEventListener('input', (e) => {
    const layer = state.textLayers[state.selectedTextIndex];
    if (layer) { layer.shadowColor = e.target.value; render(); }
  });

  document.getElementById('param-text-content').addEventListener('input', (e) => {
    const layer = state.textLayers[state.selectedTextIndex];
    if (layer) { layer.text = e.target.value; render(); }
  });

  document.getElementById('param-text-font').addEventListener('change', (e) => {
    const layer = state.textLayers[state.selectedTextIndex];
    if (layer) {
      layer.font = e.target.value;
      // Ensure font is loaded before rendering
      document.fonts.load(`1em ${layer.font}`).then(() => {
        render();
      });
    }
  });

  document.getElementById('param-text-preset').addEventListener('click', (e) => {
    if (e.target.classList.contains('segment-btn')) {
      const layer = state.textLayers[state.selectedTextIndex];
      if (layer) {
        layer.preset = e.target.dataset.value;
        if (layer.preset === 'header') layer.size = 80;
        else if (layer.preset === 'sub') layer.size = 40;
        else if (layer.preset === 'caption') layer.size = 20;
        syncTextUI();
        render();
      }
    }
  });

  document.getElementById('param-text-depth').addEventListener('click', (e) => {
    if (e.target.classList.contains('segment-btn')) {
      const layer = state.textLayers[state.selectedTextIndex];
      if (layer) {
        layer.depth = e.target.dataset.value;
        syncTextUI();
        render();
      }
    }
  });

  function setTool(tool) {
    document.querySelectorAll('.top-toolbar .tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`tool-${tool}`);
    if (btn) btn.classList.add('active');
    currentTool = tool;
    document.querySelector('.canvas-wrapper').style.pointerEvents = (tool === 'pan') ? 'none' : 'auto';
    
    // Blur the active element if it is a toolbar button to prevent focus outline borders remaining visible
    if (document.activeElement && document.activeElement.classList.contains('tool-btn')) {
      document.activeElement.blur();
    }

    // Dynamic canvas cursor
    if (tool === 'select') {
      canvas.style.cursor = 'default';
    } else {
      canvas.style.cursor = 'crosshair';
    }
    
    updateTopToolbarVisibility();
    syncShapeUI();
    render();
  }

  document.getElementById('btn-add-text').addEventListener('click', () => {
    const defaultFont = "'Geist', sans-serif";
    const newLayer = {
      text: 'Double click to edit', 
      font: defaultFont, 
      preset: 'sub', 
      size: Math.max(20, Math.round(state.textSize || 40)), 
      depth: 'off', 
      x: 50, 
      y: 50, 
      color: state.color || '#000000', 
      shadowType: 'none', 
      shadowColor: '#000000',
      rect: null
    };
    state.textLayers.push(newLayer);
    state.selectedTextIndex = state.textLayers.length - 1;
    actionHistory.push({ type: 'text' });
    setTool('select');
    syncTextUI();
    render();
    
    setTimeout(() => {
      startInlineTextEdit(state.selectedTextIndex);
    }, 50);
  });

  document.getElementById('param-color').addEventListener('input', e => {
    state.color = e.target.value;
    
    if (state.selectedTextIndex !== -1) {
      const layer = state.textLayers[state.selectedTextIndex];
      if (layer) {
        layer.color = e.target.value;
        const subColor = document.getElementById('param-text-color');
        if (subColor) subColor.value = e.target.value;
      }
    }
    if (state.selectedAnnotationIndex !== -1) {
      const ann = state.annotations[state.selectedAnnotationIndex];
      if (ann) {
        ann.color = e.target.value;
      }
    }
    render();
  });
  
  document.getElementById('param-size').addEventListener('input', e => {
    state.size = parseInt(e.target.value);
    
    if (state.selectedAnnotationIndex !== -1) {
      const ann = state.annotations[state.selectedAnnotationIndex];
      if (ann) {
        ann.size = state.size;
      }
    }
    render();
  });

  // Shape formatting panel event listeners
  document.getElementById('shape-stroke-color').addEventListener('input', (e) => {
    state.color = e.target.value;
    const topColor = document.getElementById('param-color');
    if (topColor) topColor.value = e.target.value;
    
    if (state.selectedAnnotationIndex !== -1) {
      const ann = state.annotations[state.selectedAnnotationIndex];
      if (ann) ann.color = e.target.value;
    }
    render();
  });

  document.getElementById('shape-fill-color').addEventListener('input', (e) => {
    state.fillColor = e.target.value;
    
    if (state.selectedAnnotationIndex !== -1) {
      const ann = state.annotations[state.selectedAnnotationIndex];
      if (ann && ann.type === 'rect') ann.fillColor = e.target.value;
    }
    render();
  });

  document.getElementById('btn-shape-fill-transparent').addEventListener('click', () => {
    state.fillColor = 'transparent';
    
    if (state.selectedAnnotationIndex !== -1) {
      const ann = state.annotations[state.selectedAnnotationIndex];
      if (ann && ann.type === 'rect') ann.fillColor = 'transparent';
    }
    render();
  });

  document.getElementById('shape-stroke-width').addEventListener('input', (e) => {
    state.size = parseInt(e.target.value);
    const topSize = document.getElementById('param-size');
    if (topSize) topSize.value = e.target.value;
    document.getElementById('val-shape-stroke-width').textContent = e.target.value + 'px';
    
    if (state.selectedAnnotationIndex !== -1) {
      const ann = state.annotations[state.selectedAnnotationIndex];
      if (ann) ann.size = state.size;
    }
    render();
  });

  document.getElementById('shape-radius').addEventListener('input', (e) => {
    state.shapeRadius = parseInt(e.target.value);
    document.getElementById('val-shape-radius').textContent = e.target.value + 'px';
    
    if (state.selectedAnnotationIndex !== -1) {
      const ann = state.annotations[state.selectedAnnotationIndex];
      if (ann && ann.type === 'rect') ann.radius = state.shapeRadius;
    }
    render();
  });

  ['select', 'pan', 'draw', 'rect', 'arrow', 'highlight', 'blur'].forEach(tool => {
    document.getElementById(`tool-${tool}`).addEventListener('click', () => setTool(tool));
  });

  // Sync initial Viewport Height/Scroll controls to match default state
  document.querySelectorAll('#param-viewportHeightMode .segment-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === state.viewportHeightMode);
  });
  document.getElementById('viewport-custom-settings').style.display = state.viewportHeightMode === 'custom' ? 'flex' : 'none';
  document.getElementById('param-customViewportHeight').value = state.customViewportHeight;
  document.getElementById('val-customViewportHeight').textContent = state.customViewportHeight + 'px';
  document.getElementById('param-webpageScrollOffset').value = state.webpageScrollOffset;
  document.getElementById('val-webpageScrollOffset').textContent = state.webpageScrollOffset + '%';

  syncTextUI();
  setTool('pan');

  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-export').addEventListener('click', exportImage);
  document.getElementById('btn-copy').addEventListener('click', copyToClipboard);

  const formatSelect = document.getElementById('export-format-select');
  if (formatSelect) {
    formatSelect.addEventListener('change', (e) => {
      state.exportFormat = e.target.value;
      const qualityGroup = document.getElementById('export-quality-group');
      if (qualityGroup) {
        qualityGroup.style.display = state.exportFormat === 'image/png' ? 'none' : 'block';
      }
    });
  }

  const qualityInput = document.getElementById('param-exportQuality');
  if (qualityInput) {
    qualityInput.addEventListener('input', (e) => {
      state.exportQuality = parseInt(e.target.value) / 100;
      const qualityVal = document.getElementById('val-exportQuality');
      if (qualityVal) {
        qualityVal.textContent = e.target.value + '%';
      }
    });
  }

  document.getElementById('layers-panel-header').addEventListener('click', () => {
    isLayersExpanded = !isLayersExpanded;
    const content = document.getElementById('layers-panel-content');
    const arrow = document.getElementById('layers-toggle-arrow');
    
    if (isLayersExpanded) {
      content.style.display = 'flex';
      arrow.style.transform = 'rotate(0deg)';
    } else {
      content.style.display = 'none';
      arrow.style.transform = 'rotate(-90deg)';
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    if (!originalImage || (currentTool !== 'select' && currentTool !== 'text')) return;
    const rawPos = getMousePos(e);
    
    let hitIndex = -1;
    for (let i = state.textLayers.length - 1; i >= 0; i--) {
      const layer = state.textLayers[i];
      if (layer.rect && 
          rawPos.x >= layer.rect.x && rawPos.x <= layer.rect.x + layer.rect.w &&
          rawPos.y >= layer.rect.y && rawPos.y <= layer.rect.y + layer.rect.h) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== -1) {
      startInlineTextEdit(hitIndex);
    }
  });

  initViewport();
}

function initViewport() {
  const mainArea = document.querySelector('.main-area');

  document.getElementById('btn-zoom-in').addEventListener('click', () => { viewport.zoom = Math.min(5, viewport.zoom + 0.1); updateViewport(); });
  document.getElementById('btn-zoom-out').addEventListener('click', () => { viewport.zoom = Math.max(0.1, viewport.zoom - 0.1); updateViewport(); });
  document.getElementById('btn-zoom-fit').addEventListener('click', fitToScreen);

  mainArea.addEventListener('click', () => {
    window.focus();
  });

  let isSpaceDown = false;
  window.addEventListener('keydown', e => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) {
      return;
    }

    if (e.code === 'Space' && !isSpaceDown) {
      isSpaceDown = true;
      mainArea.classList.add('panning');
      e.preventDefault();
      return;
    }

    let targetBtn = null;
    if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
      targetBtn = document.getElementById('tool-select');
    } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
      targetBtn = document.getElementById('tool-pan');
    } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
      targetBtn = document.getElementById('tool-draw');
    } else if (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4') {
      targetBtn = document.getElementById('tool-highlight');
    } else if (e.key === '5' || e.code === 'Digit5' || e.code === 'Numpad5') {
      targetBtn = document.getElementById('tool-blur');
    } else if (e.key === '6' || e.code === 'Digit6' || e.code === 'Numpad6') {
      targetBtn = document.getElementById('tool-rect');
    } else if (e.key === '7' || e.code === 'Digit7' || e.code === 'Numpad7') {
      targetBtn = document.getElementById('tool-arrow');
    } else if (e.key === '8' || e.code === 'Digit8' || e.code === 'Numpad8') {
      targetBtn = document.getElementById('btn-add-text');
    } else if (e.key === '9' || e.code === 'Digit9' || e.code === 'Numpad9') {
      targetBtn = document.getElementById('btn-undo');
    }

    if (targetBtn) {
      e.preventDefault();
      // Visual feedback: briefly highlight one-shot buttons when activated by keys
      if (targetBtn.id === 'btn-add-text' || targetBtn.id === 'btn-undo') {
        targetBtn.classList.add('active');
        setTimeout(() => targetBtn.classList.remove('active'), 150);
      }
      targetBtn.click();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.textLayers.length > 0 && state.selectedTextIndex !== -1) {
        const deletedLayer = state.textLayers.splice(state.selectedTextIndex, 1)[0];
        const deletedIndex = state.selectedTextIndex;
        state.selectedTextIndex = Math.max(-1, state.textLayers.length - 1);
        actionHistory.push({ type: 'delete-text', layer: deletedLayer, index: deletedIndex });
        syncTextUI();
        syncShapeUI();
        render();
      }
      else if (state.annotations.length > 0 && state.selectedAnnotationIndex !== -1) {
        const deletedAnn = state.annotations.splice(state.selectedAnnotationIndex, 1)[0];
        actionHistory.push({ type: 'delete-annotation', annotation: deletedAnn, index: state.selectedAnnotationIndex });
        state.selectedAnnotationIndex = -1;
        syncShapeUI();
        render();
      }
    } else if (e.key === 'Escape') {
      state.selectedTextIndex = -1;
      state.selectedAnnotationIndex = -1;
      syncTextUI();
      syncShapeUI();
      render();
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      isSpaceDown = false;
      if (!viewport.isPanning) mainArea.classList.remove('panning');
    }
  });

  mainArea.addEventListener('mousedown', e => {
    if (e.target.closest('.export-floating-bar') || 
        e.target.closest('.top-toolbar') || 
        e.target.closest('.zoom-controls') || 
        e.target.closest('#floating-shape-panel')) {
      return;
    }
    if (isSpaceDown || e.button === 1 || e.target === mainArea || currentTool === 'pan') {
      viewport.isPanning = true;
      viewport.lastX = e.clientX;
      viewport.lastY = e.clientY;
      mainArea.classList.add('panning');
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', e => {
    if (viewport.isPanning) {
      viewport.offsetX += e.clientX - viewport.lastX;
      viewport.offsetY += e.clientY - viewport.lastY;
      viewport.lastX = e.clientX;
      viewport.lastY = e.clientY;
      updateViewport();
    } else if (state.transform === 'interactive-tilt') {
      if (state.interactiveTiltLocked) return;
      const mainArea = document.querySelector('.main-area');
      if (mainArea) {
        const rect = mainArea.getBoundingClientRect();
        const mx = e.clientX - rect.left - rect.width / 2;
        const my = e.clientY - rect.top - rect.height / 2;
        
        const maxTilt = 16;
        const degX = -(my / (rect.height / 2)) * maxTilt;
        const degY = (mx / (rect.width / 2)) * maxTilt;
        
        state.interactiveTilt = {
          rx: Math.min(Math.max(-maxTilt, degX), maxTilt),
          ry: Math.min(Math.max(-maxTilt, degY), maxTilt)
        };
        render();
      }
    } else if (state.transform === 'split-slider') {
      if (state.splitSliderLocked) return;
      const mainArea = document.querySelector('.main-area');
      if (mainArea) {
        const rect = mainArea.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        let percentage = (mx / rect.width) * 100;
        state.splitSliderReveal = Math.min(Math.max(0, percentage), 100);
        render();
      }
    }
  });

  window.addEventListener('mouseleave', () => {
    if (state.transform === 'interactive-tilt') {
      if (state.interactiveTiltLocked) return;
      state.interactiveTilt = { rx: 0, ry: 0 };
      render();
    }
  });

  window.addEventListener('mouseup', e => {
    if (viewport.isPanning) {
      viewport.isPanning = false;
      if (!isSpaceDown) mainArea.classList.remove('panning');
    }
  });

  mainArea.addEventListener('click', e => {
    if (e.target.closest('.export-floating-bar') || 
        e.target.closest('.top-toolbar') || 
        e.target.closest('.zoom-controls') || 
        e.target.closest('#floating-shape-panel')) {
      return;
    }
    
    if (state.transform === 'interactive-tilt') {
      state.interactiveTiltLocked = !state.interactiveTiltLocked;
      render();
    } else if (state.transform === 'split-slider') {
      state.splitSliderLocked = !state.splitSliderLocked;
      render();
    }
  });

  mainArea.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = mainArea.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomIntensity = 0.001;
      const delta = -e.deltaY * zoomIntensity;
      const newZoom = Math.min(Math.max(0.05, viewport.zoom + delta), 5);

      const scaleRatio = newZoom / viewport.zoom;
      viewport.offsetX = mouseX - (mouseX - viewport.offsetX) * scaleRatio;
      viewport.offsetY = mouseY - (mouseY - viewport.offsetY) * scaleRatio;
      viewport.zoom = newZoom;

      updateViewport();
    } else {
      viewport.offsetX -= e.deltaX;
      viewport.offsetY -= e.deltaY;
      updateViewport();
    }
  }, { passive: false });
}

function fitToScreen() {
  const mainArea = document.querySelector('.main-area');
  const rect = mainArea.getBoundingClientRect();
  const padding = 60;
  const availW = rect.width - padding * 2;
  const availH = rect.height - padding * 2;

  const scaleW = availW / canvas.width;
  const scaleH = availH / canvas.height;

  viewport.zoom = Math.min(scaleW, scaleH, 1);
  if (viewport.zoom <= 0) viewport.zoom = 1;
  viewport.offsetX = (rect.width - canvas.width * viewport.zoom) / 2;
  viewport.offsetY = (rect.height - canvas.height * viewport.zoom) / 2;

  updateViewport();
}

function updateViewport() {
  const wrapper = document.querySelector('.canvas-wrapper');
  wrapper.style.transform = `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`;
  document.getElementById('zoom-val').textContent = Math.round(viewport.zoom * 100) + '%';
}

function renderBackgroundPresets() {
  const container = document.getElementById('bg-presets');
  container.innerHTML = '';
  const items = bgCollections[state.bgCategory];
  if (!items) return;

  items.forEach((bg, index) => {
    const div = document.createElement('div');
    div.className = 'bg-preset' + (index === state.bgIndex ? ' active' : '');

    if (bg.type === 'gradient') {
      const cls = bg.value.colors;
      if (bg.value.style === 'linear') {
        div.style.background = `linear-gradient(${bg.value.angle || 135}deg, ${cls.join(', ')})`;
      } else if (bg.value.style === 'radial') {
        div.style.background = `radial-gradient(circle, ${cls.join(', ')})`;
      } else if (bg.value.style === 'conic') {
        div.style.background = `conic-gradient(${cls.join(', ')})`;
      } else if (bg.value.style === 'mesh') {
        div.style.background = `radial-gradient(at 0% 0%, ${cls[1]} 0px, transparent 70%),
                                radial-gradient(at 100% 100%, ${cls[2]} 0px, transparent 70%),
                                radial-gradient(at 0% 100%, ${cls[3] || cls[1]} 0px, transparent 70%),
                                ${cls[0]}`;
      }
    } else if (bg.type === 'solid') {
      if (bg.value.length === 0) {
        div.style.background = 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 50% / 10px 10px';
      } else {
        div.style.background = bg.value[0];
        if (bg.value[0] === '#ffffff') div.style.border = '1px solid #e5e5e5';
      }
    } else if (bg.type === 'pattern') {
      if (bg.value.includes('.')) {
        div.style.backgroundImage = `url("${bg.value}")`;
        div.style.backgroundSize = 'cover';
        div.style.backgroundPosition = 'center';
      }
    }

    div.addEventListener('click', () => {
      document.querySelectorAll('.bg-preset').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
      state.bgIndex = index;
      applyBackgroundSelection();
      render();
    });
    container.appendChild(div);
  });
}

function applyBackgroundSelection() {
  const items = bgCollections[state.bgCategory];
  if (!items) return;
  const bg = items[state.bgIndex];
  state.bgType = bg.type;
  state.bgValue = bg.value;
}

// --- Image Loading ---
const loadDefaultPlaceholder = () => {
  originalImage = new Image();
  originalImage.onload = () => {
    offscreenCanvas.width = originalImage.width;
    offscreenCanvas.height = originalImage.height;
    offscreenCtx.imageSmoothingEnabled = true;
    offscreenCtx.imageSmoothingQuality = 'high';
    offscreenCtx.drawImage(originalImage, 0, 0);
    saveDrawState();
    render();
  };
  originalImage.src = 'docs/studio.png';
};

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['latestScreenshot'], (result) => {
    if (result && result.latestScreenshot) {
      originalImage = new Image();
      originalImage.onload = () => {
        offscreenCanvas.width = originalImage.width;
        offscreenCanvas.height = originalImage.height;
        offscreenCtx.imageSmoothingEnabled = true;
        offscreenCtx.imageSmoothingQuality = 'high';
        offscreenCtx.drawImage(originalImage, 0, 0);
        saveDrawState();
        render();
      };
      originalImage.src = result.latestScreenshot;
    } else {
      loadDefaultPlaceholder();
    }
  });
} else {
  loadDefaultPlaceholder();
}

function saveDrawState() {
  drawHistory.push(offscreenCanvas.toDataURL());
  if (drawHistory.length > 15) {
    drawHistory.shift();
  }
}

function pixelateRect(ctx, x, y, w, h, blockSize = 8) {
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(ctx.canvas.width, Math.ceil(x + w));
  const endY = Math.min(ctx.canvas.height, Math.ceil(y + h));
  const width = endX - startX;
  const height = endY - startY;

  if (width <= 0 || height <= 0) return;

  const imgData = ctx.getImageData(startX, startY, width, height);
  const data = imgData.data;

  for (let r = 0; r < height; r += blockSize) {
    for (let c = 0; c < width; c += blockSize) {
      const rIndex = r * width * 4 + c * 4;
      if (rIndex >= data.length) continue;
      
      const red = data[rIndex];
      const green = data[rIndex + 1];
      const blue = data[rIndex + 2];
      const alpha = data[rIndex + 3];

      for (let br = 0; br < blockSize && r + br < height; br++) {
        for (let bc = 0; bc < blockSize && c + bc < width; bc++) {
          const index = ((r + br) * width + (c + bc)) * 4;
          if (index < data.length) {
            data[index] = red;
            data[index + 1] = green;
            data[index + 2] = blue;
            data[index + 3] = alpha;
          }
        }
      }
    }
  }
  ctx.putImageData(imgData, startX, startY);
}

function mapMainToOffscreen(mainX, mainY) {
  const t = getTransformMatrix();
  try {
    const inv = t.m.inverse();
    const pt = new DOMPoint(mainX, mainY);
    const transformed = pt.matrixTransform(inv);
    return { x: transformed.x, y: transformed.y };
  } catch (err) {
    console.error("Matrix inversion failed:", err);
    return null;
  }
}

function undo() {
  if (actionHistory.length > 0) {
    const lastAction = actionHistory.pop();
    if (lastAction.type === 'annotation') {
      state.annotations.pop();
      render();
    } else if (lastAction.type === 'text') {
      state.textLayers.pop();
      state.selectedTextIndex = Math.max(-1, state.textLayers.length - 1);
      syncTextUI();
      render();
    } else if (lastAction.type === 'delete-text') {
      state.textLayers.splice(lastAction.index, 0, lastAction.layer);
      state.selectedTextIndex = lastAction.index;
      syncTextUI();
      render();
    } else if (lastAction.type === 'delete-annotation') {
      state.annotations.splice(lastAction.index, 0, lastAction.annotation);
      state.selectedAnnotationIndex = lastAction.index;
      render();
    } else if (lastAction.type === 'blur') {
      const img = new Image();
      img.onload = () => {
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.drawImage(img, 0, 0);
        render();
      };
      img.src = lastAction.prevImage;
    }
  }
}

// --- Main Render Engine ---

function drawBackground() {
  if (state.bgCategory === 'image' && state.bgImageObj) {
    const imgRatio = state.bgImageObj.width / state.bgImageObj.height;
    const canvasRatio = canvas.width / canvas.height;
    let drawW, drawH, drawX, drawY;
    if (imgRatio > canvasRatio) {
      drawH = canvas.height;
      drawW = drawH * imgRatio;
      drawX = (canvas.width - drawW) / 2;
      drawY = 0;
    } else {
      drawW = canvas.width;
      drawH = drawW / imgRatio;
      drawX = 0;
      drawY = (canvas.height - drawH) / 2;
    }
    ctx.drawImage(state.bgImageObj, drawX, drawY, drawW, drawH);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  else if (state.bgCategory === 'custom-gradient') {
    const w = canvas.width;
    const h = canvas.height;
    const g = state.customGradient;
    
    if (g.type === 'linear') {
      const angle = (g.angle || 135) * Math.PI / 180;
      const length = Math.sqrt(w * w + h * h) / 2;
      const cx = w / 2, cy = h / 2;
      const grad = ctx.createLinearGradient(
        cx - Math.cos(angle) * length, cy - Math.sin(angle) * length,
        cx + Math.cos(angle) * length, cy + Math.sin(angle) * length
      );
      grad.addColorStop(0, g.color1);
      grad.addColorStop(1, g.color2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (g.type === 'radial') {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
      grad.addColorStop(0, g.color1);
      grad.addColorStop(1, g.color2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }
  else if (state.bgType === 'gradient') {
    const w = canvas.width;
    const h = canvas.height;

    if (state.bgValue.style === 'linear') {
      const angle = (state.bgValue.angle || 135) * Math.PI / 180;
      const length = Math.sqrt(w * w + h * h) / 2;
      const cx = w / 2, cy = h / 2;
      const grad = ctx.createLinearGradient(
        cx - Math.cos(angle) * length, cy - Math.sin(angle) * length,
        cx + Math.cos(angle) * length, cy + Math.sin(angle) * length
      );
      state.bgValue.colors.forEach((c, i) => grad.addColorStop(i / (state.bgValue.colors.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    else if (state.bgValue.style === 'radial') {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
      state.bgValue.colors.forEach((c, i) => grad.addColorStop(i / (state.bgValue.colors.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    else if (state.bgValue.style === 'conic') {
      if (ctx.createConicGradient) {
        const grad = ctx.createConicGradient(0, w / 2, h / 2);
        state.bgValue.colors.forEach((c, i) => grad.addColorStop(i / (state.bgValue.colors.length - 1), c));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = state.bgValue.colors[0]; // fallback
        ctx.fillRect(0, 0, w, h);
      }
    }
    else if (state.bgValue.style === 'mesh') {
      // Base layer
      ctx.fillStyle = state.bgValue.colors[0];
      ctx.fillRect(0, 0, w, h);

      const spots = [
        { x: 0, y: 0, c: state.bgValue.colors[1] },
        { x: w, y: h, c: state.bgValue.colors[2] },
        { x: 0, y: h, c: state.bgValue.colors[3] || state.bgValue.colors[1] },
        { x: w, y: 0, c: state.bgValue.colors[4] || state.bgValue.colors[2] }
      ];

      spots.forEach(s => {
        if (!s.c) return;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, Math.max(w, h) * 0.9);
        grad.addColorStop(0, s.c);
        const cEnd = s.c.length === 7 ? s.c + '00' : 'rgba(255,255,255,0)'; // Simple hex alpha
        grad.addColorStop(1, cEnd);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });
    }
  }
  else if (state.bgType === 'solid') {
    if (state.bgValue.length > 0) {
      ctx.fillStyle = state.bgValue[0];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  else if (state.bgType === 'pattern') {
    if (state.bgValue.includes('.')) {
      if (!patternCache[state.bgValue]) {
        // Fallback color while loading
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.src = state.bgValue;
        img.onload = () => {
          patternCache[state.bgValue] = img;
          render(); // Re-render when image loaded
        };
        img.onerror = () => {
          console.warn('Failed to load pattern image:', state.bgValue);
        };
        return;
      }

      const img = patternCache[state.bgValue];

      // Calculate 'cover' geometry exactly like CSS background-size: cover
      const imgRatio = img.width / img.height;
      const canvasRatio = canvas.width / canvas.height;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > canvasRatio) {
        drawH = canvas.height;
        drawW = drawH * imgRatio;
        drawX = (canvas.width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = canvas.width;
        drawH = drawW / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawH) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
  }
}

function syncTextUI() {
  const layer = state.textLayers[state.selectedTextIndex];
  const panel = document.getElementById('text-engine-panel');
  if (!layer) {
    if (panel) panel.style.display = 'none';
    return;
  }
  if (panel) panel.style.display = 'flex';

  document.getElementById('param-text-content').value = layer.text;
  document.getElementById('param-text-font').value = layer.font;
  document.getElementById('param-textSize').value = layer.size;
  document.getElementById('val-textSize').textContent = layer.size + 'px';
  document.getElementById('param-text-color').value = layer.color || '#000000';
  // Shadows
  document.getElementById('param-text-shadow-color').value = layer.shadowColor || '#000000';
  document.querySelectorAll('.shadow-item').forEach(b => {
    b.classList.toggle('active', b.dataset.value === layer.shadowType);
  });

  state.textSize = layer.size;

  // Presets
  document.querySelectorAll('#param-text-preset .segment-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === layer.preset);
  });

  // Depth
  document.querySelectorAll('#param-text-depth .segment-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === layer.depth);
  });
}

function syncShapeUI() {
  const panel = document.getElementById('floating-shape-panel');
  if (!panel) return;
  
  const isShapeTool = currentTool === 'rect' || currentTool === 'arrow';
  const isSelectedShape = state.selectedAnnotationIndex !== -1 && 
                          (state.annotations[state.selectedAnnotationIndex].type === 'rect' || 
                           state.annotations[state.selectedAnnotationIndex].type === 'arrow');
  
  if (isShapeTool || isSelectedShape) {
    panel.style.display = 'flex';
    
    const fillContainer = document.getElementById('shape-fill-container');
    const radiusContainer = document.getElementById('shape-radius-container');
    
    if (isSelectedShape) {
      const ann = state.annotations[state.selectedAnnotationIndex];
      document.getElementById('shape-stroke-color').value = ann.color || '#000000';
      document.getElementById('shape-stroke-width').value = ann.size || 4;
      document.getElementById('val-shape-stroke-width').textContent = (ann.size || 4) + 'px';
      
      if (ann.type === 'rect') {
        fillContainer.style.display = 'flex';
        radiusContainer.style.display = 'flex';
        document.getElementById('shape-fill-color').value = (ann.fillColor && ann.fillColor !== 'transparent') ? ann.fillColor : '#ffffff';
        document.getElementById('shape-radius').value = ann.radius || 0;
        document.getElementById('val-shape-radius').textContent = (ann.radius || 0) + 'px';
      } else {
        fillContainer.style.display = 'none';
        radiusContainer.style.display = 'none';
      }
    } else {
      document.getElementById('shape-stroke-color').value = state.color || '#000000';
      document.getElementById('shape-stroke-width').value = state.size || 4;
      document.getElementById('val-shape-stroke-width').textContent = (state.size || 4) + 'px';
      
      if (currentTool === 'rect') {
        fillContainer.style.display = 'flex';
        radiusContainer.style.display = 'flex';
        document.getElementById('shape-fill-color').value = (state.fillColor && state.fillColor !== 'transparent') ? state.fillColor : '#ffffff';
        document.getElementById('shape-radius').value = state.shapeRadius || 0;
        document.getElementById('val-shape-radius').textContent = (state.shapeRadius || 0) + 'px';
      } else {
        fillContainer.style.display = 'none';
        radiusContainer.style.display = 'none';
      }
    }
  } else {
    panel.style.display = 'none';
  }
}

function updateTopToolbarVisibility() {
  // Only show top action bar stroke controls for Pen and Highlighter.
  // Rect and Arrow use the floating shape styling card on the right instead!
  const topBarDrawingTools = ['draw', 'highlight'];
  const showStrokeControls = topBarDrawingTools.includes(currentTool);
  
  const colorPicker = document.getElementById('param-color');
  const sizeSlider = document.getElementById('param-size');
  const divLeft = document.getElementById('stroke-divider-left');
  const divRight = document.getElementById('stroke-divider-right');
  
  const displayStyle = showStrokeControls ? 'inline-block' : 'none';
  const flexStyle = showStrokeControls ? 'block' : 'none';
  
  if (colorPicker) colorPicker.style.display = displayStyle;
  if (sizeSlider) sizeSlider.style.display = displayStyle;
  if (divLeft) divLeft.style.display = flexStyle;
  if (divRight) divRight.style.display = flexStyle;
}

function getTransformMatrix() {
  const pad = state.padding;
  let frameH = 0;
  if (state.frame === 'mac' || state.frame === 'windows') frameH = 44;
  else if (state.frame === 'browser') frameH = 72;
  else if (state.frame === 'minimal') frameH = 32;
  
  const innerW = offscreenCanvas.width;
  let innerH = offscreenCanvas.height;
  
  const isStack = state.transform.startsWith('stack-') || state.transform === 'exploded-layers' || state.transform === 'infinite-cascade';
  if (isStack) {
    if (state.viewportHeightMode === 'auto') {
      // For stack layouts, each card should default to a standard landscape aspect ratio.
      // If the screenshot is short, we use its full height.
      const standardH = Math.round(innerW * 0.65);
      innerH = Math.min(offscreenCanvas.height, standardH);
    } else {
      innerH = Math.min(offscreenCanvas.height, state.customViewportHeight || 800);
    }
  } else if (state.viewportHeightMode === 'custom') {
    innerH = Math.min(offscreenCanvas.height, state.customViewportHeight || 800);
  }

  const is3D = state.transform !== 'flat';

  let m = new DOMMatrix();
  let finalCanvasW, finalCanvasH;
  let contentScale = 1;

  let spacingX = 0, spacingY = 0;
  if (isStack) {
    const totalH = innerH + frameH;
    const Vx = innerW * 0.08; // Visual offset: 8% of width
    const Vy = totalH * 0.08; // Visual offset: 8% of total height
    
    // Scale differences for the back card (0.88 scale)
    const scaleDiffX = (1 - 0.88) * innerW;
    const scaleDiffY = (1 - 0.88) * totalH;

    if (state.transform === 'stack-flat-br') {
      spacingX = -Vx;
      spacingY = -Vy;
    } else if (state.transform === 'stack-flat-bl') {
      spacingX = Vx + scaleDiffX;
      spacingY = -Vy;
    } else if (state.transform === 'stack-flat-tr') {
      spacingX = -Vx;
      spacingY = Vy + scaleDiffY;
    } else if (state.transform === 'stack-flat-tl') {
      spacingX = Vx + scaleDiffX;
      spacingY = Vy + scaleDiffY;
    } else if (state.transform === 'stack-iso-left') { spacingX = -160; spacingY = -160; }
    else if (state.transform === 'stack-iso-right') { spacingX = 160; spacingY = -160; }
    else if (state.transform === 'stack-stand') { spacingX = -100; spacingY = -200; }
    else if (state.transform === 'exploded-layers') { spacingX = -200; spacingY = -200; }
    else if (state.transform === 'infinite-cascade') { spacingX = -240; spacingY = -240; }
  }

  const baseContentW = innerW + Math.abs(spacingX);
  const baseContentH = innerH + frameH + Math.abs(spacingY);
  const rawW = baseContentW + pad * 2;
  const rawH = baseContentH + pad * 2;

  const plat = platforms[state.platform];

  if (!plat) {
    // Default size
    finalCanvasW = rawW;
    finalCanvasH = rawH;
  } else {
    // Maintain 4K high-res. Instead of shrinking the screenshot to fit the platform dimension,
    // we expand the Canvas to match the Platform's Aspect Ratio around the 4K screenshot.
    const targetRatio = plat.width / plat.height;

    let candidateW = rawW;
    let candidateH = candidateW / targetRatio;

    if (candidateH < rawH) {
      candidateH = rawH;
      candidateW = candidateH * targetRatio;
    }

    finalCanvasW = candidateW;
    finalCanvasH = candidateH;
    contentScale = 1;
  }

  const cx = finalCanvasW / 2;
  const cy = finalCanvasH / 2;

  // Apply Positioning Sliders
  const shiftX = (state.offsetX / 100) * finalCanvasW;
  const shiftY = (state.offsetY / 100) * finalCanvasH;
  const userScale = state.scaleImage ? (state.scaleImage / 100) : 1;

  m = m.translate(cx + shiftX, cy + shiftY);
  m = m.scale(userScale, userScale);
  if (state.rotateImage) {
    m = m.rotate(state.rotateImage);
  }

  if (state.platform !== 'default') {
    m = m.scale(contentScale, contentScale);
  }

  if (state.transform.includes('iso-left')) {
    m = m.scale(0.60, 0.60);
    m = m.multiply(new DOMMatrix([0.866, 0.5, -0.866, 0.5, 0, 0]));
  } else if (state.transform.includes('iso-right')) {
    m = m.scale(0.60, 0.60);
    m = m.multiply(new DOMMatrix([0.866, -0.5, 0.866, 0.5, 0, 0]));
  } else if (state.transform === 'iso-top') {
    m = m.scale(0.60, 0.60);
    m = m.multiply(new DOMMatrix([0.707, 0.424, -0.707, 0.424, 0, 0]));
  } else if (state.transform.includes('stand')) {
    m = m.scale(0.70, 0.70);
    const skew = state.transform.includes('right') ? 0.25 : -0.25;
    m = m.multiply(new DOMMatrix([0.866, skew, 0, 1, 0, 0]));
  } else if (state.transform === 'curve-wide') {
    m = m.scale(0.85, 0.85);
  } else if (state.transform === 'reflect-3d') {
    m = m.scale(0.80, 0.80);
    m = m.translate(0, -100);
  } else if (state.transform.startsWith('stack-')) {
    m = m.scale(0.70, 0.70);
  } else if (state.transform === 'exploded-layers') {
    m = m.scale(0.60, 0.60);
    m = m.multiply(new DOMMatrix([0.866, 0.5, -0.866, 0.5, 0, 0]));
  } else if (state.transform === 'infinite-cascade') {
    m = m.scale(0.60, 0.60);
    m = m.multiply(new DOMMatrix([0.866, 0.5, -0.866, 0.5, 0, 0]));
  } else if (state.transform === 'interactive-tilt') {
    m = m.scale(0.80, 0.80);
  } else if (state.transform === 'glass-viewport') {
    m = m.scale(0.80, 0.80);
  } else if (state.transform === 'split-slider') {
    m = m.scale(0.80, 0.80);
  } else if (state.transform === 'neumorphic-extrusion') {
    m = m.scale(0.80, 0.80);
  }

  let drawX = -(innerW / 2) - (spacingX / 2);
  let drawY = -((innerH + frameH) / 2) - (spacingY / 2) + frameH;

  if (isStack) {
    const minX = Math.min(0, spacingX);
    const maxX = Math.max(innerW, spacingX + innerW * 0.88);
    drawX = -(minX + maxX) / 2;

    const minY = Math.min(-frameH, spacingY - frameH * 0.88);
    const maxY = Math.max(innerH, spacingY + innerH * 0.88);
    drawY = -(minY + maxY) / 2;
  }

  m = m.translate(drawX, drawY);

  return { m, w: finalCanvasW, h: finalCanvasH, drawX, drawY, innerW, innerH, frameH, cx, cy, contentScale };
}

function drawText(filterDepth, forExport = false) {
  state.textLayers.forEach((layer, index) => {
    if (!layer.text || layer.depth !== filterDepth || layer.visible === false || layer.editing) return;

    ctx.save();
    
    ctx.font = `${layer.preset === 'header' ? '800' : (layer.preset === 'sub' ? '600' : '400')} ${layer.size}px ${layer.font}`;
    ctx.fillStyle = layer.color || state.color || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Apply Shadows
    if (layer.shadowType && layer.shadowType !== 'none' && shadowPresets[layer.shadowType]) {
      const s = shadowPresets[layer.shadowType];
      ctx.shadowBlur = s.blur;
      ctx.shadowOffsetX = s.x;
      ctx.shadowOffsetY = s.y;
      ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.2)';
    }

    // Calculate position in pixels
    const x = (layer.x / 100) * canvas.width;
    const y = (layer.y / 100) * canvas.height;

    // Split text by lines
    const lines = layer.text.split('\n');
    const lineHeight = layer.size * 1.25;
    const totalHeight = lines.length * lineHeight;
    
    // Store bounding box for hit testing
    let maxW = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxW) maxW = w;
    });
    layer.rect = {
      x: x - maxW / 2 - 10,
      y: y - totalHeight / 2 - 10,
      w: maxW + 20,
      h: totalHeight + 20
    };

    // Draw each line
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y - (totalHeight / 2) + (i * lineHeight) + (lineHeight / 2));
    });

    // Draw Selection Highlight (WITHOUT SHADOW)
    if (!forExport && state.selectedTextIndex === index && (currentTool === 'text' || currentTool === 'select')) {
      ctx.shadowColor = 'transparent'; // Disable shadow for the highlight
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(layer.rect.x, layer.rect.y, layer.rect.w, layer.rect.h);
      ctx.setLineDash([]);
    }

    ctx.restore();
  });
}

function drawAnnotations() {
  state.annotations.forEach((ann, idx) => {
    if (ann.visible === false) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = ann.size;

    if (ann.type === 'draw') {
      if (!ann.points || ann.points.length < 2) { ctx.restore(); return; }
      ctx.beginPath();
      ctx.moveTo((ann.points[0].x / 100) * canvas.width, (ann.points[0].y / 100) * canvas.height);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo((ann.points[i].x / 100) * canvas.width, (ann.points[i].y / 100) * canvas.height);
      }
      ctx.stroke();
      
      // Draw Bounding Box selection outline
      if (state.selectedAnnotationIndex === idx && currentTool === 'select') {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        ann.points.forEach(pt => {
          const px = (pt.x / 100) * canvas.width;
          const py = (pt.y / 100) * canvas.height;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        });
        ctx.save();
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(minX - 6, minY - 6, (maxX - minX) + 12, (maxY - minY) + 12);
        ctx.restore();
      }
    } else if (ann.type === 'highlight') {
      if (!ann.points || ann.points.length < 2) { ctx.restore(); return; }
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = ann.color || '#ffeb3b';
      ctx.lineWidth = ann.size * 3;
      ctx.beginPath();
      ctx.moveTo((ann.points[0].x / 100) * canvas.width, (ann.points[0].y / 100) * canvas.height);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo((ann.points[i].x / 100) * canvas.width, (ann.points[i].y / 100) * canvas.height);
      }
      ctx.stroke();
      ctx.restore();

      // Draw Bounding Box selection outline for highlight
      if (state.selectedAnnotationIndex === idx && currentTool === 'select') {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        ann.points.forEach(pt => {
          const px = (pt.x / 100) * canvas.width;
          const py = (pt.y / 100) * canvas.height;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        });
        ctx.save();
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(minX - 6, minY - 6, (maxX - minX) + 12, (maxY - minY) + 12);
        ctx.restore();
      }
    } else if (ann.type === 'rect') {
      const x1 = (ann.x1 / 100) * canvas.width;
      const y1 = (ann.y1 / 100) * canvas.height;
      const x2 = (ann.x2 / 100) * canvas.width;
      const y2 = (ann.y2 / 100) * canvas.height;
      
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);
      const rad = ann.radius || 0;
      
      ctx.save();
      if (ann.fillColor && ann.fillColor !== 'transparent') {
        ctx.fillStyle = ann.fillColor;
        if (rad > 0) {
          roundRect(ctx, rx, ry, rw, rh, rad);
          ctx.fill();
        } else {
          ctx.fillRect(rx, ry, rw, rh);
        }
      }
      
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.size;
      if (rad > 0) {
        roundRect(ctx, rx, ry, rw, rh, rad);
        ctx.stroke();
      } else {
        ctx.strokeRect(rx, ry, rw, rh);
      }
      ctx.restore();
      
      // Draw selected border
      if (state.selectedAnnotationIndex === idx && currentTool === 'select') {
        ctx.save();
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(rx - 4, ry - 4, rw + 8, rh + 8);
        ctx.restore();
      }
    } else if (ann.type === 'arrow') {
      const x1 = (ann.x1 / 100) * canvas.width;
      const y1 = (ann.y1 / 100) * canvas.height;
      const x2 = (ann.x2 / 100) * canvas.width;
      const y2 = (ann.y2 / 100) * canvas.height;
      
      const headlen = 15 + ann.size;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const angle = Math.atan2(dy, dx);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      
      // Draw selected line highlight
      if (state.selectedAnnotationIndex === idx && currentTool === 'select') {
        ctx.save();
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  });
}

function project3DPoint(x, y, z, rx, ry, rz, D) {
  const radX = rx * Math.PI / 180;
  const radY = ry * Math.PI / 180;
  const radZ = rz * Math.PI / 180;

  // Rotate around X
  const y1 = y * Math.cos(radX) - z * Math.sin(radX);
  const z1 = y * Math.sin(radX) + z * Math.cos(radX);
  const x1 = x;

  // Rotate around Y
  const x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
  const z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);
  const y2 = y1;

  // Rotate around Z
  const x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
  const y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
  const z3 = z2;

  const denom = D - z3;
  const scale = D / (denom <= 0 ? 0.001 : denom);
  return {
    x: x3 * scale,
    y: y3 * scale,
    z: z3
  };
}

function drawPerspectiveQuad(drawCtx, img, W, H, rx, ry, rz, D, ctrX, ctrY, y3DOffset = 0) {
  const cols = 16;
  const rows = 16;
  
  const grid = [];
  for (let c = 0; c <= cols; c++) {
    grid[c] = [];
    const u = c / cols;
    const x_3d = -W / 2 + u * W;
    for (let r = 0; r <= rows; r++) {
      const v = r / rows;
      const y_3d = -H / 2 + v * H;
      const p_3d = project3DPoint(x_3d, y_3d + y3DOffset, 0, rx, ry, rz, D);
      grid[c][r] = { x: ctrX + p_3d.x, y: ctrY + p_3d.y };
    }
  }

  const drawTriangle = (sAx, sAy, sBx, sBy, sCx, sCy, dAx, dAy, dBx, dBy, dCx, dCy) => {
    drawCtx.save();
    
    // Smooth diagonal folding distortion using a tiny barycentric centroid expansion (1.5%) to close sub-pixel seams
    const cx = (dAx + dBx + dCx) / 3;
    const cy = (dAy + dBy + dCy) / 3;
    const exp = 0.015;
    
    drawCtx.beginPath();
    drawCtx.moveTo(dAx + (dAx - cx) * exp, dAy + (dAy - cy) * exp);
    drawCtx.lineTo(dBx + (dBx - cx) * exp, dBy + (dBy - cy) * exp);
    drawCtx.lineTo(dCx + (dCx - cx) * exp, dCy + (dCy - cy) * exp);
    drawCtx.closePath();
    drawCtx.clip();
    
    const den = (sAx - sCx) * (sBy - sCy) - (sBx - sCx) * (sAy - sCy);
    if (Math.abs(den) < 1e-6) {
      drawCtx.restore();
      return;
    }
    
    const a = ((dAx - dCx) * (sBy - sCy) - (dBx - dCx) * (sAy - sCy)) / den;
    const b = ((dAy - dCy) * (sBy - sCy) - (dBy - dCy) * (sAy - sCy)) / den;
    const c = ((dBx - dCx) * (sAx - sCx) - (dAx - dCx) * (sBx - sCx)) / den;
    const d = ((dBy - dCy) * (sAx - sCx) - (dAy - dCy) * (sBx - sCx)) / den;
    const e = dCx - a * sCx - c * sCy;
    const f = dCy - b * sCx - d * sCy;
    
    drawCtx.transform(a, b, c, d, e, f);
    drawCtx.drawImage(img, 0, 0);
    drawCtx.restore();
  };

  for (let c = 0; c < cols; c++) {
    const u0 = c / cols;
    const u1 = (c + 1) / cols;
    const sLx0 = u0 * W;
    const sLx1 = u1 * W;
    for (let r = 0; r < rows; r++) {
      const v0 = r / rows;
      const v1 = (r + 1) / rows;
      const sLy0 = v0 * H;
      const sLy1 = v1 * H;

      const p00 = grid[c][r];
      const p10 = grid[c+1][r];
      const p11 = grid[c+1][r+1];
      const p01 = grid[c][r+1];

      // Triangle 1: Top-Left, Top-Right, Bottom-Left
      drawTriangle(sLx0, sLy0, sLx1, sLy0, sLx0, sLy1, 
                   p00.x, p00.y, p10.x, p10.y, p01.x, p01.y);

      // Triangle 2: Top-Right, Bottom-Right, Bottom-Left
      drawTriangle(sLx1, sLy0, sLx1, sLy1, sLx0, sLy1, 
                   p10.x, p10.y, p11.x, p11.y, p01.x, p01.y);
    }
  }
}

function render(forExport = false) {
  if (!originalImage || !originalImage.complete || originalImage.naturalWidth === 0) return;

  const t = getTransformMatrix();
  canvas.width = t.w;
  canvas.height = t.h;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!viewport.initialized && canvas.width > 0) {
    viewport.initialized = true;
    fitToScreen();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  // Draw "Behind" Layers
  drawText('on', forExport);

  // Apply Transform for Mockup (Mockup drawing logic follows...)
  ctx.save();
  ctx.setTransform(t.m.a, t.m.b, t.m.c, t.m.d, t.m.e, t.m.f);

  const curDrawY = 0 - t.frameH;
  const totalInnerH = t.innerH + t.frameH;

  const isIso = state.transform.includes('iso');
  const isStand = state.transform.includes('stand');
  const isStack = state.transform.startsWith('stack-') || state.transform === 'exploded-layers' || state.transform === 'infinite-cascade';

  let baseDepth = 0;
  let dirX = 0, dirY = 0;
  let spacingX = 0, spacingY = 0;

  if (isStack) {
    const totalH = t.innerH + t.frameH;
    const Vx = t.innerW * 0.08;
    const Vy = totalH * 0.08;
    const scaleDiffX = (1 - 0.88) * t.innerW;
    const scaleDiffY = (1 - 0.88) * totalH;

    if (state.transform === 'stack-flat-br') { spacingX = -Vx; spacingY = -Vy; }
    else if (state.transform === 'stack-flat-bl') { spacingX = Vx + scaleDiffX; spacingY = -Vy; }
    else if (state.transform === 'stack-flat-tr') { spacingX = -Vx; spacingY = Vy + scaleDiffY; }
    else if (state.transform === 'stack-flat-tl') { spacingX = Vx + scaleDiffX; spacingY = Vy + scaleDiffY; }
    else if (state.transform === 'stack-iso-left') { spacingX = -160; spacingY = -160; }
    else if (state.transform === 'stack-iso-right') { spacingX = 160; spacingY = -160; }
    else if (state.transform === 'stack-stand') { spacingX = -100; spacingY = -200; }
    else if (state.transform === 'exploded-layers') { spacingX = -200; spacingY = -200; }
    else if (state.transform === 'infinite-cascade') { spacingX = -240; spacingY = -240; }
  }

  if (state.transform.includes('iso-left')) { baseDepth = 35; dirX = 1; dirY = 1; }
  else if (state.transform.includes('iso-right')) { baseDepth = 35; dirX = -1; dirY = 1; }
  else if (state.transform === 'iso-top') { baseDepth = 40; dirX = 0; dirY = 1.18; }
  else if (state.transform.includes('stand-left')) { baseDepth = 30; dirX = 1; dirY = -0.28; }
  else if (state.transform.includes('stand-right')) { baseDepth = 30; dirX = -1; dirY = 0.28; }
  else if (state.transform === 'custom') {
    baseDepth = state.custom3D.depth || 0;
    const angleRad = (state.custom3D.depthAngle || 135) * Math.PI / 180;
    dirX = Math.cos(angleRad);
    dirY = Math.sin(angleRad);
  }

  if (state.platform !== 'default') {
    baseDepth = Math.floor(baseDepth * 0.6);
  }

  const drawScreenshotLayer = (tX, tY, layerScale, tintOpacity, layerDepth, sectionIdx = null) => {
    ctx.save();
    ctx.translate(tX, tY);
    ctx.scale(layerScale, layerScale);

    const prevFilter = ctx.filter;
    if (state.transform === 'infinite-cascade' && sectionIdx !== null && sectionIdx > 0) {
      ctx.filter = `blur(${sectionIdx * 3.5}px)`;
    }

    // Draw Shadow
    ctx.save();
    if (state.shadow > 0 && state.custom3D.shadowType !== 'none') {
      const shadowIntensity = state.shadow / 100;
      const shadowType = state.custom3D.shadowType || 'floating';
      let shadowX = state.custom3D.shadowX !== undefined ? state.custom3D.shadowX : -30;
      let shadowY = state.custom3D.shadowY !== undefined ? state.custom3D.shadowY : 40;
      const shadowBlur = state.custom3D.shadowBlur !== undefined ? state.custom3D.shadowBlur : 70;

      if (isStack && (spacingX !== 0 || spacingY !== 0)) {
        // Project shadow in the direction of the stack offset so it casts onto the card behind it
        shadowX = Math.sign(spacingX) * Math.abs(shadowX);
        shadowY = Math.sign(spacingY) * Math.abs(shadowY);
      }

      // Translate shadow relative to 3D slab depth if active in standard layouts
      if (layerDepth > 0 && (isIso || isStand)) {
        ctx.translate(layerDepth * dirX, layerDepth * dirY);
      }

      const drawShadowLayer = (dx, dy, blur, opacity, color = '#000000') => {
        ctx.save();
        ctx.shadowColor = color.startsWith('rgba') ? color : `rgba(0, 0, 0, ${opacity})`;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetX = dx;
        ctx.shadowOffsetY = dy;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        if (state.transform === 'exploded-layers') {
          if (sectionIdx === 1) {
            roundRect(ctx, 0, 0, t.innerW * 0.25, t.innerH, state.radius);
          } else if (sectionIdx === 0) {
            roundRect(ctx, t.innerW * 0.30, t.innerH * 0.18, t.innerW * 0.55, t.innerH * 0.65, state.radius);
          } else {
            roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
          }
        } else {
          roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
        }
        ctx.fill();
        ctx.restore();
      };

      if (shadowType === 'default') {
        drawShadowLayer(shadowX, shadowY, shadowBlur, 0.30 * shadowIntensity);
      } else if (shadowType === 'floating') {
        drawShadowLayer(shadowX * 0.16, shadowY * 0.12, shadowBlur * 0.20, 0.10 * shadowIntensity);
        drawShadowLayer(shadowX * 0.50, shadowY * 0.50, shadowBlur * 0.57, 0.20 * shadowIntensity);
        drawShadowLayer(shadowX, shadowY, shadowBlur, 0.25 * shadowIntensity);
      } else if (shadowType === 'soft') {
        drawShadowLayer(shadowX * 0.50, shadowY * 0.50, shadowBlur * 0.50, 0.15 * shadowIntensity);
        drawShadowLayer(shadowX, shadowY, shadowBlur, 0.20 * shadowIntensity);
      } else if (shadowType === 'sharp') {
        drawShadowLayer(shadowX * 0.50, shadowY * 0.50, shadowBlur * 0.05, 0.25 * shadowIntensity);
        drawShadowLayer(shadowX, shadowY, shadowBlur * 0.05, 0.15 * shadowIntensity);
      } else if (shadowType === 'glow') {
        drawShadowLayer(shadowX * 0.50, shadowY * 0.50, shadowBlur * 0.40, 0.40 * shadowIntensity, `rgba(127, 0, 255, ${0.40 * shadowIntensity})`);
        drawShadowLayer(shadowX, shadowY, shadowBlur, 0.30 * shadowIntensity, `rgba(0, 240, 255, ${0.30 * shadowIntensity})`);
      }
    }
    ctx.restore();

    // Draw 3D Thickness Slab
    if (layerDepth > 0) {
      const isMac = state.frame === 'mac';
      ctx.fillStyle = isMac ? '#d4d4d8' : '#262626';
      for (let i = 1; i <= layerDepth; i++) {
        ctx.save();
        ctx.translate(i * dirX, i * dirY);
        roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
        ctx.fill();
        if (state.transform === 'custom') {
          ctx.fillStyle = `rgba(0, 0, 0, ${0.12 * (i / layerDepth)})`;
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.strokeStyle = isMac ? '#f4f4f5' : '#404040';
      ctx.lineWidth = 1;
      roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
      ctx.stroke();
    }

    // Clip area for screenshot
    ctx.save();
    if (state.transform === 'exploded-layers') {
      if (sectionIdx === 1) {
        roundRect(ctx, 0, 0, t.innerW * 0.25, t.innerH, state.radius);
      } else if (sectionIdx === 0) {
        roundRect(ctx, t.innerW * 0.30, t.innerH * 0.18, t.innerW * 0.55, t.innerH * 0.65, state.radius);
      } else {
        roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
      }
    } else {
      roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
    }
    ctx.clip();

    // Window Frame
    if (state.frame !== 'none' && (state.transform !== 'exploded-layers' || sectionIdx === 2)) {
      const isMac = state.frame === 'mac';
      const isWin = state.frame === 'windows';
      const isBrowser = state.frame === 'browser';
      const isMinimal = state.frame === 'minimal';

      if (isMac || isWin || isBrowser || isMinimal) {
        ctx.fillStyle = (isMac || isBrowser || isMinimal) ? '#FAFAFA' : '#1A1A1A';
        ctx.fillRect(0, curDrawY, t.innerW, t.frameH);
      }

      if (isMac) {
        ctx.fillStyle = '#E5E5E5';
        ctx.fillRect(0, curDrawY + t.frameH - 1, t.innerW, 1);
        const dotY = curDrawY + 22;
        const spacing = 22;
        ctx.fillStyle = '#FF5F56'; ctx.beginPath(); ctx.arc(22, dotY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFBD2E'; ctx.beginPath(); ctx.arc(22 + spacing, dotY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#27C93F'; ctx.beginPath(); ctx.arc(22 + spacing * 2, dotY, 6, 0, Math.PI * 2); ctx.fill();
      } else if (isWin) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px sans-serif';
        ctx.fillText('—  ☐  ✕', t.innerW - 75, curDrawY + 28);
      } else if (isBrowser) {
        const barY = curDrawY + 36;
        ctx.fillStyle = '#E8EAED';
        ctx.beginPath();
        roundRect(ctx, 80, barY - 14, t.innerW - 160, 28, 14);
        ctx.fill();
        ctx.fillStyle = '#9AA0A6';
        ctx.font = '12px sans-serif';
        ctx.fillText('google.com', 100, barY + 4);
        ctx.fillStyle = '#BDC1C6';
        ctx.beginPath(); ctx.arc(25, barY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(43, barY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(61, barY, 4, 0, Math.PI * 2); ctx.fill();
      } else if (isMinimal) {
        ctx.fillStyle = '#E0E0E0';
        ctx.beginPath();
        roundRect(ctx, t.innerW / 2 - 30, curDrawY + 12, 60, 8, 4);
        ctx.fill();
      }
    }

    // Render Image (Dynamic Viewport Scroll & Height Slicing or Section Stacking)
    if (state.transform === 'exploded-layers') {
      if (sectionIdx === 2) {
        ctx.drawImage(offscreenCanvas, 0, 0, t.innerW, t.innerH);
      } else if (sectionIdx === 1) {
        const cropW = offscreenCanvas.width * 0.25;
        const targetW = t.innerW * 0.25;
        ctx.drawImage(offscreenCanvas, 0, 0, cropW, offscreenCanvas.height, 0, 0, targetW, t.innerH);
      } else if (sectionIdx === 0) {
        const cropX = offscreenCanvas.width * 0.30;
        const cropY = offscreenCanvas.height * 0.18;
        const cropW = offscreenCanvas.width * 0.55;
        const cropH = offscreenCanvas.height * 0.65;
        
        const targetX = t.innerW * 0.30;
        const targetY = t.innerH * 0.18;
        const targetW = t.innerW * 0.55;
        const targetH = t.innerH * 0.65;
        
        ctx.drawImage(offscreenCanvas, cropX, cropY, cropW, cropH, targetX, targetY, targetW, targetH);
      }
    } else if (state.transform === 'infinite-cascade') {
      ctx.drawImage(offscreenCanvas, 0, 0, t.innerW, t.innerH);
    } else if (sectionIdx !== null) {
      // Stacking sections: distribute the slices evenly across the height of the screenshot
      const sectionH = t.innerH;
      const maxScrollY = Math.max(0, offscreenCanvas.height - sectionH);
      const currentScrollY = maxScrollY > 0 ? (sectionIdx / 2) * maxScrollY : 0;
      ctx.drawImage(offscreenCanvas, 0, currentScrollY, offscreenCanvas.width, Math.min(offscreenCanvas.height - currentScrollY, sectionH), 0, 0, t.innerW, t.innerH);
    } else if (state.viewportHeightMode === 'custom') {
      const maxScroll = Math.max(0, offscreenCanvas.height - t.innerH);
      const currentScrollY = maxScroll * (state.webpageScrollOffset / 100);
      ctx.drawImage(offscreenCanvas, 0, currentScrollY, offscreenCanvas.width, Math.min(offscreenCanvas.height - currentScrollY, t.innerH), 0, 0, t.innerW, t.innerH);
    } else {
      // Auto Height (Default size)
      ctx.drawImage(offscreenCanvas, 0, 0, t.innerW, t.innerH);
    }

    // Gloss Reflection Overlay
    const glossVal = state.transform === 'custom' ? (state.custom3D.gloss || 0) : 0;
    if (glossVal > 0) {
      ctx.save();
      const glossGrad = ctx.createLinearGradient(0, curDrawY, t.innerW, totalInnerH);
      const glossAlpha = (glossVal / 100) * 0.35;
      glossGrad.addColorStop(0, `rgba(255, 255, 255, ${glossAlpha})`);
      glossGrad.addColorStop(0.3, `rgba(255, 255, 255, ${glossAlpha * 0.8})`);
      glossGrad.addColorStop(0.31, `rgba(255, 255, 255, 0)`);
      glossGrad.addColorStop(0.6, `rgba(255, 255, 255, 0)`);
      glossGrad.addColorStop(0.61, `rgba(255, 255, 255, ${glossAlpha * 0.3})`);
      glossGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
      
      ctx.fillStyle = glossGrad;
      ctx.fillRect(0, curDrawY, t.innerW, totalInnerH);
      ctx.restore();
    }

    if (tintOpacity > 0) {
      ctx.fillStyle = `rgba(0,0,0,${tintOpacity})`;
      ctx.fillRect(0, curDrawY, t.innerW, totalInnerH);
    }

    ctx.restore(); // Restore clip

    if (state.bgType !== 'transparent') {
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      if (state.transform === 'exploded-layers') {
        if (sectionIdx === 1) {
          roundRect(ctx, 0, 0, t.innerW * 0.25, t.innerH, state.radius);
        } else if (sectionIdx === 0) {
          roundRect(ctx, t.innerW * 0.30, t.innerH * 0.18, t.innerW * 0.55, t.innerH * 0.65, state.radius);
        } else {
          roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
        }
      } else {
        roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
      }
      ctx.stroke();
    }

    ctx.restore();
    ctx.filter = prevFilter || 'none';
  };

  if (state.transform === 'infinite-cascade') {
    drawScreenshotLayer(spacingX, spacingY, 0.70, 0.70, baseDepth, 3); // Level 3 (backmost)
    drawScreenshotLayer(spacingX * 0.66, spacingY * 0.66, 0.80, 0.45, baseDepth, 2); // Level 2
    drawScreenshotLayer(spacingX * 0.33, spacingY * 0.33, 0.90, 0.20, baseDepth, 1); // Level 1
    drawScreenshotLayer(0, 0, 1.0, 0, baseDepth, 0); // Foreground
  } else if (isStack) {
    drawScreenshotLayer(spacingX, spacingY, 0.88, 0.45, baseDepth, 2); // Section 3 (back)
    drawScreenshotLayer(spacingX * 0.5, spacingY * 0.5, 0.94, 0.20, baseDepth, 1); // Section 2 (mid)
    drawScreenshotLayer(0, 0, 1.0, 0, baseDepth, 0); // Section 1 (front)
  } else if (state.transform === 'split-slider') {
    const reveal = state.splitSliderReveal !== undefined ? state.splitSliderReveal : 50;
    const splitX = (reveal / 100) * t.innerW;

    // Draw grayscale base
    ctx.save();
    ctx.filter = 'grayscale(100%)';
    drawScreenshotLayer(0, 0, 1.0, 0, 0);
    ctx.restore();

    // Draw colored reveal overlay
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, curDrawY, splitX, totalInnerH);
    ctx.clip();
    drawScreenshotLayer(0, 0, 1.0, 0, 0);
    ctx.restore();

    // Draw vertical drag handle
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    ctx.moveTo(splitX, curDrawY);
    ctx.lineTo(splitX, curDrawY + totalInnerH);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(splitX, curDrawY + totalInnerH / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  } else if (state.transform === 'neumorphic-extrusion') {
    const W = t.innerW;
    const H = totalInnerH;
    const fPad = 24;

    // Draw top-left highlight shadow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.88)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = -12;
    ctx.shadowOffsetY = -12;
    ctx.fillStyle = '#e0e8f0';
    roundRect(ctx, -fPad, curDrawY - fPad, W + fPad * 2, H + fPad * 2, state.radius + 12);
    ctx.fill();
    ctx.restore();

    // Draw bottom-right soft shadow
    ctx.save();
    ctx.shadowColor = 'rgba(160, 175, 192, 0.6)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 12;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#e0e8f0';
    roundRect(ctx, -fPad, curDrawY - fPad, W + fPad * 2, H + fPad * 2, state.radius + 12);
    ctx.fill();
    ctx.restore();

    // Draw bezel overlay stroke
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, -fPad, curDrawY - fPad, W + fPad * 2, H + fPad * 2, state.radius + 12);
    ctx.stroke();
    ctx.restore();

    // Draw screenshot card flat
    const prevShadow = state.shadow;
    state.shadow = 0;
    drawScreenshotLayer(0, 0, 1.0, 0, 0);
    state.shadow = prevShadow;

    // Bezel inset stroke
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 0, curDrawY, W, H, state.radius);
    ctx.stroke();
    ctx.restore();
  } else if (state.transform === 'glass-viewport') {
    const glassPadding = 48;
    
    // Draw frosted glass background blur
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    ctx.beginPath();
    const p0_gl = t.m.transformPoint({ x: -glassPadding, y: curDrawY - glassPadding });
    const p1_gl = t.m.transformPoint({ x: t.innerW + glassPadding, y: curDrawY - glassPadding });
    const p2_gl = t.m.transformPoint({ x: t.innerW + glassPadding, y: curDrawY + totalInnerH + glassPadding });
    const p3_gl = t.m.transformPoint({ x: -glassPadding, y: curDrawY + totalInnerH + glassPadding });
    
    ctx.moveTo(p0_gl.x, p0_gl.y);
    ctx.lineTo(p1_gl.x, p1_gl.y);
    ctx.lineTo(p2_gl.x, p2_gl.y);
    ctx.lineTo(p3_gl.x, p3_gl.y);
    ctx.closePath();
    ctx.clip();
    
    ctx.filter = 'blur(28px)';
    drawBackground();
    ctx.restore();
    
    // Draw glass frame border and specular details
    ctx.save();
    const r_gl = state.radius + 10;
    ctx.shadowColor = `rgba(0, 0, 0, ${0.28 * (state.shadow / 100)})`;
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 24;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, -glassPadding, curDrawY - glassPadding, t.innerW + glassPadding * 2, totalInnerH + glassPadding * 2, r_gl);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    
    // Draw mockup window flat on top of the glass viewport
    drawScreenshotLayer(0, 0, 1.0, 0, baseDepth);
  } else if (state.transform === 'curve-wide') {
    const slices = 40;
    const sliceW = t.innerW / slices;
    for (let i = 0; i < slices; i++) {
      const offset = Math.sin((i / slices) * Math.PI) * 40;
      const scale = 1 + (offset / 500);
      ctx.save();
      ctx.translate(i * sliceW, offset);
      ctx.scale(1, scale);
      ctx.beginPath();
      ctx.rect(0, curDrawY, sliceW + 1, totalInnerH);
      ctx.clip();
      ctx.drawImage(offscreenCanvas, -i * sliceW, 0);
      ctx.restore();
    }
  } else if (state.transform === 'reflect-3d') {
    drawScreenshotLayer(0, 0, 1, 0, 0);
    ctx.save();
    ctx.translate(0, (totalInnerH * 2.15) - t.frameH);
    ctx.scale(1, -1);
    const grad = ctx.createLinearGradient(0, curDrawY, 0, curDrawY + totalInnerH);
    grad.addColorStop(0, 'rgba(0,0,0,0.4)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    ctx.save();
    roundRect(ctx, 0, curDrawY, t.innerW, totalInnerH, state.radius);
    ctx.clip();
    ctx.drawImage(offscreenCanvas, 0, 0);
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, curDrawY, t.innerW, totalInnerH);
    ctx.restore();
    ctx.restore();
  } else if (state.transform === 'custom' || state.transform === 'interactive-tilt') {
    // True 3D perspective rendering with multi-layered shadows and edge definitions
    const W = t.innerW;
    const H = totalInnerH;
    const D = state.transform === 'interactive-tilt' ? 1000 : (state.custom3D.perspective || 1000);
    const rx = state.transform === 'interactive-tilt' ? (state.interactiveTilt?.rx || 0) : (state.custom3D.rotateX || 0);
    const ry = state.transform === 'interactive-tilt' ? (state.interactiveTilt?.ry || 0) : (state.custom3D.rotateY || 0);
    const rz = state.transform === 'interactive-tilt' ? 0 : (state.custom3D.rotateZ || 0);

    // Card center in the flat transformed coordinates
    const ctrX = W / 2;
    const ctrY = (t.innerH - t.frameH) / 2;

    // Project front face corners (z = 0) relative to card center
    const p0_3d = project3DPoint(-W / 2, -H / 2, 0, rx, ry, rz, D);
    const p1_3d = project3DPoint(W / 2, -H / 2, 0, rx, ry, rz, D);
    const p2_3d = project3DPoint(W / 2, H / 2, 0, rx, ry, rz, D);
    const p3_3d = project3DPoint(-W / 2, H / 2, 0, rx, ry, rz, D);

    const p0 = { x: ctrX + p0_3d.x, y: ctrY + p0_3d.y };
    const p1 = { x: ctrX + p1_3d.x, y: ctrY + p1_3d.y };
    const p2 = { x: ctrX + p2_3d.x, y: ctrY + p2_3d.y };
    const p3 = { x: ctrX + p3_3d.x, y: ctrY + p3_3d.y };

    // Render the completely flat card layout onto a temporary offscreen canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = W;
    tempCanvas.height = H;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';

    tempCtx.save();
    // Shift top-left drawing starting coordinate to match tempCanvas bounds
    tempCtx.translate(0, t.frameH);

    // Temporarily redirect drawing functions to draw flat card on tempCanvas
    const mainCtx = ctx;
    ctx = tempCtx;

    const prevShadow = state.shadow;
    state.shadow = 0; // Bypasses duplicate flat shadows

    drawScreenshotLayer(0, 0, 1, 0, 0);

    state.shadow = prevShadow;
    ctx = mainCtx; // Restore main context
    tempCtx.restore();

    // Draw multi-layered drop shadows (based on state.custom3D.shadowType)
    const drawShadowLayer = (dx, dy, blur, opacity, color = '#000000') => {
      ctx.save();
      ctx.shadowColor = color.startsWith('rgba') ? color : `rgba(0, 0, 0, ${opacity})`;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = dx;
      ctx.shadowOffsetY = dy;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    if (state.shadow > 0 && state.custom3D.shadowType !== 'none') {
      const shadowIntensity = state.shadow / 100;
      const shadowType = state.custom3D.shadowType || 'floating';
      const shadowX = state.custom3D.shadowX !== undefined ? state.custom3D.shadowX : -30;
      const shadowY = state.custom3D.shadowY !== undefined ? state.custom3D.shadowY : 40;
      const shadowBlur = state.custom3D.shadowBlur !== undefined ? state.custom3D.shadowBlur : 70;

      if (shadowType === 'default') {
        drawShadowLayer(shadowX, shadowY, shadowBlur, 0.30 * shadowIntensity);
      } else if (shadowType === 'floating') {
        drawShadowLayer(shadowX * 0.16, shadowY * 0.12, shadowBlur * 0.20, 0.10 * shadowIntensity);
        drawShadowLayer(shadowX * 0.50, shadowY * 0.50, shadowBlur * 0.57, 0.20 * shadowIntensity);
        drawShadowLayer(shadowX, shadowY, shadowBlur, 0.25 * shadowIntensity);
      } else if (shadowType === 'soft') {
        drawShadowLayer(shadowX * 0.50, shadowY * 0.50, shadowBlur * 0.50, 0.15 * shadowIntensity);
        drawShadowLayer(shadowX, shadowY, shadowBlur, 0.20 * shadowIntensity);
      } else if (shadowType === 'sharp') {
        drawShadowLayer(shadowX * 0.50, shadowY * 0.50, shadowBlur * 0.05, 0.25 * shadowIntensity);
        drawShadowLayer(shadowX, shadowY, shadowBlur * 0.05, 0.15 * shadowIntensity);
      } else if (shadowType === 'glow') {
        drawShadowLayer(shadowX * 0.50, shadowY * 0.50, shadowBlur * 0.40, 0.40 * shadowIntensity, `rgba(127, 0, 255, ${0.40 * shadowIntensity})`);
        drawShadowLayer(shadowX, shadowY, shadowBlur, 0.30 * shadowIntensity, `rgba(0, 240, 255, ${0.30 * shadowIntensity})`);
      }
    }

    // Render perspective-projected card onto main canvas using high-fidelity grid subdivision
    drawPerspectiveQuad(ctx, tempCanvas, W, H, rx, ry, rz, D, ctrX, ctrY);

    // Draw semi-transparent border edge highlight catches
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  } else {
    drawScreenshotLayer(0, 0, 1, 0, baseDepth);
  }

  ctx.restore();

  drawAnnotations();

  if (!forExport && isDrawing && currentAnnotation && currentAnnotation.type === 'blur') {
    ctx.save();
    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.fillStyle = 'rgba(0, 102, 255, 0.15)';
    
    const x1 = (currentAnnotation.x1 / 100) * canvas.width;
    const y1 = (currentAnnotation.y1 / 100) * canvas.height;
    const x2 = (currentAnnotation.x2 / 100) * canvas.width;
    const y2 = (currentAnnotation.y2 / 100) * canvas.height;
    
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.restore();
  }

  // Draw "Above" Layers (On Top)
  drawText('off', forExport);

  if (!forExport) {
    renderLayersPanel();
    
    // Draw Interactive Tilt Lock/Unlock Badge on the canvas viewport
    if (state.transform === 'interactive-tilt' || state.transform === 'split-slider') {
      ctx.save();
      // Draw in absolute screen coordinates
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      
      // Text shadow for high readability on custom gradients/backgrounds
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      
      let text = '';
      if (state.transform === 'interactive-tilt') {
        text = state.interactiveTiltLocked ? '🔒 Tilt Locked (Click to unlock)' : '🔓 Tilt Unlocked (Click to lock)';
      } else {
        text = state.splitSliderLocked ? '🔒 Slider Locked (Click to unlock)' : '🔓 Slider Unlocked (Click to lock)';
      }
      ctx.fillText(text, canvas.width - 60, 40);
      ctx.restore();
    }
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// --- Interaction / Drawing Math ---
let isDraggingText = false;
let dragOffset = { x: 0, y: 0 };
let isDraggingAnnotation = false;
let dragOffsetAnn = { x: 0, y: 0 };

function hitTestAnnotation(ann, pos) {
  if (ann.visible === false) return false;
  const threshold = Math.max(12, ann.size * 2);
  
  if (ann.type === 'draw' || ann.type === 'highlight') {
    if (!ann.points) return false;
    for (let pt of ann.points) {
      const px = (pt.x / 100) * canvas.width;
      const py = (pt.y / 100) * canvas.height;
      const dist = Math.hypot(pos.x - px, pos.y - py);
      if (dist <= threshold) return true;
    }
  } else if (ann.type === 'rect') {
    const x1 = (ann.x1 / 100) * canvas.width;
    const y1 = (ann.y1 / 100) * canvas.height;
    const x2 = (ann.x2 / 100) * canvas.width;
    const y2 = (ann.y2 / 100) * canvas.height;
    
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    
    if (pos.y >= top - threshold && pos.y <= bottom + threshold) {
      if (Math.abs(pos.x - left) <= threshold || Math.abs(pos.x - right) <= threshold) return true;
    }
    if (pos.x >= left - threshold && pos.x <= right + threshold) {
      if (Math.abs(pos.y - top) <= threshold || Math.abs(pos.y - bottom) <= threshold) return true;
    }
  } else if (ann.type === 'arrow') {
    const x1 = (ann.x1 / 100) * canvas.width;
    const y1 = (ann.y1 / 100) * canvas.height;
    const x2 = (ann.x2 / 100) * canvas.width;
    const y2 = (ann.y2 / 100) * canvas.height;
    
    const l2 = (x2 - x1)**2 + (y2 - y1)**2;
    if (l2 === 0) return Math.hypot(pos.x - x1, pos.y - y1) <= threshold;
    let t = ((pos.x - x1) * (x2 - x1) + (pos.y - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    if (Math.hypot(pos.x - projX, pos.y - projY) <= threshold) return true;
  }
  return false;
}

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousedown', (e) => {
  if (!originalImage || currentTool === 'pan') return;
  e.stopPropagation();
  e.preventDefault();

  const rawPos = getMousePos(e);

  // Check Select Tool
  if (currentTool === 'select') {
    let hitTextIndex = -1;
    for (let i = state.textLayers.length - 1; i >= 0; i--) {
      const layer = state.textLayers[i];
      if (layer.rect && 
          rawPos.x >= layer.rect.x && rawPos.x <= layer.rect.x + layer.rect.w &&
          rawPos.y >= layer.rect.y && rawPos.y <= layer.rect.y + layer.rect.h) {
        hitTextIndex = i;
        break;
      }
    }

    if (hitTextIndex !== -1) {
      state.selectedTextIndex = hitTextIndex;
      state.selectedAnnotationIndex = -1;
      isDraggingText = true;
      const layer = state.textLayers[hitTextIndex];
      const layerPX = (layer.x / 100) * canvas.width;
      const layerPY = (layer.y / 100) * canvas.height;
      dragOffset.x = rawPos.x - layerPX;
      dragOffset.y = rawPos.y - layerPY;
      syncTextUI();
      syncShapeUI();
      render();
      return;
    }

    let hitAnnIndex = -1;
    for (let i = state.annotations.length - 1; i >= 0; i--) {
      if (hitTestAnnotation(state.annotations[i], rawPos)) {
        hitAnnIndex = i;
        break;
      }
    }

    if (hitAnnIndex !== -1) {
      state.selectedAnnotationIndex = hitAnnIndex;
      state.selectedTextIndex = -1;
      isDraggingAnnotation = true;
      dragOffsetAnn.x = rawPos.x;
      dragOffsetAnn.y = rawPos.y;
      
      syncTextUI();
      syncShapeUI();
      
      const ann = state.annotations[hitAnnIndex];
      document.getElementById('param-color').value = ann.color || '#000000';
      document.getElementById('param-size').value = ann.size || 4;
      
      render();
      return;
    }

    state.selectedTextIndex = -1;
    state.selectedAnnotationIndex = -1;
    syncTextUI();
    syncShapeUI();
    render();
    return;
  }

  // Check Text Tool
  if (currentTool === 'text') {
    let hitIndex = -1;
    for (let i = state.textLayers.length - 1; i >= 0; i--) {
      const layer = state.textLayers[i];
      if (layer.rect && 
          rawPos.x >= layer.rect.x && rawPos.x <= layer.rect.x + layer.rect.w &&
          rawPos.y >= layer.rect.y && rawPos.y <= layer.rect.y + layer.rect.h) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== -1) {
      state.selectedTextIndex = hitIndex;
      isDraggingText = true;
      const layer = state.textLayers[hitIndex];
      const layerPX = (layer.x / 100) * canvas.width;
      const layerPY = (layer.y / 100) * canvas.height;
      dragOffset.x = rawPos.x - layerPX;
      dragOffset.y = rawPos.y - layerPY;
      syncTextUI();
      render();
      return;
    } else {
      state.selectedTextIndex = -1;
      syncTextUI();
      render();
      return;
    }
  }

  // Annotation Start
  if (['draw', 'rect', 'arrow', 'highlight'].includes(currentTool)) {
    isDrawing = true;
    const px = (rawPos.x / canvas.width) * 100;
    const py = (rawPos.y / canvas.height) * 100;
    
    currentAnnotation = {
      type: currentTool,
      color: currentTool === 'highlight' && state.color === '#000000' ? '#ffeb3b' : state.color,
      size: state.size,
      x1: px, y1: py,
      x2: px, y2: py,
      points: [{ x: px, y: py }]
    };
    
    if (currentTool === 'rect') {
      currentAnnotation.fillColor = state.fillColor || 'transparent';
      currentAnnotation.radius = state.shapeRadius || 0;
    }
    
    state.annotations.push(currentAnnotation);
  } else if (currentTool === 'blur') {
    isDrawing = true;
    const px = (rawPos.x / canvas.width) * 100;
    const py = (rawPos.y / canvas.height) * 100;
    
    currentAnnotation = {
      type: 'blur',
      x1: px, y1: py,
      x2: px, y2: py
    };
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rawPos = getMousePos(e);

  if (isDraggingText) {
    const layer = state.textLayers[state.selectedTextIndex];
    if (layer) {
      const newPX = rawPos.x - dragOffset.x;
      const newPY = rawPos.y - dragOffset.y;
      layer.x = (newPX / canvas.width) * 100;
      layer.y = (newPY / canvas.height) * 100;
      render();
    }
    return;
  }

  if (isDraggingAnnotation && state.selectedAnnotationIndex !== -1) {
    const ann = state.annotations[state.selectedAnnotationIndex];
    if (ann) {
      const dx = ((rawPos.x - dragOffsetAnn.x) / canvas.width) * 100;
      const dy = ((rawPos.y - dragOffsetAnn.y) / canvas.height) * 100;
      
      if (ann.type === 'draw' || ann.type === 'highlight') {
        ann.points.forEach(pt => {
          pt.x += dx;
          pt.y += dy;
        });
      } else {
        ann.x1 += dx;
        ann.y1 += dy;
        ann.x2 += dx;
        ann.y2 += dy;
      }
      dragOffsetAnn.x = rawPos.x;
      dragOffsetAnn.y = rawPos.y;
      render();
    }
    return;
  }

  // Dynamic canvas cursor feedback for Select tool when hovering over layers
  if (currentTool === 'select' && !isDraggingText && !isDraggingAnnotation) {
    let hovered = false;
    
    // Check if hovering over any text layer
    for (let i = state.textLayers.length - 1; i >= 0; i--) {
      const layer = state.textLayers[i];
      if (layer.rect &&
          rawPos.x >= layer.rect.x && rawPos.x <= layer.rect.x + layer.rect.w &&
          rawPos.y >= layer.rect.y && rawPos.y <= layer.rect.y + layer.rect.h) {
        hovered = true;
        break;
      }
    }
    
    // Check if hovering over any annotation
    if (!hovered) {
      for (let i = state.annotations.length - 1; i >= 0; i--) {
        if (hitTestAnnotation(state.annotations[i], rawPos)) {
          hovered = true;
          break;
        }
      }
    }
    
    canvas.style.cursor = hovered ? 'move' : 'default';
  }

  if (!isDrawing || !currentAnnotation) return;

  const px = (rawPos.x / canvas.width) * 100;
  const py = (rawPos.y / canvas.height) * 100;

  if (currentAnnotation.type === 'draw' || currentAnnotation.type === 'highlight') {
    currentAnnotation.points.push({ x: px, y: py });
  } else {
    currentAnnotation.x2 = px;
    currentAnnotation.y2 = py;
  }
  render();
});

function handleDrawingEnd() {
  if (isDraggingText || isDraggingAnnotation) {
    isDraggingText = false;
    isDraggingAnnotation = false;
    render();
    return;
  }

  if (!isDrawing || !currentAnnotation) return;

  if (currentAnnotation.type === 'blur') {
    const x1 = (currentAnnotation.x1 / 100) * canvas.width;
    const y1 = (currentAnnotation.y1 / 100) * canvas.height;
    const x2 = (currentAnnotation.x2 / 100) * canvas.width;
    const y2 = (currentAnnotation.y2 / 100) * canvas.height;

    const p1 = mapMainToOffscreen(x1, y1);
    const p2 = mapMainToOffscreen(x2, y2);

    if (p1 && p2) {
      const ox = Math.min(p1.x, p2.x);
      const oy = Math.min(p1.y, p2.y);
      const ow = Math.abs(p1.x - p2.x);
      const oh = Math.abs(p1.y - p2.y);

      if (ow > 1 && oh > 1) {
        const prevImage = offscreenCanvas.toDataURL();
        pixelateRect(offscreenCtx, ox, oy, ow, oh, 8);
        actionHistory.push({ type: 'blur', prevImage });
      }
    }
  } else {
    actionHistory.push({ type: 'annotation' });
  }

  isDrawing = false;
  isDraggingText = false;
  currentAnnotation = null;
  render();
}

canvas.addEventListener('mouseup', handleDrawingEnd);
canvas.addEventListener('mouseout', handleDrawingEnd);

// --- Export Action ---
function exportImage() {
  const btn = document.getElementById('btn-export');
  const orgText = btn.textContent;
  btn.textContent = 'Processing HD Image...';

  setTimeout(() => {
    // Force a clean render without UI highlights for export
    render(true);

    const mime = state.exportFormat || 'image/png';
    let extension = 'png';
    if (mime === 'image/jpeg') extension = 'jpg';
    else if (mime === 'image/webp') extension = 'webp';

    const a = document.createElement('a');
    a.href = canvas.toDataURL(mime, mime === 'image/png' ? 1.0 : state.exportQuality);
    const timestamp = new Date().getTime();
    a.download = `Studio_Showcase_${timestamp}.${extension}`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    btn.textContent = orgText;
    
    // Restore UI highlights
    render(false);
  }, 150);
}

function copyToClipboard() {
  const btn = document.getElementById('btn-copy');
  const orgText = btn.innerHTML;
  btn.innerHTML = `<span>Processing...</span>`;

  setTimeout(() => {
    render(true);

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error("Canvas blob generation failed");
        }
        const item = new ClipboardItem({ [blob.type]: blob });
        navigator.clipboard.write([item]).then(() => {
          btn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right: 4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg><span>Copied!</span>`;
          setTimeout(() => {
            btn.innerHTML = orgText;
          }, 2000);
        }).catch(err => {
          console.error("Clipboard copy failed:", err);
          btn.innerHTML = `<span>Failed to copy</span>`;
          setTimeout(() => {
            btn.innerHTML = orgText;
          }, 2000);
        });
      }, 'image/png');
    } catch (err) {
      console.error("Canvas toBlob/ClipboardItem not supported or failed:", err);
      btn.innerHTML = `<span>Failed to copy</span>`;
      setTimeout(() => {
        btn.innerHTML = orgText;
      }, 2000);
    }

    render(false);
  }, 100);
}

function renderLayersPanel() {
  const container = document.getElementById('layers-panel-content');
  const countEl = document.getElementById('layers-count');
  if (!container) return;
  
  container.innerHTML = '';
  
  const allLayers = [];
  
  // Collect text layers
  state.textLayers.forEach((layer, idx) => {
    allLayers.push({
      type: 'text',
      label: layer.text.substring(0, 15) + (layer.text.length > 15 ? '...' : ''),
      visible: layer.visible !== false,
      ref: layer,
      originalIndex: idx,
      icon: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"></path></svg>`
    });
  });
  
  // Collect annotations
  state.annotations.forEach((ann, idx) => {
    let name = 'Drawing';
    if (ann.type === 'rect') name = 'Rectangle';
    else if (ann.type === 'arrow') name = 'Arrow';
    else if (ann.type === 'highlight') name = 'Highlight';
    
    allLayers.push({
      type: 'annotation',
      label: name,
      visible: ann.visible !== false,
      ref: ann,
      originalIndex: idx,
      icon: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`
    });
  });
  
  if (allLayers.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size:11px; text-align:center; padding:12px 0;">No elements added yet</div>`;
    if (countEl) countEl.textContent = '0';
    return;
  }
  
  if (countEl) {
    countEl.textContent = allLayers.length;
  }
  
  allLayers.reverse().forEach((layer) => {
    const itemDiv = document.createElement('div');
    itemDiv.style.display = 'flex';
    itemDiv.style.alignItems = 'center';
    itemDiv.style.justifyContent = 'space-between';
    itemDiv.style.padding = '6px 8px';
    itemDiv.style.borderRadius = '6px';
    itemDiv.style.background = '#ffffff';
    itemDiv.style.border = '1px solid var(--border)';
    itemDiv.style.fontSize = '12px';
    itemDiv.style.gap = '8px';
    itemDiv.style.transition = 'all 0.1s';
    
    if (
      (layer.type === 'text' && layer.originalIndex === state.selectedTextIndex) ||
      (layer.type === 'annotation' && layer.originalIndex === state.selectedAnnotationIndex)
    ) {
      if (currentTool === 'select' || (layer.type === 'text' && currentTool === 'text')) {
        itemDiv.style.borderColor = '#0066ff';
        itemDiv.style.background = '#f0f7ff';
      }
    }
    
    const leftDiv = document.createElement('div');
    leftDiv.style.display = 'flex';
    leftDiv.style.alignItems = 'center';
    leftDiv.style.cursor = 'pointer';
    leftDiv.innerHTML = layer.icon + `<span style="font-weight: 500;">${layer.label}</span>`;
    
    leftDiv.addEventListener('click', () => {
      if (layer.type === 'text') {
        state.selectedTextIndex = layer.originalIndex;
        state.selectedAnnotationIndex = -1;
        setTool('select');
        syncTextUI();
        syncShapeUI();
      } else {
        state.selectedAnnotationIndex = layer.originalIndex;
        state.selectedTextIndex = -1;
        setTool('select');
        syncTextUI();
        syncShapeUI();
        
        const ann = layer.ref;
        document.getElementById('param-color').value = ann.color || '#000000';
        document.getElementById('param-size').value = ann.size || 4;
      }
      render();
      window.focus();
    });
    itemDiv.appendChild(leftDiv);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.alignItems = 'center';
    actionsDiv.style.gap = '6px';
    
    const visBtn = document.createElement('button');
    visBtn.style.background = 'transparent';
    visBtn.style.border = 'none';
    visBtn.style.cursor = 'pointer';
    visBtn.style.padding = '2px';
    visBtn.style.color = layer.visible ? 'var(--text)' : 'var(--text-muted)';
    visBtn.innerHTML = layer.visible 
      ? `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`
      : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>`;
    
    visBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      layer.ref.visible = !layer.visible;
      render();
      window.focus();
    });
    actionsDiv.appendChild(visBtn);
    
    const delBtn = document.createElement('button');
    delBtn.style.background = 'transparent';
    delBtn.style.border = 'none';
    delBtn.style.cursor = 'pointer';
    delBtn.style.padding = '2px';
    delBtn.style.color = '#ef4444';
    delBtn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
    
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (layer.type === 'text') {
        const deletedText = state.textLayers.splice(layer.originalIndex, 1)[0];
        actionHistory.push({ type: 'delete-text', layer: deletedText, index: layer.originalIndex });
        state.selectedTextIndex = Math.max(-1, state.textLayers.length - 1);
        syncTextUI();
      } else if (layer.type === 'annotation') {
        const deletedAnn = state.annotations.splice(layer.originalIndex, 1)[0];
        actionHistory.push({ type: 'delete-annotation', annotation: deletedAnn, index: layer.originalIndex });
        state.selectedAnnotationIndex = -1;
      }
      syncShapeUI();
      render();
      window.focus();
    });
    actionsDiv.appendChild(delBtn);
    
    itemDiv.appendChild(actionsDiv);
    container.appendChild(itemDiv);
  });
}

function startInlineTextEdit(index) {
  if (activeTextarea) {
    activeTextarea.blur();
  }

  const layer = state.textLayers[index];
  if (!layer) return;

  state.selectedTextIndex = index;
  syncTextUI();

  layer.editing = true;
  render();

  const mainArea = document.querySelector('.main-area');
  const textarea = document.createElement('textarea');
  activeTextarea = textarea;

  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const screenX = viewport.offsetX + (layer.x / 100) * canvasW * viewport.zoom;
  const screenY = viewport.offsetY + (layer.y / 100) * canvasH * viewport.zoom;

  textarea.value = layer.text;
  textarea.style.position = 'absolute';
  textarea.style.left = screenX + 'px';
  textarea.style.top = screenY + 'px';
  textarea.style.transform = `translate(-50%, -50%) scale(${viewport.zoom})`;
  textarea.style.transformOrigin = 'center center';
  textarea.style.font = `${layer.preset === 'header' ? '800' : (layer.preset === 'sub' ? '600' : '400')} ${layer.size}px ${layer.font}`;
  textarea.style.color = layer.color || '#000000';
  textarea.style.background = 'rgba(255, 255, 255, 0.9)';
  textarea.style.border = '1px dashed #0066ff';
  textarea.style.borderRadius = '4px';
  textarea.style.outline = 'none';
  textarea.style.resize = 'none';
  textarea.style.textAlign = 'center';
  textarea.style.verticalAlign = 'middle';
  textarea.style.padding = '4px 8px';
  textarea.style.overflow = 'hidden';
  textarea.style.zIndex = '100';
  textarea.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

  function autoResize() {
    textarea.style.width = 'auto';
    textarea.style.height = 'auto';
    ctx.save();
    ctx.font = textarea.style.font;
    const lines = textarea.value.split('\n');
    let maxW = 100;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxW) maxW = w;
    });
    ctx.restore();
    textarea.style.width = (maxW + 40) + 'px';
    textarea.style.height = (lines.length * layer.size * 1.35 + 20) + 'px';
  }

  autoResize();
  textarea.addEventListener('input', autoResize);

  textarea.addEventListener('blur', () => {
    layer.text = textarea.value;
    delete layer.editing;
    textarea.remove();
    activeTextarea = null;
    syncTextUI();
    render();
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      delete layer.editing;
      textarea.remove();
      activeTextarea = null;
      render();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      textarea.blur();
    }
  });

  mainArea.appendChild(textarea);
  textarea.focus();
  textarea.select();
}

document.addEventListener('DOMContentLoaded', initUI);
