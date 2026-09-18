const linkInput = document.querySelector("#link-input");
const generateButton = document.querySelector("#generate-button");
const inputMessage = document.querySelector("#input-message");
const statusLabel = document.querySelector("#status-label");
const emptyState = document.querySelector("#empty-state");
const qrImage = document.querySelector("#qr-image");
const canvas = document.querySelector("#qr-canvas");
const downloadButtons = document.querySelectorAll(".download-button");
const cursorBubbles = document.querySelector(".cursor-bubbles");

let currentLink = "";
let currentQr = null;
const qrSize = 240;
let lastBubbleTime = 0;

function setMessage(message, isError = false) {
  inputMessage.textContent = message;
  inputMessage.classList.toggle("error", isError);
  linkInput.classList.toggle("invalid", isError);
}

function validLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function setReadyState(ready) {
  qrImage.classList.toggle("visible", ready);
  emptyState.hidden = ready;
  downloadButtons.forEach((button) => {
    button.disabled = !ready;
  });
  statusLabel.textContent = ready ? "Ready to download" : "Waiting for a link";
  statusLabel.classList.toggle("ready", ready);
}

async function generateCode() {
  const link = linkInput.value.trim();

  if (!validLink(link)) {
    setReadyState(false);
    setMessage("Please enter a valid link beginning with http:// or https://", true);
    linkInput.focus();
    return;
  }

  try {
    currentQr = qrcode(0, "M");
    currentQr.addData(link, "Byte");
    currentQr.make();
    const margin = 2;
    const cellSize = Math.max(1, Math.floor((qrSize - margin * 2) / currentQr.getModuleCount()));
    qrImage.src = currentQr.createDataURL(cellSize, margin);
    currentLink = link;
    setMessage("Your QR code is ready to download.");
    setReadyState(true);
  } catch {
    setReadyState(false);
    setMessage("Something went wrong while creating the QR code.", true);
  }
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadCode(format) {
  if (!currentLink) return;

  if (format === "svg") {
    const svg = currentQr.createSvgTag({ cellSize: 1, margin: 2 });
    downloadFile(new Blob([svg], { type: "image/svg+xml" }), "snapcode.svg");
    return;
  }

  if (format === "png") {
    const response = await fetch(qrImage.src);
    downloadFile(await response.blob(), "snapcode.png");
    return;
  }

  const image = new Image();
  image.onload = () => {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) downloadFile(blob, "snapcode.jpg");
    }, "image/jpeg", 0.95);
  };
  image.src = qrImage.src;
}

generateButton.addEventListener("click", generateCode);
linkInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") generateCode();
});
downloadButtons.forEach((button) => {
  button.addEventListener("click", () => downloadCode(button.dataset.format));
});

setReadyState(false);

document.addEventListener("pointermove", (event) => {
  if (event.target.closest(".generator-card")) return;
  if (event.timeStamp - lastBubbleTime < 45) return;

  lastBubbleTime = event.timeStamp;
  const bubble = document.createElement("span");
  const driftX = `${Math.round((Math.random() - 0.5) * 34)}px`;
  const driftY = `${Math.round(-20 - Math.random() * 28)}px`;
  bubble.className = "cursor-bubble";
  bubble.style.left = `${event.clientX - 4}px`;
  bubble.style.top = `${event.clientY - 4}px`;
  bubble.style.setProperty("--drift-x", driftX);
  bubble.style.setProperty("--drift-y", driftY);
  cursorBubbles.appendChild(bubble);
  window.setTimeout(() => bubble.remove(), 900);
});
