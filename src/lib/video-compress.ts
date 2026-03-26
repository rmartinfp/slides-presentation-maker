/**
 * Client-side video compression using FFmpeg.wasm.
 * Compresses video to web-optimized MP4 (H.264, no audio, 1080p max).
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loaded = false;

async function getFFmpeg(onProgress?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg && loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    // Parse progress from FFmpeg logs
    if (message.includes('time=')) {
      const match = message.match(/time=(\d+:\d+:\d+\.\d+)/);
      if (match) onProgress?.(`Encoding: ${match[1]}`);
    }
  });

  onProgress?.('Loading compressor...');

  // Load FFmpeg core from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  loaded = true;
  return ffmpeg;
}

export interface CompressOptions {
  /** Max width (default 1920) */
  maxWidth?: number;
  /** CRF quality 0-51, higher = smaller. Default 28 (good for backgrounds) */
  crf?: number;
  /** Max duration in seconds. Default 15 */
  maxDuration?: number;
  /** Progress callback */
  onProgress?: (msg: string) => void;
}

/**
 * Compress a video file to web-optimized MP4.
 * Returns a compressed File object.
 */
export async function compressVideo(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const {
    maxWidth = 1920,
    crf = 28,
    maxDuration = 15,
    onProgress,
  } = opts;

  const ff = await getFFmpeg(onProgress);

  const inputName = 'input' + (file.name.endsWith('.webm') ? '.webm' : file.name.endsWith('.mov') ? '.mov' : '.mp4');
  const outputName = 'output.mp4';

  onProgress?.('Reading file...');
  await ff.writeFile(inputName, await fetchFile(file));

  onProgress?.('Compressing...');
  await ff.exec([
    '-i', inputName,
    '-vcodec', 'libx264',
    '-crf', String(crf),
    '-preset', 'fast',
    '-vf', `scale='min(${maxWidth},iw)':'-2'`,
    '-an',                    // Remove audio
    '-t', String(maxDuration), // Max duration
    '-movflags', '+faststart', // Web-optimized
    '-pix_fmt', 'yuv420p',    // Maximum compatibility
    outputName,
  ]);

  onProgress?.('Finalizing...');
  const data = await ff.readFile(outputName);
  const blob = new Blob([data], { type: 'video/mp4' });

  // Cleanup
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const originalMB = (file.size / 1048576).toFixed(1);
  const compressedMB = (blob.size / 1048576).toFixed(1);
  onProgress?.(`Done! ${originalMB}MB → ${compressedMB}MB`);

  return new File([blob], file.name.replace(/\.\w+$/, '.mp4'), { type: 'video/mp4' });
}

/**
 * Check if a file needs compression (> threshold MB).
 */
export function needsCompression(file: File, thresholdMB = 15): boolean {
  return file.size > thresholdMB * 1048576;
}
