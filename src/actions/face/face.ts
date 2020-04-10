import { makePreview } from './makePreview';
import { iStartWith, skipBots } from '../../adapters/discord/operators';
import { DiscordRx } from '../../adapters/discord/discordRx';
import * as canvas from 'canvas';
import { MASKS, drawMask, WEIGHTS_PATH } from './drawMask';
import { MASK_CONFIG } from './maskConfig';
import { nets } from 'face-api.js';

export const face = async (client: DiscordRx) => {
  await nets.ssdMobilenetv1.loadFromDisk(WEIGHTS_PATH);
  await nets.faceLandmark68Net.loadFromDisk(WEIGHTS_PATH);

  const preview = await makePreview();
  const previewImage = preview.toBuffer('image/jpeg');

  client
    .flow('message')
    .pipe(skipBots(), iStartWith('face'))
    .subscribe(async msg => {
      const [, maskName, imgUrl] = msg.content.split(' ', 3);

      if (maskName === 'help' || !MASKS.includes(maskName)) {
        return void msg.reply('face **НАЗВАНИЕ_МАСКИ** @ник/изображение/ссылка на изображение/или ничего', {
          file: previewImage as any,
        });
      }

      const maskUrl =
        (imgUrl && imgUrl.startsWith('http') && imgUrl) ||
        (msg.attachments.size > 0 && msg.attachments.first().url) ||
        (msg.mentions.users.size > 0 && msg.mentions.users.first().avatarURL) ||
        msg.author.avatarURL;

      const img = await canvas.loadImage(maskUrl);
      const out = await drawMask(maskName as keyof typeof MASK_CONFIG, img);

      msg.reply('', {
        file: (out as any).toBuffer('image/jpeg'),
      });
    });
};
