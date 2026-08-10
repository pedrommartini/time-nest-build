import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// We need to load dotenv if available, otherwise just rely on process.env
// For simplicity in a script, let's parse .env.local manually
async function loadEnv() {
  try {
    const envPath = path.join(__dirname, "../../.env.local");
    const envContent = await fs.readFile(envPath, "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith("ELEVENLABS_API_KEY=")) {
        process.env.ELEVENLABS_API_KEY = line.split("=")[1].trim();
      }
    }
  } catch (e) {
    // If not found, hopefully it's exported in the environment
  }
}

const API_URL = "https://api.elevenlabs.io/v1/sound-generation";

export async function generateSound({
  prompt,
  durationSeconds,
  loop = false,
  outputPath,
  promptInfluence = 0.72,
  outputFormat = "mp3_44100_128"
}) {
  const API_KEY = process.env.ELEVENLABS_API_KEY;

  if (!API_KEY) {
    throw new Error("ELEVENLABS_API_KEY não configurada. Crie o arquivo .env.local na raiz do projeto.");
  }

  const url = new URL(API_URL);
  url.searchParams.set("output_format", outputFormat);

  console.log(`Gerando som: ${path.basename(outputPath)}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: prompt,
      model_id: "eleven_text_to_sound_v2",
      duration_seconds: Math.max(0.5, Math.min(30, durationSeconds)),
      prompt_influence: promptInfluence,
      loop
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs ${response.status}: ${body}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);

  console.log(`Salvo em ${outputPath} (Custo estimado: ${response.headers.get("character-cost") || "desconhecido"} caracteres)`);

  return {
    outputPath,
    characterCost: response.headers.get("character-cost"),
    requestId: response.headers.get("request-id")
  };
}

// Script principal para gerar os sons-âncora
async function main() {
  await loadEnv();

  const isDryRun = process.argv.includes("--dry-run");

  const anchorPrompts = {
    "ui_tap": {
      prompt: "Ultra-realistic Foley recording, high-quality ASMR. The clean, tactile sound of a premium mechanical pen clicking once, or a solid wooden desk button being pressed. Satisfying, extremely short, realistic physical click. Professional app UI feedback, low volume, zero electronic elements, completely organic and grounded.",
      duration: 0.5,
      loop: false
    },
    "focus_start": {
      prompt: "Ultra-realistic Foley recording, high-quality ASMR. The satisfying mechanical sound of a classic analog stopwatch button being pressed firmly to start a timer, followed by a subtle, warm mechanical clock ticking sound entering the room. Very grounded, professional, organic, literal timer starting. Zero electronic elements.",
      duration: 1.5,
      loop: false
    },
    "task_complete": {
      prompt: "Ultra-realistic Foley recording, high-quality ASMR. The visceral, highly satisfying sound of a thick marker or pen crossing out a line on a heavy piece of notebook paper. A quick, decisive paper-scratch gesture representing a completed task on a physical to-do list. Professional, organic, grounded, zero electronic elements.",
      duration: 1.5,
      loop: false
    }
  };

  const outputDir = path.join(__dirname, "../../public/sounds/candidates");
  await fs.mkdir(outputDir, { recursive: true });

  console.log("Iniciando geração de Sons-Âncora...");

  if (isDryRun) {
    console.log("Modo DRY-RUN ativado. Nenhum crédito será consumido.");
    return;
  }

  for (const [key, details] of Object.entries(anchorPrompts)) {
    for (const variation of ["A", "B", "C"]) {
      const outputPath = path.join(outputDir, `${key}_candidate_${variation}.mp3`);
      
      try {
        await generateSound({
          prompt: details.prompt,
          durationSeconds: details.duration,
          loop: details.loop,
          outputPath: outputPath
        });
      } catch (e) {
        console.error(`Erro ao gerar ${key} (Variação ${variation}):`, e.message);
      }
    }
  }

  console.log("Geração de candidatos concluída!");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
