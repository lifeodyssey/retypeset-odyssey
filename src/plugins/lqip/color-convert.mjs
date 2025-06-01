export function rgbToOkLab(rgb) {
  return rgb_to_oklab(rgb)
}

function rgb_to_oklab(c) {
  const r = gamma_inv(c.r / 255)
  const g = gamma_inv(c.g / 255)
  const b = gamma_inv(c.b / 255)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return {
    L: l * +0.2104542553 + m * +0.793617785 + s * -0.0040720468,
    a: l * +1.9779984951 + m * -2.428592205 + s * +0.4505937099,
    b: l * +0.0259040371 + m * +0.7827717662 + s * -0.808675766,
  }
}

function gamma_inv(x) {
  return x >= 0.04045 ? ((x + 0.055) / (1.055)) ** 2.4 : x / 12.92
}
