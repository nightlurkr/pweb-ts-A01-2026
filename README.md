# Antrian Rumah Sakit

Praktikum Modul 3 - TypeScript
Pemrograman Web (ET234305) - Kelompok **A01**

| Nama | NRP | Bagian |
|---|---|---|
| Ryan Adya Purwanto | 5027231046 | Fondasi data, Autentikasi, Operator, Layar Antrian, Ambil Antrian |
| George David Nebore | 5027221043 | Dashboard Admin |
| Kharisma Fahrun Nisa' | 5027231086 | - |

Aplikasi antrian rumah sakit dengan lima halaman. Ditulis dalam **TypeScript**,
dikompilasi ke JavaScript, dan dijalankan **native** tanpa framework atau library
apa pun. Seluruh data disimpan di Local Storage.

---

## Cara menjalankan

```bash
npm install
npm run watch
```

Lalu buka `login.html` lewat **Live Server**, bukan dengan dobel-klik file.

Alasannya: Local Storage bersifat per-origin. Firefox memberi origin unik ke setiap
file yang dibuka lewat `file://`, sehingga sesi login yang disimpan di satu halaman
tidak terbaca di halaman lain. Lewat HTTP, kelima halaman berbagi origin yang sama.

Script yang tersedia:

| Perintah | Fungsi |
|---|---|
| `npm run watch` | `tsc --watch`, mengompilasi otomatis setiap file disimpan |
| `npm run build` | kompilasi sekali |
| `npm run typecheck` | `tsc --noEmit`, hanya memeriksa tipe tanpa menghasilkan file |

### Akun uji

Diambil dari `https://dummyjson.com/users/filter?key=role&value=<role>`.
Pola password: username ditambah `pass`.

| Role | Username | Password | Diarahkan ke |
|---|---|---|---|
| admin | `emilys` | `emilyspass` | `index.html` |
| moderator | `oliviaw` | `oliviawpass` | `index.html` |
| user | `averyp` | `averyppass` | `ambil-antrian.html` |

---

## Struktur proyek

```
.
├── login.html            Halaman login
├── index.html            Dashboard admin, admin dan moderator
├── operator.html         Panel operator, perlu login
├── layar.html            Layar antrian, satu-satunya halaman publik
├── ambil-antrian.html    Ambil nomor antrian, perlu login
├── tsconfig.json
├── css/style.css         Seluruh style, satu file
├── src/
│   ├── types.ts          Kontrak data, hanya tipe
│   ├── storage.ts        Satu-satunya pintu ke Local Storage
│   ├── dom.ts            Helper DOM
│   ├── session.ts        Auth guard, role guard, navbar, logout
│   ├── login.ts          Autentikasi
│   ├── admin.ts          Dashboard admin
│   ├── operator.ts       Panel pemanggilan
│   ├── layar.ts          Layar publik
│   └── ambil.ts          Kiosk
└── dist/                 Hasil kompilasi, dihubungkan ke HTML
```

Urutan `<script>` di setiap halaman tidak boleh diubah. `storage.js` dan `dom.js`
selalu pertama, lalu `session.js` pada halaman yang butuh login, baru script halaman.

---

## Ketentuan Website

### Wajib Native

Tidak ada framework dan tidak ada library. Tidak ada satu pun `<link>` atau `<script>`
yang menunjuk ke CDN. Seluruh style ditulis manual di `css/style.css`.

### TypeScript dan Compilation Workflow

Seluruh logika ditulis di `src/*.ts`, dikompilasi ke `dist/*.js`, dan dihubungkan ke
HTML dengan atribut `defer`:

```html
<script src="./dist/storage.js" defer></script>
<script src="./dist/dom.js" defer></script>
<script src="./dist/login.js" defer></script>
```

`defer` membuat browser menyelesaikan pembacaan HTML lebih dulu, baru menjalankan
script, sehingga seluruh elemen sudah ada di DOM saat kode berjalan.

Isi `tsconfig.json`:

```json
{
  "target": "ES2020",
  "module": "none",
  "lib": ["ES2020", "DOM"],
  "rootDir": "src",
  "outDir": "dist",
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true
}
```

Dua opsi yang paling berpengaruh:

