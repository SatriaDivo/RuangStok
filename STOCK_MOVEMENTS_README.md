# Sistem Mutasi Stok - Stock Movements

## Perubahan Besar

### Masalah Sebelumnya
- Mutasi Stok mencoba membaca dari `Receipts` (sheet untuk pembayaran) dan `SalesDetails`
- Pembelian di sistem ini **TIDAK per PCS** (per box/karton)
- Inventaris **per PCS**
- Tidak ada koneksi otomatis antara Pembelian dan Inventaris

### Solusi Baru
Dibuat sistem **Stock Movements** yang proper dengan sheet terpisah untuk logging:

## Sheet Baru: `StockMovements`

### Struktur Kolom:
| Kolom | Deskripsi |
|-------|-----------|
| Date | Tanggal pergerakan |
| Item ID | Kode barang |
| Item Name | Nama barang |
| Type | IN (masuk) atau OUT (keluar) |
| Qty | Jumlah |
| Reference | Referensi transaksi (SO ID, PO ID, MANUAL, ADJ) |
| Notes | Catatan |
| User | Email user yang melakukan |

## Automatic Logging

### 1. Barang MASUK (IN)
Otomatis tercatat saat:
- ✅ **Menambah barang baru** di Inventaris (stok awal)
  - Reference: `STOCK-IN`
  - Notes: "Stok awal - penambahan barang baru"

- ✅ **Menambah quantity** di Inventaris (edit barang, qty naik)
  - Reference: `ADJ`
  - Notes: "Penambahan stok manual"

### 2. Barang KELUAR (OUT)
Otomatis tercatat saat:
- ✅ **Penjualan** (Sales Order dibuat)
  - Reference: `SO ID` (misal: SO12345)
  - Notes: "Penjualan kepada: [Customer Name]"

- ✅ **Pengurangan quantity** di Inventaris (edit barang, qty turun)
  - Reference: `ADJ`
  - Notes: "Pengurangan stok manual (adjustment)"

## Cara Kerja

### 1. Tambah Barang Baru
```
User menambah barang di Inventaris
↓
System menyimpan ke sheet InventoryItems
↓
System auto-log ke StockMovements:
  - Type: IN
  - Qty: [jumlah stok awal]
  - Reference: STOCK-IN
```

### 2. Update Stok (Edit Barang)
```
User edit barang, ubah quantity dari 100 → 150
↓
System hitung selisih: +50
↓
System auto-log ke StockMovements:
  - Type: IN
  - Qty: 50
  - Reference: ADJ
```

### 3. Penjualan
```
User buat Sales Order, jual 20 unit
↓
System kurangi stok di InventoryItems
↓
System auto-log ke StockMovements:
  - Type: OUT
  - Qty: 20
  - Reference: [SO ID]
```

## File yang Diubah

### 1. `gsstockmovements.gs` (BARU)
Fungsi utama:
- `logStockMovement()` - Log pergerakan stok
- `smGetAllMovements()` - Ambil semua data dengan filter
- `smAddStockManually()` - Tambah stok manual (future feature)

### 2. `gsmutations.gs` (DISEDERHANAKAN)
- Sekarang hanya wrapper yang call `smGetAllMovements()`
- Tidak lagi baca dari PurchaseDetails/SalesDetails
- Semua baca dari StockMovements sheet

### 3. `gsinventory.gs` (MODIFIED)
Hook di:
- `addNewItem()` - Auto-log saat tambah barang baru
- `updateItem()` - Auto-log saat qty berubah (compare old vs new)

### 4. `gssales.gs` (MODIFIED)
Hook di:
- Loop `payload.details.forEach()` - Auto-log setiap item yang terjual

## Testing

### 1. Test Tambah Barang Baru
1. Buka menu **Inventaris**
2. Klik **Tambah Barang**
3. Isi form, qty = 100
4. Simpan
5. Buka **Mutasi Stok** → harus ada 1 entry:
   - Type: IN
   - Qty: 100
   - Reference: STOCK-IN

### 2. Test Edit Quantity
1. Edit barang yang ada
2. Ubah qty dari 100 → 150
3. Simpan
4. Buka **Mutasi Stok** → harus ada 1 entry baru:
   - Type: IN
   - Qty: 50
   - Reference: ADJ

### 3. Test Penjualan
1. Buat Sales Order baru
2. Jual 20 unit
3. Buka **Mutasi Stok** → harus ada 1 entry baru:
   - Type: OUT
   - Qty: 20
   - Reference: [SO ID]

## Deploy Steps

1. ✅ Push ke GitHub
2. ✅ Push ke Apps Script dengan `clasp push`
3. ⏳ **PENTING:** Deploy baru di Apps Script:
   - Buka Apps Script Editor
   - Deploy → Manage Deployments
   - Edit active deployment
   - New version
   - Deploy

4. Test aplikasi:
   - Tambah barang baru
   - Cek Mutasi Stok
   - Harus muncul data!

## Keuntungan Sistem Baru

✅ **Accurate Tracking** - Semua pergerakan stok tercatat
✅ **Audit Trail** - Tahu siapa yang mengubah apa
✅ **Flexible** - Bisa manual adjustment
✅ **Separated Concerns** - Pembelian terpisah dari inventaris
✅ **Real-time** - Auto-update setiap ada perubahan
✅ **Filter Ready** - Bisa filter by date, item, type

## Notes

- Sheet `StockMovements` akan auto-create saat pertama kali ada logging
- Jika sheet sudah ada, sistem akan append data baru
- Semua error logging di-catch, tidak akan block operasi utama
- User email tercatat untuk audit
