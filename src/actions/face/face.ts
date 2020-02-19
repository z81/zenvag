import { iStartWith, skipBots } from '../../adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';
import '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';
import * as canvas from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import got from 'got';

const BASE_DIR = '/Users/z81/dev/zenvag/src/actions/face'; //path.resolve(__dirname, '.');
const WEIGHTS_PATH = path.join(BASE_DIR, 'weights');
const MASKS_PATH = path.join(BASE_DIR, 'masks');
const MASKS = fs.readdirSync(MASKS_PATH).map(fileName => path.parse(fileName).name);

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);
const faceDetectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

type FaceParseResultType = faceapi.WithFaceLandmarks<
  {
    detection: faceapi.FaceDetection;
  },
  faceapi.FaceLandmarks68
>;

enum MaskTypes {
  HEAD,
  EYES,
  MOUTH,
  EYES_MOUTH,
}

// const MASK_CONFIG = {
//   default: {
//     top: 1,
//     left: 1,
//     width: 1,
//     height: 1,
//   },
//   bandit: {
//     top: 0.7,
//     left: 0.9,
//     width: 1.1,
//     height: 1.5,
//   },
//   js: {
//     top: -0.5,
//     left: 1,
//     width: 1,
//     height: 0.7,
//   },
//   fbi: {
//     top: -1,
//     left: 0.7,
//     width: 1.2,
//     height: 0.7,
//   },
//   batman: {
//     top: -2.5,
//     left: 1.1,
//     width: 1,
//     height: 1.1,
//   },
//   cat: {
//     top: -2.5,
//     left: 1.1,
//     width: 1,
//     height: 1.4,
//   },
//   gasmask: {
//     top: 0.7,
//     left: 0.9,
//     width: 1.1,
//     height: 1.5,
//   },
// };

const MASK_CONFIG = {
  default: {
    top: 1,
    left: 1,
    width: 1,
    height: 1,
  },
};

export const face = async (client: DiscordRx, { db }: any) => {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(WEIGHTS_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(WEIGHTS_PATH);

  const downloadImage = async (url: string) => {
    const imgBuffer = await got(url).buffer();
    const img = await canvas.loadImage(imgBuffer);
    return img;
  };

  const detectFaces = (img: faceapi.TNetInput) => faceapi.detectAllFaces(img, faceDetectionOptions).withFaceLandmarks();

  const drawDebugInfo = (out: HTMLCanvasElement, results: FaceParseResultType[]) => {
    faceapi.draw.drawFaceLandmarks(
      out,
      results.map(res => res.landmarks),
    );
    faceapi.draw.drawDetections(
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
    sh: number;
    sw: number;
    image: CanvasImageSource;
  };
  const drawImage = ({ ctx, x, y, angle, sw, sh, image }: DrawImageArgs) => {
    if (angle > 0.2) {
      ctx.rotate(angle);

      ctx.drawImage(image, (x + sw / 2) * angle, (y - sh / 2) * angle, sw, sh);
      ctx.rotate(-angle);
    } else {
      ctx.drawImage(image, x, y, sw, sh);
    }
  };

  client
    .flow('message')
    .pipe(skipBots(), iStartWith('face'))
    .subscribe(async msg => {
      const [, maskName] = msg.content.split(' ', 3);
      const url =
        (msg.attachments.size > 0 && msg.attachments.first().url) ||
        (msg.mentions.users.size > 0 && msg.mentions.users.first().avatarURL) ||
        msg.author.avatarURL;

      const img = await downloadImage(url);
      const results = await detectFaces(img as any);
      const out = faceapi.createCanvasFromMedia(img as any);
      const ctx = out.getContext('2d');

      drawDebugInfo(out, results);

      if (MASKS.includes(maskName)) {
        const mask = await loadMask(maskName);

        results.forEach(res => {
          const { box } = res.detection;
          const drawPos = box.topLeft;

          const leftEye = res.landmarks.getLeftEye()[0];
          const rightEye = res.landmarks.getRightEye().pop();
          const imgBorder = MASK_CONFIG[maskName] || MASK_CONFIG.default;
          const angle = Math.atan((rightEye.y - leftEye.y) / (rightEye.x - leftEye.x));
          console.log('angle', angle);

          ctx.fillStyle = 'rgb(255, 255, 0)';

          const xPoints = res.landmarks.positions.map(v => v.x);
          const yPoints = res.landmarks.positions.map(v => v.y);
          const minX = Math.min(...xPoints);
          const maxX = Math.max(...xPoints);
          const minY = Math.min(...yPoints);
          const maxY = Math.max(...yPoints);

          // const faceOffsetLeft = maxY - minY;
          // const faceOffsetRight = minY - maxY;
          // const middleX = minX + (maxX - minX) / 2;
          // const [nose] = res.landmarks.getNose();

          ctx.strokeStyle = 'rgb(255, 255, 0)';
          // const centerOffset = (middleX - nose.x) * 2;
          ctx.fillRect(100, minY, 10, 10);

          const correctFaceLeft = res.landmarks.getLeftEyeBrow()[0].x - minX;
          const correctFaceRight = maxX - res.landmarks.getRightEyeBrow().pop().x;
          const correctFaceTop = /*minY - */ (minY * ((maxY - minY) / (maxX - minX))) / 2;
          // ctx.fillRect(correctFaceTop, 100, 10, 10);

          const x = box.topLeft.x - correctFaceLeft; //- centerOffset;
          const y = box.topLeft.y - correctFaceTop;
          const w = box.width + correctFaceLeft * 2 + correctFaceRight;
          const h = box.height + correctFaceTop * 1.1;
          ctx.strokeRect(x, y, w, h);

          // ctx.fillRect(minX, 100, 20, 20);
          // ctx.fillRect(maxX, 100, 20, 20);
          // ctx.fillRect(nose.x, nose.y, 20, 20);

          // const x = drawPos.x + leftOffsetX;
          // const y = drawPos.y + box.height; //+ offsetY;
          // const h = box.height + faceOffsetLeft;
          // const w = box.width - leftOffsetX * 2;

          // const sx = 1 * imgBorder.left; // + leftOffsetX;
          // const sy = -h * imgBorder.top;
          const sw = w * imgBorder.width;
          const sh = h * imgBorder.height;

          // const nose2 = res.landmarks.getNose();
          // const jawline = res.landmarks.getJawOutline();

          // const jawLeft = jawline[0];
          // const jawRight = jawline.splice(-1)[0];
          // const adjacent = jawRight.x - jawLeft.x;
          // const opposite = jawRight.y - jawLeft.y;
          // const jawLength = Math.sqrt(Math.pow(adjacent, 2) + Math.pow(opposite, 2));

          // // ctx.drawImage(mask as any, leftOffset * scale, topOffset * scale, width, width);

          drawImage({
            ctx,
            x: x * imgBorder.left,
            y: y * imgBorder.top,
            sw,
            sh,
            angle,
            image: mask as any,
          });

          // ctx.strokeRect(x, y, sw, sy);
        });
      }

      msg.reply('', {
        file: (out as any).toBuffer('image/jpeg'),
      });
    });
};
