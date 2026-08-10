import fs from 'fs';
import path from 'path';

const destDir = "e:\\AI\\Antigravity\\Time Nest\\public\\sounds\\candidates";
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const urls = {
  "focus_1.mp3": "https://cdn.pixabay.com/download/audio/2022/03/14/audio_bf3cb753eb.mp3?filename=freesound_community-record-vinyl-needle-drop-start-scratches-crackle-62336.mp3",
  "focus_2.mp3": "https://cdn.pixabay.com/download/audio/2026/03/10/audio_eb81be454b.mp3?filename=dragon-studio-flipping-book-page-499646.mp3",
  "focus_3.mp3": "https://cdn.pixabay.com/download/audio/2022/03/10/audio_51131602b9.mp3?filename=freesound_community-singing-bowl-hit-3-33366.mp3",
  "focus_4.mp3": "https://cdn.pixabay.com/download/audio/2022/03/09/audio_c6669448b8.mp3?filename=freesound_community-drawer_wooden_small_sliding-28187.mp3",
  "focus_5.mp3": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_80dcfa2455.mp3?filename=freesound_community-sandfall5-83468.mp3"
};

async function download(filename, url) {
  const destPath = path.join(destDir, filename);
  console.log(`Downloading ${filename}...`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
  console.log(`[SUCCESS] ${filename}`);
}

async function main() {
  for (const [filename, url] of Object.entries(urls)) {
    try {
      await download(filename, url);
    } catch (e) {
      console.error(`[ERROR] ${filename} failed:`, e.message);
    }
  }
}

main();
