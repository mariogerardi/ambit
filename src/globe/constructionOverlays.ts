import { BufferGeometry, Float32BufferAttribute } from "three";
import type { GridShape } from "../game/constructionTypes";
import { gridBounds } from "../game/construction";
const point = (lng: number, lat: number, r = 1.004) => {
  const a = (lat * Math.PI) / 180,
    b = (lng * Math.PI) / 180;
  return [
    r * Math.cos(a) * Math.sin(b),
    r * Math.sin(a),
    r * Math.cos(a) * Math.cos(b),
  ];
};
export function patchGeometry(
  bounds: [number, number, number, number],
  columns = 128,
  rows = 96,
) {
  const [west, south, east, north] = bounds,
    vertices: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= columns; x++) {
      vertices.push(
        ...point(
          west + ((east - west) * x) / columns,
          north - ((north - south) * y) / rows,
        ),
      );
      uv.push(x / columns, 1 - y / rows);
      if (x && y) {
        const i = y * (columns + 1) + x;
        indices.push(
          i,
          i - 1,
          i - columns - 1,
          i - 1,
          i - columns - 2,
          i - columns - 1,
        );
      }
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  return geometry;
}
export function cellsGeometry(
  grid: GridShape,
  cells: number[],
  maskBounds?: [number, number, number, number],
) {
  const vertices: number[] = [];
  for (const i of cells) {
    const [w, s, e, n] = gridBounds(grid, i),
      a = point(w, s, 1.007),
      b = point(e, s, 1.007),
      c = point(e, n, 1.007),
      d = point(w, n, 1.007);
    vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  if (maskBounds) {
    const [w, s, e, n] = maskBounds,
      uv: number[] = [];
    for (let i = 0; i < vertices.length; i += 3) {
      const lng = (Math.atan2(vertices[i], vertices[i + 2]) * 180) / Math.PI,
        lat = (Math.asin(vertices[i + 1] / 1.007) * 180) / Math.PI;
      uv.push((lng - w) / (e - w), (lat - s) / (n - s));
    }
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  }
  return geometry;
}
