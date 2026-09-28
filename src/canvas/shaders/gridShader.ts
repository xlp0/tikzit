import * as THREE from 'three';

export interface GridThemeColors {
  bg: THREE.Color;
  minor: THREE.Color;
  major: THREE.Color;
  axis: THREE.Color;
}

export const GRID_THEMES: Record<'dark' | 'light', GridThemeColors> = {
  dark: {
    bg: new THREE.Color('#0D1117'),
    minor: new THREE.Color('#161B22'),
    major: new THREE.Color('#30363D'),
    axis: new THREE.Color('#388BFD'),
  },
  light: {
    bg: new THREE.Color('#F6F8FA'),
    minor: new THREE.Color('#E1E4E8'),
    major: new THREE.Color('#D1D5DA'),
    axis: new THREE.Color('#0969DA'),
  },
};

export const gridVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const gridFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;
  uniform vec2 uCameraOffset;
  uniform float uZoom;
  uniform vec3 uGridColorMajor;
  uniform vec3 uGridColorMinor;
  uniform vec3 uAxisColor;
  uniform vec3 uBgColor;

  float getGridLine(vec2 coord, float spacing, float lineWidthPx) {
    vec2 grid = abs(fract(coord / spacing - 0.5) - 0.5) * spacing;
    vec2 dgrid = fwidth(coord);
    vec2 line = smoothstep(dgrid * lineWidthPx, vec2(0.0), grid);
    return max(line.x, line.y);
  }

  void main() {
    // Transform screen UV to TikZ world coordinates
    vec2 worldCoord = (gl_FragCoord.xy - uResolution * 0.5) / uZoom - uCameraOffset;

    // Minor grid: 0.25 TikZ units
    float minor = getGridLine(worldCoord, 0.25, 1.0);
    // Major grid: 1.0 TikZ units
    float major = getGridLine(worldCoord, 1.0, 1.5);

    // Axis lines at x = 0, y = 0
    vec2 axisDist = abs(worldCoord);
    vec2 dAxis = fwidth(worldCoord);
    vec2 axisLine = smoothstep(dAxis * 2.0, vec2(0.0), axisDist);
    float axis = max(axisLine.x, axisLine.y);

    // Fade minor grid if zoomed out too far to prevent aliasing noise
    float minorOpacity = clamp((uZoom - 10.0) / 20.0, 0.0, 0.6);

    // Composite colors
    vec3 color = mix(uBgColor, uGridColorMinor, minor * minorOpacity);
    color = mix(color, uGridColorMajor, major * 0.85);
    color = mix(color, uAxisColor, axis * 0.95);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createGridMaterial(theme: 'dark' | 'light' = 'dark'): THREE.ShaderMaterial {
  const colors = GRID_THEMES[theme];
  return new THREE.ShaderMaterial({
    vertexShader: gridVertexShader,
    fragmentShader: gridFragmentShader,
    uniforms: {
      uResolution: { value: new THREE.Vector2(800, 600) },
      uCameraOffset: { value: new THREE.Vector2(0, 0) },
      uZoom: { value: 50.0 }, // default 50 px per TikZ unit
      uGridColorMajor: { value: colors.major.clone() },
      uGridColorMinor: { value: colors.minor.clone() },
      uAxisColor: { value: colors.axis.clone() },
      uBgColor: { value: colors.bg.clone() },
    },
    depthWrite: false,
    depthTest: false,
  });
}

export function updateGridUniforms(
  material: THREE.ShaderMaterial,
  width: number,
  height: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
  theme?: 'dark' | 'light'
): void {
  material.uniforms.uResolution.value.set(width, height);
  material.uniforms.uCameraOffset.value.set(cameraX, cameraY);
  material.uniforms.uZoom.value = zoom;

  if (theme) {
    const colors = GRID_THEMES[theme];
    material.uniforms.uGridColorMajor.value.copy(colors.major);
    material.uniforms.uGridColorMinor.value.copy(colors.minor);
    material.uniforms.uAxisColor.value.copy(colors.axis);
    material.uniforms.uBgColor.value.copy(colors.bg);
  }
}

export function createGridMesh(material: THREE.ShaderMaterial): THREE.Mesh {
  // 2x2 clip space plane
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.position.z = -100;
  return mesh;
}
