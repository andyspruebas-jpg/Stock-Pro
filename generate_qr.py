
import qrcode
from PIL import Image, ImageDraw, ImageOps

def generate_custom_qr(url, background_color="#E31E24", module_color="#FFFFFF"):
    # Generate QR
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=20,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Create base image
    qr_img = qr.make_image(fill_color=module_color, back_color=background_color).convert('RGBA')
    
    # We can refine this to make modules rounded if we want, 
    # but for a "always work" guarantee, let's keep it clean first.
    # However, to match the "stylized" look, let's try to round the modules.
    
    width, height = qr_img.size
    styled_qr = Image.new('RGBA', (width, height), background_color)
    draw = ImageDraw.Draw(styled_qr)
    
    # Iterate through the modules to draw them as rounded squares
    matrix = qr.get_matrix()
    box_size = 20
    border = 4
    
    for r, row in enumerate(matrix):
        for c, val in enumerate(row):
            if val:
                x = (c) * box_size
                y = (r) * box_size
                # Draw rounded rectangle (circle looks modern)
                draw.rounded_rectangle([x+1, y+1, x+box_size-1, y+box_size-1], radius=6, fill=module_color)

    # Add middle logo placeholder (White circle with "andy's")
    center_size = width // 4
    center_x = width // 2
    center_y = height // 2
    
    # Clear center
    draw.ellipse([center_x - center_size//2, center_y - center_size//2, 
                  center_x + center_size//2, center_y + center_size//2], 
                 fill=background_color)
    
    # Draw white circle for logo
    # Actually let's just use the stylized text if we could, 
    # but since we lack specific fonts, let's just leave the space clean or put a simple text.
    # The user might prefer just the scannable QR.
    
    # Save image
    styled_qr.save("andys_qr_scannable.png")
    print("QR saved as andys_qr_scannable.png")

if __name__ == "__main__":
    generate_custom_qr("https://andys.com.bo/ofertas")
