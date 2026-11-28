(() => {
  if (new URLSearchParams(location.search).has("prueba")) return;
  const videoUrl = "https://resource2.heygen.ai/videos/32f54654e5b84c13959af58862ad961d/32f54654e5b84c13959af58862ad961d/01a21db2-7593-74e4-ab67-d96c7f76a09e.mp4";

  const style = document.createElement("style");
  style.textContent = `
    #ft-intro { width:min(100% - 24px, 480px); max-height:calc(100dvh - 24px);
      box-sizing:border-box; padding:16px; border:1px solid #d4af37; border-radius:16px;
      background:#111; color:#fff; text-align:center; font:16px Arial,sans-serif; }
    #ft-intro::backdrop { background:#080808f5; }
    #ft-intro h2 { margin:0 0 10px; }
    #ft-intro video { display:block; margin:0 auto; max-width:100%; height:min(64dvh,620px);
      aspect-ratio:4/7; object-fit:contain; background:#080808; border-radius:10px; }
    #ft-intro video[hidden] { display:none; }
    #ft-intro button { margin:10px 4px 0; padding:10px 14px; border:1px solid #d4af37;
      background:#181818; color:#fff; border-radius:10px; }
  `;
  document.head.append(style);

  const intro = document.createElement("dialog");
  intro.id = "ft-intro";
  intro.setAttribute("aria-labelledby", "ft-intro-title");
  intro.innerHTML = `
    <h2 id="ft-intro-title">Bienvenido a FAST TRIP</h2>
    <video playsinline preload="none" aria-label="Video de bienvenida de FAST TRIP en el Malecón 2000"></video>
    <button type="button" data-play hidden>Reproducir video</button>
    <button type="button" data-sound aria-pressed="false">Activar sonido</button>
    <button type="button" data-continue autofocus>Continuar</button>
  `;
  const video = intro.querySelector("video");
  const play = intro.querySelector("[data-play]");
  const sound = intro.querySelector("[data-sound]");
  video.muted = true;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  video.hidden = reduceMotion;
  sound.hidden = reduceMotion;
  play.hidden = !reduceMotion;

  function startVideo() {
    video.hidden = false;
    sound.hidden = false;
    if (!video.hasAttribute("src")) video.src = videoUrl;
    video.play().then(() => { play.hidden = true; }, () => { play.hidden = false; });
  }

  intro.addEventListener("close", () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    intro.remove();
    style.remove();
  }, { once: true });
  intro.querySelector("[data-continue]").onclick = () => intro.close();
  video.addEventListener("ended", () => {
    if (!intro.querySelector(".ft-play-test-entry[open]")) intro.close();
  });
  video.addEventListener("error", () => {
    video.hidden = true;
    play.hidden = true;
    sound.hidden = true;
  });
  play.onclick = startVideo;
  sound.onclick = () => {
    video.muted = !video.muted;
    sound.textContent = video.muted ? "Activar sonido" : "Silenciar";
    sound.setAttribute("aria-pressed", String(!video.muted));
  };

  document.body.append(intro);
  intro.dispatchEvent(new Event("fasttrip:welcome-ready", { bubbles: true }));
  intro.showModal();
  if (!reduceMotion) startVideo();
})();
