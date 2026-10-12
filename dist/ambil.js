"use strict";
/* ambil.ts - halaman publik untuk mengambil nomor antrian sendiri. */
(() => {
    const form = DOM.byId("kiosk-form");
    const jenisSelect = DOM.byId("jenis");
    const prioritasSelect = DOM.byId("prioritas");
    const button = DOM.byId("ambil-button");
    const message = DOM.byId("message");
    const result = DOM.byId("ticket-result");
    const ticketNumber = DOM.byId("ticket-number");
    const ticketMeta = DOM.byId("ticket-meta");
    function showMessage(text, kind) {
        message.textContent = text;
        message.className = kind === "error" ? "alert alert-error" : "alert alert-ok";
        message.hidden = false;
    }
    /* Dipanggil ulang tiap 2 detik lewat Store.onChange, supaya jenis antrian
       baru yang ditambahkan admin langsung muncul tanpa refresh manual. */
    function renderJenis() {
        const types = Store.activeTypes();
        const previous = jenisSelect.value;
        const markup = types
            .map((t) => `<option value="${DOM.escape(t.code)}">${DOM.escape(t.code)} - ${DOM.escape(t.name)}</option>`)
            .join("");
        // Hindari menulis ulang DOM kalau isinya sama persis; menulis ulang akan
        // mereset pilihan pengguna yang sedang mengisi form.
        const signature = types.map((t) => t.code + t.name).join("|");
        if (jenisSelect.dataset["signature"] === signature)
            return;
        jenisSelect.dataset["signature"] = signature;
        jenisSelect.innerHTML = markup;
        if (types.some((t) => t.code === previous))
            jenisSelect.value = previous;
        const kosong = types.length === 0;
        button.disabled = kosong;
        if (kosong)
            showMessage("Belum ada layanan yang dibuka. Silakan hubungi petugas.", "error");
    }
    function isPriority(v) {
        return v === "vip" || v === "disabilitas" || v === "lansia" || v === "normal";
    }
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        message.hidden = true;
        const code = jenisSelect.value;
        const priority = prioritasSelect.value;
        if (code === "") {
            showMessage("Pilih jenis layanan terlebih dahulu.", "error");
            return;
        }
        if (!isPriority(priority)) {
            showMessage("Tingkat prioritas tidak dikenali.", "error");
            return;
        }
        try {
            const ticket = Store.createTicket(code, priority);
            const antreanDepan = Store.waiting(code).length - 1;
            ticketNumber.textContent = ticket.label;
            ticketMeta.innerHTML =
                `${DOM.escape(Store.findType(code)?.name ?? code)} &middot; ` +
                    `<span class="badge badge-${ticket.priority}">${Store.PRIORITY_LABEL[ticket.priority]}</span><br />` +
                    `${antreanDepan} antrean di depan Anda`;
            result.hidden = false;
            showMessage("Nomor antrian berhasil dibuat. Simpan nomor Anda.", "ok");
        }
        catch (error) {
            showMessage(error instanceof Error ? error.message : "Gagal membuat tiket.", "error");
            console.error("Gagal membuat tiket:", error);
        }
    });
    renderJenis();
    Store.onChange(renderJenis, 2000);
})();
