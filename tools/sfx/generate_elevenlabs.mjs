import fs from 'fs';
import path from 'path';

const API_KEY = 'sk_3492317c1f5f1bbf92d2a46c1ed7d0c7a0b1804530989de1';
const ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';
const destDir = "e:\\AI\\Antigravity\\Time Nest\\public\\sounds\\candidates";

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const prompts = {
  "focus_1.mp3": "Premium Foley: one fast clean turn of thick notebook paper, immediately transitioning into a tiny precision optical lens mechanism sliding into alignment and locking with a subtle two-stage mechanical snap. Miniature, elegant, brushed metal and glass. Strong tactile satisfaction. Clean close-mic, natural materials only. No ticking, no electronic beep, no synths, no music."
};

async function generateSound(filename, prompt) {
  console.log(`Generating ${filename}...`);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: 2,
      prompt_influence: 0.3
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error for ${filename}: ${res.status} - ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const destPath = path.join(destDir, filename);
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
  console.log(`[SUCCESS] Saved ${filename} to candidates folder.`);
}

async function main() {
  for (const [filename, prompt] of Object.entries(prompts)) {
    try {
      await generateSound(filename, prompt);
    } catch (e) {
      console.error(e.message);
    }
  }
}

main();
