const GAME_BASE_URL="https://coimbrice.github.io/OddOne/";

const locations=[
"Shopping","Cinema","Estacionamento","Universidade","Hospital","Aeroporto","Supermercado","Academia","Restaurante","Praia","Biblioteca","Hotel","Parque","Museu","Estádio","Escola","Banco","Farmácia","Delegacia","Rodoviária"
];

const encoder=new TextEncoder(),decoder=new TextDecoder();
let setupPlayers=[],session=null,sessionCode="",selectedPlayerIndex=null,seenOnThisDevice=new Set(),qrScanner=null,scanning=false;

const $=s=>document.querySelector(s);
const screens=[...document.querySelectorAll(".screen")];

function showScreen(id){
  screens.forEach(s=>s.classList.remove("active"));
  $("#"+id).classList.add("active");
  window.scrollTo({top:0});
}
function randomIndex(n){return Math.floor(Math.random()*n)}
function bytesToB64u(bytes){
  let s="";bytes.forEach(b=>s+=String.fromCharCode(b));
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function b64uToBytes(v){
  const s=v.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(v.length/4)*4,"=");
  const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0));
}

async function encryptSession(data){
  const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},true,["encrypt","decrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(JSON.stringify(data)));
  const rawKey=new Uint8Array(await crypto.subtle.exportKey("raw",key));
  const packet={v:1,k:bytesToB64u(rawKey),i:bytesToB64u(iv),d:bytesToB64u(new Uint8Array(encrypted))};
  return "IMPOSTOR1:"+bytesToB64u(encoder.encode(JSON.stringify(packet)));
}
async function decryptSession(code){
  const trimmed=code.trim();
  if(!trimmed.startsWith("IMPOSTOR1:"))throw new Error("Este QR não parece ser de uma partida válida.");
  const packet=JSON.parse(decoder.decode(b64uToBytes(trimmed.slice(10))));
  if(packet.v!==1||!packet.k||!packet.i||!packet.d)throw new Error("Formato de partida inválido.");
  const key=await crypto.subtle.importKey("raw",b64uToBytes(packet.k),{name:"AES-GCM"},false,["decrypt"]);
  const decrypted=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64uToBytes(packet.i)},key,b64uToBytes(packet.d));
  const parsed=JSON.parse(decoder.decode(decrypted));
  if(!Array.isArray(parsed.players)||parsed.players.length<3||typeof parsed.location!=="string"||!Number.isInteger(parsed.impostorIndex)||parsed.impostorIndex<0||parsed.impostorIndex>=parsed.players.length)throw new Error("Dados da partida inválidos.");
  return parsed;
}

function renderLocations(){
  $("#location-list").innerHTML="";
  locations.forEach(x=>{const e=document.createElement("span");e.className="tag";e.textContent=x;$("#location-list").appendChild(e)});
}
function renderSetupPlayers(){
  $("#player-count").textContent=setupPlayers.length;
  $("#start-game").disabled=setupPlayers.length<3;
  const list=$("#player-list");
  if(!setupPlayers.length){list.className="player-list empty";list.innerHTML="<p>Adicione pelo menos 3 jogadores.</p>";return}
  list.className="player-list";list.innerHTML="";
  setupPlayers.forEach((p,i)=>{
    const row=document.createElement("div");row.className="player-chip";
    const name=document.createElement("strong");name.textContent=p;
    const rm=document.createElement("button");rm.type="button";rm.className="remove-player";rm.textContent="×";
    rm.onclick=()=>{setupPlayers.splice(i,1);renderSetupPlayers()};
    row.append(name,rm);list.appendChild(row);
  });
}
function addPlayer(v){
  const name=v.trim();if(!name)return;
  if(setupPlayers.some(p=>p.toLowerCase()===name.toLowerCase()))return alert("Já existe um jogador com esse nome.");
  setupPlayers.push(name);$("#player-name").value="";renderSetupPlayers();
}

