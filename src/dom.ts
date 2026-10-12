/* dom.ts - pembantu kecil untuk DOM, dipakai semua halaman.

   getElementById bertipe HTMLElement | null, jadi kalau dipakai langsung
   TypeScript strict akan protes di setiap baris. byId() memusatkan
   pengecekan itu: kalau id-nya salah ketik, errornya muncul sekali
   dan jelas, bukan "possibly null" di mana-mana. */

const DOM = {
  byId<T extends HTMLElement = HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (node === null) throw new Error(`Elemen dengan id "${id}" tidak ada di halaman ini.`);
    return node as T;
  },

  /** Buang karakter HTML supaya teks dari pengguna tidak dianggap markup. */
  escape(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
};
