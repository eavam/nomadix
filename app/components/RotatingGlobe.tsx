"use client";

import { useEffect, useRef } from "react";
import { geoDistance, geoEquirectangular, geoInterpolate, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import landAtlas from "world-atlas/land-110m.json";

type GeoPoint = [number, number];
type Vector = [number, number, number];
type ScreenPoint = { x: number; y: number; depth: number } | null;

const PAPER = "#f3efe5";
const BLUE = "#2455ff";
const INK = "#111111";
const TRAVEL_SPEED = 0.0082;
const TILT = (12 * Math.PI) / 180;

const land = feature(
  landAtlas as never,
  (landAtlas as unknown as { objects: { land: never } }).objects.land,
) as never;

// An intentionally westbound loop: longitude movement offsets the globe rotation,
// keeping the current journey readable instead of sending it to a random hemisphere.
const CITY_LOOP: Array<{ name: string; code: string; point: GeoPoint }> = [
  { name: "Lisbon", code: "LIS", point: [-9.1393, 38.7223] },
  { name: "New York", code: "NYC", point: [-74.006, 40.7128] },
  { name: "Mexico City", code: "MEX", point: [-99.1332, 19.4326] },
  { name: "Los Angeles", code: "LAX", point: [-118.2437, 34.0522] },
  { name: "Honolulu", code: "HNL", point: [-157.8583, 21.3069] },
  { name: "Tokyo", code: "TYO", point: [139.6917, 35.6895] },
  { name: "Bangkok", code: "BKK", point: [100.5018, 13.7563] },
  { name: "Dubai", code: "DXB", point: [55.2708, 25.2048] },
];

function toVector(point: GeoPoint, altitude = 1): Vector {
  const longitude = (point[0] * Math.PI) / 180;
  const latitude = (point[1] * Math.PI) / 180;
  return [
    Math.cos(latitude) * Math.sin(longitude) * altitude,
    Math.sin(latitude) * altitude,
    Math.cos(latitude) * Math.cos(longitude) * altitude,
  ];
}

const ROUTES = CITY_LOOP.map((from, index) => {
  const to = CITY_LOOP[(index + 1) % CITY_LOOP.length];
  const distance = (geoDistance(from.point, to.point) * 180) / Math.PI;
  const interpolate = geoInterpolate(from.point, to.point);
  const orbit = distance > 68 ? 0.29 : distance > 34 ? 0.21 : 0.14;
  const arc = Array.from({ length: 161 }, (_, sample) => {
    const progress = sample / 160;
    const altitude = 1 + Math.sin(Math.PI * progress) * orbit;
    return toVector(interpolate(progress) as GeoPoint, altitude);
  });
  return { from, to, distance, interpolate, arc };
});

const ROUTE_CYCLE = ROUTES.reduce((sum, route) => sum + route.distance, 0);

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Nomadix globe shader error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec3 aPosition;
      uniform float uRotation;
      uniform float uTilt;
      uniform float uAspect;
      uniform float uScale;
      uniform float uCenterX;
      uniform float uCenterY;
      uniform float uPointSize;
      varying float vDepth;

      void main() {
        float cr = cos(uRotation);
        float sr = sin(uRotation);
        vec3 spun = vec3(
          aPosition.x * cr + aPosition.z * sr,
          aPosition.y,
          -aPosition.x * sr + aPosition.z * cr
        );
        float ct = cos(uTilt);
        float st = sin(uTilt);
        vec3 p = vec3(
          spun.x,
          spun.y * ct - spun.z * st,
          spun.y * st + spun.z * ct
        );
        vDepth = p.z;
        if (p.z <= 0.015) {
          gl_Position = vec4(2.0, 2.0, 1.0, 1.0);
          gl_PointSize = 0.0;
        } else {
          gl_Position = vec4(
            uCenterX + p.x * uScale / uAspect,
            uCenterY + p.y * uScale,
            0.0,
            1.0
          );
          gl_PointSize = uPointSize * (0.84 + p.z * 0.36);
        }
      }
    `,
  );
  const fragment = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      varying float vDepth;
      void main() {
        vec2 d = gl_PointCoord - vec2(0.5);
        float radius = length(d);
        if (radius > 0.5) discard;
        float edge = smoothstep(0.5, 0.35, radius);
        float horizon = smoothstep(0.025, 0.32, vDepth);
        float alpha = edge * horizon * (0.60 + vDepth * 0.40);
        gl_FragColor = vec4(0.141, 0.333, 1.0, alpha);
      }
    `,
  );
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Nomadix globe program error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function createLandPointCloud(compact: boolean) {
  const width = 1200;
  const height = 600;
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const maskContext = mask.getContext("2d", { willReadFrequently: true });
  if (!maskContext) return new Float32Array();

  const scale = width / (2 * Math.PI);
  const projection = geoEquirectangular()
    .translate([width / 2, height / 2])
    .scale(scale)
    .precision(0.2);
  const path = geoPath(projection, maskContext);
  maskContext.beginPath();
  path(land);
  maskContext.fillStyle = "#fff";
  maskContext.fill();

  const pixels = maskContext.getImageData(0, 0, width, height).data;
  const coordinates: number[] = [];
  const rows = compact ? 132 : 184;
  const equatorDensity = compact ? 290 : 430;

  // Uniform latitude rows, matching the approach from the GitHub globe.
  for (let row = 0; row < rows; row += 1) {
    const latitude = -89.5 + (179 * row) / (rows - 1);
    const radiusAtLatitude = Math.cos((Math.abs(latitude) * Math.PI) / 180);
    const dotsInRow = Math.max(1, Math.round(radiusAtLatitude * equatorDensity));
    const rowOffset = row % 2 === 0 ? 0 : 0.5;

    for (let dot = 0; dot < dotsInRow; dot += 1) {
      const longitude = -180 + (360 * (dot + rowOffset)) / dotsInRow;
      const x = Math.min(width - 1, Math.max(0, Math.floor(((longitude + 180) / 360) * width)));
      const y = Math.min(height - 1, Math.max(0, Math.floor(((90 - latitude) / 180) * height)));
      if (pixels[(y * width + x) * 4 + 3] < 90) continue;
      coordinates.push(...toVector([longitude, latitude]));
    }
  }

  return new Float32Array(coordinates);
}

