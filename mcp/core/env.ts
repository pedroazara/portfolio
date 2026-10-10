import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Raiz do repositório do portfólio, seja qual for a pasta atual do processo. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// O .env é o mesmo que os scripts de manutenção já usam. Lido pelo caminho do
// repositório porque o servidor roda com a pasta de outro projeto como atual.
// `quiet`: o dotenv 17 anuncia o carregamento em stdout, e stdout é o canal do
// protocolo — uma linha a mais ali derruba a conexão com o cliente.
config({ path: path.join(REPO_ROOT, ".env"), quiet: true });

/** Endereço público do site, para devolver links às páginas editadas. */
export const SITE_URL = (process.env.VITE_SITE_URL || "https://pedroazara.vercel.app").replace(/\/+$/, "");
