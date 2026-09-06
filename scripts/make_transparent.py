import os
from PIL import Image

def process_image(filepath, threshold=20, soft_range=30):
    img = Image.open(filepath).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        r, g, b, a = item
        # calculate max channel intensity
        max_val = max(r, g, b)
        if max_val <= threshold:
            new_data.append((0, 0, 0, 0))
        elif max_val <= threshold + soft_range:
            alpha = int(((max_val - threshold) / soft_range) * 255)
            new_data.append((r, g, b, min(a, alpha)))
        else:
            new_data.append((r, g, b, a))

    img.putdata(new_data)
    img.save(filepath, "PNG")
    print(f"Processed transparent PNG for {filepath}")

def process_directory(directory):
    for filename in os.listdir(directory):
        if filename.endswith(".png"):
            full_path = os.path.join(directory, filename)
            try:
                process_image(full_path)
            except Exception as e:
                print(f"Failed to process {full_path}: {e}")

if __name__ == "__main__":
    import sys
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "public/plants"
    process_directory(target_dir)
