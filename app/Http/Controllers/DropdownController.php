<?php
namespace App\Http\Controllers;

use App\Models\Aplikasi;
use App\Models\Transaksi;
use Illuminate\Http\Request;

class DropdownController extends Controller
{
    public function getAplikasis($companyId)
    {
        try {
            // Cek apakah tabel aplikasi langsung punya kolom company_id atau tidak
            // Jika relasinya berbeda, sesuaikan kondisi di bawah ini:
            $aplikasis = Aplikasi::where('company_id', $companyId)->get();
            
            return response()->json([
                'aplikasis' => $aplikasis
            ]);
        } catch (\Exception $e) {
            // Jika kolom company_id tidak ada, kembalikan semua aplikasi atau kosongkan dulu agar tidak error 500
            $aplikasis = Aplikasi::all();
            return response()->json([
                'aplikasis' => $aplikasis
            ]);
        }
    }

    public function getTransaksis($aplikasiId)
    {
        try {
            $transaksis = Transaksi::where('aplikasi_id', $aplikasiId)->get();
            
            return response()->json([
                'transaksis' => $transaksis
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'transaksis' => []
            ]);
        }
    }
}