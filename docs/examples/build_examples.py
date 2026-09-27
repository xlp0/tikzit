#!/usr/bin/env python3
"""
Automated Build Pipeline: Compile all TikZiT .tikz files into standalone vector SVGs.
Requires: pdflatex (TeX Live / MacTeX) and pdftocairo (poppler).
"""

import os
import sys
import subprocess
import tempfile
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ZX_DIR = os.path.join(SCRIPT_DIR, "zx-calculus")
STYLE_FILE = os.path.join(ZX_DIR, "pqp-zx.tikzstyles")
MANIFEST_FILE = os.path.join(SCRIPT_DIR, "manifest.json")

def main():
    if not os.path.exists(STYLE_FILE):
        print(f"Error: Style file not found at {STYLE_FILE}")
        sys.exit(1)

    with open(STYLE_FILE, "r") as f:
        styles = f.read()

    tikz_files = sorted([f for f in os.listdir(ZX_DIR) if f.endswith(".tikz")])
    print(f"Compiling {len(tikz_files)} diagrams in {ZX_DIR}...")

    success_count = 0
    for tf in tikz_files:
        base = os.path.splitext(tf)[0]
        with open(os.path.join(ZX_DIR, tf), "r") as f:
            tikz_code = f.read()

        tex_doc = (
            r"\documentclass[tikz,border=6pt]{standalone}" + "\n"
            r"\usepackage{amsmath,amssymb}" + "\n"
            r"\usepackage{tikz}" + "\n"
            r"\usetikzlibrary{arrows.meta}" + "\n"
            r"\pgfdeclarelayer{nodelayer}" + "\n"
            r"\pgfdeclarelayer{edgelayer}" + "\n"
            r"\pgfsetlayers{edgelayer,nodelayer,main}" + "\n"
            + styles + "\n"
            r"\begin{document}" + "\n"
            + tikz_code + "\n"
            r"\end{document}" + "\n"
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            tex_path = os.path.join(tmpdir, "fig.tex")
            pdf_path = os.path.join(tmpdir, "fig.pdf")
            with open(tex_path, "w") as f:
                f.write(tex_doc)

            res = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_path],
                capture_output=True,
                text=True
            )
            if res.returncode != 0:
                print(f"[FAIL] {tf} LaTeX compilation failed.")
                continue

            svg_out = os.path.join(ZX_DIR, f"{base}.svg")
            cmd_cairo = ["pdftocairo", "-svg", pdf_path, svg_out]
            res_cairo = subprocess.run(cmd_cairo, capture_output=True, text=True)
            if res_cairo.returncode == 0:
                print(f"[OK] {base}.svg generated.")
                success_count += 1
            else:
                print(f"[FAIL] {tf} pdftocairo SVG conversion failed.")

    print(f"Compilation finished: {success_count}/{len(tikz_files)} successfully converted to SVG.")

if __name__ == "__main__":
    main()
