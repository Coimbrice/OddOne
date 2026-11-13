const GAME_BASE_URL = `${window.location.origin}${window.location.pathname}`;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let setupPlayers = [];
let session = null;
let sessionCode = "";
let selectedPlayerIndex = null;
let seenOnThisDevice = new Set();
let qrScanner = null;
let scanning = false;

const $ = (selector) => document.querySelector(selector);
const screens = [...document.querySelectorAll(".screen")];

function showScreen(id) {
  screens.forEach((screen) => screen.classList.remove("active"));
  $("#" + id).classList.add("active");
  window.scrollTo({ top: 0 });
}

function randomIndex(length) {
  return Math.floor(Math.random() * length);
}

function randomUniqueIndices(total, count) {
  const indices = Array.from({ length: total }, (_, index) => index);

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1);
    [indices[index], indices[target]] = [indices[target], indices[index]];
  }

  return indices.slice(0, count).sort((a, b) => a - b);
}

function deterministicIndex(value, length) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return length ? hash % length : 0;
}

function isImpostor(index) {
  return session.impostorIndices.includes(index);
}

function impostorWord(count) {
  return count === 1 ? "impostor" : "impostores";
}

function currentTheme() {
  return window.GAME_DATA.themes[session?.themeKey || "places"];
}

function selectedTheme() {
  return window.GAME_DATA.themes[$("#theme-select").value];
}

function updateImpostorCountOptions() {
  const select = $("#impostor-count");
  const previous = Math.max(1, Number(select.value) || 1);
  const max = Math.max(1, setupPlayers.length - 1);

  select.innerHTML = "";

  for (let count = 1; count <= max; count += 1) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = `${count} ${impostorWord(count)}`;
    select.appendChild(option);
  }

  select.value = String(Math.min(previous, max));
  select.disabled = setupPlayers.length < 3;

  const note = $("#impostor-count-note");

  if (setupPlayers.length < 3) {
    note.textContent = "Adicione pelo menos 3 jogadores para criar a partida.";
  } else {
    note.textContent = `Você pode escolher de 1 a ${max} ${impostorWord(max)}.`;
  }
}

function bytesToB64u(bytes) {
  let value = "";
  bytes.forEach((byte) => (value += String.fromCharCode(byte)));

  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64uToBytes(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptSession(data) {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(data)),
  );
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const packet = {
    v: 1,
    k: bytesToB64u(rawKey),
    i: bytesToB64u(iv),
    d: bytesToB64u(new Uint8Array(encrypted)),
  };

  return "IMPOSTOR1:" + bytesToB64u(encoder.encode(JSON.stringify(packet)));
}

async function decryptSession(code) {
  const trimmed = code.trim();

  if (!trimmed.startsWith("IMPOSTOR1:")) {
    throw new Error("Este QR não parece ser de uma partida válida.");
  }

  const packet = JSON.parse(decoder.decode(b64uToBytes(trimmed.slice(10))));

  if (packet.v !== 1 || !packet.k || !packet.i || !packet.d) {
    throw new Error("Formato de partida inválido.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    b64uToBytes(packet.k),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64uToBytes(packet.i) },
    key,
    b64uToBytes(packet.d),
  );

  const parsed = JSON.parse(decoder.decode(decrypted));

  if (!Array.isArray(parsed.players) || parsed.players.length < 1) {
    throw new Error("Dados da partida inválidos.");
  }

  if (Array.isArray(parsed.impostorIndices)) {
    const unique = [...new Set(parsed.impostorIndices)];

    if (
      !unique.length ||
      unique.some(
        (index) =>
          !Number.isInteger(index) ||
          index < 0 ||
          index >= parsed.players.length,
      )
    ) {
      throw new Error("Dados da partida inválidos.");
    }

    parsed.impostorIndices = unique;
  } else if (
    Number.isInteger(parsed.impostorIndex) &&
    parsed.impostorIndex >= 0 &&
    parsed.impostorIndex < parsed.players.length
  ) {
    parsed.impostorIndices = [parsed.impostorIndex];
  } else {
    throw new Error("Dados da partida inválidos.");
  }

  if (!parsed.themeKey || !window.GAME_DATA.themes[parsed.themeKey]) {
    parsed.themeKey = "places";
  }

  if (typeof parsed.answer !== "string") {
    if (typeof parsed.location === "string") {
      parsed.answer = parsed.location;
    } else {
      throw new Error("Dados da partida inválidos.");
    }
  }

  if (
    !Number.isInteger(parsed.starterIndex) ||
    parsed.starterIndex < 0 ||
    parsed.starterIndex >= parsed.players.length
  ) {
    parsed.starterIndex = deterministicIndex(
      String(parsed.id || parsed.answer),
      parsed.players.length,
    );
  }

  return parsed;
}

function populateThemes() {
  const select = $("#theme-select");
  select.innerHTML = "";

  Object.entries(window.GAME_DATA.themes).forEach(([key, theme]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = theme.label;
    select.appendChild(option);
  });

  select.value = "places";
  renderThemeItems();
}

function renderThemeItems() {
  const theme = selectedTheme();
  const list = $("#location-list");

  $("#possible-items-title").textContent =
    `Possíveis respostas: ${theme.label}`;
  $("#theme-description").textContent =
    `Uma resposta de ${theme.label.toLocaleLowerCase("pt-BR")} será sorteada ao criar a partida.`;

  list.innerHTML = "";

  theme.items.forEach((item) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = item;
    list.appendChild(tag);
  });
}

