import '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';
import { WithFaceLandmarks, SsdMobilenetv1Options, FaceDetection, FaceLandmarks68, draw } from 'face-api.js';
import canvas, { Canvas, Image, ImageData } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { MASK_CONFIG } from './maskConfig';

export const BASE_DIR = process.env.MASKS_PATH;
export const WEIGHTS_PATH = path.join(BASE_DIR, 'weights');
export const MASKS_PATH = path.join(BASE_DIR, 'masks');
export const MASKS = fs
  .readdirSync(MASKS_PATH)
  .map(fileName => path.parse(fileName).name)
  .filter(m => m[0] !== '.');

faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);

const faceDetectionOptions = new SsdMobilenetv1Options({ minConfidence: 0.5 });

type FaceParseResultType = WithFaceLandmarks<{ detection: FaceDetection }, FaceLandmarks68>;

const detectFaces = (img: faceapi.TNetInput) => faceapi.detectAllFaces(img, faceDetectionOptions).withFaceLandmarks();

const drawDebugInfo = (out: HTMLCanvasElement, results: FaceParseResultType[]) => {
  draw.drawFaceLandmarks(
    out,
    results.map(res => res.landmarks),
  );
  draw.drawDetections(
    out,
    results.map(res => res.detection),
  );
};

const loadMask = (maskName: string) => canvas.loadImage(path.join(MASKS_PATH, `${maskName}.png`));

type DrawImageArgs = {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  angle: number;
  height: number;
  width: number;
  image: CanvasImageSource;
};

const drawImage = ({ ctx, x, y, angle, width, height, image }: DrawImageArgs) => {
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate(angle);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
};

export const drawMask = async (maskName: keyof typeof MASK_CONFIG, img: canvas.Image) => {
  const results = await detectFaces(img as any);
  const out = faceapi.createCanvasFromMedia(img as any);
  const ctx = out.getContext('2d');

  const mask = await loadMask(maskName);

  results.forEach(res => {
    const leftEye = res.landmarks.getLeftEye()[0];
    const rightEye = res.landmarks.getRightEye().pop();
    const maskConf = MASK_CONFIG[maskName] || MASK_CONFIG.default;
    const angle = Math.atan((rightEye.y - leftEye.y) / (rightEye.x - leftEye.x));

    const xPoints = res.landmarks.positions.map(v => v.x);
    const yPoints = res.landmarks.positions.map(v => v.y);
    const minX = Math.min(...xPoints);
    const maxX = Math.max(...xPoints);
    const minY = Math.min(...yPoints);
    const maxY = Math.max(...yPoints);

    const x = minX + (maxX - minX) * maskConf.x;
    const y = minY + (maxY - minY) * maskConf.y;
    const width = (maxX - minX) * maskConf.width;
    const height = (maxY - minY) * maskConf.height;

    drawImage({
      ctx,
      x,
      y,
      width,
      height,
      angle,
      image: (mask as unknown) as CanvasImageSource,
    });

    if (process.env.NODE_ENV === 'development') {
      drawDebugInfo(out, results);
    }
  });

  return out;
};
