from PIL import Image
import os

# Source logo
src_path = r"D:\E-Commerse-E\frontend\public\nobaraa_logo_emblem.png"
# Destination paths (we will save in multiple drawable folders for Android)
res_path = r"D:\E-Commerse-E\frontend\android\app\src\main\res"

if os.path.exists(src_path):
    print("Found emblem logo.")
    img = Image.open(src_path).convert("RGBA")
    
    # We want to create a white silhouette:
    # Keep the alpha channel, but set R, G, B of all non-transparent pixels to 255 (white)
    datas = img.getdata()
    new_data = []
    for item in datas:
        # item is (r, g, b, a)
        # If alpha is greater than 0, make it white (255, 255, 255, item[3])
        if item[3] > 0:
            new_data.append((255, 255, 255, item[3]))
        else:
            new_data.append((0, 0, 0, 0))
            
    img.putdata(new_data)
    
    # Resize and save for different drawable folders
    sizes = {
        'drawable': 96,
        'drawable-mdpi': 24,
        'drawable-hdpi': 36,
        'drawable-xhdpi': 48,
        'drawable-xxhdpi': 72,
        'drawable-xxxhdpi': 96
    }
    
    for folder, size in sizes.items():
        folder_path = os.path.join(res_path, folder)
        os.makedirs(folder_path, exist_ok=True)
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(folder_path, "ic_notification.png"))
        print(f"Saved ic_notification.png ({size}x{size}) in {folder}")
else:
    print(f"Source file not found at {src_path}")
