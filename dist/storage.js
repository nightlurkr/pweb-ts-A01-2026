"use strict";
/* storage.ts - satu-satunya pintu ke Local Storage.
   Tidak ada file lain yang boleh memanggil localStorage secara langsung.
   Semua diakses lewat objek global `Store`. */
const Store = (() => {
    const KEY_SESSION = "antrian.session";
    const KEY_TYPES = "antrian.types";
    const KEY_TICKETS = "antrian.tickets";
    const KEY_COUNTERS = "antrian.counters";
    /** Urutan panggil: angka lebih kecil dipanggil lebih dulu. */
    const PRIORITY_RANK = {
        vip: 0,
        disabilitas: 1,
        lansia: 2,
        normal: 3,
    };
    const PRIORITY_LABEL = {
        vip: "VIP",
        disabilitas: "Disabilitas",
        lansia: "Lansia",
        normal: "Normal",
    };
    const STATUS_LABEL = {
        menunggu: "Menunggu",
        dipanggil: "Dipanggil",
        selesai: "Selesai",
        dilewati: "Dilewati",
    };
    // ---------- Baca/tulis mentah ----------
    /* Isi localStorage datang dari luar program, jadi diperlakukan sebagai
       unknown lalu divalidasi, bukan dipercaya lewat `as`. */
    function readRaw(key) {
        try {
            const text = localStorage.getItem(key);
            return text === null ? null : JSON.parse(text);
        }
        catch {
            return null;
        }
    }
    function writeRaw(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        bump();
    }
    // ---------- Type guard ----------
    function isRecord(v) {
        return typeof v === "object" && v !== null && !Array.isArray(v);
    }
    function isPriority(v) {
        return v === "vip" || v === "disabilitas" || v === "lansia" || v === "normal";
    }
    function isStatus(v) {
        return v === "menunggu" || v === "dipanggil" || v === "selesai" || v === "dilewati";
    }
    function isRole(v) {
        return v === "admin" || v === "moderator" || v === "user";
    }
    function isQueueType(v) {
        return (isRecord(v) &&
            typeof v["code"] === "string" &&
            typeof v["name"] === "string" &&
            typeof v["active"] === "boolean");
    }
    function isTicket(v) {
        return (isRecord(v) &&
            typeof v["id"] === "string" &&
            typeof v["code"] === "string" &&
            typeof v["number"] === "number" &&
            typeof v["label"] === "string" &&
            isPriority(v["priority"]) &&
            isStatus(v["status"]) &&
            typeof v["createdAt"] === "number");
    }
    function isSession(v) {
        return (isRecord(v) &&
            typeof v["token"] === "string" &&
            isRole(v["role"]) &&
            typeof v["firstName"] === "string" &&
            typeof v["username"] === "string");
    }
    // ---------- Sesi login ----------
    function getSession() {
        const raw = readRaw(KEY_SESSION);
        return isSession(raw) ? raw : null;
    }
    function setSession(session) {
        writeRaw(KEY_SESSION, session);
    }
    function clearSession() {
        localStorage.removeItem(KEY_SESSION);
        bump();
    }
    /** admin dan moderator punya hak akses yang sama (lihat soal bagian 1). */
    function isStaff(role) {
        return role === "admin" || role === "moderator";
    }
    // ---------- Jenis antrian ----------
    function getTypes() {
        const raw = readRaw(KEY_TYPES);
        return Array.isArray(raw) ? raw.filter(isQueueType) : [];
    }
    function saveTypes(list) {
        writeRaw(KEY_TYPES, list);
    }
    function activeTypes() {
        return getTypes().filter((t) => t.active);
    }
    function findType(code) {
        const wanted = code.trim().toUpperCase();
        return getTypes().find((t) => t.code === wanted);
    }
    /** Cek duplikat kode atau nama, case-insensitive. Mengembalikan alasan, atau null kalau aman. */
    function validateNewType(code, name) {
        const c = code.trim().toUpperCase();
        const n = name.trim();
        if (!/^[A-Z]$/.test(c))
            return "Kode harus tepat satu huruf kapital (A sampai Z).";
        if (n.length === 0)
            return "Nama layanan tidak boleh kosong.";
        const existing = getTypes();
        if (existing.some((t) => t.code === c))
            return `Kode "${c}" sudah dipakai.`;
        if (existing.some((t) => t.name.toLowerCase() === n.toLowerCase()))
            return `Nama layanan "${n}" sudah ada.`;
        return null;
    }
    // ---------- Nomor urut per jenis ----------
    function getCounters() {
        const raw = readRaw(KEY_COUNTERS);
        if (!isRecord(raw))
            return {};
        const result = {};
        for (const key of Object.keys(raw)) {
            const value = raw[key];
            if (typeof value === "number")
                result[key] = value;
        }
        return result;
    }
    function nextNumber(code) {
        const counters = getCounters();
        const next = (counters[code] ?? 0) + 1;
        counters[code] = next;
        writeRaw(KEY_COUNTERS, counters);
        return next;
    }
    /** Format nomor tiket sesuai soal: Kode-3 digit, misal A-001. */
    function formatLabel(code, num) {
        return `${code}-${String(num).padStart(3, "0")}`;
    }
    // ---------- Tiket ----------
    function getTickets() {
        const raw = readRaw(KEY_TICKETS);
        return Array.isArray(raw) ? raw.filter(isTicket) : [];
    }
    function saveTickets(list) {
        writeRaw(KEY_TICKETS, list);
    }
    /** Membuat tiket baru. Dipakai halaman Ambil Antrian dan tiket manual di Dashboard. */
    function createTicket(code, priority) {
        const type = findType(code);
        if (!type)
            throw new Error(`Jenis antrian "${code}" tidak ditemukan.`);
        if (!type.active)
            throw new Error(`Jenis antrian "${type.name}" sedang nonaktif.`);
        const num = nextNumber(type.code);
        const ticket = {
            id: `${type.code}-${num}-${Date.now()}`,
            code: type.code,
            number: num,
            label: formatLabel(type.code, num),
            priority,
            status: "menunggu",
            createdAt: Date.now(),
        };
        saveTickets([...getTickets(), ticket]);
        return ticket;
    }
    function updateTicket(id, patch) {
        saveTickets(getTickets().map((t) => (t.id === id ? { ...t, ...patch } : t)));
    }
    /* Urutan panggil: prioritas dulu, lalu yang lebih dulu datang.
       sort() mengubah array aslinya, jadi disalin dulu dengan spread. */
    function sortByPriority(tickets) {
        return [...tickets].sort((a, b) => {
            const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            return rank !== 0 ? rank : a.createdAt - b.createdAt;
        });
    }
    /** Tiket menunggu, sudah terurut. Beri `code` untuk menyaring satu jenis saja. */
    function waiting(code) {
        const list = getTickets().filter((t) => t.status === "menunggu" && (code === undefined || t.code === code));
        return sortByPriority(list);
    }
    function currentCalled(code) {
        return getTickets().find((t) => t.status === "dipanggil" && (code === undefined || t.code === code));
    }
    /** Kosongkan seluruh tiket dan kembalikan nomor urut ke awal. Jenis antrian tetap. */
    function resetQueue() {
        localStorage.removeItem(KEY_TICKETS);
        localStorage.removeItem(KEY_COUNTERS);
        bump();
    }
    // ---------- Pembaruan antar halaman ----------
    /* Event "storage" hanya menyala di TAB LAIN, tidak di tab yang menulis.
       Jadi ditambah polling supaya layar tetap segar walau datanya diubah
       dari tab yang sama, dan supaya memenuhi syarat polling 2-3 detik di soal. */
    const KEY_PING = "antrian.ping";
    function bump() {
        try {
            localStorage.setItem(KEY_PING, String(Date.now()));
        }
        catch {
            // kuota penuh atau storage diblokir: abaikan, bukan error fatal
        }
    }
    function onChange(callback, intervalMs = 2000) {
        window.addEventListener("storage", callback);
        window.setInterval(callback, intervalMs);
    }
    return {
        PRIORITY_RANK,
        PRIORITY_LABEL,
        STATUS_LABEL,
        getSession,
        setSession,
        clearSession,
        isStaff,
        getTypes,
        saveTypes,
        activeTypes,
        findType,
        validateNewType,
        formatLabel,
        getTickets,
        saveTickets,
        createTicket,
        updateTicket,
        sortByPriority,
        waiting,
        currentCalled,
        resetQueue,
        onChange,
    };
})();