- **`"module": "none"`** dipilih karena soal meminta `<script src="..." defer>`, yaitu
  script biasa dan bukan ES module. Konsekuensinya tidak ada `import` dan `export`:
  seluruh file berbagi satu scope global. Supaya tidak bentrok nama, seluruh fungsi
  penyimpanan dibungkus menjadi satu objek `Store` di `src/storage.ts`.
- **`"noUncheckedIndexedAccess": true`** membuat akses indeks seperti `arr[0]` bertipe
  `T | undefined`, bukan `T`. Efeknya terlihat di `src/operator.ts` baris 99.

### API yang dipakai

| Keperluan | Endpoint |
|---|---|
| Login | `POST https://dummyjson.com/auth/login` |
| Mengambil role | `GET https://dummyjson.com/auth/me` dengan header `Authorization: Bearer <token>` |
| Cadangan role | `GET https://dummyjson.com/users/{id}` |

Catatan penting: **respons `auth/login` tidak memuat `role`**. Isinya hanya `id`,
`username`, `email`, `firstName`, `lastName`, `gender`, `image`, `accessToken`, dan
`refreshToken`. Karena soal meminta role ditentukan dari respons server, role diambil
lewat permintaan kedua memakai token yang baru diterima. Lihat `src/login.ts` baris 41.

### Persistensi Local Storage

Empat key, semuanya hanya diakses lewat `Store` di `src/storage.ts`:

| Key | Isi |
|---|---|
| `antrian.session` | token, role, firstName, username |
| `antrian.types` | daftar jenis antrian |
| `antrian.tickets` | daftar tiket |
| `antrian.counters` | nomor urut terakhir per kode jenis |

Tidak ada file lain yang memanggil `localStorage` secara langsung. Isi Local Storage
diperlakukan sebagai data dari luar: dibaca sebagai `unknown` (baris 37) lalu
divalidasi dengan type guard (baris 57 sampai 99), bukan dipaksa dengan `as`.

---

## 1. Halaman Login (`login.html`)

### Form Login dan Loading State

`login.html` baris 22 sampai 39, logika di `src/login.ts`.

`setLoading()` di baris 21 mengatur tiga hal sekaligus: tombol dinonaktifkan, spinner
ditampilkan, dan teksnya berubah jadi "Memverifikasi...". Dipanggil di baris 72 saat
proses dimulai, dan di baris 120 di dalam blok `finally` supaya tombol selalu kembali
normal, baik berhasil maupun gagal.

Spinner-nya murni CSS, `@keyframes spin` di `css/style.css`, tanpa gambar.

### Autentikasi dan Validasi Role

`src/login.ts` baris 75 sampai 105.

```ts
const response = await fetch(LOGIN_API, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});

if (!response.ok) { ... }
```

Baris 83 penting: `fetch` hanya menolak kalau jaringan benar-benar gagal. Status 400
atau 401 karena password salah tetap dianggap berhasil, jadi harus diperiksa sendiri.

Respons diterima sebagai `unknown` di baris 92, lalu bentuknya diperiksa di baris 93
sampai 100 sebelum dipakai.

Role diambil oleh `fetchRole()` di baris 41 sampai 58. Tipe kembaliannya `Promise<Role>`,
jadi tidak mungkin fungsi ini mengembalikan role yang tidak dikenal.

### Session Storage

`src/login.ts` baris 107, memanggil `Store.setSession()`.

### Error Handling

Empat kondisi ditangani terpisah:

| Kondisi | Baris | Pesan |
|---|---|---|
| Field kosong | 68 | Username dan password wajib diisi |
| Kredensial salah (400/401) | 86 | Username atau password salah |
| Status server lain | 87 | Server menjawab dengan status ... |
| Jaringan gagal | 117 | Tidak bisa menghubungi server |

### Auto Redirect Berdasarkan Role

`src/login.ts` baris 115:

```ts
location.replace(Store.isStaff(role) ? "index.html" : "ambil-antrian.html");
```

`Store.isStaff()` di `src/storage.ts` baris 118 menyamakan `admin` dan `moderator`,
sesuai permintaan soal.

Dipakai `replace()` dan bukan `href` supaya halaman lama tidak tersimpan di riwayat
browser, sehingga tombol Back tidak bisa membawa pengguna kembali setelah logout.

### Akses Publik

