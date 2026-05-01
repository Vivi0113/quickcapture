#!/usr/bin/env python3
"""Generate tray icons for QuickCapture"""
import os
import struct
import zlib

def create_png(width, height, pixels):
    """Create a minimal PNG file"""
    def png_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)

    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    ihdr = png_chunk(b'IHDR', ihdr_data)

    # IDAT chunk (image data)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter type none
        for x in range(width):
            idx = (y * width + x) * 4
            raw_data += pixels[idx:idx+4]

    compressed = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed)

    # IEND chunk
    iend = png_chunk(b'IEND', b'')

    return signature + ihdr + idat + iend

def create_icon(size):
    """Create a simple Q icon"""
    pixels = bytearray(size * size * 4)

    center = size // 2
    radius = size // 2 - 2

    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            # Distance from center
            dx = x - center
            dy = y - center
            dist = (dx*dx + dy*dy) ** 0.5

            if dist < radius and dist > radius - 3:
                # Ring - blue color
                pixels[idx] = 59   # R
                pixels[idx+1] = 130 # G
                pixels[idx+2] = 246 # B
                pixels[idx+3] = 255 # A
            elif dist <= radius - 3 and x > center - radius//3 and y < center + radius//3:
                # Q tail - same blue
                pixels[idx] = 59
                pixels[idx+1] = 130
                pixels[idx+2] = 246
                pixels[idx+3] = 255
            else:
                # Transparent
                pixels[idx:idx+4] = [0, 0, 0, 0]

    return create_png(size, size, bytes(pixels))

def create_tray_icon(size):
    """Create a tray icon - simple Q letter"""
    pixels = bytearray(size * size * 4)
    center = size // 2
    radius = size // 2 - 1

    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            dx = x - center
            dy = y - center
            dist = (dx*dx + dy*dy) ** 0.5

            # Simple filled circle with Q letter approximation
            if dist < radius - 2:
                # Inside circle - draw a simplified Q
                in_q_tail = (x > center and y > center and
                            (x - center) + (y - center) < radius // 2)
                if in_q_tail or (abs(dx) < radius//3 and abs(dy) < radius//2):
                    # Q or vertical bar
                    pixels[idx] = 59
                    pixels[idx+1] = 130
                    pixels[idx+2] = 246
                    pixels[idx+3] = 255
                else:
                    # Transparent
                    pixels[idx:idx+4] = [0, 0, 0, 0]
            elif dist <= radius:
                # Border
                pixels[idx] = 59
                pixels[idx+1] = 130
                pixels[idx+2] = 246
                pixels[idx+3] = 255
            else:
                pixels[idx:idx+4] = [0, 0, 0, 0]

    return create_png(size, size, bytes(pixels))

def main():
    icons_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    # Create tray icons (16x16 and 32x32 for macOS retina)
    tray_16 = create_tray_icon(16)
    tray_32 = create_tray_icon(32)

    with open(os.path.join(icons_dir, 'tray-icon.png'), 'wb') as f:
        f.write(tray_16)

    # Create larger icons for app
    icon_256 = create_icon(256)

    print(f"Icons created in {icons_dir}")

if __name__ == '__main__':
    main()
