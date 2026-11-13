// Make a picture small before uploading it: a profile picture becomes a
// 256 px square (cropped to the middle), a logo at most 512 px on its longest
// side (transparency kept). SVG logos are kept as they are.
export async function resizeImage(file: File, opts: { size: number; square: boolean }): Promise<File> {
  if (file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  let sx = 0;
  let sy = 0;
  let sw = width;
  let sh = height;
  let w: number;
  let h: number;
  if (opts.square) {
    const side = Math.min(width, height);
    sx = (width - side) / 2;
    sy = (height - side) / 2;
    sw = sh = side;
    w = h = Math.min(opts.size, side);
  } else {
    const scale = Math.min(1, opts.size / Math.max(width, height));
    w = Math.round(width * scale);
    h = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();
  // photos as JPEG (small), logos as PNG (keeps transparency)
  const type = opts.square ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88));
  if (!blob) throw new Error("Couldn't read that picture");
  const base = file.name.replace(/\.[^.]+$/, "") || "picture";
  return new File([blob], `${base}.${opts.square ? "jpg" : "png"}`, { type });
}
