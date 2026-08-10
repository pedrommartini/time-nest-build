import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "../../public/sounds/candidates");
const ytDlpPath = path.join(__dirname, "yt-dlp.exe");

const videos = [
  // Categoria 1: UI Tap
  { id: "O_tNMB7LhP8", name: "ui_tap_pen_1" },
  { id: "q_6t7vK0EOM", name: "ui_tap_pen_2" },
  { id: "yYmBf3B7Z7E", name: "ui_tap_pen_3" },
  
  // Categoria 2: Focus Start
  { id: "Kz6pM2aNlC4", name: "focus_start_stopwatch_1" },
  { id: "s3gSg7K8d_8", name: "focus_start_stopwatch_2" },
  { id: "kYJzEwQ964k", name: "focus_start_stopwatch_3" },

  // Categoria 3: Task Complete
  { id: "iZq3i94mSsQ", name: "task_complete_marker" },
  { id: "c7O91GDWGPU", name: "task_complete_typewriter" },
  { id: "WwI9w0aYn8s", name: "task_complete_stapler" }
];

async function main() {
  console.log("Iniciando o download de áudios do YouTube usando yt-dlp standalone...");
  await fs.mkdir(outputDir, { recursive: true });

  for (const video of videos) {
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    const outputPath = path.join(outputDir, `${video.name}.m4a`);

    try {
      await fs.access(outputPath);
      console.log(`[OK] Já baixado: ${video.name}`);
      continue;
    } catch {
      // Arquivo não existe, vamos baixar
    }

    console.log(`Baixando: ${video.name} (${url})`);
    try {
      // Baixa apenas o áudio no formato m4a (aac) que toca nativamente no HTML
      await execFileAsync(ytDlpPath, [
        "-f", "ba[ext=m4a]",
        "-o", outputPath,
        url
      ]);
      console.log(`[SUCESSO] ${video.name}`);
    } catch (e) {
      console.error(`[ERRO] Falha ao baixar ${video.name}:`, e.message);
    }
  }
  console.log("Downloads concluídos! Você pode atualizar a página HTML.");
}

main();
