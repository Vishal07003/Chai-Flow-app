package com.chaiapp

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintDocumentInfo
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class NativePdfModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NativePdfModule"

    @ReactMethod
    fun sharePdf(filePath: String, title: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "The specified PDF file does not exist: $filePath")
                return
            }

            val authority = "${reactContext.packageName}.provider"
            val uri: Uri = FileProvider.getUriForFile(reactContext, authority, file)

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, title)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, title).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e.localizedMessage, e)
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

