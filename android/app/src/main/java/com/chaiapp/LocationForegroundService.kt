package com.chaiapp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import org.json.JSONObject

class LocationForegroundService : Service(), LocationListener {

    companion object {
        const val TAG = "LocationForegroundService"
        const val CHANNEL_ID = "chaiflow_tracking_channel"
        const val NOTIFICATION_ID = 4040

        const val ACTION_START = "com.chaiapp.action.START_LOCATION_TRACKING"
        const val ACTION_STOP = "com.chaiapp.action.STOP_LOCATION_TRACKING"

        const val EXTRA_DELIVERY_ID = "extra_delivery_id"
        const val EXTRA_AUTH_TOKEN = "extra_auth_token"
        const val EXTRA_BASE_URL = "extra_base_url"

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var currentDeliveryId: String? = null
            private set

        @Volatile
        var lastLatitude: Double? = null
            private set

        @Volatile
        var lastLongitude: Double? = null
            private set

        @Volatile
        var lastRecordedAt: String? = null
            private set
    }

    private var locationManager: LocationManager? = null
    private var deliveryId: String? = null
    private var authToken: String? = null
    private var baseUrl: String? = null
    private val httpExecutor = Executors.newSingleThreadExecutor()

    private var lastSentTime: Long = 0L
    private val minIntervalMillis = 15000L // Send at most once every 15 seconds

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        when (intent.action) {
            ACTION_START -> {
                deliveryId = intent.getStringExtra(EXTRA_DELIVERY_ID)
                authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN)
                baseUrl = intent.getStringExtra(EXTRA_BASE_URL)

                currentDeliveryId = deliveryId
                isRunning = true

                val notification = buildForegroundNotification()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                    )
                } else {
                    startForeground(NOTIFICATION_ID, notification)
                }

                startLocationUpdates()
            }
            ACTION_STOP -> {
                stopLocationUpdates()
                stopForeground(true)
                stopSelf()
                isRunning = false
                currentDeliveryId = null
            }
            else -> {
                stopSelf()
            }
        }

        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelName = "Delivery GPS Tracking"
            val channelDesc = "Active tracking notification for running deliveries"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, channelName, importance).apply {
                description = channelDesc
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            this.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )

        val title = "Chai Flow — Delivery in Progress"
        val text = if (deliveryId != null) {
            "Active GPS tracking for Delivery #$deliveryId"
        } else {
            "Active GPS tracking is running"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun startLocationUpdates() {
        val lm = locationManager ?: return

        try {
            // Check GPS provider
            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                lm.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    15000L, // 15 seconds
                    10f,    // 10 meters
                    this
                )
            }
            // Also listen to Network provider for fast initial fix / indoor resilience
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                lm.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    15000L,
                    10f,
                    this
                )
            }

            // Immediately send last known location if available
            val lastGps = try { lm.getLastKnownLocation(LocationManager.GPS_PROVIDER) } catch (e: SecurityException) { null }
            val lastNet = try { lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) } catch (e: SecurityException) { null }
            val bestLast = lastGps ?: lastNet
            if (bestLast != null) {
                onLocationChanged(bestLast)
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing for updates: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register location updates: ${e.message}")
        }
    }

    private fun stopLocationUpdates() {
        try {
            locationManager?.removeUpdates(this)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to remove location updates: ${e.message}")
        }
    }

    override fun onLocationChanged(location: Location) {
        val now = System.currentTimeMillis()
        if (now - lastSentTime < minIntervalMillis) {
            // Throttle to respect battery & network
            return
        }
        lastSentTime = now

        lastLatitude = location.latitude
        lastLongitude = location.longitude

        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        val timestamp = sdf.format(Date(location.time))
        lastRecordedAt = timestamp

        sendPingToBackend(location, timestamp)
    }

    private fun sendPingToBackend(location: Location, timestamp: String) {
        val targetDeliveryId = deliveryId ?: return
        val rawBase = baseUrl?.trimEnd('/') ?: return
        val token = authToken ?: return

        httpExecutor.execute {
            try {
                val endpoint = "$rawBase/deliveries/$targetDeliveryId/location-ping/"
                val url = URL(endpoint)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 10000
                conn.readTimeout = 10000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                conn.setRequestProperty("Authorization", "Bearer $token")

                val payload = JSONObject().apply {
                    put("latitude", location.latitude)
                    put("longitude", location.longitude)
                    put("accuracy", location.accuracy.toDouble())
                    put("speed", location.speed.toDouble())
                    put("recorded_at", timestamp)
                }

                OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                val responseCode = conn.responseCode
                if (responseCode in 200..299) {
                    val resp = conn.inputStream.bufferedReader().use { it.readText() }
                    // Check if delivery was marked delivered or failed remotely
                    val jsonResp = JSONObject(resp)
                    if (jsonResp.has("active_tracking") && !jsonResp.getBoolean("active_tracking")) {
                        Log.i(TAG, "Server signaled tracking terminated. Stopping service.")
                        stopForeground(true)
                        stopSelf()
                        isRunning = false
                        currentDeliveryId = null
                    }
                } else {
                    Log.w(TAG, "Location ping failed with HTTP $responseCode")
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Error posting location ping: ${e.message}")
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopLocationUpdates()
        isRunning = false
        currentDeliveryId = null
        httpExecutor.shutdown()
    }

    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}
}
