package com.groxy.app;

import android.content.Context;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import android.net.Uri;
import androidx.core.content.FileProvider;

@CapacitorPlugin(name = "PdfStorage")
public class PdfStoragePlugin extends Plugin {

    private static final String PDFS_DIR = "Groxy/pdfs";

    @PluginMethod
    public void savePdf(PluginCall call) {
        android.util.Log.d("PdfStoragePlugin", "savePdf called");
        String filename = call.getString("filename");
        String base64Data = call.getString("data");

        android.util.Log.d("PdfStoragePlugin", "Filename: " + filename + ", data length: " + (base64Data != null ? base64Data.length() : 0));

        if (filename == null || base64Data == null) {
            android.util.Log.e("PdfStoragePlugin", "Filename or data is null");
            call.reject("Filename and data are required");
            return;
        }

        try {
            Context context = getContext();
            android.util.Log.d("PdfStoragePlugin", "Context obtained");
            File dataDir = context.getFilesDir(); // Внутреннее хранилище приложения
            File pdfsDir = new File(dataDir, PDFS_DIR);
            
            android.util.Log.d("PdfStoragePlugin", "PDFs directory: " + pdfsDir.getAbsolutePath());
            
            // Создаём директорию, если её нет
            if (!pdfsDir.exists()) {
                boolean created = pdfsDir.mkdirs();
                android.util.Log.d("PdfStoragePlugin", "Directory created: " + created);
            }

            // Создаём файл
            File pdfFile = new File(pdfsDir, filename);
            android.util.Log.d("PdfStoragePlugin", "PDF file: " + pdfFile.getAbsolutePath());
            
            // Декодируем base64 данные
            android.util.Log.d("PdfStoragePlugin", "Decoding base64 data...");
            byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
            android.util.Log.d("PdfStoragePlugin", "Decoded " + pdfBytes.length + " bytes");
            
            // Сохраняем файл
            android.util.Log.d("PdfStoragePlugin", "Writing file...");
            FileOutputStream fos = new FileOutputStream(pdfFile);
            fos.write(pdfBytes);
            fos.close();
            android.util.Log.d("PdfStoragePlugin", "File written successfully");

            // Получаем URI файла через FileProvider
            Uri fileUri = null;
            try {
                fileUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    pdfFile
                );
                android.util.Log.d("PdfStoragePlugin", "FileProvider URI: " + fileUri.toString());
            } catch (Exception e) {
                android.util.Log.w("PdfStoragePlugin", "FileProvider failed: " + e.getMessage());
                // Если FileProvider не работает, используем file:// URI
                fileUri = Uri.fromFile(pdfFile);
                android.util.Log.d("PdfStoragePlugin", "Using file:// URI: " + fileUri.toString());
            }

            JSObject result = new JSObject();
            result.put("uri", fileUri != null ? fileUri.toString() : pdfFile.getAbsolutePath());
            result.put("path", pdfFile.getAbsolutePath());
            android.util.Log.d("PdfStoragePlugin", "Resolving with result: " + result.toString());
            call.resolve(result);
        } catch (IOException e) {
            android.util.Log.e("PdfStoragePlugin", "IOException: " + e.getMessage(), e);
            call.reject("Failed to save PDF: " + e.getMessage());
        } catch (Exception e) {
            android.util.Log.e("PdfStoragePlugin", "Exception: " + e.getMessage(), e);
            call.reject("Error: " + e.getMessage());
        }
    }
}

