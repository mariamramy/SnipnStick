// ── Die-cut padding/outline styling ──────────────────────────────────────
// Goal: instead of a rectangular border, grow a colored halo that follows
// the sticker's actual silhouette (like a sticker die-cut line), with
// smooth, round edges rather than blocky/faceted ones.

const ALPHA_THRESHOLD = 24 // pixels with alpha above this count as "sticker"
const EDGE_FEATHER_PX = 1.5 // how soft the final outer edge is (bigger = smoother, blurrier edge)
const MASK_SMOOTH_PASSES = 1 // light blur on the silhouette mask to remove single-pixel notches
const OUTLINE_SMOOTHING_PX = 3 // blur radius applied to the distance field itself — smooths the actual contour/curve of the outline, not just individual pixels. Bigger = rounder line, but can soften sharp points.

function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v))
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '')
    const bigint = parseInt(clean, 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

/**
 * Smooths a 0/1 mask by averaging each pixel with its neighbors and
 * re-thresholding. This removes single-pixel notches/spikes along the
 * silhouette edge (e.g. leftover jagged bits from brush-erasing) so the
 * distance transform doesn't turn them into bumps on the outline.
 */
function smoothMask(mask: Uint8Array, width: number, height: number, passes: number): Uint8Array {
    let current = mask
    for (let p = 0; p < passes; p++) {
        const next = new Uint8Array(width * height)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0
                let count = 0
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx
                        const ny = y + dy
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
                        sum += current[ny * width + nx]
                        count++
                    }
                }
                next[y * width + x] = (sum / count) >= 0.5 ? 1 : 0
            }
        }
        current = next
    }
    return current
}

/**
 * Exact 1D squared-distance transform (Felzenszwalb & Huttenlocher).
 * Used as a building block for the exact 2D transform below. Unlike a
 * chamfer sweep (which only checks 8 neighbor directions and therefore
 * produces slightly faceted/octagonal edges), this computes the true
 * nearest distance for every position, so curved edges stay round.
 */
function distanceTransform1D(f: Float64Array): Float64Array {
    const n = f.length
    const d = new Float64Array(n)
    const v = new Int32Array(n)
    const z = new Float64Array(n + 1)
    let k = 0
    v[0] = 0
    z[0] = -Infinity
    z[1] = Infinity
    for (let q = 1; q < n; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        while (s <= z[k]) {
            k--
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        }
        k++
        v[k] = q
        z[k] = s
        z[k + 1] = Infinity
    }
    k = 0
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++
        d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
    }
    return d
}

/**
 * Exact squared Euclidean distance transform, run column-wise then
 * row-wise. Produces a per-pixel "distance to nearest sticker pixel"
 * map with no directional bias, so halos grow as true circles/curves
 * around the silhouette instead of faceted approximations.
 */
function exactDistanceTransform(mask: Uint8Array, width: number, height: number): Float64Array {
    const INF = 1e20
    const g = new Float64Array(width * height)
    for (let i = 0; i < g.length; i++) g[i] = mask[i] ? 0 : INF

    const colBuf = new Float64Array(height)
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) colBuf[y] = g[y * width + x]
        const colOut = distanceTransform1D(colBuf)
        for (let y = 0; y < height; y++) g[y * width + x] = colOut[y]
    }

    const rowBuf = new Float64Array(width)
    for (let y = 0; y < height; y++) {
        const base = y * width
        for (let x = 0; x < width; x++) rowBuf[x] = g[base + x]
        const rowOut = distanceTransform1D(rowBuf)
        for (let x = 0; x < width; x++) g[base + x] = rowOut[x]
    }

    return g
}

/**
 * One box blur pass: replaces each value with the average of itself and
 * `radius` neighbors on each side, done separately for rows then columns.
 * Running this 3 times in a row is a well-known cheap approximation of a
 * true Gaussian blur (each pass rounds off the result a bit more).
 */
function boxBlurPass(src: Float64Array, width: number, height: number, radius: number): Float64Array {
    if (radius <= 0) return src

    // Horizontal pass
    const temp = new Float64Array(width * height)
    for (let y = 0; y < height; y++) {
        const base = y * width
        let sum = 0
        for (let x = -radius; x <= radius; x++) {
            sum += src[base + clamp(x, 0, width - 1)]
        }
        for (let x = 0; x < width; x++) {
            temp[base + x] = sum / (radius * 2 + 1)
            const addX = clamp(x + radius + 1, 0, width - 1)
            const removeX = clamp(x - radius, 0, width - 1)
            sum += src[base + addX] - src[base + removeX]
        }
    }

    // Vertical pass
    const out = new Float64Array(width * height)
    for (let x = 0; x < width; x++) {
        let sum = 0
        for (let y = -radius; y <= radius; y++) {
            sum += temp[clamp(y, 0, height - 1) * width + x]
        }
        for (let y = 0; y < height; y++) {
            out[y * width + x] = sum / (radius * 2 + 1)
            const addY = clamp(y + radius + 1, 0, height - 1)
            const removeY = clamp(y - radius, 0, height - 1)
            sum += temp[addY * width + x] - temp[removeY * width + x]
        }
    }

    return out
}

