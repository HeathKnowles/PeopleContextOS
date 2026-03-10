package com.example.sdk.model

/** Sent to POST /device/register */
data class RegisterDeviceRequest(
    val device_id: String,
    val platform: String = "android",
    val app_version: String,
    val fcm_token: String? = null,
)

/** Top-level API response wrapper */
data class RegisterDeviceResponse(
    val success: Boolean,
    val data: DeviceData? = null,
    val message: String? = null,
    val error: String? = null,
)

/** Device object returned by the backend after a successful upsert */
data class DeviceData(
    val device_id: String,
    val platform: String,
    val app_version: String,
    val fcm_token: String?,
    val last_seen: String,
    val created_at: String,
)