Hanya `layar.html` yang bersifat publik dan tidak memuat `dist/session.js`.

Mengikuti revisi soal yang diumumkan asisten pada 13 Oktober 2026, bahwa semua user
harus login untuk mengambil antrian, `ambil-antrian.html` kini memakai auth guard
dengan mode `auth` seperti `operator.html`.

---

## 2. Dashboard Admin (`index.html`)

### Auth Guard dan Role Guard

`src/session.ts`, 34 baris, dipakai bersama oleh `index.html` dan `operator.html`.

```ts
const CURRENT_USER: Session | null = (() => {
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
  ...
  document.body.hidden = false;
  return session;
})();
```

Tingkat proteksi dibedakan lewat atribut `data-guard` pada tag `<body>`:

| Halaman | Baris | Mode |
|---|---|---|
| `index.html` | 15 | `staff`, hanya admin dan moderator |
| `operator.html` | 14 | `auth`, siapa pun yang sudah login |
| `ambil-antrian.html` | 14 | `auth`, siapa pun yang sudah login |

Kedua halaman memakai `<body hidden>`, dan baru dibuka di baris 32 `session.ts` setelah
sesinya terbukti sah. Tanpa itu, isi halaman sempat berkedip sebelum redirect selesai.

Tipe `Session | null` memaksa setiap file yang memakainya mengecek null lebih dulu.
Lihat baris pertama `src/operator.ts` dan `src/admin.ts`.

### Navigation Bar

`index.html` baris 16 sampai 26. Nama dan role diisi oleh `src/session.ts` baris 24,
tombol logout di baris 27 sampai 30 memanggil `Store.clearSession()` lalu kembali ke
halaman login.

### Manajemen Jenis Antrian

`src/admin.ts`.

| Fitur | Lokasi |
|---|---|
| Form tambah jenis | baris 167 sampai 185 |
| Kode dipaksa 1 huruf kapital saat mengetik | baris 163 |
| Validasi duplikat | `Store.validateNewType()`, `storage.ts` baris 143 sampai 156 |
| Tabel jenis antrian | baris 71 sampai 100 |
| Aktifkan dan nonaktifkan | baris 121 sampai 130 |
| Hapus jenis | baris 132 sampai 145 |
| Reset antrian | baris 221 sampai 233 |

Aturan duplikat ditangani terpusat di `storage.ts` baris 143 sampai 156: kode harus
tepat satu huruf A sampai Z, nama tidak boleh kosong, serta kode dan nama tidak boleh
sama dengan yang sudah ada. Perbandingan nama memakai `toLowerCase()`, sehingga
"Poli Gigi" dan "poli gigi" dianggap sama.

Jenis yang nonaktif disaring keluar oleh `Store.activeTypes()` di `storage.ts` baris 133,
sehingga tidak muncul sebagai pilihan saat pengambilan tiket baru.

Reset antrian menghapus key `antrian.tickets` dan `antrian.counters`, tapi tidak
menyentuh `antrian.types`. Nomor kembali ke 001 dan daftar jenis tetap utuh.

### Penerbitan Tiket Manual

`src/admin.ts` baris 189 sampai 217, memanggil `Store.createTicket()`.

Tombol beserta dropdownnya otomatis dinonaktifkan kalau tidak ada jenis aktif
(baris 112 sampai 116).

---

## 3. Halaman Operator (`operator.html`)

### Auth Guard

`src/operator.ts` baris 4. Mode `auth`, jadi semua role yang sudah login boleh masuk,
termasuk admin.

### Panel Pemanggilan Antrian

Nomor yang sedang dipanggil dirender di baris 43 sampai 59, daftar antrean berikutnya
di baris 61 sampai 86.

Urutan panggil ditentukan oleh `Store.waiting()` di `storage.ts` baris 231, yang
memanggil `sortByPriority()` di baris 223:

```ts
const PRIORITY_RANK: Record<Priority, number> = {
  vip: 0, disabilitas: 1, lansia: 2, normal: 3,
};

return [...tickets].sort((a, b) => {
  const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return rank !== 0 ? rank : a.createdAt - b.createdAt;
});
```

Prioritas lebih dulu, baru waktu datang. Jadi dua tiket VIP tetap dilayani sesuai
urutan kedatangan. `Record<Priority, number>` memaksa keempat prioritas punya nilai,
sehingga menambah prioritas baru di `types.ts` langsung memunculkan error di sini.

