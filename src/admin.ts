/* admin.ts - Orang B (George): CRUD jenis antrian, tiket manual, reset.
   Pakai objek global Store dari storage.ts. Jangan sentuh localStorage langsung. */

   /* admin.ts - Orang B (George): CRUD jenis antrian, tiket manual, reset.
   Pakai objek global Store dari storage.ts. Jangan sentuh localStorage langsung. */

(() => {
  if (CURRENT_USER === null) return; // guard di session.ts sudah mengalihkan halaman

  const messageBox = DOM.byId("admin-message");

  const typeForm = DOM.byId<HTMLFormElement>("type-form");
  const kodeInput = DOM.byId<HTMLInputElement>("type-kode");
  const namaInput = DOM.byId<HTMLInputElement>("type-nama");

  const ticketForm = DOM.byId<HTMLFormElement>("ticket-form");
  const ticketJenis = DOM.byId<HTMLSelectElement>("ticket-jenis");
  const ticketPrioritas = DOM.byId<HTMLSelectElement>("ticket-prioritas");
  const ticketSubmit = DOM.byId<HTMLButtonElement>("ticket-submit");
  const ticketEmpty = DOM.byId("ticket-empty");
  const ticketResult = DOM.byId("ticket-result");
  const ticketNumber = DOM.byId("ticket-number");
  const ticketMeta = DOM.byId("ticket-meta");

  const typeTable = DOM.byId("type-table");
  const typeBody = DOM.byId("type-body");
  const typeEmpty = DOM.byId("type-empty");
  const resetButton = DOM.byId<HTMLButtonElement>("reset-button");

  let messageTimer: number | undefined;

  function showMessage(text: string, kind: "error" | "ok"): void {
    messageBox.textContent = text;
    messageBox.className = kind === "error" ? "alert alert-error" : "alert alert-ok";
    messageBox.hidden = false;
    window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => {
      messageBox.hidden = true;
    }, 4500);
  }

  function isPriority(v: string): v is Priority {
    return v === "vip" || v === "disabilitas" || v === "lansia" || v === "normal";
  }

  // ---------- Render ----------

  /* Dipanggil tiap 2 detik lewat Store.onChange. Signature dipakai supaya DOM
     hanya ditulis ulang kalau datanya benar-benar berubah; kalau tidak, pilihan
     dropdown yang sedang dipakai admin akan ter-reset. */
  let lastSignature = "";

  function render(): void {
    const types = [...Store.getTypes()].sort((a, b) => a.code.localeCompare(b.code));
    const signature = JSON.stringify(
      types.map((t) => [t.code, t.name, t.active, Store.waiting(t.code).length])
    );
    if (signature === lastSignature) return;
    lastSignature = signature;

    renderTable(types);
    renderTicketSelect(types);
  }

  /** Paksa render ulang segera setelah admin melakukan aksi. */
  function renderNow(): void {
    lastSignature = "";
    render();
  }

  function renderTable(types: QueueType[]): void {
    typeTable.hidden = types.length === 0;
    typeEmpty.hidden = types.length > 0;

    typeBody.innerHTML = types
      .map((t) => {
        const status = t.active
          ? `<span class="badge badge-on">Aktif</span>`
          : `<span class="badge badge-normal">Nonaktif</span>`;
        const code = DOM.escape(t.code);
        return `
        <tr>
          <td class="adm-code">${code}</td>
          <td>${DOM.escape(t.name)}</td>
          <td>${status}</td>
          <td>${Store.waiting(t.code).length}</td>
          <td>
            <div class="btn-row">
              <button type="button" class="btn btn-ghost adm-btn" data-action="toggle" data-code="${code}">
                ${t.active ? "Nonaktifkan" : "Aktifkan"}
              </button>
              <button type="button" class="btn btn-danger adm-btn" data-action="delete" data-code="${code}">
                Hapus
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
  }

  /** Hanya jenis AKTIF yang bisa dipilih untuk tiket baru (sesuai soal). */
  function renderTicketSelect(types: QueueType[]): void {
    const active = types.filter((t) => t.active);
    const previous = ticketJenis.value;

    ticketJenis.innerHTML = active
      .map((t) => `<option value="${DOM.escape(t.code)}">${DOM.escape(t.code)} - ${DOM.escape(t.name)}</option>`)
      .join("");
    if (active.some((t) => t.code === previous)) ticketJenis.value = previous;

    const kosong = active.length === 0;
    ticketEmpty.hidden = !kosong;
    ticketJenis.disabled = kosong;
    ticketPrioritas.disabled = kosong;
    ticketSubmit.disabled = kosong;
  }

  // ---------- Aksi pada jenis antrian ----------

  function toggleType(code: string): void {
    const target = Store.findType(code);
    if (target === undefined) {
      showMessage(`Jenis "${code}" tidak ditemukan.`, "error");
      return;
    }
    const nextActive = !target.active;
    Store.saveTypes(Store.getTypes().map((t) => (t.code === code ? { ...t, active: nextActive } : t)));
    showMessage(`Jenis ${code} ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`, "ok");
  }

  function deleteType(code: string): void {
    const target = Store.findType(code);
    if (target === undefined) return;

    const sisa = Store.getTickets().filter((t) => t.code === code).length;
    const peringatan =
      sisa > 0 ? `\n\n${sisa} tiket milik jenis ini ikut dihapus.` : "";
    if (!window.confirm(`Hapus jenis antrian "${target.code} - ${target.name}"?${peringatan}`)) return;

    // Tiket yatim (jenisnya sudah tidak ada) dibuang supaya tidak muncul di panel operator.
    Store.saveTickets(Store.getTickets().filter((t) => t.code !== code));
    Store.saveTypes(Store.getTypes().filter((t) => t.code !== code));
    showMessage(`Jenis ${code} dihapus.`, "ok");
  }

  typeBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLButtonElement>("button[data-action]");
    if (button === null) return;

    const code = button.dataset["code"];
    const action = button.dataset["action"];
    if (code === undefined) return;

    if (action === "toggle") toggleType(code);
    else if (action === "delete") deleteType(code);
    renderNow();
  });

  // Kode hanya boleh 1 huruf dan otomatis kapital.
  kodeInput.addEventListener("input", () => {
    kodeInput.value = kodeInput.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 1);
  });

  typeForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const code = kodeInput.value.trim().toUpperCase();
    const name = namaInput.value.trim().replace(/\s+/g, " ");

    // Aturan duplikat kode/nama (case-insensitive) ada di Store.validateNewType.
    const problem = Store.validateNewType(code, name);
    if (problem !== null) {
      showMessage(problem, "error");
      return;
    }

    Store.saveTypes([...Store.getTypes(), { code, name, active: true }]);
    showMessage(`Jenis antrian "${code} - ${name}" ditambahkan.`, "ok");
    typeForm.reset();
    kodeInput.focus();
    renderNow();
  });

  // ---------- Tiket manual ----------

  ticketForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const code = ticketJenis.value;
    const priority = ticketPrioritas.value;

    if (code === "") {
      showMessage("Pilih jenis antrian terlebih dahulu.", "error");
      return;
    }
    if (!isPriority(priority)) {
      showMessage("Tingkat prioritas tidak dikenali.", "error");
      return;
    }

    try {
      const ticket = Store.createTicket(code, priority);
      ticketNumber.textContent = ticket.label;
      ticketMeta.innerHTML =
        `${DOM.escape(Store.findType(code)?.name ?? code)} &middot; ` +
        `<span class="badge badge-${ticket.priority}">${Store.PRIORITY_LABEL[ticket.priority]}</span>`;
      ticketResult.hidden = false;
      showMessage(`Tiket ${ticket.label} berhasil diterbitkan.`, "ok");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Gagal menerbitkan tiket.", "error");
      console.error("Gagal menerbitkan tiket:", error);
    }
    renderNow();
  });

  // ---------- Reset ----------

  resetButton.addEventListener("click", () => {
    const total = Store.getTickets().length;
    const ok = window.confirm(
      `Reset antrian?\n\n${total} tiket akan dihapus dan nomor kembali ke 001. ` +
        `Jenis antrian tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
    );
    if (!ok) return;

    Store.resetQueue();
    ticketResult.hidden = true;
    showMessage("Antrian berhasil di-reset. Nomor tiket kembali ke 001.", "ok");
    renderNow();
  });

  render();
  Store.onChange(render, 2000);
})();
