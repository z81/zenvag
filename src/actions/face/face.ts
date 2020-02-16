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

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);

const MASKS = fs.readdirSync(MASKS_PATH).map(mask => mask.split('.')[0]);

const faceDetectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

export const face = async (client: DiscordRx, { db }: any) => {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(WEIGHTS_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(WEIGHTS_PATH);

  client
    .flow('message')
    .pipe(skipBots(), iStartWith('face'))
    .subscribe(async msg => {
      const [, maskName] = msg.content.split(' ', 3);
      const url =
        (msg.attachments.size > 0 && msg.attachments.first().url) ||
        (msg.mentions.users.size > 0 && msg.mentions.users.first().avatarURL) ||
        msg.author.avatarURL;

      if (url) {
        const imgBuffer = await got(url).buffer();
        const img = await canvas.loadImage(imgBuffer);
        const results = await faceapi.detectAllFaces(img, faceDetectionOptions).withFaceLandmarks();
        const out = faceapi.createCanvasFromMedia(img);
        const ctx = out.getContext('2d');

        faceapi.draw.drawFaceLandmarks(
          out,
          results.map(res => res.landmarks),
        );
        faceapi.draw.drawDetections(
          out,
          results.map(res => res.detection),
        );

        if (MASKS.includes(maskName)) {
          const shlapa = await canvas.loadImage(path.join(MASKS_PATH, `${maskName}.png`));

          results.forEach(res => {
            const box = res.detection.box;
            const r = box.topRight;
            const l = box.topLeft;

            const p1 = res.landmarks.getLeftEye()[0];
            const p2 = res.landmarks.getRightEye()[res.landmarks.getRightEye().length - 1];

            const imgBorder = {
              l: 1,
              w: 1,
              t: 0.2, //-0.2, //0.7,
              h: 1,
            };

            const angle = Math.atan((p2.y - p1.y) / (p2.x - p1.x)) * (180 / Math.PI);

            ctx.fillStyle = 'rgb(255, 255, 0)';

            const minX = Math.min(...res.landmarks.positions.map(v => v.x));
            const maxX = Math.max(...res.landmarks.positions.map(v => v.x));
            const minY = Math.min(...res.landmarks.positions.map(v => v.y));
            const maxY = Math.max(...res.landmarks.positions.map(v => v.y));

            const offsetY = maxY - minY;
            const middleX = minX + (maxX - minX) / 2;
            const [nose] = res.landmarks.getNose();

            const leftOffsetX = Math.min(middleX - nose.x, 0);

            ctx.fillRect(minX, 100, 20, 20);
            ctx.fillRect(maxX, 100, 20, 20);
            ctx.fillRect(nose.x, nose.y, 20, 20);

            ctx.translate(l.x, l.y - offsetY);
            ctx.rotate((angle * Math.PI) / 180);
            const h = box.height + offsetY;
            const w = box.width - leftOffsetX;

            ctx.drawImage(shlapa, 1 * imgBorder.l + leftOffsetX, -h * imgBorder.t, w * imgBorder.w, h * imgBorder.h);

            //ctx.fillRect(imgBorder.l + 30, imgBorder.t + 30, 30, 30);

            // ctx.fillRect(0, 0, 70, 70);
            ctx.rotate(-(angle * Math.PI) / 180);
            ctx.translate(-l.x, -l.y + offsetY);
          });
        }

        msg.reply('', {
          file: out.toBuffer('image/jpeg'),
        });
      } else {
        msg.reply('Саси');
      }
    });
};