Spread `[...tickets]` membuat salinan lebih dulu, karena `sort()` mengubah array aslinya.

### Tiga tombol dengan perilaku berbeda

| Tombol | Baris | Perilaku |
|---|---|---|
| Panggil Berikutnya | 96 sampai 104 | tiket aktif jadi `selesai`, lalu memanggil tiket berikutnya |
| Lewati | 107 sampai 110 | tiket aktif jadi `dilewati`, antrian **tidak** otomatis lanjut |
| Selesai | 113 sampai 116 | tiket aktif jadi `selesai`, antrian **tidak** otomatis lanjut |

Ketiganya memakai `closeCurrent()` di baris 88, yang parameternya bertipe `TicketStatus`
dan bukan `string`, sehingga status yang tidak dikenal tidak mungkin terkirim.

Baris 99 memperlihatkan efek `noUncheckedIndexedAccess`:

```ts
const next = Store.waiting(selectedCode())[0];
if (next !== undefined) { ... }
```

Tanpa opsi itu, `[0]` dianggap pasti berisi `Ticket`, padahal array bisa kosong.

### Filter per layanan

`renderFilter()` di baris 22 sampai 33 membangun pilihannya dari daftar jenis antrian,
sehingga operator bisa melayani satu layanan saja atau semua sekaligus. Pilihan yang
sedang dipakai dipertahankan saat render ulang (baris 32).

---

## 4. Layar Antrian (`layar.html`)

### Akses Publik dan Pembaruan Real-time

Halaman ini tidak memuat `session.js`, jadi bisa dibuka tanpa login.

Pembaruan otomatis ditangani `Store.onChange()` di `storage.ts` baris 266:

```ts
function onChange(callback: () => void, intervalMs = 2000): void {
  window.addEventListener("storage", callback);
  window.setInterval(callback, intervalMs);
}
```

Dua mekanisme dipakai bersamaan dengan alasan yang konkret: event `storage` hanya
menyala di **tab lain**, tidak di tab yang melakukan perubahan. Jadi event dipakai untuk
reaksi cepat antar jendela, dan interval sebagai jaring pengaman sekaligus pemenuh
syarat polling 2 sampai 3 detik di soal. Layar memakai interval 2,5 detik
(`layar.ts` baris 4).

### Panel Layar

Satu kartu per jenis antrian aktif (`layar.ts` baris 61 sampai 69), berisi nomor yang
sedang dipanggil dan jumlah tiket yang masih menunggu. Kartu yang sedang memanggil
diberi penanda visual lewat class `is-calling`.

### Fitur Layar Penuh

`layar.ts` baris 104 sampai 117, memakai Fullscreen API bawaan browser.

```ts
document.documentElement.requestFullscreen().catch((error: unknown) => { ... });
```

`requestFullscreen()` mengembalikan Promise yang bisa ditolak browser, jadi
penolakannya ditangkap. Teks tombol mengikuti event `fullscreenchange` di baris 114,
sehingga tetap benar walau pengguna keluar dengan tombol Escape.

---

## 5. Halaman Ambil Antrian (`ambil-antrian.html`)

### Layanan Self-Service

Pengunjung login lebih dulu, lalu memilih jenis layanan dan tingkat prioritas. Tiket
langsung masuk antrean tanpa persetujuan admin.

Halaman ini semula publik. Status itu berubah mengikuti revisi soal 13 Oktober 2026,
yang menyatakan semua user harus login untuk mengambil antrian. Role `user` karena itu
diarahkan ke halaman ini setelah login, bukan ke panel operator.

Nilai dropdown bertipe `string`, jadi disempitkan dulu ke `Priority` dengan type guard
di `ambil.ts` baris 43 sebelum dikirim ke `Store.createTicket()`.

### Format Nomor Tiket

`storage.ts` baris 181:

```ts
function formatLabel(code: string, num: number): string {
  return `${code}-${String(num).padStart(3, "0")}`;
}
```

Menghasilkan `A-001`, `B-012`, sesuai contoh di soal. Nomor urut disimpan terpisah per
kode jenis di key `antrian.counters`, sehingga setiap layanan punya urutannya sendiri.

