import { compressToBase64, decompressFromBase64 } from 'lz-string';
import type { PuzzleRecord } from './records';

const DATA_URL_PREFIX = 'data:image/jpeg;base64,';

type ShareData = {
  v: 1;
  difficulty: string;
  cols: number;
  rows: number;
  img: string;
};

export function encodeShareCode(record: PuzzleRecord): string {
  const raw = record.croppedImageDataUrl ?? '';
  const img = raw.startsWith(DATA_URL_PREFIX) ? raw.slice(DATA_URL_PREFIX.length) : raw;
  const data: ShareData = { v: 1, difficulty: record.difficulty, cols: record.cols, rows: record.rows, img };
  return compressToBase64(JSON.stringify(data));
}

export function decodeShareCode(code: string): ShareData | null {
  try {
    const json = decompressFromBase64(code.trim());
    if (!json) return null;
    const data = JSON.parse(json) as ShareData;
    if (
      data.v !== 1 ||
      typeof data.difficulty !== 'string' ||
      typeof data.cols !== 'number' || data.cols < 2 || data.cols > 20 ||
      typeof data.rows !== 'number' || data.rows < 2 || data.rows > 20 ||
      typeof data.img !== 'string' || data.img.length < 100
    ) return null;
    return data;
  } catch {
    return null;
  }
}

export function shareDataToRecord(data: ShareData): PuzzleRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    difficulty: data.difficulty,
    cols: data.cols,
    rows: data.rows,
    thumbnailDataUrl: DATA_URL_PREFIX + data.img,
    croppedImageDataUrl: DATA_URL_PREFIX + data.img,
    isCompleted: false,
    bestTimeMs: 0,
  };
}