function renderSetupPlayers() {
  $("#player-count").textContent = setupPlayers.length;
  $("#start-game").disabled = setupPlayers.length < 3;
  updateImpostorCountOptions();

  const list = $("#player-list");

  if (!setupPlayers.length) {
    list.className = "player-list empty";
    list.innerHTML = "<p>Adicione pelo menos 3 jogadores.</p>";
    return;
  }

  list.className = "player-list";
  list.innerHTML = "";

  setupPlayers.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "player-chip";

    const name = document.createElement("strong");
    name.textContent = player;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-player";
    remove.setAttribute("aria-label", `Remover ${player}`);
    remove.textContent = "×";
    remove.onclick = () => {
      setupPlayers.splice(index, 1);
      renderSetupPlayers();
    };

    row.append(name, remove);
    list.appendChild(row);
  });
}

function addPlayer(value) {
  const name = value.trim();

  if (!name) {
    return;
  }

  if (
    setupPlayers.some(
      (player) =>
        player.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
    )
  ) {
    alert("Já existe um jogador com esse nome.");
    return;
  }

  setupPlayers.push(name);
  $("#player-name").value = "";
  renderSetupPlayers();
}

async function createGame() {
  const themeKey = $("#theme-select").value;
  const theme = window.GAME_DATA.themes[themeKey];
  const impostorCount = Math.min(
    Math.max(1, Number($("#impostor-count").value) || 1),
    setupPlayers.length - 1,
  );

  session = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    players: [...setupPlayers],
    themeKey,
    answer: theme.items[randomIndex(theme.items.length)],
    impostorIndices: randomUniqueIndices(setupPlayers.length, impostorCount),
    starterIndex: randomIndex(setupPlayers.length),
  };

  sessionCode = await encryptSession(session);
  seenOnThisDevice = new Set();
  renderHostQr();
  showScreen("host-screen");
}

function getGameUrl() {
  return `${GAME_BASE_URL}#game=${encodeURIComponent(sessionCode)}`;
}

function renderHostQr() {
  $("#qr-code").innerHTML = "";
  $("#host-code").value = getGameUrl();

  if (typeof QRCode === "undefined") {
    $("#qr-code").innerHTML =
      "<p style='color:#111'>Biblioteca de QR não carregou.</p>";
    return;
  }

  new QRCode($("#qr-code"), {
    text: getGameUrl(),
    width: 280,
    height: 280,
    correctLevel: QRCode.CorrectLevel.M,
  });
}

function openSession() {
  selectedPlayerIndex = null;
  renderRoundPlayers();
  showScreen("players-screen");
}

