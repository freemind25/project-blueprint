import subprocess, os, shutil

svg_192 = '''<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#09090b"/>
  <circle cx="96" cy="80" r="40" fill="none" stroke="#22c55e" stroke-width="6"/>
  <circle cx="80" cy="72" r="6" fill="#22c55e"/>
  <circle cx="112" cy="72" r="6" fill="#22c55e"/>
  <rect x="80" y="86" width="32" height="6" rx="3" fill="#22c55e"/>
  <line x1="56" y1="48" x2="136" y2="128" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>
  <text x="96" y="155" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="bold" fill="#22c55e">UnRobot</text>
  <text x="96" y="178" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#a1a1aa">100% Local</text>
</svg>'''

svg_512 = svg_192.replace('width="192" height="192" viewBox="0 0 192 192"', 'width="512" height="512" viewBox="0 0 192 192"')

os.makedirs('/home/z/my-project/public/icons', exist_ok=True)

with open('/home/z/my-project/public/icons/icon-192.svg', 'w') as f:
    f.write(svg_192)
with open('/home/z/my-project/public/icons/icon-512.svg', 'w') as f:
    f.write(svg_512)

# Try converting to PNG using cairosvg or rsvg-convert
for size in ['192', '512']:
    src = f'/home/z/my-project/public/icons/icon-{size}.svg'
    dst = f'/home/z/my-project/public/icons/icon-{size}.png'
    try:
        import cairosvg
        cairosvg.svg2png(url=src, write_to=dst, output_width=int(size), output_height=int(size))
        print(f"Created {dst} via cairosvg")
    except ImportError:
        try:
            subprocess.run(['rsvg-convert', '-w', size, '-h', size, '-o', dst, src], check=True)
            print(f"Created {dst} via rsvg-convert")
        except (FileNotFoundError, subprocess.CalledProcessError):
            print(f"PNG conversion failed for {size}, copying SVG as PNG fallback")
            shutil.copy2(src, dst)