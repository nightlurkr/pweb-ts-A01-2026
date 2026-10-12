"use strict";
/* operator.ts - panel pemanggilan antrian. */
(() => {
    if (CURRENT_USER === null)
        return; // guard di session.ts sudah mengalihkan halaman
    const filterSelect = DOM.byId("filter-jenis");
    const currentNumber = DOM.byId("current-number");
    const currentMeta = DOM.byId("current-meta");
    const queueList = DOM.byId("queue-list");
    const queueEmpty = DOM.byId("queue-empty");
    const btnNext = DOM.byId("btn-next");
    const btnSkip = DOM.byId("btn-skip");
    const btnDone = DOM.byId("btn-done");
    const ALL = "";
    /** Kode jenis yang sedang dipilih, atau undefined kalau "semua layanan". */
    function selectedCode() {
        return filterSelect.value === ALL ? undefined : filterSelect.value;
    }
    function renderFilter() {
        const types = Store.getTypes();
        const previous = filterSelect.value;
        const options = types
            .map((t) => `<option value="${DOM.escape(t.code)}">${DOM.escape(t.code)} - ${DOM.escape(t.name)}</option>`)
            .join("");
        filterSelect.innerHTML = `<option value="${ALL}">Semua layanan</option>${options}`;
        // Pertahankan pilihan operator kalau jenisnya masih ada.
        if (types.some((t) => t.code === previous))
            filterSelect.value = previous;
    }
    function serviceName(code) {
        return Store.findType(code)?.name ?? code;
    }
    function priorityBadge(priority) {
        return `<span class="badge badge-${priority}">${Store.PRIORITY_LABEL[priority]}</span>`;
    }
    function renderCurrent() {
        const current = Store.currentCalled(selectedCode());
        if (current === undefined) {
            currentNumber.textContent = "-";
            currentMeta.textContent = "Belum ada yang dipanggil";
            btnSkip.disabled = true;
            btnDone.disabled = true;
            return;
        }
        currentNumber.textContent = current.label;
        currentMeta.innerHTML =
            `${DOM.escape(serviceName(current.code))} &middot; ${priorityBadge(current.priority)}`;
        btnSkip.disabled = false;
        btnDone.disabled = false;
    }
    function renderQueue() {
        const waiting = Store.waiting(selectedCode());
        queueEmpty.hidden = waiting.length > 0;
        btnNext.disabled = waiting.length === 0;
        queueList.innerHTML = waiting
            .slice(0, 10)
            .map((t, i) => `
        <li>
          <span class="pos">${i + 1}</span>
          <span class="tick">${DOM.escape(t.label)}</span>
          <span class="svc">${DOM.escape(serviceName(t.code))}</span>
          ${priorityBadge(t.priority)}
        </li>`)
            .join("");
    }
    function render() {
        renderFilter();
        renderCurrent();
        renderQueue();
    }
    /** Tutup tiket yang sedang dipanggil dengan status tertentu. */
    function closeCurrent(status) {
        const current = Store.currentCalled(selectedCode());
        if (current !== undefined) {
            Store.updateTicket(current.id, { status, finishedAt: Date.now() });
        }
        return current;
    }
    btnNext.addEventListener("click", () => {
        closeCurrent("selesai");
        const next = Store.waiting(selectedCode())[0];
        if (next !== undefined) {
            Store.updateTicket(next.id, { status: "dipanggil", calledAt: Date.now() });
        }
        render();
    });
    // Dilewati: tiket ditandai, antrian tidak otomatis lanjut.
    btnSkip.addEventListener("click", () => {
        closeCurrent("dilewati");
        render();
    });
    // Selesai: menutup tiket tanpa memanggil berikutnya.
    btnDone.addEventListener("click", () => {
        closeCurrent("selesai");
        render();
    });
    filterSelect.addEventListener("change", render);
    render();
    Store.onChange(render, 2000);
})();
