package com.groxy.app;

import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import android.net.Uri;
import androidx.core.content.FileProvider;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String PDFS_DIR = "Groxy/pdfs";
    private static final String PROJECTS_DIR = "Groxy/projects";
    private static final String TAG = "MainActivity";

    @Override
    public void onStart() {
        super.onStart();
        // Добавляем JavaScript интерфейс для работы с файлами
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new NativeStorageInterface(), "NativeStorage");
            Log.d(TAG, "NativeStorage JavaScript interface added");
        }
    }

    public class NativeStorageInterface {
        private volatile boolean allowProjectSave = false;

        @JavascriptInterface
        public void setAllowProjectSave(boolean allow) {
            allowProjectSave = allow;
            Log.d(TAG, "setAllowProjectSave: " + allow);
        }

        @JavascriptInterface
        public String savePdf(String filename, String base64Data) {
            Log.d(TAG, "savePdf called with filename: " + filename + ", data length: " + (base64Data != null ? base64Data.length() : 0));
            
            try {
                File dataDir = getFilesDir();
                File pdfsDir = new File(dataDir, PDFS_DIR);
                
                if (!pdfsDir.exists()) {
                    boolean created = pdfsDir.mkdirs();
                    Log.d(TAG, "Directory created: " + created);
                }

                File pdfFile = new File(pdfsDir, filename);
                Log.d(TAG, "PDF file: " + pdfFile.getAbsolutePath());
                
                byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
                Log.d(TAG, "Decoded " + pdfBytes.length + " bytes");
                
                FileOutputStream fos = new FileOutputStream(pdfFile);
                fos.write(pdfBytes);
                fos.close();
                Log.d(TAG, "File written successfully");

                Uri fileUri = null;
                try {
                    fileUri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider",
                        pdfFile
                    );
                    Log.d(TAG, "FileProvider URI: " + fileUri.toString());
                } catch (Exception e) {
                    Log.w(TAG, "FileProvider failed: " + e.getMessage());
                    fileUri = Uri.fromFile(pdfFile);
                    Log.d(TAG, "Using file:// URI: " + fileUri.toString());
                }

                JSONObject result = new JSONObject();
                result.put("uri", fileUri.toString());
                result.put("path", pdfFile.getAbsolutePath());
                Log.d(TAG, "Resolving with result: " + result.toString());
                return result.toString();
            } catch (Exception e) {
                Log.e(TAG, "Exception: " + e.getMessage(), e);
                try {
                    JSONObject error = new JSONObject();
                    error.put("error", "Failed to save PDF: " + e.getMessage());
                    return error.toString();
                } catch (Exception jsonError) {
                    return "{\"error\":\"Failed to save PDF: " + e.getMessage() + "\"}";
                }
            }
        }

        @JavascriptInterface
        public String saveProject(String projectJson) {
            Log.d(TAG, "saveProject called");
            try {
                if (!allowProjectSave) {
                    Log.w(TAG, "saveProject BLOCKED (allowProjectSave=false)");
                    return "{\"error\":\"saveProject blocked\"}";
                }
                JSONObject project = new JSONObject(projectJson);
                String projectId = project.getString("id");
                
                File dataDir = getFilesDir();
                File projectsDir = new File(dataDir, PROJECTS_DIR);
                
                if (!projectsDir.exists()) {
                    projectsDir.mkdirs();
                }

                File projectFile = new File(projectsDir, projectId + ".json");
                FileOutputStream fos = new FileOutputStream(projectFile);
                fos.write(projectJson.getBytes(StandardCharsets.UTF_8));
                fos.close();
                
                Log.d(TAG, "Project saved: " + projectFile.getAbsolutePath());
                return "{\"success\":true}";
            } catch (Exception e) {
                Log.e(TAG, "Error saving project: " + e.getMessage(), e);
                return "{\"error\":\"" + e.getMessage() + "\"}";
            }
        }

        @JavascriptInterface
        public String listProjects() {
            Log.d(TAG, "listProjects called");
            try {
                JSONArray projects = new JSONArray();
                File dataDir = getFilesDir();
                File projectsDir = new File(dataDir, PROJECTS_DIR);
                
                if (projectsDir.exists() && projectsDir.isDirectory()) {
                    File[] files = projectsDir.listFiles((dir, name) -> name.endsWith(".json"));
                    if (files != null) {
                        for (File file : files) {
                            try {
                                FileInputStream fis = new FileInputStream(file);
                                byte[] buffer = new byte[(int) file.length()];
                                fis.read(buffer);
                                fis.close();
                                
                                String content = new String(buffer, StandardCharsets.UTF_8);
                                JSONObject project = new JSONObject(content);
                                projects.put(project);
                            } catch (Exception e) {
                                Log.w(TAG, "Error reading project file: " + file.getName(), e);
                            }
                        }
                    }
                }
                
                Log.d(TAG, "Found " + projects.length() + " projects");
                return projects.toString();
            } catch (Exception e) {
                Log.e(TAG, "Error listing projects: " + e.getMessage(), e);
                return "[]";
            }
        }

        @JavascriptInterface
        public String deleteProject(String projectId) {
            Log.d(TAG, "deleteProject called with id: " + projectId);
            try {
                File dataDir = getFilesDir();
                File projectFile = new File(dataDir, PROJECTS_DIR + "/" + projectId + ".json");
                if (projectFile.exists()) {
                    boolean deleted = projectFile.delete();
                    Log.d(TAG, "Project deleted: " + deleted);
                    return "{\"success\":" + deleted + "}";
                }
                return "{\"success\":false}";
            } catch (Exception e) {
                Log.e(TAG, "Error deleting project: " + e.getMessage(), e);
                return "{\"error\":\"" + e.getMessage() + "\"}";
            }
        }

        @JavascriptInterface
        public String getPdfUri(String filename) {
            Log.d(TAG, "getPdfUri called with filename: " + filename);
            try {
                File dataDir = getFilesDir();
                File pdfFile = new File(dataDir, PDFS_DIR + "/" + filename);
                
                if (!pdfFile.exists()) {
                    return "{\"error\":\"File not found\"}";
                }
                
                Uri fileUri = null;
                try {
                    fileUri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider",
                        pdfFile
                    );
                } catch (Exception e) {
                    fileUri = Uri.fromFile(pdfFile);
                }
                
                JSONObject result = new JSONObject();
                result.put("uri", fileUri.toString());
                result.put("path", pdfFile.getAbsolutePath());
                return result.toString();
            } catch (Exception e) {
                Log.e(TAG, "Error getting PDF URI: " + e.getMessage(), e);
                return "{\"error\":\"" + e.getMessage() + "\"}";
            }
        }

        @JavascriptInterface
        public String getPdfBase64(String filename) {
            Log.d(TAG, "getPdfBase64 called with filename: " + filename);
            try {
                File dataDir = getFilesDir();
                File pdfFile = new File(dataDir, PDFS_DIR + "/" + filename);
                
                if (!pdfFile.exists()) {
                    return "{\"error\":\"File not found\"}";
                }
                
                FileInputStream fis = new FileInputStream(pdfFile);
                byte[] buffer = new byte[(int) pdfFile.length()];
                fis.read(buffer);
                fis.close();
                
                String base64 = Base64.encodeToString(buffer, Base64.NO_WRAP);
                Log.d(TAG, "PDF converted to base64, length: " + base64.length());
                
                return base64;
            } catch (Exception e) {
                Log.e(TAG, "Error getting PDF base64: " + e.getMessage(), e);
                return "{\"error\":\"" + e.getMessage() + "\"}";
            }
        }
    }
}
