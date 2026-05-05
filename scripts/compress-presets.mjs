import sharp from 'sharp';
import { existsSync } from 'fs';

for (let i = 1; i <= 8; i++) {
  const input = `public/presets/puzzle-${i}.png`;
  const output = `public/presets/puzzle-${i}.webp`;
  if (!existsSync(input)) { console.warn(`Missing: ${input}`); continue; }
  await sharp(input).webp({ quality: 88 }).toFile(output);
  console.log(`✓ puzzle-${i}.webp`);
}
