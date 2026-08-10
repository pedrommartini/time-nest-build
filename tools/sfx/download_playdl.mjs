import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import play from "play-dl";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "../../public/sounds/candidates");

const videos = [
  // Categoria 1: UI Tap
  { id: "O_tNMB7LhP8", name: "ui_tap_1" },
  { id: "q_6t7vK0EOM", name: "ui_tap_2" },
  { id: "yYmBf3B7Z7E", name: "ui_tap_3" },
  
  // Categoria 2: Focus Start
  { id: "s3gSg7K8d_8", name: "focus_1" },
  { id: "cR_342BwY7w", name: "focus_2" },
  { id: "4Xz9rDq-7zE", name: "focus_3" },

  // Categoria 3: Task Complete
  { id: "c7O91GDWGPU", name: "task_1" },
  { id: "iZq3i94mSsQ", name: "task_2" },
  { id: "3_dJbY5-z7A", name: "task_3" }
];

async function main() {
  console.log("Iniciando download nativo via play-dl...");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const video of videos) {
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    const outputPath = path.join(outputDir, `${video.name}.mp3`);

    if (fs.existsSync(outputPath)) {
      console.log(`[OK] Já baixado: ${video.name}`);
      continue;
    }

    console.log(`Baixando: ${video.name} (${video.id})...`);
    try {
      const streamInfo = await play.stream(url, { discordPlayerCompatibility: false });
      
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(outputPath);
        streamInfo.stream.pipe(fileStream);
        
        streamInfo.stream.on('end', () => resolve());
        streamInfo.stream.on('error', (err) => reject(err));
        fileStream.on('error', (err) => reject(err));
      });
      console.log(`[SUCESSO] ${video.name}`);
    } catch (e) {
      console.error(`[ERRO] Falha ao baixar ${video.name}:`, e.message);
    }
  }
  console.log("Downloads concluídos!");
}

main();
