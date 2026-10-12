/* types.ts - kontrak data seluruh aplikasi.
   File ini hanya berisi tipe, jadi hasil kompilasinya kosong.
   Semua file lain boleh memakai tipe di sini tanpa import,
   karena tsconfig memakai "module": "none" (satu scope global). */

/** Role dari respons API dummyjson. moderator diperlakukan sama dengan admin. */
type Role = "admin" | "moderator" | "user";

/** Tingkat prioritas tiket, sesuai soal. */
type Priority = "vip" | "disabilitas" | "lansia" | "normal";

/** Perjalanan hidup sebuah tiket. */
type TicketStatus = "menunggu" | "dipanggil" | "selesai" | "dilewati";

/** Satu jenis layanan, misal kode "A" nama "Poli Umum". */
interface QueueType {
  /** Satu huruf kapital, unik. */
  code: string;
  name: string;
  /** Jenis nonaktif tidak bisa dipilih saat ambil tiket baru. */
  active: boolean;
}

interface Ticket {
  id: string;
  /** Mengacu ke QueueType.code */
  code: string;
  /** Nomor urut dalam jenis antrian ini, mulai dari 1. */
  number: number;
  /** Bentuk siap tampil, misal "A-001". */
  label: string;
  priority: Priority;
  status: TicketStatus;
  createdAt: number;
  calledAt?: number;
  finishedAt?: number;
}

interface Session {
  token: string;
  role: Role;
  firstName: string;
  username: string;
}
