/**
 * Gera o hash bcrypt da password de acesso.
 *
 *   npm run hash-password                  → pede a password (não aparece no ecrã nem no histórico)
 *   npm run hash-password -- "<password>"  → a password fica no histórico do terminal
 *
 * Nada é gravado em disco: o hash é só impresso para colares no .env.local e na Vercel.
 */
import bcrypt from "bcryptjs";

const COST = 12;

function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error("Sem terminal interativo: passa a password como argumento."));
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  let password = process.argv[2];
  if (!password) {
    password = await askHidden("Palavra-passe: ");
    const again = await askHidden("Repete a palavra-passe: ");
    if (password !== again) {
      console.error("As palavras-passe não coincidem.");
      process.exit(1);
    }
  }
  if (password.length < 10) {
    console.error("Usa pelo menos 10 caracteres.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, COST);
  const escaped = hash.replace(/\$/g, "\\$");

  console.log("\n1) No .env.local (os \"$\" vão escapados por causa do Next.js):\n");
  console.log(`ADMIN_PASSWORD_HASH=${escaped}`);
  console.log("\n2) Na Vercel (Settings → Environment Variables), valor tal e qual:\n");
  console.log(hash);
  console.log("");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
