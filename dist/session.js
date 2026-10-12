"use strict";
/* session.ts - auth guard, role guard, navbar, dan logout.
   Dimuat di halaman yang butuh login: index.html dan operator.html.

   Mode guard dibaca dari atribut data-guard pada <body>:
     data-guard="staff" -> hanya admin dan moderator
     data-guard="auth"  -> siapa pun yang sudah login
*/
const CURRENT_USER = (() => {
    const session = Store.getSession();
    if (session === null) {
        location.replace("login.html");
        return null;
    }
    const mode = document.body.dataset["guard"] ?? "auth";
    if (mode === "staff" && !Store.isStaff(session.role)) {
        location.replace("login.html");
        return null;
    }
    // Sesi sah: isi navbar lalu tampilkan halaman.
    DOM.byId("navbar-user").innerHTML =
        `${DOM.escape(session.firstName)}<span class="role-badge">${DOM.escape(session.role)}</span>`;
    DOM.byId("logout-button").addEventListener("click", () => {
        Store.clearSession();
        location.replace("login.html");
    });
    document.body.hidden = false;
    return session;
})();
