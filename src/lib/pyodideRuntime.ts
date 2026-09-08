/**
 * Runtime Python no navegador, via Pyodide (CPython compilado para WASM).
 *
 * Carregado sob demanda a partir do CDN oficial (jsDelivr) — e não como
 * dependência do bundle — porque o núcleo já pesa alguns MB e pacotes como
 * numpy/matplotlib somam bem mais. Puxar isso no build do site penalizaria
 * todo visitante; puxar só quando alguém aperta "Executar" custa apenas a
 * quem realmente usa a feature. A instância é reaproveitada entre blocos de
 * código da mesma página (`pyodidePromise` é module-level), então a segunda
 * execução em diante é instantânea.
 */

const PYODIDE_VERSION = "314.0.6";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInstance>;
  }
}

interface PyProxyLike {
  toJs: (opts?: { dict_converter?: (entries: Iterable<[string, unknown]>) => unknown }) => unknown;
  destroy?: () => void;
}

interface PyodideInstance {
  globals: { set: (name: string, value: unknown) => void };
  loadPackage: (names: string | string[]) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<unknown>;
  runPythonAsync: (code: string) => Promise<PyProxyLike>;
}

let pyodidePromise: Promise<PyodideInstance> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar o runtime Python.")));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Falha ao carregar o runtime Python."));
    document.head.appendChild(script);
  });
}

export function getPyodide(onStatus?: (msg: string) => void): Promise<PyodideInstance> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.("Baixando runtime Python (Pyodide)…");
      if (!window.loadPyodide) {
        await loadScript(`${PYODIDE_CDN}pyodide.js`);
      }
      if (!window.loadPyodide) {
        throw new Error("Não foi possível carregar o Pyodide.");
      }
      const pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN });
      return pyodide;
    })();
    // Falhou: libera para uma nova tentativa no próximo clique.
    pyodidePromise.catch(() => {
      pyodidePromise = null;
    });
  }
  return pyodidePromise;
}

export interface PyRunResult {
  stdout: string;
  stderr: string;
  error: string | null;
  images: string[];
}

/**
 * Prepara a sessão: backend de imagem fora de tela (sem isso o matplotlib do
 * Pyodide tenta abrir um canvas interativo que não temos como encaixar), o
 * `plt.show()` virando no-op (as figuras já são capturadas de qualquer
 * forma — chamá-lo só geraria um aviso inofensivo mas visível na saída), e o
 * dicionário `__nb_globals__` que serve de globals para todo `exec()` daqui
 * em diante — é ele que faz um bloco enxergar o `import`/variável do anterior.
 */
const SESSION_INIT = `
import matplotlib
matplotlib.use("AGG")
import matplotlib.pyplot as __plt_init
__plt_init.show = lambda *a, **k: None
__nb_globals__ = {"__name__": "__main__"}
`;

/**
 * Executa o bloco contra `__nb_globals__` (não um dict novo) — é isso que dá
 * o comportamento de notebook: cada bloco vê o que os anteriores da mesma
 * sessão definiram. A captura de figuras olha `sys.modules` em vez de
 * depender do texto do bloco atual mencionar "matplotlib" — necessário
 * porque um bloco pode usar `plt` sem importar de novo, contando com o
 * import de um bloco anterior.
 */
const RUN_SCRIPT = `
import io, contextlib, traceback, base64, sys
__stdout = io.StringIO()
__stderr = io.StringIO()
__error = None
try:
    with contextlib.redirect_stdout(__stdout), contextlib.redirect_stderr(__stderr):
        exec(__user_code__, __nb_globals__)
except BaseException:
    __error = traceback.format_exc()

__images = []
if "matplotlib.pyplot" in sys.modules:
    import matplotlib.pyplot as __plt_capture
    for __fignum in __plt_capture.get_fignums():
        __fig = __plt_capture.figure(__fignum)
        __buf = io.BytesIO()
        __fig.savefig(__buf, format="png", bbox_inches="tight", dpi=140, facecolor="white")
        __images.append(base64.b64encode(__buf.getvalue()).decode("ascii"))
    __plt_capture.close("all")

{"stdout": __stdout.getvalue(), "stderr": __stderr.getvalue(), "error": __error, "images": __images}
`;

let sessionPromise: Promise<void> | null = null;

/**
 * Reinicia a sessão compartilhada: o próximo `runPython` parte de um estado
 * limpo, sem variáveis de uma execução anterior. Chame uma vez no início de
 * cada passada de "Executar Python" — os blocos *dentro* dessa passada devem
 * continuar vendo uns aos outros, só passadas diferentes não.
 */
export function resetPythonSession(): void {
  sessionPromise = null;
}

async function ensureSession(pyodide: PyodideInstance, onStatus?: (msg: string) => void): Promise<void> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      onStatus?.("Preparando matplotlib…");
      await pyodide.loadPackage("matplotlib");
      await pyodide.runPythonAsync(SESSION_INIT);
    })();
    sessionPromise.catch(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

export async function runPython(code: string, onStatus?: (msg: string) => void): Promise<PyRunResult> {
  const pyodide = await getPyodide(onStatus);
  await ensureSession(pyodide, onStatus);

  onStatus?.("Resolvendo dependências…");
  await pyodide.loadPackagesFromImports(code);

  pyodide.globals.set("__user_code__", code);

  onStatus?.("Executando…");
  const resultProxy = await pyodide.runPythonAsync(RUN_SCRIPT);
  const result = resultProxy.toJs({ dict_converter: Object.fromEntries }) as {
    stdout?: string;
    stderr?: string;
    error?: string | null;
    images?: string[];
  };
  resultProxy.destroy?.();

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null,
    images: Array.isArray(result.images) ? result.images : [],
  };
}
