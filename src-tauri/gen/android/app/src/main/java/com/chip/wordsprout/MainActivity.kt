package com.chip.wordsprout

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  private fun hideSystemBars() {
    val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
    windowInsetsController.systemBarsBehavior =
      WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // Immersive sticky full-screen mode: hides both the status bar and the
    // navigation bar. A swipe from the screen edge reveals them briefly
    // (BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE), then they auto-hide again.
    hideSystemBars()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    // Re-hide on resume/refocus (e.g. returning from the app switcher or
    // after a system dialog) -- a one-time hide() in onCreate() doesn't
    // always survive those transitions.
    if (hasFocus) {
      hideSystemBars()
    }
  }
}
