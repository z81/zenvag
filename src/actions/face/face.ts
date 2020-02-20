import { iStartWith, skipBots } from '../../adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';
import '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';
import { WithFaceLandmarks, SsdMobilenetv1Options, FaceDetection, FaceLandmarks68, nets, draw } from 'face-api.js';
import * as canvas from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import got from 'got';

const BASE_DIR = process.env.MASKS_PATH;
const WEIGHTS_PATH = path.join(BASE_DIR, 'weights');
const MASKS_PATH = path.join(BASE_DIR, 'masks');
const MASKS = fs
  .readdirSync(MASKS_PATH)
  .map(fileName => path.parse(fileName).name)
  .filter(m => m[0] !== '.');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);

const faceDetectionOptions = new SsdMobilenetv1Options({ minConfidence: 0.5 });

type FaceParseResultType = WithFaceLandmarks<{ detection: FaceDetection }, FaceLandmarks68>;

const MASK_CONFIG = {
  default: {
    x: 1,
    y: 1,
    width: 1,
    height: 1,
  },
  bandit: {
    x: -0.1,
    y: -0.7,
    width: 1.2,
    height: 2.6,
  },
  gasmask: {
    x: -0.1,
    y: -0.7,
    width: 1.2,
    height: 2.6,
  },
  batman: {
    x: -0.1,
    y: -0.8,
    width: 1.2,
    height: 1.5,
  },
  cat: {
    x: -0.1,
    y: -0.7,
    width: 1.2,
    height: 1.8,
  },
  deadface: {
    x: -0.9,
    y: -0.4,
    width: 0.6,
    height: 1.5,
  },
  fbi: {
    x: -0.2,
    y: -1.1,
    width: 1.4,
    height: 1.5,
  },
  anon: {
    x: -0.4,
    y: -0.5,
    width: 1.8,
    height: 2,
  },
  hair: {
    x: -0.1,
    y: -0.55,
    width: 1.2,
    height: 1.6,
  },
  js: {
    x: -0.1,
    y: -0.9,
    width: 1.2,
    height: 1.1,
  },
  santa: {
    x: -0.1,
    y: -0.9,
    width: 1.65,
    height: 1.1,
  },
  mustache: {
    x: 0.05,
    y: 0.5,
    width: 0.9,
    height: 0.6,
  },
};

export const face = async (client: DiscordRx, { db }: any) => {
  await nets.ssdMobilenetv1.loadFromDisk(WEIGHTS_PATH);
  await nets.faceLandmark68Net.loadFromDisk(WEIGHTS_PATH);

  const downloadImage = async (url: string) => {
    const imgBuffer = await got(url).buffer();
    const img = await canvas.loadImage(imgBuffer);
    return img;
  };

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

  client
    .flow('message')
    .pipe(skipBots(), iStartWith('face'))
    .subscribe(async msg => {
      const [, maskName] = msg.content.split(' ', 3);

      if (maskName === 'help' || !MASKS.includes(maskName)) {
        return void msg.reply(`\n**Список масок:** ${MASKS.join(', ')}`);
      }

      const url =
        (msg.attachments.size > 0 && msg.attachments.first().url) ||
        (msg.mentions.users.size > 0 && msg.mentions.users.first().avatarURL) ||
        msg.author.avatarURL;

      const img = await downloadImage(url);
      const results = await detectFaces(img as any);
      const out = faceapi.createCanvasFromMedia(img as any);
      const ctx = out.getContext('2d');

      if (process.env.NODE_ENV === 'development') {
        drawDebugInfo(out, results);
      }

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
          image: mask as any,
        });
      });

      msg.reply('', {
        file: (out as any).toBuffer('image/jpeg'),
      });
    });
};
