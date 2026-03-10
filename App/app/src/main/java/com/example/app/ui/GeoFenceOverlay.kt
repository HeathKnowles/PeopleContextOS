package com.example.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.sdk.model.MatchedFenceInfo
import kotlinx.coroutines.delay

/** Auto-dismiss duration in milliseconds */
private const val AUTO_DISMISS_MS = 8_000L
private const val TICK_MS = 100L

private fun categoryEmoji(category: String) = when (category.lowercase()) {
    "hospital"  -> "🏥"
    "college"   -> "🎓"
    "road"      -> "🛣️"
    "bridge"    -> "🌉"
    "park"      -> "🌳"
    "utility"   -> "⚡"
    "transport" -> "🚌"
    else        -> "📍"
}

private fun categoryColor(category: String): Color = when (category.lowercase()) {
    "hospital"  -> Color(0xFFE53935)
    "college"   -> Color(0xFF1E88E5)
    "road"      -> Color(0xFFFF8F00)
    "bridge"    -> Color(0xFF6D4C41)
    "park"      -> Color(0xFF43A047)
    "utility"   -> Color(0xFFFDD835)
    "transport" -> Color(0xFF00ACC1)
    else        -> Color(0xFF757575)
}

/**
 * Renders up to [maxVisible] overlay cards, one per matched fence.
 * Each card slides in from the top, shows an auto-dismiss progress bar,
 * and can be manually closed with the × button.
 *
 * Place this **on top of** your root [Box] so it floats above all other content:
 * ```
 * Box(Modifier.fillMaxSize()) {
 *     Scaffold(...) { ... }
 *     GeoFenceOverlay(fences = overlayQueue, onDismiss = { overlayQueue.remove(it) })
 * }
 * ```
 */
@Composable
fun GeoFenceOverlay(
    fences: List<MatchedFenceInfo>,
    onDismiss: (MatchedFenceInfo) -> Unit,
    modifier: Modifier = Modifier,
    maxVisible: Int = 3,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        fences.take(maxVisible).forEach { fence ->
            FenceOverlayCard(fence = fence, onDismiss = { onDismiss(fence) })
        }
    }
}

@Composable
private fun FenceOverlayCard(
    fence: MatchedFenceInfo,
    onDismiss: () -> Unit,
) {
    var visible by remember { mutableStateOf(false) }
    var progress by remember { mutableFloatStateOf(1f) }

    // Animate in on first composition
    LaunchedEffect(fence.fence_id) {
        visible = true
    }

    // Count down the progress bar and auto-dismiss
    LaunchedEffect(fence.fence_id) {
        val steps = AUTO_DISMISS_MS / TICK_MS
        repeat(steps.toInt()) {
            delay(TICK_MS)
            progress = 1f - (it + 1).toFloat() / steps
        }
        visible = false
        delay(400) // let the exit animation finish
        onDismiss()
    }

    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically(
            initialOffsetY = { -it },
            animationSpec = tween(durationMillis = 350),
        ) + fadeIn(animationSpec = tween(350)),
        exit = slideOutVertically(
            targetOffsetY = { -it },
            animationSpec = tween(durationMillis = 300),
        ) + fadeOut(animationSpec = tween(300)),
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            tonalElevation = 6.dp,
            shadowElevation = 8.dp,
        ) {
            Column {
                // ── Header ─────────────────────────────────────────────────
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 14.dp, end = 4.dp, top = 10.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // Category badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(categoryColor(fence.category).copy(alpha = 0.15f))
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = categoryEmoji(fence.category),
                                style = MaterialTheme.typography.labelSmall,
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = fence.category.replaceFirstChar { it.uppercase() },
                                style = MaterialTheme.typography.labelSmall,
                                color = categoryColor(fence.category),
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }

                    Spacer(Modifier.weight(1f))

                    // Dismiss button
                    IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Dismiss",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                // ── Body ───────────────────────────────────────────────────
                Column(Modifier.padding(horizontal = 14.dp)) {
                    // Site name
                    Text(
                        text = fence.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )

                    // Impact summary
                    fence.impact_summary?.takeIf { it.isNotBlank() }?.let { summary ->
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = summary,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }

                    // Authority
                    fence.authority?.takeIf { it.isNotBlank() }?.let { auth ->
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = "📋 $auth",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        )
                    }

                    // Campaign message
                    if (!fence.campaign_title.isNullOrBlank() || !fence.campaign_message.isNullOrBlank()) {
                        Spacer(Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f))
                                .padding(10.dp),
                        ) {
                            Column {
                                fence.campaign_title?.takeIf { it.isNotBlank() }?.let { title ->
                                    Text(
                                        text = title,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    )
                                }
                                fence.campaign_message?.takeIf { it.isNotBlank() }?.let { msg ->
                                    Text(
                                        text = msg,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        maxLines = 3,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(10.dp))
                }

                // ── Auto-dismiss progress bar ──────────────────────────────
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth(),
                    color = categoryColor(fence.category),
                    trackColor = categoryColor(fence.category).copy(alpha = 0.15f),
                )
            }
        }
    }
}