function renderRoundPlayers() {
  const list = $("#round-player-list");
  list.innerHTML = "";

  session.players
    .map((player, index) => ({ player, index }))
    .sort((a, b) =>
      a.player.localeCompare(b.player, "pt-BR", { sensitivity: "base" }),
    )
    .forEach(({ player, index }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "round-player-button";
      button.textContent = player;

      if (seenOnThisDevice.has(index)) {
        button.classList.add("seen");
      }

      button.onclick = () => {
        selectedPlayerIndex = index;
        $("#identity-title").textContent = player;
        $("#identity-dialog").showModal();
      };

      list.appendChild(button);
    });
}

function revealSelectedRole() {
  if (selectedPlayerIndex === null) {
    return;
  }

  $("#identity-dialog").close();

  const player = session.players[selectedPlayerIndex];
  const impostor = isImpostor(selectedPlayerIndex);
  const theme = currentTheme();

  $("#role-player-name").textContent = player;

  if (impostor) {
    $("#role-card").classList.add("impostor");
    $("#role-label").textContent = "Você é";
    $("#role-value").textContent = "O IMPOSTOR";
    $("#role-description").textContent =
      `Você não sabe qual é ${theme.singular}. Ouça as dicas, improvise e tente não ser descoberto.`;
  } else {
    $("#role-card").classList.remove("impostor");
    $("#role-label").textContent = `Tema: ${theme.label}`;
    $("#role-value").textContent = session.answer;
    $("#role-description").textContent =
      "Memorize a resposta e dê uma dica discreta quando chegar sua vez.";
  }

  showScreen("role-screen");
}

function hideRole() {
  if (selectedPlayerIndex !== null) {
    seenOnThisDevice.add(selectedPlayerIndex);
  }

  selectedPlayerIndex = null;
  renderRoundPlayers();
  showScreen("players-screen");
}

function remapSeenPlayersAfterRemoval(removedIndex) {
  const next = new Set();

  seenOnThisDevice.forEach((index) => {
    if (index < removedIndex) {
      next.add(index);
    } else if (index > removedIndex) {
      next.add(index - 1);
    }
  });

  seenOnThisDevice = next;
}

function remapSessionIndexesAfterRemoval(removedIndex) {
  session.impostorIndices = session.impostorIndices
    .filter((index) => index !== removedIndex)
    .map((index) => (index > removedIndex ? index - 1 : index));

  if (session.starterIndex === removedIndex) {
    session.starterIndex = deterministicIndex(
      `${session.id}:starter:${session.players.length}`,
      session.players.length,
    );
  } else if (session.starterIndex > removedIndex) {
    session.starterIndex -= 1;
  }
}

function setGameOverReveal(names, title) {
  $("#game-over-title").textContent = title;

  const namesContainer = $("#eliminated-impostor-name");
  namesContainer.innerHTML = "";

  names.forEach((name) => {
    const badge = document.createElement("div");
    badge.className = "impostor-name-badge";
    badge.textContent = name;
    namesContainer.appendChild(badge);
  });

  const answerCard = $("#game-over-location-card");
  answerCard.classList.remove("revealed");
  $("#game-over-location-label").textContent = "Toque para revelar a resposta";
  $("#game-over-location").textContent = "Oculto";
  $("#game-over-description").textContent =
    "A resposta continua escondida até você tocar aqui.";
}

function revealGameOverLocation() {
  const card = $("#game-over-location-card");

  if (card.classList.contains("revealed")) {
    return;
  }

  const theme = currentTheme();

  card.classList.add("revealed");
  $("#game-over-location-label").textContent = `Tema: ${theme.label}`;
  $("#game-over-location").textContent = session.answer;
  $("#game-over-description").textContent = "Resposta revelada.";
}

