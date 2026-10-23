<?php

namespace App\Services;

class SimpleZipArchive
{
    private array $files = [];

    public function addFromString(string $filename, string $data): void
    {
        $this->files[$filename] = $data;
    }

    public function getZipData(): string
    {
        $zipData = '';
        $centralDir = '';
        $offset = 0;

        foreach ($this->files as $name => $content) {
            $uncompressedSize = strlen($content);
            $crc = crc32($content);
            $compressed = gzdeflate($content);
            $compressedSize = strlen($compressed);

            // Local file header (30 bytes + name)
            $header = pack(
                'VvvvvvVVVvv',
                0x04034b50, // signature (V)
                20,         // version needed (v)
                0,          // general purpose bit flag (v)
                8,          // compression method (v)
                0,          // last mod file time (v)
                0,          // last mod file date (v)
                $crc,       // crc-32 (V)
                $compressedSize,   // (V)
                $uncompressedSize, // (V)
                strlen($name),     // (v)
                0           // extra field length (v)
            );

            $zipData .= $header . $name . $compressed;

            // Central directory entry (46 bytes + name)
            $cdEntry = pack(
                'VvvvvvvVVVvvvvvVV',
                0x02014b50, // signature (V)
                20,         // version made by (v)
                20,         // version needed (v)
                0,          // bit flag (v)
                8,          // compression method (v)
                0,          // mod time (v)
                0,          // mod date (v)
                $crc,       // (V)
                $compressedSize,   // (V)
                $uncompressedSize, // (V)
                strlen($name),     // (v)
                0,          // extra field length (v)
                0,          // file comment length (v)
                0,          // disk number start (v)
                0,          // internal file attributes (v)
                0,          // external file attributes (V)
                $offset     // relative offset of local header (V)
            );

            $centralDir .= $cdEntry . $name;
            $offset = strlen($zipData);
        }

        $centralDirOffset = strlen($zipData);
        $centralDirSize = strlen($centralDir);

        // End of central directory record (22 bytes)
        $eocd = pack(
            'VvvvvVVv',
            0x06054b50, // signature (V)
            0,          // number of this disk (v)
            0,          // disk where central directory starts (v)
            count($this->files), // number of central directory records on this disk (v)
            count($this->files), // total number of central directory records (v)
            $centralDirSize,     // (V)
            $centralDirOffset,   // (V)
            0           // comment length (v)
        );

        return $zipData . $centralDir . $eocd;
    }
}
