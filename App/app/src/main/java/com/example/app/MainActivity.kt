package com.example.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.core.content.ContextCompat
import com.example.app.ui.GeoFenceOverlay
import com.example.app.ui.theme.AppTheme
import com.example.sdk.PeopleContextSDK
import com.example.sdk.SDKConfig
import com.example.sdk.model.FenceTrackingResult
import com.example.sdk.model.MatchedFenceInfo

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        PeopleContextSDK.init(
            context = this,
            sdkConfig = SDKConfig(
                backendUrl = BuildConfig.BACKEND_URL,
                apiKey = BuildConfig.SDK_API_KEY,
                locationIntervalMs = 15_000L,
                locationMinDistanceM = 10f,
            ),
        )

        enableEdgeToEdge()
        setContent {
            AppTheme {
                SDKDemoScreen()
            }
        }
    }

    override fun onStop() {
        super.onStop()
        PeopleContextSDK.stopLocationTracking()
    }
}

@Composable
fun SDKDemoScreen() {
    val context = LocalContext.current
    var registerStatus  by remember { mutableStateOf("Not registered") }
    var registerLoading by remember { mutableStateOf(false) }
    var registerError   by remember { mutableStateOf(false) }

    var trackingActive  by remember { mutableStateOf(false) }
    var trackingError   by remember { mutableStateOf<String?>(null) }
    val trackingLog     = remember { mutableStateListOf<FenceTrackingResult>() }

    // Overlay queue — fences to display as floating cards
    val overlayQueue = remember { mutableStateListOf<MatchedFenceInfo>() }

    DisposableEffect(Unit) { onDispose { PeopleContextSDK.stopLocationTracking() } }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startTracking(
                onActive  = { trackingActive = true; trackingError = null },
                onResult  = { result ->
                    trackingLog.add(0, result)
                    // Add new fences to overlay queue, deduplicated by fence_id
                    result.fences.forEach { fence ->
                        if (overlayQueue.none { it.fence_id == fence.fence_id }) {
                            overlayQueue.add(fence)
                        }
                    }
                },
                onError   = { trackingError = it; trackingActive = false },
            )
        } else {
            trackingError = "Location permission denied"
        }
    }

    // Root Box so the overlay floats above the Scaffold
    Box(Modifier.fillMaxSize()) {

        // ── Main content ────────────────────────────────────────────────────
        Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Spacer(Modifier.height(4.dp))
                Text("PeopleContext SDK", style = MaterialTheme.typography.headlineMedium)

                // ── Device Registration ──────────────────────────────────
                SectionCard(title = "Device Registration") {
                    StatusText(registerStatus, isError = registerError)
                    Spacer(Modifier.height(8.dp))
                    Button(
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !registerLoading,
                        onClick = {
                            registerLoading = true
                            registerError = false
                            registerStatus = "Registering…"
                            PeopleContextSDK.registerDevice(
                                onSuccess = {
                                    registerLoading = false
                                    registerError = false
                                    registerStatus = "✓ ${it.message ?: "Registered"}\nID: ${it.data?.device_id}"
                                },
                                onError = {
                                    registerLoading = false
                                    registerError = true
                                    registerStatus = "✗ $it"
                                },
                            )
                        },
                    ) {
                        if (registerLoading) {
                            CircularProgressIndicator(
                                Modifier.size(16.dp), strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                            Spacer(Modifier.width(8.dp))
                        }
                        Text(if (registerLoading) "Registering…" else "Register Device")
                    }
                }

                // ── Geo-Fence Tracking ──────────────────────────────────
                SectionCard(title = "Geo-Fence Tracking") {
                    trackingError?.let { StatusText(it, isError = true) }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Button(
                            modifier = Modifier.weight(1f),
                            enabled = !trackingActive,
                            onClick = {
                                val hasPermission = ContextCompat.checkSelfPermission(
                                    context, Manifest.permission.ACCESS_FINE_LOCATION
                                ) == PackageManager.PERMISSION_GRANTED
                                if (hasPermission) {
                                    startTracking(
                                        onActive  = { trackingActive = true; trackingError = null },
                                        onResult  = { result ->
                                            trackingLog.add(0, result)
                                            result.fences.forEach { fence ->
                                                if (overlayQueue.none { it.fence_id == fence.fence_id }) {
                                                    overlayQueue.add(fence)
                                                }
                                            }
                                        },
                                        onError   = { trackingError = it; trackingActive = false },
                                    )
                                } else {
                                    permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                                }
                            },
                        ) { Text("Start") }

                        OutlinedButton(
                            modifier = Modifier.weight(1f),
                            enabled = trackingActive,
                            onClick = {
                                PeopleContextSDK.stopLocationTracking()
                                trackingActive = false
                            },
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error,
                            ),
                        ) { Text("Stop") }
                    }

                    if (trackingActive) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                            Text("Tracking active", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                // ── Tracking log ────────────────────────────────────────
                if (trackingLog.isNotEmpty()) {
                    Text("Recent pings", style = MaterialTheme.typography.titleSmall)
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(trackingLog.take(20)) { result ->
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (result.matched > 0)
                                        MaterialTheme.colorScheme.primaryContainer
                                    else
                                        MaterialTheme.colorScheme.surfaceVariant,
                                )
                            ) {
                                Text(
                                    text = buildString {
                                        append("📍 %.5f, %.5f".format(result.lat, result.lng))
                                        append("  |  fences: ${result.matched}")
                                        if (result.notified > 0) append("  🔔 ${result.notified}")
                                    },
                                    modifier = Modifier.padding(10.dp),
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                }
            }
        }

        // ── Geo-fence overlay — floats above everything ──────────────────
        GeoFenceOverlay(
            fences = overlayQueue,
            onDismiss = { overlayQueue.remove(it) },
            modifier = Modifier
                .align(Alignment.TopCenter)
                .zIndex(10f),
        )
    }
}

private fun startTracking(
    onActive: () -> Unit,
    onResult: (FenceTrackingResult) -> Unit,
    onError: (String) -> Unit,
) {
    onActive()
    PeopleContextSDK.startLocationTracking(
        onFenceMatched = onResult,
        onError = onError,
    )
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun StatusText(text: String, isError: Boolean) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodySmall,
        color = if (isError) MaterialTheme.colorScheme.error
                else MaterialTheme.colorScheme.onSurfaceVariant,
    )
}
