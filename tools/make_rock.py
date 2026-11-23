"""Bakes the cave-wall texture used behind the whole site.

Limestone: rounded lumps, horizontal bedding seams with small ledges, a few
mostly vertical cracks, lit from the upper left. The output is mid-grey on
purpose: the CSS darkens it for the cave and brightens it inside the
projected rectangle. Written to stay under ~400 MB of memory.

Run from the site folder: python3 tools/make_rock.py
"""
import gc
import hashlib

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

W, H = 2400, 1600
F = np.float32
rng = np.random.default_rng(1847)


def noise(sigma):
    n = rng.standard_normal((H, W), dtype=F)
    n = gaussian_filter(n, sigma, mode="wrap", output=F)
    n /= n.std() + 1e-9
    return n


# Heights in "pixel" units so every scale shows up in the lighting.
h = np.zeros((H, W), F)
for sigma, amp in [(150, 46), (64, 20), (26, 7.5), (11, 2.6), (4.5, 0.9), (1.6, 0.28)]:
    n = noise(sigma)
    n *= amp
    h += n
    del n

yy = np.arange(H, dtype=F)[:, None]

# Bedding: small ledges (sawtooth) plus thin, broken dark seams along them
period = F(190.0)
phase = noise(170) * 60 + yy
phase += noise(30) * 7
phase += noise(9) * 1.5
phase /= period
ledge = phase - np.floor(phase)
ledge *= np.clip((noise(110) + 0.1) * 0.9, 0, 1)
h += gaussian_filter(ledge, 2.0, mode="wrap", output=F) * 11.0
del ledge

seam_mask = np.clip((noise(70) - 0.15) * 1.4, 0, 1) * np.clip(noise(25) * 0.6 + 0.7, 0, 1)
dist = (phase - np.round(phase)) * period
del phase
width = 1.6 + 1.6 * np.clip(noise(40), 0, 2)
h -= np.exp(-(dist / width) ** 2) * 4.5 * seam_mask
del dist, width, seam_mask
gc.collect()

# Cracks: anisotropic noise so they run mostly up and down, only in some areas
c = gaussian_filter(rng.standard_normal((H, W), dtype=F), (110, 18), mode="wrap", output=F)
c /= c.std()
crack_mask = np.clip((noise(260) - 0.9) * 1.8, 0, 1) * np.clip((noise(60) - 0.2) * 1.5, 0, 1)
cracks = np.clip(1 - np.abs(c) * 7.0, 0, 1) ** 3 * crack_mask
del c, crack_mask
h -= gaussian_filter(cracks, 1.1, output=F) * 7.0
del cracks
gc.collect()

# Lighting from the upper left
gy, gx = np.gradient(h)
s = F(1.15)
nx = -gx * s
ny = -gy * s
del gx, gy
nl = np.sqrt(nx * nx + ny * ny + 1)
L = np.array([-0.5, -0.6, 0.62], F)
L /= np.linalg.norm(L)
diffuse = np.clip((nx * L[0] + ny * L[1] + L[2]) / nl, 0, 1)
del nx, ny, nl

cavity = h - gaussian_filter(h, 7, mode="wrap", output=F)
cavity = np.clip(0.55 + cavity * 0.09, 0, 1)
shade = (0.22 + 0.9 * diffuse) * (0.7 + 0.45 * cavity)
del diffuse, cavity, h
gc.collect()

# Albedo: warm limestone with cooler, darker patches and mineral streaks, one channel at a time
patch = np.clip(noise(180) * 0.35 + 0.5, 0, 1) * 0.55
streak = 1 + np.clip(gaussian_filter(rng.standard_normal((H, W), dtype=F), (60, 3), mode="wrap", output=F) * 2.2, -1, 1) * 0.045
grain = gaussian_filter(rng.standard_normal((H, W), dtype=F), 0.6, output=F) * 4.0
shade *= streak
del streak

out = np.empty((H, W, 3), np.uint8)
for ch, (warm, cool) in enumerate([(178, 128), (168, 127), (150, 121)]):
    v = (warm * (1 - patch) + cool * patch) * shade + grain
    v *= 0.8
    out[..., ch] = np.clip(v, 0, 255).astype(np.uint8)
    del v

img = Image.fromarray(out, "RGB")
img.save("assets/rock.webp", "WEBP", quality=70, method=6)
img.resize((1200, 800), Image.LANCZOS).save("assets/rock-small.webp", "WEBP", quality=72, method=6)
img.resize((1600, 1067), Image.LANCZOS).save("assets/rock.jpg", "JPEG", quality=72, optimize=True, progressive=True)
print("done", hashlib.sha256(out.tobytes()).hexdigest()[:16])
