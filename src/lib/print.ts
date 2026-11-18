type PrintBodyClass = "printing-admit" | "printing-marksheet";

let activePrintCleanup: (() => void) | null = null;

export async function printElement(selector: string, bodyClass: PrintBodyClass) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  activePrintCleanup?.();

  const source = document.querySelector<HTMLElement>(selector);
  if (!source) throw new Error("Printable content was not found");

  const root = document.createElement("div");
  root.className = "document-print-root";
  root.setAttribute("aria-hidden", "true");
  root.append(source.cloneNode(true));
  document.body.append(root);
  document.body.classList.add(bodyClass);

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    document.body.classList.remove(bodyClass);
    root.remove();
    if (activePrintCleanup === cleanup) activePrintCleanup = null;
  };

  activePrintCleanup = cleanup;
  window.addEventListener("afterprint", cleanup, { once: true });

  try {
    await document.fonts.ready;
    const imageLoads = Promise.all(
      Array.from(root.querySelectorAll<HTMLImageElement>("img")).map((image) =>
        image.decode().catch(() => undefined),
      ),
    );
    await Promise.race([
      imageLoads,
      new Promise<void>((resolve) => window.setTimeout(resolve, 3500)),
    ]);
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}
