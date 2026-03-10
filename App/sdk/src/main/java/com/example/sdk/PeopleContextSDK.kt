package com.example.sdk

import android.content.Context
import android.provider.Settings
import com.example.sdk.location.GeoLocationTracker
import com.example.sdk.model.FenceTrackingResult
import com.example.sdk.model.RegisterDeviceRequest
import com.example.sdk.model.RegisterDeviceResponse
import com.example.sdk.network.DeviceApiClient
import com.example.sdk.network.LocationApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Configuration for the PeopleContext SDK.
 *
 * @param backendUrl           Root URL of the geo-context backend — no trailing slash.
 *                             Use "http://10.0.2.2:4000" on the Android emulator when
 *                             the backend is running on your local machine.
 * @param apiKey               A valid JWT issued by the backend for SDK-level access.
 * @param locationIntervalMs   How often to request a GPS fix and ping the backend.
 *                             Default: 30 000 ms (30 s). Reduce for higher precision,
 *                             increase to save battery.
 * @param locationMinDistanceM Minimum movement (metres) before a new fix is sent.
 *                             Default: 20 m. Prevents hammering the backend while
 *                             the device is stationary.
 */
data class SDKConfig(
    val backendUrl: String,
    val apiKey: String,
    val locationIntervalMs: Long = 30_000L,
    val locationMinDistanceM: Float = 20f,
)

/**
 * Entry point for the PeopleContext SDK.
 *
 * ### Typical usage
 * ```kotlin
 * // 1. Initialise once — Application.onCreate() or first Activity
 * PeopleContextSDK.init(context, SDKConfig(backendUrl = "...", apiKey = "..."))
 *
 * // 2. Register this device (upsert — safe to call on every launch)
 * PeopleContextSDK.registerDevice(
 *     onSuccess = { Log.d("SDK", "Registered: ${it.data?.device_id}") },
 *     onError   = { Log.e("SDK", "Error: $it") },
 * )
 *
 * // 3. Start geo-fence tracking (requires ACCESS_FINE_LOCATION at runtime)
 * PeopleContextSDK.startLocationTracking(
 *     onFenceMatched = { result ->
 *         Log.d("SDK", "Inside ${result.matched} fence(s) at ${result.lat}, ${result.lng}")
 *     },
 *     onError = { Log.e("SDK", "Tracking error: $it") },
 * )
 *
 * // 4. Stop when no longer needed (e.g. onStop / onDestroy)
 * PeopleContextSDK.stopLocationTracking()
 * ```
 */
object PeopleContextSDK {

    private var appContext: Context? = null
    private var config: SDKConfig? = null

    private var deviceClient: DeviceApiClient? = null
    private var locationClient: LocationApiClient? = null
    private var tracker: GeoLocationTracker? = null

    private var deviceId: String = ""
    private var appVersion: String = "1.0"

    // All callbacks are dispatched on Main so callers can update UI directly.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    // ─── Init ────────────────────────────────────────────────────────────────

    /**
     * Initialise the SDK. Must be called before any other method.
     * Safe to call multiple times — re-init updates the configuration.
     */
    fun init(context: Context, sdkConfig: SDKConfig) {
        appContext = context.applicationContext
        config = sdkConfig

        deviceClient  = DeviceApiClient(sdkConfig.backendUrl, sdkConfig.apiKey)
        locationClient = LocationApiClient(sdkConfig.backendUrl, sdkConfig.apiKey)

        // ANDROID_ID is stable per app-signing key + user (Android 8+, no permission needed)
        deviceId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID,
        ) ?: "unknown"

        appVersion = try {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "1.0"
        } catch (_: Exception) {
            "1.0"
        }
    }

    // ─── Device registration ─────────────────────────────────────────────────

    /**
     * Register (or re-register) this device with the backend.
     * The backend does an **upsert**, so calling this on every launch is safe.
     *
     * @param fcmToken  Optional Firebase Cloud Messaging token for push notifications.
     * @param onSuccess Called on the **main thread** with the server response.
     * @param onError   Called on the **main thread** with a human-readable message.
     */
    fun registerDevice(
        fcmToken: String? = null,
        onSuccess: (RegisterDeviceResponse) -> Unit = {},
        onError: (String) -> Unit = {},
    ) {
        val c = deviceClient
            ?: return onError("PeopleContextSDK.init() must be called before registerDevice()")

        scope.launch {
            runCatching {
                c.registerDevice(
                    RegisterDeviceRequest(
                        device_id = deviceId,
                        app_version = appVersion,
                        fcm_token = fcmToken,
                    )
                )
            }.onSuccess { response ->
                if (response.success) onSuccess(response)
                else onError(response.error ?: "Registration failed")
            }.onFailure { err ->
                onError(err.message ?: "Network error")
            }
        }
    }

    // ─── Location tracking / geo-fence querying ───────────────────────────────

    /**
     * Start continuous location tracking and geo-fence querying.
     *
     * On each GPS fix the SDK posts `{ device_id, lat, lng, timestamp }` to
     * `POST /location/event`. The backend runs a PostGIS **ST_DWithin** query
     * and returns how many active geo-fences contain the point, then dispatches
     * push notifications via FCM.
     *
     * **Permission required:** `ACCESS_FINE_LOCATION` must be granted by the
     * host app before calling this method. The SDK does not request permissions.
     *
     * @param onFenceMatched  Called on the **main thread** with the result of
     *                        every location ping (even when `matched == 0`).
     * @param onError         Called on the **main thread** on network or
     *                        permission errors.
     */
    fun startLocationTracking(
        onFenceMatched: (FenceTrackingResult) -> Unit = {},
        onError: (String) -> Unit = {},
    ) {
        val ctx = appContext
            ?: return onError("PeopleContextSDK.init() must be called before startLocationTracking()")
        val lc = locationClient
            ?: return onError("PeopleContextSDK.init() must be called before startLocationTracking()")
        val cfg = config ?: return onError("SDK not initialised")

        // Stop any existing tracker before creating a new one
        tracker?.stop()
        tracker = GeoLocationTracker(
            context = ctx,
            apiClient = lc,
            deviceId = deviceId,
            intervalMs = cfg.locationIntervalMs,
            minDistanceMeters = cfg.locationMinDistanceM,
            scope = scope,
        )
        tracker!!.start(onFenceMatched, onError)
    }

    /** Stop location updates. Safe to call even if tracking is not active. */
    fun stopLocationTracking() {
        tracker?.stop()
        tracker = null
    }

    /** `true` if location tracking is currently active. */
    val isTrackingLocation: Boolean
        get() = tracker?.isTracking == true
}
