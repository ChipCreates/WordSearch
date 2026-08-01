package com.chip.tauri_app

import android.view.ViewGroup
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

// Scaffolded by `cargo tauri android init` with enableEdgeToEdge() called
// unconditionally, which draws the WebView behind the status/nav bars with
// no compensation. targetSdk 36 (Android 16) has no manifest opt-out for
// this (that only worked up to API 35), so this fights it correctly instead:
// onWebViewCreate() (Tauri's designed extension point for this) attaches a
// window-insets listener that sets real margins via MarginLayoutParams.
// Plain View.setPadding does NOT work here — WebView's Chromium compositor
// renders its content ignoring View-level padding; only shrinking the
// WebView's own measured bounds via margins actually reserves the space.
// Reading Type.ime() too (and taking the max with the bottom system-bar
// inset) keeps the bottom margin correct when the on-screen keyboard opens,
// mirroring the pre-edge-to-edge windowSoftInputMode="adjustResize" behavior.
class MainActivity : TauriActivity() {
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    ViewCompat.setOnApplyWindowInsetsListener(webView) { view, windowInsets ->
      val systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
      val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())
      val params = view.layoutParams
      if (params is ViewGroup.MarginLayoutParams) {
        params.leftMargin = systemBars.left
        params.topMargin = systemBars.top
        params.rightMargin = systemBars.right
        params.bottomMargin = maxOf(systemBars.bottom, ime.bottom)
        view.layoutParams = params
      }
      WindowInsetsCompat.CONSUMED
    }
  }
}
