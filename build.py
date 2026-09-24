"""Build a Pot .potext archive with only the explicitly listed public files."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent
info = json.loads((root / "info.json").read_text(encoding="utf-8"))
destination = root / "dist" / (info["id"] + ".potext")
destination.parent.mkdir(exist_ok=True)
files = ["info.json", "main.js", info["icon"], "LICENSE", "NOTICE", "README.md"]
with ZipFile(destination, "w", compression=ZIP_DEFLATED) as archive:
    for filename in files:
        archive.write(root / filename, arcname=filename)
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == set(files)
print(destination)
