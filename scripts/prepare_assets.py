import json
import os
import urllib.parse
import urllib.request

from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)

q = urllib.parse.urlencode({
    "q": "Calle Flor de Albahaca 1, 41020 Sevilla",
    "format": "json",
    "limit": 3,
})
req = urllib.request.Request(
    "https://nominatim.openstreetmap.org/search?" + q,
    headers={"User-Agent": "maria-germina-local-audit/1.0"},
)
try:
    with urllib.request.urlopen(req, timeout=20) as response:
        print(response.read().decode("utf-8")[:2500])
except Exception as error:
    print("GEOCODE_FAIL", type(error).__name__, error)

im = Image.open("assets/images/slide-2.jpg")
width, height = im.size
cropped = im.crop((0, 0, width, int(height * 0.90)))
cropped.save("assets/images/plato-pizarra.jpg", "JPEG", quality=82, optimize=True)
cropped.save("assets/images/plato-pizarra.webp", "WEBP", quality=76, method=6)
print("plato", cropped.size, os.path.getsize("assets/images/plato-pizarra.webp"))

for name in ("slide-1.jpg", "slide-3.jpg", "photo-1.jpg"):
    source = os.path.join("assets/images", name)
    image = Image.open(source).convert("RGB")
    target = source.rsplit(".", 1)[0] + ".webp"
    image.save(target, "WEBP", quality=76, method=6)
    print(target, image.size, os.path.getsize(source), os.path.getsize(target))