/**
 * Smooths the distance field so the outline's CONTOUR (its actual curve
 * shape) comes out rounder, not just its pixel edges. Blurring the mask
 * only cleans up single-pixel notches; blurring the distance field
 * smooths the whole boundary line the outline is traced from.
 */
function smoothDistanceField(dist: Float64Array, width: number, height: number, radiusPx: number): Float64Array {
    const radius = Math.round(radiusPx)
    if (radius <= 0) return dist
    let result = dist
    for (let i = 0; i < 3; i++) {
        result = boxBlurPass(result, width, height, radius)
    }
    return result
}

/**
 * Renders the sticker with die-cut style padding/outline that follows the
 * sticker's silhouette, instead of a rectangular border.
 */
export async function renderStyledImage(
    source: Blob,
    settings: { paddingPx: number; paddingColor: string; outlineWidthPx: number; outlineColor: string }
): Promise<Blob> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(source)
        img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load sticker image')) }
        img.src = url
    })

    const w = image.naturalWidth
    const h = image.naturalHeight

    // Draw the sticker onto an off-screen canvas so we can read its pixels
    // (specifically, the alpha channel — that's what defines "the umbrella shape").
    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = w
    sourceCanvas.height = h
    const sourceCtx = sourceCanvas.getContext('2d')
    if (!sourceCtx) throw new Error('Unable to create drawing context')
    sourceCtx.drawImage(image, 0, 0)
    const sourceData = sourceCtx.getImageData(0, 0, w, h)

    const paddingPx = Math.max(0, Math.round(settings.paddingPx))
    const outlineWidthPx = Math.max(0, Math.round(settings.outlineWidthPx))
    const expand = paddingPx + outlineWidthPx // how much bigger the canvas needs to be on each side

    const newW = w + expand * 2
    const newH = h + expand * 2

    const canvas = document.createElement('canvas')
    canvas.width = newW
    canvas.height = newH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Unable to create drawing context')

    if (expand > 0) {
        // Step 1: build the silhouette mask on the LARGER canvas
        // (the umbrella sits in the middle, offset by `expand` on each side).
        let mask = new Uint8Array(newW * newH)
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const alpha = sourceData.data[(y * w + x) * 4 + 3]
                if (alpha > ALPHA_THRESHOLD) {
                    mask[(y + expand) * newW + (x + expand)] = 1
                }
            }
        }

        // Step 1b: smooth away single-pixel notches along the edge so
        // they don't get baked into the outline as tiny bumps.
        if (MASK_SMOOTH_PASSES > 0) {
            mask = smoothMask(mask, newW, newH, MASK_SMOOTH_PASSES)
        }

        // Step 2: for every pixel, how far is it from the umbrella's edge?
        // (exact distance, not an 8-direction approximation — this is
        // what keeps curved edges looking round instead of faceted.)
        const sqDist = exactDistanceTransform(mask, newW, newH)
        let dist = new Float64Array(sqDist.length)
        for (let i = 0; i < sqDist.length; i++) dist[i] = Math.sqrt(sqDist[i])

        // Step 2b: smooth the CONTOUR itself, not just individual pixels —
        // this is what rounds off wobbles along the outline's curve.
        dist = smoothDistanceField(dist, newW, newH, OUTLINE_SMOOTHING_PX)

        // Step 3: turn that distance map into colored rings.
        //   distance <= paddingPx                         -> padding color
        //   paddingPx < distance <= paddingPx+outlineWidth -> outline color
        //   distance > paddingPx+outlineWidth              -> transparent
        const [pr, pg, pb] = hexToRgb(settings.paddingColor)
        const [orr, og, ob] = hexToRgb(settings.outlineColor)
        const outerRadius = paddingPx + outlineWidthPx
        const layer = ctx.createImageData(newW, newH)

        for (let i = 0; i < newW * newH; i++) {
            const d = dist[i]

            // Soft edge (width controlled by EDGE_FEATHER_PX) so the ring
            // doesn't look jagged/pixelated or stair-stepped.
            const outerCoverage = clamp((outerRadius - d) / EDGE_FEATHER_PX + 0.5, 0, 1)
            if (outerCoverage <= 0) continue

            const paddingCoverage = clamp((paddingPx - d) / EDGE_FEATHER_PX + 0.5, 0, 1)

            const idx = i * 4
            // Blend between outline color and padding color depending on
            // which ring this pixel falls in.
            layer.data[idx] = orr + (pr - orr) * paddingCoverage
            layer.data[idx + 1] = og + (pg - og) * paddingCoverage
            layer.data[idx + 2] = ob + (pb - ob) * paddingCoverage
            layer.data[idx + 3] = Math.round(outerCoverage * 255)
        }
        ctx.putImageData(layer, 0, 0)
    }

    // Step 4: paste the original sticker back on top, centered.
    ctx.drawImage(image, expand, expand, w, h)

    return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Unable to create styled sticker image')); return }
            resolve(blob)
        }, 'image/png')
    })
}