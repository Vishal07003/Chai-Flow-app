package com.chaiapp

import android.content.ClipData
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintDocumentInfo
import android.util.Log
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream

class NativePdfModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NativePdfModule"
        private const val MIME_PDF = "application/pdf"
        private const val MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }

    override fun getName(): String = "NativePdfModule"

    @ReactMethod
    fun saveToPublicDownloads(sourceFilePath: String, rawFilename: String, promise: Promise) {
        try {
            val sourceFile = File(sourceFilePath)
            if (!sourceFile.exists() || sourceFile.length() == 0L) {
                promise.reject("INVALID_FILE", "Source file does not exist or is empty: $sourceFilePath")
                return
            }

            // Sanitize filename to prevent duplicate/concatenated extensions
            var filename = rawFilename
            if (filename.contains(".xlsx", ignoreCase = true) && filename.endsWith(".pdf", ignoreCase = true)) {
                filename = filename.replace(Regex("(?i)\\.xlsx\\.pdf$"), ".xlsx")
            }

            var finalDestination = ""
            val mimeType = when {
                filename.endsWith(".xlsx", ignoreCase = true) -> MIME_XLSX
                filename.endsWith(".xls", ignoreCase = true) -> "application/vnd.ms-excel"
                filename.endsWith(".pdf", ignoreCase = true) -> MIME_PDF
                else -> "*/*"
            }

            Log.d(TAG, "saveToPublicDownloads: filename=$filename, mimeType=$mimeType, sourceSize=${sourceFile.length()}")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Scoped Storage: Insert into MediaStore.Downloads
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }

                val resolver = reactContext.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    ?: throw Exception("Failed to create MediaStore download record.")

                resolver.openOutputStream(uri)?.use { outStream ->
                    FileInputStream(sourceFile).use { inStream ->
                        inStream.copyTo(outStream)
                    }
                }

                contentValues.clear()
                contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(uri, contentValues, null, null)

                finalDestination = "Downloads/$filename"
            } else {
                // Legacy storage (Android 9 and below)
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs()
                }
                val destFile = File(downloadsDir, filename)
                FileInputStream(sourceFile).use { inStream ->
                    FileOutputStream(destFile).use { outStream ->
                        inStream.copyTo(outStream)
                    }
                }
                finalDestination = destFile.absolutePath
            }

            Log.d(TAG, "saveToPublicDownloads completed: destination=$finalDestination")
            promise.resolve(finalDestination)
        } catch (e: Exception) {
            Log.e(TAG, "saveToPublicDownloads failed", e)
            promise.reject("SAVE_FAILED", "Failed saving to public Downloads: ${e.localizedMessage}", e)
        }
    }

    @ReactMethod
    fun viewPdf(filePath: String, title: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists() || file.length() == 0L) {
                promise.reject("FILE_NOT_FOUND", "The specified PDF file does not exist or is empty: $filePath")
                return
            }

            val authority = "${reactContext.packageName}.provider"
            val uri: Uri = FileProvider.getUriForFile(reactContext, authority, file)

            val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, MIME_PDF)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(viewIntent, title).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            // Grant read URI permission to target apps resolving this intent
            val resInfoList = reactContext.packageManager.queryIntentActivities(chooser, PackageManager.MATCH_DEFAULT_ONLY)
            for (resolveInfo in resInfoList) {
                val packageName = resolveInfo.activityInfo.packageName
                reactContext.grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "viewPdf failed", e)
            promise.reject("VIEW_ERROR", "Failed to open PDF viewer: ${e.localizedMessage}", e)
        }
    }

    @ReactMethod
    fun sharePdf(filePath: String, title: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists() || file.length() == 0L) {
                promise.reject("FILE_NOT_FOUND", "The specified PDF file does not exist: $filePath")
                return
            }

            val authority = "${reactContext.packageName}.provider"
            val uri: Uri = FileProvider.getUriForFile(reactContext, authority, file)

            Log.d(TAG, "sharePdf: path=$filePath, exists=${file.exists()}, size=${file.length()}, uri=$uri")

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = MIME_PDF
                putExtra(Intent.EXTRA_STREAM, uri)
                clipData = ClipData.newRawUri("PDF Report", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, title).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val resInfoList = reactContext.packageManager.queryIntentActivities(chooser, PackageManager.MATCH_DEFAULT_ONLY)
            for (resolveInfo in resInfoList) {
                val packageName = resolveInfo.activityInfo.packageName
                reactContext.grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "sharePdf failed", e)
            promise.reject("SHARE_ERROR", e.localizedMessage, e)
        }
    }

    @ReactMethod
    fun shareFile(filePath: String, title: String, mimeType: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists() || file.length() == 0L) {
                promise.reject("FILE_NOT_FOUND", "The specified file does not exist: $filePath")
                return
            }

            val authority = "${reactContext.packageName}.provider"
            val uri: Uri = FileProvider.getUriForFile(reactContext, authority, file)

            val resolvedMime = when {
                file.name.endsWith(".xlsx", ignoreCase = true) -> MIME_XLSX
                file.name.endsWith(".xls", ignoreCase = true) -> "application/vnd.ms-excel"
                file.name.endsWith(".pdf", ignoreCase = true) -> MIME_PDF
                mimeType.isNotBlank() -> mimeType
                else -> "*/*"
            }

            Log.d(TAG, "shareFile: path=$filePath, exists=${file.exists()}, size=${file.length()}, uri=$uri, mime=$resolvedMime")

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                setDataAndType(uri, resolvedMime)
                type = resolvedMime
                putExtra(Intent.EXTRA_STREAM, uri)
                clipData = ClipData.newRawUri("Attachment", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, title).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val resInfoList = reactContext.packageManager.queryIntentActivities(chooser, PackageManager.MATCH_DEFAULT_ONLY)
            for (resolveInfo in resInfoList) {
                val packageName = resolveInfo.activityInfo.packageName
                reactContext.grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "shareFile failed", e)
            promise.reject("SHARE_ERROR", e.localizedMessage, e)
        }
    }

    @ReactMethod
    fun openFile(filePath: String, title: String, mimeType: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists() || file.length() == 0L) {
                promise.reject("FILE_NOT_FOUND", "The specified file does not exist or is empty: $filePath")
                return
            }

            val authority = "${reactContext.packageName}.provider"
            val uri: Uri = FileProvider.getUriForFile(reactContext, authority, file)

            val resolvedMime = when {
                file.name.endsWith(".xlsx", ignoreCase = true) -> MIME_XLSX
                file.name.endsWith(".xls", ignoreCase = true) -> "application/vnd.ms-excel"
                file.name.endsWith(".pdf", ignoreCase = true) -> MIME_PDF
                mimeType.isNotBlank() -> mimeType
                else -> "*/*"
            }

            Log.d(TAG, "openFile: path=$filePath, uri=$uri, mime=$resolvedMime")

            val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, resolvedMime)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(viewIntent, title).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val resInfoList = reactContext.packageManager.queryIntentActivities(chooser, PackageManager.MATCH_DEFAULT_ONLY)
            for (resolveInfo in resInfoList) {
                val packageName = resolveInfo.activityInfo.packageName
                reactContext.grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "openFile failed", e)
            promise.reject("VIEW_ERROR", "Failed to open file viewer: ${e.localizedMessage}", e)
        }
    }

    @ReactMethod
    fun printPdf(filePath: String, jobName: String, promise: Promise) {
        val currentActivity = reactContext.currentActivity
        if (currentActivity == null) {
            promise.reject("ACTIVITY_NULL", "Current Activity is null. Cannot open print interface.")
            return
        }

        val file = File(filePath)
        if (!file.exists()) {
            promise.reject("FILE_NOT_FOUND", "The specified PDF file does not exist: $filePath")
            return
        }

        currentActivity.runOnUiThread {
            try {
                val printManager =
                    currentActivity.getSystemService(Context.PRINT_SERVICE) as? PrintManager
                if (printManager == null) {
                    promise.reject("PRINT_SERVICE_UNAVAILABLE", "Android PrintManager service is not available on this device.")
                    return@runOnUiThread
                }

                val printAdapter = object : PrintDocumentAdapter() {
                    override fun onLayout(
                        oldAttributes: PrintAttributes?,
                        newAttributes: PrintAttributes?,
                        cancellationSignal: CancellationSignal?,
                        callback: LayoutResultCallback?,
                        extras: Bundle?
                    ) {
                        if (cancellationSignal?.isCanceled == true) {
                            callback?.onLayoutCancelled()
                            return
                        }
                        val info = PrintDocumentInfo.Builder(jobName)
                            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                            .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                            .build()
                        callback?.onLayoutFinished(info, newAttributes != oldAttributes)
                    }

                    override fun onWrite(
                        pages: Array<out PageRange>?,
                        destination: ParcelFileDescriptor?,
                        cancellationSignal: CancellationSignal?,
                        callback: WriteResultCallback?
                    ) {
                        if (cancellationSignal?.isCanceled == true) {
                            callback?.onWriteCancelled()
                            return
                        }
                        try {
                            FileInputStream(file).use { input ->
                                FileOutputStream(destination?.fileDescriptor).use { output ->
                                    val buffer = ByteArray(16384)
                                    var bytesRead: Int
                                    while (input.read(buffer).also { bytesRead = it } >= 0) {
                                        if (cancellationSignal?.isCanceled == true) {
                                            callback?.onWriteCancelled()
                                            return
                                        }
                                        output.write(buffer, 0, bytesRead)
                                    }
                                }
                            }
                            callback?.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
                        } catch (e: Exception) {
                            callback?.onWriteFailed(e.message)
                        }
                    }
                }

                val printAttributes = PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .build()

                printManager.print(jobName, printAdapter, printAttributes)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("PRINT_ERROR", e.localizedMessage, e)
            }
        }
    }
}

