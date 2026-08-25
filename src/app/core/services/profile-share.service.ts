import { Injectable } from '@angular/core';
import { PlayerStatScore } from '../models/game.models';

export interface ShareCareerSummary {
  readonly name: string;
  readonly realWorldTitle: string;
}

export interface AdventureShareProfile {
  readonly careers: readonly ShareCareerSummary[];
  readonly skills: readonly string[];
  readonly stats: readonly PlayerStatScore[];
  readonly level: number;
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

@Injectable({ providedIn: 'root' })
export class ProfileShareService {
  download(profile: AdventureShareProfile): void {
    this.downloadFile(this.createProfileImage(profile));
  }

  async shareOrDownload(profile: AdventureShareProfile): Promise<ShareResult> {
    const file = this.createProfileImage(profile);
    const shareData: ShareData = {
      files: [file],
      title: '我的智慧醫療冒險履歷',
      text: this.shareText(profile),
    };

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share(shareData);
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      }
    }

    this.downloadFile(file);
    return 'downloaded';
  }

  private shareText(profile: AdventureShareProfile): string {
    const [primaryCareer, ...otherCareers] = profile.careers;
    if (!primaryCareer) return `我在智慧醫療大陸收集了 ${profile.skills.length} 張技能卡！`;
    const otherCareerNames = otherCareers.map((career) => `「${career.name}」`).join('、');
    return otherCareers.length
      ? `我的主要職階是「${primaryCareer.name}」，也覺醒了${otherCareerNames}，並收集了 ${profile.skills.length} 張技能卡！`
      : `我的主要職階是「${primaryCareer.name}」，並收集了 ${profile.skills.length} 張技能卡！`;
  }

  private createProfileImage(profile: AdventureShareProfile): File {
    const otherCareerRows = Math.ceil(Math.max(0, profile.careers.length - 1) / 4);
    const otherCareersHeight = otherCareerRows ? 55 + otherCareerRows * 104 : 0;
    const skillsHeadingY = 1160 + otherCareersHeight;
    const skillChipStartY = skillsHeadingY + 35;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = Math.max(
      1500,
      skillChipStartY + Math.ceil(profile.skills.length / 4) * 54 + 100,
    );
    const context = canvas.getContext('2d');
    if (!context) throw new Error('無法建立冒險履歷圖片。');

    const background = context.createLinearGradient(0, 0, 1200, canvas.height);
    background.addColorStop(0, '#080d20');
    background.addColorStop(0.54, '#101a39');
    background.addColorStop(1, '#070b18');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    this.drawPortrait(context);
    const portraitShade = context.createLinearGradient(0, 0, 0, 590);
    portraitShade.addColorStop(0, 'rgba(5, 9, 22, 0.06)');
    portraitShade.addColorStop(0.64, 'rgba(5, 9, 22, 0.34)');
    portraitShade.addColorStop(1, '#101a39');
    context.fillStyle = portraitShade;
    context.fillRect(0, 0, 1200, 610);

    context.fillStyle = '#f5d999';
    context.font = '700 30px system-ui, sans-serif';
    context.fillText('SMART HEALTH QUEST', 64, 70);
    context.fillStyle = '#ffffff';
    context.font = '700 60px "Noto Serif TC", serif';
    context.fillText('智慧醫療冒險履歷', 64, 145);
    context.fillStyle = '#9ceff1';
    context.font = '700 24px system-ui, sans-serif';
    context.fillText(`LV.${profile.level} 冒險者 ・ ${profile.skills.length} 張技能卡`, 67, 190);

    const primaryCareer = profile.careers[0];
    if (primaryCareer) {
      context.fillStyle = '#f5d999';
      context.font = '700 23px system-ui, sans-serif';
      context.fillText('主要分享職階', 65, 430);
      context.fillStyle = '#ffffff';
      context.font = '700 54px "Noto Serif TC", serif';
      context.fillText(primaryCareer.name, 64, 495);
      context.fillStyle = '#c1c9dc';
      context.font = '500 24px system-ui, sans-serif';
      context.fillText(primaryCareer.realWorldTitle, 65, 535);
    }

    context.fillStyle = '#101a39';
    context.fillRect(46, 580, 1108, 520);
    context.strokeStyle = 'rgba(104, 231, 236, 0.28)';
    context.lineWidth = 2;
    context.strokeRect(46, 580, 1108, 520);
    context.fillStyle = '#9ceff1';
    context.font = '700 24px system-ui, sans-serif';
    context.fillText('本次冒險的探索分布', 76, 630);

    profile.stats.forEach((stat, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 76 + column * 542;
      const y = 680 + row * 100;
      context.fillStyle = '#e7ebf4';
      context.font = '600 23px system-ui, sans-serif';
      context.fillText(stat.name, x, y);
      context.fillStyle = '#8d97ad';
      context.fillRect(x, y + 22, 430, 14);
      context.fillStyle = stat.accent;
      context.fillRect(x, y + 22, 430 * (stat.value / 10), 14);
      context.fillStyle = '#ffffff';
      context.font = '700 22px Georgia, serif';
      context.fillText(String(stat.value), x + 448, y + 35);
    });

    if (profile.careers.length > 1) this.drawOtherCareers(context, profile, 1160);

    context.fillStyle = '#9ceff1';
    context.font = '700 23px system-ui, sans-serif';
    context.fillText('取得的技能卡', 64, skillsHeadingY);
    let chipX = 64;
    let chipY = skillChipStartY;
    context.font = '600 20px system-ui, sans-serif';
    profile.skills.forEach((skill) => {
      const width = Math.min(250, context.measureText(skill).width + 38);
      if (chipX + width > 1135) {
        chipX = 64;
        chipY += 54;
      }
      context.fillStyle = 'rgba(169, 135, 255, 0.16)';
      context.fillRect(chipX, chipY, width, 38);
      context.strokeStyle = 'rgba(169, 135, 255, 0.45)';
      context.strokeRect(chipX, chipY, width, 38);
      context.fillStyle = '#e0d8ff';
      context.fillText(skill, chipX + 18, chipY + 26);
      chipX += width + 12;
    });

    context.fillStyle = '#77839e';
    context.font = '500 17px system-ui, sans-serif';
    context.fillText('這是本次探索軌跡，不是能力或職涯測驗結果。', 64, canvas.height - 30);

    return this.dataUrlToFile(canvas.toDataURL('image/png'), 'smart-health-adventure-profile.png');
  }

  private drawOtherCareers(
    context: CanvasRenderingContext2D,
    profile: AdventureShareProfile,
    startY: number,
  ): void {
    const otherCareers = profile.careers.slice(1);
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>('.career-card:not(.is-active) img'),
    );
    context.fillStyle = '#f5d999';
    context.font = '700 23px system-ui, sans-serif';
    context.fillText(`其他已覺醒職業 ・ ${otherCareers.length}`, 64, startY);

    otherCareers.forEach((career, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = 64 + column * 268;
      const y = startY + 24 + row * 104;
      context.fillStyle = 'rgba(20, 31, 63, 0.9)';
      context.fillRect(x, y, 250, 88);
      context.strokeStyle = 'rgba(169, 135, 255, 0.32)';
      context.strokeRect(x, y, 250, 88);
      const image = images[index];
      if (image?.complete && image.naturalWidth) this.drawImageCover(context, image, x, y, 62, 88);
      else {
        context.fillStyle = '#9ceff1';
        context.font = '700 30px Georgia, serif';
        context.fillText('✦', x + 18, y + 54);
      }
      context.fillStyle = '#e7ebf4';
      context.font = '700 19px "Noto Serif TC", serif';
      this.drawWrappedText(context, career.name, x + 74, y + 32, 164, 24, 2);
    });
  }

  private drawPortrait(context: CanvasRenderingContext2D): void {
    const image = document.querySelector<HTMLImageElement>('.career-card.is-active img');
    if (!image?.complete || !image.naturalWidth) return;
    const targetWidth = 1200;
    const targetHeight = 610;
    const scale = Math.max(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight);
    const sourceWidth = targetWidth / scale;
    const sourceHeight = targetHeight / scale;
    const sourceX = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
    const sourceY = Math.max(0, image.naturalHeight * 0.05);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      Math.min(sourceHeight, image.naturalHeight - sourceY),
      0,
      0,
      targetWidth,
      targetHeight,
    );
  }

  private drawImageCover(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    context.drawImage(
      image,
      Math.max(0, (image.naturalWidth - sourceWidth) / 2),
      0,
      sourceWidth,
      Math.min(sourceHeight, image.naturalHeight),
      x,
      y,
      width,
      height,
    );
  }

  private drawWrappedText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ): void {
    const characters = [...text];
    let line = '';
    let lineNumber = 0;
    for (const character of characters) {
      const candidate = line + character;
      if (context.measureText(candidate).width > maxWidth && line) {
        context.fillText(line, x, y + lineNumber * lineHeight);
        line = character;
        lineNumber += 1;
        if (lineNumber >= maxLines) return;
      } else {
        line = candidate;
      }
    }
    if (line && lineNumber < maxLines) context.fillText(line, x, y + lineNumber * lineHeight);
  }

  private dataUrlToFile(dataUrl: string, filename: string): File {
    const [metadata, base64] = dataUrl.split(',');
    const mimeType = metadata.match(/data:(.*?);/)?.[1] ?? 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new File([bytes], filename, { type: mimeType });
  }

  private downloadFile(file: File): void {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
