package com.example.sdk.model

/** Sent to POST /location/event */
data class LocationEventRequest(
    val device_id: String,
    val lat: Double,
    val lng: Double,
    /** Unix milliseconds */
    val timestamp: Long,
)

/**
 * Metadata for a single matched fence returned by the backend.
 * Used by the SDK to render the in-app overlay without an extra network call.
 */
data class MatchedFenceInfo(
    val fence_id: String,
    val name: String,
    val category: String,
    val description: String? = null,
    val impact_summary: String? = null,
    val authority: String? = null,
    /** Populated when an active campaign exists for this fence */
    val campaign_title: String? = null,
    val campaign_message: String? = null,
)

/** Inner payload from the backend after a location event */
data class LocationEventResult(
    val matched: Int,
    val notified: Int,
    /** Matched fence details for in-app overlay rendering */
    val fences: List<MatchedFenceInfo> = emptyList(),
)

/** Top-level wrapper returned by POST /location/event */
data class LocationEventResponse(
    val success: Boolean,
    val data: LocationEventResult? = null,
    val message: String? = null,
    val error: String? = null,
)

/**
 * Passed to [com.example.sdk.PeopleContextSDK.startLocationTracking]'s
 * `onFenceMatched` callback each time the backend processes a location ping.
 */
data class FenceTrackingResult(
    val lat: Double,
    val lng: Double,
    /** Number of active geo-fences the current point is inside */
    val matched: Int,
    /** Number of FCM push notifications dispatched by the backend */
    val notified: Int,
    /** Full metadata for each matched fence — use this to render overlays */
    val fences: List<MatchedFenceInfo> = emptyList(),
)
