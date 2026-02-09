
import qrcode
from PIL import Image

def generate_andys_qr():
    url = "https://andys.com.bo/ofertas"
    # Andy's Red (approximate from brand images)
    andys_red = (227, 30, 36) 
    white = (255, 255, 255)

    # Use high error correction level H (up to 30% damage/overlay)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=20,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Create the QR image
    # fill_color is the color of the modules (white)
    # back_color is the background (red)
    img = qr.make_image(fill_color=white, back_color=andys_red).convert('RGB')

    # Save it
    img.save("/home/gabriel/Quiebra/qr_ofertas_andys.png")
    print("QR code for https://andys.com.bo/ofertas generated successfully.")

if __name__ == "__main__":
    generate_andys_qr()
