import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "../../public/sounds/candidates");

const videos = [
  // Categoria 1: UI Tap (Pen click)
  { id: "O_tNMB7LhP8", name: "ui_tap_1" },
  { id: "q_6t7vK0EOM", name: "ui_tap_2" },
  { id: "yYmBf3B7Z7E", name: "ui_tap_3" },
  // Categoria 2: Focus Start (Stopwatch)
  { id: "s3gSg7K8d_8", name: "focus_1" },
  { id: "cR_342BwY7w", name: "focus_2" },
  { id: "4Xz9rDq-7zE", name: "focus_3" },
  // Categoria 3: Task Complete (Typewriter/Stapler/Marker)
  { id: "c7O91GDWGPU", name: "task_1" },
  { id: "iZq3i94mSsQ", name: "task_2" },
  { id: "3_dJbY5-z7A", name: "task_3" }
];

async function downloadWithCobalt(videoId, outputPath) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  // 1. Request to cobalt API
  const res = await fetch("https://api.cobalt.tools/api/json", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: url,
      isAudioOnly: true,
      aFormat: "mp3"
    })
  });

  if (!res.ok) {
    throw new Error(`Cobalt API error: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.status === "error") {
    throw new Error(`Cobalt returned error: ${data.text}`);
  }

  // 2. Download the actual file from the returned URL
  const downloadUrl = data.url;
  const audioRes = await fetch(downloadUrl);
  if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.statusText}`);

  const arrayBuffer = await audioRes.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
}

async function main() {
  console.log("Iniciando download robusto via Cobalt API...");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const video of videos) {
    const outputPath = path.join(outputDir, `${video.name}.mp3`);
    
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      console.log(`[OK] Já baixado: ${video.name}`);
      continue;
    }

    console.log(`Baixando: ${video.name}...`);
    try {
      await downloadWithCobalt(video.id, outputPath);
      console.log(`[SUCESSO] ${video.name}`);
      
      // Delay to respect API limits
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`[ERRO] Falha ao baixar ${video.name}:`, e.message);
    }
  }
  console.log("Downloads concluídos!");
}

main();
