"use strict";
/* login.ts - autentikasi ke dummyjson, simpan sesi, redirect sesuai role. */
(() => {
    const LOGIN_API = "https://dummyjson.com/auth/login";
    const ME_API = "https://dummyjson.com/auth/me";
    const USERS_API = "https://dummyjson.com/users";
    const form = DOM.byId("login-form");
    const usernameInput = DOM.byId("username");
    const passwordInput = DOM.byId("password");
    const errorBox = DOM.byId("error-box");
    const button = DOM.byId("login-button");
    const buttonText = DOM.byId("login-button-text");
    const spinner = DOM.byId("login-spinner");
    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
    }
    function setLoading(isLoading) {
        button.disabled = isLoading;
        spinner.hidden = !isLoading;
        buttonText.textContent = isLoading ? "Memverifikasi..." : "Masuk";
    }
    function isRecord(v) {
        return typeof v === "object" && v !== null;
    }
    function readRole(v) {
        if (!isRecord(v))
            return null;
        const role = v["role"];
        return role === "admin" || role === "moderator" || role === "user" ? role : null;
    }
    /* Respons /auth/login TIDAK memuat role (sudah dicek di dokumentasi dummyjson),
       jadi role diambil lewat request kedua memakai token yang baru didapat.
       /auth/me dicoba lebih dulu karena memanfaatkan token; kalau di sana pun
       role tidak ada, jatuh ke /users/{id} yang pasti memuatnya. */
    async function fetchRole(token, userId) {
        try {
            const meRes = await fetch(ME_API, { headers: { Authorization: `Bearer ${token}` } });
            if (meRes.ok) {
                const role = readRole(await meRes.json());
                if (role !== null)
                    return role;
            }
            const userRes = await fetch(`${USERS_API}/${userId}`);
            if (userRes.ok) {
                const role = readRole(await userRes.json());
                if (role !== null)
                    return role;
            }
        }
        catch {
            // Gagal mengambil role bukan alasan membatalkan login yang sudah sah.
        }
        return "user";
    }
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.hidden = true;
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (username === "" || password === "") {
            showError("Username dan password wajib diisi.");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(LOGIN_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            // fetch hanya menolak saat jaringan gagal. Status 400/401/500 tetap
            // dianggap berhasil, jadi harus diperiksa sendiri.
            if (!response.ok) {
                showError(response.status === 400 || response.status === 401
                    ? "Username atau password salah."
                    : `Server menjawab dengan status ${response.status}.`);
                return;
            }
            const data = await response.json();
            if (!isRecord(data) ||
                typeof data["accessToken"] !== "string" ||
                typeof data["firstName"] !== "string" ||
                typeof data["username"] !== "string" ||
                typeof data["id"] !== "number") {
                showError("Respons server tidak sesuai yang diharapkan.");
                return;
            }
            const token = data["accessToken"];
            const role = await fetchRole(token, data["id"]);
            Store.setSession({
                token,
                role,
                firstName: data["firstName"],
                username: data["username"],
            });
            // Admin dan moderator ke dashboard; user biasa ke panel operator.
            location.replace(Store.isStaff(role) ? "index.html" : "operator.html");
        }
        catch (error) {
            showError("Tidak bisa menghubungi server. Periksa koneksi internet Anda.");
            console.error("Login gagal:", error);
        }
        finally {
            setLoading(false);
        }
    });
})();
