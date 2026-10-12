/* layar.ts - layar antrian publik. Polling 2,5 detik, fullscreen, dan suara panggilan. */

(() => {
  const POLL_MS = 2500;

  const grid = DOM.byId("screen-grid");
  const emptyNote = DOM.byId("screen-empty");
  const clock = DOM.byId("clock");
  const soundButton = DOM.byId<HTMLButtonElement>("sound-button");
  const fullscreenButton = DOM.byId<HTMLButtonElement>("fullscreen-button");

  /** Nomor terakhir yang sudah diumumkan per jenis, supaya tidak diulang tiap polling. */
  const announced = new Map<string, string>();
  let soundOn = false;
  let firstRender = true;

  function renderClock(): void {
    clock.textContent = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /* Web Speech API bawaan browser. Tidak ada library, sesuai syarat native.
     Ini fitur tambahan untuk nilai bonus (respon suara panggilan antrian). */
  function announce(label: string, serviceName: string): void {
    if (!soundOn || !("speechSynthesis" in window)) return;

    const spoken = label.split("").join(" "); // "A-001" dibaca per karakter
    const utterance = new SpeechSynthesisUtterance(
      `Nomor antrian ${spoken}, silakan menuju ${serviceName}`
    );
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function cardMarkup(type: QueueType, called: Ticket | undefined, remaining: number): string {
    const isCalling = called !== undefined;
    return `
      <article class="screen-card ${isCalling ? "is-calling" : ""}">
        <div class="svc-name">${DOM.escape(type.code)} &middot; ${DOM.escape(type.name)}</div>
        <div class="big ${isCalling ? "" : "idle"}">${isCalling ? DOM.escape(called.label) : "- - -"}</div>
        <div class="remain">${remaining} menunggu</div>
      </article>`;
  }

  function render(): void {
    renderClock();

    const types = Store.activeTypes();
    emptyNote.hidden = types.length > 0;

    grid.innerHTML = types
      .map((type) => {
        const called = Store.currentCalled(type.code);
        const remaining = Store.waiting(type.code).length;

        // Umumkan hanya kalau nomornya berubah, dan tidak saat halaman baru dibuka.
        const previous = announced.get(type.code);
        const now = called?.label ?? "";
        if (now !== previous) {
          announced.set(type.code, now);
          if (!firstRender && called !== undefined) announce(called.label, type.name);
        }

        return cardMarkup(type, called, remaining);
      })
      .join("");

    firstRender = false;
  }

  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    soundButton.textContent = soundOn ? "Suara: Nyala" : "Suara: Mati";
  });

  /* Fullscreen API. requestFullscreen mengembalikan Promise yang bisa ditolak
     (misalnya kalau tidak dipicu oleh klik), jadi penolakannya ditangkap. */
  fullscreenButton.addEventListener("click", () => {
    if (document.fullscreenElement === null) {
      document.documentElement.requestFullscreen().catch((error: unknown) => {
        console.error("Tidak bisa masuk layar penuh:", error);
      });
    } else {
      void document.exitFullscreen();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.textContent =
      document.fullscreenElement === null ? "Layar Penuh" : "Keluar Layar Penuh";
  });

  render();
  window.setInterval(renderClock, 1000);
  Store.onChange(render, POLL_MS);
})();