async function removeSelectedPlayer() {
  if (selectedPlayerIndex === null) {
    return;
  }

  const removedIndex = selectedPlayerIndex;
  const removedName = session.players[removedIndex];
  const wasImpostor = isImpostor(removedIndex);

  $("#remove-player-dialog").close();

  session.players.splice(removedIndex, 1);
  remapSessionIndexesAfterRemoval(removedIndex);
  remapSeenPlayersAfterRemoval(removedIndex);
  selectedPlayerIndex = null;

  if (wasImpostor && session.impostorIndices.length === 0) {
    setGameOverReveal([removedName], "Todos os impostores foram encontrados!");
    showScreen("game-over-screen");
    return;
  }

  sessionCode = await encryptSession(session);

  if (wasImpostor) {
    const remaining = session.impostorIndices.length;
    $("#removed-safe-title").textContent =
      `${removedName} era um dos impostores`;
    $("#removed-player-message").textContent =
      `Essa pessoa foi removida. Ainda ${
        remaining === 1 ? "há 1 impostor" : "há " + remaining + " impostores"
      } na partida.`;
  } else {
    $("#removed-safe-title").textContent = `${removedName} não era impostor`;
    $("#removed-player-message").textContent =
      "Essa pessoa foi removida da partida. Os impostores continuam entre os jogadores restantes.";
  }

  renderRoundPlayers();
  $("#removed-safe-dialog").showModal();
}

function revealImpostorsAndEndGame() {
  const impostorNames = session.impostorIndices.map(
    (index) => session.players[index],
  );

  setGameOverReveal(
    impostorNames,
    impostorNames.length === 1 ? "O impostor era" : "Os impostores eram",
  );

  selectedPlayerIndex = null;
  showScreen("game-over-screen");
}

function setScannerStatus(message, type = "") {
  const element = $("#scanner-status");
  element.textContent = message;
  element.className = "status-text" + (type ? " " + type : "");
}

function extractSessionCode(value) {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const params = new URLSearchParams(url.hash.slice(1));
    const game = params.get("game");

    if (game) {
      return game;
    }
  } catch {}

  if (trimmed.startsWith("#game=")) {
    return trimmed.slice(6);
  }

  return trimmed;
}

async function joinFromCode(code) {
  setScannerStatus("Lendo partida...");

  try {
    const extractedCode = extractSessionCode(code);
    session = await decryptSession(extractedCode);
    sessionCode = extractedCode;
    seenOnThisDevice = new Set();

    await stopScanner();
    setScannerStatus("Partida carregada.", "success");
    openSession();
  } catch (error) {
    console.error(error);
    setScannerStatus(
      error.message || "Não foi possível abrir a partida.",
      "error",
    );
  }
}

async function startScanner() {
  setScannerStatus("");

  if (typeof Html5Qrcode === "undefined") {
    setScannerStatus(
      "O leitor de QR não carregou. Verifique a internet ou use o código manual.",
      "error",
    );
    return;
  }

  if (!window.isSecureContext && location.hostname !== "localhost") {
    setScannerStatus(
      "A câmera exige HTTPS ou localhost. Use o código manual ou abra a página por HTTPS.",
      "error",
    );
    return;
  }

  try {
    qrScanner = new Html5Qrcode("qr-reader");
    scanning = true;

    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (text) => {
        if (!scanning) {
          return;
        }

        scanning = false;
        await joinFromCode(text);
      },
      () => {},
    );
  } catch (error) {
    console.error(error);
    setScannerStatus(
      "Não consegui abrir a câmera. Verifique a permissão ou use o código manual.",
      "error",
    );
  }
}

async function stopScanner() {
  if (!qrScanner) {
    return;
  }

  try {
    if (scanning) {
      await qrScanner.stop();
    }
  } catch {}

  try {
    await qrScanner.clear();
  } catch {}

  qrScanner = null;
  scanning = false;
}

function leaveGame() {
  session = null;
  sessionCode = "";
  selectedPlayerIndex = null;
  seenOnThisDevice = new Set();
  showScreen("home-screen");
}

function chooseStarter() {
  $("#starter-name").textContent = session.players[session.starterIndex];
  showScreen("starter-screen");
}

$("#create-game-button").onclick = () => showScreen("setup-screen");
$("#scan-game-button").onclick = async () => {
  showScreen("scanner-screen");
  await startScanner();
};

document.querySelectorAll("[data-home]").forEach((button) => {
  button.onclick = () => showScreen("home-screen");
});