### Posisi antrean

`ambil.ts` baris 67:

```ts
const antreanDepan = Store.waiting(code).findIndex((t) => t.id === ticket.id);
```

Dihitung dari posisi di daftar yang sudah diurutkan, bukan dari jumlah total antrean.
Keduanya berbeda begitu ada prioritas: tiket VIP yang baru diambil bisa saja berada di
posisi pertama meskipun sudah ada lima tiket Normal yang menunggu.

### Pembaruan Otomatis

`ambil.ts` baris 21 sampai 41, dipanggil ulang tiap 2 detik lewat `Store.onChange`.
Jenis antrian baru yang ditambahkan admin langsung muncul tanpa reload, dan jenis yang
dinonaktifkan langsung hilang.

Baris 31 sampai 33 memakai penanda isi (signature) supaya DOM hanya ditulis ulang kalau
datanya benar-benar berubah. Tanpa itu, pilihan yang sedang dipakai pengunjung akan
ter-reset setiap dua detik.

---

## Fitur tambahan di luar requirement

Semuanya tetap dalam lingkup HTML, CSS, dan TypeScript murni.

| Fitur | Lokasi |
|---|---|
| Suara panggilan antrian lewat Web Speech API, dengan tombol nyala dan mati | `layar.ts` 35 sampai 59 |
| Pemilihan suara berbahasa Indonesia secara aktif dari `getVoices()` | `layar.ts` 35 |
| Nomor dibacakan per digit, dan hanya saat nomornya berubah | `layar.ts` 42 dan 83 |
| Kartu berkedip saat memanggil, otomatis mati kalau sistem disetel reduce motion | `css/style.css` |
| Jam berjalan di layar antrian | `layar.ts` 17 |
| Filter per layanan di panel operator | `operator.ts` 18 dan 23 |
| Konfirmasi sebelum hapus jenis dan reset antrian | `admin.ts` 139 dan 223 |
| Tombol otomatis mati saat tidak ada data yang bisa diproses | `operator.ts` 65, `admin.ts` 112 sampai 116 |
| Tema warna lewat CSS variables, ganti satu baris mengubah seluruh halaman | `css/style.css` 4 sampai 33 |
| `escape()` untuk mencegah teks dari pengguna diperlakukan sebagai markup | `dom.ts` 16 |
| Tampilan responsif sampai lebar layar ponsel | `css/style.css`, Flexbox dan Grid |

---

## Catatan teknis

### Komunikasi antar halaman

Kelima halaman tidak saling memanggil. Semuanya membaca dan menulis ke Local Storage
lewat `Store`, dan saling mengetahui perubahan lewat `Store.onChange()`. Pola ini
membuat setiap halaman bisa dibuka sendiri-sendiri, di jendela berbeda, bahkan di tab
yang berbeda, tanpa konfigurasi tambahan.

### Kenapa semua akses Local Storage lewat satu file

Supaya bentuk data hanya diketahui satu tempat. Kalau formatnya berubah, cukup
`storage.ts` yang disesuaikan, empat halaman lain tidak perlu disentuh.

### Disiplin tipe

- `tsc --noEmit` lolos tanpa error
- Tidak ada `any`
- Tidak ada `@ts-ignore` maupun `@ts-expect-error`
- Hanya ada satu `as` di seluruh proyek, yaitu `node as T` di `dom.ts` baris 12,
  dan itu didahului pengecekan null di baris sebelumnya

### Batasan yang disadari

- Pemeriksaan role terjadi di sisi browser, jadi isi Local Storage bisa diubah lewat
  DevTools. Di aplikasi sungguhan, otorisasi dilakukan di server dan browser hanya
  membawa token untuk diverifikasi di sana.
- Token dari dummyjson punya masa berlaku. Di aplikasi ini token hanya dipakai sekali
  saat login untuk mengambil role, jadi sesi yang tersimpan tetap berfungsi setelahnya.
- Suara panggilan bergantung pada suara yang tersedia di sistem. Chrome membawa suara
  Bahasa Indonesia sendiri, sedangkan Firefox mengambil dari sistem operasi yang
  umumnya tidak menyediakannya. Kode sudah mencari suara berbahasa Indonesia secara
  aktif, dan kalau tidak tersedia tetap membacakan dengan suara default.
