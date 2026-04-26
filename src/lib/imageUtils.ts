export function generateThumbnail(
  imageDataUrl: string,
  options: { size?: number; background?: string; quality?: number } = {}
): Promise<string> {
  const { size = 200, background = '#F8F5F0', quality = 0.7 } = options;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const aspect = img.width / img.height;
      const tw = aspect > 1 ? size : Math.round(size * aspect);
      const th = aspect > 1 ? Math.round(size / aspect) : size;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, Math.round((size - tw) / 2), Math.round((size - th) / 2), tw, th);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
    img.src = imageDataUrl;
  });
}
