package com.example.sdk.network

import com.example.sdk.model.RegisterDeviceRequest
import com.example.sdk.model.RegisterDeviceResponse
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

internal class DeviceApiClient(
    private val baseUrl: String,
    private val apiKey: String,
) {
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    suspend fun registerDevice(request: RegisterDeviceRequest): RegisterDeviceResponse =
        withContext(Dispatchers.IO) {
            val body = gson.toJson(request).toRequestBody(jsonType)
            val httpRequest = Request.Builder()
                .url("${baseUrl.trimEnd('/')}/device/register")
                .header("Authorization", "Bearer $apiKey")
                .post(body)
                .build()

            http.newCall(httpRequest).execute().use { response ->
                val raw = response.body?.string() ?: "{}"
                if (response.isSuccessful) {
                    gson.fromJson(raw, RegisterDeviceResponse::class.java)
                } else {
                    RegisterDeviceResponse(success = false, error = "HTTP ${response.code}: $raw")
                }
            }
        }
}
