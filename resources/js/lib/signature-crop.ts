export interface PixelCrop {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Creates an Image element from a source URL
 */
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

/**
 * Creates a standard 400x400 PNG File from an image and crop coordinates
 * with solid white background to ensure 1:1 square ratio without distortion.
 */
export async function createSignatureFile(
    imageSrc: string,
    pixelCrop: PixelCrop,
    fileName: string = 'signature_cropped.png'
): Promise<File> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Canvas 2D context is not supported');
    }

    // Standard 400x400 output dimensions
    canvas.width = 400;
    canvas.height = 400;

    // Fill with solid white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);

    // Draw the cropped area scaled directly to 400x400
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        400,
        400
    );

    return new Promise<File>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to create PNG blob from canvas'));
                return;
            }
            const file = new File([blob], fileName, { type: 'image/png' });
            resolve(file);
        }, 'image/png');
    });
}
