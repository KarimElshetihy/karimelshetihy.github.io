let mermaidReady = null;

function loadMermaid() {
  if (window.mermaid) {
    return Promise.resolve(window.mermaid);
  }

  if (!mermaidReady) {
    mermaidReady = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("../../vendor/mermaid/mermaid.min.js", import.meta.url).href;
      script.onload = () => {
        if (!window.mermaid) {
          reject(new Error("Mermaid did not initialize."));
          return;
        }

        window.mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "strict",
          fontFamily: "Roboto, system-ui, sans-serif"
        });
        resolve(window.mermaid);
      };
      script.onerror = () => reject(new Error("Could not load Mermaid."));
      document.head.appendChild(script);
    });
  }

  return mermaidReady;
}

export function initMermaid(root = document) {
  const nodes = root.querySelectorAll(".mermaid:not([data-processed])");
  if (!nodes.length) {
    return;
  }

  loadMermaid()
    .then((mermaid) => mermaid.run({ nodes: [...nodes] }))
    .catch((error) => {
      console.error("Mermaid render failed:", error);
    });
}