$("#scanner-back").onclick = async () => {
  await stopScanner();
  showScreen("home-screen");
};

$("#player-form").onsubmit = (event) => {
  event.preventDefault();
  addPlayer($("#player-name").value);
};

$("#theme-select").onchange = renderThemeItems;
$("#start-game").onclick = createGame;

$("#copy-code").onclick = async () => {
  try {
    await navigator.clipboard.writeText(getGameUrl());
    $("#copy-code").textContent = "Copiado!";

    setTimeout(() => {
      $("#copy-code").textContent = "Copiar código";
    }, 1200);
  } catch {
    $("#host-code").select();
    document.execCommand("copy");
  }
};

$("#host-enter-game").onclick = openSession;
$("#host-new-game").onclick = () => showScreen("setup-screen");
$("#manual-join-button").onclick = () => joinFromCode($("#manual-code").value);

$("#identity-cancel").onclick = () => {
  selectedPlayerIndex = null;
  $("#identity-dialog").close();
};

$("#identity-confirm").onclick = revealSelectedRole;

$("#remove-player-action").onclick = () => {
  if (selectedPlayerIndex === null) {
    return;
  }

  const name = session.players[selectedPlayerIndex];
  $("#identity-dialog").close();
  $("#remove-player-title").textContent = `Remover ${name}?`;
  $("#remove-player-dialog").showModal();
};

$("#remove-player-cancel").onclick = () => {
  $("#remove-player-dialog").close();
  selectedPlayerIndex = null;
};

$("#remove-player-confirm").onclick = removeSelectedPlayer;

$("#removed-safe-continue").onclick = () => {
  $("#removed-safe-dialog").close();
  renderRoundPlayers();
  showScreen("players-screen");
};

$("#removed-safe-qr").onclick = () => {
  $("#removed-safe-dialog").close();
  renderHostQr();
  showScreen("host-screen");
};

$("#finish-role").onclick = hideRole;
$("#show-qr-again").onclick = () => {
  renderHostQr();
  showScreen("host-screen");
};
$("#leave-game").onclick = leaveGame;

$("#game-over-new-game").onclick = () => {
  session = null;
  sessionCode = "";
  selectedPlayerIndex = null;
  seenOnThisDevice = new Set();
  showScreen("setup-screen");
};

$("#game-over-home").onclick = leaveGame;
$("#game-over-location-card").onclick = revealGameOverLocation;
$("#game-over-location-card").onkeydown = (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    revealGameOverLocation();
  }
};

$("#choose-starter").onclick = () => $("#starter-dialog").showModal();

$("#reveal-impostor").onclick = () => {
  const count = session.impostorIndices.length;

  $("#reveal-impostor-title").textContent =
    count === 1 ? "Revelar o impostor?" : "Revelar os impostores?";

  $("#reveal-impostor-message").textContent =
    count === 1
      ? "Isso mostrará quem é o impostor. A resposta continuará oculta até você tocar para revelá-la."
      : "Isso mostrará quem são os impostores. A resposta continuará oculta até você tocar para revelá-la.";

  $("#reveal-impostor-dialog").showModal();
};

$("#reveal-impostor-cancel").onclick = () =>
  $("#reveal-impostor-dialog").close();

$("#reveal-impostor-confirm").onclick = () => {
  $("#reveal-impostor-dialog").close();
  revealImpostorsAndEndGame();
};

$("#starter-cancel").onclick = () => $("#starter-dialog").close();

$("#starter-confirm").onclick = () => {
  $("#starter-dialog").close();
  chooseStarter();
};

$("#starter-back").onclick = () => {
  renderRoundPlayers();
  showScreen("players-screen");
};

async function loadGameFromUrl() {
  const params = new URLSearchParams(location.hash.slice(1));
  const game = params.get("game");

  if (!game) {
    return;
  }

  try {
    session = await decryptSession(game);
    sessionCode = game;
    seenOnThisDevice = new Set();
    openSession();
  } catch (error) {
    console.error(error);
    alert("Não foi possível carregar a partida deste link.");
  }
}

populateThemes();
renderSetupPlayers();
loadGameFromUrl();
