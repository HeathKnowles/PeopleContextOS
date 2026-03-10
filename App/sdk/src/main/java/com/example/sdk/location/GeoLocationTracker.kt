package com.example.sdk.location

import android.annotation.SuppressLint
import android.content.Context
import android.os.Looper
import com.example.sdk.model.FenceTrackingResult
import com.example.sdk.model.LocationEventRequest
import com.example.sdk.network.LocationApiClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Wraps [com.google.android.gms.location.FusedLocationProviderClient] and
 * pipes every GPS fix to the backend's `POST /location/event` endpoint.
 *
 * The caller **must** hold [android.Manifest.permission.ACCESS_FINE_LOCATION]
 * before calling [start] — this class does not request permissions itself.
 *
 * @param intervalMs        Desired time between location fixes (ms). Default 30 s.
 * @param minDistanceMeters Minimum displacement (m) before a new fix is sent.
 *                          Default 20 m — avoids hammering the backend while
 *                          the device is stationary.
 */
internal class GeoLocationTracker(
    context: Context,
    private val apiClient: LocationApiClient,
    private val deviceId: String,
    private val intervalMs: Long = 30_000L,
    private val minDistanceMeters: Float = 20f,
    private val scope: CoroutineScope,
) {
    private val fusedClient =
        LocationServices.getFusedLocationProviderClient(context.applicationContext)

    private var locationCallback: LocationCallback? = null

    /**
     * Start receiving location updates and forwarding them to the backend.
     *
     * @param onFenceMatched Called on the **main thread** whenever the backend
     *                       reports ≥0 matched fences for the current position.
     *                       Also fires for positions outside any fence
     *                       (`matched == 0`) so callers can clear any UI state.
     * @param onError        Called on the **main thread** if a network call
     *                       fails or location permission is missing.
     */
    @SuppressLint("MissingPermission") // permission check is the caller's responsibility
    fun start(
        onFenceMatched: (FenceTrackingResult) -> Unit,
        onError: (String) -> Unit,
    ) {
        if (locationCallback != null) return // already running

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(intervalMs / 2)
            .setMinUpdateDistanceMeters(minDistanceMeters)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                scope.launch(Dispatchers.IO) {
                    runCatching {
                        apiClient.sendLocationEvent(
                            LocationEventRequest(
                                device_id = deviceId,
                                lat = loc.latitude,
                                lng = loc.longitude,
                                timestamp = loc.time,
                            )
                        )
                    }.onSuccess { response ->
                        withContext(Dispatchers.Main) {
                            if (response.success) {
                                onFenceMatched(
                                    FenceTrackingResult(
                                        lat = loc.latitude,
                                        lng = loc.longitude,
                                        matched = response.data?.matched ?: 0,
                                        notified = response.data?.notified ?: 0,
                                        fences = response.data?.fences ?: emptyList(),
                                    )
                                )
                            } else {
                                onError(response.error ?: "Location event failed")
                            }
                        }
                    }.onFailure { err ->
                        withContext(Dispatchers.Main) {
                            onError(err.message ?: "Network error during location event")
                        }
                    }
                }
            }
        }

        try {
            fusedClient.requestLocationUpdates(
                request,
                locationCallback!!,
                Looper.getMainLooper(),
            )
        } catch (e: SecurityException) {
            locationCallback = null
            onError("Location permission not granted: ${e.message}")
        }
    }

    /** Stop location updates and release the callback. */
    fun stop() {
        locationCallback?.let { fusedClient.removeLocationUpdates(it) }
        locationCallback = null
    }

    val isTracking: Boolean get() = locationCallback != null
}
