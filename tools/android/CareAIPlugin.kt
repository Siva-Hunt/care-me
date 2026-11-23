package app.careme.ai

import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.Firebase
import com.google.firebase.FirebaseApp
import com.google.firebase.ai.InferenceMode
import com.google.firebase.ai.InferenceSource
import com.google.firebase.ai.OnDeviceConfig
import com.google.firebase.ai.OnDeviceModelStatus
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.PublicPreviewAPI
import com.google.firebase.ai.type.content
import com.google.firebase.ai.type.generationConfig
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Care Me AI bridge.
 * - "device": Gemini Nano on the phone (via Firebase AI Logic hybrid / ML Kit Prompt API), when the phone supports it.
 * - "cloud":  Gemini in the cloud through the app owner's Firebase project (protected by App Check / Play Integrity).
 * The web layer decides the order (device first for short tasks, cloud fallback).
 */
@OptIn(PublicPreviewAPI::class)
@CapacitorPlugin(name = "CareAI")
class CareAIPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val defaultModel = "gemini-3.5-flash"

    override fun load() {
        try {
            if (FirebaseApp.getApps(context).isEmpty()) FirebaseApp.initializeApp(context)
            FirebaseAppCheck.getInstance().installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance())
        } catch (e: Exception) {
            Log.e(TAG, "Firebase init failed", e)
        }
    }

    private fun model(name: String, mode: InferenceMode, json: Boolean, maxTokens: Int) =
        Firebase.ai(backend = GenerativeBackend.googleAI())
            .generativeModel(
                modelName = name,
                generationConfig = generationConfig {
                    if (json) responseMimeType = "application/json"
                    maxOutputTokens = maxTokens
                    temperature = 0.3f
                },
                onDeviceConfig = OnDeviceConfig(mode = mode),
            )

    /** Reports whether Gemini Nano can run on this phone. */
    @PluginMethod
    fun status(call: PluginCall) {
        scope.launch {
            val r = JSObject()
            try {
                val st = model(defaultModel, InferenceMode.ONLY_ON_DEVICE, false, 64).onDeviceExtension?.checkStatus()
                r.put("onDevice", when (st) {
                    OnDeviceModelStatus.AVAILABLE -> "AVAILABLE"
                    OnDeviceModelStatus.DOWNLOADABLE -> "DOWNLOADABLE"
                    OnDeviceModelStatus.DOWNLOADING -> "DOWNLOADING"
                    else -> "UNAVAILABLE"
                })
            } catch (e: Throwable) {
                r.put("onDevice", "UNAVAILABLE")
                r.put("detail", e.message ?: e.javaClass.simpleName)
            }
            call.resolve(r)
        }
    }

    /** prompt (text), image (base64 JPEG, optional), mode ("device" | "cloud"), json, maxTokens, model. */
    @PluginMethod
    fun generate(call: PluginCall) {
        val prompt = call.getString("prompt")
        if (prompt.isNullOrBlank()) { call.reject("Missing prompt"); return }
        val image = call.getString("image")
        val onDevice = call.getString("mode", "cloud") == "device"
        val json = call.getBoolean("json", true) ?: true
        val maxTokens = call.getInt("maxTokens", 4000) ?: 4000
        val name = call.getString("model", defaultModel) ?: defaultModel
        scope.launch {
            try {
                val bmp = if (image.isNullOrEmpty()) null else withContext(Dispatchers.Default) {
                    val bytes = Base64.decode(image, Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                }
                val m = model(name, if (onDevice) InferenceMode.ONLY_ON_DEVICE else InferenceMode.ONLY_IN_CLOUD, json, maxTokens)
                val input = content {
                    if (bmp != null) image(bmp)
                    text(prompt)
                }
                val res = m.generateContent(input)
                val out = JSObject()
                out.put("text", res.text ?: "")
                out.put("source", if (res.inferenceSource == InferenceSource.IN_CLOUD) "cloud" else "device")
                call.resolve(out)
            } catch (e: Throwable) {
                Log.e(TAG, "generate failed (device=$onDevice)", e)
                call.reject(e.message ?: e.javaClass.simpleName, e.javaClass.simpleName)
            }
        }
    }

    companion object { private const val TAG = "CareAI" }
}
