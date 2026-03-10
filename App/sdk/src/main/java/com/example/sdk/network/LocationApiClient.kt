package com.example.sdk.network

import com.example.sdk.model.LocationEventRequest
import com.example.sdk.model.LocationEventResponse
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

internal class LocationApiClient(
    private val baseUrl: String,
    private val apiKey: String,
) {
    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    suspend fun sendLocationEvent(request: LocationEventRequest): LocationEventResponse =
        withContext(Dispatchers.IO) {
            val body = gson.toJson(request).toRequestBody(jsonType)
            val httpRequest = Request.Builder()
                .url("${baseUrl.trimEnd('/')}/location/event")
                .header("Authorization", "Bearer $apiKey")
                .post(body)
                .build()

            http.newCall(httpRequest).execute().use { response ->
                val raw = response.body?.string() ?: "{}"
                if (response.isSuccessful) {
                    gson.fromJson(raw, LocationEventResponse::class.java)
                } else {
                    LocationEventResponse(success = false, error = "HTTP ${response.code}: $raw")
                }
            }
        }
}
