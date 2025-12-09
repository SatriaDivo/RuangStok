# 📘 GUIDE BOOK APLIKASI RUANG STOK

## Panduan Lengkap Penggunaan Sistem Manajemen Inventory

**Versi:** 2.1  
**Tanggal:** Desember 2025  
**Update Terakhir:** Responsive Design & UI Improvements

---

## DAFTAR ISI

1. [Fitur Terbaru v2.1](#fitur-terbaru-v21)
2. [Login](#1-login)
3. [Dashboard](#2-dashboard)
4. [Menu Inventaris](#3-menu-inventaris)
5. [Menu Pemasok](#4-menu-pemasok)
6. [Menu Pelanggan](#5-menu-pelanggan)
7. [Menu Pembelian](#6-menu-pembelian)
8. [Menu Penjualan](#7-menu-penjualan)
9. [Menu Penerimaan](#8-menu-penerimaan)
10. [Menu Pembayaran](#9-menu-pembayaran)
11. [Menu Laporan](#10-menu-laporan)
12. [Menu Pengguna](#11-menu-pengguna)
13. [Menu Pengaturan](#12-menu-pengaturan)

---

## FITUR TERBARU v2.1

### 🎨 Responsive Design
Aplikasi sekarang **fully responsive** dan dapat digunakan dengan nyaman di:
- **Desktop** (1024px ke atas)
- **Tablet** (768px - 1024px)  
- **Mobile/HP** (di bawah 768px)

### 📱 Sidebar Toggle
- **Desktop:** Sidebar dapat di-collapse menjadi icon-only (60px) dengan tombol toggle
- **Tablet:** Sidebar menyesuaikan ukuran (220px)
- **Mobile:** Sidebar tersembunyi, muncul dengan tombol hamburger menu di top bar
- Logo disembunyikan saat sidebar collapsed, muncul kembali saat expanded
- State sidebar tersimpan di localStorage

### ✅ Validasi Duplikat
Sistem mencegah input data duplikat saat tombol Add/Simpan diklik berkali-kali:
- Customer ID
- Supplier ID
- Sales Order (SO) ID
- Purchase Order (PO) ID

### 📊 Laporan Enhanced
- **Filter "Semua Data"** - Melihat semua data tanpa filter periode
- **Stok Awal & Stok Sisa** - Ditampilkan di Rekap Penjualan dan Rekap Inventory
- **Daftar Sisa Stok** - Tabel lengkap stok per item di Rekap Inventory

### 🔧 Perbaikan UI/UX
- Form input menggunakan text input manual untuk Provinsi/Kota (bukan dropdown)
- Satuan Barang menggantikan label "Harga Satuan" di beberapa tempat
- Total Harga dapat diinput manual
- Responsive tables dengan horizontal scroll di mobile
- Touch-friendly buttons dan form elements

---

## 1. LOGIN

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Halaman Login adalah pintu masuk utama ke aplikasi Ruang Stok. Pengguna harus memasukkan kredensial yang valid untuk mengakses sistem.

#### Elemen pada Halaman

| Elemen | Deskripsi |
|--------|-----------|
| **Logo** | Logo aplikasi Ruang Stok di bagian atas |
| **Field Email/Username** | Input untuk memasukkan email atau nama pengguna |
| **Field Password** | Input untuk memasukkan kata sandi (dengan toggle visibility) |
| **Tombol Tampilkan Password** | Ikon mata untuk melihat/menyembunyikan password |
| **Tombol Login** | Tombol untuk masuk ke sistem |
| **Link Lupa Password** | Untuk Admin yang lupa password (reset via email) |

#### Alur Penggunaan

1. Buka URL aplikasi Ruang Stok
2. Masukkan **Email** atau **Username** pada field pertama
3. Masukkan **Password** pada field kedua
4. Klik ikon 👁️ jika ingin melihat password yang diketik
5. Klik tombol **Login**
6. Jika berhasil, akan diarahkan ke Dashboard
7. Jika gagal, akan muncul pesan error

#### Fitur Reset Password (Khusus Admin)

1. Klik link **"Lupa Password?"**
2. Masukkan email Admin yang terdaftar
3. Klik **"Kirim Password Baru"**
4. Cek email untuk menerima password baru
5. Login dengan password baru tersebut

#### Catatan Penting
- Default akun Admin: `stockruang@gmail.com` dengan password `admin123`
- Password baru setelah reset: `ruangstok123`
- Setelah reset, segera ganti password di menu Pengaturan

---

## 2. DASHBOARD

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Dashboard adalah halaman utama yang menampilkan ringkasan data bisnis secara real-time, termasuk statistik penjualan, inventory, dan aktivitas terkini.

#### Elemen pada Halaman

| Elemen | Deskripsi |
|--------|-----------|
| **Header** | Menampilkan nama pengguna, role, dan tombol logout |
| **Sidebar** | Menu navigasi ke semua fitur aplikasi |
| **Kartu Statistik** | Ringkasan angka penting (Total Penjualan, Pembelian, dll) |
| **Grafik** | Visualisasi data penjualan dan inventory |
| **Aktivitas Terkini** | Log aktivitas terakhir dalam sistem |

#### Kartu Statistik yang Ditampilkan

1. **Total Penjualan** - Jumlah total nilai penjualan
2. **Total Pembelian** - Jumlah total nilai pembelian
3. **Total Produk** - Jumlah item inventory
4. **Stok Rendah** - Jumlah item dengan stok di bawah batas minimal
5. **Total Pelanggan** - Jumlah pelanggan terdaftar
6. **Total Pemasok** - Jumlah pemasok terdaftar

#### Sidebar Menu

| Menu | Fungsi | Icon |
|------|--------|------|
| 🏠 Dashboard | Kembali ke halaman utama | `fa-tachometer-alt` |
| 📦 Inventaris | Kelola stok barang | `fa-boxes` |
| 🚚 Pemasok | Kelola data pemasok | `fa-truck-loading` |
| 👥 Pelanggan | Kelola data pelanggan | `fa-user-friends` |
| 🛒 Pembelian | Kelola transaksi pembelian | `fa-file-invoice-dollar` |
| 💰 Penjualan | Kelola transaksi penjualan | `fa-chart-line` |
| 📥 Penerimaan | Kelola penerimaan barang | `fa-receipt` |
| 💳 Pembayaran | Kelola pembayaran hutang/piutang | `fa-credit-card` |
| 📊 Laporan | Lihat berbagai laporan | `fa-chart-pie` |
| 👤 Pengguna | Kelola akun pengguna (Admin only) | `fa-user-cog` |
| ⚙️ Pengaturan | Konfigurasi sistem | `fa-cogs` |
| 🚪 Keluar | Logout dari sistem | `fa-sign-out-alt` |

#### Fitur Sidebar Toggle (Baru v2.1)

| Mode | Perilaku |
|------|----------|
| **Desktop Expanded** | Sidebar 260px, menampilkan icon + text |
| **Desktop Collapsed** | Sidebar 60px, hanya icon (logo tersembunyi) |
| **Tablet** | Sidebar 220px, menyesuaikan konten |
| **Mobile** | Sidebar tersembunyi, buka dengan tombol ☰ di top bar |

**Cara Toggle Sidebar:**
1. **Desktop:** Klik tombol toggle (☰/✕) di header sidebar
2. **Mobile:** Klik tombol hamburger (☰) di top bar, klik overlay untuk menutup

#### Alur Penggunaan

1. Setelah login, Dashboard akan ditampilkan otomatis
2. Lihat ringkasan statistik di bagian atas
3. Scroll ke bawah untuk melihat grafik dan aktivitas
4. Klik menu di sidebar untuk mengakses fitur lain

---

## 3. MENU INVENTARIS

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Inventaris digunakan untuk mengelola semua data barang/produk termasuk stok, harga, dan kategori.

#### Tombol dan Menu

| Tombol | Fungsi |
|--------|--------|
| **+ Tambah Item Baru** | Membuka form untuk menambah barang baru |
| **Cari** | Mencari barang berdasarkan nama/ID |
| **Filter Kategori** | Memfilter barang berdasarkan kategori |
| **Edit (ikon pensil)** | Mengubah data barang |
| **Hapus (ikon tempat sampah)** | Menghapus barang |

#### Kolom Tabel Inventory

| Kolom | Deskripsi |
|-------|-----------|
| **Item ID** | Kode unik barang (auto-generated) |
| **Nama Barang** | Nama produk |
| **Kategori** | Kategori barang |
| **Jumlah** | Stok tersedia saat ini |
| **Satuan** | Unit pengukuran (pcs, kg, dll) |
| **Harga Beli** | Harga pembelian per unit |
| **Harga Jual** | Harga penjualan per unit |
| **Actions** | Tombol Edit dan Hapus |

#### Form Tambah/Edit Barang

| Field | Deskripsi | Wajib |
|-------|-----------|-------|
| **Nama Barang** | Nama produk | ✅ |
| **Kategori** | Pilih atau tambah kategori baru | ✅ |
| **Jumlah Awal** | Stok awal barang | ✅ |
| **Satuan** | Unit pengukuran | ✅ |
| **Harga Beli** | Harga beli per unit | ✅ |
| **Harga Jual** | Harga jual per unit | ✅ |
| **Deskripsi** | Keterangan tambahan | ❌ |

#### Alur Menambah Barang Baru

1. Klik tombol **"+ Tambah Item Baru"**
2. Isi semua field yang diperlukan
3. Klik tombol **"Simpan"**
4. Barang akan muncul di tabel
5. Notifikasi sukses akan ditampilkan

#### Alur Mengubah Data Barang

1. Cari barang yang ingin diubah
2. Klik ikon **Edit (pensil)** di kolom Actions
3. Ubah data yang diperlukan
4. Klik tombol **"Update"**
5. Data akan diperbarui

#### Alur Menghapus Barang

1. Cari barang yang ingin dihapus
2. Klik ikon **Hapus (tempat sampah)**
3. Konfirmasi penghapusan pada popup
4. Klik **"Hapus"** untuk mengkonfirmasi
5. Barang akan dihapus dari sistem

#### Catatan Penting
- Item dengan stok rendah (< 10) akan ditandai dengan warna kuning
- Item dengan stok habis (0) akan ditandai dengan warna merah
- ID Item dibuat otomatis dengan format: ITM001, ITM002, dst

---

## 4. MENU PEMASOK

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Pemasok digunakan untuk mengelola data supplier/pemasok barang, termasuk informasi kontak dan alamat.

#### Tombol dan Menu

| Tombol | Fungsi |
|--------|--------|
| **+ Tambah Pemasok Baru** | Membuka form tambah pemasok |
| **+ New State** | Menambah provinsi baru |
| **+ New City** | Menambah kota baru |
| **Cari** | Mencari pemasok |
| **Edit (ikon pensil)** | Mengubah data pemasok |
| **Hapus (ikon tempat sampah)** | Menghapus pemasok |

#### Kolom Tabel Pemasok

| Kolom | Deskripsi |
|-------|-----------|
| **Supplier ID** | Kode unik pemasok |
| **Supplier Name** | Nama pemasok/perusahaan |
| **Contact** | Nomor telepon |
| **Email** | Alamat email |
| **State** | Provinsi |
| **City** | Kota |
| **Address** | Alamat lengkap |
| **No Rek** | Nomor rekening bank |
| **Actions** | Tombol Edit dan Hapus |

#### Form Tambah/Edit Pemasok

| Field | Deskripsi | Wajib |
|-------|-----------|-------|
| **Nama Pemasok** | Nama supplier/perusahaan | ✅ |
| **Kontak** | Nomor telepon | ❌ |
| **Email** | Alamat email | ❌ |
| **Provinsi** | Input manual alamat provinsi | ❌ |
| **Kota** | Input manual alamat kota | ❌ |
| **Alamat** | Alamat lengkap | ❌ |
| **No Rekening** | Nomor rekening bank | ❌ |

#### Alur Menambah Pemasok

1. Klik tombol **"+ Tambah Pemasok Baru"**
2. Isi nama pemasok (wajib)
3. Lengkapi informasi lainnya (kontak, email, alamat)
4. Input provinsi dan kota secara manual
5. Klik tombol **"Simpan"**
6. Pemasok baru akan muncul di tabel

#### Catatan Penting
- Pemasok dengan saldo hutang tidak dapat dihapus
- Provinsi dan Kota diinput secara manual (text input)
- Sistem mencegah duplikat Supplier ID saat klik Simpan berkali-kali

---

## 5. MENU PELANGGAN

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Pelanggan digunakan untuk mengelola data customer/pelanggan termasuk informasi kontak dan riwayat transaksi.

#### Tombol dan Menu

| Tombol | Fungsi |
|--------|--------|
| **+ Tambah Pelanggan** | Membuka form tambah pelanggan |
| **Cari** | Mencari pelanggan |
| **Edit (ikon pensil)** | Mengubah data pelanggan |
| **Hapus (ikon tempat sampah)** | Menghapus pelanggan |

#### Kolom Tabel Pelanggan

| Kolom | Deskripsi |
|-------|-----------|
| **Customer ID** | Kode unik pelanggan |
| **Nama Pelanggan** | Nama customer |
| **Telepon** | Nomor telepon |
| **Email** | Alamat email |
| **Alamat** | Alamat lengkap |
| **Saldo Piutang** | Total piutang pelanggan |
| **Actions** | Tombol Edit dan Hapus |

#### Form Tambah/Edit Pelanggan

| Field | Deskripsi | Wajib |
|-------|-----------|-------|
| **Nama Pelanggan** | Nama customer | ✅ |
| **Telepon** | Nomor telepon | ❌ |
| **Email** | Alamat email | ❌ |
| **Alamat** | Alamat lengkap | ❌ |

#### Alur Menambah Pelanggan

1. Klik tombol **"+ Tambah Pelanggan"**
2. Isi nama pelanggan (wajib)
3. Lengkapi informasi kontak
4. Klik tombol **"Simpan"**
5. Pelanggan baru akan muncul di tabel

#### Catatan Penting
- Pelanggan dengan saldo piutang tidak dapat dihapus
- ID Pelanggan dibuat otomatis: CUST001, CUST002, dst
- Sistem mencegah duplikat Customer ID saat klik Simpan berkali-kali

---

## 6. MENU PEMBELIAN

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Pembelian digunakan untuk mencatat transaksi pembelian barang dari pemasok.

#### Tombol dan Menu

| Tombol | Fungsi |
|--------|--------|
| **+ Pembelian Baru** | Membuat transaksi pembelian baru |
| **Cari** | Mencari transaksi pembelian |
| **Filter Tanggal** | Memfilter berdasarkan periode |
| **Lihat Detail** | Melihat detail transaksi |
| **Edit** | Mengubah transaksi |
| **Hapus** | Menghapus transaksi |

#### Kolom Tabel Pembelian

| Kolom | Deskripsi |
|-------|-----------|
| **PO ID** | Nomor Purchase Order |
| **Tanggal** | Tanggal transaksi |
| **Pemasok** | Nama pemasok |
| **Total** | Total nilai pembelian |
| **Status** | Status pembayaran |
| **Actions** | Tombol aksi |

#### Form Pembelian Baru

| Field | Deskripsi | Wajib |
|-------|-----------|-------|
| **Tanggal** | Tanggal transaksi | ✅ |
| **Pemasok** | Pilih pemasok | ✅ |
| **Item** | Pilih barang yang dibeli | ✅ |
| **Jumlah** | Quantity pembelian | ✅ |
| **Harga Satuan** | Harga per unit | ✅ |
| **Diskon** | Potongan harga (opsional) | ❌ |

#### Alur Membuat Pembelian Baru

1. Klik tombol **"+ Pembelian Baru"**
2. Pilih tanggal transaksi
3. Pilih pemasok dari dropdown
4. Tambahkan item:
   - Pilih barang
   - Masukkan jumlah
   - Masukkan harga beli
5. Klik **"+ Tambah Item"** untuk menambah baris
6. Review total pembelian
7. Klik **"Simpan"**

#### Status Pembelian

| Status | Deskripsi |
|--------|-----------|
| **Pending** | Menunggu penerimaan barang |
| **Received** | Barang sudah diterima |
| **Paid** | Sudah dibayar lunas |
| **Partial** | Pembayaran sebagian |

#### Catatan Penting
- Pembelian yang sudah diterima tidak dapat dihapus
- Stok otomatis bertambah setelah status "Received"
- Sistem mencegah duplikat PO ID saat klik Simpan berkali-kali

---

## 7. MENU PENJUALAN

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Penjualan digunakan untuk mencatat transaksi penjualan barang kepada pelanggan.

#### Tombol dan Menu

| Tombol | Fungsi |
|--------|--------|
| **+ Penjualan Baru** | Membuat transaksi penjualan baru |
| **Cari** | Mencari transaksi penjualan |
| **Filter Tanggal** | Memfilter berdasarkan periode |
| **Lihat Detail** | Melihat detail transaksi |
| **Edit** | Mengubah transaksi |
| **Hapus** | Menghapus transaksi |

#### Kolom Tabel Penjualan

| Kolom | Deskripsi |
|-------|-----------|
| **SO ID** | Nomor Sales Order |
| **Tanggal** | Tanggal transaksi |
| **Pelanggan** | Nama pelanggan |
| **Total** | Total nilai penjualan |
| **Status** | Status pembayaran |
| **Actions** | Tombol aksi |

#### Form Penjualan Baru

| Field | Deskripsi | Wajib |
|-------|-----------|-------|
| **Tanggal** | Tanggal transaksi | ✅ |
| **Pelanggan** | Pilih pelanggan | ✅ |
| **Item** | Pilih barang yang dijual | ✅ |
| **Jumlah** | Quantity penjualan | ✅ |
| **Harga Satuan** | Harga jual per unit | ✅ |
| **Diskon** | Potongan harga (opsional) | ❌ |

#### Alur Membuat Penjualan Baru

1. Klik tombol **"+ Penjualan Baru"**
2. Pilih tanggal transaksi
3. Pilih pelanggan dari dropdown
4. Tambahkan item:
   - Pilih barang (akan menampilkan stok tersedia)
   - Masukkan jumlah (tidak boleh melebihi stok)
   - Harga jual otomatis terisi dari master
5. Klik **"+ Tambah Item"** untuk menambah baris
6. Review total penjualan
7. Klik **"Simpan"**

#### Status Penjualan

| Status | Deskripsi |
|--------|-----------|
| **Unpaid** | Belum dibayar |
| **Paid** | Sudah dibayar lunas |
| **Partial** | Pembayaran sebagian |

#### Catatan Penting
- Stok otomatis berkurang setelah penjualan disimpan
- Tidak dapat menjual melebihi stok tersedia
- Penjualan yang sudah dibayar tidak dapat dihapus
- Sistem mencegah duplikat SO ID saat klik Simpan berkali-kali

---

## 8. MENU PENERIMAAN

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Penerimaan digunakan untuk mencatat penerimaan barang dari pembelian yang sudah dibuat.

#### Tombol dan Menu

| Tombol | Fungsi |
|--------|--------|
| **+ Terima Barang** | Mencatat penerimaan baru |
| **Cari** | Mencari penerimaan |
| **Filter** | Memfilter data |
| **Lihat Detail** | Melihat detail penerimaan |

#### Kolom Tabel Penerimaan

| Kolom | Deskripsi |
|-------|-----------|
| **Receipt ID** | Nomor penerimaan |
| **PO ID** | Referensi Purchase Order |
| **Tanggal Terima** | Tanggal barang diterima |
| **Pemasok** | Nama pemasok |
| **Total Item** | Jumlah item diterima |
| **Status** | Status penerimaan |
| **Actions** | Tombol aksi |

#### Alur Menerima Barang

1. Klik tombol **"+ Terima Barang"**
2. Pilih PO yang akan diterima
3. Sistem akan menampilkan daftar item dari PO tersebut
4. Centang item yang diterima
5. Masukkan jumlah yang diterima (jika berbeda)
6. Klik **"Konfirmasi Penerimaan"**
7. Stok akan otomatis bertambah

#### Catatan Penting
- Hanya PO dengan status "Pending" yang dapat diterima
- Penerimaan parsial diperbolehkan (terima sebagian item)
- Setelah semua item diterima, status PO berubah menjadi "Received"

---

## 9. MENU PEMBAYARAN

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Pembayaran digunakan untuk mencatat pembayaran hutang (ke pemasok) dan penerimaan piutang (dari pelanggan).

#### Tab Pembayaran

| Tab | Fungsi |
|-----|--------|
| **Bayar Hutang** | Pembayaran ke pemasok |
| **Terima Piutang** | Penerimaan dari pelanggan |

#### Kolom Tabel Pembayaran Hutang

| Kolom | Deskripsi |
|-------|-----------|
| **Payment ID** | Nomor pembayaran |
| **PO ID** | Referensi Purchase Order |
| **Tanggal** | Tanggal pembayaran |
| **Pemasok** | Nama pemasok |
| **Jumlah** | Nominal pembayaran |
| **Metode** | Metode pembayaran |

#### Kolom Tabel Terima Piutang

| Kolom | Deskripsi |
|-------|-----------|
| **Receipt ID** | Nomor penerimaan |
| **SO ID** | Referensi Sales Order |
| **Tanggal** | Tanggal penerimaan |
| **Pelanggan** | Nama pelanggan |
| **Jumlah** | Nominal penerimaan |
| **Metode** | Metode pembayaran |

#### Alur Membayar Hutang

1. Klik tab **"Bayar Hutang"**
2. Klik tombol **"+ Bayar Hutang"**
3. Pilih pemasok
4. Sistem menampilkan daftar PO yang belum lunas
5. Pilih PO yang akan dibayar
6. Masukkan jumlah pembayaran
7. Pilih metode pembayaran (Transfer/Cash)
8. Klik **"Bayar"**

#### Alur Menerima Piutang

1. Klik tab **"Terima Piutang"**
2. Klik tombol **"+ Terima Piutang"**
3. Pilih pelanggan
4. Sistem menampilkan daftar SO yang belum lunas
5. Pilih SO yang akan diterima pembayarannya
6. Masukkan jumlah penerimaan
7. Pilih metode pembayaran
8. Klik **"Terima"**

#### Metode Pembayaran

- **Cash** - Pembayaran tunai
- **Transfer Bank** - Transfer antar bank
- **E-Wallet** - Pembayaran digital

---

## 10. MENU LAPORAN

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Laporan menyediakan berbagai laporan untuk analisis bisnis dan pengambilan keputusan.

#### Jenis Laporan yang Tersedia

| Laporan | Deskripsi |
|---------|-----------|
| **Rekap Penjualan** | Analisis data penjualan, tren bulanan, performa produk terbaik, **Stok Awal & Stok Sisa** |
| **Rekap Inventory** | Pantau stok barang, stok rendah, **Daftar Sisa Stok lengkap**, nilai inventory |
| **Rekap Keuangan** | Ringkasan pendapatan, pengeluaran, laba rugi, dan analisis profitabilitas |

#### Pilihan Periode Filter

| Periode | Deskripsi |
|---------|-----------|
| **Semua Data** | Menampilkan seluruh data tanpa filter tanggal **(Baru v2.1)** |
| **Minggu Ini** | Data dari hari Senin hingga hari ini |
| **Bulan Ini** | Data dari tanggal 1 hingga hari ini |
| **Custom** | Pilih rentang tanggal sesuai kebutuhan |

#### Laporan Rekap Penjualan

**Ringkasan yang ditampilkan:**
- Total Penjualan (Rupiah)
- Total Order
- Item Terjual (unit)
- Rata-rata Order
- **Stok Awal** - Total stok di awal periode **(Baru v2.1)**
- **Stok Sisa** - Total stok tersisa saat ini **(Baru v2.1)**

**Top 10 Item Terlaris:**
- ID Item dan Nama
- Kategori
- Jumlah Terjual
- Revenue
- Stok Awal dan Stok Sisa per item

**Detail Transaksi:**
- Tanggal, ID Pesanan, Item, Qty, Harga, Total, Pelanggan

#### Laporan Rekap Inventory

**Ringkasan yang ditampilkan:**
- Total Item (jumlah jenis barang)
- Total Stok (jumlah unit keseluruhan)
- Total Nilai Inventory (dalam Rupiah)
- Stok Rendah (item dengan stok < 10)
- **Stok Awal** - Total stok sebelum penjualan **(Baru v2.1)**
- **Terjual** - Total unit terjual dalam periode **(Baru v2.1)**
- **Stok Sisa** - Total stok tersisa **(Baru v2.1)**

**Daftar yang ditampilkan:**
- Item Stok Rendah (warning kuning/merah)
- Item Stok Terbanyak
- **Daftar Sisa Stok** - Tabel lengkap semua item dengan kolom: **(Baru v2.1)**
  - Kode Barang
  - Nama Barang
  - Kategori
  - Sisa Stok
  - Harga Satuan
  - Total Nilai

#### Laporan Rekap Keuangan

**Ringkasan yang ditampilkan:**
- Total Pendapatan (dari penjualan)
- Total Pengeluaran (dari pembelian)
- Laba/Rugi Bersih
- Margin Keuntungan (%)

**Analisis yang ditampilkan:**
- Grafik pendapatan vs pengeluaran
- Tren laba rugi per periode

#### Alur Membuat Laporan

1. Pilih jenis laporan yang diinginkan (Rekap Penjualan / Rekap Inventory / Rekap Keuangan)
2. Pilih periode: **Semua Data**, **Minggu Ini**, **Bulan Ini**, atau **Custom**
3. Jika Custom, masukkan tanggal mulai dan selesai
4. Klik tombol **"Generate Laporan"**
5. Laporan akan ditampilkan dalam popup modal
6. Gunakan tombol export jika tersedia

#### Tips Penggunaan Laporan (v2.1)
- Gunakan **"Semua Data"** untuk melihat keseluruhan data historis
- Perhatikan **Stok Awal vs Stok Sisa** untuk analisis pergerakan inventory
- **Daftar Sisa Stok** di Rekap Inventory berguna untuk stock opname

---

## 11. MENU PENGGUNA

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Pengguna digunakan untuk mengelola akun pengguna sistem. **Hanya dapat diakses oleh Admin.**

#### Tombol dan Menu

| Tombol | Fungsi |
|--------|--------|
| **+ Tambah Pengguna** | Membuat akun pengguna baru |
| **Edit (ikon pensil)** | Mengubah data pengguna |
| **Reset Password** | Mereset password ke default |
| **Hapus (ikon tempat sampah)** | Menghapus akun pengguna |

#### Kolom Tabel Pengguna

| Kolom | Deskripsi |
|-------|-----------|
| **ID** | ID pengguna |
| **Nama** | Nama lengkap |
| **Email** | Alamat email (untuk login) |
| **Peran** | Role (Admin/Staff) |
| **Status** | Aktif/Nonaktif |
| **Dibuat** | Tanggal pembuatan akun |
| **Terakhir Login** | Waktu login terakhir |
| **Actions** | Tombol aksi |

#### Form Tambah/Edit Pengguna

| Field | Deskripsi | Wajib |
|-------|-----------|-------|
| **Nama** | Nama lengkap pengguna | ✅ |
| **Email** | Email untuk login (harus unik) | ✅ |
| **Password** | Kata sandi (min. 6 karakter) | ✅ (tambah), ❌ (edit) |
| **Peran** | Admin atau Staff | ✅ |
| **Status** | Aktif atau Nonaktif | ✅ |

#### Perbedaan Role

| Fitur | Admin | Staff |
|-------|-------|-------|
| Dashboard | ✅ | ✅ |
| Inventaris | ✅ | ✅ |
| Pemasok | ✅ | ✅ |
| Pelanggan | ✅ | ✅ |
| Pembelian | ✅ | ✅ |
| Penjualan | ✅ | ✅ |
| Penerimaan | ✅ | ✅ |
| Pembayaran | ✅ | ✅ |
| Laporan | ✅ | ✅ |
| **Pengguna** | ✅ | ❌ |
| Pengaturan | ✅ | Terbatas |

#### Alur Menambah Pengguna

1. Klik tombol **"+ Tambah Pengguna"**
2. Isi nama lengkap
3. Isi email (harus unik, belum pernah digunakan)
4. Isi password (minimal 6 karakter)
5. Pilih peran (Admin/Staff)
6. Pilih status (Aktif/Nonaktif)
7. Klik **"Simpan"**

#### Alur Reset Password

1. Cari pengguna yang akan direset
2. Klik ikon **Reset Password** (kunci)
3. Konfirmasi pada popup
4. Password akan direset ke: `ruangstok123`
5. Informasikan password baru ke pengguna

#### Validasi

- **Nama** harus unik (tidak boleh sama dengan pengguna lain)
- **Email** harus unik (tidak boleh sama dengan pengguna lain)
- Email Admin default tidak dapat dihapus

---

## 12. MENU PENGATURAN

### Screenshot Tampilan
[TEMPATKAN SS DI SINI]

### Penjelasan

#### Fungsi Halaman
Menu Pengaturan digunakan untuk mengkonfigurasi parameter sistem dan preferensi pengguna.

#### Tab Pengaturan

| Tab | Deskripsi |
|-----|-----------|
| **Profil** | Pengaturan profil pengguna |
| **Perusahaan** | Informasi perusahaan |
| **Sistem** | Konfigurasi sistem |

#### Pengaturan Profil

| Field | Deskripsi |
|-------|-----------|
| **Nama** | Nama lengkap pengguna |
| **Email** | Email login (tidak dapat diubah) |
| **Password Lama** | Untuk verifikasi ganti password |
| **Password Baru** | Password pengganti |
| **Konfirmasi Password** | Ulangi password baru |

#### Pengaturan Perusahaan

| Field | Deskripsi |
|-------|-----------|
| **Nama Perusahaan** | Nama bisnis/toko |
| **Alamat** | Alamat perusahaan |
| **Telepon** | Nomor telepon |
| **Email** | Email perusahaan |
| **Logo** | Logo perusahaan |

#### Pengaturan Sistem

| Field | Deskripsi |
|-------|-----------|
| **Batas Stok Rendah** | Batas minimum stok untuk peringatan |
| **Format Tanggal** | Format tampilan tanggal |
| **Mata Uang** | Mata uang yang digunakan |
| **Zona Waktu** | Zona waktu sistem |

#### Alur Mengubah Password

1. Buka tab **"Profil"**
2. Masukkan **Password Lama**
3. Masukkan **Password Baru**
4. Masukkan **Konfirmasi Password**
5. Klik **"Simpan Perubahan"**
6. Login ulang dengan password baru

---

## CATATAN PENTING

### Backup Data
- Data disimpan di Google Sheets yang terhubung dengan aplikasi
- Lakukan backup manual secara berkala dengan mengunduh spreadsheet

### Keamanan
- Ganti password default segera setelah login pertama
- Jangan bagikan kredensial login
- Logout setelah selesai menggunakan aplikasi

### Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Tidak bisa login | Periksa email/password, atau gunakan fitur reset password |
| Data tidak muncul | Refresh halaman, periksa koneksi internet |
| Error saat simpan | Pastikan semua field wajib terisi |
| Halaman blank | Clear cache browser, login ulang |
| Sidebar tidak muncul (mobile) | Klik tombol hamburger (☰) di top bar |
| Tombol tidak responsif | Pastikan tidak ada modal yang terbuka, refresh halaman |
| Laporan kosong | Coba pilih periode "Semua Data" untuk melihat data lengkap |

### Kompatibilitas Browser

| Browser | Status |
|---------|--------|
| Google Chrome | ✅ Recommended |
| Mozilla Firefox | ✅ Supported |
| Microsoft Edge | ✅ Supported |
| Safari | ✅ Supported |
| Mobile Chrome | ✅ Supported |
| Mobile Safari | ✅ Supported |

### Resolusi Layar yang Didukung

| Perangkat | Resolusi | Status |
|-----------|----------|--------|
| Desktop | 1920x1080 ke atas | ✅ Optimal |
| Laptop | 1366x768 - 1920x1080 | ✅ Optimal |
| Tablet | 768x1024 - 1024x1366 | ✅ Optimal |
| Mobile | 320x568 - 414x896 | ✅ Optimal |

### Kontak Support
Jika mengalami kendala, hubungi administrator sistem.

---

## CHANGELOG

### v2.1 (Desember 2025)
- ✨ **Responsive Design** - Aplikasi sekarang mendukung semua ukuran layar (mobile, tablet, desktop)
- ✨ **Sidebar Toggle** - Sidebar dapat di-collapse di desktop, hidden di mobile
- ✨ **Mobile Menu Button** - Tombol hamburger di top bar untuk akses sidebar di mobile
- ✨ **Filter "Semua Data"** - Opsi baru di semua laporan untuk melihat data lengkap
- ✨ **Stok Awal & Stok Sisa** - Metrik baru di Rekap Penjualan dan Inventory
- ✨ **Daftar Sisa Stok** - Tabel lengkap stok di Rekap Inventory
- ✨ **Validasi Duplikat** - Mencegah input duplikat saat klik tombol berkali-kali
- 🔧 **Manual Input Provinsi/Kota** - Mengganti dropdown dengan text input
- 🔧 **Improved Touch Events** - Overlay click dan touch support untuk mobile
- 🔧 **Optimized Top Bar** - Simplified icons di mobile untuk menghemat ruang

### v2.0 (Desember 2025)
- Initial release dengan fitur lengkap inventory management
- User management dengan role Admin dan Staff
- Dashboard dengan statistik real-time
- Laporan Penjualan, Inventory, dan Keuangan

---

**© 2025 Ruang Stok - Sistem Manajemen Inventory**  
**Developed with ❤️ using Google Apps Script**
