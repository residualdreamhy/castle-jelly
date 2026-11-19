import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parent
src = root / "src"
vendor = src / "vendor"


def read(path):
    return path.read_bytes().decode("utf-8")


imports = {}
for module in ("core", "webgpu"):
    encoded = base64.b64encode((vendor / f"three.{module}.min.js").read_bytes()).decode("ascii")
    imports[f"three/{module}"] = "data:text/javascript;base64," + encoded

script = (
    '<script type="importmap">'
    + json.dumps({"imports": imports})
    + '</script><script type="module">'
    + read(src / "app.js")
    + "</script><!-- "
    + read(vendor / "LICENSE")
    + " -->"
)
html = read(src / "page.html").replace("{{STYLE}}", read(src / "style.css")).replace("{{SCRIPTS}}", script)
(root / "index.html").write_bytes(html.encode("utf-8"))
