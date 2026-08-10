import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ytdl from "@distube/ytdl-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "../../public/sounds/candidates");

const videos = [
  // Categoria 1: UI Tap
  { id: "O_tNMB7LhP8", name: "ui_tap_1" },
  { id: "q_6t7vK0EOM", name: "ui_tap_2" },
  { id: "yYmBf3B7Z7E", name: "ui_tap_3" },
  
  // Categoria 2: Focus Start
  { id: "Kz6pM2aNlC4", name: "focus_1" },
  { id: "s3gSg7K8d_8", name: "focus_2" },
  { id: "kYJzEwQ964k", name: "focus_3" },

  // Categoria 3: Task Complete
  { id: "iZq3i94mSsQ", name: "task_1" },
  { id: "c7O91GDWGPU", name: "task_2" },
  { id: "WwI9w0aYn8s", name: "task_3" }
];

async function main() {
  console.log("Iniciando o download nativo do YouTube...");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const video of videos) {
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    const outputPath = path.join(outputDir, `${video.name}.mp3`); // ytdl-core can extract audio as mp3 container or webm

    if (fs.existsSync(outputPath)) {
      console.log(`[OK] Já baixado: ${video.name}`);
      continue;
    }

    console.log(`Baixando: ${video.name}...`);
    try {
      await new Promise((resolve, reject) => {
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        const fileStream = fs.createWriteStream(outputPath);
        
        stream.pipe(fileStream);
        
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
        fileStream.on('error', (err) => reject(err));
      });
      console.log(`[SUCESSO] ${video.name}`);
    } catch (e) {
      console.error(`[ERRO] Falha ao baixar ${video.name}:`, e.message);
    }
  }
  console.log("Workflow concluído! Arquivos salvos em public/sounds/candidates/");
}

main();
