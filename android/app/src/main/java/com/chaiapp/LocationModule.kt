package com.chaiapp

import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

class LocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "LocationModule"
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun startBackgroundTracking(
        deliveryId: String,
        authToken: String,
        baseUrl: String,
        promise: Promise
    ) {
        try {
            val intent = Intent(reactContext, LocationForegroundService::class.java).apply {
                action = LocationForegroundService.ACTION_START
                putExtra(LocationForegroundService.EXTRA_DELIVERY_ID, deliveryId)
                putExtra(LocationForegroundService.EXTRA_AUTH_TOKEN, authToken)
                putExtra(LocationForegroundService.EXTRA_BASE_URL, baseUrl)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(reactContext, intent)
            } else {
                reactContext.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_TRACKING_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopBackgroundTracking(promise: Promise) {
        try {
            val intent = Intent(reactContext, LocationForegroundService::class.java).apply {
                action = LocationForegroundService.ACTION_STOP
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_TRACKING_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun isTrackingActive(promise: Promise) {
        try {
            val map: WritableMap = Arguments.createMap().apply {
                putBoolean("isActive", LocationForegroundService.isRunning)
                putString("deliveryId", LocationForegroundService.currentDeliveryId)
                LocationForegroundService.lastLatitude?.let { putDouble("latitude", it) }
                LocationForegroundService.lastLongitude?.let { putDouble("longitude", it) }
                LocationForegroundService.lastRecordedAt?.let { putString("recordedAt", it) }
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCurrentPosition(promise: Promise) {
        try {
            val lm = reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val lastGps = try { lm.getLastKnownLocation(LocationManager.GPS_PROVIDER) } catch (se: SecurityException) { null }
            val lastNet = try { lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) } catch (se: SecurityException) { null }
            val loc = lastGps ?: lastNet

            if (loc != null) {
                val map: WritableMap = Arguments.createMap().apply {
                    putDouble("latitude", loc.latitude)
                    putDouble("longitude", loc.longitude)
                    putDouble("accuracy", loc.accuracy.toDouble())
                    putDouble("speed", loc.speed.toDouble())
                    putDouble("time", loc.time.toDouble())
                }
                promise.resolve(map)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("GET_POSITION_FAILED", e.message, e)
        }
    }
}