async function createGame(){
  session={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),players:[...setupPlayers],location:locations[randomIndex(locations.length)],impostorIndex:randomIndex(setupPlayers.length)};
  sessionCode=await encryptSession(session);
  seenOnThisDevice=new Set();
  renderHostQr();showScreen("host-screen");
}
function getGameUrl(){
  return `${GAME_BASE_URL}#game=${encodeURIComponent(sessionCode)}`;
}
function renderHostQr(){
  $("#qr-code").innerHTML="";$("#host-code").value=getGameUrl();
  if(typeof QRCode==="undefined"){ $("#qr-code").innerHTML="<p style='color:#111'>Biblioteca de QR não carregou.</p>"; return; }
  new QRCode($("#qr-code"),{text:getGameUrl(),width:280,height:280,correctLevel:QRCode.CorrectLevel.M});
}
function openSession(){selectedPlayerIndex=null;renderRoundPlayers();showScreen("players-screen")}
function renderRoundPlayers(){
  const list=$("#round-player-list");list.innerHTML="";
  session.players.forEach((p,i)=>{
    const b=document.createElement("button");b.type="button";b.className="round-player-button";b.textContent=p;
    if(seenOnThisDevice.has(i))b.classList.add("seen");
    b.onclick=()=>{selectedPlayerIndex=i;$("#identity-title").textContent="Você é "+p+"?";$("#identity-dialog").showModal()};
    list.appendChild(b);
  });
}
function revealSelectedRole(){
  if(selectedPlayerIndex===null)return;
  $("#identity-dialog").close();
  const p=session.players[selectedPlayerIndex],impostor=selectedPlayerIndex===session.impostorIndex;
  $("#role-player-name").textContent=p;
  if(impostor){
    $("#role-card").classList.add("impostor");
    $("#role-label").textContent="Você é";
    $("#role-value").textContent="O IMPOSTOR";
    $("#role-description").textContent="Você não sabe o local. Ouça as dicas, improvise e tente não ser descoberto.";
  }else{
    $("#role-card").classList.remove("impostor");
    $("#role-label").textContent="O local é";
    $("#role-value").textContent=session.location;
    $("#role-description").textContent="Memorize o local e dê uma dica discreta quando chegar sua vez.";
  }
  showScreen("role-screen");
}
function hideRole(){
  if(selectedPlayerIndex!==null)seenOnThisDevice.add(selectedPlayerIndex);
  selectedPlayerIndex=null;renderRoundPlayers();showScreen("players-screen");
}
function setScannerStatus(msg,type=""){
  const e=$("#scanner-status");e.textContent=msg;e.className="status-text"+(type?" "+type:"");
}
function extractSessionCode(value){
  const trimmed=value.trim();

  try{
    const url=new URL(trimmed);
    const params=new URLSearchParams(url.hash.slice(1));
    const game=params.get("game");
    if(game)return game;
  }catch(_){}

  if(trimmed.startsWith("#game=")){
    return trimmed.slice(6);
  }

  return trimmed;
}
async function joinFromCode(code){
  setScannerStatus("Lendo partida...");
  try{
    const extractedCode=extractSessionCode(code);
    session=await decryptSession(extractedCode);sessionCode=extractedCode;seenOnThisDevice=new Set();
    await stopScanner();setScannerStatus("Partida carregada.","success");openSession();
  }catch(err){console.error(err);setScannerStatus(err.message||"Não foi possível abrir a partida.","error")}
}
async function startScanner(){
  setScannerStatus("");
  if(typeof Html5Qrcode==="undefined"){setScannerStatus("O leitor de QR não carregou. Verifique a internet ou use o código manual.","error");return}
  if(!window.isSecureContext&&location.hostname!=="localhost"){setScannerStatus("A câmera exige HTTPS ou localhost. Use o código manual ou abra a página por HTTPS.","error");return}
  try{
    qrScanner=new Html5Qrcode("qr-reader");scanning=true;
    await qrScanner.start({facingMode:"environment"},{fps:10,qrbox:{width:250,height:250}},async text=>{
      if(!scanning)return;scanning=false;await joinFromCode(text);
    },()=>{});
  }catch(err){console.error(err);setScannerStatus("Não consegui abrir a câmera. Verifique a permissão ou use o código manual.","error")}
}
async function stopScanner(){
  if(!qrScanner)return;
  try{if(scanning)await qrScanner.stop()}catch(e){}
  try{await qrScanner.clear()}catch(e){}
  qrScanner=null;scanning=false;
}
function leaveGame(){session=null;sessionCode="";selectedPlayerIndex=null;seenOnThisDevice=new Set();showScreen("home-screen")}
function chooseStarter(){ $("#starter-name").textContent=session.players[randomIndex(session.players.length)];showScreen("starter-screen") }

$("#create-game-button").onclick=()=>showScreen("setup-screen");
$("#scan-game-button").onclick=async()=>{showScreen("scanner-screen");await startScanner()};
document.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>showScreen("home-screen"));
$("#scanner-back").onclick=async()=>{await stopScanner();showScreen("home-screen")};
$("#player-form").onsubmit=e=>{e.preventDefault();addPlayer($("#player-name").value)};
$("#start-game").onclick=createGame;
$("#copy-code").onclick=async()=>{try{await navigator.clipboard.writeText(getGameUrl());$("#copy-code").textContent="Copiado!";setTimeout(()=>$("#copy-code").textContent="Copiar código",1200)}catch(e){$("#host-code").select();document.execCommand("copy")}};
$("#host-enter-game").onclick=openSession;
$("#host-new-game").onclick=()=>showScreen("setup-screen");
$("#manual-join-button").onclick=()=>joinFromCode($("#manual-code").value);
$("#identity-cancel").onclick=()=>{selectedPlayerIndex=null;$("#identity-dialog").close()};
$("#identity-confirm").onclick=revealSelectedRole;
$("#finish-role").onclick=hideRole;
$("#show-qr-again").onclick=()=>{renderHostQr();showScreen("host-screen")};
$("#leave-game").onclick=leaveGame;
$("#choose-starter").onclick=()=>$("#starter-dialog").showModal();
$("#starter-cancel").onclick=()=>$("#starter-dialog").close();
$("#starter-confirm").onclick=()=>{$("#starter-dialog").close();chooseStarter()};
$("#starter-back").onclick=()=>{renderRoundPlayers();showScreen("players-screen")};

async function loadGameFromUrl(){
  const params=new URLSearchParams(window.location.hash.slice(1));
  const game=params.get("game");
  if(!game)return;

  try{
    session=await decryptSession(game);
    sessionCode=game;
    seenOnThisDevice=new Set();
    openSession();
  }catch(err){
    console.error(err);
    history.replaceState(null,"",window.location.pathname);
    alert("Não foi possível abrir esta partida. O QR pode ser inválido ou estar corrompido.");
    showScreen("home-screen");
  }
}

renderLocations();renderSetupPlayers();loadGameFromUrl();
