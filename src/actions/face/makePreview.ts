import { drawMask, BASE_DIR } from './drawMask';
import * as canvas from 'canvas';
import * as path from 'path';
import * as fs from 'fs';
import { MASKS } from './drawMask';
import { MASK_CONFIG } from 'actions/face/maskConfig';

const PREVIEW_PATH = path.join(BASE_DIR, 'preview');
const MAX_IN_ROW = 6;
const IMAGE_SIZE = 100;

export const makePreview = async () => {
  const face = await canvas.loadImage(path.join(PREVIEW_PATH, '_face.png'));
  const previews = await Promise.all(MASKS.map(maskName => drawMask(maskName as keyof typeof MASK_CONFIG, face)));

  const width = MAX_IN_ROW * IMAGE_SIZE;
  const height = Math.ceil(previews.length / MAX_IN_ROW) * IMAGE_SIZE;

  const result = canvas.createCanvas(width, height);
  const ctx = result.getContext('2d');

  previews.forEach((img, i) => {
    const x = Math.floor((i + 1) % MAX_IN_ROW) * IMAGE_SIZE;
    const y = Math.ceil((i + 1) / MAX_IN_ROW - 1) * IMAGE_SIZE;

    ctx.drawImage(img, x, y, IMAGE_SIZE, IMAGE_SIZE);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.font = 'bold 20px Arial';

    const textSize = ctx.measureText(MASKS[i]);
    ctx.fillText(MASKS[i], x + (IMAGE_SIZE - textSize.width) / 2, y + 20);
    ctx.strokeText(MASKS[i], x + (IMAGE_SIZE - textSize.width) / 2, y + 20);
  });

  fs.writeFileSync(path.join(PREVIEW_PATH, 'preview.png'), result.toBuffer());

  return result;
};