function activeRouteAt(travelAngle: number) {
  let position = travelAngle % ROUTE_CYCLE;
  for (let index = 0; index < ROUTES.length; index += 1) {
    const route = ROUTES[index];
    if (position <= route.distance) {
      return { route, index, progress: position / route.distance };
    }
    position -= route.distance;
  }
  return { route: ROUTES[0], index: 0, progress: 0 };
}

function formatCoordinates([longitude, latitude]: GeoPoint) {
  const latitudeLabel = `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? "N" : "S"}`;
  const longitudeLabel = `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? "E" : "W"}`;
  return `${latitudeLabel} · ${longitudeLabel}`;
}

export default function RotatingGlobe() {
  const webglRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const webglCanvas = webglRef.current;
    const overlayCanvas = overlayRef.current;
    if (!webglCanvas || !overlayCanvas) return;

    const context = overlayCanvas.getContext("2d");
    if (!context) return;
    const compactPointCloud = window.innerWidth < 720;
    const gl = (webglCanvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    }) || webglCanvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    })) as WebGLRenderingContext | null;
    const points = createLandPointCloud(compactPointCloud);
    const pointCount = points.length / 3;
    const program = gl ? createProgram(gl) : null;
    const buffer = gl && program ? gl.createBuffer() : null;
    const gpuReady = Boolean(gl && program && buffer);
    const uniforms = gl && program ? {
      rotation: gl.getUniformLocation(program, "uRotation"),
      tilt: gl.getUniformLocation(program, "uTilt"),
      aspect: gl.getUniformLocation(program, "uAspect"),
      scale: gl.getUniformLocation(program, "uScale"),
      centerX: gl.getUniformLocation(program, "uCenterX"),
      centerY: gl.getUniformLocation(program, "uCenterY"),
      pointSize: gl.getUniformLocation(program, "uPointSize"),
    } : null;

    if (gl && program && buffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
      gl.useProgram(program);
      const positionLocation = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startTime = performance.now();
    const state = { width: 0, height: 0, dpr: 1, frame: 0, lastDraw: 0 };
    let globeVisible = true;
    let pageVisible = !document.hidden;

    const resize = () => {
      const rect = overlayCanvas.getBoundingClientRect();
      state.width = rect.width;
      state.height = rect.height;
      const dprCap = rect.width < 700 ? 1.45 : 1.75;
      state.dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const width = Math.max(1, Math.round(rect.width * state.dpr));
      const height = Math.max(1, Math.round(rect.height * state.dpr));
      for (const canvas of [webglCanvas, overlayCanvas]) {
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
      }
      if (gl) gl.viewport(0, 0, width, height);
    };

    const projectVector = (
      vector: Vector,
      rotation: number,
      centerX: number,
      centerY: number,
      radius: number,
      allowOrbit = false,
    ): ScreenPoint => {
      const rotationRadians = (rotation * Math.PI) / 180;
      const cr = Math.cos(rotationRadians);
      const sr = Math.sin(rotationRadians);
      const ct = Math.cos(TILT);
      const st = Math.sin(TILT);
      const spunX = vector[0] * cr + vector[2] * sr;
      const spunZ = -vector[0] * sr + vector[2] * cr;
      const projectedY = vector[1] * ct - spunZ * st;
      const depth = vector[1] * st + spunZ * ct;
      if (depth <= (allowOrbit ? -0.025 : 0.015)) return null;
      return {
        x: centerX + spunX * radius,
        y: centerY - projectedY * radius,
        depth,
      };
    };

    const projectGeo = (
      point: GeoPoint,
      rotation: number,
      centerX: number,
      centerY: number,
      radius: number,
    ) => projectVector(toVector(point), rotation, centerX, centerY, radius);

    const drawHalo = (centerX: number, centerY: number, radius: number) => {
      const atmosphere = context.createRadialGradient(
        centerX,
        centerY,
        radius * 0.79,
        centerX,
        centerY,
        radius * 1.09,
      );
      atmosphere.addColorStop(0, "rgba(36,85,255,0)");
      atmosphere.addColorStop(0.61, "rgba(36,85,255,.015)");
      atmosphere.addColorStop(0.72, "rgba(36,85,255,.19)");
      atmosphere.addColorStop(0.77, "rgba(36,85,255,.07)");
      atmosphere.addColorStop(1, "rgba(36,85,255,0)");
      context.fillStyle = atmosphere;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.1, 0, Math.PI * 2);
      context.fill();
    };

    const drawFallbackPoints = (
      rotation: number,
      centerX: number,
      centerY: number,
      radius: number,
      compact: boolean,
    ) => {
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      const stride = compact ? 6 : 3;
      for (let index = 0; index < points.length; index += stride) {
        const projected = projectVector(
          [points[index], points[index + 1], points[index + 2]],
          rotation,
          centerX,
          centerY,
          radius,
        );
        if (!projected) continue;
        const bucket = projected.depth > 0.7 ? 2 : projected.depth > 0.34 ? 1 : 0;
        const dot = 0.58 + Math.min(1, projected.depth) * 0.68;
        paths[bucket].moveTo(projected.x + dot, projected.y);
        paths[bucket].arc(projected.x, projected.y, dot, 0, Math.PI * 2);
      }
      context.fillStyle = BLUE;
      [0.24, 0.58, 0.92].forEach((alpha, index) => {
        context.globalAlpha = alpha;
        context.fill(paths[index]);
      });
      context.globalAlpha = 1;
    };

    const drawCityAnchors = (
      activeIndex: number,
      rotation: number,
      centerX: number,
      centerY: number,
      radius: number,
    ) => {
      CITY_LOOP.forEach((city, cityIndex) => {
        const point = projectGeo(city.point, rotation, centerX, centerY, radius);
        if (!point || point.depth < 0.08) return;
        const active = cityIndex === activeIndex || cityIndex === (activeIndex + 1) % CITY_LOOP.length;
        const length = active ? 10 : 5;
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        const magnitude = Math.max(1, Math.hypot(dx, dy));
        context.strokeStyle = active ? "rgba(36,85,255,.88)" : "rgba(17,17,17,.28)";
        context.lineWidth = active ? 1.3 : 0.8;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(point.x + (dx / magnitude) * length, point.y + (dy / magnitude) * length);
        context.stroke();
        context.fillStyle = active ? PAPER : BLUE;
        context.beginPath();
        context.arc(point.x, point.y, active ? 3.1 : 1.65, 0, Math.PI * 2);
        context.fill();
        if (active) {
          context.strokeStyle = BLUE;
          context.lineWidth = 1.4;
          context.stroke();
        }
      });
    };

    const drawRoute = (
      active: ReturnType<typeof activeRouteAt>,
      rotation: number,
      centerX: number,
      centerY: number,
      radius: number,
    ) => {
      const progress = active.progress;
      const headIndex = Math.max(1, Math.floor(progress * (active.route.arc.length - 1)));
      const tailProgress = Math.max(0, progress - 0.42);
      const tailIndex = Math.floor(tailProgress * (active.route.arc.length - 1));
      const routePath = new Path2D();
      let drawing = false;
      let head: ScreenPoint = null;
      let beforeHead: ScreenPoint = null;

      for (let index = tailIndex; index <= headIndex; index += 1) {
        const projected = projectVector(
          active.route.arc[index],
          rotation,
          centerX,
          centerY,
          radius,
          true,
        );
        if (!projected) {
          drawing = false;
          continue;
        }
        if (!drawing) routePath.moveTo(projected.x, projected.y);
        else routePath.lineTo(projected.x, projected.y);
        drawing = true;
        beforeHead = head;
        head = projected;
      }

      if (drawing) {
        context.save();
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = "rgba(36,85,255,.12)";
        context.lineWidth = 10;
        context.shadowColor = "rgba(36,85,255,.45)";
        context.shadowBlur = 15;
        context.stroke(routePath);
        context.shadowBlur = 0;
        context.strokeStyle = BLUE;
        context.lineWidth = 2.6;
        context.stroke(routePath);
        context.restore();
      }

      if (head && beforeHead) {
        const angle = Math.atan2(head.y - beforeHead.y, head.x - beforeHead.x);
        context.save();
        context.translate(head.x, head.y);
        context.rotate(angle);
        context.fillStyle = PAPER;
        context.strokeStyle = BLUE;
        context.lineWidth = 1.8;
        context.beginPath();
        context.moveTo(9.5, 0);
        context.lineTo(-4.5, -4.2);
        context.lineTo(-1.8, 0);
        context.lineTo(-4.5, 4.2);
        context.closePath();
        context.fill();
        context.stroke();
        context.restore();
      }

      const destination = projectGeo(active.route.to.point, rotation, centerX, centerY, radius);
      if (destination && progress > 0.78) {
        const arrival = (progress - 0.78) / 0.22;
        const eased = 1 - Math.pow(1 - arrival, 3);
        context.strokeStyle = `rgba(36,85,255,${0.62 * (1 - eased)})`;
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(destination.x, destination.y, 7 + eased * 27, 0, Math.PI * 2);
        context.stroke();
      }

      return { head, destination };
    };

    const draw = (time: number) => {
      const frameInterval = gpuReady ? 1000 / 60 : 1000 / 30;
      if (!reducedMotion && time - state.lastDraw < frameInterval) {
        state.frame = requestAnimationFrame(draw);
        return;
      }
      state.lastDraw = time;
      const elapsed = reducedMotion ? 8600 : Math.max(0, time - startTime);
      const travelAngle = elapsed * TRAVEL_SPEED;
      // One complete city loop always equals exactly one globe revolution.
      // Keeping both animations on the same normalized phase prevents drift,
      // even after the page has been open for many route cycles.
      const cycleProgress = (travelAngle % ROUTE_CYCLE) / ROUTE_CYCLE;
      const rotation = -18 + cycleProgress * 360;
      const active = activeRouteAt(travelAngle);
      const compact = window.innerWidth < 700;
      const tablet = !compact && window.innerWidth < 960;
      const heightFactor = compact ? 0.431947776 : tablet ? 0.4360381905 : 0.4367471957;
      const radius = Math.min(
        state.height * heightFactor,
        state.width * (compact ? 0.467943424 : tablet ? 0.44432128 : 0.43307264),
      );
      const canvasRect = overlayCanvas.getBoundingClientRect();
      // The larger canvas lets the sphere overlap neighbouring sections without
      // clipping the elevated route arcs at the edge of the visual. Keeping the
      // center relative to the viewport leaves exactly seven percent of the globe's
      // diameter beyond the right edge at every responsive size.
      const centerX = window.innerWidth - canvasRect.left - radius * 0.86;
      const centerY = state.height * 0.5;
      const scale = (radius * 2) / state.height;
      const aspect = state.width / state.height;
      const heroRect = overlayCanvas.closest(".hero")?.getBoundingClientRect();
      const visibleLeft = Math.max(0, -canvasRect.left);
      const visibleRight = Math.min(state.width, window.innerWidth - canvasRect.left);
      const statusWidth = compact ? 150 : 180;
      const statusX = Math.max(
        visibleLeft + (compact ? 14 : 18),
        Math.min(visibleRight - statusWidth, centerX - radius * (compact ? 0.7 : 0.82)),
      );
      const statusBottom = heroRect
        ? Math.min(state.height - 20, heroRect.bottom - canvasRect.top - (compact ? 28 : 34))
        : state.height * (compact ? 0.71 : 0.74);

      if (gl && program && uniforms && gpuReady) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform1f(uniforms.rotation, (rotation * Math.PI) / 180);
        gl.uniform1f(uniforms.tilt, TILT);
        gl.uniform1f(uniforms.aspect, aspect);
        gl.uniform1f(uniforms.scale, scale);
        gl.uniform1f(uniforms.centerX, (centerX / state.width) * 2 - 1);
        gl.uniform1f(uniforms.centerY, 1 - (centerY / state.height) * 2);
        gl.uniform1f(uniforms.pointSize, (compact ? 1.65 : 1.9) * state.dpr);
        gl.drawArrays(gl.POINTS, 0, pointCount);
      }

      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      context.clearRect(0, 0, state.width, state.height);
      drawHalo(centerX, centerY, radius);

      if (!gpuReady) drawFallbackPoints(rotation, centerX, centerY, radius, compact);

      drawCityAnchors(active.index, rotation, centerX, centerY, radius);
      const { head, destination } = drawRoute(active, rotation, centerX, centerY, radius);

      context.strokeStyle = "rgba(36,85,255,.42)";
      context.lineWidth = 0.75;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();

      const labelPoint = destination || head;
      if (labelPoint && !compact) {
        const name = active.route.to.name.toUpperCase();
        const coordinates = formatCoordinates(active.route.to.point);
        const labelWidth = Math.max(name.length * 7.2 + 22, coordinates.length * 6.15 + 20);
        const minimumX = visibleLeft + 8;
        const maximumX = Math.max(minimumX, visibleRight - labelWidth - 8);
        const x = Math.max(minimumX, Math.min(maximumX, labelPoint.x + 17));
        const y = Math.min(statusBottom - 62, Math.max(18, labelPoint.y - 19));
        context.fillStyle = "rgba(243,239,229,.94)";
        context.fillRect(x, y, labelWidth, 35);
        context.strokeStyle = "rgba(36,85,255,.4)";
        context.lineWidth = 0.8;
        context.strokeRect(x, y, labelWidth, 35);
        context.fillStyle = BLUE;
        context.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
        context.fillText(name, x + 9, y + 14);
        context.fillStyle = "rgba(17,17,17,.65)";
        context.fillText(coordinates, x + 9, y + 27);
      }

      context.fillStyle = BLUE;
      context.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.fillText(
        `ROUTE ${String(active.index + 1).padStart(2, "0")} / ${String(ROUTES.length).padStart(2, "0")}`,
        statusX,
        statusBottom - 15,
      );
      context.fillStyle = INK;
      context.globalAlpha = 0.62;
      context.fillText(
        `${active.route.from.code}  →  ${active.route.to.code}  ·  ${Math.round(active.progress * 100)}%`,
        statusX,
        statusBottom,
      );
      context.globalAlpha = 1;

      if (!reducedMotion) state.frame = requestAnimationFrame(draw);
    };

    const startAnimation = () => {
      if (!reducedMotion && globeVisible && pageVisible && state.frame === 0) {
        state.frame = requestAnimationFrame(draw);
      }
    };

    const stopAnimation = () => {
      if (state.frame !== 0) cancelAnimationFrame(state.frame);
      state.frame = 0;
    };

    const syncAnimation = () => {
      if (globeVisible && pageVisible) startAnimation();
      else stopAnimation();
    };

    const observer = new ResizeObserver(() => {
      resize();
      if (reducedMotion) draw(performance.now());
    });
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        globeVisible = entry.isIntersecting;
        syncAnimation();
      },
      { rootMargin: "180px" },
    );
    const handleVisibilityChange = () => {
      pageVisible = !document.hidden;
      syncAnimation();
    };

    observer.observe(overlayCanvas);
    visibilityObserver.observe(overlayCanvas);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    resize();
    if (reducedMotion) draw(performance.now());
    else startAnimation();

    return () => {
      stopAnimation();
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (gl && buffer) gl.deleteBuffer(buffer);
      if (gl && program) gl.deleteProgram(program);
    };
  }, []);

  return (
    <div
      className="globe-stage"
      role="img"
      aria-label="Animated dotted globe with a synchronized route travelling between cities."
    >
      <canvas ref={webglRef} className="globe-webgl" aria-hidden="true" />
      <canvas ref={overlayRef} className="globe-overlay" aria-hidden="true" />
    </div>
  );
}
